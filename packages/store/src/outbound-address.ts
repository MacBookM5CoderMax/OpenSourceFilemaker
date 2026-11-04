// The address rules of the outbound guard, in the store package so that anything that connects to an address an
// administrator chose (the ESS database clients) can use them without importing from a higher package. The scripts
// package's net-guard.ts re-exports all of this, so every existing import keeps working. Moved verbatim.

import { lookup as dnsLookup } from 'node:dns';
import { isIP, type LookupFunction } from 'node:net';

/** A request the guard would not make: the reason is for whoever asked, and holds no secret. */
export class OutboundRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboundRefused';
  }
}

/** How a name is resolved before it is connected to: swappable for tests. */
export const NAME_LOOKUP = {
  lookup: ((host, opts) => new Promise((resolve, reject) => dnsLookup(host, { all: opts.all }, (error, addresses) => (error ? reject(error) : resolve(addresses as { address: string; family?: number }[]))))) as (host: string, opts: { all: true }) => Promise<{ address: string; family?: number }[]>,
};

// --- addresses ----------------------------------------------------------------------------------------------

/**
 * `never`: link-local (where clouds keep credentials), metadata services, the unspecified address, multicast and
 * reserved ranges. `own`: loopback and the ranges used inside a network. `public`: everything else.
 */
export type AddressClass = 'never' | 'own' | 'public';

/** The IPv4 address inside an IPv4-mapped IPv6 one, in either spelling (::ffff:1.2.3.4 or ::ffff:102:304). */
export function mappedIPv4(h: string): string | undefined {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (!hex) return undefined;
  const a = parseInt(hex[1], 16);
  const b = parseInt(hex[2], 16);
  return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
}

/** The eight 16-bit groups of an IPv6 address. Scoped addresses are never accepted. */
export function ipv6Groups(address: string): number[] | undefined {
  if (address.includes('%')) return undefined;
  let h = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(h) !== 6) return undefined;
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (dotted) h = h.slice(0, dotted.index) + ((+dotted[1] << 8) | +dotted[2]).toString(16) + ':' + ((+dotted[3] << 8) | +dotted[4]).toString(16);
  const [head, tail] = h.split('::');
  const first = head ? head.split(':') : [];
  const last = tail === undefined ? [] : tail ? tail.split(':') : [];
  if (tail === undefined && first.length !== 8) return undefined;
  const fill = tail === undefined ? [] : Array(8 - first.length - last.length).fill('0');
  const groups = [...first, ...fill, ...last].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : undefined;
}

const dottedQuad = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

function classifyV4(address: string): AddressClass {
  const [a, b, c] = address.split('.').map(Number);
  if (a === 0) return 'never'; // 0.0.0.0/8: "this network", including the unspecified address
  if (a === 169 && b === 254) return 'never'; // link-local, 169.254.169.254 among it
  if (a === 100 && b === 100 && c === 100 && address === '100.100.100.200') return 'never'; // Alibaba Cloud's metadata service
  if (address === '168.63.129.16') return 'never'; // Azure's wire server
  if (a >= 224) return 'never'; // multicast, reserved and broadcast
  if (a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'own';
  if (a === 100 && b >= 64 && b <= 127) return 'own'; // carrier-grade NAT
  if ((a === 192 && b === 0 && c === 0) || (a === 198 && (b === 18 || b === 19))) return 'own'; // protocol assignments, benchmarking
  return 'public';
}

/** The IPv4 address an IPv6 one carries (mapped, compatible, NAT64 or 6to4), as dotted text. */
function embeddedV4(g: number[]): string | undefined {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g;
  const zeros = (n: number) => g.slice(0, n).every((x) => x === 0);
  if (zeros(5) && g5 === 0xffff) return dottedQuad(g6, g7); // ::ffff:a.b.c.d
  if (zeros(4) && g4 === 0xffff && g5 === 0) return dottedQuad(g6, g7); // ::ffff:0:a.b.c.d, the SIIT translated form
  if (zeros(6) && (g6 !== 0 || g7 > 1)) return dottedQuad(g6, g7); // ::a.b.c.d, the deprecated IPv4-compatible form (not :: or ::1)
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) return dottedQuad(g6, g7); // NAT64
  if (g0 === 0x2002) return dottedQuad(g1, g2); // 6to4 carries an IPv4 address after the prefix
  return undefined;
}

