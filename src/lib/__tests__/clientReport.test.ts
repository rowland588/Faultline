/* The stage-gate client report: what is on it, off a job shaped like Line 2B. */
import { describe, it, expect } from 'vitest';
import { clientReport, machinesSay } from '../clientReport';
import type { Project } from '../../types';
import type { Asset, Test, TestItem } from '../testing';
import type { Program } from '../programs';

const T = '2026-10-01';
const project: Project = { id: 'p', name: 'Line 2 B commissioning', color: '#2b87d4', lead: 'Rowland', commissioning: true, createdAt: 1, updatedAt: 1 } as Project;
const asset = (id: string, name: string, sort: number): Asset => ({ id, projectId: 'p', name, state: 'onSite', sort, updatedAt: 1 } as Asset);
const test = (o: Partial<Test> & { id: string; title: string }): Test => ({ projectId: 'p', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...o });
const assets = [asset('bu', 'BU', 1), asset('pnp', 'Pick and place', 2), asset('ds', 'De-staker', 3)];
const tests: Test[] = [
  test({ id: 't75', kind: 'test', title: '75 ppm for 1 hr', assetId: 'bu', ranOn: '2026-09-22', outcome: 'failed', result: '80% over 4 hrs' }),
  test({ id: 't70', kind: 'test', title: '70 ppm baseline', assetId: 'bu', ranOn: '2026-09-23', outcome: 'passed' }),
  test({ id: 'f1', kind: 'fix', title: 'Grip rollers', passesIf: 'Silver rollers slip', assetId: 'bu', plannedFor: '2026-09-22', plannedTo: '2026-09-25', withWhom: 'Brillopak' }),
  test({ id: 'f2', kind: 'fix', title: 'Speed blue conveyor', assetId: 'bu', ranOn: '2026-09-24', outcome: 'passed' }),
  test({ id: 's1', kind: 'install', title: 'Positioned and levelled', assetId: 'ds', outcome: 'passed', ranOn: '2026-09-20' }),
  test({ id: 's2', kind: 'install', title: 'Guarding fitted', assetId: 'ds', plannedFor: '2026-09-25' }),
  test({ id: 'h1', kind: 'install', gate: 'handover', title: 'Manuals handed over', assetId: 'pnp' }),
];
const programs: Program[] = [
  { id: 'pg1', projectId: 'p', what: 'Maris Piper 2kg', assetId: 'pnp', state: 'proved', provedOn: '2026-09-29', sort: 1, createdAt: 1, updatedAt: 1 },
  { id: 'pg2', projectId: 'p', what: 'Express 1.75', assetId: 'pnp', state: 'onMachine', sort: 2, createdAt: 1, updatedAt: 1 },
];
// A note with a reminder that is on the plan — still never on the client's copy.
const items: TestItem[] = [{ id: 'n1', projectId: 'p', testId: '', kind: 'note', what: 'private', due: '2026-10-05', onPlan: true, sort: 1, createdAt: 1, updatedAt: 1 }];
const r = clientReport({ project, projects: [project], assets, tests, items, materials: [], programs, standards: [], today: T });

