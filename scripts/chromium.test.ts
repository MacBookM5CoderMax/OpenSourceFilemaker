import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { findChromium, findChromiumIn } from './chromium.ts';

const dir = mkdtempSync(join(tmpdir(), 'tabularius-chromium-'));
after(() => rmSync(dir, { recursive: true, force: true }));

function browser(path: string): string {
  const full = join(dir, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, '');
  return full;
}

test('Playwright layouts prefer the headless shell, then find Chrome for Testing, and empty roots miss', () => {
  const shell = browser('chromium_headless_shell-1/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  const testing = browser('chromium-1/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
  const previous = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const previousOverride = process.env.TABULARIUS_CHROMIUM;
  process.env.PLAYWRIGHT_BROWSERS_PATH = dir;
  delete process.env.TABULARIUS_CHROMIUM;
  try {
    assert.equal(findChromium(), shell);
    rmSync(shell);
    assert.equal(findChromium(), testing);
  } finally {
    if (previous === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH;
    else process.env.PLAYWRIGHT_BROWSERS_PATH = previous;
    if (previousOverride === undefined) delete process.env.TABULARIUS_CHROMIUM;
    else process.env.TABULARIUS_CHROMIUM = previousOverride;
  }
  const empty = join(dir, 'empty');
  mkdirSync(empty);
  assert.equal(findChromiumIn([empty], []), undefined);
});

test('TABULARIUS_CHROMIUM overrides discovered browsers', () => {
  const override = browser('override');
  const previous = process.env.TABULARIUS_CHROMIUM;
  process.env.TABULARIUS_CHROMIUM = override;
  try { assert.equal(findChromium(), override); }
  finally {
    if (previous === undefined) delete process.env.TABULARIUS_CHROMIUM;
    else process.env.TABULARIUS_CHROMIUM = previous;
  }
});
