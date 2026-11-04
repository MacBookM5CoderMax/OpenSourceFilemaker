import { Live } from '../src/live.ts';
import type { Session } from '../src/dataapi.ts';
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { runScript } from '../../scripts/src/index.ts';
import { serve } from '../src/index.ts';
import { secondFileSqlRefusal } from '../src/sql-second-file.ts';
import { Host, STORE_EXT } from '../src/host.ts';
import { commandStubEnv } from '../../../scripts/test-command-stubs.ts';

async function setup(t: TestContext) {
  const env = commandStubEnv(t);
  const previousPath = process.env.PATH, previousMarker = process.env.TABULARIUS_TEST_CHILD_MARKER;
  process.env.PATH = env.PATH;
  process.env.TABULARIUS_TEST_CHILD_MARKER = env.TABULARIUS_TEST_CHILD_MARKER;
  t.after(() => {
    if (previousPath === undefined) delete process.env.PATH; else process.env.PATH = previousPath;
    if (previousMarker === undefined) delete process.env.TABULARIUS_TEST_CHILD_MARKER; else process.env.TABULARIUS_TEST_CHILD_MARKER = previousMarker;
  });
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-file-access-host-'));
  for (const name of ['A', 'B']) createStore(join(dir, name + STORE_EXT));
  const logs: string[] = [];
  const app = await serve({ dir, port: 0, watch: false, log: (message) => logs.push(message) });
  t.after(async () => { await new Promise<void>((resolve) => app.server.close(() => resolve())); rmSync(dir, { recursive: true, force: true }); });
  const a = app.host.get('A')!, b = app.host.get('B')!;
  for (const s of [a, b]) {
    s.setAiPolicy(false);
    s.setPassword('Admin', 'admin-password', '[Full Access]');
    s.savePrivilegeSet({ name: 'Designer', records: { view: true, edit: true, create: true, delete: true }, layouts: 'modifiable', scripts: 'modifiable', valueLists: 'modifiable', extendedPrivileges: ['fmrest', 'fmmcp', 'fmwebdirect'] });
    s.setPassword('Designer', 'design-password', 'Designer');
  }
  b.applyDesign([
    { op: 'createTable', name: 'Items', fields: [{ name: 'Key', type: 'number' }, { name: 'Value' }] },
    { op: 'createValueList', name: 'Choices', values: ['one', 'two'] },
    { op: 'createScript', name: 'Read', text: 'Exit Script [ Text Result: "read" ]' },
  ]);
  b.create('Items', { Key: 1, Value: 'synthetic' });
  a.applyDesign([
    { op: 'createTable', name: 'Parents', fields: [{ name: 'Key', type: 'number' }] },
    { op: 'createDataSource', name: 'B', paths: ['file:B'] },
    { op: 'createOccurrence', name: 'External', file: 'B', externalTable: b.schema.tables[0].id },
    { op: 'createRelationship', left: 'Parents', right: 'External', predicates: [{ left: 'Key', right: b.schema.tables[0].fields[0].id }] },
    { op: 'createField', table: 'Parents', name: 'Related', kind: 'calculation', calculation: 'External::Value', options: { unstored: true } },
    { op: 'createLayout', name: 'External', occurrence: 'External' },
    { op: 'createValueList', name: 'Choices', external: { file: 'B', valueList: b.schema.valueLists[0].id } },
    { op: 'createScript', name: 'Call', text: 'Perform Script [ Specified: By name ; "B::Read" ]\nExit Script [ Text Result: Get ( LastError ) & "|" & Get ( ScriptResult ) ]' },
    { op: 'createScript', name: 'Open', text: 'Open File [ “B” ]\nExit Script [ Text Result: Get ( LastError ) ]' },
  ], { readOtherFile: () => true });
  a.create('Parents', { Key: 1 });
  const login = async (name: string, account = 'Admin', password = 'admin-password') => {
    const r = await fetch(`${app.url}/fmi/data/vLatest/databases/${name}/sessions`, { method: 'POST', headers: { authorization: 'Basic ' + Buffer.from(`${account}:${password}`).toString('base64'), 'content-type': 'application/json' }, body: '{}' });
    assert.equal(r.status, 200);
    return (await r.json()).response.token as string;
  };
  const rest = async (token: string, operation = '', body?: unknown) => {
    const r = await fetch(`${app.url}/tabularius/design/v1/databases/B/file-access${operation ? '/' + operation : ''}`, { method: operation ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, ...(operation ? { body: JSON.stringify(body ?? {}) } : {}) });
    return { status: r.status, body: await r.json() };
  };
  const mcp = async (name: string, args: Record<string, unknown>, account = 'Admin', password = 'admin-password') => {
    const r = await fetch(app.url + '/mcp', { method: 'POST', headers: { authorization: 'Basic ' + Buffer.from(`${account}:${password}`).toString('base64'), 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: { database: 'B', ...args } } }) });
    return await r.json();
  };
  return { ...app, a, b, logs, login, rest, mcp };
}

