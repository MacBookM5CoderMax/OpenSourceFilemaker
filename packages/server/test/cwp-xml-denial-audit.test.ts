// A refused XML publishing write is recorded in the file's security log as a privilege-denied event, as a refused Data API,
// web or MCP request is: the account, its privilege set and the rule that said no, never the values submitted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../src/index.ts';
import { STORE_EXT } from '../src/host.ts';
import { createStore, type DesignOp } from '../../store/src/index.ts';

async function setup(t: import('node:test').TestContext) {
  const before = process.env.TABULARIUS_XML_PUBLISHING_WRITES;
  process.env.TABULARIUS_XML_PUBLISHING_WRITES = '1';
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-xml-denial-'));
  createStore(join(dir, 'X' + STORE_EXT));
  const s = await serve({ dir, port: 0, watch: false, log: () => {} });
  const store = s.host.get('X')!;
  store.applyDesign([
    { op: 'createTable', name: 'Contacts', fields: [{ name: 'Name' }] },
    { op: 'createLayout', name: 'Plain', occurrence: 'Contacts' },
  ] as DesignOp[]);
  store.create('Contacts', { Name: 'Ada' });
  store.create('Contacts', { Name: 'Bo' });
  const full = store.privilegeSets().find((p) => p.name === '[Full Access]')!;
  store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmxml'] });
  store.setPassword('Ann', 'pw', full.name);
  store.savePrivilegeSet({
    name: 'Reader', extendedPrivileges: ['fmxml'], layouts: 'viewOnly', scripts: 'none', valueLists: 'viewOnly',
    records: { view: true, edit: false, create: false, delete: false },
  } as never);
  store.setPassword('Cy', 'pw', 'Reader');
  t.after(async () => {
    if (before === undefined) delete process.env.TABULARIUS_XML_PUBLISHING_WRITES; else process.env.TABULARIUS_XML_PUBLISHING_WRITES = before;
    s.server.closeAllConnections();
    await new Promise<void>((resolve) => s.server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });
  const send = async (who: string, params: string, method = 'POST') => {
    const res = await fetch(`${s.url}/fmi/xml/fmresultset.xml${method === 'GET' ? '?' + params : ''}`, {
      method, headers: { authorization: 'Basic ' + btoa(`${who}:pw`), ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
      ...(method === 'POST' ? { body: params } : {}),
    });
    return /<error code="(\d+)"/.exec(await res.text())?.[1];
  };
  const denied = async (expected: number) => {
    for (let i = 0; i < 50 && store.securityEvents({ kind: 'privilege-denied' }).length < expected; i++) await new Promise((r) => setTimeout(r, 20));
    return store.securityEvents({ kind: 'privilege-denied' });
  };
  return { store, send, denied };
}

test('a refused XML edit or delete is a privilege-denied event naming the xml surface, once per ten minutes for a repeat', async (t) => {
  const { store, send, denied } = await setup(t);
  const edit = '-db=X&-lay=Plain&-edit&-recid=1&Name=Hacked-value';
  assert.equal(await send('Cy', edit), '200');
  const first = await denied(1);
  assert.equal(first.length, 1);
  assert.equal(first[0].account, 'Cy');
  assert.equal(first[0].target, 'Reader');
  assert.equal(first[0].changes?.surface, 'xml');
  assert.equal(first[0].changes?.operation, 'edit');
  assert.ok(!JSON.stringify(first[0]).includes('Hacked-value'), 'the submitted value is not kept');
  // The same refusal again is suppressed like the other surfaces; a different operation is a new event.
  assert.equal(await send('Cy', edit), '200');
  assert.equal(await send('Cy', '-db=X&-lay=Plain&-delete&-recid=2'), '200');
  const both = await denied(2);
  assert.deepEqual(both.map((e) => e.changes?.operation).sort(), ['delete', 'edit']);
  assert.equal(store.get('Contacts', 1).fieldData.Name, 'Ada');
  assert.equal(store.find('Contacts', { limit: 10 }).totalCount, 2);
});

test('allowed writes, reads and requests refused for other reasons add no privilege-denied event', async (t) => {
  const { send, denied } = await setup(t);
  assert.equal(await send('Ann', '-db=X&-lay=Plain&-edit&-recid=1&Name=Ada2'), '0');
  assert.equal(await send('Ann', '-db=X&-lay=Plain&-new&Name=Cy2'), '0');
  assert.equal(await send('Cy', '-db=X&-lay=Plain&-findall', 'GET'), '0');
  assert.equal(await send('Ann', '-db=X&-lay=Plain&-edit&-recid=1&NoSuchField=x'), '102');
  assert.equal(await send('Ann', '-db=X&-lay=Plain&-edit&-recid=1&Name=viaGet', 'GET'), '3');
  await new Promise((r) => setTimeout(r, 200));
  assert.deepEqual(await denied(0), []);
});

test('a script the account may not run is a privilege-denied event, and the answer is still error 9', async (t) => {
  const { store, send, denied } = await setup(t);
  store.applyDesign([{ op: 'createScript', name: 'S', text: 'Set Field [ Contacts::Name ; "x" ]' }] as DesignOp[]);
  for (const key of ['-script=S', '-script.prefind=S', '-script.presort=S']) {
    assert.equal(await send('Cy', `-db=X&-lay=Plain&-findall&${key}`), '9', key);
  }
  const events = await denied(1);
  assert.ok(events.length >= 1, 'no privilege-denied event was recorded for the refused script');
  assert.equal(events[0].account, 'Cy');
  assert.equal(events[0].target, 'Reader');
  assert.equal(events[0].changes?.surface, 'xml');
  assert.equal(store.get('Contacts', 1).fieldData.Name, 'Ada', 'the script did not run');
});
