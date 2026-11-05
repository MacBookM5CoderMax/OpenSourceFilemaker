// Synthetic local peers only. The server side below follows the same layouts as the client, so these cases
// prove the client's own logic (transport, redirects, logon flow, decoding, limits). That the layouts are
// the real ones is shown by test/ess-real-databases.test.ts against Oracle Database Free; the byte strings
// marked "recorded" were captured from that server and hold no data of anyone's.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { createServer as createTlsServer } from 'node:tls';
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { localCertificate } from '../../server/src/local-tls.ts';
import { decodeOracleNumber, encodeOracleNumber, OracleDriver, OracleError, OracleClient, readTtcInteger, scanSql, writeTtcInteger, type OracleOptions } from '../src/ess/oracle.ts';

const ub = (n: number) => writeTtcInteger(n);
const withLength = (b: Buffer) => Buffer.concat([Buffer.from([b.length]), b]);
const str = (s: string) => withLength(Buffer.from(s));
function frame(type: number, body = Buffer.alloc(0), large = false): Buffer {
  const head = Buffer.alloc(8);
  if (large) head.writeUInt32BE(body.length + 8); else head.writeUInt16BE(body.length + 8);
  head[4] = type;
  return Buffer.concat([head, body]);
}
function data(body: Buffer, large = false): Buffer {
  return frame(6, Buffer.concat([Buffer.alloc(2), body]), large);
}
/** An ACCEPT: version, options, SDU, TDU, ..., connect flags (4 = network services off), large SDU and TDU. */
const accepted = (version = 319, flags0 = 4) => {
  const b = Buffer.alloc(37);
  b.writeUInt16BE(version); b.writeUInt16BE(1, 2); b.writeUInt16BE(8192, 4); b.writeUInt16BE(65535, 6); b[14] = flags0;
  b.writeUInt32BE(8192, 24); b.writeUInt32BE(65535, 28);
  return frame(2, b);
};
// Recorded: the protocol reply of Oracle Database Free 23.
const PROTOCOL_REPLY = Buffer.from('0106007838365f36342f4c696e757820322e342e7878006903010a006603400301400366030166034803014803660301660352030152036603016603610301610366030166031f03081f0366030100640000006001240f050b0c030c0c0504050d0609070805050505050f05050505050a050505050504050607080823472347081123081141b0470083036907d003000000000000000000000000000000000000000000000000000000000000000000000000003706010101ef0f011b010101010101017fff031003030101ff01ffff010e0101ff01060cf6097f050fff0d0b00ff030000000000070202040d0201000118007f010200000000', 'hex');
// Recorded: the reply to SELECT 12345.678 N, 'héllo' S, DATE '2024-02-29' D, TIMESTAMP '2024-02-29 13:14:15.123456' T,
// HEXTORAW('DEADBEEF') R, CAST(1.5 AS BINARY_DOUBLE) F, NULL Z, -7 M FROM DUAL.
const SELECT_REPLY = Buffer.from('1017131c2bdc6dda81196f2dc29c87f34668787e0b05123b2b012d010859020000810106000000000000000001010101014e0000000060800000010600000000020369010105023ffe01010101015300000101000c000000010100000000000000000101010101440000010200b4000009010b00000000000000000101010101540000010300170000000104000000000000000001010101015200000104006500000001010000000000000000010101010146000001050001800000000000000001010100023ffe01010101015a0000010600020000810103000000000000000001010101014d0000010700010707787e0b05123b2b00021fe8010201020006220108000201f40000000706c302182e44510668c3a96c6c6f07787c021d0101010b787c021d0e0f10075bca0004deadbeef08bff8000000000000033e5e66080106032336610001010000000000000401010201ba010102057b0000010101bf03000000000000000000000000050001010000000002057b0101010300194f52412d30313430333a206e6f206461746120666f756e640a', 'hex');
// Recorded: the reply to SELECT * FROM a table that does not exist (ORA-00942, arriving after a break marker).
const ERROR_REPLY = Buffer.from('0401010201bc000203ae00000101010e03000000000000000000000000070000000000000203ae00010300374f52412d30303934323a207461626c65206f7220766965772022455353222e224e4f535543482220646f6573206e6f742065786973740a', 'hex');

