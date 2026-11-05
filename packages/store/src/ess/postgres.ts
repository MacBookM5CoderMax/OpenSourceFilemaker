/** PostgreSQL protocol 3.0, "Message Formats", "Startup", "Extended Query",
 * "Canceling Requests" and "SASL Authentication". Unverified against a real server.
 * No ESS registration here. Temporal values remain text (including microseconds,
 * infinity and timezone offsets). Numeric becomes a number only if exactly
 * representable as a binary double; e.g. 0.5 is a number, 0.1 remains a string.
 */
import { connect, isIP, type Socket } from 'node:net';
import { connect as tlsConnect, checkServerIdentity, type TLSSocket } from 'node:tls';
import { createHash, createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { SqlColumn, SqlDriver, SqlResult, SqlValue } from './driver.ts';
import { hostRefusal, socketLookup } from '../outbound-address.ts';

export interface PostgresOptions {
  host: string;
  port?: number;
  user: string;
  database: string;
  password: string;
  /** Default verify-full: TLS with the certificate and host name checked. `require` encrypts without checking who answers. */
  sslmode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  ca?: string | Buffer;
  /** Off by default. Accept a cleartext or MD5 password request without verified TLS (a lab server, an unencrypted link you trust). */
  allowPlaintextPassword?: boolean;
  /** Default 30 seconds; also bounds startup/authentication, not just TCP. */
  connectTimeoutMs?: number;
}
export interface PostgresResult extends SqlResult {
  /** True when Execute suspended the portal or additional rows were discarded. */
  truncated: boolean;
  notices: PostgresError[];
}
const ROW_BUDGET = 1024 * 1024;
const MAX_BYTES = 16 * ROW_BUDGET;
const MAX_ROWS = 100_000;
const i16 = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
const i32 = (n: number) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; };
function cstr(s: string): Buffer {
  if (s.includes('\0')) throw new Error('PostgreSQL text cannot contain a zero byte');
  return Buffer.from(s + '\0');
}
function packet(type: string, ...parts: Buffer[]): Buffer {
  const body = Buffer.concat(parts);
  return Buffer.concat([Buffer.from(type), i32(body.length + 4), body]);
}
function bounded(n: number, max: number, label: string): number {
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new Error(`Invalid PostgreSQL ${label}`);
  return n;
}
function protocol(): never { throw new Error('Invalid PostgreSQL backend message'); }
class Cursor {
  private at = 0;
  readonly body: Buffer;
  constructor(body: Buffer) { this.body = body; }
  bytes(n: number): Buffer {
    if (n < 0 || this.at + n > this.body.length) protocol();
    const b = this.body.subarray(this.at, this.at + n); this.at += n; return b;
  }
  int16() { return this.bytes(2).readUInt16BE(); }
  int32() { return this.bytes(4).readInt32BE(); }
  string() {
    const end = this.body.indexOf(0, this.at);
    if (end < 0) protocol();
    return this.bytes(end - this.at + 1).subarray(0, -1).toString('utf8');
  }
  end() { if (this.at !== this.body.length) protocol(); }
}

/** Server M/D fields can contain passwords, parameters or entire rows, even
 * without quotes. Parse them, but expose a safe message selected by SQLSTATE;
 * neither the original message nor detail is retained on the error object. */
