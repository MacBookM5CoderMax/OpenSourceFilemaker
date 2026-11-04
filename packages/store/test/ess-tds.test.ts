// Synthetic wire fixtures from [MS-TDS]: Packet Header, PRELOGIN, LOGIN7,
// Token Stream and Data Type Details. Unverified against a real server.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { Duplex } from 'node:stream';
import { TLSSocket, createSecureContext } from 'node:tls';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localCertificate } from '../../server/src/local-tls.ts';
import { TdsClient, TdsError } from '../src/ess/tds.ts';

function packet(type: number, body: Buffer, end = true, id = 1): Buffer {
  const h = Buffer.from([type, end ? 1 : 0, 0, 0, 0, 0, id, 0]);
  h.writeUInt16BE(body.length + 8, 2);
  return Buffer.concat([h, body]);
}
function prelogin(encryption: number): Buffer {
  return Buffer.from([1, 0, 6, 0, 1, 255, encryption]);
}
function done(status = 0, rows = 0n, token = 0xfd): Buffer {
  const b = Buffer.alloc(13); b[0] = token;
  b.writeUInt16LE(status, 1); b.writeBigUInt64LE(rows, 5);
  return b;
}
function loginAck(): Buffer {
  // LOGINACK: interface, big-endian TDS version, B_VARCHAR program, version.
  return Buffer.from([0xad, 10, 0, 1, 0x74, 0, 0, 4, 0, 16, 0, 0, 0]);
}
function messages(socket: Socket, fn: (type: number, body: Buffer) => void, inspect?: (type: number, length: number) => void): () => void {
  let pending = Buffer.alloc(0), parts: Buffer[] = [];
  const receive = (data: Buffer) => {
    pending = Buffer.concat([pending, data]);
    while (pending.length >= 8) {
      const length = pending.readUInt16BE(2);
      if (pending.length < length) return;
      const type = pending[0], end = pending[1] & 1;
      inspect?.(type, length);
      parts.push(pending.subarray(8, length)); pending = pending.subarray(length);
      if (end) { const body = Buffer.concat(parts); parts = []; fn(type, body); }
    }
  };
  socket.on('data', receive);
  return () => socket.off('data', receive);
}
async function fake(t: TestContext, handler: (socket: Socket) => void): Promise<number> {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket); socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket)); handler(socket);
  });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  return (server.address() as { port: number }).port;
}
const credentials = { host: '127.0.0.1', user: 'tester', password: 'pencil', database: 'synthetic' };

test('PRELOGIN offsets and LOGIN7 password follow the specified byte layouts', async (t) => {
  const port = await fake(t, (socket) => messages(socket, (type, body) => {
    if (type === 0x12) {
      const options = new Map<number, Buffer>();
      for (let at = 0; body[at] !== 255; at += 5) {
        const offset = body.readUInt16BE(at + 1), size = body.readUInt16BE(at + 3);
        assert.ok(offset >= 26 && offset + size <= body.length);
        options.set(body[at], body.subarray(offset, offset + size));
      }
      assert.deepEqual([...options.keys()], [0, 1, 2, 3, 4]);
      assert.equal(options.get(0)!.length, 6);
      assert.deepEqual(options.get(1), Buffer.from([0]));
      assert.deepEqual(options.get(2), Buffer.from([0]));
      assert.equal(options.get(3)!.length, 4);
      assert.deepEqual(options.get(4), Buffer.from([0]));
      socket.write(packet(4, prelogin(2)));
    } else {
      assert.equal(type, 0x10);
      assert.equal(body.readUInt32LE(0), body.length);
      assert.equal(body.readUInt32LE(4), 0x74000004);
      assert.equal(body.readUInt32LE(8), 4096);
      const field = (at: number) => body.subarray(body.readUInt16LE(at), body.readUInt16LE(at) + body.readUInt16LE(at + 2) * 2);
      const expected = Buffer.from(credentials.password, 'utf16le').map((b) => (((b & 15) << 4) | (b >>> 4)) ^ 0xa5);
      assert.deepEqual(field(44), expected);
      assert.equal(field(40).toString('utf16le'), credentials.user);
      assert.equal(field(48).toString('utf16le'), 'tabularius');
      assert.equal(field(68).toString('utf16le'), credentials.database);
      socket.write(packet(4, Buffer.concat([loginAck(), done()])));
    }
  }));
  const client = await TdsClient.connect({ ...credentials, port, encryption: 'optional', allowUnencrypted: true });
  await client.close();
});

test('optional encryption refuses ENCRYPT_NOT_SUP unless allowUnencrypted is set, and never sends the login', async (t) => {
  let sawLogin = false;
  const port = await fake(t, (socket) => messages(socket, (type) => {
    if (type === 0x12) socket.write(packet(4, prelogin(2)));
    else if (type === 0x10) sawLogin = true;
  }));
  await assert.rejects(TdsClient.connect({ ...credentials, port, encryption: 'optional' }), (e: Error) => /does not support encryption/.test(e.message) && /allowUnencrypted/.test(e.message) && !e.message.includes(credentials.password) && !e.message.includes(credentials.user));
  assert.equal(sawLogin, false, 'the login packet was never sent');
});

test('mandatory encryption refuses ENCRYPT_NOT_SUP', async (t) => {
  const port = await fake(t, (socket) => messages(socket, (type) => {
    assert.equal(type, 0x12); socket.write(packet(4, prelogin(2)));
  }));
  await assert.rejects(TdsClient.connect({ ...credentials, port }), /encryption/i);
});

test('connect deadline includes an unresponsive PRELOGIN peer', async (t) => {
  const port = await fake(t, () => {});
  await assert.rejects(TdsClient.connect({ ...credentials, port, timeoutMs: 50 }), /timed out/i);
});

