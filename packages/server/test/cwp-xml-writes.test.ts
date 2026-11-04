import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordHistory } from '../src/record-history.ts';
import type { Host } from '../src/host.ts';
import type { Server } from 'node:http';
import { serve } from '../src/index.ts';
import { STORE_EXT } from '../src/host.ts';
import { createStore, type DesignOp, type Store } from '../../store/src/index.ts';
import type { LayoutObject } from '../../fmp12/src/index.ts';

// Synthetic XML write requests exercise the same store entry and privilege rules as the Data API.

let dir: string;
let server: Server;
let base: string;
let store: Store;
let host: Host;
const oldPath = process.env.PATH;
const oldSwitch = process.env.TABULARIUS_XML_PUBLISHING_WRITES;
const ann = 'Basic ' + btoa('Ann:pw');

before(async () => {
  process.env.TABULARIUS_XML_PUBLISHING_WRITES = '1';
  dir = mkdtempSync(join(tmpdir(), 'tabularius-cwp-xml-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  const marker = join(dir, 'forbidden-command');
  for (const command of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    writeFileSync(join(bin, command), `#!/bin/sh\nprintf called > '${marker}'\nexit 99\n`, { mode: 0o755 });
  }
  process.env.PATH = `${bin}:${oldPath ?? ''}`;
  createStore(join(dir, 'X' + STORE_EXT));
  const s = await serve({ dir, port: 0, watch: false, log: () => {}, listFilesPublicly: true });
  host = s.host;
  server = s.server;
  base = s.url;
  store = s.host.get('X')!;
  store.applyDesign([
    { op: 'createTable', name: 'Contacts', fields: [
      { name: 'Id', type: 'number' }, { name: 'Name' }, { name: 'City' }, { name: 'Joined', type: 'date' },
      { name: 'Tags', options: { repetitions: 3 } }, { name: 'Secret' }, { name: 'Unplaced' },
    ] },
    { op: 'createTable', name: 'Calls', fields: [{ name: 'ContactId', type: 'number' }, { name: 'Note' }] },
    { op: 'createRelationship', left: 'Contacts', right: 'Calls', predicates: [{ left: 'Id', right: 'ContactId' }] },
    { op: 'createValueList', name: 'Cities', values: ['Oslo', 'Bergen'] },
    { op: 'createScript', name: 'Touch', text: 'Exit Script [ ]' },
    { op: 'createLayout', name: 'Plain', occurrence: 'Contacts' },
  ] as DesignOp[]);
  const occ = (name: string) => store.schema.tableOccurrences.find((t) => t.name === name)!;
  const fieldId = (table: string, name: string) => store.schema.tables.find((t) => t.name === table)!.fields.find((f) => f.name === name)!.id;
  const listId = store.schema.valueLists.find((v) => v.name === 'Cities')!.id;
  const anchors = { left: true, top: true, right: false, bottom: false };
  let top = 0;
  let id = 100;
  const field = (table: string, name: string, extra: object = {}) => ({
    id: ++id, kind: 'field', type: 1, anchors, style: {}, bounds: { top: top += 24, left: 20, bottom: top + 20, right: 300 },
    field: { tableOccurrenceId: occ(table).id, fieldId: fieldId(table, name), tableOccurrence: table, field: name, display: 'edit', repetitions: 1, ...extra },
  }) as unknown as LayoutObject;
  const objects = [
    field('Contacts', 'Id'), field('Contacts', 'Name'), field('Contacts', 'City', { display: 'dropdown', valueListId: listId }),
    field('Contacts', 'Joined'), field('Contacts', 'Tags', { repetitions: 3 }), field('Contacts', 'Secret'), {
      id: 900, kind: 'portal', type: 9, anchors, style: {}, bounds: { top: 300, left: 20, bottom: 400, right: 300 },
      portal: { tableOccurrenceId: occ('Calls').id, tableOccurrence: 'Calls', rows: 4, initialRow: 1 }, children: [field('Calls', 'Note')],
    } as unknown as LayoutObject,
  ];
  store.applyDesign([{ op: 'updateLayout', layout: 'Contacts', design: { objects, tableView: [] } }] as DesignOp[]);
  const people: [number, string, string, string, string[]][] = [
    [1, 'Ada & <Co>', 'Oslo', '2024-03-05', ['red', 'blue']], [2, 'Bo', 'Bergen', '2023-01-02', []],
    [3, 'Cy', 'Oslo', '2022-07-09', ['x']], [4, 'Di', 'Trondheim', '2021-11-30', []],
  ];
  for (const [n, name, city, joined, tags] of people) {
    store.create('Contacts', { Id: n, Name: name, City: city, Joined: joined, Secret: 'hush', Unplaced: 'u', Tags: tags[0] ?? '', ...(tags[1] ? { 'Tags(2)': tags[1] } : {}) } as never);
  }
  store.create('Calls', { ContactId: 1, Note: 'hello' });
  store.create('Calls', { ContactId: 1, Note: 'again' });
  const full = store.privilegeSets().find((p) => p.name === '[Full Access]')!;
  store.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmxml'] });
  store.setPassword('Ann', 'pw', full.name);
  store.savePrivilegeSet({ name: 'No XML', extendedPrivileges: ['fmrest'], layouts: 'viewOnly', scripts: 'none', valueLists: 'viewOnly', records: { view: true, edit: false, create: false, delete: false } } as never);
  store.setPassword('Bo', 'pw', 'No XML');
  store.savePrivilegeSet({
    name: 'Reader', extendedPrivileges: ['fmxml'], layouts: 'viewOnly', scripts: 'none', valueLists: 'viewOnly',
    records: { view: true, edit: false, create: false, delete: false }, tables: { Contacts: { view: true, edit: false, create: false, delete: false, fields: { Secret: 'none' } } },
  } as never);
  store.setPassword('Cy', 'pw', 'Reader');
});

after(async () => {
  if (oldSwitch === undefined) delete process.env.TABULARIUS_XML_PUBLISHING_WRITES;
  else process.env.TABULARIUS_XML_PUBLISHING_WRITES = oldSwitch;
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  if (oldPath === undefined) delete process.env.PATH; else process.env.PATH = oldPath;
  assert.equal(existsSync(join(dir, 'forbidden-command')), false);
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

async function xml(grammar: string, query: string, headers: Record<string, string> = { authorization: ann }, init: RequestInit = {}) {
  const res = await fetch(`${base}/fmi/xml/${grammar}.xml?${query}`, { headers, ...init });
  return { res, text: await res.text() };
}
const fm = (query: string, who?: string) => xml('fmresultset', query, who ? { authorization: who } : undefined);
const code = (t: string) => /<error code="(\d+)"/.exec(t)?.[1] ?? /<ERRORCODE>(\d+)</.exec(t)?.[1];
const names = (t: string) => [...t.matchAll(/<field name="Name"><data>([^<]*)<\/data>/g)].map((m) => m[1].replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>'));
const FIND = '-db=X&-lay=Contacts';

const post = (params: string, grammar = 'fmresultset', headers: Record<string, string> = {}) => xml(grammar, '', {
  authorization: ann, 'content-type': 'application/x-www-form-urlencoded', ...headers,
}, { method: 'POST', body: `${FIND}&${params}` });
const snapshot = () => store.find('Contacts', { limit: 1000 }).records;
const recordId = (text: string) => Number(/record-id="(\d+)"/.exec(text)?.[1] ?? /RECORDID="(\d+)"/.exec(text)?.[1]);

test('off by default: all four commands explain the switch and leave records unchanged', async () => {
  delete process.env.TABULARIUS_XML_PUBLISHING_WRITES;
  try {
    const before = snapshot();
    for (const cmd of ['new', 'edit', 'delete', 'dup']) {
      for (const grammar of ['fmresultset', 'FMPXMLRESULT']) {
        const r = await post(`-${cmd}&-recid=1&Name=Changed`, grammar);
        assert.equal(code(r.text), '3');
        assert.match(r.text, /TABULARIUS_XML_PUBLISHING_WRITES=1/);
      }
    }
    assert.deepEqual(snapshot(), before);
  } finally { process.env.TABULARIUS_XML_PUBLISHING_WRITES = '1'; }
});

test('new, edit, duplicate and delete return both grammars, convert dates and preserve repetitions and history', async () => {
  for (const grammar of ['fmresultset', 'FMPXMLRESULT']) {
    const made = await post('-new&Name=Created&Tags=one&Tags(2)=two&Joined=12/31/2025', grammar);
    assert.equal(code(made.text), '0', made.text);
    const id = recordId(made.text);
    assert.ok(id > 0);
    assert.match(made.text, /12\/31\/2025/);
    assert.match(made.text, /two/);
    assert.equal(store.get('Contacts', id, 'iso').fieldData.Joined, '2025-12-31');
    const edit = await post(`-edit&-recid=${id}&-modid=0&Name=Edited&Tags(3)=three`, grammar);
    assert.equal(code(edit.text), '0');
    const before = snapshot();
    assert.equal(code((await post(`-edit&-recid=${id}&-modid=0&Name=Stale`, grammar)).text), '306');
    assert.equal(code((await post(`-delete&-recid=${id}&-modid=0`, grammar)).text), '306');
    assert.deepEqual(snapshot(), before);
    const copied = await post(`-dup&-recid=${id}&-lay.response=Plain`, grammar);
    assert.equal(code(copied.text), '0');
    const duplicate = recordId(copied.text);
    assert.notEqual(duplicate, id);
    assert.equal(store.get('Contacts', duplicate).fieldData.Name, 'Edited');
    const deleted = await post(`-delete&-recid=${id}&-modid=1`, grammar);
    assert.equal(code(deleted.text), '0');
    assert.doesNotMatch(deleted.text, /<record |<ROW /);
    assert.throws(() => store.get('Contacts', id));
    for (const rid of [id, duplicate]) {
      const history = recordHistory(store, 'Contacts', rid);
      assert.ok(history.events.length);
      assert.ok(history.events.every((e) => e.surface === 'XML publishing' && e.account === 'Ann'));
    }
  }
});

test('unknown and unplaced fields and invalid response layouts fail before writing', async () => {
  const before = snapshot();
  for (const field of ['Missing', 'Unplaced', 'Tags(4)', 'Tags(0)']) {
    assert.equal(code((await post(`-new&Name=Partial&${field}=x`)).text), '102', field);
  }
  assert.equal(code((await post('-new&Name=Partial&-lay.response=Calls')).text), '960');
  assert.deepEqual(snapshot(), before);
});

test('view-only records and missing fmxml deny every write without changes', async () => {
  const before = snapshot();
  for (const cmd of ['new', 'edit', 'delete', 'dup']) {
    const reader = await post(`-${cmd}&-recid=1&Name=Denied`, 'fmresultset', { authorization: 'Basic ' + btoa('Cy:pw') });
    assert.equal(code(reader.text), '200', reader.text);
    const noXml = await post(`-${cmd}&-recid=1`, 'fmresultset', { authorization: 'Basic ' + btoa('Bo:pw') });
    assert.equal(code(noXml.text), '9');
  }
  assert.deepEqual(snapshot(), before);
});

test('writes require a POST form and refuse cross-site browsers in the XML grammar', async () => {
  const before = snapshot();
  const get = await fm(`${FIND}&-new&Name=Denied`);
  assert.equal(code(get.text), '3');
  assert.match(get.text, /POST form/);
  for (const headers of [{ origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }, { origin: 'null' }] as Record<string, string>[]) {
    const r = await post('-new&Name=Denied', 'FMPXMLRESULT', headers);
    assert.equal(r.res.status, 200);
    assert.equal(code(r.text), '3', r.text);
  }
  assert.deepEqual(snapshot(), before);
  const warnings = await host.logs!.read('Event', { type: 'Warning' });
  assert.ok(warnings.entries.some((e) => e.message.includes('XML publishing write refused')));
  assert.equal(code((await post('-new&Name=SameOrigin', 'fmresultset', { origin: new URL(base).origin })).text), '0');
  assert.equal(code((await post('-new&Name=PHP')).text), '0');
  const empty = await xml('fmresultset', `${FIND}&-new`, { authorization: ann, 'content-type': 'application/x-www-form-urlencoded' }, { method: 'POST' });
  assert.equal(code(empty.text), '3');
});

test('501 field pairs and oversized bodies fail without partial writes; scripts remain refused', async () => {
  const before = snapshot();
  assert.equal(code((await post('-new&' + Array.from({ length: 501 }, () => 'Name=x').join('&'))).text), '960');
  assert.notEqual(code((await post('-new&Name=' + 'x'.repeat(65536))).text), '0');
  for (const script of ['-script=Touch', '-script.param=1', '-script.prefind=Touch', '-script.presort=Touch']) {
    assert.equal(code((await post(`-new&Name=Denied&${script}`)).text), '960');
  }
  assert.equal(code((await post('-new&-script=Touch', 'fmresultset', { authorization: 'Basic ' + btoa('Cy:pw') })).text), '9');
  assert.deepEqual(snapshot(), before);
});

test('portal edits and row creation use the Data API store path and roll back together', async () => {
  const row = store.find('Calls', { query: [{ Note: 'hello' }] }).records[0];
  assert.equal(code((await post(`-edit&-recid=1&Calls::Note.${row.recordId}=updated&Calls::Note.0=new`)).text), '0');
  assert.equal(store.get('Calls', row.recordId).fieldData.Note, 'updated');
  assert.equal(store.find('Calls', { query: [{ Note: 'new' }] }).foundCount, 1);
  const before = store.find('Calls').records;
  assert.equal(code((await post(`-edit&-recid=1&Calls::Note.${row.recordId}=partial&Calls::Note.999999=bad`)).text), '101');
  assert.deepEqual(store.find('Calls').records, before);
  assert.equal(code((await post('-edit&-recid=1&-modid=999&Calls::Note.0=stale')).text), '306');
  assert.deepEqual(store.find('Calls').records, before);
});

test('auto-enter, validation, field privileges and prohibited entry use store rules', async () => {
  store.applyDesign([{ op: 'createTable', name: 'Entry', fields: [
    { name: 'Code', options: { validation: { notEmpty: true } } },
    { name: 'Qty', type: 'number', options: { validation: { always: true, range: { min: '1', max: '10' } } } },
    { name: 'Locked', options: { autoEnter: { prohibitModification: true } } },
    { name: 'Creator', options: { autoEnter: { value: 'creationAccountName' } } },
  ] }] as DesignOp[]);
  const entry = (args: string, headers: Record<string, string> = {}) => xml('fmresultset', '', {
    authorization: ann, 'content-type': 'application/x-www-form-urlencoded', ...headers,
  }, { method: 'POST', body: `-db=X&-lay=Entry&${args}` });
  assert.equal(code((await entry('-new&Qty=2')).text), '509');
  assert.equal(code((await entry('-new&Code=A&Qty=20')).text), '503');
  assert.equal(code((await entry('-new&Code=A&Qty=2&Locked=x')).text), '201');
  assert.equal(store.find('Entry').totalCount, 0);
  const made = await entry('-new&Code=A&Qty=2');
  assert.equal(code(made.text), '0');
  assert.match(made.text, /<field name="Creator"><data>Ann<\/data>/);
  const id = recordId(made.text);
  store.savePrivilegeSet({ name: 'Field reader', extendedPrivileges: ['fmxml'], layouts: 'viewOnly', scripts: 'none',
    valueLists: 'viewOnly', records: { view: true, edit: true, create: true, delete: true },
    tables: { Entry: { view: true, edit: true, create: true, delete: true, fields: { Code: 'viewOnly' } } },
  } as never);
  store.setPassword('FieldReader', 'pw', 'Field reader');
  assert.equal(code((await entry(`-edit&-recid=${id}&Code=Denied`, { authorization: 'Basic ' + btoa('FieldReader:pw') })).text), '201');
  assert.equal(store.get('Entry', id).fieldData.Code, 'A');
});

test('explicit serve option enables XML writes with the environment switch off', async () => {
  delete process.env.TABULARIUS_XML_PUBLISHING_WRITES;
  const enabled = await serve({ dir, port: 0, watch: false, log: () => {}, xmlPublishingWrites: true });
  try {
    const response = await fetch(`${enabled.url}/fmi/xml/fmresultset.xml`, {
      method: 'POST', headers: { authorization: ann, 'content-type': 'application/x-www-form-urlencoded' },
      body: `${FIND}&-new&Name=ExplicitOption`,
    });
    assert.equal(code(await response.text()), '0');
  } finally {
    await new Promise<void>((resolve) => enabled.server.close(() => resolve()));
    process.env.TABULARIUS_XML_PUBLISHING_WRITES = '1';
  }
});

test('read-only API tokens cannot write; write tokens still obey browser origin checks', async () => {
  const readOnly = store.createApiToken('Ann', { readOnly: true });
  const writable = store.createApiToken('Ann', { readOnly: false });
  const before = snapshot();
  for (const command of ['new', 'edit', 'dup', 'delete']) {
    assert.equal(code((await post(`-${command}&-recid=1`, 'fmresultset', { authorization: `Bearer ${readOnly}` })).text), '9');
  }
  assert.equal(code((await post('-new&Name=Denied', 'fmresultset', {
    authorization: `Bearer ${writable}`, origin: 'https://evil.example',
  })).text), '3');
  assert.deepEqual(snapshot(), before);
  assert.equal(code((await post('-new&Name=Token', 'fmresultset', { authorization: `Bearer ${writable}` })).text), '0');
});
