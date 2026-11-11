/* WHY WE MISSED TARGET, worked by the app's code (docs/DATA-CONNECTIONS.md §4) — every figure checked by hand below; health in words;
 * the production source asked as any source; and through the capability on a fake IndexedDB, rows brought in twice kept once. */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { delivered, gapSaid, healthSaid, readGap } from '../production';
import { mapRows } from '../ingestCore';
import { productionDataset } from '../../data/datasets';
import { runTable } from '../../data/table';
import type { DataConnectionRow } from '../../../db/rows';

const NOW = Date.parse('2026-11-11T07:00:00Z');
const conn: DataConnectionRow = { id: 'c1', name: 'MES shift totals', kind: 'push', status: 'active', system: 'the MES', mapping: {}, lineMap: {}, scheduleMinutes: 60, rowsTotal: 3, lastSuccessAt: NOW, lastRows: 3, lastRefused: 0, lastRunAt: NOW, createdAt: NOW, updatedAt: NOW };
const L2 = { id: 'L2', name: 'Line 2', crew: 4, labourRatePerHour: 15, marginPerPack: 0.35 };
const L7 = { id: 'L7', name: 'Line 7' };
/* By hand:
 *   Line 2 Days    target 45,000, made 38,000, rejects 400 → delivered 37,600 → 7,400 short; 50 min Film break
 *   Line 2 Nights  target 45,000, good 46,000 (made 46,500) → on target (1,000 over); 20 min Jam
 *   Line 7 Days    target 30,000, made 29,000, no rejects sent → delivered 29,000 (made) → 1,000 short; 15 min, no reason
 *   Totals: target 120,000, delivered 112,600, short 8,400, net 7,400 (Nights' 1,000 over)
 *   Line 2 money: 7,400 × £0.35 = £2,590.00 of contribution; 70 min ÷ 60 × 4 people × £15 = £70.00 of idle labour — apart
 *   Line 7: no margin, no crew — both named, nothing estimated */
const rows = mapRows([
  { id: 'D-1', line: 'Line 2', day: '2026-11-10', shift: 'Days', target: 45000, output: 38000, rejects: 400, downtime_minutes: 50, downtime_reason: 'Film break' },
  { id: 'N-1', line: 'Line 2', day: '2026-11-10', shift: 'Nights', target: 45000, output: 46500, good: 46000, downtime_minutes: 20, downtime_reason: 'Jam' },
  { id: 'D-7', line: 'Line 7', day: '2026-11-10', shift: 'Days', target: 30000, output: 29000, downtime_minutes: 15 },
  { id: 'D-0', line: 'Line 2', day: '2026-11-09', shift: 'Days', target: 45000, output: 45000, rejects: 0 },
], { id: 'c1' }, NOW, [L2, L7]).records;

describe('delivered', () => {
  it('good as sent; else made less rejects; else made', () => {
    expect(delivered({ good: 5, output: 9 })).toEqual({ units: 5, basis: 'good' });
    expect(delivered({ output: 9, rejects: 2 })).toEqual({ units: 7, basis: 'made less rejects' });
    expect(delivered({ output: 9 })).toEqual({ units: 9, basis: 'made' });
    expect(delivered({})).toBeUndefined();
  });
});

describe('the gap, by hand', () => {
  const g = readGap(rows, [L2, L7], [conn], '2026-11-10', '2026-11-10');
  it('totals and each line', () => {
    expect(g.totals).toEqual({ target: 120000, delivered: 112600, short: 8400, net: 7400, downtime: 85, rows: 3 });
    const l2 = g.lines.find(l => l.lineId === 'L2')!;
    expect(l2).toMatchObject({ target: 90000, delivered: 83600, short: 7400, net: 6400, downtime: 70 });
    expect(l2.reasons).toEqual([{ reason: 'Film break', minutes: 50, rows: 1 }, { reason: 'Jam', minutes: 20, rows: 1 }]);
    expect(l2.money).toEqual({ contribution: 2590, perPack: 0.35, idleLabour: 70, perHour: 60, missing: [] });
    const l7 = g.lines.find(l => l.lineId === 'L7')!;
    expect(l7.money.contribution).toBeUndefined();
    expect(l7.money.missing).toEqual(['what a pack contributes on Line 7 (its margin a pack, on Set up the line)', 'the people on Line 7 and their £ an hour (on Set up the line)']);
    expect(g.shortRows.map(s => [s.id, s.short])).toEqual([['c1:D-1', 7400], ['c1:D-7', 1000]]);
  });
  it('in words — system data, the connection named, money apart, the missing named', () => {
    const s = gapSaid(g);
    expect(s).toMatch(/^From the business’s production system \(MES shift totals, the MES\) — system data, not measured in the app — for 2026-11-10: 112,600 delivered against a target of 120,000; 8,400 units short on the rows that missed \(net 7,400, some rows beat their target\)\./);
    expect(s).toMatch(/Line 2: 83,600 of 90,000, 7,400 short; 70 min down — Film break 50 min, Jam 20 min; the units short £2,590\.00 of contribution at £0\.35 a pack; the downtime £70\.00 of idle labour \(kept apart, never added to it\)\./);
    expect(s).toMatch(/Line 7: 29,000 of 30,000, 1,000 short; 15 min down — \(no reason sent\) 15 min; no money for what a pack contributes on Line 7/);
    expect(s).toMatch(/Not sent by the system: rejects or good units \(so delivered is units made\)\./);
  });
  it('a day with nothing says so', () => {
    expect(gapSaid(readGap(rows, [L2], [conn], '2026-01-01', '2026-01-01'))).toBe('No production records from a connected system for 2026-01-01.');
  });
});