describe('the stage-gate client report', () => {
  it('leads with where the job is, and each machine', () => {
    expect(r.name).toBe('Line 2 B commissioning');
    expect(r.sentence).toMatch(/outstanding/);
    expect(r.gates.map(g => g.label)).toEqual(['Install', 'Set up', 'Commission', 'Hand over']);
    expect(r.machines.map(m => [m.name, m.at])).toEqual([['BU', 'Commission'], ['Pick and place', 'Hand over'], ['De-staker', 'Install']]);
    expect(machinesSay(r)).toBe('1 at Commission · 1 at Hand over · 1 at Install');
  });
  it('goes gate by gate, in order, each saying how far it has got', () => {
    expect(r.sections.map(s => s.label)).toEqual(['Install', 'Set up', 'Commission', 'Hand over']);
    const install = r.sections[0];
    // Six usual stages plus "Guarding fitted": seven squares, two planned.
    expect(install.says).toBe('1 of 2 done · 1 late · 5 not added yet');
    expect(install.grid?.rows.map(x => x.machine)).toEqual(['De-staker']);
    expect(install.late[0]).toBe('De-staker — Guarding fitted');
    expect(install.problems).toEqual([]);
  });
  /* Rowland, 6 October: "We know if it's a problem and if it's late,
     because I put hours in the problem to tell the app it caused lateness."
     Each stage is late OR a problem by the one rule (lib/install
     lateOrProblem) — two lists, two counts, never "late or a problem". */
  it('says which — late (with the hours lost) or a problem that lost no time', () => {
    const steps = [
      test({ id: 'p1', kind: 'install', title: 'Cabled up', assetId: 'ds', outcome: 'failed', ranOn: '2026-09-29', plannedFor: '2026-10-03' }),
      test({ id: 'p2', kind: 'install', title: 'Air connected', assetId: 'ds', outcome: 'failed', ranOn: '2026-09-25', plannedFor: '2026-09-25' }),
      test({ id: 'p3', kind: 'install', title: 'Guarding fitted', assetId: 'ds', plannedFor: '2026-09-25' }),
      test({ id: 'p4', kind: 'install', title: 'Dry run', assetId: 'ds', outcome: 'failed', ranOn: '2026-09-30', plannedFor: '2026-10-05' }),
    ];
    const lost: TestItem[] = [{ id: 'h1', projectId: 'p', testId: 'p4', kind: 'found', what: 'Guard bracket wrong', hoursLost: 2, sort: 1, createdAt: 1, updatedAt: 1 }];
    const x = clientReport({ project, projects: [project], assets, tests: steps, items: lost, materials: [], programs: [], standards: [], today: T });
    const install = x.sections[0];
    expect([...install.late].sort()).toEqual(['De-staker — Air connected', 'De-staker — Dry run — 2 h lost', 'De-staker — Guarding fitted']);
    expect(install.problems).toEqual(['De-staker — Cabled up']);
    expect(install.says).toMatch(/^0 of 4 done · 3 late · 1 a problem/);
    expect(JSON.stringify(x)).not.toContain('late or a problem');
    // The squares say the same: late red, the problem amber.
    const cells = install.grid?.rows[0].cells ?? [];
    const col = (name: string) => cells[install.grid?.columns.indexOf(name) ?? -1];
    expect([col('Cabled up'), col('Air connected'), col('Dry run')]).toEqual(['problem', 'late', 'late']);
  });
  it('Set up carries the programs; Commission the tests with their outcome', () => {
    expect(r.sections[1].programs).toMatchObject({ done: 1, total: 2 });
    expect(r.sections[1].says).toMatch(/1 of 2 programs passed/);
    const c = r.sections[2];
    expect(c.says).toBe('1 of 2 passed · 1 didn’t pass');
    expect(c.tests?.map(t => t.tone)).toEqual(['failed', 'done']);
    expect(c.tests?.[0].result).toBe('80% over 4 hrs');
  });
  it('lists open fixes first, late at the top, and the done ones apart', () => {
    expect(r.fixes.open.map(f => [f.title, f.tone])).toEqual([['Grip rollers', 'late']]);
    expect(r.fixes.done.map(f => f.title)).toEqual(['Speed blue conveyor']);
  });
  it('never carries a meeting note', () => {
    expect(JSON.stringify(r)).not.toContain('private');
  });
});

describe('a test that was run again', () => {
  const again = [
    ...tests,
    test({ id: 't75b', kind: 'test', title: '75 ppm for 1 hr — re-test', fromTestId: 't75', assetId: 'bu', ranOn: '2026-09-30', outcome: 'passed' }),
  ];
  const r2 = clientReport({ project, projects: [project], assets, tests: again, items, materials: [], programs, standards: [], today: T });
  const c = r2.sections[2];

  it('counts the latest attempt of each, so a pass on the re-test is not still a failure', () => {
    expect(c.says).toBe('2 of 2 passed');
    expect(c.late).toEqual([]);
  });

  it('still lists every attempt — that is what happened', () => {
    expect(c.tests?.map(t => t.tone)).toEqual(['failed', 'done', 'done']);
  });
});

