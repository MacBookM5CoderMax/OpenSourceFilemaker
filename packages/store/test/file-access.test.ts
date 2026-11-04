import { narrowPrivileges } from '../src/token-scope.ts';
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, createStore, designText } from '../src/index.ts';

function files(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-file-access-'));
  const stores: Store[] = [];
  t.after(() => { for (const s of stores) s.close(); rmSync(dir, { recursive: true, force: true }); });
  const open = (name: string, path = join(dir, `${name}.sqlite`)) => {
    if (path === join(dir, `${name}.sqlite`)) createStore(path);
    const s = new Store(path, name);
    s.savePrivilegeSet({ name: 'Reader', records: { view: false, edit: false, create: false, delete: false }, layouts: 'none', valueLists: 'none', scripts: 'none', extendedPrivileges: [] });
    stores.push(s);
    return s;
  };
  return { a: open('A'), b: open('B'), open, dir };
}

test('File Access defaults to off, seeds self, and guards every assigned resolver', (t) => {
  const { a, b } = files(t);
  a.resolveFile = () => b;
  assert.equal(a.resolveFile('B'), b);
  assert.deepEqual(b.fileAccess().authorized.map((entry) => entry.fileId), [b.fileId]);
  b.setFileAccess({ protect: true, sameHost: true }, 'Admin');
  assert.equal(a.resolveFile('B'), undefined);
  b.authorizeFile(a, 'Admin');
  assert.equal(a.resolveFile('B'), b);
  b.deauthorizeFile(a.fileId, 'Admin');
  assert.equal(a.resolveFile('B'), undefined);
  b.setFileAccess({ protect: false, sameHost: false }, 'Admin');
  assert.equal(a.resolveFile('B'), b);
});

test('an explicit self data source follows the removable self-entry; local data remains available', (t) => {
  const { a } = files(t);
  a.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Value' }] }]);
  a.create('Items', { Value: 'local' });
  a.resolveFile = () => a;
  a.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  assert.equal(a.resolveFile('A'), a);
  a.deauthorizeFile(a.fileId, 'Admin');
  assert.equal(a.resolveFile('A'), undefined);
  assert.equal(a.find('Items', {}).records.length, 1);
});

test('only Full Access may manage protection, including Full Access in the referencing file', (t) => {
  const { a, b } = files(t);
  b.setPassword('Reader', 'read-password', 'Reader');
  for (const operation of [
    () => b.fileAccess('Reader'),
    () => b.setFileAccess({ protect: true, sameHost: false }, 'Reader'),
    () => b.authorizeFile(a, 'Reader'),
    () => b.deauthorizeFile(a.fileId, 'Reader'),
    () => b.resetFileAccessId('Reader'),
  ]) assert.throws(operation, { code: 9 });
  a.setPassword('Manager', 'manage-password', 'Reader');
  b.setPassword('Manager', 'manage-password', '[Full Access]');
  assert.throws(() => b.authorizeFile(a, 'Manager'), { code: 9 });
});


test('copies retain identity and grants; reset retains the list but invalidates grants to the old identity', async (t) => {
  const { a, b, open, dir } = files(t);
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  b.authorizeFile(a, 'Admin');
  const path = join(dir, 'copy.sqlite');
  await a.backup(path);
  const copy = open('Copy', path);
  assert.equal(copy.fileId, a.fileId);
  assert.ok(b.allowsReferenceFrom(copy));
  const before = b.fileAccess();
  const oldB = b.fileId;
  b.resetFileAccessId('Admin');
  assert.notEqual(b.fileId, oldB);
  assert.deepEqual(b.fileAccess(), before);
  const oldA = a.fileId;
  a.resetFileAccessId('Admin');
  assert.notEqual(a.fileId, oldA);
  assert.equal(b.allowsReferenceFrom(a), false);
  assert.equal(b.allowsReferenceFrom(copy), true);
  b.authorizeFile(a, 'Admin');
  assert.equal(b.allowsReferenceFrom(a), true);
});

test('renames retain grants and preserve both display names without exposing metadata in design exports', (t) => {
  const { a, b, open } = files(t);
  b.authorizeFile(a, 'Admin');
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  const renamed = open('Renamed', a.path);
  b.rememberFileAccessName(renamed);
  assert.equal(b.allowsReferenceFrom(renamed), true);
  assert.deepEqual(b.fileAccess().authorized.find((entry) => entry.fileId === a.fileId)?.names, ['A', 'Renamed']);
  const exported = [...designText({ schema: b.schema, layouts: b.designs().layouts, accounts: b.accounts(), privilegeSets: b.privilegeSets() }).values()].join('');
  assert.equal(exported.includes(a.fileId), false);
  assert.equal(exported.includes(b.fileId), false);
  assert.equal(exported.includes('fileAccess'), false);
  const fresh = open('Fresh');
  assert.deepEqual(fresh.fileAccess().authorized.map((entry) => entry.fileId), [fresh.fileId]);
});

