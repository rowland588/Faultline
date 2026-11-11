/* WHAT EACH ROLE SEES FIRST — Today shaped by the person's role in their business (11 November, docs/ORGANISATION.md O4).
 *
 * Rowland, 11 November: "Luna must be useful both to someone standing beside a production machine and someone sitting in the
 * boardroom … A team leader must not automatically have access to everything a managing director can see."
 *
 * The same page and the same parts (screens/TodayScreen): only what fills them changes.
 *   floor     (team)            their area's lines, what THEY owe today, the problems on their lines
 *   lines     (manager, viewer) their lines with the stops lost this week in minutes and money, what their people owe, the projects
 *   business  (leader, admin)   each site › area in one line with its worst line and its money this week, the late across the business,
 *                               the projects by method
 * No business on the device → no lens: Today as it was. The scope is the person's own row (sites, areas — org/organisation covers);
 * it narrows what is shown, never widens it (the database decides what the device holds). Pure. */
import type { Project, Workspace } from '../types';
import type { ProjectAction, RegisterProblem } from '../lib/projectActions';
import { isMine } from '../lib/forYou';
import { areaHref, areasOf } from '../lib/areas';
import { lineState, type BriefItem, type BriefState } from '../lib/today';
import { fmtGBP } from '../lib/cost';
import { covers, normEmail, scopeSays, type OrgMember, type OrgRole } from './organisation';
import type { LossRow } from './businessFigures';

export type HomeLens = 'floor' | 'lines' | 'business';
export const lensOf = (role: OrgRole | undefined): HomeLens | undefined =>
  role === 'team' ? 'floor' : role === 'manager' || role === 'viewer' ? 'lines' : role === 'leader' || role === 'admin' ? 'business' : undefined;

export interface Scope { sites: string[]; areas: string[] }
export const WHOLE: Scope = { sites: [], areas: [] };
/** My scope: my own row in the business, else the whole business (its maker, or a role tried on in development). */
export function myScope(members: readonly OrgMember[], email: string | undefined): Scope {
  const e = email ? normEmail(email) : '';
  const m = e ? members.find(x => !x.deletedAt && x.email === e) : undefined;
  return m ? { sites: m.sites, areas: m.areas } : WHOLE;
}
export const isWhole = (s: Scope): boolean => !s.sites.length && !s.areas.length;
export const scopeWords = (s: Scope): string => scopeSays(s);

/** The lines in my scope, in the order given. */
export const linesInScope = <T extends Pick<Workspace, 'siteName' | 'areaName'>>(lines: readonly T[], s: Scope): T[] => lines.filter(w => covers(s, w));

/** The projects on a line in my scope (by the project's lines — lib/lineRecords JobLine — or its own older list); a project on no line
 *  only for the whole business. */
export function projectsInScope(projects: readonly Project[], jobLines: readonly { projectId?: string; workspaceId?: string; deletedAt?: number }[], scoped: ReadonlySet<string>, s: Scope): Project[] {
  return projects.filter(p => {
    const on = new Set([...(p.workspaceIds ?? []), ...jobLines.filter(l => !l.deletedAt && l.projectId === p.id && l.workspaceId).map(l => l.workspaceId as string)]);
    return on.size ? [...on].some(id => scoped.has(id)) : isWhole(s);
  });
}

/** An action in my scope: a line's own on a line of mine; a project's on a project of mine; anything else only for the whole business. */
export function actionInScope(a: Pick<ProjectAction, 'workspaceId' | 'project'>, scoped: ReadonlySet<string>, projects: ReadonlySet<string>, s: Scope): boolean {
  if (a.workspaceId) return scoped.has(a.workspaceId);
  if (a.project) return projects.has(a.project.id);
  return isWhole(s);
}
export const problemInScope = (p: Pick<RegisterProblem, 'workspaceId' | 'projectId'>, scoped: ReadonlySet<string>, projects: ReadonlySet<string>, s: Scope): boolean =>
  p.workspaceId ? scoped.has(p.workspaceId) : p.projectId ? projects.has(p.projectId) : isWhole(s);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const quote = (s: string) => `“${s.length > 60 ? `${s.slice(0, 57)}…` : s}”`;

/** WHAT I OWE TODAY (the floor's first row) — the actions with my name on them past their day or due by today; none → nothing. */
export function owedToday(rows: readonly ProjectAction[], me: string, today: string): BriefItem | undefined {
  if (!me.trim()) return undefined;
  const mine = rows.filter(a => isMine(a, me) && (a.late || (a.due !== undefined && a.due <= today)))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  if (!mine.length) return undefined;
  const late = mine.filter(a => a.late).length;
  return { key: 'owe', state: late ? 'r' : 'a', word: 'You owe', to: '/actions',
    says: `${plural(mine.length, 'action')} with your name on ${mine.length === 1 ? 'it' : 'them'} today${late ? `, ${late} past ${late === 1 ? 'its' : 'their'} day` : ''} — first ${quote(mine[0].what)}${mine[0].due ? `, due ${mine[0].due}` : ''}.` };
}

