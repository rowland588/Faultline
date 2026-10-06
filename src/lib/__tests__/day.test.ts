/* THE DAY, AS DATA.
 *
 * "Telling a story" of a day off the dates the records already carry. Asserts
 * what the story says, and — the part that matters most — that it never says
 * something did not happen when it did. */
import { describe, it, expect } from 'vitest';
import { activeDays, dayOf, type DayInput } from '../day';
import type { Asset, Test, TestItem } from '../testing';
import type { Material } from '../materials';
import type { Program } from '../programs';

const TODAY = '2026-09-30';
const at = (iso: string) => new Date(`${iso}T10:00:00`).getTime();
let n = 0;
const packer: Asset = { id: 'a1', projectId: 'p', name: 'Case packer', oem: 'Brillopak', state: 'onSite', onSiteOn: '2026-09-22', dueOn: '2026-09-22', sort: 1, updatedAt: 1 };
const coder: Asset = { id: 'a2', projectId: 'p', name: 'Coder', oem: 'Domino UK', state: 'awaited', dueOn: '2026-09-29', sort: 2, updatedAt: 1 };
const rec = (o: Partial<Test> & { title: string }): Test =>
  ({ id: `t${++n}`, projectId: 'p', outcome: 'planned', sort: n, createdAt: at('2026-09-20'), updatedAt: 1, ...o });
const item = (testId: string, what: string, day: string): TestItem =>
  ({ id: `i${++n}`, projectId: 'p', testId, kind: 'found', what, sort: n, createdAt: at(day), updatedAt: 1 });

const air = rec({ kind: 'install', title: 'Air and power connected', assetId: packer.id, withWhom: 'Brillopak',
  plannedFor: '2026-09-29', ranOn: '2026-09-29', outcome: 'passed', result: 'Regulator missing — loan one fitted' });
const elec = rec({ kind: 'install', title: 'Electrically complete', assetId: packer.id, withWhom: 'Brillopak', plannedFor: '2026-09-29' });
const dry = rec({ kind: 'install', title: 'Dry run', assetId: packer.id, withWhom: 'Brillopak', plannedFor: '2026-10-02' });
const seal = rec({ title: 'Seal integrity', withWhom: 'Ilapak UK', plannedFor: '2026-09-29', ranOn: '2026-09-29', outcome: 'failed', result: '3 leaks in 20' });
const fix = rec({ kind: 'fix', title: 'Send the regulator', fromTestId: air.id, withWhom: 'Brillopak', plannedFor: '2026-10-01', createdAt: at('2026-09-29') });
const film: Material = { id: 'm1', projectId: 'p', what: 'Lidding film', from: 'Amcor', due: '2026-09-29', inOn: '2026-09-29', sort: 1, createdAt: 1, updatedAt: 1 };
const labels: Material = { id: 'm2', projectId: 'p', what: 'Case labels', from: 'Avery', due: '2026-09-29', sort: 2, createdAt: 1, updatedAt: 1 };
const input: DayInput = {
  tests: [air, elec, dry, seal, fix],
  items: [item(air.id, 'Regulator missing from the kit', '2026-09-29')],
  assets: [packer, coder],
  materials: [film, labels],
  programs: [] as Program[],
};

