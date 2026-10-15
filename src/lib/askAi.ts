/* ASK, NARRATED — the line's facts handed to the `ask` edge function when a
 * question is not one lib/intelligence askLine answers itself (docs/upgrade-plan.md
 * F4). Only the figures go — sentences and numbers the tested functions made —
 * never a record, a stop, a person's name or another line. No network, no key
 * or any failure: null, and the app shows its own answers only. */
import { supabase } from '../cloud/client';
import type { LineFacts } from './intelligence';

/** The facts as the model may see them: figures and the app's own sentences. */
export function askFacts(f: LineFacts) {
  return {
    line: f.line, unit: f.unit,
    whatItCanMake: { says: f.rates.says, theoretical: f.rates.theoretical, demonstrated: f.rates.demonstrated, plannable: f.rates.plannable, confidence: f.rates.confidence.says },
    whereTheTimeWent: { says: f.fall.says, shifts: f.fall.shifts, bands: f.fall.bands.slice(0, 8).map(b => ({ loss: b.label, minutes: Math.round(b.min), machine: b.asset, onTheConstraint: b.onConstraint, pounds: b.labour != null || b.contribution != null ? Math.round((b.labour ?? 0) + (b.contribution ?? 0)) : undefined })) },
    constraint: f.constraint ? { held: f.constraint.name, products: f.constraint.products } : 'not known',
    constraintOverTime: f.trend.says,
    changedThisWeek: f.changes.map(c => c.says),
    nextWeeksOrders: f.load.says,
  };
}

export async function askNarrated(question: string, f: LineFacts): Promise<string | null> {
  if (!supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) return null;
  try {
    const { data, error } = await supabase.functions.invoke('ask', { body: { question: question.slice(0, 300), facts: askFacts(f) } });
    if (error || !data || data.off || typeof data.text !== 'string') return null;
    return data.text;
  } catch { return null; }
}
