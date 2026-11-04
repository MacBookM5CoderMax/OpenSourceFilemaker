import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../src/index.ts';
import { STORE_EXT } from '../src/host.ts';
import { createStore } from '../../store/src/index.ts';

test('Data API record and portal rows show a related summary', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-related-summary-api-'));
  createStore(join(dir, 'Shop' + STORE_EXT));
  const { server, url, host } = await serve({ dir, port: 0, watch: false, log: () => {}, listFilesPublicly: true });
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  });
  const store = host.get('Shop')!;
  store.applyDesign([
    { op: 'createTable', name: 'Invoices', fields: [{ name: 'Id', type: 'number' }] },
    { op: 'createTable', name: 'Lines', fields: [{ name: 'InvoiceId', type: 'number' }, { name: 'Amount', type: 'number' }] },
    { op: 'createField', table: 'Lines', name: 'Total', kind: 'summary', summary: { type: 'total', field: 'Amount' } },
    { op: 'createRelationship', left: 'Invoices', right: 'Lines', predicates: [{ left: 'Id', right: 'InvoiceId' }] },
  ] as never);
  const occ = store.schema.tableOccurrences.find((o) => o.name === 'Lines')!.id;
  const fields = store.schema.tables.find((x) => x.name === 'Lines')!.fields;
  const obj = (id: number, name: string) => ({
    id, kind: 'field', type: 1, anchors: { left: true, top: true, right: false, bottom: false },
    bounds: { top: 20, left: 20, bottom: 40, right: 200 }, style: {},
    field: { tableOccurrenceId: occ, tableOccurrence: 'Lines', fieldId: fields.find((f) => f.name === name)!.id,
      field: name, display: 'edit', repetitions: 1 },
  });
  const layout = store.design('Invoices')!;
  store.applyDesign([{ op: 'updateLayout', layout: 'Invoices', design: { objects: [...layout.objects, obj(800, 'Total'), {
    id: 900, kind: 'portal', type: 9, anchors: { left: true, top: true, right: false, bottom: false },
    bounds: { top: 100, left: 20, bottom: 200, right: 300 }, style: {},
    portal: { tableOccurrenceId: occ, tableOccurrence: 'Lines', rows: 4, initialRow: 1 },
    children: [obj(901, 'Amount'), obj(902, 'Total')],
  }] } as never }]);
  const id = store.create('Invoices', { Id: '1' }).recordId;
  store.create('Lines', { InvoiceId: '1', Amount: '4' });
  store.create('Lines', { InvoiceId: '1', Amount: '7' });
  store.setPassword('Admin', 'pw', '[Full Access]');
  const session = await fetch(`${url}/fmi/data/vLatest/databases/Shop/sessions`, {
    method: 'POST', headers: { authorization: 'Basic ' + btoa('Admin:pw'), 'content-type': 'application/json' }, body: '{}',
  });
  assert.equal(session.status, 200);
  const token = (await session.json() as { response: { token: string } }).response.token;
  const result = await fetch(`${url}/fmi/data/vLatest/databases/Shop/layouts/Invoices/records/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(result.status, 200);
  const body = await result.json() as { response: { data: { fieldData: Record<string, unknown>; portalData: Record<string, Record<string, unknown>[]> }[] } };
  const record = body.response.data[0];
  assert.equal(record.fieldData['Lines::Total'], 11);
  assert.deepEqual(record.portalData.Lines.map((r) => r['Lines::Total']), [11, 11]);
});
