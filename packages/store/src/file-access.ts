/** File-local security metadata; never part of a portable design export. */
export interface FileAccess {
  protect: boolean;
  sameHost: boolean;
  authorized: { fileId: string; names: string[]; at: string; by: string }[];
}

/** Reject malformed persisted security state instead of silently disabling protection. */
export function validFileAccess(value: unknown): value is FileAccess {
  if (!value || typeof value !== 'object') return false;
  const v = value as FileAccess;
  return typeof v.protect === 'boolean' && typeof v.sameHost === 'boolean' && Array.isArray(v.authorized)
    && v.authorized.every((a) => a && typeof a.fileId === 'string' && Array.isArray(a.names)
      && a.names.every((n) => typeof n === 'string') && typeof a.at === 'string' && typeof a.by === 'string');
}
