import { js } from '../page-templates.ts';
import { pageShell, withNames, type ShowcaseNames } from './shared.ts';

/** Sales dashboard: tiles, revenue by month, a funnel, win rate by source and a leaderboard, all read as the signed-in account. */
export function salesDashboardPage(names?: Partial<ShowcaseNames>): string {
  const N = withNames(names);
  const body = `
<div class="wrap">
  <div class="top">
    <div><div class="eyebrow">Sales</div><h1>Sales dashboard</h1><p class="lede">Won, win rate and the leaderboard follow the period; the pipeline figures and the funnel show every open deal.</p></div>
    <label class="field">Period <select id="period">
      <option value="this quarter">This quarter</option><option value="this month">This month</option><option value="last 30 days">Last 30 days</option>
      <option value="year to date">Year to date</option><option value="">All time</option></select></label>
  </div>
  <section class="tiles">
    <div class="tile"><div class="lab">Open pipeline<span class="chip" style="--c:var(--s1)" id="i1"></span></div><div class="val" id="t-pipe">–</div><div class="sub" id="u-pipe">&nbsp;</div></div>
    <div class="tile"><div class="lab">Weighted forecast<span class="chip" style="--c:var(--s7)" id="i2"></span></div><div class="val" id="t-fore">–</div><div class="sub" id="u-fore">&nbsp;</div></div>
    <div class="tile"><div class="lab">Won<span class="chip" style="--c:var(--st-Won)" id="i3"></span></div><div class="val" id="t-won">–</div><div class="sub" id="u-won">&nbsp;</div></div>
    <div class="tile"><div class="lab">Win rate<span class="chip" style="--c:var(--s3)" id="i4"></span></div><div class="val" id="t-rate">–</div><div class="sub" id="u-rate">&nbsp;</div><div id="m-rate"></div></div>
    <div class="tile"><div class="lab">Average deal size<span class="chip" style="--c:var(--s2)" id="i5"></span></div><div class="val" id="t-avg">–</div><div class="sub" id="u-avg">&nbsp;</div></div>
  </section>
  <section class="cols">
    <div class="card s7"><div class="head"><h2>Revenue by month</h2><span class="sub" id="months-sub">Won deals, last 12 months</span></div><div class="body" id="months"></div></div>
    <div class="card s5"><div class="head"><h2>Pipeline funnel</h2><span class="sub">open deals by stage</span></div><div class="body" id="funnel"></div></div>
    <div class="card s5"><div class="head"><h2>Win rate by source</h2><span class="sub">won ÷ (won + lost)</span></div><div class="body" id="sources"></div></div>
    <div class="card s7"><div class="head"><h2>Rep leaderboard</h2><span class="sub">won amount in the period</span></div><div class="body" id="reps"></div></div>
  </section>
</div>
<style>
  .hbars { display: grid; gap: 11px; }
  .hbar { display: grid; grid-template-columns: minmax(84px, 130px) minmax(0, 1fr) auto; gap: 12px; align-items: center; font-size: 13px; }
  .hbar .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 550; }
  .hbar .val { font-weight: 650; font-variant-numeric: tabular-nums; text-align: right; min-width: 52px; }
  .hbar .meter { height: 12px; border-radius: 6px; } .hbar .meter i { border-radius: 6px; }
  .axis { fill: var(--faint); font-size: 11.5px; } .grid-line { stroke: var(--line); stroke-width: 1; } .bar { fill: var(--accent); }
  :root { --f1: #86b6ef; --f2: #5598e7; --f3: #2a78d6; --f4: #1c5cab; }
  @media (prefers-color-scheme: dark) { :root { --f1: #1c5cab; --f2: #256abf; --f3: #3987e5; --f4: #6da7ec; } }
  .col-hit { fill: transparent; cursor: default; } .col-hit:hover + .col { opacity: 1; } .col { fill: var(--accent); opacity: .86; transition: opacity .12s; }
  .rank { width: 22px; text-align: center; font-weight: 700; color: var(--faint); font-variant-numeric: tabular-nums; }
  .lb { display: grid; grid-template-columns: 22px 34px minmax(90px, 160px) minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 8px 0; }
  .lb + .lb { border-top: 1px solid var(--line); }
  .faint-n { color: var(--faint); font-weight: 500; font-size: 12px; margin-left: 6px; }
</style>`;
  const script = `
  const N = ${js(N)};
  Object.assign(ICONS, { trend: 'M3 17l6-6 4 4 8-8M15 7h6v6', dollar: 'M12 3v18M16.5 7.5C15.5 6.5 14 6 12 6c-2.5 0-4 1.2-4 3s1.5 2.6 4 3 4 1.2 4 3-1.5 3-4 3c-2 0-3.5-.6-4.5-1.6' });
  const OPEN = ['Lead', 'Qualified', 'Proposal', 'Negotiation'];
  const openQuery = () => OPEN.map((s) => ({ Stage: '==' + s }));
  const ask = (w) => tabularius.summarize(Object.assign({ title: 'figure', layout: N.deals }, w));
  const total = (q) => ask({ kind: 'number', query: q, measure: { field: 'Amount', fn: 'sum' } }).then((r) => Number(r.value) || 0);
  const count = (q) => ask({ kind: 'number', query: q }).then((r) => Number(r.value) || 0);
  const when = () => $('period').value;
  const closed = (extra) => [Object.assign({ Closed: when() || '*' }, extra)];
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  function tile(id, p, then) { p.then((v) => { $(id).textContent = v; if (then) then(v); }, (e) => fail($(id), e)); }
  // Horizontal bars in HTML, so the text stays crisp at any width: a name, a bar as wide as its share of the largest, the figure.
  function hbars(el, rows, none) {
    if (!rows.length) { el.replaceChildren(none); return; }
    const top = Math.max(...rows.map((r) => r.v), 1e-9);
    el.replaceChildren(h('div', { class: 'hbars' }, rows.map((r) => h('div', { class: 'hbar' },
      h('span', { class: 'name' }, r.name, r.note ? h('span', { class: 'faint-n' }, r.note) : null),
      h('div', { class: 'meter', style: '--c:' + (r.color || 'var(--accent)'), role: 'img', 'aria-label': r.name + ': ' + r.text }, h('i', { style: 'width:' + Math.max(2, (r.v / top) * 100) + '%' })),
      h('span', { class: 'val' }, r.text)))));
  }
  // Revenue by month: thin columns on a faint grid, drawn to the card's real width so the labels are true size.
  let monthData = null;
  function columns() {
    const el = $('months');
    if (!monthData) return;
    const cats = monthData.cats, vals = monthData.vals;
    if (!cats.length) { el.replaceChildren(empty('trend', 'No won deals yet', 'Won deals from the last 12 months appear here.')); return; }
    const W = Math.max(280, el.clientWidth || 560), H = 250, L = 46, B = 26, T = 12, top = Math.max(...vals, 1), nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(top))); return Math.ceil(top / p * 2) / 2 * p; })();
    const bw = (W - L) / cats.length, gap = Math.max(4, bw * .28), rx = 4;
    const g = [];
    for (let i = 0; i <= 4; i++) { const y = T + (H - T - B) * (1 - i / 4); g.push(sv('line', { class: 'grid-line', x1: String(L), x2: String(W), y1: String(y), y2: String(y) }), sv('text', { class: 'axis', x: String(L - 8), y: String(y + 4), 'text-anchor': 'end' }, i ? moneyK(nice * i / 4) : '0')); }
    const bars = cats.map((c, i) => {
      const bh = Math.max(2, (vals[i] / nice) * (H - T - B)), x = L + i * bw + gap / 2, w = bw - gap, y = H - B - bh, r = Math.min(rx, bh, w / 2);
      const m = Number(String(c).slice(5, 7)), label = (MON[m - 1] || String(c).slice(-5)) + (m === 1 || i === 0 ? ' ’' + String(c).slice(2, 4) : '');
      const hit = sv('rect', { class: 'col-hit', x: String(L + i * bw), y: String(T), width: String(bw), height: String(H - T - B) });
      const say = (ev) => tip(true, (MON[m - 1] || c) + ' · ' + money(vals[i]), ev);
      hit.addEventListener('mouseenter', say); hit.addEventListener('mousemove', say); hit.addEventListener('mouseleave', () => tip(false));
      return sv('g', {}, hit, sv('path', { class: 'col', d: 'M' + x + ' ' + (y + bh) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + bh) + 'Z', style: i === cats.length - 1 ? 'opacity:1' : '' }),
        sv('text', { class: 'axis', x: String(x + w / 2), y: String(H - 8), 'text-anchor': 'middle' }, label));
    });
    el.replaceChildren(sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: String(W), height: String(H), role: 'img', 'aria-label': 'Won revenue by month: ' + cats.map((c, i) => c + ' ' + money(vals[i])).join(', ') }, g, bars));
  }
  async function tiles() {
    const open_ = openQuery();
    const pipe = total(open_), n0 = count(open_);
    tile('t-pipe', pipe.then(moneyK)); n0.then((n) => ($('u-pipe').textContent = plural(n, 'open deal')), () => {});
    tile('t-fore', ask({ kind: 'number', query: open_, measure: { field: 'Weighted Amount', fn: 'sum' } }).then((r) => Number(r.value) || 0).then((v) => { Promise.all([pipe]).then(([p]) => ($('u-fore').textContent = p ? pct(v / p) + ' of open pipeline' : '')); return moneyK(v); }));
    const won = total(closed({ Stage: '==Won' })), n = count(closed({ Stage: '==Won' })), lost = count(closed({ Stage: '==Lost' }));
    tile('t-won', won.then(moneyK)); n.then((w) => ($('u-won').textContent = plural(w, 'deal') + ' won'), () => {});
    tile('t-rate', Promise.all([n, lost]).then(([w, l]) => { $('u-rate').textContent = w + ' won · ' + l + ' lost'; $('m-rate').replaceChildren(meter(w / ((w + l) || 1), 'var(--s3)')); return pct(w / (w + l)); }));
    tile('t-avg', Promise.all([won, n]).then(([a, w]) => { $('u-avg').textContent = w ? 'across ' + plural(w, 'won deal') : 'no won deals in this period'; return w ? moneyK(a / w) : '–'; }));
  }
  async function months() {
    const c = await ask({ kind: 'chart', chart: 'column', groupBy: ['Closed'], by: 'month', measure: { field: 'Amount', fn: 'sum' }, query: [{ Stage: '==Won', Closed: iso(addDays(new Date(), -365)) + '...' + iso(new Date()) }], limit: 13 });
    monthData = { cats: c.categories || [], vals: sum(c) };
    const best = monthData.vals.indexOf(Math.max(...monthData.vals, 0));
    $('months-sub').textContent = monthData.cats.length ? moneyK(monthData.vals.reduce((a, b) => a + b, 0)) + ' won in 12 months · best month ' + (MON[Number(String(monthData.cats[best]).slice(5, 7)) - 1] || '') + ' ' + moneyK(monthData.vals[best]) : 'Won deals, last 12 months';
    columns();
  }
  async function funnel() {
    const by = (fn) => ask({ kind: 'chart', chart: 'bar', groupBy: ['Stage'], measure: fn, query: openQuery(), limit: 8 });
    const [amt, cnt] = await Promise.all([by({ field: 'Amount', fn: 'sum' }), by({ field: 'Amount', fn: 'count' })]);
    const a = new Map((amt.categories || []).map((c, i) => [c, sum(amt)[i]])), k = new Map((cnt.categories || []).map((c, i) => [c, sum(cnt)[i]]));
    const stages = OPEN.filter((s) => a.has(s) || k.has(s));
    hbars($('funnel'), stages.map((s, i) => ({ name: s, note: String(k.get(s) || 0), v: a.get(s) || 0, text: moneyK(a.get(s) || 0), color: 'var(--f' + (i + 1) + ')' })), empty('layers', 'No open deals', 'The funnel fills in as deals are added.'));
  }
  async function sources() {
    const by = (stage) => ask({ kind: 'chart', chart: 'bar', groupBy: ['Source'], query: closed({ Stage: '==' + stage }), limit: 12 });
    const [w, l] = await Promise.all([by('Won'), by('Lost')]);
    const wv = new Map((w.categories || []).map((c, i) => [c, sum(w)[i]])), lv = new Map((l.categories || []).map((c, i) => [c, sum(l)[i]]));
    const keys = [...new Set([...wv.keys(), ...lv.keys()])].map((s) => ({ s, w: wv.get(s) || 0, n: (wv.get(s) || 0) + (lv.get(s) || 0) })).sort((x, y) => y.w / y.n - x.w / x.n || y.n - x.n);
    hbars($('sources'), keys.map((r) => ({ name: r.s || 'Unknown', note: r.w + '/' + r.n, v: r.w / r.n, text: pct(r.w / r.n), color: 'var(--s3)' })), empty('target', 'No closed deals in this period', 'Try a longer period.'));
  }
  async function reps() {
    const c = await ask({ kind: 'chart', chart: 'bar', groupBy: ['Owner Name'], measure: { field: 'Amount', fn: 'sum' }, query: closed({ Stage: '==Won' }), top: { field: 'Owner Name', n: 10 }, limit: 10 });
    const vals = sum(c), order = vals.map((v, i) => i).sort((x, y) => vals[y] - vals[x]), top = Math.max(...vals, 1);
    if (!order.length) { $('reps').replaceChildren(empty('trophy', 'No won deals in this period', 'Try a longer period.')); return; }
    $('reps').replaceChildren(...order.map((i, n) => h('div', { class: 'lb' }, h('span', { class: 'rank' }, String(n + 1)), avatar(c.categories[i]), h('span', { class: 'row-title' }, c.categories[i]),
      h('div', { class: 'meter', role: 'img', 'aria-label': c.categories[i] + ': ' + money(vals[i]), style: '--c:' + (n === 0 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 55%, var(--track))') }, h('i', { style: 'width:' + Math.max(2, vals[i] / top * 100) + '%' })), h('span', { class: 'amt' }, moneyK(vals[i])))));
  }
  function show() {
    for (const id of ['funnel', 'sources', 'reps']) $(id).replaceChildren(...skel(4));
    $('months').replaceChildren(...skel(5));
    for (const [id, fn] of [['t-pipe', tiles], ['months', months], ['funnel', funnel], ['sources', sources], ['reps', reps]]) fn().catch((e) => fail($(id), e));
  }
  [['i1', 'layers'], ['i2', 'target'], ['i3', 'trophy'], ['i4', 'trend'], ['i5', 'dollar']].forEach(([id, ic]) => $(id).replaceChildren(icon(ic, 16)));
  if (!needsTabularius('The sales dashboard shows pipeline, forecast and wins for the signed-in account.')) {
    $('period').addEventListener('change', show);
    let wide = 0; window.addEventListener('resize', () => { if (Math.abs($('months').clientWidth - wide) > 20) { wide = $('months').clientWidth; columns(); } });
    show();
    tabularius.on('refresh', show);
  }`;
  return pageShell('Sales dashboard', body, script);
}
