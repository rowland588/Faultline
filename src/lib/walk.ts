/* THE FACTORY WALK (10 November, docs/FACTORY-WALK.md — Rowland: "I move around the factory, Luna moves with me").
 *
 * Kept on the AI Mode conversation, never on a record of its own:
 *   facts.position — where the person is now (a department, a line, a machine), how it is known and when;
 *   facts.walk     — the stops in the order they were made (the trail), the newest last;
 *   a photo turn's `where` — the place it was taken, stamped the moment it was taken;
 *   a photo turn's `filed` — the records the person CONFIRMED it belongs to (file_photo, a card): a link to the one photograph, never a
 *     copy. Where it was taken is not what it shows, so a page shows a photo only by a confirmed link, never by its stamp alone.
 *
 * Where the person IS is not what they are TALKING ABOUT: a move changes the position, the threads stay as they are (a move is offered
 * the open threads whose place is there). Pure. */
import type { TalkTurn } from '../tools/talk/talk';

export interface WalkPlace {
  client?: string;
  site?: string;
  /** The department or area, in the floor's words. */
  area?: string;
  departmentId?: string;
  lineId?: string;
  line?: string;
  machine?: string;
}
export interface WalkStop extends WalkPlace {
  at: number;
  /** said: the person said where they are; picked: chosen on the screen. */
  how: 'said' | 'picked';
  said?: string;
}
export type PhotoTarget = 'line' | 'machine' | 'department' | 'problem' | 'project';
export interface PhotoLink {
  id: string;
  to: PhotoTarget;
  /** The record: the line's id (line and machine), the department's, the problem's or the project's. */
  refId: string;
  /** A machine's name on its line (to = 'machine'). */
  machine?: string;
  label: string;
  at: number;
  by?: string;
  /** Confirmed by the person on its card — what the photo SHOWS is observed by them, never verified by Luna. */
  how: 'confirmed';
  why?: string;
}
export type WalkTurn = TalkTurn & { where?: WalkStop; filed?: PhotoLink[] };
export interface WalkFacts { position?: WalkStop; walk?: WalkStop[] }

export const WALK_MAX = 60;

/** The place in words, most general first — "Hull › Dispatch", "Line 3 › Bagger". */
export function placeSaid(p: WalkPlace | undefined): string {
  if (!p) return '';
  return [p.site, p.area, p.line, p.machine].map(x => x?.trim()).filter(Boolean).join(' › ');
}

const low = (s?: string) => (s ?? '').trim().toLowerCase();
/** Two places the same — the same line and machine, or the same department or area words when neither names a line. */
export function samePlace(a: WalkPlace | undefined, b: WalkPlace | undefined): boolean {
  if (!a || !b) return false;
  if (a.lineId || b.lineId) return a.lineId === b.lineId && low(a.machine) === low(b.machine);
  if (a.departmentId || b.departmentId) return a.departmentId === b.departmentId;
  return low(a.area) === low(b.area) && low(a.site) === low(b.site);
}

/** The trail with a stop added — none added when it is the place already last on it; the oldest dropped past WALK_MAX. */
export function walkWith(trail: readonly WalkStop[], stop: WalkStop): WalkStop[] {
  const last = trail[trail.length - 1];
  if (samePlace(last, stop)) return [...trail];
  return [...trail, stop].slice(-WALK_MAX);
}

export const isPhotoTurn = (t: Pick<TalkTurn, 'kind' | 'media' | 'struck'>): boolean => t.kind === 'photo' && !!t.media?.blobKey && !t.struck;

/** The photos taken at a stop: from its time to the next stop's (the last stop to now). */
export function photosAtStops(trail: readonly WalkStop[], turns: readonly WalkTurn[]): { stop: WalkStop; photos: WalkTurn[] }[] {
  const photos = turns.filter(isPhotoTurn);
  return trail.map((stop, i) => {
    const until = trail[i + 1]?.at ?? Infinity;
    return { stop, photos: photos.filter(p => p.at >= stop.at && p.at < until) };
  });
}

/** What a page asks for — the photos linked to it. */
export interface PhotoQuery { lineId?: string; machine?: string; departmentId?: string; projectId?: string; problemId?: string }

/** Does a confirmed link point at this page? A line's page also shows what is linked to a machine on it. */
export function linkMatches(l: PhotoLink, q: PhotoQuery): boolean {
  if (q.machine && q.lineId) return l.to === 'machine' && l.refId === q.lineId && low(l.machine) === low(q.machine);
  if (q.lineId) return (l.to === 'line' || l.to === 'machine') && l.refId === q.lineId;
  if (q.departmentId) return l.to === 'department' && l.refId === q.departmentId;
  if (q.projectId) return l.to === 'project' && l.refId === q.projectId;
  if (q.problemId) return l.to === 'problem' && l.refId === q.problemId;
  return false;
}

export interface WalkPhoto {
  conversationId: string;
  turnId: string;
  blobKey: string;
  mime: string;
  at: number;
  where: string;
  caption?: string;
  links: PhotoLink[];
}

/** The photographs from walks linked to a page, the newest first — read from the conversations, nothing copied. */
export function walkPhotosFor(conversations: readonly { id: string; facts: unknown; deletedAt?: number }[], q: PhotoQuery): WalkPhoto[] {
  const out: WalkPhoto[] = [];
  for (const c of conversations) {
    if (c.deletedAt) continue;
    const turns = ((c.facts as { turns?: WalkTurn[] }).turns ?? []);
    for (const t of turns) {
      if (!isPhotoTurn(t)) continue;
      const links = (t.filed ?? []).filter(l => linkMatches(l, q));
      if (!links.length) continue;
      out.push({ conversationId: c.id, turnId: t.id, blobKey: t.media?.blobKey as string, mime: t.media?.mime ?? 'image/jpeg', at: t.at, where: placeSaid(t.where), ...(t.text?.trim() ? { caption: t.text.trim() } : {}), links });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/** One photo in words for the colleague — its label, key, when, where taken and what it is filed to. */
export function photoSaid(label: string, t: WalkTurn): string {
  const when = new Date(t.at).toTimeString().slice(0, 5);
  const where = placeSaid(t.where);
  const filed = (t.filed ?? []).map(l => l.label);
  return `${label} = photoKey ${t.media?.blobKey} (taken ${when}${where ? ` at ${where}` : ', no place said'}${filed.length ? `; filed to ${filed.join(', ')}` : '; not filed'})`;
}
