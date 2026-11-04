// The one guarded way out of the server. Everything that opens a connection to an address somebody else chose (a script's
// URL, a webhook, an identity provider, an AI endpoint, a plug-in's request) goes through here, so the rules are written
// once:
//
//   - The address a request is made to is checked after the name is resolved, and the connection is made to the address
//     that was checked (the resolver is the socket's own lookup), so a name that answers differently a second time can't
//     slip past.
//   - Link-local, cloud-metadata, unspecified, multicast and reserved addresses are never reached, whatever the policy.
//   - Loopback, private (RFC 1918, carrier-grade NAT, unique-local) and similar addresses are reached only where the
//     policy allows it: always for a destination an administrator typed in (a webhook, an identity provider, an S3
//     endpoint), and for a destination a script chooses only for the hosts and ranges an administrator listed.
//   - Redirects are followed by hand, each hop checked again; a hop to another origin carries none of the request's
//     headers; a body is cut off at a size and a request at a time.
//   - Addresses are read the way the URL parser reads them: 0x7f.1, 2130706433, 017700000001 and [::ffff:7f00:1] are all
//     127.0.0.1, and are refused (or allowed) as such.
//
// It makes the request with node:http(s) rather than fetch because only the socket's own lookup can be made to check the
// address that is then connected to. The Response it returns is an ordinary one.

