// Night 5 made records, audit, backup and the other read commands refuse a mistyped option. These five did not:
// `upgrade --form ./bundle` upgraded from GitHub instead, `check-solution --fail-no error` kept the strict default,
// `sync-log --run` with no id printed every run, `stale-calcs --tabel T` and `script-tests --scirpt X` ran on everything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');

test('upgrade, sync-log, stale-calcs, check-solution, script-tests and fidelity refuse an option they do not know or a missing value', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-stray-more-'));
  const home = mkdtempSync(join(tmpdir(), 'tabularius-stray-more-home-'));
  try {
    createStore(join(dir, 'Test.openhbam.sqlite'));
    // An empty home: no installed service, and a refusal must come before anything is fetched or written there.
    const env = { ...process.env, TABULARIUS_HOME: home };
    const run = (...args: string[]) => runCli(main, args, { env });
    const refused: Array<[string[], RegExp]> = [
      [['upgrade', '--form', 'bundle'], /^error: upgrade: --form is not an option it knows; it takes --no-backup, --wait N and --from SOURCE$/m],
      [['upgrade', '--nobackup'], /^error: upgrade: --nobackup is not an option it knows; it takes --no-backup, --wait N and --from SOURCE$/m],
      [['upgrade', '--from'], /^error: upgrade: --from needs a value after it$/m],
      [['upgrade', '--no-backup', '--from'], /^error: upgrade: --from needs a value after it$/m],
      [['upgrade', 'now'], /^error: upgrade: takes no "now"; it takes --no-backup, --wait N and --from SOURCE$/m],
      [['sync-log', dir, 'Test', '--rnu', 'x'], /^error: sync-log: --rnu is not an option it knows; it takes --run ID, --limit N and --json$/m],
      [['sync-log', dir, 'Test', '--run'], /^error: sync-log: --run needs a value after it$/m],
      [['stale-calcs', dir, 'Test', '--tabel', 'T'], /^error: stale-calcs: --tabel is not an option it knows; it takes --table T, --n N and --json$/m],
      [['stale-calcs', dir, 'Test', '--table'], /^error: stale-calcs: --table needs a value after it$/m],
      [['check-solution', dir, 'Test', '--fail-no', 'error'], /^error: check-solution: --fail-no is not an option it knows; it takes --json, --account A and --fail-on error\|warning$/m],
      [['script-tests', dir, 'Test', '--scirpt', 'X'], /^error: script-tests: --scirpt is not an option it knows; it takes --script NAME and --json$/m],
      [['script-tests', dir, 'Test', '--script'], /^error: script-tests: --script needs a value after it$/m],
      [['fidelity', dir, 'Test', '--sqll'], /^error: fidelity: --sqll is not an option it knows; it takes --sql, --n N and --json$/m],
    ];
    const results = await Promise.all(refused.map(([args]) => run(...args)));
    for (const [i, [args, says]] of refused.entries()) {
      const r = results[i];
      assert.ifError(r.error);
      assert.equal(r.status, 1, args.join(' '));
      assert.equal(r.stdout, '', args.join(' '));
      assert.match(r.stderr, says, args.join(' '));
    }
    assert.deepEqual(readdirSync(home), [], 'a refused upgrade fetched or wrote nothing');
    assert.equal(existsSync(join(dir, 'Test.openhbam.sqlite')), true);
    // What they do know still works.
    const fine = await Promise.all([
      run('sync-log', dir, 'Test', '--limit', '5', '--json'),
      run('stale-calcs', dir, 'Test', '--n', '5', '--json'),
      run('check-solution', dir, 'Test', '--fail-on', 'error', '--json'),
      run('script-tests', dir, 'Test', '--json'),
      run('fidelity', dir, 'Test', '--n', '5', '--json'),
    ]);
    for (const [i, r] of fine.entries()) assert.notEqual(r.status, 1, `known options case ${i}: ${r.stderr}`);
    for (const [i, r] of fine.entries()) assert.doesNotMatch(r.stderr, /not an option it knows|needs a value/, `case ${i}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});
