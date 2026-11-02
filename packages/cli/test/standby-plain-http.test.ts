import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPrimaryAddress } from '../../server/src/standby.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '../src/main.ts');

test('standby refuses remote plain HTTP despite the listener environment setting, and its flag permits the address check', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-standby-plain-http-'));
  const blocked = join(dir, 'blocked');
  const primary = 'http://192.0.2.10';
  const bin = join(dir, 'bin');
  const marker = join(dir, 'unexpected-command');
  mkdirSync(bin);
  for (const name of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    writeFileSync(join(bin, name), '#!/bin/sh\n: > "$R_L1_MARKER"\nexit 99\n', { mode: 0o755 });
  }
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const result = await runCli(main, ['standby', blocked, '--primary', primary, '--token', 'synthetic-replication-token'], {
    timeout: 60_000,
    env: { ...process.env, PATH: bin, R_L1_MARKER: marker, TABULARIUS_ALLOW_PLAIN_HTTP: '1' },
  });
  assert.equal(existsSync(marker), false, 'no operational command ran');
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /plain http to another computer.*--allow-plain-http/s);
  assert.doesNotThrow(() => checkPrimaryAddress(primary, true));
  assert.equal(existsSync(blocked), false, 'the refusal happens before standby setup or connection');
});
