import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../src/index.ts';
import * as trace from '../src/trace.ts';

function setup(t: TestContext, count = 3, third = true) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-related-summary-'));
  const path = join(dir, 'Shop.openhbam.sqlite');
  createStore(path);
  const store = new Store(path, 'Shop');
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.applyDesign([
    { op: 'createTable', name: 'Invoices', fields: [{ name: 'Id', type: 'number' }] },
    { op: 'createTable', name: 'Lines', fields: [{ name: 'InvoiceId', type: 'number' }, { name: 'Id', type: 'number' }, { name: 'Amount', type: 'number' }] },
    { op: 'createTable', name: 'Products', fields: [{ name: 'LineId', type: 'number' }, { name: 'Stock', type: 'number' }] },
    { op: 'createField', table: 'Lines', name: 'Total', kind: 'summary', summary: { type: 'total', field: 'Amount' } },
    { op: 'createField', table: 'Lines', name: 'N', kind: 'summary', summary: { type: 'count', field: 'Amount' } },
    { op: 'createField', table: 'Products', name: 'Stock Total', kind: 'summary', summary: { type: 'total', field: 'Stock' } },
    { op: 'createRelationship', left: 'Invoices', right: 'Lines', predicates: [{ left: 'Id', right: 'InvoiceId' }] },
    { op: 'createRelationship', left: 'Lines', right: 'Products', predicates: [{ left: 'Id', right: 'LineId' }] },
  ] as never);
  const invoice = Number(store.create('Invoices', { Id: '1' }).recordId);
  const empty = Number(store.create('Invoices', { Id: '2' }).recordId);
  for (let i = 1; i <= count; i++) {
    store.create('Lines', { InvoiceId: '1', Id: String(i), Amount: String(i) });
    if (third) {
      store.create('Products', { LineId: String(i), Stock: String(i * 10) });
      store.create('Products', { LineId: String(i), Stock: '1' });
    }
  }
  const occ = (n: string) => store.schema.tableOccurrences.find((o) => o.name === n)!.id;
  const field = (id: number, to: string, name: string) => ({
    id, kind: 'field', type: 1, anchors: { left: true, top: true, right: false, bottom: false },
    bounds: { top: 20, left: 20, bottom: 40, right: 200 }, style: {},
    field: { tableOccurrenceId: occ(to), tableOccurrence: to, fieldId: store.schema.tables.find((x) => x.name === to)!.fields.find((f) => f.name === name)!.id,
      field: name, display: 'edit', repetitions: 1 },
  });
  const layout = store.design('Invoices')!;
  const portal = {
    id: 900, kind: 'portal', type: 9, anchors: { left: true, top: true, right: false, bottom: false },
    bounds: { top: 100, left: 20, bottom: 200, right: 300 }, style: {},
    portal: { tableOccurrenceId: occ('Lines'), tableOccurrence: 'Lines', rows: 4, initialRow: 1, filter: 'Lines::Amount ≤ 2' },
    children: [field(901, 'Lines', 'Amount'), field(902, 'Lines', 'Total'), ...(third ? [field(903, 'Products', 'Stock Total')] : [])],
  };
  store.applyDesign([{ op: 'updateLayout', layout: 'Invoices', design: {
    objects: [...layout.objects, field(800, 'Lines', 'Total'), field(801, 'Lines', 'N'), portal],
  } as never }]);
  return { store, invoice, empty };
}

test('related summaries on a parent and in portal rows use the relationship set', (t) => {
  const { store, invoice, empty } = setup(t);
  const record = store.get('Invoices', invoice);
  const formula = store.evaluate('Invoices', 'Lines::Total', invoice).value;
  assert.equal(record.fieldData['Lines::Total'], Number(formula));
  assert.equal(record.fieldData['Lines::Total'], 6);
  assert.equal(record.fieldData['Lines::N'], 3);
  const rows = record.portalData!.Lines;
  assert.equal(rows.length, 2, 'portal filter hides the third line');
  assert.deepEqual(rows.map((r) => r['Lines::Total']), [6, 6], 'filter does not narrow the summary');
  assert.deepEqual(rows.map((r) => r['Products::Stock Total']), [11, 21]);
  const noLines = store.get('Invoices', empty);
  assert.equal(String(noLines.fieldData['Lines::Total']), store.evaluate('Invoices', 'Lines::Total', empty).value);
  assert.equal(String(noLines.fieldData['Lines::N']), store.evaluate('Invoices', 'Lines::N', empty).value);
});

test('related summaries honor row access and omit hidden fields', (t) => {
  const { store, invoice } = setup(t);
  store.savePrivilegeSet({
    name: 'Reader', records: { view: true, edit: false, create: false, delete: false },
    tables: { Lines: { view: 'Amount < 3', edit: false, create: false, delete: false, fields: { N: 'none' } } },
    layouts: 'viewOnly', valueLists: 'viewOnly', scripts: 'viewOnly', extendedPrivileges: ['fmapp'],
  } as never);
  store.setPassword('reader', 'pw', 'Reader');
  const privileges = store.privileges('reader');
  const record = store.get('Invoices', invoice, 'us', undefined, privileges);
  assert.equal(record.fieldData['Lines::Total'], 3);
  assert.equal(String(record.fieldData['Lines::Total']), store.evaluate('Invoices', 'Lines::Total', invoice, { account: 'reader', privileges }).value);
  assert.equal('Lines::N' in record.fieldData, false);
  assert.deepEqual(record.portalData!.Lines.map((r) => r['Lines::Total']), [3, 3]);
});

test('a masked related summary shows its configured stand-in', (t) => {
  const { store, invoice } = setup(t);
  store.savePrivilegeSet({
    name: 'Masked', records: { view: true, edit: false, create: false, delete: false },
    tables: { Lines: { view: true, edit: false, create: false, delete: false,
      fields: { Total: 'masked' }, masks: { Total: { kind: 'placeholder', text: 'hidden' } } } },
    layouts: 'viewOnly', valueLists: 'viewOnly', scripts: 'viewOnly', extendedPrivileges: ['fmapp'],
  } as never);
  store.setPassword('masked', 'pw', 'Masked');
  const privileges = store.privileges('masked');
  const record = store.get('Invoices', invoice, 'us', undefined, privileges);
  assert.equal(record.fieldData['Lines::Total'], 'hidden');
  assert.deepEqual(record.portalData!.Lines.map((r) => r['Lines::Total']), ['hidden', 'hidden']);
});

test('one portal summary is computed once for 50 rows', (t) => {
  const { store, invoice } = setup(t, 50, false);
  const layout = store.design('Invoices')!;
  const portal = layout.objects.find((o) => o.kind === 'portal')!;
  store.applyDesign([{ op: 'updateLayout', layout: 'Invoices', design: { objects: layout.objects.map((o) => o === portal ? {
    ...portal, portal: { ...portal.portal!, filter: '' },
  } : o) } as never }]);
  const before = trace.statements;
  const rows = store.get('Invoices', invoice, 'us', { Lines: { limit: 50 } }).portalData!.Lines;
  const ran = trace.statements - before;
  assert.equal(rows.length, 50);
  assert.ok(rows.every((r) => r['Lines::Total'] === 1275));
  assert.ok(ran < 45, `${ran} statements for 50 rows sharing one aggregate`);
});
