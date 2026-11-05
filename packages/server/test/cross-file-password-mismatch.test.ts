// A data file and an interface file where the same account has a different password in each. FileMaker would ask for the
// data file's credentials; here nothing can be asked, so the refusal has to say what is wrong and how to put it right,
// instead of "Layout is missing" or a blank privilege-set error 9.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { serve } from '../src/index.ts';
import { createStore, type Store } from '../../store/src/index.ts';
import { checkSolution } from '../src/check-solution.ts';

let dir: string;
let server: Server;
let base: string;
let ui: Store;
let data: Store;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-xfile-mismatch-'));
  for (const name of ['UI', 'Data']) createStore(join(dir, `${name}.openhbam.sqlite`));
  const served = await serve({ dir, port: 0, hostname: '127.0.0.1', watch: false, log: () => {} });
  server = served.server;
  base = served.url;
  [ui, data] = ['UI', 'Data'].map((n) => served.host.get(n)!);
  for (const store of [ui, data]) store.savePrivilegeSet({ ...store.privilegeSet('[Full Access]')!, extendedPrivileges: ['fmrest', 'fmapp'] });
  data.applyDesign([{ op: 'createTable', name: 'People', fields: [{ name: 'Name' }] },
    { op: 'createScript', name: 'Hello', text: 'Exit Script [ Text Result: "hi" ]' }]);
  data.create('People', { Name: 'Ann' });
  ui.applyDesign([
    { op: 'createDataSource', name: 'Data', paths: ['file:Data'] },
    { op: 'createOccurrence', name: 'People', file: 'Data', externalTable: data.schema.tables.find((t) => t.name === 'People')!.id },
    { op: 'createLayout', name: 'People', occurrence: 'People' },
  ]);
  // The same account in both files, with a different password in each.
  ui.setPassword('Ann', 'ann-ui-password-1', '[Full Access]');
  data.setPassword('Ann', 'ann-data-password-2', '[Full Access]');
});
after(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const json = { 'content-type': 'application/json' };
async function signIn(db: string, account: string, password: string): Promise<string> {
  const r = await fetch(`${base}/fmi/data/vLatest/databases/${db}/sessions`, { method: 'POST', headers: { ...json, authorization: 'Basic ' + btoa(`${account}:${password}`) }, body: '{}' });
  const body = await r.json() as { response: { token?: string } };
  assert.equal(r.status, 200, JSON.stringify(body));
  return body.response.token!;
}

test('a layout of the data file says the password differs, not that the layout is missing', async () => {
  const token = await signIn('UI', 'Ann', 'ann-ui-password-1');
  const r = await fetch(`${base}/fmi/data/vLatest/databases/UI/layouts/People/records`, { headers: { authorization: `Bearer ${token}` } });
  const body = await r.json() as { messages: { code: string; message: string }[] };
  assert.equal(r.status, 401, JSON.stringify(body));
  assert.equal(body.messages[0]!.code, '212');
  assert.match(body.messages[0]!.message, /Account "Ann" exists in "Data" too, but its password there is not the same as in "UI"/);
  assert.match(body.messages[0]!.message, /same password.*both files|fmDataSource/);
  assert.doesNotMatch(JSON.stringify(body), /ann-data-password-2/);
});

test('a script of the data file is refused with the same explanation (error 9)', () => {
  const p = ui.privileges('Ann').in(data);
  assert.throws(() => p.checkScript('Hello'), (e: Error & { code?: number }) => e.code === 9
    && /Insufficient privileges to run script "Hello": Account "Ann" exists in "Data" too, but its password there is not the same as in "UI"/.test(e.message));
});

test('with the same password in both files the reach works and no explanation is given', async () => {
  data.setPassword('Ann', 'ann-ui-password-1', '[Full Access]');
  ui.setPassword('Ann', 'ann-ui-password-1', '[Full Access]');
  const token = await signIn('UI', 'Ann', 'ann-ui-password-1');
  const r = await fetch(`${base}/fmi/data/vLatest/databases/UI/layouts/People/records`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(r.status, 200, await r.text());
  assert.equal(ui.privileges('Ann').in(data).refusal, undefined);
});

test('an account with no namesake in the data file gets no password explanation', () => {
  ui.setPassword('OnlyUi', 'only-ui-password-3', '[Full Access]');
  assert.equal(ui.privileges('OnlyUi').in(data).refusal, undefined);
});

test('Check solution reports a data file that is not hosted, and not one that is', () => {
  assert.equal(checkSolution(ui).findings.filter((f) => f.kind === 'data-file-not-hosted').length, 0);
  const lone = mkdtempSync(join(tmpdir(), 'tabularius-xfile-lone-'));
  try {
    const file = join(lone, 'UI.openhbam.sqlite');
    createStore(file);
    // Same design as UI, with no Data beside it: a store of its own has nothing to resolve the data source against.
    const orphan = new (ui.constructor as new (f: string, n: string) => Store)(file, 'UI');
    try {
      orphan.applyDesign([
        { op: 'createDataSource', name: 'Data', paths: ['file:Data'] },
        { op: 'createOccurrence', name: 'People', file: 'Data', externalTable: 1 },
      ]);
      const found = checkSolution(orphan).findings.filter((f) => f.kind === 'data-file-not-hosted');
      assert.equal(found.length, 1);
      assert.equal(found[0]!.severity, 'error');
      assert.match(found[0]!.where, /Data source "Data"/);
      assert.match(found[0]!.hint, /same folder/);
    } finally { orphan.close(); }
  } finally { rmSync(lone, { recursive: true, force: true }); }
});