/** The ERROR message that ends every response: cursor, row count, and an ORA error when `code` is not zero. */
function errorMessage(code: number, text = '', cursor = 0, rows = 0): Buffer {
  return Buffer.concat([Buffer.from([4]), ub(0), ub(0), ub(0), ub(0), ub(0), ub(0), ub(cursor), ub(0), Buffer.alloc(6),
    ub(0), ub(0), Buffer.from([0]), ub(0), ub(0), ub(0), Buffer.from([0, 0]), ub(0), ub(0), ub(0), ub(0), ub(0), ub(0), ub(code), ub(rows), ub(3), ub(0),
    code ? str(`ORA-${String(code).padStart(5, '0')}: ${text}\n`) : Buffer.alloc(0)]);
}
const status = () => Buffer.concat([Buffer.from([9]), ub(0), ub(0)]);

class Wire {
  readonly socket: Socket;
  large = false;
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
  async read(large = this.large): Promise<{ type: number; head: Buffer; body: Buffer }> {
    const head = await this.bytes(8), size = large ? head.readUInt32BE() : head.readUInt16BE();
    assert.ok(size >= 8 && size <= 65535);
    return { type: head[4], head, body: await this.bytes(size - 8) };
  }
  /** The TTC bytes of the next request (one DATA packet; every request in these cases fits in one). */
  async request(): Promise<Buffer> {
    const p = await this.read(); assert.equal(p.type, 6, 'a DATA packet');
    return p.body.subarray(2);
  }
  write(bytes: Buffer): void { this.socket.write(bytes); }
  reply(...messages: Buffer[]): void { this.write(data(Buffer.concat(messages), this.large)); }
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
  return { host, port: (server.address() as { port: number }).port, serviceName: 'synthetic', user: 'ess', password: ['pass', 'word', '1'].join('-'),
    ssl: tls ? 'verify-full' as const : 'disable' as const, allowInsecure: !tls };
}

// -- the server side of the 12c logon ------------------------------------------------
const cbc = (key: Buffer, mode: 'enc' | 'dec', input: Buffer, padding: boolean) => {
  const c = (mode === 'enc' ? createCipheriv : createDecipheriv)('aes-256-cbc', key, Buffer.alloc(16));
  c.setAutoPadding(padding);
  return Buffer.concat([c.update(input), c.final()]);
};
const hexUpper = (b: Buffer) => b.toString('hex').toUpperCase();
function parameters(entries: [string, string, number?][]): Buffer {
  return Buffer.concat([Buffer.from([8]), ub(entries.length), ...entries.map(([k, v, flag = 0]) =>
    Buffer.concat([ub(0), str(k), ub(v.length), v ? str(v) : Buffer.alloc(0), ub(flag)]))]);
}
/** Read the key/value pairs of an AUTH request. */
function pairs(request: Buffer): Map<string, string> {
  const out = new Map<string, string>();
  const text = request.toString('latin1');
  for (const m of text.matchAll(/(AUTH_[A-Z0-9_]+|SESSION_[A-Z_]+)/g)) {
    const at = m.index! + m[0].length;
    // the value is ub(length) then a length byte (or chunk marker) then the bytes
    const lenField = request[at + 1] === 0 ? 0 : request[at + 1];
    void lenField;
    const afterLength = at + 2;
    const n = request[afterLength];
    if (n && n < 0xfe) out.set(m[0], request.subarray(afterLength + 1, afterLength + 1 + n).toString('latin1'));
    else if (n === 0xfe) {
      // a long value in chunks of ub(length) then bytes, ended by ub(0)
      let p = afterLength + 1, value = '';
      for (;;) { const size = readTtcInteger(request, p); p = size.offset; if (!size.value) break; value += request.subarray(p, p + Number(size.value)).toString('latin1'); p += Number(size.value); }
      out.set(m[0], value);
    }
  }
  return out;
}
interface Logon { wrongPassword?: boolean }
async function logon(w: Wire, password: string, options: Logon = {}): Promise<void> {
  const one = await w.request();
  assert.equal(one[0], 3); assert.equal(one[1], 118);
  assert.match(one.toString('latin1'), /AUTH_TERMINAL[\s\S]*AUTH_PROGRAM_NM[\s\S]*tabularius[\s\S]*AUTH_MACHINE[\s\S]*AUTH_PID[\s\S]*AUTH_SID/);
  const salt = randomBytes(16), iterations = 64;
  const passwordKey = pbkdf2Sync(Buffer.from(password), Buffer.concat([salt, Buffer.from('AUTH_PBKDF2_SPEEDY_KEY')]), iterations, 64, 'sha512');
  const passwordHash = createHash('sha512').update(passwordKey).update(salt).digest().subarray(0, 32);
  const partA = randomBytes(64), mixing = randomBytes(16);
  w.reply(parameters([
    ['AUTH_SESSKEY', hexUpper(cbc(passwordHash, 'enc', partA, false)), 0], ['AUTH_VFR_DATA', hexUpper(salt), 0x4815],
    ['AUTH_PBKDF2_CSK_SALT', hexUpper(mixing)], ['AUTH_PBKDF2_VGEN_COUNT', String(iterations)], ['AUTH_PBKDF2_SDER_COUNT', '3'],
  ]), status());
  const two = await w.request();
  assert.equal(two[1], 115);
  const sent = pairs(two);
  const clientKey = cbc(passwordHash, 'dec', Buffer.from(sent.get('AUTH_SESSKEY')!, 'hex'), false);
  const partB = clientKey.subarray(0, 32);
  const combined = pbkdf2Sync(Buffer.from(hexUpper(Buffer.concat([partB, partA.subarray(0, 32)]))), mixing, 3, 32, 'sha512');
  const secret = cbc(combined, 'dec', Buffer.from(sent.get('AUTH_PASSWORD')!, 'hex'), true).subarray(16).toString();
  assert.ok(!two.toString('latin1').includes(password), 'the password is never sent in the clear');
  if (options.wrongPassword || secret !== password) { w.reply(errorMessage(1017, 'invalid credential or not authorized; logon denied')); return; }
  w.reply(parameters([['AUTH_VERSION_NO', '387592192'], ['AUTH_DBNAME', 'FREE']]), status());
}
/** CONNECT, protocol, data types and logon, then the NLS settings; returns once the client is ready for statements. */
async function startup(w: Wire, password: string, version = 319, logonOptions: Logon = {}): Promise<boolean> {
  const first = await w.read(false); assert.equal(first.type, 1);
  w.write(accepted(version));
  w.large = version >= 315;
  const hello = await w.request();
  assert.deepEqual([...hello.subarray(0, 3)], [1, 6, 0]); assert.equal(hello.subarray(3).toString(), 'tabularius\0');
  w.reply(PROTOCOL_REPLY);
  const types = await w.request(); assert.equal(types[0], 2);
  w.reply(Buffer.from([2, 0, 0]));
  await logon(w, password, logonOptions);
  if (logonOptions.wrongPassword) return false;
  const session = await w.request(); assert.equal(session[1], 94);
  assert.match(session.toString(), /ALTER SESSION SET NLS_DATE_FORMAT/);
  w.reply(errorMessage(0));
  return true;
}
/** The end of a good session: the client says goodbye and the server answers. A test closes its driver before it ends,
 * because node:test runs the teardown that stops the fake server before any teardown added after it. */
