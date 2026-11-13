/* CONVERSATIONAL DATA, pure (docs/CONVERSATIONAL-DATA.md): a dataset is asked as a workbook is; not recorded is never zero; a field a
 * source does not hold is named; a chart is drawn only from a result and keeps its versions; a finding's figure no result holds is
 * flagged; a file is never picked because it is newest. Hand-worked figures. */
import { describe, it, expect } from 'vitest';
import { fieldCoverage, missingFields, runTable, NOT_RECORDED, type Dataset } from '../table';
import { stopsDataset, testsDataset } from '../datasets';
import { applyReportOp, seriesOf, unbackedFigures, specChange, type Chart, type ChartSpec, type ConvReport, type DataResult } from '../outputs';
import { resolveSource, suggestName, type Source } from '../sources';
import { chartSvg } from '../chartSvg';
import type { Observation } from '../../../types';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 2, 8);   // Mon 2 Nov 2026 08:00
const ob = (o: Partial<Observation>): Observation => ({ id: Math.random().toString(36).slice(2), workspaceId: 'L2', category: 'Jam', asset: 'Bagger', startedAt: T0, durationMs: 0, timing: 'stopwatch', count: 1, media: [], createdAt: T0, updatedAt: T0, ...o });

const stops = stopsDataset({ id: 'L2', name: 'Line 2' }, [
  ob({ category: 'Jam', durationMs: 10 * 60_000, shift: 'A' }),
  ob({ category: 'Jam', durationMs: 5 * 60_000, shift: 'B', startedAt: T0 + DAY }),
  ob({ category: 'Film', durationMs: 12 * 60_000, shift: 'A', asset: 'Wrapper' }),
  ob({ category: 'Film', timing: 'instant', durationMs: 0 }),           // counted only — no minutes, not zero
  ob({ category: 'Label', durationMs: 3 * 60_000, startedAt: T0 + 8 * DAY }),
  ob({ category: 'Jam', workspaceId: 'L9', durationMs: 99 * 60_000 }),  // another line — never in Line 2's
]);

describe('the table engine', () => {
  it('sums minutes by category, a count-only stop not counted as zero minutes, another line never in it', () => {
    const r = runTable(stops, { groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }, { op: 'count' }] });
    expect(r.rowsScanned).toBe(5);
    expect(r.groups.map(g => [g.key[0], g.values[0], g.values[1]])).toEqual([['Jam', 15, 2], ['Film', 12, 2], ['Label', 3, 1]]);
    expect(r.totals).toEqual([30, 5]);
    expect(r.notes.join(' ')).toMatch(/1 of the 5 matching rows have no minutes recorded — they are not counted as zero/);
  });
  it('a group with nothing recorded is "(not recorded)", and an average of nothing is null, not 0', () => {
    const r = runTable(stops, { groupBy: ['shift'], measures: [{ op: 'sum', column: 'minutes' }] });
    expect(r.groups.find(g => g.key[0] === NOT_RECORDED)?.values[0]).toBe(3);   // Label 3 min with no shift; the counted Film has none
    const onlyCounted = runTable(stops, { filters: [{ column: 'how known', op: 'eq', value: 'counted' }], measures: [{ op: 'avg', column: 'minutes' }] });
    expect(onlyCounted.totals[0]).toBeNull();
  });
  it('by week (ISO), filtered by a date range, and a field it does not hold refused with what it holds', () => {
    const r = runTable(stops, { time: { column: 'day', by: 'week' }, measures: [{ op: 'sum', column: 'minutes' }] });
    expect(r.groups.map(g => [g.key[0], g.values[0]])).toEqual([['2026-W45', 27], ['2026-W46', 3]]);
    const between = runTable(stops, { filters: [{ column: 'day', op: 'between', from: '2026-11-03', to: '2026-11-09' }], measures: [{ op: 'count' }] });
    expect(between.totals[0]).toBe(1);
    expect(missingFields(stops, { groupBy: ['downtime class'], measures: [{ op: 'count' }] })).toEqual(['downtime class']);
    expect(() => runTable(stops, { groupBy: ['downtime class'], measures: [{ op: 'count' }] })).toThrow(/holds no “downtime class” — it holds day, hour, line/);
  });
  it('says what the stops cannot hold', () => {
    expect(stops.limits.join(' ')).toMatch(/no separate downtime classification such as mechanical/);
    const none = stopsDataset({ id: 'L3', name: 'Line 3' }, [ob({ workspaceId: 'L3' })]);
    expect(none.limits.join(' ')).toMatch(/No stop on this line has its shift recorded/);
    expect(fieldCoverage(stops).find(f => f.name === 'minutes')).toMatchObject({ recorded: 4, of: 5, min: 3, max: 12 });
  });
  it('a trial’s net rate only when minutes, packs and rejects were all written', () => {
    const d: Dataset = testsDataset({ id: 'L2', name: 'Line 2' },
      [{ id: 't1', projectId: '', title: 'Test 1', programId: 'p1', outcome: 'passed', runs: [{ id: 'r1', product: '1.25 kg', agreed: { rate: 75 }, day: { minutes: 60, packs: 3600, rejects: 30, speed: 75 }, ranOn: '2026-11-04' }, { id: 'r2', product: '2 kg', day: { minutes: 30, packs: 900 } }], sort: 0, createdAt: 0, updatedAt: 0 }],
      [{ id: 'p1', projectId: '', workspaceId: 'L2', what: 'PR-07', state: 'testing', sort: 0, createdAt: 0, updatedAt: 0 } as never], [], () => true);
    const r = runTable(d, { groupBy: ['product'], measures: [{ op: 'avg', column: 'net rate' }, { op: 'avg', column: 'short of aim' }] });
    expect(r.groups.map(g => [g.key[0], g.values[0], g.values[1]])).toEqual([['1.25 kg', 59.5, 15.5], ['2 kg', null, null]]);
    expect(r.notes.join(' ')).toMatch(/“net rate” is worked out by Faultline: \(packs − rejects\) ÷ minutes/);
  });
});

