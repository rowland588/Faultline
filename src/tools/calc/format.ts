/* THE WORDS FOR FIGURES — one set, so every calculator says 2,400, £15.31 and "3 hours" the same way
 * (a definition imports these; none writes its own toLocaleString). */

/** A number as people read it: thousands separated, at most `dp` decimals, none when whole. */
export const fmt = (n: number, dp = 1): string => {
  if (!Number.isFinite(n)) return '—';
  const r = Number(n.toFixed(dp));
  return (Object.is(r, -0) ? 0 : r).toLocaleString('en-GB', { maximumFractionDigits: dp, minimumFractionDigits: 0 });
};

/** A number with exactly `dp` decimals ("96.3"), thousands separated. */
export const fixed = (n: number, dp: number): string => (Number.isFinite(n) ? n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—');

/** Pounds: to the penny under a thousand, whole pounds above. */
export const gbp = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  return a >= 1000 ? `${s}£${Math.round(a).toLocaleString('en-GB')}` : `${s}£${a.toFixed(2)}`;
};

/** A share (0 to 1) as a percentage: "3.7%". */
export const pct = (x: number, dp = 1): string => `${fmt(x * 100, dp)}%`;

/** "1 tray", "8 trays". */
export const plural = (n: number, one: string, many = `${one}s`): string => `${fmt(n, 0)} ${n === 1 ? one : many}`;

/** A time given in hours, said the way the floor would: "24 minutes", "3 hours", "1.5 hours", "1.3 days". */
export function duration(hours: number): string {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 1) { const m = Math.round(hours * 60); return `${m} minute${m === 1 ? '' : 's'}`; }
  if (hours < 24) return `${fmt(hours, 1)} hour${fmt(hours, 1) === '1' ? '' : 's'}`;
  const d = hours / 24;
  return `${fmt(d, 1)} day${fmt(d, 1) === '1' ? '' : 's'}`;
}

/** "a, b and c". */
export const andList = (xs: string[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
