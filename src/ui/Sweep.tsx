/* THE ENTRANCE — the two screens that go up in front of a room.
 *
 * The GM report and the lever tree are the surfaces that get put on a wall, and
 * the second before they appear is the second everybody looks up. The first
 * version of this was a pale wipe: polite, and far too timid for the moment.
 *
 * Two things make an entrance feel like power and intelligence, and they are
 * different jobs:
 *
 *   POWER is commitment. The screen goes DARK first — deep ink, a vortex of the
 *   identity's own colours turning hard through it, a bright ring thrown out
 *   past the edges. It decides something before it resolves. A transition that
 *   only ever gets lighter reads as a page load; one that commits to a dark
 *   beat and then opens reads as a system doing something.
 *
 *   INTELLIGENCE is assembly. Revealing a finished page is a curtain. Building
 *   it — the outcome first, then what has to be true, then the conditions, then
 *   the work, each level snapping in behind the one before it — is the app
 *   composing the answer in front of the room. That is the half that actually
 *   lands, and the half the first version was missing entirely.
 *
 * The rules that keep it from becoming the thing everyone waits for are
 * unchanged, and they are not negotiable: the screen underneath is drawn and
 * usable from the first frame, the overlay never takes a pointer event, it
 * fires once per arrival with a cooldown, and anybody who has asked for less
 * motion gets none of it.
 */
import { useEffect, useState } from 'react';

/** Long enough to feel deliberate, short enough that nobody waits. The dark
 *  beat lands at ~320ms, the content starts assembling at ~420ms, and the last
 *  level of the tree is home by ~1.5s. */
const RUN_MS = 1700;
const COOLDOWN_MS = 90_000;
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
    /* Scheduled unconditionally — React runs effects twice in development, and
     * the pass that does NOT start the animation still has to be able to end
     * it. Getting this wrong once left the overlay on screen for ever. */
    const t = window.setTimeout(() => setOn(false), RUN_MS);
    return () => window.clearTimeout(t);
  }, [id]);

  /* The staggered build of the content itself is driven from a class on <html>,
   * not from this component's own tree: the boxes and panels being assembled
   * belong to other screens entirely, and CSS can stagger them by nesting depth
   * without any of them knowing this exists.
   *
   * It hangs off `on` rather than off the decision above, and that is the whole
   * point. Setting it inside the decision looked right and was dead: in
   * development React runs the effect, cleans up, and runs it again — the first
   * pass added the class and wrote the cooldown, the cleanup took the class
   * off, and the second pass hit its own cooldown and never put it back. The
   * overlay played over content that never assembled. Tied to the state that is
   * actually being rendered, the add and the remove cannot come apart. */
  useEffect(() => {
    if (!on) return;
    const html = document.documentElement;
    html.classList.add('fl-enter');
    return () => html.classList.remove('fl-enter');
  }, [on]);

  if (!on) return null;
  return (
    <div className="sweep" aria-hidden>
      <span className="sweep-veil" />
      <span className="sweep-vortex" />
      <span className="sweep-ring" />
      <span className="sweep-wipe" />
    </div>
  );
}
