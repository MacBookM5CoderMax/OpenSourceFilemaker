/**
 * Oracle Database client for external SQL sources: Oracle Net (TNS) and the
 * two-task common (TTC) protocol, written from scratch on node:net and
 * node:tls. It speaks the 12c and later logon (PBKDF2 verifier) and the
 * wire layouts that Oracle's own thin drivers use; every layout below was
 * run against Oracle Database Free (see test/ess-real-databases.test.ts).
 * Native network encryption (ANO) is not supported: use TCPS.
 */
import { connect as netConnect, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { hostname, userInfo } from 'node:os';
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { hostRefusal, socketLookup } from '../outbound-address.ts';
import { boolean } from '../settings.ts';
import type { SqlColumn, SqlDriver, SqlResult, SqlValue } from './driver.ts';

// Oracle Net packet types and header values.
const TNS = {
  CONNECT: 1, ACCEPT: 2, REFUSE: 4, REDIRECT: 5, DATA: 6, RESEND: 11, MARKER: 12, CONTROL: 14,
  VERSION: 319, MIN_VERSION: 300, LARGE_HEADER_VERSION: 315, SDU: 8192, TDU: 65535,
  DATA_EOF: 0x0040, MARKER_BREAK: 1, MARKER_RESET: 2, MARKER_INTERRUPT: 3,
  ANO_MAGIC: 0xdeadbeef, INLINE_LIMIT: 230,
} as const;
// TTC message types and function codes.
const MSG = {
  PROTOCOL: 1, DATA_TYPES: 2, FUNCTION: 3, ERROR: 4, ROW_HEADER: 6, ROW_DATA: 7, PARAMETER: 8, STATUS: 9,
  IO_VECTOR: 11, LOB_DATA: 14, WARNING: 15, DESCRIBE_INFO: 16, PIGGYBACK: 17, FLUSH_OUT_BINDS: 19,
  BIT_VECTOR: 21, SERVER_SIDE_PIGGYBACK: 23, IMPLICIT_RESULTSET: 27, END_OF_REQUEST: 29,
} as const;
const FN = { AUTH_PHASE_ONE: 118, AUTH_PHASE_TWO: 115, CLOSE_CURSORS: 105, COMMIT: 14, EXECUTE: 94, FETCH: 5, LOGOFF: 9, ROLLBACK: 15 } as const;
const TYPE = {
  VARCHAR: 1, NUMBER: 2, BINARY_INTEGER: 3, LONG: 8, ROWID: 11, DATE: 12, RAW: 23, LONG_RAW: 24, CHAR: 96,
  BINARY_FLOAT: 100, BINARY_DOUBLE: 101, CURSOR: 102, CLOB: 112, BLOB: 113, BFILE: 114, TIMESTAMP: 180, TIMESTAMP_TZ: 181,
  INTERVAL_YM: 182, INTERVAL_DS: 183, UROWID: 208, TIMESTAMP_LTZ: 231, BOOLEAN: 252, JSON: 119, VECTOR: 127,
} as const;
const EXEC = { PARSE: 0x01, BIND: 0x08, EXECUTE: 0x20, FETCH: 0x40, COMMIT: 0x100, NOT_PLSQL: 0x8000, PLSQL_BIND: 0x400 } as const;
const CAP = {
  SQL_VERSION: 0, LOGON_TYPES: 4, CTB_FEATURE_BACKPORT: 5, FIELD_VERSION: 7, SERVER_DEFINE_CONV: 8, TTC1: 15, OCI1: 16,
  TDS_VERSION: 17, RPC_VERSION: 18, RPC_SIG: 19, DBF_VERSION: 21, LOB: 23, TTC2: 26, UB2_DTY: 27, OCI2: 31,
  CLIENT_FN: 34, OCI3: 35, TTC3: 37, SESS_SIGNATURE_VERSION: 39, TTC4: 40, LOB2: 42, TTC5: 44, VECTOR_FEATURES: 52, MAX: 53,
} as const;
/** The newest TTC field version this client speaks; a server that is older lowers it. */
const FIELD_VERSION = 8;
/** Logon with a password: AUTH_MODE_LOGON | AUTH_MODE_WITH_PASSWORD. */
const AUTH_MODE = 0x101;
/** The password verifier this client can answer: the 12c one. */
const VERIFIER_12C = 0x4815;
const CHARSET_UTF8 = 873;
const MAX_LONG = 0x7fffffff;
const CHUNK = 65536;
/** Text and bytes longer than this are sent as LONG / LONG RAW bind values, after the others in the row. */
const LONG_BIND = 4000;
const LIMIT = 64 * 1024 * 1024;
const VALUE_LIMIT = 64 * 1024 * 1024;
const ENCRYPTION_ERROR = 'This Oracle server requires native network encryption, which Tabularius does not support; use TCPS (port 2484 by default)';
const invalid = (detail: string) => new Error(`Invalid Oracle ${detail}`);
const trace = (text: string) => { if (boolean('TABULARIUS_ORACLE_TRACE')) process.stderr.write(`Oracle ${text}\n`); };

/** An Oracle error: sqlCode is the ORA number. The text never carries the password. */
export class OracleError extends Error {
  readonly sqlCode: number;
  constructor(code: number, text: string) {
    super(text); this.name = 'OracleError'; this.sqlCode = code;
  }
}

export interface OracleOptions {
  host: string;
  port?: number;
  serviceName?: string;
  sid?: string;
  user?: string;
  password?: string;
  /** The schema that tables() lists and unqualified names use; the signed-in user by default. */
  schema?: string;
  ssl?: 'verify-full' | 'verify-ca' | 'require' | 'disable';
  ca?: string | Buffer;
  allowInsecure?: boolean;
  allowRedirectHosts?: string[];
  connectTimeoutMs?: number;
}

function safeDescriptor(value: string, field: string): string {
  if (!value || /[()=\x00-\x1f\x7f]/.test(value)) throw new Error(`Invalid Oracle ${field}: descriptor characters are not allowed`);
  return value;
}
function portNumber(port: number): number {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw invalid('port');
  return port;
}
function sizeLimit(n: number): number {
  if (!Number.isSafeInteger(n) || n < 0 || n > LIMIT) throw invalid('declared length over 64 MiB');
  return n;
}

// ---------------------------------------------------------------------------
// TTC primitives. Integers are a length byte followed by that many big-endian bytes.
// ---------------------------------------------------------------------------

/** TTC variable integer codec. UB8 values are bigint to retain all 64 bits. */
export function writeTtcInteger(value: bigint | number, signed = false): Buffer {
  let n = BigInt(value);
  if (!signed && n < 0n) throw invalid('unsigned integer');
  const negative = n < 0n;
  if (negative) n = -n;
  const bytes: number[] = [];
  while (n) { bytes.unshift(Number(n & 255n)); n >>= 8n; }
  if (bytes.length > 8) throw invalid('integer width');
  return Buffer.from([bytes.length | (negative ? 0x80 : 0), ...bytes]);
}
export function readTtcInteger(data: Buffer, offset = 0, signed = false): { value: bigint; offset: number } {
  if (offset >= data.length) throw invalid('integer');
  const prefix = data[offset++], length = prefix & 0x7f;
  if (length > 8 || offset + length > data.length || ((prefix & 0x80) && !signed)) throw invalid('integer');
  let value = 0n;
  for (let i = 0; i < length; i++) value = (value << 8n) | BigInt(data[offset++]);
  return { value: prefix & 0x80 ? -value : value, offset };
}

/** Thrown by the reader when the message is not complete yet; the caller reads more and starts the message again. */
class Underrun extends Error { constructor() { super('Oracle message incomplete'); } }

class Out {
  private parts: Buffer[] = [];
  u8(v: number): this { this.parts.push(Buffer.from([v & 255])); return this; }
  u16be(v: number): this { const b = Buffer.alloc(2); b.writeUInt16BE(v); this.parts.push(b); return this; }
  u16le(v: number): this { const b = Buffer.alloc(2); b.writeUInt16LE(v); this.parts.push(b); return this; }
  ub(v: number | bigint): this { this.parts.push(writeTtcInteger(v)); return this; }
  raw(b: Buffer | Uint8Array): this { this.parts.push(Buffer.from(b)); return this; }
  /** A length byte and the bytes; over 252 bytes the value is sent in 64 KiB chunks after a 0xfe marker. */
  bytes(b: Buffer): this {
    if (b.length <= 252) { this.u8(b.length); if (b.length) this.raw(b); return this; }
    this.u8(0xfe);
    for (let at = 0; at < b.length; at += CHUNK) { const part = b.subarray(at, at + CHUNK); this.ub(part.length).raw(part); }
    return this.ub(0);
  }
  keyValue(key: string, value: string, flags = 0): this {
    const k = Buffer.from(key), v = Buffer.from(value);
    this.ub(k.length).bytes(k).ub(v.length);
    if (v.length) this.bytes(v);
    return this.ub(flags);
  }
  build(): Buffer { return Buffer.concat(this.parts); }
}

class In {
  buf: Buffer;
  pos = 0;
  constructor(buf: Buffer = Buffer.alloc(0)) { this.buf = buf; }
  append(more: Buffer): void { this.buf = Buffer.concat([this.buf.subarray(this.pos), more]); this.pos = 0; }
  private need(n: number): void { if (this.pos + n > this.buf.length) throw new Underrun(); }
  u8(): number { this.need(1); return this.buf[this.pos++]; }
  i8(): number { this.need(1); return this.buf.readInt8(this.pos++); }
  u16be(): number { this.need(2); const v = this.buf.readUInt16BE(this.pos); this.pos += 2; return v; }
  u16le(): number { this.need(2); const v = this.buf.readUInt16LE(this.pos); this.pos += 2; return v; }
  take(n: number): Buffer { sizeLimit(n); this.need(n); const b = this.buf.subarray(this.pos, this.pos + n); this.pos += n; return b; }
  skip(n: number): void { this.take(n); }
  /** A variable-length integer of at most `max` bytes. */
  ub(max = 4, signed = false): number {
    const first = this.u8();
    if (first === 0) return 0;
    const negative = (first & 0x80) !== 0, size = first & 0x7f;
    if ((negative && !signed) || size > max) throw invalid('integer');
    const b = this.take(size);
    let v = 0;
    for (const x of b) v = v * 256 + x;
    if (!Number.isSafeInteger(v)) throw invalid('integer');
    return negative ? -v : v;
  }
  sb2(): number { return this.ub(2, true); }
  sb4(): number { return this.ub(4, true); }
  /** Bytes after a length byte; null for a zero or null length. */
  withLength(): Buffer | null {
    const n = this.u8();
    if (n === 0 || n === 0xff) return null;
    if (n !== 0xfe) return this.take(n);
    const chunks: Buffer[] = []; let total = 0;
    for (;;) {
      const size = this.ub();
      if (!size) break;
      total += sizeLimit(size);
      if (total > VALUE_LIMIT) throw invalid('value over 64 MiB');
      chunks.push(this.take(size));
    }
    return Buffer.concat(chunks, total);
  }
  skipChunked(): void {
    const n = this.u8();
    if (n === 0 || n === 0xff) return;
    if (n !== 0xfe) { this.skip(n); return; }
    for (;;) { const size = this.ub(); if (!size) break; this.skip(size); }
  }
  str(): string | null { return this.withLength()?.toString('utf8') ?? null; }
  /** UTF-16 big-endian text, used for NCHAR columns. */
  nstr(): string | null { const b = this.withLength(); return b ? Buffer.from(b).swap16().toString('utf16le') : null; }
  cstr(max: number): string {
    const start = this.pos;
    for (let i = 0; i < max; i++) {
      this.need(1);
      if (this.buf[this.pos++] === 0) return this.buf.subarray(start, this.pos - 1).toString('latin1');
    }
    throw invalid('string');
  }
}

// ---------------------------------------------------------------------------
// Oracle value codecs.
// ---------------------------------------------------------------------------

/** Oracle NUMBER (base 100, excess-193 exponent) to a plain decimal string. */
export function decodeOracleNumber(b: Uint8Array): string {
  if (!b.length) throw invalid('NUMBER');
  const positive = (b[0] & 0x80) !== 0;
  if (b.length === 1) return positive ? '0' : '-1e126';
  const exponent = (positive ? b[0] : b[0] ^ 0xff) - 193;
  let end = b.length;
  if (!positive && b[end - 1] === 102) end--;
  let digits = '';
  for (let i = 1; i < end; i++) digits += String(positive ? b[i] - 1 : 101 - b[i]).padStart(2, '0');
  let point = (exponent + 1) * 2;
  while (digits.startsWith('0')) { digits = digits.slice(1); point--; }
  digits = digits.replace(/0+$/, '');
  if (!digits) return '0';
  const text = point <= 0 ? `0.${'0'.repeat(-point)}${digits}` : point >= digits.length ? digits + '0'.repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return positive ? text : `-${text}`;
}
/** A decimal string to the Oracle NUMBER bytes (without the length byte). */
export function encodeOracleNumber(text: string): Buffer {
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text.trim());
  if (!m || (!m[2] && !m[3])) throw new Error('Oracle cannot take that number');
  const negative = m[1] === '-';
  let digits = m[2] + (m[3] ?? ''), scale = Number(m[4] ?? 0) - (m[3]?.length ?? 0);
  digits = digits.replace(/^0+/, '');
  const trimmed = digits.replace(/0+$/, '');
  scale += digits.length - trimmed.length; digits = trimmed;
  if (!digits) return Buffer.from([0x80]);
  if (scale % 2) { digits += '0'; scale -= 1; }
  if (digits.length % 2) digits = `0${digits}`;
  const exponent = (scale + digits.length) / 2 - 1;
  if (digits.length > 40 || exponent > 62 || exponent < -65) throw new Error('Oracle cannot take that number');
  const pairs: number[] = [];
  for (let i = 0; i < digits.length; i += 2) pairs.push(Number(digits.slice(i, i + 2)));
  const head = 193 + exponent;
  if (!negative) return Buffer.from([head, ...pairs.map((p) => p + 1)]);
  return Buffer.from([head ^ 0xff, ...pairs.map((p) => 101 - p), ...(pairs.length < 20 ? [102] : [])]);
}

