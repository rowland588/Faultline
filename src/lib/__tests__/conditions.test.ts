/* THE RULE THAT EVERY EARLIER CUT MISSED.
 *
 * A rate proved on 40µ film is not evidence for 35µ film, because the machine
 * does not run it the same way. Four rebuilds of this feature stored the number
 * and threw the conditions away, which meant the app would go on reporting a
 * pack as proved after the thing it was proved on had been withdrawn — and it
 * would do it silently, in front of the OEM.
 *
 * So these tests are about one pointer and its consequences: a result records the
 * material spec it was got ON, a material records what it REPLACES, and
 * everything else falls out. If one of these ever goes red, the app is lying
 * about a rate, and the fix is never to loosen the test.
 */
import { describe, it, expect } from 'vitest';
import {
  CELL_WORD, grid, isStale, isSettled, programStatus, standing, supersededIds, transitions,
  conditionOf, materialsOf, provenOnOf, weeksTo, sortBetween,
  type Asset, type Check, type CommissionItem, type Material, type Pack, type Program, type Run,
} from '../commissioning';

let n = 0;
const base = (over: Partial<{ assetId: string; packId: string }> = {}) => {
  n += 1;
  return { id: `i${n}`, projectId: 'p1', title: `Item ${n}`, sort: n, createdAt: 1, updatedAt: 1, ...over };
};
const run = (achieved: number, provenOn?: string): Run => ({ id: `r${++n}`, at: 1, achieved, provenOn });
const program = (p: Partial<Program> = {}): Program =>
  ({ ...base(), kind: 'program', agreedRate: 60, written: true, ...p });
const check = (c: Partial<Check> = {}): Check =>
  ({ ...base(), kind: 'check', criterion: 'no leaks', outcome: 'pass', ...c });
const material = (m: Partial<Material> = {}): Material =>
  ({ ...base(), kind: 'material', need: 40, have: 40, unit: 'rolls', ...m });
const asset = (id: string, name: string, sort = 0): Asset =>
  ({ id, projectId: 'p1', name, state: 'running', sort, updatedAt: 1 });
const pack = (id: string, name: string, sort = 0): Pack =>
  ({ id, projectId: 'p1', name, sort, updatedAt: 1 });

/** The film transition, as it actually is on Line 2: plenty of the old spec, a
 *  quarter of the new one delivered, and a rate proved on the old one. */
function filmJob() {
  const oldFilm = material({ id: 'm-old', title: 'Film', spec: '40µ', have: 40, need: 40 });
  const newFilm = material({ id: 'm-new', title: 'Film', spec: '35µ modified', have: 10, need: 40, onOrder: 30, supersedes: 'm-old' });
  const rate = program({ id: 'p-400', title: '400g', agreedRate: 60, runs: [run(66, 'm-old')] });
  const estop = check({ id: 'c-estop', title: 'Emergency stops', outcome: 'pass' });
  return { oldFilm, newFilm, rate, estop, items: [oldFilm, newFilm, rate, estop] as CommissionItem[] };
}

