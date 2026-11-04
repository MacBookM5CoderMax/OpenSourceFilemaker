import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileAccessTab } from '../src/design/file-access.ts';
import type { Sec } from '../src/security/main.ts';

class ElementDouble {
  tagName: string;
  className = '';
  value = '';
  checked = false;
  disabled = false;
  isConnected = true;
  children: (ElementDouble | string)[] = [];
  attrs = new Map<string, string>();
  listeners = new Map<string, (() => void)[]>();
  settled?: () => void;
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
    if (name === 'checked') this.checked = true;
    if (name === 'value') this.value = value;
    if (name === 'aria-busy' && value === 'false') this.settled?.();
  }
  append(...children: (ElementDouble | string)[]) { this.children.push(...children); }
  replaceChildren(...children: (ElementDouble | string)[]) { this.children = children; }
  addEventListener(type: string, listener: () => void) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]); }
  click() { if (!this.disabled) for (const listener of this.listeners.get('click') ?? []) listener(); }
  focus() {}
  get textContent(): string { return this.children.map((child) => typeof child === 'string' ? child : child.textContent).join(''); }
  querySelectorAll(selector: string): ElementDouble[] {
    return this.children.flatMap((child) => typeof child === 'string' ? [] : [
      ...(selector.split(',').some((tag) => child.tagName.toLowerCase() === tag.trim()) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
}

test('File Access controls send authenticated changes and Reset All requires confirmation', async (t) => {
  const previous = { document: globalThis.document, window: globalThis.window, confirm: globalThis.confirm };
  const body = new ElementDouble('body');
  globalThis.document = { createElement: (tag: string) => new ElementDouble(tag), body } as unknown as Document;
  globalThis.window = { setTimeout: () => 0 } as unknown as Window & typeof globalThis;
  let confirms = 0, accept = false;
  globalThis.confirm = (message) => {
    confirms++;
    assert.match(message ?? '', /Every file that authorized this file must authorize its new identity again/);
    assert.match(message ?? '', /keeps its authorization list/);
    return accept;
  };
  t.after(() => Object.assign(globalThis, previous));
  const state = { protect: false, sameHost: false, hosted: ['Reports'], authorized: [{ fileId: 'identity', names: ['Reports', 'Renamed'], at: '2026-01-01T00:00:00Z', by: 'Admin' }] };
  const calls: { url: string; body?: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal((options.headers as Record<string, string>).authorization, 'Bearer session');
    calls.push({ url, ...(options.body ? { body: JSON.parse(options.body as string) } : {}) });
    return { ok: true, json: async () => state } as Response;
  });
  const root = fileAccessTab({ client: { db: 'Data file', token: 'session' } } as Sec) as unknown as ElementDouble;
  const settled = () => new Promise<void>((resolve) => { root.settled = resolve; });
  await settled();
  assert.match(root.textContent, /Reports; Renamed/);
  assert.match(root.textContent, /Admin/);
  assert.match(calls[0].url, /Data%20file\/file-access$/);
  const press = async (label: string) => {
    const wait = settled();
    const button = root.querySelectorAll('button').find((b) => b.textContent === label)!;
    assert.ok(button, label);
    button.click();
    assert.ok(root.querySelectorAll('button, input, select').every((c) => c.disabled));
    await wait;
  };
  root.querySelectorAll('input')[0].checked = true;
  root.querySelectorAll('input')[1].checked = true;
  await press('Save options');
  assert.deepEqual(calls.at(-1)?.body, { protect: true, sameHost: true });
  root.querySelectorAll('select')[0].value = 'Reports';
  await press('Authorize');
  assert.deepEqual(calls.at(-1)?.body, { file: 'Reports' });
  await press('Remove');
  assert.deepEqual(calls.at(-1)?.body, { fileId: 'identity' });
  const count = calls.length;
  root.querySelectorAll('button').find((b) => b.textContent === 'Reset All…')!.click();
  assert.equal(confirms, 1);
  assert.equal(calls.length, count, 'cancelled reset sends no request');
  accept = true;
  await press('Reset All…');
  assert.match(calls.at(-1)!.url, /\/reset$/);
  assert.equal(confirms, 2);
});

test('File Access explains a proxy or non-JSON reply without exposing parser text', async (t) => {
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = { createElement: (tag: string) => new ElementDouble(tag), body: new ElementDouble('body') } as unknown as Document;
  globalThis.window = { setTimeout: () => 0 } as unknown as Window & typeof globalThis;
  t.after(() => Object.assign(globalThis, previous));
  for (const status of [200, 502]) {
    t.mock.method(globalThis, 'fetch', async () => new Response('<html>Unavailable</html>', { status }));
    const root = fileAccessTab({ client: { db: 'Data', token: 'session' } } as Sec) as unknown as ElementDouble;
    await new Promise<void>((resolve) => { root.settled = resolve; });
    assert.match(root.textContent, status === 200 ? /not Tabularius data/ : /proxy can reach it/);
    assert.doesNotMatch(root.textContent, /Unexpected token|SyntaxError/);
    assert.ok(root.querySelectorAll('button').some((button) => button.textContent === 'Retry'));
  }
});
