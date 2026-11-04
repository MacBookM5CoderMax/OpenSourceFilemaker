import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, parseScriptText, relatedRows, Store, StoreError } from '../src/index.ts';
import { scriptStepName, type Script } from '@tabularius/fmp12';
import { runScript } from '../../scripts/src/index.ts';
import { SqliteDriver, ESS_ERROR } from '../src/ess/driver.ts';
import { allowSqliteStandIn, closeEssBridge, essCall, EssBridgeError } from '../src/ess/bridge.ts';
import { refreshMirror, requestFor } from '../src/ess/mirror.ts';

const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-core-'));
after(() => { closeEssBridge(); rmSync(dir, { recursive: true, force: true }); });
// These tests use SQLite files as outside sources: the driver for that is registered only when a test asks for it.
allowSqliteStandIn();

async function setup(name: string): Promise<{ store: Store; outside: SqliteDriver; tick: (n: number) => void }> {
  const outsidePath = join(dir, `${name}-outside.sqlite`);
  const outside = new SqliteDriver(outsidePath);
  await outside.query('CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, since DATE, balance NUMERIC)', []);
  await outside.query('CREATE TABLE orders (id INTEGER, customer_id INTEGER, total NUMERIC)', []);
  await outside.query('INSERT INTO customers VALUES (1, ?, ?, ?), (2, ?, ?, ?)', ['Ada', '2026-01-02', 12.5, 'Bela', '2026-02-03', 8]);
  const path = join(dir, `${name}.sqlite`);
  createStore(path);
  const store = new Store(path, name);
  store.sqlConnection = (dsn) => dsn.toLowerCase() === 'sales' ? { name: 'sales', dialect: 'sqlite', path: outsidePath } : undefined;
  let now = 1_000_000;
  store.essClock = () => now;
  store.applyDesign([{ op: 'createDataSource', name: 'Sales', paths: ['odbc:Sales'] }]);
  return { store, outside, tick: (n) => { now += n; } };
}

test('shadow schema, layout find and sort, refresh, stable ids, and supplemental calculation', async () => {
  const { store, outside, tick } = await setup('reading');
  try {
    assert.deepEqual((await outside.columns({ name: 'customers' })).find((c) => c.name === 'id'), { name: 'id', type: 'INTEGER', nullable: false, key: true });
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    const table = store.schema.tables.find((t) => t.name === 'customers')!;
    assert.deepEqual(table.external?.keys, ['id']);
    assert.deepEqual(table.fields.map((f) => [f.name, f.type]), [['id', 'number'], ['name', 'text'], ['since', 'date'], ['balance', 'number']]);
    assert.deepEqual(store.findIds('customers').length, 2);
    const original = store.findIds('customers');
    assert.deepEqual(store.findIds('customers', { query: [{ name: 'Bela' }] }), [original[1]]);
    assert.deepEqual(store.findIds('customers', { sort: [{ fieldName: 'name', sortOrder: 'descend' }] }), [original[1], original[0]]);
    assert.equal(store.get('customers', original[0]).fieldData.name, 'Ada');
    const modId = store.get('customers', original[0]).modId;
    tick(5_000);
    assert.equal(store.get('customers', original[0]).modId, modId);
    store.applyDesign([{ op: 'createField', table: 'customers', name: 'label', kind: 'calculation', calculation: 'name & "!"' }]);
    assert.equal(store.get('customers', original[0]).fieldData.label, 'Ada!');
    const statements: string[] = [];
    const tableWithCalculation = store.schema.tables.find((t) => t.name === 'customers')!;
    assert.ok(tableWithCalculation.fields.some((field) => field.name === 'label'));
    refreshMirror({ table: tableWithCalculation, sql: store.sql, clock: () => 0, fresh: new Map(), connection: { name: 'sales', dialect: 'sqlite' },
      query: (sql) => {
        statements.push(sql);
        return { columns: [], rows: [[1, 'Ada', '2026-01-02', 12.5], [2, 'Bela', '2026-02-03', 8]] };
      },
      nextId: () => { throw new Error('Existing SQL keys must keep their record ids'); },
    });
    assert.equal(statements.length, 1);
    assert.doesNotMatch(statements[0], /label/i);
    await outside.query('UPDATE customers SET name = ? WHERE id = 1', ['Ada changed']);
    assert.equal(store.get('customers', original[0]).fieldData.name, 'Ada');
    tick(5_000);
    assert.equal(store.get('customers', original[0]).fieldData.name, 'Ada changed');
    assert.deepEqual(store.findIds('customers'), original);
    await outside.query('DELETE FROM customers WHERE id = 1', []);
    tick(5_000);
    assert.deepEqual(store.findIds('customers').length, 1);
    await outside.query('INSERT INTO customers VALUES (1, ?, ?, ?)', ['Again', '2026-03-04', 2]);
    tick(5_000);
    const ids = store.findIds('customers');
    assert.equal(ids.length, 2);
    assert.ok(ids.some((id) => id > Math.max(...original)));
    assert.throws(() => store.get('customers', original[0]), (error: unknown) => error instanceof StoreError && error.code === 101);
  } finally { store.close(); await outside.close(); }
});

