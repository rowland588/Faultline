/* WHAT CHANGED THIS WEEK — a line's stops this week against the four weeks
 * before, by reason or by machine, only where the record can carry it
 * (docs/upgrade-plan.md F1; the brief: "anomaly and shift detection — what
 * changed this week and why it matters").
 *
 * A change is said when this week's minutes differ from the weekly usual by
 * at least half again AND by 30 minutes or more, and the usual is built from
 * at least two weeks with something logged — a reason seen for the first time
 * is "new" once it reaches 30 minutes. Below that, nothing is said: a quiet
 * list is an honest one. The usual is the median week (one bad week does not
 * make the usual). Pure. */
import type { Observation } from '../../types';
import { between, norm, reasonOf, stopMinutes, weekStart, WEEK } from './stops';
import { percentile } from './confidence';

export type ChangeKind = 'up' | 'down' | 'new' | 'gone';
export interface Change {
  key: string;
  kind: ChangeKind;
  thisWeek: number;
  usual: number;
  /** "Misfeed on the Basketer: 140 min this week, about 60 a week before — up 80 min." */
  says: string;
  /** The stops this week behind it. */
  ids: string[];
}

export const MIN_DELTA = 30, MIN_RATIO = 1.5, BASE_WEEKS = 4, MIN_BASE = 2;

const keyOf = (by: 'reason' | 'machine' | 'category') => (o: Observation) => (by === 'reason' ? reasonOf(o) : by === 'category' ? o.category.trim() || 'Unnamed' : o.asset.trim() || 'No machine named');
const fm = (n: number) => `${Math.round(n).toLocaleString('en-GB')} min`;

export function changesThisWeek(obs: readonly Observation[], now: number, by: 'reason' | 'machine' | 'category' = 'reason'): Change[] {
  const w0 = weekStart(now);
  const key = keyOf(by);
  const thisWeek = between(obs, w0, w0 + WEEK);
  const weeks = Array.from({ length: BASE_WEEKS }, (_, i) => between(obs, w0 - (i + 1) * WEEK, w0 - i * WEEK));
  const logged = weeks.filter(w => w.length > 0).length;
  const keys = new Set([...thisWeek, ...weeks.flat()].map(o => norm(key(o))));
  const name = new Map([...thisWeek, ...weeks.flat()].map(o => [norm(key(o)), key(o)]));
  const out: Change[] = [];
  for (const k of keys) {
    const mine = thisWeek.filter(o => norm(key(o)) === k);
    const now_ = stopMinutes(mine);
    const per = weeks.map(w => stopMinutes(w.filter(o => norm(key(o)) === k)));
    const seenBefore = per.some(m => m > 0);
    const usual = logged >= MIN_BASE ? percentile(per.filter((_, i) => weeks[i].length > 0), 0.5) ?? 0 : 0;
    const label = name.get(k) ?? k;
    const ids = mine.map(o => o.id);
    if (!seenBefore && logged >= MIN_BASE && now_ >= MIN_DELTA) {
      out.push({ key: label, kind: 'new', thisWeek: now_, usual: 0, ids, says: `${label}: ${fm(now_)} this week — not logged in the ${logged} weeks before.` });
      continue;
    }
    if (logged < MIN_BASE) continue;
    const d = now_ - usual;
    if (d >= MIN_DELTA && now_ >= usual * MIN_RATIO) out.push({ key: label, kind: 'up', thisWeek: now_, usual, ids, says: usual < 1 ? `${label}: ${fm(now_)} this week — hardly logged in the weeks before.` : `${label}: ${fm(now_)} this week, about ${fm(usual)} a week before — up ${fm(d)}.` });
    else if (-d >= MIN_DELTA && usual >= now_ * MIN_RATIO) out.push({ key: label, kind: now_ === 0 ? 'gone' : 'down', thisWeek: now_, usual, ids, says: now_ === 0 ? `${label}: none this week, about ${fm(usual)} a week before.` : `${label}: ${fm(now_)} this week, about ${fm(usual)} a week before — down ${fm(-d)}.` });
  }
  const rank: Record<ChangeKind, number> = { up: 0, new: 1, down: 2, gone: 3 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || Math.abs(b.thisWeek - b.usual) - Math.abs(a.thisWeek - a.usual));
}
