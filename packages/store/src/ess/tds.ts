/**
 * SQL Server TDS 7.4 wire client and SqlDriver adapter. [MS-TDS] section names below identify the
 * layouts used. Unverified against a real server; scripted peers are the only
 * compatibility evidence. SSPI, FedAuth, TVP and UDT are not supported.
 *
 * SqlValue null defaults to NVARCHAR; rpc parameterTypes permits typed nulls.
 * No real-connection path is installed into the synchronous Store bridge.
 * DATE/TIME/DATETIME2 and exact numerics are strings (no lost fractional digits);
 * legacy datetime values are UTC Dates, INT8 is bigint and binary is Uint8Array.
 */
import { connect as netConnect, isIP, type Socket } from 'node:net';
import { connect as tlsConnect, checkServerIdentity, type TLSSocket } from 'node:tls';
import { Duplex } from 'node:stream';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { SqlValue, SqlResult, SqlColumn, SqlDriver } from './driver.ts';
export type { SqlValue, SqlResult } from './driver.ts';
import { hostRefusal, socketLookup } from '../outbound-address.ts';

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
const VALUE_LIMIT = 64 * 1024 * 1024;
const RESPONSE_LIMIT = 128 * 1024 * 1024;
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

// Response tokens and PLP chunks can cross packet boundaries. Only a packet
// and the requested field are buffered, never a complete response message.
class PacketCursor {
  private packet = new Cursor(Buffer.alloc(0));
  private ended = false;
  private expected = 1;
  private total = 0;
  private packets = 0;
  private input: Input;
  private maxPacket: () => number;
  constructor(input: Input, maxPacket: () => number) { this.input = input; this.maxPacket = maxPacket; }
  async more(): Promise<boolean> {
    while (!this.packet.left && !this.ended) {
      const h = await this.input.read(8), n = h.readUInt16BE(2);
      if (h[0] !== 4 || n < 8 || n > this.maxPacket() || (h[1] & ~1) || h[7] !== 0
        || h[6] !== this.expected || ++this.packets > 1_000_000) throw protocol();
      this.expected = (this.expected + 1) & 255;
      this.total += n - 8; if (this.total > RESPONSE_LIMIT) throw protocol();
      this.packet = new Cursor(await this.input.read(n - 8)); this.ended = Boolean(h[1] & 1);
    }
    return this.packet.left > 0;
  }
  async take(n: number): Promise<Buffer> {
    if (!Number.isSafeInteger(n) || n < 0 || n > VALUE_LIMIT) throw protocol();
    const parts: Buffer[] = []; let remaining = n;
    while (remaining) {
      if (!await this.more()) throw protocol();
      const part = this.packet.take(Math.min(remaining, this.packet.left));
      parts.push(part); remaining -= part.length;
    }
    return Buffer.concat(parts, n);
  }
  async u8(): Promise<number> { return (await this.take(1))[0]; }
  async u16(): Promise<number> { return (await this.take(2)).readUInt16LE(); }
  async u32(): Promise<number> { return (await this.take(4)).readUInt32LE(); }
  async text(n: number): Promise<string> { return (await this.take(n * 2)).toString('utf16le'); }
  nextMessage(): void { this.ended = false; this.expected = 1; }
}
type Reader = Cursor | PacketCursor;

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
// WHATWG windows-1252: 0x80-0x9F differ from latin1. Decoded by table, because some Node 22 releases
// (22.20 among them) decode TextDecoder('windows-1252') as latin1.
const CP1252_HIGH = '\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u008d\u017d\u008f'
  + '\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u009d\u017e\u0178';
