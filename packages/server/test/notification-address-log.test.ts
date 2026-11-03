// The email address notifications go to is a person's: the server's own log lines name its domain only.
// The address and files are generated in the test; no mail is sent (the test mail route is not called).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import type { Server } from 'node:http';
import { createStore } from '../../store/src/index.ts';
import { serve, type Host } from '../src/index.ts';

let dir: string;
let server: Server;
let base: string;
let host: Host;
const printed: string[] = [];
const originalPath = process.env.PATH;
const originalMarker = process.env.TABULARIUS_TEST_COMMAND_MARKER;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-notify-log-'));
  const bin = join(dir, 'stub-bin');
  mkdirSync(bin);
  process.env.TABULARIUS_TEST_COMMAND_MARKER = join(dir, 'forbidden-command');
  for (const command of ['launchctl', 'systemctl', 'sc', 'git', 'gh', 'npm', 'curl', 'sudo']) {
    const file = join(bin, command);
    writeFileSync(file, '#!/bin/sh\nprintf "forbidden command\\n" >> "$TABULARIUS_TEST_COMMAND_MARKER"\nexit 99\n');
    chmodSync(file, 0o755);
  }
  process.env.PATH = `${bin}${delimiter}${originalPath ?? ''}`;
  createStore(join(dir, 'Shop.openhbam.sqlite'), { mode: 'native' });
  const s = await serve({ dir, port: 0, log: (m) => printed.push(m) });
  server = s.server;
  base = s.url;
  host = s.host;
});
after(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  const forbidden = dir && existsSync(join(dir, 'forbidden-command'));
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  if (originalMarker === undefined) delete process.env.TABULARIUS_TEST_COMMAND_MARKER;
  else process.env.TABULARIUS_TEST_COMMAND_MARKER = originalMarker;
  if (dir) rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  assert.ok(!forbidden, 'no service, install, upgrade, git or network command ran');
});

const post = (path: string, body: object) => fetch(`${base}/tabularius/admin/v1/${path}`, {
  method: 'POST', headers: { 'x-tabularius-admin': '1', 'content-type': 'application/json' }, body: JSON.stringify(body),
}).then((r) => r.status);
const logText = async (name: string): Promise<string> => {
  await host.logs!.flush();
  const file = join(dir, 'Logs', `${name}.log`);
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
};

test('setting the notification address writes its domain, not the address, to the printed output and every log', async () => {
  const address = ['Ops.Person', 'Alerts.Example.test'].join('@');
  assert.equal(await post('notifications', { to: address, level: 'Warning' }), 200);
  assert.equal(await post('notifications', { to: '' }), 200);
  const everything = [printed.join('\n'), await logText('Event'), await logText('Admin')].join('\n');
  assert.ok(!/ops\.person/i.test(everything), 'the local part of the address is not written anywhere');
  assert.match(printed.join('\n'), /Email notifications go to an address at alerts\.example\.test \(admin console\)/);
  assert.match(await logText('Event'), /Email notifications go to an address at alerts\.example\.test \(admin console\)/);
  assert.match(printed.join('\n'), /Email notifications are off \(admin console\)/);
  // The security entry already named the domain only.
  assert.match(await logText('Admin'), /server-setting-changed: .*email notifications" was changed.*to an address at alerts\.example\.test, warnings and errors/);
});
