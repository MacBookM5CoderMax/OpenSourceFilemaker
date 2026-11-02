import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chownSync, chmodSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { ConnectionError, Connections } from '../src/connections.ts';
import { withFilesystemHook } from '../../store/src/fs-boundary.ts';

const ENV_KEYS = ['TABULARIUS_SECRETS_KEY', 'TABULARIUS_ENCRYPTION_KEY'] as const;
const KEY_FILE = '.openhbam-connections.key';
let goodKeyText = '';
const refusal = (e: unknown) => e instanceof ConnectionError && /plain file owned by the server's user with one link and private permissions/.test(e.message);
const unixOnly = process.platform === 'win32' && 'symbolic links, hard links, FIFO files, ownership and Unix permission bits are not available on Windows';
const mkfifoAvailable = process.platform !== 'win32' && (process.env.PATH ?? '').split(delimiter).some((directory) => existsSync(join(directory, 'mkfifo')));

function stubbedCommandPath(folder: string): NodeJS.ProcessEnv {
  const bin = join(folder, 'stub-bin');
  mkdirSync(bin);
  const marker = join(folder, 'forbidden-command-used');
  for (const command of ['launchctl', 'systemctl', 'sc', 'git', 'npm', 'curl', 'sudo']) {
    const stub = join(bin, command);
    writeFileSync(stub, '#!/bin/sh\nprintf \'%s\\n\' "$0" >> "$TABULARIUS_TEST_FORBIDDEN_COMMAND_MARKER"\nexit 99\n', { mode: 0o700 });
  }
  return {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
    TABULARIUS_TEST_FORBIDDEN_COMMAND_MARKER: marker,
  };
}

function withVault(run: (folder: string, keyFile: string) => void): void {
  const folder = mkdtempSync(join(tmpdir(), 'tabularius-vault-key-read-'));
  const saved = ENV_KEYS.map((key) => process.env[key]);
  for (const key of ENV_KEYS) delete process.env[key];
  const keyFile = join(folder, KEY_FILE);
  try {
    const connections = new Connections(folder);
    connections.create({ name: 'linked', type: 's3', config: { bucket: 'invoices' } });
    connections.setSecret('linked', 'accessKey', 'abc');
    connections.setSecret('linked', 'secretKey', 'def');
    connections.approve('linked');
    goodKeyText = readFileSync(keyFile, 'utf8');
    assert.match(goodKeyText, /^[0-9a-f]{64}\n$/);
    run(folder, keyFile);
  } finally {
    rmSync(folder, { recursive: true, force: true });
    ENV_KEYS.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
  }
}

function assertSecrets(folder: string): void {
  const secrets = new Connections(folder).use('linked').secrets;
  assert.equal(secrets.accessKey, 'abc');
  assert.equal(secrets.secretKey, 'def');
}

function assertRefused(folder: string, unchangedPath: string | null = join(folder, KEY_FILE)): void {
  let returned: unknown;
  let caught: unknown;
  try {
    returned = new Connections(folder).use('linked').secrets;
  } catch (error) {
    caught = error;
  }
  assert.equal(returned, undefined, 'a refused read returned no secrets');
  assert.ok(refusal(caught), `expected plain-file refusal, got ${String(caught)}`);
  assert.ok(!(caught as Error).message.includes(goodKeyText.trim()), 'the key text was not included in the error');
  if (unchangedPath !== null) assert.equal(readFileSync(unchangedPath, 'utf8'), goodKeyText, 'key bytes changed during the refused read');
}

function restoreKey(keyFile: string): void {
  writeFileSync(keyFile, goodKeyText, { mode: 0o600 });
  chmodSync(keyFile, 0o600);
}

test('reading an existing Vault key refuses a symbolic link and recovers after restoring the key', { skip: unixOnly }, () => {
  withVault((folder, keyFile) => {
    const target = join(folder, 'key-copy');
    writeFileSync(target, goodKeyText, { mode: 0o600 });
    rmSync(keyFile);
    symlinkSync(target, keyFile);
    assertRefused(folder, target);
    rmSync(keyFile);
    restoreKey(keyFile);
    assertSecrets(folder);
  });
});

test('reading an existing Vault key refuses a dangling symbolic link and recovers', { skip: unixOnly }, () => {
  withVault((folder, keyFile) => {
    const target = join(folder, 'missing-target');
    rmSync(keyFile);
    symlinkSync(target, keyFile);
    assertRefused(folder, null);
    assert.equal(existsSync(target), false);
    rmSync(keyFile);
    restoreKey(keyFile);
    assertSecrets(folder);
  });
});

