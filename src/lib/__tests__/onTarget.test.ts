/* ARE WE ON TARGET? — one answer, in a word and a reason. Rowland, 6 October:
 * "the header must clearly show the answer to the question: ARE WE ON
 * TARGET?" Off a job shaped like the seed: a handover agreed, stages late by
 * their day or by the hours their problems lost, a problem that lost none. */
import { describe, expect, it } from 'vitest';
import { linesOnTarget, onTargetSays, stageGateOnTarget } from '../onTarget';
import type { Asset, Test, TestItem } from '../testing';
import type { LineSeries } from '../measures';
import { niceDay } from '../weeks';

const TODAY = '2026-10-06';
const D = (iso: string) => niceDay(iso, { weekday: 'short' });
let n = 0;
const step = (o: Partial<Test> & { title: string }): Test =>
  ({ id: `s${++n}`, projectId: 'p', kind: 'install', assetId: 'm1', outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
const found = (testId: string, hoursLost?: number): TestItem =>
  ({ id: `i${++n}`, projectId: 'p', testId, kind: 'found', what: 'Guard bracket wrong', sort: n, createdAt: n, updatedAt: 1, ...(hoursLost ? { hoursLost } : {}) });
const machine: Asset = { id: 'm1', projectId: 'p', name: 'Ishida checkweigher', state: 'onSite', onSiteOn: '2026-09-30', sort: 1, updatedAt: 1 };
const job = (o: { tests?: Test[]; items?: TestItem[]; expectedAt?: string; plannedAt?: string }) => stageGateOnTarget({
  project: { expectedAt: o.expectedAt, plannedAt: o.plannedAt },
  tests: o.tests ?? [], items: o.items ?? [], assets: [machine], materials: [], programs: [], today: TODAY,
});

describe('a stage-gate job — is the handover on target?', () => {
  const ahead = step({ title: 'Dry run', plannedFor: '2026-10-20' });

  it('on target: the handover as agreed and nothing late', () => {
    const v = job({ tests: [ahead], plannedAt: '2026-10-25', expectedAt: '2026-10-25' });
    expect(v).toEqual({ tone: 'on', word: 'On target', reason: `handover ${D('2026-10-25')} as agreed · nothing late` });
  });

  it('behind: the handover expected after the date agreed, both days named', () => {
    const v = job({ tests: [ahead], plannedAt: '2026-10-25', expectedAt: '2026-11-02' });
    expect(v.tone).toBe('behind');
    expect(onTargetSays(v)).toBe(`Behind target — handover expected ${D('2026-11-02')}, 8 days after the agreed ${D('2026-10-25')} · nothing late`);
  });

  it('behind: a stage late by the hours its problems lost, said with the hours', () => {
    const lost = step({ title: 'Sensors and controls checked', plannedFor: '2026-10-08', ranOn: '2026-10-06', outcome: 'failed' });
    const gone = step({ title: 'Air connected', plannedFor: '2026-10-02' });
    const v = job({ tests: [lost, gone, ahead], items: [found(lost.id, 2)], plannedAt: '2026-10-25' });
    /* Rowland, 7 October: "it says 2 late, 100 hours lost ... this is really
       poor information" — each late thing is named now, with the hours its
       problems lost or the day it was due, so the line can be checked. */
    expect(v).toEqual({ tone: 'behind', word: 'Behind target',
      reason: `handover ${D('2026-10-25')} as agreed · 2 late: Ishida checkweigher — Sensors and controls checked (2 h lost); Ishida checkweigher — Air connected (was due ${D('2026-10-02')})` });
  });

  it('at risk: nothing late, but a problem that lost no time', () => {
    const none = step({ title: 'Dry run', plannedFor: '2026-10-12', ranOn: '2026-10-06', outcome: 'failed' });
    const v = job({ tests: [none], items: [found(none.id)], plannedAt: '2026-10-25' });
    /* "1 a problem" read badly and named nothing; the problem is named. */
    expect(v).toEqual({ tone: 'risk', word: 'At risk', reason: `handover ${D('2026-10-25')} as agreed · nothing late · 1 problem, no time lost: Ishida checkweigher — Dry run` });
  });

  it('one handover date is the handover — never "no date agreed yet" (Rowland, 7 October)', () => {
    expect(job({ tests: [ahead], expectedAt: '2026-10-09' }).reason).toBe(`handover ${D('2026-10-09')} · nothing late`);
  });

  it('at risk: something owed falls due within two days', () => {
    const soon = step({ title: 'Guards fitted', plannedFor: '2026-10-08', withWhom: 'Ishida Europe' });
    expect(job({ tests: [soon], plannedAt: '2026-10-25' }).reason).toMatch(/· 1 due within 2 days$/);
    const later = step({ title: 'Guards fitted', plannedFor: '2026-10-09' });
    expect(job({ tests: [later], plannedAt: '2026-10-25' }).tone).toBe('on');
  });

  it('says so when there is no date to be on target for, or nothing planned', () => {
    expect(job({ tests: [ahead] })).toMatchObject({ tone: 'none', word: 'No target date' });
    expect(stageGateOnTarget({ project: {}, tests: [], items: [], assets: [], materials: [], programs: [], today: TODAY }))
      .toMatchObject({ tone: 'none', word: 'Nothing planned yet' });
  });

  it('a problem that lost hours is late, never "at risk" — Rowland: the hours tell the app it caused lateness', () => {
    const hit = step({ title: 'Dry run', plannedFor: '2026-10-12', ranOn: '2026-10-06', outcome: 'failed' });
    expect(job({ tests: [hit], items: [found(hit.id)], plannedAt: '2026-10-25' }).tone).toBe('risk');
    expect(job({ tests: [hit], items: [found(hit.id, 3)], plannedAt: '2026-10-25' }).tone).toBe('behind');
  });
});

describe('a 6M or lever tree job — are its lines at target?', () => {
  const series = (latest: number | undefined, target: number | undefined): LineSeries => ({
    measure: { id: 'ppm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 1 },
    points: latest == null ? [] : [{ at: '2026-10-05', value: latest }], across: [], latest, target,
    ...(latest != null && target != null ? { margin: latest - target, meeting: latest >= target } : {}),
  });
  it('on target when every line judged is at its target', () => {
    expect(linesOnTarget([{ name: 'Line 2A', series: series(62, 60) }, { name: 'Line 7', series: series(55, 50) }]))
      .toEqual({ tone: 'on', word: 'On target', reason: '2 of 2 lines at target' });
  });
  it('behind, naming the line that is short and by how much', () => {
    const v = linesOnTarget([{ name: 'Line 2A', series: series(62, 60) }, { name: 'Line 4', series: series(41, 50) }, { name: 'Line 7', series: series(55, 50) }]);
    expect(onTargetSays(v)).toBe('Behind target — 2 of 3 lines at target (Line 4: 41 vs 50 ppm)');
  });
  it('not measured yet with no readings against a target', () => {
    expect(linesOnTarget([{ name: 'Line 2A', series: series(undefined, 60) }])).toMatchObject({ tone: 'none', word: 'Not measured yet' });
    expect(linesOnTarget([{ name: 'Line 2A' }])).toMatchObject({ tone: 'none', reason: 'no measure set yet' });
    expect(linesOnTarget([])).toMatchObject({ tone: 'none', reason: 'no lines on the job yet' });
  });
});

describe('a name in the one-line answer', () => {
  it('is one line, and cut at a word when long — the whole of it is below', async () => {
    const { nameIn } = await import('../onTarget');
    expect(nameIn('Spares agreed\nTwo lines pasted from a cell')).toBe('Spares agreed Two lines pasted from a cell');
    const long = nameIn('pallet film guard reject weigher coder splice tracking seal belt belt pallet coder guard');
    expect(long.length).toBeLessThanOrEqual(61);
    expect(long.endsWith('…')).toBe(true);
    expect(long).toBe('pallet film guard reject weigher coder splice tracking seal…');
  });
});
