/* THE PACE SAYS WHEN (lib/pace) — every case worked by hand.
 *
 * The worked example: today Sat 10 Oct; the job's first day 1 Sep, so the
 * window is the full 14 days (27 Sep – 10 Oct). Seven stages done in it, four
 * done before it, seven still to go. Rate 7 ÷ 14 = 0.5 a day; 7 ÷ 0.5 = 14
 * days; 10 Oct + 14 = Sat 24 Oct — 4 days after the date now expected, Tue
 * 20 Oct. */
import { describe, it, expect } from 'vitest';
import { paceOf, paceSays } from '../pace';
import type { Asset, Test } from '../testing';
import { addDays, niceDay } from '../weeks';

const TODAY = '2026-10-10';
/* Dates as the app writes them, whatever the locale's punctuation. */
const D = (iso: string) => niceDay(iso, { weekday: 'short' });
let k = 0;
const stage = (o: Partial<Test> = {}): Test => ({ id: `s${k++}`, projectId: 'p', kind: 'install', title: `Stage ${k}`, outcome: 'planned', sort: k, createdAt: 1, updatedAt: 1, ...o });
const doneOn = (d: string, o: Partial<Test> = {}) => stage({ outcome: 'passed', ranOn: d, ...o });
const open = (o: Partial<Test> = {}) => stage({ plannedFor: '2026-10-15', ...o });

/** Seven done in the window, four before it, seven to go; first day 1 Sep. */
const job = (): Test[] => [
  stage({ outcome: 'passed', plannedFor: '2026-09-01', ranOn: '2026-09-02' }),
  doneOn('2026-09-10'), doneOn('2026-09-15'), doneOn('2026-09-20'),
  doneOn('2026-09-27'), doneOn('2026-09-29'), doneOn('2026-10-01'), doneOn('2026-10-03'),
  doneOn('2026-10-06'), doneOn('2026-10-08'), doneOn('2026-10-10'),
  open(), open(), open(), open(), open(), open(), open(),
];

