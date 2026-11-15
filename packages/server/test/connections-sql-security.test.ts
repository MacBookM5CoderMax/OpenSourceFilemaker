import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Connections } from '../src/connections.ts';
import { Assistant } from '../src/assistant.ts';
import { checkPlan } from '../src/agent.ts';
import { createStore, Store } from '../../store/src/index.ts';
import { serve } from '../src/index.ts';
import { stubCommands } from './edge-test-helpers.ts';
import { fake, messages, packet, prelogin, loginAck, done } from '../../store/test/helpers/fake-tds.ts';
import { essCallAsync, closeEssBridge } from '../../store/src/ess/bridge.ts';

const baseConfig = { host: '127.0.0.1', database: 'synthetic' };
const restricted = [
  { trustServerCertificate: 'true' }, { trustServerCertificate: 'false' },
  { allowUnencrypted: 'true' }, { allowUnencrypted: 'false' },
  { encrypt: 'optional' }, { encrypt: 'disable' },
];
const refusal = (config: object) => `${Object.keys(config)[0]} is administrator-only; ask an administrator to set it in the console.`;

for (const setting of restricted) test(`AI SQL Server create refuses ${JSON.stringify(setting)} without saving`, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-sql-security-'));
  try {
    const c = new Connections(dir);
    assert.throws(() => c.create({ name: 'outside', type: 'sqlserver', config: { ...baseConfig, ...setting } }, 'ai'),
      { message: refusal(setting) });
    assert.deepEqual(new Connections(dir).list(), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

for (const kind of ['draft_connection', 'update_connection']) for (const setting of restricted) {
  test(`agent ${kind} names the administrator-only setting ${JSON.stringify(setting)}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'tabularius-agent-sql-'));
    createStore(join(dir, 'Inside.openhbam.sqlite'), { mode: 'native' });
    const store = new Store(join(dir, 'Inside.openhbam.sqlite'), 'Inside');
    try {
      store.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Title' }] }]);
      assert.throws(() => checkPlan(store, { layout: 'Items', steps: [
        { kind, type: 'sqlserver', config: { ...baseConfig, ...setting } },
      ] }, store.privileges('Admin')), { message: refusal(setting) });
      assert.deepEqual(new Connections(dir).list(), []);
    } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
  });
}

test('SQL Server AI tools refuse restricted settings; administrators can create and edit them', async (t) => {
  stubCommands(t);
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-sql-paths-'));
  createStore(join(dir, 'Inside.openhbam.sqlite'), { mode: 'native' });
  const app = await serve({ dir, port: 0, watch: false, log: () => {} });
  t.after(async () => { await new Promise<void>((resolve) => app.server.close(() => resolve())); rmSync(dir, { recursive: true, force: true }); });
  const store = app.host.get('Inside')!;
  store.setPassword('Admin', 'local');
  store.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Title' }] }]);
  const c = app.host.connections!;
  const admin = async (path: string, method: string, body: unknown) => {
    const r = await fetch(app.url + '/tabularius/admin/v1/connections' + path, { method,
      headers: { 'content-type': 'application/json', 'x-tabularius-admin': '1' }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  const rpc = async (method: string, params: object) => {
    const r = await fetch(app.url + '/mcp', { method: 'POST', headers: {
      authorization: 'Basic ' + Buffer.from('Admin:local').toString('base64'), 'content-type': 'application/json',
      accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18',
    }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    return r.json();
  };
  const assistant = new Assistant(app.host, undefined as never, { apiKey: 'test', baseUrl: 'http://127.0.0.1:1' });
  let proposed: object = {}, result = '', calls = 0;
  t.mock.method(assistant as unknown as { call: (...args: any[]) => Promise<unknown> }, 'call', async (_system: unknown, _tools: unknown, messages: unknown[]) => {
    if (calls++ === 0) return { content: [{ type: 'tool_use', id: 'probe', name: 'draft_connection', input: proposed }], stop_reason: 'tool_use' };
    result = JSON.stringify(messages.at(-1));
    return { content: [{ type: 'text', text: 'Done' }], stop_reason: 'end_turn' };
  });
  for (const [index, setting] of restricted.entries()) {
    const config = { ...baseConfig, ...setting };
    const args = { database: 'Inside', name: `outside${index}`, type: 'sqlserver', config };
    const before = c.list();
    const reply = await rpc('tools/call', { name: 'draft_connection', arguments: args });
    assert.equal(reply.result.isError, true, JSON.stringify(reply));
    assert.ok(reply.result.content[0].text.includes(refusal(setting)), JSON.stringify(reply));
    assert.deepEqual(c.list(), before);
    proposed = args; calls = 0;
    await assistant.chat(store, 'Admin', [{ role: 'user', content: 'Set up a SQL connection' }], {}, store.privileges('Admin'));
    assert.ok(result.includes(refusal(setting)), result);
    assert.match(result, /is_error.*true/);
    assert.deepEqual(c.list(), before);
    // Agent plans have no connection operation at all; even approval cannot enable one.
    assert.throws(() => checkPlan(store, { layout: 'Items', steps: [{ kind: 'draft_connection', ...args }] }, store.privileges('Admin')), { message: refusal(setting) });
    assert.deepEqual(c.list(), before);
    const made = await admin('', 'POST', args);
    assert.equal(made.status, 201, JSON.stringify(made));
    const changed = await admin(`/${made.body.id}`, 'PATCH', { config });
    assert.equal(changed.status, 200, JSON.stringify(changed));
    for (const [field, value] of Object.entries(setting)) assert.equal(changed.body.config[field], value);
  }
  for (const [index, extra] of [{}, { encrypt: 'mandatory' }].entries()) {
    const name = `safe${index}`;
    const args = { database: 'Inside', name, type: 'sqlserver', config: { ...baseConfig, ...extra } };
    const reply = await rpc('tools/call', { name: 'draft_connection', arguments: args });
    assert.ok(!reply.result.isError, JSON.stringify(reply));
    assert.equal(new Connections(dir).get(name).config.encrypt, 'mandatory');
    proposed = { ...args, name: `assistant${index}` }; calls = 0;
    await assistant.chat(store, 'Admin', [{ role: 'user', content: 'Set up a SQL connection' }], {}, store.privileges('Admin'));
    assert.match(result, /drafted/);
    assert.equal(new Connections(dir).get(`assistant${index}`).config.encrypt, 'mandatory');
  }
  const approved = c.get('safe0');
  c.setSecret(approved.id, 'username', 'Reader');
  c.setSecret(approved.id, 'password', ['synthetic', 'password'].join('-'));
  c.approve(approved.id);
  const before = c.get(approved.id);
  for (const setting of restricted) {
    const reply = await rpc('tools/call', { name: 'draft_connection', arguments: {
      database: 'Inside', name: approved.name, type: 'sqlserver', config: { ...baseConfig, ...setting },
    } });
    assert.equal(reply.result.isError, true);
    assert.ok(reply.result.content[0].text.includes(refusal(setting)), JSON.stringify(reply));
    assert.deepEqual(c.get(approved.id), before);
    proposed = { database: 'Inside', name: approved.name, type: 'sqlserver', config: { ...baseConfig, ...setting } }; calls = 0;
    await assistant.chat(store, 'Admin', [{ role: 'user', content: 'Change the SQL connection' }], {}, store.privileges('Admin'));
    assert.ok(result.includes(refusal(setting)), result);
    assert.deepEqual(c.get(approved.id), before);
    assert.throws(() => checkPlan(store, { layout: 'Items', steps: [{ kind: 'update_connection', ...proposed }] }, store.privileges('Admin')), { message: refusal(setting) });
    assert.deepEqual(c.get(approved.id), before);
  }
  const tools = (await rpc('tools/list', {})).result.tools.map((tool: { name: string }) => tool.name);
  assert.deepEqual(tools.filter((name: string) => /connection/.test(name)).sort(), ['draft_connection', 'list_connections']);
});

for (const setting of [{ sslmode: 'require' }, { sslmode: 'disable' }, { allowPlaintextPassword: 'no' }, { allowPlaintextPassword: 'yes' }]) {
  test(`PostgreSQL AI settings use explicit refusal for ${JSON.stringify(setting)}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'tabularius-pg-security-'));
    try {
      const c = new Connections(dir);
      assert.throws(() => c.create({ name: 'outside', type: 'postgresql', config: { ...baseConfig, ...setting } }, 'ai'), { message: refusal(setting) });
      assert.deepEqual(c.list(), []);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

for (const setting of restricted) test(`AI update cannot widen approved SQL Server settings: ${JSON.stringify(setting)}`, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-sql-edit-'));
  try {
    const c = new Connections(dir);
    const made = c.create({ name: 'outside', type: 'sqlserver', config: baseConfig, files: ['Inside'] });
    c.setSecret(made.id, 'username', 'Reader');
    c.setSecret(made.id, 'password', ['synthetic', 'password'].join('-'));
    c.approve(made.id);
    const before = c.get(made.id);
    assert.throws(() => c.update(made.id, { config: { ...baseConfig, ...setting } }, 'ai'), { message: refusal(setting) });
    assert.deepEqual(new Connections(dir).get(made.id), before);
    assert.ok(c.sql(made.id, ['Inside']), 'secrets and approval survive refusal');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


// Scripted peer only: compatibility with a real SQL Server remains unverified.
test('saved default stays mandatory through connection Test and the ESS bridge; only administrator opt-in permits an unencrypted login', async (t) => {
  const modes: number[] = [];
  let logins = 0;
  const port = await fake(t, (socket) => messages(socket, (type, body) => {
    if (type === 0x12) {
      for (let offset = 0; body[offset] !== 255; offset += 5) {
        if (body[offset] === 1) modes.push(body[body.readUInt16BE(offset + 1)]);
      }
      socket.write(packet(4, prelogin(2)));
    } else if (type === 0x10) { logins++; socket.write(packet(4, Buffer.concat([loginAck(), done()]))); }
    else socket.write(packet(4, done()));
  }));
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-sql-default-'));
  t.after(() => { closeEssBridge(); rmSync(dir, { recursive: true, force: true }); });
  const c = new Connections(dir);
  const made = c.create({ name: 'outside', type: 'sqlserver', config: { ...baseConfig, port: String(port) }, files: ['Inside'] }, 'ai');
  c.setSecret(made.id, 'username', 'Reader');
  c.setSecret(made.id, 'password', ['synthetic', 'password'].join('-'));
  c.approve(made.id);
  assert.equal(new Connections(dir).get(made.id).config.encrypt, 'mandatory');
  const tested = await c.test(made.id);
  assert.equal(tested.ok, false);
  assert.equal(tested.message, `The SQL database "synthetic" could not complete the request (connection "outside", host 127.0.0.1:${port})`);
  const connection = c.sql(made.id, ['Inside'])!;
  assert.equal(connection.encrypt, 'mandatory');
  await assert.rejects(essCallAsync(connection, 'query', ['SELECT 1', []]));
  assert.deepEqual(modes, [1, 1]);
  assert.equal(logins, 0, 'default never transmits credentials without encryption');
  c.update(made.id, { config: { ...baseConfig, port: String(port), encrypt: 'optional', allowUnencrypted: 'true' } });
  c.setSecret(made.id, 'username', 'Reader');
  c.setSecret(made.id, 'password', ['synthetic', 'password'].join('-'));
  c.approve(made.id);
  assert.equal((await c.test(made.id)).ok, true);
  assert.ok(logins > 0);
});
