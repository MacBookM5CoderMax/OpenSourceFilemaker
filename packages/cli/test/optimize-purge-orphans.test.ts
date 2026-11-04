// `optimize <folder> --purge-orphans` removes the unreferenced container rows of every hosted file it reports on, not only the first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { runCli } from './cli-run.ts';

const main = join(import.meta.dirname, '..', 'src', 'main.ts');

/** A hosted file with one container row that no record points to (a record that had a picture, then was deleted, with its undo history cleared). */
function fileWithOrphan(dir: string, name: string): void {
  const path = join(dir, `${name}.openhbam.sqlite`);
  createStore(path);
  const store = new Store(path, name);
  try {
    store.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Name' }, { name: 'Pic', type: 'container' }] }] as never);
    const id = Number(store.create('Items', { Name: 'gone' }).recordId);
    store.setContainer('Items', id, 'Pic', 1, { filename: 'a.png', mime: 'image/png', data: Uint8Array.of(1, 2, 3) });
    store.delete('Items', id);
    store.sql.prepare("DELETE FROM _fm_audit WHERE tbl = 'Items'").run();
    assert.equal(store.orphanContainerReport().count, 1);
  } finally {
    store.close();
  }
}

function orphans(dir: string, name: string): number {
  const store = new Store(join(dir, `${name}.openhbam.sqlite`), name);
  try { return store.orphanContainerReport().count; } finally { store.close(); }
}

test('optimize --purge-orphans on a folder purges every hosted file, and without it purges none', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-optimize-purge-'));
  try {
    for (const name of ['Alpha', 'Beta', 'Gamma']) fileWithOrphan(dir, name);
    const plain = await runCli(main, ['optimize', dir], { env: process.env });
    assert.equal(plain.status, 0, plain.stderr);
    for (const name of ['Alpha', 'Beta', 'Gamma']) assert.equal(orphans(dir, name), 1, `${name} untouched without the option`);
    const purge = await runCli(main, ['optimize', dir, '--purge-orphans'], { env: process.env });
    assert.equal(purge.status, 0, purge.stderr);
    for (const name of ['Alpha', 'Beta', 'Gamma']) assert.equal(orphans(dir, name), 0, `${name} purged`);
    assert.equal((purge.stdout.match(/purged 1/g) ?? []).length, 3, purge.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('optimize --purge-orphans for one named file leaves the others alone, whichever side of the name the option is on', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-optimize-purge-one-'));
  try {
    for (const name of ['Alpha', 'Beta', 'Gamma']) fileWithOrphan(dir, name);
    const after = await runCli(main, ['optimize', dir, 'Beta', '--purge-orphans'], { env: process.env });
    assert.equal(after.status, 0, after.stderr);
    assert.deepEqual(['Alpha', 'Beta', 'Gamma'].map((n) => orphans(dir, n)), [1, 0, 1]);
    const before = await runCli(main, ['optimize', dir, '--purge-orphans', 'Gamma', '--json'], { env: process.env });
    assert.equal(before.status, 0, before.stderr);
    assert.deepEqual(['Alpha', 'Beta', 'Gamma'].map((n) => orphans(dir, n)), [1, 0, 0], 'the name after the option is still the one file');
    const report = JSON.parse(before.stdout);
    assert.equal(Array.isArray(report), false, 'one named file prints one report');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('optimize refuses an option it does not know before it reports or purges anything', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-optimize-stray-'));
  try {
    fileWithOrphan(dir, 'Alpha');
    for (const typo of ['--purge-orphan', '--purge', '--jsno']) {
      const r = await runCli(main, ['optimize', dir, typo], { env: process.env });
      assert.equal(r.status, 1, typo);
      assert.equal(r.stdout, '', typo);
      assert.match(r.stderr, new RegExp(`^error: optimize: ${typo} is not an option it knows; it takes --json and --purge-orphans$`, 'm'));
    }
    assert.equal(orphans(dir, 'Alpha'), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
