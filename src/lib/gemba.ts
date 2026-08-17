/* Eyes on the line — the honesty meter. Observation-based measurement is only
 * as true as the last time someone stood at the gemba, so the silence itself
 * must be visible: the board and the meeting say when the line was last
 * observed and last walked, and turn amber then red as that goes stale.
 * That quiet pressure — "nobody has looked for 9 days" — is what keeps a CI
 * habit alive better than any reminder ever has. */
import type { Observation } from '../types';

const DAY = 86_400_000;

export interface Freshness {
  lastObsAt: number | null;   // newest observation's start
  lastWalkAt: number | null;  // newest walk video's capture
  daysSinceObs: number | null;
  daysSinceWalk: number | null;
  /** amber at > 7 days without ANY eyes (obs or walk); red at > 14 */
  level: 'fresh' | 'fading' | 'stale';
}

export function freshness(obs: Observation[], walkTimes: number[], ref = Date.now()): Freshness {
  const lastObsAt = obs.length ? Math.max(...obs.map(o => o.startedAt)) : null;
  const lastWalkAt = walkTimes.length ? Math.max(...walkTimes) : null;
  const days = (t: number | null) => (t == null ? null : Math.max(0, Math.floor((ref - t) / DAY)));
  const daysSinceObs = days(lastObsAt);
  const daysSinceWalk = days(lastWalkAt);
  const freshest = Math.min(daysSinceObs ?? Infinity, daysSinceWalk ?? Infinity);
  const level = freshest === Infinity ? 'stale' : freshest > 14 ? 'stale' : freshest > 7 ? 'fading' : 'fresh';
  return { lastObsAt, lastWalkAt, daysSinceObs, daysSinceWalk, level };
}

export const agoWord = (d: number | null): string =>
  d == null ? 'never' : d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
