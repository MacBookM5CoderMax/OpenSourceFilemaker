// docs/accessibility.md lists every panel of the admin console and the Design, Security and page-state work that
// keeps a screen reader informed. The list is the one a reader trusts for "what was checked", so it has to follow the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..', '..');
const doc = readFileSync(join(root, 'docs', 'accessibility.md'), 'utf8');
const page = readFileSync(join(root, 'packages', 'server', 'admin', 'index.html'), 'utf8');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('every panel of the admin console has a row in the interactive-state inventory, and every row is a panel', () => {
  const panels = page.slice(page.indexOf('<main')).split(/<section\b/).slice(1).map((part) => /<h2[^>]*>([^<]*)</.exec(part)?.[1].trim() ?? '');
  assert.ok(panels.length >= 38 && panels.every(Boolean), `found ${panels.length} panels`);
  const rows = [...doc.matchAll(/^\| ([^|]+) \| Isolated panel axe scan[^|]*\|$/gm)].map((m) => m[1].trim());
  // The first panel's heading is "Welcome to Tabularius"; its row says "Welcome".
  const matches = (panel: string, row: string) => panel === row || (row === 'Welcome' && panel.startsWith('Welcome'));
  assert.deepEqual(panels.filter((panel) => !rows.some((row) => matches(panel, row))), [], 'panels with no row');
  assert.deepEqual(rows.filter((row) => !panels.some((panel) => matches(panel, row))), [], 'rows with no panel');
  assert.equal(rows.length, panels.length);
});

test('the web client entries for relationship lines, chosen rows and page states match the code they describe', () => {
  for (const heading of ['**Relationship lines (2.1.1, 4.1.2).**', '**The chosen row of a list (4.1.2).**', '**Empty, failed and fatal states (4.1.3).**']) {
    assert.equal(doc.split(heading).length - 1, 1, heading);
  }
  const graph = read('packages/web/src/design/graph.ts');
  assert.match(graph, /tabindex: 0, role: 'button', 'aria-label': relationshipName\(r\), 'aria-pressed'/);
  assert.match(graph, /e\.key === 'Enter' \|\| e\.key === ' '/);
  assert.match(read('packages/web/design.css'), /\.d-rel:focus-visible \.d-rel-line/);
  // The eight list builders the entry names: each marks its chosen row's button.
  const builders = ['design/catalog.ts', 'design/menus.ts', 'design/order.ts', 'design/schema.ts', 'design/styles.ts', 'security/accounts.ts', 'security/privilege-sets.ts']
    .map((file) => (read(`packages/web/src/${file}`).match(/'aria-current': [^?]+ \? 'true' : undefined/g) ?? []).length);
  assert.deepEqual(builders, [1, 1, 1, 1, 2, 1, 1]);
  assert.match(doc, /eight builders/);
  // The pages the entry names.
  for (const file of ['main.ts', 'design/main.ts', 'security/main.ts', 'dashboards/main.ts', 'automations/main.ts', 'cleanup/main.ts', 'dataviewer/main.ts', 'debugger/main.ts']) {
    assert.match(read(`packages/web/src/${file}`), /role: '(?:alert|status)'/, file);
  }
  assert.ok(existsTest('packages/web/test/page-state-announced.test.ts') && existsTest('packages/web/test/selected-list-current.test.ts') && existsTest('packages/web/test/graph-occurrence.test.ts'));
});

function existsTest(path: string): boolean {
  try { return read(path).length > 0; } catch { return false; }
}
