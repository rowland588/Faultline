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
    expect(away.ok && away.says).toMatch(/was read on another device and its file was not kept for your other devices.*Attach it here once.*Nothing can be said of its figures until then/);
  });
});

/* A LINKED FILE READ AGAIN AND AGAIN (22 November, the review of G2b): every reading is a record of its own — and they are ONE file
 * wherever files are listed or matched. */
describe('the register: a linked file is one file, however many times it has been read', () => {
  const DAY = 86_400_000;
  const link = (hash: string, url = 'https://1drv.ms/x/shift') => ({ kind: 'link' as const, url, service: 'onedrive' as const, said: 'OneDrive', host: '1drv.ms', path: 'shift report.xlsx', hash, modifiedAt: 0, checkedAt: 0 });
  const reading = (i: number, o: Record<string, unknown> = {}) => ({ fileId: `wb-shift-${i}`, fileName: 'shift report.xlsx', kind: 'workbook' as const, bytes: 10 + i, status: 'ready' as const, origin: link(`h${i}`), ...o });

  it('thirteen readings of one link are ONE file to list_sources and to resolve_source — and the customer’s other file is still said', async () => {
    const { data, reg, ctx } = await seed();
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(T0);
      await data.registerFile(ctx(), { fileId: 'wb-pm', fileName: 'product master.xlsx', kind: 'workbook', bytes: 10, status: 'ready' });
      for (let i = 0; i < 13; i += 1) { vi.setSystemTime(T0 + (i + 1) * DAY); await data.registerFile(ctx(), reading(i)); }
      expect(await data.allSources()).toHaveLength(14);
      const l = await reg.runCall(ctx(), call('list_sources', {}), { confirmed: false });
      expect(l.ok).toBe(true);
      if (!l.ok) return;
      expect(l.says).toMatch(/^2 files in the register: /);
      expect(l.says.split('“Shift Report”').length - 1).toBe(1);
      expect(l.says).toContain('“Product Master”');
      expect(l.says).toContain('(12 earlier readings of linked files kept as read — resolve_source with a date finds one.)');
      expect((l.data as { files: { id: string; name: string }[] }).files.map(f => f.name)).toEqual(['Shift Report', 'Product Master']);
      const none = await reg.runCall(ctx(), call('resolve_source', { words: 'the yield file' }), { confirmed: false });
      expect(none.ok && none.says).toContain('there are 2 files: “Shift Report”, “Product Master”');
      /* a name means the newest reading; nothing to ask between */
      const one = await reg.runCall(ctx(), call('resolve_source', { words: 'the shift report' }), { confirmed: false });
      expect(one.ok && (one.data as { match: string; id?: string })).toMatchObject({ match: 'one', id: (await data.allSources())[0].id });
    } finally { vi.useRealTimers(); }
  });

  it('a newer version is matched to its file by whose the file IS: a link connected on a line, with no customer written on it', async () => {
    const { data, db, w, ctx } = await seed();
    const first = await data.registerFile(ctx(), reading(0, { lineId: w.id }));
    expect(first?.facts.client).toBe('Acme Foods');
    /* as a record made before files carried a customer: named by the person, on its line, no customer of its own */
    await db.patchStudy(first?.id as string, cur => { const { client: _c, ...sf } = (cur.facts as unknown as { source: Record<string, unknown> }).source; void _c; return { name: 'Weekly shift report', facts: { ...cur.facts, source: { ...sf, name: 'Weekly shift report', named: 'person', description: 'what each shift made against plan' } } as never }; });
    /* its newer version, read with the customer said (colleague/keepUp hands on whose it is by rule) and on no line */
    const second = await data.registerFile(ctx(), reading(1, { client: 'Acme Foods' }));
    expect(second?.facts).toMatchObject({ name: 'Weekly shift report', named: 'person', description: 'what each shift made against plan' });
    /* written as the version before is written — so the two are one file wherever they are listed — and placed where it is placed */
    expect(second?.facts.client ?? '').toBe('');
    expect(second?.lineId).toBe(w.id);
    const { earlierReadings } = await import('../../lib/data/sources');
    expect([...earlierReadings(await data.allSources())]).toEqual([first?.id]);
    expect((await data.sourcesInHand()).map(x => x.id).sort()).toEqual([first?.id, second?.id].sort());
  });

  it('…and by the record handed in: a file that is no one’s stays no one’s when its newer version is read with a customer in hand', async () => {
    const { data, db, lines, ctx } = await seed();
    const other = await lines.addLineToFactory('Line 9');
    await db.updateWorkspace({ ...other, clientName: 'Cobb Foods' });
    const { setActiveClient } = await import('../../lib/activeClient');
    /* connected with every customer shown and no line: asked of nobody here — written as no one's */
    const first = await data.registerFile(ctx(), reading(0));
    await db.patchStudy(first?.id as string, cur => { const { client: _c, ...sf } = (cur.facts as unknown as { source: Record<string, unknown> }).source; void _c; return { facts: { ...cur.facts, source: sf } as never }; });
    setActiveClient('Cobb Foods');
    try {
      const second = await data.registerFile(ctx(), reading(1, { versionOf: first?.id }));
      expect(second?.facts.client ?? '').toBe('');
      expect(second?.lineId).toBeUndefined();
      /* without the record handed in it would have been Cobb's — a new file of the customer in hand, as a first connection is */
      const third = await data.registerFile(ctx(), reading(2, { origin: link('h2', 'https://1drv.ms/x/another') }));
      expect(third?.facts.client).toBe('Cobb Foods');
    } finally { setActiveClient(''); }
  });
});

