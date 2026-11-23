import { describe, expect, it } from 'vitest';
import { jobBatchPreview, jobWriteMayAuto, jobWriteMayBatch, JOB_WRITE_ALWAYS_ASK } from '../jobWrites';
import type { ColleagueJob } from '../../capabilities/types';

const openJob = (extra?: Partial<ColleagueJob>): ColleagueJob => ({
  goal: 'Find why and report',
  startedAt: 1,
  steps: [{ what: 'Look', status: 'doing' }],
  ...extra,
});

describe('job writes batching (G5)', () => {
  it('consequential writes never batch or auto', () => {
    const j = openJob();
    for (const name of JOB_WRITE_ALWAYS_ASK) {
      expect(jobWriteMayBatch(j, name)).toBe(false);
      expect(jobWriteMayAuto(j, name)).toBe(false);
    }
  });

  it('a finished job does not batch', () => {
    expect(jobWriteMayBatch({ ...openJob(), endedAt: 2, steps: [{ what: 'Look', status: 'done' }] }, 'add_journey_step')).toBe(false);
  });

  it('after approval, ordinary job writes may auto', () => {
    expect(jobWriteMayAuto(openJob({ writesApproved: true }), 'add_journey_step')).toBe(true);
    expect(jobWriteMayAuto(openJob({ writesApproved: true }), 'raise_problem')).toBe(false);
  });

  it('the batch card names the goal and each write', () => {
    const p = jobBatchPreview('Get it done', [
      { title: 'Raise a problem', preview: 'Jam on Line 2.' },
      { title: 'Add an action', preview: 'Chase the engineer.' },
    ]);
    expect(p).toContain('Get it done');
    expect(p).toContain('1. Raise a problem');
    expect(p).toContain('2. Add an action');
  });
});