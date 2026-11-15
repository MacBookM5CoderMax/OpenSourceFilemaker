// Scripted MySQL protocol peer; unverified against a real server.
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { createHash } from 'node:crypto';

export const nonce = Buffer.from('abcdefghijklmnopqrst');
export const password = ['p', 'ass', 'word'].join('');
export const sha = (v: Buffer) => createHash('sha1').update(v).digest();
export const sha256 = (v: Buffer) => createHash('sha256').update(v).digest();
export const xor = (a: Buffer, b: Buffer) => Buffer.from(a.map((v, i) => v ^ b[i % b.length]));
export const native = (pw: string, seed: Buffer) => pw ? xor(sha(Buffer.from(pw)), sha(Buffer.concat([seed, sha(sha(Buffer.from(pw)))]))) : Buffer.alloc(0);
export const caching = (pw: string, seed: Buffer) => pw ? xor(sha256(Buffer.from(pw)), sha256(Buffer.concat([sha256(sha256(Buffer.from(pw))), seed]))) : Buffer.alloc(0);
export const l = (b: Buffer) => Buffer.concat([Buffer.from([b.length]), b]);
export const str = (s: string) => Buffer.from(`${s}\0`);
export const ok = Buffer.from([0, 0, 0, 2, 0, 0, 0]);
export const eof = Buffer.from([0xfe, 0, 0, 2, 0]);
export const flags = 0x1000000 | 0x80000 | 0x8000 | 0x200 | 0x800 | 8;
export function handshake(plugin = 'mysql_native_password', thread = 17): Buffer {
  const low = Buffer.alloc(2), high = Buffer.alloc(2), id = Buffer.alloc(4);
  low.writeUInt16LE(flags & 0xffff); high.writeUInt16LE(flags >>> 16); id.writeUInt32LE(thread);
  return Buffer.concat([Buffer.from([10]), str('8.0.0'), id, nonce.subarray(0, 8), Buffer.from([0]), low,
    Buffer.from([45]), Buffer.from([2, 0]), high, Buffer.from([21]), Buffer.alloc(10), nonce.subarray(8), Buffer.from([0]), str(plugin)]);
}
export class Peer {
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
export async function fake(handler: (peer: Peer, index: number) => Promise<void>, plugin = 'mysql_native_password') {
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
export const options = (port: number, pw = password) => ({ host: '127.0.0.1', port, database: 'test', user: 'u', password: pw, tls: 'disable' as const, allowInsecure: true });
export async function auth(peer: Peer, expected = native(password, nonce)): Promise<void> {
  const reply = (await peer.read()).data;
  const at = 32 + 2;
  assert.equal(reply.readUInt32LE(4), 64 * 1024 ** 2);
  assert.equal(reply.subarray(32, 34).toString(), 'u\0');
  assert.deepEqual(reply.subarray(at + 1, at + 1 + reply[at]), expected);
  peer.send(ok, 2);
}
export function col(name: string, type: number, flags = 0, charset = 45): Buffer {
  const fixed = Buffer.alloc(13); fixed[0] = 12; fixed.writeUInt16LE(charset, 1); fixed.writeUInt32LE(255, 3); fixed[7] = type; fixed.writeUInt16LE(flags, 8);
  return Buffer.concat([l(Buffer.from('def')), l(Buffer.from('test')), l(Buffer.from('t')), l(Buffer.from('t')),
    l(Buffer.from(name)), l(Buffer.from(name)), fixed]);
}
export function result(peer: Peer, names: [string, number, number?][], rows: Buffer[], binary = false): void {
  let seq = 1;
  peer.send(Buffer.from([names.length]), seq++);
  for (const [name, type, charset] of names) peer.send(col(name, type, 0, charset), seq++);
  peer.send(eof, seq++);
  for (const row of rows) peer.send(binary ? Buffer.concat([Buffer.from([0, 0]), row]) : row, seq++);
  peer.send(eof, seq);
}

