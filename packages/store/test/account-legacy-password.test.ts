import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store, StoreError } from '../src/index.ts';

function open(t: TestContext): Store {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-legacy-password-'));
  const path = join(dir, 'Accounts.sqlite');
  createStore(path);
  const store = new Store(path);
  t.after(() => store.close());
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return store;
}

for (const [kind, name] of [['tab', 'legacy\tname'], ['NUL', 'legacy\0name']]) {
  test(`an existing account containing a ${kind} can have its password set and reset`, (t) => {
    const store = open(t);
    store.sql.prepare("INSERT INTO _fm_accounts (name, source) VALUES (?, 'openhbam')").run(name);
    store.setPassword(name, 'first password');
    assert.equal(store.verify(name, 'first password'), true);
    store.setPassword(name, 'second password');
    assert.equal(store.verify(name, 'second password'), true);
    assert.equal(store.verify(name, 'first password'), false);
  });
}

test('a NUL suffix cannot change the password of its prefix account', (t) => {
  const store = open(t);
  store.setPassword('admin', 'old password');
  assert.throws(() => store.setPassword('admin\0x', 'new password'),
    (e: unknown) => e instanceof StoreError && e.code === 960);
  assert.equal(store.verify('admin', 'old password'), true);
  assert.equal(store.verify('admin', 'new password'), false);
});

test('a lone surrogate cannot change the password of a replacement-character account', (t) => {
  const store = open(t);
  store.setPassword('name\ufffd', 'old password');
  for (const name of ['name\ud800', 'name\udc00']) {
    assert.throws(() => store.setPassword(name, 'new password'),
      (e: unknown) => e instanceof StoreError && e.code === 960);
  }
  assert.equal(store.verify('name\ufffd', 'old password'), true);
  assert.equal(store.verify('name\ufffd', 'new password'), false);
});

test('setting a password cannot create an account with an invalid new name', (t) => {
  const store = open(t);
  const before = store.sql.prepare('SELECT COUNT(*) AS n FROM _fm_accounts').get();
  for (const name of ['new\tname', 'new\0name', 'new\u007f', 'new\u009f', 'new\ud800', 'x'.repeat(257)]) {
    assert.throws(() => store.setPassword(name, 'new password'),
      (e: unknown) => e instanceof StoreError && e.code === 960);
  }
  assert.deepEqual(store.sql.prepare('SELECT COUNT(*) AS n FROM _fm_accounts').get(), before);
});

test('two legacy names that compare equal under NOCASE (same length, different after a NUL) are never written together, and a refused call writes nothing', (t) => {
  const store = open(t);
  const snapshot = () => JSON.stringify(store.sql.prepare('SELECT CAST(name AS BLOB) AS name, password_hash, password_changed, password_disabled, must_change FROM _fm_accounts ORDER BY rowid').all().map((r) => ({ ...r, name: Buffer.from(r.name as Uint8Array).toString('hex') })));
  store.sql.prepare("INSERT INTO _fm_accounts (name, source) VALUES (?, 'openhbam')").run('ab\0x');
  let both = 1;
  try { store.sql.prepare("INSERT INTO _fm_accounts (name, source) VALUES (?, 'openhbam')").run('ab\0y'); both = 2; } catch { /* the table refused the second name: the collision cannot be built, nothing more to prove */ }
  const before = snapshot();
  const count = Number((store.sql.prepare("SELECT COUNT(*) AS n FROM _fm_accounts WHERE hex(name) LIKE '6162%'").get() as { n: number }).n);
  if (count === 2) {
    assert.throws(() => store.setPassword('ab\0x', 'a new password'), (e: unknown) => e instanceof StoreError && e.code === 960);
    assert.equal(snapshot(), before, 'a refused call changed a row');
    assert.equal(store.sql.prepare("SELECT COUNT(*) AS n FROM _fm_accounts WHERE hex(name) LIKE '6162%' AND password_hash IS NOT NULL").get()!.n, 0, 'a password landed on one of the two accounts');
    assert.throws(() => store.setPassword('ab\0y', 'another password'), (e: unknown) => e instanceof StoreError && e.code === 960);
    assert.equal(snapshot(), before);
  } else {
    // Only one row can exist: setting its password writes that row and nothing else.
    store.setPassword('ab\0x', 'a new password');
    assert.equal(store.verify('ab\0x', 'a new password'), true);
  }
  void both;
});
