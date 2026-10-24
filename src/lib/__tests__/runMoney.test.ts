/* What a run's shortfall is worth and what the climb has cost so far — the
 * independent cases of knowledge/specs/FC-076-run-money.md §6 (worked by hand
 * and in scripts/knowledge/independent-cases.py), never the code's own output. */
import { describe, it, expect } from 'vitest';
import { climbWorth, runWorth } from '../runMoney';
import { readProduct } from '../run';

const line = { name: 'Line 7', packsPerMin: 60, marginPerPack: 0.04,
  shifts: [{ id: 'a', name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { id: 'b', name: 'Lates', start: '14:00', end: '22:00', breakMin: 30 }] };
const short = readProduct({ id: 'r1', product: 'Jacks Piper 1.25kg', agreed: { rate: 60, minutes: 60, rejectsMax: 1 }, day: { minutes: 60, packs: 3150, rejects: 30 } });
const met = readProduct({ id: 'r2', product: 'Finest Red 2kg', agreed: { rate: 60, minutes: 60, rejectsMax: 1 }, day: { minutes: 60, packs: 3720, rejects: 14 } });

describe('what a run’s shortfall is worth (FC-076)', () => {
  it('1 — 8 ppm short over 60 min at 4p, a day of two shifts of 7.5 h', () => {
    const w = runWorth(short, line);
    expect(w?.shortPpm).toBeCloseTo(8, 9);
    expect(w?.packs).toBeCloseTo(480, 9);
    expect(w?.contribution).toBeCloseTo(19.2, 9);
    expect(w?.dayH).toBeCloseTo(15, 9);
    expect(w?.packsDay).toBeCloseTo(7200, 9);
    expect(w?.contributionDay).toBeCloseTo(288, 9);
    expect(w?.words).toBe('8 ppm short: 480 packs over the 60 min run — £19 contribution; at this rate a day of the line’s shifts (15 h) is 7,200 packs, £288.');
  });
  it('2 — no margin on the line: the packs said, the margin asked', () => {
    const w = runWorth(short, { name: 'Line 7', shifts: line.shifts });
    expect(w?.contribution).toBeUndefined(); expect(w?.missing).toEqual(['margin']);
    expect(w?.words).toBe('8 ppm short: 480 packs over the 60 min run — give the line a margin a pack (Set up the line) to say it in money.');
    expect(runWorth(short)?.words).toBe('8 ppm short: 480 packs over the 60 min run — give the line a margin a pack (Set up the line) to say it in money.');
  });
  it('3 — no shifts: the run’s part alone', () => {
    const w = runWorth(short, { name: 'Line 7', marginPerPack: 0.04 });
    expect(w?.packsDay).toBeUndefined();
    expect(w?.words).toBe('8 ppm short: 480 packs over the 60 min run — £19 contribution.');
  });
  it('4 — a product that passed, or one not judged yet: nothing', () => {
    expect(runWorth(met, line)).toBeUndefined();
    expect(runWorth(readProduct({ id: 'r3', product: 'x', agreed: { rate: 60 }, day: {} }), line)).toBeUndefined();
    /* short on rejects alone, the rate met — the rate's shortfall is what this prices */
    const rej = readProduct({ id: 'r4', product: 'y', agreed: { rate: 60, rejectsMax: 1 }, day: { minutes: 60, packs: 3800, rejects: 100 } });
    expect(rej.state).toBe('short'); expect(runWorth(rej, line)).toBeUndefined();
  });
  it('5 — the climb: runs at 52 and 56 against 60, 60 min each → 720 packs, £28.80; at the rate, nothing', () => {
    const pts = [{ on: '2026-10-19', net: 52, minutes: 60, testId: 't', runId: 'a' }, { on: '2026-10-21', net: 56, minutes: 60, testId: 't', runId: 'b' }];
    const w = climbWorth({ points: pts, agreed: 60 }, line);
    expect(w?.packs).toBeCloseTo(720, 9); expect(w?.runs).toBe(2); expect(w?.contribution).toBeCloseTo(28.8, 9);
    expect(w?.words).toBe('The climb so far: 720 packs below the agreed 60 over 2 runs — £29 contribution.');
    expect(climbWorth({ points: pts, agreed: 60 })?.words).toBe('The climb so far: 720 packs below the agreed 60 over 2 runs — give the line a margin a pack (Set up the line) to say it in money.');
    expect(climbWorth({ points: [{ on: '2026-10-19', net: 62, minutes: 60, testId: 't', runId: 'a' }], agreed: 60 }, line)).toBeUndefined();
    expect(climbWorth({ points: [{ on: '2026-10-19', net: 52, testId: 't', runId: 'a' }], agreed: 60 }, line)).toBeUndefined();
  });
});
