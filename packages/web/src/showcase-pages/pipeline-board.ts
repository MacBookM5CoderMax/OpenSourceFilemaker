// The showcase CRM's pipeline board: deals as cards in a column for each stage, with the money worked out per column,
// a filter by rep, a stale-deal highlight, drag to move (or the menu on each card), and a reason asked for when a deal is
// lost. Plain HTML, CSS and JavaScript for a modern layout (see ../page-source.ts); it reads and writes through
// window.tabularius as the signed-in account, so a rep sees and moves only their own deals and the server says no to the rest.
//
// It reads the layout "Deals list" (the fields below must be on it: the showcase's page data contract) and writes the
// stage, its time stamp, the closing day and the lost reason, then adds a note to the deal's activity. No network, no
// libraries, nothing loaded: it also opens in a web viewer that has none.

/** The layout the board reads, the Activities layout it writes notes to, and the value lists it offers. */
export const BOARD_LAYOUT = 'Deals list';
export const BOARD_ACTIVITY_LAYOUT = 'Activities list';
export const BOARD_FIELDS = ['ID', 'Title', 'Account Name', 'Account ID', 'Owner Name', 'Stage', 'Amount', 'Weighted Amount', 'Probability', 'Expected Close', 'Closed', 'Stale', 'Days In Stage', 'Lost Reason', 'Stage Changed'] as const;

