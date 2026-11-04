import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createStore, Store } from '../src/index.ts';
import * as chain from '../src/security-chain.ts';
import { anchorHead, checkAnchor } from '../src/audit-anchor.ts';

const DAY = 86_400_000;
const NOW = Date.parse('2026-06-01T00:00:00.000Z');
const at = (days: number) => new Date(NOW - days * DAY).toISOString();
const key = Buffer.alloc(32, 7);
function withStore(run: (store: Store, path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-security-prune-'));
  const path = join(dir, 'Test.openhbam.sqlite');
  createStore(path);
  const store = new Store(path);
  try { run(store, path); } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
}
function events(store: Store, ages = [60, 50, 40, 30, 20]) {
  for (const age of ages) chain.appendSecurityEvent(store.sql, at(age), 'Member', 'sign-in', '{"from":"local"}', 0);
}

test('pruning a middle prefix records the audit seq, preserves record rows and counts only retained events', () => withStore((s, path) => {
  events(s, [60]);
  s.sql.exec("INSERT INTO _fm_audit (at, kind, tbl) VALUES ('old', 'create', 'Records')");
  events(s, [50, 40, 30, 20]);
  const head = chain.verifySecurityAudit(path).head;
  assert.equal(chain.pruneSecurityEntries(s.sql, 3, at(0)), 2);
  const result = chain.verifySecurityAudit(path);
  assert.equal(result.status, 'consistent');
  assert.equal(result.checked, 3);
  assert.deepEqual(result.pruned, { throughSeq: '3', at: at(0) });
  assert.deepEqual(result.head, head);
  assert.ok(s.sql.prepare('SELECT 1 FROM _fm_audit WHERE seq = 2 AND security = 0').get());
  assert.equal(chain.pruneSecurityEntries(s.sql, 3, at(-1)), 0);
  assert.deepEqual(chain.verifySecurityAudit(path), result, 'a no-op does not move the anchor');
}));

test('legacy baseline pruning accumulates only removed legacy rows across repeated prunes', () => withStore((s, path) => {
  s.sql.exec('DROP TABLE _fm_security_chain_state');
  for (let i = 0; i < 4; i++) s.sql.prepare("INSERT INTO _fm_audit (at, kind, tbl, security, agent) VALUES (?, 'sign-in', '', 1, 0)").run(at(60));
  chain.ensureSecurityChain(s.sql);
  const genesis = s.sql.prepare('SELECT genesis_hash, legacy_count FROM _fm_security_chain_state').get()!;
  events(s, [20, 10]);
  assert.equal(chain.pruneSecurityEntries(s.sql, 2, at(0)), 2);
  assert.equal(chain.verifySecurityAudit(path).status, 'consistent');
  assert.equal(s.sql.prepare('SELECT pruned_legacy FROM _fm_security_chain_state').get()!.pruned_legacy, 2);
  assert.equal(chain.pruneSecurityEntries(s.sql, 5, at(0)), 3);
  assert.equal(chain.verifySecurityAudit(path).status, 'consistent');
  assert.equal(chain.verifySecurityAudit(path).checked, 1);
  assert.equal(s.sql.prepare('SELECT pruned_legacy FROM _fm_security_chain_state').get()!.pruned_legacy, 4);
  assert.deepEqual(s.sql.prepare('SELECT genesis_hash, legacy_count FROM _fm_security_chain_state').get(), genesis);
  s.sql.exec('UPDATE _fm_security_chain_state SET pruned_legacy = 3');
  assert.match(chain.verifySecurityAudit(path).reason!, /legacy baseline count mismatch/);
}));

for (const [name, mutate, seq, reason] of [
  ['retained payload', (s: Store) => s.sql.exec("UPDATE _fm_audit SET changes = '{}' WHERE seq = 4"), '4', /event hash mismatch/],
  ['anchor hash', (s: Store) => s.sql.prepare('UPDATE _fm_security_chain_state SET pruned_hash = ?').run('f'.repeat(64)), '3', /previous hash mismatch/],
  ['oldest retained row', (s: Store) => s.sql.exec('DELETE FROM _fm_audit WHERE seq = 3'), '4', /missing or out-of-order chain position/],
  ['retained tail', (s: Store) => s.sql.exec('DELETE FROM _fm_audit WHERE seq >= 3'), '5', /stored head mismatch/],
] as const) {
  test(`tampering with ${name} after a prune is broken`, () => withStore((s, path) => {
    events(s);
    chain.pruneSecurityEntries(s.sql, 2, at(0));
    mutate(s);
    const result = chain.verifySecurityAudit(path);
    assert.equal(result.status, 'broken');
    assert.equal(result.firstBrokenSeq, seq);
    assert.match(result.reason!, reason);
  }));
}

test('head clamp retains the final row and subsequent appends link to that head', () => withStore((s, path) => {
  assert.equal(chain.pruneSecurityEntries(s.sql, 9223372036854775807n, at(0)), 0);
  events(s);
  const head = chain.verifySecurityAudit(path).head!;
  assert.equal(chain.pruneSecurityEntries(s.sql, 9223372036854775807n, at(0)), 4);
  assert.equal(chain.verifySecurityAudit(path).checked, 1);
  assert.equal(chain.verifySecurityAudit(path).status, 'consistent');
  assert.equal(chain.pruneSecurityEntries(s.sql, 9223372036854775807n, at(0)), 0);
  events(s, [0]);
  assert.equal(s.sql.prepare('SELECT prev_hash FROM _fm_audit WHERE seq = 6').get()!.prev_hash, head.hash);
  assert.equal(chain.verifySecurityAudit(path).status, 'consistent');
}));

test('pruning keeps 64-bit audit sequences exact', () => withStore((s, path) => {
  s.sql.exec("INSERT INTO sqlite_sequence (name, seq) VALUES ('_fm_audit', 9007199254740992)");
  events(s);
  assert.equal(chain.pruneSecurityEntries(s.sql, 9007199254740993n, at(0)), 1);
  assert.equal(chain.verifySecurityAudit(path).pruned?.throughSeq, '9007199254740993');
  assert.equal(chain.verifySecurityAudit(path).status, 'consistent');
}));

test('pruning rollback restores rows and anchor both standalone and in a caller transaction', () => withStore((s, path) => {
  events(s);
  const before = chain.verifySecurityAudit(path);
  s.sql.exec("CREATE TRIGGER fail_prune BEFORE UPDATE OF pruned_hash ON _fm_security_chain_state BEGIN SELECT RAISE(ABORT, 'prune interrupted'); END");
  for (const nested of [false, true]) {
    if (nested) s.sql.exec('BEGIN');
    assert.throws(() => chain.pruneSecurityEntries(s.sql, 2, at(0)), /prune interrupted/);
    assert.equal(s.sql.isTransaction, nested);
    assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM _fm_audit').get()!.n, 5);
    if (nested) s.sql.exec('ROLLBACK');
    assert.deepEqual(chain.verifySecurityAudit(path), before);
  }
}));

test('old v1 files verify read-only and gain only default anchor columns on reopen', () => withStore((s, path) => {
  events(s);
  const before = chain.verifySecurityAudit(path);
  for (const column of ['pruned_seq', 'pruned_audit_seq', 'pruned_hash', 'pruned_at', 'pruned_legacy']) s.sql.exec(`ALTER TABLE _fm_security_chain_state DROP COLUMN ${column}`);
  assert.deepEqual(chain.verifySecurityAudit(path), before);
  const old = s.sql.prepare('SELECT * FROM _fm_security_chain_state').get()!;
  const anchor = anchorHead(path, 'security', key)!;
  assert.equal(checkAnchor(path, anchor, key).status, 'matches');
  const reopened = new Store(path);
  try {
    assert.deepEqual(chain.verifySecurityAudit(path), before);
    const state = reopened.sql.prepare('SELECT * FROM _fm_security_chain_state').get()!;
    for (const [name, value] of Object.entries(old)) assert.equal(state[name], value, name);
    assert.equal(state.pruned_seq, 0);
    assert.equal(state.pruned_legacy, 0);
  } finally { reopened.close(); }
}));

test('held anchors before, at and after the pruning boundary are distinguished', () => withStore((s, path) => {
  const genesis = anchorHead(path, 'security', key)!;
  events(s, [60]);
  const old = anchorHead(path, 'security', key)!;
  events(s, [50]);
  const boundary = anchorHead(path, 'security', key)!;
  events(s, [40]);
  const retained = anchorHead(path, 'security', key)!;
  chain.pruneSecurityEntries(s.sql, 2, at(0));
  for (const anchor of [genesis, old]) {
    const result = checkAnchor(path, anchor, key);
    assert.equal(result.status, 'older-than-log');
    assert.ok(!result.ok);
    assert.match(result.reason, /older than the pruned start/);
  }
  assert.equal(checkAnchor(path, boundary, key).status, 'matches');
  assert.equal(checkAnchor(path, retained, key).status, 'matches');
}));

test('security retention defaults to unlimited; whole-day choices persist and other changes preserve them', () => withStore((s, path) => {
  events(s);
  assert.equal(s.auditSettings().securityRetentionDays, 0);
  assert.equal(s.pruneAudit(0, NOW + 1000 * DAY), 0);
  assert.equal(chain.verifySecurityAudit(path).checked, 5);
  for (const value of [-1, 29, 1.5, 36501, NaN, Infinity]) {
    assert.throws(() => s.setAuditSettings({ securityRetentionDays: value }), /whole number of days/);
    assert.equal(s.auditSettings().securityRetentionDays, 0);
  }
  for (const value of [36500, 30, 0]) {
    s.setAuditSettings({ securityRetentionDays: value });
    assert.equal(s.setAuditSettings({ logReads: true }).securityRetentionDays, value);
    const reopened = new Store(path);
    try { assert.equal(reopened.auditSettings().securityRetentionDays, value); } finally { reopened.close(); }
  }
}));

test('retention honors the exact cutoff, changed settings and time, and emits one security prune event', () => withStore((s, path) => {
  events(s);
  s.setAuditSettings({ retentionDays: 0, securityRetentionDays: 50 });
  assert.equal(s.pruneAudit(undefined, NOW), 1);
  assert.equal(s.sql.prepare('SELECT 1 FROM _fm_audit WHERE seq = 2').get() !== undefined, true, 'exactly 50 days old is retained');
  s.setAuditSettings({ securityRetentionDays: 30 });
  assert.equal(s.pruneAudit(undefined, NOW), 2);
  assert.equal(s.sql.prepare('SELECT 1 FROM _fm_audit WHERE seq = 4').get() !== undefined, true, 'exactly 30 days old is retained');
  assert.equal(s.pruneAudit(undefined, NOW - DAY), 0, 'moving time back removes nothing more');
  assert.equal(s.pruneAudit(undefined, NOW + DAY), 1);
  const prunes = s.sql.prepare("SELECT changes FROM _fm_audit WHERE kind = 'audit-pruned' ORDER BY seq").all();
  assert.equal(prunes.length, 3);
  assert.deepEqual(prunes.map((r) => JSON.parse(String(r.changes))), [
    { chain: 'security', removed: 1, through: '1', days: 50 },
    { chain: 'security', removed: 2, through: '3', days: 30 },
    { chain: 'security', removed: 1, through: '4', days: 30 },
  ]);
  assert.equal(chain.verifySecurityAudit(path).status, 'consistent');
  assert.equal(chain.verifySecurityAudit(path).pruned?.at, new Date(NOW + DAY).toISOString());
}));

test('retention never removes a newer event when timestamps are out of sequence', () => withStore((s, path) => {
  events(s, [60, 10, 50, 0]);
  s.setAuditSettings({ securityRetentionDays: 30 });
  assert.equal(s.pruneAudit(0, NOW), 1);
  assert.ok(s.sql.prepare('SELECT 1 FROM _fm_audit WHERE seq = 2').get());
  assert.equal(chain.verifySecurityAudit(path).status, 'consistent');
}));

test('security pruning and its audit event roll back together on append failure', () => withStore((s, path) => {
  events(s);
  s.setAuditSettings({ securityRetentionDays: 30 });
  const before = chain.verifySecurityAudit(path);
  s.sql.exec("CREATE TRIGGER fail_prune_log BEFORE INSERT ON _fm_audit WHEN NEW.kind = 'audit-pruned' BEGIN SELECT RAISE(ABORT, 'log interrupted'); END");
  assert.throws(() => s.pruneAudit(0, NOW), /log interrupted/);
  assert.deepEqual(chain.verifySecurityAudit(path), before);
}));

test('a prune between held-anchor state and row reads cannot report false tampering', (t) => withStore((s, path) => {
  events(s, [60]);
  const anchor = anchorHead(path, 'security', key)!;
  events(s, [50, 40]);
  const prepare = DatabaseSync.prototype.prepare;
  let pruned = false;
  t.mock.method(DatabaseSync.prototype, 'prepare', function (this: DatabaseSync, query: string) {
    const statement = prepare.call(this, query);
    if (query === 'SELECT * FROM _fm_security_chain_state WHERE id = 1') {
      const get = statement.get.bind(statement);
      t.mock.method(statement, 'get', (...args: Parameters<typeof statement.get>) => {
        const state = get(...args);
        if (!pruned) {
          pruned = true;
          chain.pruneSecurityEntries(s.sql, 2, at(0));
        }
        return state;
      });
    }
    return statement;
  });
  assert.equal(checkAnchor(path, anchor, key).status, 'matches', 'comparison uses the snapshot before the concurrent prune');
  assert.ok(pruned);
  assert.equal(checkAnchor(path, anchor, key).status, 'older-than-log', 'a fresh comparison sees the pruning boundary');
}));
