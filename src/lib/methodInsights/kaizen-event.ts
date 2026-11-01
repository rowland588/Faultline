/* THE KAIZEN EVENT'S OWN READING OF ITS PROJECT (docs/METHODS.md §17). What only this method knows needs a look: the 30-day check
 * that has gone by unrecorded, a check that says the gain is slipping or lost, a week that is over with no check booked or no
 * measure after, a baseline never taken, days that passed with nothing written, a standard nobody was taught, an action nobody
 * owns. Source: knowledge/methods/lean/kaizen-event.md ("an event without a baseline has nothing to compare"; "an action nobody
 * owns is the usual failure"; the 30-day check is the test of the week). All from lib/kaizenEvent — the module the board and the
 * paper read — so the dashboard, the report and the board cannot part. Pure; the words are the floor's. */
import { actionsOf, checkOf, dayWords, weekOf } from '../kaizenEvent';
import type { MethodInsightFn } from '../methodInsight';
import type { DashAttention } from '../methodDashboard';

const said = (a: Readonly<Record<string, string>>, id: string) => (a[id] ?? '').trim();
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export const kaizenInsight: MethodInsightFn = ({ answers: a, owed, today }) => {
  const att: DashAttention[] = [];
  const wk = weekOf(a, today);
  const check = checkOf(a, today);
  const acts = actionsOf(owed, today);
  let next: string | undefined;
  const nextIf = (s: string) => { if (!next) next = s; };

  /* the 30-day check — the point of the method */
  if (!check.verdict && check.date && check.tone === 'r') {
    att.push({ kind: 'finding', tone: 'r', text: `${check.says} Take the same measure again and record whether the gain is holding.` });
    nextIf('Hold the 30-day check: take the same measure again and record Holding, Slipping or Lost.');
  }
  if (check.verdict === 'Slipping') {
    att.push({ kind: 'finding', tone: 'a', text: `The 30-day check says the gain is slipping. The open actions are the first place to look (${plural(acts.open, 'action')} open${acts.late ? `, ${acts.late} late` : ''}).` });
    nextIf('The gain is slipping: go through the open actions and decide what brings it back.');
  }
  if (check.verdict === 'Lost') {
    att.push({ kind: 'finding', tone: 'r', text: 'The 30-day check says the gain is lost. Find what changed back before another event is run on this process.' });
    nextIf('The gain is lost: find what changed back, then decide whether to run the week again.');
  }
  if (check.verdict === 'Holding' && !said(a, 'holding')) {
    att.push({ kind: 'unproved', tone: 'a', text: 'The check says Holding, but the measure at 30 days is not written. Write the number that shows it.' });
  }
  if (wk.ended && !check.date && !check.verdict) {
    att.push({ kind: 'finding', tone: 'a', text: `The week is over and the 30-day check is not booked. ${check.suggested ? `Thirty days after the week is ${dayWords(check.suggested, true)}.` : ''}`.trim() });
  }

  /* the week itself */
  if (wk.ended && !said(a, 'after')) {
    att.push({ kind: 'unwritten', tone: 'a', text: 'The week is over but the measure after the changes is not written. Without it the week has no result to set against the baseline.' });
    nextIf('Write the measure after the changes — the same measure as the baseline, taken the same way.');
  }
  if (wk.ended && !check.date && !check.verdict) nextIf(check.suggested ? `Book the 30-day check for ${dayWords(check.suggested, true)}.` : 'Book the 30-day check.');
  if (wk.started && !said(a, 'baseline')) {
    att.push({ kind: 'unwritten', tone: 'a', text: 'No baseline is written. The week has nothing to be compared with — a baseline is taken before the week, not remembered.' });
    nextIf('Take the baseline: the measure as it is now, counted or timed, the way you will take it again at the end.');
  }
  if (wk.missed.length) {
    const ns = wk.missed.map(d => `Day ${d.n}`);
    att.push({ kind: 'unwritten', tone: 'a', text: `${list(ns)} of the week ${ns.length === 1 ? 'has' : 'have'} nothing written.` });
    const first = wk.missed[0];
    if (first) nextIf(`Write up Day ${first.n}${first.iso ? ` (${dayWords(first.iso, true)})` : ''}: what was seen, what was changed, the measure at the close.`);
  }
  if (wk.ended && said(a, 'written') && !said(a, 'trained')) {
    att.push({ kind: 'unwritten', tone: 'a', text: 'The new way is written, but nobody is recorded as trained in it. A standard nobody was taught is not one.' });
  }

  /* the actions carried to the check */
  if (acts.noOwner > 0) {
    att.push({ kind: 'finding', tone: 'a', text: `${plural(acts.noOwner, 'open action')} ${acts.noOwner === 1 ? 'names' : 'name'} nobody. An action nobody owns is the usual way an event's gain is lost.` });
  }

  const rank = { r: 0, a: 1, n: 2 } as const;
  att.sort((x, y) => rank[x.tone] - rank[y.tone]);
  return { ...(att.length ? { attention: att } : {}), ...(next ? { next } : {}) };
};
