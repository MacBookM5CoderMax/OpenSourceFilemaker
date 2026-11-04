// sameFile: two names for one file (a hard link here; a name in another case on a disk that ignores case) are one file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sameFile } from '../src/portable-path.ts';

test('sameFile compares what the names reach, not the names', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-same-file-'));
  try {
    writeFileSync(join(dir, 'a.txt'), 'one');
    writeFileSync(join(dir, 'c.txt'), 'one');
    linkSync(join(dir, 'a.txt'), join(dir, 'b.txt'));
    assert.equal(sameFile(join(dir, 'a.txt'), join(dir, 'a.txt')), true);
    assert.equal(sameFile(join(dir, 'a.txt'), join(dir, 'b.txt')), true);
    assert.equal(sameFile(join(dir, 'b.txt'), join(dir, 'a.txt')), true);
    // The same bytes in another file are not the same file.
    assert.equal(sameFile(join(dir, 'a.txt'), join(dir, 'c.txt')), false);
    // A name that is not there is the same only as itself.
    assert.equal(sameFile(join(dir, 'a.txt'), join(dir, 'missing.txt')), false);
    assert.equal(sameFile(join(dir, 'missing.txt'), join(dir, 'a.txt')), false);
    assert.equal(sameFile(join(dir, 'missing.txt'), join(dir, 'other-missing.txt')), false);
    assert.equal(sameFile(join(dir, 'missing.txt'), join(dir, 'missing.txt')), true);
    // A folder and a file.
    assert.equal(sameFile(dir, join(dir, 'a.txt')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