async function goodbye(w: Wire): Promise<void> {
  const bye = await w.request();
  // A cursor left open by an earlier statement is closed by a piggyback ahead of the request.
  assert.ok(bye.includes(Buffer.from([3, 9])), 'a log-off request'); w.reply(status());
}
async function opened(_t: TestContext, options: OracleOptions): Promise<OracleDriver> { return OracleDriver.connect(options); }

test('CONNECT has the exact TNS header, fixed fields and descriptor', async (t) => {
  const options = await fake(t, async (w) => {
    const p = await w.read(false);
    assert.equal(p.type, 1);
    assert.equal(p.body.readUInt16BE(), 319); assert.equal(p.body.readUInt16BE(2), 300);
    assert.equal(p.body.readUInt16BE(4), 0x0401);
    assert.equal(p.body.readUInt16BE(6), 8192); assert.equal(p.body.readUInt16BE(8), 65535);
    assert.equal(p.body.readUInt16BE(10), 0x4f98); assert.equal(p.body.readUInt16BE(14), 1);
    const descriptor = p.body.subarray(66);
    assert.equal(p.body.readUInt16BE(16), descriptor.length);
    assert.equal(p.body.readUInt16BE(18), 74);
    assert.equal(p.body[24], 0x84); assert.equal(p.body[25], 0x84);
    assert.equal(p.body.readUInt32BE(50), 8192); assert.equal(p.body.readUInt32BE(54), 65535);
    assert.match(descriptor.toString(), /^\(DESCRIPTION=\(ADDRESS=\(PROTOCOL=TCP\)\(HOST=127\.0\.0\.1\)\(PORT=\d+\)\)\(CONNECT_DATA=\(SERVICE_NAME=synthetic\)\(CID=\(PROGRAM=tabularius\)\(HOST=[^()=]+\)\(USER=[^()=]+\)\)\)\)$/);
    w.write(frame(4, Buffer.from([0, 0, 0, 0])));
  });
  await assert.rejects(OracleClient.connect(options), /refused/);
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

test('logs on with the 12c verifier, never sending the password, and lists the session as ready', async (t) => {
  const options = await fake(t, async (w) => { await startup(w, options.password); await goodbye(w); });
  const driver = await opened(t, options);
  assert.equal(driver.dialect, 'oracle');
  await driver.close();
});

test('a wrong password is refused with its ORA number and the message does not repeat the password', async (t) => {
  const options = await fake(t, async (w) => { await startup(w, options.password, 319, { wrongPassword: true }); });
  await assert.rejects(OracleDriver.connect(options), (e: unknown) => {
    assert.ok(e instanceof OracleError); assert.equal(e.sqlCode, 1017);
    assert.ok(!e.message.includes(options.password));
    return true;
  });
});

test('an older ACCEPT keeps two-byte packet lengths and SID replaces the service name', async (t) => {
  const options = await fake(t, async (w) => {
    const p = await w.read(false); assert.match(p.body.toString(), /\(SID=generated\)/); assert.doesNotMatch(p.body.toString(), /SERVICE_NAME/);
    w.write(accepted(300)); w.large = false;
    await w.request(); w.reply(PROTOCOL_REPLY); await w.request(); w.reply(Buffer.from([2, 0, 0]));
    await logon(w, options.password);
    await w.request(); w.reply(errorMessage(0)); await goodbye(w);
  });
  const c = await opened(t, { ...options, serviceName: undefined, sid: 'generated' });
  await c.close();
});

test('RESEND repeats CONNECT and REFUSE exposes the listener reason', async (t) => {
  const resend = await fake(t, async (w) => {
    const a = await w.read(false); w.write(frame(11));
    const b = await w.read(false); assert.deepEqual(b, a);
    w.write(frame(4, Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('ORA-12514: service missing')])));
  });
  await assert.rejects(OracleClient.connect(resend), /ORA-12514: service missing/);
});

