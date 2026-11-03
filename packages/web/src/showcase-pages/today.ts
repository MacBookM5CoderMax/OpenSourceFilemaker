import { js } from '../page-templates.ts';
import { pageShell, withNames, type ShowcaseNames } from './shared.ts';

/** The eight prompts the "Try asking Claude" card lists, as plain text. */
export const TRY_PROMPTS = [
  'Which open deals have had no activity for two weeks, and who owns them?',
  'Summarize everything we know about <an account>',
  'Draft a follow-up email for the Negotiation deals closing this month',
  'Which accounts are marked At risk, and what happened in the last month?',
  'What is my forecast for this quarter, and which deals could slip?',
  'List the tasks I have overdue, oldest first',
  'Which lead sources win the most deals, by count and by amount?',
  'Find accounts that look like duplicates and say how you would merge them',
];

/** Today: a greeting, four headline figures, the quota ring, deals closing soon, tasks, the latest activities and prompts to try. */
export function todayPage(names?: Partial<ShowcaseNames>): string {
  const N = withNames(names);
  const body = `
<div class="wrap">
  <div class="top">
    <div><div class="eyebrow" id="date"></div><h1 id="hi">Today</h1><p class="lede" id="lede">Here is where your pipeline, quota and tasks stand.</p></div>
    <span class="live" id="where">Connecting…</span>
  </div>
  <section class="tiles" id="tiles">
    <div class="tile"><div class="lab">Won this quarter<span class="chip" style="--c:var(--st-Won)" id="i-won"></span></div><div class="val" id="v-won">–</div><div class="sub" id="s-won">&nbsp;</div></div>
    <div class="tile"><div class="lab">Open pipeline<span class="chip" style="--c:var(--s1)" id="i-pipe"></span></div><div class="val" id="v-pipe">–</div><div class="sub" id="s-pipe">&nbsp;</div></div>
    <div class="tile"><div class="lab">Closing in 30 days<span class="chip" style="--c:var(--s2)" id="i-soon"></span></div><div class="val" id="v-soon">–</div><div class="sub" id="s-soon">&nbsp;</div></div>
    <div class="tile"><div class="lab">Tasks due this week<span class="chip" style="--c:var(--s7)" id="i-task"></span></div><div class="val" id="v-task">–</div><div class="sub" id="s-task">&nbsp;</div></div>
  </section>
  <section class="cols">
    <div class="card s4"><div class="head"><h2 id="qt">Quota this quarter</h2><span class="sub" id="qs"></span></div><div class="body" id="quota"></div></div>
    <div class="card s8"><div class="head"><h2>Deals closing within 30 days</h2><span class="sub" id="ds"></span></div><div class="body scroll" id="deals"></div></div>
    <div class="card s4"><div class="head"><h2>Tasks</h2><span class="sub">overdue and due in 7 days</span></div><div class="body scroll" id="tasks"></div></div>
    <div class="card s4"><div class="head"><h2>Latest activity</h2><span class="sub" id="as"></span></div><div id="spark"></div><div class="body scroll" id="recent"></div></div>
    <div class="card s4"><div class="head"><h2>Try asking Claude</h2><span class="chip" style="--c:var(--s7)" id="i-ask"></span></div><p class="muted" style="margin:0 0 8px;font-size:13px">Connect an AI app (see Connect), then paste one of these.</p><div class="body scroll" id="prompts"></div></div>
  </section>
</div>
<style>
  .tick { width: 26px; height: 26px; border-radius: 50%; padding: 0; display: grid; place-items: center; color: transparent; border: 1.5px solid var(--faint); background: none; }
  .tick:hover { border-color: var(--st-Won); color: var(--st-Won); background: var(--good-soft); }
  .late { color: var(--bad); font-weight: 600; }
  .prompt { font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .ring-wrap { display: grid; justify-items: center; gap: 10px; text-align: center; }
  .ring-wrap .big { font-size: 22px; font-weight: 700; letter-spacing: -.02em; } .ring-wrap .big small { font-size: 14px; font-weight: 500; color: var(--muted); }
  .statusline { font-size: 12.5px; font-weight: 600; padding: 3px 12px; border-radius: 999px; }
</style>`;
  const script = `
  const N = ${js(N)};
  const PROMPTS = ${js(TRY_PROMPTS)};
  const OPEN = ['Lead', 'Qualified', 'Proposal', 'Negotiation'];
  const TYPE_SLOT = { Call: 3, Meeting: 7, Email: 1, Task: 4, Note: 5 };
  let me = null, account = '';
  // A rep's own records are picked by name (the page data contract has Rep Name and Owner Name, not the ids); with no rep record (a manager) every record the account may see shows.
  const mineAct = () => (me ? { 'Rep Name': '==' + field(me, 'Name') } : {});
  const mineDeal = () => (me ? { 'Owner Name': '==' + field(me, 'Name') } : {});
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const set = (id, v) => ($(id).textContent = v);
  // goToLayout takes the window to the layout; the file's own script then finds the record by its serial ID (a script cannot look up a record by its internal recordId). A record with no ID, or a file without the script, stays on the layout.
  async function open(layout, x) {
    await tabularius.goToLayout(layout);
    const id = field(x, 'ID');
    if (!id) return;
    try { await tabularius.performScript(N.goToRecord, id); } catch (e) { /* the layout is open; the script is optional */ }
  }
  function list(el, rows, none) {
    if (!rows.length) { el.replaceChildren(none); return; }
    el.replaceChildren(h('ul', { class: 'list' }, rows));
  }
  async function tasks() {
    const t = new Date(), r = await tabularius.find(N.activities, [Object.assign({ Type: '==Task', Due: iso(addDays(t, -7)) + '...' + iso(addDays(t, 7)) }, mineAct())], { limit: 100, sort: [{ fieldName: 'Due', sortOrder: 'ascend' }] });
    const open_ = r.data.filter((x) => field(x, 'Done') !== 'Yes');
    const todayIso = iso(t), late = open_.filter((x) => { const d = parseWhen(field(x, 'Due')); return d && iso(d) < todayIso; }).length;
    set('v-task', String(open_.length)); $('s-task').replaceChildren(late ? h('span', { class: 'late' }, late + ' overdue') : 'all on time');
    list($('tasks'), open_.slice(0, 12).map((x) => {
      const due = parseWhen(field(x, 'Due')), over = due && iso(due) < todayIso;
      const done = h('button', { type: 'button', class: 'tick', 'aria-label': 'Mark done: ' + (field(x, 'Subject') || 'task') }, icon('check', 14));
      done.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const id = field(x, 'ID');
        if (!id) { done.title = 'This task has no ID'; return; }
        done.disabled = true;
        try { await tabularius.performScript(N.markDone, id); await tasks(); } catch (e) { done.disabled = false; done.title = msg(e); }
      });
      const row = h('li', { class: 'go', tabindex: '0', role: 'link' }, done, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, field(x, 'Subject') || 'Task'),
        h('div', { class: 'row-sub' }, h('span', { class: over ? 'late' : '' }, dueLabel(due)), field(x, 'Account Name') ? ' · ' + field(x, 'Account Name') : '')), h('span', {}));
      const go = () => open(N.activities, x).catch((e) => fail($('tasks'), e));
      row.addEventListener('click', go); row.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') go(); });
      return row;
    }), empty('check', 'Nothing due', 'No open tasks in the next 7 days.'));
  }
  async function deals() {
    const t = new Date(), range = iso(t) + '...' + iso(addDays(t, 30));
    const r = await tabularius.find(N.deals, OPEN.map((s) => Object.assign({ Stage: '==' + s, 'Expected Close': range }, mineDeal())), { limit: 100, sort: [{ fieldName: 'Expected Close', sortOrder: 'ascend' }] });
    const total = r.data.reduce((a, x) => a + (Number(field(x, 'Amount')) || 0), 0);
    set('v-soon', moneyK(total)); set('s-soon', plural(r.data.length, 'deal') + ' expected to close'); set('ds', r.data.length ? moneyK(total) + ' in ' + plural(r.data.length, 'deal') : '');
    list($('deals'), r.data.slice(0, 10).map((x) => {
      const row = h('li', { class: 'go', tabindex: '0', role: 'link' }, avatar(field(x, 'Account Name')),
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, dealTitle(x)), h('div', { class: 'row-sub' }, field(x, 'Account Name') + ' · closes ' + shortDate(parseWhen(field(x, 'Expected Close'))))),
        h('div', { class: 'row-end' }, h('span', { class: 'amt' }, money(field(x, 'Amount'))), pill(field(x, 'Stage'))));
      const go = () => open(N.deal, x).catch((e) => fail($('deals'), e));
      row.addEventListener('click', go); row.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') go(); });
      return row;
    }), empty('target', 'No deals closing soon', 'No open deals are expected to close in the next 30 days.'));
  }
  async function quota() {
    const q = (extra) => tabularius.summarize(Object.assign({ title: 'Won this quarter', kind: 'number', layout: N.deals, query: [Object.assign({ Stage: '==Won', Closed: 'this quarter' }, mineDeal())] }, extra));
    const [won, n] = await Promise.all([q({ measure: { field: 'Amount', fn: 'sum' } }), q({})]);
    const amount = Number(won.value) || 0;
    set('v-won', moneyK(amount)); set('s-won', plural(Number(n.value) || 0, 'deal') + ' won');
    // A rep has a target of their own; a manager or admin has the whole team's.
    let target = me ? Number(field(me, 'Quarterly Quota')) || 0 : 0;
    if (!me) { try { const rr = await tabularius.records(N.reps, { limit: 500 }); target = (rr.data || []).reduce((a, x) => a + (Number(field(x, 'Quarterly Quota')) || 0), 0); } catch (e) { target = 0; } }
    set('qt', me ? 'Your quota this quarter' : 'Team quota this quarter');
    if (!target) { $('quota').replaceChildren(empty('target', money(amount) + ' won', 'No quarterly quota is set for this account.')); return; }
    const t = new Date(), q0 = Math.floor(t.getMonth() / 3) * 3, start = new Date(t.getFullYear(), q0, 1), end = new Date(t.getFullYear(), q0 + 3, 1);
    const elapsed = (t - start) / (end - start), daysLeft = Math.max(0, Math.ceil((end - t) / 864e5)), expected = target * elapsed;
    const share = Math.min(amount / target, 1), R = 62, C = 2 * Math.PI * R, ahead = amount >= expected;
    const col = ahead ? 'var(--st-Won)' : 'var(--s2)';
    set('qs', daysLeft + ' days left');
    $('quota').replaceChildren(h('div', { class: 'ring-wrap' },
      sv('svg', { viewBox: '0 0 160 160', width: '172', height: '172', role: 'img', 'aria-label': pct(amount / target) + ' of quota' },
        sv('circle', { cx: '80', cy: '80', r: String(R), fill: 'none', 'stroke-width': '14', style: 'stroke:var(--track)' }),
        sv('circle', { cx: '80', cy: '80', r: String(R), fill: 'none', 'stroke-width': '14', 'stroke-linecap': 'round', transform: 'rotate(-90 80 80)', 'stroke-dasharray': String(C), 'stroke-dashoffset': String(calm ? C * (1 - share) : C), style: 'stroke:' + col + ';transition:stroke-dashoffset .9s ease', id: 'arc' }),
        sv('text', { x: '80', y: '88', 'text-anchor': 'middle', style: 'fill:var(--text);font-size:30px;font-weight:700;letter-spacing:-.02em' }, pct(amount / target))),
      h('div', { class: 'big' }, moneyK(amount), ' ', h('small', {}, 'of ' + moneyK(target))),
      h('span', { class: 'statusline', style: 'background:color-mix(in srgb,' + col + ' 15%,transparent)' }, ahead ? 'Ahead of pace' : moneyK(expected - amount) + ' behind pace'),
      h('div', { class: 'muted', style: 'font-size:12.5px' }, amount >= target ? 'Quota reached' : moneyK(target - amount) + ' to go · ' + pct(elapsed) + ' of the quarter has passed')));
    if (!calm) requestAnimationFrame(() => requestAnimationFrame(() => { const a = $('arc'); if (a) a.style.strokeDashoffset = String(C * (1 - share)); }));
  }
  async function pipeline() {
    const q = (extra) => tabularius.summarize(Object.assign({ title: 'Open', kind: 'number', layout: N.deals, query: OPEN.map((s) => Object.assign({ Stage: '==' + s }, mineDeal())) }, extra));
    const [amt, n] = await Promise.all([q({ measure: { field: 'Amount', fn: 'sum' } }), q({})]);
    set('v-pipe', moneyK(Number(amt.value) || 0)); set('s-pipe', plural(Number(n.value) || 0, 'open deal'));
  }
  // Fourteen days of activity as small columns, when the file can group by day.
  async function spark() {
    const t = new Date();
    const c = await tabularius.summarize({ title: 'Activity per day', kind: 'chart', chart: 'column', layout: N.activities, groupBy: ['When'], by: 'day', query: [Object.assign({ When: iso(addDays(t, -13)) + '...' + iso(t) }, mineAct())], limit: 14 });
    const cats = c.categories || [], vals = sum(c);
    if (!cats.length) return;
    const top = Math.max(...vals, 1), W = 300, H = 44, bw = W / 14;
    const bars = cats.map((k, i) => { const d = parseWhen(k), slot = d ? Math.round((d - addDays(t, -13)) / 864e5) : i, bh = Math.max(3, (vals[i] / top) * (H - 4));
      const r = sv('rect', { x: String(slot * bw + 2), y: String(H - bh), width: String(bw - 4), height: String(bh), rx: '3', style: 'fill:var(--accent);opacity:' + (slot === 13 ? 1 : .55) });
      const say = (ev) => tip(true, vals[i] + (vals[i] === 1 ? ' activity' : ' activities') + ' · ' + shortDate(d), ev);
      r.addEventListener('mousemove', say); r.addEventListener('mouseleave', () => tip(false));
      return r; });
    $('spark').replaceChildren(h('div', { style: 'margin:-2px 0 10px' }, sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: String(H), role: 'img', 'aria-label': 'Activities per day, last 14 days', preserveAspectRatio: 'none' }, bars), h('div', { class: 'faint', style: 'font-size:11.5px' }, 'last 14 days')));
  }
  async function recent() {
    const r = await tabularius.find(N.activities, [mineAct()], { limit: 12, sort: [{ fieldName: 'When', sortOrder: 'descend' }] });
    set('as', r.data.length ? 'last ' + r.data.length : '');
    list($('recent'), r.data.map((x) => h('li', {}, chip(ICONS[field(x, 'Type')] ? field(x, 'Type') : 'Note', TYPE_SLOT[field(x, 'Type')] || 5),
      h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, field(x, 'Subject') || field(x, 'Type')), h('div', { class: 'row-sub' }, field(x, 'Account Name') || field(x, 'Type'))),
      h('span', { class: 'faint', style: 'font-size:12px;white-space:nowrap' }, whenLabel(parseWhen(field(x, 'When')))))), empty('clock', 'No activity yet', 'Calls, meetings and emails will appear here.'));
  }
  function prompts() {
    $('prompts').replaceChildren(h('ul', { class: 'list' }, PROMPTS.map((p) => h('li', {}, h('span', { class: 'chip', style: '--c:var(--s7);width:24px;height:24px;border-radius:7px' }, icon('sparkle', 13)), h('span', { class: 'prompt' }, p), copyButton(p)))));
  }
  async function show() {
    const c = await tabularius.context();
    account = c.account || '';
    set('date', today()); set('hi', greeting() + (account ? ', ' + account : ''));
    set('where', 'Live as ' + (account || 'the signed-in account'));
    me = await myRep(N.reps, account);
    set('lede', me ? 'Your pipeline, quota and tasks, as ' + field(me, 'Name') + '.' : 'The whole team’s pipeline, quota and tasks.');
    for (const [id, fn] of [['tasks', tasks], ['deals', deals], ['quota', quota], ['recent', recent], ['v-pipe', pipeline], ['spark', spark]]) fn().catch((e) => { if (id !== 'spark') fail($(id) && !/^v-/.test(id) ? $(id) : $('s-pipe'), e); });
  }
  $('i-won').replaceChildren(icon('trophy', 16)); $('i-pipe').replaceChildren(icon('layers', 16)); $('i-soon').replaceChildren(icon('target', 16)); $('i-task').replaceChildren(icon('check', 16)); $('i-ask').replaceChildren(icon('sparkle', 16));
  for (const id of ['tasks', 'deals', 'recent', 'quota']) $(id).replaceChildren(...skel(4));
  prompts();
  if (!needsTabularius('Today shows your tasks, deals, quota and latest activities.')) {
    show().catch((e) => set('where', msg(e)));
    tabularius.on('refresh', () => show().catch(() => {}));
  }`;
  return pageShell('Today', body, script);
}
