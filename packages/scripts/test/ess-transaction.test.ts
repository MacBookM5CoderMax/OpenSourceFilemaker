import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '@tabularius/store';
import { SqliteDriver } from '../../store/src/ess/driver.ts';
import { closeEssBridge } from '../../store/src/ess/bridge.ts';
import { runScript } from '../src/index.ts';

test('Open Transaction defers shadow writes until commit and Revert Transaction discards them', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-script-'));
  const outsidePath = join(dir, 'source.sqlite');
  const outside = new SqliteDriver(outsidePath);
  await outside.query('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)', []);
  const path = join(dir, 'mirror.sqlite');
  createStore(path);
  const store = new Store(path, 'mirror');
  t.after(async () => { store.close(); closeEssBridge(); await outside.close(); rmSync(dir, { recursive: true, force: true }); });
  store.sqlConnection = () => ({ name: 'sales', dialect: 'sqlite', path: outsidePath });
  store.applyDesign([{ op: 'createDataSource', name: 'Sales', paths: ['odbc:Sales'] }]);
  store.applyDesign([{ op: 'createShadowTable', dataSource: 'Sales', table: 'items' }]);
  const script = (name: string, end: string) => {
    store.applyDesign([{ op: 'createScript', name, text: `Open Transaction\nNew Record/Request\nSet Field [ items::name ; "one" ]\nNew Record/Request\nSet Field [ items::name ; "two" ]\nNew Record/Request\nSet Field [ items::name ; "three" ]\nCommit Records/Requests\n${end}\nCommit Transaction` }]);
    return name;
  };
  const reverted = await runScript(store, script('Revert SQL', 'Revert Transaction'), { layout: 'items' });
  assert.equal(reverted.error, 0);
  assert.deepEqual((await outside.query('SELECT name FROM items', [])).rows, []);
  assert.equal(store.findIds('items').length, 0);
  const committed = await runScript(store, script('Commit SQL', ''), { layout: 'items' });
  assert.equal(committed.error, 0);
  assert.deepEqual((await outside.query('SELECT name FROM items ORDER BY id', [])).rows, [['one'], ['two'], ['three']]);
  assert.equal(store.findIds('items').length, 3);
});
