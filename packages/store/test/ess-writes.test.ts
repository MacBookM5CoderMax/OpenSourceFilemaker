import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store, StoreError } from '../src/index.ts';
import { SqliteDriver, ESS_ERROR, writeEssBatch, type SqlDriver } from '../src/ess/driver.ts';
import { allowSqliteStandIn, closeEssBridge } from '../src/ess/bridge.ts';

const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-writes-'));
after(() => { closeEssBridge(); rmSync(dir, { recursive: true, force: true }); });
// A SQLite file stands in for the outside database: the bridge opens one only when a test asks for it.
allowSqliteStandIn();

async function setup(label: string, definition = 'id INTEGER PRIMARY KEY, name TEXT NOT NULL, note TEXT'): Promise<{ store: Store; outside: SqliteDriver }> {
  const outsidePath = join(dir, `${label}-source.sqlite`);
  const outside = new SqliteDriver(outsidePath);
  await outside.query(`CREATE TABLE items (${definition})`, []);
  const localPath = join(dir, `${label}-mirror.sqlite`);
  createStore(localPath);
  const store = new Store(localPath, label);
  store.sqlConnection = (name) => name.toLowerCase() === 'sales' ? { name: 'sales', dialect: 'sqlite', path: outsidePath } : undefined;
  store.applyDesign([{ op: 'createDataSource', name: 'Sales', paths: ['odbc:Sales'] }]);
  store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'items' }]);
  return { store, outside };
}

test('create, edit of a key, and delete update the outside table and stable mirror mapping', async () => {
  const { store, outside } = await setup('basic');
  try {
    const made = store.create('items', { name: 'first', note: 'local' });
    assert.deepEqual((await outside.query('SELECT id, name, note FROM items', [])).rows, [[1, 'first', 'local']]);
    const table = store.schema.tables.find((entry) => entry.name === 'items')!;
    assert.equal((store.sql.prepare(`SELECT key FROM "_fm_ess_keys_${table.id}" WHERE record_id = ?`).get(made.recordId) as { key: string }).key, '[1]');
    store.update('items', made.recordId, { id: 9, name: 'second' }, made.modId);
    assert.deepEqual((await outside.query('SELECT id, name FROM items', [])).rows, [[9, 'second']]);
    assert.equal((store.sql.prepare(`SELECT key FROM "_fm_ess_keys_${table.id}" WHERE record_id = ?`).get(made.recordId) as { key: string }).key, '[9]');
    store.delete('items', made.recordId);
    assert.deepEqual((await outside.query('SELECT id FROM items', [])).rows, []);
    assert.equal(store.query('SELECT count(*) AS n FROM items')[0].n, 0);
  } finally { store.close(); await outside.close(); }
});

test('outside edit rejects the stale mirror with 306 and refreshes the row', async () => {
  const { store, outside } = await setup('conflict');
  try {
    const id = store.create('items', { name: 'before' }).recordId;
    store.get('items', id);
    await outside.query('UPDATE items SET name = ? WHERE id = 1', ['outside']);
    assert.throws(() => store.update('items', id, { name: 'inside' }), (error: unknown) => error instanceof StoreError && error.code === 306);
    assert.deepEqual((await outside.query('SELECT name FROM items', [])).rows, [['outside']]);
    assert.equal(store.get('items', id).fieldData.name, 'outside');
  } finally { store.close(); await outside.close(); }
});

test('constraint failure leaves the mirror and outside table unchanged', async () => {
  const { store, outside } = await setup('constraint', 'id INTEGER PRIMARY KEY, name TEXT NOT NULL DEFAULT NULL, note TEXT');
  try {
    assert.throws(() => store.create('items', { note: 'only local' }), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /NOT NULL constraint failed/.test(error.message));
    assert.equal(store.query('SELECT count(*) AS n FROM items')[0].n, 0);
    assert.deepEqual((await outside.query('SELECT id FROM items', [])).rows, []);
  } finally { store.close(); await outside.close(); }
});

