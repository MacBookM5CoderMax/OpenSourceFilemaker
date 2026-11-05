import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export type SqlValue = string | number | bigint | boolean | null | Uint8Array | Date;
export interface SqlColumn { name: string; type: string; nullable: boolean; key: boolean }
export interface SqlResult { columns: { name: string; type: string }[]; rows: SqlValue[][]; affected?: number }
export interface SqlDriver {
  readonly dialect: 'postgresql' | 'mysql' | 'sqlserver' | 'oracle' | 'sqlite';
  query(sql: string, params: SqlValue[], opts?: { timeoutMs?: number; maxRows?: number; parameterTypes?: string[] }): Promise<SqlResult>;
  transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T>;
  tables(): Promise<{ schema?: string; name: string }[]>;
  columns(table: { schema?: string; name: string }): Promise<SqlColumn[]>;
  quoteName(name: string): string;
  placeholder(n: number): string;
  close(): Promise<void>;
}

/** ESS error-number parity with FileMaker is unverified. Use one number for every SQL-source failure. */
export const ESS_ERROR = 8310;

export interface EssWrite {
  kind: 'create' | 'edit' | 'delete';
  recordId?: number;
  schema?: string;
  table: string;
  keys: string[];
  /** Mapped columns only. Supplemental fields never enter a write. */
  values: Record<string, SqlValue>;
  before?: Record<string, SqlValue>;
}

export interface EssWriteResult { keys?: SqlValue[]; deleted?: boolean }

function nullableMatch(driver: SqlDriver, column: string, n: number): string {
  const field = driver.quoteName(column);
  const param = driver.placeholder(n);
  if (driver.dialect === 'mysql') return `${field} <=> ${param}`;
  if (driver.dialect === 'sqlite') return `${field} IS ${param}`;
  return `(${field} = ${param} OR (${field} IS NULL AND ${param} IS NULL))`;
}

/** Build the dialect-specific DML in one place. Network dialects remain unverified against real servers. */
export async function writeEssRow(driver: SqlDriver, write: EssWrite): Promise<EssWriteResult> {
  const table = [write.schema, write.table].filter((name): name is string => !!name).map((name) => driver.quoteName(name)).join('.');
  const names = Object.keys(write.values);
  const params: SqlValue[] = names.map((name) => write.values[name]);
  // Mirrors retain dates as ISO text and booleans as 0/1. Bind with the actual column types,
  // including the original values in the optimistic predicate, rather than inferring integer/text.
  const types = driver.dialect === 'postgresql' ? new Map((await driver.columns({ schema: write.schema, name: write.table })).map((c) => [c.name, c.type])) : undefined;
  const query = (statement: string, values: SqlValue[], columns: string[]) => driver.query(statement, values.map((value, index) =>
    /^(boolean|bool)$/i.test(types?.get(columns[index]) ?? '') && (value === 0 || value === 1) ? value === 1 : value),
  types ? { parameterTypes: columns.map((name) => types.get(name) ?? '') } : undefined);
  const keys = write.keys.map((name) => driver.quoteName(name));
  if (write.kind === 'create') {
    const columns = names.length ? `(${names.map((name) => driver.quoteName(name)).join(', ')})` : '';
    const values = names.length ? `VALUES (${names.map((_, index) => driver.placeholder(index + 1)).join(', ')})`
      : driver.dialect === 'mysql' ? 'VALUES ()' : 'DEFAULT VALUES';
    const insertColumns = names.length ? columns : driver.dialect === 'mysql' ? '()' : '';
    const output = keys.join(', ');
    const returning = driver.dialect === 'postgresql' || driver.dialect === 'sqlite' ? ` RETURNING ${output}` : '';
    const inserted = driver.dialect === 'sqlserver' ? ` OUTPUT ${keys.map((key) => `INSERTED.${key}`).join(', ')}` : '';
    const oracle = driver.dialect === 'oracle' ? ` RETURNING ${output} INTO ${keys.map((_, index) => driver.placeholder(params.length + index + 1)).join(', ')}` : '';
    const result = await query(`INSERT INTO ${table} ${insertColumns}${inserted} ${values}${returning}${oracle}`, driver.dialect === 'oracle' ? [...params, ...keys.map(() => null)] : params, names);
    if (result.rows[0]) return { keys: result.rows[0] };
    const supplied = write.keys.map((name) => write.values[name]);
    if (supplied.every((value) => value !== undefined && value !== null)) return { keys: supplied };
    if (driver.dialect === 'mysql' && write.keys.length === 1) {
      const generated = await driver.query('SELECT LAST_INSERT_ID()', []);
      return { keys: [generated.rows[0]?.[0] ?? null] };
    }
    if (supplied.some((value) => value === undefined || value === null)) throw new Error('The SQL database did not return a key for the new row');
    return { keys: supplied };
  }
  const before = write.before;
  if (!before) throw new Error('The SQL row has no original values');
  const whereColumns = write.kind === 'delete' ? write.keys : [...new Set([...write.keys, ...Object.keys(before)])];
  let where: string;
  if (write.kind === 'edit') {
    where = whereColumns.map((name, index) => nullableMatch(driver, name, params.length + index + 1)).join(' AND ');
    params.push(...whereColumns.map((name) => before[name]));
  } else {
    where = whereColumns.map((name, index) => `${driver.quoteName(name)} = ${driver.placeholder(index + 1)}`).join(' AND ');
    params.push(...whereColumns.map((name) => before[name]));
  }
  const sql = write.kind === 'edit'
    ? `UPDATE ${table} SET ${names.map((name, index) => `${driver.quoteName(name)} = ${driver.placeholder(index + 1)}`).join(', ')} WHERE ${where}`
    : `DELETE FROM ${table} WHERE ${where}`;
  const result = await query(sql, params, [...names, ...whereColumns]);
  const affected = result.affected ?? result.rows.length;
  if (write.kind === 'edit' && affected === 0) throw new EssConflict();
  return write.kind === 'delete' ? { deleted: affected > 0 } : { keys: write.keys.map((name) => write.values[name] ?? before[name]) };
}

