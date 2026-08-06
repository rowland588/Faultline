import type { Disagreement } from '../engine/intelligence';

/** The free insight: when the thing that happens MOST OFTEN isn't the thing that
 *  costs the most TIME, say so — that's the whole reason to Pareto both ways. */
export function DisagreementBanner({ d }: { d: Disagreement | null }) {
  if (!d || d.agree || !d.message) return null;
  return (
    <div className="insight">
      <span className="insight-flag" aria-hidden>⚑</span>
      <span>{d.message}</span>
    </div>
  );
}
