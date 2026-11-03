import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../src/index.ts';
import { endTransaction, writer, type Transaction } from '../src/activity.ts';

function setup(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-held-functions-'));
  const path = join(dir, 'generated.sqlite');
  createStore(path);
  const store = new Store(path);
  const tx: Transaction = { files: new Map() };
  t.after(() => { endTransaction(tx, false); store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.applyDesign([{ op: 'createTable', name: 'T', fields: [{ name: 'Label' }, { name: 'Tm', type: 'time' }] }]);
  store.create('T', { Label: 'committed', Tm: '99:00:00' });
  writer.run({ transaction: { open: tx } }, () => {
    store.holdForTransaction();
    store.create('T', { Label: 'abc', Tm: '100:00:00' });
  });
  return { store, tx };
}

function errorFrom(run: () => unknown): Error {
  try { run(); } catch (error) { assert.ok(error instanceof Error); return error; }
  assert.fail('Expected SQL to throw');
}

function sameError(run: () => unknown, expected: Error) {
  const actual = errorFrom(run);
  assert.equal(actual.constructor, expected.constructor);
  assert.equal(actual.name, expected.name);
  assert.equal(actual.message, expected.message);
  assert.deepEqual({ ...actual }, { ...expected });
}

function stillFinds(store: Store) {
  const found = store.find('T', { query: [{ Label: 'a*' }], sort: [{ fieldName: 'Tm', sortOrder: 'descend' }] });
  assert.equal(found.foundCount, 1);
  assert.equal(found.records[0].fieldData.Label, 'abc');
}

const calls = [
  ['fm_find_text', "'abc','a*',0,0,0"],
  ['fm_find_word_range', "'abc','a',1,'z',1,'en'"],
  ['fm_find_invalid', "'abc','date'"],
  ['fm_find_key', "'abc'"],
] as const;

for (const [name, args] of calls) {
  test(`${name}: direct held SQL matches the ordinary missing-function error`, (t) => {
    const { store, tx } = setup(t);
    const query = `SELECT ${name}(${args}) FROM T`;
    const expected = errorFrom(() => store.select(query));
    assert.equal(expected.message, `no such function: ${name}`);
    assert.equal((expected as Error & { code: string }).code, 'ERR_SQLITE_ERROR');
    sameError(() => store.selectIn(tx, query), expected);
    stillFinds(store);
  });

  test(`${name}: held SQL cannot reach a find function through a callback and view`, (t) => {
    const { store, tx } = setup(t);
    const expected = errorFrom(() => store.select(`SELECT ${name}(${args}) FROM T`));
    store.sql.exec(`CREATE TEMP VIEW nested_find AS SELECT ${name}(${args}) AS value FROM T`);
    store.defineQueryFunction('nested_find_call', () => store.sql.prepare('SELECT value FROM nested_find').get()!.value);
    for (const unbounded of [false, true]) {
      sameError(() => store.selectIn(tx, 'SELECT nested_find_call() FROM T', [], 1, unbounded), expected);
      stillFinds(store);
      // Internal SQL remains available after leaving the user statement.
      assert.doesNotThrow(() => store.sql.prepare(`SELECT ${name}(${args})`).get());
    }
    store.sql.exec(`CREATE TEMP TABLE trigger_target (value INTEGER);
      CREATE TEMP TRIGGER guarded_find AFTER INSERT ON trigger_target BEGIN SELECT ${name}(${args}); END`);
    store.defineQueryFunction('trigger_find_call', () => {
      store.sql.prepare('INSERT INTO trigger_target VALUES (1)').run();
      return 1;
    });
    sameError(() => store.selectIn(tx, 'SELECT trigger_find_call()'), expected);
    assert.equal(store.sql.prepare('SELECT count(*) AS n FROM trigger_target').get()!.n, 0);
    stillFinds(store);
  });
}

test('held reads see uncommitted time values and retain all three time functions', (t) => {
  const { store, tx } = setup(t);
  assert.deepEqual(store.select('SELECT Label FROM T ORDER BY Label').rows, [['committed']]);
  assert.deepEqual(store.selectIn(tx, 'SELECT Label FROM T ORDER BY Label').rows, [['abc'], ['committed']]);
  assert.deepEqual(store.selectIn(tx, 'SELECT Tm FROM T ORDER BY Tm').rows, [['99:00:00'], ['100:00:00']]);
  assert.deepEqual(store.selectIn(tx, 'SELECT MAX(Tm), MIN(Tm) FROM T').rows, [['100:00:00', '99:00:00']]);
  assert.deepEqual(store.selectIn(tx, "SELECT Tm FROM T WHERE Tm > '99:30:00'").rows, [['100:00:00']]);
  assert.deepEqual(store.selectIn(tx, 'SELECT fm_time_seconds(Tm), fm_time_max(Tm), fm_time_min(Tm) FROM T WHERE Label = ?', ['abc']).rows,
    [[360000, '100:00:00', '100:00:00']]);
  for (const unbounded of [false, true]) {
    assert.equal(store.selectIn(tx, 'SELECT Label FROM T', [], 1, unbounded).rows.length, 1);
    stillFinds(store);
  }
});

test('a different SQL execution error and a prepare error leave finds available', (t) => {
  const { store, tx } = setup(t);
  for (const query of ["SELECT abs(-9223372036854775808) FROM T", 'SELECT missing_column FROM T']) {
    sameError(() => store.selectIn(tx, query), errorFrom(() => store.select(query)));
    stillFinds(store);
  }
});

test('nested held statements restore the enclosing restriction after success and failure', async (t) => {
  const outer = setup(t);
  await t.test('the inner store closes before its enclosing store', (innerContext) => {
    const inner = setup(innerContext);
    const expected = errorFrom(() => outer.store.select("SELECT fm_find_key('abc')"));
    outer.store.defineQueryFunction('nested_read', () => {
      assert.deepEqual(inner.store.selectIn(inner.tx, 'SELECT Label FROM T WHERE Label = ?', ['abc']).rows, [['abc']]);
      sameError(() => outer.store.sql.prepare("SELECT fm_find_key('abc')").get(), expected);
      assert.throws(() => inner.store.selectIn(inner.tx, 'SELECT abs(-9223372036854775808)'), /integer overflow/);
      sameError(() => outer.store.sql.prepare("SELECT fm_find_key('abc')").get(), expected);
      return 1;
    });
    assert.deepEqual(outer.store.selectIn(outer.tx, 'SELECT nested_read()').rows, [[1]]);
    stillFinds(outer.store);
    stillFinds(inner.store);
  });
});

test('cached patterns and NULL/empty fast paths cannot bypass the held scope', (t) => {
  const { store, tx } = setup(t);
  for (const [name, args] of calls) {
    const expected = errorFrom(() => store.select(`SELECT ${name}(${args})`));
    // Warm the pattern cache on the internal connection before calling it from user SQL.
    store.sql.prepare(`SELECT ${name}(${args})`).get();
    for (const value of ["'abc'", 'NULL', "''"]) {
      const query = `SELECT ${name}(${value}${args.slice(args.indexOf(',') < 0 ? args.length : args.indexOf(','))}) AS value`;
      store.defineQueryFunction('cached_find_call', () => store.sql.prepare(query).get()!.value);
      sameError(() => store.selectIn(tx, 'SELECT cached_find_call()'), expected);
    }
  }
  stillFinds(store);
});
