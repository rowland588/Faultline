/* THE 8D'S OWN READING OF ITS PROJECT (docs/METHODS.md §17). What only an 8D knows needs a look: a corrective action past its day, an
 * action with no one or no day, containment never written while the cause is, a cause with no escape point, a cause that stops at
 * "operator error", a fix that is only retraining, actions all done but never proved on the number. Pure; reads the answers through
 * lib/eightD (the same module the board and the paper read) and says each thing once, worst first. */
import { actionRows, actionState, dayOf, isOnlyRetraining, isStoppingPlace, type Ans } from '../eightD';
import type { MethodInsightFn } from '../methodInsight';
import type { DashAttention } from '../methodDashboard';
import { niceDay } from '../weeks';

const has = (a: Ans, id: string) => (a[id] ?? '').trim() !== '';
const short = (s: string) => (s.length > 60 ? `${s.slice(0, 57).trim()}…` : s);

export const eightDInsight: MethodInsightFn = ({ answers: a, today }) => {
  const attention: DashAttention[] = [];
  const rows = actionRows(a);
  const late = rows.filter(r => actionState(r, today) === 'late');
  let next: string | undefined;
  for (const r of late) {
    const d = dayOf(r.due, today);
    attention.push({ kind: 'late', tone: 'r', text: `Corrective action ${r.n} (${short(r.what)}) was due ${niceDay(d)} and is not done${r.who ? ` — ${r.who} has it` : ' — and nobody is named'}.` });
  }
  if (late[0]) next = `Chase corrective action ${late[0].n}: ${short(late[0].what)}${late[0].who ? ` (${late[0].who})` : ''}.`;
  const open = rows.filter(r => !r.done);
  const unowned = open.filter(r => !r.who || !r.due);
  if (unowned.length) attention.push({ kind: 'unwritten', tone: 'a', text: `${unowned.length} corrective action${unowned.length === 1 ? ' has' : 's have'} no ${unowned.some(r => !r.who) && unowned.some(r => !r.due) ? 'owner or day' : unowned.some(r => !r.who) ? 'owner' : 'day'} yet — an action nobody owns by a day does not get done.` });
  if (has(a, 'why') && !has(a, 'contain') && !has(a, 'worked')) attention.push({ kind: 'unwritten', tone: 'a', text: 'A cause is written but D3 containment is not — say how the customer is protected while the fix is made.' });
  else if (has(a, 'contain') && !has(a, 'worked')) attention.push({ kind: 'unwritten', tone: 'a', text: 'Containment is written but not checked — say how you know nothing more is reaching the customer.' });
  if (has(a, 'why') && !has(a, 'escape')) { attention.push({ kind: 'unwritten', tone: 'a', text: 'The cause is written but not the escape point — which check should have caught it, and why did it not?' }); next ??= 'Write D4’s escape point: the check that should have found it.'; }
  if (isStoppingPlace(a.why ?? '')) attention.push({ kind: 'finding', tone: 'a', text: 'The cause stops at a person (“operator error”). That is a stopping place, not a root cause — ask what let it happen.' });
  if (rows.length && rows.every(r => isOnlyRetraining(r.what)) || (!rows.length && isOnlyRetraining(a.action ?? '') && has(a, 'action'))) attention.push({ kind: 'finding', tone: 'a', text: 'The only corrective action is retraining or a reminder. A customer will send that back — change the system so the fault cannot happen.' });
  if (rows.length && open.length === 0 && !has(a, 'validated')) { attention.push({ kind: 'unproved', tone: 'a', text: 'Every corrective action is done but “Validated on the number” is empty — prove it on the same number the complaint was about.' }); next ??= 'Write “Validated on the number”: the measure after the action.'; }
  if (has(a, 'action') && !rows.length) attention.push({ kind: 'unwritten', tone: 'n', text: 'The permanent action is described but not listed as actions with an owner and a day on the 8D form.' });
  return { attention, ...(next ? { next } : {}) };
};
