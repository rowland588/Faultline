/* THE STAGE-GATE WALK'S RULES, LOCKED (docs/STAGEGATE-UX.md, "The walk").
 * The walk (scripts/acceptance/stagegate-walk.mjs) drives them on screen;
 * these hold the arithmetic under it. */
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { leftFrom, planCount, planFor, planNamed } from '../huddle';
import { everyGateOffer, bareAt, giveEveryGate } from '../giveGates';
import { getDB, listTests, putAsset, putTest } from '../../db';
import * as ids from '../ids';
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
  it('preserves custom gates, repairs partial usual lists and leaves a single untouched gate to its own button', () => {
    const inst = [test({ id: 'i1', assetId: 'w' })];
    expect(bareAt(inst, 'w', 'install')).toBe(false);
    expect(everyGateOffer(project, [project], inst, ['w']).gates.map(g => g.gate)).toEqual(['setup', 'commission', 'handover']);
    const threeDone = [test({ id: 'i1', assetId: 'w' }), test({ id: 's1', assetId: 'w', gate: 'setup' }), test({ id: 'c1', assetId: 'w', kind: 'test', title: 'Speed' })];
    expect(everyGateOffer(project, [project], threeDone, ['w']).says).toBe('Set up 4 · Hand over 5');
    expect(everyGateOffer(project, [project], threeDone.map(t => ({ ...t, title: 'Custom inspection' })), ['w'])).toEqual({ gates: [], says: '' });
  });

  it('serializes overlapping saves, heals an older partial list and leaves all previous evidence untouched', async () => {
    const p = { id: 'atomic', updatedAt: 1, installStages: ['First', 'Second'], gateStages: { setup: ['Set'], commission: ['Trial'], handover: ['Sign', 'Train'] } };
    const first = { ...assets[0], id: 'atomic-first', projectId: p.id, oem: 'Builder' };
    const second = { ...first, id: 'atomic-second' };
    const retired = { ...first, id: 'atomic-removed', deletedAt: 7 };
    const peer = { ...first, id: 'atomic-peer', projectId: 'other' };
    for (const asset of [first, second, retired, peer]) await putAsset(asset);
    const confirmed = test({ id: 'atomic-confirmed', projectId: p.id, assetId: first.id, title: ' FIRST  ', outcome: 'passed', result: 'Accepted by Pat' });
    const custom = test({ id: 'atomic-custom', projectId: p.id, assetId: first.id, gate: 'setup', title: 'Bespoke inspection' });
    await putTest(confirmed);
    await putTest(custom);
    const original = await listTests(p.id);
    const selection = [first.id, second.id, retired.id, peer.id, first.id];
    const [a, b] = await Promise.all([giveEveryGate(p, [p], selection), giveEveryGate(p, [p], selection)]);
    expect([a.length, b.length].sort((x, y) => x - y)).toEqual([0, 10]);
    const rows = await listTests(p.id);
    expect(rows).toEqual(expect.arrayContaining(original));
    expect(rows.filter(t => t.assetId === first.id && t.title === 'Second')).toHaveLength(1);
    expect(rows.filter(t => t.assetId === first.id && t.title === 'Set')).toHaveLength(0);
    expect(rows.filter(t => t.assetId === second.id)).toHaveLength(6);
    expect(rows.filter(t => t.assetId === retired.id || t.assetId === peer.id)).toHaveLength(0);
    expect(await giveEveryGate(p, [p], selection)).toEqual([]);
    expect(rows.find(t => t.title === 'Trial')).toMatchObject({ kind: 'test', outcome: 'planned', withWhom: 'Builder' });
  });

  it('rolls back earlier inserts on a mid-batch write failure and succeeds when retried', async () => {
    const p = { id: 'atomic-rollback', updatedAt: 1 };
    const asset = { ...assets[0], id: 'rollback-machine', projectId: p.id };
    await putAsset(asset);
    const collision = vi.spyOn(ids, 'uid').mockReturnValue('duplicate-rollback-id');
    try {
      await expect(giveEveryGate(p, [p], [asset.id])).rejects.toThrow();
    } finally {
      collision.mockRestore();
    }
    expect(await (await getDB()).getAllFromIndex('tests', 'by_project', p.id)).toEqual([]);
    expect(await giveEveryGate(p, [p], [asset.id])).toHaveLength(22);
  });
});

describe('a re-test\'s name', () => {
  it('is "— re-test" once, however deep the chain', () => {
    const first = nextFrom(test({ kind: 'test', title: 'Seal integrity' }), () => 'n1', 1);
    expect(first.title).toBe('Seal integrity — re-test');
    expect(nextFrom({ ...first, outcome: 'failed' } as Test, () => 'n2', 2).title).toBe('Seal integrity — re-test');
  });
});
