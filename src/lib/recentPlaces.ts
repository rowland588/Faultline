/* WHERE YOU WERE, ON THIS DEVICE (docs/STRUCTURE.md §5.6, D4, B5) — the Factory page (the one home since
 * 23 October) carries you back to the places you were last, a project's or a line's page.
 * Kept in this browser only (a convenience, never a record): the frame notes each place as it is
 * opened (ui/Frame), Home lists the last few. Nothing here is synced or shared. */

export interface Place {
  /** The address, as nav() takes it — without the one-off parts of a query (save, add, open, new). */
  to: string;
  /** The project's or the line's name. */
  scope: string;
  /** The page in it — "Commission", "Problems", a tool's name. */
  page?: string;
  kind: 'project' | 'line';
  at: number;
}

const KEY = 'faultline.recentPlaces';
const KEEP = 8;
/** The parts of an address that do something once, never a place to come back to. */
const ONCE = new Set(['save', 'add', 'open', 'new', 'doc']);

/** The address with its one-off parts taken off. */
export function placeAddress(to: string): string {
  const [path, query = ''] = to.split('?');
  const q = new URLSearchParams(query);
  for (const k of [...q.keys()]) if (ONCE.has(k)) q.delete(k);
  const rest = q.toString();
  return rest ? `${path}?${rest}` : path;
}

/** The list with this place first: one entry an address, and one a scope — the page in it that was
 *  open last is where you were in it. */
export function remember(list: readonly Place[], place: Place): Place[] {
  const to = placeAddress(place.to);
  return [{ ...place, to }, ...list.filter(p => p.to !== to && p.scope !== place.scope)].slice(0, KEEP);
}

export function recentPlaces(): Place[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? (v as Place[]).filter(p => p && typeof p.to === 'string' && typeof p.scope === 'string') : [];
  } catch { return []; }
}

export function notePlace(place: Place): void {
  try { localStorage.setItem(KEY, JSON.stringify(remember(recentPlaces(), place))); } catch { /* a private window — Home simply has none */ }
}

/** When a line is archived or deleted — drop it from carry-on on this device. */
export function dropRecentLine(wsId: string): void {
  const raw = recentPlaces();
  const kept = raw.filter(p => p.kind !== 'line' || lineIdFromPlace(p.to) !== wsId);
  if (kept.length === raw.length) return;
  try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* private window */ }
}

/** Line workspace id from a remembered address — every shape a line's page wears: `/lines/:ws/...`,
 *  a list narrowed to it (`/programs?line=<id>`, lib/scope LINE_LISTS) or a record of it
 *  (`/w/:ws/...`). It read only `/lines/:ws`, so the scrub of archived lines (recentPlacesLive,
 *  29 October) threw away a LIVE line remembered on its Programs tab, and the Factory page lost
 *  its carry-on row (found 30 October, scripts/acceptance/front-door.mjs check 4). */
export function lineIdFromPlace(to: string): string | undefined {
  const path = placeAddress(to).replace(/^#/, '');
  const [bare, query = ''] = path.split('?');
  const segs = bare.split('/').filter(Boolean);
  const raw = ((segs[0] === 'lines' || segs[0] === 'w') && segs[1]) || new URLSearchParams(query).get('line') || undefined;
  if (!raw) return undefined;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

/** Project id from a remembered address. */
export function projectIdFromPlace(to: string): string | undefined {
  const path = placeAddress(to).replace(/^#/, '');
  const segs = path.split('?')[0].split('/').filter(Boolean);
  if (segs[0] !== 'project' || !segs[1]) return undefined;
  try { return decodeURIComponent(segs[1]); } catch { return segs[1]; }
}

/** When a place was last open — "at 09:12" today, else the day. */
export function lastOpen(at: number, today: string, niceDay: (iso: string) => string): string {
  const d = new Date(at);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return day === today ? `at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : niceDay(day);
}
