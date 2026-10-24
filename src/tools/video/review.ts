/* A PERSON'S REVIEW OF THE EVENTS (docs/VIDEO.md, human verification).
 *
 * Every change a person makes to an event goes through here, pure: a boundary
 * moved, a kind changed, two events merged, one split, one accepted or
 * rejected, one added by hand. What the analysis first proposed is kept on
 * the event (`proposed`), so the record always says what the machine saw and
 * what a person decided, and a report can be made again from either. Each
 * result is checked by lib/video/validate before it is kept. */
import type { EventCategory, VideoEvent } from './record';

export interface Reviewer { by: string; at: number }

const kept = (e: VideoEvent): VideoEvent['proposed'] => e.proposed ?? { start: e.start, end: e.end, category: e.category, zone: e.zone };

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Accept or reject one — the person's word; a rejected event counts for nothing and stays on the record. */
export function decide(e: VideoEvent, review: 'accepted' | 'rejected' | 'candidate', r: Reviewer): VideoEvent {
  return { ...e, review, by: r.by, at: r.at };
}

/** A boundary moved: the event's own start or end set to a time in the footage. Accepted by the move. */
export function setBoundary(e: VideoEvent, which: 'start' | 'end', sec: number, r: Reviewer): VideoEvent | { error: string } {
  const t = round(sec);
  const start = which === 'start' ? t : e.start, end = which === 'end' ? t : e.end;
  if (!(end > start)) return { error: which === 'start' ? 'The start must come before the end.' : 'The end must come after the start.' };
  return { ...e, start, end, proposed: kept(e), review: 'accepted', basis: e.basis, by: r.by, at: r.at,
    frames: [...new Set([...e.frames.filter(f => f >= start && f <= end), start, end])].sort((a, b) => a - b) };
}

/** What kind of event it is, or which station — a person's correction. */
export function reclassify(e: VideoEvent, o: { category?: EventCategory; zone?: string; track?: string; inferred?: string }, r: Reviewer): VideoEvent {
  return { ...e, ...(o.category ? { category: o.category } : {}), ...(o.zone ? { zone: o.zone } : {}),
    ...(o.track !== undefined ? { track: o.track } : {}), ...(o.inferred !== undefined ? { inferred: o.inferred.trim() || undefined } : {}),
    proposed: kept(e), review: 'accepted', by: r.by, at: r.at };
}

/** TWO EVENTS MADE ONE — at one station, the first's id kept, spanning both. */
export function merge(a: VideoEvent, b: VideoEvent, r: Reviewer): VideoEvent | { error: string } {
  if (a.zone !== b.zone) return { error: 'Only events at the same station can be merged.' };
  const [x, y] = a.start <= b.start ? [a, b] : [b, a];
  return { ...x, start: Math.min(x.start, y.start), end: Math.max(x.end, y.end), proposed: kept(x),
    frames: [...new Set([...x.frames, ...y.frames])].sort((p, q) => p - q), confidence: Math.min(x.confidence, y.confidence),
    observed: x.observed === y.observed ? x.observed : `${x.observed}; ${y.observed}`, review: 'accepted', by: r.by, at: r.at };
}

/** ONE EVENT MADE TWO at a time inside it — the second gets a new id. */
export function split(e: VideoEvent, at: number, newId: string, r: Reviewer): [VideoEvent, VideoEvent] | { error: string } {
  const t = round(at);
  if (!(t > e.start && t < e.end)) return { error: 'Split it at a time inside it — play to the moment, then split.' };
  const base = { proposed: kept(e), review: 'accepted' as const, by: r.by, at: r.at };
  return [
    { ...e, ...base, end: t, frames: [...e.frames.filter(f => f <= t), t] },
    { ...e, ...base, id: newId, start: t, frames: [t, ...e.frames.filter(f => f >= t)] },
  ];
}

/** AN EVENT ADDED BY HAND — seen by a person, at a time they played to. */
export function byHand(o: { id: string; start: number; end: number; zone: string; track?: string; category: EventCategory; observed?: string }, r: Reviewer): VideoEvent {
  return {
    id: o.id, start: round(o.start), end: round(o.end), zone: o.zone, ...(o.track ? { track: o.track } : {}), category: o.category,
    observed: o.observed?.trim() || 'Marked by a person', confidence: 1, frames: [round(o.start), round(o.end)],
    basis: 'person', review: 'accepted', by: r.by, at: r.at, provenance: { provider: 'person', version: '1' },
  };
}

/** Accept every candidate at once — for a reading the person has watched through. */
export function acceptAll(events: readonly VideoEvent[], r: Reviewer): VideoEvent[] {
  return events.map(e => (e.review === 'candidate' ? decide(e, 'accepted', r) : e));
}
