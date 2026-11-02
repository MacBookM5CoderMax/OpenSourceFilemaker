// Every key and certificate is generated locally; no operator-supplied TLS path is involved.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, linkSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localCertificate } from '../src/local-tls.ts';
import { readTlsPair, writeTlsPair } from '../src/tls-pair.ts';

const skip = process.platform === 'win32' && 'POSIX ownership and mode bits are not enforced on Windows';
function folder(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-tls-pair-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const attacks = ['hard link', 'symlink', 'group writable', 'world writable', 'group readable', 'world readable'] as const;
for (const part of ['current', 'pem', 'crt', 'key', 'ca.key'] as const) {
  for (const attack of attacks) {
    const secret = ['pem', 'key', 'ca.key'].includes(part);
    if (!secret && attack.endsWith('readable')) continue;
    test(`server TLS ${part} refuses ${attack}`, {
      skip: attack === 'hard link' ? false : attack === 'symlink'
        ? process.platform === 'win32' && 'links need privileges on Windows' : skip,
    }, (t) => {
      const dir = folder(t), base = join(dir, 'pair');
      const pair = localCertificate(dir, ['localhost']);
      let file: string;
      if (part === 'ca.key') file = join(dir, '.openhbam-tls', 'local', 'ca.key');
      else if (part === 'crt' || part === 'key') {
        writeFileSync(base + '.crt', pair.cert, { mode: 0o600 });
        writeFileSync(base + '.key', pair.key, { mode: 0o600 });
        file = base + '.' + part;
      } else {
        const pem = writeTlsPair(base, pair);
        file = part === 'pem' ? pem : base + '.current';
      }
      if (part === 'ca.key') assert.equal(localCertificate(dir, ['localhost']).renewed, false);
      else assert.equal(readTlsPair(base)?.key, pair.key, 'a private, single-link pair works');
      const before = readFileSync(file, 'utf8');
      if (attack === 'hard link') linkSync(file, file + '-alias');
      else if (attack === 'symlink') { renameSync(file, file + '-alias'); symlinkSync(file + '-alias', file); }
      else chmodSync(file, { 'group writable': 0o620, 'world writable': 0o602, 'group readable': 0o640, 'world readable': 0o604 }[attack]);
      if (part === 'ca.key') assert.throws(() => localCertificate(dir, ['localhost']), { code: 'ESTALE' });
      else assert.equal(readTlsPair(base), undefined);
      assert.equal(readFileSync(file, 'utf8'), before);
    });
  }
}

test('public TLS files allow shared reads, while keys remain private', { skip }, (t) => {
  const dir = folder(t), base = join(dir, 'pair');
  const pair = localCertificate(dir, ['localhost']);
  writeTlsPair(base, pair);
  chmodSync(base + '.current', 0o644);
  assert.equal(readTlsPair(base)?.key, pair.key);
  rmSync(base + '.current');
  writeFileSync(base + '.crt', pair.cert, { mode: 0o644 });
  writeFileSync(base + '.key', pair.key, { mode: 0o600 });
  assert.equal(readTlsPair(base)?.key, pair.key);
});

test('a dangling TLS pointer does not fall back to an earlier pair', {
  skip: process.platform === 'win32' && 'links need privileges on Windows',
}, (t) => {
  const dir = folder(t), base = join(dir, 'pair');
  const pair = localCertificate(dir, ['localhost']);
  writeFileSync(base + '.crt', pair.cert, { mode: 0o600 });
  writeFileSync(base + '.key', pair.key, { mode: 0o600 });
  assert.equal(readTlsPair(base)?.key, pair.key);
  symlinkSync(join(dir, 'missing'), base + '.current');
  assert.equal(readTlsPair(base), undefined);
});
