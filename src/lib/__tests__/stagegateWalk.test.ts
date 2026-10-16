/* THE STAGE-GATE WALK'S RULES, LOCKED (docs/STAGEGATE-UX.md, "The walk").
 * The walk (scripts/acceptance/stagegate-walk.mjs) drives them on screen;
 * these hold the arithmetic under it. */
import { describe, expect, it } from 'vitest';
import { leftFrom, planCount, planFor, planNamed } from '../huddle';
import { everyGateOffer, bareAt } from '../giveGates';
import { nextFrom, type Asset, type Test, type TestItem } from '../testing';

const DAY = '2026-10-15';
const line = (i: Partial<TestItem>): TestItem => ({ id: 'x', projectId: 'j', testId: '', kind: 'today', what: 'Do it', due: DAY, sort: 1, createdAt: 1, updatedAt: 1, ...i });
const test = (t: Partial<Test>): Test => ({ id: 't', projectId: 'j', kind: 'install', title: 'Change parts fitted', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...t });
const assets: Asset[] = [{ id: 'w', projectId: 'j', name: 'Ilapak flow wrapper', state: 'onSite', sort: 1, updatedAt: 1 }];

describe('the day\'s plan and the records it names', () => {
  const cp = test({ id: 'cp', assetId: 'w', outcome: 'passed', updatedAt: 99 });
  const pl = test({ id: 'pl', assetId: 'w', title: 'Programs loaded', outcome: 'passed', updatedAt: 50 });
  const items = [
    line({ id: 'a', testId: 'cp', what: 'Ilapak flow wrapper — Change parts fitted', sort: 1 }),
    line({ id: 'b', testId: 'pl', what: 'Load the Express programs on the wrapper', sort: 2 }),
    line({ id: 'c', what: 'Walk the guarding', sort: 3 }),
  ];
  it('a stage is named on the plan as the chip writes it', () => {
    expect(planNamed(cp, assets)).toBe('Ilapak flow wrapper — Change parts fitted');
    expect(planNamed(test({ kind: 'test', title: 'Seal integrity' }), assets)).toBe('Seal integrity');
  });
  it('a line that IS a done stage reads done; a line only ABOUT one keeps its own tick', () => {
    const p = planFor(items, DAY, { tests: [cp, pl], assets });
    expect(p.map(i => [i.id, i.doneAt != null])).toEqual([['a', true], ['b', false], ['c', false]]);
    expect(planCount(p)).toBe('1 of 3 done');
    /* without the records, as before: only its own tick */
    expect(planFor(items, DAY).every(i => i.doneAt == null)).toBe(true);
  });
  it('the stage not yet done leaves its line to do; a deleted one never counts', () => {
    expect(planFor(items, DAY, { tests: [{ ...cp, outcome: 'planned' }], assets })[0].doneAt).toBeUndefined();
    expect(planFor(items, DAY, { tests: [{ ...cp, deletedAt: 5 }], assets })[0].doneAt).toBeUndefined();
  });
  it('what the last huddle left undone does not carry over a stage done since', () => {
    const old = items.map(i => ({ ...i, due: '2026-10-14' }));
    expect(leftFrom(old, DAY, { tests: [cp, pl], assets })?.lines.map(i => i.id)).toEqual(['b', 'c']);
  });
});

describe('every gate\'s usual list, in one tap', () => {
  const project = { id: 'j', updatedAt: 1 };
  it('offers each gate a machine has none of, said as the lists', () => {
    const o = everyGateOffer(project, [project], [], ['w']);
    expect(o.gates.map(g => g.gate)).toEqual(['install', 'setup', 'commission', 'handover']);
    expect(o.says).toMatch(/^Install \d+ · Set up \d+ · Commission \d+ · Hand over \d+$/);
  });
  it('leaves out a gate the machine has started; offers nothing for one gate alone', () => {
    const inst = [test({ id: 'i1', assetId: 'w' })];
    expect(bareAt(inst, 'w', 'install')).toBe(false);
    expect(everyGateOffer(project, [project], inst, ['w']).gates.map(g => g.gate)).toEqual(['setup', 'commission', 'handover']);
    const threeDone = [test({ id: 'i1', assetId: 'w' }), test({ id: 's1', assetId: 'w', gate: 'setup' }), test({ id: 'c1', assetId: 'w', kind: 'test', title: 'Speed' })];
    expect(everyGateOffer(project, [project], threeDone, ['w'])).toEqual({ gates: [], says: '' });
  });
});

describe('a re-test\'s name', () => {
  it('is "— re-test" once, however deep the chain', () => {
    const first = nextFrom(test({ kind: 'test', title: 'Seal integrity' }), () => 'n1', 1);
    expect(first.title).toBe('Seal integrity — re-test');
    expect(nextFrom({ ...first, outcome: 'failed' } as Test, () => 'n2', 2).title).toBe('Seal integrity — re-test');
  });
});
