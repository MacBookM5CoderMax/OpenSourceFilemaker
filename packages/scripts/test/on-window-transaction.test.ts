import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store, parseScriptText } from '@tabularius/store';
import type { Script } from '@tabularius/fmp12';
import { dryRunScript, runScript } from '../src/index.ts';

test('a dry run without OnWindowTransaction does not read transaction context for deletes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-window-transaction-plain-'));
  const path = join(dir, 'Plain.sqlite');
  createStore(path);
  const store = new Store(path, 'Plain');
  try {
    store.applyDesign([
      { op: 'createTable', name: 'Items', fields: [{ name: 'Name' }, { name: 'OnWindowTransaction' }] },
      { op: 'createScript', name: 'Delete One', text: 'Delete Record/Request [ With dialog: Off ]' },
    ]);
    const id = store.create('Items', { Name: 'kept', OnWindowTransaction: 'context' }).recordId;
    const scriptId = store.schema.scripts.find((s) => s.name === 'Delete One')!.id;
    const originalGet = store.get.bind(store);
    let contextReads = 0;
    store.get = ((...args: Parameters<Store['get']>) => {
      if (args[5]?.fresh && args[5].fields?.includes('OnWindowTransaction')) contextReads++;
      return originalGet(...args);
    }) as Store['get'];
    const result = await dryRunScript(store, scriptId, {});
    assert.equal(result.ended.error, 0);
    assert.equal(contextReads, 0);
    assert.equal(store.get('Items', id).fieldData.Name, 'kept');
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});

test('a dry run without OnWindowTransaction creates thousands of records and rolls them back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-window-transaction-bulk-'));
  const path = join(dir, 'Bulk.sqlite');
  createStore(path);
  const store = new Store(path, 'Bulk');
  try {
    store.applyDesign([
      { op: 'createTable', name: 'Items', fields: [{ name: 'Name' }] },
      { op: 'createScript', name: 'Create Many', text: [
        'Loop',
        '  New Record/Request',
        '  Set Variable [ $i ; Value: $i + 1 ]',
        '  Exit Loop If [ $i ≥ 3000 ]',
        'End Loop',
      ].join('\n') },
    ]);
    const scriptId = store.schema.scripts.find((s) => s.name === 'Create Many')!.id;
    const result = await dryRunScript(store, scriptId, {}, { maxSteps: 50_000, timeoutMs: 30_000 });
    assert.equal(result.ended.error, 0);
    assert.equal(result.changes.records.length, 200);
    assert.equal(result.changes.more, 2800);
    assert.equal(result.changes.incomplete, undefined);
    assert.equal(store.query('SELECT COUNT(*) AS n FROM Items')[0].n, 0);
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});

test('OnWindowTransaction receives a committed edit with parsed context after the write', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-window-transaction-'));
  const path = join(dir, 'Audit.sqlite');
  createStore(path);
  const store = new Store(path, 'Audit');
  try {
    store.applyDesign([
      { op: 'createTable', name: 'Items', fields: [{ name: 'Name' }, { name: 'OnWindowTransaction' }] },
      { op: 'createScript', name: 'Audit Hook', text: 'Set Variable [ $$audit ; Value: Get ( ScriptParameter ) ]' },
      { op: 'setFileOptions', onWindowTransaction: 'Audit Hook' },
    ]);
    const { recordId } = store.create('Items', { Name: 'before', OnWindowTransaction: '{"u":"a"}' });
    const steps = parseScriptText('Set Field [ Items::Name ; "after" ]\nCommit Records/Requests\nExit Script [ Text Result: $$audit ]', store.schema);
    const script: Script = { id: 9999, name: 'Edit', steps: steps.map((s) => ({ stepId: s.stepId!, name: s.name!, enabled: true, params: s.params })) };
    const result = await runScript(store, script, { layout: 'Items', foundSet: [recordId] });
    assert.deepEqual(JSON.parse(result.result), { Audit: { Items: [['Modified', recordId, { u: 'a' }]] } });
    assert.equal(store.get('Items', recordId).fieldData.Name, 'after');
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});

