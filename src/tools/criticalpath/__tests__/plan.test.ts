/* FC-215 part 2 — the critical path read from a stage-gate plan (knowledge/specs/FC-215-critical-path.md §13).
 * The independent cases: Heizer & Render's Milwaukee Paper Manufacturing network, and the knowledge record's new line (end 33) — both
 * worked out by listing every start-to-end path, which is not what the module does (it makes two passes). */
import { describe, expect, it } from 'vitest';
import { criticalPath, type CpmTask } from '../../../lib/ie/criticalPath';
import type { Asset, Test } from '../../../lib/testing';
import type { LinesDay } from '../../../lib/lineLoss';
import { arrivalId, criticalMachines, planLine, keepProposal, lateStep, marginSays, nearCritical, planCaveats, planClosing, planMoney, planNodes, planPath, planPicture, planSays, planTiles, proposedWaits, withWaits, withoutWaits, type PlanReading } from '../plan';

/* ---- every path, longest first: the independent way to the same answers ---- */
function byPaths(tasks: CpmTask[]) {
  const byId = new Map(tasks.map(t => [t.id, t]));
  const succ = new Map(tasks.map(t => [t.id, tasks.filter(o => o.after.includes(t.id)).map(o => o.id)]));
  const starts = tasks.filter(t => t.after.length === 0).map(t => t.id);
  const paths: string[][] = [];
  const walk = (p: string[]) => { const nx = succ.get(p[p.length - 1]) ?? []; if (!nx.length) paths.push(p); else nx.forEach(n => walk([...p, n])); };
  starts.forEach(s => walk([s]));
  const len = (p: string[]) => p.reduce((n, id) => n + (byId.get(id)?.days ?? 0), 0);
  const end = Math.max(...paths.map(len));
  const through = (id: string) => Math.max(...paths.filter(p => p.includes(id)).map(len));
  return { end, float: (id: string) => end - through(id), critical: paths.filter(p => len(p) === end) };
}

describe('Milwaukee Paper Manufacturing (Heizer & Render, Operations Management ch. 3)', () => {
  const T: CpmTask[] = [
    { id: 'A', days: 2, after: [] }, { id: 'B', days: 3, after: [] }, { id: 'C', days: 2, after: ['A'] }, { id: 'D', days: 4, after: ['B'] },
    { id: 'E', days: 4, after: ['C'] }, { id: 'F', days: 3, after: ['C'] }, { id: 'G', days: 5, after: ['D', 'E'] }, { id: 'H', days: 2, after: ['F', 'G'] },
  ];
  it('takes 15 weeks, A-C-E-G-H critical; B and D 1 week of slack, F 6 — the textbook figures', () => {
    const r = criticalPath(T);
    if (!r.ok) throw new Error('not ok');
    expect(r.end).toBe(15);
    expect(r.paths).toEqual([['A', 'C', 'E', 'G', 'H']]);
    const f = Object.fromEntries(r.rows.map(x => [x.id, x.float]));
    expect(f).toEqual({ A: 0, B: 1, C: 0, D: 1, E: 0, F: 6, G: 0, H: 0 });
  });
  it('equals listing every path (the independent way)', () => {
    const r = criticalPath(T);
    if (!r.ok) throw new Error('not ok');
    const p = byPaths(T);
    expect(r.end).toBe(p.end);
    for (const x of r.rows) expect(x.float, x.id).toBe(p.float(x.id));
    expect(p.critical).toEqual([['A', 'C', 'E', 'G', 'H']]);
  });
});

