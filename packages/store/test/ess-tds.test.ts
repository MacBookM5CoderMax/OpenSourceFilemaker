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
] as const) test(`unsupported ${name} fails with a named not-decoded error`, async (t) => {
  const client = await plain(t, (_, socket) => socket.write(packet(4, metadata([{ id, info }]))));
  await assert.rejects(client.batch('unsupported'), (error: unknown) => {
    assert.ok(error instanceof Error); assert.ok(error.message.includes(name)); assert.match(error.message, /not decoded yet/); return true;
  });
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