import { request as httpRequest, type IncomingMessage, type RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { lookup as dnsLookup } from 'node:dns';
import { isIP, type LookupFunction } from 'node:net';
import { PassThrough, type Readable, Transform, pipeline } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { AsyncLocalStorage } from 'node:async_hooks';

import { connectionFailure, OutboundRefused, NAME_LOOKUP, mappedIPv4, ipv6Groups, classifyAddress, isLoopbackAddress, isInternalHost, parseAllowList, addressRefusal, hostRefusal, guardedLookup, socketLookup, type AddressClass, type OutboundPolicy, type AllowEntry } from '../../store/src/outbound-address.ts';
export { OutboundRefused, NAME_LOOKUP, mappedIPv4, ipv6Groups, classifyAddress, isLoopbackAddress, isInternalHost, parseAllowList, addressRefusal, hostRefusal, guardedLookup, socketLookup, type AddressClass, type OutboundPolicy, type AllowEntry } from '../../store/src/outbound-address.ts';

// --- requests -----------------------------------------------------------------------------------------------

export interface GuardOptions {
  policy?: OutboundPolicy;
  /** Headers and body together, including admission. Script requests are also bounded by TABULARIUS_OUTBOUND_MAX_TIME_MS (default 10 minutes); operator requests may use Infinity. */
  timeoutMs?: number;
  /** The most bytes of response body (after any decompression). Default 2 GiB: callers with their own, smaller cap keep it; Infinity for none. */
  maxBytes?: number;
  /** The most redirects followed. Default 5. */
  maxRedirects?: number;
}

const DEFAULT_TIMEOUT_MS = 15 * 60_000;
const DEFAULT_MAX_BYTES = 2 * 1024 ** 3;
const TRANSFER_WINDOW_MS = 15_000;
const MIN_TRANSFER_BYTES_PER_SECOND = 1024;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const NO_BODY = new Set([204, 205, 304]);
/** The headers that may follow a redirect to another origin: none of them carries a credential. */
const SAFE_ACROSS_ORIGINS = new Set(['accept', 'accept-language', 'accept-encoding', 'user-agent', 'range']);

/** Trusted initiating identity at script request sites, retained through signing and connection adapters. Never supplied by script text or inherited by change listeners. */
export const outboundContext = new AsyncLocalStorage<{ file: string; account: string; stop?: AbortSignal }>();

/** One request's lifetime. Explicit links avoid Node 22's quadratic AbortSignal.any bookkeeping on long-lived stops. */
export function outboundDeadline(signals: readonly (AbortSignal | null | undefined)[], timeoutMs = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal; abort(reason: unknown): void; dispose(): void;
} {
  const controller = new AbortController();
  const configured = Number(process.env.TABULARIUS_OUTBOUND_MAX_TIME_MS);
  const maximum = Number.isFinite(configured) && configured > 0 ? Math.max(1, Math.min(Math.floor(configured), 2 ** 31 - 1)) : 600_000;
  const limit = Math.max(1, Math.min(timeoutMs >= 0 ? timeoutMs : DEFAULT_TIMEOUT_MS, outboundContext.getStore() ? maximum : Infinity));
  const timer = Number.isFinite(limit)
    ? setTimeout(() => controller.abort(new DOMException('The outbound request exceeded its time limit', 'TimeoutError')), limit)
    : undefined;
  timer?.unref();
  const links = new Map<AbortSignal, () => void>();
  for (const source of new Set(signals)) {
    if (!source) continue;
    const abort = () => controller.abort(source.reason);
    if (source.aborted) abort();
    else { source.addEventListener('abort', abort, { once: true }); links.set(source, abort); }
  }
  const dispose = () => {
    clearTimeout(timer);
    for (const [source, abort] of links) source.removeEventListener('abort', abort);
    links.clear();
    controller.signal.removeEventListener('abort', dispose);
  };
  // An unread response still expires at its deadline. Release every source link on abort, even if no
  // reader ever observes the body error; normal consumption/cancellation disposes the lifetime sooner.
  if (controller.signal.aborted) dispose();
  else controller.signal.addEventListener('abort', dispose, { once: true });
  return {
    signal: controller.signal,
    abort: (reason) => controller.abort(reason),
    dispose,
  };
}

type FilePool = { active: number; accounts: Map<string, number>; waiting: Map<string, Set<() => void>> };
const filePools = new Map<string, FilePool>();

/** Eight combined HTTP/HTTPS sockets per file, four per account; FIFO within each account, round-robin between them. */
export function reserveOutbound(signal: AbortSignal): Promise<() => void> {
  signal.throwIfAborted();
  const identity = outboundContext.getStore();
  if (!identity) return Promise.resolve(() => {}); // Operator webhooks/connections do not share a script tenant's capacity.
  const { file } = identity;
  const account = identity.account.toLowerCase();
  let state = filePools.get(file);
  if (!state) filePools.set(file, state = { active: 0, accounts: new Map(), waiting: new Map() });
  const held = state;
  const prune = () => { if (!held.active && !held.waiting.size) filePools.delete(file); };
  const drain = () => {
    while (held.active < 8) {
      let granted = false;
      for (const [name, queue] of held.waiting) {
        if ((held.accounts.get(name) ?? 0) >= 4) continue;
        const grant = queue.values().next().value!;
        queue.delete(grant);
        held.waiting.delete(name);
        if (queue.size) held.waiting.set(name, queue);
        grant();
        granted = true;
        break;
      }
      if (!granted) break;
    }
    prune();
  };
  return new Promise((resolve, reject) => {
    const abort = () => {
      const queue = held.waiting.get(account);
      queue?.delete(grant);
      if (!queue?.size) held.waiting.delete(account);
      signal.removeEventListener('abort', abort);
      reject(signal.reason);
      prune();
    };
    const grant = () => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) { reject(signal.reason); return; }
      held.active++;
      held.accounts.set(account, (held.accounts.get(account) ?? 0) + 1);
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        held.active--;
        const remaining = held.accounts.get(account)! - 1;
        if (remaining) held.accounts.set(account, remaining);
        else held.accounts.delete(account);
        drain();
      });
    };
    const queue = held.waiting.get(account) ?? new Set();
    queue.add(grant);
    held.waiting.set(account, queue);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    else drain();
  });
}

class Cap extends Transform {
  private seen = 0;
  private readonly max: number;
  constructor(max: number) {
    super();
    this.max = max;
  }
  override _transform(chunk: Buffer, _enc: BufferEncoding, done: (error?: Error | null, data?: Buffer) => void): void {
    this.seen += chunk.length;
    if (this.seen > this.max) return done(new OutboundRefused(`The response is larger than the ${this.max} bytes a request may take in`));
    done(null, chunk);
  }
}

