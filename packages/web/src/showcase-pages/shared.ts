import { js } from '../page-templates.ts';

// Showcase CRM pages: modern layouts (one web viewer, its page in the address formula; see ../page-source.ts).
// Every page is built from the style block and the helper script below, copied into it (a page makes no network
// request, so nothing can be shared by address). The helpers build elements with textContent and setAttribute only,
// never HTML strings, so a record's value can hold < and quotes and stays text.

/** The names of the showcase layouts the pages read from or go to (the page data contract: only fields on these layouts are visible to a page); a page takes overrides, so a renamed layout is one edit. */
export interface ShowcaseNames {
  accounts: string; deals: string; activities: string; emailLog: string; reps: string; contacts: string;
  /** The layouts a click on an account or deal goes to. */
  account360: string; deal: string;
  /** The script that marks one task done (given the task's serial ID field) and the one that finds a record by its serial ID on the current layout after goToLayout. */
  markDone: string; goToRecord: string;
}

export const DEFAULT_NAMES: ShowcaseNames = {
  accounts: 'Accounts list', deals: 'Deals list', activities: 'Activities list', emailLog: 'Email Log list', reps: 'Reps list', contacts: 'Contacts list',
  account360: 'Account 360', deal: 'Deal', markDone: 'Mark task done', goToRecord: 'Go to record',
};

