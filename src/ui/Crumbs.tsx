/* THE SPINE — where you are, and one tap to any step above you.
 *
 * (Named `spine`, not `crumb`: the Analyse board already owns .crumb/.crumbs
 * for its drill path, and two different things wearing one class name is how a
 * stylesheet quietly breaks a screen nobody was touching.)
 *
 * The app grew a level at a time. It began as a snag list, gained a Pareto,
 * then projects, then lines with an owner each — and every level added its own
 * lone back button pointing at whatever screen happened to have come before it
 * when that level was built. The result is five levels deep with no trail on
 * any of them: you can see where you are only by reading the heading, and
 * "back" is a guess that is often two steps too far.
 *
 * So there is exactly one of these, and every screen shows it:
 *
 *     Projects › Project Pace › Line 7 › Walks › Bagger 3
 *
 * Rules it keeps, because they are what "never locked in, never the wrong
 * place" actually means:
 *
 *  - Every crumb but the last is a button. Not a decoration.
 *  - The last crumb is where you are, and is never a link to itself.
 *  - It never depends on browser history. Arriving by a shared link, a reload
 *    or a redirect gives you the same trail as walking in — a back button that
 *    works only when you came the expected way is worse than none.
 *  - On a phone it scrolls sideways and holds the LAST crumbs on screen, since
 *    the step you want is nearly always the one just above you.
 */
import { useEffect, useRef } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from './AccountMenu';

export interface Crumb {
  label: string;
  to?: string;   // absent = you are here
}

export function Crumbs({ trail }: { trail: Crumb[] }) {
  const steps = trail.filter(c => c.label);
  // The one directly above you — the step "back" means on any screen. Given its
  // own button because a 12px crumb is not a thumb target on a factory floor.
  const up = [...steps].reverse().find(c => c.to);

  // Scrolled to the END, not the start. When the trail is longer than the
  // screen, the half worth showing is the half nearest where you are — seeing
  // "Projects › Project Pace › Line 7 › Wal…" tells you nothing you did not
  // already know, and hides the answer to the question the bar exists for.
  const trailRef = useRef<HTMLElement>(null);
  const key = steps.map(c => c.label).join('›');
  useEffect(() => {
    const el = trailRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [key]);

  // AFTER the hooks, never before. This used to return early on an empty trail,
  // which meant Crumbs called two hooks on some renders and none on others.
  // React identifies hooks by call order, so an instance that flips between
  // those paths — a trail whose labels arrive with the data, which is every
  // screen that loads a name — corrupts its own hook state or throws
  // "rendered fewer hooks than expected". This bar is on every screen in the
  // app, so it was the widest-reach fault in it.
  if (steps.length === 0) return null;

  return (
    <div className="spine">
      {up && (
        <button className="spine-up" onClick={() => nav(up.to!)} aria-label={`Back to ${up.label}`}>
          ‹<span className="spine-up-l">{up.label}</span>
        </button>
      )}
      <nav className="spine-trail" ref={trailRef} aria-label="Where you are">
        {steps.map((c, i) => (
          /* On a phone the pill already IS the step above, so the trail
             printed it again beside it, both cut mid-word: "‹ Line 2 commissi…
             e 2 commissioning › Testing". Below 720px the trail keeps only
             where you are — "‹ Line 2 commissioning  › Testing". */
          <span key={i} className="spine-w">
            {i > 0 && <span className="spine-sep" aria-hidden>›</span>}
            {c.to
              ? <button className="spine-crumb" onClick={() => nav(c.to!)}>{c.label}</button>
              : <span className="spine-crumb is-here" aria-current="page">{c.label}</span>}
          </span>
        ))}
      </nav>
      {/* ONE HOME for the account button. It sat in three places — above the
          spine, inside a header's action row, and on its own line mid-page on
          Materials and Programs at phone width. It lives here, on every screen
          that has a spine. */}
      <AccountMenu />
    </div>
  );
}
