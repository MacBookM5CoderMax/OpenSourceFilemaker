import type { IncomingMessage } from 'node:http';
import type { Store, Privileges } from '../../store/src/index.ts';
import type { Session } from './dataapi.ts';

export type WindowWrite = { file: string; table: string; layout: string; id: number; operation: 'New' | 'Modified' | 'Deleted'; context?: unknown };

function webWindow(session: Session, req: IncomingMessage): boolean {
  const id = req.headers['x-tabularius-window-id'];
  return session.client === 'web' && req.headers['x-tabularius-client'] === 'web' && typeof id === 'string' && id.length > 0 && id.length <= 100;
}

export function stageWebNew(session: Session, req: IncomingMessage, store: Store, id: number): void {
  if (!webWindow(session, req) || !store.schema.fileOptions?.onWindowTransaction) return;
  (session.windowTransactionStaged ??= new Set()).add(`${key(req, store)}\u0000${id}`);
}

export function unstageWebNew(session: Session, req: IncomingMessage, store: Store, id: number): boolean {
  return session.windowTransactionStaged?.delete(`${key(req, store)}\u0000${id}`) ?? false;
}

function key(req: IncomingMessage, store: Store): string {
  return `${store.name}\u0000${String(req.headers['x-tabularius-window-id'] ?? '')}`;
}

/** The field is read from the base table. A field hidden from this account contributes an empty string (inferred). */
function context(store: Store, layout: string, id: number, privileges: Privileges): unknown {
  const info = store.layout(layout);
  const wanted = store.schema.fileOptions?.onWindowTransactionField || 'OnWindowTransaction';
  const field = info.owner.schema.tables.find((t) => t.name === info.table)?.fields.find((f) => f.name.toLowerCase() === wanted.toLowerCase());
  if (!field || privileges.in(info.owner).field(info.table, field.name) === 'none') return '';
  try {
    const content = info.owner.get(info, id, 'iso', undefined, privileges, { fields: [field.name], fresh: true }).fieldData[field.name];
    const value = content === undefined || content === null ? '' : String(content);
    try { return JSON.parse(value); } catch { return value; }
  } catch {
    return '';
  }
}

/** Only successful writes made by this signed-in web session become receipts; request JSON cannot add entries. */
export function noteWebWrite(session: Session, req: IncomingMessage, store: Store, layout: string, id: number,
  operation: WindowWrite['operation'], privileges: Privileges, before?: unknown): void {
  if (!webWindow(session, req) || !store.schema.fileOptions?.onWindowTransaction) return;
  const info = store.layout(layout);
  const entry: WindowWrite = { file: info.owner.name, table: info.table, layout, id, operation,
    ...(operation === 'Deleted' ? { context: before } : {}) };
  const pending: Map<string, WindowWrite[]> = session.windowTransactions ??= new Map<string, WindowWrite[]>();
  const entries = pending.get(key(req, store)) ?? [];
  const prior = entries.find((e) => e.file === entry.file && e.table === entry.table && e.id === id);
  if (prior) {
    if (operation === 'Deleted' && prior.operation === 'New') entries.splice(entries.indexOf(prior), 1);
    else if (operation === 'Deleted') { prior.operation = 'Deleted'; prior.context = before; }
  } else entries.push(entry);
  pending.set(key(req, store), entries);
}

export function beforeWebDelete(store: Store, layout: string, id: number, privileges: Privileges): unknown {
  return context(store, layout, id, privileges);
}

/** Consume only this session and window's receipts; field values come from committed server records. */
export function takeWebWrites(session: Session, req: IncomingMessage, store: Store, privileges: Privileges): string | undefined {
  if (!webWindow(session, req)) return undefined;
  const pending = session.windowTransactions;
  const entries = pending?.get(key(req, store));
  if (!entries?.length) return undefined;
  pending!.delete(key(req, store));
  const summary: Record<string, Record<string, [string, number, unknown][]>> = Object.create(null);
  for (const entry of entries) {
    const file = summary[entry.file] ??= Object.create(null);
    (file[entry.table] ??= []).push([entry.operation, entry.id,
      entry.operation === 'Deleted' ? entry.context : context(store, entry.layout, entry.id, privileges)]);
  }
  return JSON.stringify(summary);
}
