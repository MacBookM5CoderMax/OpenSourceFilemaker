import { createConnection, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { createHash, constants, publicEncrypt } from 'node:crypto';
import type { SqlColumn, SqlDriver, SqlResult, SqlValue } from './driver.ts';
import { ESS_ERROR } from './driver.ts';
import { hostRefusal, socketLookup } from '../outbound-address.ts';

// MySQL Internals Manual: Client/Server Protocol, Protocol::Packet, Capability Flags,
// Connection Phase, Authentication, COM_QUERY, COM_STMT_PREPARE and COM_STMT_EXECUTE.
// Protocol behavior is unverified against a real MySQL or MariaDB server.
const MAX_PART = 0xffffff;
// One connection buffers at most this much from the server (times TABULARIUS_ESS_POOL connections): 64 MiB, not the protocol's 1 GiB.
const MAX_MESSAGE = 64 * 1024 * 1024;
const CAP = { LONG_PASSWORD: 1, FOUND_ROWS: 2, CONNECT_DB: 8, PROTOCOL_41: 0x200, SSL: 0x800,
  TRANSACTIONS: 0x2000, SECURE: 0x8000, MULTI_RESULTS: 0x20000,
  PLUGIN_AUTH: 0x80000, LENENC_AUTH: 0x200000, DEPRECATE_EOF: 0x1000000 };
const TYPE = { TINY: 1, SHORT: 2, LONG: 3, FLOAT: 4, DOUBLE: 5, NULL: 6, TIMESTAMP: 7,
  LONGLONG: 8, INT24: 9, DATE: 10, TIME: 11, DATETIME: 12, YEAR: 13, VARCHAR: 15,
  BIT: 16, JSON: 245, NEWDECIMAL: 246, BLOB: 252, VAR_STRING: 253, STRING: 254 };
const concat = (parts: Uint8Array[]): Buffer => Buffer.concat(parts);
const u32 = (n: number): Buffer => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const nul = (s: string): Buffer => Buffer.from(`${s}\0`);
const hash = (algorithm: string, b: Uint8Array): Buffer => createHash(algorithm).update(b).digest();
const xor = (a: Uint8Array, b: Uint8Array): Buffer => Buffer.from(a.map((v, i) => v ^ b[i % b.length]));
function len(n: number): Buffer {
  if (n < 251) return Buffer.from([n]);
  if (n <= 0xffff) return Buffer.from([0xfc, n & 255, n >> 8]);
  if (n <= 0xffffff) return Buffer.from([0xfd, n & 255, n >> 8, n >> 16]);
  const b = Buffer.alloc(9); b[0] = 0xfe; b.writeBigUInt64LE(BigInt(n), 1); return b;
}
const bytes = (b: Uint8Array): Buffer => Buffer.concat([len(b.length), b]);
function lnum(b: Buffer, pos: { at: number }): number {
  const n = b[pos.at++];
  if (n === undefined) throw Error('Truncated SQL packet');
  if (n < 251) return n;
  if (n === 0xfc) { const v = b.readUInt16LE(pos.at); pos.at += 2; return v; }
  if (n === 0xfd) { const v = b.readUIntLE(pos.at, 3); pos.at += 3; return v; }
  if (n === 0xfe) { const v = Number(b.readBigUInt64LE(pos.at)); pos.at += 8; if (v > MAX_MESSAGE) throw Error('SQL value exceeds 64 MiB'); return v; }
  throw Error('Invalid SQL length');
}
function lbytes(b: Buffer, pos: { at: number }): Buffer {
  const n = lnum(b, pos);
  if (pos.at + n > b.length) throw Error('Truncated SQL value');
  const v = b.subarray(pos.at, pos.at + n); pos.at += n; return v;
}
function cstr(b: Buffer, p: { at: number }): string {
  const end = b.indexOf(0, p.at);
  if (end < 0) throw Error('Truncated SQL string');
  const s = b.toString('utf8', p.at, end); p.at = end + 1; return s;
}

/** A bounded packet reader. Each physical packet may be 16 MiB; a logical message may be 64 MiB. */
class Packets {
  private buffer: Buffer = Buffer.alloc(0);
  private queue: { payload: Buffer; seq: number }[] = [];
  private queuedBytes = 0;
  private waiting?: { resolve: (v: { payload: Buffer; seq: number }) => void; reject: (e: Error) => void };
  private failed?: Error;
  private socket: Socket | TLSSocket;
  constructor(socket: Socket | TLSSocket) { this.socket = socket; this.attach(socket); }
  private onData = (data: Buffer): void => {
    if (this.buffer.length + data.length > MAX_MESSAGE + MAX_PART + 4) return this.fail(Error('SQL packet exceeds 64 MiB'));
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, data]) : data;
    while (this.buffer.length >= 4) {
      const n = this.buffer.readUIntLE(0, 3);
      if (this.buffer.length < n + 4) break;
      const packet = { payload: this.buffer.subarray(4, n + 4), seq: this.buffer[3] };
      this.buffer = this.buffer.subarray(n + 4);
      if (this.waiting) { const w = this.waiting; this.waiting = undefined; w.resolve(packet); }
      else {
        this.queuedBytes += packet.payload.length;
        if (this.queuedBytes > MAX_MESSAGE) return this.fail(Error('SQL packet exceeds 64 MiB'));
        this.queue.push(packet);
      }
    }
  };
  private onError = (): void => { this.fail(Error('SQL connection closed')); };
  private fail(error: Error): void {
    this.failed = error;
    this.socket.destroy();
    if (this.waiting) { const w = this.waiting; this.waiting = undefined; w.reject(error); }
  }
  private attach(socket: Socket | TLSSocket): void {
    socket.on('data', this.onData); socket.on('error', this.onError); socket.on('close', this.onError);
  }
  /** Before a TLS upgrade: bytes or packets already received in plaintext were not sent by the server over TLS, so they fail the connection (CVE-2021-23222 class). */
  detach(): void {
    const stray = this.buffer.length > 0 || this.queue.length > 0 || this.socket.readableLength > 0;
    this.socket.off('data', this.onData); this.socket.off('error', this.onError); this.socket.off('close', this.onError);
    this.buffer = Buffer.alloc(0); this.queue = []; this.queuedBytes = 0;
    if (stray) { this.socket.destroy(); throw Error('SQL server sent data before the TLS upgrade; the connection was refused'); }
  }
  replace(socket: TLSSocket): void { this.socket = socket; this.attach(socket); }
  async read(): Promise<{ payload: Buffer; seq: number }> {
    if (this.failed) throw this.failed;
    if (this.queue.length) { const packet = this.queue.shift()!; this.queuedBytes -= packet.payload.length; return packet; }
    return new Promise((resolve, reject) => { this.waiting = { resolve, reject }; });
  }
  async message(seq: { value: number }): Promise<Buffer> {
    const parts: Buffer[] = []; let total = 0;
    for (;;) {
      const p = await this.read();
      if (p.seq !== seq.value) throw Error('SQL packet sequence mismatch');
      seq.value = (seq.value + 1) & 255;
      total += p.payload.length;
      if (total > MAX_MESSAGE) throw Error('SQL packet exceeds 64 MiB');
      parts.push(p.payload);
      if (p.payload.length !== MAX_PART) return Buffer.concat(parts, total);
    }
  }
}

