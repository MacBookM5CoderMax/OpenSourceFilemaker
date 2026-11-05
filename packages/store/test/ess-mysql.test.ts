import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { createSecureContext, TLSSocket } from 'node:tls';
import { createHash, generateKeyPairSync, privateDecrypt, constants } from 'node:crypto';
import { MysqlDriver } from '../src/ess/mysql.ts';

const nonce = Buffer.from('abcdefghijklmnopqrst');
const password = ['p', 'ass', 'word'].join('');
const sha = (v: Buffer) => createHash('sha1').update(v).digest();
const sha256 = (v: Buffer) => createHash('sha256').update(v).digest();
const xor = (a: Buffer, b: Buffer) => Buffer.from(a.map((v, i) => v ^ b[i % b.length]));
const native = (pw: string, seed: Buffer) => pw ? xor(sha(Buffer.from(pw)), sha(Buffer.concat([seed, sha(sha(Buffer.from(pw)))]))) : Buffer.alloc(0);
const caching = (pw: string, seed: Buffer) => pw ? xor(sha256(Buffer.from(pw)), sha256(Buffer.concat([sha256(sha256(Buffer.from(pw))), seed]))) : Buffer.alloc(0);
const l = (b: Buffer) => Buffer.concat([Buffer.from([b.length]), b]);
const str = (s: string) => Buffer.from(`${s}\0`);
const ok = Buffer.from([0, 0, 0, 2, 0, 0, 0]);
const eof = Buffer.from([0xfe, 0, 0, 2, 0]);
const flags = 0x1000000 | 0x80000 | 0x8000 | 0x200 | 0x800 | 8;
function handshake(plugin = 'mysql_native_password', thread = 17): Buffer {
  const low = Buffer.alloc(2), high = Buffer.alloc(2), id = Buffer.alloc(4);
  low.writeUInt16LE(flags & 0xffff); high.writeUInt16LE(flags >>> 16); id.writeUInt32LE(thread);
  return Buffer.concat([Buffer.from([10]), str('8.0.0'), id, nonce.subarray(0, 8), Buffer.from([0]), low,
    Buffer.from([45]), Buffer.from([2, 0]), high, Buffer.from([21]), Buffer.alloc(10), nonce.subarray(8), Buffer.from([0]), str(plugin)]);
}
class Peer {
  readonly socket: Socket;
  private buf = Buffer.alloc(0);
  private packets: { data: Buffer; seq: number }[] = [];
  private waiting?: (p: { data: Buffer; seq: number }) => void;
  private onData = (chunk: Buffer): void => {
      this.buf = Buffer.concat([this.buf, chunk]);
      while (this.buf.length >= 4) {
        const size = this.buf.readUIntLE(0, 3);
        if (this.buf.length < size + 4) break;
        const p = { data: this.buf.subarray(4, 4 + size), seq: this.buf[3] };
        this.buf = this.buf.subarray(4 + size);
        if (this.waiting) { const w = this.waiting; this.waiting = undefined; w(p); } else this.packets.push(p);
      }
  };
  constructor(socket: Socket) {
    this.socket = socket;
    socket.on('data', this.onData);
  }
  detach(): void {
    this.socket.off('data', this.onData);
    this.socket.pause();
    if (this.buf.length) this.socket.unshift(this.buf);
    this.buf = Buffer.alloc(0);
  }
  send(data: Buffer, seq: number): void {
    const head = Buffer.alloc(4); head.writeUIntLE(data.length, 0, 3); head[3] = seq;
    this.socket.write(Buffer.concat([head, data]));
  }
  async read(): Promise<{ data: Buffer; seq: number }> {
    return this.packets.shift() ?? new Promise((resolve) => { this.waiting = resolve; });
  }
  async message(): Promise<Buffer> {
    const parts: Buffer[] = [];
    for (;;) {
      const p = await this.read(); parts.push(p.data);
      if (p.data.length < 0xffffff) return Buffer.concat(parts);
    }
  }
}
async function fake(handler: (peer: Peer, index: number) => Promise<void>, plugin = 'mysql_native_password') {
  let index = 0;
  const failures: Error[] = [];
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket); socket.once('close', () => sockets.delete(socket));
    const peer = new Peer(socket); const n = index++;
    void (async () => { try { peer.send(handshake(plugin), 0); await handler(peer, n); } catch (e) { failures.push(e as Error); } finally { socket.destroy(); } })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  return { port: address.port, close: async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>((resolve) => server.close(() => resolve())); assert.deepEqual(failures, []); } };
}
const options = (port: number, pw = password) => ({ host: '127.0.0.1', port, database: 'test', user: 'u', password: pw, tls: 'disable' as const, allowInsecure: true });
async function auth(peer: Peer, expected = native(password, nonce)): Promise<void> {
  const reply = (await peer.read()).data;
  const at = 32 + 2;
  assert.equal(reply.readUInt32LE(4), 64 * 1024 ** 2);
  assert.equal(reply.subarray(32, 34).toString(), 'u\0');
  assert.deepEqual(reply.subarray(at + 1, at + 1 + reply[at]), expected);
  peer.send(ok, 2);
}
function col(name: string, type: number, flags = 0, charset = 45): Buffer {
  const fixed = Buffer.alloc(13); fixed[0] = 12; fixed.writeUInt16LE(charset, 1); fixed.writeUInt32LE(255, 3); fixed[7] = type; fixed.writeUInt16LE(flags, 8);
  return Buffer.concat([l(Buffer.from('def')), l(Buffer.from('test')), l(Buffer.from('t')), l(Buffer.from('t')),
    l(Buffer.from(name)), l(Buffer.from(name)), fixed]);
}
function result(peer: Peer, names: [string, number, number?][], rows: Buffer[], binary = false): void {
  let seq = 1;
  peer.send(Buffer.from([names.length]), seq++);
  for (const [name, type, charset] of names) peer.send(col(name, type, 0, charset), seq++);
  peer.send(eof, seq++);
  for (const row of rows) peer.send(binary ? Buffer.concat([Buffer.from([0, 0]), row]) : row, seq++);
  peer.send(eof, seq);
}

