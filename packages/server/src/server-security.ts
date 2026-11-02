// Changes that belong to no single file go to the server's Admin log, one line each, with the way in and source address.
// Callers pass names, hosts, domains and changed field names only, never credentials or arbitrary setting values.
import type { Host } from './host.ts';
import { redactDiagnosticText } from '../../scripts/src/redaction.ts';

export const SERVER_SECURITY_EVENT_KINDS = [
  'server-setting-changed', 'admin-passkey-changed', 'connection-changed', 'plugin-secret-changed', 'server-schedule-changed',
] as const;
export type ServerSecurityEventKind = (typeof SERVER_SECURITY_EVENT_KINDS)[number];

/** These changes affect access, destinations or server limits: all are notices. */
export function serverSecurityEventSeverity(_kind: ServerSecurityEventKind): 'notice' { return 'notice'; }

/** These routes have no personal accounts; the actor is the proven way in and the address the server saw. */
export interface AdminActor { channel: string; address: string }
export type ServerEventDetail = Record<string, string | number | boolean | undefined>;

// Labels and folder names are free text too: keep one line, redact credentials, and retain only email domains.
const cut = (v: unknown, n = 200): string => redactDiagnosticText(String(v ?? ''))
  .replace(/[^\s<>"(),;:@]+@([A-Za-z0-9.-]+)/g, 'an address at $1').replace(/[\t\r\n]+/g, ' ').slice(0, n);

/** One event in plain English, using only the safe details supplied by the caller. */
export function describeServerSecurityEvent(kind: ServerSecurityEventKind, d: ServerEventDetail): string {
  switch (kind) {
    case 'server-setting-changed': return `The server setting "${cut(d.setting, 80)}" was changed${d.before !== undefined ? ` from ${cut(d.before)}` : ''} to ${cut(d.after)}${d.mode ? ` (${cut(d.mode, 80)})` : ''}`;
    case 'admin-passkey-changed': return `A passkey for signing in to the admin console was ${cut(d.change, 20)}${d.label ? `: ${cut(d.label, 80)}` : ''}`;
    case 'connection-changed': {
      const what = cut(d.change, 40);
      const about = `The connection ${cut(d.name, 80)}${d.type ? ` (${cut(d.type, 40)}${d.host ? `, host ${cut(d.host, 100)}` : ''})` : ''}`;
      if (what === 'secret set' || what === 'secret cleared') return `${about}: ${cut(d.field, 60)} ${what === 'secret set' ? 'was set' : 'was cleared'} (the value is never recorded)`;
      return `${about} was ${what}${d.fields ? ` (${cut(d.fields, 120)})` : ''}`;
    }
    case 'plugin-secret-changed': return `The plug-in ${cut(d.plugin, 80)}: secret ${cut(d.field, 60)} was ${d.change === 'set' ? 'set' : 'cleared'} (the value is never recorded)`;
    case 'server-schedule-changed': return `The ${cut(d.kind, 20)} schedule ${cut(d.name, 80)} was ${cut(d.change, 20)}${d.fields ? ` (${cut(d.fields, 120)})` : ''}${d.dest ? `, to ${cut(d.dest)}` : ''}`;
  }
}

/** The Admin log line: `[security notice] kind: sentence (via channel)`. */
export function serverSecurityEventLine(kind: ServerSecurityEventKind, d: ServerEventDetail, actor: AdminActor): string {
  return `[security ${serverSecurityEventSeverity(kind)}] ${kind}: ${describeServerSecurityEvent(kind, d)} (via ${cut(actor.channel, 80)})`;
}

/** A logging failure is reported when possible and never undoes an already completed change. */
export function recordServerSecurityEvent(host: Host, log: (m: string) => void, actor: AdminActor, kind: ServerSecurityEventKind, detail: ServerEventDetail): void {
  try {
    const line = serverSecurityEventLine(kind, detail, actor);
    if (host.logs) host.logs.write('Admin', 'Information', actor.address, line);
    else log(line);
  } catch (e) {
    try { log(`security log: could not record ${kind}: ${cut(e instanceof Error ? e.message : 'logging failed')}`); }
    catch { /* Even the fallback logger can fail; the completed change still stands. */ }
  }
}
