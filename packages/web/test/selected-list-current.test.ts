// The design and security pages show the chosen row of a list (a table, a theme, an account, ...) with the class
// "selected", which only sighted people see. The row's button must also say aria-current, with the same condition.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', 'src');
const files = ['design', 'security'].flatMap((dir) => readdirSync(join(root, dir)).filter((n) => n.endsWith('.ts')).map((n) => join(root, dir, n)));

test('every list row marked "selected" also marks its button aria-current when it is the chosen one', () => {
  const bad: string[] = [];
  let rows = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/h\('li', \{ class: ([^?{}]+?) \? 'selected' : ''(?:, draggable: 'true')? \}/g)) {
      rows++;
      const condition = m[1].trim();
      const line = src.slice(0, m.index).split('\n').length;
      const statement = src.slice(m.index, src.indexOf(');', m.index));
      if (!statement.includes(`'aria-current': ${condition} ? 'true' : undefined`)) bad.push(`${file}:${line} "${condition}" is shown as selected but the row's button has no matching aria-current`);
    }
  }
  assert.ok(rows >= 8, `expected to find the 8 selectable lists, found ${rows}`);
  assert.deepEqual(bad, []);
});
