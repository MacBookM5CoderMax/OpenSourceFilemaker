// Changes made through the Admin API (/fmi/admin/api/v2) leave the same records as the admin console's:
// a server-wide setting in the Admin log, a disconnected client in the security log of its file.
// Files and passwords are generated in the test; no outside service is used.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import type { Server } from 'node:http';
import { createStore } from '../../store/src/index.ts';
import { serve, setAdminPassword, type Host } from '../src/index.ts';

let dir: string;
let server: Server;
let base: string;
let host: Host;
const originalPath = process.env.PATH;
const originalMarker = process.env.TABULARIUS_TEST_COMMAND_MARKER;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-adminapi-events-'));
  const bin = join(dir, 'stub-bin');
  mkdirSync(bin);
  process.env.TABULARIUS_TEST_COMMAND_MARKER = join(dir, 'forbidden-command');
  for (const command of ['launchctl', 'systemctl', 'sc', 'git', 'gh', 'npm', 'curl', 'sudo']) {
    writeFileSync(join(bin, command), '#!/bin/sh\nprintf forbidden >> "$TABULARIUS_TEST_COMMAND_MARKER"\nexit 99\n', { mode: 0o700 });
  }
  process.env.PATH = `${bin}${delimiter}${originalPath ?? ''}`;
  createStore(join(dir, 'Shop.openhbam.sqlite'), { mode: 'native' });
  setAdminPassword(dir, 'secret');
  const s = await serve({ dir, port: 0, log: () => {} });
  server = s.server;
  base = s.url;
  host = s.host;
  const store = host.get('Shop')!;
  const full = store.privilegeSets().find((p) => p.id === 1)!;
  store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmrest'] });
  store.setPassword('Admin', 'pw', full.name);
});
after(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  const forbidden = dir && existsSync(join(dir, 'forbidden-command'));
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  if (originalMarker === undefined) delete process.env.TABULARIUS_TEST_COMMAND_MARKER;
  else process.env.TABULARIUS_TEST_COMMAND_MARKER = originalMarker;
  if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  assert.ok(!forbidden, 'no service, install, upgrade, git or network command ran');
});

type Reply = { status: number; body: { response: Record<string, any>; messages: { code: string; text: string }[] } };
const call = (path: string, init: RequestInit = {}): Promise<Reply> =>
  fetch(`${base}/fmi/admin/api/v2${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers as Record<string, string>) } })
    .then(async (r) => ({ status: r.status, body: await r.json() }));
async function login(): Promise<Record<string, string>> {
  const r = await call('/user/auth', { method: 'POST', headers: { authorization: 'Basic ' + btoa('admin:secret') } });
  assert.equal(r.status, 200);
  return { authorization: `Bearer ${r.body.response.token}` };
}
async function adminLog(): Promise<string[]> {
  await host.logs!.flush();
  const file = join(dir, 'Logs', 'Admin.log');
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('[security ')) : [];
}
const signIn = () => fetch(`${base}/fmi/data/vLatest/databases/Shop/sessions`, {
  method: 'POST', headers: { authorization: 'Basic ' + btoa('Admin:pw') }, body: '{}',
}).then((r) => r.json());

test('block new users through the Admin API is recorded once per real change, with the way in and address', async () => {
  const auth = await login();
  const before = (await adminLog()).length;
  const patch = (blockNewUsers: unknown) => call('/server/config/blocknewusers', { method: 'PATCH', headers: auth, body: JSON.stringify({ blockNewUsers }) });
  assert.equal((await patch(true)).status, 200);
  assert.equal((await patch(true)).status, 200);
  assert.equal((await patch(false)).status, 200);
  assert.equal((await patch('yes')).status, 400);
  const lines = (await adminLog()).slice(before);
  assert.equal(lines.length, 2, lines.join('\n'));
  assert.match(lines[0], /\[security notice\] server-setting-changed: .*"block new users" was changed from false to true \(via Admin API\)/);
  assert.match(lines[1], /changed from true to false \(via Admin API\)/);
  assert.match(lines[0], /\t(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)\t/);
});

test('disconnecting a client through the Admin API is recorded in the file\'s security log', async () => {
  const auth = await login();
  const sessions = () => call('/clients', { headers: auth }).then((r) => r.body.response.clients as { id: string }[]);
  assert.equal((await signIn()).messages[0].code, '0');
  const [one] = await sessions();
  assert.ok(one, 'a client is listed');
  const events = () => host.get('Shop')!.securityEvents({ kind: 'sessions-ended', limit: 100 });
  assert.equal(events().length, 0);
  assert.equal((await call(`/clients/${one.id}`, { method: 'DELETE', headers: auth })).status, 200);
  const log = events();
  assert.equal(log.length, 1);
  assert.match(log[0].description, /ended 1 session of Admin/);
  assert.equal(log[0].account, 'Admin API');
  assert.ok(log[0].from, 'the address is kept');
  assert.match(log[0].from, /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/);
  assert.equal(log[0].severity, 'info');
  // A client that is no longer there is refused and adds nothing.
  assert.equal((await call(`/clients/${one.id}`, { method: 'DELETE', headers: auth })).status, 404);
  assert.equal(events().length, 1);
});
