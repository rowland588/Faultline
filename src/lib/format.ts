/** Duration mm:ss (or h:mm:ss past an hour) from milliseconds. */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Compact "3m 20s" style, for totals in prose. */
export function fmtDurationWords(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** "just now" / "12m ago" / "3h ago" / a date for older. */
export function fmtRelative(at: number, ref: number = Date.now()): string {
  const diff = Math.max(0, ref - at);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "1" / "2" — a plural-aware count noun. */
export const plural = (n: number, one: string, many = one + 's'): string =>
  `${n} ${n === 1 ? one : many}`;

/** A short clock time, e.g. "14:32". */
export const fmtClock = (at: number): string =>
  new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
