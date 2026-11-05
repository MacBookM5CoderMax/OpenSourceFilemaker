import type { Table } from '../../fmp12/src/schema.ts';
import { StoreError, type DesignOp, type Store } from '../../store/src/index.ts';
import { essCallAsync, EssBridgeError, type EssOperation, type SqlConnection } from '../../store/src/ess/bridge.ts';
import { ESS_ERROR, type SqlColumn, type SqlResult } from '../../store/src/ess/driver.ts';
import { essFieldType, essName, sourceFor } from '../../store/src/ess/mirror.ts';
import { wholeNumber } from '../../store/src/settings.ts';

/** The client exposes safe SQLSTATE messages only; raw server messages and row data never enter errors. */
export async function sqlRequest<T>(connection: SqlConnection, op: EssOperation, args: unknown[], log: (message: string) => void = () => {}): Promise<T> {
  const seconds = wholeNumber('TABULARIUS_ESS_TIMEOUT_SECONDS', { min: 1 }) ?? 30;
  log(`SQL connection ${connection.name}: ${op}, host ${connection.host}:${connection.port}`);
  try { return await essCallAsync<T>(connection, op, args, seconds * 1000); }
  catch (error) {
    const reason = error instanceof EssBridgeError && error.reason === 'timeout'
      ? `did not answer within ${seconds} seconds` : error instanceof EssBridgeError && error.reason === 'row-limit'
        ? 'exceeded the row limit; the previous mirror was kept' : 'could not complete the request';
    const detail = error instanceof EssBridgeError && error.detail ? `: ${error.detail}` : '';
    throw new StoreError(ESS_ERROR, `The SQL database "${connection.database ?? connection.name}" ${reason} (connection "${connection.name}", host ${connection.host}:${connection.port})${detail}`);
  }
}

/** Metadata is fetched before synchronous checkDesign/applyDesign. Supplied columns are never trusted from HTTP. */
export async function prepareSqlDesign(store: Store, ops: DesignOp[]): Promise<DesignOp[]> {
  const prepared: DesignOp[] = [];
  for (const op of ops) {
    if (op.op !== 'createShadowTable' && op.op !== 'syncShadowTable') { prepared.push(op); continue; }
    const table = op.op === 'syncShadowTable' ? store.schema.tables.find((t) => t.id === op.table || t.name.toLowerCase() === String(op.table).toLowerCase()) : undefined;
    const ds = op.op === 'createShadowTable'
      ? store.schema.dataSources.find((d) => d.id === op.dataSource || d.name.toLowerCase() === String(op.dataSource).toLowerCase())
      : store.schema.dataSources.find((d) => d.id === table?.external?.dataSourceId);
    if (!ds?.paths[0]?.startsWith('odbc:')) throw new StoreError(ESS_ERROR, 'Create the ODBC data source before creating its shadow table');
    const name = ds.connection ?? ds.paths[0].slice(5);
    const connection = store.sqlConnection(name);
    if (!connection) throw new StoreError(ESS_ERROR, `The SQL data source "${ds.name}" has no active approved connection "${name}" allowed for this file; list the file in the connection's Files setting`);
    const external = table?.external ?? { table: op.op === 'createShadowTable' ? op.table : '', schema: op.op === 'createShadowTable' ? op.schema ?? connection.schema : undefined, keys: [] };
    const columns = await sqlRequest<SqlColumn[]>(connection, 'columns', [{ schema: external.schema, name: external.table }], store.sqlLog);
    if (JSON.stringify(store.sqlConnection(name)) !== JSON.stringify(connection)) throw new StoreError(ESS_ERROR, 'The SQL connection changed while its columns were being read; retry the design change');
    const keys = op.op === 'createShadowTable' ? op.keys ?? columns.filter((c) => c.key).map((c) => c.name) : external.keys;
    if (!keys.length) throw new StoreError(ESS_ERROR, `The SQL table "${external.table}" has no primary key; give keys with its unique column names`);
    for (const key of keys) if (!columns.some((c) => c.name === key)) throw new StoreError(ESS_ERROR, `The SQL key column "${key}" is missing from "${external.table}"`);
    prepared.push({ ...op, ...(op.op === 'createShadowTable' ? { keys, schema: external.schema } : {}),
      columns: columns.map((c) => ({ name: c.name, type: essFieldType(c.type) })) });
  }
  return prepared;
}

/** One refresh in flight per table. Retries are timer-driven and stop when the hosted store closes or changes. */
export function installSqlRefresh(store: Store, alive: () => boolean, log: (message: string) => void, query: typeof sqlRequest = sqlRequest): void {
  const pending = new Map<number, { running: boolean; delay: number; retryAt: number; timer?: ReturnType<typeof setTimeout> }>();
  const request = (table: Table) => {
    if (!alive() || !store.schema.tables.includes(table)) return;
    for (const [id, state] of pending) if (!store.schema.tables.some((t) => t.id === id)) { clearTimeout(state.timer); pending.delete(id); }
    let state = pending.get(table.id);
    if (!state) { state = { running: false, delay: 1000, retryAt: 0 }; pending.set(table.id, state); }
    if (state.running || store.essClock() < state.retryAt) return;
    clearTimeout(state.timer);
    state.running = true;
    const job = state;
    void (async () => {
      try {
        const { connection } = sourceFor(store.schema, store.sqlConnection, table);
        const external = table.external!;
        const names = table.fields.filter((f) => f.externalColumn && !f.externalDropped).map((f) => f.name);
        const from = [external.schema, external.table].filter((s): s is string => !!s).map((s) => essName(s, connection.dialect)).join('.');
        const maxRows = wholeNumber('TABULARIUS_ESS_MAX_ROWS', { min: 1 }) ?? 100_000;
        const result = await query<SqlResult>(connection, 'query', [`SELECT ${names.map((n) => essName(n, connection.dialect)).join(', ')} FROM ${from}`, [], { maxRows }], log);
        if (!alive() || !store.schema.tables.includes(table)) return;
        const current = sourceFor(store.schema, store.sqlConnection, table).connection;
        if (JSON.stringify(current) !== JSON.stringify(connection)) return; // Approval, target or credentials changed during the request.
        store.loadShadow(table, connection, result);
        job.delay = 1000;
        job.retryAt = 0;
      } catch (error) {
        if (!alive() || !store.schema.tables.includes(table)) return;
        store.shadowFailed(table, error instanceof StoreError ? error.message : 'The SQL mirror could not refresh; check the connection');
        job.retryAt = store.essClock() + job.delay;
        job.timer = setTimeout(() => request(table), job.delay);
        job.timer.unref();
        job.delay = Math.min(300_000, job.delay * 2);
      } finally { job.running = false; }
    })();
  };
  store.requestShadowRefresh = request;
}
