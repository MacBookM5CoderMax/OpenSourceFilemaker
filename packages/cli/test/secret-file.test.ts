import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSecretFile } from '../src/secret-file.ts';

const posix = process.platform === 'win32' ? { skip: 'file modes' } : {};

test('a private token file is trimmed, including a trailing newline', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-secret-file-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'token');
  writeFileSync(file, '  correct-horse-battery  \n', { mode: 0o600 });
  assert.equal(readSecretFile(file, '--mcp-token-file'), 'correct-horse-battery');
});

test('a file readable by others is refused without revealing its contents', posix, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-secret-file-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'token');
  const secret = 'correct-horse-battery';
  writeFileSync(file, secret);
  chmodSync(file, 0o644);
  assert.throws(() => readSecretFile(file, '--mcp-token-file'), (e: Error) => e.message.includes(`chmod 600 ${file}`) && !e.message.includes(secret));
});

test('missing, empty, whitespace-only, directory, and multiline token files are refused', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-secret-file-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'token');
  assert.throws(() => readSecretFile(file, '--mcp-token-file'), (e: Error) => e.message === `serve: --mcp-token-file ${file} does not exist`);
  writeFileSync(file, '', { mode: 0o600 });
  assert.throws(() => readSecretFile(file, '--mcp-token-file'), /is empty/);
  writeFileSync(file, '  \n\t  ');
  assert.throws(() => readSecretFile(file, '--mcp-token-file'), /is empty/);
  const folder = join(dir, 'folder');
  mkdirSync(folder);
  assert.throws(() => readSecretFile(folder, '--mcp-token-file'), /regular file/);
  const secret = 'correct-horse-battery';
  writeFileSync(file, `${secret}\nsecond-line`);
  assert.throws(() => readSecretFile(file, '--mcp-token-file'), (e: Error) => /one line/.test(e.message) && !e.message.includes(secret) && !e.message.includes('second-line'));
});

test('a symlink to a private regular file is followed, as the AI key reader does', { skip: process.platform === 'win32' ? 'creating symlinks requires Windows privileges' : false }, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-secret-file-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const target = join(dir, 'target');
  const link = join(dir, 'link');
  writeFileSync(target, 'correct-horse-battery\n', { mode: 0o600 });
  symlinkSync(target, link);
  assert.equal(readSecretFile(link, '--token-file'), 'correct-horse-battery');
});

test('a token file saved as UTF-16 or a legacy code page is refused by name, and a UTF-8 file with a byte order mark and Windows line ends is read', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-secret-file-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'token');
  const secret = ['correct', 'horse', 'battery'].join('-');
  const save = (bytes: Buffer) => { writeFileSync(file, bytes, { mode: 0o600 }); chmodSync(file, 0o600); };
  const utf16 = (text: string) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  const refusal = (e: Error) => /is not plain UTF-8 text/.test(e.message) && e.message.includes(file) && /save it again as UTF-8/.test(e.message) && !e.message.includes(secret) && !e.message.includes(secret.slice(0, 7));
  // Windows PowerShell `>` and Out-File: UTF-16 with a byte order mark, with or without the final line end.
  for (const bytes of [utf16(secret), utf16(secret + '\r\n'), Buffer.from(secret, 'utf16le'), Buffer.from([0xfe, 0xff, 0, 0x61])]) {
    save(bytes);
    assert.throws(() => readSecretFile(file, '--mcp-token-file'), refusal, bytes.toString('hex'));
  }
  // A code page other than UTF-8 (a byte that is not UTF-8) and a NUL inside the text.
  save(Buffer.concat([Buffer.from(secret), Buffer.from([0xe9])]));
  assert.throws(() => readSecretFile(file, '--token-file'), (e: Error) => /^standby: .* is not plain UTF-8 text/.test(e.message));
  save(Buffer.from(`${secret}\0`));
  assert.throws(() => readSecretFile(file, '--mcp-token-file'), refusal);
  // What Notepad writes: UTF-8, a byte order mark, Windows line ends.
  save(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`${secret}\r\n`)]));
  assert.equal(readSecretFile(file, '--mcp-token-file'), secret);
  save(Buffer.from('tökén-ünïcode\n'));
  assert.equal(readSecretFile(file, '--mcp-token-file'), 'tökén-ünïcode');
});
