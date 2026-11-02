// A page that swaps its "Loading…" for an error or a "Log in first" sentence must say so to a screen reader: the
// paragraph is added after the page loaded, so it is only spoken if it is a live region (role alert or status).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', 'src');
const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : n.endsWith('.ts') ? [join(dir, n)] : []));

test('every empty, error or fatal paragraph or box a page builds carries role alert or status', () => {
  const bad: string[] = [];
  let found = 0;
  for (const file of files(root)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/h\('(?:p|div)', \{ class: '(?:empty|d-empty|fatal)'([^}]*)\}/g)) {
      found++;
      if (!/role: '(?:alert|status)'/.test(m[1])) bad.push(`${file}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  assert.ok(found >= 24, `expected to find the 24 state paragraphs and boxes, found ${found}`);
  assert.deepEqual(bad, []);
});

test('a failure to start is an alert and a request to log in first is a status', () => {
  for (const [file, pattern] of [
    ['debugger/main.ts', /class: 'empty', role: 'alert' \}, `Couldn't start/], ['dataviewer/main.ts', /class: 'empty', role: 'alert' \}, `Couldn't start/],
    ['design/main.ts', /class: 'd-empty', role: 'alert' \}, `Couldn't start/], ['security/main.ts', /class: 'd-empty', role: 'alert' \}, `Couldn't start/],
    ['main.ts', /class: 'fatal', role: 'alert' \}, `Couldn't start/], ['cleanup/main.ts', /class: 'empty', role: 'status' \}, 'Log in to a file first/],
    ['automations/main.ts', /class: 'empty', role: 'alert' \}, plainMessage/],
  ] as const) assert.match(readFileSync(join(root, file), 'utf8'), pattern, file);
});
