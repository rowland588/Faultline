/* THE HANDOVER VERDICT.
 *
 * Every number on the commissioning screen, and every line of the A3 report, is
 * derived from standing(). Nobody types "ready" anywhere in this app, which is
 * the point — but it also means a single wrong comparison here does not look like
 * a bug. It looks like a line that is ready to accept.
 *
 * That is the failure this file exists for. A handover signed on a wrong verdict
 * costs real money and the mistake is only found in production, by which time the
 * OEM has been paid. So the tests below are about the STATES and their ORDER, not
 * about rendering:
 *
 *   - written-but-unrun must never read the same as never-written, because those
 *     are two different conversations with two different people;
 *   - below-rate must never round up to proven;
 *   - an open A defect must outrank everything, because the blocker list is read
 *     from the top in a meeting and whatever is at the bottom does not get said;
 *   - an empty project must not read as ready, which is what `total > 0` is for.
 */
import { describe, it, expect } from 'vitest';
import {
  LINE_ITSELF, bestRun, programStatus, materialStatus, isOpen, stateOf, standing, byAsset,
  type Asset, type Program, type Material, type Check, type Punch, type Task, type Run,
  type CommissionItem, type Blocker,
} from '../commissioning';

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
const YESTERDAY = iso(-1);
const NEXT_WEEK = iso(7);

let n = 0;
const base = () => {
  n += 1;
  return { id: `i${n}`, projectId: 'p1', title: `Item ${n}`, sort: n, createdAt: 1, updatedAt: 1 };
};

const run = (achieved: number, extra: Partial<Run> = {}): Run =>
  ({ id: `r${achieved}`, at: 1, achieved, ...extra });

const program = (p: Partial<Program> = {}): Program =>
  ({ ...base(), kind: 'program', agreedRate: 60, written: true, ...p });
const material = (m: Partial<Material> = {}): Material =>
  ({ ...base(), kind: 'material', need: 10, have: 10, ...m });
const check = (c: Partial<Check> = {}): Check =>
  ({ ...base(), kind: 'check', criterion: 'no metal passes', outcome: 'pass', ...c });
const punch = (p: Partial<Punch> = {}): Punch =>
  ({ ...base(), kind: 'punch', severity: 'C', raisedAt: 1, closedAt: 2, ...p });
const task = (t: Partial<Task> = {}): Task =>
  ({ ...base(), kind: 'task', state: 'done', ...t });

/** A machine record. Assets used to be a typed-in string on each item; they are
 *  rows now, so a test that groups by machine has to make the rows. */
const asset = (id: string, name: string, sort = 0): Asset =>
  ({ id, projectId: 'p1', name, state: 'running', sort, updatedAt: 1 });

describe('programStatus — four states, and the gap between two of them', () => {
  it('a program nobody has written is missing, runs or no runs', () => {
    expect(programStatus(program({ written: false }))).toBe('missing');
    // Defensive: if written somehow went false with evidence attached, missing
    // still wins. A recipe that is not on the machine cannot be run tomorrow.
    expect(programStatus(program({ written: false, runs: [run(99)] }))).toBe('missing');
  });

  it('written but never run is untested, NOT missing — a different person owes it', () => {
    expect(programStatus(program({ runs: undefined }))).toBe('untested');
    expect(programStatus(program({ runs: [] }))).toBe('untested');
  });

  it('short of the agreed rate is below, however close', () => {
    expect(programStatus(program({ agreedRate: 60, runs: [run(59.9)] }))).toBe('below');
  });

  it('meeting the agreed rate exactly is proven — the contract says at least', () => {
    expect(programStatus(program({ agreedRate: 60, runs: [run(60)] }))).toBe('proven');
  });

  it('the BEST run counts, not the latest — you prove a rate once', () => {
    const p = program({ agreedRate: 60, runs: [run(62), run(48)] });
    expect(bestRun(p)?.achieved).toBe(62);
    expect(programStatus(p)).toBe('proven');
  });

  it('bestRun of a program with no runs is undefined rather than a zero', () => {
    expect(bestRun(program())).toBeUndefined();
  });
});

describe('materialStatus — have it, or say why not', () => {
  it('enough on site is have, and more than enough is still have', () => {
    expect(materialStatus(material({ need: 10, have: 10 }))).toBe('have');
    expect(materialStatus(material({ need: 10, have: 40 }))).toBe('have');
  });

  it('short means nothing is even on order — the worst of the three', () => {
    expect(materialStatus(material({ need: 10, have: 2 }))).toBe('short');
    expect(materialStatus(material({ need: 10, have: 2, onOrder: 0 }))).toBe('short');
  });

  it('on order and not yet due is awaited', () => {
    expect(materialStatus(material({ need: 10, have: 2, onOrder: 8, due: NEXT_WEEK }))).toBe('awaited');
    // No due date at all cannot be late, so it reads as awaited.
    expect(materialStatus(material({ need: 10, have: 2, onOrder: 8 }))).toBe('awaited');
  });

  it('on order but past its date is late', () => {
    expect(materialStatus(material({ need: 10, have: 2, onOrder: 8, due: YESTERDAY }))).toBe('late');
  });
});

