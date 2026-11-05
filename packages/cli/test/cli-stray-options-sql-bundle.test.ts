// `reconvert DIR DB --dryrun` converted the file for real, `export-sql --account` with no name exported everything the
// account filter was meant to hold back, `export-sql --dialct sqlite` wrote the other dialect and a mistyped
// `exit-bundle --discrad` wrote the whole file in plaintext. Each now refuses before it touches anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');

test('reconvert, export-sql and exit-bundle refuse an option they do not know, a missing value and a second database', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-stray-sql-'));
  const home = mkdtempSync(join(tmpdir(), 'tabularius-stray-sql-home-'));
  try {
    createStore(join(dir, 'Test.openhbam.sqlite'));
    const before = readdirSync(dir).sort();
    const env = { ...process.env, TABULARIUS_HOME: home };
    const run = (...args: string[]) => runCli(main, args, { env });
    const sql = join(dir, 'out.sql');
    const refused: Array<[string[], RegExp]> = [
      [['reconvert', dir, 'Test', '--dryrun'], /^error: reconvert: --dryrun is not an option it knows; it takes --all, --dry-run, --same-file and --force$/m],
      [['reconvert', dir, '--all', '--same-fil'], /^error: reconvert: --same-fil is not an option it knows; it takes /m],
      [['reconvert', dir, 'Test', 'Other'], /^error: reconvert: takes one database, not "Other"$/m],
      [['export-sql', dir, 'Test', '--out', sql, '--account'], /^error: export-sql: --account needs a value after it$/m],
      [['export-sql', dir, 'Test', '--out'], /^error: export-sql: --out needs a value after it$/m],
      [['export-sql', dir, 'Test', '--out', sql, '--dialect'], /^error: export-sql: --dialect needs a value after it$/m],
      [['export-sql', dir, 'Test', '--out', sql, '--dialct', 'sqlite'], /^error: export-sql: --dialct is not an option it knows; it takes --out FILE, --dialect postgres\|sqlite and --account A$/m],
      [['export-sql', dir, 'Test', 'Other', '--out', sql], /^error: export-sql: takes one database, not "Other"$/m],
      [['exit-bundle', dir, 'Test', '--out', join(dir, 'bundle'), '--discrad'], /^error: exit-bundle: --discrad is not an option it knows; it takes --out FOLDER, --account A and --discard$/m],
      [['exit-bundle', dir, 'Test', '--out', join(dir, 'bundle'), '--account'], /^error: exit-bundle: --account needs a value after it$/m],
      [['exit-bundle', dir, 'Test', 'Other', '--out', join(dir, 'bundle'), '--account', 'A'], /^error: exit-bundle: takes one database, not "Other"$/m],
    ];
    const results = await Promise.all(refused.map(([args]) => run(...args)));
    for (const [i, [args, says]] of refused.entries()) {
      assert.ifError(results[i].error);
      assert.equal(results[i].status, 1, args.join(' '));
      assert.equal(results[i].stdout, '', args.join(' '));
      assert.match(results[i].stderr, says, args.join(' '));
    }
    assert.deepEqual(readdirSync(dir).sort(), before, 'a refused command wrote nothing next to the database');
    // What the usage shows still works.
    const fine = await run('export-sql', dir, 'Test', '--out', sql, '--dialect', 'sqlite');
    assert.equal(fine.status, 0, fine.stderr);
    assert.equal(existsSync(sql), true);
    const dry = await run('reconvert', dir, 'Test', '--dry-run');
    assert.doesNotMatch(dry.stderr, /not an option it knows|takes one database/);
    const bundle = await run('exit-bundle', dir, 'Test', '--out', join(dir, 'bundle'));
    assert.match(bundle.stderr, /^error: exit-bundle: give --account /m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});