function numberValue(b: Buffer): SqlValue {
  const s = decodeOracleNumber(b);
  if (/^-?\d+$/.test(s)) {
    if (s.length <= 15) return Number(s);
    const n = BigInt(s);
    return n >= -9007199254740991n && n <= 9007199254740991n ? Number(n) : n;
  }
  const n = Number(s);
  return Number.isFinite(n) && String(n) === s ? n : s;
}
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
function dateValue(b: Buffer, zone: boolean): string {
  if (b.length < 7) throw invalid('DATE');
  const year = (b[0] - 100) * 100 + (b[1] - 100);
  let text = `${pad(year, 4)}-${pad(b[2])}-${pad(b[3])}T${pad(b[4] - 1)}:${pad(b[5] - 1)}:${pad(b[6] - 1)}`;
  if (b.length >= 11) {
    const nanos = b.readUInt32BE(7);
    if (nanos) text += `.${pad(nanos, 9).replace(/0+$/, '')}`;
  }
  if (zone && b.length >= 13) {
    // The time is stored in UTC with the zone offset beside it; a set high bit on the hour byte means a named region, whose offset is not sent.
    const hours = b[11] - 20, minutes = b[12] - 60;
    if (!(b[11] & 0x80)) {
      const sign = hours < 0 || minutes < 0 ? '-' : '+';
      const utc = Date.parse(`${text.slice(0, 19)}Z`);
      const local = new Date(utc + (hours * 60 + minutes) * 60000).toISOString().slice(0, 19);
      return `${local}${text.slice(19)}${sign}${pad(Math.abs(hours))}:${pad(Math.abs(minutes))}`;
    }
    return `${text}Z`;
  }
  return text;
}
function intervalDs(b: Buffer): string {
  const days = b.readUInt32BE(0) - 0x80000000, hours = b[4] - 60, minutes = b[5] - 60, seconds = b[6] - 60, nanos = b.readUInt32BE(7) - 0x80000000;
  const negative = days < 0 || hours < 0 || minutes < 0 || seconds < 0 || nanos < 0;
  return `${negative ? '-' : ''}${Math.abs(days)} ${pad(Math.abs(hours))}:${pad(Math.abs(minutes))}:${pad(Math.abs(seconds))}${nanos ? `.${pad(Math.abs(nanos), 9)}` : ''}`;
}
function intervalYm(b: Buffer): string {
  const years = b.readUInt32BE(0) - 0x80000000, months = b[4] - 60;
  return `${years < 0 || months < 0 ? '-' : ''}${Math.abs(years)}-${pad(Math.abs(months))}`;
}
function binaryNumber(b: Buffer, wide: boolean): number {
  const copy = Buffer.from(b);
  if (copy[0] & 0x80) copy[0] &= 0x7f; else for (let i = 0; i < copy.length; i++) copy[i] ^= 0xff;
  return wide ? copy.readDoubleBE() : copy.readFloatBE();
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64Digits(n: number, width: number): string {
  let out = '';
  for (let i = 0; i < width; i++) { out = B64[n % 64] + out; n = Math.floor(n / 64); }
  return out;
}

// ---------------------------------------------------------------------------
// Capabilities negotiated at startup.
// ---------------------------------------------------------------------------

function compileCaps(): Buffer {
  const c = Buffer.alloc(CAP.MAX);
  c[CAP.SQL_VERSION] = 6;
  c[CAP.LOGON_TYPES] = 8 | 2 | 32 | 64 | 128;
  c[CAP.FIELD_VERSION] = FIELD_VERSION;
  c[CAP.SERVER_DEFINE_CONV] = 1;
  c[CAP.TTC1] = 32 | 1 | 8;
  c[CAP.OCI1] = 16 | 128;
  c[CAP.TDS_VERSION] = 3;
  c[CAP.RPC_VERSION] = 7;
  c[CAP.RPC_SIG] = 3;
  c[CAP.DBF_VERSION] = 1;
  c[CAP.LOB] = 1 | 2 | 64 | 8 | 128 | 4;
  c[CAP.UB2_DTY] = 1;
  c[CAP.LOB2] = 1 | 4;
  c[CAP.TTC3] = 16 | 32 | 128 | 8;
  c[CAP.OCI3] = 32;
  c[CAP.TTC2] = 4;
  c[CAP.OCI2] = 16;
  c[CAP.CLIENT_FN] = 12;
  c[CAP.SESS_SIGNATURE_VERSION] = 8;
  c[CAP.TTC4] = 4;
  c[CAP.CTB_FEATURE_BACKPORT] = 8;
  return c;
}
function runtimeCaps(): Buffer {
  const c = Buffer.alloc(7);
  c[0] = 2; // compatibility level: 8.1
  c[6] = 1 | 4; // zero-copy, and strings up to 32 KiB
  return c;
}
// The numbers each data type is sent as: [type, converted type, representation]. The server needs the table to agree on the
// wire form of every type it may send back.
const DATA_TYPES = '1,1,1;2,2,10;8,8,1;12,12,10;23,23,1;24,24,1;25,25,1;26,26,1;27,27,10;28,28,1;29,29,1;30,30,1;31,31,1;32,32,1;33,33,1;10,10,1;11,11,1;40,40,1;41,41,1;117,117,1;120,120,1;290,290,1;291,291,1;292,292,1;293,293,1;294,294,1;298,298,1;299,299,1;300,300,1;301,301,1;302,302,1;303,303,1;304,304,1;305,305,1;306,306,1;307,307,1;308,308,1;309,309,1;310,310,1;311,311,1;312,312,1;313,313,1;315,315,1;316,316,1;317,317,1;318,318,1;319,319,1;320,320,1;321,321,1;322,322,1;323,323,1;327,327,1;328,328,1;329,329,1;331,331,1;333,333,1;334,334,1;335,335,1;336,336,1;337,337,1;338,338,1;339,339,1;340,340,1;341,341,1;342,342,1;343,343,1;344,344,1;345,345,1;346,346,1;348,348,1;349,349,1;354,354,1;355,355,1;359,359,1;363,363,1;380,380,1;381,381,1;382,382,1;383,383,1;384,384,1;385,385,1;386,386,1;387,387,1;388,388,1;389,389,1;390,390,1;391,391,1;393,393,1;394,394,1;395,395,1;396,396,1;397,397,1;398,398,1;399,399,1;400,400,1;401,401,1;404,404,1;405,405,1;406,406,1;407,407,1;413,413,1;414,414,1;415,415,1;416,416,1;417,417,1;418,418,1;419,419,1;420,420,1;421,421,1;422,422,1;423,423,1;424,424,1;425,425,1;426,426,1;427,427,1;429,429,1;430,430,1;431,431,1;432,432,1;433,433,1;449,449,1;450,450,1;454,454,1;455,455,1;456,456,1;457,457,1;458,458,1;459,459,1;460,460,1;461,461,1;462,462,1;463,463,1;466,466,1;467,467,1;468,468,1;469,469,1;470,470,1;471,471,1;472,472,1;473,473,1;474,474,1;475,475,1;476,476,1;477,477,1;478,478,1;479,479,1;480,480,1;481,481,1;482,482,1;483,483,1;484,484,1;485,485,1;486,486,1;490,490,1;491,491,1;492,492,1;493,493,1;494,494,1;495,495,1;496,496,1;498,498,1;499,499,1;500,500,1;501,501,1;502,502,1;509,509,1;510,510,1;513,513,1;514,514,1;516,516,1;517,517,1;518,518,1;519,519,1;520,520,1;521,521,1;522,522,1;523,523,1;524,524,1;525,525,1;526,526,1;527,527,1;528,528,1;529,529,1;530,530,1;531,531,1;532,532,1;533,533,1;534,534,1;535,535,1;536,536,1;537,537,1;538,538,1;539,539,1;540,540,1;541,541,1;542,542,1;543,543,1;560,560,1;565,565,1;572,572,1;573,573,1;574,574,1;575,575,1;576,576,1;578,578,1;563,563,1;564,564,1;579,579,1;580,580,1;581,581,1;582,582,1;583,583,1;584,584,1;585,585,1;3,2,10;4,2,10;5,1,1;6,2,10;7,2,10;9,1,1;15,1,1;39,39,1;68,2,10;91,2,10;94,1,1;95,23,1;96,96,1;97,96,1;100,100,1;101,101,1;102,102,1;104,11,1;106,106,1;108,109,1;109,109,1;110,111,1;111,111,1;112,112,1;113,113,1;114,114,1;115,115,1;116,102,1;119,119,1;198,198,1;146,146,1;152,2,10;153,2,10;154,2,10;155,1,1;156,12,10;172,2,10;178,178,1;179,179,1;180,180,1;181,181,1;182,182,1;183,183,1;184,12,10;185,185,1;186,186,1;187,187,1;188,188,1;189,189,1;190,190,1;195,112,1;196,113,1;197,114,1;208,208,1;231,231,1;232,231,1;233,233,1;241,109,1;252,252,1;590,590,1;591,591,1;592,592,1;613,613,1;614,614,1;615,615,1;616,616,1;611,611,1;612,612,1;593,593,1;594,594,1;595,595,1;596,596,1;597,597,1;598,598,1;599,599,1;600,600,1;601,601,1;602,602,1;603,603,1;604,604,1;605,605,1;622,622,1;623,623,1;624,624,1;625,625,1;626,626,1;627,627,1;628,628,1;629,629,1;630,630,1;631,631,1;632,632,1;637,637,1;638,638,1;636,636,1;639,639,1;663,663,1;640,640,1;652,652,1;646,646,1;647,647,1;127,127,1';

// ---------------------------------------------------------------------------
// Logon crypto: the 12c verifier (PBKDF2-SHA512) and its AES-256-CBC key exchange.
// ---------------------------------------------------------------------------

function aesDecrypt(key: Buffer, data: Buffer): Buffer {
  const d = createDecipheriv('aes-256-cbc', key, Buffer.alloc(16)); d.setAutoPadding(false);
  return Buffer.concat([d.update(data), d.final()]);
}
/** AES-256-CBC with PKCS#7 padding and a zero IV, as the logon exchange does. */
function aesEncrypt(key: Buffer, data: Buffer): Buffer {
  const n = 16 - (data.length % 16);
  const c = createCipheriv('aes-256-cbc', key, Buffer.alloc(16)); c.setAutoPadding(false);
  return Buffer.concat([c.update(Buffer.concat([data, Buffer.alloc(n, n)])), c.final()]);
}
const upperHex = (b: Buffer) => b.toString('hex').toUpperCase();

interface LogonKeys { sessionKey: string; speedyKey: string; password: string }
function logonKeys(session: Map<string, string>, password: string): LogonKeys {
  const need = (name: string) => {
    const v = session.get(name);
    if (!v) throw new Error('Oracle server sent an incomplete logon challenge');
    return v;
  };
  const verifierData = Buffer.from(need('AUTH_VFR_DATA'), 'hex'), encodedServerKey = Buffer.from(need('AUTH_SESSKEY'), 'hex');
  const iterations = Number(need('AUTH_PBKDF2_VGEN_COUNT')), passwordBytes = Buffer.from(password, 'utf8');
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10_000_000) throw invalid('logon iteration count');
  const passwordKey = pbkdf2Sync(passwordBytes, Buffer.concat([verifierData, Buffer.from('AUTH_PBKDF2_SPEEDY_KEY')]), iterations, 64, 'sha512');
  const passwordHash = createHash('sha512').update(passwordKey).update(verifierData).digest().subarray(0, 32);
  const partA = aesDecrypt(passwordHash, encodedServerKey);
  const partB = randomBytes(partA.length);
  const clientKey = aesEncrypt(passwordHash, partB);
  const sessionKey = upperHex(clientKey).slice(0, 64);
  const mixingSalt = Buffer.from(need('AUTH_PBKDF2_CSK_SALT'), 'hex'), mixingCount = Number(need('AUTH_PBKDF2_SDER_COUNT'));
  if (!Number.isInteger(mixingCount) || mixingCount < 1 || mixingCount > 10_000_000) throw invalid('logon iteration count');
  const combined = Buffer.from(upperHex(Buffer.concat([partB.subarray(0, 32), partA.subarray(0, 32)])), 'utf8');
  const comboKey = pbkdf2Sync(combined, mixingSalt, mixingCount, 32, 'sha512');
  const speedyKey = upperHex(aesEncrypt(comboKey, Buffer.concat([randomBytes(16), passwordKey])).subarray(0, 80));
  return { sessionKey, speedyKey, password: upperHex(aesEncrypt(comboKey, Buffer.concat([randomBytes(16), passwordBytes]))) };
}

