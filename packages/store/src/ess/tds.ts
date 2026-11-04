/**
 * SQL Server wire client, part 1. [MS-TDS] section names below identify the
 * layouts used. Unverified against a real server; scripted peers are the only
 * compatibility evidence. No parameters, transactions, cancel, SSPI or FedAuth.
 *
 * The core ESS driver.ts is not present on this base. These structural result
 * types match its specified contract; part 2 can import them from the core.
 * DATE/TIME/DATETIME2 and exact numerics are strings (no lost fractional digits);
 * legacy datetime values are UTC Dates, INT8 is bigint and binary is Uint8Array.
 */
import { connect as netConnect, isIP, type Socket } from 'node:net';
import { connect as tlsConnect, checkServerIdentity, type TLSSocket } from 'node:tls';
import { Duplex } from 'node:stream';
import { hostRefusal, socketLookup } from '../outbound-address.ts';

export type SqlValue = string | number | bigint | boolean | null | Uint8Array | Date;
export interface SqlResult { columns: { name: string; type: string }[]; rows: SqlValue[][]; affected?: number }
export interface TdsOptions {
  host: string;
  port?: number;
  user: string;
  password: string;
  database?: string;
  authentication?: 'sql' | 'integrated' | 'azure-ad';
  encryption?: 'mandatory' | 'optional' | 'disable' | 'strict';
  allowUnencrypted?: boolean;
  trustServerCertificate?: boolean;
  ca?: string | Buffer | (string | Buffer)[];
  timeoutMs?: number;
}
const LIMIT = 16 * 1024 * 1024;
const ROW_LIMIT = 100_000;
const CELL_LIMIT = 1_000_000;
const RESULT_LIMIT = 1024;
const protocol = () => new Error('The SQL database sent an invalid or oversized TDS response.');
const disconnected = () => new Error('The SQL database connection closed. Reconnect before trying again.');

class Cursor {
  at = 0;
  readonly data: Buffer;
  constructor(data: Buffer) { this.data = data; }
  get left(): number { return this.data.length - this.at; }
  take(n: number): Buffer {
    if (!Number.isSafeInteger(n) || n < 0 || n > this.left) throw protocol();
    const b = this.data.subarray(this.at, this.at + n); this.at += n; return b;
  }
  u8(): number { return this.take(1)[0]; }
  u16(): number { return this.take(2).readUInt16LE(); }
  u32(): number { return this.take(4).readUInt32LE(); }
  text(n: number): string { return this.take(n * 2).toString('utf16le'); }
  end(): void { if (this.left) throw protocol(); }
}

// [MS-TDS] Packet Header. Packet size includes the eight-byte header.
function frame(type: number, data: Buffer, size: number): Buffer[] {
  const out: Buffer[] = [];
  for (let at = 0, id = 1; at < data.length || at === 0; id = (id + 1) & 255) {
    const n = Math.min(size - 8, data.length - at);
    const header = Buffer.from([type, at + n === data.length ? 1 : 0, 0, 0, 0, 0, id, 0]);
    header.writeUInt16BE(n + 8, 2);
    out.push(Buffer.concat([header, data.subarray(at, at + n)])); at += n;
    if (at === data.length) break;
  }
  return out;
}