test('sync adds columns and the row cap leaves the mirror unchanged', async () => {
  const { store, outside, tick } = await setup('sync');
  try {
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    assert.equal(store.findIds('customers').length, 2);
    await outside.query('ALTER TABLE customers ADD COLUMN city TEXT', []);
    await outside.query('UPDATE customers SET city = ? WHERE id = 1', ['Toronto']);
    store.applyDesign([{ op: 'syncShadowTable', table: 'customers' }]);
    tick(5_000);
    assert.equal(store.schema.tables[0].fields.find((f) => f.name === 'city')?.externalColumn, true, JSON.stringify(store.schema.tables.map((t) => [t.name, t.fields.map((f) => f.name)])));
    const ids = store.findIds('customers');
    assert.equal(store.query('SELECT city FROM customers WHERE id = 1')[0].city, 'Toronto');
    assert.equal(store.get('customers', ids[0]).fieldData.city, 'Toronto');
    process.env.TABULARIUS_ESS_MAX_ROWS = '1';
    tick(5_000);
    assert.throws(() => store.findIds('customers'), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /Pushed-down finds/.test(error.message));
    assert.equal(store.query('SELECT count(*) AS n FROM customers')[0].n, 2);
    delete process.env.TABULARIUS_ESS_MAX_ROWS;
    await outside.query('ALTER TABLE customers DROP COLUMN city', []);
    store.applyDesign([{ op: 'syncShadowTable', table: 'customers' }]);
    tick(5_000);
    assert.equal(store.get('customers', ids[0]).fieldData.city, '');
    assert.equal(store.query('SELECT city FROM customers WHERE id = 1')[0].city, null);
    assert.equal(store.schema.tables[0].fields.find((f) => f.name === 'city')?.externalDropped, true);
  } finally { delete process.env.TABULARIUS_ESS_MAX_ROWS; store.close(); await outside.close(); }
});

test('a local table relates to a shadow table and a portal reads its rows', async () => {
  const { store, outside } = await setup('portal');
  try {
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    store.applyDesign([
      { op: 'createTable', name: 'local_orders', fields: [{ name: 'customer_id', type: 'number' }] },
      { op: 'createRelationship', left: 'local_orders', right: 'customers', predicates: [{ left: 'customer_id', right: 'id' }] },
    ]);
    const localId = store.create('local_orders', { customer_id: 1 }).recordId;
    const local = store.schema.tableOccurrences.find((t) => t.name === 'local_orders')!.id;
    const shadow = store.schema.tableOccurrences.find((t) => t.name === 'customers')!.id;
    const row = (store as unknown as { row(info: unknown, id: number): Record<string, string | number> }).row(store.layout('local_orders'), localId);
    assert.equal(relatedRows(store, local, row, shadow)?.rows[0].name, 'Ada');
    const layout = store.design('local_orders')!;
    const nameField = store.schema.tables.find((t) => t.name === 'customers')!.fields.find((f) => f.name === 'name')!.id;
    const ref = { tableOccurrenceId: shadow, fieldId: nameField, tableOccurrence: 'customers', field: 'name' };
    const portal = {
      id: 900, kind: 'portal', type: 9, anchors: { left: true, top: true, right: false, bottom: false }, bounds: { top: 200, left: 20, bottom: 300, right: 300 }, style: {},
      portal: { tableOccurrenceId: shadow, tableOccurrence: 'customers', rows: 4, initialRow: 1 },
      children: [{ id: 901, kind: 'field', type: 1, anchors: { left: true, top: true, right: false, bottom: false }, bounds: { top: 202, left: 22, bottom: 222, right: 120 }, style: {}, field: { ...ref, display: 'edit', repetitions: 1 } }],
    };
    store.applyDesign([{ op: 'updateLayout', layout: 'local_orders', design: { objects: [...layout.objects, portal] } as never }]);
    assert.equal(store.get('local_orders', localId).portalData?.customers[0]['customers::name'], 'Ada');
  } finally { store.close(); await outside.close(); }
});

