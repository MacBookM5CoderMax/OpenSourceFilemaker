// The rest of what a command writes into a folder the person names: the export-sql script itself (the whole file's data, also when it
// has no container files), the write-back kit's folder, the diagnostics bundle, the corpus-scan report, and the folders above the
// files of `migrate-fms --save` and `plugins pack -o`. None of them may be sent elsewhere by a link planted beforehand in a folder
// others can write to, or written through a link, a pipe or a second name for another file.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { corpusScan } from '../src/corpus-scan.ts';
import { writeBundle } from '../src/diagnostics.ts';
import { writeKitFiles } from '../src/output-files.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');
const skip = process.platform === 'win32' && 'links and modes differ on Windows';
const planted = /link in a folder others can write to/;

// A PATH that holds only stubs: a service, upgrade, install, git or network command would write the marker and exit 99.
const stubs = mkdtempSync(join(tmpdir(), 'tabularius-cli-scripts-stubs-'));
const marker = join(stubs, 'marker');
const originalPath = process.env.PATH;
before(() => {
  for (const name of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    writeFileSync(join(stubs, name), `#!/bin/sh\n: > '${marker}'\nexit 99\n`, { mode: 0o755 });
  }
  process.env.PATH = stubs;
});
after(() => {
  try { assert.equal(existsSync(marker), false, 'no service, install, git or network command was run'); }
  finally {
    if (originalPath === undefined) delete process.env.PATH; else process.env.PATH = originalPath;
    rmSync(stubs, { recursive: true, force: true });
  }
});
const cli = (...args: string[]) => spawnSync(process.execPath, ['--no-warnings', main, ...args], { encoding: 'utf8', env: { ...process.env, PATH: stubs } });

/** A folder anyone could write into, as a shared folder is; the umask would otherwise close it. */
function shared(dir: string): string {
  mkdirSync(dir, { recursive: true });
  chmodSync(dir, 0o777);
  return dir;
}

/** A shared folder holding `team`, a link someone else made to a folder of their choosing; returns both. */
function trap(dir: string): { team: string; elsewhere: string } {
  const elsewhere = join(dir, 'elsewhere');
  mkdirSync(elsewhere);
  const team = join(shared(join(dir, 'share')), 'team');
  symlinkSync(elsewhere, team);
  return { team, elsewhere };
}

