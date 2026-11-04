import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store, StoreError } from '../src/index.ts';
import { SqliteDriver, ESS_ERROR, type SqlResult } from '../src/ess/driver.ts';
import { allowSqliteStandIn, closeEssBridge, essCall, EssBridgeError } from '../src/ess/bridge.ts';
import { refreshMirror, requestFor } from '../src/ess/mirror.ts';

// The bridge waits on the thread that serves requests, and the sqlite driver opens any path it is given: neither may
// let a connection reach more than it should (issue #1088).

const slow = 'WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n) SELECT x FROM n LIMIT 100000000';

test('a running server has no sqlite driver: a sqlite connection opens no file', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-limits-'));
  t.after(() => { closeEssBridge(); rmSync(dir, { recursive: true, force: true }); });
  const path = join(dir, 'other.sqlite');
  assert.throws(() => essCall({ name: 'probe', dialect: 'sqlite', path }, 'tables'), (e: unknown) => e instanceof EssBridgeError && e.reason === 'failure');
  assert.equal(existsSync(path), false, 'the path is never opened (opening would create it)');
});

test('a connection that did not answer in time rests: the next calls to it fail at once and say when it is asked again', async (t) => {
  allowSqliteStandIn();
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-limits-'));
  let store: Store | undefined;
  let outside: SqliteDriver | undefined;
  t.after(async () => { store?.close(); await outside?.close(); closeEssBridge(); rmSync(dir, { recursive: true, force: true }); });
  const connection = { name: 'Slow', dialect: 'sqlite' as const, path: ':memory:' };
  assert.throws(() => essCall(connection, 'query', [slow, [], { maxRows: 100000000 }], 100), (e: unknown) => e instanceof EssBridgeError && e.reason === 'timeout');
  const started = performance.now();
  assert.throws(() => essCall({ ...connection, name: 'slow' }, 'query', ['SELECT 1', []], 5_000),
    (e: unknown) => e instanceof EssBridgeError && e.reason === 'resting' && e.retryInMs! > 50_000 && e.retryInMs! <= 60_000);
  assert.ok(performance.now() - started < 1_000, 'a resting connection is not waited on');
  // Another connection is not held back by this one.
  assert.deepEqual(essCall<SqlResult>({ ...connection, name: 'other' }, 'query', ['SELECT 1 AS one', []]).rows, [[1]]);

  // The store says what is happening and when the source is asked again.
  outside = new SqliteDriver(join(dir, 'outside.sqlite'));
  await outside.query('CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT)', []);
  createStore(join(dir, 'S.sqlite'));
  store = new Store(join(dir, 'S.sqlite'), 'S');
  store.sqlConnection = () => ({ name: 'sales', dialect: 'sqlite', path: join(dir, 'outside.sqlite') });
  store.applyDesign([{ op: 'createDataSource', name: 'Sales', paths: ['odbc:Sales'] }]);
  store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
  process.env.TABULARIUS_ESS_TIMEOUT_SECONDS = '1';
  const file = store;
  try {
    assert.throws(() => requestFor(file.schema, file.sqlConnection, file.schema.tables[0], 'query', [slow, [], { maxRows: 100000000 }]), (e: unknown) => e instanceof StoreError && e.code === ESS_ERROR && /did not answer within 1 second/.test(e.message));
    assert.throws(() => requestFor(file.schema, file.sqlConnection, file.schema.tables[0], 'query', ['SELECT 1', []]),
      (e: unknown) => e instanceof StoreError && e.code === ESS_ERROR && /did not answer in time a moment ago and is asked again in 60 seconds/.test(e.message));
    // A write in that time is refused at once and reaches neither the source nor the mirror.
    assert.throws(() => file.create('customers', { id: 9, name: 'New' }),
      (e: unknown) => e instanceof StoreError && e.code === ESS_ERROR && /asked again in \d+ seconds; nothing was written/.test(e.message));
    assert.equal(file.query('SELECT count(*) AS n FROM customers')[0].n, 0);
  } finally { delete process.env.TABULARIUS_ESS_TIMEOUT_SECONDS; }
});

test('a refresh that took long pushes the next one back by nine times as long', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-limits-'));
  createStore(join(dir, 'S.sqlite'));
  const store = new Store(join(dir, 'S.sqlite'), 'S');
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.applyDesign([{ op: 'createTable', name: 'customers', fields: [{ name: 'id', type: 'number' }] }]);
  const table = { ...store.schema.tables[0], external: { dataSourceId: 1, table: 'customers', keys: ['id'] }, fields: store.schema.tables[0].fields.map((f) => ({ ...f, externalColumn: true })) } as unknown as Parameters<typeof refreshMirror>[0]['table'];
  process.env.TABULARIUS_ESS_REFRESH_SECONDS = '0';
  t.after(() => { delete process.env.TABULARIUS_ESS_REFRESH_SECONDS; });
  let now = 1_000_000;
  let reads = 0;
  const fresh = new Map<number, number>();
  const refresh = () => refreshMirror({ table, sql: store.sql, clock: () => now, fresh, connection: { name: 'x', dialect: 'sqlite' }, nextId: () => 1,
    query: () => {
      reads++;
      const until = performance.now() + 50;
      while (performance.now() < until) { /* a source that takes 50 ms to answer */ }
      return { columns: [], rows: [] };
    } });
  refresh();
  assert.equal(reads, 1);
  now += 100;
  refresh();
  assert.equal(reads, 1, 'not read again 100 ms after a 50 ms read');
  now += 1_000;
  refresh();
  assert.equal(reads, 2, 'read again once nine times the read has passed');
});
