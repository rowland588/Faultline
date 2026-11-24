import { describe, expect, it } from 'vitest';
import { jobOpen } from '../job';
import type { ColleagueThread } from '../../capabilities/types';
import type { GatewayTurn } from '../conversation';
import {
  afterDeviceResults,
  afterGatewayLeg,
  applyServerLocalCalls,
  jobDeadline,
  JOB_MS,
  mayHandToServer,
  pickableJobs,
  SERVER_JOB_MAX_LEGS,
  SERVER_JOB_MS,
  serverJobSaid,
  shouldHandOff,
  type ServerJobRow,
} from '../serverJob';

const openThread = (): ColleagueThread => ({
  id: 't1', title: 'Line 2', status: 'parked', handToServer: true, scope: {}, notes: [], refs: [], at: 1,
  job: { goal: 'Find the time', startedAt: 1, steps: [{ what: 'Look', status: 'doing' }] },
});

const snap = {
  turns: [] as GatewayTurn[], focus: 'f', today: 'Mon', conversationId: 'c', threadId: 't', client: '',
  job: { goal: 'g', startedAt: 1, steps: [{ what: 'a', status: 'doing' as const }] },
};

describe('serverJob', () => {
  it('may hand off only a parked thread with an open job', () => {
    const open = openThread();
    expect(mayHandToServer(open)).toBe(true);
    expect(mayHandToServer({ ...open, handToServer: false })).toBe(false);
    expect(mayHandToServer({ ...open, status: 'current' })).toBe(false);
    expect(mayHandToServer({ ...open, job: { ...open.job!, steps: [{ what: 'x', status: 'done' }] } })).toBe(false);
  });

  it('hands off when the page is dying, or when she is not mid-ask', () => {
    const open = openThread();
    expect(shouldHandOff(open, { asking: false, leaving: false })).toBe(true);
    expect(shouldHandOff(open, { asking: true, leaving: true })).toBe(true);
    expect(shouldHandOff(open, { asking: true, leaving: false })).toBe(false);
    expect(shouldHandOff({ ...open, job: { ...open.job!, steps: [{ what: 'x', status: 'done' }] } }, { asking: false, leaving: true })).toBe(false);
  });

  it('pickable jobs respect deadline and legs', () => {
    const row: ServerJobRow = {
      id: 'j1', owner_id: 'u', conversation_id: 'c', thread_id: 't', client: '',
      status: 'queued', snapshot: { turns: [], focus: '', today: 'Mon', conversationId: 'c', threadId: 't', client: '' },
      legs: 0, max_legs: SERVER_JOB_MAX_LEGS, deadline_at: new Date(Date.now() + 60_000).toISOString(),
      started_at: null, finished_at: null, last_error: null,
    };
    expect(pickableJobs([row], Date.now())).toHaveLength(1);
    expect(pickableJobs([{ ...row, legs: SERVER_JOB_MAX_LEGS }], Date.now())).toHaveLength(0);
    expect(pickableJobs([{ ...row, deadline_at: new Date(Date.now() - 1).toISOString() }], Date.now())).toHaveLength(0);
  });

  it('overnight deadline is twelve hours, not the device ten minutes', () => {
    const start = 1_700_000_000_000;
    expect(jobDeadline(start).getTime() - start).toBe(SERVER_JOB_MS);
    expect(SERVER_JOB_MS).toBe(12 * 60 * 60_000);
    expect(SERVER_JOB_MS).toBeGreaterThan(JOB_MS);
    expect(SERVER_JOB_MAX_LEGS).toBe(24);
  });

  it('afterGatewayLeg waits on the device only for reads that need it', () => {
    const next = afterGatewayLeg(snap, { ok: true, reply: 'On it.', calls: [{ id: 'q', name: 'list_problems', input: {} }] }, 0);
    expect(next.status).toBe('waiting_device');
    expect(next.snapshot.proposedCalls).toHaveLength(1);
    expect(next.snapshot.proposedCalls?.[0].name).toBe('list_problems');
  });

  it('plan_job and job_step run on the server and the round continues', () => {
    const empty = { ...snap, job: undefined };
    const planned = afterGatewayLeg(empty, {
      ok: true, reply: 'Taking it.', assistant: { content: [] },
      calls: [{ id: 'p', name: 'plan_job', input: { goal: 'Find the time', steps: ['Look at the stops', 'Write it up'] } }],
    }, 0, 1_700);
    expect(planned.status).toBe('running');
    expect(planned.continueRound).toBe(true);
    expect(planned.snapshot.job?.steps).toHaveLength(2);
    expect(planned.snapshot.pending?.results[0].ok).toBe(true);
    expect(planned.snapshot.proposedCalls).toBeUndefined();

    const ticked = afterGatewayLeg(planned.snapshot, {
      ok: true, assistant: { content: [] },
      calls: [{ id: 's', name: 'job_step', input: { step: 1, status: 'done', note: 'Jam 15 min' } }],
    }, planned.legs, 1_701);
    expect(ticked.status).toBe('running');
    expect(ticked.snapshot.job?.steps[0].status).toBe('done');
    expect(ticked.snapshot.job?.steps[0].note).toBe('Jam 15 min');
  });

  it('a mix of local and device calls leaves only the device ones', () => {
    const next = afterGatewayLeg(snap, {
      ok: true, assistant: { content: [] },
      calls: [
        { id: 'p', name: 'plan_job', input: { goal: 'Find the time', steps: ['Look', 'Write'] } },
        { id: 'q', name: 'query_workbook', input: { sourceId: 's1' } },
      ],
    }, 0, 1_700);
    expect(next.status).toBe('waiting_device');
    expect(next.snapshot.proposedCalls?.map(c => c.name)).toEqual(['query_workbook']);
    expect(next.snapshot.pending?.results.some(r => r.id === 'p' && r.ok)).toBe(true);
  });

  it('never treats a write as something the server may run', () => {
    const next = afterGatewayLeg(snap, {
      ok: true, assistant: { content: [] },
      calls: [{ id: 'w', name: 'raise_problem', input: { title: 'Jam' } }],
    }, 0);
    expect(next.status).toBe('waiting_device');
    expect(next.snapshot.proposedCalls?.[0].name).toBe('raise_problem');
  });

  it('afterDeviceResults stores results for the next gateway round', () => {
    const out = afterDeviceResults(
      { ...snap, proposedCalls: [{ id: 'q', name: 'x', input: {} }] },
      [{ id: 'q', ok: true, says: 'Three open problems.' }],
    );
    expect(out.pending?.results).toHaveLength(1);
    expect(out.proposedCalls).toBeUndefined();
  });

  it('applyServerLocalCalls refuses a one-step plan', () => {
    const out = applyServerLocalCalls(snap, [{ id: 'p', name: 'plan_job', input: { goal: 'x', steps: ['only'] } }], 1);
    expect(out.results[0].ok).toBe(false);
    expect(out.snapshot.job?.goal).toBe('g');
  });

  it('says how far she got when the job stopped overnight', () => {
    const row: ServerJobRow = {
      id: 'j', owner_id: 'u', conversation_id: 'c', thread_id: 't', client: '',
      status: 'stopped',
      snapshot: { ...snap, reply: 'I had mapped the stops. Line 2 jam is the main loss.' },
      legs: 2, max_legs: 24, deadline_at: new Date().toISOString(),
      started_at: null, finished_at: new Date().toISOString(), last_error: 'Time for this job ran out.',
    };
    expect(serverJobSaid(row)).toMatch(/Time for this job ran out/);
    expect(serverJobSaid(row)).toMatch(/How far she got/);
    expect(serverJobSaid(row)).toMatch(/mapped the stops/);
  });

  it('jobOpen matches the job module', () => {
    const j = { goal: 'g', startedAt: 1, steps: [{ what: 'a', status: 'done' as const }, { what: 'b', status: 'todo' as const }] };
    expect(jobOpen(j)).toBe(true);
  });
});
