import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NOT_TABULARIUS_DATA } from '../../web/src/json-reply.ts';

// Run the console's real call() helper without a browser, against a fetch that answers as a proxy or a sign-in page would.
const page = readFileSync(new URL('../admin/index.html', import.meta.url), 'utf8');
const script = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const parsed = ts.createSourceFile('admin.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['call', 'replyJson', 'NOT_TABULARIUS_DATA', 'httpProblem', 'plainMessage', 'BROWSER_NETWORK_WORDS', 'CANT_REACH']);
const code = parsed.statements.filter(statement =>
  ts.isFunctionDeclaration(statement) ? !!statement.name && names.has(statement.name.text) :
  ts.isVariableStatement(statement) && statement.declarationList.declarations.some(d => ts.isIdentifier(d.name) && names.has(d.name.text)))
  .map(statement => statement.getText(parsed)).join('\n');

function consoleWith(reply: () => Response) {
  const context = vm.createContext({ fetch: async () => reply(), showSignIn: () => {}, Error, TypeError, Object, JSON, String });
  vm.runInContext(code, context);
  return context as unknown as { call(method: string, path: string, body?: unknown): Promise<unknown> };
}

test('the console carries the same sentence for a reply that is not Tabularius data as the web client', () => {
  const context = vm.createContext({});
  vm.runInContext(code, context);
  assert.equal(vm.runInContext('NOT_TABULARIUS_DATA', context), NOT_TABULARIUS_DATA);
});

test('a 200 answer that is not JSON is told as a sentence, not as a browser\'s parser words', async () => {
  const html = '<html><body>Sign in to continue</body></html>';
  for (const body of [html, '']) {
    const console_ = consoleWith(() => new Response(body, { status: 200, headers: { 'content-type': 'text/html' } }));
    await assert.rejects(console_.call('GET', '/tabularius/admin/v1/clients'), (e: Error) => {
      assert.equal(e.message, NOT_TABULARIUS_DATA);
      assert.doesNotMatch(e.message, /JSON|token|Unexpected/);
      return true;
    });
  }
});

test('a JSON answer, a JSON error and an HTML error keep their own readings', async () => {
  assert.deepEqual(await consoleWith(() => new Response('{"a":1}')).call('GET', '/x'), { a: 1 });
  assert.equal(await consoleWith(() => new Response('null')).call('GET', '/x'), null);
  await assert.rejects(consoleWith(() => new Response('{"error":"Not that"}', { status: 400 })).call('GET', '/x'), /^Error: Not that$/);
  await assert.rejects(consoleWith(() => new Response('<html>Bad gateway</html>', { status: 502 })).call('GET', '/x'), /did not answer \(HTTP 502\)/);
});

test('the console reads a reply as JSON through replyJson, except the MCP check, whose error is shown with its own words', () => {
  // Counted: .json() with no .catch after it (also when the call sits in a .then and the .catch follows the .then).
  const bare = [...script.matchAll(/\.json\(\)(?!\.catch|\)\.catch)/g)].length;
  // One inside replyJson itself and one in testMcp (a failed check there shows "Check it works" failing, in the line beside the button).
  assert.equal(bare, 2);
});
