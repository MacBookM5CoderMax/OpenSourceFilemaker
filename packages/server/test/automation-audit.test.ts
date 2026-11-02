// A schedule, an inbound hook or a webhook is a standing way for a script to run as an account, or for a file's changes to leave the
// server. Whoever holds the admin token can add one, and until now nothing in the file's security log said so: an administrator reading
// the log to see who gave what access found no trace of a hook that lets another service run a script as Full Access. Each addition,
// change and removal is a security event of the file it belongs to, naming what runs and as whom, and never a secret or a full address.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { serve, setAdminPassword, type Host } from '../src/index.ts';
import { auditAutomation } from '../src/automation-audit.ts';
import { InboundHooks } from '../src/inbound-hooks.ts';
import { Schedules } from '../src/schedules.ts';

let dir: string;
let server: Server;
let base: string;
let host: Host;
const serverLog: string[] = [];
const originalPath = process.env.PATH;
const originalMarker = process.env.TABULARIUS_TEST_CHILD_MARKER;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-automation-audit-'));
  // serve checks this process's identity with an absolute system utility on macOS. Any other child gets only command stubs.
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  process.env.PATH = bin;
  process.env.TABULARIUS_TEST_CHILD_MARKER = join(dir, 'called');
  for (const name of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    writeFileSync(join(bin, name), '#!/bin/sh\nprintf forbidden >> "$TABULARIUS_TEST_CHILD_MARKER"\nexit 99\n', { mode: 0o700 });
  }
  const s = await serve({ dir, port: 0, log: (m) => { serverLog.push(m); }, inboundHooks: true, webhooks: true });
  server = s.server;
  base = s.url;
  host = s.host;
  for (const name of ['Shop', 'Other']) {
    const store = host.create(name);
    store.applyDesign([
      { op: 'createTable', name: 'Orders', fields: [{ name: 'Ref' }] },
      { op: 'createScript', name: 'Nightly', text: 'Exit Script [ Text Result: "ok" ]' },
    ]);
    store.setPassword('Admin', 'pw');
  }
});
after(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  const called = dir && existsSync(join(dir, 'called'));
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  if (originalMarker === undefined) delete process.env.TABULARIUS_TEST_CHILD_MARKER;
  else process.env.TABULARIUS_TEST_CHILD_MARKER = originalMarker;
  if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  assert.equal(Boolean(called), false, 'a forbidden child command ran');
});

async function adminLog(): Promise<string[]> {
  await host.logs!.flush();
  const file = join(dir, 'Logs', 'Admin.log');
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('[security notice]')) : [];
}

const admin = (path: string, method = 'GET', body?: object) => fetch(`${base}/tabularius/admin/v1/${path}`, {
  method, headers: { 'x-tabularius-admin': '1', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json() as Record<string, any> }));

const events = (file: string) => host.get(file)!.securityEvents({ category: 'Automations', limit: 100 });

test('an inbound hook added, changed, given a new secret and removed is in the security log of its file, without its secret', async () => {
  const made = await admin('inbound-hooks', 'POST', { name: 'Orders in', database: 'Shop', script: 'Nightly', account: 'Admin', perMinute: 5 });
  assert.equal(made.status, 201);
  const id = made.body.id as string;
  assert.equal((await admin(`inbound-hooks/${id}`, 'PATCH', { enabled: false, perMinute: 9 })).status, 200);
  const rotated = await admin(`inbound-hooks/${id}/secret`, 'POST');
  assert.equal(rotated.status, 200);
  assert.equal((await admin(`inbound-hooks/${id}`, 'DELETE')).status, 200);
  const log = events('Shop');
  assert.deepEqual(log.map((e) => e.kind), ['automation-added', 'automation-changed', 'automation-changed', 'automation-removed']);
  assert.match(log[0].description, /inbound hook Orders in was added, running Nightly as Admin/);
  assert.match(log[1].description, /\(enabled, perMinute\)/);
  assert.match(log[2].description, /\(secret\)/);
  const everything = JSON.stringify(host.get('Shop')!.securityEvents({ limit: 100 }));
  assert.ok(!everything.includes(made.body.secret as string) && !everything.includes(rotated.body.secret as string), 'no secret in the log');
  assert.equal(events('Other').length, 0, 'only the file the hook belongs to');
});

