// COPIED FROM src/tools/video by scripts/sync-assist.mjs — edit the source, then run it.
/* WHAT THE ASSISTANT IS ASKED ABOUT THE FRAMES, AND WHAT IS KEPT OF ITS
 * ANSWER (docs/VIDEO.md, AI analysis) — shared word for word with the
 * gateway (scripts/sync-assist.mjs copies it into supabase/functions/assist).
 *
 * Movement says WHEN a station worked; the assistant is asked only WHAT the
 * work looks like — from a few small frames of each candidate event, picked
 * by the movement reading, never every frame. It is told what it may not do:
 * name or identify anyone, estimate a time or a number (the app measures
 * those), or say more than the frames show. Its answer is held to a schema
 * and read again here; a label for an event it was not asked about, or of a
 * kind the study does not know, is dropped. Nothing it says changes an
 * event's boundaries or accepts it: a person still reviews every one. */
import { EVENT_CATEGORIES, type EventCategory } from './record.ts';

export const VISION_SYSTEM = `You label short stretches of factory footage for an industrial-engineering study of a production line.
For each event you are given a station, a temporary label for whoever works there (such as "Operator A"), its time span, and a few frames from inside it.
Say only what the frames show.
- category: one of ${EVENT_CATEGORIES.join(', ')} — work is adding to the product; handling is moving material or packs; walk is walking; wait is idle or waiting; stop is the line or machine stopped; other if none fits.
- observed: what is visible, in at most 20 plain words ("places a tray on the conveyor and presses it down").
- inferred: what the activity most likely is in the line's terms, in at most 12 words, or "" if the frames do not show it.
- confidence: 0 to 1, how clearly the frames show it.
Never identify, name or describe a person's face, body or identity — refer to people only by the label given. Do not estimate durations, counts or rates: the app measures those from the footage. If the frames are unclear, say so in observed and give a low confidence.`;

export const VISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['labels'],
  properties: {
    labels: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'category', 'observed', 'inferred', 'confidence'],
        properties: {
          id: { type: 'string' },
          category: { type: 'string', enum: [...EVENT_CATEGORIES] },
          observed: { type: 'string' },
          inferred: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

export interface LabelEvent { id: string; station: string; track: string; from: string; to: string }
export interface LabelFrame { event: string; at: string; data: string }

/** The limits the gateway holds the request to, before any frame is sent on. */
export const VISION_LIMITS = { events: 40, frames: 24, frameBytes: 400 * 1024 } as const;

/** The request in the model's terms: a line of text for each event, then its frames. */
export function visionUser(objective: string, events: readonly LabelEvent[], frames: readonly LabelFrame[]): unknown[] {
  const out: unknown[] = [{ type: 'text', text: `The study: ${objective.slice(0, 300) || 'a line balance — what each station is doing'}.` }];
  for (const e of events) {
    out.push({ type: 'text', text: `Event ${e.id}: ${e.station}, ${e.track}, ${e.from}–${e.to}.` });
    for (const f of frames.filter(x => x.event === e.id)) out.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } });
  }
  out.push({ type: 'text', text: 'Label each event above.' });
  return out;
}

export interface Label { id: string; category: EventCategory; observed: string; inferred?: string; confidence: number }

/** Keep a label only for an event that was asked about, of a kind the study knows, with its words trimmed. */
export function checkLabels(raw: unknown, asked: readonly string[]): Label[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { labels?: unknown }).labels) ? (raw as { labels: unknown[] }).labels : [];
  const seen = new Set<string>();
  const out: Label[] = [];
  for (const l of list) {
    if (!l || typeof l !== 'object') continue;
    const x = l as Record<string, unknown>;
    const id = typeof x.id === 'string' ? x.id : '';
    if (!asked.includes(id) || seen.has(id)) continue;
    if (typeof x.category !== 'string' || !(EVENT_CATEGORIES as readonly string[]).includes(x.category)) continue;
    const observed = typeof x.observed === 'string' ? x.observed.trim().slice(0, 200) : '';
    if (!observed) continue;
    const c = typeof x.confidence === 'number' && Number.isFinite(x.confidence) ? Math.max(0, Math.min(1, x.confidence)) : 0;
    const inferred = typeof x.inferred === 'string' ? x.inferred.trim().slice(0, 120) : '';
    seen.add(id);
    out.push({ id, category: x.category as EventCategory, observed, ...(inferred ? { inferred } : {}), confidence: c });
  }
  return out;
}