/** WHAT MY PEOPLE OWE (a manager's) — by the name on the actions, the most late first; nobody yet last. */
export function peopleOwing(rows: readonly ProjectAction[]): { who: string; open: number; late: number }[] {
  const by = new Map<string, { who: string; open: number; late: number }>();
  for (const a of rows) {
    const who = a.who?.trim() || 'Nobody yet';
    const g = by.get(who) ?? { who, open: 0, late: 0 };
    g.open++; if (a.late) g.late++; by.set(who, g);
  }
  return [...by.values()].sort((a, b) => (a.who === 'Nobody yet' ? 1 : 0) - (b.who === 'Nobody yet' ? 1 : 0) || b.late - a.late || b.open - a.open || a.who.localeCompare(b.who));
}

/** A line's loss this week in a few words — "42 min lost · £120" — or none. */
export function lossShort(l: LossRow | undefined): string | undefined {
  if (!l || !l.timed) return l?.stops ? `${plural(l.stops, 'stop')} counted` : undefined;
  return `${Math.round(l.minutes)} min lost${l.labour !== undefined ? ` · ${fmtGBP(l.labour)}` : ''}`;
}

export interface AreaRow { key: string; title: string; href?: string; lines: number; state: BriefState; word: string; says: string }

/** THE BUSINESS IN A FEW LINES — each site › area its own row: its lines, its worst line and why, its stops this week in minutes and
 *  money (the lines' own sums — never a second number); the lines with no area apart, last. */
export function businessRows<T extends Pick<Workspace, 'id' | 'name' | 'clientName' | 'siteName' | 'areaName'>>(
  lines: readonly T[], open: (id: string) => { open: number; critical: number }, loss: (id: string) => LossRow | undefined, weekSays = 'this week',
): AreaRow[] {
  const { areas, noArea } = areasOf(lines);
  const groups = [...areas.map(a => ({ key: a.title, title: a.title, href: areaHref(a.id), lines: a.lines })), ...(noArea.length ? [{ key: '—', title: 'No area yet', href: undefined, lines: noArea }] : [])];
  return groups.map(g => {
    const each = g.lines.map(l => ({ l, ...open(l.id), loss: loss(l.id) }));
    const worst = [...each].sort((a, b) => b.critical - a.critical || b.open - a.open || (b.loss?.minutes ?? 0) - (a.loss?.minutes ?? 0))[0];
    const crit = each.reduce((n, x) => n + x.critical, 0), openN = each.reduce((n, x) => n + x.open, 0);
    const timed = each.filter(x => x.loss?.timed), minutes = timed.reduce((n, x) => n + (x.loss?.minutes ?? 0), 0);
    const priced = timed.filter(x => x.loss?.labour !== undefined), money = priced.reduce((n, x) => n + (x.loss?.labour ?? 0), 0);
    const st = lineState(openN, crit);
    const worstSays = worst && (worst.open || worst.loss?.timed) ? `worst ${worst.l.name}${worst.critical ? ` (${plural(worst.critical, 'critical problem')})` : worst.open ? ` (${plural(worst.open, 'problem')} open)` : ''}` : 'nothing open';
    const lost = timed.length ? `${Math.round(minutes)} min lost ${weekSays}${priced.length ? ` · ${fmtGBP(money)}${priced.length < timed.length ? ` on ${priced.length} of ${timed.length} lines priced` : ''}` : ' · no crew and wage to price it'}` : `no stop timed ${weekSays}`;
    return { key: g.key, title: g.title, ...(g.href ? { href: g.href } : {}), lines: g.lines.length, state: st.state, word: st.word, says: `${plural(g.lines.length, 'line')} · ${worstSays} · ${lost}` };
  });
}

/** The page's one sentence, by lens. */
export function homeSays(lens: HomeLens | undefined, s: Scope, business?: string): string {
  if (lens === 'floor') return `${isWhole(s) ? 'Your lines' : `Your area — ${scopeSays(s)}`}: what you owe today, the problems on your lines and how each line stands.`;
  if (lens === 'lines') return `${isWhole(s) ? 'Your lines' : `Your lines in ${scopeSays(s)}`}: what is late, what each line lost this week and what your people owe.`;
  if (lens === 'business') return `${business ? `${business}` : 'The business'}${isWhole(s) ? '' : ` — ${scopeSays(s)}`}: each area with its worst line and its money this week, what is late across it, and the projects.`;
  return 'What wants you today, worked out from the actions and problems as they stand — then the lines, where you were and the projects.';
}
