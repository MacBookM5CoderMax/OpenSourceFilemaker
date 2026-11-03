// The relationship graph in design mode, in a real browser: a relationship line is reached with Tab, chosen with Enter or
// Space, and the redraw that follows leaves the keyboard on that line (and on a box that was chosen), so the next key
// press goes on from there instead of from the top of the page.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Browser, Page } from 'playwright-core';
import type { DesignOp } from '../../store/src/index.ts';
import { host, launch, signIn, skipUnless, window, type Hosted } from './harness.ts';

const skip = skipUnless();
let hosted: Hosted;
let browser: Browser;

before(async () => {
  if (skip) return;
  hosted = await host({ stores: ['Shop'] });
  hosted.store('Shop').applyDesign([
    { op: 'createTable', name: 'Customers', fields: [{ name: 'Id', type: 'number' }, { name: 'Name' }] },
    { op: 'createTable', name: 'Invoices', fields: [{ name: 'Id', type: 'number' }, { name: 'CustomerId', type: 'number' }] },
    { op: 'createRelationship', left: 'Invoices', right: 'Customers', predicates: [{ left: 'CustomerId', right: 'Id' }] },
  ] as DesignOp[]);
  hosted.store('Shop').setPassword('Ann', 'ann-secret-1', '[Full Access]');
  browser = await launch();
});
after(async () => {
  await browser?.close();
  await hosted?.close();
});

async function open(): Promise<Page & { errors: string[] }> {
  const page = await window(await browser.newContext());
  await signIn(page, hosted.url, 'Shop', 'Ann', 'ann-secret-1');
  await page.goto(`${hosted.url}/app/design.html#relationships`);
  await page.locator('.d-rel').first().waitFor();
  return page;
}

const focusedIs = (page: Page, selector: string) => page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector);

test('Enter and Space on a relationship line select it and keep the keyboard on it', { skip }, async () => {
  const page = await open();
  try {
    const line = page.locator('.d-rel').first();
    await line.focus();
    assert.equal(await line.getAttribute('aria-pressed'), 'false');
    await page.keyboard.press('Enter');
    await page.locator('.d-rel.selected').waitFor();
    // The redraw replaced every element; the new copy of the line has the focus.
    await page.waitForFunction(() => document.activeElement?.matches('.d-rel.selected[aria-pressed="true"]') ?? false);
    assert.equal(await focusedIs(page, '.d-rel[data-rel]'), true);
    // Space does the same from there, and the focus is still on the line afterwards.
    await page.keyboard.press(' ');
    await page.waitForFunction(() => document.activeElement?.matches('.d-rel.selected') ?? false);
    assert.deepEqual(page.errors, []);
  } finally {
    await page.context().close();
  }
});

test('choosing a box with Enter keeps the keyboard on that box', { skip }, async () => {
  const page = await open();
  try {
    const box = page.locator('.d-to').first();
    const id = await box.getAttribute('data-to');
    await box.focus();
    await page.keyboard.press('Enter');
    await page.locator(`.d-to.selected[data-to="${id}"]`).waitFor();
    await page.waitForFunction((n) => document.activeElement?.matches(`.d-to.selected[data-to="${n}"]`) ?? false, id);
    assert.deepEqual(page.errors, []);
  } finally {
    await page.context().close();
  }
});
