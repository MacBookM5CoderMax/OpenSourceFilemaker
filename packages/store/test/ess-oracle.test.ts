// Synthetic local peers only. These scripts and the client implement the same
// public-description layouts: their agreement does not prove compatibility
// with Oracle Database. Every wire layout is unverified against a real server.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { createServer as createTlsServer } from 'node:tls';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { localCertificate } from '../../server/src/local-tls.ts';
import { OracleClient, readTtcClr, readTtcInteger, writeTtcClr, writeTtcInteger, type OracleOptions } from '../src/ess/oracle.ts';

const ub = (n: number) => writeTtcInteger(n);
const clr = (s: string | Buffer) => writeTtcClr(Buffer.isBuffer(s) ? s : Buffer.from(s));
function frame(type: number, body = Buffer.alloc(0), large = false): Buffer {
  const head = Buffer.alloc(8);
  if (large) head.writeUInt32BE(body.length + 8); else head.writeUInt16BE(body.length + 8);
  head[4] = type;
  return Buffer.concat([head, body]);
}
function data(body: Buffer, large = false, flags = 0): Buffer {
  const prefix = Buffer.alloc(2); prefix.writeUInt16BE(flags);
  return frame(6, Buffer.concat([prefix, body]), large);
}
const accepted = (version = 315, flags = 0) => {
  const b = Buffer.alloc(10);
  b.writeUInt16BE(version); b.writeUInt16BE(8192, 4); b.writeUInt16BE(65535, 6); b.writeUInt16BE(flags, 8);
  return frame(2, b);
};
function protocolReply(): Buffer {
  const charset = Buffer.alloc(2); charset.writeUInt16LE(873);
  return Buffer.concat([Buffer.from([1]), ub(6), clr('synthetic banner'), charset, ub(0), clr(Buffer.from([1, 2])), clr(Buffer.from([3]))]);
}
const typesReply = () => Buffer.concat([Buffer.from([2]), ub(1), ub(2), ub(0)]);

class Wire {
  readonly socket: Socket;
  constructor(socket: Socket) { this.socket = socket; socket.on('error', () => {}); }
  async bytes(n: number): Promise<Buffer> {
    for (;;) {
      const b = this.socket.read(n) as Buffer | null;
      if (b) return b;
      if (this.socket.destroyed || this.socket.readableEnded) throw new Error('fake socket closed');
      await new Promise<void>((resolve) => {
        const done = () => { this.socket.off('readable', done).off('end', done).off('close', done); resolve(); };
        this.socket.once('readable', done).once('end', done).once('close', done);
      });
    }
  }
  async read(large = false): Promise<{ type: number; head: Buffer; body: Buffer }> {
    const head = await this.bytes(8), size = large ? head.readUInt32BE() : head.readUInt16BE();
    assert.ok(size >= 8 && size <= 65535);
    return { type: head[4], head, body: await this.bytes(size - 8) };
  }
  write(bytes: Buffer): void { this.socket.write(bytes); }
}

async function fake(t: TestContext, script: (w: Wire, index: number) => Promise<void>, tls?: { cert: string; key: string }, host = '127.0.0.1') {
  const sockets = new Set<Socket>(), tasks: Promise<void>[] = [], errors: unknown[] = [];
  let index = 0;
  const listener = (socket: Socket) => {
    sockets.add(socket);
    tasks.push(script(new Wire(socket), index++).catch((e) => { errors.push(e); socket.destroy(); }));
  };
  const server = tls ? createTlsServer(tls, listener) : createServer(listener);
  server.listen(0, host); await once(server, 'listening');
  t.after(async () => {
    for (const s of sockets) s.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.all(tasks);
    assert.deepEqual(errors, []);
  });
  return { host, port: (server.address() as { port: number }).port, serviceName: 'synthetic', ssl: tls ? 'verify-full' as const : 'disable' as const, allowInsecure: !tls };
}

