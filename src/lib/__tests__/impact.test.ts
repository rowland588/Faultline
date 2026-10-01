/* "Did it work?" — a closed action against the line's readings, either side of
 * the day it closed. Same proof the Wins use; allowed to say no. */
import { describe, it, expect } from 'vitest';
import { impactOfAction } from '../impact';
import type { Measure, Reading } from '../measures';
import type { PaceTodoRow } from '../../db';

const ppm: Measure = { id: 'm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 1 };
const waste: Measure = { id: 'w', name: 'Waste', unit: '%', direction: 'down', sort: 2 };
const rd = (measureId: string, at: string, value: number): Reading =>
  ({ id: measureId + at, projectId: 'p', lineId: 'L', measureId, at, value, createdAt: 1, updatedAt: 1 });
const step = (o: Partial<PaceTodoRow> = {}): PaceTodoRow =>
  ({ id: 's', projectId: 'p', lineId: 'L', what: 'Fit the jaw', where: '', why: '', who: 'Dave', when: '', state: 'done', doneOn: '2026-09-15', createdAt: 1, updatedAt: 1, ...o });

const rising = [
  rd('m', '2026-09-01', 40), rd('m', '2026-09-08', 41), rd('m', '2026-09-12', 40),
  rd('m', '2026-09-15', 47), rd('m', '2026-09-22', 48), rd('m', '2026-09-29', 49), rd('m', '2026-10-01', 48),
];

describe('did it work?', () => {
  it('splits the readings on the day it closed, and says what moved', () => {
    const i = impactOfAction(step(), ppm, rising);
    expect(i.state).toBe('proven');
    expect(i.proof).toMatchObject({ beforeN: 3, afterN: 4 });
    expect(i.words).toBe('Packs per minute: 40.3 → 48 ppm · +19% · 3 before · 4 after');
  });
  it('lets the answer be no — and reads the direction from the measure', () => {
    const worse = impactOfAction(step(), waste, [
      rd('w', '2026-09-01', 2), rd('w', '2026-09-08', 2.1), rd('w', '2026-09-15', 3), rd('w', '2026-09-22', 3.2),
    ]);
    expect(worse.state).toBe('worse');           // waste went UP — not a win
  });
  it('is too soon until two readings have come in since it closed', () => {
    const soon = impactOfAction(step({ doneOn: '2026-10-01' }), ppm, rising);
    expect(soon.state).toBe('soon');
    expect(soon.words).toBe('Too soon to say — 1 reading since it closed');
  });
  it('says nothing when there is nothing to judge it by', () => {
    expect(impactOfAction(step({ doneOn: undefined }), ppm, rising).state).toBe('none');   // no day it closed
    expect(impactOfAction(step({ state: 'todo' }), ppm, rising).state).toBe('none');       // not done
    expect(impactOfAction(step(), ppm, []).state).toBe('none');                            // no readings
    expect(impactOfAction(step({ lineId: undefined }), ppm, rising).state).toBe('none');   // on no line
    expect(impactOfAction(step(), undefined, rising).state).toBe('none');                  // no measure
  });
});