test('delete succeeds when the outside row has already gone', async () => {
  const { store, outside } = await setup('gone');
  try {
    const id = store.create('items', { name: 'gone' }).recordId;
    await outside.query('DELETE FROM items WHERE id = 1', []);
    store.delete('items', id);
    assert.equal(store.query('SELECT count(*) AS n FROM items')[0].n, 0);
  } finally { store.close(); await outside.close(); }
});

test('a mapped SQL column cannot be renamed', async () => {
  const { store, outside } = await setup('rename');
  try {
    assert.throws(() => store.applyDesign([{ op: 'updateField', table: 'items', field: 'name', name: 'renamed' }]), /cannot be renamed/);
  } finally { store.close(); await outside.close(); }
});

test('one grouped commit rolls back its first SQL write when the second violates a constraint', async () => {
  const { store, outside } = await setup('batch');
  try {
    assert.throws(() => store.writeAtomically(() => {
      store.create('items', { name: 'first' });
      store.create('items', { note: 'missing required name' });
    }), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR);
    assert.deepEqual((await outside.query('SELECT name FROM items', [])).rows, []);
    assert.equal(store.query('SELECT count(*) AS n FROM items')[0].n, 0);
  } finally { store.close(); await outside.close(); }
});

test('supplemental fields stay local and audit rows include the SQL connection', async () => {
  const { store, outside } = await setup('supplemental');
  try {
    store.applyDesign([{ op: 'createField', table: 'items', name: 'local_note' }]);
    const id = store.create('items', { name: 'mapped', local_note: 'only in mirror' }).recordId;
    assert.deepEqual((await outside.query('SELECT name FROM items', [])).rows, [['mapped']]);
    assert.equal(store.get('items', id).fieldData.local_note, 'only in mirror');
    const audit = store.sql.prepare("SELECT changes FROM _fm_audit WHERE kind = 'create' AND tbl = 'items' ORDER BY seq DESC LIMIT 1").get() as { changes: string };
    assert.equal(JSON.parse(audit.changes)._sql_connection, 'sales');
  } finally { store.close(); await outside.close(); }
});

test('two portal-row creates share a SQL transaction and both roll back on the second failure', async () => {
  const { store, outside } = await setup('portal-batch', 'id INTEGER PRIMARY KEY, parent_id INTEGER, name TEXT NOT NULL');
  try {
    store.applyDesign([
      { op: 'createTable', name: 'parents', fields: [{ name: 'id', type: 'number' }] },
      { op: 'createRelationship', left: 'parents', right: 'items', predicates: [{ left: 'id', right: 'parent_id' }], rightCreate: true },
    ]);
    const parentId = store.create('parents', { id: 7 }).recordId;
    const shadow = store.schema.tableOccurrences.find((entry) => entry.name === 'items')!;
    const layout = store.design('parents')!;
    store.applyDesign([{ op: 'updateLayout', layout: 'parents', design: { ...layout, objects: [
      ...layout.objects,
      { id: 900, kind: 'portal', type: 9, anchors: { left: true, top: true, right: false, bottom: false },
        bounds: { left: 0, top: 100, right: 300, bottom: 300 }, style: {},
        portal: { tableOccurrenceId: shadow.id, tableOccurrence: 'items', rows: 4, initialRow: 1 }, children: [] },
    ] } as never }]);
    assert.throws(() => store.updatePortals('parents', parentId,
      { items: [{ name: 'first' }, {}] }), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR);
    assert.deepEqual((await outside.query('SELECT name FROM items', [])).rows, []);
    assert.equal(store.query('SELECT count(*) AS n FROM items')[0].n, 0);
  } finally { store.close(); await outside.close(); }
});