describe('a result only counts under the conditions it was got under', () => {
  it('a rate proved on a withdrawn spec is stale, however good the number was', () => {
    const { rate, items } = filmJob();
    // 66 against 60 agreed. It passed, and it still proves nothing about 35µ.
    expect(programStatus(rate, supersededIds(items))).toBe('stale');
    expect(isStale(rate, supersededIds(items))).toBe(true);
    expect(isSettled(rate, supersededIds(items))).toBe(false);
  });

  it('the same rate is proven while nothing has replaced the spec it ran on', () => {
    const { oldFilm, rate } = filmJob();
    const noTransition = [oldFilm, rate];
    expect(programStatus(rate, supersededIds(noTransition))).toBe('proven');
    expect(isSettled(rate, supersededIds(noTransition))).toBe(true);
  });

  it('a result that names no material is never touched by a changeover', () => {
    /* THE HALF OF THE RULE THAT PROTECTS THE SAFETY TESTS. Film makes no
       difference to an e-stop, so an e-stop names no spec — and a film change
       that invalidated the safety tests would be a system somebody has to
       un-tick every time, which is how systems get abandoned. */
    const { estop, items } = filmJob();
    expect(provenOnOf(estop)).toBeUndefined();
    expect(isStale(estop, supersededIds(items))).toBe(false);
    expect(isSettled(estop, supersededIds(items))).toBe(true);
  });

  it('an unrun test is not stale — it is unrun, and those are different problems', () => {
    const { items } = filmJob();
    const notRun = check({ outcome: 'notRun', provenOn: 'm-old' });
    expect(isStale(notRun, supersededIds([...items, notRun]))).toBe(false);
  });

  it('re-running it on the new spec makes it proven again, with no tidying up', () => {
    // The pointer updates as part of recording the run, which is the whole
    // reason the conditions live on the RESULT and not on the claim.
    const { rate, items } = filmJob();
    const reproved: Program = { ...rate, runs: [...(rate.runs ?? []), run(61, 'm-new')] };
    expect(programStatus(reproved, supersededIds(items))).toBe('proven');
  });

  it('judges on the best run THAT STILL COUNTS, not the biggest number', () => {
    /* 66 on the old film beats 61 on the new, and 66 is not evidence for
       anything any more. The first cut of this took the highest number, which
       meant re-proving a pack on the new film left it reading "stale" for ever
       because a withdrawn result outranked the real one. */
    const { items } = filmJob();
    const good = program({ agreedRate: 60, runs: [run(66, 'm-old'), run(61, 'm-new')] });
    expect(programStatus(good, supersededIds([...items, good]))).toBe('proven');

    // And the counting run is judged honestly: short on the new spec is SHORT,
    // not "stale" and not proven by the old number either.
    const short = program({ agreedRate: 60, runs: [run(66, 'm-old'), run(55, 'm-new')] });
    expect(programStatus(short, supersededIds([...items, short]))).toBe('below');
    expect(isStale(short, supersededIds([...items, short]))).toBe(false);
  });

  it('says what a row was got on, and says when that is no longer proof', () => {
    const { rate, items } = filmJob();
    const ms = materialsOf(items);
    expect(conditionOf(rate, ms, supersededIds(items))).toBe('on Film, 40µ — withdrawn, not proof');
    const fresh: Program = { ...rate, runs: [run(61, 'm-new')] };
    expect(conditionOf(fresh, ms, supersededIds(items))).toBe('on Film, 35µ modified');
  });
});

describe('the transition, and the price of it', () => {
  it('names both sides, counts what stops counting, and how much has landed', () => {
    const { items } = filmJob();
    const [t] = transitions(items);
    expect(t.from?.spec).toBe('40µ');
    expect(t.to.spec).toBe('35µ modified');
    expect(t.landed).toBeCloseTo(0.25, 10);
    expect(t.invalidated.map(i => i.title)).toEqual(['400g']);
  });

  it('is not a transition at all when nothing is being replaced', () => {
    const plain = [material({ title: 'Outer cases', need: 500, have: 500 })];
    expect(transitions(plain)).toEqual([]);
  });

  it('survives the old row having been deleted, rather than throwing', () => {
    // Somebody will delete the old film line. The results got on it are still
    // stale, and the screen still has to render.
    const { newFilm, rate } = filmJob();
    const [t] = transitions([newFilm, rate]);
    expect(t.from).toBeUndefined();
    expect(t.to.spec).toBe('35µ modified');
  });

  it('puts the re-proving into the sentence, ahead of being short of rate', () => {
    /* A result somebody still believes is more urgent than one they know is
       short, because nobody is arguing about the short one. */
    const { items } = filmJob();
    const said = standing(items).sentence;
    expect(said).toBe('1 proof got on a withdrawn spec is in the way. 2 of 4 done.');
    expect(standing(items).stale).toBe(1);
  });

  it('counts a stale program separately from proven, below, untested and missing', () => {
    const { items } = filmJob();
    expect(standing(items).counts.programs).toEqual({ total: 1, proven: 0, below: 0, untested: 0, missing: 0, stale: 1 });
  });
});