describe('a day that happened', () => {
  const d = dayOf(input, '2026-09-29', TODAY);
  const texts = (k: string) => d.sections.find(s => s.key === k)?.lines.map(l => l.text) ?? [];

  it('says what got done, install steps named by their machine', () => {
    expect(texts('done')).toEqual([
      'Case packer — Air and power connected — done (Brillopak).',
      'Lidding film arrived from Amcor.',
    ]);
    expect(d.sections[0].lines[0].detail).toBe('Regulator missing — loan one fitted');
  });

  it('says what did not go to plan: failed, booked and not done, due and not here', () => {
    expect(texts('wrong')).toEqual([
      'Coder was due on site and did not arrive (Domino UK).',
      'Case packer — Electrically complete was booked and did not happen (Brillopak).',
      'Seal integrity — didn’t pass (Ilapak UK).',
      'Case labels was due and did not arrive (Avery).',
    ]);
  });

  it('says what was found, where, and the fix decided on it', () => {
    expect(texts('found')[0]).toBe('Regulator missing from the kit');
    expect(d.sections.find(s => s.key === 'found')?.lines[0].detail).toBe('Found on Case packer — Air and power connected');
    expect(texts('found')[1]).toMatch(/^New fix: Send the regulator — Brillopak, by /);
  });

  it('ends today on what is next, with the day it is booked — and a past day does not', () => {
    expect(d.sections.find(s => s.key === 'next')).toBeUndefined();
    const next = dayOf(input, TODAY, TODAY).sections.find(s => s.key === 'next');
    expect(next?.title).toMatch(/^Next — /);
    expect(next?.lines.map(l => l.text)).toEqual(['Fix: Send the regulator (Brillopak).']);
  });

  it('says it in one sentence, with install as it stood that evening', () => {
    expect(d.headline).toBe('2 things done, 4 did not go to plan and 1 thing found. Install 1 of 3 steps done.');
    expect(d.install).toEqual({ done: 1, total: 3 });
  });

  it('opens the record each line came from', () => {
    expect(d.sections[0].lines[0].id).toBe(air.id);
    expect(d.sections[0].lines[1].go).toBe('materials');
  });
});

describe('never inventing what did not happen', () => {
  it('does not call a material late that was marked here without a date', () => {
    const here: Material = { ...labels, here: true };
    const d = dayOf({ ...input, materials: [here] }, '2026-09-29', TODAY);
    expect(JSON.stringify(d.sections)).not.toContain('Case labels');
  });

  it('calls what is booked today booked, not missed, while the day is still going', () => {
    const d = dayOf({ ...input, tests: [rec({ kind: 'install', title: 'Guards fitted', assetId: packer.id, plannedFor: TODAY })] }, TODAY, TODAY);
    expect(d.sections.find(s => s.key === 'today')?.lines.map(l => l.text)).toEqual(['Case packer — Guards fitted.']);
    expect(d.sections.find(s => s.key === 'wrong')).toBeUndefined();
    /* Due today, in the words its list uses; the coder and the labels due
       yesterday are past their day, and today says so (5 October). */
    expect(d.headline).toBe('1 due today, nothing logged yet. 2 late. Install 0 of 1 steps done.');
  });

  it('says so when nothing was logged', () => {
    const d = dayOf(input, '2026-09-10', TODAY);
    expect(d).toMatchObject({ empty: true, headline: 'Nothing was logged for this day.' });
  });
});

/* Rowland, 5 October: "it's showing everything is due today, and it's not.
   A lot of the things start from today to the end of the week." */
describe('a booking that runs over several days', () => {
  const week = rec({ kind: 'install', title: 'Guards fitted', assetId: packer.id, withWhom: 'Brillopak', plannedFor: TODAY, plannedTo: '2026-10-02' });
  const since = rec({ kind: 'install', title: 'Cabled up', assetId: packer.id, plannedFor: '2026-09-28', plannedTo: TODAY });
  const one = { ...input, tests: [week, since], assets: [packer], materials: [] as Material[] };
  const texts = (d: ReturnType<typeof dayOf>, k: string) => d.sections.find(s => s.key === k)?.lines.map(l => l.text) ?? [];

  it('is due on its last day, and under way before it — each saying its window', () => {
    const d = dayOf(one, TODAY, TODAY);
    expect(texts(d, 'today')).toEqual(['Case packer — Cabled up — since Mon 28 Sept.']);
    expect(texts(d, 'going')).toEqual(['Case packer — Guards fitted (Brillopak) — starts today, due Fri 2 Oct.']);
    expect(d.sections.find(s => s.key === 'going')?.title).toBe('Under way — due later');
    expect(d.headline).toBe('1 due today, 1 under way, nothing logged yet. Install 0 of 2 steps done.');
  });

  it('on a past day in the middle of its window, was under way — not "did not happen"', () => {
    const d = dayOf(one, '2026-09-29', TODAY);
    expect(texts(d, 'wrong')).toEqual([]);
    expect(texts(d, 'going')).toEqual(['Case packer — Cabled up — since Mon 28 Sept, due Wed 30 Sept.']);
  });

  it('on its last day gone by, did not happen — with when it was booked from', () => {
    const d = dayOf(one, TODAY, '2026-10-01');
    expect(texts(d, 'wrong')).toEqual(['Case packer — Cabled up was due and did not happen — booked from Mon 28 Sept.']);
  });

  it('today lists what is past its day and still not done', () => {
    const d = dayOf(one, '2026-10-01', '2026-10-01');
    expect(texts(d, 'late')).toEqual(['Case packer — Cabled up — late, was due Wed 30 Sept.']);
    expect(d.sections.find(s => s.key === 'late')?.title).toBe('Late — still not done');
  });
});

