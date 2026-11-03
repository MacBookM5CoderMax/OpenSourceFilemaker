// The "Used in" list of a custom function says a failure in an alert paragraph beside the list, not as a list item.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the "Used in" failure is an alert paragraph beside the list, not a list item', () => {
  const src = readFileSync(new URL('../src/design/catalog.ts', import.meta.url), 'utf8');
  const start = src.indexOf('function usedIn(');
  const body = src.slice(start, src.indexOf('\n}\n', start));
  assert.match(body, /h\('p', \{ class: 'd-error', role: 'alert' \}, errorText\(e\)\)/);
  assert.doesNotMatch(body, /h\('li', \{\}, errorText/);
  assert.match(body, /failure\?\.remove\(\)/);
  assert.match(readFileSync(new URL('../design.css', import.meta.url), 'utf8'), /\.d-report > \.d-error \{/);
});
