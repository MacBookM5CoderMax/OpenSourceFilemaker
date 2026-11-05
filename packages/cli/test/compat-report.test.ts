// tabularius compatibility-report: one file's counts as text a person reads and pastes into an issue. The report must carry
// nothing from inside the file beyond counts and FileMaker's own names and ids, and the command must send nothing anywhere.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCompatReport, compatReportMarkdown, sizeRange } from '../src/compat-report.ts';
import type { FileScan } from '../src/corpus-scan.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');
const fixtures = join(import.meta.dirname, '..', '..', '..', 'fixtures', 'fmp12');
const haveFixtures = existsSync(join(fixtures, 'Flicks.fmp12'));
const env = { tabularius: '0.2.0', node: '22.20.0', os: 'linux', arch: 'x64', date: '2026-11-05' };

const cleanup: string[] = [];
const scratch = (prefix: string) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanup.push(dir);
  return dir;
};
after(() => { for (const d of cleanup) rmSync(d, { recursive: true, force: true }); });

// A command guard like corpus-scan's test: a tool that could send something must not be run.
function run(args: string[], extraEnv: Record<string, string> = {}) {
  const guard = scratch('compat-guard-');
  const marker = join(guard, 'ran');
  for (const name of ['curl', 'wget', 'git', 'open', 'xdg-open', 'sudo']) writeFileSync(join(guard, name), `#!/bin/sh\n: > "${marker}"\nexit 99\n`, { mode: 0o755 });
  const r = spawnSync(process.execPath, ['--no-warnings', main, 'compatibility-report', ...args], { encoding: 'utf8', env: { ...process.env, PATH: guard, ...extraEnv } });
  assert.equal(existsSync(marker), false, 'no external command may run');
  return r;
}

test('a hostile scan comes out with its names, paths and messages left out', () => {
  const scan: FileScan = {
    status: 'failed',
    error: 'Error: no table "Clients 2019" in /Users/pat/Acme Payroll.fmp12',
    creator: 'Payroll 12.0',
    versionDate: 'last Tuesday',
    counts: { tables: 4, fields: 90, secretCount: 7 } as FileScan['counts'],
    functions: { If: 5, 'Clients 2019': 9 },
    getOptions: { LastError: 3, '/Users/pat/x': 2 },
    plugins: { 'MBSP:12': 3, 'Acme Payroll:1': 2 },
    mbs: { 'Text.ReplaceAll': 2, 'my secret word': 4, 'Payroll.SmithSalary': 3, 'Text.SmithSalary': 2, 'JSON.GetPayrollTotal': 1 },
    unknownFunctions: { f911: 2, 'Invoice Total': 5 },
    unknownSteps: { '999': 1, 'Open Acme': 3 },
    steps: { 'Set Variable': 10, 'Run Payroll': 4 },
    layoutObjects: { button: 2, 'field:edit': 8, 'Acme Layout': 1 },
    triggers: { 'layout:OnRecordLoad': 1, 'script:Payroll': 1 },
    shapes: { 'plugin:MBSP:12': ['MBS ( "Text.ReplaceAll" ; "Pat Smith" )'] },
    conversion: { ok: false, error: 'Error @ ../../Users/pat/Acme.fmp12:12', seconds: 1.234 },
    progress: { stage: 'Acme' as 'schema', bytesRead: 5, tablesConverted: 0, recordsConverted: 0, peakHeapBytes: 123e6, stageMs: { schema: 1500 } },
  };
  const r = buildCompatReport(scan, env, 4_200_000);
  const text = compatReportMarkdown(r);
  for (const leak of ['Clients', 'Acme', 'Payroll', 'Users', '/pat', 'secret', 'Invoice', 'Smith', 'last Tuesday', 'Run Payroll', 'SmithSalary']) {
    assert.ok(!text.includes(leak), `${leak} leaked`);
  }
  assert.deepEqual(r.counts, { tables: 4, fields: 90 });
  assert.equal(r.file.size, '1 to 10 MB');
  assert.equal(r.file.error, 'Error');
  assert.equal(r.file.savedBy, undefined);
  assert.equal(r.conversion?.error, 'Error');
  assert.equal(r.timing?.stageReached, 'unknown');
  assert.deepEqual(r.functions, [{ name: 'If', uses: 5 }]);
  assert.deepEqual(r.plugins, [{ name: 'MBSP:12', uses: 3 }]);
  // MBS names come from the file's text: only names Tabularius knows are shown; a lookalike in a known namespace is "(other)".
  assert.deepEqual(r.mbs, [{ name: 'text.(other)', uses: 2 }, { name: 'text.replaceall', uses: 2 }, { name: 'json.(other)', uses: 1 }].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)));
  assert.deepEqual(r.notYet.functions, [{ name: 'f911', uses: 2 }]);
  assert.deepEqual(r.notYet.scriptSteps, [{ name: '999', uses: 1 }]);
  assert.deepEqual(r.scriptSteps, [{ name: 'Set Variable', uses: 10 }]);
  assert.ok(r.namesNotShown > 0);
});

