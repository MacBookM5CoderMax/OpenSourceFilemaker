// `tabularius diagnostics`: a bundle for a bug report. Every kind of secret and personal value is seeded through the logs,
// the settings, the environment, the file's own names and records and error text, and none may survive in any file of the
// bundle. The bundle is also checked to say what it should (ids for files, counts for the design).

import { expectMode } from '../../store/test/windows.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { createStore, Store } from '../../store/src/index.ts';
import { unzip } from '../../calc/src/zip.ts';
import { diagnostics, Scrubber, tailLines, writeBundle } from '../src/diagnostics.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');

// A home folder as this system writes one: a path in the other form is resolved to a drive on Windows and is not the one the bundle was told to hide.
const HOME = process.platform === 'win32' ? 'C:\\Users\\jdoe' : '/home/jdoe';
const SEEDS = {
  file: 'Acme Payroll',
  table: 'SalaryRecords',
  field: 'SocialSecurityNo',
  account: 'alice.smith',
  password: 'hunter2-Password!',
  record: 'Jane Q. Doe 123-45-6789',
  email: 'alice.smith@example.com',
  ops: 'ops@acme.example',
  ipv4: '203.0.113.77',
  ipv6: '2001:db8::8a2e:370:7334',
  session: 'AbCdEf0123456789AbCdEf0123456789xyz',
  bearer: 'abc.def.ghi-bearer-token-value',
  basic: 'dXNlcjpwYXNzd29yZA==',
  cookie: 'tabularius_admin=cookie-value-0123',
  smtp: 'smtp-pass-9876',
  replication: 'repl-token-abcdef123456',
  keyFile: 'sk' + '-ant-keyfile-secret-12345',
  ldap: 'ldapPass99',
  github: 'gh' + 'p_0123456789abcdefghijABCDEFGHIJ0123',
  stripe: 'sk' + '-ant-api03-0123456789abcdefABCDEF',
  aws: 'AKIA' + 'IOSFODNN7EXAMPLE',
  jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJl',
  user: 'jdoe',
  winUser: 'jdoe',
  pem: '-----BEGIN' + ' PRIVATE KEY----- MIIEvQIBADANBgkq -----END PRIVATE KEY-----',
};

