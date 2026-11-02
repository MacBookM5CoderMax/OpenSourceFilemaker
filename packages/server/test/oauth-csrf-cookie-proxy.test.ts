// The OAuth approval page's anti-forgery cookie: the __Host- name with Secure wherever the browser's connection is HTTPS,
// which includes a TLS-terminating proxy on this computer that says so (the console's cookie already does this).
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../src/index.ts';

async function start(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-oauth-csrf-proxy-'));
  const s = await serve({ dir, port: 0, watch: false, log: () => {} });
  t.after(async () => {
    await new Promise<void>((r) => s.server.close(() => r()));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });
  const store = s.host.create('Local');
  store.savePrivilegeSet({ name: 'Bot', records: { view: true, edit: false, create: false, delete: false }, layouts: 'viewOnly', valueLists: 'viewOnly', scripts: 'none', extendedPrivileges: ['fmmcp'] });
  store.setPassword('Ann', 'secret-passphrase-1', 'Bot');
  return s.url;
}

async function approvalRequest(base: string) {
  const redirect = 'https://app.example/callback';
  const registered = await fetch(`${base}/oauth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Cookie test', redirect_uris: [redirect] }) });
  assert.equal(registered.status, 201);
  const { client_id } = await registered.json();
  const verifier = 'b'.repeat(43);
  return {
    client_id, redirect_uri: redirect, response_type: 'code',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  };
}

test('on plain HTTP the approval cookie keeps its plain name, limited to the approval path, with no Secure', async (t) => {
  const base = await start(t);
  const fields = await approvalRequest(base);
  const page = await fetch(`${base}/oauth/authorize?${new URLSearchParams(fields)}`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('set-cookie') ?? '', /^tabularius_oauth_csrf=[\w-]{43}; Path=\/oauth\/authorize; HttpOnly; SameSite=Strict; Max-Age=600$/);
});

test('behind a proxy on this computer that says https the approval cookie is __Host- and Secure, and the sign-in works with it', async (t) => {
  const base = await start(t);
  const fields = await approvalRequest(base);
  const https = { 'x-forwarded-proto': 'https' };
  const page = await fetch(`${base}/oauth/authorize?${new URLSearchParams(fields)}`, { headers: https });
  assert.equal(page.status, 200);
  const cookie = page.headers.get('set-cookie') ?? '';
  assert.match(cookie, /^__Host-tabularius_oauth_csrf=[\w-]{43}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=600; Secure$/);
  const csrf = /name="csrf" value="([^"]+)"/.exec(await page.text())?.[1] ?? '';
  const answer = (headers: Record<string, string>) => fetch(`${base}/oauth/authorize`, {
    method: 'POST', redirect: 'manual', headers,
    body: new URLSearchParams({ ...fields, csrf, database: 'Local', account: 'Ann', password: 'secret-passphrase-1' }),
  });
  // The plain name does not stand in for it once the connection is HTTPS.
  assert.equal((await answer({ ...https, cookie: cookie.replace('__Host-', '').split(';')[0] })).status, 400);
  const signedIn = await answer({ ...https, cookie: cookie.split(';')[0] });
  assert.equal(signedIn.status, 302, await signedIn.text());
  assert.ok(new URL(signedIn.headers.get('location')!).searchParams.get('code'));
});

test('a proxy that says plain http is not https', async (t) => {
  const base = await start(t);
  const fields = await approvalRequest(base);
  const page = await fetch(`${base}/oauth/authorize?${new URLSearchParams(fields)}`, { headers: { 'x-forwarded-proto': 'http' } });
  assert.match(page.headers.get('set-cookie') ?? '', /^tabularius_oauth_csrf=/);
});
