/* WHERE A MACHINE STANDS, IN WORDS (lib/install machineAt). Rowland, 5
 * October: a machine still due on site read "at Install". */
import { describe, it, expect } from 'vitest';
import { machineAt, machinesWhere } from '../install';
import type { Asset } from '../testing';

const asset = (o: Partial<Asset>): Asset => ({ id: 'a', projectId: 'p', name: 'Domino coder', state: 'onSite', sort: 1, updatedAt: 1, ...o } as Asset);
const gates = (tones: ('done' | 'going' | 'late' | 'ahead' | 'none')[]) =>
  ['Install', 'Set up', 'Commission', 'Hand over'].map((label, i) => ({ label, tone: tones[i] }));

describe('where a machine stands', () => {
  it('a machine not here yet is due on site, whatever its gates say', () => {
    const w = machineAt(asset({ state: 'awaited', dueOn: '2026-10-02' }), gates(['late', 'none', 'none', 'none']));
    expect(w).toEqual({ says: 'due on site', short: 'Due on site', due: true });
  });
  it('one on site is at the gate its work is in', () => {
    expect(machineAt(asset({ onSiteOn: '2026-09-20' }), gates(['done', 'going', 'none', 'none'])).says).toBe('at Set up');
  });
  it('one through every gate is handed over', () => {
    expect(machineAt(asset({ runningOn: '2026-10-01' }), gates(['done', 'done', 'done', 'done']))).toMatchObject({ says: 'Handed over', short: 'Handed over' });
  });
  it('counts them in one line, each place said its own way', () => {
    expect(machinesWhere(['Due on site', 'Install', 'Install', 'Handed over'])).toBe('1 due on site · 2 at Install · 1 handed over');
  });
});
