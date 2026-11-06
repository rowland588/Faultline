/* THE FOUR QUESTIONS ON THE FACTORY (docs/LOOK.md §1 — Rowland, 6 November: "understand what's going wrong,
 * what needs doing, who's responsible and whether the improvement has actually worked").
 *
 * Pure: the records in, four answers out — each a card's figure and its change, and the rows its panel lists.
 * Nothing is worked out twice: a problem's cost is lib/problemCost's (the register's own), an action is
 * lib/projectActions' (Actions' own rows, so the Factory owes what Actions owes — docs/STEADY.md S1), a fix proved
 * is tools/yokoten's (a countermeasure done with a before → after that moved the right way). A missing figure is
 * said in words, never invented. */
import { fmtGBP } from './cost';
import type { ProblemCost } from './problemCost';
import type { ProjectAction } from './projectActions';
import { byPerson } from './projectActions';
import type { ProvedFix } from '../tools/yokoten/yokoten';
import { addDays } from './weeks';

export type Tone = 'r' | 'a' | 'g' | 'n';

/** An open problem on a live line, priced where its line can price it. */
export interface WrongRow { id: string; what: string; line: string; priority: 'critical' | 'high' | 'low'; late: boolean; owner?: string; cost?: ProblemCost;
  /** £ a day where the line prices it — the labour, the contribution and the materials, each its own part, summed only for the order. */
  pounds?: number }

export interface Wrong { open: number; critical: number; late: number; priced: number; costDay?: number; top: WrongRow[] }
export interface Doing { open: number; late: number; week: number; nobody: number; top: ProjectAction[] }
export interface Person { name: string; open: number; late: number }
export interface Who { people: Person[]; nobody: number; mostLate?: Person }
export interface Worked { proved: ProvedFix[] }

export interface Question { key: 'wrong' | 'doing' | 'who' | 'worked'; label: string; value: string; of: string; change: string; tone: Tone; to: string }
export interface FourQuestions { wrong: Wrong; doing: Doing; who: Who; worked: Worked; cards: Question[]; sentence: string }

const poundsOf = (c: ProblemCost | undefined): number | undefined => {
  if (!c) return undefined;
  const parts = [c.labour, c.contribution, c.materials].filter((v): v is number => v != null && v > 0);
  return parts.length ? parts.reduce((a, b) => a + b, 0) : undefined;
};
const RANK = { critical: 0, high: 1, low: 2 } as const;
const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** The problems, worst first: by what they cost where priced, then critical, late, the rest. */
export function wrongOf(rows: readonly Omit<WrongRow, 'pounds'>[], top = 5): Wrong {
  const priced = rows.map(r => ({ ...r, ...(poundsOf(r.cost) != null ? { pounds: poundsOf(r.cost) } : {}) }));
  const sorted = [...priced].sort((a, b) => (b.pounds ?? -1) - (a.pounds ?? -1) || RANK[a.priority] - RANK[b.priority] || Number(b.late) - Number(a.late));
  const withMoney = priced.filter(r => r.pounds != null);
  return {
    open: rows.length, critical: rows.filter(r => r.priority === 'critical').length, late: rows.filter(r => r.late).length,
    priced: withMoney.length, ...(withMoney.length ? { costDay: withMoney.reduce((s, r) => s + (r.pounds ?? 0), 0) } : {}), top: sorted.slice(0, top),
  };
}

/** The actions, late first, then this week, then the rest — the same rows Actions lists. */
export function doingOf(rows: readonly ProjectAction[], today: string, top = 5): Doing {
  const week = addDays(today, 7);
  const rank = (a: ProjectAction) => (a.late ? 0 : a.due && a.due <= week ? 1 : a.due ? 2 : 3);
  const sorted = [...rows].sort((a, b) => rank(a) - rank(b) || (a.due ?? '9').localeCompare(b.due ?? '9'));
  return { open: rows.length, late: rows.filter(a => a.late).length, week: rows.filter(a => !a.late && !!a.due && a.due <= week).length, nobody: rows.filter(a => !a.who).length, top: sorted.slice(0, top) };
}