function seededFolder(): { root: string; folder: string; userFolder: string; env: NodeJS.ProcessEnv } {
  const root = mkdtempSync(join(tmpdir(), 'tabularius-diag-'));
  const folder = join(root, 'Databases');
  const userFolder = join(root, 'user');
  mkdirSync(folder, { recursive: true });
  mkdirSync(join(folder, 'Logs'));
  mkdirSync(userFolder);
  const path = join(folder, `${SEEDS.file}.openhbam.sqlite`);
  createStore(path);
  const store = new Store(path, SEEDS.file);
  try {
    store.applyDesign([{ op: 'createTable', name: SEEDS.table, fields: [{ name: SEEDS.field, type: 'text' }, { name: 'Notes', type: 'text' }] }]);
    store.create(SEEDS.table, { [SEEDS.field]: SEEDS.record, Notes: SEEDS.record });
    store.setPassword(SEEDS.account, SEEDS.password, '[Full Access]');
  } finally { store.close(); }
  writeFileSync(join(folder, '.openhbam-settings.json'), JSON.stringify({
    sessionIdleMinutes: 30, blockNewUsers: true,
    smtp: { host: 'smtp.acme.example', user: 'mailer', password: SEEDS.smtp },
    notifications: { to: SEEDS.ops, level: 'Error' },
    backupDir: `${HOME}/backups`,
  }));
  writeFileSync(join(userFolder, 'ai-key'), SEEDS.keyFile + '\n');
  const stamp = (i: number) => `2026-10-17 12:00:0${i}.000 +0000`;
  const lines: string[] = [
    `${stamp(0)}\tInformation\tserver\ttabularius 1.0 started on ${hostname()}`,
    `${stamp(1)}\tError\tconvert\t${SEEDS.file} couldn't be converted: field "${SEEDS.field}" in ${SEEDS.table} is damaged`,
    `${stamp(2)}\tWarning\tauth\tsign-in failed for ${SEEDS.account} (${SEEDS.email}) from ${SEEDS.ipv4} and ${SEEDS.ipv6}`,
    `${stamp(3)}\tInformation\thttp\tDELETE /fmi/data/vLatest/databases/${SEEDS.file}/sessions/${SEEDS.session}`,
    `${stamp(4)}\tError\thttp\tAuthorization: Bearer ${SEEDS.bearer}`,
    `${stamp(5)}\tError\thttp\tAuthorization: Basic ${SEEDS.basic}; Cookie: ${SEEDS.cookie}`,
    `${stamp(6)}\tError\tmail\tsmtp password=${SEEDS.smtp} was rejected; sent to ${SEEDS.ops}`,
    `${stamp(7)}\tError\treplication\tstandby refused token ${SEEDS.replication}`,
    `${stamp(8)}\tError\tai\tkey ${SEEDS.keyFile} was refused`,
    `${stamp(9)}\tError\tldap\tbind to ldaps://svc:${SEEDS.ldap}@dir.example.com failed`,
    `${stamp(0)}\tInformation\tserver\topened ${HOME}/Databases/${SEEDS.file}.openhbam.sqlite and C:\\Users\\${SEEDS.winUser}\\Documents\\x.fmp12 and ${folder}/Backups`,
    `${stamp(1)}\tError\tscript\trecord "${SEEDS.record}" failed validation; 'Jane Q. Doe' not allowed`,
    `${stamp(2)}\tError\ttokens\t${SEEDS.github} ${SEEDS.stripe} ${SEEDS.aws} ${SEEDS.jwt}`,
    `${stamp(3)}\tError\ttls\t${SEEDS.pem}`,
    `${stamp(4)}\tError\tjson\t{"api_key": "plain-api-key-value", "client_secret":"cs-value-12345", "ok": "fine"}`,
    `${stamp(5)}\tError\thttp\tGET /x?token=querytoken123&state=abc123&name=fine`,
  ];
  writeFileSync(join(folder, 'Logs', 'Event.log'), lines.join('\n') + '\n');
  writeFileSync(join(folder, 'Logs', 'ScriptEvent.log'), `${stamp(0)}\tError\tscript\tScript "Pay everyone" in ${SEEDS.file} failed: "${SEEDS.record}" is not allowed in Notes; ssn 987-65-4321 too\n`);
  // The sign-in and access logs are not in the bundle at all.
  writeFileSync(join(folder, 'Logs', 'Access.log'), `${stamp(0)}\tInformation\tauth\t${SEEDS.account} signed in from ${SEEDS.ipv4}\n`);
  const env: NodeJS.ProcessEnv = {
    TABULARIUS_REPLICATION_TOKEN: SEEDS.replication, TABULARIUS_WORKERS: '2', TABULARIUS_HTTPS: 'payroll.acme.example',
    PATH: '/usr/bin', HOME,
  };
  return { root, folder, userFolder, env };
}

const everything = (bundle: Map<string, string>) => [...bundle].map(([n, t]) => `--- ${n}\n${t}`).join('\n');

test('no seeded secret or personal value survives in any file of the bundle', async (t) => {
  const s = seededFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  const bundle = await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: s.env, now: new Date('2026-10-17T12:00:00Z') });
  const all = everything(bundle);
  const leaked = Object.entries(SEEDS).filter(([, v]) => v.split('\n').some((part) => part.length > 3 && all.includes(part))).map(([k, v]) => `${k} in ${[...bundle].filter(([, text]) => v.split('\n').some((part) => part.length > 3 && text.includes(part))).map(([name]) => name).join(', ')}`);
  assert.deepEqual(leaked, [], 'seeds that survived');
  for (const extra of ['Jane Q. Doe', '123-45-6789', '987-65-4321', 'Pay everyone', 'smtp.acme.example', 'payroll.acme.example', 'plain-api-key-value', 'cs-value-12345', 'querytoken123', hostname().length >= 3 ? hostname() : 'no-host', s.root]) {
    assert.ok(!all.includes(extra), `${extra} survived`);
  }
  assert.ok(!all.includes('signed in from'), 'the access log is not in the bundle');
});

