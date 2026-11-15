// Scripted TDS protocol peer; unverified against a real server.
import type { TestContext } from 'node:test';
import { createServer, type Socket } from 'node:net';

export function packet(type: number, body: Buffer, end = true, id = 1): Buffer {
  const h = Buffer.from([type, end ? 1 : 0, 0, 0, 0, 0, id, 0]);
  h.writeUInt16BE(body.length + 8, 2);
  return Buffer.concat([h, body]);
}
export function prelogin(encryption: number): Buffer {
  return Buffer.from([1, 0, 6, 0, 1, 255, encryption]);
}
export function done(status = 0, rows = 0n, token = 0xfd): Buffer {
  const b = Buffer.alloc(13); b[0] = token;
  b.writeUInt16LE(status, 1); b.writeBigUInt64LE(rows, 5);
  return b;
}
export function loginAck(): Buffer {
  // LOGINACK: interface, big-endian TDS version, B_VARCHAR program, version.
  return Buffer.from([0xad, 10, 0, 1, 0x74, 0, 0, 4, 0, 16, 0, 0, 0]);
}
export function messages(socket: Socket, fn: (type: number, body: Buffer) => void, inspect?: (type: number, length: number) => void): () => void {
  let pending = Buffer.alloc(0), parts: Buffer[] = [];
  const receive = (data: Buffer) => {
    pending = Buffer.concat([pending, data]);
    while (pending.length >= 8) {
      const length = pending.readUInt16BE(2);
      if (pending.length < length) return;
      const type = pending[0], end = pending[1] & 1;
      inspect?.(type, length);
      parts.push(pending.subarray(8, length)); pending = pending.subarray(length);
      if (end) { const body = Buffer.concat(parts); parts = []; fn(type, body); }
    }
  };
  socket.on('data', receive);
  return () => socket.off('data', receive);
}
export async function fake(t: TestContext, handler: (socket: Socket) => void): Promise<number> {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket); socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket)); handler(socket);
  });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  return (server.address() as { port: number }).port;
}
export function u16(n: number): Buffer { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
export function u32(n: number): Buffer { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
export function text(s: string): Buffer { return Buffer.from(s, 'utf16le'); }
export function env(kind: number, next: Buffer, old: Buffer, unicode = false): Buffer {
  const body = Buffer.concat([Buffer.from([kind, next.length / (unicode ? 2 : 1)]), next,
    Buffer.from([old.length / (unicode ? 2 : 1)]), old]);
  return Buffer.concat([Buffer.from([0xe3]), u16(body.length), body]);
}
export function metadata(columns: { id: number; info?: Buffer; name?: string }[]): Buffer {
  return Buffer.concat([Buffer.from([0x81]), u16(columns.length), ...columns.map((col, i) => {
    const name = col.name ?? `c${i}`;
    return Buffer.concat([Buffer.alloc(6), Buffer.from([col.id]), col.info ?? Buffer.alloc(0), Buffer.from([name.length]), text(name)]);
  })]);
}