describe('stepping through the days', () => {
  it('lists every day something happened, and none where nothing did', () => {
    expect(activeDays(input)).toEqual(['2026-09-22', '2026-09-29']);
  });
});

/* Rowland, 6 October, of the part he wrote on "Programs loaded": "It should
   appear like a branch: it comes off the main action, and you can see there's
   something else there." A stage's parts (ui/StageParts) are on the day's
   story under their stage's name, with the machine after, opening the stage. */
describe('parts of a stage, on the day', () => {
  const programs = rec({ kind: 'install', gate: 'setup', title: 'Programs loaded', assetId: packer.id, withWhom: 'Ilapak UK',
    plannedFor: '2026-09-28', ranOn: '2026-09-28', outcome: 'passed' });
  const part = (what: string, o: Partial<TestItem> = {}): TestItem =>
    ({ id: `i${++n}`, projectId: 'p', testId: programs.id, kind: 'next', what, sort: n, createdAt: at('2026-09-27'), updatedAt: 1, ...o });
  const first = part('first program to verify Tesco Express 1.25 packs', { owner: 'Ilapak UK', due: TODAY, doneAt: at(TODAY) });
  const panels = part('Panels to run Express 1.25 kg', { owner: 'Ilapak UK', due: TODAY });
  const guards = part('Guard settings copied', { due: '2026-09-29' });
  const sheet = part('Recipe sheet signed', { due: '2026-10-02' });
  const loose = part('Nothing dated on this one');
  const one: DayInput = { tests: [programs], items: [first, panels, guards, sheet, loose], assets: [packer], materials: [], programs: [] };
  const lines = (d: ReturnType<typeof dayOf>, k: string) => d.sections.find(s => s.key === k)?.lines ?? [];
  const texts = (d: ReturnType<typeof dayOf>, k: string) => lines(d, k).map(l => l.text);

  it('says a part ticked done that day under what got done — its stage first, its machine after, opening the stage', () => {
    const d = dayOf(one, TODAY, TODAY);
    expect(texts(d, 'done')).toEqual(['Programs loaded — first program to verify Tesco Express 1.25 packs (Case packer).']);
    expect(lines(d, 'done')[0]).toMatchObject({ detail: 'Part of the plan · Ilapak UK', tone: 'done', id: programs.id });
  });

  it('says a part due today and not done under due today', () => {
    expect(texts(dayOf(one, TODAY, TODAY), 'today')).toEqual(['Programs loaded — Panels to run Express 1.25 kg (Case packer).']);
  });

  it('says a part past its day under past its day — today only; on the day itself it was due and not done', () => {
    const d = dayOf(one, TODAY, TODAY);
    expect(texts(d, 'late')).toEqual(['Programs loaded — Guard settings copied (Case packer) — was due Tue 29 Sept.']);
    expect(lines(d, 'late')[0].detail).toBe('Part of the plan');
    const then = dayOf(one, '2026-09-29', TODAY);
    expect(texts(then, 'wrong')).toEqual(['Programs loaded — Guard settings copied (Case packer) — was due and not done.']);
    expect(texts(then, 'late')).toEqual([]);
  });

  it('ends today on the next part booked, and never mentions a part with no day', () => {
    const d = dayOf(one, TODAY, TODAY);
    expect(d.sections.find(s => s.key === 'next')?.title).toBe('Next — Fri 2 Oct');
    expect(texts(d, 'next')).toEqual(['Programs loaded — Recipe sheet signed (Case packer).']);
    expect(JSON.stringify(d.sections)).not.toContain('Nothing dated');
  });

  it('counts it in the sentence, and the day it was done is a day something happened', () => {
    // "late", not "past its day": the headline says late and a problem apart now (lib/install lateOrProblem).
    expect(dayOf(one, TODAY, TODAY).headline).toBe('1 thing done. 1 late. Set up 1 of 1 steps done.');
    expect(activeDays(one)).toEqual(['2026-09-22', '2026-09-28', TODAY]);
  });

  it('a part done before its day is not due on it', () => {
    const early = { ...one, items: [part('Done early', { due: TODAY, doneAt: at('2026-09-29') })] };
    const d = dayOf(early, TODAY, TODAY);
    expect(texts(d, 'today')).toEqual([]);
    expect(texts(dayOf(early, '2026-09-29', TODAY), 'done')).toEqual(['Programs loaded — Done early (Case packer).']);
  });
});

