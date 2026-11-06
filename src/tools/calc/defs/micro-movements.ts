/* MICRO-MOVEMENTS — FC-233 (knowledge/specs/FC-233-micro-movements.md; knowledge/methods/ie/micro-motion.md).
 *
 * One person's — or one truck's — cycle as the motions it is made of, in order: up to 24 elements, each named by Gilbreth's therblig, on a hand (left, right, both, or the whole
 * body of a truck), with its seconds ONLY IF TIMED OR SAID. Two elements on opposite hands marked together share a moment. The figures are src/tools/micro/micro: the cycle, how much
 * of it is working motion, motion to question (search, select, plan, hold, avoidable delay) and checking or allowed time, what each hand holds and has nothing listed for. The picture
 * is the two-handed chart (CalcHands). No predetermined-time table is here and no time is supplied; no AI. The money is the labour on the seconds that are only motion to question,
 * every input optional and a missing one named. Line Talk's micro-movements set fills these same boxes with `inputsOfElements`. */
import { ELEMENTS_MAX, HANDS, HAND_WORD, THERBLIGS, THERBLIG_WORD, microFigures, microMoney, type Hand, type MicroElement, type Therblig } from '../../micro/micro';
import { andList, fmt, gbp, pct, plural } from '../format';
import type { CalcDef, CalcHands, CalcMoney, CalcResult, Field, Inputs, Problem, Values } from '../types';

const nn = (i: number): string => String(i + 1).padStart(2, '0');
const id = (i: number, part: 'what' | 'cls' | 'hand' | 'sec' | 'tog'): string => `e${nn(i)}_${part}`;
const num = (v: Values, k: string): number | undefined => v[k] as number | undefined;
const text = (v: Values, k: string): string => (typeof v[k] === 'string' ? (v[k] as string).trim() : '');
const S = (x: number): string => `${fmt(x, 2)} s`;
const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const elementFields = (i: number): Field[] => {
  const n = i + 1;
  const shown = (v: Values): boolean => i === 0 || !!v[id(i - 1, 'cls')];
  const classed = (v: Values): boolean => shown(v) && !!v[id(i, 'cls')];
  return [
    { id: id(i, 'what'), label: `Element ${n} — what happens`, kind: 'text', optional: true, showIf: shown,
      ...(i === 0 ? { help: 'In the floor’s words — “Reach for the box”, “Lift”, “Wait for the door”. Blank and it is called Element 1. A cycle needs at least two elements; each appears once the one above is classed.' } : {}) },
    { id: id(i, 'cls'), label: `Element ${n} is a`, kind: 'choice', showIf: shown, ...(i > 1 ? { optional: true } : {}),
      options: THERBLIGS.map(k => ({ value: k, label: `${THERBLIG_WORD[k].name} (${THERBLIG_WORD[k].code})`, help: THERBLIG_WORD[k].means })),
      ...(i === 0 ? { help: 'Gilbreth’s therbligs: reach, grasp, move, position, release and use are working motion; search, select, plan, hold and avoidable delay are motion to question; inspect is checking; unavoidable delay and rest are allowed.' } : {}) },
    { id: id(i, 'hand'), label: `Element ${n} is done by`, kind: 'choice', optional: true, showIf: classed,
      options: HANDS.map(h => ({ value: h, label: HAND_WORD[h] })),
      ...(i === 0 ? { help: 'The left hand, the right, both, or the whole body — a truck driver’s cycle is the whole body. Left blank it is not said: counted, in neither hand.' } : {}) },
    { id: id(i, 'sec'), label: `Element ${n} takes`, unit: 'seconds', kind: 'number', min: 0, optional: true, showIf: classed,
      ...(i === 0 ? { help: 'Timed with the stopwatch or from the video study, or said by the person. Left blank the element is counted but not timed — and said. Faultline never supplies a time.' } : {}) },
    { id: id(i, 'tog'), label: `Element ${n} happens`, kind: 'choice', optional: true, compact: true,
      showIf: v => i > 0 && classed(v) && (v[id(i, 'hand')] === 'left' || v[id(i, 'hand')] === 'right'),
      options: [{ value: 'yes', label: 'At the same time as the one above (the other hand)' }, { value: 'no', label: 'After the one above' }],
      ...(i === 1 ? { help: 'Two elements on opposite hands that go on together share one row of the chart; the row lasts as long as the longer of them.' } : {}) },
  ];
};

