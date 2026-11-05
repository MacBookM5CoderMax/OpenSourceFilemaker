// `restore` replaces data and `test-scripts --skip` keeps scripts from running, yet both dropped a mistyped option
// or a missing value: `restore DIR SET --at` restored the whole set instead of a point in time, and
// `test-scripts DIR --skpi "*Upload*"` ran every script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

test('restore refuses an option it does not know, a missing value and a word too many before it replaces anything', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-restore-opts-'));
  const home = mkdtempSync(join(tmpdir(), 'tabularius-restore-opts-home-'));
  try {
    const live = join(dir, 'Test.openhbam.sqlite');
    createStore(live);
    const env = { ...process.env, TABULARIUS_HOME: home };
    const run = (...args: string[]) => runCli(main, args, { env });
    const made = await run('backup', dir, '--to', join(dir, 'Backups'));
    assert.equal(made.status, 0, made.stderr);
    const [set] = readdirSync(join(dir, 'Backups'));
    const before = sha(live);
    const refused: Array<[string[], RegExp]> = [
      [['restore', dir, set, 'Test', '--at'], /^error: restore: --at needs a value after it$/m],
      [['restore', dir, set, '--from'], /^error: restore: --from needs a value after it$/m],
      [['restore', dir, '--at', '2026-01-01', '--from'], /^error: restore: --from needs a value after it$/m],
      [['restore', dir, set, '--s3-region'], /^error: restore: --s3-region needs a value after it$/m],
      [['restore', dir, set, 'Test', '--form', 'x'], /^error: restore: --form is not an option it knows; it takes --at TIME, /m],
      [['restore', dir, set, '--accept-account-change'], /^error: restore: --accept-account-change is not an option it knows; it takes /m],
      [['restore', dir, set, 'Test', 'extra'], /^error: restore: takes no "extra"; it takes <backup-set> \[database\]$/m],
      [['restore', dir, '--at', '2026-01-01', 'Test', 'extra'], /^error: restore: takes no "extra"; it takes --at TIME \[database\]$/m],
    ];
    const results = await Promise.all(refused.map(([args]) => run(...args)));
    for (const [i, [args, says]] of refused.entries()) {
      assert.ifError(results[i].error);
      assert.equal(results[i].status, 1, args.join(' '));
      assert.doesNotMatch(results[i].stdout, /restored/, args.join(' '));
      assert.match(results[i].stderr, says, args.join(' '));
    }
    assert.equal(sha(live), before, 'a refused restore left the live file as it was');
    // The spelling the usage shows still restores.
    const fine = await run('restore', dir, set, 'Test', '--accept-account-changes');
    assert.equal(fine.status, 0, fine.stderr);
    assert.match(fine.stdout, /^restored Test\.openhbam\.sqlite$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test('test-scripts refuses an option it does not know, a missing value and a second database', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-test-scripts-opts-'));
  const home = mkdtempSync(join(tmpdir(), 'tabularius-test-scripts-opts-home-'));
  try {
    createStore(join(dir, 'Test.openhbam.sqlite'));
    const env = { ...process.env, TABULARIUS_HOME: home };
    const run = (...args: string[]) => runCli(main, args, { env });
    const refused: Array<[string[], RegExp]> = [
      [['test-scripts', dir, 'Test', '--skpi', '*Upload*'], /^error: test-scripts: --skpi is not an option it knows; it takes --script, --skip, /m],
      [['test-scripts', dir, 'Test', '--test-outbond'], /^error: test-scripts: --test-outbond is not an option it knows; it takes /m],
      [['test-scripts', dir, 'Test', '--skip'], /^error: test-scripts: --skip needs a value after it$/m],
      [['test-scripts', dir, 'Test', '--skip', 'A*', '--skip'], /^error: test-scripts: --skip needs a value after it$/m],
      [['test-scripts', dir, 'Test', '--script'], /^error: test-scripts: --script needs a value after it$/m],
      [['test-scripts', dir, 'Test', '--global'], /^error: test-scripts: --global needs a value after it$/m],
      [['test-scripts', dir, 'Test', '--function', '--show'], /^error: test-scripts: --function needs a value after it$/m],
      [['test-scripts', dir, 'Test', '--test-outbound', '--mail-redirect'], /^error: test-scripts: --mail-redirect needs a value after it$/m],
      [['test-scripts', dir, 'Test', 'Other'], /^error: test-scripts: takes one database at most, not "Other"$/m],
    ];
    const results = await Promise.all(refused.map(([args]) => run(...args)));
    for (const [i, [args, says]] of refused.entries()) {
      assert.ifError(results[i].error);
      assert.equal(results[i].status, 1, args.join(' '));
      assert.equal(results[i].stdout, '', args.join(' '));
      assert.match(results[i].stderr, says, args.join(' '));
    }
    // What the usage shows still runs.
    const fine = await Promise.all([
      run('test-scripts', dir, 'Test', '--json', '--timeout', '5'),
      run('test-scripts', dir, '--global', '$$A=1', '--lint'),
      run('test-scripts', dir, 'Test', '--script', 'None', '--function', 'F', '--show'),
    ]);
    for (const [i, r] of fine.entries()) {
      assert.ifError(r.error);
      assert.doesNotMatch(r.stderr, /not an option it knows|needs a value|takes one database/, `known options case ${i}: ${r.stderr}`);
    }
    assert.equal(fine[0].status, 0, fine[0].stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});
