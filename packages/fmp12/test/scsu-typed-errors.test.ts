// A stored string cut in the middle of a command is a damaged file, reported as an FmpError like the rest of the reader's refusals.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeScsu, decodeText, FmpError, inspectText } from '../src/index.ts';
import { decodeTextChars } from '../src/scsu.ts';

// Each stream ends inside a command: a Unicode-mode pair, a quote, a window definition, an extended window.
const CUT: [string, number[]][] = [
  ['SCU then one pair byte', [0x0f, 0x02]],
  ['SCU then UQU with one byte', [0x0f, 0xf0, 0x41]],
  ['SCU then UD0 alone', [0x0f, 0xe8]],
  ['SCU then UDX with one byte', [0x0f, 0xf1, 0x01]],
  ['SQ0 alone', [0x01]],
  ['SQU with one byte', [0x0e, 0x01]],
  ['SD0 alone', [0x18]],
  ['SDX with one byte', [0x0b, 0x01]],
];

for (const [name, bytes] of CUT) {
  test(`SCSU cut inside a command (${name}) throws FmpError and keeps its message`, () => {
    const raw = Uint8Array.from(bytes);
    assert.throws(() => decodeScsu(raw), (e) => e instanceof FmpError && /^truncated SCSU command at byte \d+$/.test(e.message));
    const xored = Uint8Array.from(bytes, (b) => b ^ 0x5a);
    assert.throws(() => decodeText(xored), FmpError);
    const note = inspectText(xored);
    assert.ok('note' in note && /^truncated SCSU command/.test(note.note), JSON.stringify(note));
  });
}

test('a value shorter than its declared character count throws FmpError', () => {
  assert.throws(() => decodeTextChars(Uint8Array.from([0x41, 0x42].map((b) => b ^ 0x5a)), 3), (e) => e instanceof FmpError && /^truncated SCSU text: expected 3 characters, got 2$/.test(e.message));
  assert.equal(decodeTextChars(Uint8Array.from([0x41, 0x42].map((b) => b ^ 0x5a)), 2).text, 'AB');
});