test('the file name, path, hash and formula shapes are not fields of the report', () => {
  const r = buildCompatReport({ status: 'ok', shapes: { 'function:f911': ['f ( «field» )'] }, creator: 'Pro 12.0', versionDate: '25JAN11' }, env, 1);
  const keys = JSON.stringify(Object.keys(r)) + JSON.stringify(Object.keys(r.file));
  assert.doesNotMatch(keys, /"(?:names?|paths?|hash|ids?|shapes?)"/i);
  assert.equal(r.file.savedBy, 'Pro 12.0');
  assert.equal(r.file.savedOn, '25JAN11');
  assert.equal(r.date, '2026-11-05');
});

test('sizes are given as ranges', () => {
  assert.equal(sizeRange(10), 'under 1 MB');
  assert.equal(sizeRange(5e6), '1 to 10 MB');
  assert.equal(sizeRange(50e6), '10 to 100 MB');
  assert.equal(sizeRange(5e8), '100 MB to 1 GB');
  assert.equal(sizeRange(5e9), '1 to 10 GB');
  assert.equal(sizeRange(5e10), 'over 10 GB');
});

test('an encrypted or unreadable file says so in plain words', () => {
  assert.match(compatReportMarkdown(buildCompatReport({ status: 'encrypted' }, env, 5e6)), /encrypted/);
  assert.match(compatReportMarkdown(buildCompatReport({ status: 'timeout', progress: { stage: 'records', bytesRead: 1, tablesConverted: 2, recordsConverted: 3, peakHeapBytes: 1e6, stageMs: { records: 4000 } } }, env, 5e6)), /ran out of time[\s\S]*got as far as "records"/);
});

test('a file that is not a FileMaker file reports a fixed error class and nothing from the file or its name', () => {
  const dir = scratch('compat-invalid-');
  const path = join(dir, 'Private Client Payroll.fmp12');
  writeFileSync(path, Buffer.alloc(8192, 0x41));
  const r = run([path, '--json']);
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.file.status, 'failed');
  assert.match(report.file.error, /^(?:Range|Type)?Error/);
  for (const leak of ['Private', 'Payroll', 'Client', dir]) assert.ok(!r.stdout.includes(leak), `${leak} leaked`);
  assert.match(r.stderr, /Nothing was sent anywhere/);
  assert.match(r.stderr, /issues\/new\?template=compatibility_report/);
});

test('it takes one file: a folder, a missing file, a stray option and no argument are refused', () => {
  const dir = scratch('compat-args-');
  const folder = run([dir]);
  assert.equal(folder.status, 1);
  assert.match(folder.stderr, /one \.fmp12 file, not a folder.*corpus-scan/);
  const missing = run([join(dir, 'nope.fmp12')]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /doesn't exist/);
  const stray = run([join(dir, 'x.fmp12'), '--wat']);
  assert.equal(stray.status, 1);
  assert.match(stray.stderr, /--wat is not an option it knows/);
  assert.equal(run([]).status, 1);
  const badTimeout = run([join(dir, 'x.fmp12'), '--timeout', '0']);
  assert.equal(badTimeout.status, 1);
  assert.match(badTimeout.stderr, /--timeout/);
});

test('a real file: the report says it read and converted, saves with --out, and holds none of the file\'s words', { skip: !haveFixtures && 'fixtures missing: run npm run fixtures' }, () => {
  const dir = scratch('compat-real-');
  const tmp = join(dir, 'tmp');
  mkdirSync(tmp);
  const path = join(dir, 'Secret Client Name.fmp12');
  copyFileSync(join(fixtures, 'Flicks.fmp12'), path);
  const out = join(dir, 'report.md');
  const r = run([path, '--out', out], { TMPDIR: tmp });
  assert.equal(r.status, 0, r.stderr);
  const text = r.stdout;
  assert.equal(readFileSync(out, 'utf8'), text);
  assert.match(text, /\| Read \| yes \|/);
  assert.match(text, /\| Converted \| yes, in [\d.]+ s \|/);
  assert.match(text, /\| Saved by \| FileMaker Pro 12\.0/);
  assert.match(text, /\| Set Variable \| \d+ \|/);
  // Nothing of the file's own: not its name, its tables, layouts or scripts, nor formula shapes or masked strings.
  for (const leak of ['Secret', 'Client Name', 'Flicks', 'Movies', dir, '⟨', '«']) assert.ok(!text.includes(leak), `${leak} leaked`);
  assert.ok(text.length < 60000, `${text.length} characters is too long for an issue`);
  // The converted copy (the file's records) is gone.
  assert.deepEqual(readdirSync(tmp), []);
  // It does not overwrite a report, and --no-convert leaves conversion out.
  const again = run([path, '--out', out]);
  assert.equal(again.status, 1);
  assert.match(again.stderr, /exist/i);
  const quick = run([path, '--no-convert']);
  assert.equal(quick.status, 0, quick.stderr);
  assert.match(quick.stdout, /\| Converted \| not tried/);
});