test('a table without a primary key needs explicit unique columns', async () => {
  const { store, outside } = await setup('keys');
  try {
    assert.throws(() => store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'orders' }]), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /give keys/.test(error.message));
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'orders', keys: ['id'] }]);
    assert.deepEqual(store.schema.tables[0].external?.keys, ['id']);
  } finally { store.close(); await outside.close(); }
});

test('a shadow table keeps its mapping and mirror ids after reopening', async () => {
  const { store, outside } = await setup('reopen');
  let current = store;
  try {
    current.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    const ids = current.findIds('customers');
    current.close();
    current = new Store(join(dir, 'reopen.sqlite'), 'reopen');
    current.sqlConnection = () => ({ name: 'sales', dialect: 'sqlite', path: join(dir, 'reopen-outside.sqlite') });
    assert.deepEqual(current.schema.tables[0].external?.keys, ['id']);
    assert.deepEqual(current.findIds('customers'), ids);
  } finally { current.close(); await outside.close(); }
});

test('the worker replaces a named connection when its source changes under a pool limit', async () => {
  const first = new SqliteDriver(join(dir, 'pool-a.sqlite'));
  const second = new SqliteDriver(join(dir, 'pool-b.sqlite'));
  try {
    await first.query('CREATE TABLE a (id INTEGER)', []);
    await second.query('CREATE TABLE b (id INTEGER)', []);
    closeEssBridge();
    process.env.TABULARIUS_ESS_POOL = '1';
    const tables = (path: string) => essCall<{ name: string }[]>({ name: 'same', dialect: 'sqlite', path }, 'tables');
    assert.deepEqual(tables(join(dir, 'pool-a.sqlite')).map((t) => t.name), ['a']);
    assert.deepEqual(tables(join(dir, 'pool-b.sqlite')).map((t) => t.name), ['b']);
  } finally { closeEssBridge(); delete process.env.TABULARIUS_ESS_POOL; await first.close(); await second.close(); }
});

test('store writes reach SQL and unavailable connections are refused with one ESS code', async () => {
  const { store, outside } = await setup('refusal');
  try {
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    const id = store.findIds('customers')[0];
    const made = store.create('customers', { name: 'New' });
    assert.equal((await outside.query('SELECT name FROM customers WHERE id = ?', [made.recordId])).rows[0]?.[0], 'New');
    store.update('customers', id, { name: 'Changed' });
    assert.equal((await outside.query('SELECT name FROM customers WHERE id = 1', [])).rows[0]?.[0], 'Changed');
    store.delete('customers', made.recordId);
    assert.equal((await outside.query('SELECT count(*) FROM customers WHERE id = ?', [made.recordId])).rows[0]?.[0], 0);
    assert.throws(() => store.truncate('customers'), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /not built yet/.test(error.message));
    store.sqlConnection = () => undefined;
    store.essClock = () => Date.now() + 60_000;
    assert.throws(() => store.findIds('customers'), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /no approved connection/.test(error.message));
    const secret = ['hidden', 'passphrase'].join('-');
    const badPath = join(dir, 'missing-folder', 'outside.sqlite');
    store.sqlConnection = () => ({ name: 'broken', dialect: 'sqlite', path: badPath, password: secret });
    assert.throws(() => store.findIds('customers'), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /could not be read/.test(error.message) && !error.message.includes(secret) && !error.message.includes(badPath));
    store.sqlConnection = () => { throw new Error(secret); };
    assert.throws(() => store.findIds('customers'), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /could not resolve/.test(error.message) && !error.message.includes(secret));
  } finally { store.close(); await outside.close(); }
});

