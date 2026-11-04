import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { STORE_EXT } from '../../server/src/host.ts';
import { validateServeOptions } from '../src/service.ts';

for (const workers of [1, 2]) test(`serve --xml-publishing-writes enables POST writes with ${workers} worker(s)`, { timeout: 60_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-xml-flag-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  const marker = join(dir, 'forbidden-command');
  for (const command of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    writeFileSync(join(bin, command), `#!/bin/sh\nprintf called > '${marker}'\nexit 99\n`, { mode: 0o755 });
  }
  const path = join(dir, 'X' + STORE_EXT);
  createStore(path);
  const store = new Store(path);
  try {
    store.applyDesign([{ op: 'createTable', name: 'Rows', fields: [{ name: 'Name' }] }]);
    const full = store.privilegeSets().find((p) => p.name === '[Full Access]')!;
    store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmxml'] });
    store.setPassword('Writer', 'pw', full.name);
  } finally { store.close(); }
  // The same flag is accepted in a service's stored serve arguments, without invoking a service manager.
  validateServeOptions(['--xml-publishing-writes'], true);
  const child = spawn(process.execPath, ['--no-warnings', join(import.meta.dirname, '../src/main.ts'), 'serve', dir,
    '--port', '0', '--workers', String(workers), '--no-backups', '--stats-interval', 'off', '--xml-publishing-writes'], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, TABULARIUS_XML_PUBLISHING_WRITES: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CLI did not announce a listening address')), 30_000);
      const scan = () => {
        const match = /http:\/\/127\.0\.0\.1:\d+/.exec(output);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      };
      child.stdout.on('data', scan);
      child.once('error', (error) => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error(`CLI exited before listening: ${output}`)); });
      scan();
    });
    const response = await fetch(`${url}/fmi/xml/fmresultset.xml`, {
      method: 'POST', headers: { authorization: 'Basic ' + btoa('Writer:pw'), 'content-type': 'application/x-www-form-urlencoded' },
      body: '-db=X&-lay=Rows&-new&Name=Created',
    });
    assert.match(await response.text(), /<error code="0"\/>/);
  } finally {
    child.kill('SIGTERM');
    await exited;
    const forbidden = existsSync(marker);
    rmSync(dir, { recursive: true, force: true });
    assert.equal(forbidden, false, 'a forbidden command was invoked');
  }
});
