/**
 * Oracle Net (TNS) and TTC startup, part 1. These layouts are transcribed from
 * public protocol descriptions, then exercised with a scripted peer. Every
 * layout below remains unverified against a real server. Login is part 2.
 */
import { connect as netConnect, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { hostname, userInfo } from 'node:os';
import { hostRefusal, socketLookup } from '../outbound-address.ts';
import { boolean } from '../settings.ts';

// Oracle Net packet and TTC values from public thin-client descriptions;
// each value is unverified against a real server.
const PROTOCOL = {
  // TNS packet types, Oracle Net packet header; unverified against a real server.
  CONNECT: 1, // TNS CONNECT; unverified against a real server.
  ACCEPT: 2, // TNS ACCEPT; unverified against a real server.
  REFUSE: 4, // TNS REFUSE; unverified against a real server.
  REDIRECT: 5, // TNS REDIRECT; unverified against a real server.
  DATA: 6, // TNS DATA; unverified against a real server.
  RESEND: 11, // TNS RESEND; unverified against a real server.
  MARKER: 12, // TNS MARKER; unverified against a real server.
  CONTROL: 14, // TNS CONTROL; unverified against a real server.
  VERSION: 319, // TNS desired version 0x013f; unverified against a real server.
  MIN_VERSION: 300, // TNS lowest version 0x012c; unverified against a real server.
  LARGE_HEADER_VERSION: 315, // TNS four-byte packet lengths; unverified against a real server.
  SERVICE_OPTIONS: 0x0c41, // TNS service options; exact bit set is unverified against a real server.
  SDU: 8192, // TNS requested session data unit; unverified against a real server.
  TDU: 65535, // TNS requested transport data unit; unverified against a real server.
  HARDWARE: 0x0100, // TNS hardware value; unverified against a real server.
  DATA_EOF: 0x0040, // TNS DATA end-of-file flag; unverified against a real server.
  BREAK: 1, // TNS break marker; unverified against a real server.
  RESET: 2, // TNS reset marker; unverified against a real server.
  ANO_MAGIC: 0xdeadbeef, // ANO negotiation prelude; unverified against a real server.
  TTC_PROTOCOL: 1, // TTC protocol negotiation message; unverified against a real server.
  TTC_TYPES: 2, // TTC data type negotiation message; unverified against a real server.
  TTC_VERSION: 6, // TTC preferred version; unverified against a real server.
  CHARSET: 873, // AL32UTF8 character-set ID; unverified against a real server.
  NCHARSET: 2000, // AL16UTF16 national character-set ID; unverified against a real server.
  // TTC representation IDs from public datatype tables; each is unverified against a real server.
  VARCHAR2: 1, // VARCHAR2; unverified against a real server.
  NUMBER: 2, // NUMBER; unverified against a real server.
  LONG: 8, // LONG; unverified against a real server.
  DATE: 12, // DATE; unverified against a real server.
  RAW: 23, // RAW; unverified against a real server.
  LONG_RAW: 24, // LONG RAW; unverified against a real server.
  CHAR: 96, // CHAR; unverified against a real server.
  BINARY_FLOAT: 100, // BINARY_FLOAT; unverified against a real server.
  BINARY_DOUBLE: 101, // BINARY_DOUBLE; unverified against a real server.
  CLOB: 112, // CLOB; unverified against a real server.
  BLOB: 113, // BLOB; unverified against a real server.
  TIMESTAMP: 180, // TIMESTAMP; unverified against a real server.
  TIMESTAMP_TZ: 181, // TIMESTAMP WITH TIME ZONE; unverified against a real server.
  INTERVAL_DS: 183, // INTERVAL DAY TO SECOND; unverified against a real server.
  TIMESTAMP_LTZ: 231, // TIMESTAMP WITH LOCAL TIME ZONE; unverified against a real server.
  INTERNAL_ROWID: 11, // ROWID representation for TTC negotiation; unverified against a real server.
  INTERNAL_CURSOR: 102, // cursor representation for TTC negotiation; unverified against a real server.
  INTERNAL_RESULT: 116, // result-set representation for TTC negotiation; unverified against a real server.
  CONNECT_HEADER: 60, // CONNECT fixed bytes before inline descriptor; unverified against a real server.
  INLINE_LIMIT: 230, // CONNECT older-layout inline descriptor budget; unverified against a real server.
} as const;

const LIMIT = 64 * 1024 * 1024;
const ENCRYPTION_ERROR = 'This Oracle server requires native network encryption, which Tabularius does not support; use TCPS (port 2484 by default)';
const invalid = (detail: string) => new Error(`Invalid Oracle ${detail}`);

export interface OracleOptions {
  host: string;
  port?: number;
  serviceName?: string;
  sid?: string;
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
export function writeTtcClr(value: Buffer, ttcVersion = PROTOCOL.TTC_VERSION): Buffer {
  sizeLimit(value.length);
  if (value.length <= 252) return Buffer.concat([Buffer.from([value.length]), value]);
  const chunks: Buffer[] = [Buffer.from([0xfe])];
  for (let at = 0; at < value.length; at += 65536) {
    const chunk = value.subarray(at, at + 65536);
    chunks.push(writeTtcInteger(chunk.length), chunk);
  }
  chunks.push(writeTtcInteger(0));
  // Chunk size uses UB4 for TTC 6+. Earlier TTC versions are not emitted by this client.
  if (ttcVersion < 6) throw invalid('TTC version for chunked CLR');
  return Buffer.concat(chunks);
}
export function readTtcClr(data: Buffer, offset = 0, ttcVersion = PROTOCOL.TTC_VERSION): { value: Buffer; offset: number } {
  if (offset >= data.length) throw invalid('CLR');
  const n = data[offset++];
  if (n !== 0xfe) {
    sizeLimit(n);
    if (offset + n > data.length) throw invalid('CLR');
    return { value: data.subarray(offset, offset + n), offset: offset + n };
  }
  if (ttcVersion < 6) throw invalid('TTC version for chunked CLR');
  const chunks: Buffer[] = []; let total = 0;
  for (;;) {
    const next = readTtcInteger(data, offset); offset = next.offset;
    if (next.value > BigInt(LIMIT)) throw invalid('declared length over 64 MiB');
    const length = Number(next.value);
    if (!length) break;
    sizeLimit(total + length);
    if (offset + length > data.length) throw invalid('CLR');
    chunks.push(data.subarray(offset, offset + length)); offset += length; total += length;
  }
  return { value: Buffer.concat(chunks, total), offset };
}

function descriptor(options: OracleOptions, host: string, port: number): Buffer {
  const service = options.sid !== undefined ? `(SID=${safeDescriptor(options.sid, 'sid')})` : `(SERVICE_NAME=${safeDescriptor(options.serviceName ?? '', 'serviceName')})`;
  const protocol = options.ssl === 'disable' ? 'TCP' : 'TCPS';
  const cidHost = safeDescriptor(hostname(), 'CID host');
  const cidUser = safeDescriptor(userInfo().username, 'CID user');
  return Buffer.from(`(DESCRIPTION=(ADDRESS=(PROTOCOL=${protocol})(HOST=${safeDescriptor(host, 'host')})(PORT=${port}))(CONNECT_DATA=${service}(CID=(PROGRAM=tabularius)(HOST=${cidHost})(USER=${cidUser}))))`, 'utf8');
}
function connectBody(data: Buffer): { body: Buffer; extra?: Buffer } {
  if (data.length > 65535) throw invalid('connect descriptor length');
  // The older layout's inline descriptor budget is 230 bytes. Its exact large
  // SDU/TDU offsets and long-descriptor DATA follow public descriptions and
  // remain unverified against a real server.
  const inline = data.length <= PROTOCOL.INLINE_LIMIT;
  const b = Buffer.alloc(PROTOCOL.CONNECT_HEADER + (inline ? data.length : 0));
  b.writeUInt16BE(PROTOCOL.VERSION, 0);
  b.writeUInt16BE(PROTOCOL.MIN_VERSION, 2);
  b.writeUInt16BE(PROTOCOL.SERVICE_OPTIONS, 4);
  b.writeUInt16BE(PROTOCOL.SDU, 6);
  b.writeUInt16BE(PROTOCOL.TDU, 8);
  b.writeUInt16BE(PROTOCOL.HARDWARE, 12);
  b.writeUInt16BE(data.length, 14);
  b.writeUInt16BE(inline ? PROTOCOL.CONNECT_HEADER + 8 : 0, 16);
  b.writeUInt32BE(PROTOCOL.SDU, 52);
  b.writeUInt32BE(PROTOCOL.TDU, 56);
  if (inline) data.copy(b, PROTOCOL.CONNECT_HEADER);
  return { body: b, extra: inline ? undefined : data };
}
function packet(type: number, body: Buffer, large: boolean, flags = 0): Buffer {
  const size = body.length + 8;
  if (size > (large ? 0xffffffff : 65535)) throw invalid('packet length');
  const head = Buffer.alloc(8);
  if (large) head.writeUInt32BE(size); else head.writeUInt16BE(size);
  head[4] = type; head[5] = flags;
  return Buffer.concat([head, body]);
}

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
      if (this.error) throw this.error;
      const b = this.socket.read(n) as Buffer | null;
      if (b) return b;
      await new Promise<void>((resolve) => { this.wake = resolve; });
      this.wake = undefined;
    }
  }
  detach(): void {
    this.socket.off('readable', this.ready).off('error', this.failed).off('end', this.closed).off('close', this.closed);
  }
}

