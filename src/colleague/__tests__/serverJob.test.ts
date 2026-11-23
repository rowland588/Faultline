import { describe, expect, it } from 'vitest';
import { jobOpen } from '../job';
import type { ColleagueThread } from '../../capabilities/types';
import {
  afterDeviceResults,
  afterGatewayLeg,
  jobDeadline,
  mayHandToServer,
  pickableJobs,
  type ServerJobRow,
} from '../serverJob';

describe('serverJob', () => {
  it('may hand off only a parked thread with an open job', () => {
    const open: ColleagueThread = {
      id: 't1', title: 'Line 2', status: 'parked', handToServer: true, scope: {}, notes: [], refs: [], at: 1,
      job: { goal: 'Find the time', startedAt: 1, steps: [{ what: 'Look', status: 'doing' }] },
    };
    expect(mayHandToServer(open)).toBe(true);
    expect(mayHandToServer({ ...open, handToServer: false })).toBe(false);
    expect(mayHandToServer({ ...open, status: 'current' })).toBe(false);
    expect(mayHandToServer({ ...open, job: { ...open.job!, steps: [{ what: 'x', status: 'done' }] } })).toBe(false);
  });

  it('pickable jobs respect deadline and legs', () => {
    const row: ServerJobRow = {
      id: 'j1', owner_id: 'u', conversation_id: 'c', thread_id: 't', client: '',
      status: 'queued', snapshot: { turns: [], focus: '', today: 'Mon', conversationId: 'c', threadId: 't', client: '' },
      legs: 0, max_legs: 4, deadline_at: new Date(Date.now() + 60_000).toISOString(),
      started_at: null, finished_at: null, last_error: null,
    };
    expect(pickableJobs([row], Date.now())).toHaveLength(1);
    expect(pickableJobs([{ ...row, legs: 4 }], Date.now())).toHaveLength(0);
    expect(pickableJobs([{ ...row, deadline_at: new Date(Date.now() - 1).toISOString() }], Date.now())).toHaveLength(0);
  });

  it('afterGatewayLeg waits on the device when there are capability calls', () => {
    const snap = { turns: [], focus: 'f', today: 'Mon', conversationId: 'c', threadId: 't', client: '', job: { goal: 'g', startedAt: 1, steps: [{ what: 'a', status: 'doing' as const }] } };
    const next = afterGatewayLeg(snap, { ok: true, reply: 'On it.', calls: [{ id: 'q', name: 'list_problems', input: {} }] }, 0);
    expect(next.status).toBe('waiting_device');
    expect(next.snapshot.proposedCalls).toHaveLength(1);
  });

  it('afterDeviceResults stores results for the next gateway round', () => {
    const snap = { turns: [], focus: '', today: '', conversationId: 'c', threadId: 't', client: '', proposedCalls: [{ id: 'q', name: 'x', input: {} }] };
    const out = afterDeviceResults(snap, [{ id: 'q', ok: true, says: 'Three open problems.' }]);
    expect(out.pending?.results).toHaveLength(1);
    expect(out.proposedCalls).toBeUndefined();
  });

  it('deadline matches JOB_MS from colleagueAsk', () => {
    const start = 1_700_000_000_000;
    expect(jobDeadline(start).getTime() - start).toBe(10 * 60_000);
  });

  it('jobOpen matches the job module', () => {
    const j = { goal: 'g', startedAt: 1, steps: [{ what: 'a', status: 'done' as const }, { what: 'b', status: 'todo' as const }] };
    expect(jobOpen(j)).toBe(true);
  });
});