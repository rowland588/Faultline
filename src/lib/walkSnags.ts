/* WHAT THE WALK FOUND, ON THE PLAN — the snags pinned on frames of the filmed
 * walk, as one lane of the Gantt.
 *
 * Rowland: "put walk snags on the plan … as long as it doesn't become
 * overcrowded — it needs to be clear, using lean manufacturing principles,
 * visual management."
 *
 * So the rules are the visual-management ones:
 *   - ONE LANE, never a row per snag. The plan is still the plan.
 *   - A MARKER PER DAY FOUND, merged into weeks (or fortnights, or months) when
 *     the days are too narrow to tell apart — a marker never sits on another.
 *   - THE NUMBER IS WHAT IS STILL OPEN. Red ring: open. Solid red: one of them
 *     is past the day it was promised. A small green dot: all of them closed —
 *     normal recedes, abnormal stands out.
 *   - THE LABEL SAYS THE STATE IN WORDS — "3 open · 1 past due · 5 closed" —
 *     so the lane is read without counting dots.
 *   - TAP FOR THE DETAIL: the frame, the pin, who has it, by when.
 *
 * Nothing new is stored. A walk snag is the same Snag record the Evidence tab
 * keeps; this only reads it. A frame does not say which machine it shows, so
 * the snags are not guessed onto a stage — they keep their own lane, and the
 * panel says where on the line each one is (the frame's name and its pin).
 */
import type { Snag, SnagAsset } from '../snag/types';
import { todayISO } from './weeks';

export interface WalkSnag {
  id: string;
  what: string;
  state: 'open' | 'in_progress' | 'closed';
  /** The day it was found. */
  found: string;
  /** The day it was promised for, if one was agreed. */
  due?: string;
  owner?: string;
  wsId: string;
  frameId: string;
  frameName?: string;
  stillKey?: string;
  x?: number;
  y?: number;
}

const iso = (ms: number) => todayISO(new Date(ms));

/** The snags pinned on a frame of the walk — not the board actions, which
 *  share the record but were raised from a Pareto, not found on the line. */
export function walkSnagsOf(rows: { wsId: string; snags: Snag[]; frames: SnagAsset[] }[]): WalkSnag[] {
  return rows.flatMap(({ wsId, snags, frames }) => snags
    .filter(s => !s.deletedAt && !!s.assetId)
    .map(s => {
      const f = frames.find(a => a.id === s.assetId);
      return {
        id: s.id, what: s.problem, state: s.status, found: iso(s.raisedAt), wsId, frameId: s.assetId as string,
        ...(s.dueAt ? { due: iso(s.dueAt) } : {}),
        ...(s.owner ? { owner: s.owner } : {}),
        ...(f ? { frameName: f.name, stillKey: f.stillKey } : {}),
        ...(s.xPct != null ? { x: s.xPct } : {}),
        ...(s.yPct != null ? { y: s.yPct } : {}),
      };
    }));
}

export const isLate = (s: WalkSnag, today: string) => s.state !== 'closed' && !!s.due && s.due < today;

/** "3 open · 1 past due · 5 closed" */
export function walkWords(list: WalkSnag[], today: string): string {
  const open = list.filter(s => s.state !== 'closed').length;
  const late = list.filter(s => isLate(s, today)).length;
  const closed = list.length - open;
  if (!open) return closed ? `all ${closed} closed` : '';
  return [`${open} open`, late ? `${late} past due` : '', closed ? `${closed} closed` : ''].filter(Boolean).join(' · ');
}

/** The lane on a calendar: each day something was found, with its snags. */
export interface WalkDay { at: number; iso: string; ids: string[]; open: number; late: number }
export interface WalkLane { days: WalkDay[]; open: number; late: number; closed: number; words: string }

/** A marker on the drawn lane — one day, or several merged. */
export interface WalkMarker { start: number; span: number; ids: string[]; open: number; late: number }

/** The fewest days a marker may stand for so markers never touch: a day, a
 *  week, a fortnight or four weeks. The calendar starts on a Monday, so a week
 *  marker is a calendar week. */
export function walkMarkers(lane: WalkLane, px: number, minPx = 22): WalkMarker[] {
  const size = [1, 7, 14, 28].find(n => n * px >= minPx) ?? 28;
  const out = new Map<number, WalkMarker>();
  for (const d of lane.days) {
    const b = Math.floor(d.at / size);
    const m = out.get(b) ?? { start: b * size, span: size, ids: [], open: 0, late: 0 };
    m.ids.push(...d.ids); m.open += d.open; m.late += d.late;
    out.set(b, m);
  }
  return [...out.values()].sort((a, b) => a.start - b.start);
}