test('export-sql writes its script into no folder a planted link points out of, even without container files', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-export-script-'));
  try {
    const path = join(dir, 'Plain.openhbam.sqlite');
    createStore(path);
    const s = new Store(path, 'Plain');
    try {
      s.applyDesign([{ op: 'createTable', name: 'Notes', fields: [{ name: 'Body', type: 'text' }] }] as never);
      s.create('Notes', { Body: 'synthetic note' });
    } finally { s.close(); }
    const { team, elsewhere } = trap(dir);

    const refused = cli('export-sql', dir, 'Plain', '--out', join(team, 'P.sql'), '--dialect', 'sqlite');
    assert.equal(refused.status, 1, refused.stderr);
    assert.match(refused.stderr, planted);
    assert.ok(refused.stderr.includes(team), 'the terminal names the offending link');
    assert.deepEqual(readdirSync(elsewhere), [], 'the script did not go where the link points');

    // A folder that does not exist yet below the link is refused as well, and nothing is made.
    const below = cli('export-sql', dir, 'Plain', '--out', join(team, 'new', 'Q.sql'), '--dialect', 'sqlite');
    assert.equal(below.status, 1, below.stderr);
    assert.match(below.stderr, planted);
    assert.deepEqual(readdirSync(elsewhere), []);

    // A plain run still works: the script is private to this user.
    const out = join(dir, 'R.sql');
    const ok = cli('export-sql', dir, 'Plain', '--out', out, '--dialect', 'sqlite');
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(readFileSync(out, 'utf8'), /synthetic note/);
    assert.equal(statSync(out).mode & 0o777, 0o600);
    // It is still never overwritten.
    assert.equal(cli('export-sql', dir, 'Plain', '--out', out, '--dialect', 'sqlite').status, 1);

    // A person's own alias, in a folder only they can write, remains accepted.
    symlinkSync(dir, join(dir, 'alias'));
    assert.equal(cli('export-sql', dir, 'Plain', '--out', join(dir, 'alias', 'S.sql'), '--dialect', 'sqlite').status, 0);
    assert.match(readFileSync(join(dir, 'S.sql'), 'utf8'), /synthetic note/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the write-back kit makes no folder below a planted link before refusing it', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-kit-order-'));
  try {
    const { team, elsewhere } = trap(dir);
    const kit = { paste: [{ where: 'File > Manage > Database', names: ['Notes'], xml: '<fmxmlsnippet/>', notes: [] }], byHand: [] };
    assert.throws(() => writeKitFiles(join(team, 'kit', 'deeper'), 'Charts', 'Charts.fmp12', kit), planted);
    assert.deepEqual(readdirSync(elsewhere), [], 'no folder was made where the link points');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a diagnostics bundle is not written below a planted link, and is private where it is written', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-bundle-links-'));
  try {
    const { team, elsewhere } = trap(dir);
    const bundle = new Map([['README.txt', 'synthetic readme'], ['doctor.txt', 'synthetic doctor']]);
    assert.throws(() => writeBundle(bundle, join(team, 'bundle')), planted);
    assert.throws(() => writeBundle(bundle, join(team, 'new', 'bundle.zip')), planted);
    assert.throws(() => writeBundle(bundle, join(team, 'bundle.zip')), planted);
    assert.deepEqual(readdirSync(elsewhere), [], 'nothing went where the link points');

    const folder = writeBundle(bundle, join(dir, 'out', 'bundle'));
    assert.deepEqual(readdirSync(folder).sort(), ['README.txt', 'doctor.txt']);
    assert.equal(statSync(folder).mode & 0o077, 0, 'the bundle folder is closed to other users');
    assert.equal(statSync(join(folder, 'doctor.txt')).mode & 0o777, 0o600);
    const zip = writeBundle(bundle, join(dir, 'out', 'bundle.zip'));
    assert.equal(statSync(zip).mode & 0o777, 0o600);
    assert.throws(() => writeBundle(bundle, zip), /already there/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the corpus-scan report is not written below a planted link or through a link at its file names', { skip, timeout: 120_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-corpus-links-'));
  try {
    const corpus = join(dir, 'corpus');
    mkdirSync(corpus);
    writeFileSync(join(corpus, 'one.fmp12'), Buffer.alloc(100)); // synthetic: not a real file, the scan reports an error class
    const { team, elsewhere } = trap(dir);
    await assert.rejects(corpusScan(corpus, { out: join(team, 'report'), entry: main }), planted);
    // It is refused before the scan, which can take hours: a folder with no files to scan gets the same refusal, not "no .fmp12 files".
    const empty = join(dir, 'empty');
    mkdirSync(empty);
    await assert.rejects(corpusScan(empty, { out: join(team, 'report'), entry: main }), planted);
    assert.deepEqual(readdirSync(elsewhere), [], 'nothing went where the link points');

    // Neither a symbolic link nor a second name at either report file is written through.
    const victim = join(dir, 'victim.txt');
    writeFileSync(victim, 'keep');
    for (const name of ['corpus-report.json', 'corpus-report.md']) {
      for (const hard of [false, true]) {
        const out = join(dir, `${name}-${hard}`);
        mkdirSync(out);
        const target = join(out, name);
        if (hard) linkSync(victim, target); else symlinkSync(victim, target);
        await assert.rejects(corpusScan(corpus, { out, entry: main, jobs: 1 }), (e: NodeJS.ErrnoException) => e.code === 'ESTALE');
        assert.equal(readFileSync(victim, 'utf8'), 'keep');
        if (!hard) assert.ok(lstatSync(target).isSymbolicLink());
        rmSync(target);
      }
    }

    // A plain run writes both files, readable by others (counts only).
    const fine = join(dir, 'fine');
    await corpusScan(corpus, { out: fine, entry: main, jobs: 1 });
    assert.deepEqual(readdirSync(fine).sort(), ['corpus-report.json', 'corpus-report.md']);
    for (const name of ['corpus-report.json', 'corpus-report.md']) assert.equal(statSync(join(fine, name)).mode & 0o777, 0o644);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('migrate-fms --save and plugins pack -o are not written below a planted link', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-save-pack-links-'));
  try {
    const { team, elsewhere } = trap(dir);
    const exported = join(dir, 'export.json');
    writeFileSync(exported, JSON.stringify({ general: { name: 'Synthetic server' } }));
    const dest = join(dir, 'dest');
    mkdirSync(dest);
    for (const save of [join(team, 'saved.json'), join(team, 'new', 'saved.json')]) {
      const refused = cli('migrate-fms', dest, '--from', exported, '--save', save, '--dry-run');
      assert.equal(refused.status, 1, refused.stderr);
      assert.match(refused.stderr, planted);
    }
    assert.deepEqual(readdirSync(elsewhere), [], 'the saved settings did not go where the link points');
    assert.equal(cli('migrate-fms', dest, '--from', exported, '--save', join(dir, 'saved.json'), '--dry-run').status, 0);

    const src = join(dir, 'src-pack');
    mkdirSync(src);
    writeFileSync(join(src, 'plugin.json'), JSON.stringify({ id: 'org.example.packed', name: 'Packed', version: '1.0.0', api: '^1.0', publisher: 'Example', main: 'main.js', functions: [{ name: 'Ex_Pack', min: 1, max: 1 }] }));
    writeFileSync(join(src, 'main.js'), 'const functions = { Ex_Pack: (s) => s };');
    const pack = cli('plugins', dir, 'pack', src, '-o', join(team, 'p.ohplugin'));
    assert.equal(pack.status, 1, pack.stderr);
    assert.match(pack.stderr, planted);
    assert.deepEqual(readdirSync(elsewhere), [], 'the package did not go where the link points');
    const fine = join(dir, 'fine.ohplugin');
    assert.equal(cli('plugins', dir, 'pack', src, '-o', fine).status, 0);
    assert.equal(statSync(fine).mode & 0o777, 0o644);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a pipe planted at a corpus-scan report name is refused, not waited on', { skip }, (t) => {
  if (!existsSync('/usr/bin/mkfifo')) { t.skip('/usr/bin/mkfifo is unavailable'); return; }
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-corpus-pipe-'));
  try {
    const corpus = join(dir, 'corpus');
    mkdirSync(corpus);
    writeFileSync(join(corpus, 'one.fmp12'), Buffer.alloc(100)); // synthetic: not a real file
    const out = join(dir, 'report');
    mkdirSync(out);
    const made = spawnSync('/usr/bin/mkfifo', [join(out, 'corpus-report.md')], { encoding: 'utf8', env: { ...process.env, PATH: stubs } });
    assert.equal(made.status, 0, made.stderr);
    // Opened with the default flag, a pipe with no reader would hold the command for ever; the timeout turns that into a failure.
    const r = spawnSync(process.execPath, ['--no-warnings', main, 'corpus-scan', corpus, '--out', out, '--jobs', '1'], { encoding: 'utf8', env: { ...process.env, PATH: stubs }, timeout: 30_000, killSignal: 'SIGKILL' });
    assert.equal(r.status, 1, `${r.signal ?? ''} ${r.stderr}`);
    assert.match(r.stderr, /Filesystem path changed or is not a safe regular file/);
    assert.ok(lstatSync(join(out, 'corpus-report.md')).isFIFO());
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
