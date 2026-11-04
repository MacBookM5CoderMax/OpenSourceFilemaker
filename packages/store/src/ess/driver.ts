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