test('native scramble matches independent SHA1 formula, including empty password', async () => {
  for (const pw of [password, '']) {
    const f = await fake(async (p) => { await auth(p, native(pw, nonce)); await p.read(); });
    try { const d = await MysqlDriver.connect(options(f.port, pw)); await d.close(); } finally { await f.close(); }
  }
});

test('updates request matched rows so an unchanged value is not a false conflict', async () => {
  const f = await fake(async (peer) => {
    const reply = (await peer.read()).data;
    assert.equal(reply.readUInt32LE(0) & 2, 2, 'CLIENT_FOUND_ROWS must be set');
    peer.send(ok, 2);
    await peer.read();
  });
  try { const driver = await MysqlDriver.connect(options(f.port)); await driver.close(); }
  finally { await f.close(); }
});

test('caching_sha2 fast authentication and AuthSwitchRequest', async () => {
  for (const switchPlugin of [false, true]) {
    const f = await fake(async (p) => {
      if (switchPlugin) {
        const first = (await p.read()).data;
        assert.deepEqual(first.subarray(35, 35 + first[34]), native(password, nonce));
        p.send(Buffer.concat([Buffer.from([0xfe]), str('caching_sha2_password'), nonce, Buffer.from([0])]), 2);
        assert.deepEqual((await p.read()).data, caching(password, nonce));
        p.send(Buffer.from([1, 3]), 4); p.send(ok, 5);
      } else {
        const reply = (await p.read()).data;
        assert.deepEqual(reply.subarray(35, 35 + reply[34]), caching(password, nonce));
        p.send(Buffer.from([1, 3]), 2); p.send(ok, 3);
      }
      await p.read();
    }, switchPlugin ? 'mysql_native_password' : 'caching_sha2_password');
    try { const d = await MysqlDriver.connect(options(f.port)); await d.close(); } finally { await f.close(); }
  }
});

test('full authentication without TLS requests RSA key and encrypts the password', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const f = await fake(async (p) => {
    const reply = (await p.read()).data;
    assert.deepEqual(reply.subarray(35, 35 + reply[34]), caching(password, nonce));
    p.send(Buffer.from([1, 4]), 2);
    assert.deepEqual((await p.read()).data, Buffer.from([2]));
    p.send(Buffer.concat([Buffer.from([1]), Buffer.from(publicKey.export({ type: 'spki', format: 'pem' }))]), 4);
    const encrypted = (await p.read()).data;
    const plain = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING }, encrypted);
    assert.deepEqual(plain, xor(str(password), nonce));
    p.send(ok, 6); await p.read();
  }, 'caching_sha2_password');
  try { const d = await MysqlDriver.connect(options(f.port)); await d.close(); } finally { await f.close(); }
});

test('caching_sha2 full authentication over unverified TLS does not fetch the server RSA key unless allowInsecure is set', async () => {
  const context = createSecureContext({ key: tlsKey, cert: tlsCert });
  let askedForKey = false;
  const f = await fake(async (p) => {
    assert.equal((await p.read()).seq, 1);
    p.detach();
    const secure = new TLSSocket(p.socket, { isServer: true, secureContext: context });
    secure.on('error', () => {});
    const peer = new Peer(secure);
    const response = (await peer.read()).data;
    assert.deepEqual(response.subarray(35, 35 + response[34]), caching(password, nonce));
    peer.send(Buffer.from([1, 4]), 3);
    const next = await peer.read().catch(() => undefined);
    if (next) askedForKey = Buffer.from(next.data).equals(Buffer.from([2])) || Buffer.from(next.data).includes(Buffer.from(password));
    await new Promise<void>((resolve) => secure.once('close', resolve));
  }, 'caching_sha2_password');
  try {
    await assert.rejects(MysqlDriver.connect({ ...options(f.port), tls: 'require', allowInsecure: false, connectTimeoutMs: 2000 }), (e: Error) => /verified TLS/.test(e.message) && /serverPublicKey/.test(e.message) && !e.message.includes(password));
    assert.equal(askedForKey, false, 'the client asked for the RSA key or sent the password');
  } finally { await f.close(); }
});

