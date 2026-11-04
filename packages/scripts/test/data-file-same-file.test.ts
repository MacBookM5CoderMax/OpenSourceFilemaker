// The data-file steps know a file by what it is, not by how its name is spelled: on a disk that ignores case (macOS and
// Windows by default) Notes.txt and NOTES.TXT are one file, and a file that is open under one is open under the other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, linkSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, parseScriptText, Store } from '@tabularius/store';
import { runScript } from '../src/index.ts';

async function inFolder(body: (dir: string, run: (text: string) => Promise<string | undefined>) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-same-file-'));
  createStore(join(dir, 'Data.sqlite'));
  const store = new Store(join(dir, 'Data.sqlite'), 'Data');
  try {
    store.applyDesign([{ op: 'createTable', name: 'Items', fields: [{ name: 'Name' }] }]);
    const run = async (text: string) => {
      const steps = parseScriptText(`Set Error Capture [ On ]\n${text}\nSet Variable [ $error ; Value: Get ( LastError ) ]\nExit Script [ Text Result: $error ]`, store.schema)
        .map((s) => ({ stepId: s.stepId!, name: s.name!, enabled: s.enabled !== false, params: s.params }));
      return (await runScript(store, { id: 9999, name: 'Files', steps }, { layout: 'Items', documents: dir })).result;
    };
    await body(dir, run);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Whether this disk reads NOTES.TXT as Notes.txt, found by looking (the test makes Notes.txt first). */
const ignoresCase = (dir: string) => existsSync(join(dir, 'NOTES.TXT'));

test('a file open as Notes.txt is open as NOTES.TXT', async () => {
  await inFolder(async (dir, run) => {
    writeFileSync(join(dir, 'Notes.txt'), 'kept');
    const caseInsensitive = ignoresCase(dir);
    // Delete File: busy where the names are one file (300); where they are two, the other name is simply not there (100).
    assert.equal(await run('Open Data File [ "Notes.txt" ; Target: $id ]\nDelete File [ Target file: "NOTES.TXT" ]'), caseInsensitive ? '300' : '100');
    assert.equal(readFileSync(join(dir, 'Notes.txt'), 'utf8'), 'kept');
    // Create Data File replaces a file that exists, so it must not do that to an open one.
    if (caseInsensitive) assert.equal(await run('Open Data File [ "Notes.txt" ; Target: $id ]\nCreate Data File [ "NOTES.TXT" ]'), '300');
    assert.equal(readFileSync(join(dir, 'Notes.txt'), 'utf8'), 'kept');
    // Open Data File twice.
    if (caseInsensitive) assert.equal(await run('Open Data File [ "Notes.txt" ; Target: $id ]\nOpen Data File [ "NOTES.TXT" ; Target: $id2 ]'), '300');
  });
});

test('Rename File to the same name in another case is allowed', async () => {
  await inFolder(async (dir, run) => {
    writeFileSync(join(dir, 'Notes.txt'), 'kept');
    // On a disk that ignores case NOTES.TXT is Notes.txt already; on one that does not, a link makes the same file
    // reachable by both names, which asks the same question.
    if (!ignoresCase(dir)) linkSync(join(dir, 'Notes.txt'), join(dir, 'NOTES.TXT'));
    assert.equal(await run('Rename File [ Source file: "Notes.txt" ; New name: "NOTES.TXT" ]'), '0');
    assert.ok(readdirSync(dir).includes('NOTES.TXT'));
    assert.equal(readFileSync(join(dir, 'NOTES.TXT'), 'utf8'), 'kept');
  });
});

test('Rename File still refuses a name that is another file, in any case', async () => {
  await inFolder(async (dir, run) => {
    writeFileSync(join(dir, 'a.txt'), 'first');
    writeFileSync(join(dir, 'b.txt'), 'second');
    assert.equal(await run('Rename File [ Source file: "a.txt" ; New name: "b.txt" ]'), '300');
    // Another file whose name differs from the new one only in case (on a disk that tells them apart).
    writeFileSync(join(dir, 'B2.TXT'), 'third');
    const caseInsensitive = existsSync(join(dir, 'b2.txt'));
    if (!caseInsensitive) writeFileSync(join(dir, 'b2.txt'), 'fourth');
    if (!caseInsensitive) assert.equal(await run('Rename File [ Source file: "b2.txt" ; New name: "B2.TXT" ]'), '300');
    assert.equal(readFileSync(join(dir, 'a.txt'), 'utf8'), 'first');
    assert.equal(readFileSync(join(dir, 'b.txt'), 'utf8'), 'second');
    assert.equal(readFileSync(join(dir, 'B2.TXT'), 'utf8'), 'third');
  });
});

test('a file that was open and is closed can be deleted', async () => {
  await inFolder(async (dir, run) => {
    writeFileSync(join(dir, 'Notes.txt'), 'x');
    assert.equal(await run('Open Data File [ "Notes.txt" ; Target: $id ]\nClose Data File [ File ID: $id ]\nDelete File [ Target file: "Notes.txt" ]'), '0');
    assert.ok(!existsSync(join(dir, 'Notes.txt')));
  });
});
