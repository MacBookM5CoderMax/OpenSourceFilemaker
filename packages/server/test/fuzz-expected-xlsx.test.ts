// The fuzz harness counts the workbook reader's own refusals as clean rejections, and nothing else.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expected } from '../../../scripts/fuzz/targets.ts';

test('every refusal the workbook reader words itself is an expected rejection', () => {
  for (const message of [
    'The workbook has 300 sheets; more than 256 are not read',
    'The workbook is not valid: it has more than one sheet called "Data"',
    'The workbook is not valid: the sheet "Data" is stored in the same part as another sheet',
    'the workbook has no sheet',
    'not a zip file',
  ]) assert.equal(expected('xlsx', new Error(message)), true, message);
});

test('an unlisted Error, a TypeError and another target stay findings', () => {
  assert.equal(expected('xlsx', new Error('The workbook exploded')), false);
  assert.equal(expected('xlsx', new TypeError('The workbook is not valid: x')), false);
  assert.equal(expected('csv', new Error('The workbook is not valid: x')), false);
});