test('new, delete, revert and transaction commits have the correct notifications', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-window-transaction-'));
  const path = join(dir, 'Ledger.sqlite');
  createStore(path);
  const store = new Store(path, 'Ledger');
  try {
    store.applyDesign([
      { op: 'createTable', name: 'Items', fields: [{ name: 'Name' }, { name: 'AuditKey' }] },
      { op: 'createTable', name: 'Other', fields: [{ name: 'OnWindowTransaction' }] },
      { op: 'createScript', name: 'Audit Hook', text: 'Set Variable [ $$audit ; Value: $$audit & Get ( ScriptParameter ) & "\n" ]' },
      { op: 'setFileOptions', onWindowTransaction: 'Audit Hook', onWindowTransactionField: 'AuditKey' },
    ]);
    const id = store.create('Items', { Name: 'old', AuditKey: 'plain' }).recordId;
    const run = (source: string, foundSet = [id]) => {
      const steps = parseScriptText(source, store.schema);
      const script: Script = { id: 9999, name: 'Work', steps: steps.map((s) => ({ stepId: s.stepId!, name: s.name!, enabled: true, params: s.params })) };
      return runScript(store, script, { layout: 'Items', foundSet });
    };
    let r = await run('Set Variable [ $$audit ; Value: "" ]\nCommit Records/Requests\nExit Script [ Text Result: $$audit ]');
    assert.equal(r.result, '');
    r = await run('Set Variable [ $$audit ; Value: "" ]\nOpen Transaction\nDuplicate Record/Request [ With dialog: Off ]\nDelete Record/Request [ With dialog: Off ]\nCommit Transaction\nExit Script [ Text Result: $$audit ]');
    assert.equal(r.result, '');
    r = await run('Set Variable [ $$audit ; Value: "" ]\nSet Field [ Items::Name ; "changed" ]\nRevert Record/Request\nExit Script [ Text Result: $$audit ]');
    assert.equal(r.result, '');
    r = await run('Set Variable [ $$audit ; Value: "" ]\nOpen Transaction\nSet Field [ Items::Name ; "tx" ]\nCommit Records/Requests\nNew Record/Request\nSet Field [ Items::AuditKey ; "second" ]\nCommit Records/Requests\nGo to Layout [ "Other" ]\nNew Record/Request\nCommit Records/Requests\nCommit Transaction\nExit Script [ Text Result: $$audit ]');
    const summaries = r.result.trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].Ledger.Items[0][0], 'Modified');
    assert.equal(summaries[0].Ledger.Items[0][2], 'plain');
    assert.equal(summaries[0].Ledger.Items.length, 2);
    assert.equal(summaries[0].Ledger.Items[1][0], 'New');
    assert.equal(summaries[0].Ledger.Items[1][2], 'second');
    assert.equal(summaries[0].Ledger.Other[0][0], 'New');
    assert.equal(summaries[0].Ledger.Other[0][2], '');
    r = await run('Set Variable [ $$audit ; Value: "" ]\nNew Record/Request\nSet Field [ Items::AuditKey ; "new context" ]\nCommit Records/Requests\nExit Script [ Text Result: $$audit ]');
    assert.equal(JSON.parse(r.result.trim()).Ledger.Items[0][0], 'New');
    assert.equal(JSON.parse(r.result.trim()).Ledger.Items[0][2], 'new context');
    r = await run('Set Variable [ $$audit ; Value: "" ]\nOpen Transaction\nSet Field [ Items::Name ; "undone" ]\nCommit Records/Requests\nRevert Transaction\nCommit Transaction\nExit Script [ Text Result: $$audit ]');
    assert.equal(r.result, '');
    r = await run('Open Transaction\nSet Field [ Items::Name ; "halted" ]\nCommit Records/Requests\nHalt Script');
    assert.equal(r.actions.some((action) => action.step === 'Script Trigger' && action.event === 'OnWindowTransaction'), false);
    r = await run('Set Variable [ $$audit ; Value: "" ]\nDelete Record/Request [ With dialog: Off ]\nExit Script [ Text Result: $$audit ]');
    assert.deepEqual(JSON.parse(r.result.trim()), { Ledger: { Items: [['Deleted', id, 'plain']] } });
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});