export type MysqlTlsMode = 'disable' | 'require' | 'verify-ca' | 'verify-full';
export interface MysqlOptions {
  host: string; port?: number; user: string; password: string; database: string;
  connectionName?: string; tls?: MysqlTlsMode; ca?: string | Buffer; allowInsecure?: boolean; connectTimeoutMs?: number;
  /** The server's RSA public key (PEM), pinned: caching_sha2 full authentication then encrypts the password with it and never asks the server for a key. */
  serverPublicKey?: string | Buffer;
}
function scramble(plugin: string, password: string, nonce: Buffer): Buffer {
  if (!password) return Buffer.alloc(0);
  const pw = Buffer.from(password);
  if (plugin === 'mysql_native_password') {
    const first = hash('sha1', pw), second = hash('sha1', first);
    return xor(first, hash('sha1', concat([nonce, second])));
  }
  if (plugin === 'caching_sha2_password') {
    const first = hash('sha256', pw), second = hash('sha256', first);
    return xor(first, hash('sha256', concat([second, nonce])));
  }
  throw Error(`Unsupported SQL authentication plugin ${plugin.replace(/[^a-z0-9_]/gi, '')}`);
}
function errorPacket(packet: Buffer, secrets: string[]): never {
  const code = packet.length >= 3 ? packet.readUInt16LE(1) : 0;
  const state = packet[3] === 35 ? packet.toString('ascii', 4, 9) : 'HY000';
  const start = packet[3] === 35 ? 9 : 3;
  let message = packet.toString('utf8', start).slice(0, 500);
  for (const secret of secrets) if (secret) message = message.split(secret).join('[redacted]');
  throw Object.assign(Error(`SQL error ${code} (${state}): ${message}`), { code: ESS_ERROR, sqlCode: code, sqlState: state });
}
function checked(packet: Buffer, secrets: string[] = []): Buffer {
  if (packet[0] === 0xff) errorPacket(packet, secrets);
  return packet;
}
/** The OK packet carries the affected-row count first and the last insert id second; the count is what a write reports. */
function ok(packet: Buffer): number {
  const p = { at: 1 }; return lnum(packet, p);
}
function isEnd(packet: Buffer): boolean { return packet[0] === 0xfe && packet.length < 9; }
interface Column { name: string; type: number; flags: number; charset: number }
function column(packet: Buffer): Column {
  const p = { at: 0 };
  for (let i = 0; i < 4; i++) lbytes(packet, p);
  const name = lbytes(packet, p).toString('utf8');
  lbytes(packet, p); lnum(packet, p);
  const charset = packet.readUInt16LE(p.at); p.at += 2 + 4;
  const type = packet[p.at++], flags = packet.readUInt16LE(p.at);
  return { name, type, flags, charset };
}
function integer(raw: bigint): number | bigint {
  return raw <= BigInt(Number.MAX_SAFE_INTEGER) && raw >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(raw) : raw;
}
function textValue(raw: Buffer, col: Column): SqlValue {
  const s = raw.toString('utf8');
  // Charset 63 (binary) marks byte strings, but the server also gives it to every number and date column: only a string or BLOB type is bytes.
  const byteString = [TYPE.VARCHAR, TYPE.VAR_STRING, TYPE.STRING, 249, 250, 251, TYPE.BLOB, 255].includes(col.type);
  if ((col.charset === 63 && byteString) || col.type === TYPE.BIT) return raw;
  if ([TYPE.TINY, TYPE.SHORT, TYPE.LONG, TYPE.INT24, TYPE.LONGLONG, TYPE.YEAR].includes(col.type)) {
    try { return integer(BigInt(s)); } catch { return s; }
  }
  if ([TYPE.FLOAT, TYPE.DOUBLE].includes(col.type)) return Number(s);
  return s;
}
function binaryValue(packet: Buffer, p: { at: number }, col: Column): SqlValue {
  const unsigned = !!(col.flags & 32);
  switch (col.type) {
    case TYPE.TINY: return unsigned ? packet.readUInt8(p.at++) : packet.readInt8(p.at++);
    case TYPE.SHORT: case TYPE.YEAR: { const v = unsigned ? packet.readUInt16LE(p.at) : packet.readInt16LE(p.at); p.at += 2; return v; }
    case TYPE.LONG: case TYPE.INT24: { const v = unsigned ? packet.readUInt32LE(p.at) : packet.readInt32LE(p.at); p.at += 4; return v; }
    case TYPE.LONGLONG: { const v = unsigned ? packet.readBigUInt64LE(p.at) : packet.readBigInt64LE(p.at); p.at += 8; return integer(v); }
    case TYPE.FLOAT: { const v = packet.readFloatLE(p.at); p.at += 4; return v; }
    case TYPE.DOUBLE: { const v = packet.readDoubleLE(p.at); p.at += 8; return v; }
    case TYPE.DATE: case TYPE.DATETIME: case TYPE.TIMESTAMP: {
      const n = packet[p.at++]; if (n === 0) return '';
      const year = packet.readUInt16LE(p.at); p.at += 2;
      const month = packet[p.at++], day = packet[p.at++];
      const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (n === 4) return date;
      const hour = packet[p.at++], minute = packet[p.at++], second = packet[p.at++];
      const fraction = n === 11 ? `.${String(packet.readUInt32LE(p.at)).padStart(6, '0')}` : '';
      if (n === 11) p.at += 4;
      return `${date} ${[hour, minute, second].map((v) => String(v).padStart(2, '0')).join(':')}${fraction}`;
    }
    case TYPE.TIME: {
      const n = packet[p.at++]; if (!n) return '00:00:00';
      const negative = packet[p.at++] !== 0, days = packet.readUInt32LE(p.at); p.at += 4;
      const hour = packet[p.at++] + days * 24, minute = packet[p.at++], second = packet[p.at++];
      const fraction = n === 12 ? `.${String(packet.readUInt32LE(p.at)).padStart(6, '0')}` : '';
      if (n === 12) p.at += 4;
      return `${negative ? '-' : ''}${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${fraction}`;
    }
    default: return textValue(lbytes(packet, p), col);
  }
}
function row(packet: Buffer, columns: Column[], binary: boolean): SqlValue[] {
  const p = { at: binary ? 1 : 0 };
  const bitmap = binary ? packet.subarray(p.at, p.at += Math.ceil((columns.length + 2) / 8)) : undefined;
  return columns.map((col, i) => {
    if (binary ? !!(bitmap![Math.floor((i + 2) / 8)] & (1 << ((i + 2) % 8))) : packet[p.at] === 0xfb) {
      if (!binary) p.at++; return null;
    }
    return binary ? binaryValue(packet, p, col) : textValue(lbytes(packet, p), col);
  });
}
function parameter(value: SqlValue): { type: number; body: Buffer } {
  if (value === null) return { type: TYPE.NULL, body: Buffer.alloc(0) };
  if (typeof value === 'boolean') return { type: TYPE.TINY, body: Buffer.from([value ? 1 : 0]) };
  if (typeof value === 'bigint') { const b = Buffer.alloc(8); b.writeBigInt64LE(value); return { type: TYPE.LONGLONG, body: b }; }
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value)) { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(value)); return { type: TYPE.LONGLONG, body: b }; }
    const b = Buffer.alloc(8); b.writeDoubleLE(value); return { type: TYPE.DOUBLE, body: b };
  }
  if (value instanceof Date) {
    const b = Buffer.alloc(12); b[0] = 11; b.writeUInt16LE(value.getUTCFullYear(), 1);
    b[3] = value.getUTCMonth() + 1; b[4] = value.getUTCDate(); b[5] = value.getUTCHours();
    b[6] = value.getUTCMinutes(); b[7] = value.getUTCSeconds(); b.writeUInt32LE(value.getUTCMilliseconds() * 1000, 8);
    return { type: TYPE.DATETIME, body: b };
  }
  if (value instanceof Uint8Array) return { type: TYPE.BLOB, body: bytes(value) };
  return { type: TYPE.VAR_STRING, body: bytes(Buffer.from(value)) };
}

