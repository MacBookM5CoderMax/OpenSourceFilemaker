// Show All Records and Show Omitted Only bring records back in the order the found set was sorted in, as Perform
// Find does, and Get ( SortState ) says so. Unsort Records, or never having sorted, leaves creation order.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { runScript } from '../src/index.ts';

function setup(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-showall-sort-'));
  createStore(join(dir, 'S.sqlite'));
  const s = new Store(join(dir, 'S.sqlite'), 'S');
  t.after(() => { s.close(); rmSync(dir, { recursive: true }); });
  s.applyDesign([{ op: 'createTable', name: 'T', fields: [{ name: 'A' }] }]);
  const ids = ['c', 'a', 'd', 'b'].map((a) => s.create('T', { A: a }).recordId);
  let n = 0;
  return async (text: string) => {
    const name = `Run ${++n}`;
    s.applyDesign([{ op: 'createScript', name, text }]);
    return runScript(s, name, { layout: 'T', foundSet: ids, recordId: ids[0] });
  };
}
const sort = 'Sort Records [ Restore; T::A; ascending; With dialog: Off ]';
const find = (value: string) => ['Enter Find Mode [ Pause: Off ]', `Set Field [ T::A ; "${value}" ]`, 'Perform Find []'];
// The records in found-set order, then Get ( SortState ) and the found count.
const list = [
  'Go to Record/Request/Page [ First ]', 'Set Variable [ $names ; "" ]', 'Loop',
  'Set Variable [ $names ; $names & T::A ]', 'Go to Record/Request/Page [ Next ; Exit after last: On ]', 'End Loop',
  'Exit Script [ Text Result: $names & "/" & Get ( SortState ) & "/" & Get ( FoundCount ) ]',
];

test('Show All Records keeps the sort the found set had', async (t) => {
  const run = setup(t);
  const r = await run([sort, ...find('b'), 'Show All Records', ...list].join('\n'));
  assert.equal(r.error, 0);
  assert.equal(r.result, 'abcd/1/4');
});

test('Show All Records after a record was added puts it in the sorted place and ends the semi-sorted state', async (t) => {
  const run = setup(t);
  const r = await run([sort, 'New Record/Request', 'Set Field [ T::A ; "bb" ]', 'Commit Records/Requests [ With dialog: Off ]', 'Show All Records', ...list].join('\n'));
  assert.equal(r.error, 0);
  assert.equal(r.result, 'abbbcd/1/5');
});

test('Show Omitted Only keeps the sort too', async (t) => {
  const run = setup(t);
  const r = await run([sort, 'Go to Record/Request/Page [ First ]', 'Omit Record', 'Omit Record', 'Show Omitted Only', ...list].join('\n'));
  assert.equal(r.error, 0);
  assert.equal(r.result, 'ab/1/2');
});

test('Show All Records after Unsort Records, or with no sort ever done, is in creation order and unsorted (unchanged)', async (t) => {
  const run = setup(t);
  const unsorted = await run([sort, 'Unsort Records', ...find('b'), 'Show All Records', ...list].join('\n'));
  assert.equal(unsorted.result, 'cadb/0/4');
  const never = await run([...find('b'), 'Show All Records', ...list].join('\n'));
  assert.equal(never.result, 'cadb/0/4');
});

test('Perform Quick Find keeps the sort too, with a phrase and with an empty one', async (t) => {
  const run = setup(t);
  const some = await run([sort, 'Perform Quick Find [ "b" ]', 'Show All Records', 'Perform Quick Find [ "" ]', ...list].join('\n'));
  assert.equal(some.result, 'abcd/1/4');
  const found = await run([sort, 'New Record/Request', 'Set Field [ T::A ; "a b" ]', 'Commit Records/Requests [ With dialog: Off ]', 'Perform Quick Find [ "b" ]', ...list].join('\n'));
  assert.equal(found.result, 'a bb/1/2');
});
