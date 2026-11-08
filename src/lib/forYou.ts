/* FOR YOU — the notifications (8 November, the enterprise basics; docs/STATE.md 0b). Rowland's team are named on actions by the
 * words typed in Who (an account carries only an email), so the person says once, on this device, which name is theirs; the bell
 * then reads the very rows the Actions page reads (lib/useProjectActions useEveryAction) and keeps those that are theirs: late
 * first, then due today or tomorrow, then the rest of the week. One number everywhere (docs/STEADY.md): the bell's count is
 * the late and the due-within-two-days of these rows, never a second reading. */
import type { ProjectAction } from './projectActions';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
/** The names in a Who box — "Sam & Jo", "Sam, Jo", "Sam and Jo", "Sam / Jo" are two people. */
export const namesIn = (who: string): string[] => who.split(/\s*(?:,|&|\/|\band\b|\+)\s*/i).map(norm).filter(Boolean);
/** Is this action theirs? Their name is one of the names in its Who. */
export const isMine = (a: Pick<ProjectAction, 'who'>, me: string): boolean => !!norm(me) && namesIn(a.who ?? '').includes(norm(me));

const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export interface ForYou { late: ProjectAction[]; soon: ProjectAction[]; week: ProjectAction[]; count: number }
/** What is theirs, in three groups, and the bell's number: the late and those due by tomorrow. */
export function forYou(rows: readonly ProjectAction[], me: string, today: string): ForYou {
  const mine = rows.filter(a => isMine(a, me));
  const tomorrow = addDays(today, 1), week = addDays(today, 7);
  const late = mine.filter(a => a.late);
  const soon = mine.filter(a => !a.late && !!a.due && a.due <= tomorrow);
  const later = mine.filter(a => !a.late && !!a.due && a.due > tomorrow && a.due <= week);
  return { late, soon, week: later, count: late.length + soon.length };
}

/** Every name on the actions, most-used first — offered when the person says which is theirs. */
export function namesOnActions(rows: readonly ProjectAction[]): string[] {
  const n = new Map<string, { w: string; k: number }>();
  for (const a of rows) for (const raw of (a.who ?? '').split(/\s*(?:,|&|\/|\band\b|\+)\s*/i).map(s => s.trim()).filter(Boolean)) {
    const k = norm(raw); const e = n.get(k); if (e) e.k++; else n.set(k, { w: raw, k: 1 });
  }
  return [...n.values()].sort((a, b) => b.k - a.k || a.w.localeCompare(b.w)).map(e => e.w);
}

const KEY = 'faultline.forYou.name';
/** The name this device's person goes by on the actions — kept on this device only. */
export function myName(): string { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } }
export function setMyName(v: string): void { try { if (v.trim()) localStorage.setItem(KEY, v.trim()); else localStorage.removeItem(KEY); } catch { /* private window: asked again next time */ } }
