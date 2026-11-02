import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Script, StepParams } from '@tabularius/fmp12';
import { createStore, Store } from '@tabularius/store';
import { excelDate } from '../src/engine.ts';
import { runScript } from '../src/index.ts';
import { unzip } from '../src/xlsx.ts';

const ref = (name: string) => ({ tableOccurrence: { id: 0, name: 'Rows' }, field: { id: 0, name } });

async function exportedRows(values: { T: string; S?: string }[]) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-xlsx-duration-'));
  createStore(join(dir, 'R.sqlite'));
  const store = new Store(join(dir, 'R.sqlite'), 'R');
  try {
    store.applyDesign([{ op: 'createTable', name: 'Rows', fields: [{ name: 'T', type: 'time' }, { name: 'S', type: 'timestamp' }] }]);
    const ids = values.map((value) => store.create('Rows', value).recordId);
    const before = ids.map((id) => store.get('Rows', id).fieldData);
    const exported = await runScript(store, { id: 1, name: 'Export', steps: [
      { stepId: 36, name: 'Export Records', enabled: true, params: { filePaths: ['out.xlsx'], exportFormat: 'XLXE', exportFields: [ref('T'), ref('S')] } as StepParams },
    ] } as Script, { layout: 'Rows', foundSet: ids, documents: dir });
    assert.equal(exported.error, 0);
    const bytes = readFileSync(join(dir, 'out.xlsx'));
    const sheet = new TextDecoder().decode(unzip(bytes).get('xl/worksheets/sheet1.xml'));
    const imported = await runScript(store, { id: 2, name: 'Import', steps: [
      { stepId: 35, name: 'Import Records', enabled: true, params: { filePaths: ['out.xlsx'], importFormat: 'XLXE', importAction: 'add', fieldMapping: [{ field: ref('T'), import: true }, { field: ref('S'), import: true }] } as StepParams },
    ] } as Script, { layout: 'Rows', documents: dir });
    assert.equal(imported.error, 0);
    assert.equal(imported.foundSet?.length, values.length);
    return { before, after: imported.foundSet!.map((id) => store.get('Rows', id).fieldData), sheet };
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test('durations and fractions of a second survive an Excel round trip', async () => {
  const { before, after, sheet } = await exportedRows([
    { T: '00:00:00', S: '2026-11-02 13:45:30.25' },
    { T: '13:45:30', S: '2026-11-02 00:00:00' },
    { T: '23:59:59.5' },
    { T: '-1:30:00' },
    { T: '100:00:00' },
  ]);
  assert.deepEqual(after, before);
  assert.match(sheet, /<c r="A4" t="inlineStr"><is><t xml:space="preserve">-1:30:00<\/t><\/is><\/c>/);
  assert.match(sheet, /<c r="A5" t="inlineStr"><is><t xml:space="preserve">100:00:00<\/t><\/is><\/c>/);
});

test('excelDate keeps a fraction of a second', () => {
  assert.equal(excelDate(25569 + 0.5 + 0.25 / 86400, 'time'), '12:00:00.25');
  assert.equal(excelDate(25569.5, 'time'), '12:00:00');
  assert.equal(excelDate(25569.5, 'timestamp'), '1970-01-01T12:00:00');
  assert.equal(excelDate(25569.5, 'date'), '1970-01-01');
});

test('a time-of-day cell stays a typed cell', async () => {
  const { sheet } = await exportedRows([{ T: '13:45:30' }]);
  assert.match(sheet, /<c r="A1" s="3"><v>0\.5732638[^<]*<\/v><\/c>/);
});