export class PostgresError extends Error {
  readonly severity: string;
  readonly sqlstate: string;
  constructor(body: Buffer) {
    const c = new Cursor(body);
    let severity = 'ERROR', state = 'XXXXX';
    for (;;) {
      const tag = c.bytes(1)[0];
      if (!tag) break;
      const value = c.string();
      if (tag === 83 || tag === 86) severity = /^(ERROR|FATAL|PANIC|WARNING|NOTICE|DEBUG|INFO|LOG)$/.test(value) ? value : 'ERROR';
      if (tag === 67 && /^[0-9A-Z]{5}$/.test(value)) state = value;
    }
    c.end();
    const messages: Record<string, string> = {
      '42P01': 'The requested table does not exist', '42703': 'The requested column does not exist',
      '28P01': 'The SQL database refused the credentials', '42501': 'Permission denied by the SQL database',
      '23505': 'A unique value already exists', '57014': 'The SQL database canceled the query',
      '42601': 'The SQL database rejected the query syntax',
    };
    super(`${severity} ${state}: ${messages[state] ?? 'The SQL database reported a diagnostic'}`);
    this.name = 'PostgresError'; this.severity = severity; this.sqlstate = state;
  }
}

function base64(s: string): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s) || !s.length) protocol();
  return Buffer.from(s, 'base64');
}
function attributes(s: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const field of s.split(',')) {
    if (!/^[a-z]=/.test(field) || out.has(field[0])) protocol();
    out.set(field[0], field.slice(2));
  }
  if (out.has('m')) throw new Error('Unsupported mandatory SCRAM extension');
  return out;
}
const hmac = (key: Buffer, value: string) => createHmac('sha256', key).update(value).digest();
/** RFC 5802 / RFC 7677. PostgreSQL uses an empty SCRAM username. This pure
 * exchange also accepts the RFC test-vector username. Passwords outside ASCII
 * use UTF-8 NFKC; full SASLprep prohibited/unassigned handling is unverified. */
