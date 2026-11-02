// A mistyped option on a read command must stop the command, not run it without the option: `records ... --limt 3`
// printed every record, `audit ... --acount Ann` printed every account's history.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');

test('a leftover option, or an option with no value, is refused by info, schema, records and audit', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-stray-'));
  try {
    createStore(join(dir, 'Test.openhbam.sqlite'));
    const store = new Store(join(dir, 'Test.openhbam.sqlite'));
    store.auditSignIn('Ann', 'local', true);
    store.close();
    const run = (...args: string[]) => runCli(main, args);
    const refused: Array<[string[], RegExp]> = [
      [['info', dir, 'Test', '--verbose'], /^error: info: --verbose is not an option it knows and takes none$/m],
      [['schema', dir, 'Test', '--jsno'], /^error: schema: --jsno is not an option it knows; it takes --json$/m],
      [['records', dir, 'Test', 'Nope', '--limt', '3'], /^error: records: --limt is not an option it knows; it takes --limit N and --format jsonl\|csv$/m],
      [['records', dir, 'Test', '--limt', '3', 'Nope'], /^error: records: --limt is not an option it knows/m],
      [['records', dir, 'Test', 'Nope', '--limit'], /^error: --limit needs a value after it$/m],
      [['records', dir, 'Test', 'Nope', '--format'], /^error: records: --format needs a value after it$/m],
      [['audit', dir, 'Test', '--acount', 'Ann'], /^error: audit: --acount is not an option it knows; it takes --table T/m],
      [['audit', dir, 'Test', '--since'], /^error: audit: --since needs a value after it$/m],
      [['audit', dir, 'Test', '--account', '--limit', '2'], /^error: audit: --account needs a value after it$/m],
      [['audit', dir, 'Test', '--limit'], /^error: audit: --limit needs a value after it$/m],
    ];
    const results = await Promise.all(refused.map(([args]) => run(...args)));
    results.forEach((r, i) => {
      assert.notEqual(r.status, 0, refused[i][0].join(' '));
      assert.equal(r.stdout, '', refused[i][0].join(' '));
      assert.match(r.stderr, refused[i][1], refused[i][0].join(' '));
    });
    // The same commands with the options spelled right still run.
    const [info, schema, audit, limited] = await Promise.all([
      run('info', dir, 'Test'),
      run('schema', dir, 'Test', '--json'),
      run('audit', dir, 'Test', '--account', 'Ann', '--limit', '5'),
      run('audit', dir, 'Test', '--limit', '1'),
    ]);
    for (const r of [info, schema, audit, limited]) assert.equal(r.status, 0, r.stderr);
    assert.equal(limited.stdout.trim().split('\n').length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('report --json prints one JSON document for any number of files; backup, verify-backup and compact refuse a leftover option', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-stray-report-'));
  try {
    for (const name of ['One', 'Two']) createStore(join(dir, `${name}.openhbam.sqlite`));
    const run = (...args: string[]) => runCli(main, args);
    const [both, one, text, named] = await Promise.all([
      run('report', dir, '--json'),
      run('report', dir, 'Two', '--json'),
      run('report', dir),
      run('report', dir, '--json', 'One'),
    ]);
    for (const r of [both, one, text, named]) assert.equal(r.status, 0, r.stderr);
    const list = JSON.parse(both.stdout) as Array<{ database: string }>;
    assert.deepEqual(list.map((r) => r.database), ['One', 'Two']);
    assert.equal((JSON.parse(one.stdout) as { database: string }).database, 'Two');
    assert.equal((JSON.parse(named.stdout) as { database: string }).database, 'One');
    assert.equal(text.stdout.match(/^# Conversion report: /gm)?.length, 2);

    const refused: Array<[string[], RegExp]> = [
      [['report', dir, '--jsno'], /^error: report: --jsno is not an option it knows; it takes --json$/m],
      [['compact', dir, '--jsno'], /^error: compact: --jsno is not an option it knows; it takes --json$/m],
      [['backup', dir, '--too', join(dir, 'b')], /^error: backup: --too is not an option it knows; it takes --to DIR and --keep N$/m],
      [['verify-backup', dir, '--sing'], /^error: verify-backup: --sing is not an option it knows; it takes --from DIR and --sign$/m],
    ];
    const results = await Promise.all(refused.map(([args]) => run(...args)));
    results.forEach((r, i) => {
      assert.notEqual(r.status, 0, refused[i][0].join(' '));
      assert.equal(r.stdout, '', refused[i][0].join(' '));
      assert.match(r.stderr, refused[i][1], refused[i][0].join(' '));
    });
    assert.deepEqual(existsSync(join(dir, 'Backups')), false, 'a refused backup makes no backup');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
