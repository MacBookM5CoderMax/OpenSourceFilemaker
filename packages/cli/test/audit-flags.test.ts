import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');

test('audit refuses a --since that is not a date and a --record that is not an id, instead of printing nothing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-audit-flags-'));
  try {
    createStore(join(dir, 'Test.openhbam.sqlite'));
    const store = new Store(join(dir, 'Test.openhbam.sqlite'));
    store.auditSignIn('Ann', 'local', true);
    store.close();
    const audit = (...flags: string[]) => runCli(main, ['audit', dir, 'Test', ...flags]);

    const [bad, badRecord, validDate, validDateTime] = await Promise.all([
      audit('--since', 'notadate'),
      audit('--record', 'abc'),
      audit('--since', '2020-01-01'),
      audit('--since', '2020-01-01T08:00:00Z', '--record', '3'),
    ]);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /--since takes a date or time.*"notadate"/);
    assert.equal(bad.stdout, '');

    assert.notEqual(badRecord.status, 0);
    assert.match(badRecord.stderr, /--record takes a record id/);

    assert.equal(validDate.status, 0);
    assert.equal(validDateTime.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('audit --limit, service --port and doctor --port, --sql-port and --url refuse a value that is not one, in the typed words', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-audit-limit-'));
  try {
    createStore(join(dir, 'Test.openhbam.sqlite'));
    const store = new Store(join(dir, 'Test.openhbam.sqlite'));
    for (let i = 0; i < 3; i++) store.auditSignIn(`Ann${i}`, 'local', true);
    store.close();
    const audit = (...flags: string[]) => runCli(main, ['audit', dir, 'Test', ...flags]);
    const service = (...flags: string[]) => runCli(main, ['service', 'print', '--platform', 'linux', ...flags, dir]);
    const bad = await Promise.all(['abc', '0', '-5', '1.5', '', '10001'].map((v) => audit('--limit', v)));
    for (const [i, r] of bad.entries()) {
      assert.notEqual(r.status, 0, `case ${i}`);
      assert.equal(r.stdout, '', `case ${i}`);
      assert.match(r.stderr, /--limit (?:is|is set but empty).*whole number of 1 to 10000/, `case ${i}`);
    }
    assert.match(bad[0].stderr, /--limit is "abc"/);
    const [all, two] = await Promise.all([audit(), audit('--limit', '2')]);
    assert.equal(all.status, 0);
    assert.equal(all.stdout.trim().split('\n').length, 3);
    assert.equal(two.status, 0);
    assert.equal(two.stdout.trim().split('\n').length, 2);
    const ports = await Promise.all([service('--port', 'abc'), service('--port', ''), service('--port', '99999'), service('--port', '9000')]);
    for (const r of ports.slice(0, 3)) {
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /--port .*whole number of 1 to 65535/);
      assert.doesNotMatch(r.stderr, /NaN|not 0\b/);
    }
    assert.match(ports[0].stderr, /--port is "abc"/);
    assert.equal(ports[3].status, 0);
    assert.match(ports[3].stdout, /9000/);
    const doctor = await Promise.all([
      runCli(main, ['doctor', dir, '--port', 'abc']),
      runCli(main, ['doctor', dir, '--port', '0']),
      runCli(main, ['doctor', '--exposure', '--sql-port', 'abc']),
      runCli(main, ['doctor', dir, '--url', 'notaurl']),
      runCli(main, ['doctor', '--exposure', '--url', 'ftp://host']),
    ]);
    for (const r of doctor) {
      assert.notEqual(r.status, 0);
      assert.equal(r.stdout, '');
      assert.doesNotMatch(r.stderr, /options\.port|Invalid URL|NaN/);
    }
    assert.match(doctor[0].stderr, /^error: --port is "abc": give a whole number of 1 to 65535/m);
    assert.match(doctor[1].stderr, /^error: --port is "0": give a whole number of 1 to 65535/m);
    assert.match(doctor[2].stderr, /^error: --sql-port is "abc": give a whole number of 1 to 65535/m);
    assert.match(doctor[3].stderr, /^error: doctor: --url takes the address people use, such as https:\/\/files\.example\.com, not "notaurl"$/m);
    assert.match(doctor[4].stderr, /not "ftp:\/\/host"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
