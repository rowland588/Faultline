/* THE WAY BACK TO WHERE YOU WERE (9 November — Rowland: "going back out of a page is difficult .. never send you back to where
 * you was .. tools pages i have to press tools to get back, instead of the classic back").
 *
 * The installed app has no browser Back button, and the context bar's ‹ Factory / ‹ Projects goes UP to the scope's top,
 * never back to the page you came from. So the app keeps its own short trail of the pages visited in this session — the hashes,
 * in order — and the top bar's Back walks it with history.back(), exactly as a browser's Back would. A Back that has nowhere
 * to go (a deep link, a fresh start) goes up to the fallback instead, never out of the app.
 *
 * Kept in sessionStorage (this tab, this session — never synced), at most 60 entries; a page replaced in place (navReplace)
 * replaces the trail's last entry rather than adding one. */

const KEY = 'fl-nav-trail';
const MAX = 60;
let replacing = false;

function read(): string[] {
  try { const v = JSON.parse(sessionStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; }
}
function write(t: string[]): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(t.slice(-MAX))); } catch { /* private mode: the trail lives only as long as the page */ }
  mem = t.slice(-MAX);
}
let mem: string[] = typeof window === 'undefined' ? [] : read();

const here = (): string => (typeof window === 'undefined' ? '' : window.location.hash || '#/');

/** The trail after the page moved to `h`: back one when `h` is the page before, the last replaced when it was replaced in
 *  place, else `h` added. Pure — the rule the tests hold. */
export function step(trail: readonly string[], h: string, replaced = false): string[] {
  const t = [...trail];
  if (!t.length) return [h];
  if (t[t.length - 1] === h) return t;
  if (replaced) { t[t.length - 1] = h; return t; }
  if (t.length >= 2 && t[t.length - 2] === h) { t.pop(); return t; }
  t.push(h);
  return t.slice(-MAX);
}

/** Called before a page is replaced in place (useRoute navReplace), so the trail swaps its last entry. */
export function markReplace(): void { replacing = true; }

let started = false;
const listeners = new Set<() => void>();
/** Start following the page (once): the page we are on now begins the trail if it is empty. */
export function startTrail(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  mem = step(read(), here());
  write(mem);
  window.addEventListener('hashchange', () => {
    const r = replacing; replacing = false;
    write(step(mem, here(), r));
    listeners.forEach(f => f());
  });
}

/** Is there a page in this session to go back to? */
export const canGoBack = (): boolean => mem.length > 1;

/** Listen for the trail changing (for the Back button's state). */
export function onTrail(f: () => void): () => void { listeners.add(f); return () => { listeners.delete(f); }; }

/** The trail now — for tests. */
export const trailNow = (): readonly string[] => mem;
