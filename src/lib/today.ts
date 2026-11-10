/* TODAY — THE BRIEFING (10 November, docs/LUNA-WORKSPACE.md W7, docs/LUNA-FIRST.md A — "`#/today` greets you and shows what moved since
 * you were last in — at most three things that want you (late actions, … a project behind), worked out by Faultline's code, never by
 * the model, each a door").
 *
 * Read from the very rows the Actions page reads (lib/useProjectActions — one number everywhere, docs/STEADY.md) and the register's
 * problems. Nothing here is the model's: with Luna off the page says the same. Pure. */
import type { ProjectAction, RegisterProblem } from './projectActions';

export type BriefState = 'r' | 'a' | 'w' | 'g' | 'n';
export interface BriefItem { key: string; state: BriefState; word: string; says: string; to: string }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const quote = (s: string) => `“${s.length > 70 ? `${s.slice(0, 67)}…` : s}”`;

/** At most three things that want the person, the most pressing first: the actions past their day (the oldest named), the problems
 *  raised since `since` (the newest named), the project with the most late, then what is due in the next few days. Nothing wanting
 *  them is said in one green line. */
export function briefing(rows: readonly ProjectAction[], problems: readonly RegisterProblem[], since: number): BriefItem[] {
  const out: BriefItem[] = [];
  const late = rows.filter(a => a.late).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  if (late.length) {
    const o = late[0];
    out.push({ key: 'late', state: 'r', word: 'Late', to: '/actions',
      says: `${plural(late.length, 'action')} past ${late.length === 1 ? 'its' : 'their'} day — the oldest ${quote(o.what)}, ${o.who ? o.who : 'nobody yet'}${o.due ? `, due ${o.due}` : ''}.` });
  }
  const fresh = problems.filter(p => !p.deletedAt && !p.archivedAt && p.status !== 'closed' && (p.raisedAt ?? 0) > since)
    .sort((a, b) => (b.raisedAt ?? 0) - (a.raisedAt ?? 0));
  if (fresh.length) {
    const n = fresh[0];
    out.push({ key: 'new', state: 'a', word: 'New', to: `/snags?open=${encodeURIComponent(n.id)}`,
      says: `${plural(fresh.length, 'problem')} raised since you were last in — the newest ${quote(n.problem)}${n.line ? ` on ${n.line}` : ''}.` });
  }
  const byProject = new Map<string, { name: string; n: number }>();
  for (const a of late) if (a.project) { const e = byProject.get(a.project.id); if (e) e.n++; else byProject.set(a.project.id, { name: a.project.name, n: 1 }); }
  const behind = [...byProject.entries()].sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name))[0];
  if (behind && out.length < 3) {
    out.push({ key: 'behind', state: 'r', word: 'Behind', to: `/project/${behind[0]}/actions`,
      says: `${behind[1].name} is the furthest behind — ${plural(behind[1].n, 'action')} late of ${plural(rows.filter(a => a.project?.id === behind[0]).length, 'open action')}.` });
  }
  const soon = rows.filter(a => !a.late && a.soon);
  if (soon.length && out.length < 3) {
    const s = [...soon].sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))[0];
    out.push({ key: 'soon', state: 'a', word: 'Due soon', to: '/actions',
      says: `${plural(soon.length, 'action')} due in the next few days — first ${quote(s.what)}${s.due ? `, ${s.due}` : ''}.` });
  }
  if (!out.length) out.push({ key: 'clear', state: 'g', word: 'Clear', to: '/actions', says: 'Nothing is late, nothing new has been raised since you were last in and nothing is due in the next few days.' });
  return out.slice(0, 3);
}

/** A line in a word: red with a critical problem open, amber with any open, green with none. */
export function lineState(open: number, critical: number): { state: BriefState; word: string } {
  return critical ? { state: 'r', word: `${plural(critical, 'critical problem')}` } : open ? { state: 'a', word: `${plural(open, 'problem')} open` } : { state: 'g', word: 'Nothing open' };
}

/** "Good morning" by the hour. */
export const greeting = (h: number): string => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

const SEEN = 'faultline.today.seen';
let thisVisit: number | undefined;
/** When this device last opened the app's Today — read once a visit (a page that starts twice reads the same), the mark moved on to
 *  now for the next visit. Never synced. A week ago if never. */
export function lastSeenAndMark(now: number): number {
  if (thisVisit !== undefined) return thisVisit;
  let was = now - 7 * 86_400_000;
  try { const v = Number(localStorage.getItem(SEEN)); if (v > 0) was = v; localStorage.setItem(SEEN, String(now)); } catch { /* a private window: a week */ }
  thisVisit = was;
  return was;
}