test('what the bundle says: ids for files, counts for the design, switches and numbers for settings, the log with its structure kept', async (t) => {
  const s = seededFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  const bundle = await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: s.env });
  assert.deepEqual([...bundle.keys()].sort(), ['README.txt', 'conversion.json', 'disk.json', 'doctor.txt', 'environment.json', 'files.json', 'log-Event.txt', 'log-ScriptEvent.txt', 'plugins.json', 'schedules.json', 'settings.json']);
  const files = JSON.parse(bundle.get('files.json')!);
  assert.equal(files.count, 1);
  assert.equal(files.files[0].id, 'file-1');
  assert.equal(files.files[0].name, undefined);
  assert.equal(files.files[0].readable, true);
  assert.equal(files.files[0].design.tables, 1);
  assert.equal(files.files[0].design.fields, 2);
  assert.ok(files.files[0].bytes > 0);
  const settings = JSON.parse(bundle.get('settings.json')!);
  assert.deepEqual(settings.values, { blockNewUsers: true, sessionIdleMinutes: 30 });
  assert.deepEqual(settings.otherSettingsSet, ['backupDir', 'notifications', 'smtp']);
  const environment = JSON.parse(bundle.get('environment.json')!);
  assert.deepEqual(environment.environmentVariables.set, ['TABULARIUS_HTTPS', 'TABULARIUS_REPLICATION_TOKEN', 'TABULARIUS_WORKERS']);
  assert.deepEqual(environment.environmentVariables.values, { TABULARIUS_WORKERS: '2' });
  assert.match(environment.node, /^v\d+/);
  assert.match(environment.tabularius.version, /\d/);
  const log = bundle.get('log-Event.txt')!;
  assert.match(log, /^2026-10-17 12:00:00\.000 \+0000\tInformation\tserver\ttabularius 1\.0 started on /m, 'time, type and source are kept');
  assert.match(log, /\tError\tconvert\tfile-1 couldn't be converted: field "…" in <\w+ \d+> is damaged/, 'the file is an id, the field is quoted and so gone, the table a label');
  assert.match(log, /sign-in failed for <account \d+> \(<email>\) from address-[0-9a-f]{6} and address-[0-9a-f]{6}/);
  assert.match(log, /opened ~\/Databases\/file-1 and ~\\?[\\/]Documents/, 'the user name in a path is gone');
  assert.match(log, /<folder>\/Backups/);
  assert.match(log, /\tError\thttp\tGET \/x\?token=(?:…|‹redacted›)&state=…&name=…/, 'the address keeps its shape, with the values hidden');
  assert.match(bundle.get('doctor.txt')!, /Node|File check|Pages/);
  assert.doesNotMatch(bundle.get('doctor.txt')!, /Acme|Payroll/);
});

test('--include-names shows the hosted file names and nothing else that is named', async (t) => {
  const s = seededFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  const bundle = await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: s.env, includeNames: true });
  assert.equal(JSON.parse(bundle.get('files.json')!).files[0].name, SEEDS.file);
  const all = everything(bundle);
  for (const hidden of [SEEDS.table, SEEDS.field, SEEDS.account, SEEDS.password, SEEDS.record, SEEDS.session, SEEDS.replication]) assert.ok(!all.includes(hidden), `${hidden} survived`);
});

