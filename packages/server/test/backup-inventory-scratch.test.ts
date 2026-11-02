// A copy still being made under a scratch name must not stop a restore from the set, while a file nobody listed still does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupInventory, checkedBackupCopies } from '../src/backup-inventory.ts';

const FILE = 'Charts.openhbam.sqlite';
const SUM = 'a'.repeat(64);

function setFolder(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-inventory-scratch-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'backup.json'), JSON.stringify({ finished: { [FILE]: new Date(0).toISOString() }, sha256: { [FILE]: SUM } }));
  writeFileSync(join(dir, FILE), 'synthetic');
  return dir;
}

test('a copy made under its scratch name is not a problem for the set, plain or sealed', (t) => {
  const dir = setFolder(t);
  writeFileSync(join(dir, 'Other.openhbam.sqlite.adding'), 'partly written');
  writeFileSync(join(dir, 'Third.openhbam.sqlite.adding.enc'), 'partly sealed');
  assert.deepEqual(Object.keys(backupInventory(dir).problems), []);
  assert.deepEqual(checkedBackupCopies(dir), [FILE]);
  assert.deepEqual(checkedBackupCopies(dir, FILE), [FILE]);
});

test('a file nobody listed, or one that only ends like a scratch name, still stops the set', (t) => {
  const dir = setFolder(t);
  writeFileSync(join(dir, 'notes.txt'), 'planted');
  assert.match(String(backupInventory(dir).problems['notes.txt']), /not listed in the backup set/);
  assert.throws(() => checkedBackupCopies(dir, FILE), /notes\.txt: not listed in the backup set/);
  rmSync(join(dir, 'notes.txt'));
  writeFileSync(join(dir, 'x.adding'), 'not a database scratch name');
  assert.match(String(backupInventory(dir).problems['x.adding']), /not listed in the backup set/);
});
