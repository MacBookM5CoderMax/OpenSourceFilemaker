import type { DatabaseSync } from 'node:sqlite';
import type { FieldType, Schema, Table } from '../../../fmp12/src/schema.ts';
import { q } from '../import.ts';
import { wholeNumber } from '../settings.ts';
import { StoreError } from '../errors.ts';
import { ESS_ERROR, type SqlResult } from './driver.ts';
import { essCall, EssBridgeError, type EssOperation, type SqlConnection } from './bridge.ts';

export function sourceFor(schema: Schema, resolve: (name: string) => SqlConnection | undefined, table: Table): { source: Schema['dataSources'][number]; connection: SqlConnection } {
  const source = schema.dataSources.find((d) => d.id === table.external?.dataSourceId);
  if (!source?.paths[0]?.startsWith('odbc:')) throw new StoreError(ESS_ERROR, `The SQL data source for "${table.name}" is missing`);
  const name = source.connection ?? source.paths[0].slice(5);
  let connection: SqlConnection | undefined;
  try { connection = resolve(name); }
  catch { throw new StoreError(ESS_ERROR, `The SQL database "${source.name}" could not resolve its approved connection for this file`); }
  if (!connection) throw new StoreError(ESS_ERROR, `The SQL database "${source.name}" has no approved connection "${name}" for this file`);
  return { source, connection };
}

export function requestFor<T>(schema: Schema, resolve: (name: string) => SqlConnection | undefined, table: Table, op: EssOperation, args: unknown[]): T {
  const { source, connection } = sourceFor(schema, resolve, table);
  const seconds = wholeNumber('TABULARIUS_ESS_TIMEOUT_SECONDS', { min: 1 }) ?? 30;
  try { return essCall<T>(connection, op, args, seconds * 1000); }
  catch (error) {
    const location = connection.host ? `, host ${connection.host}${connection.port ? `:${connection.port}` : ''}` : '';
    if (error instanceof EssBridgeError && error.reason === 'row-limit') {
      const cap = wholeNumber('TABULARIUS_ESS_MAX_ROWS', { min: 1 }) ?? 100_000;
      throw new StoreError(ESS_ERROR, `The SQL database "${source.name}" has more than ${cap} rows in "${table.external?.table}". Pushed-down finds are coming in a later item; raise TABULARIUS_ESS_MAX_ROWS to read this table now`);
    }
    if (error instanceof EssBridgeError && error.reason === 'resting') {
      const wait = Math.max(1, Math.ceil((error.retryInMs ?? 0) / 1000));
      throw new StoreError(ESS_ERROR, `The SQL database "${source.name}" did not answer in time a moment ago and is asked again in ${wait} second${wait === 1 ? '' : 's'} (connection "${connection.name}"${location})`);
    }
    const what = error instanceof EssBridgeError && error.reason === 'timeout' ? `did not answer within ${seconds} second${seconds === 1 ? '' : 's'}` : 'could not be read';
    throw new StoreError(ESS_ERROR, `The SQL database "${source.name}" ${what} (connection "${connection.name}"${location})`);
  }
}

export function essName(name: string, dialect: SqlConnection['dialect']): string {
  if (dialect === 'mysql') return `\`${name.replaceAll('`', '``')}\``;
  if (dialect === 'sqlserver') return `[${name.replaceAll(']', ']]')}]`;
  return q(name);
}