test('the same address is the same label in one bundle, another address another, and the labels differ between bundles', () => {
  const a = new Scrubber({ folder: '/srv/db' });
  const b = new Scrubber({ folder: '/srv/db' });
  const line = 'from 198.51.100.7 then 198.51.100.8 then 198.51.100.7 and 0.0.0.0 and 127.0.0.1 and 999.1.1.1';
  const out = a.patterns(line);
  const labels = [...out.matchAll(/address-[0-9a-f]{6}/g)].map((m) => m[0]);
  assert.equal(labels.length, 3);
  assert.equal(labels[0], labels[2]);
  assert.notEqual(labels[0], labels[1]);
  assert.match(out, /0\.0\.0\.0 and 127\.0\.0\.1 and 999\.1\.1\.1/, 'addresses that name no one, and what is not an address, stay');
  assert.notEqual(b.patterns('198.51.100.7'), a.patterns('198.51.100.7'));
  assert.equal(a.patterns(out), out, 'scrubbing twice changes nothing');
});

test('timestamps, versions and ordinary words are not mistaken for addresses or secrets', () => {
  const s = new Scrubber({ folder: '/srv/db' });
  const ordinary = '2026-10-17 12:30:45.123 +0000\tInformation\tserver\tNode v22.22.0 on linux 6.18.44-fc-v139, 2 workers, port 8080, backups every 1d';
  assert.equal(s.patterns(ordinary), ordinary);
  assert.equal(s.logLine("it couldn't be opened, and that's all"), "it couldn't be opened, and that's all", 'an apostrophe is not a quote');
});

test('a secret held anywhere in this install is hidden wherever it appears, as a plain word', async (t) => {
  const s = seededFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  // The AI key file, the settings file's smtp password and the replication token appear as bare words in a log line.
  writeFileSync(join(s.folder, 'Logs', 'Event.log'), `2026-10-17 12:00:00.000 +0000\tError\tx\tfailed with ${SEEDS.keyFile} and ${SEEDS.smtp} and ${SEEDS.replication}\n`);
  const bundle = await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: s.env });
  assert.match(bundle.get('log-Event.txt')!, /failed with ‹redacted› and ‹redacted› and ‹redacted›/);
});

test('tailLines returns the last lines of a file of any size', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-tail-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'big.log');
  writeFileSync(file, Array.from({ length: 20000 }, (_, i) => `line ${i} ${'x'.repeat(60)}`).join('\n') + '\n');
  const lines = tailLines(file, 500);
  assert.equal(lines.length, 500);
  assert.match(lines[0], /^line 19500 /);
  assert.match(lines[499], /^line 19999 /);
  assert.deepEqual(tailLines(join(dir, 'missing.log')), []);
  writeFileSync(join(dir, 'short.log'), 'a\nb\n');
  assert.deepEqual(tailLines(join(dir, 'short.log')), ['a', 'b']);
});

test('the command writes a .zip of plain text, a folder on request, and never over what is there', (t) => {
  const s = seededFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  const env = { ...process.env, TABULARIUS_HOME: s.userFolder, ...s.env, HOME: process.env.HOME };
  const zipPath = join(s.root, 'out', 'bundle.zip');
  let r = spawnSync(process.execPath, ['--no-warnings', main, 'diagnostics', s.folder, '--out', zipPath], { encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /wrote .*bundle\.zip/);
  assert.match(r.stdout, /read it before you send it/);
  const entries = unzip(readFileSync(zipPath));
  assert.ok(entries.some((e) => e.name === 'tabularius-diagnostics/README.txt'));
  const text = entries.map((e) => Buffer.from(e.data).toString('utf8')).join('\n');
  for (const secret of [SEEDS.password, SEEDS.record, SEEDS.replication, SEEDS.keyFile, SEEDS.smtp, SEEDS.session, SEEDS.ipv4, SEEDS.email]) assert.ok(!text.includes(secret), `${secret} is in the zip`);

  r = spawnSync(process.execPath, ['--no-warnings', main, 'diagnostics', s.folder, '--out', zipPath], { encoding: 'utf8', env });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already there/);

  const dir = join(s.root, 'as-folder');
  r = spawnSync(process.execPath, ['--no-warnings', main, 'diagnostics', s.folder, '--out', dir, '--include-names'], { encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readdirSync(dir).sort(), ['README.txt', 'conversion.json', 'disk.json', 'doctor.txt', 'environment.json', 'files.json', 'log-Event.txt', 'log-ScriptEvent.txt', 'plugins.json', 'schedules.json', 'settings.json']);
  assert.match(readFileSync(join(dir, 'files.json'), 'utf8'), /Acme Payroll/);

  r = spawnSync(process.execPath, ['--no-warnings', main, 'diagnostics', join(s.root, 'nothing-here')], { encoding: 'utf8', env });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /is not a folder/);
  assert.ok(!existsSync(join(s.root, 'nothing-here')));
});

