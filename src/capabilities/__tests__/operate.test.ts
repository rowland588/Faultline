/* OPERATING THE APPLICATION (docs/AI-OPERATING.md) — every tool has a connector; each connector part does what the tool itself does:
 * a live measurement writes the same records its capture screen writes (an observation, a reliability event, a sampling tap, a SMED
 * element, a workstation's minutes), takes them back as the tool's Undo does and corrects them at the moment they happened; a diagram
 * said aloud becomes the tool's own record; a document is a Line Talk with its document; readings go into the record; the analysis is
 * the Analysis tool's own; a report is the app's paper made on arrival. Run through runCall — the one door the colleague uses. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), conv: await import('../../colleague/conversation'), con: await import('../connectors') });
const call = (name: string, input: unknown) => ({ id: `c-${name}-${Math.random()}`, name, input });
const MIN = 60_000;

async function seed() {
  const f = await fresh();
  const a = await f.lines.addLineToFactory('Line A');
  const t = Date.now();
  await f.db.putStudy(f.conv.newConversation({ id: 'conv', at: t, name: 'A talk' }));
  await f.db.putStudy({ id: 'cap', tool: 'capability', name: 'Seal strength', workspaceId: a.id, agreed: { readings: { kind: 'limits', unit: 'N', nominal: 20, lower: 15, upper: 25, count: 30 } }, facts: { readings: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  let clock = t;
  const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: clock, conversationId: 'conv', me: 'Rowland', ...o });
  const run = (name: string, input: unknown, o: Partial<CapCtx> = {}, confirmed = true) => f.reg.runCall(ctx(o), call(name, input), { confirmed });
  const tick = (ms: number) => { clock += ms; return clock; };
  return { ...f, a, run, tick, at: () => clock };
}

describe('the connectors', () => {
  it('every tool a person can open has a connector, and each part claimed is real', async () => {
    const { con } = await fresh();
    const { APP_TOOLS } = await import('../../catalogue/registry');
    for (const t of APP_TOOLS) expect(con.connectorOf(t.key), t.key).toBeDefined();
    const { CAPTURE_ADAPTERS } = await import('../connectors/measure');
    for (const c of con.CONNECTORS) {
      if (c.capture) expect(CAPTURE_ADAPTERS[c.capture], c.key).toBeDefined();
      expect(con.partsOf(c)).toContain('read');
    }
    /* every tool filled from the conversation, or captured live — only the video study (the camera, docs/AI-OPERATING.md §7) is neither */
    const noFill = con.CONNECTORS.filter(c => !con.partsOf(c).includes('fill')).map(c => c.key).sort();
    expect(noFill).toEqual(['reliability', 'sampling', 'stops', 'video']);
    for (const k of noFill.filter(k => k !== 'video')) expect(con.connectorOf(k)?.capture, k).toBeDefined();
    /* every capability a connector names to fill it is one the registry runs */
    const { capabilityByName } = await import('../registry');
    for (const c of con.CONNECTORS) for (const f of c.fillBy ?? []) expect(capabilityByName(f.split(' ')[0]), `${c.key}: ${f}`).toBeDefined();
    /* a calculator that is a tool of its own is that tool's record, not just a calculation */
    expect(con.connectorForStudy({ id: 'x', tool: 'calc', name: 'x', agreed: { calc: { key: 'workstation-stops', inputs: {} } }, facts: {}, uses: [], startedAt: 0, createdAt: 0, updatedAt: 0 })?.key).toBe('workstops');
  }, 60_000);

  it('tool_guide says the kinds of work apart and filters by them', async () => {
    const { run } = await seed();
    const r = await run('tool_guide', { intent: 'measure' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const tools = (r.data as { tools: { key: string; capture?: unknown }[] }).tools;
    expect(tools.map(x => x.key).sort()).toEqual(['changeover', 'reliability', 'sampling', 'stops', 'workstops']);
    expect(Object.keys((r.data as { intents: object }).intents)).toEqual(['report', 'fill', 'measure', 'calculate', 'analyse', 'investigate']);
  }, 60_000);
});

