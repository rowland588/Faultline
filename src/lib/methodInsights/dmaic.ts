/* DMAIC'S OWN READING OF ITS PROJECT (docs/METHODS.md §17; ISO 13053-1). What only DMAIC knows: each phase ends in a review, and the
 * review has to be held, by someone, on a day, with a decision. This reads the five reviews (the same model the board and the
 * Charter paper use — project/method/shapes/dmaicModel) and says what needs a look and what to do next. Advice, never a lock:
 * the floor may start Measure while Define's review is only booked. Pure. */
import { currentGate, dayWords, gatesOf, type Gate } from '../../project/method/shapes/dmaicModel';
import type { DashAttention } from '../methodDashboard';
import type { InsightIn, MethodInsight } from '../methodInsight';

type Att = DashAttention;
/* never kind 'finding': the dashboard's sentence quotes the first finding as a tool result, and a review is not a tool */
const note = (tone: Att['tone'], text: string, kind: Att['kind'] = 'unproved'): Att => ({ kind, tone, text });

export function dmaicInsight(x: InsightIn): MethodInsight {
  const gates = gatesOf(x.answers);
  const out: Att[] = [];
  const cleared = (g: Gate) => g.review.result === 'passed' || g.review.result === 'conditions';

  gates.forEach((g, i) => {
    const r = g.review;
    if (r.result === 'held') out.push(note('r', `${g.name} was held at its review — ${r.note ? r.note : 'what it was held for is not written'}. The phases after it wait for it to pass.`));
    if (r.result === 'conditions' && !r.note) out.push(note('a', `${g.name} passed its review with conditions, but the conditions are not written — write what has to be done, and by when.`));
    if (cleared(g) && (!r.who || !r.when)) out.push(note('a', `${g.name} is marked ${r.result === 'passed' ? 'passed' : 'passed with conditions'} with no ${!r.who && !r.when ? 'name and no day' : !r.who ? 'name' : 'day'} — a review is only a record if it says who held it and when.`));
    if (!r.result && r.when && r.when < x.today) out.push(note('a', `${g.name}’s review was booked for ${dayWords(r.when)} and has no decision written yet.`, 'late'));
    const before = gates[i - 1];
    if (before && g.written > 0 && !cleared(before) && before.review.result !== 'held') out.push(note('n', `${g.name} is under way, but ${before.name} has not passed its review yet.`));
  });
  const control = gates[4];
  if (control && cleared(control) && !(x.answers.handover ?? '').trim()) out.push(note('a', 'Control has passed its review but nobody is named as the process owner it is handed to.'));

  const held = gates.find(g => g.review.result === 'held');
  const cur = currentGate(gates);
  let next: string | undefined;
  if (held) next = `Next: put right what ${held.name} was held for, then hold its review again.`;
  else if (!cur) next = 'Every phase has passed its review — view the project report and hand the process over.';
  else if (cur.state === 'Ready for review') {
    next = cur.review.when ? (cur.review.when < x.today ? `Next: ${cur.name}’s review was booked for ${dayWords(cur.review.when)} — hold it and write what it decided.` : `Next: hold ${cur.name}’s review on ${dayWords(cur.review.when)}.`)
      : `Next: ${cur.name} is fully written — book and hold its review.`;
  }
  return { attention: out, ...(next ? { next } : {}) };
}
