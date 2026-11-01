/* FC-021 — the pace and the allowance on the video study. Independent hand-worked case: Station 1's whole cycles are six of 4.0 s
   (a clip of 60 s); rated 110 -> basic 4.0 x 110 / 100 = 4.4 s; the allowance personal needs 5 + basic fatigue 4 + standing 2 = 11%
   -> standard 4.4 x 1.11 = 4.884 s -> planned floor(3600 / 4.884) = 737 an hour. Station 2: six of 6.0 s, never rated -> taken at 100,
   basic 6.0, standard 6.0 x 1.11 = 6.66. Allowance in money: 11% of a standard is 11 / 111 of it. */
import { describe, expect, it } from 'vitest';
import { findings, videoFigures } from '../study';
import { READING_VERSION, type VideoEvent, type VideoSource } from '../record';

const zones = [
  { id: 'z1', label: 'Workstation 1', track: 'Operator A', x0: 0, x1: 0.5, y0: 0, y1: 1 },
  { id: 'z2', label: 'Workstation 2', track: 'Operator B', x0: 0.5, x1: 1, y0: 0, y1: 1 },
];
const ev = (zone: string, start: number, len: number): VideoEvent => ({ id: `${zone}-${start}`, start, end: start + len, category: 'work', zone, track: zone, observed: '', confidence: 1, frames: [], basis: 'motion', review: 'accepted', pm: 0.1, provenance: { provider: 'motion', version: READING_VERSION, key: 't' } } as VideoEvent);
const events = [...[2, 12, 22, 32, 42, 52].slice(0, 5).map(s => ev('z1', s, 4)), ev('z1', 47, 4), ...[3, 13, 23, 33, 43, 53].map(s => ev('z2', s, 6))].sort((a, b) => a.start - b.start);
const base = (extra: Partial<VideoSource> = {}): Pick<VideoSource, 'facts' | 'job' | 'demand' | 'pace' | 'allowance'> => ({
  facts: { fileName: 'a.mp4', mime: 'video/mp4', bytes: 1, durationSec: 80, width: 1, height: 1, orientation: 'landscape' },
  job: { config: { sampleSec: 0.2, readWidth: 160, zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: READING_VERSION }, state: 'review', key: 'k', updatedAt: 0 } as VideoSource['job'],
  ...extra,
});
const PARTS = [{ id: 'a', name: 'Personal needs', pct: 5 }, { id: 'b', name: 'Basic fatigue', pct: 4 }, { id: 'c', name: 'Standing', pct: 2 }];

describe('a station never rated', () => {
  const f = videoFigures(base(), events);
  it('is the observed time, taken at 100 and said so; nothing about a standard is claimed', () => {
    const s1 = f.standards.find(x => x.zone === 'z1');
    expect(s1).toMatchObject({ observed: 4, rating: 100, rated: false, basic: 4, standard: 4 });
    expect(findings(f).map(x => x.text).join(' ')).toContain('Pace is not rated: footage cannot show how hard someone is working');
    expect(findings(f).some(x => /pace rated/.test(x.text))).toBe(false);
  });
  it('leaves the line balance as it was (no allowance, no rating)', () => {
    const el = f.balance.elements.find(e => e.id === 'v-z1-work');
    expect(el?.standard).toBe(el?.observed);
    expect(f.allowance).toBe(0);
  });
});

describe('rated and with an allowance (hand-worked)', () => {
  const f = videoFigures(base({ pace: { z1: 110 }, allowance: PARTS }), events);
  it('station 1: basic 4.4 s, standard 4.884 s, 737 an hour', () => {
    const s1 = f.standards.find(x => x.zone === 'z1');
    expect(s1?.rated).toBe(true); expect(s1?.rating).toBe(110);
    expect(s1?.basic).toBeCloseTo(4.4, 9); expect(s1?.standard).toBeCloseTo(4.884, 9);
    expect(Math.floor(s1?.perHour ?? 0)).toBe(737);
  });
  it('station 2: never rated, taken at 100 — basic 6.0 s, standard 6.66 s', () => {
    const s2 = f.standards.find(x => x.zone === 'z2');
    expect(s2).toMatchObject({ rating: 100, rated: false, basic: 6 });
    expect(s2?.standard).toBeCloseTo(6.66, 9);
  });
  it('the allowance is the parts added, 11%, and is said with its parts', () => {
    expect(f.allowance).toBeCloseTo(0.11, 9);
    const t = findings(f).map(x => x.text);
    expect(t).toContain('Workstation 1: pace rated 110 by the reviewer — basic 4.4 s (observed 4.0 s × 110 ÷ 100), standard 4.9 s with 11% allowance, about 737 an hour planned.');
    expect(t).toContain('Not rated yet, so taken at 100: Workstation 2.');
    expect(t).toContain('11% allowance — personal needs 5, basic fatigue 4, standing 2.');
  });
  it('the balance stays the observed work — waiting is never rated and carries no allowance', () => {
    const el = f.balance.elements.find(e => e.id === 'v-z1-work');
    expect(el?.rated).toBe(false); expect(el?.standard).toBeCloseTo(f.stations[0].workTime?.mean ?? 0, 9);
    for (const w of f.balance.elements.filter(e => e.kind === 'wait')) expect(w.standard).toBeCloseTo(w.observed ?? 0, 9);
  });
  it('the allowance in money: a missing rate is named, a given one priced as 11/111 of the standards, as rest', () => {
    expect(findings(f).some(x => /hourly rate in Line capacity/.test(x.text))).toBe(true);
    const priced = findings(f, { rate: 18 }).find(x => /It is rest the job needs, not waste/.test(x.text));
    const secs = (4.884 + 6.66) * (11 / 111);   // seconds of allowance in a piece (both stations, their standards)
    expect(priced?.text).toContain(`${secs.toFixed(1)} s of every piece`);
    expect(priced?.text).toContain(`£${((secs * 18) / 3600).toFixed(3)} of labour a pack`);
  });
});