/** Who owes what — the people with the most late first, then the most open; nobody-yet counted apart. */
export function whoOf(rows: readonly ProjectAction[]): Who {
  const groups = byPerson(rows).filter(g => g.key);
  const people = groups.map(g => ({ name: g.label, open: g.rows.length, late: g.late })).sort((a, b) => b.late - a.late || b.open - a.open);
  const mostLate = people.find(p => p.late > 0);
  return { people, nobody: rows.filter(a => !a.who).length, ...(mostLate ? { mostLate } : {}) };
}

export function fourQuestions(o: { wrong: readonly Omit<WrongRow, 'pounds'>[]; actions: readonly ProjectAction[]; proved: readonly ProvedFix[]; lines: number; today: string }): FourQuestions {
  const wrong = wrongOf(o.wrong), doing = doingOf(o.actions, o.today), who = whoOf(o.actions), worked = { proved: [...o.proved] };
  const cards: Question[] = [
    { key: 'wrong', label: 'What’s going wrong', value: String(wrong.open), of: `${wrong.open === 1 ? 'problem' : 'problems'} open`,
      change: wrong.costDay != null ? `${fmtGBP(wrong.costDay)} a day${wrong.priced < wrong.open ? ` · ${wrong.open - wrong.priced} not priced` : ''}` : wrong.critical ? `${wrong.critical} critical` : wrong.open ? 'none priced yet' : 'nothing open',
      tone: wrong.critical || wrong.late ? 'r' : wrong.open ? 'a' : 'g', to: '/snags' },
    { key: 'doing', label: 'What needs doing', value: String(doing.open), of: `${doing.open === 1 ? 'action' : 'actions'} open`,
      change: doing.late ? `${doing.late} late` : doing.week ? `${doing.week} due this week` : doing.open ? 'nothing late' : 'nothing owed',
      tone: doing.late ? 'r' : doing.week ? 'a' : doing.open ? 'n' : 'g', to: '/actions' },
    { key: 'who', label: 'Who’s responsible', value: String(who.people.length), of: who.people.length === 1 ? 'person with actions' : 'people with actions',
      change: who.mostLate ? `${who.mostLate.name} has ${n(who.mostLate.late, 'late', 'late')}` : who.nobody ? `${who.nobody} with nobody yet` : who.people.length ? 'every one has a name' : 'nobody owes anything',
      tone: who.mostLate ? 'r' : who.nobody ? 'a' : 'n', to: '/actions' },
    { key: 'worked', label: 'Did it work', value: String(worked.proved.length), of: `${worked.proved.length === 1 ? 'fix' : 'fixes'} proved`,
      change: worked.proved.length ? 'before → after moved the right way' : 'no fix proved yet', tone: worked.proved.length ? 'g' : 'n', to: '#worked' },
  ];
  return { wrong, doing, who, worked, cards, sentence: sentenceOf(o.lines, wrong, doing, who, worked) };
}

/** The hero's one line — the four questions in a sentence. */
export function sentenceOf(lines: number, w: Wrong, d: Doing, who: Who, k: Worked): string {
  const head = lines ? `${n(lines, 'line')} running.` : 'No lines yet.';
  const wrong = w.open ? `${n(w.open, 'problem')} open${w.costDay != null ? `, costing ${fmtGBP(w.costDay)} a day` : w.critical ? `, ${w.critical} critical` : ''}` : 'nothing going wrong on the register';
  const doing = d.late ? `${n(d.late, 'action')} late${who.mostLate ? ` — ${who.mostLate.name} has ${who.mostLate.late}` : ''}` : d.open ? `${n(d.open, 'action')} open, none late` : 'nothing owed';
  const worked = k.proved.length ? `${n(k.proved.length, 'fix', 'fixes')} ${k.proved.length === 1 ? 'has' : 'have'} held` : 'no fix proved yet';
  return `${head} ${cap(wrong)}; ${doing}; ${worked}.`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function greeting(hour: number): string {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
