/* THE PROGRAMME — DATES, GATES, AND WHAT A SLIP ACTUALLY IS.
 *
 * The failure this file exists for is the one the first two cuts of
 * commissioning shipped with: a system that cannot tell you it is late. Without
 * a baseline nothing is ever late, only due, so a handover could move three
 * weeks and every screen would keep saying the same thing. `planned` and
 * `forecast` are two columns and the difference between them is the entire
 * point; tests that only checked the forecast would pass while the feature was
 * useless.
 *
 * The other half is the gate. A gate somebody can wave through is a gate that
 * gets waved through at five o'clock on a Friday — so the rules a stage imposes
 * have to hold WHATEVER anybody remembered to type against it. No product
 * through a line that has not passed mechanical completion with a grade-A open;
 * no rate proving passed with a program short of its agreed rate. Those are
 * tested here because they are the ones under pressure.
 */
import { describe, it, expect } from 'vitest';
import {
  PHASE_ORDER, PHASE_NAME, freshPhases, inOrder, phaseStates, currentPhase,
  slipOf, daysBetween, gateCriteria, canPass, programme, comingUp,
  type Phase, type PhaseKey, type CommissionItem, type Program, type Material,
  type Check, type Punch, type Task, type Run,
} from '../commissioning';

let n = 0;
const id = () => `x${++n}`;

const phase = (key: PhaseKey, p: Partial<Phase> = {}): Phase =>
  ({ id: `ph-${key}`, projectId: 'p1', key, updatedAt: 1, ...p });

const six = (over: Partial<Record<PhaseKey, Partial<Phase>>> = {}): Phase[] =>
  PHASE_ORDER.map(k => phase(k, over[k]));

const base = () => {
  n += 1;
  return { id: `i${n}`, projectId: 'p1', title: `Item ${n}`, sort: n, createdAt: 1, updatedAt: 1 };
};
const run = (achieved: number): Run => ({ id: `r${n}`, at: 1, achieved });
const program = (p: Partial<Program> = {}): Program => ({ ...base(), kind: 'program', agreedRate: 60, written: true, ...p });
const material = (m: Partial<Material> = {}): Material => ({ ...base(), kind: 'material', need: 10, have: 10, ...m });
const check = (c: Partial<Check> = {}): Check => ({ ...base(), kind: 'check', criterion: 'c', outcome: 'pass', ...c });
const punch = (p: Partial<Punch> = {}): Punch => ({ ...base(), kind: 'punch', severity: 'C', raisedAt: 1, closedAt: 2, ...p });
const task = (t: Partial<Task> = {}): Task => ({ ...base(), kind: 'task', state: 'done', ...t });

describe('the six stages', () => {
  it('lays out one row per stage, in the order a line is commissioned', () => {
    const ps = freshPhases('p1', id, 100);
    expect(ps.map(p => p.key)).toEqual(['fat', 'install', 'mechanical', 'sat', 'rate', 'handover']);
    expect(new Set(ps.map(p => p.id)).size).toBe(6);
  });

  it('starts with NO dates — a baseline nobody agreed is worse than none', () => {
    // Inventing plausible dates would put an agreement in the file that never
    // happened, and then every slip is measured against a fiction.
    for (const p of freshPhases('p1', id, 100)) {
      expect(p.plannedAt).toBeUndefined();
      expect(p.forecastAt).toBeUndefined();
      expect(p.passedAt).toBeUndefined();
    }
  });

  it('sorts into commissioning order however they arrive', () => {
    const jumbled = [phase('handover'), phase('fat'), phase('sat'), phase('install')];
    expect(inOrder(jumbled).map(p => p.key)).toEqual(['fat', 'install', 'sat', 'handover']);
  });

  it('leaves deleted stages out', () => {
    expect(inOrder([phase('fat'), phase('install', { deletedAt: 5 })]).map(p => p.key)).toEqual(['fat']);
  });

  it('gives every stage a name', () => {
    for (const k of PHASE_ORDER) expect(PHASE_NAME[k].length).toBeGreaterThan(0);
  });
});

