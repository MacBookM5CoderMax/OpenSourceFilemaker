import { isMainThread, MessageChannel, receiveMessageOnPort, Worker, parentPort, workerData } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { wholeNumber } from '../settings.ts';
import { SqliteDriver, type SqlDriver, type SqlValue } from './driver.ts';

export interface SqlConnection {
  name: string;
  dialect: SqlDriver['dialect'];
  path?: string;
  host?: string;
  port?: number;
  password?: string;
}
export type EssOperation = 'columns' | 'query' | 'tables';
type Factory = (connection: SqlConnection) => SqlDriver | Promise<SqlDriver>;
const factories = new Map<SqlDriver['dialect'], Factory>();

/** Register in the worker module when adding a protocol client. */
export function registerDriver(dialect: SqlDriver['dialect'], factory: Factory): void { factories.set(dialect, factory); }
registerDriver('sqlite', (connection) => new SqliteDriver(connection.path ?? ':memory:'));

export class EssBridgeError extends Error {
  readonly reason: 'timeout' | 'unavailable' | 'row-limit' | 'failure';
  constructor(reason: 'timeout' | 'unavailable' | 'row-limit' | 'failure') { super(reason); this.reason = reason; }
}

interface Request {
  connection: SqlConnection;
  op: EssOperation;
  args: unknown[];
  state: SharedArrayBuffer;
  port: MessageChannel['port1'];
}
interface Reply { ok?: unknown; error?: EssBridgeError['reason'] }

// Only the bridge's own worker answers requests: any other worker thread that imports the store (a sandbox, a test reader)
// must not have its messages taken by this handler.
if (!isMainThread && (workerData as { essBridge?: boolean } | null)?.essBridge === true) {
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
      else {
        const [sql, params, options] = args as [string, SqlValue[], { maxRows?: number; timeoutMs?: number }];
        reply = { ok: await driver.query(sql, params, options) };
      }
    } catch (error) {
      reply = { error: error instanceof Error && error.message.startsWith('SQL row limit of ') ? 'row-limit' : 'failure' };
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
    worker = new Worker(new URL('./bridge.ts', import.meta.url), { workerData: { essBridge: true } });
    worker.unref();
  }
  return worker;
}

export function essCall<T>(connection: SqlConnection, op: EssOperation, args: unknown[] = [], timeoutMs = (wholeNumber('TABULARIUS_ESS_TIMEOUT_SECONDS', { min: 1 }) ?? 30) * 1000): T {
  const state = new Int32Array(new SharedArrayBuffer(4));
  const { port1, port2 } = new MessageChannel();
  try {
    readyWorker().postMessage({ connection, op, args, state: state.buffer, port: port2 }, [port2]);
    if (Atomics.wait(state, 0, 0, timeoutMs) === 'timed-out') {
      void worker?.terminate();
      worker = undefined;
      throw new EssBridgeError('timeout');
    }
    const reply = receiveMessageOnPort(port1)?.message as Reply | undefined;
    if (!reply) throw new EssBridgeError('unavailable');
    if (reply.error) throw new EssBridgeError(reply.error);
    return reply.ok as T;
  } finally {
    port1.close();
  }
}

export function closeEssBridge(): void { void worker?.terminate(); worker = undefined; }
