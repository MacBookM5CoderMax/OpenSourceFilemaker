// What the programs' side of the server says about caching and content type: no cache keeps an answer about records,
// accounts or tokens, and the browser does not guess its type, unless the route says otherwise.
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../src/index.ts';
import { API_PATH } from '../src/exposure-headers.ts';

async function start(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-api-headers-'));
  const s = await serve({ dir, port: 0, watch: false, log: () => {} });
  t.after(async () => {
    await new Promise<void>((r) => s.server.close(() => r()));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });
  const store = s.host.create('Local');
  store.savePrivilegeSet({ name: 'Api', records: { view: true, edit: true, create: true, delete: false }, layouts: 'viewOnly', valueLists: 'viewOnly', scripts: 'none', extendedPrivileges: ['fmrest', 'fmodata'] });
  store.setPassword('Ann', 'secret-passphrase-1', 'Api');
  return s.url;
}

const basic = 'Basic ' + Buffer.from('Ann:secret-passphrase-1').toString('base64');

test('Data API, OData, SCIM, /mcp and the product routes answer no-store and nosniff, whether they succeed or refuse', async (t) => {
  const base = await start(t);
  const answers: [string, Response][] = [];
  const get = async (path: string, headers: Record<string, string> = {}) => answers.push([`GET ${path}`, await fetch(`${base}${path}`, { headers })]);
  const login = await fetch(`${base}/fmi/data/vLatest/databases/Local/sessions`, { method: 'POST', headers: { authorization: basic, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(login.status, 200, 'the sign-in that hands out a session token');
  // Read once, without clone(): on Node 22.20 (undici 6.21) a clone that is garbage collected cancels the
  // original's body, so reading the original afterwards fails as "Body has already been read".
  const token = (await login.json()).response.token as string;
  answers.push(['POST sessions', login]);
  await get('/fmi/data/vLatest/databases/Local/layouts', { authorization: `Bearer ${token}` });
  await get('/fmi/data/vLatest/databases/Nowhere/layouts', { authorization: `Bearer ${token}` });
  await get('/odata/v4/Local', { authorization: basic });
  await get('/odata/v4/Local/$metadata', { authorization: basic });
  await get('/scim/v2/Users');
  await get('/tabularius/auth/v1/providers');
  await get('/tabularius/no-such-route');
  answers.push(['POST /mcp', await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: '{}' })]);
  for (const [what, response] of answers) {
    assert.equal(response.headers.get('cache-control'), 'no-store', what);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', what);
    if (!response.bodyUsed) await response.arrayBuffer();
  }
});

test('a route that says its own caching keeps it, and the pages and sign-in routes are left alone', async (t) => {
  const base = await start(t);
  const openApi = await fetch(`${base}/fmi/data/openapi.json`);
  assert.equal(openApi.headers.get('cache-control'), 'public, max-age=300');
  await openApi.arrayBuffer();
  const container = await fetch(`${base}/tabularius/containers/Local/1`);
  assert.equal(container.headers.get('cache-control'), 'private, no-store');
  await container.arrayBuffer();
  const page = await fetch(`${base}/app/`);
  assert.equal(page.headers.get('cache-control'), 'no-cache');
  await page.arrayBuffer();
  const docs = await fetch(`${base}/docs`);
  assert.notEqual(docs.headers.get('cache-control'), 'no-store');
  await docs.arrayBuffer();
});

test('which paths count as the programs\' side', () => {
  for (const path of ['/fmi/data/vLatest/databases', '/fmi/admin/api/v2/server/metadata', '/odata/v4/x', '/scim/v2/Users', '/mcp', '/mcp/', '/tabularius/admin/v1/status']) assert.ok(API_PATH.test(path), path);
  for (const path of ['/', '/app/', '/admin/', '/docs', '/docs/connecting', '/oauth/token', '/mcpx', '/fmi', '/tabularius', '/.well-known/oauth-authorization-server']) assert.ok(!API_PATH.test(path), path);
});
