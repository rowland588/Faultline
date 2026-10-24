/* HOW LINE CAPACITY'S FIGURES ARE WRITTEN — the formatting beside the sums
 * (docs/STEADY.md, S4). The arithmetic is in ./capacity and the sentences
 * that read it in ./capacitySays; this file only writes a number, a unit, a
 * time or a cycle as a person on the floor would say it, and imports nothing.
 */

/** Numbers as a person would say them: 62, 66.5, 0.13 — no trailing zeros. */
export function fmtN(n: number): string {
  const a = Math.abs(n);
  const d = a >= 100 ? 0 : a >= 1 ? 1 : 2;
  return String(Number(n.toFixed(d)));
}
/** A count as it is read off a board: 3,600. */
export const fmtBig = (n: number): string => Math.round(n).toLocaleString('en-GB');
/** A unit said once — "baskets" → "basket", "boxes" → "box". Typed units
 *  are usually plural; one of them reads in the singular. */
export const oneOf = (unit: string): string => {
  const u = unit.trim();
  if (!u) return 'one';
  if (/ies$/i.test(u)) return u.replace(/ies$/i, 'y');
  if (/(ss|sh|ch|x)es$/i.test(u)) return u.replace(/es$/i, '');
  return u.replace(/s$/i, '');
};

/** Seconds as a person reads a stopwatch: 6.9 s, 12 s. */
export const fmtSec = (sec: number): string => `${String(Number(sec.toFixed(sec < 10 ? 1 : 0)))} s`;

/** A longer wait as a person says it: 8.6 s, 45 s, 5 min 9 s, 1 h 20 min. */
export function fmtDur(sec: number): string {
  if (sec < 90) return fmtSec(sec);
  const m = Math.round(sec);
  if (m < 3600) { const mm = Math.floor(m / 60), ss = m % 60; return ss ? `${mm} min ${ss} s` : `${mm} min`; }
  const h = Math.floor(m / 3600), mm = Math.round((m % 3600) / 60);
  return mm ? `${h} h ${mm} min` : `${h} h`;
}

/** A time as it was typed, as a person says it: 8 s, 12.5 s, 5 min, 1 min 40 s. */
export const everyWords = (sec: number): string => (sec < 90 ? `${fmtN(sec)} s` : fmtDur(sec));

/** A cycle as typed: "a pallet every 5 min", "2 baskets every 20 s". */
export const cycleWords = (perCycle: number, cycleSec: number, unit: string): string =>
  perCycle === 1 ? `a ${oneOf(unit)} every ${everyWords(cycleSec)}` : `${fmtN(perCycle)} ${unit.trim() || 'units'} every ${everyWords(cycleSec)}`;