export function essFieldType(type: string): FieldType {
  const value = type.toLowerCase().trim();
  if (/^(integer|int|smallint|bigint|numeric|real|decimal|float|double)/.test(value)) return 'number';
  if (/^(date)(\b|\()/.test(value)) return 'date';
  if (/^(time)(\b|\()/.test(value)) return 'time';
  if (/^(timestamp|datetime)/.test(value)) return 'timestamp';
  if (/^(bytea|blob|binary|varbinary)/.test(value)) return 'container';
  return 'text';
}

/** Whole-table refresh is atomic: a cap, duplicate key or source failure leaves the old mirror untouched. */
export function refreshMirror(options: {
  table: Table;
  sql: DatabaseSync;
  clock: () => number;
  fresh: Map<number, number>;
  connection: SqlConnection;
  query: (sql: string, maxRows: number) => SqlResult;
  nextId: () => number;
  nextUuid?: () => string;
}): void {
  const { table, sql, clock, fresh, connection, query, nextId } = options;
  const external = table.external!;
  const now = clock();
  const interval = (wholeNumber('TABULARIUS_ESS_REFRESH_SECONDS', { min: 0 }) ?? 5) * 1000;
  if (fresh.has(table.id) && now - fresh.get(table.id)! < interval) return;
  const names = table.fields.filter((f) => f.externalColumn && !f.externalDropped).map((f) => f.name);
  for (const key of external.keys) if (!names.includes(key)) throw new StoreError(ESS_ERROR, `The SQL key column "${key}" is missing from "${external.table}"`);
  const source = [external.schema, external.table].filter(Boolean).map((n) => essName(n!, connection.dialect)).join('.');
  const cap = wholeNumber('TABULARIUS_ESS_MAX_ROWS', { min: 1 }) ?? 100_000;
  const started = performance.now();
  const result = query(`SELECT ${names.map((n) => essName(n, connection.dialect)).join(', ')} FROM ${source}`, cap);
  const keyTable = q(`_fm_ess_keys_${table.id}`);
  const nested = sql.isTransaction;
  sql.exec(nested ? 'SAVEPOINT ess_refresh' : 'BEGIN IMMEDIATE');
  try {
    sql.exec(`CREATE TABLE IF NOT EXISTS ${keyTable} (record_id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE)`);
    const prior = new Map((sql.prepare(`SELECT key, record_id FROM ${keyTable}`).all() as { key: string; record_id: number }[]).map((r) => [r.key, r.record_id]));
    const seen = new Set<string>();
    const put = sql.prepare(`INSERT INTO ${q(table.name)} (_fm_record_id${options.nextUuid ? ', _fm_uuid' : ''}, ${names.map(q).join(', ')}) VALUES (?${options.nextUuid ? ', ?' : ''}, ${names.map(() => '?').join(', ')})`);
    const change = sql.prepare(`UPDATE ${q(table.name)} SET ${names.map((n) => `${q(n)} = ?`).join(', ')}, _fm_mod_id = _fm_mod_id + 1 WHERE _fm_record_id = ? AND (${names.map((n) => `${q(n)} IS NOT ?`).join(' OR ')})`);
    const addKey = sql.prepare(`INSERT INTO ${keyTable} (record_id, key) VALUES (?, ?)`);
    for (const row of result.rows) {
      const key = JSON.stringify(external.keys.map((n) => {
        const value = row[names.indexOf(n)];
        return typeof value === 'bigint' ? value.toString() : value instanceof Uint8Array ? Buffer.from(value).toString('base64') : value instanceof Date ? value.toISOString() : value;
      }));
      if (seen.has(key)) throw new StoreError(ESS_ERROR, `The SQL key columns of "${external.table}" are not unique`);
      seen.add(key);
      const values = row.map((v) => v instanceof Date ? v.toISOString() : typeof v === 'boolean' ? Number(v) : v);
      const id = prior.get(key);
      if (id === undefined) {
        const next = nextId();
        put.run(next, ...(options.nextUuid ? [options.nextUuid()] : []), ...values);
        addKey.run(next, key);
      } else change.run(...values, id, ...values);
    }
    const remove = sql.prepare(`DELETE FROM ${q(table.name)} WHERE _fm_record_id = ?`);
    const removeKey = sql.prepare(`DELETE FROM ${keyTable} WHERE key = ?`);
    for (const [key, id] of prior) if (!seen.has(key)) { remove.run(id); removeKey.run(key); }
    const dropped = table.fields.filter((f) => f.externalColumn && f.externalDropped);
    if (dropped.length) sql.exec(`UPDATE ${q(table.name)} SET ${dropped.map((f) => `${q(f.name)} = NULL`).join(', ')}`);
    sql.exec(nested ? 'RELEASE ess_refresh' : 'COMMIT');
    // The read blocked this process while it ran: a source that takes long to answer is read again only after nine times
    // as long, so a slow database cannot hold the server for more than about a tenth of the time.
    fresh.set(table.id, now + Math.max(0, 9 * (performance.now() - started) - interval));
  } catch (error) {
    sql.exec(nested ? 'ROLLBACK TO ess_refresh; RELEASE ess_refresh' : 'ROLLBACK');
    throw error;
  }
}
