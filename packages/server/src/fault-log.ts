// The log line for a fault of the server's own (an error that is neither an API error nor a store error). The client
// is told "Unknown error"; the cause goes to the log, but only so many per minute, so a caller who triggers one over
// and over can't fill the disk. The first ones of each minute keep their cause; the rest are counted, and the count is
// logged when the next minute begins.

import { redactDiagnosticText } from '../../scripts/src/redaction.ts';
import { faultLog, type FaultLog } from '../../store/src/fault-text.ts';

// The path hiding, the cause chain and the per-minute cap are shared with the store (it cannot import the server).
export { FAULT_LOGS_PER_MINUTE, faultLog, redactPaths, type FaultLog } from '../../store/src/fault-text.ts';

/** The server's own log of faults, shared by the Data API and OData. */
export const logFault: FaultLog = faultLog();

/** Faults from one database get their own cap so a noisy file cannot hide another file's cause. */
const scopedFaultLogs = new WeakMap<object, FaultLog>();
export function logFaultFor(scope: object): FaultLog {
  let log = scopedFaultLogs.get(scope);
  if (!log) scopedFaultLogs.set(scope, (log = faultLog()));
  return log;
}

/**
 * Whether an error is a fault of the server's own, whose text says things a caller shouldn't read: a file-system error
 * (it names a path), a SQLite error (a table, a column, sometimes a file), or a JavaScript bug (TypeError and the like,
 * which name the code). Errors the code throws on purpose, with a message written for the caller, are not.
 * `sql` lets a SQLite error through, for the one place a caller's own SQL is run and its error is the answer.
 */
export function isFault(e: unknown, options: { sql?: boolean } = {}): boolean {
  if (!(e instanceof Error)) return false;
  if (e instanceof TypeError || e instanceof RangeError || e instanceof ReferenceError || e instanceof EvalError || e instanceof URIError) return true;
  const code = (e as { code?: unknown }).code;
  if (typeof code !== 'string') return false;
  if (code === 'ERR_SQLITE_ERROR') return !options.sql;
  return /^E[A-Z0-9]{2,}$/.test(code) || code.startsWith('ERR_');
}

/** What a caller is told in place of a fault's text (the cause is in the server log). */
export const FAULT_MESSAGE = 'Unknown error: the server hit a problem it did not expect. The cause is in the server log.';

/** An error's text for a caller: a fault of the server's own is logged and replaced by FAULT_MESSAGE, anything else is as written. */
export function callerText(e: unknown): string {
  if (isFault(e)) {
    logFault(e);
    return FAULT_MESSAGE;
  }
  // Assignments only (name=value, "name": value): a mask on every "label: word" would turn "Invalid token: signature mismatch" into nonsense.
  return redactDiagnosticText(e instanceof Error ? e.message : String(e), { labels: 'assignments' });
}
