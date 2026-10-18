import { describe, expect, it } from 'vitest';
import { ESTABLISHED, establishedHref, isPicked } from '../established';
import { closest } from '../library';
import { MODELS } from '../../planModel';

describe("Faultline's established methods in the library", () => {
  it('are the three a job runs on screens of its own, named as the app names them', () => {
    expect(ESTABLISHED.map(e => e.id)).toEqual(MODELS.map(m => m.id));
    expect(ESTABLISHED.map(e => e.name)).toEqual(['Stage gate', '6M', 'Lever tree']);
    for (const e of ESTABLISHED) expect(e.purpose.length).toBeGreaterThan(20);
  });

  it('are found by the words a person uses for the work', () => {
    const near = (said: string) => closest(said, ESTABLISHED, 1)[0]?.id;
    expect(near('We are fitting a new case packer on Line 4 and need it proved before production takes it')).toBe('commissioning');
    expect(near('Line 2 keeps missing its packs a shift — find the cause and prove the fix')).toBe('board');
    expect(near('Hit 60 packs a minute on Line 3 by March — what has to be true for it?')).toBe('tree');
    /* a changeover is SMED's, in the library — not one of the three */
    expect(near('Changeovers on the bagger take 45 minutes and we need them under 15')).toBeUndefined();
  });

  it('start on New job with the method picked and the line carried', () => {
    expect(establishedHref('tree')).toBe('/projects?new=1&model=tree');
    expect(establishedHref('commissioning', 'line 7')).toBe('/projects?new=1&model=commissioning&line=line%207');
    expect(isPicked('board')).toBe(true);
    expect(isPicked('flow')).toBe(false);
    expect(isPicked(null)).toBe(false);
  });
});
