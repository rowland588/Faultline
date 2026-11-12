// COPIED FROM src/tools/video by scripts/sync-assist.mjs — edit the source, then run it.
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
  /** The cache writes by how long they are kept — a 1-hour write costs twice the input price, a 5-minute one a quarter more. */
  cache_creation?: { ephemeral_5m_input_tokens?: number | null; ephemeral_1h_input_tokens?: number | null } | null;
}

/** A cache read as a share of the input price: a twentieth on Opus 5.5 and Sonnet 5.5 ($0.20 and $0.10 a million — the claude-api
 *  reference, 3 November 2026), a tenth elsewhere. It was a tenth for every model until 12 November, which overstated what Luna cost. */
export const CACHE_READ: Record<string, number> = { 'claude-opus-5-5': 0.05, 'claude-sonnet-5-5': 0.05 };
/** The parts of an answer's input, apart: fresh, read from the cache, written for five minutes, written for an hour. */
export function usageParts(u: Usage): { fresh: number; read: number; write5m: number; write1h: number; out: number } {
  const written = u.cache_creation_input_tokens ?? 0;
  const h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const m = u.cache_creation ? (u.cache_creation.ephemeral_5m_input_tokens ?? Math.max(0, written - h)) : written;
  return { fresh: u.input_tokens ?? 0, read: u.cache_read_input_tokens ?? 0, write5m: m, write1h: h, out: u.output_tokens ?? 0 };
}

/** What one answer cost, in millionths of a dollar — cache reads at the model's own share (CACHE_READ), cache writes at a
 *  quarter more for five minutes and double for an hour, as the API bills them. An unknown model is priced as the dearest,
 *  so a budget never runs over by a mistake. */
export function costMicros(model: string, u: Usage): number {
  const [inP, outP] = PRICES[model] ?? [10, 50];
  const p = usageParts(u);
  const dollars = (p.fresh * inP + p.read * inP * (CACHE_READ[model] ?? 0.1) + p.write5m * inP * 1.25 + p.write1h * inP * 2 + p.out * outP) / 1_000_000;
  return Math.round(dollars * 1_000_000);
}

export interface Allowance { calls: number; micros: number }

/** What a refusal says — by number, and by cost (in dollars, two places). */
export interface AllowanceWords { calls: (n: number) => string; spent: (usd: string) => string }

const NAMING: AllowanceWords = {
  calls: n => `That is ${n} readings named in a day — the allowance comes back over the next 24 hours. Name the work as you review meanwhile.`,
  spent: usd => `Today's allowance for naming the work is spent ($${usd}). Name it as you review meanwhile.`,
};

/** May this person ask again today? Counted over the last 24 hours of their
 *  own answers, by number and by cost — each task its own allowance, said in
 *  its own words (Line Talk's answers: lib/talkAssist TALK_ALLOWANCE). */
export function allowance(rows: readonly { at: string | number; cost_micros: number | null }[], now: number, limit: Allowance, say: AllowanceWords = NAMING): { ok: boolean; why?: string; used: Allowance } {
  const since = now - 86_400_000;
  const mine = rows.filter(r => (typeof r.at === 'number' ? r.at : Date.parse(r.at)) > since);
  const used = { calls: mine.length, micros: mine.reduce((n, r) => n + (r.cost_micros ?? 0), 0) };
  if (used.calls >= limit.calls) return { ok: false, why: say.calls(limit.calls), used };
  if (used.micros >= limit.micros) return { ok: false, why: say.spent((limit.micros / 1e6).toFixed(2)), used };
  return { ok: true, used };
}
