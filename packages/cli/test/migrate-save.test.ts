// Synthetic exports only; every child has a PATH that refuses service and network commands.
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, linkSync, lstatSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { commandStubEnv } from '../../../scripts/test-command-stubs.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');
const skip = process.platform === 'win32' && 'POSIX ownership and mode bits are not enforced on Windows';
function sandbox(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-migrate-save-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const env = commandStubEnv(t);
  delete env.TABULARIUS_FMS_PASSWORD;
  delete env.OPENHBAM_FMS_PASSWORD;
  return { dir, env };
}
for (const attack of ['existing private file', 'hard link', 'symlink', 'dangling symlink', 'group writable', 'world writable', 'group readable', 'world readable'] as const) {
  test(`migrate-fms --save refuses ${attack} before asking for a password`, {
    skip: attack.includes('symlink') ? process.platform === 'win32' && 'links need privileges on Windows'
      : attack.includes('writable') || attack.includes('readable') ? skip : false,
  }, (t) => {
    const { dir, env } = sandbox(t), save = join(dir, 'saved.json'), target = join(dir, 'target');
    const before = 'keep this existing export';
    if (attack === 'symlink' || attack === 'dangling symlink') {
      if (attack !== 'dangling symlink') writeFileSync(target, before, { mode: 0o600 });
      symlinkSync(target, save);
    } else {
      writeFileSync(save, before, { mode: 0o600 });
      if (attack === 'hard link') linkSync(save, target);
      else if (attack !== 'existing private file') chmodSync(save, {
        'group writable': 0o620, 'world writable': 0o602, 'group readable': 0o640, 'world readable': 0o604,
      }[attack]);
    }
    const beforeMode = lstatSync(save).mode;
    // Fail on any password read or fetch, even when this regression runs against the unfixed CLI.
    const args = ['migrate-fms', join(dir, 'dest'), '--from', 'https://migration.invalid', '--save', save, '--dry-run'];
    const code = `Object.defineProperty(process.stdin, 'isTTY', { get() { throw new Error('unexpected password read'); } });
      globalThis.fetch = () => { throw new Error('unexpected network request'); };
      process.argv = [process.execPath, ${JSON.stringify(main)}, ...${JSON.stringify(args)}];
      await import(${JSON.stringify(pathToFileURL(main).href)});`;
    const result = spawnSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', code], { env, encoding: 'utf8', timeout: 15_000 });
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stderr.includes(`${save} already exists; choose another name or remove it`), result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /password|ECONN|ENOTFOUND/i);
    assert.equal(lstatSync(save).mode, beforeMode);
    if (attack === 'dangling symlink') assert.ok(lstatSync(save).isSymbolicLink());
    else assert.equal(readFileSync(save, 'utf8'), before);
    if (attack === 'hard link' || attack === 'symlink') assert.equal(readFileSync(target, 'utf8'), before);
  });
}

test('migrate-fms --save exclusively creates a private export', (t) => {
  const { dir, env } = sandbox(t), save = join(dir, 'saved.json'), from = join(dir, 'source.json');
  const data = { general: { name: 'Synthetic server' } };
  writeFileSync(from, JSON.stringify(data));
  const result = spawnSync(process.execPath, ['--no-warnings', main, 'migrate-fms', join(dir, 'dest'),
    '--from', from, '--save', save, '--dry-run'], { env, encoding: 'utf8', timeout: 15_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(save, 'utf8')), data);
  assert.equal(statSync(save).nlink, 1);
  if (process.platform !== 'win32') {
    assert.equal(statSync(save).mode & 0o777, 0o600);
    assert.equal(statSync(save).uid, process.getuid!());
  }
});

test('migrate-fms --save does not overwrite a file created after its early check', (t) => {
  const { dir, env } = sandbox(t), save = join(dir, 'saved.json'), from = join(dir, 'source.json');
  writeFileSync(from, '{}');
  const args = ['migrate-fms', join(dir, 'dest'), '--from', from, '--save', save, '--dry-run'];
  // Reading the source happens after the early refusal but before the asynchronous save.
  const code = `import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const read = fs.readFileSync;
    let planted = false;
    fs.readFileSync = function(path, ...args) {
      if (path === ${JSON.stringify(from)} && !planted) {
        planted = true;
        fs.writeFileSync(${JSON.stringify(save)}, 'created during the read', { mode: 0o600 });
      }
      return read.call(this, path, ...args);
    };
    syncBuiltinESMExports();
    process.argv = [process.execPath, ${JSON.stringify(main)}, ...${JSON.stringify(args)}];
    await import(${JSON.stringify(pathToFileURL(main).href)});`;
  const result = spawnSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', code], { env, encoding: 'utf8', timeout: 15_000 });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(readFileSync(save, 'utf8'), 'created during the read');
});