test('a hook that changes nothing, or is refused, writes no entry', async () => {
  const before = events('Shop').length;
  const same = await admin('inbound-hooks', 'POST', { name: 'Same', database: 'Shop', script: 'Nightly', account: 'Admin', perMinute: 5 });
  assert.equal(same.status, 201);
  assert.equal(events('Shop').length, before + 1);
  assert.equal((await admin(`inbound-hooks/${same.body.id}`, 'PATCH', { name: 'Same', perMinute: 5 })).status, 200);
  assert.equal(events('Shop').length, before + 1, 'saving the same values is not a change');
  assert.equal((await admin(`inbound-hooks/${same.body.id}`, 'DELETE')).status, 200);
  assert.equal((await admin('inbound-hooks', 'POST', { name: 'x', database: 'Shop', script: 'No such script', account: 'Admin' })).status >= 400, true);
  assert.equal((await admin('inbound-hooks/ffffffffffffffffff', 'DELETE')).status, 404);
  assert.equal(events('Shop').length, before + 2, 'the refused ones added nothing');
});

test('a script schedule added, changed and removed is in the security log of its file; a backup schedule belongs to no file', async () => {
  const made = await admin('schedules', 'POST', { name: 'Nightly run', database: 'Other', script: 'Nightly', account: 'Admin', everyMinutes: 1440, enabled: false });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const id = made.body.id as string;
  assert.equal((await admin(`schedules/${id}`, 'PATCH', { account: 'Admin', network: true, enabled: false })).status, 200);
  assert.equal((await admin(`schedules/${id}`, 'DELETE')).status, 200);
  const log = events('Other');
  assert.deepEqual(log.map((e) => e.kind), ['automation-added', 'automation-changed', 'automation-removed']);
  assert.match(log[0].description, /schedule Nightly run was added, running Nightly as Admin/);
  assert.match(log[1].description, /network/);
  assert.match(log[1].description, /allowed to reach the network/);
  const backup = await admin('schedules', 'POST', { kind: 'backup', name: 'Backups', everyMinutes: 1440, enabled: false });
  assert.equal(backup.status, 201, JSON.stringify(backup.body));
  assert.equal(events('Other').length, 3);
  assert.equal(events('Shop').filter((e) => /schedule/.test(e.description)).length, 0);
});

test('a webhook added, switched off and removed is in the log with the host it sends to and nothing more of the address', async () => {
  const made = await admin('webhooks', 'POST', { url: 'https://collector.example.test/in/sekret-path-part?key=hidden', database: 'Shop' });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const id = made.body.id as string;
  assert.equal((await admin(`webhooks/${id}`, 'PATCH', { enabled: false })).status, 200);
  assert.equal((await admin(`webhooks/${id}`, 'DELETE')).status, 200);
  const log = events('Shop').filter((e) => /webhook/.test(e.description));
  assert.deepEqual(log.map((e) => e.kind), ['automation-added', 'automation-changed', 'automation-removed']);
  assert.match(log[0].description, /sending changes to collector\.example\.test/);
  const everything = JSON.stringify(host.get('Shop')!.securityEvents({ limit: 100 }));
  assert.ok(!/sekret-path-part|hidden/.test(everything), 'the path and query of the address are not kept');
  assert.ok(!everything.includes(made.body.secret as string), 'nor the secret');
});

test('schedule time edits name the changed settings without their values; unchanged and refused saves add nothing', async () => {
  const before = events('Shop').length;
  const made = await admin('schedules', 'POST', { name: 'Time edits', database: 'Shop', script: 'Nightly', account: 'Admin', everyMinutes: 1440, at: '01:00', enabled: false });
  assert.equal(made.status, 201);
  const path = `schedules/${made.body.id}`;
  assert.equal((await admin(path, 'PATCH', { everyMinutes: 1440, at: '01:00', enabled: false })).status, 200);
  assert.equal((await admin(path, 'PATCH', { everyMinutes: 0 })).status, 400);
  assert.equal(events('Shop').length, before + 1);
  const parameter = ['private', 'parameter', 'value'].join('-');
  assert.equal((await admin(path, 'PATCH', { everyMinutes: 720, at: '02:00', parameter })).status, 200);
  const changed = events('Shop').at(-1)!;
  assert.deepEqual(changed.changes?.fields, ['parameter', 'everyMinutes', 'at']);
  assert.ok(!JSON.stringify(changed).includes(parameter));
  assert.equal((await admin(path, 'DELETE')).status, 200);

  const hook = await admin('webhooks', 'POST', { database: 'Shop', url: 'https://collector.example.test:8443/private', enabled: false });
  assert.equal(hook.status, 201);
  const count = events('Shop').length;
  assert.equal((await admin(`webhooks/${hook.body.id}`, 'PATCH', { enabled: false })).status, 200);
  assert.equal((await admin('webhooks', 'POST', { database: 'Shop', url: 'invalid' })).status, 400);
  assert.equal(events('Shop').length, count);
  assert.equal(events('Shop').at(-1)!.changes?.sendsTo, 'collector.example.test:8443');
  assert.equal((await admin(`webhooks/${hook.body.id}`, 'DELETE')).status, 200);
  assert.equal((await admin(`webhooks/${hook.body.id}`, 'DELETE')).status, 404);
  assert.equal(events('Shop').length, count + 1);
});

