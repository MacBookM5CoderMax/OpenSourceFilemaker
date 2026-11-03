// The showcase sample's reps have a realistic quota against won deals in the current calendar quarter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { showcaseSample } from '../src/showcase-data.ts';

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
      assert.ok(r.deals >= 10 && r.deals <= 13, `${where}: ${r.deals} deals`);
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
    assert.ok(won.length / (won.length + quarterLost.length) >= 0.70 && won.length / (won.length + quarterLost.length) <= 0.85, `${date}/${seed}: win rate`);
    for (let owner = 1; owner <= 6; owner++) {
      const losses = quarterLost.filter((d) => d['Owner ID'] === owner).length;
      assert.ok(losses >= 1 && losses <= 2, `${date}/${seed}: rep ${owner} has ${losses} losses`);
      const wins = won.filter((d) => d['Owner ID'] === owner).length;
      assert.ok(wins / (wins + losses) > 0 && wins / (wins + losses) < 1);
    }
    for (const deal of lost) {
      assert.ok(String(deal.Closed) <= date, `${date}/${seed}: future loss`);
      assert.ok(String(deal.Opened) < String(deal.Closed), `${date}/${seed}: loss before opening`);
      assert.ok(String(deal['Expected Close']) <= String(deal.Closed), `${date}/${seed}: expected close after loss`);
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

test('current-quarter won amounts, quotas and deal owners match the base fingerprint', () => {
  const sample = showcaseSample(new Date('2026-11-03T12:00:00Z'));
  const rows = (table: string) => sample.find((g) => g.table === table)!.rows;
  const deals = rows('Deals');
  const quarterWon = deals.filter((d) => d.Stage === 'Won' && String(d.Closed) >= '2026-10-01')
    .map((d) => [d['Owner ID'], d.Amount]).sort((a, b) => Number(a[0]) - Number(b[0]) || Number(a[1]) - Number(b[1]));
  const fingerprint = createHash('sha256').update(JSON.stringify([quarterWon, rows('Reps').map((r) => r['Quarterly Quota']), deals.map((d) => d['Owner ID'])])).digest('hex');
  assert.equal(fingerprint, '41ee2bd7987ca9c628c9ffcaa739fad53950406e817e1d4b9acd0fe3e2e6510c');
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
