// A custom function whose call to itself is the last thing it does may go 50,000 calls deep; any other recursion stops at
// 10,000, as the documentation of the product these functions are compatible with says. The count of calls that wait for
// their own result is kept apart from the count of all calls, and both are put back when a call ends or fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CalcError, ERR, evaluate, evaluateText, type CalcContext, type CustomFunctionDef } from '../src/index.ts';

const defs = new Map<string, CustomFunctionDef>([
  ['tail', { parameters: ['n', 'acc'], formula: 'If ( n <= 0 ; acc ; Tail ( n - 1 ; acc + n ) )' }],
  ['tailcase', { parameters: ['n', 'acc'], formula: 'Case ( n <= 0 ; acc ; TailCase ( n - 1 ; acc + n ) )' }],
  ['tailchoose', { parameters: ['n', 'acc'], formula: 'Choose ( n <= 0 ; TailChoose ( n - 1 ; acc + n ) ; acc )' }],
  ['taillet', { parameters: ['n', 'acc'], formula: 'Let ( [ next = acc + n ; m = n - 1 ] ; If ( n <= 0 ; acc ; TailLet ( m ; next ) ) )' }],
  ['wait', { parameters: ['n'], formula: 'If ( n <= 0 ; 0 ; n + Wait ( n - 1 ) )' }],
  // The call is wrapped in a function, so the function waits for it: not a tail call.
  ['wrapped', { parameters: ['n'], formula: 'If ( n <= 0 ; 0 ; Abs ( Wrapped ( n - 1 ) ) )' }],
  // Calls the other function last, and that one calls this: each waits no longer than a tail call, but neither calls itself.
  ['ping', { parameters: ['n'], formula: 'If ( n <= 0 ; 0 ; Pong ( n - 1 ) )' }],
  ['pong', { parameters: ['n'], formula: 'If ( n <= 0 ; 0 ; Ping ( n - 1 ) )' }],
  // A tail call in the middle of a longer chain: 9,000 calls that wait, then tail calls past 10,000.
  ['mixed', { parameters: ['n', 'k'], formula: 'If ( k > 0 ; 1 + Mixed ( n ; k - 1 ) ; Tail ( n ; 0 ) )' }],
]);
const ctx: CalcContext = { customFunction: (name) => defs.get(name.toLowerCase()) };
const sumTo = (n: number) => String((n * (n + 1)) / 2);
const message = (name: string, ceiling: number) => `${name} recursed too deeply: it passed Tabularius's limit of ${ceiling.toLocaleString('en-US')} nested calls. Rewrite ${name} as a loop with While.`;
const fails = (formula: string): CalcError => {
  try { evaluate(formula, ctx); } catch (e) { assert.ok(e instanceof CalcError, String(e)); return e; }
  throw new Error(`${formula} did not fail`);
};

test('a function ending in a call to itself, through If, Case, Choose or Let, goes past 10,000 calls', () => {
  assert.equal(evaluateText('Tail ( 49990 ; 0 )', ctx), sumTo(49990));
  assert.equal(evaluateText('TailCase ( 20000 ; 0 )', ctx), sumTo(20000));
  assert.equal(evaluateText('TailChoose ( 20000 ; 0 )', ctx), sumTo(20000));
  assert.equal(evaluateText('TailLet ( 49990 ; 0 )', ctx), sumTo(49990));
});

test('the 50,000th call is the last one allowed, and the next ends in the same error 1200', () => {
  assert.equal(evaluateText('Tail ( 49999 ; 0 )', ctx), sumTo(49999));
  const over = fails('Tail ( 50000 ; 0 )');
  assert.equal(over.code, ERR.recursion);
  assert.equal(over.message, message('Tail', 50000));
  assert.equal(fails('TailLet ( 60000 ; 0 )').message, message('TailLet', 50000));
  assert.equal(evaluateText('EvaluationError ( Tail ( 60000 ; 0 ) )', ctx), '1200');
});

test('a call that waits for its own result, or sits inside another function, or goes through a second function, still stops at 10,000', () => {
  assert.equal(evaluateText('Wait ( 9990 )', ctx), sumTo(9990));
  assert.equal(fails('Wait ( 10100 )').message, message('Wait', 10000));
  assert.equal(evaluateText('Wrapped ( 9990 )', ctx), '0');
  assert.equal(fails('Wrapped ( 10100 )').message, message('Wrapped', 10000));
  assert.equal(evaluateText('Ping ( 9990 )', ctx), '0');
  assert.match(fails('Ping ( 10100 )').message, /^(Ping|Pong) recursed too deeply: it passed Tabularius's limit of 10,000 nested calls\./);
});

test('calls that wait are counted apart from tail calls: 9,000 waiting calls and then 30,000 tail calls, but not 10,100 waiting ones', () => {
  assert.equal(evaluateText('Mixed ( 30000 ; 9000 )', ctx), String(9000 + 30000 * 30001 / 2));
  assert.equal(fails('Mixed ( 30000 ; 10100 )').message, message('Mixed', 10000));
  assert.equal(fails('Mixed ( 60000 ; 100 )').message, message('Tail', 50000));
});

test('both counts are put back after a call, a failure and an expression that calls twice', () => {
  assert.equal(evaluateText('Tail ( 49990 ; 0 ) + Tail ( 49990 ; 0 )', ctx), String(2 * Number(sumTo(49990))));
  assert.equal(evaluateText('Let ( e = EvaluationError ( Tail ( 60000 ; 0 ) ) ; e & "|" & Tail ( 49990 ; 0 ) & "|" & Wait ( 9990 ) )', ctx), `1200|${sumTo(49990)}|${sumTo(9990)}`);
  assert.equal(evaluateText('Let ( e = EvaluationError ( Wait ( 10100 ) ) ; e & "|" & Wait ( 9999 ) )', ctx), `1200|${sumTo(9999)}`);
  assert.equal(evaluateText('Wait ( 9000 ) + Tail ( 49990 ; 0 ) + Wait ( 9000 )', ctx), String(2 * Number(sumTo(9000)) + Number(sumTo(49990))));
});

test('SetRecursion lowers the limit for tail calls too, and cannot raise it past 50,000', () => {
  assert.equal(fails('SetRecursion ( Tail ( 50 ; 0 ) ; 20 )').message,
    'Tail recursed too deeply: it passed 20 nested calls, the limit SetRecursion set. Raise the limit in SetRecursion (up to 50,000), or rewrite Tail as a loop with While.');
  assert.equal(evaluateText('SetRecursion ( Tail ( 50 ; 0 ) ; 100 )', ctx), '1275');
  assert.equal(evaluateText('SetRecursion ( Tail ( 20000 ; 0 ) ; 100000 )', ctx), sumTo(20000));
  assert.equal(fails('SetRecursion ( Tail ( 60000 ; 0 ) ; 100000 )').message, message('Tail', 50000));
  // A function that waits is still held to 10,000 whatever SetRecursion says.
  assert.equal(fails('SetRecursion ( Wait ( 10100 ) ; 100000 )').message, message('Wait', 10000));
});

test('the trace still hears every step of a deep tail recursion', () => {
  let steps = 0;
  assert.equal(evaluateText('Tail ( 12000 ; 0 )', { ...ctx, trace: () => { steps++; } }), sumTo(12000));
  assert.ok(steps > 12000, `${steps} steps traced`);
});
