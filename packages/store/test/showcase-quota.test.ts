// The showcase sample's reps have a realistic quota against won deals in the current calendar quarter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SHOWCASE_LISTS, showcaseSample } from '../src/showcase-data.ts';

const DATES = ['2026-11-03', '2026-12-20', '2027-01-01', '2027-01-03', '2027-02-14', '2027-03-31', '2027-08-09'];
const SEEDS = [20261101, 7, 99, 424242];

function attainments(now: Date, seed: number) {
  const sample = showcaseSample(now, seed);
  const rows = (table: string) => sample.find((g) => g.table === table)!.rows;
  const since = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const allWon = rows('Deals').filter((d) => d.Stage === 'Won');
  for (const deal of allWon) assert.ok(String(deal.Closed) <= today, `future won deal on ${today}`);
  return rows('Reps').map((rep, i) => {
    const won = allWon.filter((d) => Number(d['Owner ID']) === i + 1);
    const quarter = won.filter((d) => String(d.Closed) >= since);
    const wonQuarter = quarter.reduce((a, d) => a + Number(d.Amount), 0);
    return { name: String(rep.Name), quota: Number(rep['Quarterly Quota']), wonCount: won.length, quarterCount: quarter.length, wonQuarter, deals: rows('Deals').filter((d) => Number(d['Owner ID']) === i + 1).length };
  });
}

test('every rep has a realistic calendar-quarter quota and won deals, on any day and seed', () => {
  for (const date of DATES) for (const seed of SEEDS) {
    const reps = attainments(new Date(`${date}T12:00:00Z`), seed);
    assert.equal(reps.length, 6);
    for (const r of reps) {
      const where = `${r.name} on ${date}, seed ${seed}`;
      assert.ok(r.quota % 5000 === 0 && r.quota >= 20_000 && r.quota <= 200_000, `${where}: quota ${r.quota}`);
      assert.ok(r.wonCount >= 4, `${where}: ${r.wonCount} won deals`);
      assert.equal(r.quarterCount, 3, `${where}: ${r.quarterCount} won this quarter; all other wins must predate it`);
      assert.ok(r.quota > 0, `${where}: zero quota`);
      const attainment = r.wonQuarter / r.quota;
      assert.ok(attainment >= 0.35 && attainment <= 0.70, `${where}: attainment ${attainment.toFixed(2)}`);
      assert.ok(r.deals >= 22 && r.deals <= 25, `${where}: ${r.deals} deals`);
    }
    const team = reps.reduce((a, r) => a + r.wonQuarter, 0) / reps.reduce((a, r) => a + r.quota, 0);
    assert.ok(team >= 0.35 && team <= 0.70, `team attainment ${team.toFixed(2)} on ${date}, seed ${seed}`);
    // Not every rep is at the same level: a leaderboard with one value is dull.
    const levels = reps.map((r) => r.wonQuarter / r.quota);
    assert.ok(Math.max(...levels) - Math.min(...levels) >= 0.2, `spread ${date}, seed ${seed}`);
  }
});

test('the seed and the day still decide the data: the same inputs repeat, another seed differs', () => {
  const now = new Date('2026-11-03T12:00:00Z');
  assert.deepEqual(attainments(now, 7), attainments(now, 7));
  assert.notDeepEqual(attainments(now, 7), attainments(now, 99));
});

