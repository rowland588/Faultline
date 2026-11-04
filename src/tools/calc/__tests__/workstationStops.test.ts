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
    expect(r.result?.tiles.find(t => t.k === 'Stopped share')?.v).toBe('7.4%');
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
});
