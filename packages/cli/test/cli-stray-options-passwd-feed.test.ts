// A mistyped `passwd --must-chnage` set the password without making the person change it, and a mistyped
// `calendar-feed create --qeury` made a feed that shows every record the account can read. Each now refuses before it
// sets or makes anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Host, STORE_EXT } from '../../server/src/index.ts';
import { createStore } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');

test('passwd and calendar-feed refuse an option they do not know, a missing value and an extra word', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-stray-passwd-'));
  try {
    createStore(join(dir, 'Planner' + STORE_EXT), { mode: 'native' });
    const host = new Host(dir, () => {});
    const store = host.get('Planner')!;
    store.applyDesign([{ op: 'createTable', name: 'Events', fields: [{ name: 'Title' }, { name: 'Day', type: 'date' }] }]);
    store.savePrivilegeSet({ name: 'Planner', records: { view: true, edit: true, create: true, delete: true }, layouts: 'modifiable', valueLists: 'viewOnly', scripts: 'none', extendedPrivileges: ['fmrest'] });
    store.setPassword('ann', 'a-long-first-password', 'Planner');
    await host.close();

    const env = { ...process.env, TABULARIUS_PASSWORD: 'a-long-new-password' };
    const run = (...args: string[]) => runCli(main, args, { env });
    const feedBase = ['calendar-feed', dir, 'Planner', 'create', '--account', 'ann', '--layout', 'Events', '--start', 'Day'];
    const feedKnown = '--account A, --layout L, --start FIELD, --end F, --title F, --description F, --location F, --zone Z, --query JSON, --limit N, --label L, --expires-days N, --public-url URL and --json';
    const refused: Array<[string[], RegExp]> = [
      [['passwd', dir, 'Planner', 'ann', '--must-chnage'], /^error: passwd: --must-chnage is not an option it knows; it takes --privilege-set S and --must-change$/m],
      [['passwd', dir, 'Planner', 'ann', '--privilege-set'], /^error: passwd: --privilege-set needs a value after it$/m],
      [['passwd', dir, 'Planner', 'ann', 'bob'], /^error: passwd: takes a database and an account, not "bob"$/m],
      [[...feedBase, '--qeury', '[{"Title":"open"}]'], new RegExp(`^error: calendar-feed create: --qeury is not an option it knows; it takes ${feedKnown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm')],
      [[...feedBase, '--query'], /^error: calendar-feed create: --query needs a value after it$/m],
      [[...feedBase, '--limit'], /^error: calendar-feed create: --limit needs a value after it$/m],
      [[...feedBase, 'extra'], /^error: calendar-feed create: takes a database and "create", not "extra"$/m],
      [['calendar-feed', dir, 'Planner', 'list', '--jsno'], /^error: calendar-feed list: --jsno is not an option it knows; it takes --json$/m],
    ];
    const results = await Promise.all(refused.map(([args]) => run(...args)));
    for (const [i, [args, says]] of refused.entries()) {
      assert.ifError(results[i].error);
      assert.equal(results[i].status, 1, args.join(' '));
      assert.equal(results[i].stdout, '', args.join(' '));
      assert.match(results[i].stderr, says, args.join(' '));
    }
    assert.equal((await run('calendar-feed', dir, 'Planner', 'list', '--json')).stdout.trim(), '[]', 'a refused command made no feed');
    // What the usage shows still works.
    const set = await run('passwd', dir, 'Planner', 'ann', '--must-change');
    assert.equal(set.status, 0, set.stderr);
    assert.match(set.stdout, /password set for ann in Planner \(must change on next sign-in\)/);
    const made = await run(...feedBase, '--query', '[{"Title":"open"}]', '--json');
    assert.equal(made.status, 0, made.stderr);
    assert.match(made.stdout, /"address":/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
