import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateText } from '../src/index.ts';

test('calculation numbers become text without a leading zero below one', () => {
  const cases: [string, string][] = [
    ['1/2 & ""', '.5'],
    ['-1/2 & ""', '-.5'], // Inferred from the verified positive case.
    ['GetAsText ( .25 )', '.25'],
    ['1/4 & "x"', '.25x'],
    ['0 & ""', '0'],
    ['1.5 & ""', '1.5'],
    ['-1.5 & ""', '-1.5'],
    ['10 & ""', '10'],
    ['1/3 & ""', '.3333333333333333'],
    ['SetPrecision ( 1/3 ; 20 ) & ""', '.33333333333333333333'],
    ['.0000001 & ""', '.0000001'],
    ['Round ( .456 ; 2 ) & ""', '.46'],
    ['List ( .5 ; 2 )', '.5\r2'],
    ['Substitute ( 1/2 ; "." ; "," )', ',5'],
    ['Length ( 1/2 )', '2'],
    ['GetAsNumber ( .5 & "" ) = .5', '1'],
    ['JSONGetElement ( "{\\"n\\":0.5}" ; "n" ) & ""', '.5'], // Inferred: the element is a number.
  ];
  for (const [formula, expected] of cases) assert.equal(evaluateText(formula), expected, formula);
});

test('JSON numbers and XPath keep their own numeric text', () => {
  const json = evaluateText('JSONSetElement ( "{}" ; "n" ; 1/2 ; JSONNumber )');
  assert.equal(json, '{"n":0.5}');
  assert.deepEqual(JSON.parse(json), { n: 0.5 });
  assert.equal(evaluateText('BE_XPath ( "<r/>" ; "string(0.5)" )'), '0.5');
});