test('writeBundle refuses to replace anything', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-write-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bundle = new Map([['a.txt', 'one\n']]);
  const out = writeBundle(bundle, join(dir, 'x'));
  assert.equal(readFileSync(join(out, 'a.txt'), 'utf8'), 'one\n');
  assert.throws(() => writeBundle(bundle, join(dir, 'x')), /already there/);
});

// --- what the independent review found (PR comment), one test each ---

/** A folder with one hosted file and whatever else a test puts there. */
function bareFolder(): { root: string; folder: string; userFolder: string; env: NodeJS.ProcessEnv } {
  const root = mkdtempSync(join(tmpdir(), 'tabularius-diag-'));
  const folder = join(root, 'Databases');
  const userFolder = join(root, 'user');
  mkdirSync(join(folder, 'Logs'), { recursive: true });
  mkdirSync(userFolder);
  createStore(join(folder, 'Acme Payroll.openhbam.sqlite'));
  return { root, folder, userFolder, env: { PATH: '/usr/bin' } };
}
const fingerprint = (path: string) => `${createHash('sha256').update(readFileSync(path)).digest('hex')}:${statSync(path).mtimeMs}`;

test('the hosted files are only read: not changed, not migrated, not touched', async (t) => {
  const s = seededFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  const file = join(s.folder, `${SEEDS.file}.openhbam.sqlite`);
  const before = fingerprint(file);
  await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: s.env });
  assert.equal(fingerprint(file), before, 'the file is byte for byte what it was, with the same modification time');
});

test('names of files that were not converted, and web addresses with a name in them, do not reach the bundle', async (t) => {
  const s = bareFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  writeFileSync(join(s.folder, 'Divorce Clients 2026.fmp12'), 'not a real file');
  writeFileSync(join(s.folder, 'Logs', 'Event.log'), [
    '2026-10-17 12:00:00.000 +0000\tInformation\tconvert\tconverting Divorce Clients 2026.fmp12',
    "2026-10-17 12:00:01.000 +0000\tError\tconvert\tcouldn't convert Divorce Clients 2026.fmp12: not a FileMaker file",
    '2026-10-17 12:00:02.000 +0000\tInformation\thttp\tGET /fmi/data/vLatest/databases/Acme%20Payroll/layouts/Salary%20Records/records',
    '2026-10-17 12:00:03.000 +0000\tInformation\thttp\tGET /app/?db=Acme+Payroll',
  ].join('\n') + '\n');
  const bundle = await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: s.env });
  const all = everything(bundle);
  for (const hidden of ['Divorce', 'Clients 2026', 'Acme%20Payroll', 'Acme+Payroll', 'Acme Payroll']) assert.ok(!all.includes(hidden), `${hidden} survived`);
});

