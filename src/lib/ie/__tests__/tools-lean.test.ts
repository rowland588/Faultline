/* THE LEAN PAGE, SLICE 6 (docs/LEAN-PAGE.md) — work sampling (lib/ie/
 * samplingLean), the capability study (lib/ie/sampleLean) and the value
 * stream (lib/ie/flowLean): each tool's tiles and closing line, read from its
 * own module. Work sampling's money: the biggest share not the work × the
 * shift's hours × one person's rate (the line's wage × on-costs). */
import { describe, expect, it } from 'vitest';
import { personRate, samplingClosing, samplingTiles, worstCost } from '../../../tools/sampling/samplingLean';
import { sampleClosing, sampleTiles } from '../../../tools/capability/sampleLean';
import { flowClosing, flowTiles } from '../../../tools/valuestream/flowLean';
import { samplingSays } from '../../../tools/sampling/sampling';
import { sample, sampleSays } from '../../../tools/capability/sample';
import { flowFigures } from '../../../tools/valuestream/steps';
import type { AgreedReadings, AgreedSampling, FlowStep, Tap } from '../../study';

const H = 3_600_000;
const a: AgreedSampling = { who: ['Op 1'], activities: ['working', 'walking', 'waiting'], marginPts: 5, from: 0, to: 8 * H, prompts: Array.from({ length: 40 }, (_, i) => (i + 1) * 0.2 * H) };
/* 40 taps: 30 working, 10 waiting — waiting 25% of the shift */
const taps: Tap[] = a.prompts.map((at, i) => ({ id: `t${i}`, at, who: 'Op 1', activity: i < 30 ? 'working' : 'waiting' }));
const at = { done: 40, come: 40, missed: 0, over: true };

describe('work sampling’s tiles — the biggest share not the work, in money', () => {
  it('waiting 25% of an 8 h shift at £14.50 × 1.3 on-costs = £37.70 a shift', () => {
    const rate = personRate({ labourRatePerHour: 14.5, labourBurden: 1.3 });
    expect(rate).toBeCloseTo(18.85, 6);
    expect(worstCost(a, taps, rate)?.cost).toBeCloseTo(37.7, 6);
    const t = samplingTiles(a, taps, at, rate);
    expect(t.map(x => [x.k, x.v])).toEqual([['Taps', '40'], ['People', '1'], ['Biggest share not the work', '25%'], ['What it costs', '£37.70'], ['Next moment', '—']]);
    expect(t[3].of).toBe('a shift — Op 1 waiting 25% of 8 h at £18.85 an hour');
    expect(samplingClosing(a, taps, samplingSays(a, taps), rate).text).toMatch(/^Op 1 is waiting 25% of the time \(±\d+ points, from 40 taps\) — £37\.70 of their time a shift\.$/);
  });
  it('no wage on the line: what to give; a bottleneck walk: no labour figure', () => {
    expect(samplingTiles(a, taps, at)[3]).toEqual({ k: 'What it costs', v: '—', of: 'give the line its wage and on-costs on the Factory’s Lines page' });
    expect(samplingTiles({ ...a, walk: true }, taps, at).map(x => x.k)).toEqual(['Taps', 'Stations', 'Biggest share not the work', 'Next moment', 'Missed']);
  });
});

describe('the capability study’s tiles', () => {
  it('readings of those agreed, the mean and range, outside the limits, Ppk once there are enough', () => {
    const ag: AgreedReadings = { kind: 'limits', lower: 495, upper: 505, unit: 'g', count: 5 };
    const readings = [500, 501, 499, 502, 506].map((value, i) => ({ id: `r${i}`, at: i, value }));
    const f = sample(ag, readings), said = sampleSays(f, ag);
    expect(sampleTiles(f, ag, said).map(x => [x.k, x.v, x.of, x.tone])).toEqual([
      ['Readings', '5', 'of 5 agreed', undefined],
      ['Mean', '502 g', '499–506 across the readings', undefined], // to the readings' own decimal places
      ['Outside', '1', 'of 495–505 g', 'r'],
      ['Ppk', '—', 'said from 25 readings · 5 so far', undefined],
    ]);
    expect(sampleClosing(f, ag, said).text).toBe(`${said.verdict} — 5 of 5 readings in, 1 outside.`);
  });
});

describe('the value stream’s paper tiles and closing line', () => {
  it('the cards as tiles; the lead time, where to start, a cycle over takt in red', () => {
    let n = 0;
    const st = (o: Partial<FlowStep> & Pick<FlowStep, 'name' | 'kind'>): FlowStep => ({ id: `s${n}`, order: n++, lane: 'Line 2', ...o });
    const flow = [
      st({ name: 'Plan the run', lane: 'Planning', kind: 'operation', value: 'needed', cycleSec: 1200, waitSec: 86_400 }),
      st({ name: 'Wrap and seal', kind: 'operation', value: 'adds', cycleSec: 2 }),
    ];
    const agreed = { demandPerDay: 300, availableSecPerDay: 900 };
    const f = flowFigures(flow, agreed);
    expect(flowTiles(f, flow).map(x => x.k)).toEqual(['Lead time', 'Adds value', 'Necessary', 'Non-value adding', 'Cycle time']);
    const c = flowClosing(f, agreed);
    expect(c.tone).toBe('r');
    expect(c.text).toMatch(/^.+ lead time, .+ of it adding value — start with the biggest wait: Plan the run \(Planning\), .+; Plan the run is over takt \(20 min against 3\.0 s\) — where the stream is limited\.$/);
    expect(flowClosing(flowFigures([], undefined)).tone).toBe('n');
  });
});
