// Provisioning (SCIM) is a way in with a bearer token. A refused token is a failed sign-in and belongs in the Access log with
// the other ways in (OData, XML publishing, SQL, the PostgreSQL protocol), under the same per-minute cap; the answer to the
// caller stays one 401 that does not say which files exist. The token itself is never written.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from '../src/index.ts';

async function setup(t: TestContext) {
  const dir = mkdtempSync(join(import.meta.dirname, '.scim-access-log-'));
  const s = await serve({ dir, port: 0, watch: false, log: () => {} });
  t.after(async () => {
    s.server.closeAllConnections();
    await new Promise<void>((resolve) => s.server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });
  s.host.create('A');
  const issued = await fetch(`${s.url}/tabularius/admin/v1/scim/token`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-tabularius-admin': '1' }, body: JSON.stringify({ database: 'A' }),
  });
  const token = (await issued.json() as { token: string }).token;
  const call = (file: string, bearer?: string) => fetch(`${s.url}/tabularius/scim/v2/databases/${file}/Users`, { headers: bearer ? { authorization: `Bearer ${bearer}` } : {} });
  const access = async (patterns: RegExp[]) => {
    const deadline = Date.now() + 10_000;
    let text = '';
    while (Date.now() < deadline) {
      try { text = readFileSync(join(dir, 'Logs', 'Access.log'), 'utf8'); } catch { /* not created yet */ }
      if (patterns.every((p) => p.test(text))) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    return text;
  };
  return { token, call, access };
}

test('a refused provisioning token is a failed sign-in in the Access log, and a good one is logged once', async (t) => {
  const { token, call, access } = await setup(t);
  const wrong = 'ohsc_' + 'not-the-token';
  assert.equal((await call('A', wrong)).status, 401);
  assert.equal((await call('A')).status, 401);
  assert.equal((await call('Nope', token)).status, 401);
  for (let i = 0; i < 3; i++) assert.equal((await call('A', token)).status, 200);
  const text = await access([
    /Someone could not sign in to A through SCIM provisioning: the provisioning token is wrong, expired or revoked/,
    /Someone could not sign in to A through SCIM provisioning: no provisioning token was sent/,
    /Someone could not sign in to Nope through SCIM provisioning: this server hosts no such file/,
    /SCIM signed in to A \(SCIM provisioning\)/,
  ]);
  assert.match(text, /Someone could not sign in to A through SCIM provisioning: the provisioning token is wrong, expired or revoked/);
  assert.match(text, /Someone could not sign in to A through SCIM provisioning: no provisioning token was sent/);
  assert.match(text, /Someone could not sign in to Nope through SCIM provisioning: this server hosts no such file/);
  assert.equal(text.match(/SCIM signed in to A \(SCIM provisioning\)/g)?.length, 1, 'three good requests, one line');
  assert.ok(!text.includes(token) && !text.includes(wrong), 'no token is written to the log');
});

test('failed provisioning sign-ins share the per-minute cap of the other ways in', async (t) => {
  const { call, access } = await setup(t);
  for (let i = 0; i < 45; i++) assert.equal((await call('A', 'ohsc_' + 'guess' + i)).status, 401);
  await access([/could not sign in to A through SCIM provisioning/]);
  await new Promise((r) => setTimeout(r, 300)); // the log writer is asynchronous: let every line that will be written arrive
  const text = await access([]);
  assert.equal(text.match(/could not sign in to A through SCIM provisioning/g)?.length, 30, '45 refusals, at most 30 lines in a minute');
});
