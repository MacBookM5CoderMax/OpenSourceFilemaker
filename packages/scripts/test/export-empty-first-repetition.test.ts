import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Script, StepParams } from '@tabularius/fmp12';
import { createStore, Store } from '@tabularius/store';
import { runScript } from '../src/index.ts';

const ref = (name: string) => ({ tableOccurrence: { id: 0, name: 'Rows' }, field: { id: 0, name } });

for (const [format, file] of [['COMS', 'out.csv'], ['MRGE', 'out.mer'], ['TABS', 'out.tab']] as const) {
  async function roundTrip(values: Record<string, string>[]) {
    const dir = mkdtempSync(join(tmpdir(), 'tabularius-export-empty-rep-'));
    const db = join(dir, 'R.sqlite');
    createStore(db);
    const store = new Store(db, 'R');
    try {
      store.applyDesign([{ op: 'createTable', name: 'Rows', fields: [{ name: 'Key' }, { name: 'Rep', options: { repetitions: 3 } }] }]);
      const ids = values.map((value) => store.create('Rows', value).recordId);
      const exported = await runScript(store, { id: 1, name: 'Export', steps: [
        { stepId: 36, name: 'Export Records', enabled: true, params: { filePaths: [file], exportFormat: format, exportFields: [ref('Key'), ref('Rep')] } as StepParams },
      ] } as Script, { layout: 'Rows', foundSet: ids, documents: dir });
      assert.equal(exported.error, 0);
      const text = readFileSync(join(dir, file), 'utf8');
      const imported = await runScript(store, { id: 2, name: 'Import', steps: [
        { stepId: 35, name: 'Import Records', enabled: true, params: { filePaths: [file], importFormat: format, importAction: 'add', fieldMapping: [{ field: ref('Key'), import: true }, { field: ref('Rep'), import: true }] } as StepParams },
      ] } as Script, { layout: 'Rows', documents: dir });
      assert.equal(imported.error, 0);
      assert.equal(imported.foundSet?.length, values.length);
      return { text, rows: imported.foundSet!.map((id) => store.get('Rows', id).fieldData) };
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  }

  test(`an empty first repetition is not guarded (${format})`, async () => {
    const { text, rows } = await roundTrip([
      { Key: 'a', 'Rep(2)': 'x' },
      { Key: 'b', 'Rep(3)': 'w' },
      { Key: 'c', Rep: 'y', 'Rep(2)': 'z' },
    ]);
    assert.equal(text.includes("'"), false);
    assert.ok(text.includes('\u001dx'));
    assert.ok(text.includes('\u001d\u001dw'));
    assert.deepEqual(rows.map((row) => [row.Rep ?? '', row['Rep(2)'] ?? '', row['Rep(3)'] ?? '']), [
      ['', 'x', ''], ['', '', 'w'], ['y', 'z', ''],
    ]);
  });

  test(`a formula-like first repetition is still guarded (${format})`, async () => {
    const { text, rows } = await roundTrip([{ Key: 'a', Rep: '=1+1', 'Rep(2)': 'q' }]);
    assert.ok(text.includes("'=1+1\u001dq"));
    assert.deepEqual([rows[0]!.Rep, rows[0]!['Rep(2)']], ["'=1+1", 'q']);
  });

  test(`a later formula-like repetition is not guarded (${format})`, async () => {
    const { text, rows } = await roundTrip([{ Key: 'a', Rep: 'p', 'Rep(2)': '=2' }]);
    assert.equal(text.includes("'"), false);
    assert.ok(text.includes('p\u001d=2'));
    assert.deepEqual([rows[0]!.Rep, rows[0]!['Rep(2)']], ['p', '=2']);
  });
}
