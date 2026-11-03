// The showcase sample's reps have a realistic quota against won deals in the current calendar quarter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
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
