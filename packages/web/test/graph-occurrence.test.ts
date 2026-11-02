import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { occurrenceChange, relationshipName, selectsLine } from '../src/design/graph.ts';

test('editing an occurrence with no base table omits the empty table selection', () => {
  assert.deepEqual(occurrenceChange({ id: 4, name: 'Old' }, 'Renamed', '', '#123456'), {
    op: 'updateOccurrence', occurrence: 4, name: 'Renamed', color: '#123456',
  });
});

test('a relationship line is named by its two occurrences and its comparisons, with a fallback for unnamed sides', () => {
  assert.equal(relationshipName({
    id: 1, leftTableOccurrenceId: 1, rightTableOccurrenceId: 2, leftTableOccurrence: 'Invoices', rightTableOccurrence: 'Customers',
    predicates: [{ leftFieldId: 1, operator: '=', rightFieldId: 2, leftField: 'CustomerID', rightField: 'ID' }, { leftFieldId: 3, operator: '≥', rightFieldId: 4, leftField: 'Date', rightField: 'Since' }],
  }), 'Relationship between Invoices and Customers: CustomerID = ID, Date ≥ Since');
  assert.equal(relationshipName({ id: 2, leftTableOccurrenceId: 1, rightTableOccurrenceId: 2, predicates: [] }), 'Relationship between the left table and the right table');
  assert.equal(relationshipName({ id: 3, leftTableOccurrenceId: 1, rightTableOccurrenceId: 2, predicates: [{ leftFieldId: 1, operator: '=', rightFieldId: 2 }] }),
    'Relationship between the left table and the right table: a field = a field');
});

test('Enter and Space select a relationship line, and a shortcut with a modifier does not', () => {
  assert.equal(selectsLine({ key: 'Enter' }), true);
  assert.equal(selectsLine({ key: ' ' }), true);
  assert.equal(selectsLine({ key: 'Tab' }), false);
  assert.equal(selectsLine({ key: 'Enter', metaKey: true }), false);
  assert.equal(selectsLine({ key: ' ', ctrlKey: true }), false);
  assert.equal(selectsLine({ key: 'Enter', altKey: true }), false);
});

test('the graph makes each relationship line a focusable button that selects on Enter and Space', () => {
  const src = readFileSync(new URL('../src/design/graph.ts', import.meta.url), 'utf8');
  const start = src.indexOf("const g = svg('g', { class: `d-rel");
  const block = src.slice(start, src.indexOf('canvas.append(g);', start));
  assert.match(block, /tabindex: 0, role: 'button', 'aria-label': relationshipName\(r\)/);
  assert.match(block, /g\.addEventListener\('keydown', \(e\) => \{\s*if \(!selectsLine\(e\)\) return;/);
  const css = readFileSync(new URL('../design.css', import.meta.url), 'utf8');
  assert.match(css, /\.d-rel:focus-visible \.d-rel-line/);
});