/* ---- the record's new line, booked in dates ---- */
const TODAY = '2026-11-02';
const asset = (id: string, name: string, sort: number, o: Partial<Asset> = {}): Asset => ({ id, projectId: 'p', name, state: 'awaited', sort, updatedAt: 1, ...o });
const test = (id: string, title: string, o: Partial<Test>): Test => ({ id, projectId: 'p', title, outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });
const FILLER = asset('f', 'Filler', 1, { dueOn: '2026-11-12' });
const LABELLER = asset('l', 'Labeller', 2, { dueOn: '2026-11-16' });
const STEPS: Test[] = [
  test('f-inst', 'Install', { kind: 'install', assetId: 'f', plannedFor: '2026-11-12', plannedTo: '2026-11-16' }),
  test('f-sat', 'FAT/SAT', { kind: 'test', assetId: 'f', plannedFor: '2026-11-17', plannedTo: '2026-11-22' }),
  test('l-inst', 'Install', { kind: 'install', assetId: 'l', plannedFor: '2026-11-16', plannedTo: '2026-11-19' }),
  test('l-sat', 'SAT', { kind: 'test', assetId: 'l', plannedFor: '2026-11-20', plannedTo: '2026-11-27' }),
  test('trials', 'Line trials', { kind: 'test', plannedFor: '2026-11-28', plannedTo: '2026-12-02' }),
  test('hand', 'Handover', { kind: 'install', gate: 'handover', plannedFor: '2026-12-03', plannedTo: '2026-12-04' }),
];
const WAITS = { trials: ['f-sat', 'l-sat'] };
const read = (o: Partial<Parameters<typeof planPath>[0]> = {}): PlanReading => {
  const r = planPath({ assets: [FILLER, LABELLER], tests: STEPS, waitsFor: WAITS, today: TODAY, ...o });
  if (!r.ok) throw new Error(`not ok: ${r.why}`);
  return r;
};

describe('the record’s new line from dates', () => {
  it('reads the arrivals and the steps as tasks, in the plan’s order', () => {
    const { nodes, left } = planNodes({ assets: [FILLER, LABELLER], tests: STEPS, today: TODAY });
    expect(left).toEqual([]);
    expect(nodes.map(n => [n.label, n.days])).toEqual([
      ['Filler on site', 10], ['Labeller on site', 14],
      ['Filler — Install', 5], ['Filler — FAT/SAT', 6], ['Labeller — Install', 4], ['Labeller — SAT', 8], ['Line trials', 5], ['Handover', 2],
    ]);
  });
  it('proposes each wait from the dates: the machine’s nearest earlier step, else its arrival; the line’s steps the nearest of any', () => {
    const { nodes } = planNodes({ assets: [FILLER, LABELLER], tests: STEPS, today: TODAY });
    expect(proposedWaits(nodes)).toEqual({
      [arrivalId('f')]: [], [arrivalId('l')]: [], 'f-inst': [arrivalId('f')], 'f-sat': ['f-inst'], 'l-inst': [arrivalId('l')], 'l-sat': ['l-inst'], trials: ['l-sat'], hand: ['trials'],
    });
  });
  it('ends at day 33 with the labeller’s chain critical and the filler’s 5 days of float, as the path-listing case says', () => {
    const x = read();
    expect(x.end).toBe(33);
    expect(x.endOn).toBe('2026-12-04');
    const float = Object.fromEntries(x.rows.map(r => [r.id, r.float]));
    expect(float).toMatchObject({ [arrivalId('l')]: 0, 'l-inst': 0, 'l-sat': 0, trials: 0, hand: 0, [arrivalId('f')]: 5, 'f-inst': 5, 'f-sat': 5 });
    expect(x.paths).toEqual([[arrivalId('l'), 'l-inst', 'l-sat', 'trials', 'hand']]);
    const p = byPaths(x.tasks);
    expect(x.end).toBe(p.end);
    for (const r of x.rows) expect(r.float, r.id).toBe(p.float(r.id));
  });
  it('says which machine’s chain is critical, and what the filler has', () => {
    const x = read();
    expect(criticalMachines(x).map(m => m.name)).toEqual(['Labeller']);
    expect(x.machines.map(m => [m.name, m.critical, m.float])).toEqual([['Filler', false, 5], ['Labeller', true, 0]]);
    expect(planSays(x)).toBe('Nothing can be finished before 4 Dec — 33 days from 2 Nov. Labeller’s chain decides it: a day lost on any of its critical steps is a day later at the handover. Filler has 5 days of float.');
  });
  it('has a one-line form for the Timeline', () => {
    expect(planLine(read())).toBe('Critical path: Labeller’s chain decides the handover — earliest finish 4 Dec (33 days).');
    expect(planLine(read({ handoverAt: '2026-12-01' }))).toBe('Critical path: Labeller’s chain decides the handover — earliest finish 4 Dec (33 days), 3 days short of the handover date.');
    expect(planLine(read({ handoverAt: '2026-12-10' }))).toMatch(/6 days in hand against the handover date\.$/);
  });
  it('counts whose word each wait is', () => {
    const x = read();
    expect(x.told).toBe(1);
    expect(x.proposed).toBe(5);
    expect(x.rows.find(r => r.id === 'trials')?.told).toBe(true);
    expect(x.rows.find(r => r.id === 'f-sat')?.told).toBe(false);
    expect(planCaveats(x)[0]).toMatch(/1 of 6 steps has the owner’s word/);
  });
});

