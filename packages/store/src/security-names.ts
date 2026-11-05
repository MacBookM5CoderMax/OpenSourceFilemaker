export function validPrivilegeSetName(name: unknown): name is string {
  return typeof name === 'string' && name.length > 0 && name.length <= 256 &&
    Buffer.from(name, 'utf8').toString('utf8') === name && name.trim() === name &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(name) && !/^[=+\-@]/u.test(name);
}

export function validAccountImportName(name: string): boolean {
  return name.length > 0 && name.length <= 256 && Buffer.from(name, 'utf8').toString('utf8') === name &&
    name.trim() === name && !/[\u0000-\u001f\u007f-\u009f]/u.test(name) && !/^[=+\-@]/u.test(name);
}

/**
 * Why a name cannot be given to a new account, or undefined when it can. SQLite stores NULs but reads only the prefix;
 * lone surrogates come back as U+FFFD. Refuse these identity changes, control characters and over-long names.
 */
export function accountNameProblem(name: string): string | undefined {
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(name)) return 'An account name cannot contain control characters';
  if (Buffer.from(name, 'utf8').toString('utf8') !== name) return 'An account name must be valid Unicode text';
  if (name.length > 256) return 'An account name is at most 256 characters';
  return undefined;
}