/** Bounded byte queue. No read may remain pending after close/error/timeout. */
class Input {
  private chunks: Buffer[] = [];
  private size = 0;
  private error?: Error;
  private wake?: () => void;
  readonly stream: Duplex;
  constructor(stream: Duplex) {
    this.stream = stream;
    stream.on('data', this.data);
    stream.on('error', this.failed);
    stream.on('end', this.closed);
    stream.on('close', this.closed);
  }
  private data = (b: Buffer): void => {
    if (this.error) return;
    if (this.size + b.length > LIMIT) { this.failed(protocol()); this.stream.destroy(); return; }
    this.chunks.push(b); this.size += b.length;
    // Pause as soon as there are queued bytes; read() resumes only when needed.
    this.stream.pause(); this.wake?.();
  };
  private failed = (error: Error): void => { this.error ??= error; this.wake?.(); };
  private closed = (): void => { this.failed(disconnected()); };
  async read(n: number): Promise<Buffer> {
    if (n < 0 || n > LIMIT) throw protocol();
    while (this.size < n) {
      if (this.error) throw this.error;
      await new Promise<void>((resolve) => { this.wake = resolve; this.stream.resume(); });
      this.wake = undefined;
    }
    const result = Buffer.allocUnsafe(n);
    let at = 0;
    while (at < n) {
      const first = this.chunks[0], count = Math.min(first.length, n - at);
      first.copy(result, at, 0, count); at += count; this.size -= count;
      if (count === first.length) this.chunks.shift(); else this.chunks[0] = first.subarray(count);
    }
    return result;
  }
  detach(): void {
    if (this.size) throw protocol();
    this.stream.pause();
    this.stream.off('data', this.data).off('error', this.failed).off('end', this.closed).off('close', this.closed);
  }
}

async function message(input: Input, maxPacket: number, types = [4]): Promise<Buffer> {
  const parts: Buffer[] = [];
  let total = 0, expected = 1, packets = 0, messageType: number | undefined;
  for (;;) {
    const h = await input.read(8), length = h.readUInt16BE(2);
    if (!types.includes(h[0]) || (messageType !== undefined && h[0] !== messageType)
      || length < 8 || length > maxPacket || ++packets > 65536 || (h[1] & ~1) || h[7] !== 0
      || h[6] !== expected) throw protocol();
    messageType = h[0]; expected = (expected + 1) & 255;
    total += length - 8;
    if (total > LIMIT) throw protocol();
    parts.push(await input.read(length - 8));
    if (h[1] & 1) return Buffer.concat(parts, total);
  }
}

async function write(stream: Duplex, bytes: Buffer): Promise<void> {
  if (stream.destroyed || !stream.writable) throw disconnected();
  await new Promise<void>((resolve, reject) => {
    const closed = () => finish(disconnected());
    const finish = (error?: Error | null) => {
      stream.off('close', closed); if (error) reject(error); else resolve();
    };
    stream.once('close', closed); stream.write(bytes, finish);
  });
  if (stream.destroyed) throw disconnected();
}

/** [MS-TDS] TLS/SSL Negotiation: handshake records inside PRELOGIN, then raw TLS.
 * TLS 1.2 is used for this TDS 7.4 implementation. TDS 8 strict is not supported.
 */
class HandshakeTransport extends Duplex {
  private pending: Buffer = Buffer.alloc(0);
  private direct = false;
  private detached = false;
  readonly socket: Socket;
  constructor(socket: Socket) {
    super(); this.socket = socket;
    socket.on('data', this.receive).on('end', this.ended).on('error', this.failed).on('close', this.onClose);
  }
  private receive = (b: Buffer): void => {
    if (this.direct) { if (!this.push(b)) this.socket.pause(); return; }
    if (this.pending.length + b.length > LIMIT) { this.destroy(protocol()); return; }
    this.pending = Buffer.concat([this.pending, b]);
    while (this.pending.length >= 8) {
      const h = this.pending, n = h.readUInt16BE(2);
      if (n < 9 || n > 4096 || ![4, 0x12].includes(h[0]) || (h[1] & ~1)) { this.destroy(protocol()); return; }
      if (h.length < n) return;
      const body = h.subarray(8, n); this.pending = h.subarray(n);
      if (!this.push(body)) this.socket.pause();
    }
  };
  private ended = (): void => { this.push(null); };
  private failed = (): void => { this.destroy(new Error('The SQL database TLS connection failed.')); };
  private onClose = (): void => { if (!this.detached) this.destroy(disconnected()); };
  raw(): void { if (this.pending.length) throw protocol(); this.direct = true; }
  detach(): void {
    this.detached = true; this.socket.pause();
    this.socket.off('data', this.receive).off('end', this.ended).off('error', this.failed).off('close', this.onClose);
  }
  override _read(): void { if (!this.detached) this.socket.resume(); }
  override _write(b: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (this.detached) { callback(disconnected()); return; }
    const bytes = this.direct ? b : Buffer.concat(frame(0x12, b, 4096));
    this.socket.write(bytes, callback);
  }
  override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    if (!this.detached) this.socket.destroy();
    callback(error);
  }
}