describe('health in words', () => {
  it('healthy, failing, waiting, paused', () => {
    expect(healthSaid(conn).says).toMatch(/^Healthy — 3 rows on .*, none refused\.$/);
    expect(healthSaid({ ...conn, lastError: 'Not fetched: the API answered 401: the key was refused.', lastRunAt: NOW + 1000 })).toMatchObject({ word: 'Failing', state: 'r' });
    expect(healthSaid({ ...conn, lastSuccessAt: undefined, tokenSetAt: undefined }).says).toBe('Waiting — make its token, then the system can send.');
    expect(healthSaid({ ...conn, lastSuccessAt: undefined, tokenSetAt: NOW }, true).says).toBe('Waiting — the token works once this device has reached the cloud.');
    expect(healthSaid({ ...conn, status: 'paused' }).word).toBe('Paused');
  });
});

describe('the production source, asked as any source', () => {
  it('fields, the system’s limits, and a question by shift worked by the table', () => {
    const d = productionDataset({ id: 'L2', name: 'Line 2' }, rows.filter(r => r.workspaceId === 'L2'), [L2], [conn]);
    expect(d.limits[0]).toMatch(/^System data — what the business’s production system recorded, sent through “MES shift totals” \(the MES\)/);
    const q = runTable(d, { measures: [{ op: 'sum', column: 'short of target' }, { op: 'sum', column: 'downtime minutes' }], groupBy: ['shift'], filters: [{ column: 'day', op: 'eq', value: '2026-11-10' }] });
    expect(q.groups.map(x => [x.key[0], ...x.values])).toEqual([['Days', 7400, 50], ['Nights', 0, 20]]);
  });
});

describe('through the capability, on a fake IndexedDB', () => {
  vi.setConfig({ testTimeout: 30_000 });
  beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
  it('rows brought in twice are kept once; production_gap answers from them; a client may ask too (a read)', async () => {
    const db = await import('../../../db');
    const prod = await import('../../../db/production');
    const lines = await import('../../lines');
    const reg = await import('../../../capabilities/registry');
    const w = await lines.addLineToFactory('Line 2');
    await db.updateWorkspace({ ...w, crew: 4, labourRatePerHour: 15, marginPerPack: 0.35 });
    await prod.putConnection({ ...conn, workspaceId: w.id });
    const sent = [{ id: 'D-1', day: '2026-11-10', shift: 'Days', target: 45000, output: 38000, rejects: 400, downtime_minutes: 50, downtime_reason: 'Film break' }];
    const first = await prod.upsertProduction(mapRows(sent, { id: 'c1', workspaceId: w.id }, NOW).records);
    const again = await prod.upsertProduction(mapRows(sent, { id: 'c1', workspaceId: w.id }, NOW + 60_000).records);
    expect(first).toEqual({ added: 1, replaced: 0 });
    expect(again).toEqual({ added: 0, replaced: 1 });
    expect(await prod.listProduction(w.id)).toHaveLength(1);
    const r = await reg.runCall({ now: NOW }, { id: 'x', name: 'production_gap', input: { lineId: w.id, from: '2026-11-10', to: '2026-11-10' } }, { confirmed: false });
    expect(r.ok && r.says).toMatch(/37,600 delivered against a target of 45,000; 7,400 units short.*£2,590\.00 of contribution.*£50\.00 of idle labour.*How known: system/);
    const none = await reg.runCall({ now: NOW }, { id: 'y', name: 'production_gap', input: { from: '2026-11-11', to: '2026-11-10' } }, { confirmed: false });
    expect(none.ok).toBe(false);
    const ls = await reg.runCall({ now: NOW }, { id: 'z', name: 'list_sources', input: { lineId: w.id } }, { confirmed: false });
    expect(ls.ok && ls.says).toMatch(new RegExp(`Line 2 — production from the system — 1 row \\[production:${w.id}\\]`));
  });
});