describe('waits', () => {
  it('without the owner’s word on the trials, the proposal waits for the labeller only — and the filler’s chain is no longer in the sum', () => {
    const x = read({ waitsFor: {} });
    expect(x.end).toBe(33);
    expect(x.rows.find(r => r.id === 'f-sat')?.float).toBeGreaterThan(5);
  });
  it('an empty list means it starts at the beginning', () => {
    const x = read({ waitsFor: { ...WAITS, 'l-sat': [] } });
    expect(x.rows.find(r => r.id === 'l-sat')?.es).toBe(0);
  });
  it('a wait on a step that has gone is ignored and counted', () => {
    const x = read({ waitsFor: { ...WAITS, hand: ['trials', 'gone'] } });
    expect(x.dead).toBe(1);
    expect(x.end).toBe(33);
  });
  it('a loop is refused, naming the steps', () => {
    const r = planPath({ assets: [FILLER, LABELLER], tests: STEPS, waitsFor: { ...WAITS, 'f-sat': ['hand'] }, today: TODAY });
    expect(r.ok).toBe(false);
    if (!r.ok && r.why === 'cycle') expect(r.cycle.join(' ')).toMatch(/Handover/);
    else throw new Error('expected a cycle');
  });
  it('a wait is set, set back and kept as a proposal in one tap', () => {
    const a = withWaits(undefined, 'x', ['a', 'a', 'x', 'b']);
    expect(a).toEqual({ x: ['a', 'b'] });
    expect(withoutWaits(a, 'x')).toBeUndefined();
    expect(withoutWaits({ x: ['a'], y: [] }, 'x')).toEqual({ y: [] });
    const { nodes } = planNodes({ assets: [FILLER, LABELLER], tests: STEPS, today: TODAY });
    const kept = keepProposal(nodes, WAITS);
    expect(kept.trials).toEqual(['f-sat', 'l-sat']);
    expect(kept['f-sat']).toEqual(['f-inst']);
    expect(kept[arrivalId('f')]).toBeUndefined();
  });
  it('steps whose windows overlap do not wait for each other; ties are all waited for', () => {
    const a = asset('m', 'M', 1, { onSiteOn: '2026-10-30' });
    const steps = [
      test('s1', 'One', { kind: 'install', assetId: 'm', plannedFor: '2026-11-03', plannedTo: '2026-11-04' }),
      test('s2', 'Two', { kind: 'install', assetId: 'm', plannedFor: '2026-11-03', plannedTo: '2026-11-04' }),
      test('s3', 'Three', { kind: 'install', assetId: 'm', plannedFor: '2026-11-04', plannedTo: '2026-11-06' }),
      test('s4', 'Four', { kind: 'install', assetId: 'm', plannedFor: '2026-11-07', plannedTo: '2026-11-07' }),
    ];
    const w = proposedWaits(planNodes({ assets: [a], tests: steps, today: TODAY }).nodes);
    expect(w.s1).toEqual([arrivalId('m')]);
    expect(w.s2).toEqual([arrivalId('m')]);
    expect(w.s3).toEqual([arrivalId('m')]);
    expect(w.s4).toEqual(['s3']);
  });
});

