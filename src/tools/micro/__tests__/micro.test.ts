/* FC-233 against the independent cases M1 and M2 (scripts/knowledge/cases-kaizen.py, section M — plain Python, worked from the rules of the specification). */
import { describe, expect, it } from 'vitest';
import { THERBLIGS, THERBLIG_WORD, microFigures, microMoney, momentsOf, type Hand, type MicroElement, type Therblig } from '../micro';
import def, { inputsOfElements } from '../../calc/defs/micro-movements';
import { runCalc } from '../../calc/calc';

const el = (cls: Therblig, hand: Hand | undefined, sec?: number, together = false): MicroElement => ({ what: cls, cls, ...(hand ? { hand } : {}), ...(sec !== undefined ? { sec } : {}), ...(together ? { together } : {}) });

const M1: MicroElement[] = ([['reach', 14], ['search', 9], ['inspect', 4], ['position', 6], ['grasp', 5], ['move', 22], ['delayUnavoidable', 12], ['position', 8], ['release', 7], ['delayAvoidable', 6]] as [Therblig, number][]).map(([c, s]) => el(c, 'whole', s));
const M2: MicroElement[] = [
  el('reach', 'right', 0.8), el('reach', 'left', 0.6, true),
  el('grasp', 'right', 0.5), el('grasp', 'left', 0.5, true),
  el('move', 'right', 1.2), el('hold', 'left', 1.2, true),
  el('position', 'right', 0.7), el('hold', 'left', 0.7, true),
  el('release', 'right', 0.3), el('hold', 'left', 0.3, true),
  el('move', 'both', 1.0), el('inspect', 'right', 0.9), el('delayAvoidable', 'right', 0.8),
];

describe('M1, an FLT driver moving one box', () => {
  const f = microFigures(M1);
  it('the cycle and its three shares', () => {
    expect([f.n, f.moments.length, f.cycle, f.working, f.question, f.other]).toEqual([10, 10, 93, 62, 15, 16]);
    expect(f.workingShare).toBeCloseTo(0.666667, 5); expect(f.questionShare).toBeCloseTo(0.161290, 5); expect(f.otherShare).toBeCloseTo(0.172043, 5);
    expect(f.longest).toMatchObject({ n: 6, sec: 22 });
    expect(f.twoHanded).toBe(false);
  });
  it('money: 15 s x 40 a shift = 10 min, £2.50, £12.50 a week', () => {
    const m = microMoney(f, { perShift: 40, rate: 15, shiftsWeek: 5 });
    expect(m.minPerShift).toBeCloseTo(10, 9); expect(m.perShift).toBeCloseTo(2.5, 9); expect(m.perWeek).toBeCloseTo(12.5, 9); expect(m.missing).toEqual([]);
  });
});

describe('M2, a bench packer’s two hands', () => {
  const f = microFigures(M2);
  it('13 elements in 8 moments, a 6.2 s cycle', () => {
    expect([f.n, f.moments.length]).toEqual([13, 8]);
    expect(f.cycle).toBeCloseTo(6.2, 9);
    expect([f.working, f.question, f.other].map(x => Number(x.toFixed(6)))).toEqual([4.5, 0.8, 0.9]);
    expect(f.workingShare).toBeCloseTo(0.725806, 5); expect(f.questionShare).toBeCloseTo(0.129032, 5); expect(f.otherShare).toBeCloseTo(0.145161, 5);
    expect(f.pairIgnored).toEqual([]);
    expect(f.twoHanded).toBe(true);
  });
  it('the left hand is a clamp for 2.2 s while the right works, and has nothing listed for 1.7 s', () => {
    expect(f.left.sec).toBeCloseTo(4.3, 9); expect(f.right.sec).toBeCloseTo(6.2, 9);
    expect(f.left.holdSec).toBeCloseTo(2.2, 9); expect(f.left.heldWhileOtherWorks).toBeCloseTo(2.2, 9);
    expect(f.left.nothingListed).toBeCloseTo(1.7, 9); expect(f.right.nothingListed).toBe(0); expect(f.right.holdSec).toBe(0);
  });
  it('money: 0.8 s x 4,000 = 53.3 min, £12.80, £64.00', () => {
    const m = microMoney(f, { perShift: 4000, rate: 14.4, shiftsWeek: 5 });
    expect(m.minPerShift).toBeCloseTo(53.3333, 3); expect(m.perShift).toBeCloseTo(12.8, 9); expect(m.perWeek).toBeCloseTo(64, 9);
  });
});

