import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, markShadowOpResolved, Store, type DesignOp } from '../../store/src/index.ts';
import { installSqlRefresh } from '../src/ess.ts';
import type { SqlResult } from '../../store/src/ess/driver.ts';
import { conversionGuide } from '../src/conversion-guide.ts';

test('the conversion guide counts local occurrences of unbound shadow tables', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-guide-'));
  const path = join(dir, 'mirror.sqlite');
  createStore(path);
  const store = new Store(path, 'Unlisted');
  try {
    store.applyDesign([{ op: 'createDataSource', name: 'Sales', paths: ['odbc:sales'] }]);
    store.applyDesign([markShadowOpResolved({ op: 'createShadowTable', dataSource: 'Sales', table: 'Items', keys: ['id'], columns: [{ name: 'id', type: 'number' }] } as DesignOp)]); // as the server's prepareSqlDesign hands it over
    const guide = conversionGuide(store);
    const blocker = guide.breaks.find((entry) => entry.title === 'Tables in SQL databases (ESS/ODBC)');
    assert.equal(blocker?.severity, 'blocker');
    assert.equal(blocker?.count, 1);
    assert.match(blocker?.instead ?? '', /PostgreSQL.*DSN/);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('network mirrors keep one refresh in flight, serve stale rows, back off, and observe edited intervals', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-refresh-'));
  const path = join(dir, 'mirror.sqlite');
  createStore(path);
  const store = new Store(path, 'Inside');
  let alive = true;
  let now = 1000;
  store.essClock = () => now;
  const connection = { name: 'sales', dialect: 'postgresql' as const, host: '127.0.0.1', port: 5432 };
  store.sqlConnection = () => connection;
  store.applyDesign([{ op: 'createDataSource', name: 'Sales', paths: ['odbc:sales'] }]);
  store.applyDesign([markShadowOpResolved({ op: 'createShadowTable', dataSource: 'Sales', table: 'Items', keys: ['id'], columns: [{ name: 'id', type: 'number' }] } as DesignOp)]); // as the server's prepareSqlDesign hands it over
  const table = store.schema.tables.find((entry) => entry.name === 'Items')!;
  let calls = 0;
  let finish!: (result: SqlResult) => void;
  let fail!: (error: Error) => void;
  installSqlRefresh(store, () => alive, () => {}, <T>() => {
    calls++;
    return new Promise<SqlResult>((resolve, reject) => { finish = resolve; fail = reject; }) as Promise<T>;
  });
  const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
  const saved = process.env.TABULARIUS_ESS_REFRESH_SECONDS;
  try {
    assert.throws(() => store.findIds('Items'), /not been loaded yet/);
    assert.throws(() => store.findIds('Items'), /not been loaded yet/);
    assert.equal(calls, 1);
    finish({ columns: [{ name: 'id', type: 'int' }], rows: [[1]] });
    await settle();
    assert.equal(store.findIds('Items').length, 1);
    const id = store.findIds('Items')[0];
    process.env.TABULARIUS_ESS_REFRESH_SECONDS = '10';
    now += 6000;
    store.findIds('Items');
    assert.equal(calls, 1);
    process.env.TABULARIUS_ESS_REFRESH_SECONDS = '0';
    assert.deepEqual(store.findIds('Items'), [id]);
    assert.equal(calls, 2);
    for (const delay of [1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 300000, 300000]) {
      fail(new Error('synthetic failure'));
      await settle();
      assert.match(store.shadowStatus(table).error ?? '', /could not refresh/);
      const before: number = calls;
      now += delay - 1;
      assert.deepEqual(store.findIds('Items'), [id]);
      assert.equal(calls, before);
      now++;
      assert.deepEqual(store.findIds('Items'), [id]);
      assert.equal(calls, before + 1);
    }
    finish({ columns: [{ name: 'id', type: 'int' }], rows: [[1], [2]] });
    await settle();
    process.env.TABULARIUS_ESS_REFRESH_SECONDS = '10';
    assert.equal(store.findIds('Items').length, 2);
    assert.equal(store.shadowStatus(table).error, undefined);
    assert.equal(store.shadowStatus(table).ageSeconds, 0);
    now += 10000;
    store.findIds('Items');
    alive = false;
    finish({ columns: [], rows: [] });
    await settle();
    assert.equal(store.query('SELECT count(*) AS n FROM Items')[0].n, 2);
  } finally {
    alive = false;
    if (saved === undefined) delete process.env.TABULARIUS_ESS_REFRESH_SECONDS; else process.env.TABULARIUS_ESS_REFRESH_SECONDS = saved;
    store.close(); rmSync(dir, { recursive: true, force: true });
  }
});
