import { describe, expect, it } from 'vitest';
import { handOverFor } from '../handOvers';
import { freezeFrom } from '../../tools/chart/chart';
import type { AgreedChart, StudyReading, ToolStudy } from '../study';

const rs = (vals: number[]): StudyReading[] => vals.map((v, i) => ({ id: `r${i}`, value: v, at: 1000 + i }));
const steady = Array.from({ length: 30 }, (_, i) => 400 + (((i * 7) % 5) - 2) * 0.4);
const drifting = Array.from({ length: 30 }, (_, i) => 395 + i * 0.35);
const study = (tool: ToolStudy['tool'], agreed: ToolStudy['agreed'], vals: number[], extra: Partial<ToolStudy> = {}): ToolStudy =>
  ({ id: 's', tool, name: 'Fill weight', agreed, facts: { readings: rs(vals) }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, ...extra });
const cap = (vals: number[]) => study('capability', { readings: { kind: 'limits', count: 30, unit: 'g', nominal: 400, lower: 390, upper: 410 } }, vals);
const chart = (vals: number[], over: Partial<AgreedChart> = {}, freeze = true) => {
  const a: AgreedChart = { kind: 'xmr', name: 'Fill weight', unit: 'g', lower: 390, upper: 410, ...over };
  const frozen = freeze ? freezeFrom(a, rs(vals), 1, Math.min(20, vals.length)) : undefined;
  return study('chart', { chart: { ...a, ...(frozen ? { frozen } : {}) } }, vals);
};

describe('hand-overs — the two fixed rules', () => {
  it('a capability study that says the run was not steady hands over to the chart, with the tool’s own words', () => {
    const h = handOverFor(cap(drifting))!;
    expect(h.target).toBe('chart');
    expect(h.says).toMatch(/not steady/);
    expect(h.because).toMatch(/^Not steady — /);
  });
  it('a steady capability study hands over nothing', () => { expect(handOverFor(cap(steady))).toBeUndefined(); });
  it('too few readings for the checks, or counts: nothing', () => {
    expect(handOverFor(cap(drifting.slice(0, 8)))).toBeUndefined();
    expect(handOverFor(study('capability', { readings: { kind: 'rejects', count: 6 } }, drifting))).toBeUndefined();
  });
  it('a steady chart with its limits set and the specification known hands over to capability', () => {
    const h = handOverFor(chart(steady))!;
    expect(h.target).toBe('capability');
    expect(h.says).toMatch(/Check capability/);
    expect(h.because).toMatch(/30 readings/);
  });
  it('a chart with a signal, with provisional limits, with no specification, short-run, or not individuals: nothing', () => {
    expect(handOverFor(chart(drifting))).toBeUndefined();
    expect(handOverFor(chart(steady, {}, false))).toBeUndefined();
    expect(handOverFor(chart(steady, { lower: undefined, upper: undefined }))).toBeUndefined();
    expect(handOverFor(chart(steady, { products: true }))).toBeUndefined();
    expect(handOverFor(chart(steady, { kind: 'precontrol' as never }))).toBeUndefined();
  });
  it('no other tool hands over', () => { expect(handOverFor(study('analysis', { analysis: { kind: 'sure', name: 'x', of: 'mean' } }, drifting))).toBeUndefined(); });
});
