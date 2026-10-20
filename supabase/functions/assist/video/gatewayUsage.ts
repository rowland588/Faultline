// COPIED FROM src/lib/video by scripts/sync-assist.mjs — edit the source, then run it.
/* WHAT NAMING THE WORK COSTS, AND A PERSON'S DAY — the one cost control on
 * the camera's AI (docs/VIDEO.md; docs/DIRECTION.md: the only AI is the voice
 * and the camera). The gateway (supabase/functions/assist, task `video-label`)
 * prices every answer by its model and holds a person to an allowance a day,
 * by number and by cost, kept in assist_usage (supabase/ASSIST_USAGE.sql).
 * Copied into the gateway by scripts/sync-assist.mjs; this is the source. */

/** $ per million tokens, input and output (the claude-api reference, 6 October 2026). */
export const PRICES: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-fable-5-1': [10, 50],
};

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** What one answer cost, in millionths of a dollar — cache reads at a tenth,
 *  cache writes at a quarter more, as the API bills them. An unknown model
 *  is priced as the dearest, so a budget never runs over by a mistake. */
export function costMicros(model: string, u: Usage): number {
  const [inP, outP] = PRICES[model] ?? [10, 50];
  const cached = u.cache_read_input_tokens ?? 0, written = u.cache_creation_input_tokens ?? 0;
  const dollars = ((u.input_tokens ?? 0) * inP + cached * inP * 0.1 + written * inP * 1.25 + (u.output_tokens ?? 0) * outP) / 1_000_000;
  return Math.round(dollars * 1_000_000);
}

export interface Allowance { calls: number; micros: number }

/** May this person ask again today? Counted over the last 24 hours of their
 *  own answers, by number and by cost. */
export function allowance(rows: readonly { at: string | number; cost_micros: number | null }[], now: number, limit: Allowance): { ok: boolean; why?: string; used: Allowance } {
  const since = now - 86_400_000;
  const mine = rows.filter(r => (typeof r.at === 'number' ? r.at : Date.parse(r.at)) > since);
  const used = { calls: mine.length, micros: mine.reduce((n, r) => n + (r.cost_micros ?? 0), 0) };
  if (used.calls >= limit.calls) return { ok: false, why: `That is ${limit.calls} readings named in a day — the allowance comes back over the next 24 hours. Name the work as you review meanwhile.`, used };
  if (used.micros >= limit.micros) return { ok: false, why: `Today's allowance for naming the work is spent ($${(limit.micros / 1e6).toFixed(2)}). Name it as you review meanwhile.`, used };
  return { ok: true, used };
}