describe('the pace says when', () => {
  it('the worked example: lands Sat 24 Oct, 4 days after the date now expected', () => {
    const p = paceOf({ tests: job(), today: TODAY, expectedAt: '2026-10-20', plannedAt: '2026-10-16' })!;
    expect(p.kind).toBe('forecast');
    expect(p.done).toBe(11);
    expect(p.doneLately).toBe(7);
    expect(p.windowDays).toBe(14);
    expect(p.left).toBe(7);
    expect(p.at).toBe('2026-10-24');
    expect(p.vs).toBe(4);
    expect(p.against).toEqual({ iso: '2026-10-20', is: 'expected' });
    expect(p.tone).toBe('risk');
    expect(p.text).toBe(`At the pace so far, Hand over lands about ${D('2026-10-24')} — 4 days after the date now expected (${D('2026-10-20')}).`);
    expect(p.working).toBe('7 stages and tests done in the last 2 weeks · 7 to go');
    expect(paceSays(p)).toBe(`${p.text} 7 stages and tests done in the last 2 weeks · 7 to go.`);
  });

  it('one handover date is the date agreed; before it is said, and not amber', () => {
    const p = paceOf({ tests: job(), today: TODAY, expectedAt: '2026-10-30', plannedAt: '2026-10-30' })!;
    expect(p.against).toEqual({ iso: '2026-10-30', is: 'agreed' });
    expect(p.vs).toBe(-6);
    expect(p.tone).toBe('on');
    expect(p.text).toBe(`At the pace so far, Hand over lands about ${D('2026-10-24')} — 6 days before the date agreed (${D('2026-10-30')}).`);
  });

  it('on the day; and with no date at all, the day alone', () => {
    expect(paceOf({ tests: job(), today: TODAY, plannedAt: '2026-10-24' })!.text)
      .toBe(`At the pace so far, Hand over lands about ${D('2026-10-24')} — on the date agreed (${D('2026-10-24')}).`);
    const bare = paceOf({ tests: job(), today: TODAY })!;
    expect(bare.text).toBe(`At the pace so far, Hand over lands about ${D('2026-10-24')}.`);
    expect(bare.tone).toBe('on');
    expect(bare.vs).toBeUndefined();
  });

  it('rounds a part day up — 8 done in the window, 7 to go: 12.25 days is 13', () => {
    const p = paceOf({ tests: [...job(), doneOn('2026-10-09')], today: TODAY })!;
    expect(p.doneLately).toBe(8);
    expect(p.at).toBe('2026-10-23');
  });

  it('too early under five done', () => {
    const p = paceOf({ tests: [stage({ outcome: 'passed', plannedFor: '2026-09-01', ranOn: '2026-10-01' }), doneOn('2026-10-05'), doneOn('2026-10-07'), doneOn('2026-10-09'), open()], today: TODAY })!;
    expect(p.kind).toBe('early');
    expect(p.tone).toBe('none');
    expect(p.at).toBeUndefined();
    expect(p.text).toBe('Too early to say when at the pace so far — 4 stages and tests done.');
    expect(p.working).toBe('4 done · 1 to go');
  });

  it('a job just started: nothing done yet, said plainly', () => {
    const p = paceOf({ tests: [open(), open()], today: TODAY })!;
    expect(p.kind).toBe('early');
    expect(p.text).toBe('Too early to say when — nothing done yet.');
    expect(p.working).toBe('0 done · 2 to go');
  });

  it('too early under a week since the job’s first day, however much is done', () => {
    const p = paceOf({ tests: [stage({ outcome: 'passed', plannedFor: '2026-10-06', ranOn: '2026-10-06' }), doneOn('2026-10-07'), doneOn('2026-10-08'), doneOn('2026-10-09'), doneOn('2026-10-10'), doneOn('2026-10-10'), open()], today: TODAY })!;
    expect(p.windowDays).toBe(5);
    expect(p.kind).toBe('early');
  });

  it('a window shorter than two weeks says its days', () => {
    const p = paceOf({ tests: [stage({ outcome: 'passed', plannedFor: '2026-10-02', ranOn: '2026-10-02' }), doneOn('2026-10-04'), doneOn('2026-10-06'), doneOn('2026-10-08'), doneOn('2026-10-10'), open(), open()], today: TODAY })!;
    expect(p.windowDays).toBe(9);
    expect(p.working).toBe('5 stages and tests done in the last 9 days · 2 to go');
    // 5 ÷ 9 a day; 2 to go → 3.6 → 4 days → Wed 14 Oct
    expect(p.at).toBe('2026-10-14');
  });

  it('nothing done in two weeks is said, never projected to forever', () => {
    const p = paceOf({ tests: [stage({ outcome: 'passed', plannedFor: '2026-08-01', ranOn: '2026-08-03' }), doneOn('2026-08-10'), doneOn('2026-08-20'), doneOn('2026-09-01'), doneOn('2026-09-20'), open(), open(), open()], today: TODAY })!;
    expect(p.kind).toBe('stalled');
    expect(p.tone).toBe('risk');
    expect(p.at).toBeUndefined();
    expect(p.text).toBe('Nothing done in the last 2 weeks — 3 still to go, so the pace cannot say when.');
  });

  it('nothing to forecast: no planned work, or all of it done', () => {
    expect(paceOf({ tests: [], today: TODAY })).toBeUndefined();
    expect(paceOf({ tests: [doneOn('2026-10-01'), doneOn('2026-10-02')], today: TODAY })).toBeUndefined();
  });

  it('counts the job’s planned work only: fixes and deleted rows are left out; a test counts', () => {
    const base = job();
    const withFix = [...base, stage({ kind: 'fix', title: 'Fix the regulator', plannedFor: '2026-10-12' }), open({ deletedAt: 5 })];
    expect(paceOf({ tests: withFix, today: TODAY })!.left).toBe(7);
    const withTest = [...base, stage({ kind: 'test', title: 'Weight accuracy', plannedFor: '2026-10-12' })];
    expect(paceOf({ tests: withTest, today: TODAY })!.left).toBe(8);
  });

  it('a test that has run is settled, as the job counts it everywhere; a done stage with no day counts as done, not lately', () => {
    const ran = stage({ kind: 'test', title: 'Seal integrity', outcome: 'failed', ranOn: '2026-10-09' });
    const undated = stage({ outcome: 'passed' });
    const p = paceOf({ tests: [...job(), ran, undated], today: TODAY })!;
    expect(p.done).toBe(13);
    expect(p.doneLately).toBe(8);
    expect(p.left).toBe(7);
  });

  it('a stage done on a span counts on its last day', () => {
    const p = paceOf({ tests: [...job(), doneOn('2026-09-20', { ranTo: '2026-09-28' })], today: TODAY })!;
    expect(p.doneLately).toBe(8);
  });
});

