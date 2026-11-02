import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_TEXT_RESULT } from '../../calc/src/text-budget.ts';
import { SQL_RESULT_LIMIT, SQL_ROW_LIMIT, SQL_VALUE_COST } from '../../store/src/sql-result.ts';
import { MAX_SQL_TEXT } from '../../store/src/sql-tokens.ts';
import { RECURSIVE_SQL } from '../../store/src/sql-recursive.ts';
import { READ_LIMITS } from '../../store/src/calendar.ts';
import { checkServeSettings } from '../../store/src/settings.ts';
import { BATCH_LIMIT } from '../src/odata-batch.ts';
import { WRITE_LIMIT } from '../src/pgwrite.ts';
import { PgServer, maxRows, outputStallMs, txIdleMs, txMaxMs } from '../src/pgwire.ts';
import { DEFAULT_PGWIRE_MAX_PARAM_BYTES } from '../src/setting-values.ts';
import type { Host } from '../src/host.ts';

function page(name: string): string {
  return readFileSync(new URL(`../../../docs/${name}`, import.meta.url), 'utf8').replace(/\s+/g, ' ');
}

function source(file: string, pattern: RegExp): number {
  const match = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8').match(pattern);
  assert.ok(match, `Expected ${file} to match ${pattern}`);
  return Number(match[1].replace(/[_,]/g, ''));
}

