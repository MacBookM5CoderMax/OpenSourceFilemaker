// downloadBase: the name, without extension, of a file the web client offers to save, kept as it is by Windows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadBase } from '../src/portable-path.ts';

test('an ordinary name is kept, spaces and accents included', () => {
  assert.equal(downloadBase('people'), 'people');
  assert.equal(downloadBase('Q3 Orders (final)'), 'Q3 Orders (final)');
  assert.equal(downloadBase('Bücher – Liste'), 'Bücher – Liste');
  assert.equal(downloadBase('a.b'), 'a.b');
});

test('characters Windows refuses become underscores', () => {
  assert.equal(downloadBase('a/b\\c:d*e?f"g<h>i|j'), 'a_b_c_d_e_f_g_h_i_j');
  assert.equal(downloadBase('a\u0000b\u001fc'), 'a_b_c');
});

test('a trailing dot or space is dropped, as Windows would drop it', () => {
  assert.equal(downloadBase('Orders. '), 'Orders');
  assert.equal(downloadBase('Orders...'), 'Orders');
  assert.equal(downloadBase('..'), 'export');
  assert.equal(downloadBase('   '), 'export');
  assert.equal(downloadBase(''), 'export');
  assert.equal(downloadBase('.hidden'), '.hidden');
});

test('a device name gets an underscore in front, with or without a dot after it', () => {
  for (const name of ['CON', 'con', 'Nul', 'PRN', 'AUX', 'COM1', 'lpt9', 'COM¹', 'CONIN$', 'nul.txt', 'Aux.old', 'COM1 notes']) {
    assert.equal(downloadBase(name), `_${name}`, name);
  }
  // Only the whole first part is a device: these are ordinary names.
  for (const name of ['CONTACTS', 'Console', 'COM10', 'COM', 'my.con', 'AUXILIARY']) assert.equal(downloadBase(name), name, name);
});

test('a long name is cut to whole characters within the byte limit, and a short limit is kept', () => {
  assert.equal(downloadBase('x'.repeat(300)), 'x'.repeat(120));
  const accents = downloadBase('é'.repeat(300));
  assert.equal(accents, 'é'.repeat(60));
  assert.equal(Buffer.byteLength(accents), 120);
  // The cut can leave a trailing dot or a device name, which are then handled as in a short name.
  assert.equal(downloadBase(`${'x'.repeat(119)}.yyyy`), 'x'.repeat(119));
  assert.equal(downloadBase('CON' + 'x'.repeat(200), 3), '_CON');
  assert.equal(downloadBase('x'.repeat(5_000_000)).length, 120);
});
