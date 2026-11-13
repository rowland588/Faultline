/* WHY EACH STOP HAPPENED (FC-241 part 7, knowledge/specs/FC-241-workstation-stops.md — Rowland, 13 November, timing Cellox live: "we need
 * additional reasons to the stop").
 *
 * Every stop timed with the Stopped button is kept as its own line — which workstation, when it began, how long, and why (said by the
 * person watching; never required) — in one text field of the record, so it travels and syncs as every figure does:
 *     i~startMs~minutes~reason ; i~startMs~minutes~reason ; …      (the reason URI-encoded, so any character is safe)
 * From those lines: the reasons ranked by what they cost. A reason is a description recorded at the time, not a root cause; what has no
 * reason is its own line of the ranking, never shared out among the others. Pure. */

export interface StopDone { i: number; at: number; min: number; why: string }
export interface ReasonRow { why: string; min: number; stops: number; lost: number; share: number | null; most?: { i: number; min: number } }
export interface ByReason { rows: ReasonRow[]; none: { min: number; stops: number; lost: number; share: number | null }; said: number }

const key = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();
export const tidyReason = (s: string): string => s.trim().replace(/\s+/g, ' ').slice(0, 60);

export function parseStops(txt: unknown): StopDone[] {
  if (typeof txt !== 'string' || !txt) return [];
  return txt.split(';').flatMap(p => {
    const [i, at, min, why] = p.split('~');
    const n = Number(i), a = Number(at), m = Number(min);
    if (i === '' || !at || min === undefined || min === '' || !Number.isInteger(n) || n < 0 || !Number.isFinite(a) || a <= 0 || !Number.isFinite(m) || m < 0) return [];
    let w = '';
    try { w = tidyReason(decodeURIComponent(why ?? '')); } catch { w = ''; }
    return [{ i: n, at: a, min: m, why: w }];
  });
}
export const formatStops = (list: readonly StopDone[]): string => list.map(s => `${s.i}~${s.at}~${s.min}~${encodeURIComponent(tidyReason(s.why)).replace(/~/g, '%7E')}`).join(';');

/** The reasons used on this record, the most used first — each as it was first written. */
export function reasonsKnown(list: readonly StopDone[]): string[] {
  const by = new Map<string, { said: string; n: number; first: number }>();
  list.forEach((s, k) => { if (!s.why) return; const e = by.get(key(s.why)); if (e) e.n += 1; else by.set(key(s.why), { said: s.why, n: 1, first: k }); });
  return [...by.values()].sort((a, b) => b.n - a.n || a.first - b.first).map(e => e.said);
}

/** The stops ranked by reason. `minOf(i)` is the workstation's minutes as its box holds them (what the answer uses), `rateOf(i)` what a
 *  minute stopped there loses. A workstation whose box holds less than its timed stops add up to has them scaled down in proportion;
 *  one whose box holds more has the difference as "no reason given". */
export function byReason(list: readonly StopDone[], stations: number, minOf: (i: number) => number, rateOf: (i: number) => number): ByReason {
  const rows = new Map<string, ReasonRow & { by: Map<number, number> }>();
  const none = { min: 0, stops: 0, lost: 0 };
  let said = 0;
  for (let i = 0; i < stations; i++) {
    const mine = list.filter(s => s.i === i);
    const logged = mine.reduce((t, s) => t + s.min, 0), box = minOf(i), rate = rateOf(i);
    const f = logged > box && logged > 0 ? box / logged : 1;
    for (const s of mine) {
      const m = s.min * f;
      if (!s.why) { none.min += m; none.stops += 1; none.lost += m * rate; continue; }
      said += 1;
      const k = key(s.why);
      const r = rows.get(k) ?? { why: s.why, min: 0, stops: 0, lost: 0, share: null, by: new Map<number, number>() };
      r.min += m; r.stops += 1; r.lost += m * rate; r.by.set(i, (r.by.get(i) ?? 0) + m);
      rows.set(k, r);
    }
    /* minutes in the box no timed stop accounts for (typed by hand): no reason, and no stop to count */
    if (box > logged + 1e-9) { none.min += box - logged; none.lost += (box - logged) * rate; }
  }
  const total = [...rows.values()].reduce((t, r) => t + r.lost, 0) + none.lost;
  const totalMin = [...rows.values()].reduce((t, r) => t + r.min, 0) + none.min;
  /* ranked by what was lost; where no rate is given (nothing lost anywhere) by the minutes */
  const share = (lost: number, min: number): number | null => (total > 0 ? lost / total : totalMin > 0 ? min / totalMin : null);
  const out = [...rows.values()].map(({ by, ...r }) => { const top = [...by].sort((a, b) => b[1] - a[1])[0]; return { ...r, share: share(r.lost, r.min), ...(top && by.size > 1 ? { most: { i: top[0], min: top[1] } } : top ? { most: { i: top[0], min: top[1] } } : {}) }; })
    .sort((a, b) => b.lost - a.lost || b.min - a.min || a.why.localeCompare(b.why));
  return { rows: out, none: { ...none, share: share(none.lost, none.min) }, said };
}
