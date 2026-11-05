// A PostgreSQL connection is signed in once, with a password, and then lives for as long as the client keeps it. An
// administrator who resets a password because it leaked expects that connection to stop answering; the file's other
// long-lived credentials (the older MCP tokens) already stop working when the password changes. Every statement
// re-reads the account's credential (identity and password hash) and refuses, with SQLSTATE 28000, once it differs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Host } from '../src/host.ts';
import { PgServer } from '../src/pgwire.ts';
import { createStore } from '../../store/src/index.ts';
import { PgClient } from './pg-client.ts';

async function setup(t: import('node:test').TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-pg-password-change-'));
  createStore(join(dir, 'Shop.openhbam.sqlite'), { mode: 'native' });
  const host = new Host(dir), pg = new PgServer(host, { port: 0 });
  const store = host.get('Shop')!;
  store.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Name' }] }]);
  store.create('Items', { Name: 'one' });
  const full = store.privilegeSets().find((p) => p.id === 1)!;
  store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmxdbc'] });
  const first = 'first-password-' + 'abc123', second = 'second-password-' + 'xyz789';
  store.setPassword('Boss', first, full.name);
  store.setPassword('Other', first, full.name);
  const port = await pg.listen();
  const clients: PgClient[] = [];
  t.after(async () => { for (const c of clients) c.close(); pg.close(); await host.close(); rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); });
  const open = async (user: string, password: string) => { const c = await PgClient.open({ port, user, password, database: 'Shop' }); clients.push(c); return c; };
  return { store, open, first, second, full };
}

test('a connection stops answering when its account\'s password is changed, and a new sign-in works', async (t) => {
  const { store, open, first, second, full } = await setup(t);
  const boss = await open('Boss', first);
  const other = await open('Other', first);
  assert.equal((await boss.simple('SELECT Name FROM Items')).rows.length, 1);
  assert.equal((await other.simple('SELECT Name FROM Items')).rows.length, 1);
  store.setPassword('Boss', second, full.name);
  const refused = await boss.simple('SELECT Name FROM Items');
  assert.equal(refused.error?.code, '28000', JSON.stringify(refused.error));
  assert.match(refused.error!.message, /password of this account has changed; sign in again/);
  assert.equal(refused.rows.length, 0);
  // A statement the session answers itself is refused too.
  assert.equal((await boss.simple('BEGIN')).error?.code, '28000');
  // Another account's connection is not touched, and the same account signs in again with the new password.
  assert.equal((await other.simple('SELECT Name FROM Items')).rows.length, 1);
  const again = await open('Boss', second);
  assert.equal((await again.simple('SELECT Name FROM Items')).rows.length, 1);
});

test('setting the same password again ends the connection too, as for a Data API session; other work and another account\'s change do not', async (t) => {
  const { store, open, first, full } = await setup(t);
  const boss = await open('Boss', first);
  store.create('Items', { Name: 'two' });
  store.setPassword('Other', 'another-password-' + '12345', full.name);
  assert.equal((await boss.simple('SELECT Name FROM Items')).rows.length, 2);
  store.setPassword('Boss', first, full.name);
  assert.equal((await boss.simple('SELECT Name FROM Items')).error?.code, '28000');
});
