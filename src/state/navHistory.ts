/** Header Back returns to the previous page, skipping filters, selections and panel entries.
 * Browser positions keep this one native move, preserving Forward and the phone's sheet-closing Back.
 * The trail is session-only; unindexed trails from older releases start safely at the current page. */
const KEY = 'fl-nav-trail';
const POSITION = 'flNavPosition';
const MAX = 60;
export interface NavEntry { hash: string; position: number }

/** Explicit page tabs/record subjects matter; filters, drill paths, panels and presentation markers do not. */
export function pageKey(hash: string): string {
  const [path, qs] = (hash.replace(/^#/, '') || '/').split('?');
  const q = new URLSearchParams(qs ?? ''), subject = new URLSearchParams();
  for (const key of ['line', 'project', 'client', 'site', 'area', 'c']) {
    const value = q.get(key); if (value) subject.set(key, value);
  }
  if (/^\/(room|lines\/[^/]+|project\/[^/]+)\/?$/.test(path)) {
    const view = q.get('view'); if (view && view !== 'overview') subject.set('view', view);
  }
  return path + (subject.size ? `?${subject.toString()}` : '');
}
export function step(trail: readonly NavEntry[], entry: NavEntry): NavEntry[] {
  return [...trail.filter(x => x.position < entry.position), entry].slice(-MAX);
}
export function previousPage(trail: readonly NavEntry[], hash: string, position: number): NavEntry | undefined {
  const key = pageKey(hash);
  return [...trail].reverse().find(x => x.position < position && pageKey(x.hash) !== key);
}
function read(): NavEntry[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((x): x is NavEntry => !!x && typeof x.hash === 'string' && Number.isSafeInteger(x.position) && x.position >= 0) : [];
  } catch { return []; }
}
let mem: NavEntry[] = [], position = 0, started = false;
const listeners = new Set<() => void>();
const here = (): string => typeof window === 'undefined' ? '#/' : window.location.hash || '#/';
const statePosition = (): number | undefined => {
  const n = (history.state as Record<string, unknown> | null)?.[POSITION];
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : undefined;
};
function write(entry: NavEntry): void {
  mem = step(mem, entry);
  try { sessionStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* the in-memory trail still works */ }
}
/** Preserve position when replacing a URL or panel without adding navigation. */
export function historyState(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...extra, [POSITION]: statePosition() ?? position };
}
/** Count same-URL panel entries too, so page Back can jump over them accurately. */
export function nextHistoryState(extra: Record<string, unknown> = {}): Record<string, unknown> {
  position = (statePosition() ?? position) + 1;
  return { ...extra, [POSITION]: position };
}
export function startTrail(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const known = statePosition();
  position = known ?? 0;
  mem = known === undefined ? [] : read();
  history.replaceState(historyState(history.state ?? {}), '', location.href);
  write({ hash: here(), position });
  window.addEventListener('popstate', () => {
    const n = statePosition(); if (n !== undefined) position = n;
  });
  window.addEventListener('hashchange', () => {
    const knownPosition = statePosition();
    if (knownPosition === undefined) {
      position++;
      history.replaceState(historyState(history.state ?? {}), '', location.href);
    } else position = knownPosition;
    write({ hash: here(), position });
    listeners.forEach(f => f());
  });
}
export function pageBackDistance(): number | undefined {
  const at = typeof window === 'undefined' ? position : statePosition() ?? position;
  const previous = previousPage(mem, here(), at);
  return previous ? at - previous.position : undefined;
}
export const canGoBack = (): boolean => pageBackDistance() !== undefined;
export function onTrail(f: () => void): () => void { listeners.add(f); return () => { listeners.delete(f); }; }
export const trailNow = (): readonly string[] => mem.map(x => x.hash);
