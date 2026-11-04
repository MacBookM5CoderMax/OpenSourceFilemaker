// The admin console's list of backup sets is read while a set may still be worked on: its check opens the copy, which
// makes a -wal file and removes it again. A file that vanishes between the folder listing and its size being read must
// not turn the whole status answer into a 500 (it did, on a macOS CI runner: "ENOENT ... stat ...sqlite-wal").
import assert from 'node:assert/strict';
import fs, { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BackupStatusCache } from '../src/admin.ts';

test('a file that vanishes while a backup set is read is left out, not an error', (t) => {
  const dest = mkdtempSync(join(tmpdir(), 'tabularius-backup-cache-'));
  t.after(() => rmSync(dest, { recursive: true, force: true }));
  const set = join(dest, '2026-01-02_030405');
  mkdirSync(join(set, 'inner'), { recursive: true });
  writeFileSync(join(set, 'a.sqlite'), 'abcd');
  writeFileSync(join(set, 'a.sqlite-wal'), 'wal');
  writeFileSync(join(set, 'inner', 'b.bin'), 'xy');
  const real = fs.statSync;
  const gone = Object.assign(new Error("ENOENT: no such file or directory, stat 'x'"), { code: 'ENOENT' });
  t.mock.method(fs, 'statSync', ((path: string, ...rest: unknown[]) => {
    if (String(path).endsWith('-wal')) throw gone;
    return (real as (...a: unknown[]) => unknown)(path, ...rest);
  }) as typeof fs.statSync);
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  const sets = new BackupStatusCache().read(dest);
  assert.equal(sets.length, 1);
  assert.equal(sets[0].bytes, 4 + 2, 'the files that are there are counted');
});

test('another kind of error is still an error', (t) => {
  const dest = mkdtempSync(join(tmpdir(), 'tabularius-backup-cache-'));
  t.after(() => rmSync(dest, { recursive: true, force: true }));
  mkdirSync(join(dest, '2026-01-02_030405'));
  writeFileSync(join(dest, '2026-01-02_030405', 'a.sqlite'), 'abcd');
  const real = fs.statSync;
  t.mock.method(fs, 'statSync', ((path: string, ...rest: unknown[]) => {
    if (String(path).endsWith('a.sqlite')) throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    return (real as (...a: unknown[]) => unknown)(path, ...rest);
  }) as typeof fs.statSync);
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => new BackupStatusCache().read(dest), /EACCES/);
});