/** What kind of address this is. Anything that isn't an address is `never`: it is the caller's job to resolve names first. */
export function classifyAddress(address: string): AddressClass {
  const h = address.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (isIP(h) === 4) return classifyV4(h);
  const g = ipv6Groups(h);
  if (!g) return 'never';
  const v4 = embeddedV4(g);
  if (v4) return classifyV4(v4);
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g;
  if (g.every((x) => x === 0)) return 'never'; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g7 === 1) return 'own'; // ::1
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 1) {
    // 64:ff9b:1::/48, local-use NAT64. A translator may use any prefix length inside it (RFC 6052 section 2.2), so look where
    // the IPv4 address sits for the /48 form (bytes 6, 7, 9 and 10: byte 8 is skipped) and for the /96 form (the last 32 bits).
    const embedded = [[g3 >> 8, g3 & 255, g4 & 255, g5 >> 8], [g6 >> 8, g6 & 255, g7 >> 8, g7 & 255]];
    // A first octet of 0 is a host number in a long prefix, not an address in 0.0.0.0/8; nothing embedded is still this host's own translator.
    return embedded.some((v4) => v4[0] !== 0 && classifyV4(v4.join('.')) === 'never') ? 'never' : 'own';
  }
  if (g0 === 0x2001 && g1 === 0) return 'own'; // Teredo
  if ((g0 & 0xffc0) === 0xfe80) return 'never'; // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return 'never'; // multicast
  if ((g0 === 0xfd00 && g1 === 0x0ec2) || (g0 === 0xfd20 && g1 === 0x00ce)) return 'never'; // AWS's and Google's IPv6 metadata addresses
  if ((g0 & 0xfe00) === 0xfc00) return 'own'; // fc00::/7 unique-local
  if ((g0 & 0xffc0) === 0xfec0) return 'never'; // site-local scope, deprecated
  return 'public';
}

/** Whether an address is this machine's own: 127.0.0.0/8, ::1 and every spelling that carries them. */
export function isLoopbackAddress(address: string): boolean {
  const h = address.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const g = isIP(h) === 6 ? ipv6Groups(h) : undefined;
  const v4 = isIP(h) === 4 ? h : g ? embeddedV4(g) : undefined;
  if (v4) return v4.startsWith('127.');
  return !!g && g.slice(0, 7).every((x) => x === 0) && g[7] === 1;
}

/** Whether a `never` address is the link-local / cloud metadata kind (the others are unspecified, multicast or reserved). */
function linkLocalLike(address: string): boolean {
  const h = address.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const g = isIP(h) === 6 ? ipv6Groups(h) : undefined;
  const v4 = isIP(h) === 4 ? h : g ? embeddedV4(g) : undefined;
  if (v4) {
    const [a, b] = v4.split('.').map(Number);
    return (a === 169 && b === 254) || v4 === '100.100.100.200' || v4 === '168.63.129.16';
  }
  return !!g && ((g[0] & 0xffc0) === 0xfe80 || ((g[0] === 0xfd00 && g[1] === 0x0ec2) || (g[0] === 0xfd20 && g[1] === 0x00ce)));
}

/** The names clouds give their metadata service. */
const METADATA_NAMES = new Set(['metadata', 'instance-data', 'metadata.google.internal', 'metadata.goog', 'instance-data.ec2.internal']);

/** Whether a host (a name or an address) is plainly a cloud metadata or link-local one: what no policy allows. */
export function isInternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (METADATA_NAMES.has(h)) return true;
  return isIP(h) !== 0 && classifyAddress(h) === 'never';
}

// --- policy -------------------------------------------------------------------------------------------------

/**
 * What a request may reach beyond the public internet. `private: true` reaches the machine's own network (for a
 * destination an administrator typed in); a list reaches only the hosts and ranges on it (for a destination a script
 * chooses). Neither ever reaches a `never` address.
 */
export interface OutboundPolicy {
  private?: boolean | readonly string[];
}

export interface AllowEntry { host?: string; suffix?: string; ip?: string; family?: 4 | 6; prefix?: number; bits?: bigint }

const ipBits = (address: string): { family: 4 | 6; bits: bigint } | undefined => {
  if (isIP(address) === 4) return { family: 4, bits: address.split('.').reduce((n, o) => (n << 8n) | BigInt(o), 0n) };
  const g = ipv6Groups(address);
  return g ? { family: 6, bits: g.reduce((n, x) => (n << 16n) | BigInt(x), 0n) } : undefined;
};

/** The hosts and ranges an administrator listed: "intranet.example", "*.corp.example", "10.1.2.3", "10.0.0.0/8", "fd00::/8". A bad entry throws. */
export function parseAllowList(list: readonly string[]): AllowEntry[] {
  return list.map((raw) => raw.trim()).filter(Boolean).map((entry) => {
    const [written, len, extra] = entry.toLowerCase().split('/');
    if (extra !== undefined) throw new Error(`"${entry}" is not a host name, address or range`);
    const base = written.replace(/^\[|\]$/g, '');
    const parsed = ipBits(base);
    if (parsed) {
      const max = parsed.family === 4 ? 32 : 128;
      if (len !== undefined && !(/^\d{1,3}$/.test(len) && Number(len) <= max)) throw new Error(`"${entry}": the range length is 0 to ${max}`);
      return { family: parsed.family, bits: parsed.bits, prefix: len === undefined ? max : Number(len) };
    }
    if (len !== undefined) throw new Error(`"${entry}" is not a host name, address or range`);
    const name = base.replace(/\.$/, '');
    // A name made only of digits and dots is a mistyped address ("10.1"), which no host name will ever match.
    if (/^[0-9.]+$/.test(name)) throw new Error(`"${entry}" is not a host name, address or range`);
    if (name.startsWith('*.') && /^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(name.slice(2))) return { suffix: name.slice(1) };
    if (/^[a-z0-9_]([a-z0-9_.-]*[a-z0-9_])?$/.test(name)) return { host: name };
    throw new Error(`"${entry}" is not a host name, address or range`);
  });
}

