import { existsSync, readFileSync, statSync } from 'node:fs';

const UTF8 = new TextDecoder('utf-8', { fatal: true });

/**
 * The text of a secret file, or undefined when it is not plain UTF-8: a file saved as UTF-16 (what `>` and Out-File write in
 * Windows PowerShell) or in a legacy code page would otherwise become a secret nobody typed, with NUL or replacement characters
 * in it, and the server would start with a token no client can send.
 */
export function plainSecretText(bytes: Uint8Array): string | undefined {
  if (bytes.includes(0)) return undefined;
  try { return UTF8.decode(bytes); } catch { return undefined; }
}

/** The refusal for a secret file that is not plain UTF-8, naming the file and never what it holds. */
export const notPlainText = (command: string, path: string) => new Error(`${command}: ${path} is not plain UTF-8 text (a file saved as UTF-16, which Windows PowerShell's > and Out-File write, is the usual cause); save it again as UTF-8`);

/** Read a token from a regular file without putting its contents in errors. Symlinks follow their target. */
export function readSecretFile(path: string, optionName: string): string {
  const command = optionName === '--token-file' ? 'standby' : 'serve';
  if (!existsSync(path)) throw new Error(`${command}: ${optionName} ${path} does not exist`);
  const info = statSync(path);
  if (!info.isFile()) throw new Error(`${command}: ${optionName} ${path} must be a regular file`);
  if (process.platform !== 'win32' && info.mode & 0o077) {
    throw new Error(`${command}: ${path} can be read by other users; run: chmod 600 ${path}`);
  }
  const text = plainSecretText(readFileSync(path));
  if (text === undefined) throw notPlainText(command, path);
  const value = text.trim();
  if (!value) throw new Error(`${command}: ${path} is empty`);
  if (/[\r\n]/.test(value)) throw new Error(`${command}: ${optionName} ${path} must contain one line`);
  return value;
}
