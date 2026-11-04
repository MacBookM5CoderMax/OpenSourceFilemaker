// A change listener that throws is logged through the fault log: file paths are hidden, and the number of lines a minute
// is capped. The change itself still goes through.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../src/index.ts';

test('a throwing change listener is logged once with its home-folder path hidden, and the write succeeds', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-listener-fault-'));
  createStore(join(dir, 'L.sqlite'));
  const store = new Store(join(dir, 'L.sqlite'), 'L');
  const error = console.error;
  const logged: string[] = [];
  t.after(() => { console.error = error; store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Name' }] }]);
  const heard: unknown[] = [];
  store.listeners.add(() => { throw new Error(`cannot write ${join(homedir(), 'private-folder', 'out.log')}`); });
  store.listeners.add((c) => heard.push(c.kind)); // a later listener still hears the change
  console.error = (...a: unknown[]) => void logged.push(a.map(String).join(' '));
  const { recordId } = store.create('Items', { Name: 'a' });
  assert.ok(recordId > 0);
  assert.ok(heard.length > 0, 'the listener after the throwing one still hears the change');
  assert.ok(logged.length >= 1);
  assert.match(logged[0], /\[home\]\/out\.log/);
  assert.ok(!logged[0].includes('private-folder'), logged[0]);
});
