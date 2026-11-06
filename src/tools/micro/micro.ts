/* MICRO-MOVEMENTS — Gilbreth's therbligs and the two-handed chart (FC-233; knowledge/specs/FC-233-micro-movements.md;
 * knowledge/methods/ie/micro-motion.md).
 *
 * One person's (or one truck's) cycle as the motions it is made of, in order, each named by a therblig, each with its seconds ONLY IF TIMED OR SAID. The classes are Gilbreth's
 * seventeen folded to fourteen (reach = transport empty, move = transport loaded, release = release load, position takes pre-position, use takes assemble and disassemble);
 * the four GROUPS are Faultline's own choice and are said as such: working motion · checking · motion to question · allowed. A MOMENT is one element or two marked together
 * (one on each hand): its seconds are the longer of the two; the cycle is the sum of its moments. No predetermined-time table is here and no time is ever supplied: an
 * element with no seconds is counted, named and left out. Pure: the page, the paper, the tests and the acceptance script read these figures. */

export type Therblig = 'reach' | 'grasp' | 'move' | 'position' | 'release' | 'use' | 'inspect' | 'search' | 'select' | 'plan' | 'hold' | 'delayAvoidable' | 'delayUnavoidable' | 'rest';
export type Group = 'working' | 'check' | 'question' | 'allowed';
export type Hand = 'left' | 'right' | 'both' | 'whole';

/** Gilbreth's classes as the floor says them, with the code the texts give each (Barnes 1980; Niebel & Freivalds 2014) and the group Faultline puts it in. */
export const THERBLIGS: readonly Therblig[] = ['reach', 'grasp', 'move', 'position', 'release', 'use', 'inspect', 'search', 'select', 'plan', 'hold', 'delayAvoidable', 'delayUnavoidable', 'rest'];
export const THERBLIG_WORD: Record<Therblig, { name: string; code: string; means: string; group: Group }> = {
  reach: { name: 'Reach', code: 'TE', means: 'the hand (or the truck) goes empty to where the work is — transport empty', group: 'working' },
  grasp: { name: 'Grasp', code: 'G', means: 'takes hold of the thing — the hand closes on it, the forks go in and lift', group: 'working' },
  move: { name: 'Move', code: 'TL', means: 'carries the thing loaded from one place to another — transport loaded', group: 'working' },
  position: { name: 'Position', code: 'P', means: 'turns, lines up or fits the thing to where it goes (pre-position included)', group: 'working' },
  release: { name: 'Release', code: 'RL', means: 'lets go of the thing — release load', group: 'working' },
  use: { name: 'Use', code: 'U', means: 'the hand or tool does the work on the thing — assemble and disassemble included', group: 'working' },
  inspect: { name: 'Inspect', code: 'I', means: 'looks at, reads or checks the thing against a standard', group: 'check' },
  search: { name: 'Search', code: 'SH', means: 'looks or feels for something whose place is not fixed', group: 'question' },
  select: { name: 'Select', code: 'ST', means: 'chooses one thing from several', group: 'question' },
  plan: { name: 'Plan', code: 'Pn', means: 'stops to decide what to do next', group: 'question' },
  hold: { name: 'Hold', code: 'H', means: 'keeps hold of the thing while nothing is done to it — a hand used as a clamp', group: 'question' },
  delayAvoidable: { name: 'Avoidable delay', code: 'AD', means: 'waiting that the person or the method could have avoided', group: 'question' },
  delayUnavoidable: { name: 'Unavoidable delay', code: 'UD', means: 'waiting beyond the person’s control — a door, a machine cycle', group: 'allowed' },
  rest: { name: 'Rest', code: 'R', means: 'rest to overcome fatigue', group: 'allowed' },
};
export const GROUP_WORD: Record<Group, { name: string; means: string }> = {
  working: { name: 'working motion', means: 'reach, grasp, move, position, release, use — the motions that bring the work about' },
  check: { name: 'checking', means: 'inspect — counted apart: neither working motion nor motion to question' },
  question: { name: 'motion to question', means: 'search, select, plan, hold, avoidable delay — a better layout, fixture or sequence can remove them' },
  allowed: { name: 'allowed time', means: 'unavoidable delay and rest — allowed, not waste' },
};
export const HAND_WORD: Record<Hand, string> = { left: 'Left hand', right: 'Right hand', both: 'Both hands', whole: 'Whole body or truck' };
export const HANDS: readonly Hand[] = ['left', 'right', 'both', 'whole'];
export const ELEMENTS_MAX = 24;

