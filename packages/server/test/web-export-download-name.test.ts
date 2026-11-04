// The name the web client's Export Records offers is one Windows keeps: a device name such as CON is not offered as CON.csv.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { serve } from '../src/index.ts';
import { STORE_EXT } from '../src/host.ts';
import { createStore, type DesignOp, type Store } from '../../store/src/index.ts';

let dir: string;
let server: Server;
let base: string;
let store: Store;
let token: string;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tabularius-web-export-name-'));
  createStore(join(dir, 'E' + STORE_EXT));
  const s = await serve({ dir, port: 0, watch: false, log: () => {} });
  server = s.server;
  base = s.url;
  store = s.host.get('E')!;
  store.applyDesign([{ op: 'createTable', name: 'People', fields: [{ name: 'Name' }] }] as DesignOp[]);
  store.create('People', { Name: 'Ada' });
  store.setPassword('Admin', 'pw', '[Full Access]');
  const r = await fetch(`${base}/fmi/data/vLatest/databases/E/sessions`, { method: 'POST', headers: { authorization: 'Basic ' + btoa('Admin:pw'), 'content-type': 'application/json' }, body: '{}' });
  token = (await r.json()).response.token;
});

after(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

const offered = async (format: string, name?: string) => {
  const r = await fetch(`${base}/tabularius/app/v1/databases/E/layouts/People/export`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: ['Name'], format, ...(name === undefined ? {} : { name }) }),
  });
  assert.equal(r.status, 200);
  await r.arrayBuffer();
  return decodeURIComponent(/filename\*=UTF-8''([^;]+)/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? '');
};

// csv and tab are written as the records are read; xlsx, xml and html are built first: two places make the name.
for (const format of ['csv', 'tab', 'mer', 'xlsx', 'xml', 'html']) {
  test(`an export (${format}) is never offered under a device name or a name Windows drops characters from`, async () => {
    assert.equal(await offered(format, 'people'), `people.${format}`);
    assert.equal(await offered(format, 'CON'), `_CON.${format}`);
    assert.equal(await offered(format, 'nul.txt'), `_nul.txt.${format}`);
    assert.equal(await offered(format, 'Orders. '), `Orders.${format}`);
    assert.equal(await offered(format, 'a/b:c'), `a_b_c.${format}`);
    assert.equal(await offered(format, 'x'.repeat(400)), `${'x'.repeat(120)}.${format}`);
  });
}

test('with no name given the layout name is used the same way', async () => {
  assert.equal(await offered('csv'), 'People.csv');
});