const CSS = String.raw`
  :root { color-scheme: light dark; --bg: #f5f6f8; --panel: #fff; --sunken: #eceff3; --text: #12161e; --muted: #5b6472; --faint: #8a93a1; --line: #e4e7ec; --a: #2a78d6; --a-soft: #e8f1fc; --warn: #b45309; --warn-soft: #fdf1dc; --good: #0f7a3d; --bad: #c0302f; --shadow: 0 1px 2px rgba(16,24,40,.06), 0 2px 8px rgba(16,24,40,.05);
    --s1: #2a78d6; --s2: #eb6834; --s3: #1baf7a; --s4: #eda100; --s5: #e87ba4; --s7: #6250d6; --st-lead: #8a93a1; --st-qualified: #2a78d6; --st-proposal: #6250d6; --st-negotiation: #eb6834; --st-won: #0f9d58; --st-lost: #e34948; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0d1016; --panel: #171c26; --sunken: #121720; --text: #eceff4; --muted: #a2abba; --faint: #7d8697; --line: #262d3a; --a: #5b9bf0; --a-soft: #1b2a41; --warn: #fbbf24; --warn-soft: #36290a; --good: #4ade80; --bad: #f87171; --shadow: none;
    --s1: #3987e5; --s2: #d95926; --s3: #199e70; --s4: #c98500; --s5: #d55181; --s7: #9085e9; --st-lead: #7d8697; --st-qualified: #3987e5; --st-proposal: #9085e9; --st-negotiation: #d95926; --st-won: #34c07a; --st-lost: #e66767; } }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.45 -apple-system, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; }
  header { padding: 24px 28px 8px; display: grid; gap: 16px; max-width: 1560px; margin: 0 auto; }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: var(--faint); }
  h1 { margin: 0; font-size: 28px; line-height: 1.15; letter-spacing: -.02em; font-weight: 700; }
  .tiles { display: grid; grid-template-columns: repeat(3, minmax(170px, 240px)); gap: 14px; }
  .tile { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 14px 18px; box-shadow: var(--shadow); }
  .tile span { display: block; color: var(--muted); font-size: 12.5px; font-weight: 550; }
  .tile b { display: block; font-size: 28px; line-height: 1.2; letter-spacing: -.025em; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .tile.warn b { color: var(--bad); }
  .bar { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; }
  .bar label { display: flex; gap: 6px; align-items: center; color: var(--muted); font-size: 12.5px; }
  select, input[type=search], button { font: inherit; color: var(--text); background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 6px 12px; min-height: 34px; }
  input[type=search] { min-width: 260px; } input[type=checkbox] { min-height: 0; accent-color: var(--a); }
  button { cursor: pointer; } select:hover, button:hover { border-color: var(--a); }
  button:focus-visible, select:focus-visible, input:focus-visible, .card:focus-visible { outline: 2px solid var(--a); outline-offset: 2px; }
  #msg { min-height: 20px; color: var(--muted); } #msg.err { color: var(--bad); }
  .board { display: flex; gap: 12px; padding: 8px 28px 32px; overflow-x: auto; align-items: flex-start; max-width: 1560px; margin: 0 auto; }
  .col { flex: 1 1 190px; min-width: 190px; background: var(--sunken); border-radius: 16px; padding: 12px; display: grid; gap: 10px; border-top: 3px solid var(--c, var(--faint)); }
  .col.lead { --c: var(--st-lead); } .col.qualified { --c: var(--st-qualified); } .col.proposal { --c: var(--st-proposal); } .col.negotiation { --c: var(--st-negotiation); } .col.won { --c: var(--st-won); } .col.lost { --c: var(--st-lost); }
  .col h2 { margin: 0; font-size: 13px; font-weight: 650; display: flex; justify-content: space-between; align-items: center; }
  .col h2 span:last-child { font-size: 12px; font-weight: 650; min-width: 22px; text-align: center; padding: 0 7px; border-radius: 999px; background: var(--panel); color: var(--muted); }
  .sum { font-size: 12.5px; color: var(--muted); display: flex; justify-content: space-between; gap: 8px; font-variant-numeric: tabular-nums; }
  .sum > span:first-child, .sum > b:first-child { font-weight: 700; color: var(--text); font-size: 15px; }
  .cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; min-height: 48px; align-content: start; }
  .cards.over { outline: 2px dashed var(--a); outline-offset: 3px; border-radius: 10px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 11px 12px; box-shadow: var(--shadow); display: grid; gap: 6px; cursor: grab; border-left: 3px solid transparent; animation: rise .25s ease both; transition: transform .12s, box-shadow .12s; }
  .card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(16,24,40,.12); border-color: color-mix(in srgb, var(--a) 40%, var(--line)); }
  .card.stale { border-left-color: var(--warn); }
  .card .t { font-weight: 650; line-height: 1.3; } .card .a { color: var(--muted); font-size: 12.5px; }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .amt { font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; }
  .who { width: 26px; height: 26px; border-radius: 50%; background: color-mix(in srgb, var(--c, var(--a)) 16%, transparent); color: var(--c, var(--a)); font-size: 10.5px; font-weight: 700; display: grid; place-items: center; flex: none; }
  .badge { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--warn-soft); color: var(--warn); white-space: nowrap; }
  .prob { height: 5px; border-radius: 3px; background: var(--sunken); overflow: hidden; } .prob i { display: block; height: 100%; background: var(--c, var(--a)); border-radius: 3px; }
  .mv { min-height: 26px; font-size: 12px; padding: 1px 6px; color: var(--muted); background: transparent; border-color: transparent; } .card:hover .mv, .mv:focus { border-color: var(--line); }
  .col.won .sum b { color: var(--good); } .col.lost .sum b { color: var(--bad); }
  dialog { border: 1px solid var(--line); border-radius: 16px; background: var(--panel); color: var(--text); padding: 20px; max-width: 360px; }
  dialog::backdrop { background: rgba(0,0,0,.45); }
  dialog .ask { display: grid; gap: 12px; } dialog menu { display: flex; gap: 8px; justify-content: flex-end; margin: 0; padding: 0; }
  .primary { background: var(--a); color: #fff; border-color: var(--a); }
  .empty { color: var(--muted); padding: 24px; }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } }
  @media (prefers-reduced-motion: reduce) { .card { animation: none; transition: none; } }
`;

