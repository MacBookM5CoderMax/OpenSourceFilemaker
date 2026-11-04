/** A WebDirect-style link, /fmi/webd/File?script=Name&param=text&$name=value, as the app's address carries it. */
export interface LinkedScript { script: string; parameter: string; variables: Record<string, string> }

export interface FmpUrl { host: '$' | '~' | string; file: string; script?: string; parameter: string; option?: number; variables: Record<string, string> }

/** Parses the documented fmp and versioned fmp URLs. URLSearchParams decodes each component exactly once. */
export function parseFmpUrl(input: string): FmpUrl | undefined {
  if (!/^fmp\d*:/i.test(input)) return undefined;
  try {
    const url = new URL(input);
    const host = url.hostname || (url.pathname.startsWith('//') ? '' : '');
    // URL treats fmp://$/ as an empty hostname and $ as the first path segment.
    const segments = url.pathname.split('/').filter(Boolean);
    const targetHost = host || segments.shift() || '';
    const file = segments.join('/');
    const q = url.searchParams;
    const variables: Record<string, string> = {};
    for (const [key, value] of q) if (/^\$[^$\s]{1,100}$/.test(key) && Object.keys(variables).length < 20) variables[key] = value;
    const script = q.get('script') ?? undefined;
    const optionText = q.get('option');
    const option = optionText !== null && /^\d+$/.test(optionText) ? Number(optionText) : undefined;
    return { host: targetHost, file, ...(script ? { script } : {}), parameter: q.get('param') ?? '', ...(option !== undefined ? { option } : {}), variables };
  } catch { return undefined; }
}

export function fmpTarget(parsed: FmpUrl, context: { hostname: string; port: string; currentFile: string }): 'this-file' | 'other-file' | 'other-host' | 'local-file' | 'invalid' {
  if (!parsed.file) return 'invalid';
  if (parsed.host === '~') return 'local-file';
  const host = parsed.host.toLowerCase();
  const own = context.hostname.toLowerCase();
  if (host !== '$' && host !== own && !(own === 'localhost' && host === '127.0.0.1') && !(own === '127.0.0.1' && host === 'localhost')) return 'other-host';
  const same = (a: string, b: string) => a.replace(/\.fmp12$/i, '').toLowerCase() === b.replace(/\.fmp12$/i, '').toLowerCase();
  return same(parsed.file, context.currentFile) ? 'this-file' : 'other-file';
}

/** What the address asks to run, or nothing; the variables are the $names, at most 20. */
export function parseLinkedScript(search: string): LinkedScript | undefined {
  const q = new URLSearchParams(search);
  const script = q.get('script');
  if (!script) return undefined;
  const variables: Record<string, string> = {};
  for (const [k, v] of q) if (/^\$[^$\s]{1,100}$/.test(k) && Object.keys(variables).length < 20) variables[k] = v;
  return { script, parameter: q.get('param') ?? '', variables };
}

/** The link's script, taken out of the address so a reload doesn't run it again. */
export function linkedScript(): LinkedScript | undefined {
  const found = parseLinkedScript(location.search);
  if (!found) return undefined;
  const q = new URLSearchParams(location.search);
  for (const k of [...q.keys()]) if (k === 'script' || k === 'param' || k.startsWith('$')) q.delete(k);
  history.replaceState(null, '', location.pathname + (q.size ? `?${q}` : '') + location.hash);
  return found;
}
