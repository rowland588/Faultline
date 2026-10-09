/* THE HANDOVER, AS IT REALLY GOES (docs/HANDOVER.md).
 *
 * Rowland, 9 October: "in reality things don't go to plan, and business will
 * accept handovers ... nothing gets blocked but we show the status." A
 * machine is handed over when its hand-over list is done, whatever is still
 * open before it, and what is open is said beside it; a job is handed over
 * when every machine is, and says so with its real day and what it went
 * with — on the verdict, the control room and the handover report alike. */
import { describe, it, expect } from 'vitest';
import { doneTodayPatch, handedOverWith, isSignOff, journeyOf, machineAt, machineNow, signOffNote } from '../install';
import { standing } from '../standing';
import { stageGateOnTarget } from '../onTarget';
import { portfolio, type JobInput } from '../portfolio';
import { handoverReport } from '../handoverReport';
import type { Project } from '../../types';
import type { Asset, Test } from '../testing';
import { niceDay } from '../weeks';

/* Days as the app says them, whatever the locale under test. */
const W = (iso: string) => niceDay(iso, { weekday: 'short' });

const TODAY = '2026-10-09';
let n = 0;
const project = (o: Partial<Project> & { id: string; name: string }): Project =>
  ({ color: '#2b87d4', workspaceIds: [], createdAt: 1, updatedAt: 1, commissioning: true, ...o }) as Project;
const asset = (name: string): Asset => ({ id: `a${++n}`, projectId: 'p', name, state: 'running', onSiteOn: '2026-09-01', sort: n, updatedAt: 1 });
const step = (a: Asset, gate: Test['gate'] | undefined, title: string, on: string, done = true, o: Partial<Test> = {}): Test => ({
  id: `t${++n}`, projectId: 'p', kind: 'install', ...(gate ? { gate } : {}), title, assetId: a.id, plannedFor: on,
  ...(done ? { ranOn: on, outcome: 'passed' as const } : { outcome: 'planned' as const }), sort: n, createdAt: 1, updatedAt: 1, ...o,
});
const test = (a: Asset, title: string, outcome: Test['outcome'], on = '2026-09-28'): Test => ({
  id: `t${++n}`, projectId: 'p', title, assetId: a.id, plannedFor: on, ...(outcome !== 'planned' ? { ranOn: on } : {}), outcome,
  passesIf: '0 leaks in 20 packs', sort: n, createdAt: 1, updatedAt: 1,
});
const fix = (a: Asset, title: string, on: string): Test => ({
  id: `t${++n}`, projectId: 'p', kind: 'fix', title, assetId: a.id, withWhom: 'Ilapak UK', plannedFor: on, outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1,
});
const HAND = ['Manuals and drawings handed over', 'Operators and engineers trained', 'Spares list agreed', 'Safety sign-off (PUWER)', 'Client signed off'];
const through = (a: Asset, last = '2026-10-07') => [
  step(a, undefined, 'Positioned and levelled', '2026-09-10'),
  step(a, 'setup', 'Programs loaded', '2026-09-20'),
  ...HAND.map((h, i) => step(a, 'handover', h, i === HAND.length - 1 ? last : `2026-10-0${3 + i}`)),
];

describe('a machine is handed over when its hand-over list is done', () => {
  it('whatever is still open before it — and says what', () => {
    const wrapper = asset('Flow wrapper');
    const tests = [...through(wrapper), test(wrapper, 'Seal integrity', 'failed'), fix(wrapper, 'Fit the upgraded jaw heater', '2026-10-19')];
    const j = journeyOf(wrapper, tests, [], TODAY);
    expect(machineNow(j)).toBe('Handed over');
    expect(handedOverWith(wrapper, tests, [], TODAY)).toEqual(['1 test didn’t pass', '1 fix open']);
    expect(machineAt(wrapper, j, handedOverWith(wrapper, tests, [], TODAY)).says).toBe('Handed over · 1 test didn’t pass · 1 fix open');
  });

  it('with no test kept, it is still handed over, and says so', () => {
    const cw = asset('Checkweigher');
    const tests = through(cw);
    expect(machineNow(journeyOf(cw, tests, [], TODAY))).toBe('Handed over');
    expect(handedOverWith(cw, tests, [], TODAY)).toEqual(['no test kept']);
  });

  it('a list not finished is not handed over, and says nothing extra', () => {
    const cp = asset('Case packer');
    const tests = [...through(cp).slice(0, -1), step(cp, 'handover', 'Client signed off', '2026-10-12', false), test(cp, 'Case seal', 'passed')];
    expect(machineNow(journeyOf(cp, tests, [], TODAY))).toBe('Hand over');
    expect(handedOverWith(cp, tests, [], TODAY)).toEqual([]);
  });
});