const JS = String.raw`
(function () {
  var LAYOUT = __LAYOUT__, ACT = __ACT__, FIELDS = __FIELDS__;
  var STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'], REASONS = ['Price', 'Timing', 'Competitor', 'No decision', 'Fit'];
  var S = { rows: [], rep: '', q: '', stale: false, busy: false };
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  var num = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
  var money = function (n) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // A date as "Dec 29" (the record gives MM/DD/YYYY or YYYY-MM-DD).
  function md(v) { var m = /(\d{4})-(\d\d)-(\d\d)|(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v || ''); if (!m) return v || ''; var mo = m[1] ? +m[2] : +m[4], d = m[1] ? +m[3] : +m[5]; return MON[mo - 1] + ' ' + d; }
  var moneyK = function (n) { var a = Math.abs(n); return a >= 1e4 ? '$' + (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : money(n); };
  var p2 = function (n) { return ('0' + n).slice(-2); };
  function stamp(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }
  var day = function (d) { return stamp(d).slice(0, 10); };
  var val = function (r, f) { var v = r.fieldData && r.fieldData[f]; return v == null ? '' : String(v); };
  // The title without the account it repeats ("Reporting suite, Northgate" under "Northgate Group").
  function dealTitle(r) { var t = val(r, 'Title'), a = val(r, 'Account Name'), i = t.lastIndexOf(', '); return i > 0 && a && a.toLowerCase().indexOf(t.slice(i + 2).toLowerCase()) === 0 ? t.slice(0, i) : t; }
  var hue = function (s) { var n = 0; for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 997; return n; };
  var initials = function (s) { return s.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join('') || '–'; };
  function say(text, bad) { var m = $('#msg'); m.textContent = text || ''; m.className = bad ? 'err' : ''; }

  function visible(r) {
    if (S.rep && val(r, 'Owner Name') !== S.rep) return false;
    if (S.stale && val(r, 'Stale') !== '1' && val(r, 'Stale').toLowerCase() !== 'yes') return false;
    var q = S.q.toLowerCase();
    return !q || (val(r, 'Title') + ' ' + val(r, 'Account Name')).toLowerCase().indexOf(q) >= 0;
  }
  var isStale = function (r) { var v = val(r, 'Stale').toLowerCase(); return v === '1' || v === 'yes' || v === 'true'; };
  // Closed deals show only for the last 90 days, so the Won and Lost columns stay about what just happened.
  function recent(r) { var c = val(r, 'Closed'); if (!c) return true; var m = /(\d{4})-(\d\d)-(\d\d)|(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(c); if (!m) return true; var d = m[1] ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(+m[6], +m[4] - 1, +m[5]); return Date.now() - d.getTime() < 90 * 864e5; }

  function render() {
    var rows = S.rows.filter(visible), open = rows.filter(function (r) { var s = val(r, 'Stage'); return s !== 'Won' && s !== 'Lost'; });
    $('#t-open').textContent = money(open.reduce(function (a, r) { return a + num(val(r, 'Amount')); }, 0));
    $('#t-weighted').textContent = money(open.reduce(function (a, r) { return a + num(val(r, 'Weighted Amount')); }, 0));
    $('#t-stale').textContent = String(open.filter(isStale).length);
    var board = $('#board'); board.replaceChildren();
    if (!S.rows.length) { board.append(el('p', { class: 'empty', text: 'No deals to show. If you expected some, this account may not be allowed to see any.' })); return; }
    // A deal whose stage is not on the list (a typo, a stray space) would vanish from every column, so it gets one of its own.
    var cols = STAGES.slice();
    if (rows.some(function (r) { return STAGES.indexOf(val(r, 'Stage')) < 0; })) cols.push('');
    cols.forEach(function (stage) {
      var mine = rows.filter(function (r) { var s = STAGES.indexOf(val(r, 'Stage')) < 0 ? '' : val(r, 'Stage'); return s === stage && (stage !== 'Won' && stage !== 'Lost' || recent(r)); });
      var total = mine.reduce(function (a, r) { return a + num(val(r, 'Amount')); }, 0), weighted = mine.reduce(function (a, r) { return a + num(val(r, 'Weighted Amount')); }, 0);
      var list = el('ul', { class: 'cards', 'data-stage': stage, 'aria-label': (stage || 'Needs a stage') + ' deals' });
      list.addEventListener('dragover', function (e) { e.preventDefault(); list.classList.add('over'); });
      list.addEventListener('dragleave', function () { list.classList.remove('over'); });
      list.addEventListener('drop', function (e) { e.preventDefault(); list.classList.remove('over'); var rec = byId(e.dataTransfer.getData('text/plain')); if (rec && stage) move(rec, stage); });
      mine.forEach(function (r) { list.append(card(r, stage)); });
      var sum = !stage ? [el('span', { text: money(total) }), el('span', { text: 'fix the stage' })] : stage === 'Won' || stage === 'Lost' ? [el('b', { text: money(total) }), el('span', { text: mine.length + ' in 90 days' })] : [el('span', { text: money(total) }), el('b', { text: moneyK(weighted) + ' wtd' })];
      board.append(el('section', { class: 'col ' + stage.toLowerCase(), 'aria-label': stage || 'Needs a stage' }, [el('h2', {}, [el('span', { text: stage || 'Needs a stage' }), el('span', { text: String(mine.length) })]), el('div', { class: 'sum' }, sum), list]));
    });
  }
  var byId = function (id) { return S.rows.filter(function (r) { return String(r.recordId) === id; })[0]; };
  function card(r, stage) {
    var pick = el('select', { class: 'mv', 'aria-label': 'Move ' + val(r, 'Title') + ' to', onchange: function (e) { if (e.target.value) move(r, e.target.value); } }, (stage ? [] : [el('option', { value: '', text: 'Choose a stage' })]).concat(STAGES.map(function (s) { return el('option', { value: s, text: s }); })));
    pick.value = stage;
    var days = num(val(r, 'Days In Stage')), p = Math.max(0, Math.min(100, num(val(r, 'Probability'))));
    var li = el('li', { class: 'card' + (isStale(r) ? ' stale' : ''), draggable: 'true', tabindex: '0', 'data-id': String(r.recordId) }, [
      el('div', { class: 't', text: dealTitle(r) || '(untitled)' }),
      el('div', { class: 'a', text: val(r, 'Account Name') }),
      el('div', { class: 'row' }, [el('span', { class: 'amt', text: money(num(val(r, 'Amount'))) }), el('span', { class: 'who', title: val(r, 'Owner Name'), style: '--c:var(--s' + [1, 7, 3, 2, 5, 4][hue(val(r, 'Owner Name')) % 6] + ')', text: initials(val(r, 'Owner Name')) })]),
      stage === 'Won' || stage === 'Lost' ? null : el('div', { class: 'prob', title: p + '% likely' }, [el('i', { style: 'width:' + p + '%' })]),
      el('div', { class: 'row' }, [el('span', { class: 'a', text: stage === 'Won' || stage === 'Lost' ? (val(r, 'Closed') ? 'Closed ' + md(val(r, 'Closed')) : '') : val(r, 'Expected Close') ? 'Closes ' + md(val(r, 'Expected Close')) : days ? days + ' days here' : '' }), isStale(r) ? el('span', { class: 'badge', text: days + 'd stale' }) : null]),
      pick
    ]);
    li.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', String(r.recordId)); e.dataTransfer.effectAllowed = 'move'; });
    return li;
  }

  function askReason() {
    return new Promise(function (done) {
      var dlg = $('#reason'), sel = $('#reason-pick');
      sel.replaceChildren.apply(sel, REASONS.map(function (x) { return el('option', { value: x, text: x }); }));
      dlg.addEventListener('close', function once() { dlg.removeEventListener('close', once); done(dlg.returnValue === 'ok' ? sel.value : null); });
      dlg.returnValue = ''; dlg.showModal();
    });
  }
  async function move(rec, stage) {
    var from = val(rec, 'Stage');
    if (from === stage || S.busy) { render(); return; }
    S.busy = true;
    try {
      var data = { Stage: stage, 'Stage Changed': stamp(new Date()) };
      if (stage === 'Lost') { var why = await askReason(); if (!why) { render(); return; } data['Lost Reason'] = why; }
      if (stage === 'Won' || stage === 'Lost') data.Closed = day(new Date()); else if (from === 'Won' || from === 'Lost') { data.Closed = ''; data['Lost Reason'] = ''; }
      say('Moving ' + val(rec, 'Title') + ' to ' + stage + '…');
      await tabularius.update(LAYOUT, rec.recordId, data);
      var note = { 'Deal ID': val(rec, 'ID') || '', Type: 'Note', Subject: 'Stage changed from ' + from + ' to ' + stage, When: stamp(new Date()), Done: 'Yes' };
      if (val(rec, 'Account ID')) note['Account ID'] = val(rec, 'Account ID');
      // The note is a courtesy: a rep who may not add activities still moves the deal.
      try { await tabularius.create(ACT, note); } catch (e) { /* the move is what matters */ }
      say('Moved ' + val(rec, 'Title') + ' to ' + stage + '.');
    } catch (e) { say(e && e.message || 'The move was refused.', true); }
    finally { S.busy = false; load(); }
  }

  function load() {
    return tabularius.records(LAYOUT, { limit: 1000 }).then(function (r) {
      S.rows = r.data || [];
      var reps = {}; S.rows.forEach(function (x) { var o = val(x, 'Owner Name'); if (o) reps[o] = 1; });
      var sel = $('#rep'), keep = S.rep; sel.replaceChildren(el('option', { value: '', text: 'Everyone' }));
      Object.keys(reps).sort().forEach(function (n) { sel.append(el('option', { value: n, text: n })); });
      sel.value = keep; if (sel.value !== keep) S.rep = '';
      render();
    }, function (e) { say(e && e.message || 'The deals could not be read.', true); });
  }
  function start() {
    $('#rep').addEventListener('change', function (e) { S.rep = e.target.value; render(); });
    $('#q').addEventListener('input', function (e) { S.q = e.target.value; render(); });
    $('#stale').addEventListener('change', function (e) { S.stale = e.target.checked; render(); });
    $('#reason-cancel').addEventListener('click', function () { $('#reason').close('cancel'); });
    $('#reason-ok').addEventListener('click', function () { $('#reason').close('ok'); });
    tabularius.valueList('Stage').then(function (L) { if (L && L.values && L.values.length >= 2) STAGES = L.values.slice(); }, function () {}).then(function () {
      return tabularius.valueList('Lost reason').then(function (L) { if (L && L.values && L.values.length) REASONS = L.values.slice(); }, function () {});
    }).then(load);
    tabularius.on('refresh', function () { if (!S.busy) load(); });
  }
  if (!window.tabularius) $('#board').append(el('p', { class: 'empty', text: 'This board shows the deals of the Showcase file when it is opened in Tabularius.' })); else start();
})();
`;

