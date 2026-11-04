// Data API apps signing people in through an identity provider, the FileMaker Server way
// (oauthproviderinfo, getoauthurl, then X-FM-Data-OAuth-* on the session log in), against
// a stand-in OpenID Connect provider.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { serve } from '../src/index.ts';
import { ServerLogs } from '../src/server-logs.ts';
import { STORE_EXT } from '../src/host.ts';
import { expiryClock } from '../../store/src/clock.ts';
import { createStore, Store } from '../../store/src/index.ts';

const password = ['source', 'password'].join('-');
let dir: string;
let server: Server;
let idp: Server;
let base: string;
let issuer: string;
let store: Store;
const allowedReturnUrls = ['https://app.example.com/back', 'http://127.0.0.1:5000', 'http://localhost:5000/cb'];

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
/** What the provider says about the next person to sign in. */
let person: Record<string, unknown> = {};
const codes = new Map<string, { nonce: string; challenge: string }>();

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
function idToken(claims: Record<string, unknown>): string {
  const head = `${b64({ alg: 'RS256', kid: 'k1', typ: 'JWT' })}.${b64(claims)}`;
  return `${head}.${sign('sha256', Buffer.from(head), privateKey).toString('base64url')}`;
}

// serve checks folder ownership through an OS process-identity utility. All other machine commands are stubs.
let stubPath: string;
const oldPath = process.env.PATH;
const oldMarker = process.env.TABULARIUS_TEST_COMMAND_MARKER;
before(() => {
  stubPath = mkdtempSync(join(tmpdir(), 'tabularius-oauth-commands-'));
  process.env.TABULARIUS_TEST_COMMAND_MARKER = join(stubPath, 'unexpected-command');
  for (const command of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    writeFileSync(join(stubPath, command), '#!/bin/sh\nprintf blocked >> "$TABULARIUS_TEST_COMMAND_MARKER"\nexit 99\n', { mode: 0o755 });
    writeFileSync(join(stubPath, command + '.cmd'), '@echo off\r\necho blocked >> "%TABULARIUS_TEST_COMMAND_MARKER%"\r\nexit /b 99\r\n');
  }
  process.env.PATH = stubPath;
});