test('quarterly losses and older revenue stay credible across dates and seeds', () => {
  for (const date of DATES) for (const seed of SEEDS) {
    const now = new Date(`${date}T12:00:00Z`);
    const sample = showcaseSample(now, seed);
    const deals = sample.find((g) => g.table === 'Deals')!.rows;
    const since = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)).toISOString().slice(0, 10);
    const won = deals.filter((d) => d.Stage === 'Won' && String(d.Closed) >= since);
    const lost = deals.filter((d) => d.Stage === 'Lost');
    const quarterLost = lost.filter((d) => String(d.Closed) >= since);
    assert.equal(won.length, 18);
    assert.equal(quarterLost.length, 6);
    assert.equal(won.length / (won.length + quarterLost.length), 0.75, `${date}/${seed}: quarter win rate`);
    for (const deal of quarterLost) assert.ok(SHOWCASE_LISTS.source.includes(String(deal.Source) as typeof SHOWCASE_LISTS.source[number]), `${date}/${seed}: invalid quarter-loss source`);
    for (let owner = 1; owner <= 6; owner++) {
      const losses = quarterLost.filter((d) => d['Owner ID'] === owner).length;
      assert.equal(losses, 1, `${date}/${seed}: rep ${owner} has ${losses} losses`);
      const wins = won.filter((d) => d['Owner ID'] === owner).length;
      assert.ok(wins / (wins + losses) > 0 && wins / (wins + losses) < 1);
    }
    for (const deal of deals.filter((d) => d.Stage === 'Won' || d.Stage === 'Lost')) {
      assert.ok(String(deal.Closed) <= date, `${date}/${seed}: future loss`);
      assert.ok(String(deal.Opened) < String(deal.Closed), `${date}/${seed}: close before opening`);
      assert.ok(String(deal['Expected Close']) <= String(deal.Closed), `${date}/${seed}: expected close after close`);
      assert.equal(String(deal['Stage Changed']).slice(0, 10), deal.Closed);
    }
    const older = deals.filter((d) => d.Stage === 'Won' && String(d.Closed) < since);
    const monthly = new Map<string, number>();
    for (const deal of older) monthly.set(String(deal.Closed).slice(0, 7), (monthly.get(String(deal.Closed).slice(0, 7)) ?? 0) + Number(deal.Amount));
    assert.ok(monthly.size >= 5, `${date}/${seed}: ${monthly.size} older months`);
    for (const [month, amount] of monthly) {
      const others = [...monthly.entries()].filter(([m]) => m !== month).map(([, n]) => n).sort((a, b) => a - b);
      const mid = Math.floor(others.length / 2);
      const median = others.length % 2 ? others[mid] : (others[mid - 1] + others[mid]) / 2;
      assert.ok(amount <= 2.5 * median, `${date}/${seed}: ${month} spikes`);
    }
  }
});

test('every dashboard period has a supported win rate and the twelve revenue bars stay even', () => {
  for (const date of DATES) for (const seed of SEEDS) {
    const deals = showcaseSample(new Date(`${date}T12:00:00Z`), seed).find((g) => g.table === 'Deals')!.rows;
    const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7));
    const first = (month: number) => new Date(Date.UTC(y, month, 1)).toISOString().slice(0, 10);
    // sales-dashboard.ts:12-13, 52-54, 91-93; dashboards.ts:163-173. Last 30 days includes today and 29 earlier days.
    const periods = [
      ['this quarter', first(Math.floor((m - 1) / 3) * 3), 'quarter'],
      ['this month', first(m - 1), 'short'],
      ['last 30 days', new Date(Date.parse(date) - 29 * 86_400_000).toISOString().slice(0, 10), 'short'],
      ['year to date', `${y}-01-01`, 'wide'],
      ['all time', '', 'wide'],
      ['trailing 12 months', new Date(Date.parse(date) - 365 * 86_400_000).toISOString().slice(0, 10), 'wide'],
    ] as const;
    for (const [name, since, band] of periods) {
      const won = deals.filter((d) => d.Stage === 'Won' && String(d.Closed) >= since).length;
      const lost = deals.filter((d) => d.Stage === 'Lost' && String(d.Closed) >= since).length;
      // The dashboard computes w / (w + l), then renders a non-finite result as '–' (shared.ts:125).
      const rate = won / (won + lost);
      if (!won) { assert.equal(lost, 0, `${date}/${seed} ${name}: loss without win`); assert.ok(Number.isNaN(rate)); continue; }
      assert.ok(lost > 0, `${date}/${seed} ${name}: 100% from ${won} wins`);
      const [low, high] = band === 'short' ? [0.5, 0.95] : band === 'quarter' ? [0.75, 0.75] : [0.7, 0.85];
      assert.ok(rate >= low && rate <= high, `${date}/${seed} ${name}: ${won}/${won + lost} = ${rate}`);
    }
    const month = (offset: number) => new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 7);
    const bars = Array.from({ length: 12 }, (_, i) => {
      const key = month(i - 11);
      const wins = deals.filter((d) => d.Stage === 'Won' && String(d.Closed).startsWith(key));
      return { key, count: wins.length, amount: wins.reduce((sum, d) => sum + Number(d.Amount), 0) };
    });
    for (const bar of bars) {
      if (bar.key !== month(0)) assert.ok(bar.count >= 4, `${date}/${seed} ${bar.key}: ${bar.count} wins`);
      const others = bars.filter((b) => b !== bar).map((b) => b.amount).sort((a, b) => a - b);
      assert.ok(bar.amount <= 2.5 * others[5], `${date}/${seed} ${bar.key}: ${bar.amount} > 2.5 × ${others[5]}`);
    }
    const quarter = first(Math.floor((m - 1) / 3) * 3);
    const wonMonths = new Map<string, number>();
    const lostMonths = new Map<string, number>();
    for (const deal of deals.filter((d) => String(d.Closed) >= quarter)) {
      const key = String(deal.Closed).slice(0, 7), map = deal.Stage === 'Won' ? wonMonths : deal.Stage === 'Lost' ? lostMonths : null;
      if (map) map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const [key, wins] of wonMonths) {
      assert.ok((lostMonths.get(key) ?? 0) >= 1, `${date}/${seed} ${key}: no quarter loss`);
      if (wins === 1) assert.equal(lostMonths.get(key), 1);
    }
    for (const key of lostMonths.keys()) assert.ok(wonMonths.has(key), `${date}/${seed} ${key}: loss without win`);
  }
});