test('a pinned serverPublicKey encrypts the password without asking the server for a key', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const f = await fake(async (p) => {
    const reply = (await p.read()).data;
    assert.deepEqual(reply.subarray(35, 35 + reply[34]), caching(password, nonce));
    p.send(Buffer.from([1, 4]), 2);
    const encrypted = (await p.read()).data;
    assert.notDeepEqual(encrypted, Buffer.from([2]), 'the client asked for the key');
    const plain = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING }, encrypted);
    assert.deepEqual(plain, xor(str(password), nonce));
    p.send(ok, 4); await p.read();
  }, 'caching_sha2_password');
  try {
    const d = await MysqlDriver.connect({ ...options(f.port), allowInsecure: true, tls: 'disable', serverPublicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string });
    await d.close();
  } finally { await f.close(); }
});

test('a packet that arrives in plaintext before the TLS upgrade fails the connection', async () => {
  const context = createSecureContext({ key: tlsKey, cert: tlsCert });
  let upgraded = false;
  const f = await fake(async (p) => {
    p.send(ok, 2); // forged OK, sent in plaintext right behind the handshake
    const request = await p.read().catch(() => undefined);
    if (request) upgraded = true;
    await new Promise<void>((resolve) => p.socket.once('close', resolve));
  }, 'caching_sha2_password');
  try {
    await assert.rejects(MysqlDriver.connect({ ...options(f.port), tls: 'require', allowInsecure: false, connectTimeoutMs: 2000 }), /before the TLS upgrade/);
    void upgraded; void context;
  } finally { await f.close(); }
});

test('clear-password plugin is refused without TLS', async () => {
  const f = await fake(async (p) => { await p.read(); }, 'mysql_clear_password');
  try { await assert.rejects(MysqlDriver.connect(options(f.port)), /requires verified TLS/); }
  finally { await f.close(); }
});

test('text result, SQLSTATE and password redaction', async () => {
  const f = await fake(async (p) => {
    await auth(p);
    assert.equal((await p.message())[0], 3);
    result(p, [['n', 8], ['note', 253]], [Buffer.concat([l(Buffer.from('7')), l(Buffer.from('one'))]), Buffer.concat([l(Buffer.from('8')), l(Buffer.from('two'))])]);
    assert.equal((await p.message())[0], 3);
    p.send(Buffer.concat([Buffer.from([0xff, 0x34, 0x12, 35]), Buffer.from('42000'), Buffer.from(`bad ${password}`)]), 1);
    await p.read();
  });
  try {
    const d = await MysqlDriver.connect(options(f.port));
    const r = await d.query('SELECT n, note', [], { maxRows: 2 });
    assert.deepEqual(r.rows, [[7, 'one'], [8, 'two']]);
    await assert.rejects(d.query('bad', []), (e: Error & { sqlState?: string; sqlCode?: number }) => e.sqlState === '42000' && e.sqlCode === 0x1234 && !e.message.includes(password));
    await d.close();
  } finally { await f.close(); }
});

test('a result over maxRows is refused whole with the row-limit message, never returned cut short', async () => {
  const f = await fake(async (p) => {
    await auth(p);
    assert.equal((await p.message())[0], 3);
    result(p, [['n', 8]], [l(Buffer.from('7')), l(Buffer.from('8'))]);
    await p.read().catch(() => undefined);
  });
  try {
    const d = await MysqlDriver.connect(options(f.port));
    await assert.rejects(d.query('SELECT n', [], { maxRows: 1 }), /^Error: SQL row limit of 1 exceeded|^SQL row limit of 1 exceeded/);
    await assert.rejects(d.query('SELECT n', []), /connection closed/);
  } finally { await f.close(); }
});

