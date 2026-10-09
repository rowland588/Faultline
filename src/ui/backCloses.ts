/* BACK CLOSES WHAT IS OPEN (docs/STAGEGATE.md, the backbone rule 3).
 *
 * The record drawer is carried on the URL (ui/RecordDrawer ?open=), so the
 * phone's back button closes it and leaves you where you were. Every other
 * panel — a bottom sheet, the machine panel, the stage list — was not: back
 * with one open left the page for whatever came before it. Now each panel,
 * while it is open, owns one history entry of its own on top of the page's
 * (same URL, its own state), so:
 *
 *   - back takes that entry off and the panel closes; the page stays;
 *   - a panel closed any other way (×, Escape, Save) takes its entry off
 *     too, so back is never pressed twice for one move;
 *   - an entry left behind by a panel that is gone (it closed while a record
 *     was open over it) is stepped over when back lands on it;
 *   - opening a record from inside a panel leaves the panel open under it,
 *     as the drawer always did, and closing the record comes back to it.
 *
 * The router reads `hashchange` only (state/useRoute), and every entry here
 * has the URL of the page under it, so none of this changes the route.
 */
import { useEffect, useRef } from 'react';

const KEY = 'flPanel';
type Entry = { [KEY]?: number } | null;

let seq = 0;
/** The panels open now, by their entry's number. */
const open = new Set<number>();
/** A `history.back()` of ours is on its way; a navigation asked for meanwhile
 *  waits for it, so it lands on the page and not under the entry. */
let popping = false;
let queued: (() => void)[] = [];

const ours = (): number | undefined => (history.state as Entry)?.[KEY];

let wired = false;
function wire(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('popstate', () => {
    if (popping) {
      popping = false;
      const q = queued; queued = [];
      q.forEach(f => f());
      return;
    }
    /* Landed on an entry whose panel is gone: step over it. */
    const n = ours();
    if (n !== undefined && !open.has(n)) history.back();
  });
}

/** Run a navigation once any back of ours has finished (state/useRoute nav). */
export function afterPanelBack(go: () => void): void {
  if (popping) queued.push(go); else go();
}

/** Take a closed panel's entry off the top, if it is still there. */
function takeOff(n: number): void {
  if (ours() !== n) return;
  popping = true;
  history.back();
  /* A browser that never answers (a page being torn down) must not hold
     navigation up for ever. */
  setTimeout(() => {
    if (!popping) return;
    popping = false;
    const q = queued; queued = [];
    q.forEach(f => f());
  }, 400);
}

/** While `isOpen`, the back button closes this panel. */
export function useBackCloses(isOpen: boolean, onClose: () => void): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    wire();
    const n = ++seq;
    const href = location.href;
    /* A spent entry on top is reused rather than stacked on. */
    const top = ours();
    if (top !== undefined && !open.has(top)) history.replaceState({ [KEY]: n }, '', href);
    else history.pushState({ [KEY]: n }, '', href);
    open.add(n);
    let backed = false;
    const onPop = () => {
      /* Back past this panel's entry, on the same page: it closes. A move to
         another URL (a record opened over the page, another page) is not
         ours to answer — the panel stays, or goes with its page. */
      if (location.href === href && ours() !== n) {
        backed = true;
        close.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      open.delete(n);
      if (!backed) setTimeout(() => takeOff(n), 0);
    };
  }, [isOpen]);
}
