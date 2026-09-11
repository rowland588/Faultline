/* THE SWEEP — the transition into the two screens that get put on a wall.
 *
 * The GM report and the lever tree are the two surfaces that go up in front of
 * a room, and the second before they appear is the second everybody looks up.
 * This fills it: a short swirl of the identity's own green-to-blue, turning
 * once and clearing.
 *
 * Three rules keep it from becoming the thing everyone waits for:
 *
 *  - It NEVER blocks. The screen underneath renders immediately and the swirl
 *    plays over the top of it, pointer-events off, gone in three quarters of a
 *    second. Nothing is ever waiting on an animation to finish.
 *  - It fires ONCE per arrival, not on every re-render, and not when you come
 *    back to a screen you were just on — a flourish you see six times in a
 *    minute is an irritation, not a flourish.
 *  - It does not play at all for anybody who has asked for reduced motion, and
 *    it never plays on the printed page.
 */
import { useEffect, useState } from 'react';

const COOLDOWN_MS = 90_000;   // seen it just now? then it isn't an entrance
const seenAt = new Map<string, number>();

const wantsMotion = () =>
  typeof window !== 'undefined' &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Sweep({ id }: { id: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const last = seenAt.get(id) ?? 0;
    if (wantsMotion() && Date.now() - last >= COOLDOWN_MS) {
      seenAt.set(id, Date.now());
      setOn(true);
    }
    /* The timer is scheduled UNCONDITIONALLY, and that is the whole point.
     *
     * React runs effects twice in development: mount, clean up, mount again.
     * The first pass started the swirl and scheduled its end; the cleanup
     * cancelled that timer; and the second pass hit the cooldown it had just
     * written and returned early — leaving the swirl on screen with nothing
     * left to take it off. It sat over the report for ever.
     *
     * Scheduling the end whether or not this pass started it means whoever
     * started it, it still ends. */
    const t = window.setTimeout(() => setOn(false), 900);
    return () => window.clearTimeout(t);
  }, [id]);

  if (!on) return null;
  return (
    <div className="sweep" aria-hidden>
      <span className="sweep-turn" />
      <span className="sweep-wipe" />
    </div>
  );
}
