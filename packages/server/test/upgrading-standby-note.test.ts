// docs/upgrading.md says what a standby now refuses. Each claim in that note is run against the program here, so a note
// that drifts from the code, or a code change without the note, fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Standby, checkPrimaryAddress } from '../src/index.ts';

const root = join(import.meta.dirname, '..', '..', '..');
const main = join(root, 'packages', 'cli', 'src', 'main.ts');
const upgrading = readFileSync(join(root, 'docs', 'upgrading.md'), 'utf8');
const changes = upgrading.slice(upgrading.indexOf('## Changes that can affect existing use'), upgrading.indexOf('## Stopping and restarting'));
const TOKEN = ['a', 'replication', 'token', 'for', 'tests'].join('-');

const note = (): string => {
  const at = changes.indexOf('- **A standby checks the main server');
  assert.ok(at >= 0, 'docs/upgrading.md, "Changes that can affect existing use", has no note on the standby checks');
  const rest = changes.slice(at + 2);
  const next = rest.search(/\n- \*\*/);
  return (next < 0 ? rest : rest.slice(0, next)).replace(/\s+/g, ' ');
};

const listen = (server: Server): Promise<number> => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port));
});
const close = (server: Server): Promise<void> => new Promise((resolve) => { server.closeAllConnections(); server.close(() => resolve()); });

test('the note says what the address check takes, and the check agrees', () => {
  const text = note();
  for (const phrase of ['`--primary`', '`https://` or `http://`', 'no user name or password', 'no `?` or `#` part', '`localhost`, `127.x.x.x` or `[::1]`']) {
    assert.ok(text.includes(phrase), `the note says ${phrase}`);
  }
  const secret = ['pass', 'word', 'value'].join('-');
  for (const ok of ['https://main.example.com', 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://127.4.5.6', 'http://[::1]:8080']) assert.doesNotThrow(() => checkPrimaryAddress(ok), ok);
  for (const bad of ['ftp://main.example.com', `https://admin:${secret}@main.example.com`, 'https://main.example.com/?a=b', 'https://main.example.com/#a']) {
    assert.throws(() => checkPrimaryAddress(bad, true), /standby: --primary/, bad);
  }
  assert.throws(() => checkPrimaryAddress('http://main.example.com'), /plain http to another computer.*--allow-plain-http/);
  assert.doesNotThrow(() => checkPrimaryAddress('http://main.example.com', true));
});

test('the note says TABULARIUS_ALLOW_PLAIN_HTTP does not lift the refusal, and the image sets it for the listener', { timeout: 60_000 }, async (t) => {
  const text = note();
  assert.ok(text.includes('`--allow-plain-http`') && text.includes('`TABULARIUS_ALLOW_PLAIN_HTTP`') && text.includes('does not lift this refusal'));
  assert.match(readFileSync(join(root, 'Dockerfile'), 'utf8'), /^\s*TABULARIUS_ALLOW_PLAIN_HTTP=1\b/m, 'the Docker image sets the variable the note names');
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-upgrading-standby-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const folder = join(dir, 'copy');
  mkdirSync(folder);
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('TABULARIUS_'))), TABULARIUS_ALLOW_PLAIN_HTTP: '1' };
  const run = await new Promise<{ status: number | null; stderr: string }>((resolve, reject) => {
    // The refusal comes before any connection: the address is never contacted.
    const child = spawn(process.execPath, ['--no-warnings', main, 'standby', folder, '--primary', 'http://main.example.com:8080', '--token', TOKEN], { env, stdio: ['ignore', 'ignore', 'pipe'], timeout: 30_000 });
    let stderr = '';
    child.stderr.setEncoding('utf8').on('data', (c: string) => { stderr += c; });
    child.once('error', reject);
    child.once('close', (status) => resolve({ status, stderr }));
  });
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /plain http to another computer.*--allow-plain-http/);
  assert.deepEqual(readdirSync(folder), [], 'nothing was made');
});

test('the note says a redirect is not followed, not even to the same address, and what the standby logs', { timeout: 30_000 }, async (t) => {
  const text = note();
  assert.ok(text.includes('is no longer followed, not even to the same address') && text.includes('answered with a redirect') && text.includes('final address'));
  const folder = mkdtempSync(join(tmpdir(), 'tabularius-upgrading-redirect-'));
  let requested = 0;
  const primary = createServer((req, res) => {
    if (req.url === '/moved') { requested++; res.end('{"files":[]}'); } else { res.writeHead(302, { location: '/moved' }); res.end(); }
  });
  let standby: Standby | undefined;
  t.after(async () => { await standby?.stop(); await close(primary); rmSync(folder, { recursive: true, force: true }); });
  const port = await listen(primary);
  const lines: string[] = [];
  let seen!: () => void;
  const redirected = new Promise<void>((resolve) => { seen = resolve; });
  standby = new Standby({ folder, primary: `http://127.0.0.1:${port}`, token: TOKEN, log: (line) => { lines.push(line); if (/answered with a redirect/.test(line)) seen(); } });
  standby.start();
  await redirected;
  assert.equal(requested, 0, 'the redirect target on the same server was not requested');
  assert.ok(lines.some((line) => /final address/.test(line)), lines.join('\n'));
});
