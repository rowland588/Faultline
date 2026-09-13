/* THE PARETO, AND WHAT MOVED SINCE THE LAST ONE.
 *
 * A Pareto is not only the thing you run at the start to decide where to aim.
 * Run again halfway through, it is evidence: it says whether the category you
 * went after actually got smaller, and it says it in the same units the
 * decision was made in. That is the difference between a plan and a proof.
 *
 * Evidence needs two readings, so this takes two of the sheets the app now
 * keeps per upload and puts them side by side.
 *
 * THE ONE RULE THAT MATTERS: two Paretos over the SAME PERIOD are the same
 * measurement twice, not movement. The workbook states its period on its own
 * face ("covering 14 Jul - 6 Aug 2026"), and if that has not changed then
 * nothing here is allowed to present a difference as progress — a re-saved
 * file would otherwise read as a week's improvement.
 */
import type { PaceParetoSheet, PaceParetoRow } from './paceWorkbook';

/** Under this, a change is noise rather than news. A Pareto category moving by
 *  a couple of per cent between two four-week windows is the ordinary breathing
 *  of a factory, and calling it progress is how a report loses its reader. */
const FLAT_PCT = 8;

/** How many ranked rows one A3 sheet holds at a readable size.
 *
 *  Worked from the geometry rather than guessed: the panel leaves about 676pt
 *  under its heading and each row is 17pt, so 39 fit. Thirty is that with room
 *  to spare, and it is the SAME number on the preview and in the file — a cap
 *  each medium chose for itself is how a page ends up saying "+12 more" beside
 *  an A3 that is two thirds white. A tracker with more categories than this
 *  still shows every one of them on the Pareto SCREEN, which scrolls; only the
 *  sheet has an edge to run out of. */
export const PARETO_SHEET_ROWS = 30;

export type ParetoVerdict = 'down' | 'up' | 'flat' | 'new' | 'gone';

export interface ParetoMove extends PaceParetoRow {
  /** Share of the period's total minutes, 0-1. */
  share: number;
  /** Running share down the ranking, 0-1 — where the 80% line falls. */
  cum: number;
  /** Inside the vital few: the categories that make up the first 80%. */
  vital: boolean;
  /** The same category last time, when there is a comparable last time. */
  before?: { mins: number; events: number };
  deltaMins?: number;
  /** Change as a fraction of the earlier figure — -0.4 is "down 40%". */
  deltaPct?: number;
  verdict?: ParetoVerdict;
}

export interface ParetoView {
  rows: ParetoMove[];
  totalMins: number;
  totalStops: number;
  period?: string;
  headline?: string;
  /** How many categories carry the first 80% of the lost time. */
  vitalCount: number;
  /** What the vital few are worth, 0-1 — rarely exactly 0.8. */
  vitalShare: number;
  /** The earlier reading this is measured against, when there is one. */
  beforePeriod?: string;
  /** False when there is no earlier Pareto, or when it covers the same period
   *  — see the rule at the top. Nothing on the page may claim movement when
   *  this is false. */
  comparable: boolean;
  /** Why not, in words, when it is not. */
  whyNot?: string;
}

const verdictOf = (now: number, was: number): ParetoVerdict => {
  if (was <= 0) return 'new';
  const pct = ((now - was) / was) * 100;
  if (Math.abs(pct) < FLAT_PCT) return 'flat';
  return pct < 0 ? 'down' : 'up';
};

/** This week's Pareto, ranked, with movement against an earlier one. */
export function paretoView(now: PaceParetoSheet, before?: PaceParetoSheet): ParetoView {
  const ranked = [...now.rows].sort((a, b) => b.mins - a.mins);
  const total = now.totalMins > 0 ? now.totalMins : ranked.reduce((t, r) => t + r.mins, 0);

  /* Comparable, or not, decided once and carried — every caller asks the same
     question and they must not each answer it differently. */
  const samePeriod = !!before?.period && !!now.period && before.period === now.period;
  const comparable = !!before && before.rows.length > 0 && !samePeriod;
  const whyNot = !before
    ? 'Only one Pareto has been uploaded, so there is nothing to measure movement against yet.'
    : samePeriod
      ? `Both Paretos cover ${now.period}. That is the same measurement twice, not a change — re-run the loss analysis over a later window and upload it.`
      : undefined;

  const was = new Map(before?.rows.map(r => [r.category.toLowerCase(), r]) ?? []);

  let run = 0;
  const rows: ParetoMove[] = ranked.map(r => {
    const share = total > 0 ? r.mins / total : 0;
    run += share;
    const prev = comparable ? was.get(r.category.toLowerCase()) : undefined;
    const m: ParetoMove = {
      ...r,
      share,
      cum: run,
      vital: run - share < 0.8,     // the row that CROSSES 80% is still vital
    };
    if (comparable) {
      m.before = prev ? { mins: prev.mins, events: prev.events } : { mins: 0, events: 0 };
      m.deltaMins = Math.round((r.mins - (prev?.mins ?? 0)) * 10) / 10;
      m.deltaPct = prev && prev.mins > 0 ? (r.mins - prev.mins) / prev.mins : undefined;
      m.verdict = verdictOf(r.mins, prev?.mins ?? 0);
    }
    return m;
  });

  /* A category that has GONE is the strongest evidence a Pareto can carry, and
     it is the one thing a ranking of what is left cannot show. It is appended
     with nothing in the ranking columns, because it no longer has a rank. */
  if (comparable && before) {
    const here = new Set(ranked.map(r => r.category.toLowerCase()));
    for (const r of before.rows) {
      if (here.has(r.category.toLowerCase())) continue;
      rows.push({
        ...r, mins: 0, events: 0, minPerEvent: 0, byLine: {},
        share: 0, cum: 1, vital: false,
        before: { mins: r.mins, events: r.events },
        deltaMins: -r.mins, deltaPct: -1, verdict: 'gone',
      });
    }
  }

  const vital = rows.filter(r => r.vital);
  return {
    rows,
    totalMins: total,
    totalStops: now.totalStops,
    period: now.period,
    headline: now.headline,
    vitalCount: vital.length,
    vitalShare: vital.reduce((t, r) => t + r.share, 0),
    beforePeriod: comparable ? before?.period : undefined,
    comparable,
    whyNot,
  };
}

export const verdictWord: Record<ParetoVerdict, string> = {
  down: 'down', up: 'up', flat: 'about the same', new: 'new', gone: 'gone',
};

/** One sentence a person would actually say about a category's movement.
 *
 *  Every figure goes through one() first. The workbook's minutes are one
 *  decimal place, but they arrive as binary floats and 40.7 comes back out of a
 *  cell as 40.699999999999996 — which printed on an A3 in front of a General
 *  Manager reads as a machine that cannot add up, and costs the page the
 *  credibility every other number on it depends on. */
const one = (n: number): string => String(Math.round(n * 10) / 10);

export function moveSentence(m: ParetoMove): string {
  if (!m.verdict) return '';
  const mins = one(Math.abs(m.deltaMins ?? 0));
  const was = one(m.before?.mins ?? 0);
  const pct = m.deltaPct == null ? null : Math.round(Math.abs(m.deltaPct) * 100);
  switch (m.verdict) {
    case 'gone':  return `gone — was ${was} min`;
    case 'new':   return `new this period — ${one(m.mins)} min`;
    case 'flat':  return `about the same — ${one(m.mins)} min against ${was}`;
    default:      return `${m.verdict} ${pct == null ? '' : pct + '%'} — ${mins} min ${m.verdict === 'down' ? 'less' : 'more'} than ${was}`;
  }
}
