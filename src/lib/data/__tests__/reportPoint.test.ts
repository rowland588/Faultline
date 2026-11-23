import { describe, expect, it } from 'vitest';
import type { Chart, ConvReport, DataResult, ReportSection } from '../outputs';
import { resolveReportSection, scoreReportSections } from '../reportPoint';

const rep = (sections: ReportSection[]): ConvReport => ({
  id: 'D1', title: 'Room report', form: 'report', sections, at: 1, updated: 1, version: 2,
});
const bare = { rowsMatched: 10, rowsScanned: 100, groups: [], groupsTotal: 0, totals: [120], measures: ['sum of Minutes'], sheet: 'Downtime', groupBy: [], skipped: [], notes: [] };
const results = new Map<string, DataResult>([
  ['R1', { id: 'R1', title: 'September downtime', source: { kind: 'workbook', id: 's1', name: 'wb' }, query: { filters: [{ column: 'Date', op: 'gte', value: '2026-09-01' }], measures: [{ op: 'sum', column: 'Minutes' }] }, result: { ...bare, totals: [120] }, at: 1 }],
  ['R2', { id: 'R2', title: 'October downtime', source: { kind: 'workbook', id: 's1', name: 'wb' }, query: { filters: [{ column: 'Date', op: 'gte', value: '2026-10-01' }], measures: [{ op: 'sum', column: 'Minutes' }] }, result: { ...bare, totals: [95] }, at: 2 }],
]);
const charts = new Map<string, Chart>([
  ['C1', { id: 'C1', versions: [{ resultId: 'R1', type: 'column', measure: 0, title: 'September total' }], at: 1 }],
]);

describe('resolveReportSection', () => {
  const report = rep([
    { id: 'S1', kind: 'summary', heading: 'Executive summary', text: 'Overview.' },
    { id: 'S2', kind: 'chart', heading: 'September on screen', chartId: 'C1' },
    { id: 'S3', kind: 'finding', heading: 'Nights vs days', text: 'Nights carry more.', evidence: ['R2'] },
  ]);

  it('finds a section by heading words', () => {
    const r = resolveReportSection('executive summary', report, results, charts);
    expect(r.ok && r.section.id).toBe('S1');
  });

  it('finds the chart by position and month', () => {
    const r = resolveReportSection('the left chart for September', report, results, charts);
    expect(r.ok && r.section.id).toBe('S2');
  });

  it('ranks October against the section that rests on October', () => {
    const ranked = scoreReportSections('October', report, results, charts);
    expect(ranked[0]?.section.id).toBe('S3');
  });

  it('asks when two sections score close', () => {
    const tied = rep([{ id: 'A', kind: 'chart', heading: 'Downtime chart', chartId: 'C1' }, { id: 'B', kind: 'chart', heading: 'Downtime chart', chartId: 'C1' }]);
    const r = resolveReportSection('the downtime chart', tied, results, charts);
    expect(r.ok).toBe(false);
    expect((r as { ask?: unknown[] }).ask?.length).toBeGreaterThan(1);
  });

  it('sectionId wins when given', () => {
    expect(resolveReportSection('anything', report, results, charts, 'S3').ok).toBe(true);
  });
});

describe('scoreReportSections', () => {
  it('ranks heading matches first', () => {
    const report = rep([{ id: 'X', kind: 'text', heading: 'Sources', text: 'From the log.' }]);
    const s = scoreReportSections('sources', report, results, charts);
    expect(s[0]?.section.id).toBe('X');
  });
});