import { describe, it, expect } from 'vitest';
import { overlapOf } from '../story';
import type { Test } from '../testing';

const step = (id: string, from: string, to: string | undefined, extra: Partial<Test> = {}): Test =>
  ({ id, projectId: 'p', kind: 'install', title: id, assetId: 'm1', plannedFor: from, plannedTo: to, outcome: 'planned', sort: 0, createdAt: 0, updatedAt: 0, ...extra }) as Test;

/* Rowland, 6 October: "this is normal, because not everything had a set date
   and some things are done at the same time ... a question: it overlaps,
   okay, yes or no." */
describe('an overlap said to be fine is not flagged', () => {
  const ahead = step('Mechanically complete', '2026-10-05', '2026-10-09');
  it('flags a step that starts inside the one ahead', () => {
    expect(overlapOf(step('Air and power', '2026-10-07', '2026-10-10'), [ahead])?.title).toBe('Mechanically complete');
  });
  it('says nothing once the overlap is said to be OK', () => {
    expect(overlapOf(step('Air and power', '2026-10-07', '2026-10-10', { overlapOk: true }), [ahead])).toBeUndefined();
  });
  it('flags again when the answer is no', () => {
    expect(overlapOf(step('Air and power', '2026-10-07', undefined, { overlapOk: false }), [ahead])?.title).toBe('Mechanically complete');
  });
  it('still names the overlap for the dates form that asks the question', () => {
    expect(overlapOf(step('Air and power', '2026-10-07', undefined, { overlapOk: true }), [ahead], true)?.title).toBe('Mechanically complete');
  });
});