test('a long CONNECT descriptor follows in bounded DATA packets', async (t) => {
  const serviceName = 's'.repeat(20_000);
  const options = await fake(t, async (w) => {
    const connect = await w.read(false); assert.equal(connect.type, 1);
    assert.equal(connect.body.length, 66); assert.equal(connect.body.readUInt16BE(18), 0);
    const count = connect.body.readUInt16BE(16);
    const parts: Buffer[] = [];
    while (Buffer.concat(parts).length < count) {
      const p = await w.read(false); assert.equal(p.type, 6);
      assert.ok(p.body.length <= 8192); parts.push(p.body.subarray(2));
    }
    assert.ok(parts.length >= 3);
    assert.match(Buffer.concat(parts).toString(), new RegExp(`\\(SERVICE_NAME=${serviceName}\\)`));
    w.write(frame(4, Buffer.from([0, 0, 0, 0])));
  });
  await assert.rejects(OracleClient.connect({ ...options, serviceName }), /refused/);
});

test('a same-host redirect is followed, a fourth redirect fails, another host needs the allow-list', async (t) => {
  const second = await fake(t, async (w) => { await startup(w, second.password); await goodbye(w); });
  const redirect = (port: number, host = '127.0.0.1') => { const text = Buffer.from(`(ADDRESS=(HOST=${host})(PORT=${port}))`); return frame(5, Buffer.concat([(() => { const b = Buffer.alloc(2); b.writeUInt16BE(text.length); return b; })(), text])); };
  const first = await fake(t, async (w) => { await w.read(false); w.write(redirect(second.port)); });
  await (await opened(t, { ...first, password: second.password })).close();
  const loop = await fake(t, async (w) => { await w.read(false); w.write(redirect(loop.port)); });
  await assert.rejects(OracleClient.connect(loop), /three redirects/);
  const other = await fake(t, async (w) => { await w.read(false); w.write(redirect(second.port, 'localhost')); });
  await assert.rejects(OracleClient.connect(other), /localhost.*not allowed/);
});

test('a server that wants network encryption is refused clearly', async (t) => {
  const ano = await fake(t, async (w) => { await w.read(false); w.write(accepted(319, 1)); });
  await assert.rejects(OracleClient.connect(ano), /native network encryption/);
  const anoData = await fake(t, async (w) => { await w.read(false); w.write(accepted()); w.large = true; await w.request(); w.reply(Buffer.from([0xde, 0xad, 0xbe, 0xef])); });
  await assert.rejects(OracleClient.connect(anoData), /native network encryption/);
});