/* A RATE AND A SHARE IN THE QUESTION ITSELF (22 November, lib/workbook/derive — docs/LUNA-ANALYSIS.md A3): asked through the
 * capability as the gateway asks it; said as what each is; and every figure of it the app's own in her answer, with no work_out. */
describe('figures derived from the measures, through query_data', () => {
  it('each category’s share of the minutes and its minutes a stop — one question, said as percentages and rates, checked as the app’s', async () => {
    const { reg, w, ctx } = await seed();
    const r = await reg.runCall(ctx(), call('query_data', {
      source: `stops:${w.id}`, title: 'Minutes by category, with shares', groupBy: ['category'],
      measures: [{ op: 'sum', column: 'minutes' }, { op: 'count' }],
      derive: [{ as: 'share of the minutes', op: 'share', a: 0 }, { as: 'minutes a stop', op: 'ratio', a: 0, b: 1 }],
    }), { confirmed: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    /* Jam 10 + 5 = 15 of 30 over 2 stops; Film 12 of 30 over 1; Label 3 of 30 over 1 */
    expect(r.says).toContain('Jam: 15, 2, 50%, 7.5; Film: 12, 1, 40%, 12; Label: 3, 1, 10%, 3.');
    expect(r.says).toContain('Totals: sum of minutes 30, rows 4, share of the minutes 100%, minutes a stop 7.5.');
    expect(r.says).toContain('“share of the minutes” is each group’s “sum of minutes” as a share of the total over EVERY matched row — not only the groups shown.');
    const { checkFigures } = await import('../../colleague/figureCheck');
    const answer = 'Jam is 50% of the lost time at 7.5 minutes a stop; Film is 40% (12 minutes in one stop) and Label 10%.';
    expect(checkFigures(answer, [{ says: r.says, data: r.data }], [])).toMatchObject({ unsure: [] });
    /* …and a share that is NOT the app's is still found out */
    expect(checkFigures('Jam is 56% of the lost time.', [{ says: r.says, data: r.data }], []).unsure).toEqual(['56%']);
  });

  it('cut to the biggest: its share is of every row; ordered by a derived figure; and a question that cannot be worked says how to ask', async () => {
    const { reg, w, ctx } = await seed();
    const top = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'The biggest', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }], derive: [{ as: 'share', op: 'share', a: 0 }], limit: 1 }), { confirmed: false });
    expect(top.ok && top.says).toContain('Jam: 15, 50%; … 2 more groups not shown. Totals (of all 3 groups): sum of minutes 30, share 100%.');
    const byRate = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'Longest a stop first', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }, { op: 'count' }], derive: [{ as: 'minutes a stop', op: 'ratio', a: 0, b: 1 }], order: { by: 2, desc: true } }), { confirmed: false });
    expect(byRate.ok && byRate.says).toContain('Film: 12, 1, 12; Jam: 15, 2, 7.5; Label: 3, 1, 3.');
    const bad = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'x', measures: [{ op: 'sum', column: 'minutes' }], derive: [{ as: 'x', op: 'divide', a: 0 }] }), { confirmed: false });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.why).toMatch(/^derive is up to four of \{ as, op, a, b\? \}/);
    const none = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'x', groupBy: ['category'], measures: [{ op: 'avg', column: 'minutes' }], derive: [{ as: 'share', op: 'share', a: 0 }] }), { confirmed: false });
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.why).toContain('a share is of something added up or counted — “avg of minutes” is neither');
    const order = await reg.runCall(ctx(), call('query_data', { source: `stops:${w.id}`, title: 'x', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }], order: { by: 3 } }), { confirmed: false });
    expect(order.ok).toBe(false);
  });
});
