// A schedule, an inbound hook or a webhook is a standing way for a script to run as an account, or for a file's changes to leave
// the server. Adding, changing or removing one is kept in the security log of the file it belongs to, with who it runs as and
// where it sends to, and never with a secret or a full address. A failure to write the entry is said in the server's log; it
// never undoes the change.
//
// These routes have no personal accounts, so the entry names the way in instead, as the approval of a held file does: the channel
// the request came through (the admin console or the Admin API) and the address it came from.

import type { Host } from './host.ts';

export interface AutomationDetail {
  what: 'schedule' | 'inbound hook' | 'webhook';
  id: string;
  name?: string;
  script?: string;
  account?: string;
  network?: boolean;
  sendsTo?: string;
  fields?: string[];
  /** A schedule moved to another file: the file it left (on the entry of the new file) or the file it went to (on the entry of the old one). */
  movedFrom?: string;
  movedTo?: string;
}

/** Who made a change: the way in and the address, never a name (these routes have none). Absent for a change made inside the server. */
export interface AutomationActor {
  channel: 'admin console' | 'Admin API';
  from?: string;
}

/** The keys of `after` whose value differs from `before`, for the entry's list of what changed. */
export function changedFields<T extends object>(before: T, after: T, keys: readonly (keyof T & string)[]): string[] {
  return keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

/** The way in and client address, for a server-log line. */
function byText(actor?: AutomationActor): string {
  return actor ? ` by the ${actor.channel}${actor.from ? ` from ${actor.from}` : ''}` : '';
}

export function auditAutomation(host: Host, log: (m: string) => void, database: string | undefined, change: 'added' | 'changed' | 'removed', detail: AutomationDetail, actor?: AutomationActor): void {
  if (!database) return;
  // A save that changed nothing is not a change.
  if (change === 'changed' && detail.fields && !detail.fields.length) return;
  try {
    const store = host.get(database);
    if (!store) {
      // The file has no log here. Name only the object by kind/id and its file, never its script, run-as account or destination address.
      log(`security log: the ${detail.what} ${detail.id} was ${change}${byText(actor)}, but the file ${database} is not open here, so it is not in a security log`);
      return;
    }
    store.recordAutomationChange(change, detail, actor);
  } catch (e) {
    log(`security log: could not record that ${detail.what} ${detail.id} was ${change} in ${database}: ${(e as Error).message}`);
  }
}

/** A backup schedule belongs to no file: its changes are said in the server's log, with the destination folder. */
export function logServerWideAutomation(log: (m: string) => void, change: 'added' | 'changed' | 'removed', detail: { what: string; id: string; name?: string; dest?: string; fields?: string[] }, actor?: AutomationActor): void {
  const fields = detail.fields?.length ? ` (${detail.fields.slice(0, 20).join(', ')})` : '';
  const where = detail.dest ? `, destination ${detail.dest.slice(0, 300)}` : ', destination the default backup folder';
  log(`server-wide: the ${detail.what} ${detail.name ? `${detail.name.slice(0, 120)} ` : ''}(${detail.id}) was ${change}${fields}${where}${byText(actor)}`);
}