describe('moments and pairs', () => {
  it('a pair is one left and one right, together, with the one above alone in its moment', () => {
    expect(momentsOf([el('reach', 'right', 1), el('reach', 'left', 2, true)]).moments.map(m => [m.els, m.sec])).toEqual([[[0, 1], 2]]);
    expect(momentsOf([el('reach', 'right', 1), el('reach', 'right', 2, true)]).pairIgnored).toEqual([2]);
    expect(momentsOf([el('reach', 'both', 1), el('reach', 'left', 2, true)]).pairIgnored).toEqual([2]);
    /* a third element cannot join a full moment */
    const three = momentsOf([el('reach', 'right', 1), el('reach', 'left', 1, true), el('grasp', 'right', 1, true)]);
    expect(three.moments.length).toBe(2); expect(three.pairIgnored).toEqual([3]);
  });
  it('a moment with one timed element takes its seconds, and says it is a lower bound', () => {
    const m = momentsOf([el('reach', 'right', 1), el('hold', 'left', undefined, true)]).moments[0];
    expect([m.sec, m.partlyTimed, m.kind]).toEqual([1, true, 'working']);
  });
  it('a moment of only motion to question is to question; a mix with checking is other', () => {
    expect(momentsOf([el('hold', 'left', 1), el('delayAvoidable', 'right', 2, true)]).moments[0].kind).toBe('question');
    expect(momentsOf([el('hold', 'left', 1), el('inspect', 'right', 2, true)]).moments[0].kind).toBe('other');
  });
});

describe('nothing is supplied', () => {
  it('untimed elements are counted, never given seconds: no cycle, no share, no money', () => {
    const f = microFigures([el('reach', 'right'), el('grasp', 'right'), el('hold', 'left')]);
    expect([f.n, f.untimed, f.cycle, f.workingShare, f.longest]).toEqual([3, 3, 0, undefined, undefined]);
    expect(microMoney(f, { perShift: 10, rate: 10, shiftsWeek: 5 })).toEqual({ missing: [] });
  });
  it('one untimed element among timed ones is left out of the cycle', () => {
    const f = microFigures([el('reach', 'whole', 2), el('grasp', 'whole'), el('move', 'whole', 3)]);
    expect([f.untimed, f.cycle, f.moments.length]).toEqual([1, 5, 3]);
  });
  it('the money names each missing input and works without them', () => {
    const f = microFigures(M1);
    expect(microMoney(f, {}).missing.length).toBe(3);
    expect(microMoney(f, { rate: 15, shiftsWeek: 5 }).missing).toEqual([expect.stringContaining('cycles a shift')]);
    expect(microMoney(f, { perShift: 40 }).minPerShift).toBeCloseTo(10, 9);
  });
});

describe('the list', () => {
  it('is fourteen classes, each with a Gilbreth code, a group and a meaning', () => {
    expect(THERBLIGS.length).toBe(14);
    expect(new Set(THERBLIGS.map(k => THERBLIG_WORD[k].code)).size).toBe(14);
    expect(THERBLIGS.filter(k => THERBLIG_WORD[k].group === 'working')).toEqual(['reach', 'grasp', 'move', 'position', 'release', 'use']);
    expect(THERBLIGS.filter(k => THERBLIG_WORD[k].group === 'question')).toEqual(['search', 'select', 'plan', 'hold', 'delayAvoidable']);
  });
});

describe('the calculator’s inputs for Line Talk', () => {
  it('inputsOfElements fills the boxes the page reads, and the page says the figures', () => {
    const inputs = inputsOfElements({ label: 'Packer 1', elements: [{ what: 'Reach', cls: 'reach', hand: 'right', sec: 1 }, { what: 'Hold', cls: 'hold', hand: 'left', sec: 1, together: true }, { what: 'Wait', cls: 'delayAvoidable', hand: 'whole' }] }, { perShift: 10 });
    expect(inputs).toMatchObject({ who: 'Packer 1', e01_cls: 'reach', e01_hand: 'right', e01_sec: 1, e02_tog: 'yes', e03_cls: 'delayAvoidable', perShift: 10 });
    expect(inputs).not.toHaveProperty('e03_sec');
    const r = runCalc(def, inputs).result!;
    expect(r.hands?.rows.length).toBe(2);
    expect(r.hands?.rows[0].cells.map(c => [c.lane, c.code])).toEqual([[1, 'TE'], [0, 'H']]);
    expect(r.tiles.find(t => t.k === 'Cycle')?.v).toBe('1 s');
  });
  it('a together mark on a whole-body element is not written', () => {
    expect(inputsOfElements({ elements: [{ what: 'a', cls: 'reach', hand: 'whole' }, { what: 'b', cls: 'move', hand: 'whole', together: true }] })).not.toHaveProperty('e02_tog');
  });
});
