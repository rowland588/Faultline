/* THE PARETO PICKS THE PROBLEMS (docs/SIXM.md, the working method, step 1).
 *
 * The vital few — the bars that make the first 80% of the lost time — each
 * earn their own problem, one fish each: on those, "Find the root cause" is
 * the thing to press. On the rest, the thing to press is "Just do it" — an
 * action on the board, because a small obvious loss wants doing, not a
 * fishbone. Any bar can still be opened as a problem for safety, quality or
 * the constraint, and the reason is kept on the problem (Case.source.why).
 *
 * Shared by the Pareto screen and the Pareto pane on the fishbone page
 * (ui/ParetoPane), so the two say and do the same thing: which bar gets which
 * action, the line a bar is filed on, the problem a bar already has, the
 * action a bar becomes, and the one way a bar becomes a problem. */
import type { Case } from '../types';
import type { PaceLineRow, PaceTodoRow } from '../db';
import type { ProblemView, ProblemsApi } from './problems';
import type { ParetoMove, ParetoView } from './paretoView';
import { boneOfStop } from './sixm';
import { listObservations } from '../db';
import { PARETO_WINDOW_DAYS } from './paretoFromLog';

const DAY = 86_400_000;

/** What a bar offers first. `root`: it is in the vital few — find its root
 *  cause. `just`: outside them — just do it, with the root cause offered
 *  quietly behind a reason. null: nothing to start (a bar that has gone). */
export type BarPick = 'root' | 'just' | null;

export function pickOf(m: Pick<ParetoMove, 'vital' | 'verdict' | 'mins'>): BarPick {
  if (m.verdict === 'gone' || !(m.mins > 0)) return null;
  return m.vital ? 'root' : 'just';
}

/** The reasons a bar outside the vital few still earns a root cause — the
 *  quick choices; anything else is typed. Kept, in these words, as
 *  Case.source.why. */
export const WHY_CHOICES = ['Safety', 'Quality / food safety', 'It is the constraint'] as const;

/** The question the quiet "Find the root cause" asks first. */
export const WHY_QUESTION = 'Why does this one earn a root cause?';

/** The finding in one line, in parts so the numbers can be set in bold:
 *  "2 of 3 categories carry 95% of the lost time — each gets its own problem".
 *  The tail is only said on a 6M job, where it is true. */
export function vitalWords(view: Pick<ParetoView, 'rows' | 'vitalCount' | 'vitalShare'>, sixM: boolean): {
  count: string; of: string; share: string; tail: string;
} {
  const total = view.rows.filter(r => r.verdict !== 'gone').length;
  const one = view.vitalCount === 1;
  return {
    count: String(view.vitalCount),
    of: ` of ${total} ${total === 1 ? 'category' : 'categories'} ${one ? 'carries' : 'carry'} `,
    share: `${Math.round(view.vitalShare * 100)}%`,
    tail: ' of the lost time' + (sixM ? (one ? ' — it gets its own problem' : ' — each gets its own problem') : ''),
  };
}

export const vitalSentence = (view: Pick<ParetoView, 'rows' | 'vitalCount' | 'vitalShare'>, sixM: boolean): string => {
  const w = vitalWords(view, sixM);
  return w.count + w.of + w.share + w.tail;
};

/** The line a bar is mostly on (byLine is keyed by the line's name); the
 *  only line, when the project has one. */
export function lineOfBar<L extends { name: string }>(m: Pick<ParetoMove, 'byLine'>, lines: L[]): L | undefined {
  const top = Object.entries(m.byLine ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  return lines.find(l => l.name === top) ?? (lines.length === 1 ? lines[0] : undefined);
}

const isBarsProblem = (p: Case, category: string, lineId: string | undefined) =>
  p.source?.kind === 'pareto' && p.source.category === category && (p.lineId ?? '') === (lineId ?? '');

/** The problem a bar already is, on the line it is filed on: the open one,
 *  or — unless only an open one will do — the one closed last, so a bar that
 *  was fixed says it is holding rather than offering to start again. */
export function problemOfBar(problems: ProblemView[], category: string, lineId: string | undefined, openOnly = false): ProblemView | undefined {
  const mine = problems.filter(p => isBarsProblem(p.problem, category, lineId));
  const open = mine.filter(p => p.problem.status === 'open').sort((a, b) => b.problem.openedAt - a.problem.openedAt)[0];
  if (open || openOnly) return open;
  return [...mine].sort((a, b) => (b.problem.closedAt ?? 0) - (a.problem.closedAt ?? 0))[0];
}

/** A bar as an action — "Just do it": the bar's words, its line, the bone its
 *  category usually sits on, and what it cost, ready for the board's one
 *  editor (ui/ActionSheet) to finish. No cause: it is a just-do-it action. */
export function justDoItStep(m: Pick<ParetoMove, 'category' | 'mins' | 'events'>, o: {
  projectId: string; lineId?: string; id: string; now: number;
}): PaceTodoRow {
  const mins = m.mins >= 100 ? Math.round(m.mins).toLocaleString('en-GB') : String(Math.round(m.mins * 10) / 10);
  return {
    id: o.id, projectId: o.projectId, lineId: o.lineId,
    what: m.category,
    why: `${mins} min lost over ${m.events} ${m.events === 1 ? 'stop' : 'stops'} in the last four weeks`,
    where: '', who: '', when: '', state: 'todo',
    pillar: boneOfStop(m.category),
    createdAt: o.now, updatedAt: o.now,
  };
}

/** The machine a bar is mostly on, on its line, over the same four weeks the
 *  bar was drawn from. */
export async function barAsset(workspaceId: string | undefined, category: string, today = Date.now()): Promise<string | undefined> {
  if (!workspaceId) return undefined;
  const to = new Date(today).setHours(0, 0, 0, 0) + DAY;
  const from = to - PARETO_WINDOW_DAYS * DAY;
  const by = new Map<string, number>();
  for (const o of await listObservations(workspaceId)) {
    if (o.deletedAt || o.startedAt < from || o.startedAt >= to || (o.category || '').trim() !== category) continue;
    by.set(o.asset, (by.get(o.asset) ?? 0) + o.durationMs);
  }
  return [...by.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** THE ONE WAY A BAR BECOMES A PROBLEM — the head of the fish is the bar: its
 *  category, the line it is filed on, and the machine it is mostly on. A bar
 *  that is already an open problem on that line opens that one, so the same
 *  loss is never two problems. `why` is the reason a bar outside the vital
 *  few earned it; a problem that already exists keeps its own. */
export async function openBarProblem(o: {
  category: string; line?: PaceLineRow; problems: ProblemView[]; create: ProblemsApi['create'];
  why?: string; title: (category: string, asset: string | undefined, lineName?: string) => string;
  same: (a: Case['source'], b: Case['source']) => boolean;
}): Promise<Case> {
  const asset = await barAsset(o.line?.workspaceId, o.category);
  const why = o.why?.trim();
  const source: NonNullable<Case['source']> = { kind: 'pareto', category: o.category, asset, ...(why ? { why } : {}) };
  const already = o.problems.find(p => p.problem.status === 'open'
    && (p.problem.lineId ?? '') === (o.line?.id ?? '') && o.same(p.problem.source, source))
    ?? problemOfBar(o.problems, o.category, o.line?.id, true);
  return already?.problem
    ?? o.create({ title: o.title(o.category, asset, o.line?.name), lineId: o.line?.id, source });
}