describe('a live measurement — confirmed once, then captured as the capture screen does', () => {
  it('Stops timed: stopped and running keep an observation with its time; undo and correct; nothing captured without a session', async () => {
    const { run, tick, db, a } = await seed();
    expect((await run('capture_event', { event: 'stopped', machine: 'Wrapper', reason: 'Film break' })).ok).toBe(false);
    expect((await run('start_measurement', { tool: 'stops', lineId: a.id }, {}, false)).ok).toBe(false);   // a write: waits for yes
    const s = await run('start_measurement', { tool: 'stops', lineId: a.id });
    expect(s.ok && s.show?.href).toBe(`/w/${a.id}/capture`);
    const t0 = tick(1000);
    expect((await run('capture_event', { event: 'stopped', machine: 'Wrapper', reason: 'Film break' }, { saidAt: t0 - 500 })).ok).toBe(true);
    expect((await db.getWorkspace(a.id))?.activeTimer).toMatchObject({ asset: 'Wrapper', category: 'Film break', startedAt: t0 - 500 });
    tick(2 * MIN);
    const r = await run('capture_event', { event: 'running' });
    expect(r.ok).toBe(true);
    let obs = await db.listObservations(a.id);
    expect(obs).toHaveLength(1);
    expect(obs[0]).toMatchObject({ asset: 'Wrapper', category: 'Film break', timing: 'stopwatch', startedAt: t0 - 500, durationMs: 2 * MIN + 500 });
    expect((await db.getWorkspace(a.id))?.activeTimer).toBeUndefined();
    /* correct — the same moment, the right machine */
    const c = await run('correct_capture', { as: { event: 'running' } });
    expect(c.ok).toBe(false);   // the stop it closed is gone once taken back; a running needs a stop open
    obs = await db.listObservations(a.id);
    expect(obs).toHaveLength(0);
    /* a count with no time, then undo */
    await run('capture_event', { event: 'count', machine: 'Filler', reason: 'Jam' });
    expect(await db.listObservations(a.id)).toHaveLength(1);
    expect((await run('undo_capture', {})).ok).toBe(true);
    expect(await db.listObservations(a.id)).toHaveLength(0);
    const st = await run('measurement_state', {});
    expect(st.ok && (st.data as { running: boolean }).running).toBe(true);
    expect((await run('end_measurement', {})).ok).toBe(true);
    expect((await run('capture_event', { event: 'count', machine: 'Filler', reason: 'Jam' })).ok).toBe(false);
  }, 60_000);

  it('a correction is written again at the moment it happened', async () => {
    const { run, tick, db, a } = await seed();
    await run('start_measurement', { tool: 'stops', lineId: a.id });
    const t0 = tick(1000);
    await run('capture_event', { event: 'count', machine: 'Wrapper', reason: 'Jam' });
    tick(5 * MIN);
    const r = await run('correct_capture', { as: { event: 'count', machine: 'Filler' } });
    expect(r.ok).toBe(true);
    const obs = await db.listObservations(a.id);
    expect(obs).toHaveLength(1);
    expect(obs[0]).toMatchObject({ asset: 'Filler', category: 'Jam', startedAt: t0 });
  }, 60_000);

  it('Reliability: the watch runs, events are the study’s own, a timed stop closes, the end stops the watch', async () => {
    const { run, tick, db, a } = await seed();
    const s = await run('start_measurement', { tool: 'reliability', lineId: a.id, machine: 'Wrapper', counts: ['stop', 'failure'] });
    expect(s.ok).toBe(true);
    const study = (await db.listStudiesForLine(a.id)).find(x => x.tool === 'reliability');
    expect(study?.facts.watch?.[0]?.to).toBeUndefined();
    tick(MIN); await run('capture_event', { event: 'event', count: 'stops' });
    tick(MIN); await run('capture_event', { event: 'event', count: 'failure', reason: 'Heater' });
    const ev = (await db.getStudy(study!.id))?.facts.events ?? [];
    expect(ev).toHaveLength(2);
    expect(ev[1]).toMatchObject({ reason: 'Heater', by: 'Rowland' });
    await run('undo_capture', {});
    expect(((await db.getStudy(study!.id))?.facts.events ?? [])[1].struck).toBe(true);
    tick(MIN); await run('end_measurement', {});
    expect((await db.getStudy(study!.id))?.facts.watch?.[0]?.to).toBeDefined();
  }, 60_000);

  it('Work sampling: a moment said is a moment taken by hand and a tap a person; who or what not on the study refused', async () => {
    const { run, tick, db, a } = await seed();
    await run('start_measurement', { tool: 'sampling', lineId: a.id, who: ['Op 1', 'Op 2'] });
    const study = (await db.listStudiesForLine(a.id)).find(x => x.tool === 'sampling')!;
    tick(MIN);
    expect((await run('capture_event', { event: 'moment', people: [{ who: 'op 1', activity: 'Working' }, { who: 'Op 2', activity: 'waiting' }] })).ok).toBe(true);
    const s = await db.getStudy(study.id);
    expect(s?.facts.taps?.map(x => [x.who, x.activity])).toEqual([['Op 1', 'working'], ['Op 2', 'waiting']]);
    expect(s?.agreed?.sampling?.extra).toHaveLength(1);
    expect((await run('capture_event', { event: 'moment', people: [{ who: 'Op 3', activity: 'working' }] })).ok).toBe(false);
  }, 60_000);

  it('SMED: from the last good piece, each element ended as named, its seconds the time between', async () => {
    const { run, tick, db, a } = await seed();
    await run('start_measurement', { tool: 'changeover', lineId: a.id, from: 'Maris 2kg', to: 'King Edward 2kg' });
    const study = (await db.listStudiesForLine(a.id)).find(x => x.tool === 'changeover')!;
    expect((await run('capture_event', { event: 'element', name: 'Guards off' })).ok).toBe(false);   // not begun
    tick(1000); await run('capture_event', { event: 'begin' });
    tick(90_000); await run('capture_event', { event: 'element', name: 'Guards off', who: 'Op 1' });
    tick(240_000); await run('capture_event', { event: 'element', name: 'Change the former' });
    /* the last one taken back: its time goes back to the element now running */
    await run('undo_capture', {});
    tick(60_000); await run('capture_event', { event: 'finish', name: 'Change the former' });
    const seq = (await db.getStudy(study.id))?.facts.sequence ?? [];
    expect(seq.map(x => [x.name, x.sec, x.source])).toEqual([['Guards off', 90, 'timed'], ['Change the former', 300, 'timed']]);
    expect(seq[0].crew).toEqual(['Op 1']);
  }, 60_000);

  it('Stops across workstations: stopped and running add minutes and a stop, as its own button does; undo takes them off', async () => {
    const { run, tick, db, a } = await seed();
    await run('start_measurement', { tool: 'workstops', lineId: a.id, workstations: ['Weigher', 'Bagger'] });
    const study = (await db.listStudiesForLine(a.id)).find(x => x.tool === 'calc')!;
    tick(1000); await run('capture_event', { event: 'stopped', workstation: 'bagger' });
    tick(3 * MIN); expect((await run('capture_event', { event: 'running', workstation: '2' })).ok).toBe(true);
    let inp = (await db.getStudy(study.id))?.agreed?.calc?.inputs ?? {};
    expect([inp.w02_min, inp.w02_stops]).toEqual([3, 1]);
    await run('undo_capture', {});
    inp = (await db.getStudy(study.id))?.agreed?.calc?.inputs ?? {};
    expect([inp.w02_min, inp.w02_stops]).toEqual([0, 0]);
    expect((await run('capture_event', { event: 'stopped', workstation: 'Labeller' })).ok).toBe(false);
  }, 60_000);

  it('one measurement at a time, and a client may not start one', async () => {
    const { run, a } = await seed();
    expect((await run('start_measurement', { tool: 'stops', lineId: a.id }, { level: 'client' })).ok).toBe(false);
    await run('start_measurement', { tool: 'stops', lineId: a.id });
    expect((await run('start_measurement', { tool: 'stops', lineId: a.id })).ok).toBe(false);
  }, 60_000);
});