/** The elements the boxes describe, in order — every slot with a class. */
function elementsOf(v: Values): MicroElement[] {
  const out: MicroElement[] = [];
  for (let i = 0; i < ELEMENTS_MAX; i++) {
    const cls = v[id(i, 'cls')];
    if (typeof cls !== 'string' || !(THERBLIGS as readonly string[]).includes(cls)) continue;
    const hand = v[id(i, 'hand')];
    const sec = num(v, id(i, 'sec'));
    out.push({
      what: text(v, id(i, 'what')) || `Element ${i + 1}`, cls: cls as Therblig,
      ...(typeof hand === 'string' && (HANDS as readonly string[]).includes(hand) ? { hand: hand as Hand } : {}),
      ...(sec !== undefined ? { sec } : {}),
      ...(v[id(i, 'tog')] === 'yes' ? { together: true } : {}),
    });
  }
  return out;
}

/** The elements as the boxes hold them — how a Line Talk micro-movements set fills this calculator (tools/talk, FC-202 toolsets, T4). */
export interface ElementIn { what: string; cls: Therblig; hand?: Hand; sec?: number; together?: boolean }
export function inputsOfElements(x: { label?: string; elements: readonly ElementIn[] }, more: Inputs = {}): Inputs {
  const out: Inputs = {};
  if (x.label?.trim()) out.who = x.label.trim();
  x.elements.slice(0, ELEMENTS_MAX).forEach((e, i) => {
    if (e.what.trim()) out[id(i, 'what')] = e.what.trim();
    out[id(i, 'cls')] = e.cls;
    if (e.hand) out[id(i, 'hand')] = e.hand;
    if (e.sec !== undefined) out[id(i, 'sec')] = e.sec;
    if (e.together && (e.hand === 'left' || e.hand === 'right')) out[id(i, 'tog')] = 'yes';
  });
  return { ...out, ...more };
}

/* the knowledge record's cases (scripts/knowledge/cases-kaizen.py M): the seconds are typed for the case — a worked illustration, never a norm */
const FLT: ElementIn[] = ([
  ['Drive empty to the pallet', 'reach', 14], ['Search for the right pallet', 'search', 9], ['Check the label', 'inspect', 4], ['Line up the forks', 'position', 6], ['Lift the box', 'grasp', 5],
  ['Drive to the chiller', 'move', 22], ['Wait for the door', 'delayUnavoidable', 12], ['Line up at the rack', 'position', 8], ['Set down and back out', 'release', 7], ['Wait for the scanner', 'delayAvoidable', 6],
] as [string, Therblig, number][]).map(([what, cls, sec]) => ({ what, cls, hand: 'whole' as Hand, sec }));
const PACKER: ElementIn[] = ([
  ['Reach for the pouch', 'reach', 'right', 0.8, false], ['Reach for the tray', 'reach', 'left', 0.6, true],
  ['Grasp the pouch', 'grasp', 'right', 0.5, false], ['Grasp the tray', 'grasp', 'left', 0.5, true],
  ['Move the pouch to the tray', 'move', 'right', 1.2, false], ['Hold the tray', 'hold', 'left', 1.2, true],
  ['Position the pouch', 'position', 'right', 0.7, false], ['Hold the tray', 'hold', 'left', 0.7, true],
  ['Release the pouch', 'release', 'right', 0.3, false], ['Hold the tray', 'hold', 'left', 0.3, true],
  ['Slide the tray to the belt', 'move', 'both', 1.0, false],
  ['Check the count', 'inspect', 'right', 0.9, false],
  ['Wait for the next tray', 'delayAvoidable', 'right', 0.8, false],
] as [string, Therblig, Hand, number, boolean][]).map(([what, cls, hand, sec, together]) => ({ what, cls, hand, sec, ...(together ? { together } : {}) }));