describe('isOpen and stateOf', () => {
  it('a punch item is open until it has a closedAt', () => {
    expect(isOpen(punch({ closedAt: undefined }))).toBe(true);
    expect(isOpen(punch({ closedAt: 5 }))).toBe(false);
  });

  it('gives every kind a colour, and closed/proven/passed all read green', () => {
    expect(stateOf(program({ runs: [run(60)] }))).toBe('g');
    expect(stateOf(material())).toBe('g');
    expect(stateOf(check({ outcome: 'pass' }))).toBe('g');
    expect(stateOf(punch({ closedAt: 9 }))).toBe('g');
    expect(stateOf(task({ state: 'done' }))).toBe('g');
  });

  it('reads severity for an open defect: A blocked, B at risk, C in progress', () => {
    expect(stateOf(punch({ severity: 'A', closedAt: undefined }))).toBe('r');
    expect(stateOf(punch({ severity: 'B', closedAt: undefined }))).toBe('a');
    expect(stateOf(punch({ severity: 'C', closedAt: undefined }))).toBe('w');
  });

  it('a failed acceptance test is blocked, and an overdue unrun one is at risk', () => {
    expect(stateOf(check({ outcome: 'fail' }))).toBe('r');
    expect(stateOf(check({ outcome: 'notRun', due: YESTERDAY }))).toBe('a');
    expect(stateOf(check({ outcome: 'notRun', due: NEXT_WEEK }))).toBe('n');
  });

  it('a missing program is blocked — it is the OEM holding the line up', () => {
    expect(stateOf(program({ written: false }))).toBe('r');
    expect(stateOf(program({ runs: [] }))).toBe('n');
    expect(stateOf(program({ runs: [run(50)] }))).toBe('a');
  });

  it('an overdue task is at risk even while it is only todo', () => {
    expect(stateOf(task({ state: 'todo', due: YESTERDAY }))).toBe('a');
    expect(stateOf(task({ state: 'todo', due: NEXT_WEEK }))).toBe('n');
    expect(stateOf(task({ state: 'doing' }))).toBe('w');
    expect(stateOf(task({ state: 'waiting' }))).toBe('a');
  });
});

describe('standing — the verdict', () => {
  it('an empty list cannot be signed off: nothing proved is not the same as proved', () => {
    const r = standing([]);
    expect(r.clear).toBe(false);
    expect(r.blockers).toEqual([]);
    expect(r.pct).toBe(0);
  });

  it('signs off when everything is proven, in, passed and closed', () => {
    const r = standing([
      program({ runs: [run(61)] }),
      material(),
      check({ outcome: 'pass' }),
      punch({ severity: 'A', closedAt: 9 }),
      task({ state: 'done' }),
    ]);
    expect(r.blockers).toEqual([]);
    expect(r.clear).toBe(true);
    expect(r.pct).toBe(1);
  });

  it('ignores deleted records entirely — a soft delete must not block sign-off', () => {
    const r = standing([
      program({ runs: [run(61)] }),
      punch({ severity: 'A', closedAt: undefined, deletedAt: 5 }),
    ]);
    expect(r.clear).toBe(true);
    expect(r.counts.punch).toEqual({ openA: 0, openB: 0, openC: 0, closed: 0 });
  });

  it('an open A or B defect blocks; an open C does not', () => {
    const withA = standing([program({ runs: [run(61)] }), punch({ severity: 'A', closedAt: undefined })]);
    expect(withA.clear).toBe(false);
    expect(withA.blockers[0].kind).toBe('punch');

    /* B is in the way too, and the cut before this one said it was not — it let a
       line read as clear with a defect somebody had written down as "must be
       fixed before handover". A and B block; C is cosmetic and follows. */
    for (const severity of ['B', 'C'] as const) {
      const r = standing([program({ runs: [run(61)] }), punch({ severity, closedAt: undefined })]);
      expect(r.clear, `open ${severity}`).toBe(severity === 'C');
    }
  });

  it('counts each kind separately and does not double-count', () => {
    const r = standing([
      program({ written: false }),
      program({ runs: [] }),
      program({ runs: [run(50)] }),
      program({ runs: [run(60)] }),
      material({ need: 5, have: 5 }),
      material({ need: 5, have: 0 }),
      material({ need: 5, have: 0, onOrder: 5, due: NEXT_WEEK }),
      material({ need: 5, have: 0, onOrder: 5, due: YESTERDAY }),
      check({ outcome: 'pass' }),
      check({ outcome: 'fail' }),
      check({ outcome: 'notRun' }),
      punch({ severity: 'A', closedAt: undefined }),
      punch({ severity: 'B', closedAt: undefined }),
      punch({ severity: 'C', closedAt: undefined }),
      punch({ severity: 'A', closedAt: 4 }),
      task({ state: 'done' }),
      task({ state: 'todo' }),
    ]);
    expect(r.counts.programs).toEqual({ total: 4, missing: 1, untested: 1, below: 1, proven: 1, stale: 0 });
    expect(r.counts.materials).toEqual({ total: 4, have: 1, short: 1, awaited: 1, late: 1 });
    expect(r.counts.checks).toEqual({ total: 3, pass: 1, fail: 1, notRun: 1 });
    expect(r.counts.punch).toEqual({ openA: 1, openB: 1, openC: 1, closed: 1 });
    expect(r.counts.tasks).toEqual({ total: 2, done: 1 });
  });

  it('pct is proven + in + passed + closed over everything', () => {
    // 1 proven program, 1 material in, 2 checks of which 1 passed = 3 of 4.
    const r = standing([
      program({ runs: [run(60)] }),
      material(),
      check({ outcome: 'pass' }),
      check({ outcome: 'notRun' }),
    ]);
    expect(r.pct).toBeCloseTo(0.75, 10);
  });

  it('orders blockers worst first, so the top of the list is what gets said', () => {
    const items: CommissionItem[] = [
      task({ state: 'todo', title: 'Operator training' }),
      check({ outcome: 'notRun', title: 'Seal integrity' }),
      program({ runs: [], title: 'Untested format' }),
      material({ need: 10, have: 0, title: 'Film' }),
      program({ agreedRate: 60, runs: [run(51)], title: 'Below format' }),
      program({ written: false, title: 'Unwritten format' }),
      check({ outcome: 'fail', title: 'Metal detection' }),
      punch({ severity: 'A', closedAt: undefined, title: 'Roller misaligned' }),
    ];
    // Shuffled input must not change the order of the verdict.
    const order = standing([...items].reverse()).blockers.map((b: Blocker) => b.kind + ':' + b.what.split(' ')[0]);
    expect(order).toEqual([
      'punch:Grade',        // open A defect
      'check:Failed:',      // failed test
      'program:No',         // no program written
      'material:Film:',     // short of material
      'program:Below',      // short of rate
      'program:Untested',   // written, never run
      'check:Not',          // not run
      'task:Operator',      // everything else
    ]);
  });

  it('says the numbers in a below-rate blocker, because that is the argument', () => {
    const r = standing([program({ title: '500g tray', agreedRate: 60, rateUnit: 'ppm', runs: [run(51)] })]);
    expect(r.blockers[0].what).toBe('500g tray short of rate — 51 ppm against 60 agreed');
  });

  it('defaults the rate unit to ppm when nobody set one', () => {
    const r = standing([program({ title: '1kg bag', agreedRate: 40, runs: [run(30)] })]);
    expect(r.blockers[0].what).toContain('30 ppm against 40 agreed');
  });

  it('carries the machine onto every blocker, so a line of machines is readable', () => {
    const r = standing([punch({ severity: 'A', closedAt: undefined, assetId: 'as-ishida' })]);
    expect(r.blockers[0].assetId).toBe('as-ishida');
  });
});

