import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainOpenError, OPEN_FAILURE_TEXT_MAX } from '../src/open-failures.ts';
import { openStateNote } from '../src/cluster.ts';

const shown = (text: string) => plainOpenError(text, '/srv/hosted');

test('paths immediately after a colon keep the message prefix and final name', () => {
  for (const prefix of ['ENOENT:', 'file:', 'open:']) {
    assert.equal(shown(`${prefix}/home/x/y`), `${prefix}…/y`);
  }
});

test('bare relative paths with folders are cut to their final name', () => {
  assert.equal(shown('open data/secret/db.sqlite failed'), 'open …/db.sqlite failed');
  assert.equal(shown('open data\\secret\\db.sqlite failed'), 'open …/db.sqlite failed');
  assert.equal(shown('read/write failed at ratio 3/4'), 'read/write failed at ratio 3/4');
});

test('unquoted Windows drive and UNC paths are cut to their final name', () => {
  assert.equal(shown('open C:\\Users\\x\\db.sqlite'), 'open …/db.sqlite');
  assert.equal(shown('open \\\\host\\share\\db'), 'open …/db');
});

test('an unquoted path ends at whitespace, while a quoted path can contain spaces', () => {
  assert.equal(shown('open /private/data/db.sqlite failed with more words'), 'open …/db.sqlite failed with more words');
  assert.equal(shown('open /private/data/my database.sqlite failed'), 'open …/my database.sqlite failed');
  assert.equal(shown("open '/private/data/my database.sqlite' failed"), "open '…/my database.sqlite' failed");
});

test('C0, DEL, Unicode line separators and bidirectional controls become spaces', () => {
  const controls = [...Array.from({ length: 32 }, (_, i) => i), 0x7f, 0x85, 0x2028, 0x2029,
    0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069, 0x200e, 0x200f];
  for (const control of controls) {
    assert.equal(shown(`before${String.fromCodePoint(control)}after`), 'before after', control.toString(16));
  }
});

test('an overlong error is retained with an ellipsis at the relay and display caps', () => {
  const before = 'x'.repeat(4097);
  const note = openStateNote({ k: 'open-state', file: 'Synthetic', error: before }, 1);
  assert.equal(note?.error, 'x'.repeat(4095) + '…');
  assert.equal(note?.error?.length, 4096);
  assert.equal(openStateNote({ k: 'open-state', file: 'Synthetic', error: before.slice(0, 4096) }, 1)?.error, before.slice(0, 4096));
  assert.equal(shown(before), 'x'.repeat(OPEN_FAILURE_TEXT_MAX - 1) + '…');
  assert.equal(shown('x'.repeat(OPEN_FAILURE_TEXT_MAX)), 'x'.repeat(OPEN_FAILURE_TEXT_MAX));
});

test('operator-written URLs, including credentials, are preserved', () => {
  const url = `https://${['user', 'pw'].join(':')}@host/private/data/db.sqlite`;
  assert.equal(shown(`failed at ${url}`), `failed at ${url}`);
  assert.equal(shown(`failed at '${url}'`), `failed at '${url}'`);
  assert.equal(shown(`failed at ${url} opening data/private/db.sqlite`), `failed at ${url} opening …/db.sqlite`);
});

test('an ordinary message without a path is unchanged', () => {
  const before = 'database disk image is malformed';
  assert.equal(shown(before), before);
});

test('a file: URL is a local path and is cut to its final name, while other URLs are kept as written', () => {
  assert.equal(shown('cannot open file:///home/x/secret/db.sqlite now'), 'cannot open file:/…/db.sqlite now');
  assert.equal(shown('open "file:///Users/me/Databases/a.sqlite" failed'), 'open "…/a.sqlite" failed');
  assert.equal(shown('GET https://example.test/a/b/c failed'), 'GET https://example.test/a/b/c failed');
});
