/* THE 8D'S SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17). Read from lib/eightD — the module the board and the 8D paper read —
 * so the three cannot part: the nine disciplines and where each stands, the is / is-not, containment and cause, and the corrective
 * actions with who, by when and whether each is done or late. What needs attention comes from the 8D's insight
 * (lib/methodInsights/eight-d), once, in the report's attention section; nothing is said twice here. Pure. */
import { DISCIPLINES, actionRows, actionState, allStates, closingLine, dayOf, isNotPairs, type Ans } from '../../../lib/eightD';
import type { MethodReportFn, ReportItem, ReportSection } from '../../../lib/methodReportModel';
import { niceDay } from '../../../lib/weeks';

const NOT_YET = 'Not written yet.';
const say = (a: Ans, id: string) => (a[id] ?? '').trim() || NOT_YET;

export const eightDReport: MethodReportFn = ({ answers: a, today }) => {
  const st = allStates(a);
  const sections: ReportSection[] = [];

  /* the nine disciplines, each with where it stands */
  sections.push({
    id: 'disciplines', title: 'The eight disciplines', lead: closingLine(a),
    items: [{
      kind: 'table', head: ['Discipline', 'Question it answers', 'Where it stands'], shares: [0.3, 0.45, 0.25],
      rows: DISCIPLINES.map((d, i) => [`${d.key} ${d.name}`, d.asks, st[i].says]),
      tones: st.map(s => (s.word === 'Under way' ? 'w' : undefined)),
    }],
  });

  /* is / is not — the differences are where the cause hides */
  const pairs = isNotPairs(a);
  const anyPair = pairs.some(p => p.is || p.isnot);
  const isItems: ReportItem[] = anyPair
    ? [{ kind: 'table', head: ['', 'It is', 'It is not'], shares: [0.16, 0.42, 0.42], rows: pairs.map(p => [p.q, p.is || NOT_YET, p.isnot || NOT_YET]) }]
    : [{ kind: 'qa', title: 'D2 in two sentences', rows: [{ q: 'What it is', a: say(a, 'is'), written: !!(a.is ?? '').trim() }, { q: 'What it is not', a: say(a, 'isnot'), written: !!(a.isnot ?? '').trim() }] }];
  const half = pairs.filter(p => !!p.is !== !!p.isnot).length;
  sections.push({
    id: 'isnot', title: 'What it is and what it is not',
    lead: anyPair ? 'The differences between the two columns are where the cause hides.' : 'The four pairs (what, where, when, how much) are not filled in — D2 stands on its two sentences.',
    items: [...isItems, ...(half ? [{ kind: 'paragraph', text: `${half} of the 4 pairs have only one side written — write what it is not as well; that is what narrows the cause.`, tone: 'a' } as ReportItem] : [])],
  });

  /* containment, cause, escape point */
  sections.push({
    id: 'cause', title: 'Containment and cause', lead: 'Is the customer protected, why did it happen, and why was it not caught?',
    items: [{ kind: 'facts', rows: [
      ['D3 Containment', say(a, 'contain')], ['Checked that it works', say(a, 'worked')],
      ['D4 Why it happened', say(a, 'why')], ['Why it was not caught', say(a, 'escape')], ['How the cause was proved', say(a, 'verified')],
    ] }],
  });

  /* corrective actions: who, by when, and where each stands */
  const rows = actionRows(a);
  const state = rows.map(r => actionState(r, today));
  const done = state.filter(s => s === 'done').length, late = state.filter(s => s === 'late').length;
  sections.push({
    id: 'actions', title: 'Corrective actions',
    lead: rows.length ? `${rows.length} listed: ${done} done, ${rows.length - done} open${late ? `, ${late} late` : ''}.` : 'No corrective action is listed yet.',
    items: [
      { kind: 'paragraph', text: `The action chosen, and why: ${say(a, 'action')}` },
      ...(rows.length ? [{
        kind: 'table', head: ['#', 'Action', 'Who', 'By when', 'State'], shares: [0.06, 0.44, 0.17, 0.17, 0.16],
        rows: rows.map((r, i) => { const d = dayOf(r.due, today); return [String(r.n), r.what, r.who || 'Nobody yet', r.due ? (d ? niceDay(d) : r.due) : 'No day', state[i] === 'done' ? 'Done' : state[i] === 'late' ? 'Late' : 'Open']; }),
        tones: state.map(s => (s === 'late' ? 'r' : undefined)),
      } as ReportItem] : []),
      { kind: 'facts', rows: [['D6 Validated on the number', say(a, 'validated')], ['D7 What changed in the system', say(a, 'system')]] },
    ],
  });
  return sections;
};