describe('byAsset — a line is accepted one machine at a time', () => {
  const bagger = asset('a1', 'Bagger', 10);
  const pal = asset('a2', 'Palletiser', 20);

  it('groups by machine, in the order the machines are sorted, line itself last', () => {
    const rows = byAsset([bagger, pal], [
      task({ assetId: undefined }),
      program({ assetId: pal.id, runs: [run(61)] }),
      program({ assetId: bagger.id, runs: [run(61)] }),
    ]);
    expect(rows.map(r => r.name)).toEqual(['Bagger', 'Palletiser', LINE_ITSELF]);
  });

  it('counts each machine on its own rather than one number for the line', () => {
    const rows = byAsset([bagger, pal], [
      program({ assetId: bagger.id, runs: [run(61)] }),
      program({ assetId: pal.id, written: false }),
    ]);
    expect(rows.find(r => r.name === 'Bagger')!.done).toBe(1);
    expect(rows.find(r => r.name === 'Palletiser')!.open).toBe(1);
  });

  it('shows a machine with nothing on it rather than hiding it', () => {
    // A machine that has arrived and been given nothing to prove is exactly the
    // thing somebody needs to see. Hiding empty groups would hide it.
    const rows = byAsset([bagger, pal], [program({ assetId: bagger.id, runs: [run(61)] })]);
    expect(rows.map(r => r.name)).toEqual(['Bagger', 'Palletiser']);
  });

  it('never loses a row whose machine has been deleted', () => {
    /* It goes to the line rather than vanishing: a row nobody can see is worse
       than a row under the wrong heading, and this used to be the shape of it —
       items kept a machine NAME, so deleting the machine orphaned them silently. */
    const rows = byAsset([bagger], [
      program({ assetId: bagger.id, runs: [run(61)] }),
      punch({ assetId: 'gone', severity: 'A', closedAt: undefined, title: 'Orphan' }),
    ]);
    expect(rows.map(r => r.name)).toEqual(['Bagger', LINE_ITSELF]);
    expect(rows[1].items.map(i => i.title)).toEqual(['Orphan']);
  });

  it('drops deleted records from the counts', () => {
    const rows = byAsset([bagger], [
      program({ assetId: bagger.id, runs: [run(61)] }),
      program({ assetId: bagger.id, written: false, deletedAt: 3 }),
    ]);
    expect(rows[0].items).toHaveLength(1);
    expect(rows[0].open).toBe(0);
  });
});