// ---------------------------------------------------------------------------
// Statements.
// ---------------------------------------------------------------------------

/** One value sent for a bind variable: the Oracle type, the encoded bytes (null for SQL NULL) and the buffer size. */
interface Bind { type: number; csfrm: number; size: number; data: Buffer | null; out?: boolean }
interface Column { name: string; type: number; csfrm: number; maxSize: number; precision: number; scale: number; nullable: boolean }
interface Outcome { columns: Column[]; rows: SqlValue[][]; affected: number; returned: SqlValue[][] }

/** An ISO date or time text as the bytes of an Oracle DATE, TIMESTAMP or TIMESTAMP WITH TIME ZONE. */
function isoBind(text: string, hint: string): Bind | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(text.trim());
  if (!m) return undefined;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])], hour = Number(m[4] ?? 0), minute = Number(m[5] ?? 0), second = Number(m[6] ?? 0);
  const nanos = Number((m[7] ?? '').padEnd(9, '0'));
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return undefined;
  const type = /^DATE$/i.test(hint) ? TYPE.DATE : /WITH TIME ZONE/i.test(hint) ? TYPE.TIMESTAMP_TZ : TYPE.TIMESTAMP;
  const wall = [Math.floor(year / 100) + 100, (year % 100) + 100, month, day, hour + 1, minute + 1, second + 1];
  if (type === TYPE.DATE) return { type, csfrm: 0, size: 7, data: Buffer.from(wall) };
  const b = Buffer.alloc(type === TYPE.TIMESTAMP_TZ ? 13 : 11);
  Buffer.from(wall).copy(b); b.writeUInt32BE(nanos, 7);
  if (type === TYPE.TIMESTAMP_TZ) {
    // The stored time is UTC; the offset travels beside it (hour + 20, minute + 60).
    const zone = m[8] === undefined || m[8] === 'Z' ? 0 : (m[8][0] === '-' ? -1 : 1) * (Number(m[8].slice(1, 3)) * 60 + Number(m[8].slice(-2)));
    const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - zone * 60000);
    const y = utc.getUTCFullYear();
    b[0] = Math.floor(y / 100) + 100; b[1] = (y % 100) + 100; b[2] = utc.getUTCMonth() + 1; b[3] = utc.getUTCDate();
    b[4] = utc.getUTCHours() + 1; b[5] = utc.getUTCMinutes() + 1; b[6] = utc.getUTCSeconds() + 1;
    b[11] = Math.trunc(zone / 60) + 20; b[12] = (zone % 60) + 60;
  }
  return { type, csfrm: 0, size: b.length, data: b };
}
/** `hint` is the column type the value is going into, when known: it decides how text that is really a date is sent. */
function bindOf(value: SqlValue, hint?: string): Bind {
  if (typeof value === 'string' && hint && /^(DATE|TIMESTAMP)/i.test(hint)) return isoBind(value, hint) ?? bindOf(value);
  if (value === null || value === undefined) return { type: TYPE.VARCHAR, csfrm: 1, size: 1, data: null };
  if (typeof value === 'number' || typeof value === 'bigint') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Oracle cannot take that number');
    return { type: TYPE.NUMBER, csfrm: 0, size: 22, data: encodeOracleNumber(String(value)) };
  }
  if (typeof value === 'boolean') return { type: TYPE.NUMBER, csfrm: 0, size: 22, data: encodeOracleNumber(value ? '1' : '0') };
  if (typeof value === 'string') {
    const data = Buffer.from(value, 'utf8');
    if (data.length > MAX_LONG) throw new Error('Oracle text values over 2 GiB cannot be sent');
    return { type: data.length > LONG_BIND ? TYPE.LONG : TYPE.VARCHAR, csfrm: 1, size: Math.max(1, data.length), data: data.length ? data : null };
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Oracle cannot take that date');
    const y = value.getUTCFullYear(), b = Buffer.alloc(11);
    b[0] = Math.floor(y / 100) + 100; b[1] = (y % 100) + 100; b[2] = value.getUTCMonth() + 1; b[3] = value.getUTCDate();
    b[4] = value.getUTCHours() + 1; b[5] = value.getUTCMinutes() + 1; b[6] = value.getUTCSeconds() + 1; b.writeUInt32BE(value.getUTCMilliseconds() * 1_000_000, 7);
    return { type: TYPE.TIMESTAMP, csfrm: 0, size: 11, data: b };
  }
  const data = Buffer.from(value);
  if (data.length > MAX_LONG) throw new Error('Oracle binary values over 2 GiB cannot be sent');
  return { type: data.length > LONG_BIND ? TYPE.LONG_RAW : TYPE.RAW, csfrm: 0, size: Math.max(1, data.length), data: data.length ? data : null };
}

