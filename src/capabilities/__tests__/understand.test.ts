/* UNDERSTANDING THE APP, THE AIM AND WHERE WORK BELONGS (src/capabilities/understand, appModel; docs/AI-CONTEXT.md — 9 November).
 * On records seeded in a fake IndexedDB: Acme Foods' Hull site with the Packing hall (Line 4, Line 5) and the Bakery (Line 1), a
 * project on Line 4 and one on Line 1; Brook Dairy's Line 4 for another client. The journeys Rowland named, at the capability
 * layer — the gateway's judgement is the acceptance script's (ai-context.mjs) with the gateway played by the script. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { ACTIVITIES, RECORD_KINDS, dayWindow } from '../appModel';
import { CAPABILITY_SCHEMAS } from '../schemas';
import { APP_TOOLS } from '../../catalogue/registry';
import type { CapCtx, CapResult, ColleagueDraft, ColleagueThread } from '../types';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const NOW = new Date('2026-11-09T10:00:00Z').getTime();
const fresh = async () => ({
  db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), conv: await import('../../colleague/conversation'),
  np: await import('../../lib/newProject'),
});
const data = <T,>(r: CapResult): T => (r.ok ? r.data as T : (() => { throw new Error(r.why); })());

async function seed() {
  const f = await fresh();
  const { db, lines, np } = f;
  const l4 = await lines.addLineToFactory('Line 4');
  const l5 = await lines.addLineToFactory('Line 5');
  const l1 = await lines.addLineToFactory('Line 1');
  const other = await lines.addLineToFactory('Dairy Line 4');
  await db.updateWorkspace({ ...l4, clientName: 'Acme Foods', siteName: 'Hull', areaName: 'Packing hall', assets: ['Filler', 'Bagger', 'Wrapper'] });
  await db.updateWorkspace({ ...l5, clientName: 'Acme Foods', siteName: 'Hull', areaName: 'Packing hall', assets: ['Filler', 'Labeller'] });
  await db.updateWorkspace({ ...l1, clientName: 'Acme Foods', siteName: 'Hull', areaName: 'Bakery', assets: ['Oven'] });
  await db.updateWorkspace({ ...other, clientName: 'Brook Dairy', siteName: 'Farm', areaName: 'Packing hall', assets: ['Filler'] });
  const p4 = await db.createProject('Line 4 improvement', '#000000', undefined, undefined, 'board', 'dmaic');
  await np.putProjectOnLines(p4.id, [l4]);
  const p1 = await db.createProject('Bakery uptime', '#000000', undefined, undefined, 'board', 'pdca');
  await np.putProjectOnLines(p1.id, [l1]);
  const dairy = await db.createProject('Dairy line 4 project', '#000000', undefined, undefined, 'board', 'pdca');
  await np.putProjectOnLines(dairy.id, [other]);
  return { ...f, l4, l5, l1, other, p4, p1, dairy };
}
async function withConversation(f: Awaited<ReturnType<typeof seed>>, thread?: { title: string; scope: ColleagueThread['scope'] }) {
  await f.db.putStudy(f.conv.newConversation({ id: 'conv', at: NOW, name: 'AI', ...(thread ? { thread: { id: 't1', ...thread } } : {}) }));
  const ctx: CapCtx = { now: NOW, conversationId: 'conv' };
  const run = (name: string, input: unknown, confirmed = false) => f.reg.runCall(ctx, { id: `c-${name}`, name, input }, { confirmed });
  const threads = async () => ((await f.db.getStudy('conv'))?.facts as { threads: ColleagueThread[] }).threads;
  const drafts = async () => ((await f.db.getStudy('conv'))?.facts as { drafts?: ColleagueDraft[] }).drafts ?? [];
  return { ctx, run, threads, drafts };
}

describe('the application model holds to the app', () => {
  it('every tool an activity names is an app tool (or the line’s Stops timed); every capability a record names is in the registry', async () => {
    const { reg } = await fresh();
    const keys = new Set(APP_TOOLS.map(t => t.key));
    for (const a of ACTIVITIES) for (const k of a.tools) expect(keys.has(k) || k === 'stops', `${a.id}: ${k}`).toBe(true);
    for (const r of RECORD_KINDS) for (const c of [...r.madeBy, ...r.readBy]) expect(reg.capabilityByName(c.split(' ')[0]), `${r.kind}: ${c}`).toBeDefined();
  });
  it('the five new capabilities are in the registry and the schemas with the same kind', async () => {
    const { reg } = await fresh();
    for (const [name, kind] of [['describe_faultline', 'read'], ['plan_work', 'read'], ['resolve_record', 'read'], ['update_context', 'local'], ['link_to_project', 'write']] as const) {
      expect(reg.capabilityByName(name)?.kind).toBe(kind);
      expect(CAPABILITY_SCHEMAS.find(s => s.name === name)?.kind).toBe(kind);
    }
  });
  it('a day said points into a window of days back', () => {
    expect(dayWindow('the machine we looked at yesterday')).toEqual({ from: 1, to: 1 });
    expect(dayWindow('the filler')).toBeUndefined();
  });
});

describe('describe_faultline — read from the app, and only what this person may do', () => {
  it('lists the records, the capabilities with what each needs, the tools and the eight methods; a client is told the writes are not open', async () => {
    const f = await seed();
    const all = data<{ records: unknown[]; capabilities: { name: string; available: boolean; needs: string[] }[]; tools: unknown[]; methods: unknown[] }>(await f.reg.runCall({ now: NOW }, { id: 'd', name: 'describe_faultline', input: {} }, { confirmed: false }));
    expect(all.records.length).toBe(RECORD_KINDS.length);
    expect(all.tools.length).toBe(APP_TOOLS.length);
    expect(all.methods.length).toBe(8);
    expect(all.capabilities.find(c => c.name === 'raise_problem')?.needs).toEqual(expect.arrayContaining(['lineId', 'words']));
    expect(all.capabilities.every(c => c.available)).toBe(true);
    const client = data<{ capabilities: { name: string; kind?: string; available: boolean }[] }>(await f.reg.runCall({ now: NOW, level: 'client' }, { id: 'd', name: 'describe_faultline', input: { about: 'capabilities' } }, { confirmed: false }));
    expect(client.capabilities.find(c => c.name === 'raise_problem')?.available).toBe(false);
    expect(client.capabilities.find(c => c.name === 'line_state')?.available).toBe(true);
  });
});

describe('plan_work — the kind of work, what is known, and the one question', () => {
  it('1 an observation analysis with no context: the activity read and the line asked for, naming the lines of the client in sight', async () => {
    const f = await seed();
    const { run } = await withConversation(f);
    const p = data<{ activity: { id: string }; ask: string; missing: string[] }>(await run('plan_work', { words: 'I want to carry out an observation analysis' }));
    expect(p.activity.id).toBe('observe');
    expect(p.missing).toContain('line');
    expect(p.ask).toMatch(/Which line/);
  });
  it('on a line with its project: the tools told apart first; standalone said — no project asked again', async () => {
    const f = await seed();
    const { run } = await withConversation(f, { title: 'Line 4', scope: { lineId: f.l4.id } });
    const p = data<{ ask: string; projectsOnLine: { name: string }[] }>(await run('plan_work', { words: 'a downtime analysis' }));
    expect(p.projectsOnLine.map(x => x.name)).toEqual(['Line 4 improvement']);
    expect(p.ask).toMatch(/stops timed|reliability/);
    await run('update_context', { mode: 'standalone' });
    const s = data<{ ask: string | null; missing: string[] }>(await run('plan_work', { words: 'analyse the changeover on the Filler', machine: 'Filler' }));
    expect(s.missing).not.toContain('project or standalone');
    expect(s.ask ?? '').not.toMatch(/project/i);
  });
  it('a changeover with no machine asks which, from the line’s machines; one already on the line is offered to carry on', async () => {
    const f = await seed();
    const { run } = await withConversation(f, { title: 'Line 4', scope: { lineId: f.l4.id } });
    const a = data<{ ask: string }>(await run('plan_work', { words: 'I want to analyse the changeover time on a packaging machine' }));
    expect(a.ask).toMatch(/Which machine — Filler, Bagger, Wrapper/);
    await f.db.putStudy({ id: 'smed1', tool: 'changeover', name: 'Filler changeover', workspaceId: f.l4.id, facts: {}, uses: [], startedAt: NOW, createdAt: NOW, updatedAt: NOW } as never);
    const b = data<{ ask: string; tools: { existing: { name: string }[] }[] }>(await run('plan_work', { words: 'the changeover on the filler', machine: 'Filler' }));
    expect(b.tools[0].existing[0].name).toBe('Filler changeover');
    expect(b.ask).toMatch(/already has SMED “Filler changeover”.*carry on/);
  });
  it('just talk: nothing is asked and nothing proposed', async () => {
    const f = await seed();
    const { run } = await withConversation(f, { title: 'What if', scope: {} });
    await run('update_context', { mode: 'talk' });
    const p = data<{ ask: string | null }>(await run('plan_work', { words: 'a downtime analysis' }));
    expect(p.ask).toBeNull();
  });
});

describe('resolve_record — one, several or none; the conversation first; never another client', () => {
  it('2 "the packing hall" in hand on Line 4 is Acme’s one area; "the filler" on the packing hall’s lines is several; Brook Dairy’s never', async () => {
    const f = await seed();
    const { run } = await withConversation(f, { title: 'Line 4', scope: { lineId: f.l4.id } });
    const area = data<{ match: string; candidates: { kind: string; label: string; sub: string }[] }>(await run('resolve_record', { words: 'the packing hall' }));
    expect(area.match).toBe('one');
    expect(area.candidates[0]).toMatchObject({ kind: 'area', label: 'Packing hall' });
    expect(area.candidates[0].sub).toContain('Acme Foods');
    const lines = data<{ match: string; candidates: { label: string }[] }>(await run('resolve_record', { words: 'line 4', kind: 'line' }));
    expect(lines.candidates.map(c => c.label)).not.toContain('Dairy Line 4');
  });
  it('3 "the existing project" from the conversation; "that line" after a correction is the corrected one; "the other client’s project" none', async () => {
    const f = await seed();
    const { run } = await withConversation(f, { title: 'Line 4', scope: { lineId: f.l4.id, projectId: f.p4.id } });
    const p = data<{ match: string; candidates: { id: string }[] }>(await run('resolve_record', { words: 'the existing project' }));
    expect(p.match).toBe('one');
    expect(p.candidates[0].id).toBe(f.p4.id);
    const none = data<{ match: string }>(await run('resolve_record', { words: 'Dairy line 4 project', kind: 'project' }));
    expect(none.match).toBe('none');
  });
  it('9 a tool record by its name, and "the investigation we did yesterday" from yesterday’s conversation', async () => {
    const f = await seed();
    const YESTERDAY = NOW - 864e5;
    await f.db.putStudy({ id: 'samp', tool: 'sampling', name: 'Packers observed', workspaceId: f.l4.id, facts: {}, uses: [], startedAt: YESTERDAY, createdAt: YESTERDAY, updatedAt: YESTERDAY } as never);
    const old = f.conv.newConversation({ id: 'old', at: YESTERDAY, name: 'AI', thread: { id: 'o1', title: 'Packers on Line 5', scope: { lineId: f.l5.id, machine: 'Labeller' } } });
    await f.db.putStudy(old);
    const { run } = await withConversation(f);
    const s = data<{ match: string; candidates: { kind: string; label: string }[] }>(await run('resolve_record', { words: 'the packers observed study' }));
    expect(s.candidates[0]).toMatchObject({ kind: 'study', label: 'Packers observed' });
    const y = data<{ candidates: { kind: string; label: string }[] }>(await run('resolve_record', { words: 'the machine we looked at yesterday', kind: 'machine' }));
    expect(y.candidates[0]).toMatchObject({ kind: 'machine', label: 'Labeller' });
  });
});

describe('update_context and link_to_project — standalone, linked, corrected', () => {
  it('4–5 a standalone draft takes no project; linked later its draft follows; made, a record is linked only by the card', async () => {
    const f = await seed();
    const { run, threads, drafts } = await withConversation(f, { title: 'Filler changeover', scope: { lineId: f.l4.id, projectId: f.p4.id } });
    await run('update_context', { mode: 'standalone', objective: 'cut the Filler changeover', machine: 'Filler' });
    let t = (await threads())[0];
    expect(t.mode).toBe('standalone');
    expect(t.scope.projectId).toBeUndefined();
    const st = data<{ draftId: string }>(await run('start_draft', { kind: 'smed', key: 'smed', title: 'Filler changeover' }));
    expect((await drafts())[0].scope).toEqual({ lineId: f.l4.id });
    /* never a second draft of the same tool for the same place */
    const again = data<{ draftId: string; again: boolean }>(await run('start_draft', { kind: 'smed', key: 'smed' }));
    expect(again).toMatchObject({ draftId: st.draftId, again: true });
    /* the card says where it goes — standalone, in no project, as said */
    const pv = await f.reg.previewCall({ now: NOW, conversationId: 'conv' }, { id: 'p', name: 'make_record', input: { draftId: st.draftId } });
    expect(pv.ok && pv.says).toMatch(/on Line 4 \(Hull › Packing hall\), standalone — in no project, as you said/);
    /* connected to the project after all: the draft follows */
    await run('update_context', { projectId: f.p4.id });
    t = (await threads())[0];
    expect(t.mode).toBe('project');
    expect((await drafts())[0].scope.projectId).toBe(f.p4.id);
    /* a project not on the line is refused, never attached silently */
    const wrong = await run('update_context', { projectId: f.p1.id });
    expect(!wrong.ok && wrong.why).toMatch(/not on this subject’s line/);
    /* made standalone, then linked by its card */
    await run('update_context', { mode: 'standalone' });
    await run('fill_draft', { draftId: st.draftId, values: [{ field: 'current', value: 42, how: 'reported' }, { field: 'target', value: 25, how: 'reported' }, { field: 'machines', value: ['Filler'], how: 'reported' }, { field: 'elements', value: ['Cleaning'], how: 'reported' }] });
    const made = await run('make_record', { draftId: st.draftId }, true);
    expect(made.ok).toBe(true);
    const rec = (await f.db.listAllStudies()).find(s => s.tool === 'changeover');
    expect(rec?.projectId).toBeUndefined();
    expect((await threads())[0].scope.studyId).toBe(rec?.id);
    expect((await run('link_to_project', { projectId: f.p4.id, studyId: rec?.id })).ok).toBe(false);   /* not without the yes */
    const lp = await f.reg.previewCall({ now: NOW, conversationId: 'conv' }, { id: 'l', name: 'link_to_project', input: { projectId: f.p4.id, studyId: rec?.id } });
    expect(lp.ok && lp.says).toMatch(/Put SMED “Filler changeover” into the project “Line 4 improvement” — it stays on Line 4/);
    expect((await run('link_to_project', { projectId: f.p4.id, studyId: rec?.id }, true)).ok).toBe(true);
    expect((await f.db.getStudy(rec?.id as string))?.projectId).toBe(f.p4.id);
    expect((await threads())[0].mode).toBe('project');
    /* another line's project refused; a second link to the same said */
    const other = await run('link_to_project', { projectId: f.p1.id, studyId: rec?.id }, true);
    expect(!other.ok && other.why).toMatch(/not the same line/);
    const twice = await run('link_to_project', { projectId: f.p4.id, studyId: rec?.id }, true);
    expect(!twice.ok && twice.why).toMatch(/already in/);
    /* a client may not link */
    const client = await f.reg.runCall({ now: NOW, conversationId: 'conv', level: 'client' }, { id: 'x', name: 'link_to_project', input: { projectId: f.p4.id, studyId: rec?.id } }, { confirmed: true });
    expect(client.ok).toBe(false);
  }, 60_000);
  it('8 a correction moves the draft to the right line and drops a project not on it; a question kept and answered', async () => {
    const f = await seed();
    const { run, threads, drafts } = await withConversation(f, { title: 'Downtime', scope: { lineId: f.l4.id, projectId: f.p4.id } });
    await run('start_draft', { kind: 'smed', key: 'smed' });
    await run('update_context', { question: 'Which shift was it on?' });
    const r = await run('update_context', { lineId: f.l5.id });
    expect(r.ok && r.says).toMatch(/Now on Line 5 \(corrected\); the project is not on that line, so it is taken off; 1 draft moved/);
    const t = (await threads())[0];
    expect(t.scope).toMatchObject({ lineId: f.l5.id });
    expect(t.scope.projectId).toBeUndefined();
    expect((await drafts())[0].scope).toEqual({ lineId: f.l5.id });
    await run('update_context', { answered: { question: 'which shift', answer: 'Nights' } });
    expect((await threads())[0].points?.find(p => p.kind === 'question')?.answered).toBe('Nights');
  });
});

describe('10 never a duplicate by default', () => {
  it('a project of the same name on the same line is refused; an open problem that says the same is named on the card', async () => {
    const f = await seed();
    const { run } = await withConversation(f, { title: 'Line 4', scope: { lineId: f.l4.id } });
    const sp = await run('start_project', { name: 'Line 4 Improvement', method: 'pdca', lineIds: [f.l4.id] }, true);
    expect(!sp.ok && sp.why).toMatch(/already a project/);
    await f.db.addSnag({ id: 's1', workspaceId: f.l4.id, problem: 'Film breaks on the wrapper twice a shift', media: [], status: 'open', raisedAt: NOW, updatedAt: NOW } as never);
    const pv = await f.reg.previewCall({ now: NOW, conversationId: 'conv' }, { id: 'r', name: 'raise_problem', input: { lineId: f.l4.id, words: 'Wrapper film breaks twice a shift', priority: 'high', how: 'reported' } });
    expect(pv.ok && pv.says).toMatch(/already has an open problem like this: “Film breaks on the wrapper twice a shift”/);
  });
});
