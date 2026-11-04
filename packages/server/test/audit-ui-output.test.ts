import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual production renderers and table/HTML escaping, without starting a browser process.
const page = readFileSync(new URL('../admin/index.html', import.meta.url), 'utf8');
const script = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const parsed = ts.createSourceFile('admin.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['auditText', 'table', 'esc', 'AUDIT_KIND', 'AUDIT_SURFACE', 'auditSource', 'auditQuery', 'loadAudit', 'renderEvents', 'showRecordHistory']);
const code = parsed.statements.filter(statement =>
  ts.isFunctionDeclaration(statement) ? !!statement.name && names.has(statement.name.text) :
  ts.isVariableStatement(statement) && statement.declarationList.declarations.some(d => ts.isIdentifier(d.name) && names.has(d.name.text)))
  .map(statement => statement.getText(parsed)).join('\n');

test('actual audit, security and history renderers escape hostile fields and bound visible cells', async () => {
  const hostile = '<img src=x onerror=alert(1)>\r\n\u001b[2J\u202ehidden';
  const long = 'x'.repeat(100_000);
  const nodes = new Map<string, { value: string; innerHTML: string; textContent: unknown; querySelectorAll(): never[] }>();
  const $ = (id: string) => {
    if (!nodes.has(id)) nodes.set(id, { value: id.endsWith('-db') ? 'Test' : id.endsWith('-limit') ? '1000' : '', innerHTML: '', textContent: '', querySelectorAll: () => [] });
    return nodes.get(id)!;
  };
  const rows = [
    { seq: 1, at: '2026-10-18', kind: 'create', account: hostile, table: hostile, recordId: 1, surface: hostile, script: long, changes: { [hostile]: long }, from: hostile },
    { seq: 2, at: '2026-10-18', kind: hostile, security: true, account: long, target: hostile, changes: { detail: hostile }, from: hostile },
  ];
  const context = vm.createContext({ $, URLSearchParams, when: (s: string) => s,
    call: async () => ({ audit: rows }), say: () => {}, plainMessage: String,
    eventsLoaded: [{ ...rows[1], severity: 'alert', category: 'Sign-in', description: hostile + long }],
  });
  vm.runInContext(code, context);
  await vm.runInContext('loadAudit()', context);
  vm.runInContext('renderEvents()', context);
  const assertSafe = (html: string) => {
    assert.ok(!html.includes('<img'), 'HTML names cannot create elements');
    // Attribute values intentionally retain exact object identities for history and restore actions.
    const visible = html.replace(/<[^>]*>/g, '');
    assert.equal(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(visible), false);
    assert.ok(visible.length < 30_000);
    assert.match(visible, /truncated/);
    assert.match(visible, /\\u\{202e\}/);
  };
  assertSafe($('audit').innerHTML);
  assertSafe($('events').innerHTML);
  context.tableName = hostile;
  await vm.runInContext('showRecordHistory(tableName, 1)', context);
  assertSafe($('audit').innerHTML);
  assert.ok($('audit').innerHTML.includes('data-restore-seq="1"'), 'restore actions remain usable');
});

test('audit settings render and submit security retention separately from record retention', async () => {
  const load = parsed.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'loadAuditSettings')!;
  const save = parsed.statements.find(statement => statement.getText(parsed).startsWith("$('audit-settings-body').addEventListener('click'"))!;
  const nodes = new Map<string, { value: string; checked: boolean; innerHTML: string; textContent: string; addEventListener(type: string, listener: unknown): void }>();
  let listener: (event: unknown) => Promise<void>;
  const $ = (id: string) => {
    if (!nodes.has(id)) nodes.set(id, { value: '', checked: false, innerHTML: '', textContent: '', addEventListener: (_type, fn) => { listener = fn as typeof listener; } });
    return nodes.get(id)!;
  };
  $('audit-db').value = 'Test';
  const saved: unknown[] = [];
  const context = vm.createContext({ $, URLSearchParams, call: async (method: string, _url: string, body: unknown) => {
    if (method === 'PUT') saved.push(body);
    return { retentionDays: 400, securityRetentionDays: 0, excludeFields: {} };
  } });
  vm.runInContext(code + '\n' + load.getText(parsed) + '\n' + save.getText(parsed), context);
  await vm.runInContext('loadAuditSettings()', context);
  assert.match($('audit-settings-body').innerHTML, /id="audit-security-retention"[^>]*value="0"/);
  assert.match($('audit-settings-body').innerHTML, /30[^<]*36500/);
  $('audit-retention').value = '90';
  for (const value of ['30', '0']) {
    $('audit-security-retention').value = value;
    await listener!({ target: { id: 'audit-settings-save' } });
    assert.deepEqual(JSON.parse(JSON.stringify(saved.at(-1))), { retentionDays: 90, securityRetentionDays: Number(value), redactSensitive: false, logReads: false, excludeFields: {} });
  }
});