async function startup(w: Wire, version = 315, fragments?: number[]): Promise<void> {
  const first = await w.read(); assert.equal(first.type, 1);
  w.write(accepted(version));
  const large = version >= 315;
  const hello = await w.read(large); assert.equal(hello.type, 6);
  assert.equal(hello.body.readUInt16BE(), 0);
  assert.equal(hello.body[2], 1);
  assert.deepEqual([...hello.body.subarray(3, 10)], [6, 5, 4, 3, 2, 1, 0]);
  assert.equal(hello.body.subarray(10).toString(), 'tabularius\0');
  const response = protocolReply();
  if (fragments) {
    let at = 0;
    for (const n of fragments) { w.write(data(response.subarray(at, at + n), large)); at += n; }
    w.write(data(response.subarray(at), large));
  } else w.write(data(response, large));
  const types = await w.read(large); assert.equal(types.type, 6);
  const b = types.body.subarray(2); assert.equal(b[0], 2);
  let at = 1;
  const charset = readTtcInteger(b, at); at = charset.offset; assert.equal(charset.value, 873n);
  const national = readTtcInteger(b, at); at = national.offset; assert.equal(national.value, 2000n);
  const compile = readTtcClr(b, at); at = compile.offset; assert.equal(compile.value.length, 0);
  const runtime = readTtcClr(b, at); at = runtime.offset; assert.equal(runtime.value.length, 0);
  const representations: number[] = [];
  for (;;) { const item = readTtcInteger(b, at); at = item.offset; if (item.value === 0n) break; representations.push(Number(item.value)); }
  assert.deepEqual(representations, [1, 2, 8, 12, 23, 24, 96, 100, 101, 112, 113, 180, 181, 183, 231, 11, 102, 116]);
  assert.equal(at, b.length);
  w.write(data(typesReply(), large));
}
async function opened(t: TestContext, options: OracleOptions): Promise<OracleClient> {
  const client = await OracleClient.connect(options); t.after(() => client.close()); return client;
}

test('CONNECT has the exact TNS header, fixed fields and descriptor', async (t) => {
  let sawGoodbye!: () => void;
  const goodbyeSeen = new Promise<void>((resolve) => { sawGoodbye = resolve; });
  const options = await fake(t, async (w) => {
    const p = await w.read();
    assert.equal(p.type, 1);
    assert.deepEqual([...p.head], [p.head.readUInt16BE() >> 8, p.head.readUInt16BE() & 255, 0, 0, 1, 0, 0, 0]);
    assert.equal(p.body.readUInt16BE(), 319); assert.equal(p.body.readUInt16BE(2), 300);
    assert.equal(p.body.readUInt16BE(4), 0x0c41);
    assert.equal(p.body.readUInt16BE(6), 8192); assert.equal(p.body.readUInt16BE(8), 65535);
    assert.equal(p.body.readUInt16BE(12), 0x0100);
    assert.equal(p.body.readUInt32BE(52), 8192); assert.equal(p.body.readUInt32BE(56), 65535);
    const descriptor = p.body.subarray(60);
    assert.equal(p.body.readUInt16BE(14), descriptor.length);
    assert.equal(p.body.readUInt16BE(16), 68);
    assert.match(descriptor.toString(), /^\(DESCRIPTION=\(ADDRESS=\(PROTOCOL=TCP\)\(HOST=127\.0\.0\.1\)\(PORT=\d+\)\)\(CONNECT_DATA=\(SERVICE_NAME=synthetic\)\(CID=\(PROGRAM=tabularius\)\(HOST=[^()=]+\)\(USER=[^()=]+\)\)\)\)$/);
    w.write(accepted());
    const hello = await w.read(true); assert.equal(hello.type, 6);
    w.write(data(protocolReply(), true));
    await w.read(true); w.write(data(typesReply(), true));
    const goodbye = await w.read(true); assert.equal(goodbye.type, 6); assert.equal(goodbye.body.readUInt16BE(), 0x40); sawGoodbye();
  });
  const c = await OracleClient.connect(options);
  assert.equal(c.serverVersion, 315); await c.close(); await goodbyeSeen;
});