test('reading an existing Vault key refuses a FIFO without waiting and recovers', { timeout: 30_000, skip: unixOnly || (!mkfifoAvailable && 'mkfifo is not installed') }, () => {
  withVault((folder, keyFile) => {
    rmSync(keyFile);
    const env = stubbedCommandPath(folder);
    execFileSync('mkfifo', [keyFile], { env });
    assert.equal(existsSync(join(folder, 'forbidden-command-used')), false, 'a forbidden command ran');
    assertRefused(folder, null);
    assert.equal(lstatSync(keyFile).isFIFO(), true);
    rmSync(keyFile);
    restoreKey(keyFile);
    assertSecrets(folder);
  });
});

test('reading an existing Vault key refuses a folder at the key name and recovers', { skip: unixOnly }, () => {
  withVault((folder, keyFile) => {
    rmSync(keyFile);
    mkdirSync(keyFile);
    assertRefused(folder, null);
    assert.equal(lstatSync(keyFile).isDirectory(), true);
    rmSync(keyFile, { recursive: true });
    restoreKey(keyFile);
    assertSecrets(folder);
  });
});

test('reading an existing Vault key refuses a hard link and recovers when the second name is removed', { skip: unixOnly }, () => {
  withVault((folder, keyFile) => {
    const second = join(folder, 'second-name');
    linkSync(keyFile, second);
    assert.equal(lstatSync(keyFile).nlink, 2);
    assertRefused(folder);
    rmSync(second);
    assertSecrets(folder);
  });
});

test('reading an existing Vault key refuses a file owned by another user and recovers', { skip: process.getuid?.() !== 0 && 'creating a file owned by another user needs root' }, () => {
  withVault((folder, keyFile) => {
    const uid = lstatSync(keyFile).uid;
    const gid = lstatSync(keyFile).gid;
    chownSync(keyFile, 65534, 65534);
    assertRefused(folder);
    chownSync(keyFile, uid, gid);
    assertSecrets(folder);
  });
});

test('reading an existing Vault key enforces private modes and accepts owner-only read modes', { skip: unixOnly }, () => {
  withVault((folder, keyFile) => {
    for (const mode of [0o666, 0o640, 0o604]) {
      chmodSync(keyFile, mode);
      assertRefused(folder);
      chmodSync(keyFile, 0o600);
    }
    for (const mode of [0o600, 0o400]) {
      chmodSync(keyFile, mode);
      assertSecrets(folder);
    }
  });
});

test('an ESTALE while opening the Vault key becomes the plain-file refusal', () => {
  withVault((folder, keyFile) => {
    const error = Object.assign(new Error('injected stale key file'), { code: 'ESTALE' });
    assert.throws(() => withFilesystemHook((event) => {
      if (event.operation === 'open' && event.phase === 'opened' && event.path === keyFile) throw error;
    }, () => new Connections(folder).use('linked')), refusal);
    assertSecrets(folder);
  });
});

test('a failed Vault key read cannot leave an earlier key in use', () => {
  withVault((folder, keyFile) => {
    const connections = new Connections(folder);
    assert.equal(connections.use('linked').secrets.accessKey, 'abc');
    const ioError = Object.assign(new Error('injected I/O error'), { code: 'EIO' });
    let caught: unknown;
    try {
      withFilesystemHook((event) => {
        if (event.operation === 'open' && event.phase === 'opened' && event.path === keyFile) throw ioError;
      }, () => connections.use('linked'));
    } catch (error) {
      caught = error;
    }
    assert.equal(caught, ioError);
    assert.equal(refusal(caught), false);
    assert.equal((caught as NodeJS.ErrnoException).code, 'EIO');
    assert.equal(readFileSync(keyFile, 'utf8'), goodKeyText);
    writeFileSync(keyFile, `${'f'.repeat(64)}\n`, { mode: 0o600 });
    assert.throws(() => connections.use('linked'), /key doesn't open the connections' secrets/);
    restoreKey(keyFile);
    assert.equal(connections.use('linked').secrets.accessKey, 'abc');
  });
});

test('a Vault key is re-read when the same Connections object is used again', { skip: unixOnly }, () => {
  withVault((folder, keyFile) => {
    const connections = new Connections(folder);
    assert.equal(connections.use('linked').secrets.accessKey, 'abc');
    const target = join(folder, 'key-copy');
    writeFileSync(target, goodKeyText, { mode: 0o600 });
    rmSync(keyFile);
    symlinkSync(target, keyFile);
    assert.throws(() => connections.use('linked'), refusal);
    assert.equal(readFileSync(target, 'utf8'), goodKeyText);
  });
});
