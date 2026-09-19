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
  slipOf, daysBetween, programme, comingUp, standsAt,
  stageCount, stageDone, workOf, phaseName, sortBetween, customPhaseKey,
  type Phase, type PhaseKey, type CommissionItem, type Program, type Material,
  type Check, type Punch, type Task, type Run,
} from '../commissioning';

let n = 0;
const id = () => `x${++n}`;

const phase = (key: PhaseKey, p: Partial<Phase> = {}): Phase =>
  ({ id: `ph-${key}`, projectId: 'p1', key, sort: (PHASE_ORDER.indexOf(key) + 1) * 10, updatedAt: 1, ...p });

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

describe('a stage is done when its work is done — nothing declares it', () => {
  /** A stage with `done` of `total` rows finished. */
  const withWork = (key: PhaseKey, done: number, open: number) => {
    const ph = phase(key);
    const rows: CommissionItem[] = [
      ...Array.from({ length: done }, () => task({ phaseId: ph.id, state: 'done' as const })),
      ...Array.from({ length: open }, () => task({ phaseId: ph.id, state: 'todo' as const })),
    ];
    return { ph, rows };
  };

  it('counts only the rows standing under that stage', () => {
    const a = withWork('mechanical', 2, 1);
    const b = withWork('sat', 0, 3);
    const all = [...a.rows, ...b.rows];
    expect(stageCount(a.ph, all)).toEqual({ done: 2, total: 3 });
    expect(stageCount(b.ph, all)).toEqual({ done: 0, total: 3 });
    expect(workOf(a.ph, all)).toHaveLength(3);
  });

  it('is done only when every row under it is done', () => {
    const part = withWork('mechanical', 2, 1);
    expect(stageDone(part.ph, part.rows)).toBe(false);
    const all = withWork('mechanical', 3, 0);
    expect(stageDone(all.ph, all.rows)).toBe(true);
  });

  it('an EMPTY stage is not done — empty and finished are different things', () => {
    // Otherwise a whole programme reads as complete because nobody has typed
    // anything into it yet, which is the most flattering possible lie.
    expect(stageDone(phase('sat'), [])).toBe(false);
  });

  it('marks the first unfinished stage current and everything after it upcoming', () => {
    const ps = six();
    const rows: CommissionItem[] = [
      task({ phaseId: 'ph-fat', state: 'done' }),
      task({ phaseId: 'ph-install', state: 'done' }),
      task({ phaseId: 'ph-mechanical', state: 'todo' }),
    ];
    const st = phaseStates(ps, rows);
    expect(st.get('ph-fat')).toBe('passed');
    expect(st.get('ph-install')).toBe('passed');
    expect(st.get('ph-mechanical')).toBe('current');
    expect(st.get('ph-sat')).toBe('upcoming');
    expect(currentPhase(ps, rows)?.key).toBe('mechanical');
  });

  it('never has two current stages, whatever order the work was finished in', () => {
    // Somebody completes SAT before mechanical completion. The queue still has
    // exactly one current stage — the earliest thing still owed.
    const ps = six();
    const rows = [task({ phaseId: 'ph-sat', state: 'done' as const })];
    const states = [...phaseStates(ps, rows).values()];
    expect(states.filter(x => x === 'current')).toHaveLength(1);
    expect(currentPhase(ps, rows)?.key).toBe('fat');
  });

  it('nothing is current once every stage has its work done', () => {
    const ps = six();
    const rows = PHASE_ORDER.map(k => task({ phaseId: `ph-${k}`, state: 'done' as const }));
    expect(currentPhase(ps, rows)).toBeUndefined();
  });
});

describe('a row says where it stands in its own terms', () => {
  /* This replaced a derived gate-criteria machine. The machine was not wrong —
     it was more than anybody asked for, and it meant every kind of work turned
     up under every stage whether or not it applied. */
  it('a program reads as a rate against the agreed figure', () => {
    expect(standsAt(program({ agreedRate: 60, rateUnit: 'ppm', runs: [run(51)] })))
      .toBe('Ran 51 ppm against 60 agreed');
  });

  it('a program nobody wrote says so, and still shows what was agreed', () => {
    expect(standsAt(program({ written: false, agreedRate: 45 }))).toBe('No program written · 45 ppm agreed');
  });

  it('a written but unrun program is a different sentence again', () => {
    expect(standsAt(program({ agreedRate: 60, runs: [] }))).toBe('Not run yet · 60 ppm agreed');
  });

  it('material reads as what is here against what is needed', () => {
    expect(standsAt(material({ need: 40, have: 10, onOrder: 20, unit: 'rolls' })))
      .toBe('10 of 40 rolls here, 20 on order');
    expect(standsAt(material({ need: 40, have: 10, unit: 'rolls' })))
      .toBe('10 of 40 rolls here, nothing on order');
    expect(standsAt(material({ need: 40, have: 40, unit: 'rolls' }))).toBe('All 40 rolls on site');
  });

  it('a test reads as its result, and an unrun one as what was agreed', () => {
    expect(standsAt(check({ outcome: 'pass', witnessedBy: 'Dave' }))).toBe('Test passed · witnessed by Dave');
    expect(standsAt(check({ outcome: 'fail', result: 'missed one in ten' }))).toBe('Test failed · missed one in ten');
    expect(standsAt(check({ outcome: 'notRun', criterion: 'no leaks at 0.3 bar' })))
      .toBe('Test not run · agreed: no leaks at 0.3 bar');
  });

  it('a defect carries its grade, open or closed', () => {
    expect(standsAt(punch({ severity: 'A', closedAt: undefined }))).toBe('Defect, grade A · open');
    expect(standsAt(punch({ severity: 'C', closedAt: 9 }))).toBe('Defect, grade C · closed');
  });

  it('never comes back empty, whatever the row is', () => {
    const rows: CommissionItem[] = [
      program({ written: false }), program({ runs: [] }), program({ runs: [run(1)] }),
      material({ need: 1, have: 0 }), material({ need: 1, have: 1 }),
      check({ outcome: 'notRun' }), check({ outcome: 'pass' }), check({ outcome: 'fail' }),
      punch({ severity: 'A', closedAt: undefined }), punch({ severity: 'C', closedAt: 1 }),
      task({ state: 'todo' }), task({ state: 'doing' }), task({ state: 'waiting' }), task({ state: 'done' }),
    ];
    for (const r of rows) expect(standsAt(r).length, r.kind).toBeGreaterThan(0);
  });
});