function decoded(res: IncomingMessage): { stream: Readable; encoded: boolean } {
  const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase().trim();
  const through = (t: Transform) => {
    pipeline(res, t, () => {});
    return { stream: t as unknown as Readable, encoded: true };
  };
  if (encoding === 'gzip' || encoding === 'x-gzip') return through(createGunzip());
  if (encoding === 'deflate') return through(createInflate());
  if (encoding === 'br') return through(createBrotliDecompress());
  return { stream: res, encoded: false };
}

/** Cancellation must destroy even an unread stream: returning an iterator before its first next() does not do that. */
function webStream(stream: Readable): ReadableStream<Uint8Array> {
  const iterator = stream[Symbol.asyncIterator]();
  let ended = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (ended) return;
        if (done) { ended = true; controller.close(); }
        else controller.enqueue(value);
      } catch (error) {
        if (!ended) { ended = true; controller.error(error); }
      }
    },
    async cancel() {
      ended = true;
      stream.destroy();
      await iterator.return?.().catch(() => {});
    },
  }, { highWaterMark: 0 });
}

/** One request to one address, no redirects: the response as it came. */
function once(url: URL, method: string, headers: Headers, body: Buffer | undefined, opts: Required<Pick<GuardOptions, 'maxBytes'>> & {
  policy: OutboundPolicy; signal: AbortSignal; script: boolean; abort(reason: unknown): void;
}): Promise<{ response: Response; settled: Promise<void> }> {
  return new Promise((resolve, reject) => {
    opts.signal.throwIfAborted();
    const why = hostRefusal(opts.policy, url.hostname);
    if (why) return reject(new OutboundRefused(why));
    const send: Record<string, string> = {};
    // This transport owns authority and message framing. Forward neither proxy credentials
    // nor hop-specific fields, including names nominated by the caller's Connection header.
    const hopHeaders = new Set(['host', 'content-length', 'transfer-encoding', 'connection',
      'keep-alive', 'proxy-connection', 'proxy-authorization', 'proxy-authenticate', 'te', 'trailer', 'upgrade',
      ...String(headers.get('connection') ?? '').toLowerCase().split(',').map(name => name.trim())]);
    headers.forEach((v, k) => { if (!hopHeaders.has(k)) send[k] = v; });
    if (!('accept-encoding' in send)) send['accept-encoding'] = 'gzip, deflate, br';
    if (!('user-agent' in send)) send['user-agent'] = 'tabularius';
    if (!('accept' in send)) send.accept = '*/*';
    if (body && !('content-length' in send)) send['content-length'] = String(body.length);
    else if (!body && method !== 'GET' && method !== 'HEAD' && !('content-length' in send)) send['content-length'] = '0';
    let finish!: () => void;
    const settled = new Promise<void>((resolve) => { finish = resolve; });
    const options: RequestOptions = { method, headers: send, lookup: socketLookup(opts.policy), agent: false, signal: opts.signal };
    const req = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, options, (res) => {
      if (opts.signal.aborted) { res.destroy(); finish(); return reject(opts.signal.reason); }
      const status = res.statusCode ?? 0;
      const out = new Headers();
      for (const [k, v] of Object.entries(res.headers)) {
        try {
          if (Array.isArray(v)) for (const x of v) out.append(k, x);
          else if (v !== undefined) out.set(k, v);
        } catch {
          // A header the Headers class refuses is dropped, as fetch does.
        }
      }
      const declared = Number(res.headers['content-length']);
      let response: Response;
      // A server can answer with a status no Response can hold (600, say): that is a failed request, never an uncaught error.
      if (status < 200 || status > 599) {
        res.destroy();
        return reject(new TypeError('fetch failed', { cause: new Error(`invalid upstream HTTP status ${status}`) }));
      }
      if (NO_BODY.has(status) || method === 'HEAD') {
        // No body is exposed, so do not drain or decompress an attacker-supplied payload (notably 205).
        // Every request has its own socket: closing it also avoids spending an admission slot on junk.
        res.once('close', finish);
        res.destroy();
        response = new Response(null, { status, statusText: res.statusMessage, headers: out });
      } else {
        const { stream, encoded } = decoded(res);
        if (encoded) {
          out.delete('content-encoding');
          out.delete('content-length');
        } else if (Number.isFinite(declared) && declared > opts.maxBytes) {
          res.destroy();
          finish();
          return reject(new OutboundRefused(`The response is larger than the ${opts.maxBytes} bytes a request may take in`));
        }
        const capped = new PassThrough();
        // pipeline removes its error handlers after buffering a complete response. An unread body can
        // still be destroyed by a later abort; keep that error handled even before its iterator starts.
        // Readers continue to receive the stored stream error through webStream's async iterator.
        capped.on('error', () => {});
        let rateTimer: NodeJS.Timeout | undefined;
        // Operator transfers keep their own limits; event streams can be healthy with sparse events.
        const eventStream = out.get('content-type')?.split(';', 1)[0].trim().toLowerCase() === 'text/event-stream';
        if (opts.script && !eventStream) {
          let received = 0;
          let began = performance.now();
          res.on('data', (chunk: Buffer) => { received += chunk.length; });
          // Count wire bytes in each window, so an early burst cannot fund an indefinitely trickling tail.
          rateTimer = setInterval(() => {
            const now = performance.now();
            if (received * 1000 < MIN_TRANSFER_BYTES_PER_SECOND * (now - began)) {
              opts.abort(new OutboundRefused(`The outbound transfer rate is below ${MIN_TRANSFER_BYTES_PER_SECOND} bytes per second`));
            }
            received = 0;
            began = now;
          }, TRANSFER_WINDOW_MS);
          rateTimer.unref();
          res.once('end', () => clearInterval(rateTimer));
          res.once('close', () => clearInterval(rateTimer));
        }
        const abort = () => capped.destroy(opts.signal.reason as Error);
        const complete = () => {
          clearInterval(rateTimer);
          opts.signal.removeEventListener('abort', abort);
          finish();
        };
        capped.once('end', complete);
        capped.once('close', complete);
        // One pipeline: a reader that gives up, a size over the cap or a dropped connection ends every stage and the socket.
        pipeline(stream, new Cap(opts.maxBytes), capped, () => {});
        opts.signal.addEventListener('abort', abort, { once: true });
        if (opts.signal.aborted) abort();
        response = new Response(webStream(capped), { status, statusText: res.statusMessage, headers: out });
      }
      Object.defineProperty(response, 'url', { value: url.href });
      resolve({ response, settled });
    });
    // 101 emits upgrade instead of response. Without a handler Node closes the socket without
    // settling this promise; even the later deadline then cannot release the admission slot.
    req.once('upgrade', (_res, socket) => {
      socket.destroy();
      finish();
      reject(new OutboundRefused('HTTP protocol upgrades are not supported'));
    });
    req.on('error', (e) => {
      finish();
      if (opts.signal.aborted) return reject(opts.signal.reason);
      const cause = (e as { cause?: unknown }).cause;
      const refused = e instanceof OutboundRefused ? e : cause instanceof OutboundRefused ? cause : undefined;
      if (refused) return reject(refused);
      reject(new TypeError('fetch failed', { cause: connectionFailure(e) }));
    });
    req.end(body);
  });
}

