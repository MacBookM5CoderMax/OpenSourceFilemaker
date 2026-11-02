// Restores and ended sessions belong in the file's security log; server-wide writes belong in the Admin log.
// All files, credentials and backup contents here are generated in the test. No external service is used; process identity checks inherit a guarded PATH.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import type { Server } from 'node:http';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createStore } from '../../store/src/index.ts';
import { serve, setAdminPassword, type Host } from '../src/index.ts';
import { localAccess } from '../src/local-admin.ts';
import { generateKey, installPackage, packPlugin } from '../../plugins/src/index.ts';
import { makeAuthenticator, forgeRegistration } from '../../store/test/forge-webauthn.ts';

let dir: string;
let server: Server;
let base: string;
let host: Host;
let save: () => void;
const originalPath = process.env.PATH;
const originalMarker = process.env.TABULARIUS_TEST_COMMAND_MARKER;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-server-security-'));
  const bin = join(dir, 'stub-bin');
  mkdirSync(bin);
  process.env.TABULARIUS_TEST_COMMAND_MARKER = join(dir, 'forbidden-command');
  for (const command of ['launchctl', 'systemctl', 'sc', 'git', 'gh', 'npm', 'curl', 'sudo']) {
    const file = join(bin, command);
    writeFileSync(file, '#!/bin/sh\nprintf \"forbidden command\\n\" >> \"$TABULARIUS_TEST_COMMAND_MARKER\"\nexit 99\n');
    chmodSync(file, 0o755);
  }
  process.env.PATH = `${bin}${delimiter}${originalPath ?? ''}`;
  for (const name of ['Shop', 'Other']) createStore(join(dir, `${name}.openhbam.sqlite`), { mode: 'native' });
  const src = join(dir, 'plugin-source');
  mkdirSync(src);
  writeFileSync(join(src, 'plugin.json'), JSON.stringify({
    id: 'org.example.audit', name: 'Audit test', version: '1.0.0', api: '^1.0', publisher: 'Example', main: 'main.js',
    permissions: { secrets: ['API_KEY'] }, functions: [{ name: 'Audit_Value', min: 0, max: 0 }],
  }));
  writeFileSync(join(src, 'main.js'), 'const functions = { Audit_Value: () => "" };');
  const key = generateKey();
  installPackage(dir, packPlugin(src, key.privatePem).bytes, { trust: key.fingerprint });
  const s = await serve({ dir, port: 0, log: () => {}, progressive: { every: 3_600_000 } });
  server = s.server;
  base = s.url;
  host = s.host;
  save = () => s.progressive!.run();
  // Wait for the actual backup to finish; no fixed delay decides when the stores are ready.
  const deadline = performance.now() + 30_000;
  while (!s.progressive) {
    assert.ok(performance.now() < deadline, 'point-in-time backups started');
    await nextTurn();
  }
  for (const name of ['Shop', 'Other']) {
    const store = host.get(name)!;
    store.applyDesign([{ op: 'createTable', name: 'Orders', fields: [{ name: 'Ref' }] }]);
    const full = store.privilegeSets().find((p) => p.id === 1)!;
    store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmrest'] });
    store.setPassword('Admin', 'pw', full.name);
  }
});
after(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  const forbidden = dir && existsSync(join(dir, 'forbidden-command'));
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  if (originalMarker === undefined) delete process.env.TABULARIUS_TEST_COMMAND_MARKER;
  else process.env.TABULARIUS_TEST_COMMAND_MARKER = originalMarker;
  if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  assert.ok(!forbidden, 'no service, install, upgrade, git or network command ran');
});