describe('what is left', () => {
  it('a done step has nothing left, a machine already here has arrived: the end is where the chains say', () => {
    const x = read({ assets: [FILLER, { ...LABELLER, onSiteOn: '2026-11-01' }], tests: STEPS.map(t => (t.id === 'f-inst' ? { ...t, outcome: 'passed' as const } : t)) });
    expect(x.end).toBe(23);
    expect(x.machines.map(m => [m.name, m.critical, m.float, m.done])).toEqual([['Filler', true, 0, 1], ['Labeller', false, 4, 1]]);
    expect(x.todo.some(r => r.id === 'f-inst')).toBe(false);
  });
  it('a due date that has passed counts nothing and says so; no due date counts as here and says so', () => {
    const x = read({ assets: [asset('f', 'Filler', 1, { dueOn: '2026-10-28' }), asset('l', 'Labeller', 2)] });
    expect(x.notes.join(' ')).toMatch(/Filler was due 28 Oct and is not here — counted as arriving today/);
    expect(x.notes.join(' ')).toMatch(/Labeller is not here yet and has no due date/);
    expect(x.rows.find(r => r.id === arrivalId('f'))?.days).toBe(0);
  });
  it('a step that is not done and whose days have gone keeps its booked length and says so', () => {
    const x = read({ today: '2026-11-18' });
    expect(x.notes.join(' ')).toMatch(/Filler — Install was booked to 16 Nov and is not done — it keeps its booked 5 days/);
  });
  it('a step with no day, a fix, a deleted step and a step on a machine that has gone are not in the network — the first is listed', () => {
    const extra = [
      test('nodate', 'Air and power', { kind: 'install', assetId: 'f' }),
      test('fx', 'A fix', { kind: 'fix', assetId: 'f', plannedFor: '2026-11-20' }),
      test('del', 'Deleted', { kind: 'install', assetId: 'f', plannedFor: '2026-11-20', deletedAt: 5 }),
      test('orphan', 'Orphan', { kind: 'install', assetId: 'zz', plannedFor: '2026-11-20' }),
    ];
    const b = planNodes({ assets: [FILLER, LABELLER], tests: [...STEPS, ...extra], today: TODAY });
    expect(b.left).toEqual([{ id: 'nodate', label: 'Filler — Air and power', why: 'no day booked' }]);
    expect(b.nodes.length).toBe(8);
  });
  it('a merged or deleted machine is not a machine of the plan', () => {
    const b = planNodes({ assets: [FILLER, { ...LABELLER, mergedInto: 'f' }, asset('z', 'Gone', 3, { deletedAt: 1 })], tests: [], today: TODAY });
    expect(b.nodes.map(n => n.machine)).toEqual(['Filler']);
  });
  it('nothing on the plan; and everything done', () => {
    expect(planPath({ assets: [], tests: [], today: TODAY })).toMatchObject({ ok: false, why: 'empty' });
    const done = STEPS.map(t => ({ ...t, outcome: 'passed' as const }));
    expect(planPath({ assets: [{ ...FILLER, runningOn: '2026-11-01' }, { ...LABELLER, runningOn: '2026-11-01' }], tests: done, today: TODAY })).toMatchObject({ ok: false, why: 'nothing-left', done: 8 });
  });
  it('a step on no machine and no day gives nothing to chain; steps of a one-machine plan chain on their dates', () => {
    const x = planPath({ assets: [], tests: [test('a', 'A', { kind: 'test', plannedFor: '2026-11-03', plannedTo: '2026-11-05' }), test('b', 'B', { kind: 'test', plannedFor: '2026-11-06' })], today: TODAY });
    expect(x.ok && x.end).toBe(4);
  });
});

describe('the handover date', () => {
  it('days in hand, days short, and none agreed — in words and in the tile', () => {
    const inHand = read({ handoverAt: '2026-12-10' });
    expect(inHand.margin).toBe(6);
    expect(marginSays(inHand)).toBe('Handover is agreed for 10 Dec: 6 days in hand over the chain of waits.');
    const short = read({ handoverAt: '2026-12-01' });
    expect(short.margin).toBe(-3);
    expect(marginSays(short)).toBe('Handover is agreed for 1 Dec: the chain of waits is 3 days short of it, even with every step starting the moment it may.');
    expect(planTiles(short, planMoney(undefined))[1]).toMatchObject({ k: 'Against handover', v: '3 days short', tone: 'r' });
    expect(planClosing(short).tone).toBe('r');
    const exact = read({ handoverAt: '2026-12-04' });
    expect(exact.margin).toBe(0);
    expect(marginSays(exact)).toMatch(/no day in hand/);
    const none = read();
    expect(none.margin).toBeUndefined();
    expect(marginSays(none)).toMatch(/No handover date is agreed yet/);
    expect(planTiles(none, planMoney(undefined))[1]).toMatchObject({ v: '—' });
  });
});

