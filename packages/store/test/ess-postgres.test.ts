// All data is generated here. Protocol scripts follow PostgreSQL "Message
// Formats", "Extended Query", "SASL Authentication" and "Canceling Requests".
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { TLSSocket, createSecureContext } from 'node:tls';
import { createHash, createHmac, pbkdf2Sync, X509Certificate } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { PostgresClient, PostgresError, scramSha256, type PostgresOptions } from '../src/ess/postgres.ts';
import type { SqlDriver } from '../src/ess/driver.ts';
import { createStore } from '../src/index.ts';
import { Host } from '../../server/src/host.ts';
import { PgServer } from '../../server/src/pgwire.ts';
import { localCertificate } from '../../server/src/local-tls.ts';

const i16 = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
const i32 = (n: number) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; };
const str = (s: string) => Buffer.from(s + '\0');
const msg = (type: string, ...parts: Buffer[]) => { const b = Buffer.concat(parts); return Buffer.concat([Buffer.from(type), i32(b.length + 4), b]); };
const auth = (n: number, b = Buffer.alloc(0)) => msg('R', i32(n), b);
const ready = (state = 'I') => msg('Z', Buffer.from(state));
const ok = () => Buffer.concat([auth(0), msg('S', str('client_encoding'), str('UTF8')), msg('K', i32(123), i32(456)), ready()]);
const description = (columns: [string, number][]) => msg('T', i16(columns.length), ...columns.map(([name, oid]) => Buffer.concat([str(name), i32(0), i16(0), i32(oid), i16(65535), i32(-1), i16(0)])));
const row = (...values: (string | null)[]) => msg('D', i16(values.length), ...values.map((v) => v === null ? i32(-1) : Buffer.concat([i32(Buffer.byteLength(v)), Buffer.from(v)])));
const diagnostic = (type = 'E', code = '42P01', message = 'missing table') => msg(type, str('S' + (type === 'E' ? 'ERROR' : 'NOTICE')), str('C' + code), str('M' + message), str('Dprivate row details'), Buffer.from([0]));