describe('outputs, reading and analysis — every figure the tool’s', () => {
  it('run_analysis is the Analysis tool’s own sentence', async () => {
    const { run } = await seed();
    const { analysisFigures, analysisSays } = await import('../../tools/analysis/analysis');
    const { analysisFrom } = await import('../operate');
    const input = { question: 'sure' as const, name: 'Fill weight', unit: 'g', values: [500.2, 501.1, 499.8, 500.6, 500.9, 501.4, 499.9, 500.3, 500.7, 500.1] };
    const r = await run('run_analysis', input);
    const built = analysisFrom(input);
    if ('why' in built) throw new Error(built.why);
    const said = analysisSays(analysisFigures(built.a, built.readings), built.a);
    expect(r.ok && r.says.startsWith(said.text)).toBe(true);
    const g = await run('run_analysis', { question: 'groups', name: 'Give-away', groups: [{ name: 'Days', values: [1, 2, 3, 2, 1] }, { name: 'Nights', values: [3, 4, 5, 4, 3] }] });
    expect(g.ok).toBe(true);
  }, 60_000);

  it('add_readings puts them in the record (confirmed), read_record and the analysis read them back', async () => {
    const { run, db } = await seed();
    const xs = [19.8, 20.1, 20.4, 19.9, 20.2, 20.0, 20.3, 19.7, 20.1, 20.2];
    expect((await run('add_readings', { studyId: 'cap', values: xs }, {}, false)).ok).toBe(false);
    const r = await run('add_readings', { studyId: 'cap', values: xs });
    expect(r.ok && r.show?.id).toBe('cap');
    expect((await db.getStudy('cap'))?.facts.readings?.map(x => x.value)).toEqual(xs);
    const read = await run('read_record', { studyId: 'cap' });
    expect(read.ok && (read.data as { readings: { n: number } }).readings.n).toBe(10);
    const an = await run('run_analysis', { question: 'sure', name: 'Seal strength', studyId: 'cap' });
    expect(an.ok && an.says).toMatch(/10 readings from the record/);
  }, 60_000);

  it('draw_diagram makes the tool’s own record as Line Talk’s Make it does, and updates only the steps', async () => {
    const { run, db, a } = await seed();
    const capture = { title: 'Tray, oven to pallet', steps: [{ what: 'Cook', kind: 'operation', time: 20, timeUnit: 'minutes', dist: null, distUnit: '' }, { what: 'To the chiller', kind: 'transport', time: 90, timeUnit: 'seconds', dist: 40, distUnit: 'metres' }] };
    const r = await run('draw_diagram', { set: 'flow', capture, lineId: a.id });
    expect(r.ok).toBe(true);
    const made = (await db.listStudiesForLine(a.id)).find(x => x.tool === 'calc')!;
    expect(made.agreed?.calc?.key).toBe('process-flow');
    const { diagramRecord } = await import('../../tools/talk/diagramRecord');
    const { readCapture } = await import('../../tools/talk/talkSets');
    const same = diagramRecord(readCapture('flow', capture)!, { id: 'x', at: 0, source: 's', from: {} });
    expect(made.agreed?.calc?.inputs).toEqual(same.agreed?.calc?.inputs);
    await db.patchStudy(made.id, cur => ({ agreed: { ...cur.agreed, calc: { ...cur.agreed!.calc!, inputs: { ...cur.agreed!.calc!.inputs, wage: 15 } } } }));
    await run('draw_diagram', { set: 'flow', capture: { ...capture, steps: capture.steps.slice(0, 1) }, studyId: made.id });
    const after = await db.getStudy(made.id);
    expect(after?.agreed?.calc?.inputs.wage).toBe(15);
  }, 60_000);

  it('write_document keeps a Line Talk with its document, figures not said marked to check', async () => {
    const { run, db, a } = await seed();
    const document = { title: 'Line A — walk', kind: 'line-walk', status: { state: 'watch', line: 'Wrapper stopping' }, sections: [{ heading: 'What is not as it should be', icon: '🚨', text: '', points: [{ text: 'The wrapper stopped 7 times', basis: 'observed', state: 'problem', owner: '', due: '' }], photos: [] }] };
    const r = await run('write_document', { document, lineId: a.id });
    expect(r.ok).toBe(true);
    const talk = (await db.listStudiesForLine(a.id)).find(x => x.tool === 'talk')!;
    const reply = (talk.facts.turns ?? []).find(t => t.kind === 'reply');
    expect(reply?.doc?.title).toBe('Line A — walk');
    expect(reply?.unsure).toEqual(['7']);
    expect(r.ok && r.show?.href).toBe(`/talk/${talk.id}?doc=${reply?.id}`);
  }, 60_000);

  it('make_report opens the app’s own paper with ?save=1', async () => {
    const { run, a } = await seed();
    const r = await run('make_report', { what: 'record', studyId: 'cap' });
    expect(r.ok && r.show?.href).toBe('/capability/cap?save=1');
    const l = await run('make_report', { what: 'line-package', lineId: a.id });
    expect(l.ok && l.show?.href).toBe(`/lines/${a.id}/report?full=1&save=1`);
    expect((await run('make_report', { what: 'project' })).ok).toBe(false);
  }, 60_000);

  it('plan_investigation lays out a method’s sections with their tools and how each is used', async () => {
    const { run, a } = await seed();
    const r = await run('plan_investigation', { words: 'why the wrapper keeps stopping', method: 'dmaic', lineId: a.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const steps = (r.data as { steps: { section: string; tools: { how: string }[] }[] }).steps;
    expect(steps.map(x => x.section)).toEqual(['Define', 'Measure', 'Analyse', 'Improve', 'Control']);
  }, 60_000);
});
