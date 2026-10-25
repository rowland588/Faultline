/* FC-096 — readings that are not bell-shaped: the capability study fits the four shapes and says the tail beside the count as measured.
 * The independent figures are SciPy's (scripts/knowledge/cases-w3c.py); the study’s own sentences, tiles and tones are exactly as before. */
import { describe, it, expect } from 'vitest';
import { capabilityWords, modeNotes, sample, sampleSays } from '../sample';
import type { AgreedReadings, StudyReading } from '../../../lib/study';

const OXYGEN = [0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38, 0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8];
const STOPS = [18.4, 78.4, 15.1, 14.5, 23.6, 17.3, 42.7, 10.8, 66.7, 60.8, 1.0, 34.2, 10.2, 18.8, 27.2, 29.2, 30.0, 73.1, 18.8, 15.0, 42.7, 78.3, 72.0, 64.0, 7.4, 75.4, 41.2, 62.7, 26.7, 16.7, 53.1, 42.1, 51.7, 15.7, 11.9, 50.3, 3.5, 78.0, 12.0, 37.9];
const FILLS = [249.0, 248.4, 249.7, 250.5, 251.4, 250.1, 249.3, 249.1, 250.9, 252.0, 250.3, 248.5, 248.9, 251.9, 250.2, 247.9, 249.9, 248.6, 249.2, 249.4, 249.1, 250.7, 249.9, 249.3, 250.5, 251.0, 248.0, 249.7, 248.8, 249.8, 248.5, 250.0, 250.0, 249.6, 248.7, 249.5, 248.7, 248.4, 250.3, 248.7];
const rs = (vs: number[]): StudyReading[] => vs.map((value, i) => ({ id: `r${i + 1}`, value, at: i }));
const note = (a: AgreedReadings, vs: number[]) => modeNotes(sample(a, rs(vs)), a).find(n => n.k === 'fitted');

describe('the fitted note on a study whose readings are not bell-shaped', () => {
  it('oxygen at most 2%: no shape fits — the share outside is the count; the lognormal is nearest (A–D p 0.00057)', () => {
    const A: AgreedReadings = { kind: 'limits', unit: '%', upper: 2, count: 30 };
    const n = note(A, OXYGEN)!;
    expect(n).toEqual({ k: 'fitted', tone: 'a', text: 'Not bell-shaped, and no shape tried fits (the lognormal is nearest, Anderson–Darling p = 0.00057) — the share outside is the count as measured: 0 of 30 are over 2 %.' });
  });
  it('stops at least 10 minutes: a Weibull fits (p 0.15) — 12 in 100 would be short, Ppk 0.69 by the percentile method (SciPy 0.1199, 0.6901)', () => {
    const A: AgreedReadings = { kind: 'limits', unit: 'min', lower: 10, count: 30 };
    const n = note(A, STOPS)!;
    expect(n.tone).toBe('a');
    expect(n.text).toBe('Not bell-shaped, so the tail is fitted: a Weibull fits (Anderson–Darling p = 0.15) — 12.0% would be under 10 min, Ppk 0.69 by the percentile method; as counted, 3 of 40 are under 10 min. The Weibull’s tail from 40 readings is a model’s reach, not a measurement.');
  });
  it('the study’s own sentences, tones and tiles are exactly what they were', () => {
    const A: AgreedReadings = { kind: 'limits', unit: '%', upper: 2, count: 30 };
    const f = sample(A, rs(OXYGEN)), w = capabilityWords(f, A)!;
    expect(w.text).toMatch(/^Capable: Ppk 2\.\d\d from 30/);
    expect(w.text).toMatch(/but the readings were not steady, so it may not hold/);
    expect(w.tone).toBe('a');
    expect(sampleSays(f, A).verdict).toBe('Passed');
  });
  it('a percentile Ppk at or above 1.33 is neutral, never green (the study’s own rule for readings that are not bell-shaped)', () => {
    const A: AgreedReadings = { kind: 'limits', unit: 'min', upper: 300, count: 30 };
    const n = note(A, STOPS)!;
    expect(n.tone).toBe('n'); expect(n.text).toMatch(/Ppk 2\.\d\d by the percentile method/);
  });
  it('bell-shaped readings, no limit, fewer than 20 readings, a pass-or-fail, a packers study: no note', () => {
    expect(note({ kind: 'limits', unit: 'g', lower: 247, upper: 253, count: 30 }, FILLS)).toBeUndefined();
    expect(note({ kind: 'limits', unit: '%', count: 30 }, OXYGEN)).toBeUndefined();
    expect(note({ kind: 'limits', unit: '%', upper: 2, count: 30 }, OXYGEN.slice(0, 15))).toBeUndefined();
    expect(note({ kind: 'packers', unit: 'g', nominal: 400, count: 30 }, OXYGEN)).toBeUndefined();
    expect(sample({ kind: 'ticks', count: 20 } as AgreedReadings, []).fitted).toBeUndefined();
  });
});
