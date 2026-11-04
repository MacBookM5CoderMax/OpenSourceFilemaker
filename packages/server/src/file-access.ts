import { Privileges, StoreError, type Store } from '../../store/src/index.ts';
import type { Host } from './host.ts';

export type FileAccessOperation = 'get' | 'set' | 'authorize' | 'remove' | 'reset';

/** Only the authenticated server administrator uses this synthetic principal. */
export function fileAccessAdministrator(store: Store): Privileges {
  return new Privileges('[server administrator]', { id: 1, name: '[Full Access]', records: { view: true, edit: true, create: true, delete: true },
    layouts: 'modifiable', valueLists: 'modifiable', scripts: 'modifiable', extendedPrivileges: [] }, store,
  (other) => fileAccessAdministrator(other as Store));
}

/** Full Access in both files, including the session's proven cross-file identity and token ceilings. */
export function manageFileAccess(host: Host, store: Store, actor: Privileges, operation: FileAccessOperation, body: Record<string, unknown> = {}, visible: (s: Store) => boolean = () => true) {
  if (!actor.in(store).full) throw new StoreError(9, 'File Access settings require Full Access');
  if (operation === 'set') {
    if (typeof body.protect !== 'boolean' || typeof body.sameHost !== 'boolean') throw new StoreError(960, 'Send protect and sameHost as booleans');
    store.setFileAccess({ protect: body.protect, sameHost: body.sameHost }, actor);
  } else if (operation === 'authorize') {
    const other = typeof body.file === 'string' ? host.get(body.file) : undefined;
    if (!other || !visible(other)) throw new StoreError(100, 'File is not hosted');
    if (!actor.in(other).full) throw new StoreError(9, 'Authorizing a file requires Full Access in both files');
    store.authorizeFile(other, actor);
  } else if (operation === 'remove') {
    if (typeof body.fileId !== 'string') throw new StoreError(960, 'Send the fileId to remove');
    store.deauthorizeFile(body.fileId, actor);
  } else if (operation === 'reset') {
    store.resetFileAccessId(actor);
  } else if (operation !== 'get') throw new StoreError(960, 'Unknown File Access operation');
  return { fileId: store.fileId, ...store.fileAccess(actor), hosted: host.names().filter((name) => {
    const other = host.get(name);
    if (!other || !visible(other)) return false;
    try { return actor.in(other).full; } catch { return false; }
  }) };
}