test('direct sync schedule changes are audited in the file, while backup, verify and message schedules are not', () => {
  const schedules = new Schedules(host);
  schedules.stop();
  schedules.syncJobs = { check: () => {}, run: async () => { throw new Error('must not run'); } };
  const before = events('Shop').length;
  const sync = schedules.create({ database: 'Shop', sync: {}, enabled: false });
  schedules.update(sync.id, { sync: { pull: true } });
  schedules.remove(sync.id);
  const log = events('Shop').slice(before);
  assert.deepEqual(log.map((e) => e.kind), ['automation-added', 'automation-changed', 'automation-removed']);
  assert.match(log[0].description, /running sync/);
  assert.deepEqual(log[1].changes?.fields, ['sync']);
  for (const kind of ['backup', 'verify', 'message'] as const) {
    const s = schedules.create({ kind, name: kind, message: 'Maintenance', enabled: false });
    schedules.update(s.id, { name: `${kind} renamed` });
    schedules.remove(s.id);
  }
  assert.equal(events('Shop').length, before + 3);
});

test('a failed security-log write is reported without undoing a saved hook; empty file names stay silent and unhosted files are reported', (t) => {
  const logs: string[] = [];
  const hooks = new InboundHooks(host, true, (m) => logs.push(m));
  const store = host.get('Shop')!;
  const before = events('Shop').length;
  t.mock.method(store, 'recordAutomationChange', () => { throw new Error('audit unavailable'); });
  const hook = hooks.create({ name: 'Saved despite audit failure', database: 'Shop', script: 'Nightly', account: 'Admin' });
  assert.ok(new InboundHooks(host, true).list().some((h) => h.id === hook.id), 'addition was persisted');
  hooks.update(hook.id, { enabled: false });
  assert.equal(new InboundHooks(host, true).list().find((h) => h.id === hook.id)!.enabled, false, 'edit was persisted');
  const rotated = hooks.newSecret(hook.id);
  assert.equal(hooks.remove(hook.id), true);
  assert.ok(!new InboundHooks(host, true).list().some((h) => h.id === hook.id), 'removal was persisted');
  assert.equal(logs.length, 4);
  assert.ok(logs.every((m) => m.includes('security log: could not record') && m.includes('audit unavailable')));
  assert.ok(!logs.join('\n').includes(hook.secret) && !logs.join('\n').includes(rotated.secret));
  assert.equal(events('Shop').length, before);
  for (const database of ['', undefined]) {
    auditAutomation(host, (m) => logs.push(m), database, 'added', { what: 'schedule', id: 'missing' });
  }
  assert.equal(logs.length, 4, 'a change with no file (or no name) has nowhere to be recorded and says nothing here');
  auditAutomation(host, (m) => logs.push(m), 'Not hosted', 'added', { what: 'schedule', id: 'missing' });
  assert.equal(logs.length, 5, 'a file that is not open is said in the server log, not dropped silently');
});

test('the store bounds detail and drops unrelated properties, and every automation event is a notice whose actor is never the run-as account', () => {
  const store = host.create('Bounds');
  const long = 'x'.repeat(250);
  const detail = { what: 'schedule' as const, id: long, name: long, script: long, account: long, sendsTo: long, network: true,
    fields: Array.from({ length: 25 }, () => 'f'.repeat(50)), secret: ['not', 'logged'].join('-'), url: 'https://collector.example.test/private' };
  store.recordAutomationChange('changed', detail);
  const event = events('Bounds')[0];
  assert.deepEqual(event.changes, { what: 'schedule', id: long.slice(0, 200), name: long.slice(0, 200), script: long.slice(0, 200),
    account: long.slice(0, 200), sendsTo: long.slice(0, 200), network: true, fields: Array.from({ length: 20 }, () => 'f'.repeat(40)) });
  for (const file of ['Shop', 'Other', 'Bounds']) {
    for (const e of events(file)) {
      assert.equal(e.category, 'Automations');
      assert.equal(e.severity, 'notice');
      assert.ok(e.account === null || e.account === 'admin console' || e.account === 'Admin API', 'the actor is the way in, never the run-as account');
    }
  }
});

