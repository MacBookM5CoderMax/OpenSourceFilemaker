import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store, StoreError, type DesignOp } from '../src/index.ts';
import type { LayoutObject } from '../../fmp12/src/index.ts';

// A portal row may set only the fields placed in that portal, the same rule a record's own fields follow on its layout.

function setup(t: { after: (fn: () => void) => void }, onlyFurther = false): { store: Store; parent: number; portal: string; call: number } {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-portal-placed-'));
  const path = join(dir, 'P.openhbam.sqlite');
  createStore(path);
  const store = new Store(path, 'P');
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.applyDesign([
    { op: 'createTable', name: 'Contacts', fields: [{ name: 'Id', type: 'number' }, { name: 'Name' }] },
    { op: 'createTable', name: 'Calls', fields: [{ name: 'ContactId', type: 'number' }, { name: 'StaffId', type: 'number' }, { name: 'Note' }, { name: 'Unplaced' },
      { name: 'Tags', options: { repetitions: 3 } }] },
    { op: 'createTable', name: 'Staff', fields: [{ name: 'Id', type: 'number' }, { name: 'Name' }, { name: 'Salary' }] },
    { op: 'createRelationship', left: 'Contacts', right: 'Calls', predicates: [{ left: 'Id', right: 'ContactId' }], allowCreation: true },
    { op: 'createRelationship', left: 'Calls', right: 'Staff', predicates: [{ left: 'StaffId', right: 'Id' }] },
  ] as DesignOp[]);
  const occ = (name: string) => store.schema.tableOccurrences.find((x) => x.name === name)!;
  const fieldId = (table: string, name: string) => store.schema.tables.find((x) => x.name === table)!.fields.find((f) => f.name === name)!.id;
  const anchors = { left: true, top: true, right: false, bottom: false };
  let top = 0;
  let id = 100;
  const field = (table: string, name: string, repetitions = 1) => ({
    id: ++id, kind: 'field', type: 1, anchors, style: {}, bounds: { top: top += 24, left: 20, bottom: top + 20, right: 300 },
    field: { tableOccurrenceId: occ(table).id, fieldId: fieldId(table, name), tableOccurrence: table, field: name, display: 'edit', repetitions },
  }) as unknown as LayoutObject;
  const objects = [field('Contacts', 'Id'), {
    id: 900, kind: 'portal', type: 9, anchors, style: {}, bounds: { top: 300, left: 20, bottom: 400, right: 300 },
    portal: { tableOccurrenceId: occ('Calls').id, tableOccurrence: 'Calls', rows: 4, initialRow: 1 },
    children: onlyFurther ? [field('Staff', 'Name')] : [field('Calls', 'Note'), field('Calls', 'Tags', 3), field('Staff', 'Name')],
  } as unknown as LayoutObject];
  store.applyDesign([{ op: 'updateLayout', layout: 'Contacts', design: { objects, tableView: [] } }] as DesignOp[]);
  const parent = store.create('Contacts', { Id: 7, Name: 'a' }).recordId;
  store.create('Staff', { Id: 1, Name: 'Sam', Salary: '100' });
  const call = store.create('Calls', { ContactId: 7, StaffId: 1, Note: 'first' }).recordId;
  return { store, parent, portal: store.layout('Contacts').plan!.portals[0].name, call };
}

const missing = (e: unknown) => e instanceof StoreError && e.code === 102;
const calls = (store: Store) => store.find('Calls', { limit: 100 }).records.map((r) => r.fieldData);

test('an existing portal row cannot set a field that is not placed in the portal', (t) => {
  const { store, parent, portal, call } = setup(t);
  assert.throws(() => store.updatePortals('Contacts', parent, { [portal]: [{ recordId: call, 'Calls::Unplaced': 'set' }] }), missing);
  assert.throws(() => store.updatePortals('Contacts', parent, { [portal]: [{ recordId: call, Unplaced: 'set' }] }), missing);
  assert.equal(calls(store)[0].Unplaced, '');
});

test('a new portal row cannot set a field that is not placed in the portal, and nothing is made', (t) => {
  const { store, parent, portal } = setup(t);
  assert.throws(() => store.updatePortals('Contacts', parent, { [portal]: [{ 'Calls::Note': 'n', 'Calls::Unplaced': 'new' }] }), missing);
  assert.equal(calls(store).length, 1);
});

test('a field of a record related to the row must be placed in the portal too', (t) => {
  const { store, parent, portal, call } = setup(t);
  assert.throws(() => store.updatePortals('Contacts', parent, { [portal]: [{ recordId: call, 'Staff::Salary': '1' }] }), missing);
  store.updatePortals('Contacts', parent, { [portal]: [{ recordId: call, 'Staff::Name': 'Sasha' }] });
  assert.equal(store.find('Staff', { limit: 1 }).records[0].fieldData.Name, 'Sasha');
});

test('placed fields, with or without the occurrence name and by repetition, are still written', (t) => {
  const { store, parent, portal, call } = setup(t);
  store.updatePortals('Contacts', parent, { [portal]: [{ recordId: call, 'Calls::Note': 'edited', 'Tags(2)': 'b' }, { Note: 'second' }] });
  const rows = calls(store);
  assert.deepEqual(rows.map((r) => r.Note).sort(), ['edited', 'second']);
});

test('a portal that places none of its own fields shows them all, so it takes them all; further fields stay strict', (t) => {
  const { store, parent, portal, call } = setup(t, true);
  assert.equal(store.layout('Contacts').plan!.portals[0].fields.length, 0);
  assert.ok('Calls::Unplaced' in store.get('Contacts', parent).portalData![portal][0], 'the read shows every own field');
  store.updatePortals('Contacts', parent, { [portal]: [{ recordId: call, 'Calls::Unplaced': 'set' }] });
  assert.equal(calls(store)[0].Unplaced, 'set');
  assert.throws(() => store.updatePortals('Contacts', parent, { [portal]: [{ recordId: call, 'Staff::Salary': '1' }] }), missing);
});
