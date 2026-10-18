/* WHO READS THE FOOTAGE — one interface, more than one reader (docs/VIDEO.md,
 * provider-independent analysis).
 *
 *   detection   WHEN each station worked: lib/video/detect, on the device,
 *               from the frames' movement. Always there; costs nothing.
 *   labelling   WHAT the work looks like: a vision model through the app's
 *               gateway (supabase/functions/assist, task "video-label"),
 *               only when the person asks for it on this study, only for
 *               the frames the detection picked, inside the study's limits.
 *               Off when the gateway is off, and said so.
 *
 * Another detector or another model is one more entry with the same shapes;
 * nothing that reads events depends on which wrote them. */
import { supabase } from '../../cloud/client';
import { checkLabels, VISION_LIMITS, type Label, type LabelEvent, type LabelFrame } from './visionCore';
import type { VideoEvent } from './record';

export interface Labeller {
  id: string;
  name: string;
  /** What leaves the device when it is used, in a sentence a person reads before saying yes. */
  sends: string;
  label(o: { objective: string; events: LabelEvent[]; frames: LabelFrame[] }): Promise<{ ok: true; labels: Label[]; model?: string } | { ok: false; off?: boolean; why: string }>;
}

const OFF = 'The assistant is not switched on, so the work is not named from the frames — name it yourself as you review; every figure is worked out the same.';

export const assistLabeller: Labeller = {
  id: 'assist-vision',
  name: 'The assistant, from the frames',
  sends: 'Sends a few small frames of each station — cropped to the station, no sound — through the app’s gateway to the assistant (Anthropic). It is told never to identify anyone.',
  async label(o) {
    if (!supabase) return { ok: false, off: true, why: OFF };
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, off: true, why: 'No signal — naming the work needs the cloud. Name it yourself as you review.' };
    if (o.frames.length > VISION_LIMITS.frames || o.events.length > VISION_LIMITS.events) return { ok: false, why: `At most ${VISION_LIMITS.frames} frames and ${VISION_LIMITS.events} events go to the assistant at once.` };
    try {
      const { data, error } = await supabase.functions.invoke('assist', { body: { task: 'video-label', objective: o.objective, events: o.events, frames: o.frames } });
      if (error) return { ok: false, off: true, why: OFF };
      const d = (data ?? {}) as { ok?: boolean; off?: boolean; why?: string; labels?: unknown; model?: string };
      if (d.off) return { ok: false, off: true, why: d.why || OFF };
      if (!d.ok) return { ok: false, why: d.why || 'The assistant could not name the work just now.' };
      return { ok: true, labels: checkLabels({ labels: d.labels }, o.events.map(e => e.id)), ...(d.model ? { model: d.model } : {}) };
    } catch { return { ok: false, off: true, why: OFF }; }
  },
};

/** A label put on its event: what the assistant saw and believes, kept apart; the boundaries and the review untouched. */
export function applyLabels(events: readonly VideoEvent[], labels: readonly Label[], o: { model?: string }): VideoEvent[] {
  return events.map(e => {
    const l = labels.find(x => x.id === e.id);
    if (!l || e.review !== 'candidate') return e;
    return {
      ...e, category: l.category, observed: l.observed, ...(l.inferred ? { inferred: l.inferred } : {}),
      confidence: Math.min(e.confidence, l.confidence || e.confidence),
      provenance: { ...e.provenance, provider: `${e.provenance.provider}+vision`, ...(o.model ? { model: o.model } : {}) },
    };
  });
}
