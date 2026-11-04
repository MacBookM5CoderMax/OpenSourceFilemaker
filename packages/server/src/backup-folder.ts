import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';

export class BackupFolderError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** The path with symlinks followed as far as it exists (a folder not made yet is judged by the nearest one that is). */
function realish(path: string): string {
  const rest: string[] = [];
  let at = resolve(path);
  for (;;) {
    try {
      return join(realpathSync(at), ...rest.reverse());
    } catch {
      const up = dirname(at);
      if (up === at) return resolve(path);
      rest.push(basename(at));
      at = up;
    }
  }
}

/** The destination rules alone, answered without touching the disk beyond looking: is it a full path, and not the hosted files themselves. */
function checkBackupRules(folder: string, hosted: string, platform: NodeJS.Platform = process.platform): string {
  if (!isAbsolute(folder)) throw new BackupFolderError('the backup folder is a full path, like /Volumes/Backup/tabularius');
  const at = resolve(folder);
  const real = realish(at);
  const home = realish(hosted);
  // Windows folders (and a Mac's usually) are the same folder in any case, and resolving links does not change the case a path was written in.
  const fold = platform === 'win32' || platform === 'darwin' ? (p: string) => p.toLowerCase() : (p: string) => p;
  if (fold(real) === fold(home)) throw new BackupFolderError("the backup folder can't be the hosted folder itself: pick another, or one inside it");
  for (const inner of ['Files', 'RC_Data_FMS']) {
    const guarded = join(home, inner);
    if (fold(real) === fold(guarded) || fold(real).startsWith(fold(guarded) + sep)) throw new BackupFolderError(`the backup folder can't be inside ${join(hosted, inner)}: its files are backed up`);
  }
  return at;
}

/** Whether a configured destination still looks usable, for listings: the rules, and that the folder is there. Never creates or writes anything. */
export function backupFolderProblem(folder: string, hosted: string, platform: NodeJS.Platform = process.platform): string | undefined {
  try {
    const at = checkBackupRules(folder, hosted, platform);
    if (!existsSync(at)) return `${folder} isn't there: is the drive connected?`;
    if (!statSync(at).isDirectory()) return `${folder} is a file, not a folder`;
    return undefined;
  } catch (e) {
    return e instanceof BackupFolderError ? e.message : `can't reach ${folder}: ${(e as NodeJS.ErrnoException).code ?? (e as Error).message}`;
  }
}

/** Apply the same destination rules wherever a backup destination is configured, and make sure it can be written to. */
export function checkBackupFolder(folder: string, hosted: string, platform: NodeJS.Platform = process.platform): string {
  const at = checkBackupRules(folder, hosted, platform);
  try {
    if (existsSync(at) && !statSync(at).isDirectory()) throw new BackupFolderError(`${folder} is a file, not a folder`);
    if (!existsSync(at)) {
      if (!existsSync(dirname(at))) throw new BackupFolderError(`${dirname(at)} isn't there: is the drive connected? Make the folder above it first`);
      mkdirSync(at);
    }
    const probe = join(at, `.openhbam-write-test-${randomBytes(6).toString('hex')}`);
    writeFileSync(probe, '', { flag: 'wx' });
    rmSync(probe, { force: true });
  } catch (e) {
    if (e instanceof BackupFolderError) throw e;
    throw new BackupFolderError(`can't write to ${folder}: ${(e as NodeJS.ErrnoException).code ?? (e as Error).message}`);
  }
  return at;
}