test('an unknown packet type or message fails clearly', async (t) => {
  const packet = await fake(t, async (w) => { await w.read(false); w.write(accepted()); w.large = true; await w.request(); w.write(frame(99, Buffer.alloc(0), true)); });
  await assert.rejects(OracleClient.connect(packet), /TNS packet type 99/);
  const message = await fake(t, async (w) => { await w.read(false); w.write(accepted()); w.large = true; await w.request(); w.reply(Buffer.from([77])); });
  await assert.rejects(OracleClient.connect(message), /Unexpected Oracle message 77/);
});

test('queries decode every recorded type, and a split response is read as it arrives', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w, options.password);
    const request = await w.request(); assert.equal(request[1], 94);
    assert.match(request.toString(), /SELECT 12345\.678 AS N/);
    // The response arrives in three pieces, so messages are cut mid-field.
    for (const [from, to] of [[0, 40], [40, 200], [200, SELECT_REPLY.length]]) w.reply(SELECT_REPLY.subarray(from, to));
    await goodbye(w);
  });
  const driver = await opened(t, options);
  const result = await driver.query(`SELECT 12345.678 AS N, 'héllo' AS S, DATE '2024-02-29' AS D, TIMESTAMP '2024-02-29 13:14:15.123456' AS T, HEXTORAW('DEADBEEF') AS R, CAST(1.5 AS BINARY_DOUBLE) AS F, NULL AS Z, -7 AS M FROM DUAL`, []);
  assert.deepEqual(result.columns.map((c) => c.name), ['N', 'S', 'D', 'T', 'R', 'F', 'Z', 'M']);
  assert.deepEqual(result.columns.map((c) => c.type), ['NUMBER', 'CHAR', 'DATE', 'TIMESTAMP', 'RAW', 'BINARY_DOUBLE', 'VARCHAR2', 'NUMBER']);
  assert.deepEqual(result.rows, [[12345.678, 'héllo', '2024-02-29T00:00:00', '2024-02-29T13:14:15.123456', new Uint8Array([0xde, 0xad, 0xbe, 0xef]), 1.5, null, -7]]);
  await driver.close();
});

test('a break marker is answered with a reset before the error that follows it is read', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w, options.password);
    await w.request();
    w.write(frame(12, Buffer.from([1, 0, 1]), true));
    const reset = await w.read(); assert.equal(reset.type, 12); assert.deepEqual([...reset.body], [1, 0, 2]);
    w.write(frame(12, Buffer.from([1, 0, 2]), true));
    w.reply(ERROR_REPLY);
    // The session is still good afterwards.
    await w.request(); w.reply(errorMessage(0)); await goodbye(w);
  });
  const driver = await opened(t, options);
  await assert.rejects(driver.query('SELECT * FROM nosuch', []), (e: unknown) => {
    assert.ok(e instanceof OracleError); assert.equal(e.sqlCode, 942); assert.match(e.message, /^ORA-00942/);
    return true;
  });
  await driver.query('COMMIT', []);
  await driver.close();
});

test('a RETURNING statement whose out values are held is asked for them, and its error is its own', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w, options.password);
    await w.request(); w.reply(errorMessage(1403, 'no data found')); // the column types of the RETURNING list
    await w.request(); w.reply(Buffer.from([19])); // FLUSH_OUT_BINDS
    assert.deepEqual([...await w.request()], [19], 'the client asks for the held values');
    w.reply(errorMessage(1400, 'cannot insert NULL into ("T"."A")'));
    await w.request(); w.reply(errorMessage(0)); await goodbye(w);
  });
  const driver = await opened(t, options);
  await assert.rejects(driver.query('INSERT INTO t (a) VALUES (:1) RETURNING id INTO :2', [null, null]), (e: unknown) => {
    assert.ok(e instanceof OracleError); assert.equal(e.sqlCode, 1400);
    return true;
  });
  await driver.query('COMMIT', []);
  await driver.close();
});

test('a result over maxRows is refused after the response is read, and the session stays usable', async (t) => {
  const options = await fake(t, async (w) => {
    await startup(w, options.password);
    await w.request(); w.reply(SELECT_REPLY);
    await w.request(); w.reply(errorMessage(0)); await goodbye(w);
  });
  const driver = await opened(t, options);
  await assert.rejects(driver.query('SELECT * FROM t', [], { maxRows: 0 }), /^Error: SQL row limit of 0 exceeded$|SQL row limit of 0 exceeded/);
  await driver.query('COMMIT', []);
  await driver.close();
});