function withEnv(values: Record<string, string | undefined>, run: () => void): void {
  const saved = new Map(Object.keys(values).map((name) => [name, process.env[name]]));
  try {
    for (const [name, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    run();
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}

test('the page says what the row cap does with 0 and with a value it cannot use, and what the portal total does', () => {
  withEnv({ TABULARIUS_PGWIRE_MAX_ROWS: undefined, TABULARIUS_PGWIRE_MAX_BUFFERED_ROWS: undefined }, () => {
    assert.equal(maxRows(), 100_000);
    for (const value of ['-1', '1.5', 'abc']) {
      process.env.TABULARIUS_PGWIRE_MAX_ROWS = value;
      assert.equal(maxRows(), 100_000);
    }
    process.env.TABULARIUS_PGWIRE_MAX_ROWS = '0';
    assert.equal(maxRows(), 0);
    for (const value of ['0', '-1', 'abc']) {
      process.env.TABULARIUS_PGWIRE_MAX_BUFFERED_ROWS = value;
      assert.throws(() => new PgServer({} as Host, { port: 0 }), /TABULARIUS_PGWIRE_MAX_BUFFERED_ROWS/);
      assert.throws(() => checkServeSettings(process.env), /TABULARIUS_PGWIRE_MAX_BUFFERED_ROWS/);
    }
  });
  const text = page('pgwire-results.md');
  assert.doesNotMatch(text, /Invalid or non-positive values \(including 0\) fall back to 100,000\./);
  assert.match(text, /A `TABULARIUS_PGWIRE_MAX_ROWS` that is negative or not a whole number falls back to 100,000; 0 removes the cap\./);
  assert.match(text, /`TABULARIUS_PGWIRE_MAX_BUFFERED_ROWS` must be a positive whole number in digits only: unset uses 100,000, and anything else, 0 included, stops `tabularius serve` at start\./);
});

test('docs/pgwire-results.md states the result limits of the code', () => {
  withEnv({ TABULARIUS_PGWIRE_MAX_ROWS: undefined, TABULARIUS_PGWIRE_MAX_BUFFERED_ROWS: undefined, TABULARIUS_PGWIRE_OUTPUT_STALL_MS: undefined }, () => {
    const text = page('pgwire-results.md');
    const server = new PgServer({} as Host, { port: 0 });
    try {
      assert.match(text, new RegExp(`at most \\*\\*${maxRows().toLocaleString('en')} rows\\*\\* by default`));
      assert.match(text, new RegExp(`share a total of ${server.maxBufferedRows.toLocaleString('en')} rows`));
      assert.match(text, new RegExp(`${(maxRows() + 1).toLocaleString('en')} buffered rows by default`));
      assert.match(text, /SQL results are limited to 100000 rows; use LIMIT/);
      assert.match(text, new RegExp(`for ${outputStallMs() / 1000} seconds is disconnected`));
      assert.match(text, new RegExp(`The ${outputStallMs() / 1000} seconds are counted`));
    } finally { server.close(); }
    const batches = text.match(/batches of at most ([\d,]+) rows or about (\d+) MiB/);
    assert.ok(batches);
    assert.equal(Number(batches[1].replace(/,/g, '')), source('packages/server/src/pgwire.ts', /parts\.length < (\d+)/));
    assert.equal(Number(batches[2]), source('packages/server/src/pgwire.ts', /OUTPUT_BATCH_BYTES = (\d+) \* 1024/) / 1024);
    const params = text.match(/\*\*(\d+) MiB \(([\d,]+) bytes\)\*\*/);
    assert.ok(params);
    assert.equal(Number(params[1]) * 1024 * 1024, DEFAULT_PGWIRE_MAX_PARAM_BYTES);
    assert.equal(Number(params[2].replace(/,/g, '')), DEFAULT_PGWIRE_MAX_PARAM_BYTES);
    const sqlText = text.match(/limited to \*\*(\d+) MB\*\* \(([\d,]+) characters\)/);
    assert.ok(sqlText);
    assert.equal(Number(sqlText[1]) * 1024 * 1024, MAX_SQL_TEXT);
    assert.equal(Number(sqlText[2].replace(/,/g, '')), MAX_SQL_TEXT);
    const sqlSize = text.match(/more than (\d+) MB \(bytes\), or rows that add up to more than (\d+) MB in one result.*? plus (\d+) bytes for every value/);
    assert.ok(sqlSize);
    assert.equal(Number(sqlSize[1]) * 2 ** 20, SQL_ROW_LIMIT);
    assert.equal(Number(sqlSize[2]) * 2 ** 20, SQL_RESULT_LIMIT);
    assert.equal(Number(sqlSize[3]), SQL_VALUE_COST);
  });
});

test('docs/pgwire-writes.md states the transaction, statement and change-set limits of the code', () => {
  withEnv({ TABULARIUS_PGWIRE_TX_IDLE_MS: undefined, TABULARIUS_PGWIRE_TX_MAX_MS: undefined }, () => {
    const text = page('pgwire-writes.md');
    assert.match(text, new RegExp('idle inside `BEGIN` for ' + (txIdleMs() / 1000) + ' seconds is rolled back'));
    assert.match(text, new RegExp(`open for more than ${txMaxMs() / 60_000} minutes is rolled back`));
    assert.match(text, new RegExp(`change at most \\*\\*${WRITE_LIMIT.toLocaleString('en')} records\\*\\*`));
    assert.match(text, new RegExp('waited ' + (BATCH_LIMIT.changeSetWaitMs / 1000) + ' seconds is answered `503`'));
    assert.match(text, new RegExp(`at most ${BATCH_LIMIT.changeSetRequests} requests, and fails whole if it has run for ${BATCH_LIMIT.changeSetMs / 1000} seconds`));
  });
});

test('docs/pgwire-statement-deadline.md, docs/calendar-feeds.md and docs/text-size-limit.md state the figures of the code', () => {
  const deadline = page('pgwire-statement-deadline.md');
  assert.match(deadline, new RegExp(`killed after ${RECURSIVE_SQL.ms / 1000} seconds`));
  assert.match(deadline, new RegExp(`may use ${RECURSIVE_SQL.heapMb} MB of memory`));
  const outputMb = source('packages/store/src/sql-recursive.ts', /MAX_OUTPUT = (\d+) \* 2 \*\* 20/);
  assert.match(deadline, new RegExp(`each may use ${RECURSIVE_SQL.heapMb} MB of heap and the server parses up to a ${outputMb} MB answer`));
  const calendar = page('calendar-feeds.md');
  assert.match(calendar, new RegExp(`up to ${READ_LIMITS.bytes / 2 ** 20} MB and ${READ_LIMITS.events.toLocaleString('en')} events`));
  const size = page('text-size-limit.md');
  assert.match(size, new RegExp(`more than ${MAX_TEXT_RESULT.toLocaleString('en')} characters before they build it`));
  assert.match(size, new RegExp(`held to the ${MAX_TEXT_RESULT.toLocaleString('en')} characters like text`));
  assert.match(size, new RegExp(`refused over ${(MAX_TEXT_RESULT / 2).toLocaleString('en')} bytes`));
  const maxString = source('packages/calc/src/functions.ts', /MAX_STRING = (0x[0-9a-f]+)/i);
  assert.match(size, new RegExp(`about ${Math.floor(maxString / 1e6)} million characters`));
});