test('metadata cache refreshes after peer writes, raw SQL and rollback without reusing a rolled-back version', (t) => {
  const { a, b, open } = files(t);
  const peer = open('Peer', b.path);
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  assert.equal(peer.allowsReferenceFrom(a), false);
  b.authorizeFile(a, 'Admin');
  assert.equal(peer.allowsReferenceFrom(a), true);
  b.sql.exec('SAVEPOINT access_test');
  b.deauthorizeFile(a.fileId, 'Admin');
  assert.equal(b.allowsReferenceFrom(a), false);
  b.sql.exec('ROLLBACK TO access_test; RELEASE access_test');
  assert.equal(b.allowsReferenceFrom(a), true);
  const state = b.fileAccess();
  state.authorized = [];
  b.sql.prepare("UPDATE _fm_meta SET json = ? WHERE key = 'fileAccess'").run(JSON.stringify(state));
  assert.equal(peer.allowsReferenceFrom(a), false);
  const old = peer.fileId;
  b.resetFileAccessId('Admin');
  assert.notEqual(peer.fileId, old);
  b.sql.prepare("UPDATE _fm_meta SET json = ? WHERE key = 'fileAccess'").run('{}');
  assert.throws(() => peer.allowsReferenceFrom(a), /metadata is invalid/);
});

test('authorization state is returned as a copy and every mutation is audited with its account', (t) => {
  const { a, b } = files(t);
  b.fileAccess().authorized.length = 0;
  assert.equal(b.fileAccess().authorized.length, 1);
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  b.authorizeFile(a, 'Admin');
  b.deauthorizeFile(a.fileId, 'Admin');
  b.resetFileAccessId('Admin');
  const events = b.securityEvents().filter((entry) => entry.kind.startsWith('file-access-'));
  assert.equal(events.length, 4);
  assert.ok(events.every((entry) => entry.account === 'Admin'));
});


test('cached field names and explicit self layouts cannot bypass removed authorization', (t) => {
  const { a, b } = files(t);
  b.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Value' }] }]);
  a.resolveFile = () => b;
  a.applyDesign([{ op: 'createDataSource', name: 'B', paths: ['file:B'] }, { op: 'createOccurrence', name: 'External', file: 'B', externalTable: b.schema.tables[0].id }]);
  const occurrence = a.schema.tableOccurrences.find((to) => to.name === 'External')!;
  const marker = `⟨field:${occurrence.id}.${b.schema.tables[0].fields[0].id}⟩`;
  assert.equal(a.externalFieldNames(marker), 'External::Value');
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  assert.equal(a.externalFieldNames(marker), marker);
  b.resolveFile = () => b;
  b.applyDesign([{ op: 'createDataSource', name: 'Self', paths: ['file:B'] }, { op: 'createOccurrence', name: 'SelfItems', file: 'Self', externalTable: b.schema.tables[0].id }, { op: 'createLayout', name: 'SelfItems', occurrence: 'SelfItems' }]);
  const retained = b.layout('SelfItems');
  b.deauthorizeFile(b.fileId, 'Admin');
  assert.throws(() => b.find(retained, {}), { code: 100 });
});

test('failed audit writes roll back settings, grants and identity together', (t) => {
  const { a, b } = files(t);
  const state = b.fileAccess(), id = b.fileId;
  b.sql.exec("CREATE TRIGGER refuse_file_access_audit BEFORE INSERT ON _fm_audit WHEN NEW.kind LIKE 'file-access-%' BEGIN SELECT RAISE(ABORT, 'audit refused'); END");
  for (const operation of [
    () => b.setFileAccess({ protect: true, sameHost: true }, 'Admin'),
    () => b.authorizeFile(a, 'Admin'),
    () => b.deauthorizeFile(b.fileId, 'Admin'),
    () => b.resetFileAccessId('Admin'),
  ]) {
    assert.throws(operation, /audit refused/);
    assert.deepEqual(b.fileAccess(), state);
    assert.equal(b.fileId, id);
  }
});

test('a resolver can be saved and restored without bypassing protection or recursing', (t) => {
  const { a, b } = files(t);
  a.resolveFile = () => b;
  const original = a.resolveFile;
  a.resolveFile = () => undefined;
  a.resolveFile = original;
  assert.equal(a.resolveFile('B'), b);
  b.setFileAccess({ protect: true, sameHost: false }, 'Admin');
  assert.equal(original('B'), undefined);
  assert.equal(a.resolveFile('B'), undefined);
});


test('resetting File Access identity cannot widen a previously saved token layout ceiling', (t) => {
  const { a, open } = files(t);
  a.applyDesign([{ op: 'createTable', name: 'Allowed' }, { op: 'createTable', name: 'Hidden' }]);
  const ceilingId = a.fileId;
  const scoped = () => narrowPrivileges(a, a.privileges('Admin'), { layouts: ['Allowed'] }, ceilingId);
  assert.equal(scoped().layout('Hidden').layout, 'none');
  a.resetFileAccessId('Admin');
  assert.equal(scoped().layout('Hidden').layout, 'none');
  const reopened = open('Reopened', a.path);
  const restored = narrowPrivileges(reopened, reopened.privileges('Admin'), { layouts: ['Allowed'] }, ceilingId);
  assert.equal(restored.layout('Hidden').layout, 'none');
  assert.equal(restored.layout('Allowed').layout, 'modifiable');
});
