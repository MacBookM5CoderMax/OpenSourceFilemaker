// A page that swaps its "Loading…" for the words of a failed request must say so to a screen reader: the paragraph is
// added after the page loaded, so it is only spoken if it is a live region (role alert or status). The same rule as
// page-state-announced.test.ts, for the panels inside the Design, Security and Dashboards pages and the web client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..', 'src');
const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : n.endsWith('.ts') ? [join(dir, n)] : []));

/** A cell of the script debugger's variable grid shows a failed read in place; a grid of cells must not announce each one. */
const isCell = (name: string, props: string) => name === 'debugger/main.ts' && props.includes("class: 'g-err'");

test('every paragraph, span or box built from the words of a failure carries role alert or status', () => {
  const bad: string[] = [];
  let found = 0;
  for (const file of files(root)) {
    const name = relative(root, file).split('\\').join('/');
    const src = readFileSync(file, 'utf8');
    // h('p', { props }, errorText(e)) or h('p', { props }, `Couldn't do it: ${errorText(e)}`)
    for (const m of src.matchAll(/h\('(?:p|span|div)', (\{[^{}]*\}|\{\}), (?:`[^`]*?\$\{)?(?:errorText|plainMessage)\((?:e|err|error)\)/g)) {
      if (isCell(name, m[1])) continue;
      found++;
      if (!/role: '(?:alert|status)'/.test(m[1])) bad.push(`${name}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  assert.ok(found >= 34, `expected to find the 34 failure paragraphs and boxes, found ${found}`);
  assert.deepEqual(bad, []);
});

test('the failure of a panel that loads on its own is an alert, and a missing phone preview is a status', () => {
  for (const [file, pattern] of [
    ['design/script-tests.ts', /class: 'se-error', role: 'alert' \}, errorText\(e\)/],
    ['design/script-depends.ts', /class: 'd-error', role: 'alert' \}, errorText\(e\)/],
    ['design/catalog.ts', /class: 'd-error', role: 'alert' \}, `Couldn't check the draft/],
    ['security/privilege-sets.ts', /class: 'sec-bad', role: 'alert' \}, `Couldn't preview/],
    ['dashboards/digest.ts', /class: 'dash-error', role: 'alert' \}, plainMessage\(e\)/],
    ['connection-card.ts', /class: 'ai-note', role: 'alert' \}, plainMessage\(e\)/],
    ['design/layout-editor.ts', /class: 'd-muted', role: 'status' \}, `No phone preview/],
  ] as const) assert.match(readFileSync(join(root, file), 'utf8'), pattern, file);
  const doc = readFileSync(join(import.meta.dirname, '..', '..', '..', 'docs', 'accessibility.md'), 'utf8');
  assert.equal(doc.split('**Failures inside a panel.**').length - 1, 1, 'docs/accessibility.md describes the announcement once');
});
