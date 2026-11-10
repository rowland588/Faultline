/* THE ANALYST'S MOVES (docs/LUNA-NEXT.md L1, L2, L4) through the capabilities, on records in a fake IndexedDB, against figures worked by
 * hand: Line 2's stops in two weeks — before (26 Oct–1 Nov) Jam on the Bagger 10 min, Film on the Wrapper 12, Label on the Bagger 3 = 25;
 * after (2–8 Nov) Jam on the Bagger 10 + 5 + 20 = 35, Film 10, Label 3 = 48. Change +23 min (+92%). By category Jam +25 (25 / 23 =
 * 108.7% of the change), Film −2, Label 0; by machine Bagger 13 → 38 +25, Wrapper 12 → 10 −2 — equally concentrated, so the finer field
 * (category) is read first; within Jam, the Bagger carries all of it (10 → 35). */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';

vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });
const at = (d: number, m = 10) => Date.UTC(2026, m, d, 8);

async function seed() {
  const db = await import('../../db'); const reg = await import('../registry'); const lines = await import('../../lib/lines');
  const w = await lines.addLineToFactory('Line 2');
  const t = Date.now();
  await db.putStudy({ id: 'conv', tool: 'talk', name: 'Talk', facts: { colleague: true, turns: [] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  const add = (when: number, category: string, asset: string, min: number) => db.addObservation({ id: Math.random().toString(36).slice(2), workspaceId: w.id, category, asset, startedAt: when, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: when, updatedAt: when } as never);
  await add(at(27, 9), 'Jam', 'Bagger', 10); await add(at(28, 9), 'Film', 'Wrapper', 12); await add(at(29, 9), 'Label', 'Bagger', 3);
  await add(at(3), 'Jam', 'Bagger', 10); await add(at(4), 'Jam', 'Bagger', 5); await add(at(5), 'Jam', 'Bagger', 20); await add(at(4), 'Film', 'Wrapper', 10); await add(at(6), 'Label', 'Bagger', 3);
  const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), conversationId: 'conv', me: 'Rowland', ...o });
  return { db, reg, w, ctx };
}
const periods = { before: { from: '2026-10-26', to: '2026-11-01', label: 'the week before' }, after: { from: '2026-11-02', to: '2026-11-08', label: 'last week' } };

describe('explain_change — what changed, and where', () => {
  it('finds the change in Jam, and within Jam the Bagger, as worked by hand; kept as a result', async () => {
    const { reg, w, ctx, db } = await seed();
    const r = await reg.runCall(ctx(), call('explain_change', { source: `stops:${w.id}`, title: 'Downtime minutes on Line 2', measure: { op: 'sum', column: 'minutes' }, date: 'day', ...periods, unit: 'min' }), { confirmed: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toMatch(/Downtime minutes on Line 2: 25 min in the week before, 48 min in last week — \+23 min \(\+92%\)\./);
    expect(r.says).toMatch(/It sits most in category: Jam \+25 min \(109% of the change\)/);
    expect(r.says).toMatch(/Film −2 min \(-9% of the change\)/);
    expect(r.says).toMatch(/Within Jam, all of it is on one machine: Bagger \(10 min to 35 min\)\./);
    const d = r.data as { best: string; before: number; after: number; change: number; resultId: string };
    expect(d).toMatchObject({ best: 'category', before: 25, after: 48, change: 23 });
    const facts = (await db.getStudy('conv'))?.facts as unknown as { results: { id: string; result: { groups: { key: string[]; values: number[] }[]; measures: string[] } }[] };
    const kept = facts.results.find(x => x.id === d.resultId);
    expect(kept?.result.measures).toEqual(['before', 'after', 'change']);
    expect(kept?.result.groups[0]).toMatchObject({ key: ['Jam'], values: [10, 35, 25] });
    /* a chart is drawn from it like any other result */
    const c = await reg.runCall(ctx(), call('make_chart', { resultId: d.resultId, measure: 2, title: 'Change by category' }), { confirmed: false });
    expect(c.ok && c.says).toMatch(/Jam 25/);
  });

  it('a field the source does not hold is cannot be said, never a figure', async () => {
    const { reg, w, ctx } = await seed();
    const r = await reg.runCall(ctx(), call('explain_change', { source: `stops:${w.id}`, title: 'Mechanical downtime', measure: { op: 'sum', column: 'minutes' }, date: 'day', ...periods, filters: [{ column: 'downtime class', op: 'eq', value: 'Mechanical' }] }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/This cannot be answered from Line 2 — stops: it holds no “downtime class”/);
  });

  it('no change in the total is said as no change', async () => {
    const { reg, w, ctx } = await seed();
    const r = await reg.runCall(ctx(), call('explain_change', { source: `stops:${w.id}`, title: 'Label minutes', measure: { op: 'sum', column: 'minutes' }, date: 'day', ...periods, filters: [{ column: 'category', op: 'eq', value: 'Label' }] }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/Label minutes: 3 in the week before, 3 in last week — no change\./);
  });
});

describe('join_results — two results side by side', () => {
  it('matches by label, names what is on one side only, and keeps the person\'s own pairs', async () => {
    const { reg, w, ctx } = await seed();
    const q = (title: string, p: { from: string; to: string }) => reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title, groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }], filters: [{ column: 'day', op: 'between', from: p.from, to: p.to }] }), { confirmed: false });
    const a = await q('Before', periods.before); const b = await q('After', periods.after);
    const ida = a.ok ? (a.data as { resultId: string }).resultId : ''; const idb = b.ok ? (b.data as { resultId: string }).resultId : '';
    const j = await reg.runCall(ctx(), call('join_results', { a: ida, b: idb, title: 'Before against after' }), { confirmed: false });
    expect(j.ok && j.says).toMatch(/3 labels matched, the biggest differences first: Jam: 10 against 35, \+25 \(350%\); Film: 12 against 10, −2 \(83%\); Label: 3 against 3, \+0 \(100%\)\. Matched in all: 25 against 48 \(\+23\)\./);
    expect((await reg.runCall(ctx(), call('join_results', { a: ida, b: 'Rnope', title: 'x' }), { confirmed: false })).ok).toBe(false);
  });
});

describe('work_out — arithmetic through Faultline', () => {
  it('works out a share from figures the conversation holds, and names a figure nothing holds', async () => {
    const { reg, w, ctx } = await seed();
    await reg.runCall(ctx(), call('explain_change', { source: `stops:${w.id}`, title: 'Downtime', measure: { op: 'sum', column: 'minutes' }, date: 'day', ...periods }), { confirmed: false });
    const s = await reg.runCall(ctx(), call('work_out', { what: 'Jam’s share of last week’s downtime', expression: '35 / 48 * 100', unit: '%', places: 1 }), { confirmed: false });
    expect(s.ok && s.says).toBe('Jam’s share of last week’s downtime: 35 / 48 * 100 = 72.9 % (worked out by Faultline).');
    expect(s.ok && (s.data as { backed: boolean }).backed).toBe(true);
    const u = await reg.runCall(ctx(), call('work_out', { what: 'A guess', expression: '977 × 2' }), { confirmed: false });
    expect(u.ok && u.says).toMatch(/= 1,954 \(worked out by Faultline\)\. It rests on 977, found nowhere/);
    expect(u.ok && (u.data as { backed: boolean }).backed).toBe(false);
    expect((await reg.runCall(ctx(), call('work_out', { what: 'x', expression: '4 / 0' }), { confirmed: false })).ok).toBe(false);
    expect((await reg.runCall(ctx(), call('work_out', { what: 'x', expression: 'minutes * 2' }), { confirmed: false })).ok).toBe(false);
  });
});