type Kind = 'query' | 'dml' | 'plsql' | 'ddl' | 'other';
function kindOf(sql: string): Kind {
  const m = /^(?:\s|\(|--[^\n]*\n|\/\*[\s\S]*?\*\/)*([A-Za-z]+)/.exec(sql);
  switch (m?.[1].toUpperCase()) {
    case 'SELECT': case 'WITH': return 'query';
    case 'INSERT': case 'UPDATE': case 'DELETE': case 'MERGE': return 'dml';
    case 'BEGIN': case 'DECLARE': case 'CALL': return 'plsql';
    case 'CREATE': case 'ALTER': case 'DROP': case 'GRANT': case 'REVOKE': case 'TRUNCATE': case 'COMMENT': case 'ANALYZE': case 'AUDIT': return 'ddl';
    default: return 'other';
  }
}
/** The statement's kind, and the bind-variable names in the order they appear; quoted text and comments are skipped. */
export function scanSql(sql: string): { kind: Kind; binds: string[] } {
  const binds: string[] = [];
  const n = sql.length;
  let i = 0, lastString = false;
  while (i < n) {
    const ch = sql[i];
    if (ch === "'") {
      if (i > 0 && /[qQ]/.test(sql[i - 1]) && i + 2 < n) {
        const open = sql[i + 1], close = ({ '(': ')', '[': ']', '{': '}', '<': '>' } as Record<string, string>)[open] ?? open;
        const end = sql.indexOf(`${close}'`, i + 2);
        i = end < 0 ? n : end + 2;
      } else { i++; while (i < n && !(sql[i] === "'" && sql[i + 1] !== "'")) i += sql[i] === "'" ? 2 : 1; i++; }
      lastString = true; continue;
    }
    if (ch === '"') { i++; while (i < n && sql[i] !== '"') i++; i++; lastString = false; continue; }
    if (ch === '-' && sql[i + 1] === '-') { while (i < n && sql[i] !== '\n') i++; continue; }
    if (ch === '/' && sql[i + 1] === '*') { const end = sql.indexOf('*/', i + 2); i = end < 0 ? n : end + 2; continue; }
    if (ch === ':' && !lastString) {
      if (sql[i + 1] === '=') { i += 2; continue; }
      let j = i + 1;
      if (sql[j] === '"') { j++; while (j < n && sql[j] !== '"') j++; binds.push(sql.slice(i + 1, j + 1)); i = j + 1; continue; }
      while (j < n && /[\p{L}\p{N}_$#]/u.test(sql[j])) j++;
      if (j > i + 1) binds.push(sql.slice(i + 1, j));
      i = j; continue;
    }
    if (!/\s/.test(ch)) lastString = false;
    i++;
  }
  return { kind: kindOf(sql), binds };
}

// ---------------------------------------------------------------------------
// The client.
// ---------------------------------------------------------------------------

class Input {
  private wake?: () => void;
  private error?: Error;
  readonly socket: Socket | TLSSocket;
  constructor(socket: Socket | TLSSocket) {
    this.socket = socket;
    socket.on('readable', this.ready);
    socket.on('error', this.failed);
    socket.on('end', this.closed);
    socket.on('close', this.closed);
  }
  private ready = () => this.wake?.();
  private failed = (error: Error) => { this.error ??= /Oracle connect timeout/.test(error.message) ? error : new Error('Oracle connection failed; check the host, port and TLS configuration'); this.wake?.(); };
  private closed = () => { this.error ??= new Error('Oracle connection closed'); this.wake?.(); };
  async bytes(n: number): Promise<Buffer> {
    sizeLimit(n);
    if (!n) return Buffer.alloc(0);
    for (;;) {
      const b = this.socket.read(n) as Buffer | null;
      if (b) return b;
      // Bytes that arrived before the failure are still the answer, so the failure is raised only when nothing is left to give.
      if (this.error) throw this.error;
      await new Promise<void>((resolve) => { this.wake = resolve; });
      this.wake = undefined;
    }
  }
  detach(): void {
    this.socket.off('readable', this.ready).off('error', this.failed).off('end', this.closed).off('close', this.closed);
  }
}

interface TnsPacket { type: number; flags: number; body: Buffer }
interface Described { cursor: number; columns: Column[] }

export class OracleClient {
  private socket?: Socket | TLSSocket;
  private input?: Input;
  private large = false;
  private sdu: number = TNS.SDU;
  private rx = new In();
  private closed = false;
  private sequence = 1;
  private cursorsToClose: number[] = [];
  private loggedOn = false;
  private fieldVersion = FIELD_VERSION;
  /** The field version the server itself reports: it sends the newer parts of an error message by its own version, not by ours. */
  private serverFieldVersion = 0;
  private maxString = 4000;
  private secrets: string[] = [];
  serverVersion = 0;
  serverBanner = '';
  serverCharset = 0;
  databaseVersion = '';
  private constructor() {}

  // -- transport ----------------------------------------------------------
  private async write(type: number, body: Buffer, flags = 0): Promise<void> {
    if (!this.socket || this.socket.destroyed || this.closed) throw new Error('Oracle connection is closed');
    const size = body.length + 8;
    if (size > (this.large ? 0xffffffff : 65535)) throw invalid('packet length');
    const head = Buffer.alloc(8);
    if (this.large) head.writeUInt32BE(size); else head.writeUInt16BE(size);
    head[4] = type; head[5] = flags;
    trace(`send type=${type} length=${size}`);
    await new Promise<void>((resolve, reject) => this.socket!.write(Buffer.concat([head, body]), (error?: Error | null) => error ? reject(error) : resolve()));
  }
  private async readPacket(): Promise<TnsPacket> {
    if (!this.input) throw new Error('Oracle connection is closed');
    const h = await this.input.bytes(8);
    const length = this.large ? h.readUInt32BE() : h.readUInt16BE();
    if (length < 8 || length > LIMIT || (!this.large && (h[2] || h[3]))) throw invalid('TNS packet header or length');
    trace(`recv type=${h[4]} length=${length}`);
    return { type: h[4], flags: h[5], body: await this.input.bytes(length - 8) };
  }
  private async sendData(data: Buffer, flags = 0): Promise<void> {
    sizeLimit(data.length);
    const max = Math.min(this.sdu - 10, this.large ? LIMIT - 10 : 65525);
    if (max < 1) throw invalid('negotiated SDU');
    for (let at = 0; ; at += max) {
      const part = data.subarray(at, at + max), last = at + max >= data.length;
      const body = Buffer.alloc(part.length + 2);
      body.writeUInt16BE(last ? flags : 0);
      part.copy(body, 2);
      await this.write(TNS.DATA, body);
      if (last) break;
    }
  }
  /** Interrupt the call that is running; the server answers with an ORA-01013 error. */
  interrupt(): void {
    if (this.closed || !this.socket || this.socket.destroyed) return;
    this.write(TNS.MARKER, Buffer.from([1, 0, TNS.MARKER_INTERRUPT])).catch(() => undefined);
  }
  private async nextData(): Promise<Buffer> {
    for (;;) {
      const p = await this.readPacket();
      if (p.type === TNS.MARKER) {
        // The server broke the call. Answer with a reset, wait for the server's reset, and drop what was half read.
        let reset = p.body.length >= 3 && p.body[2] === TNS.MARKER_RESET;
        await this.write(TNS.MARKER, Buffer.from([1, 0, TNS.MARKER_RESET]));
        while (!reset) {
          const q = await this.readPacket();
          if (q.type === TNS.MARKER) reset = q.body.length >= 3 && q.body[2] === TNS.MARKER_RESET;
        }
        this.rx = new In();
        continue;
      }
      if (p.type === TNS.CONTROL) continue;
      if (p.type !== TNS.DATA) throw new Error(`Unknown Oracle TNS packet type ${p.type}`);
      if (p.body.length < 2) throw invalid('DATA packet');
      if (p.body.readUInt16BE() & TNS.DATA_EOF) throw new Error('Oracle server closed the session');
      const data = p.body.subarray(2);
      if (data.length >= 4 && data.readUInt32BE() === TNS.ANO_MAGIC) throw new Error(ENCRYPTION_ERROR);
      if (data.length) return data;
    }
  }

  // -- one request and its response ----------------------------------------
  /** Send one TTC request, then read response messages until `handle` says the response is complete. */
  private async call(build: (w: Out) => void, handle: (r: In, type: number) => boolean | void): Promise<void> {
    const w = new Out();
    if (this.loggedOn && this.cursorsToClose.length) {
      const closing = this.cursorsToClose.splice(0, this.cursorsToClose.length);
      w.u8(MSG.PIGGYBACK).u8(FN.CLOSE_CURSORS).u8(this.sequence++ & 255).u8(1).ub(closing.length);
      for (const id of closing) w.ub(id);
    }
    build(w);
    this.rx = new In();
    await this.sendData(w.build());
    for (;;) {
      const mark = this.rx.pos;
      try {
        const type = this.rx.u8();
        if (handle(this.rx, type)) { this.rx = new In(); return; }
      } catch (error) {
        if (!(error instanceof Underrun)) throw error;
        this.rx.pos = mark;
        // nextData may start a fresh buffer (after a break), so the buffer is looked up again after the wait.
        const more = await this.nextData();
        this.rx.append(more);
      }
    }
  }
  private seq(): number { const s = this.sequence; this.sequence = (this.sequence + 1) & 255; return s; }
  private header(w: Out, fn: number): void { w.u8(MSG.FUNCTION).u8(fn).u8(this.seq()); }

  // -- messages shared by every response -----------------------------------
  private serverPiggyback(r: In): void {
    const op = r.u8();
    switch (op) {
      case 1: case 3: return;
      case 2: { const n = r.ub(2); r.u8(); r.skip(n); return; }
      case 4: {
        r.ub(2); r.u8();
        const count = r.ub(2);
        if (count > 0) {
          r.u8();
          for (let i = 0; i < count; i++) { if (r.ub(2) > 0) r.skipChunked(); if (r.ub(2) > 0) r.skipChunked(); r.ub(2); }
        }
        r.ub(4); r.ub(4); r.ub(2); return;
      }
      case 5: {
        r.ub(2); r.u8();
        const count = r.ub(4);
        r.skip(1);
        for (let i = 0; i < count; i++) {
          if (r.ub(2) > 0) r.str();
          if (r.ub(2) > 0) r.withLength();
          r.ub(2);
        }
        r.ub(4); return;
      }
      case 7: { if (r.ub(4) > 0) r.withLength(); return; }
      case 8: { r.ub(2); r.u8(); r.ub(4); r.ub(4); r.u8(); if (r.ub(4) > 0) r.skipChunked(); return; }
      case 9: { r.ub(2); r.u8(); return; }
      case 10: { r.ub(2); r.u8(); r.ub(8); r.ub(8); r.ub(8); return; }
      default: throw new Error(`Unknown Oracle piggyback message ${op}`);
    }
  }
  /** The ERROR message ends a response; it carries the cursor, the row count and any ORA error. */
  private errorInfo(r: In): { cursor: number; rowCount: number; code: number; message: string } {
    r.ub(4); r.ub(2); r.ub(4); r.ub(2); r.ub(2); r.ub(2);
    const cursor = r.ub(2);
    r.sb2();
    for (let i = 0; i < 6; i++) r.u8();
    // The rowid of the last row touched: rba, partition, a spare byte, block, slot.
    r.ub(4); r.ub(2); r.u8(); r.ub(4); r.ub(2);
    r.ub(4); r.u8(); r.u8(); r.ub(2); r.ub(4);
    if (r.ub(4) > 0) r.skipChunked();
    const batchCodes = r.ub(2);
    if (batchCodes > 0) {
      const lead = r.u8();
      for (let i = 0; i < batchCodes; i++) { if (lead === 0xfe) r.ub(4); r.ub(2); }
      if (lead === 0xfe) r.skip(1);
    }
    const offsets = r.ub(4);
    if (offsets > 0) {
      const lead = r.u8();
      for (let i = 0; i < offsets; i++) { if (lead === 0xfe) r.ub(4); r.ub(4); }
      if (lead === 0xfe) r.skip(1);
    }
    const messages = r.ub(2);
    if (messages > 0) { r.skip(1); for (let i = 0; i < messages; i++) { r.ub(2); r.str(); r.skip(2); } }
    const code = r.ub(4), rowCount = r.ub(8);
    // Servers from 20c add the statement type and a checksum here.
    if (this.serverFieldVersion >= 14) { r.ub(4); r.ub(4); }
    const message = code ? (r.str() ?? '').trim() : '';
    return { cursor, rowCount, code, message };
  }
  private fail(code: number, message: string): never {
    let text = message.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ' ');
    for (const s of this.secrets) if (s) text = text.split(s).join('***');
    throw new OracleError(code, text || `ORA-${pad(code, 5)}`);
  }
  private warning(r: In): void {
    const number = r.ub(2), length = r.ub(2);
    r.ub(2);
    if (number && length) r.str();
  }

  // -- startup ------------------------------------------------------------
  private async negotiate(): Promise<void> {
    const caps = compileCaps();
    let serverCaps: Buffer | null = null, serverRuntime: Buffer | null = null;
    await this.call((w) => w.u8(MSG.PROTOCOL).u8(6).u8(0).raw(Buffer.from('tabularius')).u8(0), (r, type) => {
      if (type !== MSG.PROTOCOL) throw new Error(`Unexpected Oracle message ${type} during startup`);
      r.u8(); r.u8();
      const banner = r.cstr(256);
      const charset = r.u16le();
      r.u8();
      const elements = r.u16le();
      r.skip(elements * 5);
      const fdoLength = r.u16be();
      r.skip(fdoLength);
      const compile = r.withLength(), runtime = r.withLength();
      this.serverBanner = banner; this.serverCharset = charset;
      serverCaps = compile ? Buffer.from(compile) : null; serverRuntime = runtime ? Buffer.from(runtime) : null;
      return true;
    });
    const sc = serverCaps as Buffer | null, sr = serverRuntime as Buffer | null;
    this.serverFieldVersion = sc?.[CAP.FIELD_VERSION] ?? 0;
    if (sc && sc[CAP.FIELD_VERSION] < this.fieldVersion) this.fieldVersion = sc[CAP.FIELD_VERSION];
    caps[CAP.FIELD_VERSION] = this.fieldVersion;
    this.maxString = sr && sr.length > 6 && (sr[6] & 4) ? 32767 : 4000;
    const w = new Out().u8(MSG.DATA_TYPES).u16le(CHARSET_UTF8).u16le(CHARSET_UTF8).u8(3).bytes(caps).bytes(runtimeCaps());
    for (const row of DATA_TYPES.split(';')) { const [a, b, c] = row.split(',').map(Number); w.u16be(a).u16be(b).u16be(c).u16be(0); }
    w.u16be(0);
    const body = w.build();
    await this.call((out) => out.raw(body), (r, type) => {
      if (type !== MSG.DATA_TYPES) throw new Error(`Unexpected Oracle message ${type} during startup`);
      for (;;) { const t = r.u16be(); if (t === 0) break; if (r.u16be() !== 0) r.skip(4); }
      return true;
    });
  }
  private async logon(options: OracleOptions): Promise<void> {
    const user = options.user ?? '', password = options.password ?? '';
    if (!user) throw new Error('Oracle needs a user name');
    this.secrets = [password];
    const session = new Map<string, string>();
    let verifier = 0;
    const parameters = (r: In) => {
      const count = r.ub(2);
      for (let i = 0; i < count; i++) {
        r.ub(4);
        const key = r.str() ?? '';
        const valueLength = r.ub(4);
        const value = valueLength > 0 ? r.str() ?? '' : '';
        const flag = r.ub(4);
        if (key === 'AUTH_VFR_DATA') verifier = flag;
        session.set(key, value);
      }
    };
    const receive = (r: In, type: number): boolean | void => {
      if (type === MSG.PARAMETER) { parameters(r); return; }
      if (type === MSG.STATUS) { r.ub(4); r.ub(2); return true; }
      if (type === MSG.ERROR) { const e = this.errorInfo(r); if (e.code) this.fail(e.code, e.message); return true; }
      if (type === MSG.WARNING) { this.warning(r); return; }
      if (type === MSG.SERVER_SIDE_PIGGYBACK) { this.serverPiggyback(r); return; }
      throw new Error(`Unexpected Oracle message ${type} during logon`);
    };
    const userBytes = Buffer.from(user.trim(), 'utf8');
    const plain = (text: string) => text.replace(/[^\x20-\x7e]/g, '?');
    const host = plain(hostname()), osUser = plain(userInfo().username);
    const identify = (w: Out) => {
      w.keyValue('AUTH_TERMINAL', 'unknown').keyValue('AUTH_PROGRAM_NM', 'tabularius').keyValue('AUTH_MACHINE', host)
        .keyValue('AUTH_PID', String(process.pid)).keyValue('AUTH_SID', osUser);
    };
    await this.call((w) => {
      this.header(w, FN.AUTH_PHASE_ONE);
      w.u8(1).ub(userBytes.length).ub(AUTH_MODE).u8(1).ub(5).u8(0).u8(1).bytes(userBytes);
      identify(w);
    }, receive);
    if (verifier !== VERIFIER_12C) throw new Error('This Oracle account has an older password verifier (before 12c); change the password on the server so a 12c verifier is stored');
    const keys = logonKeys(session, password);
    session.clear();
    this.secrets.push(keys.password, keys.speedyKey, keys.sessionKey);
    const zone = (() => {
      const minutes = -new Date().getTimezoneOffset(), sign = minutes < 0 ? '-' : '+';
      return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
    })();
    await this.call((w) => {
      this.header(w, FN.AUTH_PHASE_TWO);
      w.u8(1).ub(userBytes.length).ub(AUTH_MODE).u8(1).ub(7).u8(1).u8(1).bytes(userBytes);
      w.keyValue('AUTH_SESSKEY', keys.sessionKey, 1).keyValue('AUTH_PBKDF2_SPEEDY_KEY', keys.speedyKey)
        .keyValue('SESSION_CLIENT_CHARSET', String(CHARSET_UTF8)).keyValue('SESSION_CLIENT_DRIVER_NAME', 'tabularius thn')
        .keyValue('SESSION_CLIENT_VERSION', String((1 << 24) | (0 << 20) | (0 << 12)))
        .keyValue('AUTH_ALTER_SESSION', `ALTER SESSION SET TIME_ZONE ='${zone}'\x00`, 1)
        .keyValue('AUTH_PASSWORD', keys.password);
    }, receive);
    this.databaseVersion = session.get('AUTH_VERSION_NO') ?? '';
    this.loggedOn = true;
  }

  // -- open and connect ----------------------------------------------------
  private async open(host: string, port: number, options: OracleOptions): Promise<void> {
    const refused = hostRefusal({ private: true }, host);
    if (refused) throw new Error(refused);
    const lookup = socketLookup({ private: true });
    const ssl = options.ssl ?? 'verify-full';
    const socket = ssl === 'disable' ? netConnect({ host, port, lookup }) : tlsConnect({ host, port,
      servername: host, lookup, ca: options.ca,
      rejectUnauthorized: ssl !== 'require',
      ...(ssl === 'verify-ca' ? { checkServerIdentity: () => undefined } : {}) });
    this.socket = socket; this.input = new Input(socket);
    await new Promise<void>((resolve, reject) => {
      const event = ssl === 'disable' ? 'connect' : 'secureConnect';
      const done = (error?: Error) => {
        socket.off(event, ready).off('error', failed).off('close', closed);
        if (error) reject(error); else resolve();
      };
      const ready = () => done();
      const failed = () => done(new Error('Oracle connection failed; check the host, port and TLS configuration'));
      const closed = () => done(new Error('Oracle connection closed'));
      socket.once(event, ready).once('error', failed).once('close', closed);
    });
  }
  private static descriptor(options: OracleOptions, host: string, port: number, ssl: string): Buffer {
    const service = options.sid !== undefined ? `(SID=${safeDescriptor(options.sid, 'sid')})` : `(SERVICE_NAME=${safeDescriptor(options.serviceName ?? '', 'serviceName')})`;
    const protocol = ssl === 'disable' ? 'TCP' : 'TCPS';
    const cidHost = safeDescriptor(hostname(), 'CID host');
    const cidUser = safeDescriptor(userInfo().username, 'CID user');
    return Buffer.from(`(DESCRIPTION=(ADDRESS=(PROTOCOL=${protocol})(HOST=${safeDescriptor(host, 'host')})(PORT=${port}))(CONNECT_DATA=${service}(CID=(PROGRAM=tabularius)(HOST=${cidHost})(USER=${cidUser}))))`, 'utf8');
  }
  /** The CONNECT packet body: 66 bytes of fixed fields, then the descriptor when it is short enough to go inline. */
  private static connectBody(data: Buffer): { body: Buffer; extra?: Buffer } {
    if (data.length > 65535) throw invalid('connect descriptor length');
    const inline = data.length <= TNS.INLINE_LIMIT;
    const b = Buffer.alloc(66 + (inline ? data.length : 0));
    b.writeUInt16BE(TNS.VERSION, 0);
    b.writeUInt16BE(TNS.MIN_VERSION, 2);
    b.writeUInt16BE(0x0401, 4); // global service options
    b.writeUInt16BE(TNS.SDU, 6);
    b.writeUInt16BE(TNS.TDU, 8);
    b.writeUInt16BE(0x4f98, 10); // protocol characteristics
    b.writeUInt16BE(1, 14); // the value 1 in this machine's byte order
    b.writeUInt16BE(data.length, 16);
    b.writeUInt16BE(inline ? 74 : 0, 18);
    b[24] = 0x84; b[25] = 0x84; // connect flags: no network-authentication services wanted
    b.writeUInt32BE(TNS.SDU, 50);
    b.writeUInt32BE(TNS.TDU, 54);
    if (inline) data.copy(b, 66);
    return { body: b, extra: inline ? undefined : data };
  }
  static async connect(options: OracleOptions): Promise<OracleClient> {
    const ssl = options.ssl ?? 'verify-full';
    if (ssl === 'disable' && !options.allowInsecure) throw new Error('Plain Oracle TCP needs ssl: disable and allowInsecure: true');
    if (!options.host) throw invalid('host');
    if ((options.sid === undefined) === (options.serviceName === undefined)) throw new Error('Set one Oracle serviceName or sid');
    const timeout = options.connectTimeoutMs ?? 30_000;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 2_147_483_647) throw invalid('connect timeout');
    const client = new OracleClient();
    let host = safeDescriptor(options.host, 'host');
    let port = portNumber(options.port ?? (ssl === 'disable' ? 1521 : 2484));
    OracleClient.descriptor(options, host, port, ssl);
    const originalHost = host.toLowerCase();
    const allowed = new Set((options.allowRedirectHosts ?? []).map((h) => safeDescriptor(h, 'allowRedirectHosts').toLowerCase()));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; client.socket?.destroy(new Error('Oracle connect timeout')); }, timeout);
    let redirects = 0, resends = 0;
    try {
      for (;;) {
        if (timedOut) throw new Error('Oracle connect timeout');
        await client.open(host, port, { ...options, ssl });
        if (timedOut) throw new Error('Oracle connect timeout');
        const connection = OracleClient.connectBody(OracleClient.descriptor(options, host, port, ssl));
        await client.write(TNS.CONNECT, connection.body);
        if (connection.extra) await client.sendData(connection.extra);
        let redirected = false;
        for (;;) {
          const p = await client.readPacket();
          if (p.type === TNS.RESEND) {
            if (++resends > 2) throw new Error('Oracle listener requested too many RESEND packets');
            await client.write(TNS.CONNECT, connection.body);
            if (connection.extra) await client.sendData(connection.extra);
            continue;
          }
          if (p.type === TNS.REFUSE) {
            const reason = p.body.subarray(4).toString('utf8').replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 2048);
            throw new Error(reason || 'Oracle listener refused the connection');
          }
          if (p.type === TNS.REDIRECT) {
            if (++redirects > 3) throw new Error('Oracle listener exceeded three redirects');
            const address = p.body.subarray(2).toString('utf8');
            const targetHost = /\(HOST=([^()]*)\)/i.exec(address)?.[1];
            const targetPort = /\(PORT=([^()]*)\)/i.exec(address)?.[1];
            if (!targetHost || !targetPort || !/^[0-9]+$/.test(targetPort)) throw invalid('REDIRECT address');
            safeDescriptor(targetHost, 'redirect host');
            port = portNumber(Number(targetPort));
            if (targetHost.toLowerCase() !== originalHost && !allowed.has(targetHost.toLowerCase())) throw new Error(`Oracle redirect to ${targetHost}:${port} is not allowed`);
            host = targetHost; client.input?.detach(); client.socket?.destroy(); client.input = undefined; client.socket = undefined;
            redirected = true; break;
          }
          if (p.type !== TNS.ACCEPT) throw new Error(`Unknown Oracle TNS packet type ${p.type}`);
          if (p.body.length < 24) throw invalid('ACCEPT packet');
          client.serverVersion = p.body.readUInt16BE(0);
          client.sdu = p.body.readUInt16BE(4);
          const flags0 = p.body[14], flags1 = p.body[15];
          if (client.serverVersion >= TNS.LARGE_HEADER_VERSION && p.body.length >= 32) client.sdu = p.body.readUInt32BE(24);
          if (!client.sdu) throw invalid('ACCEPT SDU');
          // The server wants network services (encryption or integrity checks) unless it said it has none or switched them off.
          if (!(flags0 & 0x04) && !(flags1 & 0x08)) throw new Error(ENCRYPTION_ERROR);
          client.large = client.serverVersion >= TNS.LARGE_HEADER_VERSION;
          await client.negotiate();
          await client.logon(options);
          await client.session(options);
          return client;
        }
        if (!redirected) throw invalid('REDIRECT state');
      }
    } catch (error) {
      client.input?.detach(); client.socket?.destroy(); client.closed = true;
      throw error;
    } finally { clearTimeout(timer); }
  }
  /** Session settings the driver relies on: ISO date text both ways, and a dot as the decimal separator. */
  private async session(options: OracleOptions): Promise<void> {
    for (const sql of [
      `ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS' NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.FF' NLS_TIMESTAMP_TZ_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.FFTZH:TZM' NLS_NUMERIC_CHARACTERS = '.,'`,
      ...(options.schema ? [`ALTER SESSION SET CURRENT_SCHEMA = "${options.schema.replaceAll('"', '""')}"`] : []),
    ]) await this.execute(sql, [], {});
  }

  // -- statements ---------------------------------------------------------
  private writeBinds(w: Out, binds: Bind[]): void {
    for (const b of binds) {
      w.u8(b.type).u8(1).u8(0).u8(0).ub(b.size).ub(0).ub(0).ub(0).ub(0).ub(b.csfrm ? CHARSET_UTF8 : 0).u8(b.csfrm).ub(0);
      if (this.fieldVersion >= 8) w.ub(0);
    }
  }
  private writeBindRow(w: Out, binds: Bind[]): void {
    w.u8(MSG.ROW_DATA);
    const long = (b: Bind) => b.type === TYPE.LONG || b.type === TYPE.LONG_RAW;
    for (const b of binds) {
      if (b.out || long(b)) continue;
      if (b.data === null) w.u8(0); else w.bytes(b.data);
    }
    for (const b of binds) if (!b.out && long(b)) w.bytes(b.data ?? Buffer.alloc(0));
  }
  private columnInfo(r: In): Column {
    const type = r.u8();
    r.u8();
    const precision = r.i8(), scale = r.i8();
    const maxSize = r.ub(4);
    r.ub(4); r.ub(8);
    if (r.ub(4) > 0) r.withLength();
    r.ub(2); r.ub(2);
    const csfrm = r.u8();
    let size = r.ub(4);
    if (type === TYPE.RAW) size = maxSize;
    void size;
    if (this.fieldVersion >= 8) r.ub(4);
    const nullable = r.u8() !== 0;
    r.u8();
    const name = r.ub(4) > 0 ? r.str() ?? '' : '';
    if (r.ub(4) > 0) r.str();
    if (r.ub(4) > 0) r.str();
    r.ub(2);
    r.ub(4);
    return { name, type, csfrm, maxSize, precision, scale, nullable };
  }
  private describeInfo(r: In): Column[] {
    r.skipChunked();
    r.ub(4);
    const count = r.ub(4);
    if (count > 0) r.u8();
    const columns: Column[] = [];
    for (let i = 0; i < count; i++) columns.push(this.columnInfo(r));
    if (r.ub(4) > 0) r.skipChunked();
    r.ub(4); r.ub(4); r.ub(4); r.ub(4);
    if (r.ub(4) > 0) r.skipChunked();
    return columns;
  }
  private value(r: In, col: Column, fetching: boolean): SqlValue {
    let v: SqlValue;
    if (col.maxSize === 0 && col.type !== TYPE.LONG && col.type !== TYPE.LONG_RAW && col.type !== TYPE.UROWID) v = null;
    else switch (col.type) {
      case TYPE.VARCHAR: case TYPE.CHAR: case TYPE.LONG: v = col.csfrm === 2 ? r.nstr() : r.str(); break;
      case TYPE.RAW: case TYPE.LONG_RAW: { const b = r.withLength(); v = b ? new Uint8Array(b) : null; break; }
      case TYPE.NUMBER: case TYPE.BINARY_INTEGER: { const b = r.withLength(); v = b ? numberValue(b) : null; break; }
      case TYPE.DATE: case TYPE.TIMESTAMP: case TYPE.TIMESTAMP_LTZ: case TYPE.TIMESTAMP_TZ: {
        const b = r.withLength(); v = b ? dateValue(b, col.type !== TYPE.DATE && col.type !== TYPE.TIMESTAMP) : null; break;
      }
      case TYPE.ROWID: {
        if (!fetching) { v = r.str(); break; }
        const n = r.u8();
        if (n === 0 || n === 0xff) { v = null; break; }
        const rba = r.ub(4), partition = r.ub(2); r.u8();
        const block = r.ub(4), slot = r.ub(2);
        v = base64Digits(rba, 6) + base64Digits(partition, 3) + base64Digits(block, 6) + base64Digits(slot, 3); break;
      }
      case TYPE.UROWID: {
        if (!fetching) { v = r.str(); break; }
        const outer = r.withLength();
        const inner = outer === null ? null : r.withLength();
        v = inner ? urowid(inner) : null; break;
      }
      case TYPE.BINARY_DOUBLE: { const b = r.withLength(); v = b ? binaryNumber(b, true) : null; break; }
      case TYPE.BINARY_FLOAT: { const b = r.withLength(); v = b ? binaryNumber(b, false) : null; break; }
      case TYPE.BOOLEAN: { const b = r.withLength(); v = b ? b[0] === 1 : null; break; }
      case TYPE.INTERVAL_DS: { const b = r.withLength(); v = b ? intervalDs(b) : null; break; }
      case TYPE.INTERVAL_YM: { const b = r.withLength(); v = b ? intervalYm(b) : null; break; }
      default: throw new Error(`Oracle column ${col.name} has a type (${col.type}) that Tabularius cannot read yet`);
    }
    if (!fetching) r.sb4();
    else if (col.type === TYPE.LONG || col.type === TYPE.LONG_RAW || col.maxSize > this.maxString) { r.sb4(); r.ub(4); }
    return v;
  }
  /** Run one statement. `binds` are in order of appearance; entries marked `out` are RETURNING ... INTO variables. */
  private async execute(sql: string, binds: Bind[], opts: { maxRows?: number; commit?: boolean; kind?: Kind; fetchRows?: number }): Promise<Outcome> {
    const kind = opts.kind ?? scanSql(sql).kind;
    const fetchRows = opts.fetchRows ?? 500;
    const sqlBytes = Buffer.from(sql, 'utf8');
    const inputs = binds.filter((b) => !b.out);
    const outcome: Outcome = { columns: [], rows: [], affected: 0, returned: [] };
    let cursor = 0, more = false;
    let columns: Column[] = [];
    let last: SqlValue[] | null = null;
    let bits: Buffer | null = null;
    let failure: OracleError | undefined, limited = false, flush = false;
    const returning = binds.filter((b) => b.out);
    const maxRows = opts.maxRows;
    let defined: Column[] | undefined;
    const handle = (r: In, type: number): boolean | void => {
      trace(`message ${type}`);
      switch (type) {
        case MSG.DESCRIBE_INFO: {
          const found = this.describeInfo(r);
          // After a define the server describes the query again; the types asked for stay.
          columns = defined && defined.length === found.length ? found.map((c, i) => ({ ...c, type: defined![i].type, csfrm: defined![i].csfrm, maxSize: defined![i].maxSize })) : found;
          if (!defined) outcome.columns = found;
          return;
        }
        case MSG.ROW_HEADER: {
          r.u8(); r.ub(2); r.ub(4); r.ub(4); r.ub(2);
          const n = r.ub(4);
          const vector = n > 0 ? r.withLength() : null;
          if (r.ub(4) > 0) r.skipChunked();
          if (vector) bits = Buffer.from(vector);
          return;
        }
        case MSG.BIT_VECTOR: { const count = r.ub(2); void count; bits = Buffer.from(r.take(Math.ceil(columns.length / 8))); return; }
        case MSG.ROW_DATA: {
          if (returning.length) {
            // The values of RETURNING ... INTO: a count for each variable, then that many values.
            const rows: SqlValue[][] = [];
            const typed = returning.map((b) => ({ name: '', type: b.type, csfrm: b.csfrm, maxSize: b.size, precision: 0, scale: 0, nullable: true }));
            const values = typed.map((col) => { const n = r.ub(4); const list: SqlValue[] = []; for (let i = 0; i < n; i++) list.push(this.value(r, col, false)); return list; });
            const count = Math.max(0, ...values.map((v) => v.length));
            for (let i = 0; i < count; i++) rows.push(values.map((v) => v[i] ?? null));
            outcome.returned.push(...rows);
            return;
          }
          const row: SqlValue[] = [];
          for (let i = 0; i < columns.length; i++) {
            const duplicate = bits !== null && (bits[i >> 3] & (1 << (i & 7))) === 0;
            row.push(duplicate ? (last?.[i] ?? null) : this.value(r, columns[i], true));
          }
          // Rows over the limit are read and dropped, so the response is read to its end and the connection stays usable.
          if (maxRows !== undefined && outcome.rows.length >= maxRows) limited = true;
          else outcome.rows.push(row);
          last = row; bits = null;
          return;
        }
        case MSG.IO_VECTOR: {
          r.u8();
          const low = r.ub(2), high = r.ub(4), count = high * 256 + low;
          r.ub(4); r.ub(2);
          const a = r.ub(2); if (a > 0) r.skip(a);
          const b = r.ub(2); if (b > 0) r.skip(b);
          for (let i = 0; i < count; i++) r.u8();
          return;
        }
        // The server holds the out values until the client asks for them: a one-byte request, then the rest of the response.
        case MSG.FLUSH_OUT_BINDS: flush = true; return true;
        case MSG.WARNING: this.warning(r); return;
        case MSG.SERVER_SIDE_PIGGYBACK: this.serverPiggyback(r); return;
        case MSG.PARAMETER: {
          let n = r.ub(2); for (let i = 0; i < n; i++) r.ub(4);
          n = r.ub(2); if (n > 0) r.skip(n);
          n = r.ub(2);
          for (let i = 0; i < n; i++) { if (r.ub(2) > 0) r.str(); if (r.ub(2) > 0) r.skipChunked(); r.ub(2); }
          n = r.ub(2); if (n > 0) r.skip(n);
          return;
        }
        case MSG.STATUS: r.ub(4); r.ub(2); return true;
        case MSG.ERROR: {
          const e = this.errorInfo(r);
          if (e.cursor) cursor = e.cursor;
          if (e.code === 1403 && kind === 'query') { more = false; return true; }
          if (e.code) { failure = new OracleError(e.code, e.message); more = false; return true; }
          outcome.affected = e.rowCount; more = kind === 'query';
          return true;
        }
        case MSG.IMPLICIT_RESULTSET: throw new Error('Oracle implicit result sets are not supported');
        default: throw new Error(`Unexpected Oracle message ${type}`);
      }
    };
    await this.call((w) => {
      let options = EXEC.PARSE | EXEC.EXECUTE;
      if (kind === 'query') options |= EXEC.FETCH | EXEC.NOT_PLSQL;
      else if (kind !== 'plsql') options |= EXEC.NOT_PLSQL;
      else if (binds.length) options |= EXEC.PLSQL_BIND;
      if (binds.length) options |= EXEC.BIND;
      if (opts.commit) options |= EXEC.COMMIT;
      this.header(w, FN.EXECUTE);
      w.ub(options).ub(0).u8(1).ub(sqlBytes.length).u8(1).ub(13).u8(0).u8(0).u8(0)
        .ub(kind === 'query' ? fetchRows : 1).ub(MAX_LONG)
        .u8(binds.length ? 1 : 0).ub(binds.length)
        .u8(0).u8(0).u8(0).u8(0).u8(0).u8(0).ub(0).ub(0).u8(0).u8(1).u8(0).ub(0).u8(0).ub(0).ub(0).u8(0).ub(0).u8(0);
      if (this.fieldVersion >= 8) w.u8(0).ub(0).u8(0).ub(0).u8(0);
      w.bytes(sqlBytes).ub(1).ub(kind === 'query' ? 0 : 1).ub(0).ub(0).ub(0).ub(0).ub(0).ub(kind === 'query' ? 1 : 0).ub(0).ub(0x8000).ub(0).ub(0).ub(0);
      if (binds.length) { this.writeBinds(w, binds); this.writeBindRow(w, binds); }
    }, handle);
    while (flush) { flush = false; await this.call((w) => { w.u8(MSG.FLUSH_OUT_BINDS); }, handle); }
    // LOB columns are read as LONG / LONG RAW: a second request tells the server so, and then the rows are fetched.
    if (failure === undefined && kind === 'query' && columns.some((c) => c.type === TYPE.CLOB || c.type === TYPE.BLOB)) {
      defined = columns.map((c): Column => c.type === TYPE.CLOB ? { ...c, type: TYPE.LONG, maxSize: MAX_LONG }
        : c.type === TYPE.BLOB ? { ...c, type: TYPE.LONG_RAW, csfrm: 0, maxSize: MAX_LONG } : c);
      columns = defined;
      await this.call((w) => {
        this.header(w, FN.EXECUTE);
        w.ub(0x10 | EXEC.NOT_PLSQL).ub(cursor).u8(0).ub(0).u8(1).ub(13).u8(0).u8(0).u8(0).ub(fetchRows).ub(MAX_LONG)
          .u8(0).ub(0).u8(0).u8(0).u8(0).u8(0).u8(0).u8(1).ub(defined!.length).ub(0).u8(0).u8(1).u8(0).ub(0).u8(0).ub(0).ub(0).u8(0).ub(0).u8(0);
        if (this.fieldVersion >= 8) w.u8(0).ub(0).u8(0).ub(0).u8(0);
        w.ub(0).ub(fetchRows).ub(0).ub(0).ub(0).ub(0).ub(0).ub(1).ub(0).ub(0).ub(0).ub(0).ub(0);
        this.writeBinds(w, defined!.map((c) => ({ type: c.type, csfrm: c.csfrm, size: c.maxSize || 1, data: null })));
      }, handle);
    }
    // A statement that raises an error closes its own cursor on the server.
    try {
      while (failure === undefined && kind === 'query' && more && !limited) {
        const seen = outcome.rows.length;
        await this.call((w) => { this.header(w, FN.FETCH); w.ub(cursor).ub(fetchRows); }, handle);
        if (more && outcome.rows.length === seen && !limited) break;
      }
    } finally { if (cursor && failure === undefined) this.cursorsToClose.push(cursor); }
    if (failure) this.fail((failure as OracleError).sqlCode, (failure as OracleError).message);
    if (limited) throw new OracleError(0, `SQL row limit of ${maxRows} exceeded`);
    return outcome;
  }
  async run(sql: string, binds: Bind[], opts: { maxRows?: number; commit?: boolean; kind?: Kind } = {}): Promise<Outcome> {
    if (this.closed) throw new Error('Oracle connection is closed');
    return this.execute(sql, binds, opts);
  }
  async commit(): Promise<void> {
    await this.call((w) => this.header(w, FN.COMMIT), (r, type) => this.finish(r, type));
  }
  async rollback(): Promise<void> {
    await this.call((w) => this.header(w, FN.ROLLBACK), (r, type) => this.finish(r, type));
  }
  private finish(r: In, type: number): boolean | void {
    if (type === MSG.STATUS) { r.ub(4); r.ub(2); return true; }
    if (type === MSG.ERROR) { const e = this.errorInfo(r); if (e.code) this.fail(e.code, e.message); return true; }
    if (type === MSG.WARNING) { this.warning(r); return; }
    if (type === MSG.SERVER_SIDE_PIGGYBACK) { this.serverPiggyback(r); return; }
    throw new Error(`Unexpected Oracle message ${type}`);
  }
  /** Drop the connection without the goodbye; the server ends whatever the session was running. */
  abort(): void {
    this.closed = true; this.input?.detach(); this.socket?.destroy();
  }
  async close(): Promise<void> {
    if (this.closed) return;
    try {
      if (this.socket && !this.socket.destroyed && this.socket.writable && this.loggedOn) {
        try {
          let wait: ReturnType<typeof setTimeout> | undefined;
          await Promise.race([this.call((w) => this.header(w, FN.LOGOFF), () => true),
            new Promise<void>((resolve) => { wait = setTimeout(resolve, 2000); })]);
          clearTimeout(wait);
        } catch { /* The peer may already have gone; closing still releases the socket. */ }
      }
      if (this.socket && !this.socket.destroyed && this.socket.writable) {
        try { await this.sendData(Buffer.alloc(0), TNS.DATA_EOF); }
        catch { /* The peer may already have ended; closing still releases this socket. */ }
      }
    } finally {
      this.closed = true; this.input?.detach(); this.socket?.destroy();
    }
  }
}

