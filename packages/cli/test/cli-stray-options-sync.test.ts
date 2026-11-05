// A mistyped `--capture-only` let sync-plan and sync-apply sync the file that was meant to be held back, and a
// mistyped `--write`, `--allow-deletes`, `--keep-related` or `--release` ran the sync without it. Each now refuses
// before the password is asked for or any connection is made.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STORE_EXT } from '../../server/src/index.ts';
import { createStore } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');

test('sync-plan and sync-apply refuse an option they do not know, a missing value and a second database', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-stray-sync-'));
  try {
    createStore(join(dir, 'Shop' + STORE_EXT));
    const tables = [{ localTable: 'Contacts', uuidField: 'uuid', modTimestampField: 'modts' }];
    const cfg = join(dir, 'sync.json');
    writeFileSync(cfg, JSON.stringify({ server: 'https://fms.invalid', database: 'Shop', user: 'sync', allowWrites: true, tables }));
    const before = readdirSync(dir).sort();
    const env = { ...process.env, TABULARIUS_FMS_PASSWORD: 'unused' };
    const run = (...args: string[]) => runCli(main, args, { env });
    const planKnown = '--config FILE, --user NAME, --insecure, --capture-only F[,F] and --json';
    const applyKnown = '--config FILE, --user NAME, --write, --pull, --containers, --resolve POLICY, --allow-deletes, --keep-related, --insecure, --capture-only F[,F], --release and --json';
    const refused: Array<[string[], RegExp]> = [
      [['sync-plan', dir, 'Shop', '--config', cfg, '--capture-onlyy', 'Shop'], new RegExp(`^error: sync-plan: --capture-onlyy is not an option it knows; it takes ${escape(planKnown)}$`, 'm')],
      [['sync-plan', dir, 'Shop', '--config', cfg, '--capture-only'], /^error: sync-plan: --capture-only needs a value after it$/m],
      [['sync-plan', dir, 'Shop', '--config', cfg, '--user'], /^error: sync-plan: --user needs a value after it$/m],
      [['sync-plan', dir, 'Shop', '--config'], /^error: sync-plan: --config needs a value after it$/m],
      [['sync-plan', dir, 'Shop', 'Other', '--config', cfg], /^error: sync-plan: takes one database, not "Other"$/m],
      [['sync-apply', dir, 'Shop', '--config', cfg, '--writ'], new RegExp(`^error: sync-apply: --writ is not an option it knows; it takes ${escape(applyKnown)}$`, 'm')],
      [['sync-apply', dir, 'Shop', '--config', cfg, '--capture-onl', 'Shop'], /^error: sync-apply: --capture-onl is not an option it knows; /m],
      [['sync-apply', dir, 'Shop', '--config', cfg, '--allow-delete'], /^error: sync-apply: --allow-delete is not an option it knows; /m],
      [['sync-apply', dir, 'Shop', '--config', cfg, '--write', '--capture-only'], /^error: sync-apply: --capture-only needs a value after it$/m],
      [['sync-apply', dir, 'Shop', '--config', cfg, '--write', '--resolve'], /^error: sync-apply: --resolve needs a value after it$/m],
      [['sync-apply', dir, 'Shop', '--config', cfg, '--user'], /^error: sync-apply: --user needs a value after it$/m],
      [['sync-apply', dir, 'Shop', 'Other', '--config', cfg], /^error: sync-apply: takes one database, not "Other"$/m],
    ];
    const results = await Promise.all(refused.map(([args]) => run(...args)));
    for (const [i, [args, says]] of refused.entries()) {
      assert.ifError(results[i].error);
      assert.equal(results[i].status, 1, args.join(' '));
      assert.equal(results[i].stdout, '', args.join(' '));
      assert.match(results[i].stderr, says, args.join(' '));
    }
    assert.deepEqual(readdirSync(dir).sort(), before, 'a refused command wrote nothing next to the database');
    // What the usage shows still works: a held file is refused by the hold, before any connection.
    for (const cmd of ['sync-plan', 'sync-apply']) {
      const held = await run(cmd, dir, 'Shop', '--config', cfg, '--capture-only', 'Shop');
      assert.equal(held.status, 1, held.stderr);
      assert.match(held.stderr, /"Shop" is capture-only: it never syncs/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
