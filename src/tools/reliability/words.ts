/* THE WORDS A RELIABILITY STUDY SAYS ITS FIGURES IN — plurals, spans of time,
 * rates and pounds. Split out of reliability.ts so the repair, growth and
 * Weibull modules can say figures without importing it (reliability.ts
 * re-exports plural, span and perHour, so every old import still works).
 * Pure. */

/** One event, more than one: "stop" → "stops", "pick" → "picks", "batch" → "batches". */
export function plural(word: string, n = 2): string {
  const w = word.trim() || 'event';
  if (n === 1) return w;
  if (/[^aeiou]y$/i.test(w)) return `${w.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(w)) return `${w}es`;
  return `${w}s`;
}

/** "an hour of running", in the time a person says it: 40 s, 47 min, 3.2 h. */
export function span(h: number): string {
  if (!Number.isFinite(h)) return '—';
  const min = h * 60;
  if (min < 1) return `${Math.round(min * 60)} s`;
  if (min < 120) return `${min < 10 ? +min.toFixed(1) : Math.round(min)} min`;
  return `${+h.toFixed(h < 10 ? 1 : 0)} h`;
}

/** The same, from minutes — a repair time. */
export const mins = (m: number): string => span(m / 60);

/** A rate an hour, said: "1.3 an hour", "0.05 an hour". */
export function perHour(r: number): string {
  if (!Number.isFinite(r)) return '—';
  const v = r >= 10 ? Math.round(r) : r >= 1 ? +r.toFixed(1) : +r.toPrecision(2);
  return `${v} an hour`;
}

export const gbp = (n: number): string => `£${n >= 100 ? Math.round(n).toLocaleString('en-GB') : n.toFixed(2)}`;
export const pct = (f: number): string => `${Math.round(f * 100)}%`;

/** A figure to two or three significant places for a sentence: 2.74, 0.51, 281. */
export const sig = (x: number): string => (Math.abs(x) >= 100 ? String(Math.round(x)) : String(+x.toPrecision(Math.abs(x) >= 10 ? 3 : 2)));
/** "1,033" — a count of hours or cycles with thousands. */
export const num = (x: number): string => Math.round(x).toLocaleString('en-GB');