test('Import Records and Replace Field Contents write through shadow tables', async () => {
  const { store, outside } = await setup('script-refusal');
  try {
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    const ids = store.findIds('customers');
    const script = (source: string): Script => ({
      id: 9999, name: 'Refused SQL write',
      steps: parseScriptText(source, store.schema).map((step) => ({
        stepId: step.stepId!, name: scriptStepName(step.stepId!), enabled: true, params: step.params,
      })),
    });
    writeFileSync(join(dir, 'ess-script-rows.csv'), '3,New,2026-04-05,1\n4,Second,2026-04-06,2\n5,Third,2026-04-07,3\n');
    const imported = await runScript(store, script('Import Records [ With dialog: Off ; Table: customers ; Source: "ess-script-rows.csv" ; Add ; Fields: customers::id, customers::name, customers::since, customers::balance ]'), {
      layout: 'customers', documents: dir, foundSet: ids,
    });
    assert.equal(imported.error, 0);
    const replaced = await runScript(store, script('Replace Field Contents [ With dialog: Off ; customers::name ; "Changed" ]'), {
      layout: 'customers', foundSet: ids,
    });
    assert.equal(replaced.error, 0);
    assert.equal(store.findIds('customers').length, 5);
    assert.equal(store.get('customers', ids[0]).fieldData.name, 'Changed');
    assert.deepEqual((await outside.query('SELECT id, name FROM customers ORDER BY id', [])).rows, [[1, 'Changed'], [2, 'Changed'], [3, 'New'], [4, 'Second'], [5, 'Third']]);
  } finally { store.close(); await outside.close(); }
});

test('a denied layout cannot probe the outside connection through a find', async () => {
  const { store, outside } = await setup('denied');
  try {
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    store.savePrivilegeSet({ name: 'Blocked', records: { view: false, edit: false, create: false, delete: false }, layouts: 'none', scripts: 'none', valueLists: 'none', extendedPrivileges: [] });
    store.setPassword('blocked', 'password', 'Blocked');
    store.sqlConnection = () => { throw new Error('The resolver must not run'); };
    assert.throws(() => store.findIds('customers', { privileges: store.privileges('blocked') }), (error: unknown) => error instanceof StoreError && error.code !== ESS_ERROR);
  } finally { store.close(); await outside.close(); }
});

test('worker deadline is bounded', () => {
  assert.throws(() => essCall({ name: 'deadline', dialect: 'sqlite', path: ':memory:' }, 'query', ['WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n) SELECT x FROM n LIMIT 100000000', [], { maxRows: 100000000 }], 100), (error: unknown) => error instanceof EssBridgeError && error.reason === 'timeout');
});

test('a timed-out worker call becomes a bounded store ESS error', async () => {
  const { store, outside } = await setup('timeout');
  try {
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    process.env.TABULARIUS_ESS_TIMEOUT_SECONDS = '1';
    const started = performance.now();
    assert.throws(() => requestFor(store.schema, store.sqlConnection, store.schema.tables[0], 'query', ['WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n) SELECT x FROM n LIMIT 100000000', [], { maxRows: 100000000 }]), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /did not answer within 1 second/.test(error.message));
    assert.ok(performance.now() - started < 4_000);
  } finally { delete process.env.TABULARIUS_ESS_TIMEOUT_SECONDS; closeEssBridge(); store.close(); await outside.close(); }
});

