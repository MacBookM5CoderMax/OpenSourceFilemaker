// Undo/Redo puts back the script's own uncommitted field edits in the current record, and makes them again.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Script } from '@tabularius/fmp12';
import { scriptText } from '@tabularius/fmp12';
import { createStore, parseScriptText, Store } from '@tabularius/store';
import { runScript } from '../src/index.ts';

let dir: string;
let store: Store;

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-undo-'));
  createStore(join(dir, 'U.sqlite'));
  store = new Store(join(dir, 'U.sqlite'), 'U');
  store.applyDesign([{ op: 'createTable', name: 'Notes', fields: [{ name: 'A' }, { name: 'B' }] }] as never);
  store.create('Notes', { A: 'a0', B: 'b0' });
});
after(() => {
  store?.close();
  rmSync(dir, { recursive: true });
});

const run = async (text: string) => {
  const steps = parseScriptText(text, store.schema).map((s) => ({ stepId: s.stepId!, name: s.name!, enabled: true, params: s.params }));
  return runScript(store, { id: 1, name: 'u', steps } as Script, { layout: 'Notes' });
};
const both = 'Exit Script [ Text Result: Notes::A & "," & Notes::B ]';

test('Undo puts back the last edit, Redo makes it again, Toggle alternates', async () => {
  const r = await run([
    'Set Field [ Notes::A ; "a1" ]', 'Set Field [ Notes::A ; "a2" ]', 'Set Field [ Notes::B ; "b1" ]',
    'Undo/Redo [ Undo ]', 'Set Variable [ $one ; Notes::A & "," & Notes::B ]',
    'Undo/Redo [ Undo ]', 'Set Variable [ $two ; Notes::A & "," & Notes::B ]',
    'Undo/Redo [ Redo ]', 'Set Variable [ $three ; Notes::A & "," & Notes::B ]',
    'Undo/Redo [ Toggle ]', 'Set Variable [ $four ; Notes::A & "," & Notes::B ]',
    'Undo/Redo [ Undo ]', 'Undo/Redo [ Undo ]',
    'Exit Script [ Text Result: $one & "|" & $two & "|" & $three & "|" & $four & "|" & Notes::A & "," & Notes::B & "|" & Get ( RecordOpenState ) ]',
  ].join('\n'));
  assert.equal(r.error, 0);
  assert.equal(r.result, 'a2,b0|a1,b0|a2,b0|a1,b0|a0,b0|0');
});

test('A new edit after an undo drops what could be redone; a commit ends what can be undone', async () => {
  const r = await run([
    'Set Field [ Notes::A ; "x" ]', 'Undo/Redo [ Undo ]', 'Set Field [ Notes::B ; "y" ]', 'Undo/Redo [ Redo ]',
    'Commit Records/Requests [ With dialog: Off ]', 'Undo/Redo [ Undo ]', both,
  ].join('\n'));
  assert.equal(r.result, 'a0,y');
  assert.equal(store.get('Notes', store.findIds('Notes')[0]).fieldData.B, 'y');
});

test('Undo/Redo\'s choice reads and writes as script text', () => {
  const [step] = parseScriptText('Undo/Redo [ Redo ]', store.schema);
  assert.equal(step.params?.undo, 'redo');
  assert.match(scriptText([{ stepId: 45, name: 'Undo/Redo', enabled: true, params: { undo: 'toggle' } }]), /Undo\/Redo \[ Toggle \]/);
});

test('Window steps leave the uncommitted edits alone', async () => {
  const steps = [
    'Adjust Window [ Resize to Fit ]', 'Freeze Window', 'Refresh Window []', 'Scroll Window [ Home ]',
    'Show/Hide Text Ruler [ Hide ]', 'Allow Formatting Bar [ Off ]', 'Arrange All Windows []',
    'Set Layout Object Animation []', 'Enable Touch Keyboard [ Off ]', 'Refresh Portal []',
    'Print Setup [ Restore; With dialog: Off ]',
  ];
  for (const step of steps) {
    const r = await run([
      'Set Field [ Notes::A ; "w1" ]', step,
      'Set Variable [ $kept ; Notes::A ]', 'Revert Record/Request [ With dialog: Off ]', 'Exit Script [ Text Result: $kept ]',
    ].join('\n'));
    assert.equal(r.error, 0, step);
    assert.equal(r.result, 'w1', step);
  }
});

test('Redo makes an edit again after Undo took back the only uncommitted edit', async () => {
  const r = await run([
    'Set Field [ Notes::A ; "r1" ]', 'Undo/Redo [ Undo ]', 'Set Variable [ $undone ; Notes::A ]',
    'Undo/Redo [ Redo ]', 'Set Variable [ $redone ; Notes::A ]',
    'Undo/Redo [ Toggle ]', 'Set Variable [ $toggled ; Notes::A ]',
    'Undo/Redo [ Toggle ]',
    'Exit Script [ Text Result: $undone & "|" & $redone & "|" & $toggled & "|" & Notes::A ]',
  ].join('\n'));
  assert.equal(r.error, 0);
  assert.equal(r.result, 'a0|r1|a0|r1');
});

test('What was undone cannot be redone after a commit, a revert or a move to another record', async () => {
  store.create('Notes', { A: 'a9', B: 'b9' });
  const first = store.findIds('Notes')[0];
  const before = store.get('Notes', first).fieldData.A;
  for (const [name, leave] of [['commit', 'Commit Records/Requests [ With dialog: Off ]'], ['revert', 'Revert Record/Request [ With dialog: Off ]'], ['move', 'Go to Record/Request/Page [ Next ]']] as const) {
    const r = await run(['Go to Record/Request/Page [ First ]', 'Set Variable [ $before ; Notes::A ]', 'Set Field [ Notes::A ; "z" ]', 'Undo/Redo [ Undo ]', leave,
      'Go to Record/Request/Page [ First ]', 'Undo/Redo [ Redo ]', 'Exit Script [ Text Result: If ( Notes::A = $before ; "same" ; "changed" ) & "," & Get ( RecordNumber ) ]'].join('\n'));
    assert.equal(r.error, 0, name);
    assert.equal(r.result, 'same,1', name);
  }
  assert.equal(store.get('Notes', first).fieldData.A, before);
});

test('What was undone cannot be redone after the record is deleted', async () => {
  store.create('Notes', { A: 'gone', B: 'gone' });
  const r = await run([
    'Go to Record/Request/Page [ Last ]', 'Set Field [ Notes::A ; "z" ]', 'Undo/Redo [ Undo ]',
    'Delete Record/Request [ With dialog: Off ]', 'Undo/Redo [ Redo ]',
    'Exit Script [ Text Result: If ( Notes::A = "z" ; "redone" ; "kept" ) & "," & Get ( RecordOpenState ) ]',
  ].join('\n'));
  assert.equal(r.error, 0);
  assert.equal(r.result, 'kept,0');
});

test('What was undone cannot be redone after a transaction is reverted', async () => {
  const r = await run([
    'Go to Record/Request/Page [ First ]', 'Set Variable [ $before ; Notes::A ]',
    'Open Transaction', 'Set Field [ Notes::A ; "tx" ]', 'Undo/Redo [ Undo ]', 'Revert Transaction', 'Commit Transaction',
    'Undo/Redo [ Redo ]',
    'Exit Script [ Text Result: If ( Notes::A = $before ; "same" ; "changed" ) ]',
  ].join('\n'));
  assert.equal(r.error, 0);
  assert.equal(r.result, 'same');
});