/**
 * What went wrong with a request, in words: the cause's system code (ECONNREFUSED and the like) says it for the program,
 * so a person is told the same thing as a sentence. Unknown fetch failures use generic text; caller errors keep theirs.
 */
export function networkProblem(e: unknown): string {
  const cause = (e as { cause?: unknown } | undefined)?.cause ?? e;
  const code = (cause as { code?: unknown } | undefined)?.code;
  const own = cause instanceof Error ? cause.message : e instanceof Error ? e.message : String(e);
  if (typeof code === 'string') {
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'that address was not found; check the spelling of the host name';
    if (code === 'ECONNREFUSED') return 'the server at that address refused the connection; check that it is running and the port is right';
    if (code === 'ECONNRESET' || code === 'EPIPE') return 'the connection was cut off before an answer arrived; try again';
    if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'UND_ERR_HEADERS_TIMEOUT') return 'the server did not answer in time';
    if (code === 'EHOSTUNREACH' || code === 'ENETUNREACH') return 'that address cannot be reached from this server';
    if (/^(CERT_|DEPTH_ZERO|UNABLE_TO_|SELF_SIGNED|ERR_TLS_CERT|ERR_SSL_)/.test(code)) return 'the server\'s certificate was not accepted; check that the address is the one the certificate was issued for';
  }
  if (/^fetch failed$/i.test(own)) return 'the server could not be reached';
  if (own === 'unexpected redirect') return 'the server redirected the request, and this request does not follow redirects';
  if (own === 'too many redirects') return 'the server redirected the request too many times';
  if (e instanceof TypeError && e.message === 'fetch failed') return 'the server could not be reached';
  return own;
}

