import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { NOT_TABULARIUS_DATA, parseJsonFile, replyJson } from '../src/json-reply.ts';

test('a reply that is not JSON reads as undefined, a JSON one as itself', async () => {
  assert.equal(await replyJson(new Response('<html><body>Bad gateway</body></html>', { status: 502 })), undefined);
  assert.equal(await replyJson(new Response('')), undefined);
  assert.deepEqual(await replyJson(new Response('{"a":1}')), { a: 1 });
  assert.match(NOT_TABULARIUS_DATA, /proxy/);
  assert.doesNotMatch(NOT_TABULARIUS_DATA, /JSON|token/i);
});

test('a file that is not JSON is told as a sentence about the file', () => {
  for (const text of ['not json at all', '<html>', '{"a":']) {
    assert.throws(() => parseJsonFile(text, 'a theme exported from Tabularius'), {
      name: 'Error',
      message: 'This file is not a theme exported from Tabularius: it is not JSON.',
    });
  }
  assert.deepEqual(parseJsonFile('{"format":"x"}', 'a theme'), { format: 'x' });
});

test('the web client reads a reply as JSON through replyJson, except where a failure is hidden or caught', () => {
  const sourceRoot = join(import.meta.dirname, '..', 'src');
  const actual: Record<string, number> = {};
  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.ts') && !['modernize.ts', 'page-templates.ts', 'json-reply.ts'].includes(entry.name)) {
        const count = (readFileSync(path, 'utf8').match(/\.json\(\)(?!\.catch)/g) ?? []).length;
        if (count) actual[relative(sourceRoot, path).split(/\\/).join('/')] = count;
      }
    }
  }
  walk(sourceRoot);
  assert.deepEqual(actual, {
    'assistant.ts': 2, // Both reads are inside try blocks whose catches hide the failure.
    'design/client.ts': 1, // The caller's try/catch hides the availability check failure.
    'design/together.ts': 1, // Callers treat a failure as nobody being there.
    'live.ts': 2, // Callers catch the failure and show nothing.
    'cleanup/main.ts': 1, // The catch reports that it couldn't list the layouts.
    'main.ts': 1, // The chain ends in .catch(() => []).
  });
});