// [MS-TDS] PRELOGIN: option offsets are big-endian and relative to the payload.
function prelogin(encryption: number): Buffer {
  const values = [Buffer.from([16, 0, 0, 0, 0, 0]), Buffer.from([encryption]), Buffer.from([0]), Buffer.alloc(4), Buffer.from([0])];
  const header = Buffer.alloc(26); let offset = header.length;
  values.forEach((value, i) => {
    header[i * 5] = i; header.writeUInt16BE(offset, i * 5 + 1); header.writeUInt16BE(value.length, i * 5 + 3); offset += value.length;
  });
  header[25] = 255; return Buffer.concat([header, ...values]);
}
function encryptionAnswer(data: Buffer): number {
  const c = new Cursor(data), options = new Map<number, [number, number]>();
  for (;;) {
    const tag = c.u8(); if (tag === 255) break;
    const entry = c.take(4), at = entry.readUInt16BE(), n = entry.readUInt16BE(2);
    if (options.has(tag) || at + n > data.length) throw protocol();
    options.set(tag, [at, n]);
  }
  const ranges = [...options.values()].sort((a, b) => a[0] - b[0]);
  let end = c.at;
  for (const [at, n] of ranges) { if (at < end) throw protocol(); end = at + n; }
  const encryption = options.get(1);
  if (!encryption || encryption[1] !== 1 || data[encryption[0]] > 3) throw protocol();
  return data[encryption[0]];
}

// [MS-TDS] LOGIN7, including Password Obfuscation. Offsets count bytes; lengths
// count UTF-16 code units. Never retain passwords in the connected client.
function login(options: TdsOptions): Buffer {
  const header = Buffer.alloc(94), fields: Buffer[] = [];
  header.writeUInt32LE(0x74000004, 4); header.writeUInt32LE(4096, 8);
  header[24] = 0xe0; header[25] = 3; // database/language notifications and ODBC.
  let offset = header.length;
  const field = (at: number, text: string, password = false) => {
    if (text.length > 128) throw new Error('SQL Server login fields must be at most 128 UTF-16 characters.');
    const value = Buffer.from(text, 'utf16le');
    if (password) for (let i = 0; i < value.length; i++) value[i] = ((value[i] << 4 | value[i] >>> 4) & 255) ^ 0xa5;
    header.writeUInt16LE(offset, at); header.writeUInt16LE(text.length, at + 2);
    offset += value.length; fields.push(value);
  };
  field(36, 'tabularius'); field(40, options.user); field(44, options.password, true);
  field(48, 'tabularius'); field(52, options.host); field(56, ''); field(60, 'tabularius');
  field(64, ''); field(68, options.database ?? ''); field(78, ''); field(82, ''); field(86, '');
  header.writeUInt32LE(offset, 0);
  return Buffer.concat([header, ...fields]);
}