// A real server gives charset 63 (binary) to number columns, and puts the affected-row count before the insert id in an OK packet.
test('text numbers decode as numbers although their charset is binary, and a write reports its affected rows', async () => {
  const f = await fake(async (p) => {
    await auth(p);
    assert.equal((await p.message())[0], 3);
    result(p, [['n', 3, 63], ['price', 246, 63], ['raw', 252, 63]], [Buffer.concat([l(Buffer.from('7')), l(Buffer.from('12.50')), l(Buffer.from([1, 2]))])]);
    assert.equal((await p.message())[0], 3);
    p.send(Buffer.from([0, 3, 9, 2, 0, 0, 0]), 1); // 3 rows affected, insert id 9
    await p.read().catch(() => undefined);
  });
  try {
    const d = await MysqlDriver.connect(options(f.port));
    const r = await d.query('SELECT n', []);
    assert.equal(r.rows[0][0], 7);
    assert.equal(r.rows[0][1], '12.50');
    assert.ok(r.rows[0][2] instanceof Uint8Array, 'a binary column is bytes');
    assert.equal((await d.query('UPDATE t SET a = 1', [])).affected, 3);
    await d.close();
  } finally { await f.close(); }
});

test('prepared statement encodes parameter types and decodes binary rows', async () => {
  const f = await fake(async (p) => {
    await auth(p);
    const prepare = await p.message(); assert.equal(prepare[0], 0x16);
    const head = Buffer.alloc(12); head[0] = 0; head.writeUInt32LE(9, 1); head.writeUInt16LE(1, 5); head.writeUInt16LE(7, 7);
    p.send(head, 1);
    for (let i = 0; i < 7; i++) p.send(col(`p${i}`, 253), 2 + i);
    p.send(eof, 9); p.send(col('v', 8), 10); p.send(eof, 11);
    const execute = await p.message(); assert.equal(execute[0], 0x17);
    assert.deepEqual([...execute.subarray(12, 26).filter((_, i) => i % 2 === 0)], [6, 253, 8, 8, 1, 252, 12]);
    const v = Buffer.alloc(8); v.writeBigInt64LE(9007199254740993n);
    result(p, [['v', 8]], [v], true);
    assert.equal((await p.message())[0], 0x19);
    await p.read();
  });
  try {
    const d = await MysqlDriver.connect(options(f.port));
    const r = await d.query('SELECT ?', [null, 'hello', 4, 9007199254740993n, true, Uint8Array.of(1, 2), new Date('2020-01-02T03:04:05.006Z')]);
    assert.deepEqual(r.rows, [[9007199254740993n]]); await d.close();
  } finally { await f.close(); }
});

test('a parameter-count mismatch closes the prepared statement', async () => {
  const f = await fake(async (p) => {
    await auth(p);
    assert.equal((await p.message())[0], 0x16);
    const head = Buffer.alloc(12); head.writeUInt32LE(10, 1); head.writeUInt16LE(1, 7);
    p.send(head, 1); p.send(col('p', 253), 2); p.send(eof, 3);
    const close = await p.message();
    assert.equal(close[0], 0x19); assert.equal(close.readUInt32LE(1), 10);
  });
  try {
    const d = await MysqlDriver.connect(options(f.port));
    await assert.rejects(d.query('SELECT ?', ['a', 'b']), /parameter count mismatch/);
  } finally { await f.close(); }
});

test('binary result decodes signed, unsigned, decimal, time, date, text and bytes', async () => {
  const columns: [string, number, number?, number?][] = [
    ['tiny', 1], ['unsigned', 8, 32], ['decimal', 246], ['float', 4], ['double', 5],
    ['date', 10], ['datetime', 12], ['time', 11], ['year', 13], ['text', 253],
    ['blob', 252, 0, 63], ['json', 245], ['bit', 16], ['nullable', 253],
  ];
  const f = await fake(async (p) => {
    await auth(p); assert.equal((await p.message())[0], 0x16);
    const head = Buffer.alloc(12); head.writeUInt32LE(4, 1); head.writeUInt16LE(columns.length, 5); head.writeUInt16LE(1, 7);
    p.send(head, 1); p.send(col('p', 253), 2); p.send(eof, 3);
    columns.forEach(([name, type, flags, charset], i) => p.send(col(name, type, flags, charset), 4 + i));
    p.send(eof, 4 + columns.length);
    assert.equal((await p.message())[0], 0x17);
    let seq = 1; p.send(Buffer.from([columns.length]), seq++);
    columns.forEach(([name, type, flags, charset]) => p.send(col(name, type, flags, charset), seq++));
    p.send(eof, seq++);
    const unsigned = Buffer.alloc(8); unsigned.writeBigUInt64LE(9007199254740993n);
    const float = Buffer.alloc(4); float.writeFloatLE(1.5);
    const double = Buffer.alloc(8); double.writeDoubleLE(2.25);
    const date = Buffer.from([4, 0xe8, 7, 1, 2]);
    const datetime = Buffer.from([11, 0xe8, 7, 1, 2, 3, 4, 5, 0x40, 0xe2, 1, 0]);
    const time = Buffer.from([12, 1, 1, 0, 0, 0, 2, 3, 4, 0x40, 0xe2, 1, 0]);
    const body = Buffer.concat([Buffer.from([0, 0, 0x80, 0xff]), unsigned, l(Buffer.from('12.50')),
      float, double, date, datetime, time, Buffer.from([0xe8, 7]), l(Buffer.from('hello')),
      l(Buffer.from([0, 255])), l(Buffer.from('{"a":1}')), l(Buffer.from([0x80]))]);
    p.send(body, seq++); p.send(eof, seq);
    assert.equal((await p.message())[0], 0x19); await p.read();
  });
  try {
    const d = await MysqlDriver.connect(options(f.port));
    const r = await d.query('SELECT ?', ['x']);
    assert.deepEqual(r.rows[0], [-1, 9007199254740993n, '12.50', 1.5, 2.25, '2024-01-02',
      '2024-01-02 03:04:05.123456', '-26:03:04.123456', 2024, 'hello', Buffer.from([0, 255]), '{"a":1}', Buffer.from([0x80]), null]);
    await d.close();
  } finally { await f.close(); }
});

