import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSqlDestination, Connections } from '../src/connections.ts';
import * as bridge from '../../store/src/ess/bridge.ts';
import { createStore, StoreError, Privileges, parseScriptText } from '../../store/src/index.ts';
import { Host } from '../src/host.ts';
import { PgServer } from '../src/pgwire.ts';
import { PostgresClient } from '../../store/src/ess/postgres.ts';
import { writeEssBatch } from '../../store/src/ess/driver.ts';
import { ESS_ERROR } from '../../store/src/ess/driver.ts';
import { serve } from '../src/index.ts';
import { runScript } from '../../scripts/src/index.ts';
import { conversionGuide } from '../src/conversion-guide.ts';
import { stepLine } from '../../fmp12/src/script-params.ts';
import { conversionReport } from '../src/conversion.ts';
import { prepareSqlDesign } from '../src/ess.ts';
import { NAME_LOOKUP } from '../../store/src/outbound-address.ts';
import { createServer, type Socket } from 'node:net';

test('PostgreSQL connections default to verified TLS and reject unsafe settings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-connections-'));
  try {
    const connections = new Connections(dir);
    const made = connections.create({ name: 'sales', type: 'postgresql', config: { host: '127.0.0.1', database: 'outside' }, files: ['Inside'] });
    assert.equal(made.config.sslmode, 'verify-full');
    assert.equal(made.config.port, '5432');
    assert.equal(made.config.schema, 'public');
    assert.equal(made.status, 'draft');
    assert.equal(connections.sql('sales', ['Inside']), undefined);
    assert.throws(() => connections.create({ name: 'bad', type: 'postgresql', config: { host: 'db.example.com', database: 'outside', sslmode: 'disable' } }), /localhost|loopback/);
    assert.throws(() => connections.create({ name: 'metadata', type: 'postgresql', config: { host: '169.254.169.254', database: 'outside' } }), /link-local/);
    assert.throws(() => connections.create({ name: 'local', type: 'sqlite', config: { path: '/tmp/never-open.sqlite' } }), /no connection type/);
    assert.throws(() => connections.create({ name: 'key', type: 'postgresql', config: { host: '127.0.0.1', database: 'outside', ca: ['-----BEGIN', 'PRIVATE KEY-----'].join(' ') } }), /private key/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('console binding, asynchronous design and reads, permissions, and Execute SQL', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-flow-'));
  for (const name of ['Inside', 'Outside', 'Unlisted']) createStore(join(dir, `${name}.openhbam.sqlite`), { mode: 'native' });
  const logs: string[] = [];
  const app = await serve({ dir, port: 0, watch: false, log: (message) => logs.push(message) });
  const { host } = app;
  const inside = host.get('Inside')!;
  const outside = host.get('Outside')!;
  const unlisted = host.get('Unlisted')!;
  const password = ['generated', 'outside', 'credential'].join('-');
  const full = outside.privilegeSets().find((p) => p.id === 1)!;
  outside.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmxdbc'] });
  outside.setPassword('Reader', password, full.name);
  outside.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'id', type: 'integer' }, { name: 'title', type: 'text' }] }]);
  outside.create('Items', { id: 1, title: 'generated' });
  inside.setPassword('Admin', 'local', full.name);
  outside.setPassword('Admin', 'local', full.name);
  for (const store of [inside, unlisted]) store.applyDesign([
    { op: 'createTable', name: 'Local', fields: [{ name: 'value', type: 'text' }] },
    { op: 'createDataSource', name: 'Sales', paths: ['odbc:sales'] },
  ]);
  const pg = new PgServer(host, { port: 0, writes: true, log: (message) => logs.push(message) });
  const request = async (path: string, method: string, body?: unknown, headers: Record<string, string> = { 'x-tabularius-admin': '1' }) => {
    const res = await fetch(app.url + path, { method, headers: { ...headers, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const admin = (path: string, method: string, body?: unknown) => request('/tabularius/admin/v1/connections' + path, method, body);
  try {
    const port = await pg.listen();
    const config = { host: '127.0.0.1', port: String(port), database: 'Outside', sslmode: 'disable', allowPlaintextPassword: 'yes' };
    const made = await admin('', 'POST', { name: 'sales', type: 'postgresql', config, files: ['Inside'] });
    assert.equal(made.status, 201);
    const id = made.body.id;
    assert.equal(inside.sqlConnection('sales'), undefined);
    await admin(`/${id}/secrets/username`, 'PUT', { value: 'Reader' });
    await admin(`/${id}/secrets/password`, 'PUT', { value: password });
    const tested = await admin(`/${id}/test`, 'POST');
    assert.equal(tested.body.ok, true, tested.body.message);
    assert.match(tested.body.message, /Warning: TLS/);
    assert.ok(!JSON.stringify(tested).includes(password));
    assert.equal((await admin(`/${id}/approve`, 'POST')).body.status, 'active');
    assert.equal(inside.sqlConnection('SaLeS')?.dialect, 'postgresql');
    await admin(`/${id}`, 'PATCH', { files: [] });
    assert.equal(inside.sqlConnection('sales'), undefined, 'an empty SQL file allowlist grants no access');
    const listed = await request('/mcp', 'POST', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_connections', arguments: { database: 'Outside' } } },
      { authorization: 'Basic ' + Buffer.from('Admin:local').toString('base64'), accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' });
    assert.equal(listed.body.result.isError, undefined, JSON.stringify(listed.body));
    assert.deepEqual(JSON.parse(listed.body.result.content[0].text).connections.find((c: { name: string }) => c.name === 'sales').files, []);
    const draft = await request('/mcp', 'POST', { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'draft_connection', arguments: { database: 'Outside', name: 'ai-sql', type: 'postgresql', config } } },
      { authorization: 'Basic ' + Buffer.from('Admin:local').toString('base64'), accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' });
    assert.equal(draft.body.result.isError, undefined, JSON.stringify(draft.body));
    assert.equal(JSON.parse(draft.body.result.content[0].text).drafted, true);
    assert.equal(host.connections!.get('ai-sql').config.allowPlaintextPassword, 'no');
    assert.equal(outside.sqlConnection('ai-sql'), undefined);
    await admin(`/${id}`, 'PATCH', { files: ['Inside'] });
    const alias = inside.schema.dataSources.find((source) => source.name === 'Sales')!;
    alias.connection = 'SaLeS';
    alias.paths = ['odbc:unmatched-dsn'];
    const aliased = await prepareSqlDesign(inside, [{ op: 'createShadowTable', dataSource: 'Sales', table: 'Items', keys: ['id'] }]);
    assert.ok(aliased[0].op === 'createShadowTable' && aliased[0].columns?.length);
    alias.connection = 'sqlite';
    await assert.rejects(prepareSqlDesign(inside, [{ op: 'createShadowTable', dataSource: 'Sales', table: 'Items', keys: ['id'] }]), /no active approved connection/);
    delete alias.connection;
    alias.paths = ['odbc:sales'];
    assert.equal(unlisted.sqlConnection('sales'), undefined);
    const insideReport = conversionReport(inside);
    insideReport.dataSources[0].occurrences = 1;
    const outsideReport = conversionReport(unlisted);
    outsideReport.dataSources[0].occurrences = 1;
    assert.equal(conversionGuide(inside, [], insideReport).breaks.some((entry) => entry.title === 'Tables in SQL databases (ESS/ODBC)'), false);
    assert.match(conversionGuide(unlisted, [], outsideReport).breaks.find((entry) => entry.title === 'Tables in SQL databases (ESS/ODBC)')?.instead ?? '', /PostgreSQL.*DSN/);
    await assert.rejects(prepareSqlDesign(unlisted, [{ op: 'createShadowTable', dataSource: 'Sales', table: 'Items', keys: ['id'] }]), /list the file/);
    assert.equal(inside.sqlConnection('sqlite'), undefined);
    const unauthorized = await request('/tabularius/admin/v1/connections', 'POST', { name: 'forbidden', type: 'postgresql', config }, {});
    assert.notEqual(unauthorized.status, 201);
    assert.notEqual((await request(`/tabularius/admin/v1/connections/${id}`, 'PATCH', { files: ['Unlisted'] }, {})).status, 200);
    assert.equal((await admin('', 'POST', { name: 'local-only', type: 'sqlite', config: {} })).status, 404);
    assert.throws(() => host.connections!.get('local-only'), /no connection/i);

    const login = await request('/fmi/data/vLatest/databases/Inside/sessions', 'POST', {}, { authorization: 'Basic ' + Buffer.from('Admin:local').toString('base64') });
    const headers = { authorization: `Bearer ${login.body.response.token}` };
    const design = (changes: unknown[]) => request('/tabularius/design/v1/databases/Inside', 'POST', { changes }, headers);
    const created = await design([{ op: 'createShadowTable', dataSource: 'Sales', table: 'Items', keys: ['id'] }]);
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const table = inside.schema.tables.find((entry) => entry.name === 'Items')!;
    const loaded = new Promise<void>((resolve, reject) => {
      inside.shadowFailed = (_table, message) => reject(new Error(message));
      const load = inside.loadShadow.bind(inside);
      inside.loadShadow = (...args) => { try { load(...args); resolve(); } catch (error) { reject(error); throw error; } };
    });
    assert.throws(() => inside.findIds('Items'), (error: unknown) => error instanceof StoreError && error.code === ESS_ERROR && /not been loaded yet/.test(error.message));
    await loaded;
    assert.equal(inside.findIds('Items').length, 1);
    assert.equal(typeof inside.shadowStatus(table).ageSeconds, 'number');
    assert.throws(() => inside.update('Items', inside.findIds('Items')[0], { title: 'changed' }), /not available over a network connection yet/);
    const rename = await design([{ op: 'updateField', table: 'Items', field: 'title', name: 'renamed' }]);
    assert.equal(rename.status, 400);
    assert.ok(table.fields.some((field) => field.name === 'title'));

    const source = inside.schema.dataSources.find((d) => d.name === 'Sales')!;
    for (const text of ['Execute SQL [ Data Source: "Sales" ; SQL: "SELECT 1" ]', 'Execute SQL [ Data Source: "Sales" ; Calculation: "SELECT " & 1 ]']) {
      const original = parseScriptText(text, inside.schema)[0];
      const restored = parseScriptText(stepLine('Execute SQL', original.params), inside.schema)[0];
      assert.deepEqual(restored.params, original.params);
    }
    inside.savePrivilegeSet({ name: 'SQL runner', records: { view: true, edit: false, create: false, delete: false }, layouts: 'viewOnly', valueLists: 'viewOnly', scripts: 'viewOnly', extendedPrivileges: ['fmess'] });
    const set = inside.privilegeSets().find((p) => p.name === 'SQL runner')!;
    const allowed: Privileges = new Privileges('Runner', set, inside, () => allowed);
    const denied: Privileges = new Privileges('Reader', { ...set, extendedPrivileges: [] }, inside, () => denied);
    const script = { id: 900, name: 'SQL', steps: [{ stepId: 117, name: 'Execute SQL', enabled: true,
      params: { dataSource: { id: source.id, name: source.name }, text: 'INSERT INTO "Items" (id, title) VALUES (2, \'generated\')' } }] };
    const run = (privileges: Privileges) => runScript(inside, script, { ...host.scriptOptions('Inside'), network: true, networkFiles: () => true, privileges, layout: 'Local', trace: true });
    assert.equal((await run(denied)).error, 9);
    const executed = await run(allowed);
    assert.equal(executed.error, 0, JSON.stringify(executed));
    assert.equal(outside.findIds('Items').length, 2);
    const badSql = { ...script, steps: [
      { ...script.steps[0], params: { ...script.steps[0].params, text: 'SELECT * FROM "MissingTable"' } },
      { stepId: 103, name: 'Exit Script', enabled: true, params: { calculation: 'Get ( LastError ) & "|" & Get ( LastErrorDetail )' } },
    ] };
    const failure = await runScript(inside, badSql, { ...host.scriptOptions('Inside'), network: true, networkFiles: () => true, layout: 'Local' });
    assert.match(failure.result, /^8310\|.*SQL database/);
    assert.ok(!failure.result.includes(password));
    assert.equal((await runScript(inside, script, { ...host.scriptOptions('Inside'), network: false, privileges: allowed, layout: 'Local' })).error, 3);
    await admin(`/${id}`, 'PATCH', { enabled: false });
    assert.equal(inside.sqlConnection('sales'), undefined);
    const missing = await runScript(inside, script, { ...host.scriptOptions('Inside'), network: true, networkFiles: () => true, layout: 'Local', trace: true });
    assert.equal(missing.error, 3);
    assert.match(missing.trace?.find((entry) => entry.message)?.message ?? '', /DSN/);
    assert.ok(!logs.join('\n').includes(password));
  } finally {
    pg.close();
    await new Promise<void>((resolve) => app.server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('DNS metadata destinations are refused before save and network calls time out without blocking', async () => {
  const lookup = NAME_LOOKUP.lookup;
  let lookups = 0;
  NAME_LOOKUP.lookup = async () => { lookups++; return [{ address: '169.254.169.254', family: 4 }]; };
  try {
    await assert.rejects(checkSqlDestination('postgresql', { host: ['sk', 'test', 'abcdef'.repeat(5)].join('-'), database: 'outside' }), /secret|API key/i);
    assert.equal(lookups, 0, 'credential-shaped settings must be refused before DNS');
    await assert.rejects(checkSqlDestination('postgresql', { host: 'db.example.com', database: 'outside' }), /link-local/);
  }
  finally { NAME_LOOKUP.lookup = lookup; }
  const sockets = new Set<Socket>();
  const server = createServer((socket) => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.address() as { port: number }).port;
    const pending = bridge.essCallAsync({ name: 'silent', dialect: 'postgresql', host: '127.0.0.1', port,
      user: 'Reader', password: ['generated', 'password'].join('-'), database: 'outside', sslmode: 'disable' }, 'query', ['SELECT 1', []], 250);
    const rejected = assert.rejects(pending, (error: unknown) => error instanceof bridge.EssBridgeError && error.reason === 'timeout');
    let responsive = false;
    await new Promise<void>((resolve) => setImmediate(() => { responsive = true; resolve(); }));
    assert.equal(responsive, true);
    await rejected;
  } finally { for (const socket of sockets) socket.destroy(); await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('network operations have an asynchronous bridge', () => {
  assert.equal(typeof (bridge as Record<string, unknown>).essCallAsync, 'function');
});

test('the asynchronous worker serves a PostgreSQL connection to the local protocol server', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-ess-pgwire-'));
  const path = join(dir, 'Outside.openhbam.sqlite');
  createStore(path, { mode: 'native' });
  const host = new Host(dir, () => {}, { background: false });
  const store = host.add(path, 'trusted');
  const full = store.privilegeSets().find((p) => p.id === 1)!;
  store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmxdbc'] });
  const password = ['outside', 'test', 'password'].join('-');
  store.setPassword('Reader', password, full.name);
  store.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'id', type: 'integer' }, { name: 'title', type: 'text' }] }]);
  store.create('Items', { id: 1, title: 'Generated' });
  const server = new PgServer(host, { port: 0, writes: true });
  try {
    const port = await server.listen();
    const connection: bridge.SqlConnection = { name: 'outside', dialect: 'postgresql', host: '127.0.0.1', port,
      database: 'Outside', user: 'Reader', password, sslmode: 'disable', allowPlaintextPassword: true };
    const rows = await bridge.essCallAsync<{ rows: unknown[][] }>(connection, 'query', ['SELECT 1', []]);
    assert.equal(String(rows.rows[0][0]), '1');
    await assert.rejects(bridge.essCallAsync({ ...connection, allowPlaintextPassword: false }, 'query', ['SELECT 1', []]),
      (error: unknown) => error instanceof bridge.EssBridgeError && /verified TLS/.test(error.detail ?? ''));
    const tables = await bridge.essCallAsync<{ name: string }[]>(connection, 'tables');
    assert.ok(tables.some((t) => t.name === 'Items'));
    const columns = await bridge.essCallAsync<{ name: string }[]>(connection, 'columns', [{ name: 'Items' }]);
    assert.ok(columns.some((c) => c.name === 'id'));
    store.applyDesign([{ op: 'createTable', name: 'Typed', fields: [{ name: 'id', type: 'integer' }, { name: 'flag', type: 'boolean' }, { name: 'day', type: 'date' }, { name: 'stamp', type: 'timestamp' }] }]);
    store.create('Typed', { id: 1, flag: '1', day: '2026-01-02', stamp: '2026-01-02 03:04:05' });
    const client = await PostgresClient.connect({ host: connection.host!, port, database: 'Outside', user: 'Reader', password, sslmode: 'disable', allowPlaintextPassword: true });
    try {
      const before = (await client.query('SELECT id, flag, day, stamp FROM "Typed"', [])).rows[0];
      const query = client.query.bind(client);
      let typedUpdate = false;
      client.query = async (sql, params = [], options) => {
        if (sql.startsWith('UPDATE')) {
          typedUpdate = true;
          assert.equal(params[0], false);
          assert.ok(options?.parameterTypes?.includes('boolean'));
          assert.ok(options?.parameterTypes?.includes('date'));
          assert.ok(options?.parameterTypes?.some((type) => type.startsWith('timestamp')));
        }
        return query(sql, params, options);
      };
      await writeEssBatch(client, [{ kind: 'edit', table: 'Typed', keys: ['id'],
        before: { id: before[0], flag: Number(before[1]), day: before[2], stamp: before[3] },
        values: { flag: 0, day: '2026-03-04', stamp: '2026-03-04 05:06:07' } }]);
      assert.equal(typedUpdate, true);
      const after = (await client.query('SELECT id, flag, day, stamp FROM "Typed"', [])).rows[0];
      assert.equal(after[1], false);
      assert.notEqual(after[2], before[2]);
      assert.notEqual(after[3], before[3]);
    } finally { await client.close(); }
  } finally { server.close(); await host.close(); rmSync(dir, { recursive: true, force: true }); }
});