/** Request.arrayBuffer() does not observe the request's signal while an upload producer is stalled. */
async function requestBody(request: Request, signal: AbortSignal): Promise<Buffer | undefined> {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const abort = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    if (signal.aborted) abort();
    const chunks: Buffer[] = [];
    for (;;) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) return Buffer.concat(chunks);
      chunks.push(Buffer.from(value));
    }
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}

/** Fetch through the guard, with a fresh socket and a sanitized cause/code for connection failures. */
export async function guardedFetch(input: string | URL | Request, init: RequestInit = {}, options: GuardOptions = {}): Promise<Response> {
  const policy = options.policy ?? {};
  // Before Request is made: its own error for an address with a password in it prints the password.
  try {
    const written = new URL(input instanceof Request ? input.url : String(input));
    if (written.username || written.password) throw new OutboundRefused('Put no credentials in the address; send them in a header');
  } catch (e) {
    if (e instanceof OutboundRefused) throw e;
    throw new OutboundRefused('The request address is not a valid URL');
  }
  const source = init.signal !== undefined ? init.signal : input instanceof Request ? input.signal : undefined;
  const identity = outboundContext.getStore();
  const lifetime = outboundDeadline([source, identity?.stop], options.timeoutMs);
  const { signal } = lifetime;
  let release: (() => void) | undefined;
  const dispose = () => { release?.(); lifetime.dispose(); };
  try {
    signal.throwIfAborted();
    // Request must only follow this short-lived signal, never the run's stop signal itself.
    const request = new Request(input, { ...init, signal });
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    let url = new URL(request.url);
    let method = request.method;
    let headers = new Headers(request.headers);
    let body = request.body ? await requestBody(request, signal) : undefined;
    signal.throwIfAborted();
    release = await reserveOutbound(signal);
    signal.throwIfAborted(); // Cancellation may win just after admission, before this continuation.
    for (let hop = 0; ; hop++) {
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new OutboundRefused(`${url.protocol} addresses are not reached (http and https only)`);
      if (url.username || url.password) throw new OutboundRefused('Put no credentials in the address; send them in a header');
      signal.throwIfAborted();
      const { response: res, settled } = await once(url, method, headers, body, { policy, maxBytes, signal, script: !!identity, abort: lifetime.abort });
      const location = res.headers.get('location');
      if (request.redirect === 'manual' || !REDIRECTS.has(res.status) || !location) {
        void settled.then(dispose);
        return res;
      }
      await res.body?.cancel().catch(() => {});
      await settled;
      if (request.redirect === 'error') throw new TypeError('fetch failed', { cause: new Error('unexpected redirect') });
      if (hop >= (options.maxRedirects ?? 5)) throw new TypeError('fetch failed', { cause: new Error('too many redirects') });
      let next: URL;
      try { next = new URL(location, url); }
      catch { throw new OutboundRefused('The redirect address is not a valid URL'); }
      if (next.origin !== url.origin) {
        const kept = new Headers();
        headers.forEach((v, k) => SAFE_ACROSS_ORIGINS.has(k) && kept.set(k, v));
        headers = kept;
      }
      if (res.status === 303 ? method !== 'GET' && method !== 'HEAD' : (res.status === 301 || res.status === 302) && method === 'POST') {
        method = 'GET';
        body = undefined;
        headers.delete('content-type');
        headers.delete('content-length');
      }
      url = next;
    }
  } catch (error) {
    dispose();
    throw error;
  }
}

/** A fetch that goes through the guard with this policy and these limits: for the places that take a `fetch` to call. */
export function guardedFetcher(options: GuardOptions = {}): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) => guardedFetch(input, init, options)) as typeof fetch;
}
