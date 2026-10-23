/* A PROJECT'S ACTIONS — the team's action tracker (docs/PROJECTS.md, P3).
 * Rowland, 21 October: "there isn't like a classic action tracker where it's
 * all pulled into ... when you're going through StageGate ... you find
 * problems, snags, evidence, but there is nowhere for a home to then follow
 * through. Everybody wants to say great, who's doing what and when, why ...
 * can we see who the owner is."
 *
 * NO NEW RECORD, AND NO SECOND COUNT. Every row is a thing the project
 * already owes, read the way its Needs you, its band and the control room
 * read it (lib/portfolio jobItems, criticalItems, riskItems, pacedOwed): a
 * stage, a test, a fix, a part of the plan, the board's actions, the checks
 * that keep a gain, the materials, programs and machines waited on, and the
 * open critical problems and high risks. To them are added the register's
 * problems taken for the project and not on it yet (Snag.projectId — the
 * Fixes page's own list) and, for the tiles, what was done. So "late" here
 * is the late the band and the control room say, by the one rule each
 * record already has.
 *
 * What a row says is the tracker's classic line: what · why (the problem it
 * answers, its priority) · where (line, machine, stage) · who · when · where
 * it stands. Grouped three ways — by person, by date, by where — and counted
 * in the lean page's tiles. */
import { kindWord, byUrgency, type JobItem } from './portfolio';
import { addDays } from './weeks';
import { DUE_SOON_DAYS } from './actions';
import type { LeanTile } from './lean';

export type ActionPriority = 'critical' | 'high' | 'low';
export const PRIORITY_WORD: Record<ActionPriority, string> = { critical: 'Critical', high: 'High', low: 'Low' };

export interface ProjectAction {
  key: string;
  /** Its word — Fix, Part of the plan, Action, Problem, Critical … */
  kind: string;
  what: string;
  /** The problem it answers, or what it means for the business. */
  why?: string;
  priority?: ActionPriority;
  /** Line, machine or stage, in words. */
  where?: string;
  /** Who, as typed; '' is nobody yet. */
  who: string;
  /** ISO day it is due by. */
  due?: string;
  late: boolean;
  /** Due within the next few days (lib/actions DUE_SOON_DAYS), not late. */
  soon: boolean;
  /** The owed row it was read from — opens as Needs you's row does. */
  item?: JobItem;
  /** A problem on the register, taken for the project and not on it yet. */
  snagId?: string;
  /** Across every project (the control room's Actions, P4): whose project it
   *  is on — none for a line's own problem. */
  project?: { id: string; name: string };
}

/** A register problem, as much of it as the tracker reads (snag/types Snag). */
export interface RegisterProblem {
  id: string; problem: string; priority?: ActionPriority; owner?: string;
  dueAt?: number; status: string; projectId?: string; deletedAt?: number; archivedAt?: number;
  sent?: { projectId: string }[];
  /** The day it was raised and the day it was closed (the journey, lib/journey). */
  raisedAt?: number; closedAt?: number;
  /** Its line's name, for where. */
  line?: string;
}

/** What was done, for "done since last week" — a day each. */
export interface DoneThing { what: string; on: string }

const isoOf = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** EVERY ACTION ON A PROJECT — its owed rows and the register's problems taken
 *  for it, critical first, then late, then by day, then the undated. */
export function projectActions(owed: readonly JobItem[], register: readonly RegisterProblem[], projectId: string, today: string): ProjectAction[] {
  const soonEnd = addDays(today, DUE_SOON_DAYS);
  const soonOf = (due: string | undefined, late: boolean) => !late && !!due && due >= today && due <= soonEnd;
  const fromOwed = [...owed].sort(byUrgency).map((x, i): ProjectAction => {
    const crit = x.critical;
    return {
      key: `${x.kind}:${x.part ?? x.id ?? x.what}:${i}`,
      kind: crit ? (crit.risk ? 'High risk' : 'Critical') : kindWord(x),
      what: x.what,
      ...(crit?.impact ? { why: crit.impact } : x.branch ? { why: x.branch } : {}),
      ...(crit ? { priority: crit.risk ? 'high' as const : 'critical' as const } : {}),
      ...(crit?.where ? { where: crit.where } : x.line ? { where: x.line } : {}),
      who: x.who.trim(),
      ...(x.on ? { due: x.on } : {}),
      late: x.late, soon: soonOf(x.on, x.late),
      item: x,
    };
  });
  const fromRegister = register
    .filter(s => s.projectId === projectId && !s.deletedAt && !s.archivedAt && s.status !== 'closed' && !(s.sent ?? []).some(x => x.projectId === projectId))
    .map((s): ProjectAction => {
      const due = s.dueAt != null ? isoOf(s.dueAt) : undefined;
      const late = !!due && due < today;
      return {
        key: `problem:${s.id}`, kind: 'Problem', what: s.problem.trim() || 'A problem',
        priority: s.priority ?? 'low', ...(s.line ? { where: s.line } : {}),
        who: (s.owner ?? '').trim(), ...(due ? { due } : {}), late, soon: soonOf(due, late), snagId: s.id,
      };
    });
  const rank = (a: ProjectAction) => (a.priority === 'critical' ? 0 : a.priority === 'high' && a.kind !== 'Problem' ? 1 : 2);
  return [...fromOwed, ...fromRegister].sort((a, b) =>
    rank(a) - rank(b) || Number(b.late) - Number(a.late) || (a.due ?? '￿').localeCompare(b.due ?? '￿') || a.what.localeCompare(b.what));
}

