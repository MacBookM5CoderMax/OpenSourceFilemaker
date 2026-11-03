import { js } from '../page-templates.ts';
import { pageShell, withNames, type ShowcaseNames } from './shared.ts';

/** Account timeline: one account's activities and emails merged by time, grouped by day, each item expandable; an account picker, and the account's profile beside it. */
export function accountTimelinePage(names?: Partial<ShowcaseNames>): string {
  const N = withNames(names);
  const body = `
<div class="wrap" id="root">
  <div class="top" id="topbar">
    <div><div class="eyebrow">Account timeline</div><h1 id="title">Choose an account</h1><p class="lede" id="lede">Every call, meeting, task and email for one account, newest first.</p></div>
    <label class="field" id="pickwrap">Account <select id="pick" aria-label="Account"></select></label>
  </div>
  <section class="cols" style="margin-top:0">
    <aside class="s4" id="side"><div class="card" id="profile"></div></aside>
    <div class="s8"><div class="filters" id="filters" role="group" aria-label="Show"></div><div id="line" class="rail"><div class="skel" style="width:70%"></div><div class="skel" style="width:55%"></div><div class="skel" style="width:62%"></div></div></div>
  </section>
</div>
<style>
  .embedded .wrap, .wrap.embedded { padding-top: 12px; } .embedded #topbar, .embedded #side { display: none; } .embedded .s8 { grid-column: 1 / -1; }
  .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .fchip { border-radius: 999px; font-size: 13px; font-weight: 550; padding: 5px 14px; color: var(--muted); }
  .fchip b { color: var(--faint); font-weight: 600; margin-left: 4px; }
  .fchip[aria-pressed="true"] { background: var(--text); color: var(--bg); border-color: var(--text); } .fchip[aria-pressed="true"] b { color: inherit; opacity: .7; }
  .day { margin: 22px 0 10px 36px; font-size: 12px; font-weight: 650; letter-spacing: .06em; text-transform: uppercase; color: var(--faint); } .day:first-child { margin-top: 0; }
  .rail { position: relative; }
  .rail::before { content: ""; position: absolute; left: 14px; top: 8px; bottom: 8px; width: 2px; background: var(--line); border-radius: 2px; }
  .ev { position: relative; padding-left: 36px; margin-bottom: 8px; }
  .ev .dot { position: absolute; left: 0; top: 8px; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: var(--c); background: var(--card); border: 2px solid color-mix(in srgb, var(--c) 45%, var(--bg)); }
  details.item { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 10px 14px; box-shadow: var(--shadow); }
  details.item[open] { border-color: color-mix(in srgb, var(--c) 40%, var(--line)); }
  details.item summary { display: flex; gap: 10px; align-items: center; cursor: pointer; list-style: none; }
  details.item summary::-webkit-details-marker { display: none; }
  details.item .t { font-weight: 600; min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  details.item[open] .t { white-space: normal; }
  details.item .more { margin: 10px 0 2px; white-space: pre-wrap; color: var(--muted); padding-top: 10px; border-top: 1px solid var(--line); }
  .kv { display: grid; grid-template-columns: 1fr auto; gap: 8px 12px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 13.5px; } .kv dt { color: var(--muted); } .kv dd { margin: 0; font-weight: 650; text-align: right; font-variant-numeric: tabular-nums; }
  .who { display: flex; gap: 14px; align-items: center; } .who .avatar { width: 52px; height: 52px; font-size: 17px; }
  .health { --c: var(--faint); } .health[data-h="Healthy"] { --c: var(--st-Won); } .health[data-h="Watch"] { --c: var(--s4); } .health[data-h="At risk"] { --c: var(--st-Lost); }
</style>`;
  const script = `
  const N = ${js(N)};
  Object.assign(ICONS, { users: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5' });
  const SLOT = { Call: 3, Meeting: 7, Email: 1, Task: 4, Note: 5 };
  const KINDS = ['All', 'Call', 'Meeting', 'Email', 'Task', 'Note'];
  let accounts = [], chosen = '', lastCtx = '', items = [], filter = 'All', embedded = false;
  const dayLabel = (d) => dueLabel(d) === 'Today' ? 'Today' : dueLabel(d) === 'Tomorrow' ? 'Tomorrow' : dueLabel(d).indexOf('overdue') >= 0 ? (dueLabel(d) === '1 day overdue' ? 'Yesterday' : DAYS[d.getDay()] + ', ' + shortDate(d) + ', ' + d.getFullYear()) : DAYS[d.getDay()] + ', ' + shortDate(d) + ', ' + d.getFullYear();
  function item(it) {
    const slot = SLOT[it.kind] || 5, time = it.at ? clock(it.at) : '';
    return h('div', { class: 'ev', 'data-kind': it.kind }, h('span', { class: 'dot', style: '--c:var(--s' + slot + ')' }, icon(it.kind, 15)),
      h('details', { class: 'item', style: '--c:var(--s' + slot + ')' }, h('summary', {}, h('span', { class: 't' }, it.title), h('span', { class: 'pill', style: '--c:var(--s' + slot + ')' }, it.tag), h('span', { class: 'faint', style: 'font-size:12.5px;white-space:nowrap' }, time)),
        h('div', { class: 'more' }, it.body || 'Nothing more was recorded.')));
  }
  function draw() {
    const shown = items.filter((i) => filter === 'All' || i.kind === filter);
    $('filters').replaceChildren(...KINDS.filter((k) => k === 'All' || items.some((i) => i.kind === k)).map((k) => { const n = k === 'All' ? items.length : items.filter((i) => i.kind === k).length;
      const b = h('button', { type: 'button', class: 'fchip', 'aria-pressed': String(k === filter) }, k === 'All' ? 'All' : k + (k === 'Task' ? 's' : k === 'Email' ? 's' : k === 'Call' ? 's' : k === 'Meeting' ? 's' : 's'), h('b', {}, String(n))); b.addEventListener('click', () => { filter = k; draw(); }); return b; }));
    if (!items.length) { $('line').replaceChildren(h('div', { class: 'card' }, empty('clock', 'No activity yet', 'No calls, meetings, tasks or emails are recorded for this account.'))); return; }
    shown.sort((a, b) => (b.at ? b.at.getTime() : 0) - (a.at ? a.at.getTime() : 0));
    const out = []; let last = '';
    for (const it of shown) {
      const key = it.at ? iso(it.at) : 'undated';
      if (key !== last) { last = key; out.push(h('div', { class: 'day' }, it.at ? dayLabel(it.at) : 'No date')); }
      out.push(item(it));
    }
    $('line').replaceChildren(...out);
  }
  function profile(a, name) {
    const f = (k) => (a ? field(a, k) : '');
    const days = Number(f('Days Quiet'));
    $('profile').replaceChildren(h('div', { class: 'who' }, avatar(name), h('div', {}, h('h2', { style: 'font-size:18px' }, name || 'Account'), h('div', { class: 'muted', style: 'font-size:13px' }, [f('Industry'), f('Region')].filter(Boolean).join(' · ')))),
      f('Health') ? h('div', { style: 'margin-top:14px' }, h('span', { class: 'pill health', 'data-h': f('Health') }, f('Health'))) : null,
      h('dl', { class: 'kv' },
        f('Owner Name') ? [h('dt', {}, 'Owner'), h('dd', {}, f('Owner Name'))] : null,
        f('Open Pipeline') !== '' ? [h('dt', {}, 'Open pipeline'), h('dd', {}, money(f('Open Pipeline')))] : null,
        f('Won Total') !== '' ? [h('dt', {}, 'Won to date'), h('dd', {}, money(f('Won Total')))] : null,
        isFinite(days) && f('Days Quiet') !== '' ? [h('dt', {}, 'Last touch'), h('dd', {}, days === 0 ? 'today' : days + (days === 1 ? ' day ago' : ' days ago'))] : null,
        f('Contacts Count') !== '' ? [h('dt', {}, 'Contacts'), h('dd', {}, f('Contacts Count'))] : null));
  }
  async function load(id) {
    const q = [{ 'Account ID': '==' + id }];
    $('line').replaceChildren(...skel(4));
    let acct = null;
    try { const r = await tabularius.find(N.accounts, [{ ID: '==' + id }], { limit: 1 }); acct = (r.data || [])[0] || null; } catch (e) { acct = null; }
    const name = acct ? field(acct, 'Name') : (accounts.find((x) => x.id === id) || {}).name || 'Account';
    $('title').textContent = name; $('lede').textContent = 'Every call, meeting, task and email, newest first.';
    profile(acct, name);
    const [acts, mails] = await Promise.all([
      tabularius.find(N.activities, q, { limit: 500, sort: [{ fieldName: 'When', sortOrder: 'descend' }] }).then((r) => r.data, () => null),
      tabularius.find(N.emailLog, q, { limit: 500, sort: [{ fieldName: 'Sent', sortOrder: 'descend' }] }).then((r) => r.data, () => null),
    ]);
    if (acts === null && mails === null) { $('line').replaceChildren(h('span', { class: 'err' }, 'This account may not read activities or emails.')); return; }
    items = [
      ...(acts || []).map((r) => ({ kind: SLOT[field(r, 'Type')] ? field(r, 'Type') : 'Note', tag: field(r, 'Type') || 'Activity', title: field(r, 'Subject') || '(no subject)', at: parseWhen(field(r, 'When')) || parseWhen(field(r, 'Due')), body: [field(r, 'Outcome'), field(r, 'Notes')].filter(Boolean).join('\\n\\n') })),
      ...(mails || []).map((r) => ({ kind: 'Email', tag: field(r, 'Direction') || 'Email', title: field(r, 'Subject') || '(no subject)', at: parseWhen(field(r, 'Sent')), body: field(r, 'Body') })),
    ];
    draw();
  }
  async function show() {
    const c = await tabularius.context();
    const f = c.fieldData || {};
    // On the account layouts the current record is the account; on any other layout the record's Account ID and Account Name say which account it is about.
    const onAccount = c.layout === N.accounts || c.layout === N.account360;
    const ctxId = (onAccount ? f.ID : f['Account ID']) || '';
    embedded = onAccount && c.layout === N.account360;
    document.body.classList.toggle('embedded', embedded);
    if (!accounts.length) {
      try { const r = await tabularius.records(N.accounts, { limit: 500 }); accounts = (r.data || []).map((x) => ({ id: field(x, 'ID'), name: field(x, 'Name') })).filter((x) => x.id).sort((a, b) => a.name.localeCompare(b.name)); } catch (e) { accounts = []; }
    }
    // The page follows the record it sits on; from the layout menu it starts on the account touched most recently, and the picker takes it anywhere.
    if (ctxId && ctxId !== lastCtx) { chosen = String(ctxId); lastCtx = String(ctxId); }
    if (!chosen) {
      try { const r = await tabularius.find(N.activities, [{}], { limit: 1, sort: [{ fieldName: 'When', sortOrder: 'descend' }] }); chosen = field((r.data || [])[0], 'Account ID'); } catch (e) { chosen = ''; }
      if (!chosen && accounts.length) chosen = accounts[0].id;
    }
    $('where') && ($('where').textContent = 'Live as ' + (c.account || 'the signed-in account'));
    $('pick').replaceChildren(...accounts.map((a) => h('option', { value: a.id }, a.name)));
    if (!chosen) { $('line').replaceChildren(h('div', { class: 'card' }, empty('users', 'No accounts to show', 'This account cannot read any accounts, or the file has none yet.'))); $('profile').replaceChildren(); return; }
    $('pick').value = chosen;
    await load(chosen);
  }
  if (!needsTabularius('The account timeline shows an account\\'s activities and emails by day.')) {
    $('pick').addEventListener('change', () => { chosen = $('pick').value; filter = 'All'; load(chosen).catch((e) => fail($('line'), e)); });
    show().catch((e) => fail($('line'), e));
    tabularius.on('refresh', () => show().catch((e) => fail($('line'), e)));
  }`;
  return pageShell('Account timeline', body, script);
}
