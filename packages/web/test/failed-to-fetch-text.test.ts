import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANT_REACH, plainMessage } from '../src/http-problem.ts';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));

test('the web client shows a caught error through plainMessage, except where a raw message is listed here as right', () => {
  const expected: Record<string, number> = {
    'assistant.ts': 2, // The chat classifies the failure by status first.
    'dataviewer/main.ts': 2, // Formula error messages are passed on as data.
    'layout.ts': 1, // The error is handed back to a custom page's script.
    'main.ts': 1, // errorText checks unreachableRequest first.
    'watch-storage.ts': 1, // Explains why a storage write was refused.
    'http-problem.ts': 1, // plainMessage itself returns the original message.
  };
  const found: Record<string, number> = {};
  const raw = /\(e as Error\)\.message|\bString\((?:e|err)\)|\binstanceof Error \? \w+\.message : String\(\w+\)/g;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.ts') && entry.name !== 'modernize.ts' && entry.name !== 'page-templates.ts') {
        const matches = readFileSync(file, 'utf8').match(raw);
        if (matches?.length) found[relative(sourceRoot, file).replaceAll('\\', '/')] = matches.length;
      }
    }
  };
  walk(sourceRoot);
  assert.deepEqual(found, expected);
});

test('plainMessage turns the browsers\' words for a lost connection into the sentence to show', () => {
  for (const words of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
    assert.equal(plainMessage(new TypeError(words)), CANT_REACH, words);
  }
  assert.equal(plainMessage(new Error('Layout "Nope" is missing')), 'Layout "Nope" is missing');
});