const res = (id: string, groups: [string, number | null][], title = id): DataResult => ({
  id, title, at: 0, source: { kind: 'dataset', id: 'stops:L2', name: 'Line 2 — stops' }, query: { groupBy: ['shift'], measures: [{ op: 'sum', column: 'minutes' }] },
  result: { sheet: 'x', rowsScanned: 10, rowsMatched: 10, groups: groups.map(([k, v]) => ({ key: [k], values: [v], rows: 1, refs: [] })), groupsTotal: groups.length, totals: [groups.reduce((s, [, v]) => s + (v ?? 0), 0)], measures: ['sum of minutes'], groupBy: ['shift'], skipped: [], notes: [] },
});

describe('charts', () => {
  const R1 = res('R1', [['Shift 1', 120], ['Shift 2', 60], ['Shift 3', 20]]);
  const R0 = res('R0', [['Shift 1', 100], ['Shift 2', 80]]);
  const results = new Map([[R1.id, R1], [R0.id, R0]]);
  const base: ChartSpec = { resultId: 'R1', type: 'column', measure: 0, title: 'Downtime by shift' };
  it('percentages of what is shown, a category left out, compared with another result', () => {
    const p = seriesOf({ ...base, percent: true }, results);
    expect('why' in p ? p.why : p.values).toEqual([60, 30, 10]);
    const x = seriesOf({ ...base, percent: true, exclude: ['Shift 3'] }, results);
    expect('why' in x ? x.why : [x.values, x.notes[0]]).toEqual([[66.7, 33.3], 'Left out: Shift 3.']);
    const c = seriesOf({ ...base, compareResultId: 'R0', compareLabel: 'Previous week' }, results);
    expect('why' in c ? c.why : [c.compare, c.notes.join(' ')]).toEqual([[100, 80, null], 'Previous week has no value for Shift 3.']);
  });
  it('a value not recorded is said and drawn as a gap, never a zero', () => {
    const s = seriesOf({ resultId: 'R2', type: 'column', measure: 0, title: 't' }, new Map([['R2', res('R2', [['A', 5], ['B', null]])]]));
    if ('why' in s) throw new Error(s.why);
    expect(s.notes.join(' ')).toMatch(/Not recorded \(no value, not zero\): B/);
    expect(chartSvg({ resultId: 'R2', type: 'column', measure: 0, title: 't' }, s)).toMatch(/n\/r/);
  });
  it('what changed between versions, in words', () => {
    const chart: Chart = { id: 'C1', at: 0, versions: [base, { ...base, percent: true }, { ...base, percent: true, exclude: ['Shift 3'] }] };
    expect(specChange(chart.versions[1], chart.versions[2])).toBe('left out Shift 3');
    expect(specChange(chart.versions[0], chart.versions[1])).toBe('percentages');
    expect(chartSvg(chart.versions[2], seriesOf(chart.versions[2], results) as never)).toMatch(/<svg[\s\S]*Downtime by shift[\s\S]*Shift 1/);
  });
});

