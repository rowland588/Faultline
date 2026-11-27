import { describe, expect, it } from 'vitest';
import { lunaTurnDepthNote } from '../colleagueTurnDepth';
import type { ColleagueAsk } from '../colleagueAssist';

const base: ColleagueAsk = {
  task: 'colleague', turns: [{ role: 'person', text: 'How is Line 3?', at: '09:00' }], images: [], focus: 'Current: Line 3', today: 'Monday',
};

describe('lunaTurnDepthNote', () => {
  it('asks for depth on a pending round without changing effort config', () => {
    const ask: ColleagueAsk = { ...base, pending: { carry: { v: 1, rounds: [], content: [], refused: [] }, results: [] } };
    expect(lunaTurnDepthNote(ask)).toMatch(/mid-answer/i);
  });

  it('asks for depth when a job is in hand', () => {
    expect(lunaTurnDepthNote({ ...base, focus: 'JOB IN HAND: find why and report' })).toMatch(/job is in hand/i);
  });

  it('asks for depth on a second look', () => {
    const ask: ColleagueAsk = {
      ...base,
      turns: [...base.turns, { role: 'person', text: "(From the app's own check, not the person.", at: '09:01' }],
    };
    expect(lunaTurnDepthNote(ask)).toMatch(/sent your answer back/i);
  });
});