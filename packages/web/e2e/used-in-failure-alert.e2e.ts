// "Used in" on a custom function, in a real browser: when the lookup fails the sentence is spoken as an alert beside the
// list (not as a list item), and closing and opening the section asks again, so the list appears once the server answers.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Browser } from 'playwright-core';
import type { DesignOp } from '../../store/src/index.ts';
import { host, launch, signIn, skipUnless, window, type Hosted } from './harness.ts';

const skip = skipUnless();
let hosted: Hosted;
let browser: Browser;

before(async () => {
  if (skip) return;
  hosted = await host({ stores: ['Shop'] });
  hosted.store('Shop').applyDesign([
    { op: 'createTable', name: 'Orders', fields: [{ name: 'Qty', type: 'number' }, { name: 'Total', kind: 'calculation', calculation: 'Double ( Qty )' }] },
    { op: 'createCustomFunction', name: 'Double', parameters: ['x'], formula: 'x * 2' },
  ] as DesignOp[]);
  hosted.store('Shop').setPassword('Ann', 'ann-secret-1', '[Full Access]');
  browser = await launch();
});
after(async () => {
  await browser?.close();
  await hosted?.close();
});

test('a failed "Used in" lookup is an alert paragraph, and opening the section again retries it', { skip }, async () => {
  const page = await window(await browser.newContext());
  try {
    await signIn(page, hosted.url, 'Shop', 'Ann', 'ann-secret-1');
    let failing = true;
    await page.route('**/used?*', (route) => (failing ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ messages: [{ code: '500', message: 'The lookup broke' }] }) }) : route.continue()));
    await page.goto(`${hosted.url}/app/design.html#functions`);
    await page.getByText('Double', { exact: true }).first().click();
    const section = page.locator('details.d-report').filter({ has: page.locator('summary', { hasText: /^Used in$/ }) });
    await section.locator('summary').click();
    const alert = section.getByRole('alert');
    await alert.waitFor();
    assert.equal(await section.locator('li').count(), 0, 'the failure is not a list item');
    assert.equal(await alert.evaluate((el) => el.tagName), 'P');
    // Close it, let the server answer, open it again: the failure is gone and the list is there.
    failing = false;
    await section.locator('summary').click();
    await section.locator('summary').click();
    await section.locator('li').first().waitFor();
    assert.equal(await section.getByRole('alert').count(), 0);
    assert.match(await section.innerText(), /Total/);
  } finally {
    await page.context().close();
  }
});