test('hosted protection covers related values, external layouts, lists, scripts and Open File with one warning', async (t) => {
  const { a, b, logs, host } = await setup(t);
  const values = () => a.valueListItems(a.schema.valueLists[0].id).map((v) => v.value);
  const script = (name: string) => runScript(a, name, { layout: 'Parents' });
  assert.equal(a.find('External', {}).records[0].fieldData.Value, 'synthetic');
  assert.equal(a.get('Parents', 1).fieldData.Related, 'synthetic');
  assert.deepEqual(values(), ['one', 'two']);
  assert.equal((await script('Call')).result, '0|read');
  assert.equal((await script('Open')).result, '0');
  // Compare against the existing missing-file behavior, rather than inventing native client error codes.
  a.resolveFile = () => undefined;
  const missingCall = (await script('Call')).result;
  const missingOpen = (await script('Open')).result;
  a.resolveFile = (name) => name === 'B' ? b : undefined;
  b.setFileAccess({ protect: true, sameHost: true }, 'Admin');
  for (let n = 0; n < 3; n++) {
    assert.equal(a.get('Parents', 1).fieldData.Related, '');
    assert.deepEqual(values(), []);
    assert.equal((await script('Call')).result, missingCall);
    assert.equal((await script('Open')).result, missingOpen);
  }
  assert.equal(secondFileSqlRefusal(a.privileges('Admin'), b, a), 'Unable to open file');
  assert.equal(missingCall, '100|');
  assert.equal(missingOpen, '100');
  assert.throws(() => a.find('External', {}), /not hosted|not open|missing/i);
  assert.equal(logs.filter((line) => line.includes('requires authorization before')).length, 1);
  const warnings = await host.logs!.read('Event', { type: 'Warning', q: 'requires authorization before' });
  assert.equal(warnings.entries.length, 1);
  b.authorizeFile(a, 'Admin');
  assert.equal(secondFileSqlRefusal(a.privileges('Admin'), b, a), undefined);
  assert.equal(a.get('Parents', 1).fieldData.Related, 'synthetic');
  assert.equal(a.find('External', {}).records.length, 1);
  assert.deepEqual(values(), ['one', 'two']);
  assert.equal((await script('Call')).result, '0|read');
  assert.equal((await script('Open')).result, '0');
});

test('REST and MCP require Full Access for all five operations and in both files for authorization', async (t) => {
  const { a, b, login, rest, mcp } = await setup(t);
  const designer = await login('B', 'Designer', 'design-password');
  const operations = [
    ['', 'get_file_access', {}], ['set', 'set_file_access', { protect: true, sameHost: true }],
    ['authorize', 'authorize_file', { file: 'A' }], ['remove', 'deauthorize_file', { fileId: a.fileId }],
    ['reset', 'reset_file_access_id', {}],
  ] as const;
  for (const [operation, tool, body] of operations) {
    assert.equal((await rest(designer, operation, body)).status, 403);
    const result = await mcp(tool, body, 'Designer', 'design-password');
    assert.ok(result.result?.isError || result.error, JSON.stringify(result));
    assert.match(JSON.stringify(result), /[Pp]rivilege|[Ff]ull [Aa]ccess/);
  }
  const admin = await login('B');
  assert.equal((await rest(admin, 'set', { protect: true, sameHost: true })).status, 200);
  assert.equal((await rest(admin, 'authorize', { file: 'A' })).status, 200);
  assert.ok(b.allowsReferenceFrom(a));
  assert.equal((await rest(admin, 'remove', { fileId: a.fileId })).status, 200);
  assert.equal(b.allowsReferenceFrom(a), false);
  const authorized = await mcp('authorize_file', { file: 'A' });
  assert.equal(authorized.result?.isError, undefined, JSON.stringify(authorized));
  assert.ok(b.allowsReferenceFrom(a));
  for (const [tool, body] of [
    ['get_file_access', {}], ['set_file_access', { protect: true, sameHost: false }],
    ['deauthorize_file', { fileId: a.fileId }], ['reset_file_access_id', {}],
  ] as const) {
    const answer = await mcp(tool, body);
    assert.equal(answer.result?.isError, undefined, JSON.stringify(answer));
    assert.ok(answer.result?.content?.[0]?.text);
  }
  const beforeReset = b.fileId, kept = b.fileAccess().authorized;
  assert.equal((await rest(admin, 'reset')).status, 200);
  assert.notEqual(b.fileId, beforeReset);
  assert.deepEqual(b.fileAccess().authorized, kept);
  assert.equal((await rest(admin)).body.fileId, b.fileId);
  assert.equal((await rest(admin, 'set', { protect: 'false', sameHost: false })).status, 400);
  assert.equal(b.fileAccess().protect, true);
  a.setPassword('BackupAdmin', 'backup-password', '[Full Access]');
  a.setPassword('Admin', 'admin-password', 'Designer');
  assert.equal((await rest(admin, 'authorize', { file: 'A' })).status, 403);
  assert.equal((await mcp('authorize_file', { file: 'A' })).result?.isError, true);
});