function entryMatches(e: AllowEntry, host: string, address: string): boolean {
  if (e.host !== undefined) return host === e.host;
  if (e.suffix !== undefined) return host.endsWith(e.suffix);
  let a = ipBits(address);
  // An IPv4 range also covers the IPv4 address an IPv6 answer carries (::ffff:10.1.2.3).
  if (a?.family === 6 && e.family === 4) {
    const g = ipv6Groups(address.toLowerCase().replace(/^\[|\]$/g, ''));
    const v4 = g && embeddedV4(g);
    if (v4) a = ipBits(v4);
  }
  if (!a || a.family !== e.family) return false;
  const shift = BigInt((e.family === 4 ? 32 : 128) - e.prefix!);
  return a.bits >> shift === e.bits! >> shift;
}

const parsedLists = new WeakMap<readonly string[], AllowEntry[]>();
function allowEntries(list: readonly string[]): AllowEntry[] {
  let parsed = parsedLists.get(list);
  if (!parsed) parsedLists.set(list, (parsed = parseAllowList(list)));
  return parsed;
}

/** Why a request to this address must not be made, or undefined when it may. `host` is the name the address came from. */
export function addressRefusal(policy: OutboundPolicy, host: string, address: string): string | undefined {
  const name = host.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (METADATA_NAMES.has(name)) return 'That address leads to the link-local range, where cloud instances keep their credentials';
  const kind = classifyAddress(address);
  if (kind === 'public') return undefined;
  if (kind === 'never') {
    return linkLocalLike(address)
      ? 'That address leads to the link-local range, where cloud instances keep their credentials'
      : 'That address is not an address a request can be sent to (scoped, unspecified, multicast or reserved)';
  }
  const allow = policy.private;
  if (allow === true) return undefined;
  if (Array.isArray(allow) && allowEntries(allow).some((e) => entryMatches(e, name, address))) return undefined;
  return "That address is on this server's own network, which a request from here may not reach unless an administrator allows it";
}

/** The refusal for a host that is written as an address (a name is checked once it is resolved), or undefined. */
export function hostRefusal(policy: OutboundPolicy, hostname: string): string | undefined {
  const h = hostname.replace(/^\[|\]$/g, '');
  if (h.includes('%')) return 'Scoped addresses are not reached';
  if (METADATA_NAMES.has(h.toLowerCase().replace(/\.$/, ''))) return addressRefusal(policy, h, '169.254.169.254');
  return isIP(h) === 0 ? undefined : addressRefusal(policy, h, h);
}

type LookupCallback = (error: NodeJS.ErrnoException | null, address?: string | { address: string; family: number }[], family?: number) => void;
type LookupOptions = { family?: number | string; all?: boolean; hints?: number };

/**
 * A socket `lookup` that resolves the name, refuses it if any address it gives is one the policy won't reach, and hands
 * back only the addresses that were checked. Pass it as the `lookup` of http.request, net.connect or tls.connect.
 */
export function guardedLookup(policy: OutboundPolicy = {}): (hostname: string, options: LookupOptions | LookupCallback, callback?: LookupCallback) => void {
  return (hostname, options, callback) => {
    const done = (typeof options === 'function' ? options : callback)!;
    const opts: LookupOptions = typeof options === 'function' ? {} : options;
    const wanted = Number(opts.family) === 4 || opts.family === 'IPv4' ? 4 : Number(opts.family) === 6 || opts.family === 'IPv6' ? 6 : 0;
    const finish = (list: { address: string; family?: number }[]) => {
      for (const a of list) {
        const why = addressRefusal(policy, hostname, a.address);
        if (why) return done(Object.assign(new OutboundRefused(why), { code: 'EOUTBOUND' }) as NodeJS.ErrnoException);
      }
      const checked = list.map((a) => ({ address: a.address, family: a.family ?? isIP(a.address) })).filter((a) => !wanted || a.family === wanted);
      if (!checked.length) return done(Object.assign(new Error('That host has no usable address'), { code: 'ENOTFOUND' }));
      if (opts.all) return done(null, checked);
      done(null, checked[0].address, checked[0].family);
    };
    if (isIP(hostname) !== 0) return finish([{ address: hostname }]);
    NAME_LOOKUP.lookup(hostname, { all: true }).then(finish, (e) => done(connectionFailure(e)));
  };
}

/** Retain machine-readable failure codes without exposing resolver/socket addresses or TLS certificate names. */
export function connectionFailure(error: unknown): NodeJS.ErrnoException {
  const safe: NodeJS.ErrnoException = new Error('The outbound connection could not be made; the error code says why');
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (typeof code === 'string' && /^[A-Z][A-Z0-9_]+$/.test(code)) safe.code = code;
  return safe;
}

/** guardedLookup, typed for the `lookup` option of net.connect, tls.connect and http.request. */
export function socketLookup(policy: OutboundPolicy = {}): LookupFunction {
  return guardedLookup(policy) as unknown as LookupFunction;
}
