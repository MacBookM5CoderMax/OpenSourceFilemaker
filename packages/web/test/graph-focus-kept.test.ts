// Selecting a relationship line or a box redraws the whole graph, which drops the focus a key press had on it. The graph
// puts focus back on the new copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { graphFocusSelector, restoreGraphFocus } from '../src/design/graph.ts';

const read = (name: string) => readFileSync(new URL(`../src/design/${name}`, import.meta.url), 'utf8');

test('the selector names a line by its relationship id and a box by its occurrence id', () => {
  assert.equal(graphFocusSelector('rel', 7), '.d-rel[data-rel="7"]');
  assert.equal(graphFocusSelector('to', 3), '.d-to[data-to="3"]');
});

test('focus goes to the new line or box, and nowhere when the graph is gone or the element is', () => {
  const focused: unknown[] = [];
  const asked: string[] = [];
  const el = { focus: (o?: unknown) => focused.push(o) };
  const canvas = (connected: boolean, found: typeof el | null) => ({ isConnected: connected, querySelector: (s: string) => (asked.push(s), found) });
  assert.equal(restoreGraphFocus(canvas(true, el), { kind: 'rel', id: 5 }), true);
  assert.deepEqual(asked, ['.d-rel[data-rel="5"]']);
  assert.deepEqual(focused, [{ preventScroll: true }]);
  assert.equal(restoreGraphFocus(canvas(false, el), { kind: 'to', id: 5 }), false);
  assert.equal(restoreGraphFocus(canvas(true, null), { kind: 'to', id: 5 }), false);
  assert.equal(focused.length, 1);
});

test('a line carries data-rel, and a selection by key or click asks for the focus back before the redraw', () => {
  const src = read('graph.ts');
  assert.match(src, /'aria-pressed': String\(sel\.relationship === r\.id\), 'data-rel': r\.id \}/);
  assert.match(src, /refocus = \{ kind: 'rel', id: r\.id \};\s*studio\.render\(\);/);
  assert.match(src, /refocus = \{ kind: 'to', id: t\.id \};\s*studio\.render\(\);/);
  assert.match(src, /setTimeout\(\(\) => restoreGraphFocus\(canvas, want\), 0\)/);
});