test('authorized references still enforce the data file record privileges', async (t) => {
  const { a, b, login } = await setup(t);
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  b.authorizeFile(a, 'Admin');
  b.savePrivilegeSet({ ...b.privilegeSet('Designer')!, records: { view: false, edit: false, create: false, delete: false } });
  await login('A', 'Designer', 'design-password');
  assert.throws(() => a.find('External', { privileges: a.privileges('Designer') }), { code: 200 });
  assert.equal(a.get('Parents', 1, 'us', undefined, a.privileges('Designer')).fieldData.Related, '');
});


test('1,000 related reads reuse File Access metadata and retained layouts lose authorization', async (t) => {
  const { a, b } = await setup(t);
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  b.authorizeFile(a, 'Admin');
  const layout = a.layout('External');
  const occurrence = a.occurrence('External');
  let reads = 0;
  const prepare = b.sql.prepare.bind(b.sql);
  t.mock.method(b.sql, 'prepare', (sql: string) => {
    const statement = prepare(sql);
    return new Proxy(statement, { get(target, key) {
      const value = Reflect.get(target, key);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        if (/FROM _fm_meta\b/.test(sql) && ['get', 'all', 'iterate'].includes(String(key))) reads++;
        return Reflect.apply(value, target, args);
      };
    } });
  });
  for (let i = 0; i < 1000; i++) assert.equal(a.get('Parents', 1).fieldData.Related, 'synthetic');
  assert.ok(reads < 10, `metadata reads: ${reads}`);
  b.deauthorizeFile(a.fileId, 'Admin');
  assert.throws(() => a.find(layout, {}), { code: 100 });
  assert.throws(() => b.find(occurrence, {}), { code: 100 });
  assert.throws(() => a.occurrence('External'), { code: 100 });
});

test('hosting a renamed copy remembers both names and preserves the identity grant', async (t) => {
  const { a, b, host } = await setup(t);
  b.authorizeFile(a, 'Admin');
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  const path = join(host.dir, 'Renamed' + STORE_EXT);
  await a.backup(path);
  const renamed = host.add(path, 'trusted');
  assert.equal(renamed.resolveFile('B'), b);
  assert.deepEqual(b.fileAccess().authorized.find((entry) => entry.fileId === a.fileId)?.names, ['A', 'Renamed']);
  assert.equal(b.securityEvents().find((entry) => entry.kind === 'file-access-name-updated')?.account, '[host]');
});


test('an already-open live stream loses cross-file record events on revocation', async (t) => {
  const { a, b, login } = await setup(t);
  await login('A');
  const visible = () => Live.prototype['visibleRecord'](a, b, 'Items', 1, a.privileges('Admin'), {} as Session);
  assert.equal(visible(), true);
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  assert.equal(visible(), false);
  b.authorizeFile(a, 'Admin');
  assert.equal(visible(), true);
  b.deauthorizeFile(a.fileId, 'Admin');
  assert.equal(visible(), false);
});

test('hosting a file records no name event for the file itself', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-file-access-self-'));
  createStore(join(dir, 'Solo' + STORE_EXT));
  new Store(join(dir, 'Solo' + STORE_EXT)).close();
  const host = new Host(dir, () => {});
  t.after(async () => { await host.close(); rmSync(dir, { recursive: true, force: true }); });
  assert.deepEqual(host.get('Solo')!.securityEvents().filter((entry) => entry.kind === 'file-access-name-updated'), []);
});