interface TnsPacket { type: number; flags: number; body: Buffer }

export class OracleClient {
  private socket?: Socket | TLSSocket;
  private input?: Input;
  private large = false;
  private sdu: number = PROTOCOL.SDU;
  private incoming = Buffer.alloc(0);
  private incomingAt = 0;
  private closed = false;
  readonly serverCapabilities: { compile: Buffer; runtime: Buffer } = { compile: Buffer.alloc(0), runtime: Buffer.alloc(0) };
  serverVersion = 0;
  serverBanner = '';
  serverCharset = 0;
  serverFlags = 0;
  ttcVersion: number = PROTOCOL.TTC_VERSION;
  private constructor() {}

  private trace(type: number, size: number, direction: 'send' | 'recv'): void {
    if (boolean('TABULARIUS_ORACLE_TRACE')) process.stderr.write(`Oracle TNS ${direction} type=${type} length=${size}\n`);
  }
  private async write(type: number, body: Buffer, flags = 0): Promise<void> {
    if (!this.socket || this.socket.destroyed || this.closed) throw new Error('Oracle connection is closed');
    const bytes = packet(type, body, this.large, flags);
    this.trace(type, bytes.length, 'send');
    await new Promise<void>((resolve, reject) => this.socket!.write(bytes, (error?: Error | null) => error ? reject(error) : resolve()));
  }
  private async readPacket(): Promise<TnsPacket> {
    if (!this.input) throw new Error('Oracle connection is closed');
    const h = await this.input.bytes(8);
    const length = this.large ? h.readUInt32BE() : h.readUInt16BE();
    if (length < 8 || length > LIMIT || (!this.large && (h[2] || h[3])) || h[6] || h[7]) throw invalid('TNS packet header or length');
    const type = h[4];
    this.trace(type, length, 'recv');
    const body = await this.input.bytes(length - 8);
    return { type, flags: h[5], body };
  }
  private async sendData(data: Buffer, flags = 0): Promise<void> {
    sizeLimit(data.length);
    const max = Math.min(this.sdu - 10, this.large ? LIMIT - 10 : 65525);
    if (max < 1) throw invalid('negotiated SDU');
    for (let at = 0; at < data.length || (at === 0 && !data.length); at += max) {
      const body = Buffer.alloc(Math.min(max, data.length - at) + 2);
      body.writeUInt16BE(at + max >= data.length ? flags : 0);
      data.copy(body, 2, at, at + max);
      await this.write(PROTOCOL.DATA, body);
      if (!data.length) break;
    }
  }
  private async nextData(): Promise<Buffer> {
    for (;;) {
      const p = await this.readPacket();
      if (p.type === PROTOCOL.MARKER) {
        if (p.body[0] !== PROTOCOL.BREAK) throw new Error(`Unknown Oracle MARKER code ${p.body[0] ?? -1}`);
        // A break is followed by a reset. Echo that reset, then consume the
        // server's diagnostic packet through the ordinary path.
        const reset = await this.readPacket();
        if (reset.type !== PROTOCOL.MARKER || reset.body[0] !== PROTOCOL.RESET) throw invalid('MARKER reset');
        await this.write(PROTOCOL.MARKER, Buffer.from([PROTOCOL.RESET]));
        continue;
      }
      if (p.type !== PROTOCOL.DATA) throw new Error(`Unknown Oracle TNS packet type ${p.type}`);
      if (p.body.length < 2) throw invalid('DATA packet');
      const flags = p.body.readUInt16BE();
      if (flags & PROTOCOL.DATA_EOF) throw new Error('Oracle server closed the session');
      const data = p.body.subarray(2);
      if (data.length >= 4 && data.readUInt32BE() === PROTOCOL.ANO_MAGIC) throw new Error(ENCRYPTION_ERROR);
      if (data.length) return data;
    }
  }
  private async ttcBytes(n: number): Promise<Buffer> {
    sizeLimit(n);
    while (this.incoming.length - this.incomingAt < n) {
      const next = await this.nextData();
      const remain = this.incoming.subarray(this.incomingAt);
      sizeLimit(remain.length + next.length);
      this.incoming = Buffer.concat([remain, next]); this.incomingAt = 0;
    }
    const out = this.incoming.subarray(this.incomingAt, this.incomingAt + n);
    this.incomingAt += n;
    return out;
  }
  private async ttcInteger(): Promise<bigint> {
    const first = (await this.ttcBytes(1))[0];
    const length = first & 0x7f;
    if (length > 8 || first & 0x80) throw invalid('TTC integer');
    return readTtcInteger(Buffer.concat([Buffer.from([first]), await this.ttcBytes(length)])).value;
  }
  private async ttcClr(): Promise<Buffer> {
    const first = (await this.ttcBytes(1))[0];
    if (first !== 0xfe) return this.ttcBytes(first);
    const chunks: Buffer[] = []; let total = 0;
    for (;;) {
      const count = Number(await this.ttcInteger());
      if (count > LIMIT) throw invalid('declared length over 64 MiB');
      if (!count) return Buffer.concat(chunks, total);
      sizeLimit(total + count);
      chunks.push(await this.ttcBytes(count)); total += count;
    }
  }
  private async ttcCode(expected: number): Promise<void> {
    const code = (await this.ttcBytes(1))[0];
    if (code !== expected) throw new Error(`Unknown Oracle TTC message code ${code}`);
  }
  private async negotiate(): Promise<void> {
    const versions = Buffer.from([6, 5, 4, 3, 2, 1, 0]);
    await this.sendData(Buffer.concat([Buffer.from([PROTOCOL.TTC_PROTOCOL]), versions, Buffer.from('tabularius\0')]));
    await this.ttcCode(PROTOCOL.TTC_PROTOCOL);
    this.ttcVersion = Number(await this.ttcInteger());
    if (this.ttcVersion < 1 || this.ttcVersion > PROTOCOL.TTC_VERSION) throw invalid(`TTC version ${this.ttcVersion}`);
    this.serverBanner = (await this.ttcClr()).toString('utf8');
    this.serverCharset = (await this.ttcBytes(2)).readUInt16LE();
    this.serverFlags = Number(await this.ttcInteger());
    this.serverCapabilities.compile = await this.ttcClr();
    this.serverCapabilities.runtime = await this.ttcClr();
    // Empty capability arrays advertise no optional feature. The actual server
    // capability bit meanings and ordering are unverified against a real server.
    const compile = Buffer.alloc(0), runtime = Buffer.alloc(0);
    const representations = [PROTOCOL.VARCHAR2, PROTOCOL.NUMBER, PROTOCOL.LONG, PROTOCOL.DATE,
      PROTOCOL.RAW, PROTOCOL.LONG_RAW, PROTOCOL.CHAR, PROTOCOL.BINARY_FLOAT,
      PROTOCOL.BINARY_DOUBLE, PROTOCOL.CLOB, PROTOCOL.BLOB, PROTOCOL.TIMESTAMP,
      PROTOCOL.TIMESTAMP_TZ, PROTOCOL.INTERVAL_DS, PROTOCOL.TIMESTAMP_LTZ,
      PROTOCOL.INTERNAL_ROWID, PROTOCOL.INTERNAL_CURSOR, PROTOCOL.INTERNAL_RESULT];
    await this.sendData(Buffer.concat([Buffer.from([PROTOCOL.TTC_TYPES]),
      writeTtcInteger(PROTOCOL.CHARSET), writeTtcInteger(PROTOCOL.NCHARSET),
      writeTtcClr(compile), writeTtcClr(runtime),
      ...representations.map((id) => writeTtcInteger(id)), writeTtcInteger(0)]));
    await this.ttcCode(PROTOCOL.TTC_TYPES);
    for (let i = 0; i < 256; i++) if ((await this.ttcInteger()) === 0n) return;
    throw invalid('TTC representation list');
  }
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
    descriptor({ ...options, ssl }, host, port);
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
        const data = descriptor({ ...options, ssl }, host, port);
        const connection = connectBody(data);
        await client.write(PROTOCOL.CONNECT, connection.body);
        if (connection.extra) await client.sendData(connection.extra);
        let redirected = false;
        for (;;) {
          const p = await client.readPacket();
          if (p.type === PROTOCOL.RESEND) {
            if (++resends > 2) throw new Error('Oracle listener requested too many RESEND packets');
            await client.write(PROTOCOL.CONNECT, connection.body);
            if (connection.extra) await client.sendData(connection.extra);
            continue;
          }
          if (p.type === PROTOCOL.REFUSE) {
            const reason = p.body.toString('utf8').replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 2048);
            throw new Error(reason || 'Oracle listener refused the connection');
          }
          if (p.type === PROTOCOL.REDIRECT) {
            if (++redirects > 3) throw new Error('Oracle listener exceeded three redirects');
            const address = p.body.toString('utf8');
            const targetHost = /\(HOST=([^()]*)\)/i.exec(address)?.[1];
            const targetPort = /\(PORT=([^()]*)\)/i.exec(address)?.[1];
            if (!targetHost || !targetPort || !/^[0-9]+$/.test(targetPort)) throw invalid('REDIRECT address');
            safeDescriptor(targetHost, 'redirect host');
            port = portNumber(Number(targetPort));
            if (targetHost.toLowerCase() !== originalHost && !allowed.has(targetHost.toLowerCase())) throw new Error(`Oracle redirect to ${targetHost}:${port} is not allowed`);
            host = targetHost; client.input?.detach(); client.socket?.destroy(); client.input = undefined; client.socket = undefined;
            redirected = true; break;
          }
          if (p.type !== PROTOCOL.ACCEPT) throw new Error(`Unknown Oracle TNS packet type ${p.type}`);
          // ACCEPT fixed fields. Optional flags/ANO capability offsets in this
          // layout are unverified against a real server.
          if (p.body.length < 10) throw invalid('ACCEPT packet');
          client.serverVersion = p.body.readUInt16BE();
          client.sdu = p.body.readUInt16BE(4);
          const tdu = p.body.readUInt16BE(6);
          const flags = p.body.readUInt16BE(8);
          if (!client.sdu || !tdu) throw invalid('ACCEPT SDU or TDU');
          if (flags & 1) throw new Error(ENCRYPTION_ERROR);
          client.large = client.serverVersion >= PROTOCOL.LARGE_HEADER_VERSION;
          await client.negotiate();
          return client;
        }
        if (!redirected) throw invalid('REDIRECT state');
      }
    } catch (error) {
      client.input?.detach(); client.socket?.destroy(); client.closed = true;
      throw error;
    } finally { clearTimeout(timer); }
  }
  async close(): Promise<void> {
    if (this.closed) return;
    try {
      if (this.socket && !this.socket.destroyed && this.socket.writable) {
        try { await this.sendData(Buffer.alloc(0), PROTOCOL.DATA_EOF); }
        catch { /* The peer may already have ended; closing still releases this socket. */ }
      }
    } finally {
      this.closed = true; this.input?.detach(); this.socket?.destroy();
    }
  }
}
