import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../src/index.ts';
import { STORE_EXT } from '../src/host.ts';
import { createStore, type Store } from '../../store/src/index.ts';

let dir: string;
let app: Awaited<ReturnType<typeof serve>>;
let store: Store;
const oldPath = process.env.PATH;
const oldSwitch = process.env.TABULARIUS_XML_PUBLISHING_WRITES;
const auth = 'Basic ' + btoa('Ann:pw');
const append = (s: string) => `Set Field [ Items::Log ; Items::Log & "${s}" ]`;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-xml-scripts-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  for (const command of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    writeFileSync(join(bin, command), `#!/bin/sh\nprintf called > '${join(dir, 'forbidden-command')}'\nexit 99\n`, { mode: 0o755 });
  }
  process.env.PATH = `${bin}:${oldPath ?? ''}`;
  createStore(join(dir, 'X' + STORE_EXT));
  app = await serve({ dir, port: 0, watch: false, log: () => {} });
  store = app.host.get('X')!;
  store.applyDesign([
    { op: 'createTable', name: 'Items', fields: [{ name: 'Name' }, { name: 'Log' }, { name: 'Global', options: { global: true } }] },
    { op: 'createScript', name: 'Touch', text: 'Set Field [ Items::Name ; Get ( ScriptParameter ) ]' },
    { op: 'createScript', name: 'Global', text: 'Set Field [ Items::Global ; "ran" ]\n' + append('ran') },
    { op: 'createScript', name: 'Create', text: 'New Record/Request\nSet Field [ Items::Name ; Get ( ScriptParameter ) ]' },
    { op: 'createScript', name: 'Before', text: append('before,') },
    { op: 'createScript', name: 'Sort', text: append('sort,') + '\nSet Field [ Items::Name ; Get ( ScriptParameter ) ]' },
    { op: 'createScript', name: 'After', text: append('after') },
    { op: 'createScript', name: 'Error', text: 'Go to Layout [ Layout Name: "Missing" ]' },
    { op: 'createScript', name: 'Omit', text: 'Omit Record' },
    { op: 'createScript', name: 'Seed', text: 'Set Field [ Items::Global ; "local" ]\nExit Script [ Text Result: "previous" ]' },
    { op: 'createScript', name: 'Probe', text: 'Set Field [ Items::Log ; Items::Global & ":" & Get ( ScriptResult ) ]' },
  ]);
  const full = store.privilegeSets().find((p) => p.name === '[Full Access]')!;
  store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmxml'] });
  store.setPassword('Ann', 'pw', full.name);
  store.savePrivilegeSet({ name: 'Denied', extendedPrivileges: ['fmxml'], layouts: 'modifiable', scripts: 'none', scriptAccess: { Global: 'viewOnly' }, valueLists: 'viewOnly', records: { view: true, edit: true, create: true, delete: true } } as never);
  store.setPassword('Denied', 'pw', 'Denied');
});

beforeEach(() => {
  process.env.TABULARIUS_XML_PUBLISHING_WRITES = '1';
  for (const r of store.find('Items').records) store.delete('Items', r.recordId);
  store.create('Items', { Name: 'A', Log: '' });
  store.create('Items', { Name: 'B', Log: '' });
});

after(async () => {
  if (oldSwitch === undefined) delete process.env.TABULARIUS_XML_PUBLISHING_WRITES;
  else process.env.TABULARIUS_XML_PUBLISHING_WRITES = oldSwitch;
  if (app) await new Promise<void>((resolve) => app.server.close(() => resolve()));
  if (oldPath === undefined) delete process.env.PATH; else process.env.PATH = oldPath;
  assert.equal(existsSync(join(dir, 'forbidden-command')), false);
  if (dir) rmSync(dir, { recursive: true, force: true });
});

async function xml(params: string, authorization = auth, post = true, extra: Record<string, string> = {}) {
  const body = '-db=X&-lay=Items&' + params;
  const response = await fetch(`${app.url}/fmi/xml/fmresultset.xml${post ? '' : '?' + body}`, {
    method: post ? 'POST' : 'GET', headers: { authorization, ...(post ? { 'content-type': 'application/x-www-form-urlencoded' } : {}), ...extra },
    ...(post ? { body } : {}),
  });
  const text = await response.text();
  return { text, code: /<error code="(-?\d+)"/.exec(text)?.[1] };
}
const rows = () => store.find('Items').records;

test('off: every script parameter gives 960 naming the switch and no script writes', async () => {
  delete process.env.TABULARIUS_XML_PUBLISHING_WRITES;
  for (const param of ['-script=Global', '-script.prefind=Global', '-script.presort=Global', '-script.param=x']) {
    const r = await xml('-findall&' + param);
    assert.equal(r.code, '960');
    assert.match(r.text, /TABULARIUS_XML_PUBLISHING_WRITES=1/);
  }
  assert.ok(rows().every((r) => r.fieldData.Log === '' && r.fieldData.Global === ''));
});

