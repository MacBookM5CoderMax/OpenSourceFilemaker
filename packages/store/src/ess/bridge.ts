import { isMainThread, MessageChannel, receiveMessageOnPort, Worker, parentPort, workerData } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { wholeNumber } from '../settings.ts';
import { EssConflict, SqliteDriver, writeEssBatch, type EssWrite, type SqlDriver, type SqlValue } from './driver.ts';

export interface SqlConnection {
  name: string;
  dialect: SqlDriver['dialect'];
  path?: string;
  host?: string;
  port?: number;
  password?: string;
}
export type EssOperation = 'columns' | 'query' | 'tables' | 'writes';
type Factory = (connection: SqlConnection) => SqlDriver | Promise<SqlDriver>;
const factories = new Map<SqlDriver['dialect'], Factory>();

/** Register in the worker module when adding a protocol client. */
export function registerDriver(dialect: SqlDriver['dialect'], factory: Factory): void { factories.set(dialect, factory); }

// The sqlite driver opens whatever path a connection names, so it is a stand-in for tests, never a production client:
// the bridge's worker registers it only after allowSqliteStandIn(), which nothing outside the tests calls. A connection
// that came from a file's design or an import could otherwise read any SQLite file the server's user can open.
let sqliteStandIn = false;
/** Tests only: let the bridge open SQLite files as outside sources. Restarts the worker so it takes effect. */
export function allowSqliteStandIn(): void {
  if (sqliteStandIn) return;
  sqliteStandIn = true;
  closeEssBridge();
}

export type EssBridgeReason = 'timeout' | 'unavailable' | 'row-limit' | 'failure' | 'conflict' | 'resting';
export class EssBridgeError extends Error {
  readonly reason: EssBridgeReason;
  readonly detail?: string;
  /** For 'resting': how long until the connection is asked again. */
  readonly retryInMs?: number;
  constructor(reason: EssBridgeReason, detail?: string, retryInMs?: number) {
    super(reason);
    this.reason = reason;
    this.detail = detail;
    if (retryInMs !== undefined) this.retryInMs = retryInMs;
  }
}

interface Request {
  connection: SqlConnection;
  op: EssOperation;
  args: unknown[];
  state: SharedArrayBuffer;
  port: MessageChannel['port1'];
}
interface Reply { ok?: unknown; error?: EssBridgeError['reason']; detail?: string }

function safeWriteDetail(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const message = error.message;
  if (/^(?:NOT NULL|UNIQUE) constraint failed: [A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)?(?:, [A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)?)*$/.test(message)) return message;
  if (message === 'FOREIGN KEY constraint failed') return message;
  return undefined;
}

// Only the bridge's own worker answers requests: any other worker thread that imports the store (a sandbox, a test reader)
// must not have its messages taken by this handler.
if (!isMainThread && (workerData as { essBridge?: boolean } | null)?.essBridge === true) {
  if ((workerData as { sqliteStandIn?: boolean }).sqliteStandIn === true) registerDriver('sqlite', (connection) => new SqliteDriver(connection.path ?? ':memory:'));
  const drivers = new Map<string, { name: string; driver: SqlDriver }>();
  parentPort!.on('message', async (request: Request) => {
    const state = new Int32Array(request.state);
    let reply: Reply;
    try {
      const { connection, op, args } = request;
      const name = connection.name.toLowerCase();
      const key = createHash('sha256').update(JSON.stringify(connection)).digest('hex');
      let driver = drivers.get(key)?.driver;
      if (!driver) {
        const factory = factories.get(connection.dialect);
        if (!factory) throw new Error('No SQL driver');
        const limit = wholeNumber('TABULARIUS_ESS_POOL', { min: 1, max: 64 }) ?? 4;
        while ([...drivers.values()].filter((item) => item.name === name).length >= limit) {
          const oldest = [...drivers].find(([, item]) => item.name === name)!;
          drivers.delete(oldest[0]);
          await oldest[1].driver.close();
        }
        driver = await factory(connection);
        drivers.set(key, { name, driver });
      } else {
        drivers.delete(key);
        drivers.set(key, { name, driver });
      }
      if (op === 'columns') reply = { ok: await driver.columns(args[0] as { schema?: string; name: string }) };
      else if (op === 'tables') reply = { ok: await driver.tables() };
      else if (op === 'writes') {
        const writes = args[0] as EssWrite[];
        reply = { ok: await writeEssBatch(driver, writes) };
      }
      else {
        const [sql, params, options] = args as [string, SqlValue[], { maxRows?: number; timeoutMs?: number }];
        reply = { ok: await driver.query(sql, params, options) };
      }
    } catch (error) {
      reply = error instanceof EssConflict ? { error: 'conflict' } :
        error instanceof Error && error.message.startsWith('SQL row limit of ') ? { error: 'row-limit' } :
          { error: 'failure', detail: request.op === 'writes' ? safeWriteDetail(error) : undefined };
    }
    request.port.postMessage(reply);
    Atomics.store(state, 0, 1);
    Atomics.notify(state, 0);
    request.port.close();
  });
}

let worker: Worker | undefined;
function readyWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./bridge.ts', import.meta.url), { workerData: { essBridge: true, sqliteStandIn } });
    worker.unref();
  }
  return worker;
}

// A call blocks this thread until the source answers, and so every other request this process serves. A source that
// did not answer in time is not asked again for a while (a minute or twice the timeout, doubling to 15 minutes while it
// keeps not answering), so a slow or hostile database stalls the server once per rest, not on every read.
const MAX_REST_MS = 15 * 60_000;
const resting = new Map<string, { until: number; rest: number }>();

export function essCall<T>(connection: SqlConnection, op: EssOperation, args: unknown[] = [], timeoutMs = (wholeNumber('TABULARIUS_ESS_TIMEOUT_SECONDS', { min: 1 }) ?? 30) * 1000): T {
  const name = connection.name.toLowerCase();
  const rest = resting.get(name);
  const now = Date.now();
  if (rest && now < rest.until) throw new EssBridgeError('resting', undefined, rest.until - now);
  const state = new Int32Array(new SharedArrayBuffer(4));
  const { port1, port2 } = new MessageChannel();
  try {
    readyWorker().postMessage({ connection, op, args, state: state.buffer, port: port2 }, [port2]);
    if (Atomics.wait(state, 0, 0, timeoutMs) === 'timed-out') {
      void worker?.terminate();
      worker = undefined;
      const next = Math.min(MAX_REST_MS, rest ? rest.rest * 2 : Math.max(60_000, timeoutMs * 2));
      resting.set(name, { until: Date.now() + next, rest: next });
      throw new EssBridgeError('timeout');
    }
    resting.delete(name);
    const reply = receiveMessageOnPort(port1)?.message as Reply | undefined;
    if (!reply) throw new EssBridgeError('unavailable');
    if (reply.error) throw new EssBridgeError(reply.error, reply.detail);
    return reply.ok as T;
  } finally {
    port1.close();
  }
}

export function closeEssBridge(): void { void worker?.terminate(); worker = undefined; resting.clear(); }