const call = (path: string, method = 'GET', body?: object, headers: Record<string, string> = {}) => fetch(`${base}/tabularius/admin/v1/${path}`, {
  method, headers: { 'x-tabularius-admin': '1', 'content-type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json() as Record<string, any> }));

async function adminLog(): Promise<string[]> {
  await host.logs!.flush();
  const file = join(dir, 'Logs', 'Admin.log');
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('[security ')) : [];
}
const fileEvents = (name: string, kind: string) => host.get(name)!.securityEvents({ kind, limit: 100 });
const signIn = (db: string) => fetch(`${base}/fmi/data/vLatest/databases/${db}/sessions`, {
  method: 'POST', headers: { authorization: 'Basic ' + btoa('Admin:pw') }, body: '{}',
}).then((r) => r.json()).then((b) => b.response.token as string);

test('ending one session, all of an account\'s, and disconnecting a client record the file, account, count and actor', async () => {
  await signIn('Shop');
  const [one] = (await call('sessions?database=Shop')).body.sessions;
  assert.equal((await call('sessions/end', 'POST', { id: one.id })).body.ended, 1);
  await signIn('Shop');
  await signIn('Shop');
  assert.equal((await call('sessions/end', 'POST', { database: 'Shop', account: 'Admin' })).body.ended, 2);
  await signIn('Other');
  const [other] = (await call('sessions?database=Other')).body.sessions;
  assert.equal((await call(`clients/${other.id}/disconnect`, 'POST')).status, 200);
  const log = fileEvents('Shop', 'sessions-ended');
  assert.equal(log.length, 2);
  assert.match(log[0].description, /ended 1 session of Admin/);
  assert.match(log[1].description, /ended all 2 of the sessions of Admin/);
  assert.equal(log[0].account, 'admin console');
  assert.ok(log[0].from, 'the address is kept');
  assert.equal(log[0].severity, 'info');
  assert.equal(fileEvents('Other', 'sessions-ended').length, 1);
  assert.equal((await call(`clients/${other.id}/disconnect`, 'POST')).status, 404);
  assert.equal((await call('sessions/end', 'POST', { database: 'Shop', account: 'Nobody' })).body.ended, 0);
  assert.equal((await call('sessions/end', 'POST', { id: 'ffffffff' })).body.ended, 0);
  assert.equal(fileEvents('Shop', 'sessions-ended').length, 2);
  assert.equal(fileEvents('Other', 'sessions-ended').length, 1);
});

test('copy and replace restores record every concerned file, preserve history, and refused restores stay quiet', async () => {
  const points = (await call('restore')).body;
  assert.equal(points.progressive, true);
  assert.ok(points.databases.find((d: any) => d.name === 'Shop')?.from);
  host.get('Shop')!.create('Orders', { Ref: 'one' });
  host.get('Other')!.create('Orders', { Ref: 'two' });
  save();
  const good = Date.now();
  const sessionsBefore = fileEvents('Shop', 'sessions-ended');
  // Different files avoid the separate copy-then-replace .adding backup-set issue reported in the brief.
  const replaced = await call('restore', 'POST', { database: 'Shop', at: good, mode: 'replace' });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
  const copy = await call('restore', 'POST', { database: 'Other', at: good, mode: 'copy', name: 'Other earlier' });
  assert.equal(copy.status, 200, JSON.stringify(copy.body));
  const live = fileEvents('Shop', 'file-restored');
  assert.equal(live.length, 1);
  assert.match(live[0].description, /Shop was put back as it was at .*, over the live file/);
  assert.equal(live[0].severity, 'notice');
  assert.equal(live[0].account, 'admin console');
  assert.ok(live[0].from);
  assert.deepEqual(fileEvents('Shop', 'sessions-ended'), sessionsBefore, 'live security history survives replacement');
  const source = fileEvents('Other', 'file-restored');
  assert.equal(source.length, 1);
  assert.match(source[0].description, /Other as it was at .* was hosted as Other earlier, next to the live file/);
  assert.equal(fileEvents('Other earlier', 'file-restored').length, 1);
  assert.equal((await call('restore', 'POST', { database: 'Shop', at: good, mode: 'wipe' })).status, 400);
  assert.equal(fileEvents('Shop', 'file-restored').length, 1);
});

test('server-wide settings record changed values and email domains, with no entries for unchanged or refused saves', async () => {
  const before = (await adminLog()).length;
  assert.equal((await call('block-new-users', 'POST', { on: true })).status, 200);
  assert.equal((await call('block-new-users', 'POST', { on: true })).status, 200);
  assert.equal((await call('block-new-users', 'POST', { on: false })).status, 200);
  assert.equal((await call('session-timeout', 'POST', { minutes: 45, webMinutes: 50 })).status, 200);
  assert.equal((await call('session-timeout', 'POST', { minutes: 45, webMinutes: 50 })).status, 200);
  assert.equal((await call('device-storage', 'POST', { on: true })).status, 200);
  assert.equal((await call('device-storage', 'POST', { on: true })).status, 200);
  const notification = { to: 'Ops.Person@Alerts.Example.test', level: 'Warning' };
  assert.equal((await call('notifications', 'POST', notification)).status, 200);
  assert.equal((await call('notifications', 'POST', notification)).status, 200);
  assert.equal((await call('notifications', 'POST', { to: '' })).status, 200);
  assert.equal((await call('notifications', 'POST', { to: '' })).status, 200);
  const lines = (await adminLog()).slice(before);
  const text = lines.join('\n');
  assert.equal(lines.length, 7, text);
  assert.match(lines[0], /\[security notice\] server-setting-changed: .*"block new users" was changed from false to true \(via admin console\)/);
  assert.match(text, /Data API session timeout \(minutes\)" was changed from 15 to 45/);
  assert.match(text, /web client session timeout \(minutes\)" was changed from 15 to 50/);
  assert.match(text, /email notifications" was changed.*to an address at alerts\.example\.test, warnings and errors/);
  assert.ok(!/Ops\.Person/i.test(text), 'a person\'s email address is not kept');
  assert.match(lines[0], /\t(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)\t/);
  assert.equal((await call('block-new-users', 'POST', { on: 'yes' })).status, 400);
  assert.equal((await call('session-timeout', 'POST', { minutes: 55, webMinutes: 0 })).status, 400);
  assert.equal((await call('notifications', 'POST', { to: 'invalid' })).status, 400);
  assert.equal((await adminLog()).length, before + 7);
});

test('backup folder changes record old and new destinations once', async () => {
  const before = (await adminLog()).length;
  const folder = join(dir, 'backup-destination');
  for (const value of [folder, folder, '', '']) assert.equal((await call('backup-folder', 'POST', { folder: value })).status, 200);
  const lines = (await adminLog()).slice(before);
  assert.equal(lines.length, 2, lines.join('\n'));
  assert.match(lines[0], /"backup folder" was changed from the default folder to .*backup-destination/);
  assert.match(lines[1], /"backup folder" was changed from .*backup-destination to the default folder/);
});

test('connections record add, secret set and clear, approval, changed fields and removal without values', async () => {
  const before = (await adminLog()).length;
  const secretValue = ['sk', 'live', 'abc123', 'XYZ'].join('_');
  const made = await call('connections', 'POST', { name: 'invoices', type: 's3', config: { bucket: 'invoice-files', endpoint: 'https://objects.example.test' } });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const id = made.body.id as string;
  assert.equal((await call(`connections/${id}/secrets/accessKey`, 'PUT', { value: secretValue })).status, 200);
  assert.equal((await call(`connections/${id}/secrets/secretKey`, 'PUT', { value: secretValue + '2' })).status, 200);
  assert.equal((await call(`connections/${id}/approve`, 'POST')).status, 200);
  assert.equal((await call(`connections/${id}`, 'PATCH', { note: 'for invoices', enabled: false })).status, 200);
  assert.equal((await call(`connections/${id}`, 'PATCH', { note: 'for invoices' })).status, 200);
  assert.equal((await call(`connections/${id}/secrets/secretKey`, 'DELETE')).status, 200);
  assert.equal((await call(`connections/${id}`, 'DELETE')).status, 200);
  const lines = (await adminLog()).slice(before);
  const text = lines.join('\n');
  assert.equal(lines.length, 7, text);
  assert.match(lines[0], /connection-changed: The connection invoices \(s3, host objects\.example\.test\) was added/);
  assert.match(lines[1], /accessKey was set \(the value is never recorded\)/);
  assert.match(lines[3], /was approved/);
  assert.match(lines[4], /was changed \(note, on or off\)/);
  assert.match(lines[5], /secretKey was cleared/);
  assert.match(lines[6], /was removed/);
  assert.ok(!text.includes(secretValue) && !/invoice-files|for invoices/.test(text));
  assert.equal((await call('connections', 'POST', { name: 'bad name', type: 's3', config: {} })).status, 400);
  assert.equal((await call(`connections/${id}`, 'DELETE')).status, 404);
  assert.equal((await adminLog()).length, before + 7);
});

test('backup, check and message schedule changes record their names and fields, never message text', async () => {
  const before = (await adminLog()).length;
  const made = await call('schedules', 'POST', { kind: 'backup', name: 'Nightly backup', everyMinutes: 1440, enabled: false, dest: join(dir, 'offsite-copies') });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const id = made.body.id as string;
  assert.equal((await call(`schedules/${id}`, 'PATCH', { enabled: false, everyMinutes: 720 })).status, 200);
  assert.equal((await call(`schedules/${id}`, 'PATCH', { enabled: false, everyMinutes: 720 })).status, 200);
  assert.equal((await call(`schedules/${id}`, 'DELETE')).status, 200);
  const note = await call('schedules', 'POST', { kind: 'message', name: 'Hello', message: 'Back soon', everyMinutes: 60, enabled: false });
  assert.equal(note.status, 201, JSON.stringify(note.body));
  const check = await call('schedules', 'POST', { kind: 'verify', name: 'Check copies', everyMinutes: 60, enabled: false });
  assert.equal(check.status, 201, JSON.stringify(check.body));
  assert.equal((await call(`schedules/${check.body.id}`, 'PATCH', { at: '03:30' })).status, 200);
  assert.equal((await call(`schedules/${check.body.id}`, 'DELETE')).status, 200);
  assert.equal((await call(`schedules/${note.body.id}`, 'PATCH', { message: 'Private reminder' })).status, 200);
  assert.equal((await call(`schedules/${note.body.id}`, 'DELETE')).status, 200);
  const lines = (await adminLog()).slice(before);
  assert.equal(lines.length, 9, lines.join('\n'));
  assert.match(lines[0], /server-schedule-changed: The backup schedule Nightly backup was added, to .*offsite-copies/);
  assert.match(lines[1], /was changed \(everyMinutes\)/);
  assert.match(lines[2], /was removed/);
  assert.match(lines[3], /The message schedule Hello was added/);
  assert.match(lines[4], /The verify schedule Check copies was added/);
  assert.match(lines[5], /was changed \(at\)/);
  assert.ok(!/Back soon|Private reminder/.test(lines.join('\n')));
  assert.equal((await call('schedules', 'POST', { kind: 'backup', everyMinutes: -1 })).status, 400);
  assert.equal((await adminLog()).length, before + 9);
});

test('a refused plug-in secret writes nothing, and its sentence names only plug-in and field', async () => {
  const before = (await adminLog()).length;
  assert.equal((await call('plugins/none/secrets/API_KEY', 'PUT', { value: 'x' })).status, 404);
  assert.equal((await adminLog()).length, before);
  const { serverSecurityEventLine } = await import('../src/server-security.ts');
  assert.match(serverSecurityEventLine('plugin-secret-changed', { plugin: 'maps', field: 'API_KEY', change: 'set' }, { channel: 'Admin API', address: '10.0.0.5' }),
    /^\[security notice\] plugin-secret-changed: The plug-in maps: secret API_KEY was set \(the value is never recorded\) \(via Admin API\)$/);
});

test('an installed synthetic plug-in records secret set and clear without the value', async () => {
  const before = (await adminLog()).length;
  const value = ['sk', 'test', 'plugin-value'].join('_');
  const route = 'plugins/org.example.audit/secrets/API_KEY';
  assert.equal((await call(route, 'PUT', { value })).status, 200);
  assert.equal((await call(route, 'DELETE')).status, 200);
  assert.equal((await call('plugins/org.example.audit/secrets/OTHER', 'PUT', { value })).status, 400);
  const lines = (await adminLog()).slice(before);
  assert.equal(lines.length, 2, lines.join('\n'));
  assert.match(lines[0], /plugin-secret-changed: The plug-in org.example.audit: secret API_KEY was set/);
  assert.match(lines[1], /secret API_KEY was cleared/);
  assert.ok(!lines.join('\n').includes(value));
});

test('web timeout ownership changes are recorded even when the effective minutes stay equal', async () => {
  assert.equal((await call('session-timeout', 'POST', { webMinutes: 45 })).status, 200);
  const before = (await adminLog()).length;
  assert.equal((await call('session-timeout', 'POST', { webMinutes: null })).status, 200);
  assert.equal((await call('session-timeout', 'POST', { webMinutes: null })).status, 200);
  assert.equal((await call('session-timeout', 'POST', { webMinutes: 45 })).status, 200);
  const lines = (await adminLog()).slice(before);
  assert.equal(lines.length, 2, lines.join('\n'));
  assert.match(lines[0], /from 45 to 45 \(follows the Data API timeout\)/);
  assert.match(lines[1], /from 45 to 45 \(its own timeout\)/);
});

test('each server-wide kind has a notice sentence and is documented', async () => {
  const { SERVER_SECURITY_EVENT_KINDS, serverSecurityEventLine } = await import('../src/server-security.ts');
  const page = readFileSync(join(import.meta.dirname, '..', '..', '..', 'ADMIN.md'), 'utf8');
  for (const kind of SERVER_SECURITY_EVENT_KINDS) {
    assert.ok(new RegExp(`(?<![\\w-])${kind}(?![\\w-])`).test(page), `${kind} is in ADMIN.md`);
    assert.ok(serverSecurityEventLine(kind, { setting: 's', after: 'x', change: 'added', name: 'n', plugin: 'p', field: 'f', kind: 'backup' }, { channel: 'admin console', address: '::1' }).startsWith(`[security notice] ${kind}: `));
  }
});

test('passkey registration and removal record successful changes, with a synthetic authenticator', async () => {
  const before = (await adminLog()).length;
  const url = new URL(base);
  const authenticator = makeAuthenticator(url.hostname, url.origin);
  const { challenge } = (await call('passkeys/register/options', 'POST', {})).body;
  const body = { response: { ...forgeRegistration(authenticator, challenge), challenge }, label: 'Office key' };
  assert.equal((await call('passkeys/register', 'POST', body)).status, 200);
  assert.equal((await call('passkeys/register', 'POST', body)).status, 400, 'replayed registration is refused');
  const id = authenticator.credId.toString('base64url');
  assert.equal((await call(`passkeys/${id}`, 'DELETE')).body.removed, true);
  assert.equal((await call(`passkeys/${id}`, 'DELETE')).body.removed, false);
  const lines = (await adminLog()).slice(before);
  assert.equal(lines.length, 2, lines.join('\n'));
  assert.match(lines[0], /admin-passkey-changed: A passkey for signing in to the admin console was added: Office key/);
  assert.match(lines[1], /admin-passkey-changed: A passkey for signing in to the admin console was removed/);
});

test('the way in follows proven authentication, including header precedence and refusal', async () => {
  const before = (await adminLog()).length;
  const unproved = { authorization: 'Basic ' + btoa(':not-checked') };
  assert.equal((await call('device-storage', 'POST', { on: false }, unproved)).status, 200);
  setAdminPassword(dir, 'console password');
  try {
    assert.equal((await call('device-storage', 'POST', { on: true }, unproved)).status, 401);
    const basic = { authorization: 'Basic ' + btoa(':console password') };
    assert.equal((await call('device-storage', 'POST', { on: true }, basic)).status, 200);
    const signed = await fetch(`${base}/tabularius/admin/v1/sign-in`, { method: 'POST', headers: { 'x-tabularius-admin': '1', 'content-type': 'application/json' }, body: JSON.stringify({ password: 'console password' }) });
    assert.equal(signed.status, 200);
    const cookie = signed.headers.get('set-cookie')!.split(';')[0];
    await signed.arrayBuffer();
    assert.equal((await call('device-storage', 'POST', { on: false }, { cookie, ...unproved })).status, 200);
    assert.equal((await call('device-storage', 'POST', { on: true }, { cookie, ...unproved, 'x-tabularius-local': localAccess(dir)!.token })).status, 200);
    const lines = (await adminLog()).slice(before);
    assert.equal(lines.length, 4, lines.join('\n'));
    for (const line of lines) assert.ok(line.endsWith('(via admin console)'), line);
  } finally {
    rmSync(join(dir, '.openhbam-admin'), { force: true });
  }
});

test('server security recording falls back to the server log and never undoes a change on logging failure', async () => {
  const { recordServerSecurityEvent } = await import('../src/server-security.ts');
  const actor = { channel: 'Admin API', address: '127.0.0.1' };
  const messages: string[] = [];
  recordServerSecurityEvent({} as Host, (m) => messages.push(m), actor, 'admin-passkey-changed', { change: 'removed' });
  assert.match(messages[0], /^\[security notice\]/);
  const broken = { logs: { write() { throw new Error('log unavailable'); } } } as unknown as Host;
  recordServerSecurityEvent(broken, (m) => messages.push(m), actor, 'admin-passkey-changed', { change: 'removed' });
  assert.match(messages[1], /could not record admin-passkey-changed/);
  assert.doesNotThrow(() => recordServerSecurityEvent(broken, () => { throw new Error('also unavailable'); }, actor, 'admin-passkey-changed', { change: 'removed' }));
});

test('free-text labels stay on one line and contain no full email address', async () => {
  const { serverSecurityEventLine } = await import('../src/server-security.ts');
  const line = serverSecurityEventLine('admin-passkey-changed', { change: 'added', label: 'Person@Example.test\n\tSecond line' }, { channel: 'admin console\n', address: '::1' });
  assert.ok(!/[\r\n\t]/.test(line));
  assert.ok(!line.includes('Person@'));
  assert.match(line, /an address at Example.test/);
});

test('file-event strings are bounded and keep the actor separate from the target', () => {
  const store = host.get('Other')!;
  const long = 'x'.repeat(300);
  store.recordFileRestored({ mode: 'copy', asOf: long, source: long, into: long, by: long, from: long });
  store.recordSessionsEnded({ scope: 'account', count: 2, account: long, by: long, from: long });
  for (const kind of ['file-restored', 'sessions-ended']) {
    const entry = fileEvents('Other', kind).at(-1)!;
    assert.equal(entry.account?.length, 200);
    assert.equal(entry.from?.length, 200);
    for (const value of Object.values(entry.changes ?? {})) if (typeof value === 'string') assert.ok(value.length <= 200);
    if (kind === 'sessions-ended') assert.equal(entry.target?.length, 200);
  }
});

test('preserving a canonical security kind does not bypass credential redaction in the sentence', async () => {
  const before = (await adminLog()).length;
  const value = ['sk', 'test', 'a'.repeat(24)].join('_');
  host.logs!.write('Admin', 'Information', '127.0.0.1', `[security notice] plugin-secret-changed: password=${value}`);
  const [line] = (await adminLog()).slice(before);
  assert.match(line, /\[security notice\] plugin-secret-changed: password=‹redacted›/);
  assert.ok(!line.includes(value));
});
