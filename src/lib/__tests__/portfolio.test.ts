/* THE ALL-JOBS BOARD, AS DATA.
 *
 * Rowland: "Line 2B commissioning, and next week Line 2A — how do I manage
 * each of them without going into everything?" One calendar for every job,
 * what is due this week across all of them, and who owes what across them —
 * asserted here, because a board that disagrees with the job it opens is
 * worse than no board. */
import { describe, it, expect } from 'vitest';
import { bonesSaid, clusterMarks, jobItems, needsYou, owedBy, pacedSays, portfolio, problemsSaid, saidText, shortName, type JobInput, type PacedInput } from '../portfolio';
import { gapOf, type LineSeries } from '../measures';
import type { PlacedMark } from '../plan';
import { standing } from '../standing';
import type { Project } from '../../types';
import type { Asset, Test, TestItem } from '../testing';
import type { Material } from '../materials';

const TODAY = '2026-09-29';
let n = 0;
const project = (o: Partial<Project> & { id: string; name: string }): Project =>
  ({ color: '#2b87d4', workspaceIds: [], createdAt: 1, updatedAt: 1, commissioning: true, ...o }) as Project;
const test = (o: Partial<Test> = {}): Test =>
  ({ id: `t${++n}`, projectId: 'p', title: `Test ${n}`, outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
const mat = (o: Partial<Material> = {}): Material =>
  ({ id: `m${++n}`, projectId: 'p', what: `Material ${n}`, sort: n, createdAt: 1, updatedAt: 1, ...o });
const asset = (o: Partial<Asset> = {}): Asset =>
  ({ id: `a${++n}`, projectId: 'p', name: `Machine ${n}`, state: 'awaited', sort: n, updatedAt: 1, ...o });
const job = (p: Project, o: Partial<JobInput> = {}): JobInput =>
  ({ project: p, tests: [], items: [], materials: [], programs: [], assets: [], ...o });

const twoB = job(project({ id: 'b', name: 'Line 2B', expectedAt: '2026-10-26', plannedAt: '2026-10-18' }), {
  tests: [
    test({ title: 'Changeover', withWhom: 'Ilapak UK', plannedFor: '2026-09-23', outcome: 'notRun' }),
    test({ title: 'Seal', withWhom: 'Ilapak UK', plannedFor: '2026-09-20', ranOn: '2026-09-20', outcome: 'passed' }),
    test({ kind: 'fix', title: 'Re-track the film', withWhom: 'Dave', plannedFor: '2026-10-01' }),
  ],
});
const twoA = job(project({ id: 'a', name: 'Line 2A', color: '#b4632a', expectedAt: '2026-11-16' }), {
  assets: [asset({ name: 'Case erector', oem: 'ilapak uk', dueOn: '2026-09-26' })],
  materials: [mat({ what: 'Lidding film', from: 'Amcor', due: '2026-10-20' })],
  tests: [test({ title: 'Seal — tray', withWhom: 'Multivac UK', plannedFor: '2026-10-08' })],
});

describe('every job, one calendar', () => {
  const pf = portfolio([twoA, twoB], TODAY);

  it('puts the job handing over first, first', () => {
    expect(pf.jobs.map(j => j.name)).toEqual(['Line 2B', 'Line 2A']);
  });

  it('draws every job on the same months', () => {
    const [b, a] = pf.jobs;
    expect(b.axis.from).toBe(a.axis.from);
    expect(b.axis.to).toBe(a.axis.to);
    expect(b.axis.ticks).toEqual(a.axis.ticks);
    expect(pf.axis.today).toBe(b.axis.today);
  });

  it('says of each job exactly what the job says of itself', () => {
    const own = standing({ ...twoB, expectedAt: '2026-10-26', plannedAt: '2026-10-18', today: TODAY });
    const b = pf.jobs.find(j => j.id === 'b');
    expect(b).toMatchObject({ sentence: own.sentence, outstanding: own.outstanding, late: own.late });
  });

  it('fills a job’s bar by how much of it has happened', () => {
    const b = pf.jobs.find(j => j.id === 'b');
    expect(b).toMatchObject({ done: 1, total: 3 });
    expect(b?.from).toBeLessThan(b?.to ?? 0);
  });

  it('reaches the handover date even where nothing else falls', () => {
    const a = pf.jobs.find(j => j.id === 'a');
    expect(a?.to).toBe(a?.axis.expected?.at);
  });
});

describe('this week, across every job', () => {
  const pf = portfolio([twoA, twoB], TODAY);

  it('takes what is late and what falls due inside a week, from every job, late first', () => {
    expect(pf.week.map(x => `${x.job}:${x.what}`)).toEqual([
      'Line 2B:Changeover', 'Line 2A:Case erector', 'Line 2B:Re-track the film',
    ]);
    expect(pf.week.slice(0, 2).every(x => x.late)).toBe(true);
  });

  it('leaves out what is further off than a week', () => {
    expect(pf.week.some(x => x.what === 'Lidding film' || x.what === 'Seal — tray')).toBe(false);
  });

  it('names the record a test or fix opens, and none for a list row', () => {
    expect(pf.week.find(x => x.what === 'Changeover')?.id).toBeDefined();
    expect(pf.week.find(x => x.what === 'Case erector')?.id).toBeUndefined();
  });
});

describe('who owes what, across the jobs', () => {
  const pf = portfolio([twoA, twoB], TODAY);

  it('adds up a party across jobs, whatever case it was typed in', () => {
    const ilapak = pf.owes.find(o => o.who.toLowerCase() === 'ilapak uk');
    expect(ilapak).toMatchObject({ open: 2, late: 2 });
    expect(ilapak?.byJob.map(b => [b.job, b.open])).toEqual([['Line 2B', 1], ['Line 2A', 1]]);
  });

  it('puts whoever is furthest behind first', () => {
    expect(pf.owes[0].who.toLowerCase()).toBe('ilapak uk');
  });

  it('says it in one sentence, naming who carries most of the late', () => {
    expect(pf.says).toBe('2 jobs running · Line 2B hands over first, in 27 days. 2 things late — all of them ilapak uk’s.'
      .replace('ilapak uk', pf.owes[0].who));
    expect(pf.totals).toMatchObject({ jobs: 2, late: 2 });
  });
});

describe('the edges', () => {
  it('says so when nothing is past its day', () => {
    const calm = job(project({ id: 'c', name: 'Line 3', expectedAt: '2026-12-01' }),
      { tests: [test({ plannedFor: '2026-10-30' })] });
    expect(portfolio([calm], TODAY).says).toBe('1 job running · Line 3 hands over first, in 63 days. Nothing is past its day.');
  });

  it('puts a job with no handover date last', () => {
    const undated = job(project({ id: 'u', name: 'AAA undated' }));
    expect(portfolio([undated, twoB], TODAY).jobs.map(j => j.id)).toEqual(['b', 'u']);
  });

  it('draws a board with no jobs without falling over', () => {
    const pf = portfolio([], TODAY);
    expect(pf.jobs).toEqual([]);
    expect(pf.says).toBe('No job running yet.');
  });

  it('never counts a deleted record', () => {
    const j = job(project({ id: 'd', name: 'Line 4' }), { tests: [test({ plannedFor: '2026-09-01', deletedAt: 5 })] });
    expect(jobItems(j, TODAY)).toEqual([]);
  });
});

describe('what the review asked for', () => {
  it('drops "commissioning" from a job’s name on the board, and keeps a name that is only that word', () => {
    expect(shortName('Line 2B commissioning')).toBe('Line 2B');
    expect(shortName('Commissioning — Line 7')).toBe('— Line 7');
    expect(shortName('Commissioning')).toBe('Commissioning');
    expect(shortName('Line 3')).toBe('Line 3');
  });

  it('lists everything owed, late first, so a number on the board opens what it counts', () => {
    const pf = portfolio([twoA, twoB], TODAY);
    expect(pf.items.length).toBe(pf.owes.reduce((n, o) => n + o.open, 0));
    expect(pf.items.findIndex(x => !x.late)).toBe(pf.items.filter(x => x.late).length);
  });

  it('finds what one party owes across jobs, whatever case it was typed in', () => {
    const pf = portfolio([twoA, twoB], TODAY);
    expect(pf.items.filter(x => owedBy(x, 'Ilapak UK')).map(x => x.what).sort()).toEqual(['Case erector', 'Changeover']);
    expect(pf.items.filter(x => owedBy(x, 'Nobody named')).length).toBe(0);
  });

  describe('dots that land on top of each other', () => {
    const m = (at: number, tone: PlacedMark['tone'], label = `m${at}`): PlacedMark => ({ kind: 'test', at, label, when: '1 Oct', tone });

    it('become one dot with the count, when closer than the gap', () => {
      const c = clusterMarks([m(0.5, 'booked'), m(0.505, 'done'), m(0.9, 'booked')]);
      expect(c.map(x => x.marks.length)).toEqual([2, 1]);
    });

    it('take the colour of the most urgent thing inside', () => {
      expect(clusterMarks([m(0.3, 'done'), m(0.301, 'late'), m(0.302, 'booked')])[0].tone).toBe('late');
    });

    it('leave dots apart when they are apart, in date order', () => {
      expect(clusterMarks([m(0.8, 'done'), m(0.2, 'done')]).map(x => x.at)).toEqual([0.2, 0.8]);
    });
  });
});

/* "The who-owns-what on the new home doesn't make sense." — Rowland's own
   data: one supplier typed three ways, one fix left with nobody. */
describe('who owes what, on a real mess', () => {
  const messy = job(project({ id: 'm', name: 'Line 2 B commissioning', expectedAt: '2026-11-01' }), {
    assets: [
      asset({ name: 'Wrapper', oem: 'Brillopak', dueOn: '2026-09-20' }),
      asset({ name: 'Case packer', oem: 'Brilopak', dueOn: '2026-10-05' }),
      asset({ name: 'Coder', oem: 'Brilopak', dueOn: '2026-10-06' }),
    ],
    tests: [
      test({ title: 'Seal', withWhom: 'Brillopak', plannedFor: '2026-10-08' }),
      test({ kind: 'fix', title: 'Re-cut jaw', withWhom: 'Brilopak', plannedFor: '2026-10-02' }),
      test({ kind: 'fix', title: 'Guard', withWhom: 'Dave', plannedFor: '2026-10-01' }),
      test({ kind: 'fix', title: 'Label the shelf', plannedFor: '2026-10-03' }),
    ],
  });
  const pf = portfolio([messy], TODAY);

  it('is one company, not one per spelling', () => {
    const suppliers = pf.owes.filter(o => o.kind === 'supplier');
    expect(suppliers).toHaveLength(1);
    expect(suppliers[0]).toMatchObject({ who: 'Brilopak', open: 5, late: 1 });
  });

  it('files a person who is not a supplier under the site', () => {
    expect(pf.owes.find(o => o.kind === 'site')).toMatchObject({ who: 'The site', open: 1 });
    expect(pf.items.find(x => x.what === 'Guard')).toMatchObject({ party: 'The site', partyKind: 'site', who: 'Dave' });
  });

  it('gives a fix nobody owns a party of its own', () => {
    expect(pf.owes.find(o => o.kind === 'nobody')).toMatchObject({ who: 'Nobody named', open: 1 });
  });

  it('orders them the way page 3 does: suppliers, then nobody, then the site', () => {
    expect(pf.owes.map(o => o.kind)).toEqual(['supplier', 'nobody', 'site']);
  });

  it('says which spellings disagree, most used first, so they can be made one', () => {
    expect(pf.variants).toHaveLength(1);
    expect(pf.variants[0].spellings.map(sp => sp.name)).toEqual(['Brilopak', 'Brillopak']);
  });

  it('opens what a party owes, spelled either way', () => {
    expect(pf.items.filter(x => owedBy(x, 'Brilopak'))).toHaveLength(5);
  });
});


/* THE CONTROL ROOM HOLDS EVERY METHOD. A 6M job and a lever tree job are
 * changes to a line too; the board that says "am I in control?" has to show
 * them beside the stage-gate jobs, on the same calendar, owed by the same
 * people. */
describe('every job on every method', () => {
  const step = (o: Record<string, unknown>) =>
    ({ id: `s${++n}`, projectId: 'p', what: 'An action', where: '', why: '', who: '', when: '', state: 'todo', createdAt: 1, updatedAt: 1, ...o }) as PacedInput['steps'][number];
  const threeP: PacedInput = {
    project: project({ id: 'p3', name: 'Line 7 pace', commissioning: undefined, color: '#1b7f5a' }),
    steps: [
      step({ what: 'Train nights on the splice', who: 'Rob', pillar: 'people', due: '2026-09-25' }),   // late
      step({ what: 'Replace the jaw', who: 'Engineering', pillar: 'plant', due: '2026-10-03' }),
      step({ what: 'One changeover standard', who: 'Rob', pillar: 'process', due: '2026-09-20', state: 'done' }),
      step({ what: 'Look at the reject bin' }),                                                          // no one, no day
    ],
    lines: [], atTarget: 1, judged: 2,
  };
  const tree: PacedInput = {
    project: project({ id: 'lt', name: 'Line 2B to 60 ppm', commissioning: undefined, leverTree: true }),
    steps: [], lines: [], atTarget: 0, judged: 0,
  };
  const pf = portfolio([twoB], TODAY, [threeP, tree]);

  it('shows them all, and says which method each runs', () => {
    expect(pf.jobs.map(j => [j.id, j.method])).toEqual(expect.arrayContaining([['b', 'commissioning'], ['p3', 'board'], ['lt', 'tree']]));
    expect(pf.jobs).toHaveLength(3);
  });
  it('counts a 6M job by its open actions and what is late', () => {
    const v = pf.jobs.find(j => j.id === 'p3')!;
    expect(v.outstanding).toBe(3);                // the done one is not owed
    expect(v.late).toBe(1);
    expect(v.reach).toBe('1 of 2 at target');
    expect(v.reachShort).toBe(true);   // a line short of target is the abnormal one
    expect(v.sentence).toBe('1 of 2 lines at target, with 3 actions open — 1 past its day.');
  });
  it('gives it its open countermeasures by bone — only the bones with any open, old words read across — not four gates', () => {
    const v = pf.jobs.find(j => j.id === 'p3')!;
    expect(v.gates).toEqual([]);
    // Plant reads as Machine; Process has nothing open, so it is not drawn.
    expect(v.pillars.map(x => [x.label, x.open, x.tone])).toEqual([['People', 1, 'late'], ['Machine', 1, 'going']]);
  });
  it('draws no bone at all when nothing is open', () => {
    const quiet: PacedInput = { ...threeP, project: project({ id: 'q', name: 'Quiet', commissioning: undefined }),
      steps: [step({ pillar: 'material', state: 'done' })] };
    expect(portfolio([], TODAY, [quiet]).jobs[0].pillars).toEqual([]);
  });
  it('does not say a running line "hands over" — that is a stage-gate word', () => {
    const dated: PacedInput = { ...threeP, project: project({ id: 'd', name: 'Line 9', commissioning: undefined, expectedAt: '2026-10-29' }) };
    const says = portfolio([], TODAY, [dated]).says;
    expect(says).not.toMatch(/hands over/);
    expect(says).toMatch(/Line 9’s date comes first, in \d+ days/);
  });
  it('puts its actions on the same calendar and in the same owed lists', () => {
    expect(pf.items.filter(x => x.jobId === 'p3').map(x => x.kind)).toEqual(['action', 'action', 'action']);
    expect(pf.week.some(x => x.jobId === 'p3' && x.what === 'Train nights on the splice')).toBe(true);
    expect(pf.owes.find(o => o.kind === 'nobody')?.byJob.some(b => b.jobId === 'p3')).toBe(true);
    expect(pf.jobs.find(j => j.id === 'p3')!.marks.length).toBe(3);   // the three with a day
  });
  it('says nothing is on the board when nothing is', () => {
    expect(pf.jobs.find(j => j.id === 'lt')!.sentence).toBe('No tree yet — it starts from the outcome. Nothing on the board yet.');
    expect(pacedSays({ atTarget: 2, judged: 2, open: 0, late: 0, any: true })).toBe('2 of 2 lines at target, with nothing open on the board.');
  });
});

/* A 6M JOB, IN WORDS (docs/SIXM.md, "Home / control room"): its problems by
 * phase and its open countermeasures by bone, the abnormal piece alone in a
 * colour; and its drawer leads with each line against its target in the
 * sentence the 6M client report opens with. */
describe('a 6M job in the control room', () => {
  const step = (o: Record<string, unknown>) =>
    ({ id: `s${++n}`, projectId: 'p', what: 'An action', where: '', why: '', who: '', when: '', state: 'todo', createdAt: 1, updatedAt: 1, ...o }) as PacedInput['steps'][number];
  const tones = (xs: { text: string; tone?: string }[]) => xs.filter(x => x.tone).map(x => [x.text, x.tone]);

  it('says the open problems by phase, then the closed ones', () => {
    const said = problemsSaid(['finding', 'acting', 'holding']);
    expect(saidText(said)).toBe('2 problems — 1 finding the cause, 1 acting on it · 1 holding');
    expect(tones(said)).toEqual([]);
  });
  it('says one open problem without counting it twice', () => {
    expect(saidText(problemsSaid(['acting']))).toBe('1 problem — acting on it');
  });
  it('puts a slipped one in red, in words', () => {
    const said = problemsSaid(['proving', 'slipped', 'holding', 'holding']);
    expect(saidText(said)).toBe('1 problem — checking it worked · 1 slipped back · 2 holding');
    expect(tones(said)).toEqual([['1 slipped back', 'late']]);
  });
  it('says when there is none, in grey', () => {
    expect(problemsSaid([])).toEqual([{ text: 'No problem opened yet', tone: 'none' }]);
    expect(saidText(problemsSaid(['closed']))).toBe('No problem open · 1 closed');
  });

  it('says the open countermeasures by bone, biggest first, then what is late and waiting', () => {
    const said = bonesSaid([
      step({ pillar: 'machine', due: '2026-09-20' }), step({ pillar: 'machine' }), step({ pillar: 'plant' }),
      step({ pillar: 'people', state: 'waiting', due: '2026-10-08' }), step({ pillar: 'people', due: '2026-09-28' }),
      step({ pillar: 'material' }), step({ pillar: 'material' }),
      step({ pillar: 'method', state: 'done' }),
    ], TODAY);
    expect(saidText(said)).toBe('7 open: Machine 3 · People 2 · Material 2, 2 past their day, 1 waiting on somebody');
    expect(tones(said)).toEqual([['2 past their day', 'late'], ['1 waiting on somebody', 'waiting']]);
  });
  it('counts an action on no bone, and says nothing open in grey', () => {
    expect(saidText(bonesSaid([step({ pillar: 'people' }), step({})], TODAY))).toBe('2 open: People 1 · 1 not on a bone yet');
    expect(bonesSaid([step({ state: 'done' })], TODAY)).toEqual([{ text: 'Nothing open on the board', tone: 'none' }]);
    expect(bonesSaid([], TODAY)).toEqual([{ text: 'Nothing on the board yet', tone: 'none' }]);
  });

  it('gives a 6M row its problems and bones, worst problem first, and leaves the other methods alone', () => {
    const sixm: PacedInput = {
      project: project({ id: 's6', name: 'Line 7 pace', commissioning: undefined }),
      steps: [step({ pillar: 'machine', due: '2026-09-20' })], lines: [], atTarget: 0, judged: 0,
      problems: [
        { id: 'a', title: 'Basketer minor stops', phase: 'acting', says: 'Minor stops — 3 h a week' },
        { id: 'b', title: 'Line 2A below rate', phase: 'slipped', says: '' },
      ],
      gaps: [{ lineId: 'l', line: 'Line 2A', says: 'Line 2A is at 52 ppm (1 Oct) against the Q4 target of 60 ppm — 8 ppm short of target.', short: '8 ppm short of target' }],
    };
    const tree: PacedInput = { project: project({ id: 't', name: 'Tree', commissioning: undefined, leverTree: true }), steps: [], lines: [], atTarget: 0, judged: 0 };
    const pf = portfolio([], TODAY, [sixm, tree]);
    const v = pf.jobs.find(j => j.id === 's6')!;
    expect(saidText(v.sixm!.phases)).toBe('1 problem — acting on it · 1 slipped back');
    expect(saidText(v.sixm!.bones)).toBe('1 open: Machine 1, 1 past its day');
    expect(v.sixm!.problems.map(x => [x.id, x.word, x.slipped])).toEqual([['b', 'Slipped back', true], ['a', 'Acting on it', false]]);
    expect(v.sixm!.gaps[0].short).toBe('8 ppm short of target');
    expect(pf.jobs.find(j => j.id === 't')!.sixm).toBeUndefined();
    expect(v.reachShort).toBe(false);
    expect(portfolio([], TODAY, [{ ...sixm, atTarget: 2, judged: 2 }]).jobs[0]).toMatchObject({ reach: '2 of 2 at target', reachShort: false });
  });

  it('says the gap in the one sentence the client report uses', () => {
    const s = {
      measure: { id: 'm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 0 },
      points: [{ at: '2026-10-01', value: 52 }], period: { id: 'q', name: 'Q4', from: '2026-10-01', to: '2026-12-31', sort: 0 },
      target: 60, across: [], latest: 52, margin: -8, meeting: false,
    } as unknown as LineSeries;
    expect(gapOf('Line 2A', s)).toEqual({ says: 'Line 2A is at 52 ppm (1 Oct) against the Q4 target of 60 ppm — 8 ppm short of target.', short: '8 ppm short of target' });
    expect(gapOf('Line 7', undefined).says).toBe('Line 7: no measure set yet.');
  });
});

/* THE SAME STEP ON THREE MACHINES IS THREE THINGS, NOT ONE THING SAID THREE
 * TIMES. Rowland: Home listed two planned things that "both say the same
 * thing". Install steps are written once per machine from one stage list, and
 * the board printed only the step's name. */
describe('the same step on more than one machine', () => {
  const wrapper = asset({ id: 'wr', name: 'Wrapper', state: 'running' });
  const pnp = asset({ id: 'pp', name: 'Pick and place', state: 'running' });
  const mk = (assets: Asset[]) => job(project({ id: 'm', name: 'Line 3' }), {
    assets,
    tests: [
      test({ kind: 'install', title: 'Dry run', assetId: 'wr', plannedFor: '2026-10-01', withWhom: 'Ilapak UK' }),
      test({ kind: 'install', title: 'Dry run', assetId: 'pp', plannedFor: '2026-10-01', withWhom: 'Ilapak UK' }),
    ],
  });

  it('says which machine, so no two rows read alike', () => {
    const what = jobItems(mk([wrapper, pnp]), TODAY).map(x => x.what).sort();
    expect(what).toEqual(['Pick and place — Dry run', 'Wrapper — Dry run']);
    expect(new Set(what).size).toBe(2);
  });

  it('leaves the words alone when nothing else reads the same', () => {
    const j = job(project({ id: 'm', name: 'Line 3' }), {
      assets: [wrapper, pnp],
      tests: [
        test({ kind: 'install', title: 'Dry run', assetId: 'wr', plannedFor: '2026-10-01' }),
        test({ kind: 'install', title: 'Guards fitted', assetId: 'pp', plannedFor: '2026-10-01' }),
      ],
    });
    expect(jobItems(j, TODAY).map(x => x.what).sort()).toEqual(['Dry run', 'Guards fitted']);
  });

  it('does the same on a job with one machine — there is nothing to say apart', () => {
    const j = job(project({ id: 'm', name: 'Line 3' }), {
      assets: [wrapper],
      tests: [test({ kind: 'install', title: 'Dry run', assetId: 'wr', plannedFor: '2026-10-01' })],
    });
    expect(jobItems(j, TODAY).map(x => x.what)).toEqual(['Dry run']);
  });

  it('puts the machine on the calendar dot too, so the dot and the row agree', () => {
    const j = mk([wrapper, pnp]);
    const labels = standing({ tests: j.tests, items: [], materials: [], programs: [], assets: j.assets, today: TODAY })
      .plan.filter(m => m.kind !== 'machine').map(m => m.label).sort();
    expect(labels).toEqual(['Pick and place — Dry run', 'Wrapper — Dry run']);
  });
});

/* NEEDS YOU — the job's front page leads with it (ProjectDashboardScreen).
   Rowland, 5 October: "too much on a screen… this is more about opening doors
   rather than keeping it linear and simple." It is the job's own items, in the
   order you would deal with them, so it can never disagree with the band. */
describe('what needs you, on a job’s front page', () => {
  const p = project({ id: 'n', name: 'Line 4' });
  const on = (title: string, plannedFor?: string, o: Partial<Test> = {}) => test({ title, plannedFor, ...o });

  it('puts everything past its day first, the oldest first, then due soon, then the next booked', () => {
    const j = job(p, {
      tests: [
        on('Booked far off', '2026-10-20'),
        on('Due tomorrow', '2026-09-30'),
        on('Late by a day', '2026-09-28'),
        on('Late by a week', '2026-09-22'),
        on('Booked next', '2026-10-06'),
      ],
    });
    const n = needsYou(jobItems(j, TODAY), TODAY);
    expect(n.rows.map(r => `${r.urgency}:${r.item.what}`)).toEqual([
      'late:Late by a week', 'late:Late by a day', 'soon:Due tomorrow', 'next:Booked next',
    ]);
    // The rest is a count — and a door — not a row.
    expect(n).toMatchObject({ late: 2, soon: 1, more: 1, undated: 0 });
  });

  it('counts everything late even when there are more than it has rows for', () => {
    const j = job(p, { tests: Array.from({ length: 9 }, (_, i) => on(`Late ${i}`, `2026-09-${String(10 + i).padStart(2, '0')}`)) });
    const n = needsYou(jobItems(j, TODAY), TODAY, { max: 6 });
    expect(n.rows).toHaveLength(6);
    expect(n.rows.every(r => r.urgency === 'late')).toBe(true);
    expect(n).toMatchObject({ late: 9, more: 3 });
  });

  it('still says what is coming on a job that is in hand', () => {
    const j = job(p, { tests: [on('A', '2026-10-10'), on('B', '2026-10-12'), on('C', '2026-10-14'), on('D', '2026-10-16')] });
    const n = needsYou(jobItems(j, TODAY), TODAY);
    expect(n.rows.map(r => r.item.what)).toEqual(['A', 'B', 'C']);
    expect(n).toMatchObject({ late: 0, soon: 0, more: 1 });
  });

  it('counts what has no date apart — it can never be late, and it is a thing to chase', () => {
    const j = job(p, { tests: [on('Undated fix', undefined, { kind: 'fix' }), on('Late', '2026-09-20')] });
    const n = needsYou(jobItems(j, TODAY), TODAY);
    expect(n.rows.map(r => r.item.what)).toEqual(['Late']);
    expect(n.undated).toBe(1);
  });

  it('files a step under its own gate, so a hand-over item is not called an install step', () => {
    const j = job(p, { tests: [on('Manuals', '2026-10-01', { kind: 'install', gate: 'handover' }), on('Dry run', '2026-10-01', { kind: 'install' })] });
    expect(jobItems(j, TODAY).map(x => `${x.what}:${x.kind}`).sort()).toEqual(['Dry run:install', 'Manuals:handover']);
  });
});

/* A PART OF THE PLAN WITH A DAY (ui/StageParts) is owed like anything else —
   one rule (lib/noted owedParts), so Needs you's rows and the band's counts
   (standing) are the same numbers. */
describe('a stage’s parts, owed by a day', () => {
  const p = project({ id: 'q', name: 'Line 5' });
  const wrapper = asset({ name: 'Ilapak flow wrapper', oem: 'Ilapak UK', state: 'running' });
  const stage = test({ kind: 'install', gate: 'setup', title: 'Programs loaded', assetId: wrapper.id, withWhom: 'Ilapak UK',
    plannedFor: '2026-09-25', ranOn: '2026-09-25', outcome: 'passed' });
  const part = (what: string, o: Partial<TestItem> = {}): TestItem =>
    ({ id: `i${++n}`, projectId: 'p', testId: stage.id, kind: 'next', what, sort: n, createdAt: 1, updatedAt: 1, ...o });
  const j = job(p, {
    assets: [wrapper], tests: [stage],
    items: [
      part('first program to verify Tesco Express 1.25 packs', { owner: 'Ilapak UK', due: '2026-09-28' }),
      part('Panels to run Express 1.25 kg', { owner: 'Ilapak UK', due: TODAY }),
      part('Done already', { due: '2026-09-26', doneAt: 5 }),
      part('No day on it'),
    ],
  });

  it('is a row on Needs you, said with its stage first and its machine, opening the stage', () => {
    const rows = needsYou(jobItems(j, TODAY), TODAY).rows;
    expect(rows.map(r => `${r.urgency}:${r.item.what}`)).toEqual([
      'late:Programs loaded — first program to verify Tesco Express 1.25 packs (Ilapak flow wrapper)',
      'soon:Programs loaded — Panels to run Express 1.25 kg (Ilapak flow wrapper)',
    ]);
    expect(rows[0].item).toMatchObject({ id: stage.id, kind: 'setup', who: 'Ilapak UK' });
    expect(rows[0].item.part).toBeTruthy();
  });

  it('counts the same on the band as on the rows — and a part with no day, or done, is neither', () => {
    const st = standing({ tests: j.tests, items: j.items, materials: [], programs: [], assets: j.assets, today: TODAY });
    const items = jobItems(j, TODAY);
    expect(st.outstanding).toBe(items.length);
    expect(st.late).toBe(items.filter(x => x.late).length);
    expect(st.rows.find(r => r.key === 'parts')).toMatchObject({ what: 'Parts of the plan to do', open: 2, late: 1, whose: 'Ilapak UK × 2' });
    const pf = portfolio([j], TODAY);
    expect(pf.jobs[0]).toMatchObject({ outstanding: 2, late: 1 });
    expect(pf.week.map(x => x.what)).toHaveLength(2);
  });
});
