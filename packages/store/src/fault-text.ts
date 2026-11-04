// The pieces of the fault log that the store uses too: path hiding, the cause chain and the per-minute cap. They live in
// the store package because the store cannot import the server; the server's fault-log.ts re-exports them.

import { homedir } from 'node:os';
import { redactDiagnosticText } from '../../scripts/src/redaction.ts';
import { monotonicClock } from './monotonic.ts';

export const FAULT_LOGS_PER_MINUTE = 20;

// The sink looks console.error up at each call, so a test that replaces it sees the lines.
export interface FaultLog {
  (e: unknown): void;
}

// An absolute path in a fault's text names the machine's layout (the data folder, the account it runs as). The log keeps
// the file's own name and hides the folders above it: a path under the home folder becomes [home]/<name>, any other with
// two or more folders becomes [path]/<name>. This covers the frames of a stack too, so a frame keeps its function, file
// name and line:column. Forms: /a/b, //a/b, file:///a/b, C:\a\b and C:/a/b, and \\host\share\a; a folder name may hold
// spaces: a folder in the middle of a path may hold any words (sam smith, my docs), because the separator after it ends
// the name; the last name, which the text may run on after, takes only words that start with a capital or digit
// (Program Files, My Data), or the path is quoted. A URL is not a path.
const WORD = String.raw`[\w.@+~%-]+`;
const MID = String.raw`${WORD}(?: ${WORD})*`;
const SEG = String.raw`${WORD}(?: [A-Z0-9][\w.@+~%-]*)*`;
// The first name after the root keeps the capital rule, so "the /tmp folder and a/b" is not taken for one path.
const POSIX_PATH = new RegExp(String.raw`(?<![\w:/.\\-])(?:file:\/\/)?\/{1,2}${SEG}(?:\/${SEG})+`, 'g');
const WINDOWS_PATH = new RegExp(String.raw`(?<![\w\\])[A-Za-z]:[\\/]${SEG}(?:[\\/]${SEG})*`, 'g');
const UNC_PATH = new RegExp(String.raw`(?<![\w\\])\\\\${SEG}(?:\\${SEG})+`, 'g');
// A middle folder holding lowercase words after a space is read only when the path ends in a file name with an extension,
// so the words between two paths in running text ("cp /a/b c/d", "/a/b and/or /c/d") are not taken for a folder.
// It ends at a name boundary, so a folder with a dot in its name (node.js/) is not taken for the file.
const FILE = String.raw`[\w@+~%-]+(?:\.[\w@+~%-]+)+(?![\w.@+~%-]|[\\/])`;
const POSIX_SPACED = new RegExp(String.raw`(?<![\w:/.\\-])(?:file:\/\/)?\/{1,2}${SEG}(?:\/${MID}(?=\/))*\/${FILE}`, 'g');
const WINDOWS_SPACED = new RegExp(String.raw`(?<![\w\\])[A-Za-z]:[\\/]${SEG}(?:[\\/]${MID}(?=[\\/]))*[\\/]${FILE}`, 'g');
const UNC_SPACED = new RegExp(String.raw`(?<![\w\\])\\\\${SEG}(?:\\${MID}(?=\\))*\\${FILE}`, 'g');
// A quoted path may hold any spaces; the quote marks stay.
const QUOTED_PATH = /(["'`])((?:[A-Za-z]:[\\/]|\\\\|\/)[^"'`\n]*?[\\/][^"'`\n\\/]+)\1/g;

const lastName = (path: string) => path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1);

export function redactPaths(text: string): string {
  const home = homedir();
  // The long-path prefixes \\?\ and \\.\ before a drive or UNC name are dropped first (before the home folder is looked for), so the rest reads as an ordinary path.
  let out = text.replace(/\\\\[?.]\\UNC\\/gi, '\\\\').replace(/\\\\[?.]\\(?=[A-Za-z]:[\\/])/g, '');
  if (home.length > 1) {
    const escaped = home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // A boundary after the folder name, so /home/ab is not taken for /home/abc.
    const under = new RegExp(String.raw`(?:file:\/\/)?${escaped}(?![\w.@+~%-])((?:[\\/]${MID}(?=[\\/]))*[\\/]${FILE}|(?:[\\/]${SEG})*)`, 'g');
    out = out.replace(under, (_all, rest: string) => rest ? `[home]/${lastName(rest)}` : '[home]');
  }
  out = out.replace(QUOTED_PATH, (_all, quote: string, path: string) => `${quote}[path]${path.includes('\\') ? '\\' : '/'}${lastName(path)}${quote}`);
  out = out.replace(UNC_SPACED, (path) => `[path]\\${lastName(path)}`).replace(WINDOWS_SPACED, (path) => `[path]\\${lastName(path)}`).replace(POSIX_SPACED, (path) => `[path]/${lastName(path)}`);
  out = out.replace(UNC_PATH, (path) => `[path]\\${lastName(path)}`);
  out = out.replace(WINDOWS_PATH, (path) => `[path]\\${lastName(path)}`);
  return out.replace(POSIX_PATH, (path) => `[path]/${lastName(path)}`);
}

function diagnosticChain(error: unknown): string {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  let current = error;
  while (current !== undefined) {
    if (seen.has(current)) { parts.push('[circular cause]'); break; }
    seen.add(current);
    parts.push(current instanceof Error ? (current.stack ?? current.message) : String(current));
    if (!(current instanceof Error)) break;
    current = current.cause;
  }
  // Redact together so a labelled value in one error is also hidden when echoed by a cause.
  return redactPaths(redactDiagnosticText(parts.join('\nCaused by: ')));
}

export function faultLog(sink: (...args: unknown[]) => void = (...args) => console.error(...args), now: () => number = () => monotonicClock.now(), perMinute = FAULT_LOGS_PER_MINUTE,
  schedule: (fn: () => void, delay: number) => { unref?: () => void } = (fn, delay) => setTimeout(fn, delay)):
  FaultLog {
  let minute = -1;
  let logged = 0;
  let held = 0;
  let flushTimer: { unref?: () => void } | undefined;
  const scheduleFlush = () => {
    const heldMinute = minute;
    let timer: { unref?: () => void };
    timer = schedule(() => {
      if (flushTimer !== timer) return;
      flushTimer = undefined;
      if (minute !== heldMinute) {
        if (held) scheduleFlush();
        return;
      }
      if (held) {
        sink(`${held} more faults in the minute before were not logged (the first ${perMinute} of a minute are)`);
        held = 0;
      }
    }, (minute + 1) * 60_000 - now());
    flushTimer = timer;
    timer.unref?.();
  };
  return (e) => {
    const m = Math.floor(now() / 60_000);
    if (m !== minute) {
      if (held) sink(`${held} more faults in the minute before were not logged (the first ${perMinute} of a minute are)`);
      minute = m;
      logged = 0;
      held = 0;
    }
    if (logged < perMinute) {
      logged++;
      // Error inspection also prints causes and custom properties; never forward those objects.
      sink(diagnosticChain(e));
    } else {
      held++;
      if (!flushTimer) scheduleFlush();
    }
  };
}