/** EVERY PROJECT'S ACTIONS AND EVERY LINE'S OWN PROBLEMS — the control room's
 *  Actions (docs/PROJECTS.md, P4): each project read as its own page reads it,
 *  marked with its project; then the register's problems on a line with no
 *  project. One order for all of them, as on a project's page. */
export function everyAction(projects: readonly { id: string; name: string; owed: readonly JobItem[] }[], register: readonly RegisterProblem[], today: string): ProjectAction[] {
  const live = new Set(projects.map(p => p.id));
  const per = projects.flatMap(p => projectActions(p.owed, register, p.id, today).map(a => ({ ...a, key: `${p.id}:${a.key}`, project: { id: p.id, name: p.name } })));
  const lines = projectActions([], register.filter(r => !r.projectId || !live.has(r.projectId)).map(r => ({ ...r, projectId: '' })), '', today);
  const rank = (a: ProjectAction) => (a.priority === 'critical' ? 0 : a.priority === 'high' && a.kind !== 'Problem' ? 1 : 2);
  return [...per, ...lines].sort((a, b) =>
    rank(a) - rank(b) || Number(b.late) - Number(a.late) || (a.due ?? '￿').localeCompare(b.due ?? '￿') || a.what.localeCompare(b.what));
}

/** BY PROJECT — a group a project, the most late first; a line's own last. */
export function byProject(rows: readonly ProjectAction[]): ActionGroup[] {
  return group(rows, a => (a.project ? [a.project.id, a.project.name] : ['', 'On the lines, no project']))
    .sort((a, b) => Number(!a.key) - Number(!b.key) || b.late - a.late || a.label.localeCompare(b.label));
}

/** One person's name as the tracker groups it — however it was cased or spaced. */
export const personKey = (who: string): string => who.trim().replace(/\s+/g, ' ').toLowerCase();

export interface ActionGroup { key: string; label: string; rows: ProjectAction[]; late: number }

const group = (rows: readonly ProjectAction[], keyOf: (a: ProjectAction) => [string, string]): ActionGroup[] => {
  const by = new Map<string, ActionGroup>();
  for (const a of rows) {
    const [key, label] = keyOf(a);
    const g = by.get(key) ?? { key, label, rows: [], late: 0 };
    g.rows.push(a); if (a.late) g.late++;
    by.set(key, g);
  }
  return [...by.values()];
};

/** WHO IS DOING WHAT — a group a person, the most late first, then the most
 *  owed; nobody yet last. A name is shown as it was most often typed. */
export function byPerson(rows: readonly ProjectAction[]): ActionGroup[] {
  const spelt = new Map<string, Map<string, number>>();
  for (const a of rows) {
    const k = personKey(a.who); if (!k) continue;
    const m = spelt.get(k) ?? new Map<string, number>();
    m.set(a.who.trim(), (m.get(a.who.trim()) ?? 0) + 1); spelt.set(k, m);
  }
  const label = (k: string) => [...(spelt.get(k) ?? new Map<string, number>())].sort((a, b) => b[1] - a[1])[0]?.[0] ?? k;
  return group(rows, a => { const k = personKey(a.who); return k ? [k, label(k)] : ['', 'Nobody yet']; })
    .sort((a, b) => Number(!a.key) - Number(!b.key) || b.late - a.late || b.rows.length - a.rows.length || a.label.localeCompare(b.label));
}

