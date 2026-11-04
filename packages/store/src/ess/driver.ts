import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export type SqlValue = string | number | bigint | boolean | null | Uint8Array | Date;
export interface SqlColumn { name: string; type: string; nullable: boolean; key: boolean }
export interface SqlResult { columns: { name: string; type: string }[]; rows: SqlValue[][]; affected?: number }
export interface SqlDriver {
  readonly dialect: 'postgresql' | 'mysql' | 'sqlserver' | 'oracle' | 'sqlite';
  query(sql: string, params: SqlValue[], opts?: { timeoutMs?: number; maxRows?: number }): Promise<SqlResult>;
  transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T>;
  tables(): Promise<{ schema?: string; name: string }[]>;
  columns(table: { schema?: string; name: string }): Promise<SqlColumn[]>;
  quoteName(name: string): string;
  placeholder(n: number): string;
  close(): Promise<void>;
}

/** ESS error-number parity with FileMaker is unverified. Use one number for every SQL-source failure. */
export const ESS_ERROR = 8310;

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