export function scramSha256(user: string, password: string, nonce = randomBytes(24).toString('base64'), binding?: Buffer, supportsBinding = false) {
  if (!/^[\x21-\x2b\x2d-\x7e]+$/.test(nonce)) throw new Error('Invalid SCRAM client nonce');
  // RFC 5802 section 7 (gs2-cbind-flag): p= when binding is used; y when this client could bind but the server did not offer
  // the -PLUS mechanism (so a downgrade by someone in the middle is detected by the server); n when this client cannot bind.
  const header = binding ? 'p=tls-server-end-point,,' : supportsBinding ? 'y,,' : 'n,,';
  const bare = `n=${user.replace(/=/g, '=3D').replace(/,/g, '=2C')},r=${nonce}`;
  let expected: Buffer | undefined;
  let continued = false;
  return {
    first: header + bare,
    async continue(reply: string): Promise<string> {
      if (continued || reply.length > 8192) protocol();
      continued = true;
      const fields = attributes(reply), r = fields.get('r') ?? '';
      // Nonces are public, but compare the echoed part in constant time too.
      const prefix = Buffer.from(r.slice(0, nonce.length)), original = Buffer.from(nonce);
      if (prefix.length !== original.length || !timingSafeEqual(prefix, original) || r.length <= nonce.length || !/^[\x21-\x2b\x2d-\x7e]+$/.test(r)) protocol();
      const iterations = fields.get('i') ?? '';
      if (!/^[1-9][0-9]{0,6}$/.test(iterations)) protocol();
      const count = bounded(Number(iterations), 1_000_000, 'SCRAM iteration count');
      const salt = base64(fields.get('s') ?? '');
      if (salt.length > 1024) protocol();
      const salted = await new Promise<Buffer>((resolve, reject) => {
        pbkdf2(password.normalize('NFKC'), salt, count, 32, 'sha256', (e, b) => e ? reject(new Error('The SCRAM password proof could not be computed; check crypto support')) : resolve(b));
      });
      const final = `c=${Buffer.concat([Buffer.from(header), binding ?? Buffer.alloc(0)]).toString('base64')},r=${r}`;
      const auth = `${bare},${reply},${final}`;
      const clientKey = hmac(salted, 'Client Key');
      const proof = hmac(createHash('sha256').update(clientKey).digest(), auth);
      for (let i = 0; i < proof.length; i++) proof[i] ^= clientKey[i];
      expected = hmac(hmac(salted, 'Server Key'), auth);
      return `${final},p=${proof.toString('base64')}`;
    },
    finish(reply: string) {
      if (!expected || reply.length > 8192) protocol();
      const fields = attributes(reply);
      const actual = base64(fields.get('v') ?? '');
      if (fields.has('e') || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('SCRAM server signature did not verify');
      expected = undefined;
    },
  };
}

/** RFC 5929 tls-server-end-point: hash the DER certificate using its signature
 * hash, promoting MD5/SHA1 to SHA256. Unknown algorithms (including RSA-PSS
 * parameters) fail closed instead of guessing the channel binding. */
function channelBinding(socket: TLSSocket): Buffer {
  const raw = socket.getPeerCertificate().raw;
  if (!raw) throw new Error('TLS peer certificate is unavailable for SCRAM');
  function der(at: number): { tag: number; start: number; end: number } {
    const tag = raw[at++]; let length = raw[at++];
    if (length & 128) { const n = length & 127; if (n < 1 || n > 4) protocol(); length = 0; for (let i = 0; i < n; i++) length = length * 256 + raw[at++]; }
    if (!Number.isSafeInteger(length) || at + length > raw.length) protocol();
    return { tag, start: at, end: at + length };
  }
  const outer = der(0), tbs = der(outer.start), algorithm = der(tbs.end), oid = der(algorithm.start);
  if (oid.tag !== 6) protocol();
  const value = raw.subarray(oid.start, oid.end).toString('hex');
  const hashes: Record<string, string> = {
    '2a864886f70d010104': 'sha256', '2a864886f70d010105': 'sha256',
    '2a864886f70d01010b': 'sha256', '2a864886f70d01010c': 'sha384', '2a864886f70d01010d': 'sha512', '2a864886f70d01010e': 'sha224',
    '2a8648ce3d0401': 'sha256', '2a8648ce3d040301': 'sha224', '2a8648ce3d040302': 'sha256', '2a8648ce3d040303': 'sha384', '2a8648ce3d040304': 'sha512',
  };
  if (!hashes[value]) throw new Error('Unsupported certificate signature algorithm for SCRAM channel binding');
  return createHash(hashes[value]).update(raw).digest();
}

const types: Record<number, string> = { 16: 'bool', 17: 'bytea', 19: 'name', 20: 'int8', 21: 'int2', 23: 'int4', 25: 'text', 114: 'json', 700: 'float4', 701: 'float8', 1042: 'bpchar', 1043: 'varchar', 1082: 'date', 1083: 'time', 1114: 'timestamp', 1184: 'timestamptz', 1266: 'timetz', 1700: 'numeric', 2950: 'uuid', 3802: 'jsonb' };
function numeric(s: string): string | number {
  const m = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(s);
  const n = Number(s);
  if (!m || !Number.isFinite(n) || s.length > 1024) return s;
  const scale = (m[3]?.length ?? 0) - Number(m[4] ?? 0);
  if (Math.abs(scale) > 1024) return s;
  let a = BigInt((m[1] === '-' ? '-' : '') + m[2] + (m[3] ?? '')), b = 1n;
  if (scale >= 0) b = 10n ** BigInt(scale); else a *= 10n ** BigInt(-scale);
  const bytes = Buffer.alloc(8); bytes.writeDoubleBE(n);
  const bits = bytes.readBigUInt64BE(), exponent = Number((bits >> 52n) & 2047n);
  let mantissa = bits & ((1n << 52n) - 1n);
  if (exponent) mantissa |= 1n << 52n;
  if (bits >> 63n) mantissa = -mantissa;
  const power = (exponent || 1) - 1023 - 52;
  return power >= 0 ? (a === (mantissa << BigInt(power)) * b ? n : s) : (a * (1n << BigInt(-power)) === mantissa * b ? n : s);
}
function decode(s: string, oid: number): SqlValue {
  if (oid === 20) { if (!/^-?[0-9]{1,20}$/.test(s)) protocol(); const n = BigInt(s); return n >= -9007199254740991n && n <= 9007199254740991n ? Number(n) : n; }
  if ([21, 23, 700, 701].includes(oid)) return Number(s);
  if (oid === 1700) return numeric(s);
  if (oid === 16) { if (s !== 't' && s !== 'f') protocol(); return s === 't'; }
  if (oid === 17) { if (!/^\\x(?:[0-9a-fA-F]{2})*$/.test(s)) protocol(); return Buffer.from(s.slice(2), 'hex'); }
  return s;
}
function encode(v: SqlValue): Buffer | null {
  if (v === null) return null;
  if ((typeof v === 'string' && Buffer.byteLength(v) > MAX_BYTES) || (v instanceof Uint8Array && v.byteLength > (MAX_BYTES - 2) / 2)) throw new Error('PostgreSQL parameter exceeds the byte budget');
  const s = v instanceof Uint8Array ? '\\x' + Buffer.from(v).toString('hex') : v instanceof Date ? v.toISOString() : typeof v === 'boolean' ? (v ? 't' : 'f') : String(v);
  if (s.includes('\0')) throw new Error('PostgreSQL parameters cannot contain a zero byte');
  return Buffer.from(s);
}

export class PostgresClient implements SqlDriver {
  readonly dialect = 'postgresql' as const;
  transactionStatus: 'I' | 'T' | 'E' = 'I';
  private socket: Socket;
  private failure?: Error;
  private wake?: () => void;
  private busy = false;
  private key?: Buffer;
  private transactionOwner?: { active: boolean };
  private context = new AsyncLocalStorage<{ active: boolean }>();
  private serial = 0;
  private readonly options: PostgresOptions;
  /** Whether the TLS certificate is checked (sslmode verify-ca or verify-full). */
  tlsVerified = false;
  private constructor(options: PostgresOptions) {
    this.options = options;
    this.socket = connect({ host: options.host, port: options.port ?? 5432, lookup: socketLookup({ private: true }) });
    this.listen(this.socket);
  }
  private listen(socket: Socket) {
    socket.on('readable', this.readable);
    socket.on('error', () => this.fail(new Error('PostgreSQL connection failed; check the host, port and TLS configuration')));
    socket.on('close', () => this.fail(new Error('PostgreSQL connection closed')));
    socket.on('end', () => this.fail(new Error('PostgreSQL connection ended')));
  }
  private readable = () => this.wake?.();
  private fail(error: Error) { this.failure ??= error; this.socket.destroy(); this.wake?.(); }
  private alive() { if (this.failure) throw this.failure; if (this.socket.destroyed) throw new Error('PostgreSQL connection is closed'); }
  private async bytes(n: number): Promise<Buffer> {
    if (!n) return Buffer.alloc(0);
    for (;;) {
      this.alive();
      const b = this.socket.read(n) as Buffer | null;
      if (b) return b;
      await new Promise<void>((resolve) => { this.wake = resolve; });
      this.wake = undefined;
    }
  }
  private async message(limit = MAX_BYTES) {
    const head = await this.bytes(5), size = head.readUInt32BE(1);
    // Check the declared length BEFORE read(size) can enlarge Node's buffer.
    if (size < 4 || size > 1024 ** 3 || size > limit) throw new Error('PostgreSQL backend message exceeds the byte budget');
    return { type: String.fromCharCode(head[0]), body: await this.bytes(size - 4) };
  }
  private send(type: string, ...parts: Buffer[]) {
    this.alive();
    const size = 5 + parts.reduce((n, b) => n + b.length, 0);
    if (this.socket.writableLength + size > MAX_BYTES + 64 * 1024) throw new Error('PostgreSQL outbound data exceeds the byte budget');
    this.socket.write(packet(type, ...parts));
  }
  static async connect(options: PostgresOptions): Promise<PostgresClient> {
    const timeout = bounded(options.connectTimeoutMs ?? 30_000, 2_147_483_647, 'connect timeout');
    bounded(options.port ?? 5432, 65535, 'port');
    // Validate startup strings before opening any socket.
    if ([options.user, options.database, options.password].some((s) => Buffer.byteLength(s) > 64 * 1024)) throw new Error('PostgreSQL startup value exceeds the byte budget');
    cstr(options.user); cstr(options.database);
    // The server is one an administrator chose, on the network or not; the metadata range is never reached, and a name is checked on the lookup the connection uses.
    const refused = hostRefusal({ private: true }, options.host);
    if (refused) throw new Error(`PostgreSQL: ${refused}`);
    const mode = options.sslmode ?? 'verify-full';
    if (!['disable', 'require', 'verify-ca', 'verify-full'].includes(mode)) throw new Error('Invalid PostgreSQL sslmode');
    const client = new PostgresClient({ ...options });
    client.tlsVerified = mode === 'verify-ca' || mode === 'verify-full';
    const timer = setTimeout(() => client.fail(new Error('PostgreSQL connect timeout')), timeout);
    try {
      if (mode !== 'disable') {
        client.socket.write(Buffer.concat([i32(8), i32(80877103)])); // SSLRequest
        if ((await client.bytes(1))[0] !== 83) throw new Error('PostgreSQL server refused TLS');
        if (client.socket.readableLength) protocol(); // no injected bytes before TLS
        const plain = client.socket;
        plain.removeListener('readable', client.readable);
        const secure = tlsConnect({ socket: plain, ca: options.ca, rejectUnauthorized: mode !== 'require',
          servername: isIP(options.host) ? undefined : options.host,
          checkServerIdentity: mode === 'verify-ca' ? () => undefined : (_host, cert) => checkServerIdentity(options.host, cert),
        });
        client.socket = secure;
        client.listen(secure);
        await new Promise<void>((resolve, reject) => {
          secure.once('secureConnect', resolve);
          secure.once('error', () => reject(new Error('PostgreSQL TLS verification failed; check the certificate authority and host name')));
          secure.once('close', () => reject(client.failure ?? new Error('PostgreSQL TLS connection closed')));
        });
        // Node may omit hostname checks for an IP without SNI; always check it.
        if (mode === 'verify-full' && checkServerIdentity(options.host, secure.getPeerCertificate())) throw new Error('The PostgreSQL TLS certificate does not match the configured host name');
      }
      const params = Buffer.concat(['user', options.user, 'database', options.database, 'application_name', 'tabularius', 'client_encoding', 'UTF8', 'DateStyle', 'ISO', ''].map(cstr));
      client.socket.write(Buffer.concat([i32(params.length + 8), i32(196608), params]));
      await client.authenticate();
      client.options.password = '';
      return client;
    } catch (e) { client.fail(e instanceof Error ? e : new Error('PostgreSQL could not start the session; check connection options and authentication')); throw client.failure; }
    finally { clearTimeout(timer); }
  }
  private ready(body: Buffer) {
    if (body.length !== 1 || ![73, 84, 69].includes(body[0])) protocol();
    this.transactionStatus = body.toString() as 'I' | 'T' | 'E';
  }
  private async authenticate() {
    let phase: 'initial' | 'password' | 'continue' | 'final' | 'verified' | 'ok' = 'initial';
    let scram: ReturnType<typeof scramSha256> | undefined;
    for (;;) {
      const { type, body } = await this.message(64 * 1024);
      if (type === 'E') throw new PostgresError(body);
      if (type === 'N') { new PostgresError(body); continue; }
      if (type === 'S') { const c = new Cursor(body); c.string(); c.string(); c.end(); continue; }
      if (type === 'K') { if (body.length !== 8 || phase !== 'ok') protocol(); this.key = Buffer.from(body); continue; }
      if (type === 'Z') { if (phase !== 'ok') protocol(); this.ready(body); return; }
      if (type !== 'R') protocol();
      const c = new Cursor(body), kind = c.int32();
      if (kind === 0) { c.end(); if (!['initial', 'password', 'verified'].includes(phase)) protocol(); phase = 'ok'; continue; }
      if ([2, 7, 8, 9].includes(kind)) throw new Error('PostgreSQL Kerberos, GSS and SSPI authentication are not supported; use SCRAM');
      if (kind === 3 || kind === 5) {
        if (phase !== 'initial') protocol();
        let response = this.options.password;
        // A password the server asks for in the clear (or as an MD5 hash, which is the password in all but name) goes only over TLS
        // whose certificate was checked, unless the caller said otherwise. The message names the way out and holds no secret.
        if (!(this.socket as TLSSocket).encrypted || !this.tlsVerified) {
          if (!this.options.allowPlaintextPassword) throw new Error(`PostgreSQL asked for a ${kind === 3 ? 'cleartext' : 'MD5'} password without verified TLS; use sslmode verify-full (or verify-ca), SCRAM, or set allowPlaintextPassword to accept this`);
        }
        if (kind === 5) {
          const salt = c.bytes(4);
          const inner = createHash('md5').update(this.options.password + this.options.user).digest('hex');
          response = 'md5' + createHash('md5').update(inner).update(salt).digest('hex');
        }
        c.end(); this.send('p', cstr(response)); phase = 'password'; continue;
      }
      if (kind === 10) {
        if (phase !== 'initial') protocol();
        const methods: string[] = []; let method: string;
        while ((method = c.string())) methods.push(method);
        c.end();
        const plus = !!(this.socket as TLSSocket).encrypted && methods.includes('SCRAM-SHA-256-PLUS');
        const selected = plus ? 'SCRAM-SHA-256-PLUS' : 'SCRAM-SHA-256';
        if (!methods.includes(selected)) throw new Error('PostgreSQL server offered no supported SCRAM mechanism');
        scram = scramSha256('', this.options.password, undefined, plus ? channelBinding(this.socket as TLSSocket) : undefined, !!(this.socket as TLSSocket).encrypted);
        this.send('p', cstr(selected), i32(Buffer.byteLength(scram.first)), Buffer.from(scram.first)); phase = 'continue'; continue;
      }
      if (kind === 11 && phase === 'continue' && scram) {
        const final = await scram.continue(body.subarray(4).toString());
        this.alive(); this.send('p', Buffer.from(final)); phase = 'final'; continue;
      }
      if (kind === 12 && phase === 'final' && scram) { scram.finish(body.subarray(4).toString()); phase = 'verified'; continue; }
      throw new Error('Unsupported PostgreSQL authentication exchange');
    }
  }
  private cancel() {
    if (!this.key) return;
    // CancelRequest is a separate startup packet, with no credentials or query.
    const socket = connect({ host: this.options.host, port: this.options.port ?? 5432, lookup: socketLookup({ private: true }) });
    const timer = setTimeout(() => socket.destroy(), 1000);
    socket.on('error', () => socket.destroy());
    socket.once('close', () => clearTimeout(timer));
    socket.once('connect', () => socket.end(Buffer.concat([i32(16), i32(80877102), this.key!])));
  }
  async query(sql: string, params: SqlValue[] = [], opts: { timeoutMs?: number; maxRows?: number; parameterTypes?: string[] } = {}): Promise<PostgresResult> {
    this.alive();
    if (this.context.getStore()?.active === false) throw new Error('PostgreSQL transaction has ended');
    if (this.busy || (this.transactionOwner && this.context.getStore() !== this.transactionOwner)) throw new Error('PostgreSQL connection is busy; wait for its current operation');
    const limit = bounded(opts.maxRows ?? MAX_ROWS, MAX_ROWS, 'row limit');
    const timeout = bounded(opts.timeoutMs ?? 30_000, 2_147_483_647, 'query timeout');
    if (params.length > 65535 || Buffer.byteLength(sql) > MAX_BYTES) throw new Error('PostgreSQL query exceeds the byte budget');
    const query = cstr(sql), values: Buffer[] = []; let size = query.length;
    const formats = params.map((param, index) => typeof param === 'boolean' && /^(?:bool|boolean)$/i.test(opts.parameterTypes?.[index] ?? '') ? 1 : 0);
    for (const [index, param] of params.entries()) {
      const value = formats[index] ? Buffer.from([param ? 1 : 0]) : encode(param); size += (value?.length ?? 0) + 4;
      if (size > MAX_BYTES) throw new Error('PostgreSQL parameters exceed the byte budget');
      values.push(i32(value?.length ?? -1)); if (value) values.push(value);
    }
    this.busy = true;
    const timer = setTimeout(() => { this.cancel(); this.fail(new Error('PostgreSQL query timeout; connection closed')); }, timeout);
    try {
      // Message Formats: unnamed Parse, Bind (binary for explicitly typed booleans), Describe portal, Execute,
      // Close portal, Sync. Closing before Sync also works inside a transaction.
      const parameterOids: Record<string, number> = { bool: 16, boolean: 16, date: 1082, time: 1083,
        'time without time zone': 1083, timestamp: 1114, 'timestamp without time zone': 1114,
        timestamptz: 1184, 'timestamp with time zone': 1184 };
      const given = opts.parameterTypes?.map((type) => Object.hasOwn(parameterOids, type.toLowerCase()) ? parameterOids[type.toLowerCase()] : 0) ?? [];
      if (given.length && given.length !== params.length) throw new Error('PostgreSQL parameter type count does not match');
      this.send('P', cstr(''), query, i16(given.length), ...given.map(i32));
      this.send('B', cstr(''), cstr(''), ...(formats.some(Boolean) ? [i16(formats.length), ...formats.map(i16)] : [i16(0)]), i16(params.length), ...values, i16(0));
      this.send('D', Buffer.from('P'), cstr(''));
      this.send('E', cstr(''), i32(limit));
      this.send('C', Buffer.from('P'), cstr(''));
      this.send('S');
      const result: PostgresResult = { columns: [], rows: [], truncated: false, notices: [] };
      let oids: number[] = [], used = 0, error: PostgresError | undefined;
      const budget = Math.min(MAX_BYTES, limit * ROW_BUDGET);
      for (;;) {
        const { type, body } = await this.message(budget);
        if (type === 'Z') { this.ready(body); if (error) throw error; return result; }
        if (type === 'E') { error ??= new PostgresError(body); continue; }
        if (type === 'N') { const notice = new PostgresError(body); if (result.notices.length < 16) result.notices.push(notice); continue; }
        if (type === 'S') { const c = new Cursor(body); c.string(); c.string(); c.end(); continue; }
        if (type === 'T') {
          const c = new Cursor(body), count = c.int16();
          if (result.columns.length || count > 4096) protocol();
          oids = [];
          for (let i = 0; i < count; i++) {
            const name = c.string(); c.int32(); c.int16(); const oid = c.int32(); c.int16(); c.int32();
            if (c.int16() !== 0) protocol();
            oids.push(oid); result.columns.push({ name, type: types[oid] ?? String(oid) });
          }
          c.end();
        } else if (type === 'D') {
          const c = new Cursor(body), count = c.int16(); if (count !== oids.length) protocol();
          const row: SqlValue[] = [];
          for (let i = 0; i < count; i++) { const length = c.int32(); row.push(length === -1 ? null : decode(c.bytes(length).toString(), oids[i])); }
          c.end();
          if (result.rows.length < limit) { used += body.length; if (used > budget) throw new Error('PostgreSQL result exceeds the byte budget'); result.rows.push(row); }
          else result.truncated = true;
        } else if (type === 's') { if (body.length) protocol(); result.truncated = true; }
        else if (type === 'C') { const c = new Cursor(body), tag = c.string(); c.end(); const m = /(?:^| )(\d+)$/.exec(tag); if (m) result.affected = Number(m[1]); }
        else if (['1', '2', '3', 'n', 'I'].includes(type)) { if (body.length) protocol(); }
        else protocol();
      }
    } catch (e) {
      if (!(e instanceof PostgresError)) this.fail(e instanceof Error ? e : new Error('PostgreSQL could not finish the query; reconnect before retrying'));
      throw this.failure ?? e;
    } finally { clearTimeout(timer); this.busy = false; }
  }
  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    this.alive();
    if (this.context.getStore()?.active === false) throw new Error('PostgreSQL transaction has ended');
    if (this.busy || (this.transactionOwner && this.context.getStore() !== this.transactionOwner)) throw new Error('PostgreSQL connection is busy');
    const parent = this.transactionOwner;
    const root = !parent;
    const owner = { active: true };
    this.transactionOwner = owner;
    return this.context.run(owner, async () => {
      const savepoint = `tabularius_${++this.serial}`;
      let began = false;
      try {
        await this.query(root ? 'BEGIN' : `SAVEPOINT ${savepoint}`, []); began = true;
        const result = await fn(this);
        if (this.transactionOwner !== owner || this.busy) {
          this.fail(new Error('Await PostgreSQL operations before completing their transaction'));
          this.alive();
        }
        if (this.transactionStatus === 'E') throw new Error('PostgreSQL transaction is aborted; changes were rolled back');
        await this.query(root ? 'COMMIT' : `RELEASE SAVEPOINT ${savepoint}`, []);
        return result;
      } catch (e) {
        if (began && !this.failure) {
          try { await this.query(root ? 'ROLLBACK' : `ROLLBACK TO SAVEPOINT ${savepoint}`, []); if (!root) await this.query(`RELEASE SAVEPOINT ${savepoint}`, []); }
          catch { this.fail(new Error('PostgreSQL rollback failed; connection closed')); }
        }
        throw e;
      } finally { owner.active = false; this.transactionOwner = parent; }
    });
  }
  async tables(): Promise<{ schema?: string; name: string }[]> {
    const result = await this.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_type IN ('BASE TABLE', 'VIEW') AND table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name", []);
    if (result.truncated) throw new Error('PostgreSQL table catalog exceeds the row limit');
    return result.rows.map((r) => ({ schema: String(r[0]), name: String(r[1]) }));
  }
  async columns(table: { schema?: string; name: string }): Promise<SqlColumn[]> {
    const result = await this.query(`SELECT c.column_name, c.data_type, c.is_nullable,
      EXISTS (SELECT 1 FROM pg_catalog.pg_index i
        JOIN pg_catalog.pg_constraint p ON p.conindid = i.indexrelid AND p.contype = 'p'
        JOIN pg_catalog.pg_class t ON t.oid = i.indrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(p.conkey)
        WHERE i.indisprimary AND n.nspname = c.table_schema AND t.relname = c.table_name AND a.attname = c.column_name) AS is_key
      FROM information_schema.columns c WHERE c.table_schema = $1 AND c.table_name = $2 ORDER BY c.ordinal_position`, [table.schema ?? 'public', table.name]);
    if (result.truncated) throw new Error('PostgreSQL column catalog exceeds the row limit');
    return result.rows.map((r) => ({ name: String(r[0]), type: String(r[1]), nullable: r[2] === 'YES', key: r[3] === true }));
  }
  quoteName(name: string): string { cstr(name); return '"' + name.replace(/"/g, '""') + '"'; }
  placeholder(n: number): string { return '$' + bounded(n, 65535, 'parameter index'); }
  async close(): Promise<void> { this.fail(new Error('PostgreSQL connection is closed')); }
}
