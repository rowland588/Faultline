/* INSTALL, AS DATA.
 *
 * Rowland: "the issues and stages that are taking place on a day to day basis,
 * telling a story." A machine's installation is its install steps; this asserts
 * what the Install screen says of them, and that they are counted as install —
 * never as tests — everywhere else a test is counted. */
import { describe, it, expect } from 'vitest';
import { cleanStages, installOf, usualStages } from '../install';
import { standing } from '../standing';
import { INSTALL_STAGES, isSettled, outcomeWord, rootTestOf, testOfFix, verdictQuestion, type Asset, type Test, type TestItem } from '../testing';
import { jobItems, portfolio, type JobInput } from '../portfolio';
import { niceDay } from '../weeks';
import type { Project } from '../../types';

/* The day the way the screen prints it — the locale decides "Sep" or "Sept". */
const day = (iso: string) => niceDay(iso, { weekday: 'short' });

const TODAY = '2026-09-30';
let n = 0;
const asset = (o: Partial<Asset> = {}): Asset =>
  ({ id: `a${++n}`, projectId: 'p', name: 'Case packer', oem: 'Brillopak', state: 'onSite', onSiteOn: '2026-09-22', sort: n, updatedAt: 1, ...o });
const step = (o: Partial<Test> & { title: string }): Test =>
  ({ id: `s${++n}`, projectId: 'p', kind: 'install', outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
const found = (testId: string, what: string): TestItem =>
  ({ id: `i${++n}`, projectId: 'p', testId, kind: 'found', what, sort: n, createdAt: 1, updatedAt: 1 });

const packer = asset();
const air = step({ title: 'Air and power connected', sort: 2, assetId: packer.id, withWhom: 'Brillopak', plannedFor: '2026-09-24', ranOn: '2026-09-24', outcome: 'passed' });
const steps = [
  step({ title: 'Positioned and levelled', sort: 1, assetId: packer.id, withWhom: 'Brillopak', plannedFor: '2026-09-23', ranOn: '2026-09-23', outcome: 'passed' }),
  air,
  step({ title: 'Electrically complete', sort: 3, assetId: packer.id, withWhom: 'Brillopak', plannedFor: '2026-09-28' }),
  step({ title: 'Dry run', sort: 4, assetId: packer.id, withWhom: 'Brillopak', plannedFor: '2026-10-03' }),
];
const regulator: Test = { id: 'f1', projectId: 'p', kind: 'fix', title: 'Send the regulator', fromTestId: air.id, withWhom: 'Brillopak', outcome: 'planned', sort: 99, createdAt: 1, updatedAt: 1 };
const items = [found(air.id, 'Regulator missing')];

describe('a machine part-way through its installation', () => {
  const m = installOf(packer, [...steps, regulator], items, TODAY);

  it('keeps its steps in the order they happen', () => {
    expect(m.steps.map(s => s.step.title)).toEqual(['Positioned and levelled', 'Air and power connected', 'Electrically complete', 'Dry run']);
  });

  it('marks what is done, what is late, and the one it is waiting on', () => {
    expect(m.steps.map(s => s.tone)).toEqual(['done', 'done', 'late', 'ahead']);
    expect(m.steps.find(s => s.next)?.step.title).toBe('Electrically complete');
    expect(m).toMatchObject({ done: 2, total: 4, late: 1 });
  });

  it('counts what was found doing a step, and the fixes for it', () => {
    expect(m.steps[1].found).toBe(1);
    expect(m.fixesOpen).toBe(1);
  });

  it('says it in one sentence, naming whose the late step is', () => {
    expect(m.says).toBe(`2 of 4 done. Electrically complete is late — it was due ${day('2026-09-28')}, Brillopak’s. 1 fix still open from it.`);
  });

  it('does not ask to mark it installed while steps are left', () => {
    expect(m.ready).toBe(false);
  });
});

describe('the other ends of an installation', () => {
  it('leads with a problem, because it is why the next step waits', () => {
    const stuck = step({ title: 'Air and power connected', assetId: packer.id, ranOn: '2026-09-29', outcome: 'failed', result: 'No air drop at this end of the line' });
    expect(installOf(packer, [stuck], [], TODAY).says).toBe('0 of 1 done. Air and power connected hit a problem — No air drop at this end of the line.');
  });

  it('names the next step, its day and who, when nothing is late', () => {
    const s = step({ title: 'Dry run', assetId: packer.id, plannedFor: '2026-10-02', withWhom: 'Brillopak' });
    expect(installOf(packer, [s], [], TODAY).says).toBe(`0 of 1 done. Next: Dry run, ${day('2026-10-02')}, Brillopak.`);
  });

  it('asks to mark the machine installed once every step is done', () => {
    const done = INSTALL_STAGES.map(title => step({ title, assetId: packer.id, outcome: 'passed', ranOn: '2026-09-29' }));
    const m = installOf(packer, done, [], TODAY);
    expect(m).toMatchObject({ ready: true, done: 6, total: 6 });
    expect(m.says).toBe('All 6 steps done.');
    expect(installOf({ ...packer, installedOn: '2026-09-29' }, done, [], TODAY)).toMatchObject({ ready: false, says: 'Installed — all 6 steps done.' });
  });

  it('keeps the line’s own steps apart from any machine’s', () => {
    const lineStep = step({ title: 'Mezzanine handrail', plannedFor: '2026-10-05' });
    expect(installOf(undefined, [...steps, lineStep], [], TODAY).steps.map(s => s.step.title)).toEqual(['Mezzanine handrail']);
    expect(installOf(packer, [...steps, lineStep], [], TODAY).total).toBe(4);
  });

  it('does not offer a plan to a machine already in', () => {
    expect(installOf({ ...packer, state: 'running', runningOn: '2026-09-20' }, [], [], TODAY).says).toBe('Already installed — no steps were kept for it.');
    expect(installOf(packer, [], [], TODAY).says).toBe('No install steps yet.');
  });

  it('never counts a deleted step', () => {
    expect(installOf(packer, [step({ title: 'Gone', assetId: packer.id, deletedAt: 5 })], [], TODAY).total).toBe(0);
  });
});

describe('an install step, in the words of an install step', () => {
  it('is done, not passed — and stays owed when it hits a problem', () => {
    expect(outcomeWord({ kind: 'install', outcome: 'passed' })).toBe('Done');
    expect(outcomeWord({ kind: 'install', outcome: 'failed' })).toBe('Hit a problem');
    expect(verdictQuestion('install')).toBe('Is it done?');
    expect(isSettled({ ...steps[0], outcome: 'failed' })).toBe(false);
    expect(isSettled(steps[0])).toBe(true);
  });

  it('is something a fix can be for, as a test is', () => {
    expect(testOfFix(regulator, [...steps, regulator])?.id).toBe(air.id);
    expect(rootTestOf(air, steps)?.id).toBe(air.id);
  });
});

describe('counted as install, never as a test', () => {
  const s = standing({ tests: [...steps, regulator], items, materials: [], programs: [], assets: [packer], today: TODAY });

  it('has its own row in what we are waiting on, first', () => {
    expect(s.rows[0]).toMatchObject({ key: 'install', open: 2, late: 1, whose: 'Brillopak × 2', lateWhose: 'Brillopak' });
    expect(s.rows.find(r => r.key === 'tests')).toBeUndefined();
  });

  it('draws in its own lane on the plan', () => {
    expect(s.plan.filter(m => m.kind === 'install').map(m => m.label)).toEqual(steps.map(x => x.title));
    expect(s.plan.some(m => m.kind === 'test')).toBe(false);
  });

  it('owes on the all-jobs board under its own name', () => {
    const project = { id: 'p', name: 'Line 2B', color: '#2b87d4', workspaceIds: [], createdAt: 1, updatedAt: 1, commissioning: true } as Project;
    const j: JobInput = { project, tests: [...steps, regulator], items, materials: [], programs: [], assets: [packer] };
    expect(jobItems(j, TODAY).filter(x => x.kind === 'install').map(x => x.what)).toEqual(['Electrically complete', 'Dry run']);
    /* The fitter's name is the supplier's here because the machine says so —
       an install step never makes somebody a supplier on its own. */
    const pf = portfolio([{ ...j, assets: [] }], TODAY);
    expect(pf.owes.find(o => o.kind === 'supplier')).toBeUndefined();
  });
});

/* "Allow me to edit the 6 install names that you have made as default." */
describe('the usual stages, the job’s own', () => {
  const job = (id: string, updatedAt: number, installStages?: string[]) => ({ id, updatedAt, installStages });

  it('uses the job’s own list first', () => {
    const own = ['Landed', 'Bolted down', 'Wired'];
    expect(usualStages(job('a', 1, own), [job('a', 1, own)])).toEqual({ stages: own, from: 'job' });
  });

  it('borrows the list edited most recently on another job, so it is typed once', () => {
    const older = job('b', 5, ['Old way']);
    const newer = job('c', 9, ['Landed', 'Wired']);
    expect(usualStages(job('a', 1), [job('a', 1), older, newer])).toEqual({ stages: ['Landed', 'Wired'], from: 'other', otherId: 'c' });
  });

  it('falls back to the app’s six', () => {
    expect(usualStages(job('a', 1), [job('a', 1)])).toEqual({ stages: [...INSTALL_STAGES], from: 'app' });
  });

  it('saves what was meant: trimmed, no blanks, no repeats — and the app’s six as nothing', () => {
    expect(cleanStages(['  Landed ', '', 'landed', 'Bolted   down'])).toEqual(['Landed', 'Bolted down']);
    expect(cleanStages([...INSTALL_STAGES])).toBeUndefined();
  });
});