class Wire {
  readonly socket: Socket;
  constructor(socket: Socket) { this.socket = socket; socket.on('error', () => {}); }
  async bytes(n: number): Promise<Buffer> {
    if (!n) return Buffer.alloc(0);
    for (;;) {
      const b = this.socket.read(n) as Buffer | null;
      if (b) return b;
      if (this.socket.destroyed || this.socket.readableEnded) throw new Error('fake socket closed');
      await new Promise<void>((resolve) => {
        const done = () => { this.socket.off('readable', done); this.socket.off('close', done); this.socket.off('end', done); resolve(); };
        this.socket.once('readable', done); this.socket.once('close', done); this.socket.once('end', done);
      });
    }
  }
  async startup() { const length = (await this.bytes(4)).readInt32BE(); assert.ok(length >= 8 && length < 65536); return this.bytes(length - 4); }
  async read() { const head = await this.bytes(5); return { type: head.toString('ascii', 0, 1), body: await this.bytes(head.readInt32BE(1) - 4) }; }
  write(...parts: Buffer[]) { this.socket.write(Buffer.concat(parts)); }
  async batch() {
    const messages: { type: string; body: Buffer }[] = [];
    for (;;) { const m = await this.read(); messages.push(m); if (m.type === 'S') return messages; }
  }
}
async function fake(t: TestContext, script: (wire: Wire, index: number) => Promise<void>) {
  const sockets = new Set<Socket>(), errors: unknown[] = [], tasks: Promise<void>[] = [];
  let index = 0;
  const server = createServer((socket) => {
    sockets.add(socket);
    tasks.push(script(new Wire(socket), index++).catch((e) => { errors.push(e); socket.destroy(); }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => {
    for (const s of sockets) s.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.all(tasks);
    assert.deepEqual(errors, []);
  });
  const port = (server.address() as { port: number }).port;
  return { host: '127.0.0.1', port, user: 'user', password: 'pencil', database: 'generated', sslmode: 'disable' as const };
}
async function startup(w: Wire) {
  const b = await w.startup(); assert.equal(b.readInt32BE(), 196608);
  assert.match(b.subarray(4).toString(), /application_name\0tabularius\0client_encoding\0UTF8\0DateStyle\0ISO\0\0$/);
}
async function opened(t: TestContext, options: PostgresOptions) { const c: PostgresClient & SqlDriver = await PostgresClient.connect(options); t.after(() => c.close()); return c; }
function sqlOf(batch: Awaited<ReturnType<Wire['batch']>>) { return batch.find((m) => m.type === 'P')!.body.subarray(1).toString().split('\0')[0]; }
function parameters(batch: Awaited<ReturnType<Wire['batch']>>) {
  const b = batch.find((m) => m.type === 'B')!.body;
  assert.equal(b.readUInt16BE(2), 0);
  let at = 6; const out: (string | null)[] = [];
  for (let i = 0; i < b.readUInt16BE(4); i++) { const n = b.readInt32BE(at); at += 4; out.push(n === -1 ? null : b.toString('utf8', at, at + n)); if (n >= 0) at += n; }
  assert.equal(b.readUInt16BE(at), 0); assert.equal(at + 2, b.length); return out;
}

test('RFC 7677 SCRAM vector and signature rejection', async () => {
  const nonce = 'rOprNGfwEbeRWgbNEkqO';
  const reply = `r=${nonce}%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096`;
  const c = scramSha256('user', 'pencil', nonce);
  assert.equal(c.first, `n,,n=user,r=${nonce}`);
  assert.equal(await c.continue(reply), `c=biws,r=${nonce}%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,p=dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=`);
  c.finish('v=6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=');
  const bad = scramSha256('user', 'pencil', nonce); await bad.continue(reply);
  assert.throws(() => bad.finish('v=' + Buffer.alloc(32).toString('base64')), /signature/);
  for (const s of [reply + ',i=1', reply.replace('i=4096', 'i=1000001'), reply.replace('r=' + nonce, 'r=bad'), reply + ',m=required', reply.replace('W22ZaJ0SNY7soEsUEjb6gQ==', '!')]) {
    await assert.rejects(scramSha256('user', 'pencil', nonce).continue(s));
  }
});

test('MD5 exact password response and startup fields', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w); const salt = Buffer.from([1, 2, 3, 4]); w.write(auth(5, salt));
    const p = await w.read(); assert.equal(p.type, 'p');
    const inner = createHash('md5').update('penciluser').digest('hex');
    assert.deepEqual(p.body, str('md5' + createHash('md5').update(inner).update(salt).digest('hex')));
    w.write(ok());
  });
  await opened(t, options);
});

async function scramServer(w: Wire, binding?: Buffer, wrong = false) {
  w.write(auth(10, Buffer.concat([...(binding ? [str('SCRAM-SHA-256-PLUS')] : []), str('SCRAM-SHA-256'), Buffer.from([0])])));
  const initial = await w.read(); assert.equal(initial.type, 'p');
  const end = initial.body.indexOf(0), mechanism = initial.body.toString('utf8', 0, end);
  assert.equal(mechanism, binding ? 'SCRAM-SHA-256-PLUS' : 'SCRAM-SHA-256');
  const first = initial.body.subarray(end + 5).toString(); assert.equal(initial.body.readInt32BE(end + 1), Buffer.byteLength(first));
  const gs2 = binding ? 'p=tls-server-end-point,,' : 'n,,';
  assert.ok(first.startsWith(gs2 + 'n=,r='));
  const bare = first.slice(gs2.length), nonce = bare.slice(5) + '-server';
  const salt = Buffer.from('synthetic salt');
  const serverFirst = `r=${nonce},s=${salt.toString('base64')},i=4096`;
  w.write(auth(11, Buffer.from(serverFirst)));
  const final = await w.read(); assert.equal(final.type, 'p');
  const text = final.body.toString(), withoutProof = text.slice(0, text.lastIndexOf(',p='));
  assert.equal(withoutProof, `c=${Buffer.concat([Buffer.from(gs2), binding ?? Buffer.alloc(0)]).toString('base64')},r=${nonce}`);
  const salted = pbkdf2Sync('pencil', salt, 4096, 32, 'sha256');
  const hm = (key: Buffer, s: string) => createHmac('sha256', key).update(s).digest();
  const clientKey = hm(salted, 'Client Key'), authMessage = `${bare},${serverFirst},${withoutProof}`;
  const proof = hm(createHash('sha256').update(clientKey).digest(), authMessage).map((v, i) => v ^ clientKey[i]);
  assert.equal(text.slice(text.lastIndexOf(',p=') + 3), Buffer.from(proof).toString('base64'));
  const signature = wrong ? Buffer.alloc(32) : hm(hm(salted, 'Server Key'), authMessage);
  w.write(auth(12, Buffer.from('v=' + signature.toString('base64'))), ok());
}

