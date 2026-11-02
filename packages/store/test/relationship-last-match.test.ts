// A relationship that loses its last match field finds no records; it does not turn into a join of every record to every record.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../src/index.ts';

function setup(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-last-match-'));
  const path = join(dir, 'M.sqlite');
  createStore(path);
  const store = new Store(path, 'M');
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.applyDesign([
    { op: 'createTable', name: 'A', fields: [{ name: 'K' }, { name: 'J' }, { name: 'Label', type: 'text', kind: 'calculation', calculation: 'B::L', options: { unstored: true } }, { name: 'Total', type: 'number', kind: 'calculation', calculation: 'Count ( B::L )', options: { unstored: true } }] },
    { op: 'createTable', name: 'B', fields: [{ name: 'K' }, { name: 'J' }, { name: 'L' }] },
    { op: 'createRelationship', left: 'A', right: 'B', predicates: [{ left: 'K', right: 'K' }] },
  ] as never);
  store.create('B', { K: '1', L: 'one' });
  store.create('B', { K: '2', L: 'two' });
  const a = store.create('A', { K: '2' }).recordId;
  const read = () => store.get('A', a)?.fieldData as Record<string, unknown>;
  return { store, read };
}

for (const side of ['A', 'B']) {
  test(`deleting the only match field on ${side} leaves a relationship that finds nothing, and restoring it brings the match back`, (t) => {
    const { store, read } = setup(t);
    assert.equal(read().Label, 'two');
    assert.equal(read().Total, 1);
    store.applyDesign([{ op: 'deleteField', table: side, field: 'K' }] as never);
    assert.equal(store.schema.relationships.length, 1);
    assert.equal(store.schema.relationships[0].predicates.length, 1, 'the relationship keeps its match, now pointing at a missing field');
    assert.equal(read().Label, '', 'no record of B is related');
    const none = store.get('A', store.create('A', { J: 'x' }).recordId)?.fieldData.Total;
    assert.notEqual(none, 2);
    assert.equal(read().Total, none, 'counts like a record with no related records');
    store.create('B', { J: 'x', L: 'three' });
    assert.equal(read().Label, '', 'a record added later is not related either');
    store.applyDesign([{ op: 'restoreDeleted', deleted: store.deletedDesigns()[0].id }] as never);
    assert.equal(read().Label, 'two');
    assert.equal(read().Total, 1);
  });
}

test('a relationship that keeps another match, and an unrelated field delete, are unchanged', (t) => {
  const { store, read } = setup(t);
  store.applyDesign([{ op: 'updateRelationship', relationship: store.schema.relationships[0].id, predicates: [{ left: 'K', right: 'K' }, { left: 'J', right: 'J' }] }] as never);
  store.applyDesign([{ op: 'deleteField', table: 'A', field: 'J' }] as never);
  assert.equal(store.schema.relationships[0].predicates.length, 1);
  assert.equal(read().Label, 'two');
  store.applyDesign([{ op: 'deleteField', table: 'B', field: 'L' }] as never);
});

test('updating a relationship with an empty match list is refused', (t) => {
  const { store, read } = setup(t);
  assert.throws(() => store.applyDesign([{ op: 'updateRelationship', relationship: store.schema.relationships[0].id, predicates: [] }] as never), /at least one pair of match fields/);
  assert.equal(store.schema.relationships[0].predicates.length, 1);
  assert.equal(read().Label, 'two');
});