test('a window trigger groups writes to an external base table under its owning file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-window-transaction-files-'));
  const open = (name: string) => {
    const path = join(dir, `${name}.sqlite`);
    createStore(path);
    return new Store(path, name);
  };
  const a = open('Front');
  const b = open('Back');
  try {
    b.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Name' }, { name: 'OnWindowTransaction' }] }]);
    const id = b.create('Items', { Name: 'old', OnWindowTransaction: 'remote' }).recordId;
    a.applyDesign([{ op: 'createDataSource', name: 'Back', paths: ['file:Back'] }]);
    a.resolveFile = (name) => name === 'Back' ? b : undefined;
    a.applyDesign([
      { op: 'createOccurrence', name: 'BackItems', file: 'Back', externalTable: b.schema.tables[0].id },
      { op: 'createLayout', name: 'External', occurrence: 'BackItems' },
      { op: 'createScript', name: 'Audit Hook', text: 'Set Variable [ $$audit ; Value: Get ( ScriptParameter ) ]' },
      { op: 'setFileOptions', onWindowTransaction: 'Audit Hook' },
    ]);
    const steps = parseScriptText('Set Field [ BackItems::Name ; "new" ]\nCommit Records/Requests\nExit Script [ Text Result: $$audit ]', a.schema);
    const script: Script = { id: 9999, name: 'Work', steps: steps.map((s) => ({ stepId: s.stepId!, name: s.name!, enabled: true, params: s.params })) };
    const result = await runScript(a, script, { layout: 'External', foundSet: [id] });
    assert.deepEqual(JSON.parse(result.result), { Back: { Items: [['Modified', id, 'remote']] } });
  } finally {
    a.close();
    b.close();
    rmSync(dir, { recursive: true });
  }
});

test('commits inside the trigger wait until it returns and do not re-enter it', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-window-transaction-guard-'));
  const path = join(dir, 'Guard.sqlite');
  createStore(path);
  const store = new Store(path, 'Guard');
  try {
    store.applyDesign([
      { op: 'createTable', name: 'Items', fields: [{ name: 'Name' }] },
      { op: 'createScript', name: 'Audit Hook', text: 'Set Variable [ $$count ; Value: $$count + 1 ]\nIf [ $$count = 1 ]\nSet Field [ Items::Name ; "hook" ]\nCommit Records/Requests\nEnd If' },
      { op: 'setFileOptions', onWindowTransaction: 'Audit Hook' },
    ]);
    const id = store.create('Items', { Name: 'old' }).recordId;
    const steps = parseScriptText('Set Variable [ $$count ; Value: 0 ]\nSet Field [ Items::Name ; "first" ]\nCommit Records/Requests\nExit Script [ Text Result: $$count ]', store.schema);
    const script: Script = { id: 9999, name: 'Work', steps: steps.map((s) => ({ stepId: s.stepId!, name: s.name!, enabled: true, params: s.params })) };
    const result = await runScript(store, script, { layout: 'Items', foundSet: [id] });
    assert.equal(result.result, '2');
    assert.equal(store.get('Items', id).fieldData.Name, 'hook');
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});

test('a transaction committed in Find mode runs the file trigger', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-window-transaction-find-'));
  const path = join(dir, 'Find.sqlite');
  createStore(path);
  const store = new Store(path, 'Find');
  try {
    store.applyDesign([
      { op: 'createTable', name: 'Items', fields: [{ name: 'Name' }] },
      { op: 'createScript', name: 'Audit Hook', text: 'Set Variable [ $$audit ; Value: Get ( ScriptParameter ) ]\nSet Variable [ $$hookMode ; Value: Get ( WindowMode ) ]' },
      { op: 'setFileOptions', onWindowTransaction: 'Audit Hook' },
    ]);
    const id = store.create('Items', { Name: 'before' }).recordId;
    const steps = parseScriptText('Open Transaction\nSet Field [ Items::Name ; "after" ]\nCommit Records/Requests\nEnter Find Mode [ Pause: Off ]\nSet Variable [ $$mode ; Value: Get ( WindowMode ) ]\nCommit Transaction\nExit Script [ Text Result: $$mode & "|" & $$hookMode & "|" & $$audit ]', store.schema);
    const script: Script = { id: 9999, name: 'Work', steps: steps.map((s) => ({ stepId: s.stepId!, name: s.name!, enabled: true, params: s.params })) };
    const result = await runScript(store, script, { layout: 'Items', foundSet: [id] });
    const [mode, hookMode, audit] = result.result.split('|');
    assert.equal(mode, '1');
    assert.equal(hookMode, '1');
    assert.deepEqual(JSON.parse(audit), { Find: { Items: [['Modified', id, '']] } });
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});
