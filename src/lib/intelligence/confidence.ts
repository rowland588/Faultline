/* HOW FAR A FIGURE CAN BE TRUSTED — said beside it, never hidden in it
 * (docs/upgrade-plan.md F1; the brief: "ranges instead of fake precision when
 * data is thin"). Every number the floor's records make is as good as the
 * days and the events behind it: a Pareto of three stops reads like one of
 * three hundred unless it says otherwise.
 *
 *   none   nothing logged in the period
 *   thin   under a week of days, or under 20 events — said as a range
 *   fair   under three weeks, or under 60 events
 *   solid  three weeks and 60 events or more
 *
 * Pure. */
export type Level = 'none' | 'thin' | 'fair' | 'solid';

export interface Confidence {
  level: Level;
  /** Distinct days with something logged. */
  days: number;
  events: number;
  /** "solid — 34 days, 412 stops" · "thin — 3 days, 12 stops". */
  says: string;
}

export const THIN_DAYS = 7, THIN_EVENTS = 20, FAIR_DAYS = 21, FAIR_EVENTS = 60;

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** From the moments things were logged. `what` names the events ("stop", "shift"). */
export function confidenceOf(at: readonly number[], what = 'event'): Confidence {
  const events = at.length;
  const days = new Set(at.map(t => new Date(t).toDateString())).size;
  const level: Level = events === 0 ? 'none'
    : days < THIN_DAYS || events < THIN_EVENTS ? 'thin'
      : days < FAIR_DAYS || events < FAIR_EVENTS ? 'fair' : 'solid';
  const says = level === 'none' ? `nothing logged yet` : `${level} — ${plural(days, 'day')}, ${plural(events, what)}`;
  return { level, days, events, says };
}

/** The share of a sorted list at or below which `p` of it lies (0–1),
 *  interpolated — the 20th percentile is what four in five beat. */
export function percentile(values: readonly number[], p: number): number | undefined {
  const xs = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!xs.length) return undefined;
  if (xs.length === 1) return xs[0];
  const at = Math.min(1, Math.max(0, p)) * (xs.length - 1);
  const lo = Math.floor(at), hi = Math.ceil(at);
  return xs[lo] + (xs[hi] - xs[lo]) * (at - lo);
}

/** A figure said honestly for its confidence: thin as a range (the
 *  20th–80th percentile of what was seen), else the figure. */
export function honest(values: readonly number[], c: Confidence, fmt: (n: number) => string): string {
  if (c.level === 'none' || !values.length) return 'not known yet';
  if (c.level === 'thin' && values.length > 1) {
    const lo = percentile(values, 0.2) as number, hi = percentile(values, 0.8) as number;
    return Math.abs(hi - lo) < 1e-9 ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
  }
  return fmt(percentile(values, 0.5) as number);
}