test('a batch calls BEGIN and COMMIT once, or BEGIN and ROLLBACK once on failure', async () => {
  const outside = new SqliteDriver();
  const log: string[] = [];
  const driver: SqlDriver = {
    dialect: 'sqlite',
    query: (sql, params, opts) => { log.push(sql); return outside.query(sql, params, opts); },
    transaction: async (fn) => {
      log.push('BEGIN');
      try {
        const result = await outside.transaction(() => fn(driver));
        log.push('COMMIT');
        return result;
      } catch (error) { log.push('ROLLBACK'); throw error; }
    },
    tables: () => outside.tables(), columns: (table) => outside.columns(table),
    quoteName: (name) => outside.quoteName(name), placeholder: (n) => outside.placeholder(n),
    close: () => outside.close(),
  };
  try {
    await outside.query('CREATE TABLE rows (id INTEGER PRIMARY KEY, name TEXT NOT NULL)', []);
    const write = (name: string | null) => ({ kind: 'create' as const, table: 'rows', keys: ['id'], values: { name } });
    await assert.rejects(writeEssBatch(driver, [write('first'), write(null)]));
    assert.deepEqual(log.filter((sql) => ['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)), ['BEGIN', 'ROLLBACK']);
    assert.deepEqual((await outside.query('SELECT id FROM rows', [])).rows, []);
    log.length = 0;
    await writeEssBatch(driver, [write('first'), write('second')]);
    assert.deepEqual(log.filter((sql) => ['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)), ['BEGIN', 'COMMIT']);
    assert.deepEqual((await outside.query('SELECT name FROM rows ORDER BY id', [])).rows, [['first'], ['second']]);
  } finally { await outside.close(); }
});

test('a file into a mapped BLOB column is refused before anything is written, and later edits still work', async () => {
  const { store, outside } = await setup('container', 'id INTEGER PRIMARY KEY, name TEXT, doc BLOB');
  try {
    const id = store.create('items', { name: 'with doc' }).recordId;
    const file = { filename: 'a.txt', mime: 'text/plain', data: new TextEncoder().encode('hello') };
    assert.throws(() => store.setContainer('items', id, 'doc', 1, file), (e: unknown) => e instanceof StoreError && e.code === ESS_ERROR);
    assert.throws(() => store.checkContainerWrite('items', id, 'doc', 1), (e: unknown) => e instanceof StoreError && e.code === ESS_ERROR);
    assert.deepEqual((await outside.query('SELECT doc FROM items', [])).rows, [[null]]);
    // The mirror is unchanged, so the next ordinary edit does not hit a permanent conflict.
    store.update('items', id, { name: 'renamed' });
    assert.deepEqual((await outside.query('SELECT name FROM items', [])).rows, [['renamed']]);
  } finally { store.close(); await outside.close(); }
});

test('a deleted shadow row is not restored by a raw local insert: revert, undo and point-in-time restore are refused', async () => {
  const { store, outside } = await setup('restore');
  try {
    const id = store.create('items', { name: 'doomed' }).recordId;
    store.delete('items', id);
    assert.deepEqual((await outside.query('SELECT id FROM items', [])).rows, []);
    const entries = store.auditLog({ limit: 50 }).filter((e) => e.table === 'items' && e.recordId === id);
    const deleted = entries.find((e) => e.kind === 'delete')!;
    const created = entries.find((e) => e.kind === 'create')!;
    assert.throws(() => store.revertAuditEntry('items', id, deleted.seq), (e: unknown) => e instanceof StoreError && e.code === ESS_ERROR);
    assert.throws(() => store.restoreDeletedRow('items', { _fm_record_id: id, _fm_mod_id: 0, id: 1, name: 'doomed' }), (e: unknown) => e instanceof StoreError && e.code === ESS_ERROR);
    assert.throws(() => store.restoreRecord('items', id, created.seq), (e: unknown) => e instanceof StoreError && e.code === ESS_ERROR);
    // Nothing came back locally, so a refresh cannot delete a row that was never in the outside table.
    assert.equal(store.query('SELECT count(*) AS n FROM items')[0].n, 0);
    assert.deepEqual((await outside.query('SELECT id FROM items', [])).rows, []);
  } finally { store.close(); await outside.close(); }
});
