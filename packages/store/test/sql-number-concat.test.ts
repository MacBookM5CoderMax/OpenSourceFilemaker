// A number field is kept as a REAL, and SQLite prints a whole REAL with ".0" (10 becomes "10.0"). SQL text operators and
// functions read a number as the digits a person sees, as STRVAL and character CAST already do.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../src/index.ts';
import { fileMakerSqlSyntax } from '../src/sql-dates.ts';

let dir: string;
let store: Store;

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-sql-number-concat-'));
  const path = join(dir, 't.sqlite');
  createStore(path);
  store = new Store(path, 'T');
  store.applyDesign([{ op: 'createTable', name: 'E', fields: [{ name: 'Name', type: 'text' }, { name: 'Amt', type: 'number' }] }]);
  store.create('E', { Name: 'Ann', Amt: 10 });
  store.create('E', { Name: 'cy', Amt: 2.5 });
  store.create('E', { Name: 'big', Amt: 1e21 });
  store.create('E', { Name: 'none' });
  store.create('E', { Name: 'dup', Amt: 10 });
});

after(() => {
  store?.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const rows = (query: string, params: (string | number)[] = []) => {
  const { sql, target } = store.calc.translateSQL(query);
  return target.select(sql, params, 100).rows;
};
const one = (query: string) => rows(query)[0][0];

test('|| joins a number as its digits, in chains, with a constant, a call and a placeholder', () => {
  assert.deepEqual(rows('SELECT Name || Amt FROM E ORDER BY Name'), [['Ann10'], ['big1000000000000000000000'], ['cy2.5'], ['dup10'], [null]]);
  assert.equal(one("SELECT Name || ' = ' || Amt || '!' FROM E WHERE Name = 'Ann'"), 'Ann = 10!');
  assert.equal(one("SELECT 'Total: ' || SUM(Amt) FROM E WHERE Name = 'Ann'"), 'Total: 10');
  assert.equal(one("SELECT 'n' || (Amt + 1) FROM E WHERE Name = 'Ann'"), 'n11');
  assert.equal(one("SELECT -Amt || 'x' FROM E WHERE Name = 'Ann'"), '-10x');
  assert.equal(one("SELECT 'a' || -Amt FROM E WHERE Name = 'Ann'"), 'a-10');
  assert.equal(one("SELECT x.Name || x.Amt FROM E x WHERE x.Name = 'cy'"), 'cy2.5');
  assert.equal(one("SELECT 'a' || 12.0"), 'a12');
  assert.equal(rows("SELECT ? || Amt FROM E WHERE Name = 'Ann'", ['n='])[0][0], 'n=10');
  assert.deepEqual(rows("SELECT Name FROM E WHERE Name || Amt = 'Ann10'"), [['Ann']]);
  // A missing value still gives a missing result, and text is joined as it was.
  assert.equal(one("SELECT 'a' || NULL"), null);
  assert.equal(one("SELECT 'it''s ' || 'ok' || \"Name\" FROM E WHERE Name = 'Ann'"), "it's okAnn");
});

test('the text functions read a number as its digits', () => {
  const [length, trim, ltrim, rtrim, replace, instr, position] = rows(
    "SELECT LENGTH(Amt), TRIM(Amt), LTRIM(Amt), RTRIM(Amt), REPLACE(Amt, '0', 'x'), INSTR(Amt, '0'), POSITION('.' IN Amt) FROM E WHERE Name = 'Ann'")[0];
  assert.deepEqual([length, trim, ltrim, rtrim, replace, instr, position], [2, '10', '10', '10', '1x', 2, 0]);
  assert.deepEqual(rows("SELECT CONCAT(Name, Amt), CONCAT_WS('-', Name, Amt), LENGTH(Amt) FROM E WHERE Name = 'cy'")[0], ['cy2.5', 'cy-2.5', 3]);
  assert.equal(one('SELECT GROUP_CONCAT(Amt) FROM E WHERE Amt < 100'), '10,2.5,10');
  assert.equal(one('SELECT GROUP_CONCAT(DISTINCT Amt) FROM E WHERE Amt < 100'), '10,2.5');
  assert.equal(one("SELECT GROUP_CONCAT(Amt, ';') FROM E WHERE Amt < 100"), '10;2.5;10');
  assert.equal(one("SELECT LENGTH(LTRIM(Amt || 'x')) FROM E WHERE Name = 'Ann'"), 3);
  // Text and missing values are unchanged.
  assert.deepEqual(rows("SELECT LENGTH('héllo'), LENGTH(NULL), CONCAT(NULL, 'a'), TRIM('  a  '), LENGTH(Name) FROM E WHERE Name = 'Ann'")[0], [5, null, 'a', 'a', 3]);
});

test('the rewrite leaves what it does not read, and the other operators, as they were', () => {
  // A CASE operand is not one of the shapes read: SQLite's own || stays (it still prints 10.0).
  assert.match(fileMakerSqlSyntax("SELECT 'a' || CASE WHEN 1 = 1 THEN Amt END"), /\|\| CASE/);
  // `+` on strings and || together keep reading as before: || binds first and the sum is numeric.
  assert.equal(one("SELECT 'a' || 'b' + 'c'"), 0);
  assert.equal(fileMakerSqlSyntax("SELECT 'a' || 'b' + 'c'"), "SELECT fm_concat('a', 'b') + 'c'");
  // Strings and comments that hold the words are not touched.
  assert.equal(fileMakerSqlSyntax("SELECT 'LENGTH(x) || y' -- CONCAT(a)"), "SELECT 'LENGTH(x) || y' -- CONCAT(a)");
  assert.equal(fileMakerSqlSyntax("SELECT LENGTH('a, b')"), "SELECT LENGTH('a, b')");
  assert.equal(fileMakerSqlSyntax('SELECT LENGTH(a, b'), 'SELECT LENGTH(a, b');
});

test('a bracket inside a quoted run, a PostgreSQL E string and an aggregate ORDER BY do not break the rewrite', () => {
  // `' ('` holds a bracket: the call it ends before is still found whole when a third operand follows.
  assert.equal(fileMakerSqlSyntax("SELECT ' (' || Name || '):'"), "SELECT fm_concat(fm_concat(' (', Name), '):')");
  assert.equal(one("SELECT ' (' || Name || '):' FROM E WHERE Name = 'Ann'"), ' (Ann):');
  // E'..' strings and `::` casts are PostgreSQL spellings the rewrite does not read; SQLite's own || stays.
  assert.equal(fileMakerSqlSyntax("SELECT a || E'\\n' || b"), "SELECT a || E'\\n' || b");
  assert.equal(fileMakerSqlSyntax('SELECT a::text || b'), 'SELECT a::text || b');
  // An ORDER BY tail inside an aggregate is kept after the wrapped value, and a separator stays a plain string.
  assert.equal(fileMakerSqlSyntax("SELECT group_concat(Name, ',' ORDER BY Name) FROM E"), "SELECT group_concat(fm_text(Name), ',' ORDER BY Name) FROM E");
  assert.equal(one("SELECT group_concat(Amt, ',' ORDER BY Amt) FROM E WHERE Amt IS NOT NULL AND Amt < 5"), '2.5');
});

test('a number between -1 and 1 keeps its leading zero in SQL text, unlike a calculation (ExecuteSQL wording is unchecked)', () => {
  assert.equal(one("SELECT 'n' || 0.5"), 'n0.5');
  assert.equal(one("SELECT 'n' || -0.5"), 'n-0.5');
  assert.equal(one('SELECT LENGTH(0.5)'), 3);
});