test('SCRAM on the wire uses the empty username and checks the server', async (t) => {
  for (const wrong of [false, true]) {
    const options = await fake(t, async (w) => { await startup(w); await scramServer(w, undefined, wrong); });
    if (wrong) await assert.rejects(PostgresClient.connect(options), /signature/);
    else await opened(t, options);
  }
});

test('TLS refusal, cleartext refusal, unsupported auth and malformed frame fail closed', async (t) => {
  for (const scenario of ['tls', 'clear', 'gss', 'huge', 'budget', 'short', 'premature']) {
    let sentPassword = false;
    const options = await fake(t, async (w) => {
      if (scenario === 'tls') { assert.equal((await w.startup()).readInt32BE(), 80877103); w.write(Buffer.from('N')); }
      else {
        await startup(w);
        if (scenario === 'clear') w.write(auth(3));
        if (scenario === 'gss') w.write(auth(7));
        if (scenario === 'huge') w.write(Buffer.from([68, 127, 255, 255, 255]));
        if (scenario === 'budget') w.write(Buffer.concat([Buffer.from('D'), i32(100_000)]));
        if (scenario === 'short') w.write(Buffer.from([68, 0, 0, 0, 3]));
        if (scenario === 'premature') w.write(ready());
      }
      w.socket.on('data', () => { sentPassword = true; });
      w.socket.resume(); await once(w.socket, 'close');
    });
    await assert.rejects(PostgresClient.connect({ ...options, sslmode: scenario === 'tls' ? 'require' : 'disable' }));
    assert.equal(sentPassword, false);
  }
});

test('connect deadline includes a silent server', async (t) => {
  const options = await fake(t, async (w) => { await w.startup(); await once(w.socket, 'close'); });
  await assert.rejects(PostgresClient.connect({ ...options, connectTimeoutMs: 40 }), /connect timeout/);
});

test('extended parameters, all text OIDs, fragmentation, notices and bounded results', async (t) => {
  const columns: [string, number][] = [21, 23, 20, 20, 1700, 1700, 1700, 700, 701, 16, 25, 1043, 1042, 19, 1082, 1083, 1114, 1184, 17, 2950, 114, 3802, 9999, 25].map((oid, i) => ['c' + i, oid]);
  const values = ['12', '-23', '9007199254740991', '9007199254740992', '0.1', '0.5', '9007199254740993', '1.25', 'Infinity', 't', 'hello', 'varchar', 'bpchar', 'name', '2024-02-29', '12:34:56.123456', '2024-02-29 12:34:56.123456', '2024-02-29 12:34:56.123456+02', '\\x00ff', '12345678-1234-1234-1234-123456789012', '{"x":1}', '[1]', 'unknown', null];
  const options = await fake(t, async (w) => {
    await startup(w); w.write(ok()); const batch = await w.batch();
    assert.deepEqual(batch.map((m) => m.type), ['P', 'B', 'D', 'E', 'C', 'S']);
    assert.equal(sqlOf(batch), 'SELECT $1');
    assert.deepEqual(parameters(batch), [null, 'text', '1.5', '9007199254740993', 't', 'f', '\\x00ff', '2024-02-29T12:34:56.000Z']);
    assert.equal(batch.find((m) => m.type === 'E')!.body.readInt32BE(1), 1);
    assert.deepEqual(batch.find((m) => m.type === 'C')!.body, Buffer.from('P\0'));
    const output = Buffer.concat([msg('1'), msg('2'), description(columns), row(...values), row(...values), diagnostic('N', '00000', 'private data'), msg('s'), msg('3'), ready()]);
    // Split the type/length header as well as payloads.
    for (let i = 0; i < output.length; i += 7) w.write(output.subarray(i, i + 7));
  });
  const c = await opened(t, options);
  const r = await c.query('SELECT $1', [null, 'text', 1.5, 9007199254740993n, true, false, new Uint8Array([0, 255]), new Date('2024-02-29T12:34:56Z')], { maxRows: 1 });
  assert.equal(r.truncated, true); assert.equal(r.rows.length, 1);
  assert.deepEqual(r.rows[0], [12, -23, 9007199254740991, 9007199254740992n, '0.1', 0.5, '9007199254740993', 1.25, Infinity, true, ...values.slice(10, 18), Buffer.from([0, 255]), ...values.slice(19)]);
  assert.equal(r.columns[4].type, 'numeric'); assert.equal(r.columns[22].type, '9999');
  assert.equal(r.notices.length, 1); assert.doesNotMatch(r.notices[0].message, /private/);
  assert.equal(c.quoteName('a"b'), '"a""b"'); assert.equal(c.placeholder(2), '$2');
  assert.throws(() => c.placeholder(0)); assert.throws(() => c.quoteName('a\0b'));
  await assert.rejects(c.query('x', [], { maxRows: 0 }));
});