test('post-query script receives its parameter and writes the current record; answer retains query snapshot', async () => {
  const r = await xml('-findall&-script=Touch&-script.param=changed');
  assert.equal(r.code, '0', r.text);
  assert.match(r.text, /<data>A<\/data>/);
  assert.equal(rows()[0].fieldData.Name, 'changed');
});

test('prefind creates a record before the query, with its own parameter', async () => {
  const r = await xml('-find&Name=created&-script.prefind=Create&-script.prefind.param=created');
  assert.equal(r.code, '0', r.text);
  assert.match(r.text, /<data>created<\/data>/);
});

test('presort sees the found set before sorting and pagination, with its own parameter', async () => {
  const r = await xml('-findall&-sortfield.1=Name&-max=1&-script.presort=Sort&-script.presort.param=Z');
  assert.equal(r.code, '0', r.text);
  assert.match(r.text, /<data>B<\/data>/);
  assert.equal(rows()[0].fieldData.Name, 'Z');
});

test('all phases run in order on the query record', async () => {
  assert.equal((await xml('-findall&-script.prefind=Before&-script.presort=Sort&-script.presort.param=A&-script=After')).code, '0');
  assert.equal(rows()[0].fieldData.Log, 'before,sort,after');
});

test('write commands accept post scripts on the resulting record', async () => {
  const r = await xml('-new&Name=new&-script=Touch&-script.param=written', auth, true);
  assert.equal(r.code, '0', r.text);
  assert.equal(rows().at(-1)!.fieldData.Name, 'written');
});

test('denied and unknown later phases fail before prefind or writes run', async () => {
  const before = rows();
  const denied = await xml('-new&Name=bad&-script.prefind=Global&-script=Touch', 'Basic ' + btoa('Denied:pw'), true);
  assert.equal(denied.code, '9');
  const missing = await xml('-new&Name=bad&-script.prefind=Global&-script=Missing', auth, true);
  assert.equal(missing.code, '104');
  assert.deepEqual(rows(), before);
  // This account has fmxml only: its allowed script works without a Data API session or fmrest.
  assert.equal((await xml('-findall&-script=Global', 'Basic ' + btoa('Denied:pw'))).code, '0');
  assert.equal(rows()[0].fieldData.Log, 'ran');
});

test('script errors are logged without failing the query; query errors still win', async () => {
  const r = await xml('-findall&-script=Error');
  assert.equal(r.code, '0', r.text);
  const logs = await app.host.logs!.read('ScriptEvent', { type: 'Warning' });
  assert.ok(logs.entries.some((e) => e.message.includes('ended with error 105')));
  assert.equal((await xml('-find&Name=absent&-script.prefind=Error')).code, '401');
});

test('script found set changes do not replace the query result, like the Data API', async () => {
  const r = await xml('-findall&-script=Omit');
  assert.equal(r.code, '0');
  assert.equal([...r.text.matchAll(/<record /g)].length, 2);
});

test('read-only tokens and foreign browser origins cannot run scripts', async () => {
  const token = store.createApiToken('Ann', { readOnly: true });
  const before = rows();
  assert.equal((await xml('-findall&-script=Global', `Bearer ${token}`)).code, '9');
  const foreign = await xml('-findall&-script=Global', auth, false, { origin: 'https://foreign.example' });
  assert.notEqual(foreign.code, '0');
  assert.deepEqual(rows(), before);
});


test('globals stay within one request and script results do not carry between phases', async () => {
  assert.equal((await xml('-findall&-script.prefind=Seed&-script=Probe')).code, '0');
  assert.equal(rows()[0].fieldData.Log, 'local:');
  assert.equal((await xml('-findall&-script=Probe')).code, '0');
  assert.equal(rows()[0].fieldData.Log, ':');
});

test('findany, findquery and record-id finds support script phases', async () => {
  const id = rows()[0].recordId;
  for (const query of ['-findany', '-findquery&-query=(q1)&-q1=Name&-q1.value=A', `-find&-recid=${id}`]) {
    const r = await xml(query + '&-script.presort=After&-script=After');
    assert.equal(r.code, '0', r.text);
  }
});

test('a GET that names any script key is refused with error 3 before any phase runs, and nothing is written', async () => {
  const before = JSON.stringify(rows());
  for (const param of ['-script=Touch&-script.param=x', '-script.prefind=Create&-script.prefind.param=x', '-script.presort=Sort&-script.presort.param=Z', '-script=Touch']) {
    const r = await xml('-findall&' + param, auth, false);
    assert.equal(r.code, '3', r.text);
    assert.match(r.text, /POST form/);
  }
  assert.equal(JSON.stringify(rows()), before, 'a GET changed a record');
  // The same request as a POST form still runs.
  assert.equal((await xml('-findall&-script=Touch&-script.param=viaPost')).code, '0');
});
