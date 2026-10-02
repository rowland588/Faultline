/* INSTALL, AS DATA.
 *
 * Rowland: "the issues and stages that are taking place on a day to day basis,
 * telling a story." A machine's installation is its install steps; this asserts
 * what the Install screen says of them, and that they are counted as install —
 * never as tests — everywhere else a test is counted. */
import { describe, it, expect } from 'vitest';
import { cleanStages, foldInto, installGrid, installOf, jobJourney, journeyNow, journeyOf, keepStages, redReasons, stageRenames, untouched, usualStages } from '../install';
import { standing } from '../standing';
import { HANDOVER_STAGES, INSTALL_STAGES, SETUP_STAGES, wordsOf, isSettled, outcomeWord, rootTestOf, testOfFix, verdictQuestion, type Asset, type Test, type TestItem } from '../testing';
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

  it('says both ends when a step is planned as a block of days', () => {
    const s = step({ title: 'Dry run', assetId: packer.id, plannedFor: '2026-10-05', plannedTo: '2026-10-09' });
    expect(installOf(packer, [s], [], TODAY).says).toBe(`0 of 1 done. Next: Dry run, ${day('2026-10-05')} to ${day('2026-10-09')}.`);
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

/* "Two, three, four, five assets all being installed — each of the six steps
   within each of them, and fast." */
describe('the grid: every machine at once', () => {
  const coder: Asset = { ...packer, id: 'coder', name: 'Coder', sort: 99 };
  const usual = ['Positioned and levelled', 'Air and power connected', 'Electrically complete', 'Dry run'];

  it('puts the job’s stages across the top, in its order, then any other stage in use', () => {
    const extra = step({ title: 'Guards fitted', assetId: coder.id, sort: 500 });
    const g = installGrid([packer, coder], [...steps, extra], [], TODAY, usual);
    expect(g.columns).toEqual([...usual, 'Guards fitted']);
  });

  it('gives every machine a row and a cell per stage, empty where it has not been added', () => {
    const g = installGrid([packer, coder], steps, [], TODAY, usual);
    expect(g.rows.map(r => r.asset?.name)).toEqual(['Case packer', 'Coder']);
    expect(g.rows[0].cells.map(c => c?.tone ?? null)).toEqual(['done', 'done', 'late', 'ahead']);
    expect(g.rows[1].cells.every(c => c === undefined)).toBe(true);
    expect(g.rows.map(r => r.missing)).toEqual([0, 4]);
  });

  it('matches a stage by name whatever the case or spacing it was typed in', () => {
    const s = step({ title: '  dry   RUN ', assetId: coder.id });
    expect(installGrid([coder], [s], [], TODAY, usual).rows[0].cells[3]?.step.id).toBe(s.id);
  });

  it('keeps a machine already in and running, with no steps, as a row of its own', () => {
    const running: Asset = { ...coder, id: 'run', name: 'Wrapper', state: 'running', runningOn: '2026-09-10' };
    const g = installGrid([packer, running], steps, [], TODAY, usual);
    expect(g.rows.map(r => r.asset?.name)).toEqual(['Case packer', 'Wrapper']);
    expect(g.rows[1].view.says).toBe('Already installed — no steps were kept for it.');
  });

  it('adds the line’s own row only when the line has steps', () => {
    expect(installGrid([packer], steps, [], TODAY, usual).rows).toHaveLength(1);
    const lineStep = step({ title: 'Mezzanine handrail' });
    expect(installGrid([packer], [...steps, lineStep], [], TODAY, usual).rows.map(r => r.asset?.name ?? 'line')).toEqual(['Case packer', 'line']);
  });
});

describe('a stage that was changed', () => {
  it('reads a rename: same place, new name, old name gone', () => {
    const before = ['Positioned and levelled', 'Air and power connected', 'Sensors and controls checked (I/O)', 'Dry run'];
    expect(stageRenames(before, ['Positioned and levelled', 'Air and power connected', 'Controls proven', 'Dry run']))
      .toEqual([{ from: 'Sensors and controls checked (I/O)', to: 'Controls proven' }]);
    /* moved, added or removed is not a rename */
    expect(stageRenames(before, ['Air and power connected', 'Positioned and levelled', 'Sensors and controls checked (I/O)', 'Dry run'])).toEqual([]);
    expect(stageRenames(before, [...before, 'Guards on'])).toEqual([]);
  });
  it('puts a step under the app’s old name "I/O checked" in the I/O column — six columns, not seven', () => {
    /* Rowland's live job: steps made before the fifth stage was renamed. */
    const m = asset({ id: 'live' });
    const names = ['Positioned and levelled', 'Mechanically complete', 'Air and power connected', 'Electrically complete', 'I/O checked', 'Dry run'];
    const tests = names.map((title, i) => step({ title, sort: i, assetId: m.id }));
    const g = installGrid([m], tests, [], '2026-10-01', INSTALL_STAGES);
    expect(g.columns).toEqual([...INSTALL_STAGES]);
    expect(g.rows[0].cells.every(Boolean)).toBe(true);
    expect(g.rows[0].missing).toBe(0);
  });
  it('moves steps into a stage, except where the machine already has it', () => {
    const a = asset({ id: 'a' }), b = asset({ id: 'b', name: 'Coder' });
    const old = [step({ id: 's1', title: 'Sensors and controls checked (I/O)', assetId: a.id }), step({ id: 's2', title: 'Sensors and controls checked (I/O)', assetId: b.id })];
    const tests = [...old, step({ id: 's3', title: 'Controls proven', assetId: b.id })];
    const { move, clash } = foldInto(old, tests, 'Controls proven');
    expect(move.map(t => t.id)).toEqual(['s1']);
    expect(clash.map(t => t.id)).toEqual(['s2']);
  });
  it('only offers to remove steps nobody has touched', () => {
    const fresh = step({ id: 'f', title: 'X' });
    const done = step({ id: 'd', title: 'X', outcome: 'passed', ranOn: '2026-09-20' });
    const written = step({ id: 'w', title: 'X' });
    const fixed = step({ id: 'x', title: 'X' });
    const tests = [fresh, done, written, fixed, { ...step({ id: 'fx', title: 'Send the part' }), kind: 'fix' as const, fromTestId: 'x' }];
    const items = [found('w', 'Bracket holes do not line up')];
    expect([fresh, done, written, fixed].filter(t => untouched(t, tests, items)).map(t => t.id)).toEqual(['f']);
  });
});

describe('the gates after install', () => {
  const m = asset({ id: 'g1', name: 'Wrapper' });
  const ins = step({ id: 'i1', title: 'Dry run', assetId: m.id });
  const set = { ...step({ id: 'u1', title: 'Programs loaded', assetId: m.id }), gate: 'setup' as const };
  const hand = { ...step({ id: 'h1', title: 'Client signed off', assetId: m.id, outcome: 'passed', ranOn: '2026-09-30' }), gate: 'handover' as const };
  const tests = [ins, set, hand];

  it('each gate reads only its own steps', () => {
    expect(installOf(m, tests, [], '2026-10-01').steps.map(s => s.step.id)).toEqual(['i1']);
    expect(installOf(m, tests, [], '2026-10-01', 'setup').steps.map(s => s.step.id)).toEqual(['u1']);
    expect(installOf(m, tests, [], '2026-10-01', 'handover').done).toBe(1);
  });
  it('only Install offers "mark it installed"', () => {
    const solo = { ...set, outcome: 'passed' as const, ranOn: '2026-09-30' };
    expect(installOf(m, [solo], [], '2026-10-01', 'setup').ready).toBe(false);
  });
  it('the grid for a gate has that gate’s stages as columns', () => {
    const g = installGrid([m], tests, [], '2026-10-01', SETUP_STAGES, 'setup');
    expect(g.columns).toEqual([...SETUP_STAGES]);
    expect(g.rows[0].cells.filter(Boolean)).toHaveLength(1);
  });
  it('each gate keeps its own list, falling back to the app’s', () => {
    const p = { id: 'p', updatedAt: 1, gateStages: { handover: ['Keys returned', 'Client signed off'] } };
    expect(usualStages(p, [], 'handover')).toEqual({ stages: ['Keys returned', 'Client signed off'], from: 'job' });
    expect(usualStages(p, [], 'setup')).toEqual({ stages: [...SETUP_STAGES], from: 'app' });
    expect(usualStages(p, [], 'install').stages).toEqual([...INSTALL_STAGES]);
  });
  it('saving one gate’s list leaves the others alone', () => {
    const p = { id: 'p', updatedAt: 1, installStages: ['A'], gateStages: { setup: ['S'] } };
    expect(keepStages(p, 'handover', ['H'])).toEqual({ gateStages: { setup: ['S'], handover: ['H'] } });
    expect(keepStages(p, 'install', ['B'])).toEqual({ installStages: ['B'] });
    expect(cleanStages([...HANDOVER_STAGES], 'handover')).toBeUndefined();
  });
  it('a step at a gate is named by its gate', () => {
    expect(wordsOf(set).one).toBe('Set-up step');
    expect(wordsOf(hand).one).toBe('Hand-over item');
    expect(wordsOf(ins).one).toBe('Install step');
  });
  it('what is owed is counted per gate', () => {
    const st = standing({ tests: [ins, set, hand], items: [], assets: [m], materials: [], programs: [], today: '2026-10-01' });
    expect(st.rows.map(r => r.key)).toEqual(expect.arrayContaining(['install', 'setup']));
    expect(st.rows.find(r => r.key === 'install')?.open).toBe(1);
    expect(st.rows.find(r => r.key === 'setup')?.open).toBe(1);
    expect(st.rows.some(r => r.key === 'handover')).toBe(false);
  });
});

describe('where each machine is, gate by gate', () => {
  const T = '2026-10-01';
  it('reads each gate off what is kept, and says the gate it is at', () => {
    const m = asset({ id: 'j1', state: 'installed', installedOn: '2026-09-25' });
    const tests: Test[] = [
      { ...step({ id: 'js1', title: 'Programs loaded', assetId: m.id, outcome: 'passed', ranOn: '2026-09-28' }), gate: 'setup' },
      { ...step({ id: 'js2', title: 'Change parts fitted', assetId: m.id, plannedFor: '2026-09-29' }), gate: 'setup' },
      { ...step({ id: 'jt1', title: 'Seal integrity', assetId: m.id, plannedFor: '2026-10-05' }), kind: 'test' },
    ];
    const j = journeyOf(m, tests, [], T);
    expect(j.map(g => [g.label, g.tone])).toEqual([
      ['Install', 'done'],          // already installed, no steps kept
      ['Set up', 'late'],           // one done, one past its day
      ['Commission', 'ahead'],      // a test booked, not yet run
      ['Hand over', 'none'],        // nothing kept yet
    ]);
    expect(journeyNow(j)).toBe('Set up');
  });
  it('a machine through every gate is handed over', () => {
    const m = asset({ id: 'j2' });
    const done = (title: string, o: Partial<Test> = {}) => step({ title, assetId: m.id, outcome: 'passed', ranOn: '2026-09-20', ...o });
    const tests: Test[] = [done('Dry run'), { ...done('Programs loaded'), gate: 'setup' }, { ...done('Weight accuracy'), kind: 'test' }, { ...done('Client signed off'), gate: 'handover' }];
    const j = journeyOf(m, tests, [], T);
    expect(j.every(g => g.tone === 'done')).toBe(true);
    expect(journeyNow(j)).toBe('Handed over');
  });
});

describe('the gate a machine is at, on a job like Line 2B', () => {
  const T = '2026-10-01';
  const prog = (id: string, assetId: string, state: 'needed' | 'onMachine' | 'proved', provedOn?: string) =>
    ({ id, projectId: 'p', what: id, assetId, state, provedOn, sort: 1, createdAt: 1, updatedAt: 1 });
  it('on site, no install steps ever kept, programs loaded and proved, testing under way: at Commission', () => {
    const pnp = asset({ id: 'pnp', state: 'onSite' });
    const tests: Test[] = [
      { ...step({ id: 't1', title: 'Express 1.25kg', assetId: pnp.id, outcome: 'passed', ranOn: '2026-09-29' }), kind: 'test' },
      { ...step({ id: 't2', title: 'Express 1.75', assetId: pnp.id }), kind: 'test' },
    ];
    const programs = [prog('a', pnp.id, 'proved', '2026-09-29'), prog('b', pnp.id, 'onMachine')];
    const j = journeyOf(pnp, tests, [], T, programs);
    expect(j.map(g => g.tone)).toEqual(['none', 'done', 'going', 'none']);
    expect(journeyNow(j)).toBe('Commission');
  });
  it('a program not written yet keeps Set up open', () => {
    const m = asset({ id: 'm2', state: 'onSite' });
    const j = journeyOf(m, [], [], T, [prog('a', m.id, 'proved', '2026-09-29'), prog('b', m.id, 'needed')]);
    expect(j[1].tone).toBe('going');
    expect(journeyNow(j)).toBe('Set up');
  });
  it('open install work holds the machine at Install, even with a test already passed', () => {
    const m = asset({ id: 'm3' });
    const tests: Test[] = [
      step({ title: 'Dry run', assetId: m.id, plannedFor: '2026-09-28' }),
      { ...step({ title: 'Weight accuracy', assetId: m.id, outcome: 'passed', ranOn: '2026-09-26' }), kind: 'test' },
    ];
    expect(journeyNow(journeyOf(m, tests, [], T))).toBe('Install');
  });
  it('nothing kept anywhere: at Install', () => {
    expect(journeyNow(journeyOf(asset({ id: 'm4', state: 'onSite' }), [], [], T))).toBe('Install');
  });
});

describe('the gate a whole job is at — what the all-jobs board shows', () => {
  const T = '2026-10-01';
  const bu = asset({ id: 'bu', state: 'onSite' }), pnp = asset({ id: 'pnp2', state: 'onSite' }), ds = asset({ id: 'ds', state: 'onSite' });
  const tests: Test[] = [
    { ...step({ id: 'x75', title: '75 ppm', assetId: bu.id, outcome: 'failed', ranOn: '2026-09-22' }), kind: 'test' },
    { ...step({ id: 'x125', title: 'Express 1.25kg', assetId: pnp.id, outcome: 'passed', ranOn: '2026-09-29' }), kind: 'test' },
  ];
  const programs = [{ id: 'pa', projectId: 'p', what: 'pa', assetId: pnp.id, state: 'proved' as const, provedOn: '2026-09-29', sort: 1, createdAt: 1, updatedAt: 1 }];
  it('puts every machine together: late if any is, and a machine with nothing kept holds nothing back', () => {
    const j = jobJourney([bu, pnp, ds], tests, [], T, programs);
    expect(j.map(g => g.tone)).toEqual(['none', 'done', 'late', 'none']);
    expect(journeyNow(j)).toBe('Commission');
  });
  it('planned install steps and nothing else: the job is at Install, still ahead — not "12 open"', () => {
    const m = asset({ id: 'a2' });
    const steps = INSTALL_STAGES.map((title, i) => step({ id: `s${i}`, title, assetId: m.id, sort: i }));
    const j = jobJourney([m], steps, [], T);
    expect(j[0].tone).toBe('ahead');
    expect(journeyNow(j)).toBe('Install');
  });
  it('a job with no machines yet is at Install', () => {
    expect(journeyNow(jobJourney([], [], [], T))).toBe('Install');
  });
});

/* NOTHING PRESSED CAN LEAVE A GATE RED FOR GOOD. Rowland pressed something on a
 * machine, the gate went red, and there was nothing to clear it. A test that
 * failed and was run again is history: the re-test says where the gate is. */
describe('a red gate that can be cleared', () => {
  const T = '2026-10-01';
  const m = asset({ id: 'r1', state: 'onSite' });
  const test = (o: Partial<Test> & { id: string; title: string }): Test =>
    ({ projectId: 'p', kind: 'test', assetId: m.id, outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });

  it('a failed test is red until it is run again', () => {
    const failed = test({ id: 'x1', title: 'Seal', outcome: 'failed', ranOn: '2026-09-29' });
    expect(journeyOf(m, [failed], [], T)[2].tone).toBe('late');
  });

  it('goes green once the re-test passes — the first attempt no longer holds it red', () => {
    const failed = test({ id: 'x1', title: 'Seal', outcome: 'failed', ranOn: '2026-09-29' });
    const again = test({ id: 'x2', title: 'Seal — re-test', fromTestId: 'x1', outcome: 'passed', ranOn: '2026-09-30' });
    expect(journeyOf(m, [failed, again], [], T)[2].tone).toBe('done');
  });

  it('and is not red while a re-test is merely booked ahead', () => {
    const failed = test({ id: 'x1', title: 'Seal', outcome: 'failed', ranOn: '2026-09-29' });
    const booked = test({ id: 'x2', title: 'Seal — re-test', fromTestId: 'x1', plannedFor: '2026-10-08' });
    expect(journeyOf(m, [failed, booked], [], T)[2].tone).not.toBe('late');
  });

  it('a step put back to planned stops being a problem', () => {
    const s = step({ id: 'y1', title: 'Positioned and levelled', assetId: m.id, plannedFor: '2026-10-09', outcome: 'failed', ranOn: '2026-10-01' });
    expect(journeyOf(m, [s], [], T)[0].tone).toBe('late');
    const back = { ...s, outcome: 'planned' as const, ranOn: undefined };
    expect(journeyOf(m, [back], [], T)[0].tone).toBe('ahead');
  });

  it('says why it is red, in the floor’s words', () => {
    const s = step({ id: 'y1', title: 'Positioned and levelled', assetId: m.id, outcome: 'failed', ranOn: '2026-10-01' });
    const failed = test({ id: 'x1', title: 'Seal', outcome: 'failed', ranOn: '2026-09-29' });
    expect(redReasons(m, [s, failed], [], T)).toEqual(['Positioned and levelled hit a problem', 'Seal did not pass']);
  });
});