test('error diagnostics exclude all remote data and allow reuse after ReadyForQuery', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w); w.write(ok()); await w.batch();
    w.write(diagnostic('E', '42P01', 'pencil private parameter and row'), ready());
    await w.batch(); w.write(msg('C', str('UPDATE 3')), ready());
  });
  const c = await opened(t, options);
  await assert.rejects(c.query('SELECT $1', ['private parameter']), (e: unknown) => e instanceof PostgresError && /ERROR 42P01.*table/.test(e.message) && !/pencil|private/.test(e.message));
  assert.equal((await c.query('UPDATE something', [])).affected, 3);
});

test('query timeout sends a separate CancelRequest with backend key and kills reuse', async (t) => {
  let cancel!: () => void; const canceled = new Promise<void>((resolve) => { cancel = resolve; });
  const options = await fake(t, async (w, index) => {
    if (index === 0) { await startup(w); w.write(ok()); await w.batch(); await once(w.socket, 'close'); }
    else { assert.deepEqual(await w.startup(), Buffer.concat([i32(80877102), i32(123), i32(456)])); w.socket.end(); cancel(); }
  });
  const c = await opened(t, options);
  await assert.rejects(c.query('long query', [], { timeoutMs: 50 }), /query timeout/);
  await canceled;
  await assert.rejects(c.query('SELECT 1', []), /timeout/);
});

test('transaction rollback, nested savepoint recovery, commit and ownership', async (t) => {
  const commands: string[] = [];
  const options = await fake(t, async (w) => {
    await startup(w); w.write(ok());
    for (let i = 0; i < 9; i++) {
      const sql = sqlOf(await w.batch()); commands.push(sql);
      w.write(msg('C', str(sql.split(' ')[0])), ready(sql === 'COMMIT' || sql === 'ROLLBACK' ? 'I' : 'T'));
    }
  });
  const c = await opened(t, options);
  await assert.rejects(c.transaction(async () => { throw new Error('synthetic failure'); }), /synthetic failure/);
  let entered!: () => void, resume!: () => void;
  const inside = new Promise<void>((r) => { entered = r; }), proceed = new Promise<void>((r) => { resume = r; });
  const tx = c.transaction(async (outer) => {
    entered(); await proceed;
    await assert.rejects(outer.transaction(async () => { throw new Error('nested failure'); }), /nested failure/);
    await outer.transaction(async (inner) => { assert.equal(inner.dialect, 'postgresql'); });
    return 42;
  });
  await inside; await assert.rejects(c.query('outside', []), /busy/); resume();
  assert.equal(await tx, 42);
  assert.deepEqual(commands.map((s) => s.replace(/tabularius_\d+/g, 'savepoint')), ['BEGIN', 'ROLLBACK', 'BEGIN', 'SAVEPOINT savepoint', 'ROLLBACK TO SAVEPOINT savepoint', 'RELEASE SAVEPOINT savepoint', 'SAVEPOINT savepoint', 'RELEASE SAVEPOINT savepoint', 'COMMIT']);
  assert.equal(c.transactionStatus, 'I');
});