test('an entry made through the admin routes names the way in and the address, and a change made inside the server names neither', async () => {
  // Every console mutation above, including secret rotation, must carry the same attribution.
  const consoleEntries = [...events('Shop'), ...events('Other')].filter((e) => e.changes?.account === 'Admin' || e.changes?.what === 'webhook');
  assert.ok(consoleEntries.length > 10);
  for (const entry of consoleEntries) {
    assert.equal(entry.account, 'admin console');
    assert.ok(entry.from);
    assert.doesNotMatch(entry.description, /admin console/);
  }
  const made = await admin('schedules', 'POST', { name: 'Who', database: 'Shop', script: 'Nightly', account: 'Admin', everyMinutes: 1440, enabled: false });
  assert.equal(made.status, 201);
  const entry = events('Shop').at(-1)!;
  assert.equal(entry.account, 'admin console');
  assert.ok(typeof entry.from === 'string' && entry.from.length > 0, 'the address it came from');
  assert.equal((await admin(`schedules/${made.body.id}`, 'DELETE')).status, 200);
  const schedules = new Schedules(host);
  schedules.stop();
  const direct = schedules.create({ name: 'Api', database: 'Shop', script: 'Nightly', account: 'Admin', enabled: false }, { channel: 'Admin API', from: '203.0.113.9' });
  const viaApi = events('Shop').at(-1)!;
  assert.equal(viaApi.account, 'Admin API');
  assert.equal(viaApi.from, '203.0.113.9');
  schedules.remove(direct.id);
  const inside = events('Shop').at(-1)!;
  assert.equal(inside.account, null);
  assert.ok(!inside.from);
});

test('a schedule moved to another file is removed from the old file and added to the new one, each naming the other', async () => {
  const made = await admin('schedules', 'POST', { name: 'Mover', database: 'Shop', script: 'Nightly', account: 'Admin', everyMinutes: 1440, enabled: false });
  assert.equal(made.status, 201);
  const shop = events('Shop').length, other = events('Other').length;
  const path = `schedules/${made.body.id}`;
  assert.equal((await admin(path, 'PATCH', { database: 'Other' })).status, 200);
  const gone = events('Shop').slice(shop), came = events('Other').slice(other);
  assert.deepEqual(gone.map((e) => e.kind), ['automation-removed']);
  assert.deepEqual(came.map((e) => e.kind), ['automation-added']);
  assert.equal(gone[0].changes?.movedTo, 'Other');
  assert.equal(came[0].changes?.movedFrom, 'Shop');
  assert.match(gone[0].description, /moved to the file Other/);
  assert.match(came[0].description, /moved here from the file Shop/);
  assert.equal(came[0].changes?.fields, undefined, 'nothing else changed with the move');
  assert.equal((await admin(path, 'PATCH', { database: 'other', enabled: false })).status, 200);
  assert.equal(events('Shop').length, shop + 1, 'the same file spelled another way is not a move');
  assert.deepEqual(events('Other').slice(other).map((e) => e.kind), ['automation-added', 'automation-changed']);
  host.get('Shop')!.applyDesign([{ op: 'createScript', name: 'Morning', text: 'Exit Script [ Text Result: "ok" ]' }]);
  host.get('Shop')!.setPassword('Runner', 'pw', '[Full Access]');
  const moved = await admin(path, 'PATCH', { database: 'Shop', script: 'Morning', account: 'Runner' });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  const left = events('Other').at(-1)!, arrived = events('Shop').at(-1)!;
  assert.equal(left.kind, 'automation-removed');
  assert.equal(left.changes?.script, 'Nightly');
  assert.equal(left.changes?.account, 'Admin');
  assert.equal(arrived.kind, 'automation-added');
  assert.equal(arrived.changes?.script, 'Morning');
  assert.equal(arrived.changes?.account, 'Runner');
  assert.deepEqual(arrived.changes?.fields, ['script', 'account']);
  for (const e of [gone[0], came[0], left, arrived]) {
    assert.equal(e.account, 'admin console');
    assert.ok(e.from);
  }
  assert.equal((await admin(path, 'DELETE')).status, 200);
});

