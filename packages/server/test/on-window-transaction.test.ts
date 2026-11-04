import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { serve } from '../src/index.ts';
import { STORE_EXT } from '../src/host.ts';
import { createStore } from '../../store/src/index.ts';

let dir: string;
let server: Server;
let base: string;
let webToken: string;
let restToken: string;
let id: number;
let otherId: number;
let oldPath: string | undefined;
let marker: string;
const login = async (client: 'web' | 'rest') => {
  const r = await fetch(`${base}/fmi/data/vLatest/databases/Audit/sessions`, {
    method: 'POST', headers: { authorization: 'Basic ' + btoa('Admin:pw'), 'content-type': 'application/json', ...(client === 'web' ? { 'x-tabularius-client': 'web' } : {}) }, body: '{}',
  });
  return ((await r.json()) as { response: { token: string } }).response.token;
};
const call = async (path: string, token: string, method = 'GET', body?: unknown, web = false) => {
  const r = await fetch(`${base}${path}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(web ? { 'x-tabularius-client': 'web', 'x-tabularius-window-id': 'window-1' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return r.json() as Promise<any>;
};
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-window-transaction-server-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  marker = join(dir, 'forbidden-child');
  for (const name of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    const stub = join(bin, name);
    writeFileSync(stub, `#!/bin/sh\nprintf x >> '${marker}'\nexit 99\n`);
    chmodSync(stub, 0o755);
  }
  oldPath = process.env.PATH;
  process.env.PATH = `${bin}:${oldPath ?? ''}`;
  createStore(join(dir, 'Audit' + STORE_EXT));
  const s = await serve({ dir, port: 0, watch: false, log: () => {} });
  server = s.server;
  base = s.url;
  const store = s.host.get('Audit')!;
  store.setPassword('Admin', 'pw', '[Full Access]');
  store.applyDesign([
    { op: 'createTable', name: 'Items', fields: [{ name: 'Name' }, { name: 'OnWindowTransaction' }] },
    { op: 'createTable', name: 'Other', fields: [{ name: 'Name' }, { name: 'OnWindowTransaction' }] },
    { op: 'createLayout', name: 'Home', occurrence: 'Items' },
    { op: 'createScript', name: 'Audit Hook', text: 'Set Variable [ $$audit ; Value: Get ( ScriptParameter ) ]' },
    { op: 'createScript', name: 'Read', text: 'Exit Script [ Text Result: $$audit ]' },
    { op: 'createScript', name: 'Edit', text: 'Set Field [ Items::Name ; "script edit" ]\nCommit Records/Requests' },
    { op: 'setFileOptions', onWindowTransaction: 'Audit Hook' },
  ]);
  id = store.create('Home', { Name: 'before', OnWindowTransaction: '{"u":"a"}' }).recordId;
  otherId = store.create('Other', { Name: 'before', OnWindowTransaction: 'other context' }).recordId;
  restToken = await login('rest');
  webToken = await login('web');
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (oldPath !== undefined) process.env.PATH = oldPath;
  if (dir) {
    assert.equal(existsSync(marker), false, 'a forbidden child process ran');
    rmSync(dir, { recursive: true });
  }
});

test('Data API PATCH stays silent while a Data API script commit runs the file trigger', async () => {
  const root = `/fmi/data/vLatest/databases/Audit/layouts/Home`;
  const patch = await call(`${root}/records/${id}`, restToken, 'PATCH', { fieldData: { Name: 'direct' } });
  assert.equal(patch.messages?.[0]?.code, '0');
  const empty = await call(`${root}/script/Read`, restToken);
  assert.equal(empty.response.scriptResult, '');
  const scripted = await call(`${root}/script/Edit`, restToken);
  assert.equal(scripted.messages?.[0]?.code, '0');
  const read = await call(`${root}/script/Read`, restToken);
  assert.deepEqual(JSON.parse(read.response.scriptResult), { Audit: { Items: [['Modified', id, { u: 'a' }]] } });
});

test('web commit uses only server receipts and ignores a forged parameter', async () => {
  const root = `/fmi/data/vLatest/databases/Audit/layouts/Home`;
  const patch = await call(`${root}/records/${id}`, webToken, 'PATCH', { fieldData: { Name: 'web edit' } }, true);
  assert.equal(patch.messages?.[0]?.code, '0');
  const triggered = await call('/tabularius/app/v1/databases/Audit/layouts/Home/button', webToken, 'POST',
    { trigger: 'OnWindowTransaction', recordId: id, ids: [id], parameter: '{"Forged":true}' }, true);
  assert.equal(triggered.error, 0, triggered.message);
  assert.deepEqual(JSON.parse(triggered.result || (await call(`${root}/script/Read`, webToken, 'GET', undefined, true)).response.scriptResult),
    { Audit: { Items: [['Modified', id, { u: 'a' }]] } });
  const forged = await call('/tabularius/app/v1/databases/Audit/layouts/Home/button', webToken, 'POST',
    { trigger: 'OnWindowTransaction', recordId: id, ids: [id], parameter: '{"Forged":true}' }, true);
  assert.equal(forged.error.code, 3, 'a request without a successful write has no server receipt');
});

test('web receipts preserve the base table and context field of each layout', async () => {
  const first = await call(`/fmi/data/vLatest/databases/Audit/layouts/Home/records/${id}`, webToken, 'PATCH', { fieldData: { Name: 'one' } }, true);
  const second = await call(`/fmi/data/vLatest/databases/Audit/layouts/Other/records/${otherId}`, webToken, 'PATCH', { fieldData: { Name: 'two' } }, true);
  assert.equal(first.messages?.[0]?.code, '0');
  assert.equal(second.messages?.[0]?.code, '0');
  const triggered = await call('/tabularius/app/v1/databases/Audit/layouts/Home/button', webToken, 'POST',
    { trigger: 'OnWindowTransaction', recordId: id, ids: [id] }, true);
  assert.equal(triggered.error, 0, triggered.message);
  const read = await call('/fmi/data/vLatest/databases/Audit/layouts/Home/script/Read', webToken, 'GET', undefined, true);
  assert.deepEqual(JSON.parse(read.response.scriptResult), {
    Audit: { Items: [['Modified', id, { u: 'a' }]], Other: [['Modified', otherId, 'other context']] },
  });
});