export const isTherblig = (v: unknown): v is Therblig => (THERBLIGS as readonly unknown[]).includes(v);
export const isHand = (v: unknown): v is Hand => (HANDS as readonly unknown[]).includes(v);

export interface MicroElement {
  what: string;
  cls: Therblig;
  /** absent = not said */
  hand?: Hand;
  /** seconds; absent = not timed */
  sec?: number;
  /** happens at the same time as the element above, on the other hand */
  together?: boolean;
}

/** One moment of the chart: one element, or two on opposite hands. `els` are indexes into the elements. */
export interface Moment {
  els: number[];
  /** the longer of its timed elements; absent when none is timed */
  sec?: number;
  /** a moment is working if any timed element is, to question if every timed element is, else other; untimed when none is */
  kind: 'working' | 'question' | 'other' | 'untimed';
  /** one of its elements timed and another not: the seconds are a lower bound */
  partlyTimed: boolean;
}

export interface HandFigures {
  elements: number;
  /** Σ seconds of its own elements (a both-hands element counts for both) */
  sec: number;
  /** Σ seconds of its hold elements, and of those done while the other hand's element is working */
  holdSec: number;
  heldWhileOtherWorks: number;
  /** Σ seconds of timed one-element moments that belong only to the other single hand */
  nothingListed: number;
}

export interface MicroFigures {
  n: number;
  count: Record<Therblig, number>;
  /** Σ seconds of the timed elements, by class and by group (element seconds, not the cycle's) */
  secBy: Record<Therblig, number>;
  groupCount: Record<Group, number>;
  moments: Moment[];
  /** the element numbers (1-based) marked together that could not be: not one left and one right, or the one above already paired */
  pairIgnored: number[];
  untimed: number;
  noHand: number;
  /** Σ the moments' seconds; the three below add to it */
  cycle: number;
  working: number;
  question: number;
  other: number;
  workingShare?: number;
  questionShare?: number;
  otherShare?: number;
  longest?: { n: number; what: string; sec: number };
  left: HandFigures;
  right: HandFigures;
  /** any element on a left or right hand: the chart then has two hand columns */
  twoHanded: boolean;
}

const zeroBy = <K extends string>(ks: readonly K[]): Record<K, number> => Object.fromEntries(ks.map(k => [k, 0])) as Record<K, number>;
const single = (h?: Hand): h is 'left' | 'right' => h === 'left' || h === 'right';

export function momentsOf(els: readonly MicroElement[]): { moments: Moment[]; pairIgnored: number[] } {
  const moments: Moment[] = [];
  const pairIgnored: number[] = [];
  els.forEach((e, i) => {
    if (e.together) {
      const prev = moments[moments.length - 1];
      const pe = prev && prev.els.length === 1 ? els[prev.els[0]] : undefined;
      if (pe && single(e.hand) && single(pe.hand) && e.hand !== pe.hand && prev.els[0] === i - 1) { prev.els.push(i); return; }
      pairIgnored.push(i + 1);
    }
    moments.push({ els: [i], kind: 'untimed', partlyTimed: false });
  });
  for (const m of moments) {
    const timed = m.els.filter(i => els[i].sec !== undefined);
    if (timed.length) m.sec = Math.max(...timed.map(i => els[i].sec as number));
    m.partlyTimed = timed.length > 0 && timed.length < m.els.length;
    const groups = timed.map(i => THERBLIG_WORD[els[i].cls].group);
    m.kind = !groups.length ? 'untimed' : groups.includes('working') ? 'working' : groups.every(g => g === 'question') ? 'question' : 'other';
  }
  return { moments, pairIgnored };
}