const def: CalcDef = {
  key: 'micro-movements',
  fc: 'FC-233',
  title: 'Micro-movements',
  says: 'A person’s or a truck’s cycle as Gilbreth’s motions, in order — how much is working motion, how much to question, and what each hand holds',
  question: 'What is each hand (or the truck) doing, second by second — and which motions can go?',
  group: 'Flow and lead time',
  inputs: [
    { id: 'who', label: 'Whose cycle is it', kind: 'text', optional: true, help: 'A label, never a name — “Packer 1”, “Truck 3”. It heads the sentence.' },
    ...Array.from({ length: ELEMENTS_MAX }, (_, i) => elementFields(i)).flat(),
    { id: 'perShift', label: 'How many times a shift this cycle is done', unit: 'a shift', kind: 'number', min: 0.000001, optional: true, money: true,
      help: 'Boxes moved, trays packed — to say the motion to question in minutes and money a shift.' },
    { id: 'rate', label: 'What an hour of the person costs', unit: '£ an hour', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'labourRate', where: 'a wage on its set-up', words: 'the line’s wage with on-costs' }, help: 'The wage with on-costs.' },
    { id: 'shiftsWeek', label: 'Shifts a week', unit: 'shifts', kind: 'number', min: 0.000001, optional: true, money: true, help: 'To say it over a week.' },
  ],
  check(v): Problem[] {
    const els = elementsOf(v);
    const out: Problem[] = [];
    const f = microFigures(els);
    const slot = (n: number): number => {
      let k = 0;
      for (let i = 0; i < ELEMENTS_MAX; i++) if (v[id(i, 'cls')] && ++k === n) return i;
      return n - 1;
    };
    const unt: string[] = [];
    for (let i = 0; i < ELEMENTS_MAX; i++) if (v[id(i, 'cls')] && num(v, id(i, 'sec')) === undefined) unt.push(`Element ${i + 1}`);
    if (unt.length) out.push({ field: id(Number(unt[0].slice(8)) - 1, 'sec'), say: `${andList(unt.slice(0, 4))}${unt.length > 4 ? ` and ${unt.length - 4} more` : ''} ${unt.length === 1 ? 'has' : 'have'} no seconds — counted, left out of the time.` });
    if (f.pairIgnored.length) out.push({ field: id(slot(f.pairIgnored[0]), 'tog'), say: `${andList(f.pairIgnored.slice(0, 4).map(n => `Element ${slot(n) + 1}`))} ${f.pairIgnored.length === 1 ? 'is' : 'are'} marked together with the one above but ${f.pairIgnored.length === 1 ? 'is' : 'are'} not the other hand to it — taken as after the one above.` });
    if (f.noHand > 0) out.push({ field: id(0, 'hand'), say: `${plural(f.noHand, 'element')} ${f.noHand === 1 ? 'has' : 'have'} no hand said — counted, but in neither hand.` });
    if (f.moments.some(m => m.partlyTimed)) out.push({ say: 'A row with one element timed and its pair not has the timed one’s seconds — a lower bound.' });
    return out;
  },
  compute(v): CalcResult {
    const els = elementsOf(v);
    const f = microFigures(els);
    const label = text(v, 'who') || 'This cycle';
    const m = f.moments.length;
    const head = `${label}: ${plural(f.n, 'element')}${m < f.n ? ` in ${plural(m, 'moment')}` : ''}.`;
    const body = f.cycle > 0
      ? ` The cycle takes ${S(f.cycle)}: ${S(f.working)} (${pct(f.workingShare as number)}) is working motion, ${S(f.question)} (${pct(f.questionShare as number)}) is motion to question and ${S(f.other)} (${pct(f.otherShare as number)}) is checking or allowed time.${f.longest ? ` The longest is “${f.longest.what}” — ${S(f.longest.sec)}.` : ''}`
      : ' None of the elements is timed yet, so there is no cycle time or share to say.';
    const sentence = head + body;

    const more: string[] = [];
    if (f.twoHanded) {
      const handLine = (name: string, h: typeof f.left): string | undefined => {
        if (!h.elements && !h.nothingListed) return undefined;
        const parts = [
          `${S(h.sec)} in its ${plural(h.elements, 'element')}`,
          ...(h.holdSec > 0 ? [`holds for ${S(h.holdSec)}${h.heldWhileOtherWorks > 0 ? (Math.abs(h.heldWhileOtherWorks - h.holdSec) < 1e-9 ? ', all of it while the other hand works' : `, ${S(h.heldWhileOtherWorks)} of it while the other hand works`) : ''}`] : []),
          ...(h.nothingListed > 0 ? [`has nothing listed for ${S(h.nothingListed)} while the other hand works alone`] : []),
        ];
        return `${name}: ${parts.join('; ')}.`;
      };
      for (const l of [handLine('Left hand', f.left), handLine('Right hand', f.right)]) if (l) more.push(l);
      if (f.left.heldWhileOtherWorks > 0 || f.right.heldWhileOtherWorks > 0) more.push('A hand that holds while the other works is a clamp: ask whether a fixture can hold instead and free it (Barnes’s principles of motion economy).');
    }
    if (f.question > 0 || f.groupCount.question > 0) more.push('Ask of every motion to question: can it be eliminated, combined, rearranged or simplified (FC-028)? The chart is the record; the questioning is the improvement.');

    const mo = microMoney(f, { ...(num(v, 'perShift') !== undefined ? { perShift: num(v, 'perShift') as number } : {}), ...(num(v, 'rate') !== undefined ? { rate: num(v, 'rate') as number } : {}), ...(num(v, 'shiftsWeek') !== undefined ? { shiftsWeek: num(v, 'shiftsWeek') as number } : {}) });
    const figures: [string, string][] = [];
    let moneyText: string | undefined;
    if (f.cycle > 0 && mo.minPerShift !== undefined) {
      if (f.question === 0) moneyText = 'No second of the cycle is only motion to question — nothing to price.';
      else {
        moneyText = `${S(f.question)} of the cycle is only motion to question × ${fmt(num(v, 'perShift') as number, 0)} cycles a shift = ${fmt(mo.minPerShift, 1)} min a shift${mo.perShift !== undefined ? ` — ${gbp(mo.perShift)} labour at ${gbp(num(v, 'rate') as number)} an hour${mo.perWeek !== undefined ? `, ${gbp(mo.perWeek)} over ${fmt(num(v, 'shiftsWeek') as number, 0)} shifts a week` : ''}` : ''}.`;
        figures.push(['Motion to question a shift', `${fmt(mo.minPerShift, 1)} min`]);
        if (mo.perShift !== undefined) figures.push(['Labour on it a shift', gbp(mo.perShift)]);
        if (mo.perWeek !== undefined) figures.push(['Labour on it a week', gbp(mo.perWeek)]);
      }
    }
    const money: CalcMoney = { ...(moneyText ? { text: moneyText } : {}), ...(figures.length ? { figures } : {}), missing: mo.missing };

    const present = THERBLIGS.filter(k => f.count[k] > 0);
    const working = [
      ...present.map(k => ({ label: `${THERBLIG_WORD[k].name} (${THERBLIG_WORD[k].code})`, value: `${plural(f.count[k], 'element')}${f.cycle > 0 ? ` · ${S(f.secBy[k])} timed` : ''}`, note: THERBLIG_WORD[k].means })),
      { label: 'Moments', value: `${plural(f.n, 'element')} make ${plural(m, 'moment')}`, note: 'two elements marked together on opposite hands share one moment; its seconds are the longer of the two' },
      ...(f.cycle > 0 ? [
        { label: 'The cycle', value: `${f.moments.filter(x => x.sec !== undefined).map(x => fmt(x.sec as number, 2)).join(' + ')} = ${S(f.cycle)}`, note: 'the sum of the moments that have seconds' },
        { label: 'Working motion', value: `${S(f.working)} ÷ ${S(f.cycle)} = ${pct(f.workingShare as number)}`, note: 'moments with a reach, grasp, move, position, release or use in them — Faultline’s choice of group, not the customer’s value' },
        { label: 'Motion to question', value: `${S(f.question)} ÷ ${S(f.cycle)} = ${pct(f.questionShare as number)}`, note: 'moments of only search, select, plan, hold or avoidable delay' },
        { label: 'Checking or allowed', value: `${S(f.other)} ÷ ${S(f.cycle)} = ${pct(f.otherShare as number)}`, note: 'inspect, unavoidable delay, rest — and the moments that mix them' },
      ] : []),
      ...(f.twoHanded ? [
        { label: 'Left hand', value: `${S(f.left.sec)} · holds ${S(f.left.holdSec)} · nothing listed ${S(f.left.nothingListed)}`, note: 'a both-hands element counts for both hands' },
        { label: 'Right hand', value: `${S(f.right.sec)} · holds ${S(f.right.holdSec)} · nothing listed ${S(f.right.nothingListed)}` },
      ] : []),
      { label: 'The therbligs', value: 'fourteen classes from Gilbreth’s seventeen', note: 'Gilbreth & Gilbreth 1917; Barnes 1980; Niebel & Freivalds 2014 ch. 4' },
    ];

    const twoLanes = f.twoHanded;
    const laneOf = (h: Hand | undefined): number => (!twoLanes ? 0 : h === 'left' ? 0 : h === 'right' ? 1 : 2);
    const hands: CalcHands = {
      title: 'The two-handed chart',
      caption: 'Each row is one moment of the cycle, in order; two elements in one row go on at the same time, one on each hand, and the row lasts as long as the longer of them. A box with a heavy solid line is working motion, a dashed box is motion to question (search, select, plan, hold, avoidable delay), a thin box is checking or allowed time. The letters are Gilbreth’s: TE reach, G grasp, TL move, P position, RL release, U use, I inspect, SH search, ST select, Pn plan, H hold, AD avoidable delay, UD unavoidable delay, R rest.',
      lanes: twoLanes ? ['Left hand', 'Right hand', 'Both hands or whole body'] : [text(v, 'who') || 'The whole cycle'],
      head: ['Moment', 'Seconds'],
      rows: f.moments.map((mm, i) => ({
        n: i + 1, sec: mm.sec === undefined ? '—' : fmt(mm.sec, 2),
        cells: mm.els.map(k => {
          const e = els[k], g = THERBLIG_WORD[e.cls].group;
          return { lane: laneOf(e.hand), code: THERBLIG_WORD[e.cls].code, what: e.what, style: g === 'working' ? 'working' as const : g === 'question' ? 'question' as const : 'plain' as const, sec: e.sec === undefined ? '—' : `${fmt(e.sec, 2)} s` };
        }),
      })),
    };

    return {
      verdict: f.cycle > 0 ? S(f.cycle) : plural(f.n, 'element'),
      tone: 'n',
      sentence,
      more,
      tiles: [
        f.cycle > 0 ? { k: 'Cycle', v: S(f.cycle), of: plural(m, 'moment'), n: f.cycle, better: 'lower', fmt: S } : { k: 'Cycle', v: '—', of: 'time the elements' },
        f.workingShare !== undefined ? { k: 'Working motion', v: pct(f.workingShare), of: `${S(f.working)} of the cycle`, n: f.workingShare * 100, better: 'higher', fmt: x => `${fmt(x, 2)} points` } : { k: 'Working motion', v: '—', of: 'time the elements' },
        f.questionShare !== undefined ? { k: 'To question', v: pct(f.questionShare), of: `${S(f.question)} of the cycle`, n: f.questionShare * 100, better: 'lower', fmt: x => `${fmt(x, 2)} points` } : { k: 'To question', v: '—', of: 'time the elements' },
        f.longest ? { k: 'Longest element', v: S(f.longest.sec), of: cut(f.longest.what, 24), n: f.longest.sec, better: 'lower', fmt: S } : { k: 'Longest element', v: '—', of: 'time the elements' },
        { k: 'Elements', v: String(f.n), of: f.untimed ? `${f.untimed} not timed` : 'all timed', n: f.n, counted: true },
        mo.perShift !== undefined ? { k: 'Labour a shift', v: gbp(mo.perShift), of: 'on motion to question', n: mo.perShift, better: 'lower', fmt: gbp } : { k: 'Labour a shift', v: '—', of: 'give the figures in money' },
      ],
      working,
      caveats: [
        'The seconds are the ones typed — timed with a stopwatch or from the video study, or said by the person. Faultline never supplies a time and carries no predetermined-time table (MTM-1, MOST and the like are licensed); an element without seconds is counted and left out.',
        'Which therblig an element is, and which hand, is the observer’s call. The four groups are Faultline’s own choice: working motion here means the motions that bring the work about, not what the customer values (the value stream map, FC-001, judges that); a hold or a search can be a safety or quality need.',
        'Below about a second a stopwatch is unreliable: time several cycles and average them, or read the video study frame by frame. One cycle may not be typical.',
        'A hold done while the other hand works costs no cycle time, so it is counted but not priced; a faster pattern that raises force or awkward posture is not an improvement — check it with the ergonomic tools (FC-207) — and a truck’s cycle is also bounded by pedestrian safety.',
        'The money is the labour on the seconds that are only motion to question — not packs lost: at a bottleneck the packs gained are the line’s tools, not this.',
      ],
      money,
      hands,
      closing: f.cycle > 0
        ? `The cycle is ${S(f.cycle)}; ${pct(f.workingShare as number)} is working motion. Question the ${S(f.question)} of motion to question first${f.other > 0 ? `, then the ${S(f.other)} of checking and waiting` : ''}.`
        : `${plural(f.n, 'element')} named, none timed yet. Time them, then the cycle and its shares are said.`,
    };
  },
  examples: [
    {
      name: 'an FLT driver moves one box from goods-in to the chiller — 10 elements, whole body',
      source: 'knowledge/specs/FC-233-micro-movements.md §6; scripts/knowledge/cases-kaizen.py M1 (the seconds typed for the case; 40 boxes a shift, £15 an hour, 5 shifts)',
      inputs: inputsOfElements({ label: 'Truck 1', elements: FLT }, { perShift: 40, rate: 15, shiftsWeek: 5 }),
      expect: {
        verdict: '93 s', tone: 'n',
        sentence: 'Truck 1: 10 elements. The cycle takes 93 s: 62 s (66.7%) is working motion, 15 s (16.1%) is motion to question and 16 s (17.2%) is checking or allowed time. The longest is “Drive to the chiller” — 22 s.',
        tiles: { Cycle: '93 s', 'Working motion': '66.7%', 'To question': '16.1%', 'Longest element': '22 s', Elements: '10', 'Labour a shift': '£2.50' },
        money: '15 s of the cycle is only motion to question × 40 cycles a shift = 10 min a shift — £2.50 labour at £15.00 an hour, £12.50 over 5 shifts a week.',
      },
    },
    {
      name: 'a bench packer’s two hands — 13 elements in 8 moments, the left hand a clamp',
      source: 'knowledge/specs/FC-233-micro-movements.md §6; scripts/knowledge/cases-kaizen.py M2 (4,000 cycles a shift, £14.40 an hour, 5 shifts)',
      inputs: inputsOfElements({ label: 'Packer 1', elements: PACKER }, { perShift: 4000, rate: 14.4, shiftsWeek: 5 }),
      expect: {
        verdict: '6.2 s', tone: 'n',
        sentence: 'Packer 1: 13 elements in 8 moments. The cycle takes 6.2 s: 4.5 s (72.6%) is working motion, 0.8 s (12.9%) is motion to question and 0.9 s (14.5%) is checking or allowed time. The longest is “Move the pouch to the tray” — 1.2 s.',
        tiles: { Cycle: '6.2 s', 'Working motion': '72.6%', 'To question': '12.9%', 'Longest element': '1.2 s', Elements: '13', 'Labour a shift': '£12.80' },
        money: '0.8 s of the cycle is only motion to question × 4,000 cycles a shift = 53.3 min a shift — £12.80 labour at £14.40 an hour, £64.00 over 5 shifts a week.',
      },
    },
    {
      name: 'a cycle named but not timed, one pair that is not a pair',
      source: 'hand-worked: 3 elements, none timed — counted, no cycle; the third marked together but on the same hand as the one above, taken after it',
      inputs: inputsOfElements({ label: 'Packer 2', elements: [
        { what: 'Reach for the box', cls: 'reach', hand: 'right' }, { what: 'Grasp the box', cls: 'grasp', hand: 'right' }, { what: 'Hold the lid', cls: 'hold', hand: 'right', together: true },
      ] }),
      expect: {
        verdict: '3 elements', tone: 'n',
        sentence: 'Packer 2: 3 elements. None of the elements is timed yet, so there is no cycle time or share to say.',
        tiles: { Cycle: '—', 'Working motion': '—', 'To question': '—', Elements: '3' },
        warns: ['Element 1, Element 2 and Element 3 have no seconds — counted, left out of the time.', 'Element 3 is marked together with the one above but is not the other hand to it — taken as after the one above.'],
      },
    },
  ],
  refused: [
    { name: 'one element only', inputs: inputsOfElements({ elements: [{ what: 'Drive to the pallet', cls: 'reach', hand: 'whole', sec: 5 }] }), blocked: 'Choose “Element 2 is a”' },
    { name: 'a minus time', inputs: inputsOfElements({ elements: [{ what: 'Reach', cls: 'reach', hand: 'right', sec: -2 }, { what: 'Grasp', cls: 'grasp', hand: 'right', sec: 1 }] }), blocked: '“Element 1 takes” must be at least 0' },
  ],
  see: [{ key: 'process-flow', why: 'the path of the thing, step by step, when the question is the route and not the body’s motion' }],
};

export default def;