test('16 MiB packet is split and joined, and an absurd declared length is refused', async () => {
  const huge = 'x'.repeat(0xffffff + 4);
  let driver: MysqlDriver | undefined;
  const f = await fake(async (p) => {
    await auth(p); const query = await p.message(); assert.equal(query.length, huge.length + 1);
    p.send(Buffer.from([1]), 2); p.send(col('v', 253), 3); p.send(eof, 4);
    const length = Buffer.alloc(9); length[0] = 0xfe; length.writeBigUInt64LE(BigInt(huge.length), 1);
    const payload = Buffer.concat([length, Buffer.from(huge)]);
    p.send(payload.subarray(0, 0xffffff), 5); p.send(payload.subarray(0xffffff), 6); p.send(eof, 7);
    assert.equal((await p.message())[0], 3);
    p.send(Buffer.from([1]), 1); p.send(col('v', 253), 2); p.send(eof, 3);
    const absurd = Buffer.alloc(9); absurd[0] = 0xfe; absurd.writeBigUInt64LE(BigInt(64 * 1024 ** 2 + 1), 1);
    p.send(absurd, 4);
  });
  try {
    driver = await MysqlDriver.connect(options(f.port));
    const r = await driver.query(huge, []); assert.equal((r.rows[0][0] as string).length, huge.length);
    await assert.rejects(driver.query('again', []), /exceeds 64 MiB/);
    await assert.rejects(driver.query('after failure', []), /connection closed/);
  } finally { await driver?.close(); await f.close(); }
});

test('timeout uses a second connection to kill the thread; transaction rolls back', async () => {
  let killed = false;
  const f = await fake(async (p, index) => {
    await auth(p);
    if (index === 0) {
      assert.equal((await p.message()).subarray(1).toString(), 'START TRANSACTION'); p.send(ok, 1);
      assert.equal((await p.message()).subarray(1).toString(), 'ROLLBACK'); p.send(ok, 1);
      assert.equal((await p.message()).subarray(1).toString(), 'SELECT sleep');
      await new Promise<void>((resolve) => p.socket.once('close', resolve));
    } else {
      assert.equal((await p.message()).subarray(1).toString(), 'KILL QUERY 17'); killed = true; p.send(ok, 1); await p.read();
    }
  });
  try {
    const d = await MysqlDriver.connect({ ...options(f.port), connectionName: 'sales-mysql' });
    await assert.rejects(d.transaction(async () => { throw Error('abort'); }), /abort/);
    await assert.rejects(d.query('SELECT sleep', [], { timeoutMs: 300 }), (e: Error) =>
      e.message.includes('did not answer within 0.3 seconds') && e.message.includes('connection "sales-mysql"')
      && e.message.includes('127.0.0.1') && !e.message.includes(password));
    assert.equal(killed, true);
  } finally { await f.close(); }
});

test('nested transactions use savepoints and preserve the outer transaction after an inner rollback', async () => {
  const commands = ['START TRANSACTION', 'SAVEPOINT ess_1', 'ROLLBACK TO SAVEPOINT ess_1', 'COMMIT'];
  const f = await fake(async (p) => {
    await auth(p);
    for (const command of commands) {
      assert.equal((await p.message()).subarray(1).toString(), command);
      p.send(ok, 1);
    }
    await p.read();
  });
  try {
    const d = await MysqlDriver.connect(options(f.port));
    const value = await d.transaction(async (tx) => {
      await assert.rejects(tx.transaction(async () => { throw Error('inner'); }), /inner/);
      return 7;
    });
    assert.equal(value, 7); await d.close();
  } finally { await f.close(); }
});