describe('a job is handed over when every machine is', () => {
  const a = asset('Labeller'), b = asset('Bagger');
  const tests = [...through(a), test(a, 'Label placement', 'passed'), ...through(b, '2026-10-06'), fix(b, 'Replace the worn sealing jaw', '2026-10-16')];
  const st = standing({ tests, items: [], assets: [a, b], materials: [], programs: [], plannedAt: '2026-10-08', expectedAt: '2026-10-08', today: TODAY });

  it('with its real day against the agreed one, and what it went with', () => {
    expect(st.handedOver).toBe(true);
    expect(st.handedOn).toBe('2026-10-07');
    expect(st.handedVs).toBe(-1);
    expect(st.sentence).toBe(`Handed over on ${W('2026-10-07')}, 1 day before the date agreed — all 2 machines, with 1 thing still open and 1 machine with no test kept.`);
  });

  it('answers "Handed over" — amber while something is open', () => {
    const v = stageGateOnTarget({ project: { plannedAt: '2026-10-08', expectedAt: '2026-10-08' }, tests, items: [], assets: [a, b], materials: [], programs: [], today: TODAY }, st);
    expect(v.word).toBe('Handed over');
    expect(v.tone).toBe('risk');
    expect(v.reason).toBe(`${W('2026-10-07')}, 1 day before the agreed ${W('2026-10-08')} · 1 still open · 1 machine with no test kept`);
  });

  it('red when it went after the agreed day, green when on time with nothing open', () => {
    const c = asset('Coder');
    const clean = [...through(c), test(c, 'Print quality', 'passed')];
    const on = (agreed: string) => stageGateOnTarget({ project: { plannedAt: agreed }, tests: clean, items: [], assets: [c], materials: [], programs: [], today: TODAY });
    expect(on('2026-10-07')).toMatchObject({ word: 'Handed over', tone: 'on', reason: `${W('2026-10-07')}, the day agreed · nothing still open` });
    expect(on('2026-10-05').tone).toBe('behind');
    const s = standing({ tests: clean, items: [], assets: [c], materials: [], programs: [], plannedAt: '2026-10-07', today: TODAY });
    expect(s.sentence).toBe(`Handed over on ${W('2026-10-07')}, the day agreed — the machine through all four gates, nothing outstanding.`);
  });

  it('one machine still at a gate holds the job at it', () => {
    const c = asset('Case packer');
    const more = [...tests, step(c, 'handover', 'Client signed off', '2026-10-12', false)];
    expect(standing({ tests: more, items: [], assets: [a, b, c], materials: [], programs: [], today: TODAY }).handedOver).toBeUndefined();
  });
});

describe('the control room counts a handed-over job apart', () => {
  const a = asset('Labeller'), b = asset('Bagger');
  const done: JobInput = { project: project({ id: 'd', name: 'Line 5', plannedAt: '2026-10-08', expectedAt: '2026-10-08' }),
    tests: [...through(a), test(a, 'Label placement', 'passed')], items: [], materials: [], programs: [], assets: [a] };
  const live: JobInput = { project: project({ id: 'l', name: 'Line 4', plannedAt: '2026-10-20', expectedAt: '2026-10-20' }),
    tests: [step(b, undefined, 'Positioned and levelled', '2026-10-15', false)], items: [], materials: [], programs: [], assets: [b] };
  const pf = portfolio([done, live], TODAY);

  it('below the live ones, never past its handover', () => {
    expect(pf.jobs.map(j => j.name)).toEqual(['Line 4', 'Line 5']);
    expect(pf.jobs[1]).toMatchObject({ handedOver: true, at: 'Handed over' });
    expect(pf.jobs[1].daysToGo).toBeUndefined();
    expect(pf.totals).toMatchObject({ jobs: 1, handedOver: 1 });
    expect(pf.says).toMatch(/^1 job running · 1 handed over · Line 4 hands over first, in 11 days\./);
  });
});

