// An OData $filter sees a time field as the client sees it: Edm.TimeOfDay holds one day, so a duration (negative, or 100
// hours or more) is null in the JSON and null in the filter. Before, the filter compared the stored text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, Store } from '../../store/src/index.ts';
import { filterSql, serve } from '../src/index.ts';

test('filterSql reads a time property through the OData time value', () => {
  const props = [{ name: 'Start', field: 'Start', type: 'time', edm: 'Edm.TimeOfDay', queryable: true, writable: true }];
  const f = filterSql('Start lt 12:00:00', props);
  assert.match(f.where, /fm_odata_time\("Start"\)/);
  assert.deepEqual(f.params, ['12:00:00']);
});

test('a duration is null in an OData time filter, as it is in the JSON', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tabularius-odata-time-'));
  const path = join(dir, 'Synthetic.openhbam.sqlite');
  createStore(path);
  const setup = new Store(path, 'Synthetic');
  try {
    setup.applyDesign([{ op: 'createTable', name: 'Shift', fields: [{ name: 'Name' }, { name: 'Start', type: 'time' }] }]);
    for (const [Name, Start] of [['A', '9:00:00'], ['B', '100:00:00'], ['C', '-1:00:00'], ['D', '10:00:00'], ['E', '23:59:59.5'], ['F', '']]) setup.create('Shift', { Name, Start });
    const full = setup.privilegeSets().find((p) => p.id === 1)!;
    setup.savePrivilegeSet({ ...full, extendedPrivileges: [...full.extendedPrivileges, 'fmodata'] });
    setup.setPassword('Admin', 'pw', full.name);
  } finally { setup.close(); }
  const hosted = await serve({ dir, port: 0, watch: false, log: () => {} });
  t.after(async () => {
    await new Promise<void>((resolve) => hosted.server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  });
  const root = `${hosted.url}/fmi/odata/v4/Synthetic/Shift`;
  const headers = { authorization: `Basic ${btoa('Admin:pw')}` };
  const names = async (filter: string): Promise<string[]> => {
    const res = await fetch(`${root}?$select=Name&$orderby=Name&$filter=${encodeURIComponent(filter)}`, { headers });
    assert.equal(res.status, 200, filter);
    return ((await res.json()) as { value: { Name: string }[] }).value.map((r) => r.Name);
  };
  const shown = await fetch(`${root}?$select=Name,Start&$orderby=Name`, { headers });
  assert.deepEqual(((await shown.json()) as { value: { Name: string; Start: string | null }[] }).value.map((r) => [r.Name, r.Start]),
    [['A', '09:00:00'], ['B', null], ['C', null], ['D', '10:00:00'], ['E', '23:59:59.5'], ['F', null]]);

  assert.deepEqual(await names('Start lt 12:00:00'), ['A', 'D']);
  assert.deepEqual(await names('Start le 10:00:00'), ['A', 'D']);
  assert.deepEqual(await names('Start gt 09:00:00'), ['D', 'E']);
  assert.deepEqual(await names('Start ge 10:00:00'), ['D', 'E']);
  assert.deepEqual(await names('Start ne 10:00:00'), ['A', 'E']);
  assert.deepEqual(await names('Start eq null'), ['B', 'C', 'F']);
  assert.deepEqual(await names('Start ne null'), ['A', 'D', 'E']);
  assert.deepEqual(await names('Start eq 10:00:00'), ['D']);
  assert.deepEqual(await names('hour(Start) eq 9'), ['A']);
});