test('rejects descriptor metacharacters and plain TCP without explicit consent', async () => {
  for (const field of ['host', 'serviceName', 'sid'] as const) {
    const options = { host: '127.0.0.1', port: 1, serviceName: 'synthetic', ssl: 'disable' as const, allowInsecure: true };
    const bad = { ...options, [field]: 'bad=value' };
    if (field === 'sid') delete (bad as Partial<typeof bad>).serviceName;
    await assert.rejects(OracleClient.connect(bad), new RegExp(field));
  }
  await assert.rejects(OracleClient.connect({ host: '127.0.0.1', serviceName: 'synthetic', ssl: 'disable' }), /allowInsecure/);
});

test('ACCEPT switches to four-byte packet lengths and fragmented TTC messages reassemble', async (t) => {
  const options = await fake(t, async (w) => startup(w, 315, [1, 2]));
  const c = await opened(t, options);
  assert.equal(c.serverVersion, 315); assert.equal(c.serverCharset, 873);
  assert.equal(c.serverBanner, 'synthetic banner');
  assert.deepEqual(c.serverCapabilities.compile, Buffer.from([1, 2]));
  assert.deepEqual(c.serverCapabilities.runtime, Buffer.from([3]));
});

test('RESEND repeats CONNECT and REFUSE exposes listener reason', async (t) => {
  const resend = await fake(t, async (w) => {
    const a = await w.read(); w.write(frame(11));
    const b = await w.read(); assert.deepEqual(b, a);
    w.write(accepted()); const hello = await w.read(true); assert.equal(hello.type, 6);
    w.write(data(protocolReply(), true)); await w.read(true); w.write(data(typesReply(), true));
  });
  await opened(t, resend);
  const refusal = await fake(t, async (w) => { await w.read(); w.write(frame(4, Buffer.from('ORA-12514: service missing'))); });
  await assert.rejects(OracleClient.connect(refusal), /ORA-12514: service missing/);
});

test('long CONNECT descriptor follows in three bounded DATA packets', async (t) => {
  const serviceName = 's'.repeat(20_000);
  const options = await fake(t, async (w) => {
    const connect = await w.read(); assert.equal(connect.type, 1);
    assert.equal(connect.body.length, 60); assert.equal(connect.body.readUInt16BE(16), 0);
    const count = connect.body.readUInt16BE(14);
    const parts: Buffer[] = [];
    while (Buffer.concat(parts).length < count) {
      const p = await w.read(); assert.equal(p.type, 6);
      assert.ok(p.body.length <= 8192); assert.equal(p.body.readUInt16BE(), 0);
      parts.push(p.body.subarray(2));
    }
    assert.equal(parts.length, 3);
    const descriptor = Buffer.concat(parts);
    assert.equal(descriptor.length, count);
    assert.match(descriptor.toString(), new RegExp(`\\(SERVICE_NAME=${serviceName}\\)`));
    w.write(accepted()); await w.read(true); w.write(data(protocolReply(), true));
    await w.read(true); w.write(data(typesReply(), true));
  });
  await opened(t, { ...options, serviceName });
});

test('SID is selected only when supplied and older ACCEPT keeps two-byte lengths', async (t) => {
  const options = await fake(t, async (w) => {
    const p = await w.read(); assert.match(p.body.toString(), /\(SID=generated\)/);
    assert.doesNotMatch(p.body.toString(), /SERVICE_NAME/);
    w.write(accepted(300));
    const hello = await w.read(); assert.equal(hello.type, 6);
    w.write(data(protocolReply()));
    const types = await w.read(); assert.equal(types.type, 6);
    w.write(data(typesReply()));
  });
  const c = await opened(t, { ...options, serviceName: undefined, sid: 'generated' });
  assert.equal(c.serverVersion, 300);
});

test('same-host redirect is followed and a fourth redirect fails', async (t) => {
  const second = await fake(t, (w) => startup(w));
  const first = await fake(t, async (w) => {
    await w.read(); w.write(frame(5, Buffer.from(`(ADDRESS=(HOST=127.0.0.1)(PORT=${second.port}))`)));
  });
  await opened(t, first);
  const loop = await fake(t, async (w) => { await w.read(); w.write(frame(5, Buffer.from(`(ADDRESS=(HOST=127.0.0.1)(PORT=${loop.port}))`))); });
  await assert.rejects(OracleClient.connect(loop), /three redirects/);
});