/* WHAT IS NOT ON THE LISTS YET (found in the browser, 10 October: the seeded
   job read "lands 16 Oct" with its coder not here and nothing on its list). */
describe('what the count cannot see', () => {
  const machine = (o: Partial<Asset>): Asset => ({ id: `a${k++}`, projectId: 'p', name: 'Domino coder', state: 'onSite', sort: 1, updatedAt: 1, ...o } as Asset);
  const wrapper = machine({ name: 'Ilapak flow wrapper', onSiteOn: '2026-09-01' });
  const on = (a: Asset, ts: Test[]) => ts.map(t => ({ ...t, assetId: a.id }));

  it('a machine with nothing on its list: the pace cannot say when, and names it', () => {
    const coder = machine({ name: 'Domino coder', dueOn: '2026-10-20' });
    const p = paceOf({ tests: on(wrapper, job()), assets: [wrapper, coder], today: TODAY })!;
    expect(p.kind).toBe('unplanned');
    expect(p.tone).toBe('none');
    expect(p.at).toBeUndefined();
    expect(p.text).toBe('The pace can’t say when yet — the Domino coder has nothing on its list.');
    expect(p.working).toBe('11 done · 7 to go on the lists so far');
  });

  it('two with nothing listed, and one still to arrive with no day', () => {
    const coder = machine({ name: 'Domino coder' }), labeller = machine({ name: 'Labeller' });
    const robot = machine({ name: 'Palletiser', state: 'awaited' });
    const p = paceOf({ tests: [...on(wrapper, job()), open({ assetId: robot.id })], assets: [wrapper, coder, labeller, robot], today: TODAY })!;
    expect(p.text).toBe('The pace can’t say when yet — the Domino coder and the Labeller have nothing on their lists; the Palletiser has no arrival date.');
  });

  it('even with everything listed done, a machine with nothing on its list is said', () => {
    const coder = machine({ name: 'Domino coder' });
    expect(paceOf({ tests: on(wrapper, [doneOn('2026-10-01')]), assets: [wrapper, coder], today: TODAY })?.kind).toBe('unplanned');
  });

  it('a machine still to arrive holds Hand over back: its own stages start when it is here', () => {
    // The wrapper's job: 7 done in the window, 7 to go → 24 Oct on its own.
    // The coder is due 28 Oct with 2 stages: 2 ÷ 0.5 a day = 4 days → Sun 1 Nov.
    const coder = machine({ name: 'Domino coder', dueOn: '2026-10-28' });
    const tests = [...on(wrapper, job()), ...on(coder, [open(), open()])];
    const p = paceOf({ tests, assets: [wrapper, coder], today: TODAY, plannedAt: '2026-10-30' })!;
    expect(p.kind).toBe('forecast');
    expect(p.at).toBe('2026-11-01');
    expect(p.after).toEqual({ machine: 'Domino coder', due: '2026-10-28' });
    expect(p.text).toBe(`At the pace so far, Hand over lands about ${D('2026-11-01')}, after the Domino coder arrives (due ${D('2026-10-28')}) — 2 days after the date agreed (${D('2026-10-30')}).`);
  });

  it('one whose day has gone is not here yet: its stages start today at the soonest', () => {
    const coder = machine({ name: 'Domino coder', dueOn: '2026-10-07' });
    const tests = [...on(wrapper, job()), ...on(coder, Array.from({ length: 10 }, () => open()))];
    // 17 to go overall → 34 days → Fri 13 Nov; the coder's 10 from today → 20 days → Fri 30 Oct: the overall wins.
    const p = paceOf({ tests, assets: [wrapper, coder], today: TODAY })!;
    expect(p.at).toBe('2026-11-13');
    expect(p.after).toBeUndefined();
    // Carrying everything left, it starts today like the rest: never past the pace itself.
    const lone = paceOf({ tests: [...on(wrapper, job().slice(0, 11)), ...on(coder, Array.from({ length: 16 }, () => open()))], assets: [wrapper, coder], today: TODAY })!;
    expect(lone.at).toBe(addDays(TODAY, 32));
    expect(lone.after).toBeUndefined();
  });

  it('a machine already here does not hold it back', () => {
    const coder = machine({ name: 'Domino coder', dueOn: '2026-10-28', onSiteOn: '2026-10-05' });
    const p = paceOf({ tests: [...on(wrapper, job()), ...on(coder, [open()])], assets: [wrapper, coder], today: TODAY })!;
    expect(p.after).toBeUndefined();
  });
});
