/* WHAT WAITS FOR WHAT ON A LINE (7 November — Rowland: "Gantt actions, let's build in dependencies from the Gantt or the problem
 * page, either one populates the other, give options to the user if both ways are allowed").
 *
 * ONE LINK, KEPT ON THE ACTION THAT WAITS: Snag.after holds the ids of the problems on the same line it waits for (one finishes,
 * then the other can). "Holds up" is the same link read the other way, never stored twice — so a link made by dragging on the
 * Gantt, from a tracker row or in the problem's own editor is one record, and shows in all three at once. Either way round is
 * offered wherever a link is made. Carried to the cloud in linked_obs_ids as after:<id> (the waste tag's way — no column).
 *
 * Nothing is worked out that a person did not say: no day is moved for them. A clash — an action due before what it waits for
 * can be done — is said in words, and left for the people to settle. A loop (A waits for B waits for A) is refused. */
import type { Snag } from '../../snag/types';

const startOfDay = (t: number): number => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const live = (s: Snag) => !s.deletedAt && !s.archivedAt;

/** The actions this one waits for, as stored (may name one since deleted — read through `waitsFor`). */
export const afterOf = (s: Pick<Snag, 'after'>): string[] => s.after ?? [];

/** The live actions on the same line this one waits for. */
export function waitsFor(snags: readonly Snag[], id: string): Snag[] {
  const me = snags.find(s => s.id === id); if (!me) return [];
  return afterOf(me).map(a => snags.find(s => s.id === a)).filter((s): s is Snag => !!s && live(s) && s.workspaceId === me.workspaceId);
}
/** The live actions on the same line that wait for this one — the link read the other way. */
export function holdsUp(snags: readonly Snag[], id: string): Snag[] {
  const me = snags.find(s => s.id === id); if (!me) return [];
  return snags.filter(s => live(s) && s.workspaceId === me.workspaceId && afterOf(s).includes(id));
}

/** Would `waiter` waiting for `on` go round in a circle — `on` already waiting, directly or through others, for `waiter`? */
export function wouldLoop(snags: readonly Snag[], waiter: string, on: string): boolean {
  if (waiter === on) return true;
  const seen = new Set<string>(); const stack = [on];
  while (stack.length) {
    const x = stack.pop() as string;
    if (x === waiter) return true;
    if (seen.has(x)) continue; seen.add(x);
    const s = snags.find(k => k.id === x); if (s) stack.push(...afterOf(s));
  }
  return false;
}

export type LinkResult = { id: string; after: string[] | undefined } | { refused: string };
/** The change that makes `waiter` wait for `on` (linked) or stop waiting (not linked): the waiter's whole new list, or why not. */
export function setLink(snags: readonly Snag[], waiter: string, on: string, linked: boolean): LinkResult {
  const w = snags.find(s => s.id === waiter), o = snags.find(s => s.id === on);
  if (!w || !o) return { refused: 'That action is not on this line any more.' };
  if (w.workspaceId !== o.workspaceId) return { refused: 'An action can only wait for another on the same line.' };
  const cur = afterOf(w);
  if (!linked) { const next = cur.filter(x => x !== on); return { id: waiter, after: next.length ? next : undefined }; }
  if (cur.includes(on)) return { id: waiter, after: cur };
  if (wouldLoop(snags, waiter, on)) return { refused: waiter === on ? 'An action cannot wait for itself.' : `That would go round in a circle — “${o.problem}” already waits, through the others, for “${w.problem}”.` };
  return { id: waiter, after: [...cur, on] };
}

export interface DepSays {
  /** What it waits for that is not done yet. */
  waiting: Snag[];
  /** Said when its day comes before what it waits for can be done — in words, never fixed for them. */
  clash?: string;
}
/** What the links mean for this action today: what it is still waiting on, and whether its day can be kept. */
export function depSays(snags: readonly Snag[], id: string, today: number): DepSays {
  const me = snags.find(s => s.id === id); if (!me) return { waiting: [] };
  const waiting = waitsFor(snags, id).filter(s => s.status !== 'closed');
  if (me.status === 'closed' || me.dueAt == null) return { waiting };
  const due = startOfDay(me.dueAt), t0 = startOfDay(today);
  for (const p of waiting) {
    if (p.dueAt == null) return { waiting, clash: `It waits for “${p.problem}”, which has no day yet.` };
    const pd = startOfDay(p.dueAt);
    if (pd < t0) return { waiting, clash: `It waits for “${p.problem}”, already late.` };
    if (pd >= due) return { waiting, clash: `Due ${day(due)}, but it waits for “${p.problem}”, due ${day(pd)}.` };
  }
  return { waiting };
}

/* The cloud's way: the links ride in the row's linked_obs_ids beside the waste tag. */
export const AFTER_TAG = 'after:';
export const afterToTags = (after: readonly string[] | undefined): string[] => (after ?? []).map(a => AFTER_TAG + a);
export const afterOfTags = (ids: unknown): { after?: string[] } => {
  const a = Array.isArray(ids) ? (ids as unknown[]).filter((x): x is string => typeof x === 'string' && x.startsWith(AFTER_TAG)).map(x => x.slice(AFTER_TAG.length)) : [];
  return a.length ? { after: a } : {};
};
