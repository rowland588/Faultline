/* FC-241 — hand-worked cases (knowledge/specs/FC-241-workstation-stops.md §6) */
import { describe, expect, it } from 'vitest';
import def, { MAX_STATIONS, wid } from '../defs/workstation-stops';
import { runCalc } from '../calc';

const base = { unit: 'kg', same: 'same', per: 'min', rate: 12 };
describe('stops across workstations', () => {
  it('case A: 8.5, 22 and 5.25 minutes at 12 kg a minute lose 429 kg; the worst is 61.5%', () => {
    const r = runCalc(def, { n: 4, ...base, [wid(0, 'min')]: 8.5, [wid(2, 'min')]: 22, [wid(3, 'min')]: 5.25, watched: 120, unitCost: 2.1 });
    expect(r.blocked).toBe(false);
    expect(r.result?.verdict).toBe('429 kg lost');
    expect(r.result?.more?.join(' ')).toContain('stopped for 7.4% of the 2 hours watched');
    expect(r.result?.money?.text).toContain('£900.90');
  });
  it('case B: an hourly rate divides by 60', () => {
    const r = runCalc(def, { n: 2, unit: 'units', same: 'own', per: 'hour', [wid(0, 'min')]: 15, [wid(0, 'rate')]: 600, [wid(1, 'min')]: 6, [wid(1, 'rate')]: 1800 });
    expect(r.result?.verdict).toBe('330 units lost');
  });
  it('the unit changes the word, not the number', () => {
    const a = runCalc(def, { n: 1, ...base, [wid(0, 'min')]: 10 }).result;
    const b = runCalc(def, { n: 1, ...base, unit: 'packs', [wid(0, 'min')]: 10 }).result;
    expect(a?.verdict).toBe('120 kg lost'); expect(b?.verdict).toBe('120 packs lost');
  });
  it('case C: nothing stopped loses nothing', () => {
    const r = runCalc(def, { n: 3, ...base });
    expect(r.result?.sentence).toBe('None of 3 workstations has stopped yet.');
    expect(r.problems.some(p => /No workstation has stopped/.test(p.say))).toBe(true);
  });
  it('stops with no minutes are said', () => {
    const r = runCalc(def, { n: 2, ...base, [wid(1, 'stops')]: 2, [wid(0, 'min')]: 1 });
    expect(r.problems.some(p => /2 stops counted but no minutes/.test(p.say))).toBe(true);
  });
  it('thirty workstations total as worked', () => {
    const inputs: Record<string, number | string> = { n: MAX_STATIONS, ...base };
    for (let i = 0; i < MAX_STATIONS; i++) inputs[wid(i, 'min')] = i + 1;
    expect(runCalc(def, inputs).result?.verdict).toBe('5,580 kg lost'); // 465 min × 12
  });

  describe('part 2 — carried forward, with the confidence (SciPy cases)', () => {
    const A = { n: 4, ...base, [wid(0, 'min')]: 8.5, [wid(0, 'stops')]: 3, [wid(2, 'min')]: 22, [wid(2, 'stops')]: 2, [wid(3, 'min')]: 5.25, [wid(3, 'stops')]: 1, watched: 120 };
    const said = (i: Record<string, number | string>): string => (runCalc(def, i).result?.more ?? []).join(' ');
    it('8 hours at 95%: 1,716 kg between 629.7 and 3,735, Rough, 66 stops and 20 hours more', () => {
      const t = said({ ...A, horizon: '8' });
      expect(t).toContain('Carried on for 8 hours: about 1,716 kg lost — between 629.7 and 3,735 kg at 95% confidence — from 6 stops in 2 hours of watching.');
      expect(t).toContain('Confidence: Rough.');
      expect(t).toContain('rests on the 6 stops counted, not on the minutes watched');
      expect(t).toContain('About 66 stops — roughly 20 hours more watching');
    });
    it('a chip changes the figure and the chart’s end; the confidence changes the range', () => {
      const r1 = runCalc(def, { ...A, horizon: '1', conf: '90' }).result;
      expect(r1?.tiles.find(t => t.k === 'If it goes on')?.v).toBe('214.5');
      expect(r1?.tiles.find(t => t.k === 'Confidence')?.of).toBe('90% range 93.4 to 423.4');
      const pic = r1?.picture;
      expect(pic?.lines.length).toBe(3);
      expect(pic?.dots.length).toBe(2);
      const r99 = runCalc(def, { ...A, horizon: '1', conf: '99' }).result;
      expect(r99?.tiles.find(t => t.k === 'Confidence')?.of).toBe('99% range 54.9 to 559.8');
    });
    it('a week asks the hours a week and never guesses; another takes typed hours', () => {
      expect(said({ ...A, horizon: 'week' })).toContain('Give the hours the line runs in a week');
      expect(said({ ...A, horizon: 'week', weekH: 120 })).toContain('Carried on for a week (120 hours): about 25,740 kg lost');
      expect(said({ ...A, horizon: '1', customH: 6 })).toContain('Carried on for 6 hours: about 1,287 kg lost');
      expect(said({ ...A, customH: 2000 })).toContain('Carried on for 2,000 hours');
    });
    it('says how confidence grows: the stops needed at the chosen level, and that minutes alone do not help', () => {
      const t = said({ ...A, conf: '99' });
      expect(t).toContain('at 99% it takes 29 stops to be Fair (within ±50%) and 111 to be Firm (within ±25%). You have 6.');
      expect(said({ ...A, conf: '90' })).toContain('at 90% it takes 13 stops to be Fair');
      expect(said({ ...A, watched: 2000 })).toContain('You have 6.');
    });
    it('watching longer at the same rate narrows the range', () => {
      const wide = runCalc(def, { ...A, horizon: '8' }).result?.tiles.find(t => t.k === 'Confidence')?.of;
      const long = runCalc(def, { ...A, horizon: '8', watched: 1200, [wid(0, 'min')]: 85, [wid(0, 'stops')]: 30, [wid(2, 'min')]: 220, [wid(2, 'stops')]: 20, [wid(3, 'min')]: 52.5, [wid(3, 'stops')]: 10 }).result?.tiles.find(t => t.k === 'Confidence')?.of;
      expect(wide).toBe('95% range 629.7 to 3,735');
      expect(long).toBe('95% range 1,309.5 to 2,208.8');
    });
    it('no stop seen says the count’s upper bound and carries nothing; no time watched asks for it', () => {
      expect(said({ n: 2, ...base, watched: 60, horizon: '8' })).toContain('No stop has been seen in the 1 hour watched. At 95% confidence fewer than 3.7 stops');
      expect(said({ n: 2, ...base, [wid(0, 'min')]: 5 })).toContain('Give the time you have watched');
    });
    it('minutes with no stops counted: the point figure and the reason there is no range', () => {
      const t = said({ n: 1, ...base, [wid(0, 'min')]: 10, watched: 60, horizon: '8' });
      expect(t).toContain('about 960 kg lost — but no range can be given because some workstations have minutes stopped but no stops counted');
    });
  });
});
