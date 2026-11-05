// Invalid names must be refused before SQLite can store text that reads back as another identity.
// Unexpected SCIM faults belong in the server log, not in the provisioning response.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { accountNameProblem } from '../../store/src/security-names.ts';
import { ScimDirectory, ScimEndpoint } from '../src/scim.ts';
import { FAULT_MESSAGE } from '../src/fault-log.ts';
import { Host } from '../src/host.ts';
import { DataApi } from '../src/dataapi.ts';

const READER = { name: 'Reader', records: { view: true, edit: false, create: false, delete: false }, layouts: 'viewOnly', valueLists: 'none', scripts: 'none', extendedPrivileges: ['fmrest'] } as const;

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-account-names-'));
  const path = join(dir, 'Names.openhbam.sqlite');
  createStore(path);
  const store = new Store(path);
  store.savePrivilegeSet(READER as never);
  store.createAccount('boss', 'correct horse battery staple', 'Reader');
  return { dir, store };
}

const stored = (store: Store) => (store.sql.prepare('SELECT hex(name) AS h FROM _fm_accounts ORDER BY rowid').all() as { h: string }[]).map((r) => r.h);
const BAD = ['boss\u0000@c.test', 'a\u0007b@c.test', 'a\u001bb@c.test', 'a\u0085b@c.test', 'a\u007fb@c.test', 'a\ud800b@c.test', 'a\udc00b@c.test', `${'x'.repeat(250)}@c.test`];

test('accountNameProblem refuses controls, invalid Unicode and over-long names, and accepts ordinary ones', () => {
  for (const name of BAD) assert.ok(accountNameProblem(name), JSON.stringify(name));
  for (const name of ['boss', 'Zoë Müller', 'a b', 'o\'brien@example.test', '山田', `${'x'.repeat(249)}@c.test`, '[Guest]', '=name', '+name', '-name', '@name', ' name ', '😀']) {
    assert.equal(accountNameProblem(name), undefined, name);
  }
});

test('every account creation path refuses invalid names without changing existing accounts', (t) => {
  const { dir, store } = setup();
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const before = stored(store);
  for (const name of BAD) {
    assert.throws(() => store.addProvisionedAccount(name, 'SCIM'), /control characters|valid Unicode|256 characters/, JSON.stringify(name));
    assert.throws(() => store.setExternalAccount(name, 'Reader'), /control characters|valid Unicode|256 characters/);
    assert.throws(() => store.setAgentAccount(name, 'Reader'), /control characters|valid Unicode|256 characters/);
    assert.throws(() => store.setPassword(name, 'correct horse battery staple', 'Reader'), /control characters|valid Unicode|256 characters/);
    assert.throws(() => store.createAccount(name, 'correct horse battery staple', 'Reader'), /control characters|valid Unicode|256 characters/);
    assert.throws(() => store.createLocalAccount(name, 'Reader', true), /invalid-account-name/);
  }
  assert.deepEqual(stored(store), before, 'no row was added');
  assert.equal(store.accounts().filter((a) => a.name === 'boss').length, 1);
  store.addProvisionedAccount('zoe@example.test', 'SCIM');
  assert.ok(store.accounts().some((a) => a.name === 'zoe@example.test'));
});

test('SCIM refuses invalid userName with invalidValue and logs unexpected faults without quoting them', async (t: TestContext) => {
  const { dir, store } = setup();
  const host = new Host(dir, () => {}, { background: false });
  const endpoint = new ScimEndpoint(host, new DataApi(host));
  const server = createServer((req, res) => {
    void endpoint.handle(req, res, new URL(req.url!, 'http://localhost'));
  });
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await host.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const token = new ScimDirectory(host.get('Names')!).issueToken();
  const before = stored(store);
  const call = async (method: string, path: string, body?: unknown) => {
    const r = await fetch(`${base}/tabularius/scim/v2/databases/Names${path}`, { method, headers: { 'content-type': 'application/scim+json', authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, body: await r.json() as { detail?: string; scimType?: string } };
  };
  for (const userName of BAD) {
    const made = await call('POST', '/Users', { userName });
    assert.equal(made.status, 400, JSON.stringify(userName));
    assert.equal(made.body.scimType, 'invalidValue');
    assert.doesNotMatch(made.body.detail ?? '', /Cannot read properties/);
  }
  assert.deepEqual(stored(store), before, 'nothing was stored');
  assert.equal((await call('POST', '/Users', { userName: 'zoe@example.test' })).status, 201);
  const logged: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => { logged.push(args); });
  t.mock.method(ScimDirectory.prototype, 'rows', () => { throw new TypeError("Cannot read properties of undefined (reading 'secret-detail')"); });
  const fault = await call('GET', '/Users');
  assert.equal(fault.status, 500);
  assert.equal(fault.body.detail, FAULT_MESSAGE);
  assert.ok(logged.some((args) => args.join(' ').includes('secret-detail')), 'the cause is in the server log');
});

test('invalid Unicode cannot alias an existing account before an upsert validates the name', (t) => {
  const { dir, store } = setup();
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.createAccount('local\ufffd@example.test', 'correct horse battery staple', 'Reader');
  store.setExternalAccount('external\ufffd@example.test', 'Reader');
  store.setAgentAccount('agent\ufffd@example.test', 'Reader');
  const snapshot = () => store.sql.prepare('SELECT * FROM _fm_accounts ORDER BY rowid').all();
  const before = snapshot();
  for (const surrogate of ['\ud800', '\udc00']) {
    assert.throws(() => store.setPassword(`local${surrogate}@example.test`, 'another sufficiently long password', 'Reader'), /valid Unicode/);
    assert.throws(() => store.setExternalAccount(`external${surrogate}@example.test`, 'Reader'), /valid Unicode/);
    assert.throws(() => store.setAgentAccount(`agent${surrogate}@example.test`, 'Reader', { needsApproval: true }), /valid Unicode/);
    assert.deepEqual(snapshot(), before, 'credentials, privileges and approval state are unchanged');
  }
});