test('catalog queries use bound names and decode visibility, nullability and keys', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w); w.write(ok()); const tables = await w.batch();
    assert.match(sqlOf(tables), /information_schema.tables/); assert.match(sqlOf(tables), /BASE TABLE.*VIEW/);
    w.write(description([['table_schema', 25], ['table_name', 25]]), row('public', 'items'), msg('C', str('SELECT 1')), ready());
    const columns = await w.batch(); assert.match(sqlOf(columns), /pg_catalog.pg_index/); assert.match(sqlOf(columns), /ANY\(p.conkey\)/);
    assert.deepEqual(parameters(columns), ['custom', 'items']);
    w.write(description([['column_name', 25], ['data_type', 25], ['is_nullable', 25], ['is_key', 16]]), row('id', 'integer', 'NO', 't'), row('name', 'text', 'YES', 'f'), msg('C', str('SELECT 2')), ready());
  });
  const c = await opened(t, options);
  assert.deepEqual(await c.tables(), [{ schema: 'public', name: 'items' }]);
  assert.deepEqual(await c.columns({ schema: 'custom', name: 'items' }), [{ name: 'id', type: 'integer', nullable: false, key: true }, { name: 'name', type: 'text', nullable: true, key: false }]);
});

test('TLS require, CA and hostname verification, default modes, and SCRAM-PLUS binding', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-tls-'));
  const cert = localCertificate(dir, ['localhost']);
  const context = createSecureContext({ key: cert.key, cert: cert.cert });
  const binding = createHash('sha256').update(new X509Certificate(cert.cert).raw).digest();
  // Cleanup is registered last below, after every fake server's close hook.
  for (const mode of ['require', 'verify-ca', 'verify-full', 'default-ca', 'default', 'untrusted'] as const) {
    const refuses = mode === 'verify-full' || mode === 'default-ca' || mode === 'untrusted';
    const options = await fake(t, async (w) => {
      assert.equal((await w.startup()).readInt32BE(), 80877103); w.write(Buffer.from('S'));
      const secure = new TLSSocket(w.socket, { isServer: true, secureContext: context });
      secure.on('error', () => {});
      if (refuses) { secure.resume(); await once(secure, 'close'); return; }
      const tlsWire = new Wire(secure); await startup(tlsWire); await scramServer(tlsWire, binding);
    });
    const sslmode = mode === 'default-ca' || mode === 'default' ? undefined : mode === 'untrusted' ? 'verify-ca' : mode;
    const config = { ...options, sslmode, ca: mode === 'untrusted' || mode === 'default' ? undefined : cert.ca };
    if (refuses) await assert.rejects(PostgresClient.connect(config), /TLS|connection/);
    else await opened(t, config);
  }
  // A generated certificate that includes the IP verifies successfully too.
  const matching = localCertificate(dir, ['localhost', '127.0.0.1']);
  const options = await fake(t, async (w) => {
    await w.startup(); w.write(Buffer.from('S'));
    const secure = new TLSSocket(w.socket, { isServer: true, secureContext: createSecureContext({ key: matching.key, cert: matching.cert }) });
    const sw = new Wire(secure); await startup(sw); sw.write(auth(3)); assert.deepEqual((await sw.read()).body, str('pencil')); sw.write(ok());
  });
  await opened(t, { ...options, sslmode: 'verify-full', ca: matching.ca });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
});

test('Tabularius pgwire: synthetic account, bound selects, dates, limits, and SQLSTATE', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-pgwire-'));
  createStore(join(dir, 'Generated.openhbam.sqlite'));
  const host = new Host(dir), store = host.get('Generated')!;
  store.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'n', type: 'number' }, { name: 'label', type: 'text' }, { name: 'd', type: 'date' }, { name: 'ts', type: 'timestamp' }] }]);
  store.sql.prepare('INSERT INTO Items (_fm_record_id, n, label, d, ts) VALUES (?, ?, ?, ?, ?)').run(1, 12, 'alpha', '2024-02-29', '2024-02-29 12:34:56.123456');
  store.sql.prepare('INSERT INTO Items (_fm_record_id, n, label) VALUES (?, ?, ?)').run(2, 24, 'beta');
  const full = store.privilegeSets().find((p) => p.id === 1)!;
  store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmxdbc'] });
  store.setPassword('Reader', 'pw', full.name);
  const pg = new PgServer(host, { port: 0 });
  const port = await pg.listen();
  const c = await PostgresClient.connect({ host: '127.0.0.1', port, user: 'Reader', password: 'pw', database: 'Generated', sslmode: 'disable', allowPlaintextPassword: true });
  t.after(async () => { await c.close(); pg.close(); await host.close(); rmSync(dir, { recursive: true, force: true }); });
  assert.deepEqual((await c.query('SELECT n, label, d, ts FROM Items WHERE label = $1', ['alpha'])).rows, [[12, 'alpha', '2024-02-29', '2024-02-29 12:34:56.123456']]);
  const limited = await c.query('SELECT label FROM Items ORDER BY n', [], { maxRows: 1 });
  assert.deepEqual(limited.rows, [['alpha']]); assert.equal(limited.truncated, true);
  await assert.rejects(c.query('SELECT * FROM missing_table', []), /42P01.*table/);
  assert.equal((await c.query('SELECT label FROM Items', [])).rows.length, 2);
  // pgwire exposes information_schema.columns but not the pg_index/ANY join
  // required for primary-key discovery; full columns() is exercised above.
  assert.deepEqual((await c.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['Items'])).rows.map((r) => r[0]), ['n', 'label', 'd', 'ts']);
});

