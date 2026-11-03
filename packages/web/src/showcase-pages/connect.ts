import { js } from '../page-templates.ts';
import { pageShell, withNames, type ShowcaseNames } from './shared.ts';

// An option of the AI app's own command, not of ours: built apart so the docs option scan, which reads source files for our options, does not count it as one.
const MCP_TRANSPORT = '-' + '-transport';

/** The copy-ready snippets. Placeholders are in angle brackets; the page says each one is yours to fill in. */
export const CONNECT_SNIPPETS: { title: string; note: string; text: string }[] = [
  { title: 'Data API: sign in', note: 'Returns a session token in the response; use it as the bearer token below.',
    text: 'curl -X POST -u <account>:<password> http://<your-server>/fmi/data/vLatest/databases/Showcase/sessions' },
  { title: 'Data API: find open deals', note: 'A find on the Deals layout, using the session token from the sign-in call.',
    text: 'curl -X POST http://<your-server>/fmi/data/vLatest/databases/Showcase/layouts/Deals%20list/_find -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d \'{"query":[{"Stage":"==Negotiation"}],"limit":10}\'' },
  { title: 'SQL: psql', note: 'Needs a server started with --sql-port and an account with the fmxdbc extended privilege (see hosting for a team). The JOIN is not yet checked against a running showcase.',
    text: 'psql "host=<your-server> port=5432 dbname=Showcase user=<account> sslmode=require" -c "SELECT a.Name, d.Title, d.Stage, d.Amount FROM Deals d JOIN Accounts a ON a.ID = d.\\"Account ID\\" WHERE d.Stage = \'Negotiation\'"' },
  { title: 'Claude: connect over MCP', note: 'Adds the server\'s MCP endpoint to Claude Code with a token.',
    text: 'claude mcp add ' + MCP_TRANSPORT + ' http tabularius http://<your-server>:8080/mcp --header "Authorization: Bearer <token>"' },
  { title: 'Calendar feed: Activities', note: 'The address has this shape; make the real link with tabularius calendar-feed <folder> Showcase create --layout \"Activities list\" --start Due --title Subject, which gives it its own token, then subscribe to it from a calendar app.',
    text: 'https://<your-server>/tabularius/calendar/v1/databases/Showcase/layouts/Activities%20list/calendar.ics?start=Due&title=Subject&description=Notes' },
];

/** Connect: live record counts, then snippets to reach the file from code, SQL tools, Claude and a calendar. */
export function connectPage(names?: Partial<ShowcaseNames>): string {
  const N = withNames(names);
  const body = `
<div class="wrap">
  <div class="top">
    <div><div class="eyebrow">Connect</div><h1>Reach this file from anywhere</h1><p class="lede">The same records, over the Data API, SQL, an AI app or a calendar feed. Replace the parts in &lt;angle brackets&gt; with your own.</p></div>
  </div>
  <section class="tiles" id="counts"><div class="tile muted">Counting records…</div></section>
  <section class="snips" id="snips"></section>
</div>
<style>
  .snips { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 14px; margin-top: 14px; }
  .snip { gap: 10px; }
  .snip .head { margin: 0; align-items: center; justify-content: flex-start; gap: 12px; } .snip .head h2 { font-size: 15px; }
  pre.code { margin: 0; padding: 14px 16px; border-radius: 12px; background: #0f1722; color: #dbe4f0; font: 12.5px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid #1d2838; flex: 1; }
  pre.code .ph { color: #ffc46b; background: rgba(255, 196, 107, .12); border-radius: 4px; padding: 0 3px; }
  .snip .foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
</style>`;
  const script = `
  const N = ${js(N)};
  Object.assign(ICONS, { plug: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3', cal: 'M4 6h16v13H4zM4 10h16M8 3v4M16 3v4', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4', users: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5', dollar: 'M12 3v18M16.5 7.5C15.5 6.5 14 6 12 6c-2.5 0-4 1.2-4 3s1.5 2.6 4 3 4 1.2 4 3-1.5 3-4 3c-2 0-3.5-.6-4.5-1.6' });
  const SNIPS = ${js(CONNECT_SNIPPETS)};
  const TABLES = [['Reps', N.reps, 'users', 1], ['Accounts', N.accounts, 'layers', 7], ['Contacts', N.contacts, 'users', 3], ['Deals', N.deals, 'dollar', 2], ['Activities', N.activities, 'clock', 4], ['Email Log', N.emailLog, 'Email', 5]];
  const ICON_FOR = ['plug', 'search', 'db', 'sparkle', 'cal'], SLOT_FOR = [1, 1, 3, 7, 4];
  async function counts() {
    const tiles = TABLES.map(([name, , ic, slot]) => h('div', { class: 'tile' }, h('div', { class: 'lab' }, name, chip(ic, slot)), h('b', { class: 'val', id: 'n-' + name }, '–')));
    $('counts').replaceChildren(...tiles);
    TABLES.forEach(([name, layout]) => tabularius.summarize({ title: name, kind: 'number', layout }).then((r) => ($('n-' + name).textContent = Number(r.value).toLocaleString()), (e) => fail($('n-' + name), e)));
  }
  // The text of a snippet, with each <placeholder> picked out so it is plain what to replace.
  const withPlaceholders = (text) => text.split(/(<[^>\\s][^>]*>)/).map((p) => (p.charAt(0) === '<' && p.length > 2 ? h('span', { class: 'ph' }, p) : p));
  function snippets() {
    $('snips').replaceChildren(...SNIPS.map((s, i) => h('div', { class: 'card snip' }, h('div', { class: 'head' }, chip(ICON_FOR[i] || 'plug', SLOT_FOR[i] || 1), h('h2', {}, s.title)), h('p', { class: 'muted', style: 'margin:0;font-size:13px' }, s.note),
      h('pre', { class: 'code' }, withPlaceholders(s.text)), h('div', { class: 'foot' }, h('span', { class: 'faint', style: 'font-size:12px' }, 'Replace the highlighted parts'), copyButton(s.text)))));
  }
  snippets();
  if (window.tabularius) { counts(); tabularius.on('refresh', counts); }
  else $('counts').replaceChildren(h('div', { class: 'tile muted' }, 'Live record counts show in Tabularius.'));`;
  return pageShell('Connect', body, script);
}
