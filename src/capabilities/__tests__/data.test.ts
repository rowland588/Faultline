/* CONVERSATIONAL DATA through the capabilities (docs/CONVERSATIONAL-DATA.md), on records in a fake IndexedDB: the line's stops asked by
 * category; "mechanical by shift" answered "cannot be said" with what the stops hold; a graph, percentages, Shift-less, back to the
 * original; a report built section by section with a finding that rests on its result; two files asked between, never picked;
 * a client refused the register's card. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';

vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });
const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), data: await import('../data') });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });
const T0 = Date.UTC(2026, 10, 2, 8);

async function seed() {
  const f = await fresh();
  const w = await f.lines.addLineToFactory('Line 2');
  await f.db.updateWorkspace({ ...w, clientName: 'Acme Foods' });
  const t = Date.now();
  await f.db.putStudy({ id: 'conv', tool: 'talk', name: 'Talk', facts: { colleague: true, turns: [] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  const add = (o: Record<string, unknown>) => f.db.addObservation({ id: Math.random().toString(36).slice(2), workspaceId: w.id, category: 'Jam', asset: 'Bagger', startedAt: T0, durationMs: 0, timing: 'stopwatch', count: 1, media: [], createdAt: T0, updatedAt: T0, ...o } as never);
  await add({ category: 'Jam', durationMs: 10 * 60_000 });
  await add({ category: 'Jam', durationMs: 5 * 60_000 });
  await add({ category: 'Film', durationMs: 12 * 60_000, asset: 'Wrapper' });
  await add({ category: 'Label', durationMs: 3 * 60_000 });
  const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), conversationId: 'conv', me: 'Rowland', ...o });
  return { ...f, w, ctx };
}

describe('every source asked one way', () => {
  it('stops by category kept as a result; mechanical by shift cannot be said, and why', async () => {
    const { reg, ctx, w } = await seed();
    const l = await reg.runCall(ctx(), call('list_sources', { lineId: w.id }), { confirmed: false });
    expect(l.ok && l.says).toMatch(new RegExp(`Line 2 — stops — 4 rows \\[stops:${w.id}\\]`));
    const f = await reg.runCall(ctx(), call('source_fields', { source: `stops:${w.id}` }), { confirmed: false });
    expect(f.ok && f.says).toMatch(/shift \(text\): recorded on 0 of 4/);
    expect(f.ok && f.says).toMatch(/no separate downtime classification such as mechanical/);
    const q = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'Downtime by category', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }), { confirmed: false });
    expect(q.ok && q.says).toMatch(/Downtime by category \[result R\w+\] — from Line 2 — stops: 4 of 4 rows; Jam: 15; Film: 12; Label: 3/);
    const no = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'Mechanical by shift', groupBy: ['downtime class', 'shift'], measures: [{ op: 'sum', column: 'minutes' }] }), { confirmed: false });
    expect(no.ok && no.says).toMatch(/This cannot be answered from Line 2 — stops: it holds no “downtime class”.*never put a figure in its place/);
    expect(no.ok && (no.data as { answered: boolean }).answered).toBe(false);
  });

  it('a graph, then percentages, then a category out, then back to the original — each a version', async () => {
    const { reg, ctx, w, db } = await seed();
    const q = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'Downtime by category', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }), { confirmed: false });
    const resultId = q.ok ? (q.data as { resultId: string }).resultId : '';
    const c = await reg.runCall(ctx(), call('make_chart', { resultId, type: 'column', title: 'Downtime by category' }), { confirmed: false });
    expect(c.ok && c.says).toMatch(/v1 — column chart of “Downtime by category”: Jam 15, Film 12, Label 3/);
    const chartId = c.ok ? (c.data as { chartId: string }).chartId : '';
    const p = await reg.runCall(ctx(), call('refine_chart', { chartId, percent: true }), { confirmed: false });
    expect(p.ok && p.says).toMatch(/v2 — percentages: Jam 50%, Film 40%, Label 10%/);
    const x = await reg.runCall(ctx(), call('refine_chart', { chartId, exclude: ['Label'] }), { confirmed: false });
    expect(x.ok && x.says).toMatch(/v3 — left out Label: Jam 55.6%, Film 44.4%/);
    const b = await reg.runCall(ctx(), call('refine_chart', { chartId, back: 'original' }), { confirmed: false });
    expect(b.ok && b.says).toMatch(/v4 — back to the original .*: Jam 15, Film 12, Label 3/);
    expect(b.ok && b.refs[0]).toMatchObject({ kind: 'chart', id: `${chartId}@4` });
    const facts = (await db.getStudy('conv'))?.facts as unknown as { charts: { versions: unknown[] }[]; results: unknown[] };
    expect([facts.charts[0].versions.length, facts.results.length]).toEqual([4, 1]);
    expect((await reg.runCall(ctx(), call('make_chart', { resultId: 'R-none' }), { confirmed: false })).ok).toBe(false);
  });

  it('a report built progressively: the chart, a finding on its result, a recommendation, a summary with a figure it does not hold flagged', async () => {
    const { reg, ctx, w } = await seed();
    const q = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'Downtime by category', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }), { confirmed: false });
    const R = q.ok ? (q.data as { resultId: string }).resultId : '';
    const c = await reg.runCall(ctx(), call('make_chart', { resultId: R }), { confirmed: false });
    const C = c.ok ? (c.data as { chartId: string }).chartId : '';
    const a = await reg.runCall(ctx(), call('build_report', { title: 'Line 2 downtime', op: 'add', section: { kind: 'chart', heading: 'Where the time goes', chartId: C } }), { confirmed: false });
    expect(a.ok && a.says).toMatch(/Started the report “Line 2 downtime”/);
    const D = a.ok ? (a.data as { reportId: string }).reportId : '';
    const f1 = await reg.runCall(ctx(), call('build_report', { reportId: D, op: 'add', section: { kind: 'finding', heading: 'Jams lead', text: 'Jams cost 15 minutes, 50% of the 30 recorded.', evidence: [R] } }), { confirmed: false });
    expect(f1.ok && f1.says).not.toMatch(/Check this/);
    const noEv = await reg.runCall(ctx(), call('build_report', { reportId: D, op: 'add', section: { kind: 'finding', heading: 'x', text: 'Film is worse.' } }), { confirmed: false });
    expect(noEv.ok).toBe(false);
    const s = await reg.runCall(ctx(), call('build_report', { reportId: D, op: 'add', after: 'start', section: { kind: 'summary', heading: 'Executive summary', text: 'The line lost 30 minutes, 45 of them to jams.', evidence: [R] } }), { confirmed: false });
    expect(s.ok && s.says).toMatch(/45 not in its results, marked Check this/);
    const rec = await reg.runCall(ctx(), call('build_report', { reportId: D, op: 'add', section: { kind: 'recommendation', heading: 'Next', text: 'Time the bagger jams for a week.', by: 'luna' } }), { confirmed: false });
    expect(rec.ok && rec.says).toMatch(/4 sections: Executive summary \[S\w+, summary\]; Where the time goes \[S\w+, chart\]; Jams lead \[S\w+, finding\]; Next \[S\w+, recommendation\]/);
    const deck = await reg.runCall(ctx(), call('build_report', { reportId: D, form: 'presentation' }), { confirmed: false });
    expect(deck.ok && deck.says).toMatch(/presentation “Line 2 downtime” .* v6, 4 sections/);
    const st = await reg.runCall(ctx(), call('outputs_state', {}), { confirmed: false });
    expect(st.ok && st.says).toMatch(/Presentation D\w+ v6: “Line 2 downtime” — Executive summary \[S\w+, summary, CHECK THIS\]/);
  });

  it('two files asked between, never picked; named by card; a client refused it', async () => {
    const { reg, ctx, data, w } = await seed();
    const a = await data.registerFile(ctx(), { fileId: 'wb-1', fileName: 'packing line 1 downtime.xlsx', kind: 'workbook', bytes: 10, status: 'ready', sheets: [{ name: 'Downtime', rows: 9, columns: [{ name: 'Reason', type: 'text' }] }], lineId: w.id });
    await data.registerFile(ctx(), { fileId: 'wb-2', fileName: 'packing line 2 downtime.xlsx', kind: 'workbook', bytes: 10, status: 'ready' });
    expect((await data.registerFile(ctx(), { fileId: 'wb-1', fileName: 'packing line 1 downtime.xlsx', kind: 'workbook', bytes: 10, status: 'ready' }))?.id).toBe(a?.id);   /* found, never doubled */
    const r = await reg.runCall(ctx(), call('resolve_source', { words: 'the packing line downtime workbook' }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/More than one file could be meant.*Ask which, naming each — never pick one/);
    const n = await reg.runCall(ctx(), call('name_source', { sourceId: a?.id, name: 'BrilloPak Speed Trials', suggested: true, description: 'Speed trials by product' }), { confirmed: true });
    expect(n.ok && n.says).toMatch(/“BrilloPak Speed Trials” \(name suggested by Luna\) — packing line 1 downtime.xlsx/);
    const one = await reg.runCall(ctx(), call('resolve_source', { words: 'open BrilloPak speed trials' }), { confirmed: false });
    expect(one.ok && (one.data as { id: string }).id).toBe(a?.id);
    expect((await reg.runCall(ctx({ level: 'client' }), call('name_source', { sourceId: a?.id, name: 'X' }), { confirmed: true })).ok).toBe(false);
    const away = await reg.runCall(ctx(), call('query_data', { source: a?.id, title: 't', measures: [{ op: 'count' }] }), { confirmed: false });
    expect(away.ok && away.says).toMatch(/its cells are not on this device/);
  });
});