test('another worker thread that imports the store keeps its own messages (the bridge answers only its own worker)', async () => {
  const { Worker } = await import('node:worker_threads');
  const source = `
    import { parentPort } from 'node:worker_threads';
    await import(${JSON.stringify(new URL('../src/ess/bridge.ts', import.meta.url).href)});
    parentPort.on('message', (m) => parentPort.postMessage({ echo: m }));
    parentPort.postMessage('ready');
  `;
  const worker = new Worker(source, { eval: true, execArgv: ['--experimental-strip-types', '--no-warnings'] });
  try {
    let failure: Error | undefined;
    worker.on('error', (e) => { failure = e; });
    const reply = await new Promise<unknown>((resolve) => {
      worker.on('message', (m) => { if (m === 'ready') worker.postMessage({ hello: 1 }); else resolve(m); });
    });
    assert.deepEqual(reply, { echo: { hello: 1 } });
    // A handler that took the message would fail on it (it is not a bridge request) and end the worker with an error.
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(failure, undefined, failure?.message);
  } finally { await worker.terminate(); }
});

test('a refresh that fails halfway (a repeated key after new rows) leaves the old mirror whole', async () => {
  const { store, outside, tick } = await setup('halfway');
  try {
    await outside.query('INSERT INTO orders VALUES (1, 1, 5), (2, 2, 6)', []);
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'orders', keys: ['customer_id'] }]);
    assert.equal(store.findIds('orders').length, 2);
    // A new row comes first, then a repeat of key 1: the new row is applied before the repeat is seen.
    await outside.query('INSERT INTO orders VALUES (3, 3, 7), (4, 1, 8)', []);
    tick(5_000);
    assert.throws(() => store.findIds('orders'), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /not unique/.test(error.message));
    assert.deepEqual(store.query('SELECT customer_id FROM orders ORDER BY customer_id').map((r) => r.customer_id), [1, 2]);
    // The failed transaction is closed, so the store still takes the next refresh.
    await outside.query('DELETE FROM orders WHERE id = 4', []);
    tick(5_000);
    assert.equal(store.findIds('orders').length, 3);
  } finally { store.close(); await outside.close(); }
});

test('a shadow field is a SQL column: it cannot be renamed, so reads keep working; other fields can', async () => {
  const { store, outside } = await setup('rename');
  try {
    store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'customers' }]);
    store.applyDesign([{ op: 'createField', table: 'customers', name: 'label', kind: 'calculation', calculation: 'name & "!"' }]);
    const before = store.findIds('customers');
    const refused = (error: unknown) => error instanceof StoreError && /SQL column/.test(error.message) && /customers::name/.test(error.message);
    // An ordinary column: the later SELECT would ask the source for a column it does not have.
    assert.throws(() => store.applyDesign([{ op: 'updateField', table: 'customers', field: 'name', name: 'fullname' }]), refused);
    // The key column: the later key match would not find it in the source.
    assert.throws(() => store.applyDesign([{ op: 'updateField', table: 'customers', field: 'id', name: 'cid' }]), (error: unknown) => error instanceof StoreError && /SQL column/.test(error.message));
    // Nothing changed, and the table still reads.
    assert.deepEqual(store.schema.tables.find((t) => t.name === 'customers')!.fields.map((f) => f.name), ['id', 'name', 'since', 'balance', 'label']);
    assert.deepEqual(store.findIds('customers'), before);
    assert.equal(store.get('customers', before[0]).fieldData.name, 'Ada');
    // A different letter case is refused too: the refresh quotes each name, and a quoted name keeps its case in Postgres and Oracle,
    // and the key column is matched exactly. Renaming the key column's case used to leave every later read failing.
    assert.throws(() => store.applyDesign([{ op: 'updateField', table: 'customers', field: 'name', name: 'Name' }]), refused);
    assert.throws(() => store.applyDesign([{ op: 'updateField', table: 'customers', field: 'id', name: 'ID' }]), (error: unknown) => error instanceof StoreError && /SQL column/.test(error.message));
    assert.deepEqual(store.findIds('customers'), before);
    // A field of FileMaker's own is not a column at all.
    store.applyDesign([{ op: 'updateField', table: 'customers', field: 'label', name: 'caption' }]);
    assert.deepEqual(store.findIds('customers'), before);
    const row = store.get('customers', before[0]).fieldData;
    assert.equal(row.name, 'Ada');
    assert.ok('caption' in row && !('label' in row));
  } finally { store.close(); await outside.close(); }
});
