// No test calls clone() on a reply. On Node 22.20 (undici 6.21) a clone that is garbage collected cancels the original's
// body, so a later read of the original fails ("Body is unusable") whenever the collector happens to run in between: a
// flake that passes on a re-run. Use whyNot() from why-not.ts for an assertion message, or read the body once.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const packages = join(import.meta.dirname, '..', '..');

test('no test file clones a Response', () => {
  const found: string[] = [];
  for (const pkg of readdirSync(packages)) {
    const dir = join(packages, pkg, 'test');
    let names: string[];
    try { names = readdirSync(dir, { recursive: true, encoding: 'utf8' }); } catch { continue; }
    for (const name of names.filter((n) => /\.[cm]?tsx?$/.test(n) && n !== 'why-not.ts' && n !== 'no-response-clone.test.ts')) {
      readFileSync(join(dir, name), 'utf8').split('\n').forEach((line, i) => {
        if (/\.clone\(\)/.test(line)) found.push(`packages/${pkg}/test/${name}:${i + 1}`);
      });
    }
  }
  assert.deepEqual(found, [], 'a reply cloned in a test; use whyNot() from why-not.ts or read the body once');
});