before(async () => {
  idp = createServer(async (req, res) => {
    const url = new URL(req.url!, issuer);
    const send = (body: unknown, status = 200) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    if (url.pathname === '/.well-known/openid-configuration') {
      send({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks` });
    } else if (url.pathname === '/jwks') {
      send({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'k1', use: 'sig', alg: 'RS256' }] });
    } else if (url.pathname === '/token') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const form = new URLSearchParams(body);
      const c = codes.get(form.get('code') ?? '');
      const verifier = form.get('code_verifier') ?? '';
      if (!c || createHash('sha256').update(verifier).digest('base64url') !== c.challenge || form.get('client_id') !== 'tabularius') {
        send({ error: 'invalid_grant' }, 400);
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      send({ id_token: idToken({ iss: issuer, aud: 'tabularius', sub: 'u1', exp: now + 300, iat: now, nonce: c.nonce, ...person }) });
    } else send({ error: 'not found' }, 404);
  });
  await new Promise<void>((r) => idp.listen(0, '127.0.0.1', r));
  issuer = `http://127.0.0.1:${(idp.address() as { port: number }).port}`;

  dir = mkdtempSync(join(tmpdir(), 'tabularius-'));
  const open = (name: string) => {
    createStore(join(dir, name + STORE_EXT));
    return new Store(join(dir, name + STORE_EXT), name);
  };
  const b = open('B');
  b.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Title' }] }]);
  b.create('Items', { Title: 'from B' });
  const items = b.schema.tables.find((t) => t.name === 'Items')!;
  const table = items.id;
  const title = items.fields.find((f) => f.name === 'Title')!.id;
  b.savePrivilegeSet({ name: 'Reader', records: { view: 'Title = "from B"', edit: false, create: false, delete: false }, layouts: 'viewOnly', valueLists: 'viewOnly', scripts: 'none', extendedPrivileges: ['fmrest'] } as never);
  b.create('Items', { Title: 'hidden' });
  b.setExternalAccount('@example.com', 'Reader');
  b.close();
  const a = open('A');
  a.applyDesign([
    { op: 'createDataSource', name: 'B', paths: ['file:B'] },
    { op: 'createOccurrence', name: 'BItems', file: 'B', externalTable: table },
    { op: 'createLayout', name: 'External', occurrence: 'BItems' },
  ]);
  const ext = a.schema.tableOccurrences.find((t) => t.name === 'BItems')!.id;
  a.applyDesign([{ op: 'updateLayout', layout: 'External', design: { objects: [{
    id: 101, kind: 'field', type: 1, anchors: { left: true, top: true, right: false, bottom: false }, style: {}, bounds: { top: 20, left: 20, bottom: 40, right: 300 },
    field: { tableOccurrenceId: ext, fieldId: title, tableOccurrence: 'BItems', field: 'Title', display: 'edit', repetitions: 1 },
  } as never], tableView: [] } }]);
  // Ann has no account in B.
  a.setPassword('Ann', password, '[Full Access]');
  a.setExternalAccount('@example.com', '[Full Access]');
  a.close();
  const s = await serve({ dir, port: 0, watch: false, log: () => {}, trustedProxies: ['127.0.0.1'], proxyHeader: 'x-forwarded-for', oidc: { name: 'Test IdP', issuer, clientId: 'tabularius', dataApiReturnUrls: allowedReturnUrls } });
  server = s.server;
  base = s.url;
  store = s.host.get('B')!;
  person = { email: 'pat@example.com', email_verified: true };
});
after(async () => {
  // Closed (background warming stopped, files closed) before the folder is removed.
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  await new Promise<void>((r) => (idp ? idp.close(() => r()) : r()));
  if (dir) rmSync(dir, { recursive: true });
});

after(() => {
  try { assert.equal(existsSync(join(stubPath, 'unexpected-command')), false, 'a forbidden command ran'); }
  finally {
    if (oldPath === undefined) delete process.env.PATH; else process.env.PATH = oldPath;
    if (oldMarker === undefined) delete process.env.TABULARIUS_TEST_COMMAND_MARKER; else process.env.TABULARIUS_TEST_COMMAND_MARKER = oldMarker;
    rmSync(stubPath, { recursive: true, force: true });
  }
});


const appFetch = (url: string, options: RequestInit = {}) => fetch(url, { ...options, headers: { 'x-forwarded-for': '203.0.113.9', ...options.headers } });

const fmsHeaders = (returnUrl: string) => ({ 'x-fms-application-type': '9', 'x-fms-application-version': '15', 'x-fms-return-url': returnUrl });

/** getoauthurl, then the person signing in at the provider; returns the request id and where the browser is sent back. */
async function appSignIn(returnUrl = 'http://127.0.0.1:5000/', provider = 'Test IdP'): Promise<{ requestId: string; back: URL }> {
  const r = await appFetch(`${base}/oauth/getoauthurl?trackingID=t-42&provider=${encodeURIComponent(provider)}&address=127.0.0.1&X-FMS-OAuth-AuthType=2`, { headers: fmsHeaders(returnUrl) });
  assert.equal(r.status, 200, await r.clone().text());
  const requestId = r.headers.get('x-fms-request-id')!;
  assert.ok(requestId);
  const auth = new URL(await r.text());
  assert.equal(r.headers.get('x-fms-return-url'), auth.toString());
  assert.equal(auth.origin + auth.pathname, `${issuer}/authorize`);
  assert.equal(auth.searchParams.get('prompt'), 'select_account', 'the person picks the account: not finished unseen');
  const code = Math.random().toString(36).slice(2);
  codes.set(code, { nonce: auth.searchParams.get('nonce')!, challenge: auth.searchParams.get('code_challenge')! });
  const back = await appFetch(`${base}/tabularius/auth/v1/oidc/callback?code=${code}&state=${auth.searchParams.get('state')}`, { redirect: 'manual' });
  assert.equal(back.status, 302);
  return { requestId, back: new URL(back.headers.get('location')!) };
}

const login = (entries: unknown[], headers: Record<string, string> = {}, version = 'vLatest') => appFetch(`${base}/fmi/data/${version}/databases/A/sessions`, {
  method: 'POST', headers: { authorization: 'Basic ' + btoa(`Ann:${password}`), 'content-type': 'application/json', ...headers }, body: JSON.stringify({ fmDataSource: entries }),
});
const grant = async () => {
  const { requestId, back } = await appSignIn();
  return { database: 'B', oAuthRequestId: requestId, oAuthIdentifier: back.searchParams.get('identifier')! };
};
async function refused(r: Response, code = '212') {
  assert.equal(r.status, code === '960' ? 400 : 401);
  assert.equal(r.headers.get('x-fm-data-access-token'), null);
  const body = await r.json();
  assert.equal(body.messages[0].code, code);
  assert.equal(body.response.token, undefined);
}

test('OAuth fmDataSource uses the other file domain mapping and its read-only privileges in every version', async () => {
  for (const version of ['v1', 'v2', 'vLatest']) {
    const r = await login([await grant()], {}, version);
    assert.equal(r.status, 200, await r.clone().text());
    const token = r.headers.get('x-fm-data-access-token')!;
    const url = `${base}/fmi/data/${version}/databases/A/layouts/External/records`;
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const read = await appFetch(url, { headers }).then(r => r.json());
    assert.deepEqual(read.response.data.map((x: any) => x.fieldData.Title), ['from B']);
    const edit = await appFetch(url + '/1', { method: 'PATCH', headers, body: JSON.stringify({ fieldData: { Title: 'forbidden' } }) }).then(r => r.json());
    assert.equal(edit.messages[0].code, '200');
  }
});

test('malformed OAuth entries are all validated before any credentials or grants are checked', async (t) => {
  const verify = t.mock.method(Store.prototype, 'verifyAsync');
  const valid = await grant();
  for (const invalid of [
    { ...valid, username: 'Clerk', password },
    { ...valid, username: 'Clerk' }, { ...valid, password: '' },
    { database: 'B', oAuthRequestId: 'request' }, { database: 'B', oAuthIdentifier: 'identifier' },
    { ...valid, oAuthRequestId: '' }, { ...valid, oAuthIdentifier: 1 },
    { ...valid, oAuthRequestId: 'x'.repeat(16385) },
    { ...valid, oAuthIdentifier: 'x'.repeat(16385) },
  ]) await refused(await login([valid, invalid]), '960');
  assert.equal(verify.mock.callCount(), 0);
  assert.equal((await login([valid])).status, 200, 'validation did not consume the grant');
});

test('unknown, used, expired and repeated grants fail without success audits or a session', async (t) => {
  const used = await grant();
  assert.equal((await login([used])).status, 200);
  const expired = await grant();
  const now = expiryClock.now();
  const clock = t.mock.method(expiryClock, 'now', () => now + 300001);
  const audit = t.mock.method(Store.prototype, 'auditSignIn');
  await refused(await login([expired]));
  clock.mock.restore();
  await refused(await login([expired]));
  await refused(await login([used]));
  await refused(await login([{ database: 'B', oAuthRequestId: 'unknown', oAuthIdentifier: 'unknown' }]));
  const repeated = await grant();
  await refused(await login([repeated, repeated]));
  const main = await grant();
  const headers = { 'x-fm-data-oauth-request-id': main.oAuthRequestId, 'x-fm-data-oauth-identifier': main.oAuthIdentifier };
  await refused(await login([main], headers));
  assert.equal(audit.mock.calls.some(c => c.arguments[2] === true), false);
  const priorMain = await grant();
  assert.equal((await login([], { 'x-fm-data-oauth-request-id': priorMain.oAuthRequestId, 'x-fm-data-oauth-identifier': priorMain.oAuthIdentifier })).status, 200);
  audit.mock.resetCalls();
  await refused(await login([priorMain]));
  assert.equal(audit.mock.calls.some(c => c.arguments[2] === true), false);
});

test('an unmatched provider identity logs a Warning and fails like a wrong password', async (t) => {
  const logs = t.mock.method(ServerLogs.prototype, 'write');
  const audit = t.mock.method(Store.prototype, 'auditSignIn');
  person = { email: 'stranger@elsewhere.test', email_verified: true };
  try { await refused(await login([await grant()])); }
  finally { person = { email: 'pat@example.com', email_verified: true }; }
  assert.ok(logs.mock.calls.some(c => c.arguments[0] === 'Access' && c.arguments[1] === 'Warning' && String(c.arguments[3]).includes('no external account matches')));
  assert.equal(audit.mock.calls.some(c => c.arguments[2] === true), false);
});

test('data-source OAuth mapping revocation invalidates an existing session', async () => {
  const r = await login([await grant()]);
  assert.equal(r.status, 200);
  const token = r.headers.get('x-fm-data-access-token')!;
  store.setAccountActive('@example.com', false);
  try {
    const read = await appFetch(`${base}/fmi/data/vLatest/databases/A/layouts/External/records`, { headers: { authorization: `Bearer ${token}` } }).then(r => r.json());
    assert.equal(read.messages[0].code, '952');
  } finally { store.setAccountActive('@example.com', true); }
});

test('OAuth data sources enforce mapping second-factor requirements', async () => {
  store.setAccountRequire2fa('@example.com', true);
  try {
    const r = await login([await grant()]);
    assert.equal(r.status, 403);
    assert.equal((await r.json()).messages[0].code, '9');
    assert.equal(r.headers.get('x-fm-data-access-token'), null);
  } finally { store.setAccountRequire2fa('@example.com', false); }
});

test('OAuth data sources reject an unverified email even with a matching group', async () => {
  person = { email: 'pat@example.com', email_verified: false, groups: ['@example.com'] };
  try { await refused(await login([await grant()])); }
  finally { person = { email: 'pat@example.com', email_verified: true }; }
});

test('OAuth data sources refuse a local-only mapping from a remote client', async () => {
  store.setAccountLocalOnly('@example.com', true);
  try { await refused(await login([await grant()], { 'x-forwarded-for': '203.0.113.9' })); }
  finally { store.setAccountLocalOnly('@example.com', false); }
});

test('a replacement external mapping cannot inherit an OAuth data-source session', async () => {
  const r = await login([await grant()]);
  assert.equal(r.status, 200);
  const token = r.headers.get('x-fm-data-access-token')!;
  assert.equal(store.deleteAccount('@example.com'), true);
  store.setExternalAccount('@example.com', 'Reader');
  const read = await appFetch(`${base}/fmi/data/vLatest/databases/A/layouts/External/records`, { headers: { authorization: `Bearer ${token}` } }).then(r => r.json());
  assert.equal(read.messages[0].code, '952');
});