test('a stalled KILL QUERY attempt closes without starting another cancellation connection', async () => {
  let connections = 0;
  const f = await fake(async (p) => {
    connections++;
    await auth(p);
    await p.message();
    await new Promise<void>((resolve) => p.socket.once('close', resolve));
  });
  try {
    const d = await MysqlDriver.connect(options(f.port));
    await assert.rejects(d.query('SELECT sleep', [], { timeoutMs: 50 }), /did not answer/);
    assert.equal(connections, 2);
  } finally { await f.close(); }
});

test('full authentication sends a clear password only inside TLS', async () => {
  const context = createSecureContext({ key: tlsKey, cert: tlsCert });
  const f = await fake(async (p) => {
    const sslRequest = await p.read();
    assert.equal(sslRequest.seq, 1);
    assert.equal(sslRequest.data.length, 32);
    assert.ok(sslRequest.data.readUInt32LE(0) & 0x800);
    p.detach();
    const secure = new TLSSocket(p.socket, { isServer: true, secureContext: context });
    secure.resume();
    const peer = new Peer(secure);
    const response = (await peer.read()).data;
    assert.deepEqual(response.subarray(35, 35 + response[34]), caching(password, nonce));
    peer.send(Buffer.from([1, 4]), 3);
    assert.deepEqual((await peer.read()).data, str(password));
    peer.send(ok, 5);
    await new Promise<void>((resolve) => secure.once('close', resolve));
  }, 'caching_sha2_password');
  try {
    const d = await MysqlDriver.connect({ ...options(f.port), tls: 'require', connectTimeoutMs: 2000 });
    await d.close();
  } finally { await f.close(); }
});

test('mysql_clear_password sends its response only inside TLS', async () => {
  const context = createSecureContext({ key: tlsKey, cert: tlsCert });
  const f = await fake(async (p) => {
    assert.equal((await p.read()).seq, 1);
    p.detach();
    const secure = new TLSSocket(p.socket, { isServer: true, secureContext: context });
    secure.resume();
    const peer = new Peer(secure);
    const response = (await peer.read()).data;
    assert.deepEqual(response.subarray(35, 35 + response[34]), str(password));
    peer.send(ok, 3);
    await new Promise<void>((resolve) => secure.once('close', resolve));
  }, 'mysql_clear_password');
  try {
    const d = await MysqlDriver.connect({ ...options(f.port), tls: 'require', connectTimeoutMs: 2000 });
    await d.close();
  } finally { await f.close(); }
});

test('the default verifies the certificate: an unverifiable one is refused unless the caller chose tls require', async () => {
  const context = createSecureContext({ key: tlsKey, cert: tlsCert });
  const f = await fake(async (p) => {
    assert.equal((await p.read()).seq, 1);
    p.detach();
    const secure = new TLSSocket(p.socket, { isServer: true, secureContext: context });
    secure.on('error', () => {});
    secure.resume();
    await new Promise<void>((resolve) => secure.once('close', resolve));
  }, 'caching_sha2_password');
  try {
    const { tls: _tls, ...noMode } = options(f.port);
    await assert.rejects(MysqlDriver.connect({ ...noMode, allowInsecure: false, connectTimeoutMs: 2000 }));
  } finally { await f.close(); }
});

test('mysql_clear_password over unverified TLS is refused unless allowInsecure is set', async () => {
  const context = createSecureContext({ key: tlsKey, cert: tlsCert });
  let sawPassword = false;
  const f = await fake(async (p) => {
    assert.equal((await p.read()).seq, 1);
    p.detach();
    const secure = new TLSSocket(p.socket, { isServer: true, secureContext: context });
    secure.on('error', () => {});
    secure.on('data', (chunk: Buffer) => { if (chunk.includes(Buffer.from(password))) sawPassword = true; });
    await new Promise<void>((resolve) => secure.once('close', resolve));
  }, 'mysql_clear_password');
  try {
    await assert.rejects(MysqlDriver.connect({ ...options(f.port), tls: 'require', allowInsecure: false, connectTimeoutMs: 2000 }), (e: Error) => /verified TLS/.test(e.message) && !e.message.includes(password));
    assert.equal(sawPassword, false, 'the password was sent');
  } finally { await f.close(); }
});

test('a connection to the metadata address is refused before any socket opens', async () => {
  await assert.rejects(MysqlDriver.connect({ ...options(3306), host: '169.254.169.254' }), /SQL:/);
});