// Independent server-side TLS-in-PRELOGIN implementation. It deliberately does
// not import the client's packet or transport implementation.
class ServerTlsTransport extends Duplex {
  raw = false;
  handshakeComplete = false;
  pending: Buffer = Buffer.alloc(0);
  socket: Socket;
  constructor(socket: Socket) {
    super(); this.socket = socket; socket.on('data', this.receive);
  }
  receive = (data: Buffer): void => {
    if (this.raw) { this.push(data); return; }
    this.pending = Buffer.concat([this.pending, data]);
    while (this.pending.length >= 8) {
      assert.equal(this.pending[0], 0x12, 'TLS records must arrive wrapped in PRELOGIN');
      const n = this.pending.readUInt16BE(2); if (this.pending.length < n) return;
      const body = this.pending.subarray(8, n); this.pending = this.pending.subarray(n);
      this.push(body);
    }
  };
  detach(): void { this.socket.off('data', this.receive); }
  override _read(): void {}
  override _write(data: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (this.raw) { this.socket.write(data, callback); return; }
    const packets: Buffer[] = [];
    for (let at = 0, id = 1; at < data.length; at += 4000, id++) {
      packets.push(packet(0x12, data.subarray(at, at + 4000), at + 4000 >= data.length, id));
    }
    // Fragment even the packet header, independently of TLS record boundaries.
    const bytes = Buffer.concat(packets);
    this.socket.write(bytes.subarray(0, 3)); this.socket.write(bytes.subarray(3), callback);
    if (this.handshakeComplete) this.raw = true;
  }
}
async function tlsFake(t: TestContext, encryption: number, names = ['localhost', '127.0.0.1']) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-tds-test-'));
  const pair = localCertificate(dir, names);
  let logins = 0, batches = 0;
  const secureSockets = new Set<TLSSocket>();
  const port = await fake(t, (socket) => {
    const detach = messages(socket, (type, body) => {
      assert.equal(type, 0x12);
      assert.equal(body[0], 0);
      detach(); socket.write(packet(4, prelogin(encryption)));
      const transport = new ServerTlsTransport(socket);
      const secure = new TLSSocket(transport, { isServer: true,
        secureContext: createSecureContext({ key: pair.key, cert: pair.cert, minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' }),
      });
      secureSockets.add(secure); secure.on('error', () => {});
      // Node emits secure before flushing the server's final handshake flight.
      secure.once('secure', () => { transport.handshakeComplete = true; });
      messages(secure, (type, body) => {
        if (type === 0x10) {
          assert.ok(transport.raw, 'LOGIN7 can only be seen after TLS handshake and decryption');
          assert.equal(body.readUInt32LE(4), 0x74000004); logins++;
          if (encryption === 0) {
            transport.detach();
            messages(socket, (type) => { assert.equal(type, 1); batches++; socket.write(packet(4, done())); });
            socket.write(packet(4, Buffer.concat([loginAck(), done()])));
          } else secure.write(packet(4, Buffer.concat([loginAck(), done()])));
        } else { assert.equal(type, 1); batches++; secure.write(packet(4, done())); }
      });
    });
  });
  t.after(() => { for (const secure of secureSockets) secure.destroy(); });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { port, ca: pair.ca, counts: () => ({ logins, batches }) };
}

test('TLS handshake is framed in PRELOGIN and LOGIN7 and batches are encrypted', async (t) => {
  const server = await tlsFake(t, 1);
  const client = await TdsClient.connect({ ...credentials, port: server.port, ca: server.ca, timeoutMs: 3000 });
  assert.deepEqual(await client.batch('select 1'), []);
  assert.deepEqual(server.counts(), { logins: 1, batches: 1 });
  await client.close();
});

for (const mode of ['optional', 'disable'] as const) test(`${mode}: ENCRYPT_OFF encrypts LOGIN7, then uses plain TDS`, async (t) => {
  const server = await tlsFake(t, 0);
  const client = await TdsClient.connect({ ...credentials, port: server.port, ca: server.ca,
    encryption: mode, allowUnencrypted: mode === 'disable', timeoutMs: 3000 });
  assert.deepEqual(await client.batch('select 1'), []);
  assert.deepEqual(server.counts(), { logins: 1, batches: 1 });
  await client.close();
});

test('TLS rejects an untrusted certificate before sending LOGIN7', async (t) => {
  const server = await tlsFake(t, 1);
  await assert.rejects(TdsClient.connect({ ...credentials, port: server.port, timeoutMs: 3000 }), /TLS/);
  assert.equal(server.counts().logins, 0);
});

test('a packet queued in plaintext behind the PRELOGIN answer fails the connection before the TLS handshake', async (t) => {
  let loginSeen = false;
  const port = await fake(t, (socket) => {
    messages(socket, (type) => {
      // The forged login acknowledgement arrives in the same write as the PRELOGIN answer.
      if (type === 0x12) socket.write(Buffer.concat([packet(4, prelogin(1)), packet(4, Buffer.concat([loginAck(), done()]))]));
      else if (type === 0x10) loginSeen = true;
    });
  });
  await assert.rejects(TdsClient.connect({ ...credentials, port, timeoutMs: 2000 }));
  assert.equal(loginSeen, false, 'LOGIN7 was sent');
});

test('TLS rejects a trusted certificate for a different host', async (t) => {
  const server = await tlsFake(t, 1, ['localhost']);
  await assert.rejects(TdsClient.connect({ ...credentials, port: server.port, ca: server.ca, timeoutMs: 3000 }), /TLS/);
  assert.equal(server.counts().logins, 0);
});

test('trustServerCertificate is accepted only when explicitly enabled', async (t) => {
  const server = await tlsFake(t, 1, ['localhost']);
  const client = await TdsClient.connect({ ...credentials, port: server.port, trustServerCertificate: true, timeoutMs: 3000 });
  await client.close(); assert.equal(server.counts().logins, 1);
});

function u16(n: number): Buffer { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n: number): Buffer { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function text(s: string): Buffer { return Buffer.from(s, 'utf16le'); }
function env(kind: number, next: Buffer, old: Buffer, unicode = false): Buffer {
  const body = Buffer.concat([Buffer.from([kind, next.length / (unicode ? 2 : 1)]), next,
    Buffer.from([old.length / (unicode ? 2 : 1)]), old]);
  return Buffer.concat([Buffer.from([0xe3]), u16(body.length), body]);
}
function metadata(columns: { id: number; info?: Buffer; name?: string }[]): Buffer {
  return Buffer.concat([Buffer.from([0x81]), u16(columns.length), ...columns.map((col, i) => {
    const name = col.name ?? `c${i}`;
    return Buffer.concat([Buffer.alloc(6), Buffer.from([col.id]), col.info ?? Buffer.alloc(0), Buffer.from([name.length]), text(name)]);
  })]);
}
async function plain(t: TestContext, reply: (body: Buffer, socket: Socket) => void, environment: Buffer = Buffer.alloc(0)): Promise<TdsClient> {
  const port = await fake(t, (socket) => messages(socket, (type, body) => {
    if (type === 0x12) socket.write(packet(4, prelogin(2)));
    else if (type === 0x10) socket.write(packet(4, Buffer.concat([loginAck(), environment, done()])));
    else { assert.equal(type, 1); reply(body, socket); }
  }));
  const client = await TdsClient.connect({ ...credentials, port, encryption: 'optional', allowUnencrypted: true, timeoutMs: 2000 });
  t.after(() => client.close()); return client;
}

test('ENVCHANGE renegotiates packet size and SQLBatch carries ALL_HEADERS and transaction descriptor', async (t) => {
  const descriptor = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  let maxLength = 0, packets = 0;
  const port = await fake(t, (socket) => {
    messages(socket, (type, body) => {
      if (type === 0x12) socket.write(packet(4, prelogin(2)));
      else if (type === 0x10) socket.write(packet(4, Buffer.concat([loginAck(),
        env(1, text('other'), text('synthetic'), true), env(2, text('english'), Buffer.alloc(0), true),
        env(4, text('512'), text('4096'), true), env(7, Buffer.from([9, 4, 0, 0, 0]), Buffer.alloc(0)),
        env(8, descriptor, Buffer.alloc(0)), done()])));
      else {
        assert.equal(body.readUInt32LE(), 22); assert.equal(body.readUInt32LE(4), 18);
        assert.equal(body.readUInt16LE(8), 2); assert.deepEqual(body.subarray(10, 18), descriptor);
        assert.equal(body.readUInt32LE(18), 1); assert.equal(body.subarray(22).toString('utf16le'), 'x'.repeat(2000));
        const data = Buffer.concat([metadata([{ id: 0xe7, info: Buffer.from([0x40, 0x1f, 9, 4, 0, 0, 0]) }]),
          Buffer.from([0xd1]), u16(2000), text('z'.repeat(1000)), done(0x10, 1n)]);
        const packets: Buffer[] = [];
        for (let at = 0, id = 1; at < data.length; at += 504, id++) packets.push(packet(4, data.subarray(at, at + 504), at + 504 >= data.length, id));
        const bytes = Buffer.concat(packets); socket.write(bytes.subarray(0, 5)); socket.write(bytes.subarray(5));
      }
    }, (type, length) => { if (type === 1) { maxLength = Math.max(maxLength, length); packets++; } });
  });
  const client = await TdsClient.connect({ ...credentials, port, encryption: 'optional', allowUnencrypted: true });
  const result = await client.batch('x'.repeat(2000));
  assert.equal(result[0].rows[0][0], 'z'.repeat(1000)); assert.equal(result[0].affected, 1);
  assert.equal(maxLength, 512); assert.ok(packets > 1);
  await client.close();
});

test('all part-1 data types decode from ROW and NBCROW, including null bitmap across bytes', async (t) => {
  const fixtures: { id: number; info?: Buffer; bytes: Buffer; expected: unknown }[] = [];
  const add = (id: number, bytes: Buffer, expected: unknown, info?: Buffer) => fixtures.push({ id, bytes, expected, info });
  add(0x30, Buffer.from([255]), 255); add(0x34, Buffer.from([254, 255]), -2);
  add(0x38, Buffer.from([253, 255, 255, 255]), -3);
  const integer = Buffer.alloc(8); integer.writeBigInt64LE(-9007199254740993n); add(0x7f, integer, -9007199254740993n);
  for (const n of [1, 2, 4, 8]) add(0x26, Buffer.concat([Buffer.from([n]), n === 8 ? integer : Buffer.alloc(n, 0)]), n === 8 ? -9007199254740993n : 0, Buffer.from([n]));
  add(0x32, Buffer.from([1]), true); add(0x68, Buffer.from([1, 0]), false, Buffer.from([1]));
  const f4 = Buffer.alloc(4), f8 = Buffer.alloc(8); f4.writeFloatLE(1.25); f8.writeDoubleLE(-2.5);
  add(0x3b, f4, 1.25); add(0x3e, f8, -2.5);
  add(0x6d, Buffer.concat([Buffer.from([4]), f4]), 1.25, Buffer.from([4]));
  add(0x6d, Buffer.concat([Buffer.from([8]), f8]), -2.5, Buffer.from([8]));
  const coll = Buffer.from([9, 4, 0, 0, 0]);
  for (const id of [0xe7, 0xef]) add(id, Buffer.concat([u16(4), text('雪é')]), '雪é', Buffer.concat([u16(20), coll]));
  for (const id of [0xa7, 0xaf]) add(id, Buffer.from([2, 0, 0x80, 0xe9]), '€é', Buffer.concat([u16(20), coll]));
  add(0xa7, Buffer.from([1, 0, 0x80]), '\u0080', Buffer.from([20, 0, 0x11, 4, 0, 0, 0]));
  add(0x6a, Buffer.from([5, 0, 0x39, 0x30, 0, 0]), '-123.45', Buffer.from([5, 9, 2]));
  add(0x6c, Buffer.from([9, 1, 0x39, 0x30, 0, 0, 0, 0, 0, 0]), '12345', Buffer.from([9, 19, 0]));
  // DATE is days since 0001-01-01; TIME is 10^-scale seconds since midnight.
  add(0x28, Buffer.from([3, 0, 0, 0]), '0001-01-01');
  for (const scale of [0, 3, 7]) {
    const n = scale <= 2 ? 3 : scale <= 4 ? 4 : 5;
    let ticks = 3661n * 10n ** BigInt(scale) + (scale ? 1n : 0n);
    const b = Buffer.alloc(n); for (let i = 0; i < n; i++) { b[i] = Number(ticks & 255n); ticks >>= 8n; }
    const expected = '01:01:01' + (scale ? '.' + '1'.padStart(scale, '0') : '');
    add(0x29, Buffer.concat([Buffer.from([n]), b]), expected, Buffer.from([scale]));
    add(0x2a, Buffer.concat([Buffer.from([n + 3]), b, Buffer.alloc(3)]), '0001-01-01T' + expected, Buffer.from([scale]));
  }
  const dt = Buffer.concat([u32(1), u32(300)]), small = Buffer.from([1, 0, 1, 0]);
  add(0x3d, dt, new Date('1900-01-02T00:00:01Z')); add(0x3a, small, new Date('1900-01-02T00:01:00Z'));
  add(0x6f, Buffer.concat([Buffer.from([8]), dt]), new Date('1900-01-02T00:00:01Z'), Buffer.from([8]));
  add(0x6f, Buffer.concat([Buffer.from([4]), small]), new Date('1900-01-02T00:01:00Z'), Buffer.from([4]));
  const money = Buffer.concat([u32(0xffffffff), u32(0xffffcfc7)]);
  add(0x3c, money, '-1.2345'); add(0x7a, u32(12345), '1.2345');
  add(0x6e, Buffer.concat([Buffer.from([8]), money]), '-1.2345', Buffer.from([8]));
  add(0x6e, Buffer.concat([Buffer.from([4]), u32(12345)]), '1.2345', Buffer.from([4]));
  add(0x24, Buffer.from([16, 0x33, 0x22, 0x11, 0, 0x55, 0x44, 0x77, 0x66, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
    '00112233-4455-6677-8899-aabbccddeeff', Buffer.from([16]));
  for (const id of [0xa5, 0xad]) add(id, Buffer.from([3, 0, 0, 1, 255]), Uint8Array.from([0, 1, 255]), u16(10));
  const bitmap = Buffer.alloc(Math.ceil(fixtures.length / 8));
  fixtures.forEach((_, i) => { if (i % 3 === 0) bitmap[i >> 3] |= 1 << (i & 7); });
  const client = await plain(t, (_, socket) => socket.write(packet(4, Buffer.concat([
    metadata(fixtures), Buffer.from([0xd1]), ...fixtures.map((f) => f.bytes),
    Buffer.from([0xd2]), bitmap, ...fixtures.filter((_, i) => i % 3 !== 0).map((f) => f.bytes), done(0x10, 2n),
  ]))));
  const [result] = await client.batch('synthetic types');
  assert.deepEqual(result.rows[0], fixtures.map((f) => f.expected));
  assert.deepEqual(result.rows[1], fixtures.map((f, i) => i % 3 === 0 ? null : f.expected));
  assert.equal(result.affected, 2);
});

function errorToken(message: string, token = 0xaa): Buffer {
  const server = 'synthetic', procedure = 'synthetic_proc';
  const body = Buffer.concat([u32(50000), Buffer.from([7, 16]), u16(message.length), text(message),
    Buffer.from([server.length]), text(server), Buffer.from([procedure.length]), text(procedure), u32(9)]);
  return Buffer.concat([Buffer.from([token]), u16(body.length), body]);
}

test('ERROR exposes number, class, state, line and a safe message', async (t) => {
  const client = await plain(t, (_, socket) => socket.write(packet(4, errorToken('Permission denied.'))));
  await assert.rejects(client.batch('select confidential_value'), (error: unknown) => {
    assert.ok(error instanceof TdsError);
    assert.equal(error.number, 50000); assert.equal(error.class, 16); assert.equal(error.state, 7); assert.equal(error.line, 9);
    assert.match(error.message, /Permission denied/); assert.doesNotMatch(error.message, /confidential_value/); return true;
  });
});

test('ERROR never exposes SQL, password, row values or server-supplied object names', async (t) => {
  const sql = 'select sensitive_value';
  const client = await plain(t, (_, socket) => socket.write(packet(4,
    errorToken(`${sql}: row private_row_value; password ${credentials.password}`))));
  await assert.rejects(client.batch(sql), (error: unknown) => {
    assert.ok(error instanceof TdsError);
    assert.doesNotMatch(JSON.stringify(error) + String(error), /sensitive_value|private_row_value|pencil|synthetic_proc/);
    assert.match(error.message, /50000.*class 16/); return true;
  });
});

for (const status of [2, 0x100, 0x20]) test(`DONE failure flag ${status} rejects the whole batch`, async (t) => {
  const client = await plain(t, (_, socket) => socket.write(packet(4, Buffer.concat([
    metadata([{ id: 0x38 }]), Buffer.from([0xd1]), u32(123), done(status),
  ]))));
  await assert.rejects(client.batch('select 123'), /failed or was cancelled/);
  await assert.rejects(client.batch('select 456'), /connection closed/);
});

test('INFO, ORDER, RETURNSTATUS, DONEINPROC and DONEPROC coexist with multiple results', async (t) => {
  const client = await plain(t, (_, socket) => {
    socket.write(packet(4, Buffer.concat([errorToken('synthetic info', 0xab),
      metadata([{ id: 0x38, name: 'first' }]), Buffer.from([0xa9, 2, 0, 1, 0, 0xd1]), u32(4), done(0x11, 1n, 0xff)])));
    socket.write(packet(4, Buffer.concat([Buffer.from([0x79]), u32(0),
      metadata([{ id: 0x32, name: 'second' }]), Buffer.from([0xd1, 1]), done(0x11, 1n, 0xfe), done(0x10, 3n)])));
  });
  assert.deepEqual(await client.batch('synthetic results'), [
    { columns: [{ name: 'first', type: 'INT4' }], rows: [[4]], affected: 1 },
    { columns: [{ name: 'second', type: 'BIT' }], rows: [[true]], affected: 1 },
    { columns: [], rows: [], affected: 3 },
  ]);
});

test('nullable ROW prefixes distinguish NULL from empty text and binary', async (t) => {
  const cols = [
    { id: 0x26, info: Buffer.from([4]) }, { id: 0x68, info: Buffer.from([1]) },
    { id: 0x6d, info: Buffer.from([8]) }, { id: 0x6a, info: Buffer.from([5, 9, 0]) },
    { id: 0x28 }, { id: 0x29, info: Buffer.from([7]) }, { id: 0x2a, info: Buffer.from([7]) },
    { id: 0x6f, info: Buffer.from([8]) }, { id: 0x6e, info: Buffer.from([8]) }, { id: 0x24, info: Buffer.from([16]) },
    { id: 0xe7, info: Buffer.from([20, 0, 9, 4, 0, 0, 0]) }, { id: 0xa5, info: u16(20) },
  ];
  const client = await plain(t, (_, socket) => socket.write(packet(4, Buffer.concat([metadata(cols),
    Buffer.from([0xd1]), Buffer.alloc(10), Buffer.from([255, 255, 255, 255]),
    Buffer.from([0xd1]), Buffer.alloc(14), done(),
  ]))));
  const [result] = await client.batch('nulls');
  assert.deepEqual(result.rows, [Array(12).fill(null), [...Array(10).fill(null), '', new Uint8Array()]]);
});

for (const [id, info, name] of [
  [0xe7, Buffer.from([255, 255]), 'NVARCHAR(max)'], [0xa7, Buffer.from([255, 255]), 'VARCHAR(max)'],
  [0xa5, Buffer.from([255, 255]), 'VARBINARY(max)'], [0xf1, undefined, 'XML'],
  [0x62, undefined, 'sql_variant'], [0x2b, undefined, 'DATETIMEOFFSET'],
] as const) test(`truncated ${name} metadata is rejected before reading a value`, async (t) => {
  const client = await plain(t, (_, socket) => socket.write(packet(4, metadata([{ id, info }]).subarray(0, -5))));
  await assert.rejects(client.batch('truncated metadata'), /invalid or oversized/);
  await assert.rejects(client.batch('after malformed metadata'), /connection closed/);
});

for (const [label, reply] of [
  ['oversized packet before body allocation', Buffer.from([4, 1, 255, 255, 0, 0, 1, 0])],
  ['short header length', Buffer.from([4, 1, 0, 7, 0, 0, 1, 0])],
  ['wrong packet ID', Buffer.from([4, 1, 0, 8, 0, 0, 2, 0])],
  ['truncated metadata', packet(4, Buffer.from([0x81, 1, 0, 0]))],
  ['absurd column count', packet(4, Buffer.from([0x81, 254, 255]))],
  ['oversized value', packet(4, Buffer.concat([metadata([{ id: 0xa5, info: u16(10) }]), Buffer.from([0xd1, 255, 127])]))],
  ['invalid integer size', packet(4, metadata([{ id: 0x26, info: Buffer.from([255]) }]))],
  ['invalid time scale', packet(4, metadata([{ id: 0x29, info: Buffer.from([255]) }]))],
  ['truncated error', packet(4, Buffer.from([0xaa, 255, 255]))],
  ['invalid renegotiated packet size', packet(4, env(4, text('65535'), text('4096'), true))],
] as const) test(`malformed response: ${label}`, async (t) => {
  const client = await plain(t, (_, socket) => socket.write(reply));
  await assert.rejects(client.batch('malformed'), /invalid or oversized/);
});

test('PRELOGIN option ranges cannot point into the option table', async (t) => {
  const port = await fake(t, (socket) => messages(socket, () => socket.write(packet(4, Buffer.from([1, 0, 0, 0, 1, 255])))));
  await assert.rejects(TdsClient.connect({ ...credentials, port }), /invalid or oversized/);
});

test('LOGINACK is required and must announce TDS 7.4', async (t) => {
  for (const ack of [Buffer.alloc(0), Buffer.from([0xad, 10, 0, 1, 0x73, 0, 0, 3, 0, 16, 0, 0, 0])]) {
    const port = await fake(t, (socket) => messages(socket, (type) => {
      socket.write(packet(4, type === 0x12 ? prelogin(2) : Buffer.concat([ack, done()])));
    }));
    await assert.rejects(TdsClient.connect({ ...credentials, port, encryption: 'optional', allowUnencrypted: true }), /acknowledge|invalid/);
  }
});

test('unsupported authentication, strict mode and unapproved disable fail before connecting', async () => {
  await assert.rejects(TdsClient.connect({ ...credentials, encryption: 'strict' }), /TDS 8/);
  await assert.rejects(TdsClient.connect({ ...credentials, encryption: 'disable' }), /allowUnencrypted/);
  for (const authentication of ['integrated', 'azure-ad'] as const) {
    await assert.rejects(TdsClient.connect({ ...credentials, authentication }), /not supported.*SQL authentication/);
  }
});

test('server ENCRYPT_REQ keeps optional and explicitly disabled sessions encrypted', async (t) => {
  for (const encryption of ['optional', 'disable'] as const) {
    const server = await tlsFake(t, 3);
    const client = await TdsClient.connect({ ...credentials, port: server.port, ca: server.ca, encryption, allowUnencrypted: true });
    await client.batch('select 1'); await client.close();
    assert.deepEqual(server.counts(), { logins: 1, batches: 1 });
  }
});

test('mandatory encryption rejects an ENCRYPT_OFF downgrade', async (t) => {
  const port = await fake(t, (socket) => messages(socket, () => socket.write(packet(4, prelogin(0)))));
  await assert.rejects(TdsClient.connect({ ...credentials, port }), /mandatory encryption/);
});

test('a dead peer rejects an active batch; close is idempotent', async (t) => {
  const client = await plain(t, (_, socket) => socket.destroy());
  await assert.rejects(client.batch('select 1'), /connection closed/);
  await client.close(); await client.close();
  await assert.rejects(client.batch('select 2'), /connection closed/);
});

test('batch deadline closes a stalled connection and concurrent batches are refused', async (t) => {
  let received!: () => void;
  const observed = new Promise<void>((resolve) => { received = resolve; });
  const port = await fake(t, (socket) => messages(socket, (type) => {
    if (type === 0x12) socket.write(packet(4, prelogin(2)));
    else if (type === 0x10) socket.write(packet(4, Buffer.concat([loginAck(), done()])));
    else received();
  }));
  const client = await TdsClient.connect({ ...credentials, port, encryption: 'optional', allowUnencrypted: true, timeoutMs: 150 });
  const pending = assert.rejects(client.batch('stalled'), /timed out/);
  await observed;
  await assert.rejects(client.batch('overlap'), /already running/);
  await pending;
  await assert.rejects(client.batch('after timeout'), /connection closed/);
});

test('close interrupts a pending connect without waiting for the deadline', async (t) => {
  let received!: () => void;
  const observed = new Promise<void>((resolve) => { received = resolve; });
  const port = await fake(t, (socket) => messages(socket, received));
  const client = new TdsClient();
  const pending = assert.rejects(client.connect({ ...credentials, port, timeoutMs: 3000 }), /connection closed/);
  await observed; await client.close(); await pending;
});

test('transaction completion ENVCHANGE clears the descriptor in subsequent batches', async (t) => {
  const descriptor = Buffer.from([8, 7, 6, 5, 4, 3, 2, 1]); let count = 0;
  const client = await plain(t, (body, socket) => {
    assert.deepEqual(body.subarray(10, 18), count === 0 ? descriptor : Buffer.alloc(8));
    socket.write(packet(4, Buffer.concat([count++ === 0 ? env(9, Buffer.alloc(0), descriptor) : Buffer.alloc(0), done()])));
  }, env(8, descriptor, Buffer.alloc(0)));
  await client.batch('first'); await client.batch('second');
});

test('compressed null rows cannot expand beyond the decoded cell budget', async (t) => {
  const columns = Array.from({ length: 1000 }, () => ({ id: 0x38 }));
  const row = Buffer.concat([Buffer.from([0xd2]), Buffer.alloc(125, 255)]);
  const client = await plain(t, (_, socket) => {
    const bytes = Buffer.concat([metadata(columns), ...Array<Buffer>(1001).fill(row), done()]);
    for (let at = 0, id = 1; at < bytes.length; at += 4088, id = (id + 1) & 255) {
      socket.write(packet(4, bytes.subarray(at, at + 4088), at + 4088 >= bytes.length, id));
    }
  });
  await assert.rejects(client.batch('compressed rows'), /invalid or oversized/);
});

test('a connection to the metadata address is refused before any socket opens', async () => {
  await assert.rejects(TdsClient.connect({ ...credentials, host: '169.254.169.254', port: 1433, encryption: 'optional' }), /SQL Server:/);
});

async function rpcPeer(t: TestContext, reply: (type: number, body: Buffer, socket: Socket) => void): Promise<TdsClient> {
  const port = await fake(t, (socket) => messages(socket, (type, body) => {
    if (type === 0x12) socket.write(packet(4, prelogin(2)));
    else if (type === 0x10) socket.write(packet(4, Buffer.concat([loginAck(), done()])));
    else reply(type, body, socket);
  }));
  const client = await TdsClient.connect({ ...credentials, port, encryption: 'optional', allowUnencrypted: true });
  t.after(() => client.close()); return client;
}
function rpcName(name: string): Buffer { return Buffer.concat([Buffer.from([name.length]), text(name), Buffer.from([0])]); }
function nvarchar(s: string): Buffer {
  return Buffer.concat([Buffer.from([0xe7]), u16(8000), Buffer.from([9, 4, 0, 0, 0]), u16(s.length * 2), text(s)]);
}

test('sp_executesql RPC exact bytes: SQL, declarations and one parameter of every input type', async (t) => {
  const sql = 'select @p1, @p2, @p3, @p4, @p5, @p6, @p7';
  const client = await rpcPeer(t, (type, body, socket) => {
    // [MS-TDS] RPCRequest: ALL_HEADERS (22,18,2,descriptor,1), 0xffff
    // procedure-id sentinel, ProcID=10, OptionFlags=0. Each parameter has a
    // B_VARCHAR name, status=0, TYPE_INFO, and its nullable length + value.
    // INTN(8), FLTN(8), BITN(1), BIGVARBIN(8000), DATETIME2(scale=7).
    // 0001-01-02 midnight: time=5 zero bytes, date=01 00 00.
    const expected = Buffer.concat([u32(22), u32(18), u16(2), Buffer.alloc(8), u32(1), u16(65535), u16(10), u16(0),
      rpcName(''), nvarchar(sql), rpcName(''), nvarchar('@p1 nvarchar(4000), @p2 bigint, @p3 float, @p4 bit, @p5 varbinary(8000), @p6 datetime2(7), @p7 nvarchar(4000)'),
      rpcName('@p1'), nvarchar('雪'),
      rpcName('@p2'), Buffer.from([0x26, 8, 8, 254, 255, 255, 255, 255, 255, 255, 255]),
      rpcName('@p3'), Buffer.from([0x6d, 8, 8, 0, 0, 0, 0, 0, 0, 0xf4, 0x3f]),
      rpcName('@p4'), Buffer.from([0x68, 1, 1, 1]),
      rpcName('@p5'), Buffer.from([0xa5, 0x40, 0x1f, 2, 0, 0x12, 0x34]),
      rpcName('@p6'), Buffer.from([0x2a, 7, 8, 0, 0, 0, 0, 0, 1, 0, 0]),
      rpcName('@p7'), Buffer.from([0xe7, 0x40, 0x1f, 9, 4, 0, 0, 0, 255, 255]),
    ]);
    assert.equal(type, 3); assert.deepEqual(body, expected);
    socket.write(packet(4, done(0, 0n, 0xfe)));
  });
  assert.deepEqual(await client.query(sql, ['雪', -2n, 1.25, true, Uint8Array.from([0x12, 0x34]), new Date('0001-01-02T00:00:00Z'), null]), { columns: [], rows: [] });
});

test('transactions carry ENVCHANGE descriptor and nested failures roll back to a savepoint', async (t) => {
  const descriptor = Buffer.from([1, 3, 5, 7, 2, 4, 6, 8]); const statements: string[] = [];
  const client = await plain(t, (body, socket) => {
    const sql = body.subarray(22).toString('utf16le'); statements.push(sql);
    assert.deepEqual(body.subarray(10, 18), statements.length === 1 ? Buffer.alloc(8) : descriptor);
    const change = sql === 'BEGIN TRANSACTION' ? env(8, descriptor, Buffer.alloc(0))
      : sql === 'COMMIT TRANSACTION' ? env(9, Buffer.alloc(0), descriptor) : Buffer.alloc(0);
    socket.write(packet(4, Buffer.concat([change, done()])));
  });
  await client.transaction(async (tx) => {
    await tx.query('select 1', []);
    await assert.rejects(tx.transaction(async () => { throw new Error('synthetic callback failure'); }), /synthetic callback/);
    await tx.query('select 2', []);
  });
  assert.deepEqual(statements, ['BEGIN TRANSACTION', 'select 1', 'SAVE TRANSACTION [tabularius_1]', 'ROLLBACK TRANSACTION [tabularius_1]', 'select 2', 'COMMIT TRANSACTION']);
});

test('query timeout sends ATTENTION and drains DONE_ATTN before allowing another query', async (t) => {
  const types: number[] = [];
  const client = await rpcPeer(t, (type, body, socket) => {
    types.push(type);
    if (type === 6) {
      assert.equal(body.length, 0);
      // A normal result may race with the attention acknowledgement.
      socket.write(packet(4, done())); socket.write(packet(4, done(0x20)));
    } else if (types.length > 1) socket.write(packet(4, done()));
  });
  await assert.rejects(client.query('wait', [], { timeoutMs: 20 }), /timed out/);
  await client.query('again', []);
  assert.deepEqual(types, [1, 6, 1]);
});

function plpBytes(chunks: Buffer[], total?: bigint): Buffer {
  const length = Buffer.alloc(8); length.writeBigUInt64LE(total ?? BigInt(chunks.reduce((n, b) => n + b.length, 0)));
  return Buffer.concat([length, ...chunks.flatMap((b) => [u32(b.length), b]), u32(0)]);
}
function sendResponse(socket: Socket, bytes: Buffer, size = 73): void {
  for (let at = 0, id = 1; at < bytes.length; at += size, id = (id + 1) & 255) {
    socket.write(packet(4, bytes.subarray(at, at + size), at + size >= bytes.length, id));
  }
}
const collation = Buffer.from([9, 4, 0, 0, 0]);

test('PLP NVARCHAR, VARCHAR, VARBINARY and XML decode chunks crossing packets, null and empty', async (t) => {
  const cols = [{ id: 0xe7, info: Buffer.concat([u16(65535), collation]) },
    { id: 0xa7, info: Buffer.concat([u16(65535), collation]) }, { id: 0xa5, info: u16(65535) }, { id: 0xf1, info: Buffer.from([0]) }];
  const unicode = text('雪🙂'.repeat(40));
  const client = await plain(t, (_, socket) => sendResponse(socket, Buffer.concat([metadata(cols), Buffer.from([0xd1]),
    plpBytes([unicode.subarray(0, 3), unicode.subarray(3)], 0xfffffffffffffffen),
    plpBytes([Buffer.from([0x80]), Buffer.from([0xe9])]), plpBytes([Buffer.from([0, 255]), Buffer.from([128])]),
    plpBytes([text('<a>'), text('雪</a>')]), Buffer.from([0xd1]), ...cols.map(() => Buffer.alloc(8, 255)),
    Buffer.from([0xd1]), ...cols.map(() => plpBytes([])), done(),
  ])));
  assert.deepEqual((await client.query('plp', [])).rows, [
    ['雪🙂'.repeat(40), '€é', Uint8Array.from([0, 255, 128]), '<a>雪</a>'], [null, null, null, null], ['', '', new Uint8Array(), ''],
  ]);
});

for (const unknown of [false, true]) test(`PLP ${unknown ? 'unknown' : 'known'} length over 64 MiB is refused before reading its body`, async (t) => {
  const total = Buffer.alloc(8); total.writeBigUInt64LE(unknown ? 0xfffffffffffffffen : 64n * 1024n * 1024n + 1n);
  const client = await plain(t, (_, socket) => socket.write(packet(4, Buffer.concat([
    metadata([{ id: 0xa5, info: u16(65535) }]), Buffer.from([0xd1]), total, ...(unknown ? [u32(64 * 1024 * 1024 + 1)] : []),
  ]))));
  await assert.rejects(client.query('cap', []), /64 MiB/);
  await assert.rejects(client.query('closed', []), /connection closed/);
});

for (const body of [plpBytes([Buffer.from([1])], 2n), plpBytes([Buffer.from([1, 2])], 1n)]) test('PLP declared length must equal its chunks', async (t) => {
  const client = await plain(t, (_, socket) => socket.write(packet(4, Buffer.concat([
    metadata([{ id: 0xa5, info: u16(65535) }]), Buffer.from([0xd1]), body, done(),
  ]))));
  await assert.rejects(client.query('bad length', []), /invalid or oversized/);
});

test('remaining scalar types: DATETIMEOFFSET, legacy text/image, SMALLMONEY and sql_variant bases', async (t) => {
  const offset = Buffer.alloc(10); offset.writeUIntLE(3600 * 10 ** 7, 0, 5); offset.writeUIntLE(1, 5, 3); offset.writeInt16LE(120, 8);
  const legacyInfo = (id: number) => Buffer.concat([u32(1000), id === 0x22 ? Buffer.alloc(0) : collation, Buffer.from([1]), u16(1), text('t')]);
  const legacy = (b: Buffer) => Buffer.concat([Buffer.from([16]), Buffer.alloc(24), u32(b.length), b]);
  const variant = (id: number, properties: Buffer, b: Buffer) => Buffer.concat([u32(2 + properties.length + b.length), Buffer.from([id, properties.length]), properties, b]);
  const cols = [{ id: 0x2b, info: Buffer.from([7]) }, ...[0x23, 0x63, 0x22].map((id) => ({ id, info: legacyInfo(id) })),
    { id: 0x7a }, ...Array.from({ length: 4 }, () => ({ id: 0x62, info: u32(8016) }))];
  const client = await plain(t, (_, socket) => sendResponse(socket, Buffer.concat([metadata(cols), Buffer.from([0xd1, 10]), offset,
    legacy(Buffer.from([0x80])), legacy(text('雪')), legacy(Buffer.from([255, 0])), u32(0xffffcfc7),
    variant(0x38, Buffer.alloc(0), u32(42)), variant(0xe7, Buffer.concat([collation, u16(20)]), text('雪')),
    variant(0x6a, Buffer.from([9, 2]), Buffer.from([1, 0x39, 0x30, 0, 0])), variant(0xa5, u16(10), Buffer.from([1, 2])),
    Buffer.from([0xd1, 0, 0, 0, 0]), u32(0), u32(0), u32(0), u32(0), u32(0), done(),
  ])));
  assert.deepEqual((await client.query('types', [])).rows, [
    [new Date('0001-01-01T23:00:00Z'), '€', '雪', Uint8Array.from([255, 0]), '-1.2345', 42, '雪', '123.45', Uint8Array.from([1, 2])],
    [null, null, null, null, '0.0000', null, null, null, null],
  ]);
});

for (const [id, name] of [[0xf0, 'UDT'], [0xf3, 'TVP']] as const) test(`${name} produces a clear unsupported error`, async (t) => {
  const client = await plain(t, (_, socket) => socket.write(packet(4, metadata([{ id }]))));
  await assert.rejects(client.query('unsupported', []), new RegExp(`${name}.*not supported`));
});

test('typed RPC NULLs retain each TYPE_INFO', async (t) => {
  const types = ['nvarchar', 'bigint', 'float', 'bit', 'varbinary', 'datetime2'] as const;
  const client = await rpcPeer(t, (type, body, socket) => {
    assert.equal(type, 3);
    const nulls = [Buffer.from([0xe7, 0x40, 0x1f, 9, 4, 0, 0, 0, 255, 255]), Buffer.from([0x26, 8, 0]),
      Buffer.from([0x6d, 8, 0]), Buffer.from([0x68, 1, 0]), Buffer.from([0xa5, 0x40, 0x1f, 255, 255]), Buffer.from([0x2a, 7, 0])];
    const tail = Buffer.concat(nulls.flatMap((b, i) => [rpcName(`@p${i + 1}`), b]));
    assert.deepEqual(body.subarray(-tail.length), tail); socket.write(packet(4, done()));
  });
  await client.rpc('nulls', types.map(() => null), { parameterTypes: [...types] });
});

test('long text and binary parameters use PLP and max declarations', async (t) => {
  const largeText = '🙂'.repeat(2001), binary = new Uint8Array(8001).fill(7);
  const client = await rpcPeer(t, (type, body, socket) => {
    assert.equal(type, 3);
    assert.ok(body.includes(text('@p1 nvarchar(max), @p2 varbinary(max)')));
    const tail = Buffer.concat([rpcName('@p1'), Buffer.from([0xe7, 255, 255]), collation, plpBytes([text(largeText)]),
      rpcName('@p2'), Buffer.from([0xa5, 255, 255]), plpBytes([Buffer.from(binary)])]);
    assert.deepEqual(body.subarray(-tail.length), tail); socket.write(packet(4, done()));
  });
  await client.query('large', [largeText, binary]);
});

test('parameter validation and server errors never expose a parameter value', async (t) => {
  const secret = ['private', 'parameter', 'value'].join('_');
  const client = await rpcPeer(t, (_type, _body, socket) => socket.write(packet(4, Buffer.concat([errorToken(secret), done(2)]))));
  await assert.rejects(client.query('select @p1', [secret]), (e: Error) => !e.message.includes(secret) && /rejected/.test(e.message));
  for (const value of [NaN, Infinity, 1n << 63n, new Date(NaN)]) await assert.rejects(client.query('select @p1', [value]), /invalid type or value/);
});

test('adapter catalogs use INFORMATION_SCHEMA, parameterized names and primary key membership', async (t) => {
  let requests = 0;
  const client = await rpcPeer(t, (type, body, socket) => {
    if (++requests === 1) {
      assert.equal(type, 1); assert.match(body.subarray(22).toString('utf16le'), /INFORMATION_SCHEMA.TABLES/);
      socket.write(packet(4, Buffer.concat([metadata([{ id: 0xe7, info: Buffer.concat([u16(100), collation]) }, { id: 0xe7, info: Buffer.concat([u16(100), collation]) }]),
        Buffer.from([0xd1]), u16(6), text('dbo'), u16(10), text('items'), done()])));
    } else {
      assert.equal(type, 3);
      assert.ok(body.includes(text('INFORMATION_SCHEMA.TABLE_CONSTRAINTS'))); assert.ok(body.includes(text('INFORMATION_SCHEMA.KEY_COLUMN_USAGE')));
      assert.ok(body.includes(text('c.TABLE_NAME = @p2'))); assert.ok(body.includes(text('odd]name')));
      const cols = [0, 1, 2].map(() => ({ id: 0xe7, info: Buffer.concat([u16(100), collation]) }));
      socket.write(packet(4, Buffer.concat([metadata([...cols, { id: 0x38 }]), Buffer.from([0xd1]),
        u16(4), text('id'), u16(6), text('int'), u16(4), text('NO'), u32(1), Buffer.from([0xd1]),
        u16(8), text('name'), u16(16), text('nvarchar'), u16(6), text('YES'), u32(0), done()])));
    }
  });
  assert.equal(client.dialect, 'sqlserver'); assert.equal(client.placeholder(3), '@p3');
  assert.equal(client.quoteName('odd]name'), '[odd]]name]');
  assert.deepEqual(await client.tables(), [{ schema: 'dbo', name: 'items' }]);
  assert.deepEqual(await client.columns({ schema: 'dbo', name: 'odd]name' }), [
    { name: 'id', type: 'int', nullable: false, key: true }, { name: 'name', type: 'nvarchar', nullable: true, key: false },
  ]);
});

test('maxRows rejects the whole result instead of returning a partial result', async (t) => {
  const client = await plain(t, (_, socket) => socket.write(packet(4, Buffer.concat([metadata([{ id: 0x38 }]),
    Buffer.from([0xd1]), u32(1), Buffer.from([0xd1]), u32(2), done()]))));
  await assert.rejects(client.query('rows', [], { maxRows: 1 }), /invalid or oversized/);
  await assert.rejects(client.query('after cap', []), /connection closed/);
});

test('outer transaction rolls back after a callback throws', async (t) => {
  const seen: string[] = [], descriptor = Buffer.from([1, 1, 1, 1, 1, 1, 1, 1]);
  const client = await plain(t, (body, socket) => {
    const sql = body.subarray(22).toString('utf16le'); seen.push(sql);
    assert.deepEqual(body.subarray(10, 18), seen.length === 1 ? Buffer.alloc(8) : descriptor);
    socket.write(packet(4, Buffer.concat([sql === 'BEGIN TRANSACTION' ? env(8, descriptor, Buffer.alloc(0))
      : env(10, Buffer.alloc(0), descriptor), done()])));
  });
  await assert.rejects(client.transaction(async () => { throw new Error('callback failed'); }), /callback failed/);
  assert.deepEqual(seen, ['BEGIN TRANSACTION', 'ROLLBACK TRANSACTION']);
});

test('a caught query error cannot lead to a partial transaction commit', async (t) => {
  const seen: string[] = [];
  const client = await plain(t, (body, socket) => {
    const sql = body.subarray(22).toString('utf16le'); seen.push(sql);
    socket.write(packet(4, sql === 'bad statement' ? Buffer.concat([errorToken('bad value'), done(2)]) : done()));
  });
  await assert.rejects(client.transaction(async (tx) => {
    await tx.query('write', []);
    await assert.rejects(tx.query('bad statement', []), TdsError);
  }), /must be rolled back/);
  assert.deepEqual(seen, ['BEGIN TRANSACTION', 'write', 'bad statement', 'ROLLBACK TRANSACTION']);
  await client.query('after rollback', []);
});

test('unrelated calls cannot enter a transaction, and escaped callback work cannot use an ended transaction', async (t) => {
  let entered!: () => void, release!: () => void, late!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const hold = new Promise<void>((resolve) => { release = resolve; });
  const after = new Promise<void>((resolve) => { late = resolve; });
  let escaped: Promise<void> | undefined;
  const seen: string[] = [];
  const client = await plain(t, (body, socket) => { seen.push(body.subarray(22).toString('utf16le')); socket.write(packet(4, done())); });
  const transaction = client.transaction(async (tx) => {
    escaped = after.then(async () => { await assert.rejects(tx.query('escaped', []), /transaction has ended/); });
    entered(); await hold;
  });
  await started;
  await assert.rejects(client.query('outsider', []), /already running/);
  await assert.rejects(client.transaction(async () => {}), /already running/);
  release(); await transaction; late(); await escaped;
  assert.deepEqual(seen, ['BEGIN TRANSACTION', 'COMMIT TRANSACTION']);
});

test('query timeout keeps the connection reserved until attention acknowledgement is consumed', async (t) => {
  let noticed!: () => void, acknowledge!: () => void;
  const attention = new Promise<void>((resolve) => { noticed = resolve; });
  const client = await rpcPeer(t, (type, _body, socket) => {
    if (type === 6) { acknowledge = () => socket.write(packet(4, done(0x20))); noticed(); }
  });
  const pending = assert.rejects(client.query('wait', [], { timeoutMs: 20 }), /timed out/);
  await attention;
  await assert.rejects(client.query('overlap', []), /already running/);
  acknowledge(); await pending;
});

test('RPC errors drain DONEINPROC and DONEPROC before allowing rollback or another query', async (t) => {
  let count = 0;
  const client = await rpcPeer(t, (_type, _body, socket) => {
    if (++count === 1) socket.write(packet(4, Buffer.concat([errorToken('hidden parameter'), done(2, 0n, 0xff), done(2, 0n, 0xfe)])));
    else socket.write(packet(4, done()));
  });
  await assert.rejects(client.query('select @p1', ['hidden parameter']), TdsError);
  await client.query('again', []); assert.equal(count, 2);
});

test('malformed bytes after DONE_ATTN close the connection instead of permitting reuse', async (t) => {
  const client = await rpcPeer(t, (type, _body, socket) => {
    if (type === 6) socket.write(packet(4, Buffer.concat([done(0x20), Buffer.from([0])])));
  });
  await assert.rejects(client.query('wait', [], { timeoutMs: 20 }), /timed out/);
  await assert.rejects(client.query('again', []), /connection closed/);
});

test('PLP values larger than the old whole-message limit stream across packets', async (t) => {
  const data = Buffer.alloc(17 * 1024 * 1024, 37);
  const client = await plain(t, (_, socket) => sendResponse(socket, Buffer.concat([
    metadata([{ id: 0xa5, info: u16(65535) }]), Buffer.from([0xd1]), plpBytes([data.subarray(0, 9000000), data.subarray(9000000)]), done(),
  ]), 4088));
  const result = await client.query('large PLP', [], { timeoutMs: 10000 });
  assert.ok(result.rows[0][0] instanceof Uint8Array);
  assert.equal(result.rows[0][0].length, data.length);
  assert.deepEqual(result.rows[0][0], Uint8Array.from(data));
});

test('RPC within a transaction carries the active descriptor and successful nesting does not commit early', async (t) => {
  const descriptor = Buffer.from([2, 2, 2, 2, 2, 2, 2, 2]); const seen: string[] = [];
  const client = await rpcPeer(t, (type, body, socket) => {
    const sql = type === 3 ? 'rpc' : body.subarray(22).toString('utf16le'); seen.push(sql);
    assert.deepEqual(body.subarray(10, 18), seen.length === 1 ? Buffer.alloc(8) : descriptor);
    const change = sql === 'BEGIN TRANSACTION' ? env(8, descriptor, Buffer.alloc(0))
      : sql === 'COMMIT TRANSACTION' ? env(9, Buffer.alloc(0), descriptor) : Buffer.alloc(0);
    socket.write(packet(4, Buffer.concat([change, done()])));
  });
  assert.equal(await client.transaction(async (tx) => tx.transaction(async (nested) => {
    await nested.query('select @p1', [42]); return 'result';
  })), 'result');
  assert.deepEqual(seen, ['BEGIN TRANSACTION', 'SAVE TRANSACTION [tabularius_1]', 'rpc', 'COMMIT TRANSACTION']);
});

for (const status of [0x21, 0x120]) test(`fatal or incomplete attention DONE ${status} cannot make a connection reusable`, async (t) => {
  let requests = 0;
  const client = await rpcPeer(t, (type, _body, socket) => {
    if (type === 6) socket.write(packet(4, done(status)));
    else if (++requests > 1) socket.write(packet(4, done()));
  });
  await assert.rejects(client.query('wait', [], { timeoutMs: 20 }), /timed out/);
  await assert.rejects(client.query('again', []), /connection closed/);
});