describe('exactly one stage is ever the current one', () => {
  it('marks the first unpassed stage current and everything after it upcoming', () => {
    const ps = six({ fat: { passedAt: '2026-09-12' }, install: { passedAt: '2026-09-28' } });
    const st = phaseStates(ps);
    expect(st.get('ph-fat')).toBe('passed');
    expect(st.get('ph-install')).toBe('passed');
    expect(st.get('ph-mechanical')).toBe('current');
    expect(st.get('ph-sat')).toBe('upcoming');
    expect(st.get('ph-handover')).toBe('upcoming');
    expect(currentPhase(ps)?.key).toBe('mechanical');
  });

  it('a later stage passed out of turn does not make an earlier one current twice', () => {
    // Somebody signs SAT before mechanical completion. The queue still has one
    // current stage — the earliest thing still owed — which is the honest read.
    const ps = six({ sat: { passedAt: '2026-10-24' } });
    const states = [...phaseStates(ps).values()];
    expect(states.filter(s => s === 'current')).toHaveLength(1);
    expect(currentPhase(ps)?.key).toBe('fat');
  });

  it('nothing is current once every stage is passed', () => {
    const ps = PHASE_ORDER.map(k => phase(k, { passedAt: '2026-11-14' }));
    expect(currentPhase(ps)).toBeUndefined();
    expect([...phaseStates(ps).values()].every(s => s === 'passed')).toBe(true);
  });
});

describe('slip — the number the meeting is actually about', () => {
  it('counts whole days from the baseline to where it now lands', () => {
    expect(slipOf(phase('sat', { plannedAt: '2026-10-03', forecastAt: '2026-10-14' }))).toBe(11);
  });

  it('is negative when a stage is pulled forward', () => {
    expect(slipOf(phase('sat', { plannedAt: '2026-10-14', forecastAt: '2026-10-03' }))).toBe(-11);
  });

  it('measures to the date it was PASSED once it has been', () => {
    // A stage that passed late stays late for ever. Measuring a passed stage
    // against its forecast would quietly forgive every overrun the moment it
    // was signed.
    const p = phase('sat', { plannedAt: '2026-10-03', forecastAt: '2026-10-14', passedAt: '2026-10-20' });
    expect(slipOf(p)).toBe(17);
  });

  it('is UNDEFINED with no baseline, which is not the same as zero', () => {
    expect(slipOf(phase('sat', { forecastAt: '2026-10-14' }))).toBeUndefined();
    expect(slipOf(phase('sat'))).toBeUndefined();
  });

  it('daysBetween refuses to invent a number from a broken date', () => {
    expect(daysBetween('not a date', '2026-10-14')).toBeUndefined();
    expect(daysBetween('2026-10-03', undefined)).toBeUndefined();
  });
});

describe('a gate is a set of things that must be TRUE', () => {
  it('lists the records put against that stage, and says why each is not done', () => {
    const ph = phase('mechanical');
    const items: CommissionItem[] = [
      task({ phaseId: ph.id, title: 'Guarding fitted', state: 'done' }),
      task({ phaseId: ph.id, title: 'Guarding sign-off', state: 'todo' }),
      material({ phaseId: ph.id, title: 'Interlocks', need: 4, have: 1 }),
    ];
    const cs = gateCriteria(ph, items);
    expect(cs.find(c => c.what === 'Guarding fitted')?.met).toBe(true);
    expect(cs.find(c => c.what === 'Guarding sign-off')?.met).toBe(false);
    expect(cs.find(c => c.what === 'Interlocks')?.why).toBe('1 of 4');
  });

  it('ignores records belonging to another stage', () => {
    const mech = phase('mechanical'), sat = phase('sat');
    const items = [task({ phaseId: sat.id, title: 'Not mine', state: 'todo' })];
    expect(gateCriteria(mech, items).map(c => c.what)).not.toContain('Not mine');
  });

  it('IMPOSES no open grade-A defects from mechanical completion onward', () => {
    // Whatever anybody typed. A gate whose conditions are only the rows somebody
    // remembered to add is a gate that can be passed around.
    const open = [punch({ severity: 'A', closedAt: undefined, title: 'Former roller' })];
    for (const key of ['mechanical', 'sat', 'rate', 'handover'] as const) {
      const c = gateCriteria(phase(key), open).find(x => x.what === 'No open grade-A defects');
      expect(c, `${key} does not impose the grade-A rule`).toBeTruthy();
      expect(c!.met).toBe(false);
      expect(c!.why).toContain('Former roller');
    }
    // …and not before the line is even built.
    for (const key of ['fat', 'install'] as const) {
      expect(gateCriteria(phase(key), open).find(x => x.what === 'No open grade-A defects')).toBeUndefined();
    }
  });

  it('will not pass rate proving with a program short of its agreed rate', () => {
    const items = [program({ agreedRate: 60, runs: [run(51)] })];
    const c = gateCriteria(phase('rate'), items).find(x => x.what.startsWith('Every program proven'));
    expect(c!.met).toBe(false);
    expect(c!.why).toBe('0 of 1 proven');
  });

  it('will not pass rate proving with NO programs listed at all', () => {
    // An empty list is not "all proven". This is the failure mode where a gate
    // passes because nobody filled anything in.
    const c = gateCriteria(phase('rate'), []).find(x => x.what.startsWith('Every program proven'));
    expect(c!.met).toBe(false);
    expect(c!.why).toBe('no programs listed yet');
  });

  it('handover also wants every test passed and the material on site', () => {
    const items = [
      program({ runs: [run(61)] }),
      check({ outcome: 'notRun' }),
      material({ need: 10, have: 2 }),
    ];
    const cs = gateCriteria(phase('handover'), items);
    expect(cs.find(c => c.what === 'Every acceptance test passed')!.met).toBe(false);
    expect(cs.find(c => c.what === 'Material on site to run')!.met).toBe(false);
  });

  it('canPass is false while anything is open, and true only when all of it is met', () => {
    const ph = phase('mechanical');
    const owed = [task({ phaseId: ph.id, state: 'todo' })];
    expect(canPass(ph, owed)).toBe(false);

    const met = [task({ phaseId: ph.id, state: 'done' })];
    expect(canPass(ph, met)).toBe(true);
  });

  it('an EMPTY gate cannot be passed — nothing proved is not proof', () => {
    expect(canPass(phase('fat'), [])).toBe(false);
  });
});