describe('a sign-off keeps what it accepted', () => {
  const wrapper = asset('Flow wrapper');
  const signOff = step(wrapper, 'handover', 'Client signed off', '2026-10-09', false);
  const tests = [...through(wrapper).slice(0, -1), signOff, test(wrapper, 'Rate trial', 'planned', '2026-10-12'), fix(wrapper, 'Fit the upgraded jaw heater', '2026-10-19')];

  it('knows a sign-off by its name', () => {
    expect(isSignOff(signOff)).toBe(true);
    expect(isSignOff({ kind: 'install', gate: 'handover', title: 'Safety sign-off (PUWER)' })).toBe(true);
    expect(isSignOff({ kind: 'install', gate: 'handover', title: 'Spares list agreed' })).toBe(false);
    expect(isSignOff({ kind: 'install', title: 'Client signed off' })).toBe(false);
  });

  it('writes what was still open on the machine, by name', () => {
    expect(signOffNote(signOff, tests, [], TODAY, [wrapper])).toBe(
      `Signed off ${niceDay(TODAY)} with 2 still open — Test, not run: Rate trial · ${niceDay('2026-10-12')}; Fix: Fit the upgraded jaw heater · Ilapak UK · ${niceDay('2026-10-19')}.`,
    );
  });
});

describe('done today, one write', () => {
  const wrapper = asset('Flow wrapper');
  const signOff = step(wrapper, 'handover', 'Client signed off', '2026-10-09', false, { result: 'Walked the line with production.' });
  const tests = [...through(wrapper).slice(0, -1), signOff, test(wrapper, 'Seal integrity', 'passed')];

  it('a sign-off adds what it accepted to its account, and who signed', () => {
    const p = doneTodayPatch(signOff, { tests, items: [], assets: [wrapper] }, TODAY, 'Sam (production)')(signOff);
    expect(p).toEqual({ outcome: 'passed', ranOn: TODAY, withWhom: 'Sam (production)',
      result: `Walked the line with production.\n\nSigned off ${niceDay(TODAY)} with nothing still open.` });
  });

  it('any other stage is just done today', () => {
    const s = step(wrapper, undefined, 'Dry run', '2026-10-08', false);
    expect(doneTodayPatch(s, { tests: [...tests, s], items: [], assets: [wrapper] }, TODAY)(s)).toEqual({ outcome: 'passed', ranOn: TODAY });
  });
});

describe('the handover report says how it really went', () => {
  const a = asset('Flow wrapper'), b = asset('Checkweigher');
  const seal = test(a, 'Seal integrity', 'failed');
  const tests = [...through(a), seal, fix(a, 'Fit the upgraded jaw heater', '2026-10-19'),
    ...through(b).map(t => (t.title === 'Operators and engineers trained' ? { ...t, plannedFor: '2026-10-01', ranOn: '2026-10-04' } : t))];
  const r = handoverReport({ project: { name: 'Line 4', lead: 'Rowland', plannedAt: '2026-10-08' }, assets: [a, b], tests, items: [], materials: [], programs: [], today: TODAY });

  it('the job, then every machine as it is', () => {
    expect(r.handedOver).toBe(true);
    expect(r.verdict.word).toBe('Handed over');
    expect(r.machinesSaid).toBe('2 of 2 machines handed over');
    expect(r.machines.map(m => [m.name, m.at, m.with])).toEqual([
      ['Flow wrapper', 'Handed over', ['1 test didn’t pass', '1 fix open']],
      ['Checkweigher', 'Handed over', ['no test kept']],
    ]);
    expect(r.machines[0].tests[0]).toMatchObject({ title: 'Seal integrity', word: 'Didn’t pass', tone: 'failed', passesIf: '0 leaks in 20 packs' });
    expect(r.machines[1].noTest).toBe(true);
    expect(r.machines[0].open).toEqual(['Test, didn’t pass: Seal integrity', `Fix: Fit the upgraded jaw heater · Ilapak UK · ${niceDay('2026-10-19')}`]);
    expect(r.sign).toEqual(['Handed over by', 'Taken over by', 'Safety']);
  });

  it('a line done after its day says so', () => {
    expect(r.machines[1].items.find(i => i.title === 'Operators and engineers trained')?.state).toBe(`done ${niceDay('2026-10-04')}, 3 days after the day planned`);
    expect(r.machines[1].items.find(i => i.title === 'Client signed off')).toMatchObject({ state: `done ${niceDay('2026-10-07')}`, tone: 'done', signOff: true });
  });
});