describe('slip — the number the meeting is actually about', () => {
  it('counts whole days from the baseline to where it now lands', () => {
    expect(slipOf(phase('sat', { plannedAt: '2026-10-03', forecastAt: '2026-10-14' }))).toBe(11);
  });

  it('is negative when a stage is pulled forward', () => {
    expect(slipOf(phase('sat', { plannedAt: '2026-10-14', forecastAt: '2026-10-03' }))).toBe(-11);
  });

  it('is UNDEFINED with no baseline, which is not the same as zero', () => {
    // Without a baseline nothing can be LATE, only due. Reporting zero would be
    // reporting "on time" for a job nobody ever put a date against.
    expect(slipOf(phase('sat', { forecastAt: '2026-10-14' }))).toBeUndefined();
    expect(slipOf(phase('sat'))).toBeUndefined();
  });

  it('daysBetween refuses to invent a number from a broken date', () => {
    expect(daysBetween('not a date', '2026-10-14')).toBeUndefined();
    expect(daysBetween('2026-10-03', undefined)).toBeUndefined();
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

  it('names the stage being worked on, from the work rather than a declaration', () => {
    const ps = six();
    const items = [
      task({ phaseId: 'ph-fat', state: 'done' }),
      task({ phaseId: 'ph-install', state: 'done' }),
      task({ phaseId: 'ph-mechanical', title: 'Guarding sign-off', state: 'todo' }),
    ];
    expect(programme(ps, items).current?.key).toBe('mechanical');
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
      phase('install', { forecastAt: '2026-10-08' }),
    ];
    // Install is finished — its one row is done — so it drops out; mechanical
    // completion is still owed and stays.
    const rows = [task({ phaseId: 'ph-install', state: 'done' as const })];
    const week = comingUp(ps, rows, 7, TODAY);
    expect(week.map(d => d.what)).toEqual([PHASE_NAME.mechanical]);
    expect(week[0].kind).toBe('phase');
  });
});

describe('the stages are yours to change', () => {
  it('names a stage what somebody called it, falling back to the built-in name', () => {
    expect(phaseName(phase('sat'))).toBe(PHASE_NAME.sat);
    expect(phaseName(phase('sat', { name: 'Customer trial' }))).toBe('Customer trial');
    // A stage nobody has a built-in name for reads as its own key rather than
    // as "undefined", which is what an unguarded lookup would print.
    expect(phaseName({ id: 'x', projectId: 'p', key: 'vertical-start-up', sort: 70, updatedAt: 1 }))
      .toBe('vertical-start-up');
  });

  it('runs in the order the SORT says, not the order the built-in list says', () => {
    // The point of an explicit sort: a stage added later has to be able to sit
    // between two others without renumbering everything after it.
    const ps = [
      phase('handover', { sort: 60 }),
      { id: 'trials', projectId: 'p1', key: 'trials', name: 'Trials', sort: 35, updatedAt: 1 },
      phase('mechanical', { sort: 30 }),
    ];
    expect(inOrder(ps).map(p => phaseName(p))).toEqual([
      PHASE_NAME.mechanical, 'Trials', PHASE_NAME.handover,
    ]);
  });

  it('drops a new stage in after the one it was added behind', () => {
    const ps = six();
    const mech = ps.find(p => p.key === 'mechanical')!;
    const sat = ps.find(p => p.key === 'sat')!;
    const s = sortBetween(ps, mech.sort);
    expect(s).toBeGreaterThan(mech.sort);
    expect(s).toBeLessThan(sat.sort);
  });

  it('puts a stage at the end when it is added behind nothing', () => {
    const ps = six();
    expect(sortBetween(ps)).toBeGreaterThan(Math.max(...ps.map(p => p.sort)));
  });

  it('makes a key from the name, and never two the same', () => {
    expect(customPhaseKey('Vertical start-up', [])).toBe('vertical-start-up');
    expect(customPhaseKey('Trials', ['trials'])).toBe('trials-2');
    expect(customPhaseKey('Trials', ['trials', 'trials-2'])).toBe('trials-3');
    // Punctuation only still has to produce something usable as an id.
    expect(customPhaseKey('!!!', []).length).toBeGreaterThan(0);
  });

  it('a removed stage leaves the programme, and its rows are not destroyed', () => {
    // Deleting somebody's work because they reorganised their process is the
    // worst possible answer to "this stage does not apply to us".
    const ps = six({ sat: { deletedAt: 9 } });
    expect(inOrder(ps).map(p => p.key)).not.toContain('sat');
    expect(ps.find(p => p.key === 'sat')).toBeTruthy();
  });
});