/* Rowland, 6 October: "The report shows 'late or a problem' — not good
   enough. We know if it's a problem and if it's late, because I put hours in
   the problem to tell the app it caused lateness." */
describe('late or a problem — today says which', () => {
  const sensors = rec({ kind: 'install', title: 'Sensors and controls checked', assetId: packer.id, plannedFor: '2026-10-02', ranOn: '2026-09-29', outcome: 'failed' });
  const dryRun = rec({ kind: 'install', title: 'Dry run', assetId: packer.id, plannedFor: '2026-10-05', ranOn: '2026-09-29', outcome: 'failed' });
  const hours: TestItem = { ...item(sensors.id, 'Guard bracket the wrong size', '2026-09-29'), hoursLost: 2 };
  const one = { ...input, tests: [sensors, dryRun], items: [hours, item(dryRun.id, 'Waiting on air', '2026-09-29')], assets: [packer], materials: [] as Material[] };
  const d = dayOf(one, TODAY, TODAY);
  const sec = (k: string) => d.sections.find(s => s.key === k);

  it('puts a stage whose problems lost hours under late, with the hours, and one that lost none apart', () => {
    expect(sec('late')?.lines.map(l => l.text)).toEqual(['Case packer — Sensors and controls checked — late, 2 h lost, due Fri 2 Oct.']);
    expect(sec('problem')?.title).toBe('A problem — no time lost');
    expect(sec('problem')?.lines.map(l => l.text)).toEqual(['Case packer — Dry run — a problem, no time lost, due Mon 5 Oct.']);
  });
  it('marks the words that say which, for their colour — red late, amber a problem', () => {
    expect(sec('late')?.lines[0]).toMatchObject({ which: 'late', mark: 'late, 2 h lost', tone: 'slipped' });
    expect(sec('problem')?.lines[0]).toMatchObject({ which: 'problem', mark: 'a problem, no time lost', tone: 'problem' });
  });
  it('counts them apart in the headline and on the gate’s bar', () => {
    expect(d.headline).toMatch(/ 1 late · 1 a problem\. Install 0 of 2 steps done\.$/);
    expect(d.gates[0]).toMatchObject({ late: 1, problem: 1, wrong: 2, total: 2 });
    expect(JSON.stringify(d)).not.toContain('late or a problem');
  });
  it('the day it happened says which too, in what did not go to plan', () => {
    const that = dayOf(one, '2026-09-29', TODAY);
    expect(that.sections.find(s => s.key === 'wrong')?.lines.map(l => l.text)).toEqual([
      'Case packer — Sensors and controls checked — late, 2 h lost.',
      'Case packer — Dry run — a problem, no time lost.',
    ]);
  });
});