export class EssConflict extends Error { constructor() { super('The SQL row changed after it was read'); } }

/** One outside transaction for all writes in a record or portal commit on this connection. */
export function writeEssBatch(driver: SqlDriver, writes: EssWrite[]): Promise<EssWriteResult[]> {
  return driver.transaction(async (tx) => {
    const results: EssWriteResult[] = [];
    const pending = new Map<number, EssWrite['values']>();
    for (const write of writes) {
      const prior = write.recordId === undefined ? undefined : pending.get(write.recordId);
      if (prior && write.before) write.before = { ...write.before, ...prior };
      const result = await writeEssRow(tx, write);
      results.push(result);
      if (write.recordId !== undefined) {
        if (write.kind === 'delete') pending.delete(write.recordId);
        else {
          const row = { ...prior, ...write.values };
          if (result.keys) for (let index = 0; index < write.keys.length; index++) row[write.keys[index]] = result.keys[index];
          pending.set(write.recordId, row);
        }
      }
    }
    return results;
  });
}

/** A local stand-in for an outside SQL source. No network client is needed for tests. */
export class SqliteDriver implements SqlDriver {
  readonly dialect = 'sqlite' as const;
  private readonly db: DatabaseSync;

  constructor(path = ':memory:') { this.db = new DatabaseSync(path); }
  quoteName(name: string): string { return `"${name.replaceAll('"', '""')}"`; }
  placeholder(_n: number): string { return '?'; }

  async query(sql: string, params: SqlValue[] = [], opts: { timeoutMs?: number; maxRows?: number } = {}): Promise<SqlResult> {
    const stmt = this.db.prepare(sql);
    const values = params.map((v): SQLInputValue => v instanceof Date ? v.toISOString() : typeof v === 'boolean' ? Number(v) : v);
    const columns = stmt.columns().map((c) => ({ name: c.name, type: '' }));
    if (!columns.length) return { columns, rows: [], affected: Number(stmt.run(...values).changes) };
    const rows: SqlValue[][] = [];
    for (const row of stmt.iterate(...values)) {
      if (opts.maxRows !== undefined && rows.length >= opts.maxRows) throw new Error(`SQL row limit of ${opts.maxRows} exceeded`);
      rows.push(columns.map((c) => row[c.name] as SqlValue));
    }
    return { columns, rows };
  }

  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN');
    try { const result = await fn(this); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  async tables(): Promise<{ schema?: string; name: string }[]> {
    return (this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]);
  }

  async columns(table: { schema?: string; name: string }): Promise<SqlColumn[]> {
    if (table.schema && table.schema !== 'main') throw new Error('SQLite schema is not available');
    const rows = this.db.prepare(`PRAGMA table_info(${this.quoteName(table.name)})`).all() as { name: string; type: string; notnull: number; pk: number }[];
    if (!rows.length) throw new Error('SQL table is missing');
    return rows.map((r) => ({ name: r.name, type: r.type, nullable: !r.notnull && !r.pk, key: r.pk > 0 }));
  }

  async close(): Promise<void> { this.db.close(); }
}
