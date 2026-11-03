// Exercise the real front's IPC listeners with in-memory children and the leader's real receiver.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ClusterLink, serveCluster, type FromFront, type Note } from '../src/cluster.ts';
import { OpenFailures } from '../src/open-failures.ts';
import { commandStubEnv } from '../../../scripts/test-command-stubs.ts';

async function relay(t: import('node:test').TestContext) {
  const env = commandStubEnv(t);
  const previous = { PATH: process.env.PATH, TABULARIUS_TEST_CHILD_MARKER: process.env.TABULARIUS_TEST_CHILD_MARKER };
  process.env.PATH = env.PATH;
  process.env.TABULARIUS_TEST_CHILD_MARKER = env.TABULARIUS_TEST_CHILD_MARKER;
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  });
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-relay-authority-'));
  const openFailures = new OpenFailures();
  const api = { own: () => [], others: () => [] as unknown[] };
  const queue = { version: 0, list: () => [], elsewhere: { lists: () => [] as unknown[] } };
  const profiler = { version: 0, snapshot: () => ({ scripts: [], finds: [] }), elsewhere: () => [] as unknown[] };
  const metrics = { snapshot: () => ({ requests: [], durations: [] }), elsewhere: () => [] as unknown[] };
  const links: ClusterLink[] = [];
  const children: (EventEmitter & { connected: boolean; send(m: FromFront, cb: () => void): void; kill(): void })[] = [];
  const delivered: Note[] = [];
  const said: string[] = [];
  const fork = t.mock.method(childProcess, 'fork', () => {
    const child = Object.assign(new EventEmitter(), {
      connected: true,
      send(m: FromFront, cb: () => void) {
        if (m.t === 'start') {
          if (m.role.id === 0) {
            const link = new ClusterLink(m.role, () => {});
            links.push(link);
            link.attach({ dir, openFailures, openStores: () => [], onAdd: [], onApprove: new Set(), serverScripts: queue, notifier: { note() {} } } as never,
              api as never, {} as never, { profiler, metrics } as never);
          }
          queueMicrotask(() => child.emit('message', { t: 'ready' }));
        } else if (m.t === 'tell' && children[0] === child) {
          delivered.push(m.note);
          links[0].receive(m);
        } else if (m.t === 'stop') child.kill();
        cb();
      },
      kill() { child.connected = false; child.emit('exit', 0); },
    });
    children.push(child);
    return child as never;
  });
  syncBuiltinESMExports();
  let cluster: Awaited<ReturnType<typeof serveCluster>> | undefined;
  t.after(async () => {
    // The leader's receiver holds locks.sqlite in the cluster's run folder, which close() removes: let go of it first
    // (Windows will not delete an open file).
    for (const link of links) link.close();
    try { await cluster?.close(); } finally {
      fork.mock.restore();
      syncBuiltinESMExports();
      rmSync(dir, { recursive: true, force: true });
    }
  });
  cluster = await serveCluster({ dir, port: 0, log: (m) => said.push(m) }, 3, false, { firstMs: 1 });
  const tell = (sender: number, note: unknown) => children[sender].emit('message', { t: 'tell', note });
  const state = () => ({ sessions: api.others(), scripts: queue.elsewhere.lists(), stats: metrics.elsewhere(), profiles: profiler.elsewhere(), failures: openFailures.list(() => true) });
  return { cluster, children, delivered, said, tell, state };
}

const reports = (from: number): Note[] => [
  { k: 'sessions', from, list: [{ id: `s${from}`, token: `t${from}`, db: 'Shop', account: 'operator', idleSeconds: 1, since: '2026-01-01T00:00:00.000Z', client: 'web', streams: 0 }] },
  { k: 'scripts', from, list: { limit: from, running: [], queued: [], recent: [] } },
  { k: 'stats', from, profile: { scripts: [], finds: [] }, requests: { requests: [[`GET /worker${from}`, from]], durations: [] } },
  { k: 'open-state', from, file: 'Shop', error: `worker ${from} busy` },
];

test('worker gone notes change nothing; a process exit clears only that worker on the leader', async (t) => {
  const r = await relay(t);
  for (const id of [1, 2]) for (const note of reports(id)) r.tell(id, note);
  const before = r.state();
  assert.equal(before.sessions.length, 2);
  assert.equal(before.scripts.length, 2);
  assert.equal(before.stats.length, 2);
  assert.equal(before.failures.length, 2);
  r.delivered.length = 0;
  for (const sender of [0, 1, 2]) for (const from of [0, 1, 2]) r.tell(sender, { k: 'gone', from });
  assert.deepEqual(r.state(), before);
  assert.deepEqual(r.delivered, []);
  assert.deepEqual(r.cluster.refused(), {}, 'worker gone notes are silently ignored');
  assert.deepEqual(r.said, []);
  r.children[2].kill();
  assert.deepEqual(r.delivered, [{ k: 'gone', from: 2 }]);
  assert.deepEqual(r.state(), Object.fromEntries(Object.entries(before).map(([key, values]) => [key, values.slice(0, 1)])));
});

test('the relay drops every forged from before rewriting, including open-state clears', async (t) => {
  const r = await relay(t);
  for (const id of [1, 2]) for (const note of reports(id)) r.tell(id, note);
  const before = r.state();
  r.delivered.length = 0;
  const notes: Note[] = [...reports(2), { k: 'log', from: 2, type: 'Error', source: 'test', message: 'busy' }, { k: 'open-state', from: 2, file: 'Shop' }];
  for (const note of notes) {
    for (const from of [0, 2, undefined, '1']) r.tell(1, { ...note, from });
  }
  assert.deepEqual(r.delivered, [], 'forged reports must not become reports about the sender');
  assert.deepEqual(r.state(), before);
  assert.deepEqual(r.cluster.refused(), {});
  // Valid reports and success notifications still pass unchanged.
  for (const note of [...reports(1), { k: 'log', from: 1, type: 'Error', source: 'test', message: 'busy' } as const]) r.tell(1, note);
  assert.equal(r.delivered.length, 5);
  r.tell(1, { k: 'open-state', from: 1, file: 'Shop' });
  assert.deepEqual(r.state().failures.map((e) => e.worker), [2]);
});