describe('the grid — every machine against every pack', () => {
  const wrapper = asset('a-wrap', 'Flow wrapper', 10);
  const weigher = asset('a-weigh', 'Checkweigher', 20);
  const p400 = pack('pk-400', '400g', 10);
  const p1kg = pack('pk-1kg', '1kg', 20);

  it('a machine that does not run a pack is not the same as a missing program', () => {
    /* The distinction the whole screen rests on. `na` implies no claim at all;
       `missing` is a program that ought to exist and does not, and only the
       second one is a hole worth shouting about. */
    const items = [program({ ...base({ assetId: 'a-wrap', packId: 'pk-400' }), kind: 'program', agreedRate: 60, written: true, runs: [run(61)] } as Program)];
    const g = grid([wrapper, weigher], [p400, p1kg], items);
    expect(g.at('a-wrap', 'pk-400').cell).toBe('proven');
    expect(g.at('a-wrap', 'pk-1kg').cell).toBe('na');
    expect(g.at('a-weigh', 'pk-400').cell).toBe('na');
    expect(g.holes).toBe(0);
  });

  it('counts a program nobody has written as a hole', () => {
    const items = [{ ...base({ assetId: 'a-wrap', packId: 'pk-1kg' }), kind: 'program', title: '1kg', agreedRate: 45, written: false } as Program];
    const g = grid([wrapper, weigher], [p400, p1kg], items);
    expect(g.at('a-wrap', 'pk-1kg').cell).toBe('missing');
    expect(CELL_WORD[g.at('a-wrap', 'pk-1kg').cell]).toBe('no program');
    expect(g.holes).toBe(1);
  });

  it('shows a cell as needing re-proving when its run was got on a withdrawn spec', () => {
    const { oldFilm, newFilm } = filmJob();
    const rate = { ...base({ assetId: 'a-wrap', packId: 'pk-400' }), kind: 'program', title: '400g', agreedRate: 60, written: true, runs: [run(66, 'm-old')] } as Program;
    const g = grid([wrapper], [p400], [oldFilm, newFilm, rate]);
    expect(g.at('a-wrap', 'pk-400').cell).toBe('stale');
  });

  it('asks for a cell that is not there and gets an answer rather than a crash', () => {
    const g = grid([wrapper], [p400], []);
    expect(g.at('nobody', 'nothing').cell).toBe('na');
  });

  it('leaves out deleted machines, packs and programs', () => {
    const g = grid(
      [wrapper, { ...weigher, deletedAt: 2 }],
      [p400, { ...p1kg, deletedAt: 2 }],
      [{ ...base({ assetId: 'a-wrap', packId: 'pk-400' }), kind: 'program', agreedRate: 1, written: false, deletedAt: 3 } as Program],
    );
    expect(g.assets.map(a => a.name)).toEqual(['Flow wrapper']);
    expect(g.packs.map(p => p.name)).toEqual(['400g']);
    expect(g.holes).toBe(0);
  });
});

describe('the small arithmetic the headings are made of', () => {
  it('counts whole weeks to a date, and says so when it has gone', () => {
    const today = new Date('2026-09-20T09:00:00Z');
    expect(weeksTo('2026-10-25', today)).toBe(5);
    expect(weeksTo('2026-09-13', today)).toBe(-1);
    expect(weeksTo(undefined, today)).toBeUndefined();
  });

  it('inserts a sort key between two rows without renumbering anything', () => {
    const rows = [{ sort: 10 }, { sort: 20 }, { sort: 30 }];
    expect(sortBetween(rows, 10)).toBe(15);
    expect(sortBetween(rows, 30)).toBe(31);
    expect(sortBetween(rows)).toBe(9);
    expect(sortBetween([])).toBe(0);
  });
});
