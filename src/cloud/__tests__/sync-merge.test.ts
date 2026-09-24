import { describe, it, expect } from 'vitest';
import { remoteWins } from '../sync';

/* WHICH COPY OF A ROW WINS WHEN TWO DEVICES HOLD IT.
 *
 * The live fault this guards: a phone types the result, a laptop pulls, and
 * because the laptop's own clock was ahead its stale copy "won" and the
 * result never showed. Clocks decide only when both sides changed. */
describe('a row from the cloud against the one we hold', () => {
  it('is our own echo when the clocks match, and does nothing', () => {
    expect(remoteWins(100, 100, true)).toBe(false);
    expect(remoteWins(100, 100, false)).toBe(false);
  });

  it('replaces ours when the cloud accepted our copy and now holds something else — whatever the clocks say', () => {
    expect(remoteWins(200, 150, true)).toBe(true);   // remote clock BEHIND ours: still written after
    expect(remoteWins(100, 150, true)).toBe(true);
  });

  it('a device a year fast can still be updated by the others', () => {
    const yearAhead = Date.parse('2027-09-24');
    expect(remoteWins(yearAhead, Date.parse('2026-09-24'), true)).toBe(true);
  });

  it('keeps our unpushed edit when its clock is the newer one', () => {
    expect(remoteWins(200, 150, false)).toBe(false);
  });

  it('takes the cloud\u2019s when both changed and theirs is newer — the one loss that remains', () => {
    expect(remoteWins(100, 150, false)).toBe(true);
  });
});