/** BY WHEN — late, this week, later, no date agreed. */
export function byDate(rows: readonly ProjectAction[], today: string): ActionGroup[] {
  const week = addDays(today, 7);
  const order = ['late', 'week', 'later', 'none'];
  const word: Record<string, string> = { late: 'Late', week: 'Due in the next 7 days', later: 'Later', none: 'No date agreed' };
  return group(rows, a => { const k = a.late ? 'late' : !a.due ? 'none' : a.due <= week ? 'week' : 'later'; return [k, word[k]]; })
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

/** BY WHERE — the line, machine or stage it is on; the project as a whole last. */
export function byWhere(rows: readonly ProjectAction[]): ActionGroup[] {
  return group(rows, a => (a.where ? [a.where, a.where] : ['', 'The project as a whole']))
    .sort((a, b) => Number(!a.key) - Number(!b.key) || b.late - a.late || a.label.localeCompare(b.label));
}

/** THE TILES (the lean page): open · late · due this week · nobody yet · no
 *  date · done since last week. Only the abnormal carries a colour (CLAUDE.md,
 *  visual rule 3); a zero is grey. */
export function actionTiles(rows: readonly ProjectAction[], done: readonly DoneThing[], today: string): LeanTile[] {
  const week = addDays(today, 7), weekAgo = addDays(today, -7);
  const late = rows.filter(a => a.late).length;
  const thisWeek = rows.filter(a => !a.late && !!a.due && a.due <= week).length;
  const nobody = rows.filter(a => !a.who).length;
  const undated = rows.filter(a => !a.due).length;
  const doneWeek = done.filter(d => d.on >= weekAgo && d.on <= today).length;
  const crit = rows.filter(a => a.priority === 'critical').length;
  /* WHAT THE OPEN IS MADE OF (docs/STEADY.md S1) — the band's "still to do" is the plan's own rows
     (lib/standing); Actions owes more: the critical problems, the register's problems taken for the
     project, its own actions. Said in the tile, so the two numbers reconcile on the page. */
  const plan = rows.filter(a => a.item && !a.item.critical && a.item.kind !== 'action' && a.item.kind !== 'check').length;
  const own = rows.filter(a => a.item?.kind === 'action').length;
  const register = rows.filter(a => !!a.snagId).length;
  const checks = rows.filter(a => a.item?.kind === 'check').length;
  const risks = rows.filter(a => a.item?.critical?.risk).length;
  const critical = rows.filter(a => a.item?.critical && !a.item.critical.risk).length;
  const made = [plan ? `${plan} on the plan` : '', critical ? `${critical} critical` : '', risks ? `${risks} high ${risks === 1 ? 'risk' : 'risks'}` : '', own ? `${own} of its own` : '', register ? `${register} from the register` : '', checks ? `${checks} ${checks === 1 ? 'check' : 'checks'}` : ''].filter(Boolean).join(' · ');
  return [
    { k: 'Open', v: String(rows.length), of: rows.length ? made : 'nothing owed', ...(crit ? { tone: 'r' as const } : {}) },
    { k: 'Late', v: String(late), of: late ? 'past the day agreed' : 'nothing past its day', tone: late ? 'r' : 'n' },
    { k: 'This week', v: String(thisWeek), of: 'due in the next 7 days', ...(thisWeek ? {} : { tone: 'n' as const }) },
    { k: 'Nobody yet', v: String(nobody), of: nobody ? 'with no one named' : 'every one has a name', tone: nobody ? 'a' : 'n' },
    { k: 'No date', v: String(undated), of: undated ? 'with no day agreed' : 'every one has a day', tone: undated ? 'a' : 'n' },
    { k: 'Done this week', v: String(doneWeek), of: 'in the last 7 days', ...(doneWeek ? { tone: 'g' as const } : { tone: 'n' as const }) },
  ];
}

/** The closing line — what the tracker can say to the meeting. */
export function actionsClosing(rows: readonly ProjectAction[]): { text: string; tone: 'r' | 'a' | 'g' | 'n' } {
  if (!rows.length) return { text: 'Nothing owed on the project.', tone: 'g' };
  const late = rows.filter(a => a.late), nobody = rows.filter(a => !a.who).length;
  const people = byPerson(late).filter(g => g.key);
  const most = people[0];
  const lateSaid = late.length ? `${late.length} late${most ? ` — ${most.label} has ${most.late}` : ''}` : 'nothing late';
  const text = `${rows.length} open, ${lateSaid}${nobody ? `; ${nobody} with no one named` : ''}.`;
  return { text, tone: late.length ? 'r' : nobody ? 'a' : 'g' };
}
