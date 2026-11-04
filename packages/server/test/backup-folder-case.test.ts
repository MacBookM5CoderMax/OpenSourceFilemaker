// The backup folder may not be the hosted folder or sit inside its container folders (whose files a backup already holds).
// Windows (and, usually, macOS) treats two paths that differ only in case as one folder, so the check must too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupFolderProblem, checkBackupFolder } from '../src/backup-folder.ts';

function hosted(t: { after: (fn: () => void) => void }): { root: string; live: string } {
  const root = mkdtempSync(join(tmpdir(), 'tabularius-backup-case-'));
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 10 }));
  const live = join(root, 'Hosted');
  mkdirSync(join(live, 'Files'), { recursive: true });
  mkdirSync(join(live, 'RC_Data_FMS'));
  return { root, live };
}

test('a backup folder that is the hosted folder or inside its container folders is refused in another case on Windows and macOS', (t) => {
  const { root, live } = hosted(t);
  const same = join(root, 'hosted');
  const files = join(root, 'HOSTED', 'files', 'Backups');
  const containers = join(root, 'hosted', 'rc_data_fms');
  for (const platform of ['win32', 'darwin'] as const) {
    assert.throws(() => checkBackupFolder(same, live, platform), /can't be the hosted folder itself/, `${platform}: ${same}`);
    assert.match(backupFolderProblem(same, live, platform)!, /can't be the hosted folder itself/);
    assert.throws(() => checkBackupFolder(files, live, platform), /can't be inside .*Files/, `${platform}: ${files}`);
    assert.match(backupFolderProblem(files, live, platform)!, /can't be inside/);
    assert.throws(() => checkBackupFolder(containers, live, platform), /can't be inside .*RC_Data_FMS/, `${platform}: ${containers}`);
    assert.match(backupFolderProblem(containers, live, platform)!, /can't be inside/);
  }
  assert.equal(existsSync(files), false, 'a refused folder is not made');
  // On a case-insensitive disk HOSTED already names Hosted; neither spelling may gain any entries.
  assert.deepEqual(readdirSync(root), ['Hosted']);
  assert.deepEqual(readdirSync(live).sort(), ['Files', 'RC_Data_FMS']);
});

test('on a system where case matters a folder that differs only in case is another folder, and a sibling that starts alike is never inside', (t) => {
  const { root, live } = hosted(t);
  // Use a missing parent to exercise Linux comparisons even on a case-insensitive test disk.
  const missing = join(root, 'case-sensitive');
  const linuxLive = join(missing, 'Hosted');
  assert.match(backupFolderProblem(join(missing, 'hosted'), linuxLive, 'linux')!, /isn't there/);
  assert.match(backupFolderProblem(join(missing, 'HOSTED', 'files'), linuxLive, 'linux')!, /isn't there/);
  // Everywhere: Files2 is not Files, and a backup folder beside the hosted folder is fine.
  for (const platform of ['linux', 'win32', 'darwin'] as const) {
    assert.match(backupFolderProblem(join(live, 'Files2'), live, platform)!, /isn't there/, platform);
    assert.match(backupFolderProblem(join(root, 'hosted-backups'), live, platform)!, /isn't there/, platform);
  }
  // The exact spelling is still refused everywhere.
  for (const platform of ['linux', 'win32', 'darwin'] as const) {
    assert.match(backupFolderProblem(live, live, platform)!, /can't be the hosted folder itself/, platform);
    assert.match(backupFolderProblem(join(live, 'Files', 'x'), live, platform)!, /can't be inside/, platform);
  }
});