test('other-host redirect needs explicit allowlist', async (t) => {
  const second = await fake(t, (w) => startup(w), undefined, 'localhost');
  const first = await fake(t, async (w) => { await w.read(); w.write(frame(5, Buffer.from(`(ADDRESS=(HOST=localhost)(PORT=${second.port}))`))); });
  await assert.rejects(OracleClient.connect(first), /localhost.*not allowed/);
  await opened(t, { ...first, allowRedirectHosts: ['localhost'] });
});

test('ANO-required ACCEPT and unknown TTC or packet codes fail clearly', async (t) => {
  const ano = await fake(t, async (w) => { await w.read(); w.write(accepted(315, 1)); });
  await assert.rejects(OracleClient.connect(ano), /native network encryption/);
  const unknown = await fake(t, async (w) => { await w.read(); w.write(accepted()); await w.read(true); w.write(data(Buffer.from([99]), true)); });
  await assert.rejects(OracleClient.connect(unknown), /TTC message code 99/);
  const packet = await fake(t, async (w) => { await w.read(); w.write(accepted()); await w.read(true); w.write(frame(14, Buffer.alloc(0), true)); });
  await assert.rejects(OracleClient.connect(packet), /TNS packet type 14/);
  const anoData = await fake(t, async (w) => { await w.read(); w.write(accepted()); await w.read(true); w.write(data(Buffer.from([0xde, 0xad, 0xbe, 0xef]), true)); });
  await assert.rejects(OracleClient.connect(anoData), /native network encryption/);
});

test('MARKER break and reset are echoed before reading the server diagnostic', async (t) => {
  const options = await fake(t, async (w) => {
    await w.read(); w.write(accepted()); await w.read(true);
    w.write(frame(12, Buffer.from([1]), true));
    w.write(frame(12, Buffer.from([2]), true));
    const reset = await w.read(true); assert.equal(reset.type, 12); assert.deepEqual(reset.body, Buffer.from([2]));
    w.write(data(Buffer.from([77]), true));
  });
  await assert.rejects(OracleClient.connect(options), /TTC message code 77/);
});

test('TTC integer and CLR codecs round trip and reject oversized declarations', () => {
  for (const n of [0n, 1n, 255n, 65536n, 18446744073709551615n]) {
    const b = writeTtcInteger(n); assert.deepEqual(readTtcInteger(b), { value: n, offset: b.length });
  }
  const negative = writeTtcInteger(-123n, true);
  assert.equal(readTtcInteger(negative, 0, true).value, -123n);
  assert.throws(() => readTtcInteger(negative), /integer/);
  for (const n of [0, 252, 253, 100_000]) {
    const value = Buffer.alloc(n, 37), b = writeTtcClr(value);
    assert.deepEqual(readTtcClr(b), { value, offset: b.length });
  }
  assert.throws(() => readTtcClr(Buffer.concat([Buffer.from([0xfe]), writeTtcInteger(64n * 1024n * 1024n + 1n)])), /64 MiB/);
});

test('connect timeout bounds a silent listener', async (t) => {
  const options = await fake(t, async (w) => { await w.read(); await once(w.socket, 'close'); });
  const started = Date.now();
  await assert.rejects(OracleClient.connect({ ...options, connectTimeoutMs: 50 }), /timeout/i);
  assert.ok(Date.now() - started < 2000);
});

test('TCPS trusts a generated certificate and refuses an untrusted one', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'tabularius-oracle-tls-'));
  const cert = localCertificate(folder, ['localhost', '127.0.0.1']);
  const options = await fake(t, (w) => startup(w), { cert: cert.cert, key: cert.key });
  const trusted = await opened(t, { ...options, ca: cert.ca });
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  assert.equal(trusted.serverVersion, 315);
  await assert.rejects(OracleClient.connect(options), /TLS configuration|certificate|connection failed/);
});
