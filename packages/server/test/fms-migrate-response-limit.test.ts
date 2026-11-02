// Reading a FileMaker Server's Admin API for a migration: the server named is one an administrator typed, but what it
// answers is still bounded in size, so a wrong or hostile address cannot fill this server's memory.
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fetchFmsExport } from '../src/index.ts';
import { ADMIN_API_LIMITS } from '../src/fms-migrate.ts';

/** Shorter limits for one test, put back after it. */
function limitsFor(t: TestContext, changes: Partial<typeof ADMIN_API_LIMITS>) {
  const before = { ...ADMIN_API_LIMITS };
  Object.assign(ADMIN_API_LIMITS, changes);
  t.after(() => { Object.assign(ADMIN_API_LIMITS, before); });
}

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

async function fakeServer(t: TestContext, handler: Handler): Promise<{ url: string; sent: () => number; closed: Promise<void> }> {
  let sent = 0;
  let onClose!: () => void;
  const closed = new Promise<void>((resolve) => { onClose = resolve; });
  const server = createServer((req, res) => {
    res.on('close', onClose);
    const write = res.write.bind(res);
    res.write = ((chunk: Buffer | string, ...rest: unknown[]) => { sent += Buffer.byteLength(chunk); return (write as (...a: unknown[]) => boolean)(chunk, ...rest); }) as typeof res.write;
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  }));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, sent: () => sent, closed };
}

const ok = (res: ServerResponse, response: object) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ messages: [{ code: '0', text: 'OK' }], response }));

test('the limits are 16 MiB and two minutes', () => {
  assert.deepEqual(ADMIN_API_LIMITS, { maxBytes: 16 * 1024 * 1024, deadlineMs: 120_000 });
});

test('an answer that says it is larger than the limit is refused before its body is read', { timeout: 5000 }, async (t) => {
  limitsFor(t, { maxBytes: 1024 * 1024, deadlineMs: 1000 });
  const fake = await fakeServer(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': String(64 * 1024 * 1024) });
    res.flushHeaders();
  });
  await assert.rejects(fetchFmsExport(fake.url, 'admin', 'pw'), /exceeded the 1048576-byte limit/);
  await fake.closed;
  assert.equal(fake.sent(), 0, 'the declared length is refused without any body bytes');
});

test('an answer with no length that never stops is cut off at the limit and the connection is closed', { timeout: 5000 }, async (t) => {
  limitsFor(t, { maxBytes: 1024 * 1024, deadlineMs: 1000 });
  const chunk = Buffer.alloc(1024 * 1024, 0x20);
  const fake = await fakeServer(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    const more = () => { while (!res.destroyed && res.write(chunk)); if (!res.destroyed) res.once('drain', more); };
    more();
  });
  await assert.rejects(fetchFmsExport(fake.url, 'admin', 'pw'), /exceeded the 1048576-byte limit/);
  await fake.closed;
  assert.ok(fake.sent() < 64 * 1024 * 1024, `${fake.sent()} bytes were sent before it stopped`);
});

test('an answer that trickles in for longer than the deadline is cut off', { timeout: 5000 }, async (t) => {
  limitsFor(t, { deadlineMs: 400 });
  const fake = await fakeServer(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    // A byte every 50 ms never goes idle for the socket timeout, and stays far under the size limit.
    const timer = setInterval(() => res.write(' '), 50);
    res.on('close', () => clearInterval(timer));
  });
  await assert.rejects(fetchFmsExport(fake.url, 'admin', 'pw'), /took longer than 0\.4 seconds to answer/);
  await fake.closed;
});

test('ordinary answers still read: sign in, the three settings, the file and schedule lists, and sign out', { timeout: 5000 }, async (t) => {
  const seen: string[] = [];
  const token = ['session', 'token', '1'].join('-');
  const fake = await fakeServer(t, (req, res) => {
    seen.push(`${req.method} ${req.url}`);
    if (req.url?.endsWith('/user/auth') && req.method === 'POST') return ok(res, { token });
    if (req.url?.endsWith('/databases')) return ok(res, { databases: [{ filename: 'Charts.fmp12', status: 'NORMAL' }] });
    if (req.url?.endsWith('/schedules')) return ok(res, { schedules: [] });
    if (req.url?.endsWith('/server/metadata')) return ok(res, { serverName: 'fms1' });
    ok(res, {});
  });
  const exp = await fetchFmsExport(fake.url, 'admin', 'pw');
  assert.equal(exp.metadata?.serverName, 'fms1');
  assert.deepEqual(exp.databases?.map((d) => d.filename), ['Charts.fmp12']);
  assert.deepEqual(exp.schedules, []);
  assert.deepEqual(seen, [
    'POST /fmi/admin/api/v2/user/auth',
    'GET /fmi/admin/api/v2/server/metadata',
    'GET /fmi/admin/api/v2/server/config/general',
    'GET /fmi/admin/api/v2/server/config/security',
    'GET /fmi/admin/api/v2/databases',
    'GET /fmi/admin/api/v2/schedules',
    `DELETE /fmi/admin/api/v2/user/auth/${token}`,
  ]);
});