describe('a late step', () => {
  it('moves the end by max(0, late − float); inside the float it moves nothing', () => {
    const x = read();
    const l = lateStep(x, 'l-inst', 3);
    expect(l).toMatchObject({ moved: 3, float: 0, end: 36 });
    expect(l?.says).toBe('If Labeller — Install is 3 days late the handover moves 3 days — it has no float to take it up.');
    expect(lateStep(x, 'f-inst', 3)).toMatchObject({ moved: 0, used: 3, float: 5 });
    expect(lateStep(x, 'f-inst', 3)?.says).toBe('If Filler — Install is 3 days late the end stays where it is — it uses 3 of its 5 days of float, leaving 2.');
    expect(lateStep(x, 'f-inst', 8)).toMatchObject({ moved: 3 });
    expect(lateStep(x, 'f-inst', 8)?.says).toBe('If Filler — Install is 8 days late it uses all 5 days of its float and the handover moves 3 days.');
    expect(lateStep(x, 'nope', 1)).toBeUndefined();
  });
  it('is priced at the project’s lines’ margin for a day; the missing input is named and nothing waits on it', () => {
    const day: LinesDay = { lines: ['Line 7'], priced: ['Line 7'], margin: 2500, missing: [] };
    expect(planMoney(day).says).toBe('A day lost on the critical path costs £2.5k — a day of Line 7 not making, in margin.');
    expect(planMoney(day, 3).says).toMatch(/That slip moves the handover 3 days: £7.5k\.$/);
    expect(planMoney({ lines: ['Line 7'], priced: [], missing: ['Line 7: its speed and its margin a pack'] }).says).toBe('A day lost on the critical path costs a day of Line 7 not making — not priced yet: give Line 7: its speed and its margin a pack on the Factory’s Lines page.');
    expect(planMoney({ lines: [], priced: [], missing: [] }).missing).toBe('no line from the Factory on the project yet');
    expect(planMoney(undefined).perDay).toBeUndefined();
  });
});

describe('the page’s figures', () => {
  it('tiles, near critical, the picture inside its own axes', () => {
    const x = read({ handoverAt: '2026-12-04' });
    const t = planTiles(x, planMoney({ lines: ['L'], priced: ['L'], margin: 1000, missing: [] }));
    expect(t.map(k => k.k)).toEqual(['Earliest finish', 'Against handover', 'On the critical path', 'Least float off it', 'Decides the handover', 'A day late costs']);
    expect(t[0]).toMatchObject({ v: '33 days', of: 'by 4 Dec' });
    expect(t[2].v).toBe('5');
    expect(t[3]).toMatchObject({ v: '5 days' });
    expect(t[4].v).toBe('Labeller');
    expect(t[5].v).toBe('£1.0k');
    expect(nearCritical(x, 5).map(r => r.id).sort()).toEqual(['f-inst', 'f-sat', arrivalId('f')].sort());
    expect(nearCritical(x, 0)).toEqual([]);
    const pic = planPicture(x);
    expect(pic.y.fmt(2)).toBe('Filler');
    expect(pic.y.fmt(0)).toBe('The line');
    for (const l of pic.lines) for (const [px, py] of l.points) { expect(px).toBeGreaterThanOrEqual(pic.x.min); expect(px).toBeLessThanOrEqual(pic.x.max); expect(py).toBeGreaterThanOrEqual(pic.y.min); expect(py).toBeLessThanOrEqual(pic.y.max); }
    expect(planClosing(x).text).toMatch(/^Earliest finish 4 Dec \(33 days\)\. 5 steps decide it/);
  });
});