describe('a report built section by section', () => {
  const R1 = res('R1', [['Shift 1', 120], ['Shift 2', 60], ['Shift 3', 20]]);
  const results = new Map([[R1.id, R1]]);
  const charts = new Map<string, Chart>([['C1', { id: 'C1', at: 0, versions: [{ resultId: 'R1', type: 'column', measure: 0, title: 'x' }] }]]);
  let n = 0; const mk = () => `S${++n}`;
  const r0: ConvReport = { id: 'D1', title: 'Downtime', form: 'report', sections: [], at: 0, updated: 0, version: 1 };
  it('a finding rests on results; its figures checked — 120 and 60% held, 75 not', () => {
    expect(unbackedFigures('Shift 1 lost 120 minutes, 60% of the 200; Shift 2 lost 75.', [R1])).toEqual(['75']);
    const a = applyReportOp(r0, { op: 'add', section: { kind: 'chart', heading: 'By shift', chartId: 'C1' } }, results, charts, mk, 1);
    if (!a.ok) throw new Error(a.why);
    const b = applyReportOp(a.r, { op: 'add', section: { kind: 'finding', heading: 'Shift 1 loses most', text: 'Shift 1 lost 120 minutes — 60% of all.', evidence: ['R1'] } }, results, charts, mk, 2);
    if (!b.ok) throw new Error(b.why);
    expect(b.r.sections.map(s => s.kind)).toEqual(['chart', 'finding']);
    expect(b.r.sections[1].unbacked).toBeUndefined();
    const nope = applyReportOp(b.r, { op: 'add', section: { kind: 'finding', heading: 'x', text: 'Shift 3 is fine.' } }, results, charts, mk, 3);
    expect(!nope.ok && nope.why).toMatch(/A finding rests on a result/);
    const flagged = applyReportOp(b.r, { op: 'replace', sectionId: b.r.sections[1].id, section: { text: 'Shift 1 lost 125 minutes.' } }, results, charts, mk, 4);
    expect(flagged.ok && flagged.r.sections[1].unbacked).toEqual(['125']);
    const rec = applyReportOp(b.r, { op: 'add', section: { kind: 'recommendation', heading: 'Train nights', text: 'Retrain the 22 people on nights.', by: 'luna' }, after: 'start' }, results, charts, mk, 5);
    expect(rec.ok && [rec.r.sections[0].kind, rec.r.sections[0].unbacked]).toEqual(['recommendation', undefined]);
    const gone = applyReportOp(b.r, { op: 'remove', sectionId: b.r.sections[0].id }, results, charts, mk, 6);
    expect(gone.ok && gone.r.sections.map(s => s.heading)).toEqual(['Shift 1 loses most']);
    const slides = applyReportOp(b.r, { op: 'form', form: 'presentation' }, results, charts, mk, 7);
    expect(slides.ok && [slides.r.form, slides.r.sections.length, slides.r.version]).toEqual(['presentation', 2, 4]);
  });
});

describe('the register', () => {
  const src = (id: string, name: string, fileName: string, at: number, extra: Partial<Source['facts']> = {}): Source => ({ id, at, facts: { name, named: 'person', fileName, kind: 'workbook', bytes: 1, at, fileId: `wb-${id}`, status: 'ready', ...extra } });
  const NOW = Date.UTC(2026, 10, 10);
  const list = [
    src('a', 'BrilloPak Speed Trials', 'brillo_trials_v3.xlsx', NOW - 2 * DAY),
    src('b', 'Packing line 1 downtime', 'pl1.xlsx', NOW - 9 * DAY, { sheets: [{ name: 'Downtime', rows: 900, columns: [] }] }),
    src('c', 'Packing line 2 downtime', 'pl2.xlsx', NOW - 3 * DAY, { sheets: [{ name: 'Downtime', rows: 700, columns: [] }] }),
  ];
  it('one meant by name, the two packing workbooks asked between, last week’s by when it came in, none said so', () => {
    expect('one' in resolveSource(list, 'open BrilloPak speed trials', NOW) && (resolveSource(list, 'open BrilloPak speed trials', NOW) as { one: Source }).one.id).toBe('a');
    const two = resolveSource(list, 'the packing line downtime workbook', NOW);
    expect('ask' in two && two.ask.map(s => s.id).sort()).toEqual(['b', 'c']);
    const lw = resolveSource(list, "last week's downtime workbook", NOW);
    expect('one' in lw && lw.one.id).toBe('b');
    expect(resolveSource(list, 'the yield file', NOW)).toEqual({ none: true });
    const l2 = resolveSource(list, 'packing line 2 downtime', NOW);
    expect('one' in l2 && l2.one.id).toBe('c');   /* the number tells line 2 from line 1 */
    expect(suggestName('brillo_trials_v3.xlsx', [{ name: 'A', rows: 1, columns: [] }, { name: 'B', rows: 1, columns: [] }])).toBe('Brillo Trials V3 (2 sheets)');
  });
});
