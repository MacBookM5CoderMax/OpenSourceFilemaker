// Drives a headless Chromium over the DevTools Protocol with Node's built-in
// WebSocket, for the opt-in browser scripts (smoke-web.ts, visual.ts): no npm
// dependency. Cloud sessions have a Chromium at /opt/pw-browsers; elsewhere,
// point TABULARIUS_CHROMIUM at a Chrome/Chromium executable.
import '../packages/store/src/legacy-env.ts';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CMD_TIMEOUT_MS = 20_000; // a DevTools command that never answers (dead browser) must not hang the run

export type Listener = (method: string, params: any, sessionId?: string) => void;

/** Find a Chromium to drive: an explicit override, then the preinstalled ones, then the PATH. */
export function findChromium(): string | undefined {
  if (process.env.TABULARIUS_CHROMIUM && existsSync(process.env.TABULARIUS_CHROMIUM)) return process.env.TABULARIUS_CHROMIUM;
  const roots = process.env.PLAYWRIGHT_BROWSERS_PATH
    ? [process.env.PLAYWRIGHT_BROWSERS_PATH]
    // macOS cache location follows Playwright's layout; real-Mac launch behaviour is unverified.
    : ['/opt/pw-browsers', ...(process.platform === 'darwin' ? [join(homedir(), 'Library', 'Caches', 'ms-playwright')] : [])];
  return findChromiumIn(roots, [
    '/opt/google/chrome/chrome', // the real binary: /usr/bin/google-chrome is a shell script that needs readlink, dirname, mkdir and cat on the PATH
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]);
}

/** Search explicit roots first, preferring standalone headless/browser-for-testing binaries. */
export function findChromiumIn(roots: string[], fixed: string[]): string | undefined {
  const priorities = ['chrome-headless-shell', 'headless_shell', 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome', 'Chromium.app/Contents/MacOS/Chromium'];
  for (const bin of priorities) for (const root of roots) {
    try {
      for (const dir of readdirSync(root).filter((d) => d.startsWith('chromium'))) {
        let subs: string[];
        try { subs = readdirSync(join(root, dir)); } catch { continue; }
        for (const sub of subs) {
          const p = join(root, dir, sub, bin);
          try { if (existsSync(p) && statSync(p).isFile()) return p; } catch { /* inaccessible browser path */ }
        }
      }
    } catch { /* no such root */ }
  }
  for (const p of fixed) if (existsSync(p)) return p;
  return undefined;
}

/** A tiny DevTools-Protocol client over one WebSocket: send a command, await its reply; stream events. */
export class Cdp {
  private ws!: WebSocket;
  private next = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private listeners = new Set<Listener>();
  private dead?: Error;

  static connect(url: string): Promise<Cdp> {
    const c = new Cdp();
    c.ws = new WebSocket(url);
    return new Promise((resolve, reject) => {
      c.ws.addEventListener('open', () => resolve(c));
      c.ws.addEventListener('error', () => { c.fail(new Error('Chromium DevTools socket error')); reject(new Error('could not connect to Chromium DevTools')); });
      c.ws.addEventListener('close', () => c.fail(new Error('Chromium DevTools socket closed')));
      c.ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.id && c.pending.has(msg.id)) {
          const { resolve: res, reject: rej } = c.pending.get(msg.id)!;
          c.pending.delete(msg.id);
          msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
        } else if (msg.method) {
          for (const l of [...c.listeners]) l(msg.method, msg.params, msg.sessionId);
        }
      });
    });
  }

  /** The socket died: fail every outstanding command so nothing awaits forever. */
  private fail(err: Error): void {
    this.dead ??= err;
    for (const { reject } of this.pending.values()) reject(err);
    this.pending.clear();
  }

  send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> {
    if (this.dead) return Promise.reject(this.dead);
    const id = this.next++;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`DevTools command ${method} timed out`)); }, CMD_TIMEOUT_MS);
      this.pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    });
  }

  on(fn: Listener): void { this.listeners.add(fn); }
  off(fn: Listener): void { this.listeners.delete(fn); }
  close(): void { try { this.ws.close(); } catch { /* already gone */ } }
}

/** Starts Chromium headless with its own profile and connects to it. */
export async function launchChromium(chromium: string, profile: string, extra: string[] = []): Promise<{ chrome: ChildProcess; cdp: Cdp }> {
  const chrome = spawn(chromium, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    `--user-data-dir=${profile}`, '--remote-debugging-port=0', ...extra, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  // Chrome prints "DevTools listening on ws://…" to stderr once it is ready. A runner running other jobs
  // can take well over 15 s to start it, so the wait only catches a Chromium that will never answer.
  const wsUrl = await new Promise<string>((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chromium did not start in time')), 90_000);
    chrome.stderr!.on('data', (d) => {
      buf += d;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
      if (m) { clearTimeout(t); resolve(m[1]); }
    });
    chrome.on('exit', (code) => { clearTimeout(t); reject(new Error(`Chromium exited early (${code})`)); });
  });
  return { chrome, cdp: await Cdp.connect(wsUrl) };
}