test('secrets in web addresses: webhook paths, query values, other schemes', () => {
  const s = new Scrubber({ folder: '/srv/db' });
  const lines = [
    'webhook 3 (https://hooks.slack.com/' + 'services/T0123ABCD/B0123ABCD/xQ9vR2mK7pL4sT8wY1zN)',
    'GET https://api.example.com/v1/items?key=AbC123xYz&limit=5&sig=Zm9vYmFyYmF6',
    'fetch https://files.example.net/c/abc/def.pdf?sv=2020&sp=r&sig=ZmFrZXNpZw%3D%3D',
  ].join('\n');
  const out = s.logLine(lines);
  for (const hidden of ['xQ9vR2mK7pL4sT8wY1zN', 'T0123ABCD', 'AbC123xYz', 'Zm9vYmFyYmF6', 'ZmFrZXNpZw', 'def.pdf']) assert.ok(!out.includes(hidden), `${hidden} survived`);
  assert.match(out, /hooks\.slack\.com/, 'the host stays: it says which service');
  assert.match(out, /limit=5/, 'a number in the query stays');
  assert.equal(s.patterns(out), out);
});

test('a settings file that does not parse does not leak its password through the error', async (t) => {
  const s = bareFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  writeFileSync(join(s.folder, '.openhbam-settings.json'), '{ "smtp": { "password": Tr0ub4dor&3 } }');
  const bundle = await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: s.env });
  assert.ok(!everything(bundle).includes('Tr0ub4dor'), 'the password survived');
});

test('a value a script error quotes bare is gone: the log keeps the error number, not what follows it', () => {
  const s = new Scrubber({ folder: '/srv/db' });
  const out = s.logLine('Data API script "Import" (alice) ended with error 500, Field "Amount" must be a valid number, not 987654321');
  assert.ok(!out.includes('987654321'));
  assert.match(out, /ended with error 500/);
});

test('the folder is shown as <folder> even when its path has a part that looks like a token', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'tabularius-diag-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const folder = join(root, '0123456789abcdef0123456789abcdef0123456789', 'Databases');
  mkdirSync(join(folder, 'Logs'), { recursive: true });
  mkdirSync(join(root, 'user'));
  writeFileSync(join(folder, 'Logs', 'Event.log'), `2026-10-17 12:00:00.000 +0000\tInformation\tserver\tserving ${folder}/Backups\n`);
  const bundle = await diagnostics(folder, { home: HOME, userFolder: join(root, 'user'), env: { PATH: '/usr/bin' } });
  assert.match(bundle.get('log-Event.txt')!, /serving <folder>\/Backups/);
  assert.ok(!everything(bundle).includes('0123456789abcdef0123456789abcdef'));
});

test('a person\'s name in a path, in every form a path takes', () => {
  const s = new Scrubber({ folder: '/srv/db', home: '/home/jdoe' });
  const paths = [
    '/Volumes/Data/Users/jdoe/Documents/x', 'C:\\Users\\Jane Doe\\Documents\\x', 'C:\\\\Users\\\\Jane Doe\\\\Documents', '\\\\fileserver\\home$\\jdoe\\x',
    'C:\\Documents and Settings\\jdoe\\x', 'opened ~jdoe/files', '/users/jdoe/x', '/home/jdoe/x',
  ];
  for (const path of paths) {
    const out = s.patterns(path);
    assert.ok(!/jdoe|Jane|Doe|fileserver/.test(out), `${path} became ${out}`);
    assert.equal(s.patterns(out), out, `${path}: scrubbing twice changes ${out}`);
  }
  assert.match(s.patterns('C:\\Users\\jdoe is where it was'), /^~ is where it was$/, 'what follows a user name in a sentence stays');
});

