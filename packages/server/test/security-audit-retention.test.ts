import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../../store/src/index.ts';
import { appendSecurityEvent } from '../../store/src/security-chain.ts';
import { Readable, Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Host } from '../src/host.ts';
import { Admin } from '../src/admin.ts';
import { DataApi } from '../src/dataapi.ts';
import { SecurityAuditVerifier } from '../src/security-audit.ts';

test('admin audit settings validate, persist and expose opt-in security retention', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-admin-retention-'));
  createStore(join(dir, 'Test.openhbam.sqlite'));
  const host = new Host(dir, () => {});
  const verifier = new SecurityAuditVerifier();
  const admin = new Admin(host, new DataApi(host), verifier);
  // Exercise the production handler with streams: no listener, service or child command is needed.
  const call = async (route: string, method = 'GET', body?: unknown) => {
    const req = Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]), {
      method, headers: { 'x-tabularius-admin': '1', 'content-type': 'application/json' },
      socket: { remoteAddress: '127.0.0.1', destroyed: false },
    }) as unknown as IncomingMessage;
    let status = 0, text = '';
    const response = Object.assign(new Writable({ write(chunk, _encoding, done) { text += chunk.toString(); done(); } }), {
      writeHead(code: number) { status = code; return this; },
    });
    await admin.handle(req, response as unknown as ServerResponse, new URL(route, 'http://localhost'));
    return { status, json: async () => JSON.parse(text) };
  };
  try {
    const url = '/tabularius/admin/v1/audit/settings?database=Test';
    const get = async () => (await call(url)).json();
    const put = (body: unknown) => call(url, 'PUT', body);
    assert.equal((await get()).securityRetentionDays, 0);
    for (const value of [null, '30', true, 29, 1.5, -1, 36501]) {
      const response = await put({ securityRetentionDays: value });
      assert.equal(response.status, 400, String(value));
      assert.equal((await get()).securityRetentionDays, 0);
    }
    for (const value of [30, 36500, 0]) {
      const response = await put({ securityRetentionDays: value });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).securityRetentionDays, value);
      assert.equal((await get()).securityRetentionDays, value);
    }
    await put({ retentionDays: 0, securityRetentionDays: 30 });
    const store = host.get('Test')!;
    const now = Date.now() + 40 * 86_400_000;
    appendSecurityEvent(store.sql, new Date(now).toISOString(), 'Member', 'sign-in', null, 0);
    assert.ok(store.pruneAudit(undefined, now) > 0);
    const verified = await (await call('/tabularius/admin/v1/security-events/verify?database=Test')).json();
    assert.equal(verified.status, 'consistent');
    assert.ok(verified.pruned.throughSeq);
    assert.equal(verified.pruned.at, new Date(now).toISOString());
    assert.match(store.securityEvents({ category: 'Audit log' }).find((e) => e.kind === 'audit-pruned')!.description, /security events up to #\d+ removed/);
  } finally {
    await verifier.stop();
    await host.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
