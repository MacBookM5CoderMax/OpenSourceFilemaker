// docs/upgrading.md and CHANGELOG.md say what the command line now refuses and prints. Each claim is run against the
// program here, so a note that drifts from the command, or a command that changes without the note, fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const root = join(import.meta.dirname, '..', '..', '..');
const main = join(import.meta.dirname, '..', 'src', 'main.ts');
const upgrading = readFileSync(join(root, 'docs', 'upgrading.md'), 'utf8');
const changes = upgrading.slice(upgrading.indexOf('## Changes that can affect existing use'), upgrading.indexOf('## Stopping and restarting'));
const bullet = (start: string) => {
  const at = changes.indexOf(`- **${start}`);
  assert.ok(at >= 0, `docs/upgrading.md has no upgrade note that starts "${start}"`);
  const rest = changes.slice(at + 2);
  const next = rest.search(/\n- \*\*/);
  return next < 0 ? rest : rest.slice(0, next);
};

test('the upgrade note on refused options names every command that refuses one, and each of them does', async () => {
  const note = bullet('The command-line tools stop on an option they do not know');
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-upgrading-'));
  try {
    createStore(join(dir, 'Test.openhbam.sqlite'));
    const commands: Array<[string, string[]]> = [
      ['info', ['info', dir, 'Test', '--bogus']],
      ['schema', ['schema', dir, 'Test', '--bogus']],
      ['records', ['records', dir, 'Test', 'Nope', '--bogus']],
      ['report', ['report', dir, '--bogus']],
      ['compact', ['compact', dir, '--bogus']],
      ['backup', ['backup', dir, '--bogus']],
      ['verify-backup', ['verify-backup', dir, '--bogus']],
      ['audit', ['audit', dir, 'Test', '--bogus']],
    ];
    const results = [];
    for (const [, args] of commands) results.push(await runCli(main, args));
    results.forEach((r, i) => {
      const [name] = commands[i];
      assert.ok(note.includes(`\`${name}\``), `the note names ${name}`);
      assert.equal(r.status, 1, name);
      assert.equal(r.stdout, '', name);
      assert.match(r.stderr, new RegExp(`^error: ${name}: --bogus is not an option it knows`, 'm'), name);
    });
    assert.match(note, /needs a value after it/);
    const valueless = [];
    for (const args of [
      ['records', dir, 'Test', 'Nope', '--limit'],
      ['backup', dir, '--keep'],
      ['audit', dir, 'Test', '--account'],
    ]) valueless.push(await runCli(main, args));
    for (const r of valueless) { assert.equal(r.status, 1); assert.match(r.stderr, /needs a value after it/); }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the upgrade note on numbers and addresses states the ranges the commands enforce', async () => {
  const note = bullet('Command-line numbers and addresses are checked');
  assert.match(note, /1 to 10000/);
  assert.match(note, /1 to 65535/);
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-upgrading-'));
  try {
    createStore(join(dir, 'Test.openhbam.sqlite'));
    const low = await runCli(main, ['audit', dir, 'Test', '--limit', '0']);
    const high = await runCli(main, ['audit', dir, 'Test', '--limit', '10001']);
    const port = await runCli(main, ['doctor', dir, '--port', '65536']);
    const url = await runCli(main, ['doctor', '--exposure', '--url', 'files.example.com']);
    for (const r of [low, high, port, url]) assert.equal(r.status, 1, r.stdout);
    assert.match(low.stderr, /--limit/);
    assert.match(high.stderr, /--limit/);
    assert.match(port.stderr, /--port is "65536"/);
    assert.match(url.stderr, /doctor: --url takes the address people use/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the upgrade note on report --json is true for one file, several files and a named file', async () => {
  bullet('`tabularius report <folder> --json` prints one JSON document');
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-upgrading-'));
  try {
    for (const name of ['One', 'Two']) createStore(join(dir, `${name}.openhbam.sqlite`));
    const both = await runCli(main, ['report', dir, '--json']);
    const before = await runCli(main, ['report', dir, '--json', 'Two']);
    assert.equal(both.status, 0, both.stderr);
    assert.equal(before.status, 0, before.stderr);
    assert.deepEqual((JSON.parse(both.stdout) as Array<{ database: string }>).map((r) => r.database), ['One', 'Two']);
    assert.equal((JSON.parse(before.stdout) as { database: string }).database, 'Two');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the other two upgrade notes and the changelog line exist and name what the code does', () => {
  const headers = bullet('Answers from the program\'s own routes are marked `no-store` and `nosniff`');
  for (const word of ['/fmi/', '/odata/', '/scim/', '/tabularius/', '/mcp', 'Cache-Control: no-store', 'X-Content-Type-Options: nosniff']) assert.ok(headers.includes(word), word);
  const migrate = bullet('`tabularius migrate-fms` limits what it reads and will not replace a saved file');
  for (const word of ['--save', '16 MiB', 'two minutes']) assert.ok(migrate.includes(word), word);
  const server = readFileSync(join(root, 'packages', 'server', 'src', 'fms-migrate.ts'), 'utf8');
  assert.match(server, /maxBytes: 16 \* 1024 \* 1024, deadlineMs: 120_000/);
  const cli = readFileSync(main, 'utf8');
  assert.match(cli, /already exists; choose another name or remove it/);
  const exposure = readFileSync(join(root, 'packages', 'server', 'src', 'exposure-headers.ts'), 'utf8');
  assert.match(exposure, /\^\\\/\(\?:fmi\|odata\|scim\|tabularius\)\\\/\|\^\\\/mcp/);
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const section = changelog.slice(changelog.indexOf('## 0.2.0'), changelog.indexOf('## 0.1.0'));
  assert.match(section, /### Command line and migration/);
  assert.match(section, /stop on an option they do not know/);
  assert.match(section, /`no-store` and `nosniff`/);
});
