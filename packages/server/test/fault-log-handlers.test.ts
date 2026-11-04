// The handlers' caught faults, end to end: each is logged once with its folders hidden, and the caller reads only the
// fault message (never a path or a table name).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { approveAll } from './approve-all.ts';
import { serve } from '../src/index.ts';
import { FAULT_MESSAGE } from '../src/fault-log.ts';

const fixture = join(import.meta.dirname, '..', '..', '..', 'fixtures', 'fmp12', 'Charts.fmp12');
const skip = existsSync(fixture) ? false : 'fixtures missing: run npm run fixtures';
let dir: string;
let server: Server;
let base: string;
let host: Awaited<ReturnType<typeof serve>>['host'];
let auth: Record<string, string>;
const secret = join(homedir(), 'private-folder', 'Charts.fmp12');

before(async () => {
  if (skip) return;
  dir = mkdtempSync(join(tmpdir(), 'tabularius-fault-handlers-'));
  copyFileSync(fixture, join(dir, 'Charts.fmp12'));
  const s = await serve({ dir, port: 0, log: () => {} });
  server = s.server;
  base = s.url;
  host = s.host;
  approveAll(s.host);
  const store = s.host.get('Charts')!;
  for (const set of store.privilegeSets().filter((p) => p.id === 1)) store.savePrivilegeSet({ ...set, extendedPrivileges: [...set.extendedPrivileges, 'fmrest'] });
  store.setPassword('Admin', 'pw');
  const r = await fetch(`${base}/fmi/data/vLatest/databases/Charts/sessions`, { method: 'POST', headers: { authorization: 'Basic ' + btoa('Admin:pw') } });
  auth = { authorization: `Bearer ${(await r.json()).response.token}`, 'content-type': 'application/json' };
});
after(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
});

/** Runs `request` while `host.get` fails with an ENOENT naming a home-folder path, for callers whose stack includes `source`. */
async function withFault(source: string, request: () => Promise<Response>) {
  const get = host.get;
  const error = console.error;
  const logged: string[] = [];
  host.get = function (this: unknown, ...args: Parameters<typeof get>) {
    if (!new Error().stack!.includes(source)) return get.apply(host, args);
    throw Object.assign(new Error(`ENOENT: no such file or directory, open '${secret}'`), { code: 'ENOENT' });
  } as typeof get;
  console.error = (...a: unknown[]) => void logged.push(a.map(String).join(' '));
  try {
    const r = await request();
    return { status: r.status, text: await r.text(), logged };
  } finally {
    host.get = get;
    console.error = error;
  }
}

test('a web client fault is logged once, without the real path, and the caller gets "Unknown error"', { skip }, async () => {
  const r = await withFault('webclient.ts', () => fetch(`${base}/tabularius/app/v1/databases/Charts/runs/stop`, { method: 'POST', headers: auth }));
  assert.equal(r.status, 500);
  assert.equal(JSON.parse(r.text).error.message, 'Unknown error');
  assert.equal(r.logged.length, 1, 'one line per fault, not two');
  assert.match(r.logged[0], /\[home\]\/Charts\.fmp12/);
  assert.ok(!r.logged[0].includes('private-folder'), r.logged[0]);
});

test('the script debugger tells the caller the fault message, not a file-system error with its path', { skip }, async () => {
  const r = await withFault('debug.ts', () => fetch(`${base}/tabularius/debug/v1/databases/Charts/scripts`, { headers: auth }));
  assert.equal(r.status, 500);
  assert.equal(JSON.parse(r.text).error.message, FAULT_MESSAGE);
  assert.ok(!r.text.includes('private-folder') && !r.text.includes('ENOENT'), r.text);
  assert.equal(r.logged.length, 1, 'one line per fault, not two');
  assert.match(r.logged[0], /\[home\]\/Charts\.fmp12/);
  assert.ok(!r.logged[0].includes('private-folder'), r.logged[0]);
});
