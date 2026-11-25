import { describe, expect, it } from 'vitest';
import { reportHtml } from '../reportHtml';
import type { Chart, ConvReport, DataResult } from '../outputs';

const result: DataResult = {
  id: 'R1', title: 'Stops <script>alert(1)</script>', at: 1,
  source: { kind: 'workbook', id: 'W1', name: 'Production log' },
  query: { groupBy: ['Line'], measures: [{ op: 'sum', column: 'Minutes' }] },
  result: { sheet: 'Stops', rowsScanned: 4, rowsMatched: 4, groupBy: ['Line'], measures: ['sum of Minutes'], groups: [
    { key: ['Line A'], values: [5], rows: 1, refs: ['Stops!A2'] },
    { key: ['Line B'], values: [9], rows: 2, refs: ['Stops!A3'] },
    { key: ['Line C'], values: [3], rows: 1, refs: ['Stops!A4'] },
  ], groupsTotal: 4, totals: [20], skipped: [], notes: [] },
};
const chart: Chart = { id: 'C1', at: 1, versions: [{ resultId: 'R1', type: 'column', measure: 0, title: 'Stops by line' }] };
const report: ConvReport = {
  id: 'D1', title: 'Shift <script>alert(1)</script>', form: 'presentation', at: 1, updated: 1, version: 1,
  sections: [
    { id: 'S1', kind: 'finding', heading: 'Result', text: 'Line B lost 9 minutes.\n\nKeep <script>bad()</script> literal.', evidence: ['R1'], unbacked: ['99'] },
    { id: 'S2', kind: 'chart', heading: 'Trend', chartId: 'C1' },
    { id: 'S3', kind: 'table', heading: 'All lines', resultId: 'R1' },
    { id: 'S4', kind: 'recommendation', heading: 'Next', text: 'Check the bagger.', by: 'luna' },
  ],
};

describe('Luna standalone HTML', () => {
  it('includes animated slides, plotted values, source evidence and honesty marks without running source text as markup', async () => {
    const blob = reportHtml({ report, results: new Map([['R1', result]]), charts: new Map([['C1', chart]]), printed: '25 November 2026' });
    const html = await blob.text();
    expect(blob.type).toBe('text/html;charset=utf-8');
    expect(html).toContain('<body class="presentation">');
    expect(html).toContain('prefers-reduced-motion');
    expect(html).toContain('All plotted values (3)');
    expect(html).toContain('class="values" open');
    expect(html).toContain('.chart{margin:18px 0;overflow-x:auto}');
    expect(html).toContain('Line C');
    expect(html).toContain('Showing 3 of 4 groups');
    expect(html).toContain('Totals across all matched rows: 20');
    expect(html).toContain('What the figures rest on');
    expect(html).toContain('Check this: 99');
    expect(html).toContain('Luna’s view, not a finding');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');
  });
});