describe('the programme, read whole', () => {
  it('reports the handover date and how far it has moved', () => {
    const ps = six({ handover: { plannedAt: '2026-11-03', forecastAt: '2026-11-14' } });
    const p = programme(ps, []);
    expect(p.handoverAt).toBe('2026-11-14');
    expect(p.handoverSlip).toBe(11);
  });

  it('falls back to the planned date when nothing has been forecast yet', () => {
    expect(programme(six({ handover: { plannedAt: '2026-11-03' } }), []).handoverAt).toBe('2026-11-03');
  });

  it('carries what is blocking the CURRENT gate, and nothing from later ones', () => {
    const ps = six({ fat: { passedAt: '2026-09-12' }, install: { passedAt: '2026-09-28' } });
    const items = [
      task({ phaseId: 'ph-mechanical', title: 'Guarding sign-off', state: 'todo' }),
      task({ phaseId: 'ph-sat', title: 'Much later', state: 'todo' }),
    ];
    const p = programme(ps, items);
    expect(p.current?.key).toBe('mechanical');
    expect(p.blocking.map(b => b.what)).toContain('Guarding sign-off');
    expect(p.blocking.map(b => b.what)).not.toContain('Much later');
  });

  it('has nothing blocking once the job is done', () => {
    const ps = PHASE_ORDER.map(k => phase(k, { passedAt: '2026-11-14' }));
    expect(programme(ps, []).blocking).toEqual([]);
  });
});

describe('the next seven days', () => {
  const TODAY = new Date('2026-10-07T09:00:00Z');

  it('shows dated work inside the window, soonest first', () => {
    const items = [
      task({ title: 'Interlock test', due: '2026-10-08', state: 'todo', owner: 'Dave' }),
      task({ title: 'Services sign-off', due: '2026-10-09', state: 'todo' }),
      task({ title: 'Miles away', due: '2026-11-20', state: 'todo' }),
    ];
    const week = comingUp([], items, 7, TODAY);
    expect(week.map(d => d.what)).toEqual(['Interlock test', 'Services sign-off']);
  });

  it('puts overdue things FIRST and keeps them there', () => {
    // A date that has passed does not stop mattering, which is exactly what a
    // plain "next 7 days" filter would do with it.
    const items = [
      task({ title: 'Due tomorrow', due: '2026-10-08', state: 'todo' }),
      task({ title: 'Was due last week', due: '2026-09-30', state: 'todo' }),
    ];
    const week = comingUp([], items, 7, TODAY);
    expect(week[0].what).toBe('Was due last week');
    expect(week[0].late).toBe(true);
    expect(week[1].late).toBe(false);
  });

  it('leaves out anything already done', () => {
    const items = [task({ title: 'Finished', due: '2026-10-08', state: 'done' })];
    expect(comingUp([], items, 7, TODAY)).toEqual([]);
  });

  it('includes a stage that is coming up, but not one already passed', () => {
    const ps = [
      phase('mechanical', { forecastAt: '2026-10-09' }),
      phase('install', { forecastAt: '2026-10-08', passedAt: '2026-10-08' }),
    ];
    const week = comingUp(ps, [], 7, TODAY);
    expect(week.map(d => d.what)).toEqual([PHASE_NAME.mechanical]);
    expect(week[0].kind).toBe('phase');
  });
});
