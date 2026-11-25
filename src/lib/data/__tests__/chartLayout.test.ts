import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { chartSvg } from '../chartSvg';
import { ChartCard } from '../../../colleague/AiOutputs';
import type { Chart, DataResult, Series } from '../outputs';

const spec = { resultId: 'R', type: 'bar' as const, measure: 0, title: 'A chart with every machine included' };

describe('Luna charts keep their detail', () => {
  it('grows a pie legend instead of dropping the later categories', () => {
    const labels = Array.from({ length: 18 }, (_v, i) => `Machine ${i + 1}`);
    const series: Series = { labels, values: labels.map((_v, i) => i + 1), unit: 'minutes', notes: [], measure: 'Downtime', total: 171 };
    const svg = chartSvg({ ...spec, type: 'pie' }, series);
    const height = Number(/viewBox="0 0 \d+ (\d+)"/.exec(svg)?.[1]);
    expect(height).toBeGreaterThan(500);
    expect(svg).toContain('Machine 18');
    expect(svg).toContain('minutes');
  });

  it('keeps full labels and exact values in an accessible table', () => {
    const long = 'Extremely long packing machine name that would not fit beside a bar';
    const result = { id: 'R', title: 'Downtime', source: { kind: 'dataset', id: 'D', name: 'Production log' }, query: {}, at: 0,
      result: { sheet: 'Production log', skipped: [], groupBy: ['Machine'], measures: ['Downtime'], groups: [{ key: [long], values: [73], rows: 1, refs: [] }], groupsTotal: 1, totals: [73], rowsMatched: 1, rowsScanned: 1, notes: [] },
    } as DataResult;
    const chart: Chart = { id: 'C', versions: [spec], at: 0 };
    const html = renderToStaticMarkup(createElement(ChartCard, { chart, version: 1, results: new Map([['R', result]]) }));
    expect(html).toContain(long);
    expect(html).toContain('73');
    expect(html).toContain('Production log');
    expect(html).toContain('All values and labels (1)');
  });

  it('shows exact full labels and pie shares in the phone layout', () => {
    const long = 'Extremely long packing machine name that would not fit beside a pie';
    const result = { id: 'R', title: 'Downtime', source: { kind: 'dataset', id: 'D', name: 'Production log' }, query: {}, at: 0,
      result: { sheet: 'Production log', skipped: [], groupBy: ['Machine'], measures: ['Downtime'], groups: [
        { key: [long], values: [73], rows: 1, refs: [] }, { key: ['Other machine'], values: [27], rows: 1, refs: [] },
      ], groupsTotal: 2, totals: [100], rowsMatched: 2, rowsScanned: 2, notes: [] },
    } as DataResult;
    const chart: Chart = { id: 'C', versions: [{ ...spec, type: 'pie' }], at: 0 };
    const html = renderToStaticMarkup(createElement(ChartCard, { chart, version: 1, results: new Map([['R', result]]) }));
    expect(html).toContain('ai-chart-phone-values');
    expect(html).toContain(long);
    expect(html).toContain('73% of shown values');
  });
});
