/* The period lens — the board shows NOW, and time is a lens you choose.
 *
 * Why it exists: an unwindowed Pareto is an all-time accumulation — fix a
 * problem in March and its bar still towers in September, because months of
 * dead history are baked in. The board fossilizes. So every Pareto view is
 * scoped to a rolling window, defaulting to the same recent-truth horizon the
 * baseline, the prize line and the Line's £-heat already use (~4 weeks).
 * Flipping between periods IS the trend, told in the Pareto's own vocabulary.
 *
 * Rolling days (not calendar weeks) so today's log lands on the board the
 * moment it's made — the live wow stays alive. */

export type PeriodKey = '4w' | '12w' | 'year' | 'all';

export const PERIODS: ReadonlyArray<{ key: PeriodKey; label: string; word: string; days: number | null }> = [
  { key: '4w', label: '4 wks', word: 'last 4 weeks', days: 28 },
  { key: '12w', label: '12 wks', word: 'last 12 weeks', days: 84 },
  { key: 'year', label: 'Year', word: 'last 12 months', days: 365 },
  { key: 'all', label: 'All', word: 'all time', days: null },
];

export const DEFAULT_PERIOD: PeriodKey = '4w';

export function asPeriod(raw: string | null): PeriodKey {
  return PERIODS.some(p => p.key === raw) ? (raw as PeriodKey) : DEFAULT_PERIOD;
}

/** Epoch ms cutoff for a period — 0 means everything. */
export function periodCutoff(key: PeriodKey, now = Date.now()): number {
  const days = PERIODS.find(p => p.key === key)!.days;
  return days == null ? 0 : now - days * 24 * 3600_000;
}

export const periodWord = (key: PeriodKey): string => PERIODS.find(p => p.key === key)!.word;
