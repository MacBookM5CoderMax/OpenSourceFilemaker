// SQL compares a time column by its seconds, not by its stored text: 100 hours is after 99 and before 101, and a
// negative time sorts below zero. ORDER BY, MAX, MIN and < <= > >= BETWEEN agree with Sort Records and finds.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../src/index.ts';
import { timeComparisons } from '../src/sql-time-order.ts';

let dir: string;
let store: Store;
const TIMES = ['100:00:00', '9:00:00', '-1:00:00', '99:00:00', '-100:00:00', '0:00:01', '10:00:00', '-99:00:00'];
const ASCENDING = ['-100:00:00', '-99:00:00', '-1:00:00', '00:00:01', '09:00:00', '10:00:00', '99:00:00', '100:00:00'];

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-sql-time-'));
  createStore(join(dir, 't.sqlite'));
  store = new Store(join(dir, 't.sqlite'), 'T');
  store.applyDesign([
    { op: 'createTable', name: 'T', fields: [{ name: 'Tm', type: 'time' }, { name: 'Label', type: 'text' }] },
    // A name that is a time in one table and text in another is not rewritten: the query may mean either.
    { op: 'createTable', name: 'U', fields: [{ name: 'Clash', type: 'text' }] },
    { op: 'createTable', name: 'V', fields: [{ name: 'Clash', type: 'time' }] },
    { op: 'createTable', name: 'W', fields: [{ name: 'Wait', type: 'time' }] },
    { op: 'createTable', name: 'Shift', fields: [{ name: 'Name', type: 'text' }, { name: 'Start', type: 'time' }, { name: 'Finish', type: 'time' }] },
  ] as never);
  for (const Tm of TIMES) store.create('T', { Tm, Label: Tm });
  store.create('T', { Tm: '', Label: 'none' });
  for (const Clash of ['9:00:00', '100:00:00', '10:00:00']) { store.create('U', { Clash }); store.create('V', { Clash }); }
  for (const Wait of ['100:00:00', '9:00:00', '10:00:00']) store.create('W', { Wait });
  for (const [Name, Start, Finish] of [['A', '9:00:00', '100:00:00'], ['B', '100:00:00', '99:00:00'], ['C', '-1:00:00', '0:00:00'], ['D', '10:00:00', '10:00:00'], ['E', '-99:00:00', '-100:00:00']]) store.create('Shift', { Name, Start, Finish });
});