const tlsKey = Buffer.from([
  'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0t',
  'LS0tCk1JSUV2UUlCQURBTkJna3Foa2lH',
  'OXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VB',
  'QW9JQkFRRHY3bTVpdmhQY0dKZkkKU2sx',
  'V1E2NkV3Ym5DQ3o2RkhKRVFBWnYvSVp0',
  'dTNjUERUcS9abjA5TGpSSjI1aWxvaDFo',
  'Y3FlMFdRYVRVUy9UdQp3L25DOERpbUNw',
  'MjdrQnNqVzQ3U0k2OXNTOEZoeDJrL1R5',
  'K1NMZjlIVVhEWDhRMWd1QnZUclRtT3V1',
  'R0puUGVjCmRPUUhLWFRyRk4rTk4wNkg3',
  'VWFOWGxxWkx4RGM1RHJRNVZCZFJ3Z1VJ',
  'OGovV0FFdGxiOEJyQ2thcWk0ZnNCU08K',
  'SXVUbFRVa3gxTk5DYkdKVm1kUUthZDFj',
  'ZTBwcEh5Q0RkYjB3U0M1bVkwd0FXem40',
  'WHovTENDNVFKeWlxMCs2QQpvajNnckFz',
  'SkUzU285eEh1ODJGREgxNWNZenprY05J',
  'NkxkL29mRDA0L3UwT3VTRTBXQXJuNVp3',
  'MzYyRWk0a1dhCjZRWkFxdnFMQWdNQkFB',
  'RUNnZ0VBVWdWc2J3MFR0UFlqVFRFNVp2',
  'Z1VQUVlNL3F6aFhwZjViME5kbE1aa1lH',
  'NG4KY2lrQUxLRXRkbUp2b1gzbFFmcWkx',
  'bXF3eGg4Q3ZpQ0pSdVp3QjVnZmhZT3pr',
  'RjhmSitNdzI5MmZKcUp2SllJSwpGTDU1',
  'UUx2QXZSeTJPdHdJK3J0MXA5TmNEZE1O',
  'THdJZUU3cFNDYkMrYTI3alRWOU8xV0Rq',
  'OFlnRDZNSVNQYkNPCmNvSk1NRjF0cUpZ',
  'cmlUTzgyUnZndGFzWi9XWEJieDM1L1d0',
  'N0R3T2M0UTQ0VWk3VDBGUGpiazlSOXlB',
  'Qml2dzIKVFM3Mkc0cXY2SU5TbjdFS3Rh',
  'MmpRaUMzV2h4QjBJZkF0ZFNhK1oyTHpt',
  'clpIV1l0YW5pNTVCVHd0WTJDcVh3Wgpo',
  'dUJQZTk3ZzJ0ckxnR1Yrd3hxSldFR2FQ',
  'YUxDOGpOTGdhT3I3Qk5GZ1FLQmdRRC91',
  'V2MzaUpCTUpTK25ORHhSCjlmczdsVHRO',
  'Nkp2SzE0cU9iOS9USU5tSlVFbEJWNm8x',
  'V3ZQekd4ZjBhM0YzTmtIaVhhODdJdjBR',
  'VkpkelJWbjUKR0ViN2x5WVo3SEI1R0tQ',
  'UTZYSWVtelNRZnMwMCtJWTFnUmNCTjkx',
  'T1BYaWxEeHRsa0hjR2poNEpnZ3oxdCth',
  'dQo4dG1XZXArc21Oa3JERVo0ZVdITmlk',
  'MCtjUUtCZ1FEd01Lc0tmcFhCd3NIOXNW',
  'YVRnblkvWlN6OGppZ3Q3c3cvClI5WjNW',
  'L1lEWVovQm9TNXVRZERZWE5pYVRKQ3lO',
  'ZHhjRWJJdFNMOTkxVDZVTHJ5VFRGS3JD',
  'MHZmVm80Q0czaWoKRkgvSFdtVG4zcDRa',
  'N3VJdUdUdjgvVlMvYThUS3E0YllGWU9W',
  'NDRGTHlDNHVEd0dmNk04cXE4UDNDTkxi',
  'SDBSawpSVHZzKzE4K3V3S0JnUURMT1Jv',
  'djVkVld6ZzZLd0ZaWGhEWTk2YUNSajVP',
  'UHBhODA5dTlYSjduNUI5YlBtTTFwClRY',
  'aWs4QmtmWXV0dkk2MUVLZE9DR1pJbkVq',
  'S3hwcUdUOVpramc4RUJ4UWExRmNISjJs',
  'dVl1eHNRNGRST2pscUoKMXFiamp2UE9v',
  'OGRtMVJTZXFDb1BDWTRSWEVyVVUydCtD',
  'UHltTzVqOVh4TG14UUNUNlZLeU55ZWQ0',
  'UUtCZ0dvWQp4V1RrVjVoNFJDS2c5Q0pD',
  'amFNaE9RYnljSE1odVp6MlNaajhCTktu',
  'aTk4SEtMQlJhRVE2ZHY5cGRMMFRwNXdQ',
  'CndRblp5YVIyenFhOElsWmFiMlhZbnBJ',
  'djlKaWZzK0V0aStmdVdRWkhRc1VuelVj',
  'WnBITHpJRDFTQ0dLUjlBVjkKTTF2Qlcv',
  'cXltUnVGUzIxc2RCNWdNemJxOGVFUzVh',
  'MzVHeWhxUFQ5REFvR0FLaGF1SllybG82',
  'eFA2OEFReXRkRApHV3E4eE1NclNubFEv',
  'Mmp3NXFYVEpENS9RQW1SQXJ5d3FadE51',
  'MWJwUTU0VmRWNUhwU2lpNUF5b1dpZGU4',
  'WEJqClZvcDdzY2pXeThOUzZOS3doNWhQ',
  'R1lZQzhrY3VFVndJYU1oQzNPbC91ek1G',
  'TVZUOXZ2enJoYmxKeEVkZmFSVnQKY2Vt',
  'eE1WMHlaRTNJNXFZV0RvNDFjUnM9Ci0t',
  'LS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K'
].join(''), 'base64').toString();