export const SHARED_STYLE = `
  :root { color-scheme: light dark; --bg: #f5f6f8; --card: #ffffff; --text: #12161e; --muted: #5b6472; --faint: #8a93a1; --line: #e4e7ec; --track: #e8ebf0; --hover: #f1f5fb;
    --accent: #2a78d6; --accent-ink: #1c5cab; --accent-soft: #e8f1fc; --good: #0f7a3d; --good-soft: #e3f5ea; --warn: #b45309; --warn-soft: #fdf1dc; --bad: #c0302f; --bad-soft: #fde8e8;
    --s1: #2a78d6; --s2: #eb6834; --s3: #1baf7a; --s4: #eda100; --s5: #e87ba4; --s6: #008300; --s7: #6250d6; --s8: #e34948;
    --st-Lead: #8a93a1; --st-Qualified: #2a78d6; --st-Proposal: #6250d6; --st-Negotiation: #eb6834; --st-Won: #0f9d58; --st-Lost: #e34948;
    --shadow: 0 1px 2px rgba(16,24,40,.05), 0 2px 8px rgba(16,24,40,.05); }
  @media (prefers-color-scheme: dark) { :root { --bg: #0d1016; --card: #161b24; --text: #eceff4; --muted: #a2abba; --faint: #7d8697; --line: #262d3a; --track: #262d3a; --hover: #1c2330;
    --accent: #5b9bf0; --accent-ink: #8bb9f6; --accent-soft: #1b2a41; --good: #4ade80; --good-soft: #14301f; --warn: #fbbf24; --warn-soft: #36290a; --bad: #f87171; --bad-soft: #3a1717;
    --s1: #3987e5; --s2: #d95926; --s3: #199e70; --s4: #c98500; --s5: #d55181; --s6: #2f9e2f; --s7: #9085e9; --s8: #e66767;
    --st-Lead: #7d8697; --st-Qualified: #3987e5; --st-Proposal: #9085e9; --st-Negotiation: #d95926; --st-Won: #34c07a; --st-Lost: #e66767; --shadow: none; } }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 -apple-system, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
  .wrap { padding: 24px 28px 40px; max-width: 1560px; margin: 0 auto; }
  .top { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: var(--faint); margin-bottom: 2px; }
  h1 { margin: 0; font-size: 28px; line-height: 1.15; letter-spacing: -.02em; font-weight: 700; }
  h2 { margin: 0; font-size: 14px; font-weight: 650; letter-spacing: -.005em; }
  .lede { margin: 4px 0 0; color: var(--muted); }
  .muted { color: var(--muted); } .faint { color: var(--faint); } .err { color: var(--bad); }
  .live { display: inline-flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--muted); background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px 4px 10px; }
  .live::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--st-Won); box-shadow: 0 0 0 3px color-mix(in srgb, var(--st-Won) 22%, transparent); }
  .cols { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
  .s3 { grid-column: span 3; } .s4 { grid-column: span 4; } .s5 { grid-column: span 5; } .s6 { grid-column: span 6; } .s7 { grid-column: span 7; } .s8 { grid-column: span 8; } .s12 { grid-column: 1 / -1; }
  @media (max-width: 1080px) { .s3, .s4, .s5, .s6, .s7, .s8 { grid-column: 1 / -1; } }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
  .card, .tile { background: var(--card); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); min-width: 0; animation: rise .4s ease both; }
  .card { padding: 18px 20px; display: flex; flex-direction: column; }
  .tile { padding: 16px 18px 16px; display: flex; flex-direction: column; gap: 2px; }
  .tile .lab { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 550; color: var(--muted); }
  .tile .val { font-size: 31px; line-height: 1.15; font-weight: 700; letter-spacing: -.025em; margin-top: 6px; font-variant-numeric: tabular-nums; }
  .tile .sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
  .tile .meter { margin-top: 10px; }
  .chip { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: none; color: var(--c, var(--accent)); background: color-mix(in srgb, var(--c, var(--accent)) 14%, transparent); }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 12px; }
  .head .sub { font-size: 12.5px; color: var(--muted); }
  .body { flex: 1; min-height: 0; }
  .scroll { overflow-y: auto; max-height: 400px; margin: 0 -8px; padding: 0 8px; }
  ul.list { list-style: none; margin: 0; padding: 0; }
  ul.list > li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 8px; margin: 0 -8px; border-radius: 10px; }
  ul.list > li + li { border-top: 1px solid var(--line); border-radius: 0; }
  ul.list > li.go:hover { background: var(--hover); cursor: pointer; }
  .row-main { min-width: 0; } .row-title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row-sub { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row-end { text-align: right; display: grid; gap: 2px; justify-items: end; }
  .amt { font-weight: 700; font-variant-numeric: tabular-nums; }
  button, select, input { font: inherit; color: var(--text); }
  button, select { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 5px 12px; cursor: pointer; }
  select { padding-right: 8px; }
  button:hover, select:hover { border-color: var(--accent); }
  button:focus-visible, select:focus-visible, .go:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btn-sm { font-size: 12.5px; padding: 3px 11px; white-space: nowrap; font-weight: 550; }
  .field { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--muted); }
  .field select { font-size: 13.5px; font-weight: 550; padding: 6px 10px; min-width: 160px; }
  .pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; padding: 1px 9px 1px 7px; border-radius: 999px; background: color-mix(in srgb, var(--c, var(--faint)) 13%, transparent); color: var(--text); white-space: nowrap; line-height: 1.7; }
  .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--c, var(--faint)); }
  .pill[data-s="Lead"] { --c: var(--st-Lead); } .pill[data-s="Qualified"] { --c: var(--st-Qualified); } .pill[data-s="Proposal"] { --c: var(--st-Proposal); }
  .pill[data-s="Negotiation"] { --c: var(--st-Negotiation); } .pill[data-s="Won"] { --c: var(--st-Won); } .pill[data-s="Lost"] { --c: var(--st-Lost); }
  .avatar { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); flex: none; }
  .meter { height: 8px; border-radius: 999px; background: var(--track); overflow: hidden; }
  .meter i { display: block; height: 100%; border-radius: 999px; background: var(--c, var(--accent)); transition: width .6s ease; }
  .skel { height: 14px; border-radius: 7px; margin: 12px 0; background: linear-gradient(90deg, var(--track) 25%, var(--hover) 50%, var(--track) 75%); background-size: 200% 100%; animation: shimmer 1.3s linear infinite; }
  .empty { display: grid; justify-items: center; gap: 6px; text-align: center; padding: 28px 12px; color: var(--muted); }
  .empty .chip { --c: var(--faint); width: 40px; height: 40px; border-radius: 12px; }
  .tip { position: fixed; z-index: 9; pointer-events: none; background: var(--text); color: var(--bg); font-size: 12px; padding: 4px 9px; border-radius: 8px; white-space: nowrap; opacity: 0; transition: opacity .12s; }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
  @keyframes shimmer { to { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

/** Helpers the pages share: element builders, dates, money, icons, avatars, a Copy button, an error line, and "is window.tabularius here". */
export const SHARED_JS = `
  const $ = (id) => document.getElementById(id);
  function make(ns, tag, props, kids) {
    const e = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    for (const k in props || {}) {
      if (k === 'class') e.setAttribute('class', props[k]);
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    }
    for (const c of kids.flat(2)) if (c !== null && c !== undefined && c !== false) e.append(c);
    return e;
  }
  const h = (tag, props, ...kids) => make(null, tag, props, kids);
  const sv = (tag, props, ...kids) => make('http://www.w3.org/2000/svg', tag, props, kids);
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  // A date or timestamp as a record gives it: MM/DD/YYYY [HH:MM:SS [AM|PM]] or YYYY-MM-DD[THH:MM:SS]; null when it is neither.
  function parseWhen(v) {
    const s = String(v === undefined || v === null ? '' : v).trim();
    let m = /^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})(?:[ T](\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*(AM|PM)?)?$/i.exec(s);
    if (m) {
      let hr = Number(m[4] || 0); const ap = (m[7] || '').toUpperCase();
      if (ap === 'PM' && hr < 12) hr += 12; if (ap === 'AM' && hr === 12) hr = 0;
      return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]), hr, Number(m[5] || 0), Number(m[6] || 0));
    }
    m = /^(\\d{4})-(\\d{2})-(\\d{2})(?:[T ](\\d{2}):(\\d{2})(?::(\\d{2}))?)?/.exec(s);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)) : null;
  }
  const money = (n) => (Number(n) < 0 ? '-' : '') + '$' + Math.round(Math.abs(Number(n) || 0)).toLocaleString();
  // A short money figure for tiles and axes: $4,200  $38.4K  $1.26M.
  const moneyK = (n) => { const a = Math.abs(Number(n) || 0), s = Number(n) < 0 ? '-' : ''; return a >= 1e6 ? s + '$' + (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? s + '$' + (a / 1e3).toFixed(1).replace(/\\.0$/, '') + 'K' : money(n); };
  const pct = (n) => (isFinite(n) ? Math.round(n * 100) + '%' : '–');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shortDate = (d) => (d ? MON[d.getMonth()] + ' ' + d.getDate() : '');
  const clock = (d) => (d ? (d.getHours() % 12 || 12) + ':' + pad(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM') : '');
  // "Today, 1:55 PM", "Yesterday", "Fri, Oct 30": how long ago a thing happened, in words.
  function whenLabel(d) {
    if (!d) return '';
    const t = new Date(), gap = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    return gap === 0 ? 'Today, ' + clock(d) : gap === 1 ? 'Yesterday' : gap === -1 ? 'Tomorrow' : DAYS[d.getDay()] + ', ' + shortDate(d);
  }
  // A due date as people say it: "Today", "Tomorrow", "Fri, Nov 6", or "3 days overdue".
  function dueLabel(d) {
    if (!d) return '';
    const t = new Date(), gap = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 864e5);
    return gap === 0 ? 'Today' : gap === 1 ? 'Tomorrow' : gap < 0 ? -gap + (gap === -1 ? ' day' : ' days') + ' overdue' : DAYS[d.getDay()] + ', ' + shortDate(d);
  }
  // A deal's title without the account it repeats: "Reporting suite, Northgate" under "Northgate Group" reads "Reporting suite".
  function dealTitle(r) {
    const t = field(r, 'Title'), a = field(r, 'Account Name'), i = t.lastIndexOf(', ');
    return i > 0 && a && a.toLowerCase().indexOf(t.slice(i + 2).toLowerCase()) === 0 ? t.slice(0, i) : t;
  }
  const field = (r, name) => (r && r.fieldData && r.fieldData[name] !== undefined && r.fieldData[name] !== null ? String(r.fieldData[name]) : '');
  const msg = (e) => String((e && e.message) || e || 'Something went wrong');
  function fail(el, e) { if (el) el.replaceChildren(h('span', { class: 'err' }, msg(e))); }
  const skel = (n) => Array.from({ length: n || 3 }, (_, i) => h('div', { class: 'skel', style: 'width:' + (92 - i * 14) + '%' }));
  // Icons: one stroke path each, drawn in the current colour.
  const ICONS = {
    check: 'M4 12l5 5L20 6', Task: 'M4 12l5 5L20 6', Call: 'M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z',
    Meeting: 'M4 6h16v13H4zM4 10h16M8 3v4M16 3v4', Email: 'M3 6h18v12H3zM3 7l9 7 9-7', Note: 'M5 3h10l4 4v14H5zM8 12h8M8 16h8',
    target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    layers: 'M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4',
    sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M10 17h4',
  };
  const icon = (name, size, color) => sv('svg', { viewBox: '0 0 24 24', width: String(size || 18), height: String(size || 18), fill: 'none', stroke: color || 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, sv('path', { d: ICONS[name] || ICONS.Note }));
  const chip = (name, slot) => h('span', { class: 'chip', style: '--c:var(--s' + (slot || 1) + ')' }, icon(name, 16));
  const initials = (s) => String(s || '').split(/\\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '–';
  // A person's circle: initials on a tint of one of the eight series colours, the same colour for the same name every time.
  const avatar = (name) => { let n = 0; for (const c of String(name || '')) n = (n * 31 + c.charCodeAt(0)) % 997; return h('span', { class: 'avatar', style: '--c:var(--s' + ([1, 7, 3, 2, 5, 4][n % 6]) + ')', 'aria-hidden': 'true' }, initials(name)); };
  const pill = (stage) => h('span', { class: 'pill', 'data-s': String(stage || '') }, stage || '–');
  const meter = (share, color) => h('div', { class: 'meter', role: 'presentation', style: color ? '--c:' + color : '' }, h('i', { style: 'width:' + Math.max(0, Math.min(1, share || 0)) * 100 + '%' }));
  const empty = (name, title, text) => h('div', { class: 'empty' }, h('span', { class: 'chip' }, icon(name, 20)), h('b', {}, title), h('span', {}, text || ''));
  const greeting = () => { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'; };
  const today = () => DAYS[new Date().getDay()] + ', ' + MON[new Date().getMonth()] + ' ' + new Date().getDate();
  // A hover label that follows the pointer, used by the column charts.
  let tipEl = null;
  function tip(show, text, ev) {
    if (!tipEl) { tipEl = h('div', { class: 'tip', role: 'presentation' }); document.body.append(tipEl); }
    if (!show) { tipEl.style.opacity = '0'; return; }
    tipEl.textContent = text; tipEl.style.opacity = '1';
    tipEl.style.left = Math.min(ev.clientX + 12, window.innerWidth - tipEl.offsetWidth - 8) + 'px'; tipEl.style.top = Math.max(8, ev.clientY - 34) + 'px';
  }
  // Writes to the clipboard where the sandbox allows it, else through a selected text area; says which happened on the button.
  async function copyText(text, button) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = h('textarea', { 'aria-hidden': 'true' }); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    const was = button.textContent; button.textContent = ok ? 'Copied' : 'Select and copy it by hand';
    setTimeout(() => (button.textContent = was), 1800);
  }
  const copyButton = (text) => { const b = h('button', { type: 'button', class: 'btn-sm' }, 'Copy'); b.addEventListener('click', (ev) => { ev.stopPropagation(); copyText(text, b); }); return b; };
  // Without window.tabularius (another program's web viewer, or a browser tab) the page says so instead of staying blank.
  function needsTabularius(what) {
    if (window.tabularius) return false;
    document.body.replaceChildren(h('main', { class: 'wrap', style: 'max-width:640px' }, h('h1', {}, ${js('This page needs Tabularius')}),
      h('p', { class: 'muted' }, what + ' It reads live records through window.tabularius, which only Tabularius provides, so it shows nothing in another web viewer or a plain browser tab.')));
    return true;
  }
  // The signed-in rep's record (the one whose Login is the account name), or null when Reps cannot be read or has no such rep.
  // It reads the few reps and matches here: a find that matches nothing is answered with an error (an account like Admin has no rep), which the browser logs.
  async function myRep(reps, account) {
    try {
      const r = await tabularius.records(reps, { limit: 500 });
      const want = String(account).toLowerCase();
      return (r.data || []).find((x) => field(x, 'Login').toLowerCase() === want) || null;
    } catch (e) { return null; }
  }
  const sum = (c) => ((c && c.series && c.series[0] && c.series[0].values) || []).map((x) => Number(x) || 0);
`;

/** A whole page: the document around `body` (HTML written by the page, never record data), its own script and the shared style. */
export function pageShell(title: string, body: string, script: string): string {
  // The shared style and helpers are copied into every page, so they are packed: whole-line comments and indentation go (a line is never joined to the next, so no statement changes meaning), and the style loses its spaces.
  const packJs = (code: string) => code.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('\n');
  const packCss = (css: string) => css.replace(/\s+/g, ' ').replace(/ ?([{};,]) ?/g, '$1').trim();
  script = packJs(script);
  body = body.replace(/<style>([\s\S]*?)<\/style>/g, (_, css: string) => '<style>' + packCss(css) + '</style>');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/[<>&"]/g, '')}</title>
<style>${packCss(SHARED_STYLE)}</style>
</head>
<body>
${body}
<script>
${packJs(SHARED_JS)}
${script}
</script>
</body>
</html>
`;
}

export const withNames = (names?: Partial<ShowcaseNames>): ShowcaseNames => ({ ...DEFAULT_NAMES, ...names });
