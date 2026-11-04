// fmp:// links run a script only for accounts with fmurlscript, from both an Open URL
// step and a web viewer link. All data is synthetic and built in this test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Browser } from 'playwright-core';
import type { LayoutObject } from '../../fmp12/src/index.ts';
import type { DesignOp } from '../../store/src/index.ts';
import { field, host, launch, signIn, skipUnless, until, window, type Hosted } from './harness.ts';

const skip = skipUnless();
let hosted: Hosted;
let browser: Browser;
let markerId = 0;
let recordId = 0;
const ALLOWED = 'Linker';
const DENIED = 'Plain';
const PASSWORD = 'link-pass-1';
const MARKER = 'Marker';

before(async () => {
  if (skip) return;
  hosted = await host({ stores: ['Links'] });
  const store = hosted.store('Links');
  store.applyDesign([
    { op: 'createTable', name: 'Home', fields: [{ name: 'Marker' }] },
    { op: 'createScript', name: 'Mark', text: 'Set Field [ Home::Marker ; "ran" ]\nCommit Records/Requests [ With dialog: Off ]' },
    { op: 'createScript', name: 'Open Allowed', text: 'Open URL [ "fmp://$/Links?script=Mark" ]' },
    { op: 'createScript', name: 'Open Denied', text: 'Open URL [ "fmp://$/Links?script=Mark" ]' },
  ] as DesignOp[]);
  const design = store.design('Home')!;
  markerId = design.objects.find((o) => o.kind === 'field' && o.field?.field === MARKER)!.id;
  const body = design.parts.find((p) => p.kind === 'body')!;
  const page = `<a id='run' href='fmp://$/Links?script=Mark'>Run script</a> <a id='cred' href='fmp://user:pw@$/Links?script=Mark'>Credential check</a>`;
  const viewer: LayoutObject = {
    id: 950, kind: 'web-viewer', type: 13, external: 'WEBV', style: {},
    bounds: { top: body.top + 120, left: 20, bottom: body.top + 280, right: 520 },
    anchors: { left: true, top: true, right: false, bottom: false },
    webUrl: JSON.stringify('data:text/html,' + page),
    webOptions: { interaction: true, findMode: false, progressBar: false, statusMessages: false, encodeUrl: false, jsBridge: true },
  } as LayoutObject;
  store.applyDesign([{ op: 'updateLayout', layout: 'Home', design: {
    objects: [...design.objects, viewer], parts: design.parts,
  } } as DesignOp]);
  recordId = Number(store.create('Home', { Marker: '' }).recordId);
  const open = { view: true, edit: true, create: true, delete: true };
  store.savePrivilegeSet({ name: ALLOWED, records: open, layouts: 'modifiable', valueLists: 'viewOnly', scripts: 'modifiable', extendedPrivileges: ['fmapp', 'fmrest', 'fmurlscript'] });
  store.savePrivilegeSet({ name: DENIED, records: open, layouts: 'modifiable', valueLists: 'viewOnly', scripts: 'modifiable', extendedPrivileges: ['fmapp', 'fmrest'] });
  store.setPassword(ALLOWED, PASSWORD, ALLOWED);
  store.setPassword(DENIED, PASSWORD, DENIED);
  browser = await launch();
});

after(async () => {
  await browser?.close();
  await hosted?.close();
});

async function openFor(account: string): Promise<Awaited<ReturnType<typeof window>>> {
  // Each run starts with the marker empty, so one case cannot satisfy the next.
  hosted.store('Links').update('Home', recordId, { Marker: '' });
  const page = await window(await browser.newContext());
  await signIn(page, hosted.url, 'Links', account, PASSWORD);
  await page.getByRole('button', { name: 'View as Form' }).click();
  return page;
}

test('Open URL runs the script for fmurlscript accounts and refuses it for others', { skip }, async () => {
  for (const [account, script, expected] of [[ALLOWED, 'Open Allowed', 'ran'], [DENIED, 'Open Denied', '']] as const) {
    const page = await openFor(account);
    try {
      await page.locator('.menubar').getByRole('button', { name: 'Scripts', exact: true }).click();
      await page.getByRole('menuitem', { name: script, exact: true }).click();
      if (expected) await until(() => field(page, markerId).inputValue(), (v) => v === expected);
      else {
        await page.locator('.toast', { hasText: 'fmurlscript' }).waitFor();
        assert.equal(await field(page, markerId).inputValue(), '');
      }
      assert.deepEqual(page.errors, []);
    } finally { await page.context().close(); }
  }
});

test('a web viewer link runs the script for fmurlscript accounts and refuses it for others', { skip }, async () => {
  for (const [account, expected] of [[ALLOWED, 'ran'], [DENIED, '']] as const) {
    const page = await openFor(account);
    try {
      const link = page.frameLocator('.fm[data-id="950"] iframe.fm-webviewer').getByRole('link', { name: 'Run script' });
      await link.click();
      if (expected) await until(() => field(page, markerId).inputValue(), (v) => v === expected);
      else {
        await page.locator('.toast', { hasText: 'fmurlscript' }).waitFor();
        assert.equal(await field(page, markerId).inputValue(), '');
      }
      assert.deepEqual(page.errors, []);
    } finally { await page.context().close(); }
  }
});

test('credentials in an fmp link never appear in page text or request URLs', { skip }, async () => {
  const page = await openFor(ALLOWED);
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  try {
    await page.frameLocator('.fm[data-id="950"] iframe.fm-webviewer').getByRole('link', { name: 'Credential check' }).click();
    await until(() => field(page, markerId).inputValue(), (v) => v === 'ran');
    assert.ok(!/user|pw/i.test(await page.locator('body').innerText()));
    assert.ok(urls.every((url) => !/user|pw/i.test(url)), urls.join('\n'));
    assert.deepEqual(page.errors, []);
  } finally { await page.context().close(); }
});