test('a Windows folder is hidden however a message spells it: any case, either slash, doubled slashes', () => {
  const s = new Scrubber({ folder: 'D:\\Clients\\Acme\\Hosted', home: 'C:\\Data\\jsmith-profile' });
  const spelled: Array<[string, string]> = [
    ['opened D:\\Clients\\Acme\\Hosted\\Sales.fmp12', 'opened <folder>\\Sales.fmp12'],
    ['opened d:\\clients\\acme\\hosted\\Sales.fmp12', 'opened <folder>\\Sales.fmp12'],
    ['opened D:/Clients/Acme/Hosted/Sales.fmp12', 'opened <folder>/Sales.fmp12'],
    ['opened file:///D:/CLIENTS/ACME/HOSTED/Sales.fmp12', 'opened file:///<folder>/Sales.fmp12'],
    ['"D:\\\\Clients\\\\Acme\\\\Hosted\\\\x"', '"<folder>\\\\x"'],
    ['backup of c:\\data\\JSMITH-profile\\x', 'backup of ~\\x'],
  ];
  for (const [input, want] of spelled) {
    const out = s.patterns(input);
    assert.equal(out, want, input);
    assert.equal(s.patterns(out), out, `${input}: scrubbing twice changes ${out}`);
  }
  // A different folder is not the folder.
  assert.equal(s.patterns('D:\\Clients\\Other\\Hosted\\x'), 'D:\\Clients\\Other\\Hosted\\x');
  // A share as the hosted folder, in the same spellings.
  const share = new Scrubber({ folder: '\\\\fileserver\\dept\\Hosted' });
  assert.equal(share.patterns('opened \\\\FILESERVER\\Dept\\Hosted\\x.fmp12'), 'opened <folder>\\x.fmp12');
  assert.equal(share.patterns('opened //fileserver/dept/Hosted/x.fmp12'), 'opened <folder>/x.fmp12');
});

for (const [name, url] of [
  ['user and deeper spaces', 'file:///C:/Users/Ann%20Lee/Documents/My%20Files/a.fmp12'],
  ['POSIX space', 'file:///Users/Ann%20Lee/Library/x'],
  ['deeper space', 'file:///C:/Users/Ann/Documents/My%20Files/a.fmp12'],
  ['encoded drive colon', 'file:///C%3A/Users/Ann%20Lee/Documents/My%20Files/a.fmp12'],
  ['localhost', 'file://localhost/Users/Ann%20Lee/Documents/My%20Files/a.fmp12'],
  ['UNC', 'file:////server/share/My%20Folder/x'],
  ['mixed hex separators', 'file:///C%3a%2FUsers%2fAnn%20Lee%2FDocuments%2fMy%20Files%2Fa.fmp12'],
  ['other encoded bytes', 'file:///Users/Ann%09Lee/Documents/My%2eFiles/a.fmp12'],
]) {
  test(`encoded file URLs hide the whole path: ${name}`, () => {
    const s = new Scrubber({ folder: '/srv/db' });
    for (const [before, after] of [['opened ', ' next word'], ['opened (', '), next word'], ['opened "', '"; next word'], ['opened ', '. Next sentence!']]) {
      const out = s.patterns(`${before}${url}${after}`);
      assert.match(out, /‹redacted›/);
      assert.doesNotMatch(out, /Ann|Lee|Users|Documents|My|Files|Library|server|share|Folder|a\.fmp12/);
      assert.equal(out, `${before}‹redacted›${after}`);
      assert.equal(s.patterns(out), out);
    }
  });
}

test('a share is hidden whether it is written with forward slashes or as a long path, and a web address is not one', () => {
  const s = new Scrubber({ folder: '/srv/db' });
  for (const path of ['opened //fileserver/finance$/q3/x', 'opened \\\\?\\UNC\\fileserver\\finance$\\q3\\x', 'opened \\\\.\\UNC\\fileserver\\finance$']) {
    const out = s.patterns(path);
    assert.ok(!/fileserver|finance/.test(out), `${path} became ${out}`);
    assert.match(out, /<share>/);
    assert.equal(s.patterns(out), out, `${path}: scrubbing twice changes ${out}`);
  }
  assert.equal(s.patterns('GET https://files.example/docs/x and //'), 'GET https://files.example/… and //');
});

test('a very long line is cut and scrubbed in seconds at most, whatever it is made of', () => {
  const s = new Scrubber({ folder: '/srv/db' });
  for (const unit of ['a', 'a.', 'a-', 'a+', '1.']) {
    const line = unit.repeat(Math.ceil(40_000 / unit.length));
    const start = Date.now();
    s.logLine(line);
    s.text(line);
    // A quadratic rule takes minutes on this input; the budget leaves room for a busy build machine (4.6 s was seen).
    assert.ok(Date.now() - start < 15_000, `${JSON.stringify(unit)} took ${Date.now() - start} ms`);
  }
});