test('caught statement errors cannot silently commit an aborted transaction', async (t) => {
  const commands: string[] = [];
  const options = await fake(t, async (w) => {
    await startup(w); w.write(ok());
    for (let i = 0; i < 3; i++) {
      const sql = sqlOf(await w.batch()); commands.push(sql);
      if (i === 1) w.write(diagnostic(), ready('E'));
      else w.write(msg('C', str(sql)), ready(i === 0 ? 'T' : 'I'));
    }
  });
  const c = await opened(t, options);
  await assert.rejects(c.transaction(async (tx) => { await assert.rejects(tx.query('bad statement', []), PostgresError); }), /aborted/);
  assert.deepEqual(commands, ['BEGIN', 'bad statement', 'ROLLBACK']);
});

test('nested transactions exclude sibling operations and expired async contexts', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w); w.write(ok());
    for (let i = 0; i < 4; i++) { const sql = sqlOf(await w.batch()); w.write(msg('C', str(sql)), ready(i === 3 ? 'I' : 'T')); }
  });
  const c = await opened(t, options);
  let release!: () => void, entered!: () => void, later!: () => void;
  const wait = new Promise<void>((r) => { release = r; }), inside = new Promise<void>((r) => { entered = r; });
  const expired = new Promise<void>((r) => { later = r; });
  let leaked: Promise<void> | undefined;
  await c.transaction(async (tx) => {
    leaked = expired.then(async () => { await assert.rejects(tx.query('expired', []), /ended/); });
    const nested = tx.transaction(async () => { entered(); await wait; });
    await inside;
    await assert.rejects(tx.query('sibling query', []), /busy/);
    await assert.rejects(tx.transaction(async () => {}), /busy/);
    release(); await nested;
  });
  later(); await leaked;
});

test('malformed row values and declared result sizes close without leaking data', async (t) => {
  for (const kind of ['integer', 'length', 'aggregate']) {
    const options = await fake(t, async (w) => {
      await startup(w); w.write(ok()); await w.batch();
      if (kind === 'integer') w.write(description([['id', 20]]), row('private row data'), ready());
      if (kind === 'length') w.write(Buffer.concat([Buffer.from('D'), i32(1024 * 1024 + 1)]));
      if (kind === 'aggregate') {
        const value = 'x'.repeat(1_100_000);
        w.write(description([['value', 25]]), row(value), row(value), row(value), row(value), ready());
      }
    });
    const c = await opened(t, options);
    await assert.rejects(c.query('SELECT value', [], { maxRows: kind === 'aggregate' ? 3 : 1 }), (e: unknown) => e instanceof Error && !e.message.includes('private row data'));
    await assert.rejects(c.query('reuse', []));
  }
});

test('a peer that replies without reading cannot grow the outbound buffer without bound', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w); w.write(ok(), ...Array.from({ length: 20 }, () => ready()));
    // Deliberately do not consume frontend packets after startup.
    await once(w.socket, 'close');
  });
  const c = await opened(t, options);
  await assert.rejects(async () => {
    for (let i = 0; i < 20; i++) await c.query('SELECT $1', ['x'.repeat(8 * 1024 * 1024)]);
  }, /outbound data.*budget/);
  await assert.rejects(c.query('reuse', []), /budget/);
});

test('a connection to the metadata address is refused before any socket opens', async () => {
  await assert.rejects(PostgresClient.connect({ host: '169.254.169.254', user: 'u', database: 'd', password: 'p', sslmode: 'disable', allowPlaintextPassword: true }), /PostgreSQL:/);
});