/** A universal rowid in the text form that SQL prints. Physical rowids use the extended layout. */
function urowid(b: Buffer): string {
  if (b[0] === 1 && b.length >= 13) {
    return base64Digits(b.readUInt32BE(1), 6) + base64Digits(b.readUInt16BE(5), 3) + base64Digits(b.readUInt32BE(7), 6) + base64Digits(b.readUInt16BE(11), 3);
  }
  let out = '*';
  for (let i = 1; i < b.length; i += 3) {
    const a = b[i], c = b[i + 1] ?? 0, d = b[i + 2] ?? 0, left = b.length - i;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (c >> 4)];
    if (left > 1) out += B64[((c & 15) << 2) | (d >> 6)];
    if (left > 2) out += B64[d & 63];
  }
  return out;
}

// ---------------------------------------------------------------------------
// The SqlDriver.
// ---------------------------------------------------------------------------

const RETURNING = /\bRETURNING\b([\s\S]+?)\bINTO\b\s*((?::[\p{L}\p{N}_$#]+|:"[^"]+")(?:\s*,\s*(?::[\p{L}\p{N}_$#]+|:"[^"]+"))*)\s*$/iu;

export class OracleDriver implements SqlDriver {
  readonly dialect = 'oracle';
  private depth = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private options: OracleOptions;
  private client: OracleClient;
  private constructor(client: OracleClient, options: OracleOptions) { this.client = client; this.options = options; }
  static async connect(options: OracleOptions): Promise<OracleDriver> {
    return new OracleDriver(await OracleClient.connect(options), options);
  }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.tail.then(work, work);
    this.tail = next.catch(() => undefined);
    return next;
  }
  /** The types of the columns named in a RETURNING list, so the values come back in their own type. */
  private async returningTypes(sql: string, names: string[]): Promise<number[]> {
    const target = /^\s*INSERT\s+INTO\s+((?:"(?:[^"]|"")+"|[\p{L}\p{N}_$#]+)(?:\s*\.\s*(?:"(?:[^"]|"")+"|[\p{L}\p{N}_$#]+))?)/iu.exec(sql)
      ?? /^\s*(?:UPDATE|DELETE\s+FROM)\s+((?:"(?:[^"]|"")+"|[\p{L}\p{N}_$#]+)(?:\s*\.\s*(?:"(?:[^"]|"")+"|[\p{L}\p{N}_$#]+))?)/iu.exec(sql);
    if (!target) return names.map(() => TYPE.VARCHAR);
    const parts = [...target[1].matchAll(/"((?:[^"]|"")+)"|([\p{L}\p{N}_$#]+)/gu)].map((m) => m[1] !== undefined ? m[1].replaceAll('""', '"') : m[2].toUpperCase());
    const table = parts[parts.length - 1], owner = parts.length > 1 ? parts[0] : undefined;
    const found = await this.client.run(`SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = :1 AND OWNER = ${owner ? ':2' : "SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')"}`,
      owner ? [bindOf(table), bindOf(owner)] : [bindOf(table)], { kind: 'query', commit: false });
    const kinds = new Map(found.rows.map((row) => [String(row[0]), String(row[1])]));
    return names.map((raw) => {
      const name = raw.trim().startsWith('"') ? raw.trim().slice(1, -1).replaceAll('""', '"') : raw.trim().toUpperCase();
      const kind = kinds.get(name) ?? '';
      return /^(NUMBER|FLOAT|INTEGER)$/.test(kind) ? TYPE.NUMBER : kind === 'RAW' ? TYPE.RAW : TYPE.VARCHAR;
    });
  }
  /** Check the statement and its values against each other, before anything is sent. */
  private plan(sql: string, params: SqlValue[], types?: string[]): { text: string; kind: Kind; binds: Bind[]; out: RegExpExecArray | null } {
    const kind = kindOf(sql);
    const text = kind === 'plsql' ? sql : sql.replace(/[;\s]+$/, '');
    const scan = scanSql(text);
    const numbered = scan.binds.map((name) => {
      if (!/^\d+$/.test(name)) throw new Error('Oracle statements take numbered bind variables (:1, :2)');
      const index = Number(name) - 1;
      if (index < 0 || index >= params.length) throw new Error('SQL parameter count mismatch');
      return index;
    });
    // A repeated number is the same value again; every value given has to be used.
    if (new Set(numbered).size !== params.length) throw new Error('SQL parameter count mismatch');
    return { text, kind, binds: numbered.map((index) => bindOf(params[index], types?.[index])), out: kind === 'dml' ? RETURNING.exec(text) : null };
  }
  private async statement(plan: { text: string; kind: Kind; binds: Bind[]; out: RegExpExecArray | null }, maxRows?: number): Promise<SqlResult> {
    const { text, kind, out } = plan;
    let binds = plan.binds;
    if (out) {
      const count = out[2].split(',').length;
      const types = await this.returningTypes(text, out[1].split(','));
      binds = [...binds.slice(0, binds.length - count), ...types.map((type) => ({
        type, csfrm: type === TYPE.VARCHAR ? 1 : 0, size: type === TYPE.NUMBER ? 22 : 4000, data: null, out: true,
      }))];
    }
    const result = await this.client.run(text, binds, { maxRows, commit: this.depth === 0 && kind === 'dml', kind });
    if (out) return { columns: [], rows: result.returned, affected: result.affected };
    return { columns: result.columns.map((c) => ({ name: c.name, type: typeName(c) })), rows: result.rows, ...(kind === 'query' ? {} : { affected: result.affected }) };
  }
  async query(sql: string, params: SqlValue[], opts: { timeoutMs?: number; maxRows?: number; parameterTypes?: string[] } = {}): Promise<SqlResult> {
    const timeout = opts.timeoutMs ?? 30_000;
    const plan = this.plan(sql, params, opts.parameterTypes);
    return this.serial(async () => {
      let timer: ReturnType<typeof setTimeout> | undefined, timedOut = false;
      const work = this.statement(plan, opts.maxRows);
      try {
        return await Promise.race([work, new Promise<never>((_, reject) => {
          timer = setTimeout(() => { timedOut = true; this.client.interrupt(); reject(new Error(`SQL query timed out after ${timeout} ms`)); }, timeout);
        })]);
      } catch (e) {
        if (timedOut) {
          // The server answers an interrupt with ORA-01013 and the session carries on; one that does not answer is dropped.
          let grace: ReturnType<typeof setTimeout> | undefined;
          const settled = await Promise.race([work.then(() => true, () => true), new Promise<boolean>((resolve) => { grace = setTimeout(() => resolve(false), 1500); })]);
          clearTimeout(grace);
          if (!settled) this.client.abort();
        } else {
          work.catch(() => undefined);
          if (!(e instanceof OracleError)) this.client.abort();
        }
        throw e;
      } finally { if (timer) clearTimeout(timer); }
    });
  }
  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    const depth = this.depth++;
    const name = `ess_${depth}`;
    try {
      if (depth) await this.query(`SAVEPOINT ${name}`, []);
      const value = await fn(this);
      if (!depth) await this.serial(() => this.client.commit());
      return value;
    } catch (e) {
      if (depth) await this.query(`ROLLBACK TO SAVEPOINT ${name}`, []).catch(() => undefined);
      else await this.serial(() => this.client.rollback()).catch(() => undefined);
      throw e;
    } finally { this.depth--; }
  }
  async tables(): Promise<{ schema?: string; name: string }[]> {
    const schema = this.options.schema ?? this.options.user?.toUpperCase();
    const result = await this.query(`SELECT OWNER, OBJECT_NAME FROM ALL_OBJECTS WHERE OBJECT_TYPE IN ('TABLE', 'VIEW') AND OWNER = ${schema ? ':1' : "SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')"} AND OBJECT_NAME NOT LIKE 'BIN$%' ORDER BY OBJECT_NAME`, schema ? [schema] : []);
    return result.rows.map((r) => ({ schema: String(r[0]), name: String(r[1]) }));
  }
  async columns(table: { schema?: string; name: string }): Promise<SqlColumn[]> {
    const schema = table.schema ?? this.options.schema ?? this.options.user?.toUpperCase();
    const result = await this.query(`SELECT c.COLUMN_NAME, c.DATA_TYPE, c.NULLABLE, CASE WHEN k.COLUMN_NAME IS NULL THEN 0 ELSE 1 END
      FROM ALL_TAB_COLS c LEFT JOIN (SELECT cc.OWNER, cc.TABLE_NAME, cc.COLUMN_NAME FROM ALL_CONSTRAINTS ac
        JOIN ALL_CONS_COLUMNS cc ON ac.OWNER = cc.OWNER AND ac.CONSTRAINT_NAME = cc.CONSTRAINT_NAME WHERE ac.CONSTRAINT_TYPE = 'P') k
        ON k.OWNER = c.OWNER AND k.TABLE_NAME = c.TABLE_NAME AND k.COLUMN_NAME = c.COLUMN_NAME
      WHERE c.OWNER = ${schema ? ':1' : "SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')"} AND c.TABLE_NAME = ${schema ? ':2' : ':1'} AND c.HIDDEN_COLUMN = 'NO' ORDER BY c.COLUMN_ID`,
    schema ? [schema, table.name] : [table.name]);
    return result.rows.map((r) => ({ name: String(r[0]), type: String(r[1]), nullable: r[2] === 'Y', key: Number(r[3]) === 1 }));
  }
  quoteName(name: string): string {
    if (!name || name.includes('\0')) throw new Error('Invalid Oracle name');
    return `"${name.replaceAll('"', '""')}"`;
  }
  placeholder(n: number): string { return `:${n}`; }
  async close(): Promise<void> { await this.client.close(); }
}
function typeName(c: Column): string {
  switch (c.type) {
    case TYPE.VARCHAR: return 'VARCHAR2'; case TYPE.CHAR: return 'CHAR'; case TYPE.NUMBER: return 'NUMBER'; case TYPE.DATE: return 'DATE';
    case TYPE.TIMESTAMP: return 'TIMESTAMP'; case TYPE.TIMESTAMP_TZ: return 'TIMESTAMP WITH TIME ZONE'; case TYPE.TIMESTAMP_LTZ: return 'TIMESTAMP WITH LOCAL TIME ZONE';
    case TYPE.RAW: return 'RAW'; case TYPE.LONG: return 'LONG'; case TYPE.LONG_RAW: return 'LONG RAW'; case TYPE.BINARY_FLOAT: return 'BINARY_FLOAT';
    case TYPE.BINARY_DOUBLE: return 'BINARY_DOUBLE'; case TYPE.ROWID: case TYPE.UROWID: return 'ROWID'; case TYPE.BOOLEAN: return 'BOOLEAN';
    case TYPE.CLOB: return 'CLOB'; case TYPE.BLOB: return 'BLOB'; case TYPE.INTERVAL_DS: return 'INTERVAL DAY TO SECOND';
    case TYPE.INTERVAL_YM: return 'INTERVAL YEAR TO MONTH'; default: return String(c.type);
  }
}
export const connectOracle = OracleDriver.connect;
