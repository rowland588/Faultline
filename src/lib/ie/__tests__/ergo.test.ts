/* The NIOSH lift, proved by docs/TOOLKIT.md §11's worked example (CCOHS). */
import { describe, it, expect } from 'vitest';
import { hm, vm, dm, am, fm, cm, rwlFrom, assessLift, liftBand, CAVEAT } from '../ergo';

describe('the NIOSH lifting equation (tool 11)', () => {
  it('23 × 0.83 × 0.78 × 0.85 × 1 × 1 × 0.90 = 11.4 kg; 13 ÷ 11.4 = 1.14', () => {
    const rwl = rwlFrom({ hm: 0.83, vm: 0.78, dm: 0.85, am: 1, fm: 1, cm: 0.90 });
    expect(rwl).toBeCloseTo(11.4, 1);
    expect(13 / rwl).toBeCloseTo(1.14, 2);
    expect(liftBand(13 / rwl)).toBe('increased');
  });
  it('the multipliers from the measurements: 30 cm out → 0.83; from 2 cm up → 0.78; 150 cm of travel → 0.85; no twist → 1', () => {
    expect(hm(30)).toBeCloseTo(0.833, 3); expect(hm(20)).toBe(1); expect(hm(70)).toBe(0);
    expect(vm(2)).toBeCloseTo(0.781, 3); expect(vm(75)).toBe(1); expect(vm(180)).toBe(0);
    expect(dm(150)).toBeCloseTo(0.85, 6); expect(dm(10)).toBe(1); expect(dm(200)).toBe(0);
    expect(am(0)).toBe(1); expect(am(90)).toBeCloseTo(0.712, 3); expect(am(140)).toBe(0);
  });
  it('the frequency table: a slow lift for an hour is 1.00; 4 a minute for a shift from low is 0.45; a frequency between rows takes the row above', () => {
    expect(fm(0.2, 1, 50)).toBe(1.00);
    expect(fm(4, 8, 50)).toBe(0.45);
    expect(fm(9, 8, 50)).toBe(0); expect(fm(9, 8, 80)).toBe(0.15);
    expect(fm(2.5, 1, 50)).toBe(0.88);
    expect(fm(16, 1, 80)).toBe(0);
  });
  it('the coupling table: good 1; fair 0.95 low, 1 high; poor 0.90', () => {
    expect(cm('good', 30)).toBe(1); expect(cm('fair', 30)).toBe(0.95); expect(cm('fair', 80)).toBe(1); expect(cm('poor', 80)).toBe(0.90);
  });
  it('the whole lift from the floor to 150 cm, poor grip, once in a while: 13 kg is over the limit', () => {
    const r = assessLift({ loadKg: 13, hCm: 30, vCm: 2, dCm: 150, aDeg: 0, liftsPerMin: 0.2, hours: 1, coupling: 'poor' });
    expect(r.rwl).toBeCloseTo(11.45, 1);
    expect(r.band).toBe('increased');
    expect(r.sentence).toBe('Lift: 13 kg against a limit of 11.5 kg — index 1.14, increased risk.');
    expect(r.notes).toEqual([]);
  });
  it('a task beyond the equation says so instead of a number', () => {
    const r = assessLift({ loadKg: 10, hCm: 70, vCm: 50, dCm: 30, aDeg: 0, liftsPerMin: 1, hours: 1, coupling: 'good' });
    expect(r.rwl).toBe(0); expect(r.band).toBe('outside');
    expect(r.sentence).toBe('Lift: 10 kg — the task is outside the equation\'s range (the hands are more than 63 cm out — beyond the equation).');
  });
  it('the bands: at or under 1 nominal, to 3 increased, over 3 high', () => {
    expect(liftBand(0.9)).toBe('nominal'); expect(liftBand(1)).toBe('nominal'); expect(liftBand(2.9)).toBe('increased'); expect(liftBand(3.1)).toBe('high');
    expect(CAVEAT).toMatch(/not a full risk assessment/);
  });
});
