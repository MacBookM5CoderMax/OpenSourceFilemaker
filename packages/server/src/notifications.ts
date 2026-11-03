// Email notifications for server events, like FileMaker Server's email notification setting: the Error (or Error and
// Warning) lines the server writes to its logs are collected and sent to one address as a digest, at most once every
// few minutes, so a failing backup does not become a flood. Off until an administrator sets an address.
//
// They go out through the same sender as Send Mail (host.mail): only when the operator switched sending on, and never
// while a capture-only file is hosted. Passwords never reach a log, so none reach the mail. Only the leader process of
// a cluster sends, so a cluster sends one mail, not one each. The other processes of a cluster pass their error and warning lines to the
// leader (cluster.ts), which mails them in its digest, marked with the worker they came from.

import { hostname } from 'node:os';
import { domainToASCII } from 'node:url';
import type { Host } from './host.ts';
import type { LogType } from './server-logs.ts';

export const NOTIFY_SOURCE = 'notifications';
/** The most lines one digest carries; the rest are counted. */
const DIGEST_LINES = 50;
/** Lines kept while waiting for the next digest (the rest are only counted), and the most characters one line keeps. */
const WAITING_LINES = 500;
const LINE_CHARS = 300;
/** Test messages go out at most this often. */
const TEST_EVERY_MS = 30_000;

export interface NotifySettings {
  to: string;
  /** 'Error': errors only. 'Warning': errors and warnings. */
  level: 'Error' | 'Warning';
}

/** One plain address: what an administrator may type here. */
export const NOTIFY_ADDRESS = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * What the server log may say of the address: its domain, never the person's part. A mail error that repeats the
 * address is cleaned the same way: the address as typed, with the domain in its punycode form, and the local part
 * alone (a server may answer "ops.person... User unknown"; a part under four characters is left, as it would
 * also match ordinary words).
 */
const inLog = (text: string, to: string): string => {
  const at = to.lastIndexOf('@');
  const local = to.slice(0, at);
  const domain = to.slice(at + 1);
  const named = `an address at ${domain.toLowerCase()}`;
  const forms = new Set([to, `${local}@${domainToASCII(domain) || domain}`]);
  // The replacement is a function, so a $ in an address is not read as a replacement pattern.
  let out = text;
  for (const form of forms) out = out.replace(new RegExp(literal(form), 'gi'), () => named);
  if (local.length >= 4) out = out.replace(new RegExp(String.raw`(?<![\w.+-])${literal(local)}(?![\w+-])`, 'gi'), () => 'the recipient');
  return out;
};

export class Notifier {
  private readonly host: Host;
  private readonly every: number;
  private waiting: string[] = [];
  /** Lines dropped past WAITING_LINES since the last digest. */
  private dropped = 0;
  private lastTest = -Infinity;
  private timer?: NodeJS.Timeout;

  constructor(host: Host, opts: { every?: number } = {}) {
    this.host = host;
    this.every = opts.every ?? 5 * 60_000;
  }

  /** Called with every line the server logs. */
  note(type: LogType, source: string, message: string): void {
    if (source === NOTIFY_SOURCE || type === 'Information') return;
    const s = this.host.config.notifications();
    if (!s || (type === 'Warning' && s.level !== 'Warning')) return;
    // Log text can carry what a stranger typed (a failed sign-in names the account they gave): one short plain line.
    if (this.waiting.length >= WAITING_LINES) this.dropped++;
    else this.waiting.push(`${type} ${source}: ${message}`.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').slice(0, LINE_CHARS));
    if (!this.timer) {
      this.timer = setTimeout(() => void this.send(), this.every);
      this.timer.unref();
    }
  }

  /** Whether mail can go out at all (the operator switched sending on). */
  get canSend(): boolean {
    return !!this.host.mail && !this.host.outbound;
  }

  /** Sends what is waiting. */
  async send(retry = true): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    const lines = this.waiting.splice(0);
    const count = lines.length + this.dropped;
    this.dropped = 0;
    const s = this.host.config.notifications();
    if (!count || !s) return;
    const more = count > DIGEST_LINES ? `\n(and ${count - DIGEST_LINES} more; see the Event log)` : '';
    const failed = await this.mail(s.to, `Tabularius on ${hostname()}: ${count} ${count === 1 ? 'event' : 'events'}`,
      `${lines.slice(0, DIGEST_LINES).join('\n')}${more}\n`);
    // A digest that did not go out (the mail server was down a moment) is not lost: its lines wait for the next one.
    // Newer lines that arrived while it was being sent come after them; what does not fit is only counted.
    if (failed !== undefined && this.canSend) {
      const room = Math.max(0, WAITING_LINES - this.waiting.length);
      this.waiting.unshift(...lines.slice(0, room));
      this.dropped += count - Math.min(lines.length, room);
      if (retry && !this.timer && (this.waiting.length || this.dropped)) {
        this.timer = setTimeout(() => void this.send(), this.every);
        this.timer.unref();
      }
    }
  }

  /** Sends a test message to the address now; the answer says what happened. */
  async test(): Promise<{ sent: boolean; message: string }> {
    const s = this.host.config.notifications();
    if (!s) return { sent: false, message: 'No address is set.' };
    if (!this.canSend) return { sent: false, message: 'Mail sending is off on this server (the operator starts it with sending switched on), so nothing was sent.' };
    if (performance.now() - this.lastTest < TEST_EVERY_MS) return { sent: false, message: 'A test message went out a moment ago; try again in half a minute.' };
    this.lastTest = performance.now();
    const held = await this.mail(s.to, `Tabularius on ${hostname()}: test`, 'This is a test of the server\'s email notifications.\n');
    return held === undefined ? { sent: true, message: `Sent to ${s.to}.` } : { sent: false, message: held };
  }

  /** Sends one message; returns why not when it was refused or failed. */
  private async mail(to: string, subject: string, text: string): Promise<string | undefined> {
    if (!this.canSend) return 'Mail sending is off on this server.';
    try {
      const held = await this.host.mail!({ to: [to], cc: [], bcc: [], subject, text, fromName: 'tabularius', attachments: [], files: [] });
      if (typeof held === 'string') {
        this.host.logs?.write('Event', 'Warning', NOTIFY_SOURCE, `A notification was not sent: ${inLog(held, to)}`);
        return held;
      }
    } catch (e) {
      const why = `could not send to ${to}: ${(e as Error).message}`;
      // The reply goes to the administrator who set the address; the log is read by more people.
      this.host.logs?.write('Event', 'Warning', NOTIFY_SOURCE, `A notification ${inLog(why, to)}`);
      return why;
    }
    return undefined;
  }

  /** The server is stopping: what is waiting goes out now, if it can. */
  async stop(): Promise<void> {
    await this.send(false).catch(() => {});
  }
}