/** The board as a whole HTML document. */
export function pipelineBoardPage(): string {
  const js = JS.replace('__LAYOUT__', JSON.stringify(BOARD_LAYOUT)).replace('__ACT__', JSON.stringify(BOARD_ACTIVITY_LAYOUT)).replace('__FIELDS__', JSON.stringify(BOARD_FIELDS));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pipeline board</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <div><div class="eyebrow">Sales</div><h1>Pipeline</h1></div>
  <div class="tiles">
    <div class="tile"><span>Open pipeline</span><b id="t-open">–</b></div>
    <div class="tile"><span>Weighted forecast</span><b id="t-weighted">–</b></div>
    <div class="tile warn"><span>Stale deals</span><b id="t-stale">–</b></div>
  </div>
  <div class="bar">
    <label>Rep <select id="rep"><option value="">Everyone</option></select></label>
    <input id="q" type="search" placeholder="Search deals or accounts" aria-label="Search deals or accounts">
    <label><input id="stale" type="checkbox"> Stale only</label>
    <span id="msg" role="status" aria-live="polite"></span>
  </div>
</header>
<main id="board" class="board"></main>
<dialog id="reason" aria-labelledby="reason-h">
  <div class="ask">
    <strong id="reason-h">Why was it lost?</strong>
    <select id="reason-pick" aria-label="Lost reason"></select>
    <menu><button type="button" id="reason-cancel">Cancel</button><button type="button" id="reason-ok" class="primary">Mark lost</button></menu>
  </div>
</dialog>
<script>${js}</script>
</body>
</html>
`;
}
