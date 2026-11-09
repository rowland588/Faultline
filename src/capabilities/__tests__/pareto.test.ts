/* THE PARETO FROM WHATEVER EVIDENCE THERE IS — the ten scenarios of the Tool Intelligence mandate (10 November, docs/AI-TOOL-INTELLIGENCE.md
 * §4). Rowland: "We keep losing time because bags aren't presenting properly on Line 3." Each kind of evidence is kept apart and said as
 * what it is; nothing is estimated; frequency is never passed off as time; a thin or conflicting set is said to be so. Every figure below
 * is worked by hand from the rows given. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { Observation } from '../../types';
import type { CapCtx } from '../types';
import { csvRows, downtimeTable, paretoEvidence, sameReason, type Source } from '../intel/pareto';

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 10, 12);
type P = { ranked: boolean; lead?: { basis: string; by: string }; conflicts: string[]; gaps: string[]; byLine: { line: string; top: string }[]; enough: { level: string; more?: string };
  sources: { basis: string; byTime?: { category: string; mins?: number; events?: number; share: number }[]; byCount?: { category: string; events?: number }[]; totalMins?: number; totalEvents?: number }[] };

async function seed() {
  const db = await import('../../db'), reg = await import('../registry'), lines = await import('../../lib/lines'), conv = await import('../../colleague/conversation');
  const l3 = await lines.addLineToFactory('Line 3');
  const l4 = await lines.addLineToFactory('Line 4');
  await db.putStudy(conv.newConversation({ id: 'conv', at: NOW, name: 'AI', thread: { id: 't1', title: 'Line 3 bags', scope: { lineId: l3.id } } }));
  const ctx: CapCtx = { now: NOW, conversationId: 'conv', me: 'Rowland' };
  const run = async (name: string, input: unknown, at = NOW) => reg.runCall({ ...ctx, now: at }, { id: `c-${Math.random()}`, name, input }, { confirmed: true });
  let n = 0;
  const stop = (ws: string, at: number, category: string, min: number, timing: Observation['timing'] = 'stopwatch'): Promise<unknown> => db.addObservation({ id: `o${n += 1}`, workspaceId: ws, category, asset: 'Bagger', startedAt: at, endedAt: at + min * 60_000, durationMs: min * 60_000, timing } as Observation);
  return { db, reg, l3, l4, run, stop, ctx };
}
const data = (r: { ok: boolean; data?: unknown; says?: string; why?: string }) => { if (!r.ok) throw new Error(r.why); return r.data as P; };

describe('the Pareto — ten kinds of evidence', () => {
  it('1 historical records: 66 stops timed over 22 days rank by minutes lost, and are solid', async () => {
    const { run, l3, stop } = await seed();
    for (let d = 1; d <= 22; d += 1) {
      await stop(l3.id, NOW - d * DAY, 'Bag presentation', 4);
      await stop(l3.id, NOW - d * DAY + 3_600_000, 'Bag presentation', 3);
      await stop(l3.id, NOW - d * DAY + 7_200_000, 'Film break', 2);
    }
    const r = await run('pareto', { lineId: l3.id });
    const p = data(r);
    expect(p.lead).toEqual({ basis: 'measured', by: 'time' });
    const m = p.sources.find(s => s.basis === 'measured')!;
    expect(m.totalMins).toBe(198);
    expect(m.byTime?.[0]).toMatchObject({ category: 'Bag presentation', mins: 154, events: 44 });
    expect(m.byTime?.[0].share).toBeCloseTo(154 / 198, 6);
    expect(p.enough.level).toBe('solid');
    if (r.ok) expect(r.says).toMatch(/^Timed on Line 3, .*: 198 min lost in 66 stops\. Bag presentation leads — 154 min in 44 stops, 78% of the time lost, 3\.5 min a stop/);
  }, 60_000);

  it('2 figures the person said: ranked as reported, never as timed, and how to rely on it', async () => {
    const { run, l3 } = await seed();
    const r = await run('pareto', { lineId: l3.id, reported: [{ category: 'Bag presentation', minutes: 45, stops: 12 }, { category: 'Film break', minutes: 20 }] });
    const p = data(r);
    expect(p.lead).toEqual({ basis: 'reported', by: 'time' });
    expect(p.enough.level).toBe('reported');
    if (r.ok) {
      expect(r.says).toMatch(/^As reported on Line 3: 65 min lost\. Bag presentation leads — 45 min, 69% of the time lost\./);
      expect(r.says).toMatch(/reported, not measured — .*time it before relying on the ranking/);
      expect(r.says).not.toMatch(/^Timed/);
    }
  }, 60_000);

  it('3 the live stopwatch: stops said as they happen are measured and ranked', async () => {
    const { run, l3 } = await seed();
    const t0 = NOW - 3_600_000;
    expect((await run('start_measurement', { tool: 'stops', lineId: l3.id }, t0)).ok).toBe(true);
    const say = async (at: number, input: object) => expect((await run('capture_event', input, at)).ok).toBe(true);
    await say(t0 + 60_000, { event: 'stopped', machine: 'Bagger', reason: 'Bag presentation' });
    await say(t0 + 6 * 60_000, { event: 'running' });
    await say(t0 + 20 * 60_000, { event: 'stopped', machine: 'Bagger', reason: 'Bag presentation' });
    await say(t0 + 23 * 60_000, { event: 'running' });
    await say(t0 + 40 * 60_000, { event: 'stopped', machine: 'Sealer', reason: 'Seal jam' });
    await say(t0 + 42 * 60_000, { event: 'running' });
    const p = data(await run('pareto', { lineId: l3.id }));
    const m = p.sources.find(s => s.basis === 'measured')!;
    expect(m.byTime?.map(x => [x.category, x.mins, x.events])).toEqual([['Bag presentation', 8, 2], ['Seal jam', 2, 1]]);
    expect(p.enough.level).toBe('thin');
    expect(p.enough.more).toBe('at least 20 stops over 7 days (17 more stops, 6 more days)');
  }, 60_000);

  it('4 a downtime spreadsheet read in code: imported, kept apart from the timed stops, and never written into them', async () => {
    const { run, l3, ctx, db, stop } = await seed();
    const caps = await import('../intel/caps');
    const csv = 'Date,Line,Downtime reason,Duration (mins),Stops\n2026-11-03,Line 3,Bag presentation,32,8\n2026-11-04,Line 3,"Film break, splice",14,2\n2026-11-05,Line 3,Bag presentation,25,6\n2026-11-05,Line 3,Label,abc,1\n';
    const t = downtimeTable(csvRows(csv))!;
    expect(t.columns).toEqual({ reason: 'Downtime reason', minutes: 'Duration (mins)', count: 'Stops', line: 'Line', date: 'Date' });
    expect(t.rows).toHaveLength(3);
    expect(t.skipped).toEqual(['row 5 (“Label”) — “abc” is not a number']);
    const k = await caps.keepImport(ctx, { name: 'downtime-w45.csv', lineId: l3.id, ...t });
    expect(k.ok).toBe(true);
    await stop(l3.id, NOW - DAY, 'Film break', 30);
    const r = await run('pareto', { lineId: l3.id, importId: k.ok ? k.id : '' });
    const p = data(r);
    expect(p.lead).toEqual({ basis: 'measured', by: 'time' });
    const imp = p.sources.find(s => s.basis === 'imported')!;
    expect(imp.byTime?.[0]).toMatchObject({ category: 'Bag presentation', mins: 57, events: 14 });
    if (r.ok) expect(r.says).toMatch(/Kept apart, not added in: imported from a file \(“downtime-w45\.csv”\): Bag presentation 57 min/);
    expect((await db.listObservations(l3.id)).length).toBe(1);
    const li = await run('import_table', {});
    if (li.ok) expect(li.says).toMatch(/“downtime-w45\.csv” \[imp-.*\]: 3 rows — reason “Downtime reason”, minutes “Duration \(mins\)”, count “Stops”, by line, dated; 1 row left out/);
  }, 60_000);

  it('5 not enough: three stops on one day are thin, and say how many more and over how long', () => {
    const src: Source = { basis: 'measured', label: 'timed by stopwatch', from: NOW - 28 * DAY, to: NOW, rows: [
      { category: 'Bag presentation', mins: 6, events: 1, at: NOW - DAY }, { category: 'Bag presentation', mins: 4, events: 1, at: NOW - DAY + 1000 }, { category: 'Film break', mins: 9, events: 1, at: NOW - DAY + 2000 }] };
    const e = paretoEvidence([src], { where: 'Line 3' });
    expect(e.enough).toMatchObject({ level: 'thin', more: 'at least 20 stops over 7 days (17 more stops, 6 more days)' });
    expect(e.says).toMatch(/How sure: thin — 1 day, 3 stops; to rely on it: at least 20 stops/);
  });

  it('6 conflicting figures: the stopwatch and what was said disagree — both said, neither averaged; a reason said twice differently asked', () => {
    const timed: Source = { basis: 'measured', label: 'timed by stopwatch', rows: [{ category: 'Film break', mins: 40, events: 4, at: NOW }, { category: 'Bag presentation', mins: 10, events: 5, at: NOW }] };
    const said: Source = { basis: 'reported', label: 'said in this conversation (reported)', rows: [{ category: 'Bag presentations', mins: 60 }, { category: 'Film break', mins: 15 }, { category: 'bag presentation', mins: 30 }] };
    const e = paretoEvidence([timed, said]);
    expect(e.lead?.basis).toBe('measured');
    expect(e.conflicts[0]).toBe('What is timed by stopwatch puts Film break first; what is said in this conversation (reported) puts Bag presentations first.');
    expect(e.conflicts.some(c => /Bag presentations: 20% of the time lost timed by stopwatch, but 86% said/.test(c))).toBe(true);
    expect(e.conflicts.some(c => /said with different figures: 60 min and 30 min — both kept; which is right\?/.test(c))).toBe(true);
    expect(sameReason('Bag Presentations ')).toBe(sameReason('bag presentation'));
  });

  it('7 frequency without duration: taps rank how often, and say that is not time lost', async () => {
    const { run, l3, stop } = await seed();
    for (let i = 0; i < 9; i += 1) await stop(l3.id, NOW - i * 3_600_000, 'Bag presentation', 0, 'instant');
    for (let i = 0; i < 3; i += 1) await stop(l3.id, NOW - i * 3_600_000 - 1000, 'Film break', 0, 'instant');
    const r = await run('pareto', { lineId: l3.id });
    const p = data(r);
    expect(p.lead).toEqual({ basis: 'counted', by: 'count' });
    expect(p.sources[0].byTime).toBeUndefined();
    expect(p.sources[0].byCount?.map(x => [x.category, x.events])).toEqual([['Bag presentation', 9], ['Film break', 3]]);
    if (r.ok) {
      expect(r.says).toMatch(/^Counted on Line 3, .*: 12 stops\. Bag presentation leads — 9 stops, 75% of them\./);
      expect(r.says).toMatch(/Only how often is known, not the minutes each cost/);
    }
  }, 60_000);

  it('8 duration without frequency: a file of minutes only says it cannot tell many short stops from a few long ones', () => {
    const t = downtimeTable([['Reason', 'Downtime (hours)'], ['Bag presentation', 1.5], ['Film break', '0.5']])!;
    expect(t.rows).toEqual([{ category: 'Bag presentation', mins: 90 }, { category: 'Film break', mins: 30 }]);
    const e = paretoEvidence([{ basis: 'imported', label: 'imported from a file', rows: t.rows }]);
    expect(e.lead).toEqual({ basis: 'imported', by: 'time' });
    expect(e.gaps).toEqual(['The minutes lost are known but not how many stops made them — whether a reason is many short stops or a few long ones cannot be said.']);
    expect(e.says).toMatch(/^From the file: 120 min lost\. Bag presentation leads — 90 min, 75% of the time lost\./);
  });

  it('9 several lines: each line’s own leader, never one blended ranking said as one line’s', async () => {
    const { run, l3, l4, stop } = await seed();
    await stop(l3.id, NOW - DAY, 'Bag presentation', 20);
    await stop(l3.id, NOW - 2 * DAY, 'Film break', 5);
    await stop(l4.id, NOW - DAY, 'Film break', 30);
    const r = await run('pareto', { lineIds: [l3.id, l4.id] });
    const p = data(r);
    expect(p.byLine).toEqual([{ line: 'Line 3', top: 'Bag presentation', mins: 20, events: 1 }, { line: 'Line 4', top: 'Film break', mins: 30, events: 1 }]);
    if (r.ok) expect(r.says).toMatch(/By line: Line 3 — Bag presentation; Line 4 — Film break\./);
  }, 60_000);

  it('10 different periods: from and to keep only their stops, and the leader is said against the period before', async () => {
    const { run, l3, stop } = await seed();
    await stop(l3.id, Date.UTC(2026, 10, 3, 9), 'Bag presentation', 12);
    await stop(l3.id, Date.UTC(2026, 10, 8, 9), 'Bag presentation', 38);
    await stop(l3.id, Date.UTC(2026, 10, 9, 9), 'Film break', 10);
    const r = await run('pareto', { lineId: l3.id, from: '2026-11-06', to: '2026-11-10' });
    const p = data(r);
    expect(p.sources[0].totalMins).toBe(48);
    if (r.ok) expect(r.says).toMatch(/Bag presentation leads — 38 min in 1 stop, 79% of the time lost, 38 min a stop \(12 min the period before\)\./);
  }, 60_000);

  it('nothing at all: refuses to rank, and says the way to get it — never a Pareto from the problem as said', async () => {
    const { run, l3 } = await seed();
    const r = await run('pareto', { lineId: l3.id });
    expect(data(r).ranked).toBe(false);
    if (r.ok) {
      expect(r.says).toMatch(/^There is nothing to rank yet on Line 3: .*A Pareto needs reasons with a quantity/);
      expect(r.says).toMatch(/time the stops on Line 3 as they happen \(start_measurement, stops\).*Do not draw a Pareto from the problem as said\./);
    }
  }, 60_000);

  it('a reported figure with no quantity is refused in words, never ranked', async () => {
    const { reg } = await seed();
    const r = await reg.runCall({ now: NOW }, { id: 'x', name: 'pareto', input: { reported: [{ category: 'Bag presentation' }] } }, { confirmed: false });
    expect(r).toEqual({ ok: false, why: '“Bag presentation” has no figure — the minutes or how many times, as said.' });
  }, 60_000);
});

describe('assess_evidence, hand_over and handover_state', () => {
  it('assess_evidence on a line with nothing recommends the live route and never typing; with stops it works from what is held', async () => {
    const { run, l3, stop } = await seed();
    const a = await run('assess_evidence', { tool: 'stops', lineId: l3.id });
    if (a.ok) {
      expect(a.says).toMatch(/Best way to get it: live — start_measurement \(stops\)/);
      expect(a.says).toMatch(/Do not ask for figures typed by hand where the records or a live measurement can give them/);
    }
    await stop(l3.id, NOW - DAY, 'Bag presentation', 7);
    const b = await run('assess_evidence', { tool: 'stops', lineId: l3.id });
    if (b.ok) expect(b.says).toMatch(/Work from what is held: records — The line’s stops already timed/);
  }, 60_000);

  it('hand_over opens the person’s page and keeps the step; handover_state reads whether the record moved — never assumed', async () => {
    const { run, l3, db } = await seed();
    const no = await run('hand_over', { tool: 'stops', op: 'pareto' });
    expect(no.ok).toBe(false);
    const h = await run('hand_over', { tool: 'actions', op: 'depend', lineId: l3.id });
    expect(h.ok).toBe(true);
    if (h.ok) {
      expect(h.show?.href).toBe(`/lines/${l3.id}?view=actions`);
      expect(h.says).toMatch(/^Handed over — Link what waits for what: On the line’s Actions Gantt, drag a bar’s end onto the one it waits for\. I can’t do this part:/);
    }
    const before = await run('handover_state', {});
    if (before.ok) expect(before.says).toMatch(/Nothing on the line changed since\. Not done yet — never assume it was/);
    await db.addObservation({ id: 'later', workspaceId: l3.id, category: 'x', asset: 'Bagger', startedAt: NOW + 60_000, durationMs: 0, timing: 'instant' } as Observation);
    const after = await run('handover_state', { done: 'clear' }, NOW + 120_000);
    if (after.ok) expect(after.says).toMatch(/1 record on the line changed since\. Read the record now/);
    const gone = await run('handover_state', {}, NOW + 180_000);
    if (gone.ok) expect(gone.says).toBe('Nothing is handed over on this subject.');
  }, 60_000);
});
