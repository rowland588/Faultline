/* THE IMPROVEMENT KATA'S OWN READING OF ITS PROJECT (docs/METHODS.md §17; Rother, Toyota Kata and the Practice Guide). What only the
 * kata knows needs a look: the routine has stopped (no step for three days), a step taken with no result written, a result with no
 * prediction written first, a step that missed what was expected and no lesson written, a target condition past its day or with no
 * day, experiments with no one obstacle named. And a smarter "next": go and see the open step, else write the next experiment
 * from what was learned. Read from lib/kataBoard — the same module as the board and the paper. Pure; no AI; a missing answer is
 * named, never invented. */
import type { InsightIn, MethodInsight } from '../methodInsight';
import { daysBetween, dateIn, dayWords, matchOf, pulse, rowsOf, touched, done } from '../kataBoard';
import type { DashAttention } from '../methodDashboard';
import { niceDay } from '../weeks';

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
const short = (s: string, n = 80) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export function kataInsight(x: InsightIn): MethodInsight {
  const a = x.answers;
  const w = (k: string) => (a[k] ?? '').trim();
  const rows = rowsOf(a).filter(touched);
  const attention: DashAttention[] = [];
  const add = (tone: DashAttention['tone'], text: string) => attention.push({ kind: 'finding', tone, text });
  const p = pulse(a, x.today);

  /* the routine */
  if (rows.length && p.sinceDays !== undefined && p.sinceDays >= 3) {
    add(p.sinceDays >= 7 ? 'r' : 'a', `No experiment step for ${days(p.sinceDays)} (the last was ${niceDay(rows.map(r => r.ran).filter(Boolean).sort().pop())}) — a storyboard with no step for three days is a routine that has stopped. Hold the five coaching questions and take the next step.`);
  } else if (rows.some(r => r.step) && !rows.some(r => r.ran)) {
    add('n', 'The experiments have no day written, so the routine’s pulse cannot be read — write the day each step was taken.');
  }

  /* each experiment */
  for (const r of rows) {
    const age = daysBetween(r.ran, x.today);
    if (r.step && !r.result && age !== undefined && age >= 1) add('a', `Experiment ${r.n} was taken ${age === 1 ? 'yesterday' : `${days(age)} ago`} and has no result written — go and see, and write what happened.`);
    if (done(r) && !r.prediction) add('a', `Experiment ${r.n} has a result but no prediction written first — a prediction written after the step teaches nothing.`);
  }
  const lastClosed = [...rows].reverse().find(done);
  if (lastClosed && matchOf(lastClosed.matched) === 'no') {
    if (!lastClosed.learning) add('a', `Experiment ${lastClosed.n} missed what was expected and no lesson is written — the miss is the learning; write what it showed, and let it set the next step.`);
    else add('n', `Experiment ${lastClosed.n} missed what was expected. Learned: ${short(lastClosed.learning)} The next step starts from there.`);
  }
  const seeBy = dateIn(w('see_by'));
  if (seeBy && seeBy < x.today && rows.some(r => r.step && !r.result)) add('a', `The day to go and see (${niceDay(seeBy)}) has passed and the open step has no result.`);

  /* the target condition and the obstacle */
  const by = w('target_by');
  const left = daysBetween(x.today, by);
  if (w('target') && !by) add('n', 'The target condition has no day — the experiments need a date to aim at, two to four weeks away.');
  if (left !== undefined && left < 0) add('a', `The target condition’s day (${dayWords(by)}) passed ${days(-left)} ago — is it reached? If so, make it the standard and set the next target condition; if not, write what stood in the way.`);
  if (rows.some(r => r.step) && !w('target')) add('a', 'Experiments are being run but no target condition is written — a step needs a state to aim at.');
  if (rows.some(r => r.step) && w('target') && !w('obstacle_now')) add('a', 'Experiments are being run but no one obstacle is named as the one being addressed — each step goes at one obstacle.');

  /* what to do next — only once the direction is written; before that the default (the first empty question) is right */
  let next: string | undefined;
  if (w('challenge') && (w('measure') || w('current')) && w('target')) {
    const open = rows.find(r => r.step && !r.result);
    const closed = rows.filter(done).length;
    const stopped = p.stopped && p.sinceDays !== undefined ? `No step for ${days(p.sinceDays)} — hold the five questions today. ` : '';
    if (open) next = `${stopped}Go and see experiment ${open.n}, then write what happened and what was learned.`;
    else if (lastClosed && matchOf(lastClosed.matched) === 'no') next = `${stopped}Experiment ${lastClosed.n} missed what was expected — write the next step from that lesson${w('obstacle_now') ? `, at “${short(w('obstacle_now'), 50)}”` : ''}, and what you expect from it.`;
    else if (w('obstacle_now')) next = `${stopped}Write ${closed ? `experiment ${closed + 1}` : 'the first experiment'}: one small step at “${short(w('obstacle_now'), 50)}” and what you expect from it, before you take it.`;
    else next = `${stopped}Name the one obstacle you will address now, then write the first small step at it.`;
  }
  return { ...(attention.length ? { attention } : {}), ...(next ? { next } : {}) };
}