test('bind variables: repeated numbers share a value, the count must match, names are refused', async (t) => {
  const options = await fake(t, async (w) => { await startup(w, options.password); await w.request(); w.reply(errorMessage(0, '', 0, 1)); await goodbye(w); });
  const driver = await opened(t, options);
  await assert.rejects(driver.query('SELECT :1 FROM DUAL', [1, 2]), /parameter count/);
  await assert.rejects(driver.query('SELECT :3 FROM DUAL', [1]), /parameter count/);
  await assert.rejects(driver.query('SELECT :name FROM DUAL', ['x']), /numbered bind/);
  const ok = await driver.query('UPDATE t SET a = :1 WHERE (a = :2 OR (a IS NULL AND :2 IS NULL))', [1, null]);
  assert.equal(ok.affected, 1);
  await driver.close();
});

test('scanSql finds the kind of statement and the binds, skipping quotes and comments', () => {
  assert.deepEqual(scanSql(`SELECT ':x' , "a:b", q'[:c]' FROM t -- :d\n WHERE a = :1 /* :e */ AND b = :2`), { kind: 'query', binds: ['1', '2'] });
  assert.equal(scanSql('  -- hi\n insert into t values (:1)').kind, 'dml');
  assert.equal(scanSql('BEGIN NULL; END;').kind, 'plsql');
  assert.equal(scanSql('CREATE TABLE t (a NUMBER)').kind, 'ddl');
  assert.equal(scanSql('COMMIT').kind, 'other');
  assert.deepEqual(scanSql('x := :1').binds, ['1']);
});

test('NUMBER codec round trips and matches the bytes the server sends', () => {
  const known: [string, number[]][] = [['0', [0x80]], ['1', [0xc1, 2]], ['123', [0xc2, 2, 24]], ['0.5', [0xc0, 51]], ['100', [0xc2, 2]], ['-7', [0x3e, 94, 102]], ['-123', [0x3d, 100, 78, 102]]];
  for (const [text, bytes] of known) {
    assert.deepEqual([...encodeOracleNumber(text)], bytes, `encode ${text}`);
    assert.equal(decodeOracleNumber(Buffer.from(bytes)), text, `decode ${text}`);
  }
  for (const text of ['12345.678', '-0.000123', '9007199254740993', '123456789012345678901234567890', '1e-10', '1.5e30']) {
    const back = decodeOracleNumber(encodeOracleNumber(text));
    assert.equal(Number(back), Number(text), text);
  }
  assert.throws(() => encodeOracleNumber('1e200'), /cannot take/);
  assert.throws(() => encodeOracleNumber('abc'), /cannot take/);
});

test('TTC integers round trip and reject a sign where none is allowed', () => {
  for (const n of [0n, 1n, 255n, 65536n, 18446744073709551615n]) {
    const b = writeTtcInteger(n); assert.deepEqual(readTtcInteger(b), { value: n, offset: b.length });
  }
  const negative = writeTtcInteger(-123n, true);
  assert.equal(readTtcInteger(negative, 0, true).value, -123n);
  assert.throws(() => readTtcInteger(negative), /integer/);
});

test('connect timeout bounds a silent listener', async (t) => {
  const options = await fake(t, async (w) => { await w.read(false); await once(w.socket, 'close'); });
  const started = Date.now();
  await assert.rejects(OracleClient.connect({ ...options, connectTimeoutMs: 50 }), /timeout/i);
  assert.ok(Date.now() - started < 2000);
});

test('TCPS trusts a generated certificate and refuses an untrusted one', async (t) => {
  // The certificate is read into memory, so its folder goes before any server starts.
  const folder = mkdtempSync(join(tmpdir(), 'tabularius-oracle-tls-'));
  let cert: ReturnType<typeof localCertificate>;
  try { cert = localCertificate(folder, ['localhost', '127.0.0.1']); } finally { rmSync(folder, { recursive: true, force: true }); }
  const options = await fake(t, async (w) => { await startup(w, options.password); await goodbye(w); }, { cert: cert.cert, key: cert.key });
  await (await opened(t, { ...options, ca: cert.ca })).close();
  await assert.rejects(OracleClient.connect(options), /TLS configuration|certificate|connection failed/);
});