describe('a gate the machines are past with nothing kept', () => {
  it('says it is done, rather than a green box reading "nothing kept"', () => {
    const done = clientReport({ project, projects: [project], assets: [{ ...asset('a', 'Loma IQ4', 1), state: 'installed' } as Asset], tests: [], items: [], materials: [], programs: [], standards: [], today: T });
    const install = done.gates.find(g => g.gate === 'install');
    expect(install?.tone).toBe('done');
    expect(install?.says).toBe('Done — no steps kept for it');
    const ahead = clientReport({ project, projects: [project], assets: [asset('a', 'Loma IQ4', 1)], tests: [], items: [], materials: [], programs: [], standards: [], today: T });
    expect(ahead.gates.find(g => g.gate === 'install')?.says).toBe('Nothing kept at this gate yet');
  });
});

describe('how each stage went — the team’s account of a step reaches the client', () => {
  const said = [
    ...tests,
    // Out of order on purpose: the rows follow the grid (machine, then stage), not the sort.
    test({ id: 's3', kind: 'install', title: 'Mechanically complete', assetId: 'ds', plannedFor: '2026-09-25', outcome: 'notRun', sort: 0,
      result: '  Two guard panels short — could not finish; the rest come Friday.  ' }),
    test({ id: 's4', kind: 'install', title: 'Positioned and levelled', assetId: 'bu', ranOn: '2026-09-18', outcome: 'passed', sort: 9,
      result: 'Levelled to 1 mm across the frame. Took two hours longer — the floor dips by the drain.' }),
    test({ id: 's5', kind: 'install', title: 'Dry run', assetId: 'bu', plannedFor: '2026-10-08', sort: 10, result: 'Ishida say Tuesday.' }),
    test({ id: 's6', kind: 'install', title: 'Air and power connected', assetId: 'bu', ranOn: '2026-09-19', outcome: 'failed', sort: 11,
      result: 'No 6 bar at the drop.' }),
    test({ id: 's7', kind: 'install', title: 'Electrically complete', assetId: 'bu', sort: 12, result: 'Waiting on the panel.' }),
    test({ id: 's8', kind: 'install', title: 'Mechanically complete', assetId: 'bu', sort: 13, result: '   ' }),
    test({ id: 'h2', kind: 'install', gate: 'handover', title: 'Operators trained', assetId: 'pnp', ranOn: '2026-09-30', sort: 14,
      result: 'Both shifts trained; nights need a second session.' }),
  ];
  const r3 = clientReport({ project, projects: [project], assets, tests: said, items, materials: [], programs, standards: [], today: T });
  const install = r3.sections[0];

  it('lists only the steps with an account, machine by machine, stage by stage in the grid’s order', () => {
    expect(install.accounts?.map(a => `${a.machine} — ${a.stage}`)).toEqual([
      'BU — Positioned and levelled', 'BU — Air and power connected', 'BU — Electrically complete', 'BU — Dry run',
      'De-staker — Mechanically complete',
    ]);
  });
  it('carries the account whole, the day it was done (else booked) and the state in the grid’s words', () => {
    const [lev, air, elec, dry, guard] = install.accounts ?? [];
    expect(lev).toMatchObject({ tone: 'done', state: 'done', said: 'Levelled to 1 mm across the frame. Took two hours longer — the floor dips by the drain.' });
    expect(lev.when).toMatch(/18 Sep/);
    // Hit a problem on 19 Sept with no day planned: that day has gone, so it is late.
    expect(air).toMatchObject({ tone: 'late', state: 'late' });
    /* Something said and nobody has called it: a stage stays as planned until
       it is marked done or a problem (Rowland, 5 October) — booked is still
       ahead, no day is no day yet. */
    expect(elec).toMatchObject({ tone: 'ahead', state: 'no day yet', when: 'no date' });
    expect(dry).toMatchObject({ tone: 'booked', state: 'still ahead' });
    expect(dry.when).toMatch(/8 Oct/);
    expect(guard).toMatchObject({ tone: 'late', state: 'late', said: 'Two guard panels short — could not finish; the rest come Friday.' });
  });
  it('a stage worked on and not yet called stays as planned — it is not owed a verdict', () => {
    expect(r3.sections[3].accounts).toEqual([
      expect.objectContaining({ machine: 'Pick and place', stage: 'Operators trained', tone: 'ahead', state: 'no day yet' }),
    ]);
  });
  it('a gate where nobody said anything has no accounts — it prints exactly as before', () => {
    expect(r.sections[0].accounts).toBeUndefined();
    expect(r.sections[3].accounts).toBeUndefined();
    expect(r3.sections[1].accounts).toBeUndefined();
    expect(r3.sections[2].accounts).toBeUndefined();
  });
  /* Rowland, 5 October: a problem written on a stage, a picture taken, and
     "Book it in as a fix" ticked. The picture stays on the problem; the fix's
     card carries it, and a fix named by its problem does not print it twice. */
  it('prints a booked fix with the problem\'s picture, and its problem once', () => {
    const steps = [
      test({ id: 'st', kind: 'install', title: 'Air connected', assetId: 'ds', outcome: 'failed', ranOn: '2026-09-29' }),
      test({ id: 'fx', kind: 'fix', title: 'Bracket wrong size', passesIf: 'Bracket wrong size', fromTestId: 'st', assetId: 'ds' }),
      test({ id: 'fy', kind: 'fix', title: 'Fit the right bracket', passesIf: 'Bracket wrong size', fromTestId: 'st', assetId: 'ds' }),
    ];
    const seen: TestItem[] = [{ id: 'i1', projectId: 'p', testId: 'st', kind: 'found', what: 'Bracket wrong size', becameTestId: 'fx',
      media: [{ id: 'm1', kind: 'photo', blobKey: 'b-photo', createdAt: 1 } as never], sort: 1, createdAt: 1, updatedAt: 1 }];
    const x = clientReport({ project, projects: [project], assets, tests: steps, items: seen, materials: [], programs: [], standards: [], today: T });
    const fx = x.fixes.open.find(f => f.id === 'fx'), fy = x.fixes.open.find(f => f.id === 'fy');
    expect(fx?.photoKey).toBe('b-photo');
    expect(fx?.problem).toBeUndefined();
    expect(fy?.problem).toBe('Bracket wrong size');
    expect(fy?.photoKey).toBeUndefined();
  });
  /* Rowland, 6 October: "press the picture and then say what's wrong within
     the picture at certain locations." The marks are on the picture, so the
     fix card that prints it is handed them — and a fix with none has none. */
  it('carries what is marked on the picture it prints, and nothing when unmarked', () => {
    const pins = [{ id: 'p1', x: 20, y: 30, note: 'Bolt missing' }, { id: 'p2', x: 70, y: 60, note: 'Guard cracked' }];
    const steps = [
      test({ id: 'st', kind: 'install', title: 'Air connected', assetId: 'ds', outcome: 'failed', ranOn: '2026-09-29' }),
      test({ id: 'fx', kind: 'fix', title: 'Fit the guard', fromTestId: 'st', assetId: 'ds',
        media: [{ id: 'v1', kind: 'video', blobKey: 'b-clip', thumbKey: 'b-poster', mime: 'video/mp4', capturedAt: 1 },
          { id: 'm1', kind: 'photo', blobKey: 'b-photo', mime: 'image/jpeg', capturedAt: 2, pins }] }),
      test({ id: 'fy', kind: 'fix', title: 'Re-cut the jaw', fromTestId: 'st', assetId: 'ds',
        media: [{ id: 'm2', kind: 'photo', blobKey: 'b-plain', mime: 'image/jpeg', capturedAt: 3 }] }),
    ];
    const x = clientReport({ project, projects: [project], assets, tests: steps, items: [], materials: [], programs: [], standards: [], today: T });
    const fx = x.fixes.open.find(f => f.id === 'fx'), fy = x.fixes.open.find(f => f.id === 'fy');
    expect(fx?.photoKey).toBe('b-photo');
    expect(fx?.photoPins?.map(p => p.note)).toEqual(['Bolt missing', 'Guard cracked']);
    expect(fy?.photoKey).toBe('b-plain');
    expect(fy?.photoPins).toBeUndefined();
  });
});
