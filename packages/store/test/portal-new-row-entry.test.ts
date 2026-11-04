import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store, StoreError, type DesignOp } from '../src/index.ts';
import type { LayoutObject } from '../../fmp12/src/index.ts';

// A related record made through a portal row follows the same data-entry rules as one made directly: a field that
// prohibits modification during data entry can't be typed into, while the match field is still filled in for the person.

function setup(t: { after: (fn: () => void) => void }): { store: Store; parent: number; portal: string } {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-portal-entry-'));
  const path = join(dir, 'P.openhbam.sqlite');
  createStore(path);
  const store = new Store(path, 'P');
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.applyDesign([
    { op: 'createTable', name: 'Contacts', fields: [{ name: 'Id', type: 'number' }, { name: 'Name' }] },
    { op: 'createTable', name: 'Calls', fields: [
      { name: 'ContactId', type: 'number', options: { autoEnter: { prohibitModification: true } } },
      { name: 'Note' },
      { name: 'CreatedBy', options: { autoEnter: { prohibitModification: true } } },
    ] },
    { op: 'createRelationship', left: 'Contacts', right: 'Calls', predicates: [{ left: 'Id', right: 'ContactId' }], allowCreation: true },
  ] as DesignOp[]);
  const occ = (name: string) => store.schema.tableOccurrences.find((x) => x.name === name)!;
  const fieldId = (table: string, name: string) => store.schema.tables.find((x) => x.name === table)!.fields.find((f) => f.name === name)!.id;
  const anchors = { left: true, top: true, right: false, bottom: false };
  let top = 0;
  let id = 100;
  const field = (table: string, name: string) => ({
    id: ++id, kind: 'field', type: 1, anchors, style: {}, bounds: { top: top += 24, left: 20, bottom: top + 20, right: 300 },
    field: { tableOccurrenceId: occ(table).id, fieldId: fieldId(table, name), tableOccurrence: table, field: name, display: 'edit', repetitions: 1 },
  }) as unknown as LayoutObject;
  const objects = [field('Contacts', 'Id'), {
    id: 900, kind: 'portal', type: 9, anchors, style: {}, bounds: { top: 300, left: 20, bottom: 400, right: 300 },
    portal: { tableOccurrenceId: occ('Calls').id, tableOccurrence: 'Calls', rows: 4, initialRow: 1 }, children: [field('Calls', 'Note'), field('Calls', 'CreatedBy')],
  } as unknown as LayoutObject];
  store.applyDesign([{ op: 'updateLayout', layout: 'Contacts', design: { objects, tableView: [] } }] as DesignOp[]);
  const parent = store.create('Contacts', { Id: 7, Name: 'a' }).recordId;
  return { store, parent, portal: store.layout('Contacts').plan!.portals[0].name };
}

const calls = (store: Store) => store.find('Calls', { limit: 100 }).records.map((r) => r.fieldData);

test('a new portal row typed by a person cannot set a field that prohibits modification', (t) => {
  const { store, parent, portal } = setup(t);
  assert.throws(
    () => store.updatePortals('Contacts', parent, { [portal]: [{ 'Calls::Note': 'n', 'Calls::CreatedBy': 'someone else' }] }, [], { dataEntry: true }),
    (e: unknown) => e instanceof StoreError && e.code === 201,
  );
  assert.deepEqual(calls(store), [], 'no related record is made');
});

test('a new portal row still gets its match field, even when that field prohibits modification', (t) => {
  const { store, parent, portal } = setup(t);
  store.updatePortals('Contacts', parent, { [portal]: [{ 'Calls::Note': 'n' }] }, [], { dataEntry: true });
  assert.deepEqual(calls(store).map((r) => [r.ContactId, r.Note]), [[7, 'n']]);
});

test('a write that is not data entry (a script, prohibitmode "script") may still set the field in a new portal row', (t) => {
  const { store, parent, portal } = setup(t);
  store.updatePortals('Contacts', parent, { [portal]: [{ 'Calls::Note': 'n', 'Calls::CreatedBy': 'set by a script' }] }, [], {});
  assert.equal(calls(store)[0].CreatedBy, 'set by a script');
});
