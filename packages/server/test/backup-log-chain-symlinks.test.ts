import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../../store/src/index.ts';
import { backupFolder, restorePoint } from '../src/backup.ts';
import { logInventory, scanLogs } from '../src/backup-log-chain.ts';
import { verifySet } from '../src/backup-verify.ts';
import { startLog, writeLog } from '../src/logs.ts';

const FILE = 'A.openhbam.sqlite';
const LOG = '2026-01-01_000000.000Z.log';

async function set(t: { after(fn: () => void): void }) {
  const root = mkdtempSync(join(tmpdir(), 'tabularius-log-links-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const live = join(root, 'live');
  mkdirSync(live);
  createStore(join(live, FILE));
  const dest = join(root, 'sets');
  const backup = (await backupFolder(live, dest, 0, '')).dir;
  return { root, dest, backup };
}

function makeLog(folder: string): string {
  mkdirSync(folder, { recursive: true });
  const path = join(folder, LOG);
  writeLog(startLog(path), { at: Date.now() + 60_000, seq: 0, data: Buffer.from('synthetic log') });
  return path;
}

test('a linked database log folder is not scanned, inventoried, restored or verified as ordinary', async (t) => {
  const s = await set(t);
  assert.equal((await verifySet(s.backup, '')).ok, true, 'ordinary set verifies');
  const outside = join(s.root, 'outside');
  makeLog(outside);
  const progressive = join(s.backup, 'progressive');
  mkdirSync(progressive);
  const linked = join(progressive, 'A');
  symlinkSync(outside, linked, 'dir');
  assert.deepEqual(scanLogs(linked), { records: [], legacy: [], plain: [] });
  assert.deepEqual(logInventory(s.backup), {});
  assert.deepEqual(restorePoint(s.dest, FILE, Date.now() + 120_000)?.logs, []);
  const check = await verifySet(s.backup, '');
  assert.equal(check.ok, false);
  assert.match(check.files['progressive/A'], /symbolic link/);
});

test('a linked log file is not scanned, inventoried, restored or verified as ordinary', async (t) => {
  const s = await set(t);
  const outside = makeLog(join(s.root, 'outside'));
  const logDir = join(s.backup, 'progressive', 'A');
  mkdirSync(logDir, { recursive: true });
  symlinkSync(outside, join(logDir, LOG));
  assert.deepEqual(scanLogs(logDir), { records: [], legacy: [], plain: [] });
  assert.deepEqual(logInventory(s.backup), {});
  assert.deepEqual(restorePoint(s.dest, FILE, Date.now() + 120_000)?.logs, []);
  const check = await verifySet(s.backup, '');
  assert.equal(check.ok, false);
  assert.match(check.files[`progressive/A/${LOG}`], /symbolic link/);
  rmSync(join(logDir, LOG));
  makeLog(logDir);
  const ordinary = scanLogs(logDir);
  assert.equal(ordinary.records.length, 1);
  assert.deepEqual(logInventory(s.backup).A, ordinary.records[0].chain);
  assert.equal(restorePoint(s.dest, FILE, Date.now() + 120_000)?.logs.length, 1);
  assert.equal((await verifySet(s.backup, '')).ok, true);
});

test('a linked progressive folder is not scanned or inventoried and fails verification', async (t) => {
  const s = await set(t);
  const outside = join(s.root, 'outside');
  makeLog(join(outside, 'A'));
  symlinkSync(outside, join(s.backup, 'progressive'), 'dir');
  assert.deepEqual(scanLogs(join(s.backup, 'progressive', 'A')), { records: [], legacy: [], plain: [] });
  assert.deepEqual(logInventory(s.backup), {});
  assert.deepEqual(restorePoint(s.dest, FILE, Date.now() + 120_000)?.logs, []);
  const check = await verifySet(s.backup, '');
  assert.equal(check.ok, false);
  assert.match(check.files.progressive, /symbolic link/);
});