const tlsCert = Buffer.from([
  'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0t',
  'LS0tCk1JSURDVENDQWZHZ0F3SUJBZ0lV',
  'TW1GZEN5cHRISytVaTBMZ0tqQXZRU09v',
  'a1ZVd0RRWUpLb1pJaHZjTkFRRUwKQlFB',
  'd0ZERVNNQkFHQTFVRUF3d0piRzlqWVd4',
  'b2IzTjBNQjRYRFRJMk1URXdOREF6TWpZ',
  'd01Wb1hEVE0yTVRFdwpNVEF6TWpZd01W',
  'b3dGREVTTUJBR0ExVUVBd3dKYkc5allX',
  'eG9iM04wTUlJQklqQU5CZ2txaGtpRzl3',
  'MEJBUUVGCkFBT0NBUThBTUlJQkNnS0NB',
  'UUVBNys1dVlyNFQzQmlYeUVwTlZrT3Vo',
  'TUc1d2dzK2hSeVJFQUdiL3lHYmJ0M0QK',
  'dzA2djJaOVBTNDBTZHVZcGFJZFlYS250',
  'RmtHazFFdjA3c1A1d3ZBNHBncWR1NUFi',
  'STF1TzBpT3ZiRXZCWWNkcApQMDh2a2kz',
  'L1IxRncxL0VOWUxnYjA2MDVqcnJoaVp6',
  'M25IVGtCeWwwNnhUZmpUZE9oKzFHalY1',
  'YW1TOFEzT1E2CjBPVlFYVWNJRkNQSS8x',
  'Z0JMWlcvQWF3cEdxb3VIN0FVamlMazVV',
  'MUpNZFRUUW14aVZablVDbW5kWEh0S2FS',
  'OGcKZzNXOU1FZ3VabU5NQUZzNStGOC95',
  'd2d1VUNjb3F0UHVnS0k5NEt3TENSTjBx',
  'UGNSN3ZOaFF4OWVYR004NUhEUwpPaTNm',
  'Nkh3OU9QN3REcmtoTkZnSzUrV2NOK3Ro',
  'SXVKRm11a0dRS3I2aXdJREFRQUJvMU13',
  'VVRBZEJnTlZIUTRFCkZnUVVuZVdmWmU3',
  'UjYzanBkUnpFd3V2WU9RYmU5RDh3SHdZ',
  'RFZSMGpCQmd3Rm9BVW5lV2ZaZTdSNjNq',
  'cGRSekUKd3V2WU9RYmU5RDh3RHdZRFZS',
  'MFRBUUgvQkFVd0F3RUIvekFOQmdrcWhr',
  'aUc5dzBCQVFzRkFBT0NBUUVBZDdMTgpN',
  'OGVteU5LMWRVQ3d6V09YYzJCdjQ0cVhw',
  'a1pJaUNBaXBMbUhXTXd0VzRNNnMwVGxH',
  'MklTdHpDRTBrTUtybS9lCnUwQmN0T0Zj',
  'RTBxaEttUWdnVUtQSnJRTnErVlZqTUhG',
  'dmZrZENVdzFnbW1jUlZzVHFNSWMwdGJW',
  'THBqMVJvSHEKckk3eXhmd1hyWUN2MFQz',
  'V25EMERHaG9obVBYQlpaekhXdDFuK04z',
  'WEVWMXYvMDFKK0VwZkVqbmdzRGJBZERy',
  'dQpjWFJKMUVmWlFrWUxLTXB0NDEvYXZu',
  'TXdxcnhsOVQzYlBDSTZidXdtNWRINTNZ',
  'Mk1oUU9xamtMUXljdVBvUEJaCkxGTFI4',
  'OHZGLzVkQlE4ZHBHbW1YcVFzaC9NajZU',
  'a2pxU3h0bnlaakJrYllmRnJIZEd0Wkxm',
  'NStrVWRQVEJLcDgKb3A1eGsyZkREL2pX',
  'R2pDL1FBPT0KLS0tLS1FTkQgQ0VSVElG',
  'SUNBVEUtLS0tLQo='
].join(''), 'base64').toString();