test('input whose rules interact does not stop the bundle, and scrubbing twice changes nothing', async (t) => {
  const s = bareFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  writeFileSync(join(s.folder, 'Logs', 'Event.log'), [
    '2026-10-17 12:00:00.000 +0000\tInformation\thttp\tforwarded_client_address=203.0.113.77',
    '2026-10-17 12:00:01.000 +0000\tInformation\tserver\t/home/a/home/b and 123-45-6789/home/x',
  ].join('\n') + '\n');
  const bundle = await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: s.env });
  assert.ok(!everything(bundle).includes('203.0.113.77'));
  const scrub = new Scrubber({ folder: '/srv/db' });
  for (const text of ['forwarded_client_address=203.0.113.77', '/home/a/home/b', '123-45-6789/home/x', 'client_203.0.113.77']) {
    const once = scrub.patterns(text);
    assert.equal(scrub.patterns(once), once, text);
    assert.ok(!once.includes('203.0.113.77') && !once.includes('123-45-6789'), once);
  }
});

test('the folder\'s own secret files, files the environment points at and a mistyped settings file are known secrets', async (t) => {
  const s = bareFolder();
  t.after(() => rmSync(s.root, { recursive: true, force: true }));
  writeFileSync(join(s.folder, '.openhbam-webhooks.json'), JSON.stringify([{ id: 1, url: 'https://hooks.example.org/in/abcdef-hook-secret' }]));
  writeFileSync(join(s.folder, '.openhbam-mcp-tokens.json'), JSON.stringify({ tokens: ['mcp-token-value-0001'] }));
  writeFileSync(join(s.folder, '.openhbam-mcp-token'), 'tbmcp_folder-token-value-0002\n');
  writeFileSync(join(s.root, 'smtp-file'), 'smtp-file-secret-77\n');
  writeFileSync(join(s.folder, 'Logs', 'Event.log'), [
    '2026-10-17 12:00:00.000 +0000\tError\tnotify\tcould not reach abcdef-hook-secret',
    '2026-10-17 12:00:01.000 +0000\tError\tmcp\tbad token mcp-token-value-0001',
    '2026-10-17 12:00:01.500 +0000\tError\tmcp\tcall from tbmcp_folder-token-value-0002',
    '2026-10-17 12:00:02.000 +0000\tError\tmail\tlogin with smtp-file-secret-77 failed',
  ].join('\n') + '\n');
  const bundle = await diagnostics(s.folder, { home: HOME, userFolder: s.userFolder, env: { ...s.env, TABULARIUS_SMTP_FILE: join(s.root, 'smtp-file') } });
  const all = everything(bundle);
  for (const hidden of ['abcdef-hook-secret', 'mcp-token-value-0001', 'tbmcp_folder-token-value-0002', 'smtp-file-secret-77']) assert.ok(!all.includes(hidden), `${hidden} survived`);
});

test('a two-letter account name is hidden, a lower-case bearer token too, and an address after a letter', () => {
  const s = new Scrubber({ folder: '/srv/db', names: new Map([['jd', '<account 1>']]) });
  const out = s.text('sign-in for jd refused; bearer abcdef123456; from client_203.0.113.77');
  assert.match(out, /sign-in for <account 1> refused/);
  assert.ok(!out.includes('abcdef123456') && !out.includes('203.0.113.77'), out);
});

test('a bundle is written readable by its owner only, and --out needs a name', () => {
  const root = mkdtempSync(join(tmpdir(), 'tabularius-diag-'));
  try {
    const zipPath = writeBundle(new Map([['a.txt', 'x']]), join(root, 'b.zip'));
    expectMode(statSync(zipPath).mode & 0o077, 0);
    const r = spawnSync(process.execPath, ['--no-warnings', main, 'diagnostics', root, '--out', '--full'], { encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--out needs a file name or folder/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