export function microFigures(els: readonly MicroElement[]): MicroFigures {
  const count = zeroBy(THERBLIGS), secBy = zeroBy(THERBLIGS);
  const groupCount = zeroBy(['working', 'check', 'question', 'allowed'] as const);
  let untimed = 0, noHand = 0;
  let longest: MicroFigures['longest'];
  els.forEach((e, i) => {
    count[e.cls]++; groupCount[THERBLIG_WORD[e.cls].group]++;
    if (!e.hand) noHand++;
    if (e.sec === undefined) untimed++;
    else { secBy[e.cls] += e.sec; if (!longest || e.sec > longest.sec) longest = { n: i + 1, what: e.what, sec: e.sec }; }
  });
  const { moments, pairIgnored } = momentsOf(els);
  let working = 0, question = 0, other = 0;
  for (const m of moments) {
    if (m.sec === undefined) continue;
    if (m.kind === 'working') working += m.sec; else if (m.kind === 'question') question += m.sec; else other += m.sec;
  }
  const cycle = working + question + other;

  const hand = (side: 'left' | 'right'): HandFigures => {
    const mine = (e: MicroElement): boolean => e.hand === side || e.hand === 'both';
    const f: HandFigures = { elements: 0, sec: 0, holdSec: 0, heldWhileOtherWorks: 0, nothingListed: 0 };
    els.forEach(e => { if (mine(e)) { f.elements++; f.sec += e.sec ?? 0; if (e.cls === 'hold') f.holdSec += e.sec ?? 0; } });
    for (const m of moments) {
      if (m.els.length === 2) {
        const [a, b] = m.els.map(i => els[i]);
        const me = a.hand === side ? a : b, you = me === a ? b : a;
        if (me.cls === 'hold' && me.sec !== undefined && THERBLIG_WORD[you.cls].group === 'working' && you.sec !== undefined) f.heldWhileOtherWorks += me.sec;
      } else if (m.sec !== undefined) {
        const e = els[m.els[0]];
        if (single(e.hand) && e.hand !== side) f.nothingListed += m.sec;
      }
    }
    return f;
  };

  return {
    n: els.length, count, secBy, groupCount, moments, pairIgnored, untimed, noHand, cycle, working, question, other,
    ...(cycle > 0 ? { workingShare: working / cycle, questionShare: question / cycle, otherShare: other / cycle } : {}),
    ...(longest ? { longest } : {}),
    left: hand('left'), right: hand('right'),
    twoHanded: els.some(e => single(e.hand)),
  };
}

/** MONEY (knowledge/MONEY.md §4, FC-233 as FC-028 — labour L): the cycle's seconds given to motion to question alone, × cycles a shift, at what an hour of the person costs.
 *  A hold done while the other hand works costs no cycle time and is not here. Every input optional. */
export interface MicroMoneyIn { perShift?: number; rate?: number; shiftsWeek?: number }
export interface MicroMoney { minPerShift?: number; perShift?: number; perWeek?: number; missing: string[] }

export function microMoney(f: MicroFigures, x: MicroMoneyIn): MicroMoney {
  const out: MicroMoney = { missing: [] };
  if (x.perShift === undefined) out.missing.push('Give how many cycles a shift to say the motion to question in minutes and money a shift.');
  if (x.rate === undefined) out.missing.push('Give the line a wage (Set up the line), or type what an hour of the person costs, to say the motion to question in money.');
  if (x.shiftsWeek === undefined) out.missing.push('Give the shifts a week to say it over a week.');
  if (f.cycle <= 0) return out;
  if (x.perShift !== undefined) out.minPerShift = (f.question * x.perShift) / 60;
  if (x.perShift !== undefined && x.rate !== undefined) {
    out.perShift = (f.question * x.perShift / 3600) * x.rate;
    if (x.shiftsWeek !== undefined) out.perWeek = out.perShift * x.shiftsWeek;
  }
  return out;
}
