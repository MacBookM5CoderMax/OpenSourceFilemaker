// The showcase sample's reps have a realistic quota: every rep has won deals, and what they won in the last 90 days
// sits near their quarterly quota, on any day and with any seed (the Today quota ring and the leaderboard read these).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showcaseSample } from '../src/showcase-data.ts';

const DAY = 86_400_000;
const DATES = ['2026-11-03', '2026-12-20', '2027-02-14', '2027-08-09'];
const SEEDS = [20261101, 7, 99, 424242];

function attainments(now: Date, seed: number) {
  const sample = showcaseSample(now, seed);
  const rows = (table: string) => sample.find((g) => g.table === table)!.rows;
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 90 * DAY).toISOString().slice(0, 10);
  return rows('Reps').map((rep, i) => {
    const won = rows('Deals').filter((d) => d.Stage === 'Won' && Number(d['Owner ID']) === i + 1);
    const recent = won.filter((d) => String(d.Closed) >= since);
    const wonRecent = recent.reduce((a, d) => a + Number(d.Amount), 0);
    return { name: String(rep.Name), quota: Number(rep['Quarterly Quota']), wonCount: won.length, recentCount: recent.length, wonRecent, deals: rows('Deals').filter((d) => Number(d['Owner ID']) === i + 1).length };
  });
}

test('every rep has a realistic quota and recent won deals, on any day and seed', () => {
  for (const date of DATES) for (const seed of SEEDS) {
    const reps = attainments(new Date(`${date}T12:00:00Z`), seed);
    assert.equal(reps.length, 6);
    for (const r of reps) {
      const where = `${r.name} on ${date}, seed ${seed}`;
      assert.ok(r.quota % 5000 === 0 && r.quota >= 20_000 && r.quota <= 200_000, `${where}: quota ${r.quota}`);
      assert.ok(r.wonCount >= 4, `${where}: ${r.wonCount} won deals`);
      assert.ok(r.recentCount >= 3, `${where}: ${r.recentCount} won in the last 90 days`);
      const attainment = r.wonRecent / r.quota;
      assert.ok(attainment >= 0.5 && attainment <= 1.3, `${where}: attainment ${attainment.toFixed(2)}`);
      assert.ok(r.deals >= 10 && r.deals <= 13, `${where}: ${r.deals} deals`);
    }
    const team = reps.reduce((a, r) => a + r.wonRecent, 0) / reps.reduce((a, r) => a + r.quota, 0);
    assert.ok(team >= 0.7 && team <= 1.1, `team attainment ${team.toFixed(2)} on ${date}, seed ${seed}`);
    // Not every rep is at the same level: a leaderboard with one value is dull.
    const levels = reps.map((r) => r.wonRecent / r.quota);
    assert.ok(Math.max(...levels) - Math.min(...levels) >= 0.2, `spread ${date}, seed ${seed}`);
  }
});

test('the seed and the day still decide the data: the same inputs repeat, another seed differs', () => {
  const now = new Date('2026-11-03T12:00:00Z');
  assert.deepEqual(attainments(now, 7), attainments(now, 7));
  assert.notDeepEqual(attainments(now, 7), attainments(now, 99));
});