function windows1252(b: Buffer): string {
  return b.toString('latin1').replace(/[\x80-\x9f]/g, (c) => CP1252_HIGH[c.charCodeAt(0) - 0x80]);
}
interface Column { name: string; type: string; id: number; size: number; scale: number; precision: number; cp1252: boolean }
const fixed: Record<number, number> = { 0x30: 1, 0x34: 2, 0x38: 4, 0x7f: 8, 0x32: 1, 0x3b: 4, 0x3e: 8, 0x3d: 8, 0x3a: 4, 0x3c: 8, 0x7a: 4 };
const wide = new Set([0xe7, 0xef, 0xa7, 0xaf, 0xa5, 0xad]);
const strings = new Set([0xe7, 0xef, 0xa7, 0xaf]);
const notDecoded = (type: string) => new Error(`SQL Server type ${type} is not supported by this client.`);
async function column(c: Reader, named = true): Promise<Column> {
  if (named) await c.take(6); // COLMETADATA: UserType (ULONG), Flags (USHORT).
  const id = await c.u8(), type = TYPES[id] ?? (id === 0xf0 ? 'UDT' : id === 0xf3 ? 'TVP' : `0x${id.toString(16)}`);
  const out: Column = { name: '', id, type, size: fixed[id] ?? 0, scale: 0, precision: 0, cp1252: false };
  if (wide.has(id) || [0x23, 0x63, 0x22].includes(id)) {
    const legacy = [0x23, 0x63, 0x22].includes(id);
    out.size = legacy ? await c.u32() : await c.u16();
    if (!legacy && out.size !== 65535 && (out.size > 8000 || (id >= 0xe7 && out.size % 2))) throw protocol();
    if (out.size === 65535 && [0xef, 0xaf, 0xad].includes(id)) throw protocol();
    if (strings.has(id) || id === 0x23 || id === 0x63) {
      const collation = await c.take(5), lcid = collation.readUInt32LE() & 0xfffff, sort = collation[4];
      // Other code pages fall back to latin1, unverified against a real server.
      out.cp1252 = (sort >= 50 && sort <= 54) || (sort === 0 && [0x409, 0x809, 0xc09, 0x407, 0x40c, 0x410, 0x413, 0x416, 0x816, 0x40a, 0xc0a].includes(lcid));
    }
    if (legacy) { const parts = await c.u8(); for (let i = 0; i < parts; i++) await c.text(await c.u16()); }
  } else if ([0x26, 0x68, 0x6d, 0x6e, 0x6f, 0x24].includes(id)) {
    out.size = await c.u8();
    const sizes = id === 0x26 ? [1, 2, 4, 8] : id === 0x68 ? [1] : id === 0x24 ? [16] : [4, 8];
    if (!sizes.includes(out.size)) throw protocol();
  } else if (id === 0x6a || id === 0x6c) {
    out.size = await c.u8(); out.precision = await c.u8(); out.scale = await c.u8();
    // A real server reports the widest storage (17) for some columns and the per-precision size (5, 9, 13) for others; each value then
    // carries its own length. The metadata size only has to be a decimal storage size that holds the precision.
    const size = out.precision <= 9 ? 5 : out.precision <= 19 ? 9 : out.precision <= 28 ? 13 : 17;
    if (out.precision < 1 || out.precision > 38 || out.scale > out.precision || ![5, 9, 13, 17].includes(out.size) || out.size < size) throw protocol();
  } else if (id === 0x28) out.size = 3;
  else if ([0x29, 0x2a, 0x2b].includes(id)) {
    out.scale = await c.u8(); if (out.scale > 7) throw protocol();
    out.size = (out.scale <= 2 ? 3 : out.scale <= 4 ? 4 : 5) + (id === 0x2a ? 3 : id === 0x2b ? 5 : 0);
  } else if (id === 0xf1) {
    const schema = await c.u8(); if (schema > 1) throw protocol();
    if (schema) { await c.text(await c.u8()); await c.text(await c.u8()); await c.text(await c.u16()); }
    out.size = 65535;
  } else if (id === 0x62) { out.size = await c.u32(); if (out.size > 8016) throw protocol(); }
  else if (!fixed[id]) throw notDecoded(type);
  if (named) out.name = await c.text(await c.u8()); return out;
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
async function plp(c: Reader): Promise<Buffer | null> {
  // [MS-TDS] PLP: ULONGLONG total (NULL or unknown sentinels), ULONG
  // chunks, zero terminator. Enforce both declared and cumulative lengths.
  const total = (await c.take(8)).readBigUInt64LE();
  if (total === 0xffffffffffffffffn) return null;
  const unknown = total === 0xfffffffffffffffen;
  if (!unknown && total > BigInt(VALUE_LIMIT)) throw new Error('The SQL database value exceeds the 64 MiB client limit.');
  const parts: Buffer[] = []; let size = 0;
  for (;;) {
    const n = await c.u32(); if (!n) break;
    size += n;
    if (size > VALUE_LIMIT) throw new Error('The SQL database value exceeds the 64 MiB client limit.');
    if (!unknown && BigInt(size) > total) throw protocol();
    if (parts.length >= 65536) throw protocol();
    parts.push(await c.take(n));
  }
  if (!unknown && BigInt(size) !== total) throw protocol();
  return Buffer.concat(parts, size);
}
async function value(c: Reader, col: Column): Promise<SqlValue> {
  const { id, size } = col;
  if ((wide.has(id) && size === 65535) || id === 0xf1) {
    const b = await plp(c); return b === null ? null : scalar(b, col);
  }
  if ([0x23, 0x63, 0x22].includes(id)) {
    const pointer = await c.u8(); if (!pointer) return null;
    if (pointer !== 16) throw protocol();
    await c.take(pointer + 8); // TextPointer and timestamp.
    const n = await c.u32();
    if (n > VALUE_LIMIT) throw new Error('The SQL database value exceeds the 64 MiB client limit.');
    if (n > size) throw protocol();
    return scalar(await c.take(n), col);
  }
  if (id === 0x62) {
    const n = await c.u32(); if (!n) return null;
    if (n > size || n > 8016) throw protocol();
    return await variant(new Cursor(await c.take(n)));
  }
  let n = fixed[id];
  if (!n) {
    n = wide.has(id) ? await c.u16() : await c.u8();
    if (wide.has(id) ? n === 65535 : n === 0) return null;
    // A decimal's value length is its storage size for the precision, which may be less than the size the metadata declared.
    if (n > size || (!wide.has(id) && n !== size && !((id === 0x6a || id === 0x6c) && [5, 9, 13, 17].includes(n)))) throw protocol();
  }
  return scalar(await c.take(n), col);
}
function scalar(b: Buffer, col: Column): SqlValue {
  const { id, scale } = col, n = b.length;
  if ([0x30, 0x34, 0x38, 0x7f, 0x26].includes(id)) return n === 8 ? b.readBigInt64LE() : n === 1 ? b[0] : b.readIntLE(0, n);
  if (id === 0x32 || id === 0x68) { if (b[0] > 1) throw protocol(); return b[0] !== 0; }
  if ([0x3b, 0x3e, 0x6d].includes(id)) return n === 4 ? b.readFloatLE() : b.readDoubleLE();
  if (strings.has(id) || [0x23, 0x63, 0xf1].includes(id)) {
    if ([0xe7, 0xef, 0x63, 0xf1].includes(id)) { if (n % 2) throw protocol(); return b.toString('utf16le'); }
    return col.cp1252 ? windows1252(b) : b.toString('latin1');
  }
  if (id === 0xa5 || id === 0xad || id === 0x22) return Uint8Array.from(b);
  if (id === 0x6a || id === 0x6c) {
    if (b[0] > 1) throw protocol();
    const magnitude = unsigned(b.subarray(1)); if (magnitude >= 10n ** BigInt(col.precision)) throw protocol();
    return decimal((b[0] ? 1n : -1n) * magnitude, scale);
  }
  if (id === 0x28) return date(b);
  if (id === 0x29) return time(b, scale);
  if (id === 0x2a) return `${date(b.subarray(-3))}T${time(b.subarray(0, -3), scale)}`;
  if (id === 0x2b) {
    const offset = b.readInt16LE(n - 2); if (Math.abs(offset) > 840) throw protocol();
    const local = `${date(b.subarray(-5, -2))}T${time(b.subarray(0, -5), scale)}Z`;
    const result = new Date(new Date(local).getTime() - offset * 60000);
    if (result.getTime() < -62135596800000 || result.getTime() >= 253402300800000) throw protocol();
    return result;
  }
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

async function variant(c: Cursor): Promise<SqlValue> {
  const id = c.u8(), properties = new Cursor(c.take(c.u8()));
  let info: Buffer = Buffer.alloc(0);
  if ([0xe7, 0xef, 0xa7, 0xaf].includes(id)) {
    const coll = properties.take(5), size = properties.take(2); info = Buffer.concat([size, coll]);
  } else if ([0xa5, 0xad].includes(id)) info = properties.take(2);
  else if ([0x6a, 0x6c].includes(id)) {
    const precision = properties.u8(), scale = properties.u8();
    info = Buffer.from([precision <= 9 ? 5 : precision <= 19 ? 9 : precision <= 28 ? 13 : 17, precision, scale]);
  } else if ([0x29, 0x2a, 0x2b].includes(id)) info = properties.take(1);
  else if (id === 0x24) info = Buffer.from([16]);
  else if (!fixed[id] && id !== 0x28) throw notDecoded('sql_variant base type');
  properties.end();
  const col = await column(new Cursor(Buffer.concat([Buffer.from([id]), info])), false);
  if (col.size === 65535 || c.left > col.size || (!wide.has(id) && c.left !== col.size)) throw protocol();
  return scalar(c.take(c.left), col);
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

export type TdsParameterType = 'nvarchar' | 'bigint' | 'float' | 'bit' | 'varbinary' | 'datetime2';
type QueryOptions = { timeoutMs?: number; maxRows?: number };
type RequestState = { cancelled: boolean; acknowledged: boolean; complete: boolean; maxRows: number };
function short(n: number): Buffer { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function long(n: number): Buffer { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function parameter(name: string, v: SqlValue, collation: Buffer, hint?: TdsParameterType): { bytes: Buffer; declaration: string } {
  const type = hint ?? (v === null || typeof v === 'string' ? 'nvarchar' : typeof v === 'bigint' ? 'bigint'
    : typeof v === 'number' ? 'float' : typeof v === 'boolean' ? 'bit' : v instanceof Date ? 'datetime2' : 'varbinary');
  let info: Buffer, data: Buffer, declaration: string = type;
  const invalid = () => new Error('A SQL Server parameter has an invalid type or value.');
  if (type === 'nvarchar' || type === 'varbinary') {
    if (v !== null && (type === 'nvarchar' ? typeof v !== 'string' : !(v instanceof Uint8Array))) throw invalid();
    const size = v === null ? 0 : typeof v === 'string' ? v.length * 2 : (v as Uint8Array).byteLength;
    if (size > VALUE_LIMIT) throw new Error('A SQL Server parameter exceeds the 64 MiB client limit.');
    const b = v === null ? Buffer.alloc(0) : typeof v === 'string' ? Buffer.from(v, 'utf16le') : Buffer.from(v as Uint8Array);
    const max = b.length > 8000;
    declaration += type === 'nvarchar' ? max ? '(max)' : '(4000)' : max ? '(max)' : '(8000)';
    info = Buffer.concat([Buffer.from([type === 'nvarchar' ? 0xe7 : 0xa5]), short(max ? 65535 : 8000), type === 'nvarchar' ? collation : Buffer.alloc(0)]);
    if (max) {
      const total = Buffer.alloc(8); total.writeBigUInt64LE(BigInt(b.length));
      const chunks: Buffer[] = [total];
      for (let at = 0; at < b.length; at += 65536) {
        const chunk = b.subarray(at, at + 65536); chunks.push(long(chunk.length), chunk);
      }
      chunks.push(long(0)); data = Buffer.concat(chunks);
    } else data = Buffer.concat([short(v === null ? 65535 : b.length), b]);
  } else {
    let b: Buffer;
    if (type === 'bigint') {
      if (v !== null && (typeof v !== 'bigint' || v < -(1n << 63n) || v >= 1n << 63n)) throw invalid();
      info = Buffer.from([0x26, 8]); b = Buffer.alloc(8); if (v !== null) b.writeBigInt64LE(v as bigint);
    } else if (type === 'float') {
      if (v !== null && (typeof v !== 'number' || !Number.isFinite(v))) throw invalid();
      info = Buffer.from([0x6d, 8]); b = Buffer.alloc(8); if (v !== null) b.writeDoubleLE(v as number);
    } else if (type === 'bit') {
      if (v !== null && typeof v !== 'boolean') throw invalid();
      info = Buffer.from([0x68, 1]); b = Buffer.from([v ? 1 : 0]);
    } else if (type === 'datetime2') {
      if (v !== null && (!(v instanceof Date) || !Number.isFinite(v.getTime()) || v.getUTCFullYear() < 1 || v.getUTCFullYear() > 9999)) throw invalid();
      declaration = 'datetime2(7)'; info = Buffer.from([0x2a, 7]); b = Buffer.alloc(8);
      if (v instanceof Date) {
        const days = Math.floor((v.getTime() + 62135596800000) / 86400000);
        const ticks = BigInt(((v.getTime() % 86400000) + 86400000) % 86400000) * 10000n;
        b.writeUIntLE(Number(ticks), 0, 5); b.writeUIntLE(days, 5, 3);
      }
    } else throw invalid();
    data = v === null ? Buffer.from([0]) : Buffer.concat([Buffer.from([b.length]), b]);
  }
  return { bytes: Buffer.concat([Buffer.from([name.length]), Buffer.from(name, 'utf16le'), Buffer.from([0]), info, data]), declaration };
}

export class TdsClient implements SqlDriver {
  readonly dialect = 'sqlserver' as const;
  private transactionOwner?: { active: boolean; failed: boolean };
  private context = new AsyncLocalStorage<{ active: boolean; failed: boolean }>();
  private serial = 0;
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
    if (data.length > RESPONSE_LIMIT) throw new Error('The SQL Server request exceeds the 128 MiB client limit.');
    for (const part of frame(type, data, this.packetSize)) await write(this.stream!, part);
  }
  private available(): void {
    if (!this.ready || this.socket?.destroyed) throw disconnected();
    const owner = this.context.getStore();
    if (owner?.active === false) throw new Error('The SQL Server transaction has ended.');
    if (this.busy || (this.transactionOwner && owner !== this.transactionOwner)) throw new Error('A SQL Server batch is already running on this connection.');
  }
  private headers(): Buffer {
    // ALL_HEADERS: total length, header length, type=2, transaction descriptor,
    // outstanding request count. Shared by SQLBatch and RPCRequest.
    const headers = Buffer.alloc(22);
    headers.writeUInt32LE(22); headers.writeUInt32LE(18, 4); headers.writeUInt16LE(2, 8);
    this.descriptor.copy(headers, 10); headers.writeUInt32LE(1, 18); return headers;
  }
  async batch(sql: string, opts: QueryOptions = {}): Promise<SqlResult[]> {
    this.available();
    if (sql.length > (LIMIT - 22) / 2) throw new Error('The SQL Server batch exceeds the 16 MiB client limit.');
    return await this.request(1, Buffer.concat([this.headers(), Buffer.from(sql, 'utf16le')]), opts);
  }
  async rpc(sql: string, params: SqlValue[], opts: QueryOptions & { parameterTypes?: TdsParameterType[] } = {}): Promise<SqlResult[]> {
    this.available();
    if (params.length > 2098 || (opts.parameterTypes && opts.parameterTypes.length !== params.length)) throw new Error('SQL Server sp_executesql accepts at most 2098 parameters; parameterTypes must match their count.');
    // The fallback collation is a synthetic-peer default (US English),
    // unverified against a real server without ENVCHANGE.
    const collation = this.collation.length ? this.collation : Buffer.from([9, 4, 0, 0, 0]);
    const values: Buffer[] = [], declarations: string[] = []; let size = 0;
    for (let i = 0; i < params.length; i++) {
      const p = parameter(`@p${i + 1}`, params[i], collation, opts.parameterTypes?.[i]);
      size += p.bytes.length; if (size > RESPONSE_LIMIT - LIMIT) throw new Error('The SQL Server parameters exceed the client request limit.');
      values.push(p.bytes); declarations.push(`@p${i + 1} ${p.declaration}`);
    }
    if (sql.length > (LIMIT - 22) / 2) throw new Error('The SQL Server batch exceeds the 16 MiB client limit.');
    const body = Buffer.concat([this.headers(), short(65535), short(10), short(0),
      parameter('', sql, collation).bytes, parameter('', declarations.join(', '), collation).bytes, ...values]);
    return await this.request(3, body, opts);
  }
  private async request(type: number, body: Buffer, opts: QueryOptions): Promise<SqlResult[]> {
    this.available();
    const timeout = opts.timeoutMs ?? this.timeoutMs, maxRows = opts.maxRows ?? ROW_LIMIT;
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 2147483647
      || !Number.isSafeInteger(maxRows) || maxRows < 0 || maxRows > ROW_LIMIT) throw new Error('SQL Server needs a positive timeoutMs and maxRows between 0 and 100000.');
    this.busy = true;
    const state: RequestState = { cancelled: false, acknowledged: false, complete: false, maxRows };
    let sent = false, timer: ReturnType<typeof setTimeout> | undefined, grace: ReturnType<typeof setTimeout> | undefined;
    const timedOut = () => new Error('The SQL database timed out. Check connectivity or increase timeoutMs.');
    try {
      timer = setTimeout(() => {
        state.cancelled = true;
        if (!sent) { void this.close(); return; }
        // No other request may start until DONE_ATTN is consumed, or the
        // five-second recovery window has closed the socket.
        grace = setTimeout(() => { void this.close(); }, 5000);
        void this.send(6, Buffer.alloc(0)).catch(() => { void this.close(); });
      }, timeout);
      await this.send(type, body); sent = true;
      const results = await this.response(false, state);
      if (state.cancelled) throw timedOut();
      return results;
    } catch (error) {
      if (this.transactionOwner) this.transactionOwner.failed = true;
      if (!state.acknowledged && !(state.complete && error instanceof TdsError && error.class < 20)) await this.close();
      throw state.cancelled ? timedOut() : error;
    } finally { clearTimeout(timer); clearTimeout(grace); this.busy = false; }
  }
  async query(sql: string, params: SqlValue[] = [], opts: QueryOptions = {}): Promise<SqlResult> {
    const results = params.length ? await this.rpc(sql, params, opts) : await this.batch(sql, opts);
    return results.find((result) => result.columns.length > 0) ?? results.at(-1) ?? { columns: [], rows: [] };
  }
  quoteName(name: string): string { return `[${name.replaceAll(']', ']]')}]`; }
  placeholder(n: number): string {
    if (!Number.isSafeInteger(n) || n < 1) throw new Error('SQL Server parameter positions start at 1.');
    return `@p${n}`;
  }
  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    this.available();
    const parent = this.transactionOwner, owner = { active: true, failed: false };
    this.transactionOwner = owner;
    return await this.context.run(owner, async () => {
      const savepoint = parent ? this.quoteName(`tabularius_${++this.serial}`) : '';
      let began = false;
      try {
        await this.query(parent ? `SAVE TRANSACTION ${savepoint}` : 'BEGIN TRANSACTION', []); began = true;
        const result = await fn(this);
        if (this.busy || this.transactionOwner !== owner) {
          await this.close(); throw new Error('Await SQL Server operations before completing their transaction.');
        }
        if (!this.ready || this.socket?.destroyed) throw disconnected();
        if (owner.failed) throw new Error('The SQL Server transaction had a failed request and must be rolled back.');
        if (!parent) await this.query('COMMIT TRANSACTION', []);
        return result;
      } catch (error) {
        if (began && this.ready) {
          try { await this.query(parent ? `ROLLBACK TRANSACTION ${savepoint}` : 'ROLLBACK TRANSACTION', []); }
          catch { await this.close(); }
        }
        throw error;
      } finally { owner.active = false; this.transactionOwner = parent; }
    });
  }
  async tables(): Promise<{ schema?: string; name: string }[]> {
    const result = await this.query("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME", []);
    return result.rows.map(([schema, name]) => ({ schema: String(schema), name: String(name) }));
  }
  async columns(table: { schema?: string; name: string }): Promise<SqlColumn[]> {
    const result = await this.query(`SELECT c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE,
      CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON ku.CONSTRAINT_CATALOG = tc.CONSTRAINT_CATALOG
          AND ku.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND ku.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' AND ku.TABLE_CATALOG = c.TABLE_CATALOG
          AND ku.TABLE_SCHEMA = c.TABLE_SCHEMA AND ku.TABLE_NAME = c.TABLE_NAME AND ku.COLUMN_NAME = c.COLUMN_NAME)
        THEN 1 ELSE 0 END AS IS_KEY
      FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA = COALESCE(@p1, SCHEMA_NAME())
        AND c.TABLE_NAME = @p2 ORDER BY c.ORDINAL_POSITION`, [table.schema ?? null, table.name]);
    return result.rows.map(([name, type, nullable, key]) => ({ name: String(name), type: String(type), nullable: nullable === 'YES', key: key === 1 || key === true }));
  }
  // [MS-TDS] ENVCHANGE: string lengths are UTF-16 characters; collation and
  // transaction descriptor lengths are bytes.
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
  private async response(loginPhase: boolean, state?: RequestState): Promise<SqlResult[]> {
    const results: SqlResult[] = [];
    let columns: Column[] | undefined, current: SqlResult | undefined, acknowledged = false;
    let finished = false, attention = false, rowCount = 0, cells = 0, error: TdsError | undefined;
    const c = new PacketCursor(this.input!, () => this.packetSize);
    while (!finished) {
      while (await c.more()) {
        if (finished) throw protocol();
        const tag = await c.u8();
        switch (tag) {
          case 0xad: {
            if (!loginPhase || acknowledged) throw protocol();
            const a = new Cursor(await c.take(await c.u16()));
            if (a.u8() !== 1 || a.take(4).readUInt32BE() !== 0x74000004) throw protocol();
            a.text(a.u8()); a.take(4); a.end(); acknowledged = true; break;
          }
          case 0xe3: case 0xab: case 0xaa: {
            const n = await c.u16(), token = new Cursor(Buffer.concat([short(n), await c.take(n)]));
            if (tag === 0xe3) this.environment(token);
            else {
              const next = serverError(token);
              if (tag === 0xaa) {
                // Query errors drain through DONE before ROLLBACK or reuse.
                if (loginPhase || next.class >= 20) throw next;
                error ??= next;
              }
            }
            break;
          }
          case 0x81: {
            if (loginPhase || current) throw protocol();
            const count = await c.u16();
            if (count === 65535) { columns = undefined; break; }
            if (count > 4096) throw protocol();
            columns = []; for (let i = 0; i < count; i++) columns.push(await column(c));
            current = { columns: columns.map(({ name, type }) => ({ name, type })), rows: [] };
            results.push(current); break;
          }
          case 0xd1: case 0xd2: {
            if (!columns || !current) throw protocol();
            // A result over the caller's limit is refused whole, with the message the bridge turns into the row-limit error. The connection is closed (the rest of the result is unread).
            if (++rowCount > (state?.maxRows ?? ROW_LIMIT)) throw new Error(`SQL row limit of ${state?.maxRows ?? ROW_LIMIT} exceeded`);
            cells += columns.length; if (cells > CELL_LIMIT) throw protocol();
            const bitmap = tag === 0xd2 ? await c.take(Math.ceil(columns.length / 8)) : undefined;
            const row: SqlValue[] = [];
            for (let i = 0; i < columns.length; i++) row.push(bitmap && (bitmap[i >> 3] & (1 << (i & 7))) ? null : await value(c, columns[i]));
            if (!state?.cancelled) current.rows.push(row);
            break;
          }
          case 0xa9: { const length = await c.u16(); if (length % 2) throw protocol(); await c.take(length); break; }
          case 0x79: await c.take(4); break;
          case 0xfd: case 0xfe: case 0xff: {
            const status = await c.u16(); await c.u16(); const affected = (await c.take(8)).readBigUInt64LE();
            if (status & 0x20) {
              if (!state?.cancelled || (status & (1 | 0x100))) throw new Error('The SQL database reported that the batch failed or was cancelled.');
              attention = true; finished = true;
            } else {
              if ((status & (2 | 0x100)) && !error && !state?.cancelled) throw new Error('The SQL database reported that the batch failed or was cancelled.');
              // DONEINPROC terminates a statement, not the RPC.
              finished = !(status & 1) && tag !== 0xff && !state?.cancelled;
            }
            if (status & 0x10) {
              if (affected > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('The SQL database returned a row count larger than this client can represent.');
              if (!current) { current = { columns: [], rows: [] }; results.push(current); }
              current.affected = Number(affected);
            }
            current = undefined; columns = undefined; break;
          }
          default: throw new Error(`SQL Server token 0x${tag.toString(16)} is not decoded yet.`);
        }
        if (results.length > RESULT_LIMIT) throw protocol();
      }
      if (error && !finished && !state?.cancelled) throw error;
      if (!finished) c.nextMessage();
    }
    if (loginPhase && !acknowledged) throw new Error('The SQL database did not acknowledge the login.');
    if (state) { state.complete = true; state.acknowledged = attention; }
    if (error && !state?.cancelled) throw error;
    return results;
  }
  async close(): Promise<void> {
    this.ready = false;
    this.tls?.destroy(); this.socket?.destroy();
  }
}
