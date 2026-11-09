/* FILLING EVERY TOOL FROM THE CONVERSATION (docs/AI-OPERATING.md §2) — each capability writes the record its tool's page writes, and
 * the tool's own reader then reads it: a capability study and a chart started and given readings; a loss count counted; every kind of
 * scored register filled (criticality ranked, an FMEA's ratings, a Pugh matrix's marks, a skills matrix, a readiness list, a fault tree);
 * a hold raised and decided; a check passed, and failed with its problem raised as the round raises it; a Line balance timed; a Line
 * capacity set; a cause on a 6M problem's bone and confirmed with what was found; a step on a problem's journey; and confirm once —
 * a write into a record said yes to runs with no card. Through runCall, the one door the colleague uses. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), links: await import('../../lib/studyLinks') });
const call = (name: string, input: unknown) => ({ id: `c-${name}-${Math.random()}`, name, input });

async function seed() {
  const f = await fresh();
  const a = await f.lines.addLineToFactory('Line A');
  await f.db.updateWorkspace({ ...a, shifts: [{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }] });
  const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), me: 'Rowland', ...o });
  const run = (name: string, input: unknown, o: Partial<CapCtx> = {}) => f.reg.runCall(ctx(o), call(name, input), { confirmed: true });
  const made = async (r: Awaited<ReturnType<typeof run>>) => { if (!r.ok) throw new Error(r.why); return (r.data as { studyId: string }).studyId; };
  return { ...f, a, run, made };
}

describe('start_study and readings — the tool reads them', () => {
  it('a capability study with its limits, thirty readings, and its own sentence', async () => {
    const { run, made, db, links, a } = await seed();
    const id = await made(await run('start_study', { tool: 'capability', lineId: a.id, name: 'Seal strength', machine: 'Sealer', setup: { kind: 'limits', unit: 'N', lower: 15, upper: 25, nominal: 20 } }));
    expect((await run('start_study', { tool: 'capability', lineId: a.id, setup: { kind: 'limits' } })).ok).toBe(false);   // no limit invented
    const xs = Array.from({ length: 30 }, (_, i) => 20 + ((i * 7) % 11 - 5) / 5);
    expect((await run('add_readings', { studyId: id, values: xs })).ok).toBe(true);
    const s = await db.getStudy(id);
    expect(s?.agreed?.readings).toMatchObject({ kind: 'limits', lower: 15, upper: 25, unit: 'N', count: 30 });
    expect(s?.facts.readings).toHaveLength(30);
    expect(links.studyLine(s!).text).toMatch(/Ppk|capable/i);
  }, 60_000);

  it('a control chart, and runs of rejects and before/after arms as their boxes', async () => {
    const { run, made, db, a } = await seed();
    const id = await made(await run('start_study', { tool: 'chart', lineId: a.id, setup: { measures: 'Fill weight', unit: 'g', kind: 'xmr', lower: 495, upper: 515 } }));
    expect((await db.getStudy(id))?.agreed?.chart).toMatchObject({ kind: 'xmr', name: 'Fill weight', lower: 495, upper: 515 });
    const r = await run('add_readings', { studyId: id, readings: [{ value: 501, note: 'New reel' }, { value: 503 }] });
    expect(r.ok).toBe(true);
    expect((await db.getStudy(id))?.facts.readings?.[0]).toMatchObject({ value: 501, note: 'New reel' });
    const an = await made(await run('start_study', { tool: 'analysis', setup: { question: 'change', measures: 'Fill time', unit: 's' } }));
    await run('add_readings', { studyId: an, readings: [{ value: 4.1, arm: 'before' }, { value: 3.2, arm: 'after' }] });
    expect((await db.getStudy(an))?.facts.readings?.map(x => x.arm)).toEqual(['before', 'after']);
    expect((await run('add_readings', { studyId: an, readings: [{ made: 10, rejected: 12 }] })).ok).toBe(false);
  }, 60_000);

  it('a loss count of the shift just run, counted', async () => {
    const { run, made, db, a } = await seed();
    const id = await made(await run('start_study', { tool: 'losses', lineId: a.id }));
    expect((await run('count_shift', { studyId: id, plannedMin: 400 })).ok).toBe(false);   // a change needs its why
    expect((await run('count_shift', { studyId: id, made: 38200, rejects: 120, ratePerMin: 110 })).ok).toBe(true);
    expect((await db.getStudy(id))?.facts.losses).toMatchObject({ made: 38200, rejects: 120, ratePerMin: 110, rateFrom: 'typed', shift: 'Days' });
  }, 60_000);
});

describe('fill_register — every scored register, ranked by its own definition', () => {
  it('criticality rows ranked; a box out of range refused with nothing written', async () => {
    const { run, made, db, links, a } = await seed();
    const id = await made(await run('start_study', { tool: 'register', key: 'criticality', lineId: a.id }));
    expect((await db.getStudy(id))?.agreed?.scored?.rows).toEqual([]);
    const r = await run('fill_register', { studyId: id, rows: [
      { name: 'Wrapper', production: 5, safety: 3, quality: 4, repair: 4, likelihood: 4 },
      { name: 'Labeller', production: 2, safety: 1, quality: 2, repair: 2, likelihood: 2 }] });
    expect(r.ok).toBe(true);
    const s = await db.getStudy(id);
    expect(s?.agreed?.scored?.rows.map(x => x.name)).toEqual(['Wrapper', 'Labeller']);
    expect(links.studyLine(s!).text.length).toBeGreaterThan(10);
    expect((await run('fill_register', { studyId: id, rows: [{ name: 'Wrapper', production: 9 }] })).ok).toBe(false);
    expect((await db.getStudy(id))?.agreed?.scored?.rows[0].production).toBe(5);
    await run('fill_register', { studyId: id, rows: [{ name: 'wrapper', likelihood: 5 }] });
    expect((await db.getStudy(id))?.agreed?.scored?.rows).toHaveLength(2);
    expect((await db.getStudy(id))?.agreed?.scored?.rows[0].likelihood).toBe(5);
  }, 60_000);

  it('an FMEA, a Pugh matrix, a skills matrix, a readiness list and a fault tree', async () => {
    const { run, made, db, a } = await seed();
    const fmea = await made(await run('start_study', { tool: 'register', key: 'fmea', lineId: a.id }));
    expect((await run('fill_register', { studyId: fmea, rows: [{ name: 'Date code missing', fmea: { step: 'Coding', effect: 'Recall', s: 7, o: 5, d: 7, action: 'Vision check', owner: 'Sam', due: '2026-12-01' } }] })).ok).toBe(true);
    expect((await db.getStudy(fmea))?.agreed?.scored?.rows[0].fmea).toMatchObject({ s: 7, o: 5, d: 7, owner: 'Sam' });
    const pugh = await made(await run('start_study', { tool: 'register', key: 'pugh', lineId: a.id }));
    await run('fill_register', { studyId: pugh, datum: 'Present state', criteria: [{ name: 'Cost', weight: 3 }, { name: 'Speed', weight: 2 }], rows: [{ name: 'New wrapper', scores: { Cost: -1, Speed: 1 } }] });
    const p = (await db.getStudy(pugh))?.agreed?.scored;
    expect(p?.criteria?.map(c => c.name)).toEqual(['Cost', 'Speed']);
    expect(Object.values(p?.rows[0].scores ?? {})).toEqual([-1, 1]);
    expect((await run('fill_register', { studyId: pugh, rows: [{ name: 'X', scores: { Taste: 1 } }] })).ok).toBe(false);
    const skills = await made(await run('start_study', { tool: 'register', key: 'skills', lineId: a.id }));
    await run('fill_register', { studyId: skills, criteria: [{ name: 'Wrapper', need: 3 }], rows: [{ name: 'Fay', shift: 'Nights', scores: { Wrapper: 4 } }], settings: { target: 3 } });
    expect((await db.getStudy(skills))?.agreed?.scored).toMatchObject({ target: 3 });
    const ready = await made(await run('start_study', { tool: 'register', key: 'readiness', lineId: a.id }));
    await run('fill_register', { studyId: ready, rows: [{ name: 'HACCP validation', group: 'Food safety', owner: 'QA', due: '2026-11-20', stopper: true }] });
    expect((await db.getStudy(ready))?.agreed?.scored?.rows[0]).toMatchObject({ group: 'Food safety', stopper: true });
    const tree = await made(await run('start_study', { tool: 'register', key: 'fault-tree', lineId: a.id }));
    await run('fill_register', { studyId: tree, rows: [{ name: 'Metal in pack', tree: { gate: 'AND' } }] });
    await run('fill_register', { studyId: tree, rows: [{ name: 'Detector fails', tree: { under: 'Metal in pack', p: 0.01 } }] });
    const rows = (await db.getStudy(tree))?.agreed?.scored?.rows ?? [];
    expect(rows[1].tree).toMatchObject({ parent: rows[0].id, p: 0.01 });
  }, 60_000);
});

describe('holds, checks, the line balance, capacity, 6M and the journey', () => {
  it('a hold raised and decided through the register’s own store', async () => {
    const { run, made, db, a } = await seed();
    const id = await made(await run('start_study', { tool: 'holds', lineId: a.id }));
    expect((await run('raise_hold', { studyId: id, product: 'Maris 2kg', qty: 4800, unit: 'packs', reason: 'Date code' })).ok).toBe(true);
    expect((await run('decide_hold', { studyId: id, hold: 'H-001', disposition: 'release' })).ok).toBe(false);   // grounds
    expect((await run('decide_hold', { studyId: id, hold: 'H-001', disposition: 'release', qty: 4500, grounds: 'Recoded and checked' })).ok).toBe(true);
    const { liveHolds, heldQty } = await import('../../tools/hold/hold');
    const h = liveHolds((await db.getStudy(id))?.facts.holds)[0];
    expect(h.no).toBe(1);
    expect(heldQty(h)).toBe(300);
  }, 60_000);

  it('a check passed, and failed — its problem raised as the round raises it', async () => {
    const { run, db, a } = await seed();
    const { newLogStudy } = await import('../../tools/checks/start');
    const { defOf } = await import('../../tools/checks/registry');
    const s = newLogStudy(defOf('metal-detection')!, { name: 'Metal detector', workspaceId: a.id, since: Date.now() - 3_600_000 });
    await db.putStudy(s);
    expect((await run('record_check', { studyId: s.id, check: 'Ferrous test piece', outcome: 'pass' })).ok).toBe(true);
    const before = (await db.listAllSnags()).length;
    const f = await run('record_check', { studyId: s.id, check: 'non-ferrous', outcome: 'fail', note: 'Not rejected' });
    expect(f.ok).toBe(true);
    expect((await db.listAllSnags()).length).toBe(before + 1);
    expect((await db.getStudy(s.id))?.facts.results?.map(r => r.outcome)).toEqual(['pass', 'fail']);
    expect((await run('record_check', { studyId: s.id, check: 'Gauge', outcome: 'pass' })).ok).toBe(false);
  }, 60_000);

  it('Line capacity set and its Line balance timed', async () => {
    const { run, made, db, a } = await seed();
    const c = await run('start_study', { tool: 'capacity', lineId: a.id, product: 'Maris 2kg', setup: { targetPerMin: 60 } });
    expect(c.ok).toBe(true);
    const stdId = (c.ok ? c.data : {}) as { standardId: string };
    expect((await run('set_capacity', { standardId: stdId.standardId, stations: [{ name: 'Filler', rate: 120, ratePer: 'min', unit: 'bags' }, { name: 'Wrapper', rate: 50 }] })).ok).toBe(true);
    const std = await db.getStandard(stdId.standardId);
    expect(std?.capacity).toMatchObject({ targetPerMin: 60 });
    expect(std?.capacity?.stations.map(x => [x.name, x.rate])).toEqual([['Filler', 120], ['Wrapper', 50]]);
    const b = await made(await run('start_study', { tool: 'balance', lineId: a.id, product: 'Maris 2kg' }));
    expect((await db.getStudy(b))?.standardId).toBe(stdId.standardId);
    await run('time_elements', { studyId: b, elements: [{ who: 'Op 1', name: 'Load the film', laps: [42, 40, 44] }, { who: 'Op 2', name: 'Stack', sec: 30 }] });
    await run('time_elements', { studyId: b, elements: [{ who: 'Op 1', name: 'load the film', laps: [41] }] });
    const steps = (await db.getStudy(b))?.facts.steps ?? [];
    const load = steps.find(x => x.name === 'Load the film');
    expect(load?.laps?.map(l => l.sec)).toEqual([42, 40, 44, 41]);
    expect(steps.find(x => x.who === 'Op 2')?.typedSec).toBe(30);
  }, 60_000);

  it('a cause on the fishbone, confirmed only with what was found; a journey step', async () => {
    const { run, db, a } = await seed();
    const t = Date.now();
    await db.addCase({ id: 'k1', workspaceId: a.id, title: 'Wrapper stops', path: {} as never, baselineMsWeek: 0, status: 'open', openedAt: t, updatedAt: t, lineId: a.id });
    expect((await run('add_cause', { caseId: 'k1', m: 'material', text: 'Film splice too thick', grade: 'observed', likely: 'likely' })).ok).toBe(true);
    expect((await run('add_cause', { caseId: 'k1', cause: 'Film splice', status: 'confirmed' })).ok).toBe(false);
    expect((await run('add_cause', { caseId: 'k1', cause: 'Film splice', status: 'confirmed', found: 'Jams fell from 12 to 2 with thin tape' })).ok).toBe(true);
    const k = await db.getCase('k1');
    expect(k?.causes?.[0]).toMatchObject({ m: 'material', grade: 'observed', status: 'confirmed', found: 'Jams fell from 12 to 2 with thin tape', by: 'Rowland' });
    const fb = await run('fishbone_state', { lineId: a.id });
    expect(fb.ok && (fb.data as { caseId: string }[])[0].caseId).toBe('k1');
    await db.addSnag({ id: 'p1', workspaceId: a.id, problem: 'Wrapper film tears', status: 'open', priority: 'high', raisedAt: t, updatedAt: t });
    expect((await run('add_journey_step', { problemId: 'p1', did: 'Fitted thin splice tape', result: 'No tears this shift' })).ok).toBe(true);
    expect((await db.getSnag('p1'))?.journey?.[0]).toMatchObject({ did: 'Fitted thin splice tape', result: 'No tears this shift' });
  }, 60_000);

  it('the line standard: people put on its board, one named again changed', async () => {
    const { run, db, a } = await seed();
    const r = await run('start_study', { tool: 'standard', lineId: a.id, product: 'Maris 2kg' });
    const sid = (r.ok ? r.data : {}) as { standardId: string };
    await run('place_people', { standardId: sid.standardId, people: [{ label: 'Op 1', task: 'Loads film' }, { label: 'Op 2', task: 'Stacks' }] });
    await run('place_people', { standardId: sid.standardId, people: [{ label: 'op 1', bottleneck: true, labels: ['Overburdened'] }] });
    const ppl = (await db.getStandard(sid.standardId))?.marks.filter(m => m.kind === 'person') ?? [];
    expect(ppl.map(p => [p.label, p.task, !!p.bottleneck])).toEqual([['Op 1', 'Loads film', true], ['Op 2', 'Stacks', false]]);
    expect(ppl.every(p => p.x > 0 && p.x < 100 && p.y === 50)).toBe(true);
  }, 60_000);

  it('a client fills nothing', async () => {
    const { run, made, a } = await seed();
    const id = await made(await run('start_study', { tool: 'register', key: 'criticality', lineId: a.id }));
    expect((await run('fill_register', { studyId: id, rows: [{ name: 'X', production: 1 }] }, { level: 'client' })).ok).toBe(false);
    expect((await run('start_study', { tool: 'losses', lineId: a.id }, { level: 'client' })).ok).toBe(false);
  }, 60_000);
});

describe('answer_method — the method sheet’s own boxes', () => {
  it('a PDCA project answered by question words and id; a question not on the sheet said', async () => {
    const { run, db, a } = await seed();
    const sheet = await import('../../lib/methodSheet');
    const r = await run('start_project', { name: 'Seal rejects', method: 'pdca', lineIds: [a.id] });
    if (!r.ok) throw new Error(r.why);
    const pid = (r.data as { id: string }).id;
    const f = sheet.fieldsOf('pdca', 'Plan')[0]!;
    const w = await run('answer_method', { projectId: pid, answers: [{ field: f.label, text: 'Seal rejects at 2.1% against 0.5%.' }, { field: 'not a question', text: 'x' }] });
    expect(w.ok).toBe(true);
    if (w.ok) expect(w.says).toMatch(/Not a question of its sheet: not a question/);
    const kept = (await db.listTestItems(pid)).find(x => x.testId === sheet.answerScope('pdca', f.id));
    expect(kept?.what).toBe('Seal rejects at 2.1% against 0.5%.');
    await run('answer_method', { projectId: pid, answers: [{ field: f.id, text: 'Changed.' }] });
    expect((await db.listTestItems(pid)).filter(x => x.testId === sheet.answerScope('pdca', f.id))).toHaveLength(1);
    expect((await run('answer_method', { projectId: pid, answers: [] })).ok).toBe(false);
  }, 60_000);
});

describe('confirm once — the loop', () => {
  it('a write into a record already said yes to runs with no card; any other asks', async () => {
    const { colleagueLoop } = await import('../../colleague/colleagueAsk');
    let asked = 0;
    const answers = [
      { ok: true, reply: '', calls: [{ id: 'a', name: 'fill_register', input: { studyId: 'yes' } }, { id: 'b', name: 'fill_register', input: { studyId: 'new' } }], assistant: null },
      { ok: true, reply: 'Done.' },
    ];
    const ran: string[] = [];
    const end = await colleagueLoop({ turns: [{ role: 'person', text: 'x', at: '10:00' }], focus: () => '', today: 'today' }, {
      invoke: async () => answers.shift() as never,
      describe: () => ({ kind: 'write', title: 'Fill' }),
      run: async (c, confirmed) => { ran.push(`${(c.input as { studyId: string }).studyId}:${confirmed}`); return { ok: true, says: 'ok', refs: [] }; },
      prepare: async c => ({ ok: true, title: 'Fill', preview: 'p', input: c.input as Record<string, unknown>, ...((c.input as { studyId: string }).studyId === 'yes' ? { authorised: true } : {}) }),
      confirm: async () => { asked++; return true; },
      onStep: () => undefined,
    });
    expect(end.ok).toBe(true);
    expect(asked).toBe(1);
    expect(ran).toEqual(['yes:true', 'new:true']);
  });
});