test('current-quarter won amounts, quotas and deal owners match the base fingerprint', () => {
  const sample = showcaseSample(new Date('2026-11-03T12:00:00Z'));
  const rows = (table: string) => sample.find((g) => g.table === table)!.rows;
  const deals = rows('Deals');
  const quarterWon = deals.filter((d) => d.Stage === 'Won' && String(d.Closed) >= '2026-10-01')
    .map((d) => [d['Owner ID'], d.Amount]).sort((a, b) => Number(a[0]) - Number(b[0]) || Number(a[1]) - Number(b[1]));
  const fingerprint = createHash('sha256').update(JSON.stringify([quarterWon, rows('Reps').map((r) => r['Quarterly Quota']), deals.slice(0, 70).map((d) => d['Owner ID'])])).digest('hex');
  assert.equal(fingerprint, '41ee2bd7987ca9c628c9ffcaa739fad53950406e817e1d4b9acd0fe3e2e6510c');
});

test('original sample rows keep the base fingerprints outside the quarter-loss dates', () => {
  const sample = showcaseSample(new Date('2026-11-03T12:00:00Z'));
  const expected: Record<string, string> = {
    Reps: '2e6ad62858086a48e2746179921d2f30be412cb82e860a27641ed1502e09d412',
    Accounts: '3ce8b7fe5025bb74e2fa4cf44e60b11e4a92ac636ef0e05c229e81f24fae7d48',
    Contacts: 'f53eb82d53ebf096eef5b5531c313f4767b132b3eb3342368a2707d54a3f3cbc',
    Products: 'f68112a828f0392902e72f5d57b578140226cf8c0dcd20de1725012022c220f6',
    'Deal Lines': '7c96944c2b2e10d577087a2606214ce65bc7f623dcc545e08440d73ec69eaa83',
    Activities: '36a3239093de1c3934fed01314c45309cce14c6dca2a89d1033ac7f5aa67004f',
    'Email Log': '3b88a2183ce0d3560f27b4a7391b6edaa3693874e8cddce59e5f80c0d737fa35',
  };
  for (const group of sample) if (group.table !== 'Deals') {
    const original = group.table === 'Deal Lines' ? group.rows.slice(0, 150) : group.rows;
    assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'), expected[group.table], group.table);
  }
  const originals = sample.find((g) => g.table === 'Deals')!.rows.slice(0, 70).map((deal) => {
    const row = { ...deal };
    if (row.Stage === 'Lost') { delete row.Closed; delete row['Expected Close']; delete row['Stage Changed']; }
    return row;
  });
  assert.equal(createHash('sha256').update(JSON.stringify(originals)).digest('hex'), '1fc7eace716a62dfd261c16c02e91e090e7bf6c005f54b308649247a1f36810e');
  const dated = sample.find((g) => g.table === 'Deals')!.rows.slice(0, 70).map((deal, i) => {
    const row = { ...deal };
    if ([4, 7, 8, 9, 11, 30].includes(i + 1)) { delete row.Closed; delete row['Expected Close']; delete row['Stage Changed']; }
    return row;
  });
  assert.equal(createHash('sha256').update(JSON.stringify(dated)).digest('hex'), '78a0e4f370779ed950d57a1cda12988e0cbc194da9bdc283cdac9f7bade2d83c');
});

test('a loss closed on the first instant of a quarter has a consistent stage time', () => {
  const now = new Date('2027-01-01T00:00:00Z');
  const deals = showcaseSample(now).find((g) => g.table === 'Deals')!.rows;
  const quarterLost = deals.filter((d) => d.Stage === 'Lost' && d.Closed === '2027-01-01');
  assert.equal(quarterLost.length, 6);
  for (const deal of quarterLost) {
    assert.equal(String(deal['Stage Changed']).slice(0, 10), deal.Closed);
    assert.ok(String(deal['Stage Changed']) <= '2027-01-01T00:00:00');
    assert.ok(String(deal.Opened) < String(deal.Closed));
  }
});
