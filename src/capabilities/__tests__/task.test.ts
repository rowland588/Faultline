/* THE TASK-LED APPLICATION (src/capabilities/task; docs/AI-TASK.md — 10 November). Rowland: "I think we're losing too much
 * production time on this line. Can you help me understand why? — They should not need to know where to start." On a line seeded
 * in a fake IndexedDB: the task read from the person's words, the line's own evidence step by step (known · old · not done), ONE
 * next step with its reason and never a menu, the task kept on the conversation, and its progress read from the records as they
 * are made — a step done since the task began, the next step moving on. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx, CapResult, ColleagueThread } from '../types';
import type { Observation } from '../../types';

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const DAY = 86_400_000;
const data = <T,>(r: CapResult): T => (r.ok ? r.data as T : (() => { throw new Error(r.why); })());
type Step = { key: string; status: string; finding?: string; sinceTask?: boolean };
type Understood = { task: string; steps: Step[]; next?: { key: string; why: string }; missing?: string[] };

async function seed() {
  const db = await import('../../db'), reg = await import('../registry'), lines = await import('../../lib/lines'), conv = await import('../../colleague/conversation');
  const line = await lines.addLineToFactory('Line 2A');
  await db.updateWorkspace({ ...line, assets: ['Filler', 'Bagger', 'Wrapper'] });
  const now = Date.now();
  await db.putStudy(conv.newConversation({ id: 'conv', at: now, name: 'AI', thread: { id: 't1', title: 'Line 2A', scope: { lineId: line.id } } }));
  const ctx: CapCtx = { now, conversationId: 'conv', me: 'Rowland' };
  const run = (name: string, input: unknown, at = now) => reg.runCall({ ...ctx, now: at }, { id: `c-${name}-${Math.random()}`, name, input }, { confirmed: true });
  const stop = (at: number, asset: string, category: string, min: number): Observation => ({ id: `o-${at}-${asset}`, workspaceId: line.id, category, asset, startedAt: at, endedAt: at + min * 60_000, durationMs: min * 60_000, timing: 'stopwatch' } as Observation);
  const threads = async () => ((await db.getStudy('conv'))?.facts as { threads: ColleagueThread[] }).threads;
  return { db, reg, line, now, run, stop, threads };
}

describe('understand_task — the task read from the line’s own evidence', () => {
  it('lost production time on a line with nothing: everything not done, start with timing the stops — one step, its reason, no menu', async () => {
    const { run, line } = await seed();
    const r = await run('understand_task', { words: 'I think we’re losing too much production time on this line. Can you help me understand why?' });
    const u = data<Understood>(r);
    expect(u.task).toBe('losttime');
    expect(u.steps.map(s => s.key)).toEqual(['stops', 'losses', 'linebalance', 'reliability', 'sixm']);
    expect(u.steps.every(s => s.status === 'not done')).toBe(true);
    expect(u.next?.key).toBe('stops');
    if (r.ok) {
      expect(r.says).toMatch(/Nothing on the line bears on this yet/);
      expect(r.says).toMatch(/Next: Stops timed — where the line’s time goes/);
      expect(r.says).toMatch(/never a list of tools to choose from/);
      expect(r.show?.href).toBe(`/w/${line.id}/capture`);
    }
  }, 60_000);

  it('stops timed this week are known in their own words; the next step moves on to the loss count', async () => {
    const { run, db, now, stop } = await seed();
    await db.addObservation(stop(now - 2 * DAY, 'Wrapper', 'Film break', 40));
    await db.addObservation(stop(now - DAY, 'Filler', 'Jam', 10));
    const u = data<Understood>(await run('understand_task', { words: 'we are losing production' }));
    const stops = u.steps.find(s => s.key === 'stops');
    expect(stops?.status).toBe('known');
    expect(stops?.finding).toMatch(/50 min lost in 2 stops — the Wrapper most, 40 min/);
    expect(u.next?.key).toBe('losses');
  }, 60_000);

  it('stops older than four weeks are old, and timing them again is the next step', async () => {
    const { run, db, now, stop } = await seed();
    await db.addObservation(stop(now - 40 * DAY, 'Wrapper', 'Film break', 40));
    const u = data<Understood>(await run('understand_task', { words: 'lost production on this line' }));
    expect(u.steps.find(s => s.key === 'stops')?.status).toBe('old');
    expect(u.next?.key).toBe('stops');
  }, 60_000);

  it('with no line in hand it asks for the line first and keeps nothing', async () => {
    const { reg, now } = await seed();
    const r = await reg.runCall({ now }, { id: 'x', name: 'understand_task', input: { words: 'we are losing production time' } }, { confirmed: false });
    expect(data<Understood>(r).missing).toEqual(['line']);
  }, 60_000);

  it('other kinds of task take their own route: rejects start at capability', async () => {
    const { run } = await seed();
    const u = data<Understood>(await run('understand_task', { words: 'rejects are up on the sealer, the seal strength is drifting' }));
    expect(u.task).toBe('quality');
    expect(u.next?.key).toBe('capability');
  }, 60_000);
});

describe('keep_task and task_state — the task carried through the conversation', () => {
  it('kept on the current subject; a stop timed after it began marks the step done since, and the next step moves on', async () => {
    const { run, db, line, now, stop, threads } = await seed();
    /* the task begins a minute ago; the stop is timed a second ago — inside the four weeks whatever the clock reads next */
    const k = await run('keep_task', { goal: 'Understand why Line 2A is losing production time', lineId: line.id, task: 'losttime' }, now - 60_000);
    expect(k.ok).toBe(true);
    const t = (await threads()).find(x => x.status === 'current');
    expect(t?.task).toMatchObject({ goal: 'Understand why Line 2A is losing production time', kind: 'losttime', lineId: line.id, steps: ['stops', 'losses', 'linebalance', 'reliability', 'sixm'] });
    expect(t?.objective).toBe('Understand why Line 2A is losing production time');

    let s = data<{ steps: Step[]; next?: { key: string } }>(await run('task_state', {}));
    expect(s.next?.key).toBe('stops');
    expect(s.steps.some(x => x.sinceTask)).toBe(false);

    const at = Date.now() - 1000;
    await db.addObservation({ ...stop(at, 'Wrapper', 'Film break', 0), endedAt: undefined, timing: 'instant' });
    const later = await run('task_state', {}, now + 2 * 60 * 60_000);
    s = data<{ steps: Step[]; next?: { key: string } }>(later);
    expect(s.steps.find(x => x.key === 'stops')).toMatchObject({ status: 'known', sinceTask: true });
    expect(s.next?.key).toBe('losses');
    if (later.ok) expect(later.says).toMatch(/Done since: Stops timed/);
  }, 60_000);

  it('kept again with the same goal keeps its start; no task said plainly', async () => {
    const { run, line, threads } = await seed();
    expect(data<{ task: null }>(await run('task_state', {})).task).toBeNull();
    await run('keep_task', { goal: 'Lost time on 2A', lineId: line.id });
    const first = (await threads()).find(x => x.status === 'current')?.task?.startedAt;
    await run('keep_task', { goal: 'Lost time on 2A', lineId: line.id }, Date.now() + 5000);
    expect((await threads()).find(x => x.status === 'current')?.task?.startedAt).toBe(first);
  }, 60_000);
});