after(() => {
  store?.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const column = (query: string, params: (string | number)[] = []) => {
  const { sql, target } = store.calc.translateSQL(query);
  return target.select(sql, params, 100).rows.map((r) => r[0]);
};

test('ORDER BY a time column orders by seconds, ascending and descending', () => {
  assert.deepEqual(column('SELECT Tm FROM T WHERE Label <> \'none\' ORDER BY Tm'), ASCENDING);
  assert.deepEqual(column('SELECT Tm FROM T WHERE Label <> \'none\' ORDER BY Tm DESC'), [...ASCENDING].reverse());
  assert.deepEqual(column('SELECT T.Tm FROM T WHERE Label <> \'none\' ORDER BY T.Tm'), ASCENDING);
  assert.deepEqual(column('SELECT Wait FROM W ORDER BY Wait'), ['09:00:00', '10:00:00', '100:00:00']);
  // ORDER BY reads the field from the table the query names, so a name shared with a text column elsewhere does not matter.
  assert.deepEqual(column('SELECT Clash FROM V ORDER BY Clash'), ['09:00:00', '10:00:00', '100:00:00']);
  assert.deepEqual(column('SELECT Tm FROM T WHERE Label <> \'none\' ORDER BY Tm FETCH FIRST 2 ROWS ONLY'), ASCENDING.slice(0, 2));
});

test('MAX and MIN of a time column are by seconds; empty times are ignored', () => {
  assert.deepEqual(column('SELECT MAX(Tm) FROM T'), ['100:00:00']);
  assert.deepEqual(column('SELECT MIN(Tm) FROM T'), ['-100:00:00']);
  assert.deepEqual(column('SELECT MAX(Tm) FROM T WHERE Tm < ?', ['50:00:00']), ['10:00:00']);
  assert.deepEqual(column('SELECT min(T.Tm) FROM T WHERE Tm > ?', ['0:00:00']), ['00:00:01']);
  assert.deepEqual(column('SELECT MAX(Wait) FROM W'), ['100:00:00']);
  assert.deepEqual(column("SELECT MAX(Tm) FROM T WHERE Label = 'none'"), [null]);
});

test('comparisons of a time column with a literal or a placeholder are by seconds', () => {
  assert.deepEqual(column("SELECT Tm FROM T WHERE Tm > TIME '50:00:00' ORDER BY Tm"), ['99:00:00', '100:00:00']);
  assert.deepEqual(column("SELECT Tm FROM T WHERE Tm >= {t '10:00:00'} ORDER BY Tm"), ['10:00:00', '99:00:00', '100:00:00']);
  assert.deepEqual(column('SELECT Tm FROM T WHERE Tm < ? ORDER BY Tm', ['2:00:00']), ['-100:00:00', '-99:00:00', '-1:00:00', '00:00:01']);
  assert.deepEqual(column('SELECT Tm FROM T WHERE Tm <= ?1 ORDER BY Tm', ['9:00:00']), ['-100:00:00', '-99:00:00', '-1:00:00', '00:00:01', '09:00:00']);
  assert.deepEqual(column("SELECT Tm FROM T WHERE Tm BETWEEN TIME '0:00:00' AND TIME '20:00:00' ORDER BY Tm"), ['00:00:01', '09:00:00', '10:00:00']);
  assert.deepEqual(column("SELECT Tm FROM T WHERE Tm BETWEEN ? AND ? ORDER BY Tm", ['-2:00:00', '1:00:00']), ['-1:00:00', '00:00:01']);
  assert.deepEqual(column("SELECT Wait FROM W WHERE Wait > TIME '9:30:00' ORDER BY Wait"), ['10:00:00', '100:00:00']);
});

test('text that looks like a time, and a name shared with a text column, keep the text order', () => {
  assert.deepEqual(column("SELECT Label FROM T WHERE Label <> 'none' ORDER BY Label").slice(0, 3), ['-1:00:00', '-100:00:00', '-99:00:00']);
  assert.deepEqual(column('SELECT MAX(Label) FROM T'), ['none']);
  for (const table of ['U', 'V']) {
    if (table === 'U') assert.deepEqual(column('SELECT Clash FROM U ORDER BY Clash'), ['10:00:00', '100:00:00', '9:00:00']);
    assert.deepEqual(column(`SELECT MAX(Clash) FROM ${table}`), [table === 'U' ? '9:00:00' : '10:00:00']);
    assert.equal(column(`SELECT Clash FROM ${table} WHERE Clash > '5:00:00' ORDER BY Clash`).length, table === 'U' ? 1 : 0);
  }
  // A time in a string literal of another column, and a comment, are left alone.
  assert.deepEqual(column("SELECT Label FROM T WHERE Label = 'Tm > 5' OR Label = 'none' -- Tm < ?"), ['none']);
});

test('find-only functions are unavailable through user SQL', () => {
  for (const query of [
    "SELECT fm_find_text('abc','a*',0,0,0) FROM T",
    "SELECT fm_find_word_range('abc','a',1,'z',1,'en') FROM T",
    "SELECT fm_find_invalid('abc','date') FROM T",
  ]) {
    assert.throws(() => column(query), /no such function: fm_find_/i, query);
  }
});

test('a derived text alias matching a time field name is compared as time', () => {
  assert.deepEqual(column("SELECT Label FROM T WHERE Label > '5'"), ['9:00:00', '99:00:00', 'none']);
  assert.deepEqual(column("SELECT * FROM (SELECT Label AS Tm FROM T) WHERE Tm > '5'"), ['none']);
});

test('two time columns compare by seconds', () => {
  assert.deepEqual(column('SELECT Name FROM Shift WHERE Start < Finish ORDER BY Name'), ['A', 'C']);
  assert.deepEqual(column('SELECT Name FROM Shift WHERE Start <= Finish ORDER BY Name'), ['A', 'C', 'D']);
  assert.deepEqual(column('SELECT Name FROM Shift WHERE Start > Finish ORDER BY Name'), ['B', 'E']);
  assert.deepEqual(column('SELECT Name FROM Shift WHERE Start >= Finish ORDER BY Name'), ['B', 'D', 'E']);
  assert.deepEqual(column('SELECT s.Name FROM Shift s WHERE s.Start < s.Finish ORDER BY s.Name'), ['A', 'C']);
  assert.deepEqual(column('SELECT a.Name FROM Shift a JOIN Shift b ON a.Start > b.Finish WHERE b.Name = \'B\' ORDER BY a.Name'), ['B']);
});

test('a quoted time or placeholder on the left of the comparison compares by seconds', () => {
  assert.deepEqual(column('SELECT Start FROM Shift WHERE ? < Start ORDER BY Start', ['50:00:00']), ['100:00:00']);
  assert.deepEqual(column("SELECT Start FROM Shift WHERE TIME '0:00:00' >= Start ORDER BY Start"), ['-99:00:00', '-1:00:00']);
  assert.deepEqual(column("SELECT Start FROM Shift WHERE ('9:30:00' <= Start) ORDER BY Start"), ['10:00:00', '100:00:00']);
  // A name that is text in another table is still left alone, on either side.
  assert.deepEqual(column("SELECT Clash FROM U WHERE '5:00:00' < Clash"), ['9:00:00']);
});

test('MAX and MIN of a time column compare by seconds in HAVING', () => {
  assert.deepEqual(column('SELECT Name FROM Shift GROUP BY Name HAVING MAX(Start) > ? ORDER BY Name', ['50:00:00']), ['B']);
  assert.deepEqual(column('SELECT Name FROM Shift GROUP BY Name HAVING ? < MAX(Start) ORDER BY Name', ['50:00:00']), ['B']);
  assert.deepEqual(column('SELECT Name FROM Shift GROUP BY Name HAVING MIN(Start) < MAX(Finish) ORDER BY Name'), ['A', 'C']);
});

test('an expression on the left or an inequality is not rewritten', () => {
  const tables = store.schema.tables;
  for (const sql of [
    "SELECT Name FROM Shift WHERE Name || '9:00:00' < Start",
    'SELECT Name FROM Shift WHERE Start <> Finish',
    "SELECT Name FROM Shift WHERE Start - '1:00:00' < Finish",
    "SELECT Name FROM Shift WHERE Name < 'x' AND Finish = Start",
  ]) assert.equal(timeComparisons(sql, tables), sql);
  assert.equal(timeComparisons('SELECT Name FROM Shift WHERE ? <= Start', tables),
    'SELECT Name FROM Shift WHERE fm_time_seconds(?) <= fm_time_seconds(Start)');
  assert.equal(timeComparisons('SELECT Name FROM Shift GROUP BY Name HAVING MAX(Start) > ?', tables),
    'SELECT Name FROM Shift GROUP BY Name HAVING fm_time_seconds(fm_time_max(Start)) > fm_time_seconds(?)');
});
