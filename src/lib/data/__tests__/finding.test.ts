/* A CHART SAYS WHAT IT SHOWS (docs/LUNA-NEXT.md L5) — worked by hand: Jam 35, Film 10, Label 3 (48): Jam 72.9%; to 80% takes Jam and Film
 * (45 / 48 = 93.75%); weeks 25, 30, 48: up 23 (92%); against a target of 20 all 3 above, the furthest Jam; against before 10, 12, 3: higher
 * in 1 of 3 (Label 3 = 3 is not higher), the biggest difference Jam +25. */
import { describe, it, expect } from 'vitest';
import { findingOf } from '../outputs';
import { chartSvg } from '../chartSvg';

const s = { labels: ['Jam', 'Film', 'Label'], values: [35, 10, 3], unit: 'min' };
describe('findingOf', () => {
  it('says the biggest, the 80%, the trend, the target and the comparison', () => {
    expect(findingOf({ type: 'column' }, s)).toEqual({ text: 'Jam is the biggest: 35 min of the 48 min shown (72.9%).', mark: 0 });
    expect(findingOf({ type: 'pareto' }, s)?.text).toBe('The top 2 (Jam, Film) make up 93.8% of the 48 min shown.');
    expect(findingOf({ type: 'line' }, { labels: ['W1', 'W2', 'W3'], values: [25, 30, 48], unit: 'min' })).toEqual({ text: 'From 25 min (W1) to 48 min (W3) — up 23 min (92%); the highest 48 min at W3.', mark: 2 });
    expect(findingOf({ type: 'column', target: 20 }, s)?.text).toBe('1 of 3 above the target of 20 min — the furthest Jam.');
    expect(findingOf({ type: 'column', compareLabel: 'The week before' }, { ...s, compare: [10, 12, 3] })?.text).toBe('Higher than the week before in 1 of 3; the biggest difference Jam, +25 min.');
    expect(findingOf({ type: 'column' }, { labels: ['A'], values: [3], unit: '' })).toBeUndefined();
  });
  it('is drawn on the chart, and its value marked', () => {
    const svg = chartSvg({ resultId: 'R', type: 'column', measure: 0, title: 'Downtime' }, { ...s, notes: [], measure: 'sum of minutes', total: 48, finding: 'Jam is the biggest: 35 min of the 48 min shown (72.9%).', mark: 0 });
    expect(svg).toContain('data-finding="1">Jam is the biggest: 35 min of the 48 min shown (72.9%).</text>');
  });
});