export class MysqlDriver implements SqlDriver {
  readonly dialect = 'mysql';
  private socket?: Socket | TLSSocket;
  private packets?: Packets;
  private seq = { value: 0 };
  private thread = 0;
  private depth = 0;
  private closed = false;
  private tls = false;
  /** The TLS certificate was checked (tls verify-ca or verify-full). */
  private tlsVerified = false;
  private options: MysqlOptions;
  private constructor(options: MysqlOptions) { this.options = options; }
  static async connect(options: MysqlOptions): Promise<MysqlDriver> {
    const driver = new MysqlDriver(options);
    const timeout = options.connectTimeoutMs ?? 30_000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([driver.open(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { driver.socket?.destroy(); reject(Error('SQL connection timed out')); }, timeout);
      })]);
      return driver;
    } catch (e) { await driver.close(); throw driver.safeError(e); }
    finally { if (timer) clearTimeout(timer); }
  }
  private async send(payload: Buffer): Promise<void> {
    if (!this.socket || this.socket.destroyed) throw Error('SQL connection closed');
    if (payload.length > MAX_MESSAGE) throw Error('SQL packet exceeds 64 MiB');
    for (let at = 0; at <= payload.length; at += MAX_PART) {
      const part = payload.subarray(at, Math.min(at + MAX_PART, payload.length));
      const header = Buffer.alloc(4); header.writeUIntLE(part.length, 0, 3); header[3] = this.seq.value;
      this.seq.value = (this.seq.value + 1) & 255;
      await new Promise<void>((resolve, reject) => this.socket!.write(Buffer.concat([header, part]), (e) => e ? reject(e) : resolve()));
      if (part.length < MAX_PART) break;
    }
  }
  private receive(): Promise<Buffer> { return this.packets!.message(this.seq); }
  private async command(code: number, body: Buffer, secrets: string[] = []): Promise<Buffer> {
    this.seq.value = 0; await this.send(Buffer.concat([Buffer.from([code]), body]));
    return checked(await this.receive(), [this.options.password, ...secrets]);
  }
  private authResponse(plugin: string, nonce: Buffer): Buffer {
    if (plugin === 'mysql_clear_password') {
      if (!this.tls || (!this.tlsVerified && !this.options.allowInsecure)) throw Error('mysql_clear_password requires verified TLS (tls verify-full or verify-ca); unverified TLS also needs allowInsecure, and plain text is never allowed');
      return nul(this.options.password);
    }
    return scramble(plugin, this.options.password, nonce);
  }
  private async open(): Promise<void> {
    const mode = this.options.tls ?? 'verify-full';
    if (mode === 'disable' && !this.options.allowInsecure) throw Error('SQL TLS disable requires allowInsecure');
    const port = this.options.port ?? 3306;
    // The server is one an administrator chose, on the network or not; the metadata range is never reached, and a name is checked on the lookup the connection uses.
    const refused = hostRefusal({ private: true }, this.options.host);
    if (refused) throw Error(`SQL: ${refused}`);
    const socket = createConnection({ host: this.options.host, port, lookup: socketLookup({ private: true }) });
    this.socket = socket;
    const timeout = this.options.connectTimeoutMs ?? 30_000;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { socket.destroy(); reject(Error('SQL connection timed out')); }, timeout);
        socket.once('connect', () => { clearTimeout(timer); resolve(); });
        socket.once('error', (e) => { clearTimeout(timer); reject(e); });
      });
      this.packets = new Packets(socket);
      const handshake = await this.receive();
      if (handshake[0] !== 10) throw Error('Unsupported SQL handshake');
      const p = { at: 1 }; cstr(handshake, p);
      this.thread = handshake.readUInt32LE(p.at); p.at += 4;
      const nonce1 = handshake.subarray(p.at, p.at + 8); p.at += 9;
      const offered = handshake.readUInt16LE(p.at); p.at += 2;
      const charset = handshake[p.at++]; void charset;
      p.at += 2;
      const high = handshake.readUInt16LE(p.at); p.at += 2;
      const flags = (offered | (high << 16)) >>> 0;
      const authLength = handshake[p.at++]; p.at += 10;
      const secondSize = Math.max(13, authLength - 8);
      const nonce2 = handshake.subarray(p.at, p.at + secondSize); p.at += secondSize;
      let nonce: Buffer = Buffer.concat([nonce1, nonce2]).subarray(0, Math.max(20, authLength - 1));
      let plugin = (flags & CAP.PLUGIN_AUTH) && p.at < handshake.length ? cstr(handshake, p) : 'mysql_native_password';
      if (plugin === 'client_ed25519') throw Error('MariaDB client_ed25519 authentication is unsupported');
      const secure = mode !== 'disable';
      if (secure && !(flags & CAP.SSL)) throw Error('SQL server does not offer TLS');
      let caps = CAP.PROTOCOL_41 | CAP.SECURE | CAP.PLUGIN_AUTH | CAP.TRANSACTIONS | CAP.MULTI_RESULTS | CAP.LONG_PASSWORD | CAP.FOUND_ROWS;
      if (flags & CAP.CONNECT_DB) caps |= CAP.CONNECT_DB;
      // CLIENT_DEPRECATE_EOF is never asked for: every result below reads the classic EOF packets after column definitions, so a server that
      // was offered the flag (MariaDB and MySQL both implement it) would leave those packets out and the first row would be read as a terminator.
      if (secure) caps |= CAP.SSL;
      const base = Buffer.concat([u32(caps), u32(MAX_MESSAGE), Buffer.from([45]), Buffer.alloc(23)]);
      if (secure) {
        await this.send(base); // Connection Phase: SSLRequest precedes the TLS handshake.
        this.packets.detach();
        const tlsSocket = tlsConnect({ socket, host: this.options.host, servername: this.options.host,
          ca: this.options.ca, rejectUnauthorized: mode !== 'require',
          ...(mode === 'verify-ca' ? { checkServerIdentity: () => undefined } : {}) });
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => { tlsSocket.destroy(); reject(Error('SQL TLS handshake timed out')); }, timeout);
          tlsSocket.once('secureConnect', () => { clearTimeout(timer); resolve(); });
          tlsSocket.once('error', (e) => { clearTimeout(timer); reject(e); });
        });
        this.socket = tlsSocket; this.packets.replace(tlsSocket); this.tls = true; this.tlsVerified = mode === 'verify-ca' || mode === 'verify-full';
      }
      await this.send(Buffer.concat([base, nul(this.options.user), bytes(this.authResponse(plugin, nonce)),
        ...(caps & CAP.CONNECT_DB ? [nul(this.options.database)] : []), nul(plugin)]));
      for (;;) {
        const reply = checked(await this.receive(), [this.options.password]);
        if (reply[0] === 0) break;
        if (reply[0] === 0xfe) {
          const sw = { at: 1 }; plugin = cstr(reply, sw);
          if (plugin === 'client_ed25519') throw Error('MariaDB client_ed25519 authentication is unsupported');
          nonce = reply.subarray(sw.at, reply.length - 1);
          await this.send(this.authResponse(plugin, nonce)); continue;
        }
        if (reply[0] === 1 && reply[1] === 3) continue; // Authentication: caching_sha2 fast success.
        if (reply[0] === 1 && reply[1] === 4) {
          if (plugin !== 'caching_sha2_password') throw Error('Unexpected SQL full authentication');
          if (this.tlsVerified || (this.tls && this.options.allowInsecure)) await this.send(nul(this.options.password));
          else if (this.options.serverPublicKey) {
            // A pinned key: nothing is asked of the server, so there is no key a middleman could substitute.
            await this.send(publicEncrypt({ key: this.options.serverPublicKey, padding: constants.RSA_PKCS1_OAEP_PADDING }, xor(nul(this.options.password), nonce)));
          } else if (!this.options.allowInsecure) {
            throw Error('caching_sha2_password full authentication needs verified TLS (tls verify-full or verify-ca), a pinned serverPublicKey, or allowInsecure to fetch the server key');
          } else {
            await this.send(Buffer.from([2])); // Authentication: request server RSA public key.
            const key = checked(await this.receive(), [this.options.password]);
            if (key[0] !== 1) throw Error('SQL server did not send an RSA public key');
            const encrypted = publicEncrypt({ key: key.subarray(1), padding: constants.RSA_PKCS1_OAEP_PADDING }, xor(nul(this.options.password), nonce));
            await this.send(encrypted);
          }
          continue;
        }
        throw Error('Unexpected SQL authentication response');
      }
    } catch (e) {
      // The TLS socket first: destroying the socket under an active TLS socket crashes Node (SIGSEGV on 22.x).
      this.socket?.destroy(); if (socket !== this.socket) socket.destroy();
      throw this.safeError(e);
    }
  }
  private safeError(error: unknown): Error {
    const raw = error instanceof Error ? error.message : 'SQL connection failed';
    const context = `(connection "${this.options.connectionName ?? this.options.database}", host ${this.options.host}:${this.options.port ?? 3306})`;
    const timeout = /^SQL query timed out after (\d+) ms$/.exec(raw);
    const detail = timeout ? `The SQL database "${this.options.database}" did not answer within ${Number(timeout[1]) / 1000} seconds ${context}`
      : `${raw} ${context}`;
    const message = this.options.password ? detail.split(this.options.password).join('[redacted]') : detail;
    const source = error as { sqlCode?: number; sqlState?: string };
    return Object.assign(Error(message), { code: ESS_ERROR, sqlCode: source?.sqlCode, sqlState: source?.sqlState });
  }
  private async result(first: Buffer, binary: boolean, maxRows?: number, secrets: string[] = []): Promise<SqlResult> {
    if (first[0] === 0) return { columns: [], rows: [], affected: ok(first) };
    const p = { at: 0 }, count = lnum(first, p);
    if (count > 4096) throw Error('SQL result has too many columns');
    const columns: Column[] = [];
    for (let i = 0; i < count; i++) columns.push(column(checked(await this.receive(), [this.options.password, ...secrets])));
    const end = checked(await this.receive(), [this.options.password, ...secrets]);
    if (!isEnd(end) && end[0] !== 0) throw Error('SQL column terminator missing');
    const rows: SqlValue[][] = [];
    for (;;) {
      const packet = checked(await this.receive(), [this.options.password, ...secrets]);
      if (isEnd(packet)) break;
      // Refused whole, with the message the bridge turns into the row-limit error; the connection is closed (the rest of the result is unread).
      if (maxRows !== undefined && rows.length >= maxRows) throw Error(`SQL row limit of ${maxRows} exceeded`);
      rows.push(row(packet, columns, binary));
    }
    return { columns: columns.map((c) => ({ name: c.name, type: String(c.type) })), rows };
  }
  private async run(sql: string, params: SqlValue[], maxRows?: number): Promise<SqlResult> {
    if (!params.length) return this.result(await this.command(3, Buffer.from(sql)), false, maxRows);
    const secrets = params.flatMap((v) => v === null ? [] : v instanceof Uint8Array ? [Buffer.from(v).toString('hex')]
      : [v instanceof Date ? v.toISOString() : String(v)]);
    const prepared = await this.command(0x16, Buffer.from(sql), secrets);
    if (prepared[0] !== 0 || prepared.length < 12) throw Error('Invalid SQL prepared statement');
    const id = prepared.readUInt32LE(1), columns = prepared.readUInt16LE(5), expected = prepared.readUInt16LE(7);
    for (let i = 0; i < expected; i++) checked(await this.receive(), [this.options.password]);
    if (expected) await this.receive();
    for (let i = 0; i < columns; i++) checked(await this.receive(), [this.options.password]);
    if (columns) await this.receive();
    try {
      if (expected !== params.length) throw Error('SQL parameter count mismatch');
      const values = params.map(parameter), bitmap = Buffer.alloc(Math.ceil(params.length / 8));
      params.forEach((v, i) => { if (v === null) bitmap[i >> 3] |= 1 << (i & 7); });
      const types = Buffer.from(values.flatMap((v) => [v.type, 0]));
      const body = Buffer.concat([u32(id), Buffer.from([0]), u32(1), bitmap, Buffer.from([1]), types, ...values.map((v) => v.body)]);
      return await this.result(await this.command(0x17, body, secrets), true, maxRows, secrets);
    } finally {
      this.seq.value = 0; await this.send(Buffer.concat([Buffer.from([0x19]), u32(id)]));
    }
  }
  async query(sql: string, params: SqlValue[], opts: { timeoutMs?: number; maxRows?: number } = {}): Promise<SqlResult> {
    if (this.closed) throw this.safeError(Error('SQL connection closed'));
    const timeout = opts.timeoutMs ?? 30_000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([this.run(sql, params, opts.maxRows), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Error(`SQL query timed out after ${timeout} ms`)), timeout);
      })]);
    } catch (e) {
      if ((e as Error).message.startsWith('SQL query timed out')) {
        // COM_QUERY KILL QUERY runs on a second connection, never on the stalled session.
        const killer = await MysqlDriver.connect({ ...this.options, connectTimeoutMs: 3000 }).catch(() => undefined);
        if (killer) {
          const killTimer = setTimeout(() => { void killer.close(); }, 3000);
          try { await killer.run(`KILL QUERY ${this.thread}`, []); } catch { /* The first timeout is the caller's error. */ }
          finally { clearTimeout(killTimer); await killer.close(); }
        }
        await this.close();
      } else if (!('sqlCode' in Object(e))) {
        await this.close();
      }
      throw this.safeError(e);
    } finally { if (timer) clearTimeout(timer); }
  }
  async transaction<T>(fn: (tx: SqlDriver) => Promise<T>): Promise<T> {
    const depth = this.depth++;
    const name = `ess_${depth}`;
    try {
      await this.query(depth ? `SAVEPOINT ${name}` : 'START TRANSACTION', []);
      const value = await fn(this);
      await this.query(depth ? `RELEASE SAVEPOINT ${name}` : 'COMMIT', []);
      return value;
    } catch (e) {
      await this.query(depth ? `ROLLBACK TO SAVEPOINT ${name}` : 'ROLLBACK', []).catch(() => {});
      throw e;
    } finally { this.depth--; }
  }
  async tables(): Promise<{ schema?: string; name: string }[]> {
    const result = await this.query('SELECT TABLE_SCHEMA, TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [this.options.database]);
    return result.rows.map((r) => ({ schema: String(r[0]), name: String(r[1]) }));
  }
  async columns(table: { schema?: string; name: string }): Promise<SqlColumn[]> {
    const result = await this.query('SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION', [table.schema ?? this.options.database, table.name]);
    return result.rows.map((r) => ({ name: String(r[0]), type: String(r[1]), nullable: r[2] === 'YES', key: r[3] === 'PRI' }));
  }
  quoteName(name: string): string { return `\`${name.replaceAll('`', '``')}\``; }
  placeholder(_n: number): string { return '?'; }
  async close(): Promise<void> { this.closed = true; this.socket?.destroy(); }
}
export const connectMysql = MysqlDriver.connect;