const TYPES: Record<number, string> = {
  0x30: 'INT1', 0x34: 'INT2', 0x38: 'INT4', 0x7f: 'INT8', 0x26: 'INTN',
  0x32: 'BIT', 0x68: 'BITN', 0x3b: 'FLT4', 0x3e: 'FLT8', 0x6d: 'FLTN',
  0xe7: 'NVARCHAR', 0xef: 'NCHAR', 0xa7: 'VARCHAR', 0xaf: 'CHAR',
  0x6a: 'DECIMAL', 0x6c: 'NUMERIC', 0x28: 'DATE', 0x29: 'TIME', 0x2a: 'DATETIME2',
  0x3d: 'DATETIME', 0x6f: 'DATETIMN', 0x3a: 'SMALLDATETIME', 0x3c: 'MONEY',
  0x7a: 'SMALLMONEY', 0x6e: 'MONEYN', 0x24: 'UNIQUEIDENTIFIER', 0xa5: 'VARBINARY', 0xad: 'BINARY',
  0xf1: 'XML', 0x62: 'sql_variant', 0x2b: 'DATETIMEOFFSET', 0x23: 'TEXT', 0x63: 'NTEXT', 0x22: 'IMAGE',
};
interface Column { name: string; type: string; id: number; size: number; scale: number; precision: number; cp1252: boolean }
const fixed: Record<number, number> = { 0x30: 1, 0x34: 2, 0x38: 4, 0x7f: 8, 0x32: 1, 0x3b: 4, 0x3e: 8, 0x3d: 8, 0x3a: 4, 0x3c: 8, 0x7a: 4 };
const wide = new Set([0xe7, 0xef, 0xa7, 0xaf, 0xa5, 0xad]);
const strings = new Set([0xe7, 0xef, 0xa7, 0xaf]);
const notDecoded = (type: string) => new Error(`SQL Server type ${type} is not decoded yet (planned for client part 2).`);
function column(c: Cursor): Column {
  c.take(6); // COLMETADATA: UserType (ULONG), Flags (USHORT).
  const id = c.u8(), type = TYPES[id] ?? `0x${id.toString(16)}`;
  const out: Column = { name: '', id, type, size: fixed[id] ?? 0, scale: 0, precision: 0, cp1252: false };
  if (wide.has(id)) {
    out.size = c.u16(); if (out.size === 65535) throw notDecoded(`${type}(max) / PLP`);
    if (out.size > 8000 || (id >= 0xe7 && out.size % 2)) throw protocol();
    if (strings.has(id)) {
      const collation = c.take(5), lcid = collation.readUInt32LE() & 0xfffff, sort = collation[4];
      // [MS-TDS] Collation: common CP1252 SQL sort IDs and Windows LCIDs.
      // Other code pages currently fall back to latin1, unverified against a real
      // server. UTF-8 collations are not claimed as supported by this fallback.
      out.cp1252 = (sort >= 50 && sort <= 54) || (sort === 0 && [0x409, 0x809, 0xc09, 0x407, 0x40c, 0x410, 0x413, 0x416, 0x816, 0x40a, 0xc0a].includes(lcid));
    }
  } else if ([0x26, 0x68, 0x6d, 0x6e, 0x6f, 0x24].includes(id)) {
    out.size = c.u8();
    const sizes = id === 0x26 ? [1, 2, 4, 8] : id === 0x68 ? [1] : id === 0x24 ? [16] : [4, 8];
    if (!sizes.includes(out.size)) throw protocol();
  } else if (id === 0x6a || id === 0x6c) {
    out.size = c.u8(); out.precision = c.u8(); out.scale = c.u8();
    const size = out.precision <= 9 ? 5 : out.precision <= 19 ? 9 : out.precision <= 28 ? 13 : 17;
    if (out.precision < 1 || out.precision > 38 || out.scale > out.precision || out.size !== size) throw protocol();
  } else if (id === 0x28) out.size = 3;
  else if (id === 0x29 || id === 0x2a) {
    out.scale = c.u8(); if (out.scale > 7) throw protocol();
    out.size = (out.scale <= 2 ? 3 : out.scale <= 4 ? 4 : 5) + (id === 0x2a ? 3 : 0);
  } else if (!fixed[id]) throw notDecoded(type);
  out.name = c.text(c.u8()); return out;
}
function unsigned(b: Buffer): bigint {
  let value = 0n; for (let i = b.length - 1; i >= 0; i--) value = value * 256n + BigInt(b[i]); return value;
}
function decimal(value: bigint, scale: number): string {
  const sign = value < 0n ? '-' : '', s = (value < 0n ? -value : value).toString().padStart(scale + 1, '0');
  return sign + (scale ? `${s.slice(0, -scale)}.${s.slice(-scale)}` : s);
}
function date(b: Buffer): string {
  const days = Number(unsigned(b)); if (days > 3652058) throw protocol();
  return new Date(-62135596800000 + days * 86400000).toISOString().slice(0, 10);
}
function time(b: Buffer, scale: number): string {
  const ticks = unsigned(b), divisor = 10n ** BigInt(scale), seconds = ticks / divisor;
  if (seconds >= 86400n) throw protocol();
  const pad = (n: bigint) => n.toString().padStart(2, '0');
  return `${pad(seconds / 3600n)}:${pad(seconds / 60n % 60n)}:${pad(seconds % 60n)}`
    + (scale ? `.${(ticks % divisor).toString().padStart(scale, '0')}` : '');
}
// [MS-TDS] Data Type Details: length prefixes belong to values, not metadata.
function value(c: Cursor, col: Column): SqlValue {
  const { id, size, scale } = col;
  let n = fixed[id];
  if (!n) {
    n = wide.has(id) ? c.u16() : c.u8();
    if (wide.has(id) ? n === 65535 : n === 0) return null;
    if (n > size || (!wide.has(id) && n !== size)) throw protocol();
  }
  const b = c.take(n);
  if ([0x30, 0x34, 0x38, 0x7f, 0x26].includes(id)) return n === 8 ? b.readBigInt64LE() : n === 1 ? b[0] : b.readIntLE(0, n);
  if (id === 0x32 || id === 0x68) { if (b[0] > 1) throw protocol(); return b[0] !== 0; }
  if ([0x3b, 0x3e, 0x6d].includes(id)) return n === 4 ? b.readFloatLE() : b.readDoubleLE();
  if (strings.has(id)) {
    if (id === 0xe7 || id === 0xef) { if (n % 2) throw protocol(); return b.toString('utf16le'); }
    return col.cp1252 ? new TextDecoder('windows-1252').decode(b) : b.toString('latin1');
  }
  if (id === 0xa5 || id === 0xad) return Uint8Array.from(b);
  if (id === 0x6a || id === 0x6c) {
    if (b[0] > 1) throw protocol();
    const magnitude = unsigned(b.subarray(1)); if (magnitude >= 10n ** BigInt(col.precision)) throw protocol();
    return decimal((b[0] ? 1n : -1n) * magnitude, scale);
  }
  if (id === 0x28) return date(b);
  if (id === 0x29) return time(b, scale);
  if (id === 0x2a) return `${date(b.subarray(-3))}T${time(b.subarray(0, -3), scale)}`;
  if ([0x3d, 0x3a, 0x6f].includes(id)) {
    const days = n === 4 ? b.readUInt16LE() : b.readInt32LE();
    const ms = n === 4 ? b.readUInt16LE(2) * 60000 : Math.round(b.readUInt32LE(4) * 1000 / 300);
    if (ms >= 86400000) throw protocol();
    return new Date(Date.UTC(1900, 0, 1) + days * 86400000 + ms);
  }
  if ([0x3c, 0x7a, 0x6e].includes(id)) {
    // MONEY's high signed DWORD precedes its low unsigned DWORD on the wire.
    return decimal(n === 4 ? BigInt(b.readInt32LE()) : BigInt(b.readInt32LE()) * 4294967296n + BigInt(b.readUInt32LE(4)), 4);
  }
  if (id === 0x24) {
    const h = b.toString('hex');
    return `${b.readUInt32LE().toString(16).padStart(8, '0')}-${b.readUInt16LE(4).toString(16).padStart(4, '0')}-${b.readUInt16LE(6).toString(16).padStart(4, '0')}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  throw notDecoded(col.type);
}

export class TdsError extends Error {
  readonly number: number;
  readonly state: number;
  readonly class: number;
  readonly line: number;
  constructor(number: number, state: number, severity: number, line: number, message: string) {
    super(`SQL Server error ${number} (class ${severity}, state ${state}): ${message}`);
    this.name = 'TdsError'; this.number = number; this.state = state; this.class = severity; this.line = line;
  }
}
// [MS-TDS] ERROR / INFO. Server text can echo secrets, SQL and row values even
// without quotes. Only fixed, value-free messages cross the error boundary.
function serverError(c: Cursor): TdsError {
  const e = new Cursor(c.take(c.u16()));
  const number = e.u32(), state = e.u8(), severity = e.u8(), text = e.text(e.u16());
  e.text(e.u8()); e.text(e.u8()); const line = e.u32(); e.end();
  const safe = ['Permission denied.', 'Login failed.', 'Syntax error.', 'The statement has been terminated.'];
  const message = safe.includes(text) ? text : 'The database rejected the request. Check its permissions and server diagnostics.';
  return new TdsError(number, state, severity, line, message);
}

export class TdsClient {
  private socket?: Socket;
  private stream?: Duplex;
  private input?: Input;
  private tls?: TLSSocket;
  private packetSize = 4096;
  private timeoutMs = 30_000;
  private busy = false;
  private ready = false;
  private used = false;
  private descriptor = Buffer.alloc(8);
  private database = '';
  private language = '';
  private collation = Buffer.alloc(0);

  static async connect(options: TdsOptions): Promise<TdsClient> {
    const client = new TdsClient(); await client.connect(options); return client;
  }
  async connect(options: TdsOptions): Promise<void> {
    if (this.used) throw new Error('This SQL Server client has already been used. Create a new client to reconnect.');
    this.used = true;
    const mode = options.encryption ?? 'mandatory';
    if (mode === 'strict') throw new Error('SQL Server strict encryption requires TDS 8 and is not supported yet.');
    if (!['mandatory', 'optional', 'disable'].includes(mode)) throw new Error('Choose mandatory, optional or disable SQL Server encryption.');
    if (mode === 'disable' && options.allowUnencrypted !== true) throw new Error('Disabling SQL Server encryption requires allowUnencrypted: true.');
    if (options.authentication && options.authentication !== 'sql') throw new Error('SQL Server integrated (SSPI/Kerberos) and Azure AD authentication are not supported yet. Use SQL authentication.');
    const port = options.port ?? 1433;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 2147483647
      || !Number.isInteger(port) || port < 1 || port > 65535 || !options.host) throw new Error('SQL Server needs a valid host, port and positive timeoutMs.');
    const payload = login(options); // Validate before opening a socket.
    // The server is one an administrator chose, on the network or not; the metadata range is never reached, and a name is checked on the lookup the connection uses.
    const refused = hostRefusal({ private: true }, options.host);
    if (refused) throw new Error(`SQL Server: ${refused}`);
    try {
      await this.deadline(async () => {
        const socket = netConnect({ host: options.host, port, lookup: socketLookup({ private: true }) });
        this.socket = socket; this.stream = socket; this.input = new Input(socket);
        // Input owns errors too, including errors between await boundaries.
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => { socket.off('connect', connected).off('error', failed).off('close', closed); };
          const connected = () => { cleanup(); resolve(); };
          const failed = () => { cleanup(); reject(new Error('Could not connect to the SQL database. Check its address and availability.')); };
          const closed = () => { cleanup(); reject(disconnected()); };
          socket.once('connect', connected).once('error', failed).once('close', closed);
        });
        if (socket.destroyed) throw disconnected();
        socket.setNoDelay(true);
        await this.send(0x12, prelogin(mode === 'mandatory' ? 1 : 0));
        const answer = encryptionAnswer(await message(this.input!, this.packetSize));
        if (mode === 'mandatory' && answer !== 1 && answer !== 3) throw new Error('The SQL database did not agree to mandatory encryption. Enable encryption on the server.');
        // ENCRYPT_NOT_SUP would send the login (and its password) in the clear: only when the caller said that is acceptable.
        if (answer === 2 && options.allowUnencrypted !== true) {
          payload.fill(0);
          throw new Error('The SQL database does not support encryption, so the login would travel unencrypted. Enable encryption on the server, or set allowUnencrypted: true to accept an unencrypted login.');
        }
        // ENCRYPT_OFF still encrypts LOGIN7; ENCRYPT_NOT_SUP is the sole
        // plaintext-login case. ENCRYPT_ON/REQ always protects the session.
        const loginOnly = answer === 0;
        if (answer !== 2) await this.encrypt(options, loginOnly);
        await this.send(0x10, payload);
        payload.fill(0);
        if (loginOnly) {
          const transport = (this.tls as TLSSocket & { tdsTransport?: HandshakeTransport }).tdsTransport!;
          this.input!.detach(); transport.detach(); this.tls!.destroy(); this.tls = undefined;
          this.stream = socket; this.input = new Input(socket);
        }
        await this.response(true);
        if (socket.destroyed) throw disconnected();
        this.ready = true;
      });
    } catch (error) { await this.close(); throw error; }
    finally { payload.fill(0); }
  }
  private async encrypt(options: TdsOptions, loginOnly: boolean): Promise<void> {
    this.input!.detach();
    const transport = new HandshakeTransport(this.socket!);
    const secure = tlsConnect({ socket: transport, ca: options.ca,
      servername: isIP(options.host) ? undefined : options.host,
      rejectUnauthorized: options.trustServerCertificate !== true,
      checkServerIdentity: (_host, certificate) => checkServerIdentity(options.host, certificate),
      minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2',
    });
    (secure as TLSSocket & { tdsTransport?: HandshakeTransport }).tdsTransport = transport;
    this.tls = secure; this.stream = secure; this.input = new Input(secure);
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => { secure.off('secureConnect', connected).off('error', failed).off('close', closed); };
      const failed = () => { cleanup(); reject(new Error('SQL Server TLS verification or handshake failed. Check the certificate authority and host name.')); };
      const closed = () => { cleanup(); reject(disconnected()); };
      const connected = () => {
        cleanup();
        try {
          // Explicit host check is essential with a custom Duplex and with IP
          // addresses (which cannot be sent as SNI).
          if (options.trustServerCertificate !== true && (!secure.authorized || checkServerIdentity(options.host, secure.getPeerCertificate()))) {
            reject(new Error('SQL Server TLS certificate does not match the trusted host.')); return;
          }
          transport.raw();
          if (loginOnly) this.socket!.pause();
          resolve();
        } catch { reject(protocol()); }
      };
      secure.once('secureConnect', connected).once('error', failed).once('close', closed);
    });
    if (secure.destroyed || this.socket!.destroyed) throw disconnected();
  }
  private async deadline<T>(fn: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([fn(), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          void this.close(); reject(new Error('The SQL database timed out. Check connectivity or increase timeoutMs.'));
        }, this.timeoutMs);
      })]);
    } finally { clearTimeout(timer); }
  }
  private async send(type: number, data: Buffer): Promise<void> {
    if (data.length > LIMIT) throw new Error('The SQL Server request exceeds the 16 MiB client limit.');
    for (const part of frame(type, data, this.packetSize)) await write(this.stream!, part);
  }
  async batch(sql: string): Promise<SqlResult[]> {
    if (!this.ready || this.socket?.destroyed) throw disconnected();
    if (this.busy) throw new Error('A SQL Server batch is already running on this connection.');
    if (sql.length > (LIMIT - 22) / 2) throw new Error('The SQL Server batch exceeds the 16 MiB client limit.');
    this.busy = true;
    try {
      return await this.deadline(async () => {
        // [MS-TDS] SQLBatch / ALL_HEADERS / Transaction Descriptor: total length,
        // header length, type=2, eight-byte descriptor, outstanding request count.
        const headers = Buffer.alloc(22);
        headers.writeUInt32LE(22); headers.writeUInt32LE(18, 4); headers.writeUInt16LE(2, 8);
        this.descriptor.copy(headers, 10); headers.writeUInt32LE(1, 18);
        await this.send(1, Buffer.concat([headers, Buffer.from(sql, 'utf16le')]));
        return await this.response(false);
      });
    } catch (error) { await this.close(); throw error; }
    finally { this.busy = false; }
  }
  // [MS-TDS] ENVCHANGE: string lengths are UTF-16 characters; collation and
  // transaction descriptor lengths are bytes. No transaction API in part 1.
  private environment(c: Cursor): void {
    const e = new Cursor(c.take(c.u16())), kind = e.u8();
    if ([1, 2, 4].includes(kind)) {
      const next = e.text(e.u8()); e.text(e.u8());
      if (kind === 1) this.database = next;
      if (kind === 2) this.language = next;
      if (kind === 4) {
        const size = /^\d+$/.test(next) ? Number(next) : 0;
        if (size < 512 || size > 32767) throw protocol();
        this.packetSize = size;
      }
    } else if ([7, 8, 9, 10].includes(kind)) {
      const next = e.take(e.u8()), old = e.take(e.u8());
      if (kind === 7) {
        if (next.length !== 5 || ![0, 5].includes(old.length)) throw protocol();
        this.collation = Buffer.from(next);
      } else {
        if (kind === 8 ? next.length !== 8 || old.length !== 0 : next.length !== 0 || old.length !== 8) throw protocol();
        this.descriptor = kind === 8 ? Buffer.from(next) : Buffer.alloc(8);
      }
    } else throw new Error(`SQL Server ENVCHANGE ${kind} is not supported yet.`);
    e.end();
  }
  private async response(loginPhase: boolean): Promise<SqlResult[]> {
    const results: SqlResult[] = [];
    let columns: Column[] | undefined, current: SqlResult | undefined, acknowledged = false;
    let finished = false, bytes = 0, rowCount = 0, cells = 0;
    while (!finished) {
      const data = await message(this.input!, this.packetSize); bytes += data.length;
      if (bytes > LIMIT) throw protocol();
      const c = new Cursor(data);
      while (c.left) {
        if (finished) throw protocol();
        const tag = c.u8();
        switch (tag) {
          case 0xad: { // LOGINACK
            if (!loginPhase || acknowledged) throw protocol();
            const a = new Cursor(c.take(c.u16()));
            if (a.u8() !== 1 || a.take(4).readUInt32BE() !== 0x74000004) throw protocol();
            a.text(a.u8()); a.take(4); a.end(); acknowledged = true; break;
          }
          case 0xe3: this.environment(c); break;
          case 0xab: serverError(c); break; // INFO consumed, never logged.
          case 0xaa: throw serverError(c);
          case 0x81: { // COLMETADATA
            if (loginPhase || current) throw protocol();
            const count = c.u16();
            if (count === 65535) { columns = undefined; break; }
            if (count > 4096) throw protocol();
            columns = Array.from({ length: count }, () => column(c));
            current = { columns: columns.map(({ name, type }) => ({ name, type })), rows: [] };
            results.push(current); break;
          }
          case 0xd1: case 0xd2: { // ROW / NBCROW
            if (!columns || !current || ++rowCount > ROW_LIMIT) throw protocol();
            // NBCROW can expand a one-bit null into a full JS array entry.
            cells += columns.length; if (cells > CELL_LIMIT) throw protocol();
            const bitmap = tag === 0xd2 ? c.take(Math.ceil(columns.length / 8)) : undefined;
            current.rows.push(columns.map((col, i) => bitmap && (bitmap[i >> 3] & (1 << (i & 7))) ? null : value(c, col)));
            break;
          }
          case 0xa9: { const length = c.u16(); if (length % 2) throw protocol(); c.take(length); break; } // ORDER
          case 0x79: c.take(4); break; // RETURNSTATUS
          case 0xfd: case 0xfe: case 0xff: { // DONE / DONEPROC / DONEINPROC
            const status = c.u16(); c.u16(); const affected = c.take(8).readBigUInt64LE();
            if (status & (2 | 0x100 | 0x20)) throw new Error('The SQL database reported that the batch failed or was cancelled.');
            if (status & 0x10) {
              if (affected > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('The SQL database returned a row count larger than this client can represent.');
              if (!current) { current = { columns: [], rows: [] }; results.push(current); }
              current.affected = Number(affected);
            }
            current = undefined; columns = undefined;
            finished = !(status & 1); break;
          }
          default: throw new Error(`SQL Server token 0x${tag.toString(16)} is not decoded yet.`);
        }
        if (results.length > RESULT_LIMIT) throw protocol();
      }
    }
    if (loginPhase && !acknowledged) throw new Error('The SQL database did not acknowledge the login.');
    return results;
  }
  async close(): Promise<void> {
    this.ready = false;
    this.tls?.destroy(); this.socket?.destroy();
  }
}