test('a change to a file that is not open is said in the server log with its kind and file name and nothing secret', () => {
  const lines: string[] = [];
  auditAutomation(host, (m) => lines.push(m), 'Closed File', 'removed', { what: 'webhook', id: 'abc123', name: 'Private label', script: 'Private script', account: 'Private account', sendsTo: 'collector.example.test' }, { channel: 'admin console', from: '203.0.113.9' });
  assert.equal(lines.length, 1);
  assert.match(lines[0], /webhook abc123 was removed by the admin console from 203\.0\.113\.9/);
  assert.match(lines[0], /Closed File is not open/);
  assert.doesNotMatch(lines[0], /collector|Private/, 'no destination address, script, run-as account or label');
  assert.doesNotMatch(lines[0], /\b(error|failed|could not|can't|cannot)\b/i, 'a closed file is a notice, not a fault');
  auditAutomation(host, (m) => lines.push(m), 'Closed File', 'changed', { what: 'inbound hook', id: 'abc123', fields: [] });
  assert.equal(lines.length, 1, 'an unchanged save stays silent even for a closed file');
  auditAutomation(host, (m) => lines.push(m), 'Closed File', 'removed', { what: 'inbound hook', id: 'abc123' });
  assert.match(lines[1], /inbound hook abc123 was removed/);
  assert.doesNotMatch(lines[1], / by | from /, 'an internal call has no actor');
});

test('a backup schedule belongs to no file: adding, editing, moving its destination and removing it are said once, in the server-wide notices', async () => {
  const dest = mkdtempSync(join(tmpdir(), 'tabularius-automation-audit-dest-'));
  const other = mkdtempSync(join(tmpdir(), 'tabularius-automation-audit-dest-'));
  try {
    const shop = events('Shop').length, elsewhere = events('Other').length, mark = (await adminLog()).length;
    let current: string[] = [];
    const settle = async () => { current = (await adminLog()).slice(mark).filter((m) => /server-schedule-changed: The backup schedule /.test(m)); return current; };
    const made = await admin('schedules', 'POST', { kind: 'backup', name: 'Nightly backup', dest, everyMinutes: 1440, enabled: false });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    const path = `schedules/${made.body.id}`;
    assert.equal((await admin(path, 'PATCH', { name: 'Renamed backup', keep: 3, everyMinutes: 720, at: '02:00' })).status, 200);
    assert.equal((await admin(path, 'PATCH', { name: 'Renamed backup', keep: 3 })).status, 200);
    assert.equal((await settle()).length, 2, 'a save that changes nothing writes nothing');
    assert.equal((await admin(path, 'PATCH', { dest: other })).status, 200);
    assert.equal((await admin(path, 'DELETE')).status, 200);
    const lines = await settle();
    assert.equal(lines.length, 4);
    assert.match(lines[0], /Nightly backup was added, to /);
    assert.match(lines[1], /Renamed backup was changed \(name, everyMinutes, at, keep\), to /);
    assert.match(lines[2], /was changed \(dest\), to /);
    assert.match(lines[3], /was removed, to /);
    assert.ok(lines[0].includes(dest) && lines[2].includes(other));
    assert.ok(lines.every((line) => line.endsWith('(via admin console)')), 'the way in, as for a file\'s entries');
    const fallback = await admin('schedules', 'POST', { kind: 'backup', name: 'Default backup', enabled: false });
    assert.equal(fallback.status, 201);
    assert.doesNotMatch((await settle()).at(-1)!, /, to /, 'no destination named: the default folder');
    assert.equal((await admin(`schedules/${fallback.body.id}`, 'DELETE')).status, 200);
    assert.equal(events('Shop').length, shop);
    assert.equal(events('Other').length, elsewhere);
  } finally {
    rmSync(dest, { recursive: true, force: true });
    rmSync(other, { recursive: true, force: true });
  }
});

test('the existing security-events API and CSV include the automation category and descriptions', async () => {
  const path = 'security-events?database=Shop&category=Automations';
  const json = await admin(path);
  assert.equal(json.status, 200);
  assert.ok(json.body.categories.includes('Automations'));
  assert.deepEqual(json.body.events, events('Shop'));
  const csv = await fetch(`${base}/tabularius/admin/v1/${path}&format=csv`, { headers: { 'x-tabularius-admin': '1' } });
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type')!, /text\/csv/);
  const text = await csv.text();
  for (const kind of ['automation-added', 'automation-changed', 'automation-removed']) assert.ok(text.includes(kind));
  assert.match(text, /running Nightly as Admin/);
  assert.ok(!/sekret-path-part|hidden/.test(text));
});

test('the Admin API attributes creation, copy, update and removal to its channel and client address', async () => {
  setAdminPassword(dir, 'audit-password');
  const login = await fetch(`${base}/fmi/admin/api/v2/user/auth`, {
    method: 'POST', headers: { authorization: 'Basic ' + btoa('admin:audit-password') },
  });
  assert.equal(login.status, 200);
  const token = (await login.json()).response.token;
  const api = async (path: string, method: string, body?: object) => {
    const r = await fetch(`${base}/fmi/admin/api/v2${path}`, {
      method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await r.json();
    assert.equal(r.status, 200, JSON.stringify(data));
    return data.response;
  };
  try {
    const before = events('Shop').length;
    const made = await api('/schedules/filemakerscript', 'POST', {
      name: 'API schedule', enabled: false,
      filemakerScriptType: { resource: 'file:Shop.fmp12', fmScriptName: 'Nightly', fmScriptAccount: 'Admin' },
    });
    const copied = await api(`/schedules?source=${made.schedule.id}`, 'POST');
    await api(`/schedules/${made.schedule.id}`, 'PATCH', { name: 'API renamed' });
    await api(`/schedules/${made.schedule.id}`, 'DELETE');
    await api(`/schedules/${copied.schedule.id}`, 'DELETE');
    const entries = events('Shop').slice(before);
    assert.deepEqual(entries.map((e) => e.kind), ['automation-added', 'automation-added', 'automation-changed', 'automation-removed', 'automation-removed']);
    for (const e of entries) {
      assert.equal(e.account, 'Admin API');
      assert.ok(e.from);
      assert.doesNotMatch(e.description, /Admin API/);
    }
  } finally {
    await api('/user/auth', 'DELETE');
  }
});

test('the store bounds actor and move details separately and leaves the actor out of descriptions', () => {
  const store = host.create('Move bounds');
  const long = 'x'.repeat(250);
  store.recordAutomationChange('removed', { what: 'schedule', id: 'bounded', movedTo: long }, { channel: long, from: long });
  store.recordAutomationChange('added', { what: 'schedule', id: 'bounded', movedFrom: long });
  const [removed, added] = events('Move bounds');
  assert.equal(removed.account, long.slice(0, 80));
  assert.equal(removed.from, long.slice(0, 80));
  assert.equal(removed.changes?.movedTo, long.slice(0, 200));
  assert.equal(added.changes?.movedFrom, long.slice(0, 200));
  assert.equal(added.account, null);
  assert.ok(!added.from);
  assert.equal(removed.description, `The schedule bounded was removed, moved to the file ${long.slice(0, 200)}`);
});

test('a schedule move records each side independently when the old file is unavailable or its log write throws', (t) => {
  const lines: string[] = [];
  const schedules = new Schedules(host, (m) => lines.push(m));
  schedules.stop();
  const get = host.get.bind(host);
  for (const unavailable of [true, false]) {
    const made = schedules.create({ name: 'Independent move', database: 'Shop', script: 'Nightly', account: 'Admin', enabled: false });
    const before = events('Other').length;
    const mocked = unavailable
      ? t.mock.method(host, 'get', (name: string) => name.toLowerCase() === 'shop' ? undefined : get(name))
      : t.mock.method(get('Shop')!, 'recordAutomationChange', () => { throw new Error('audit unavailable'); });
    try {
      schedules.update(made.id, { database: 'Other' });
      const entries = events('Other').slice(before);
      assert.deepEqual(entries.map((e) => e.kind), ['automation-added']);
      assert.equal(entries[0].changes?.movedFrom, 'Shop');
      assert.ok(lines.at(-1)!.includes(made.id));
      assert.match(lines.at(-1)!, unavailable ? /Shop is not open here/ : /could not record.*Shop/);
    } finally {
      mocked.mock.restore();
      schedules.remove(made.id);
    }
  }
});
