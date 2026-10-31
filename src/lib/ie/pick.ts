/* IMPACT AND EFFORT — the PICK chart (sixsigma.selection-matrices; FC-144; knowledge/specs/FC-144-impact-effort.md).
 * Each countermeasure placed by what it closes (impact 1–5) against the work it takes (effort 1–5) in the chart's four quadrants:
 * Implement (high impact, low effort) · Challenge (high, high) · Possible (low, low) · Kill (low impact, high effort).
 * The cut — impact 3 or more is high, effort 2 or less is low — is Faultline's, from the record's worked case (no source prints one).
 * Money: what it is worth a year (typed) against hours × the £ an hour + other spend; a missing input is named, never invented.
 * Independent cases: scripts/knowledge/cases-pick.py. No AI. */
import { fmtGBP } from '../cost';
import type { LeanTile, LeanTone } from '../lean';

export type PickQuadrant = 'Implement' | 'Challenge' | 'Possible' | 'Kill';

export interface PickRowIn {
  id: string;
  name: string;
  impact?: number;
  effort?: number;
  worthGbp?: number;
  hours?: number;
  spendGbp?: number;
}

export interface PickRanked extends PickRowIn {
  impact: number;
  effort: number;
  /** Its place in the order, from 1. */
  score: number;
  class: PickQuadrant;
  quadrant: PickQuadrant;
  /** A 3 on either axis — the quadrant turns on it. */
  onLine: boolean;
  /** hours × £ an hour + other spend, when everything it needs is given. */
  effortGbp?: number;
  /** Weeks to pay back, when the cost and the worth are both known. */
  paybackWeeks?: number;
}

export const QUADRANTS: readonly PickQuadrant[] = ['Implement', 'Challenge', 'Possible', 'Kill'];
export const HIGH_IMPACT_FROM = 3;
export const LOW_EFFORT_UPTO = 2;

const DO: Record<PickQuadrant, string> = {
  Implement: 'do first', Challenge: 'plan as projects', Possible: 'when there is slack', Kill: 'decline, and record it',
};

const whole = (n: number | undefined): n is number => n !== undefined && Number.isInteger(n) && n >= 1 && n <= 5;
const given = (n: number | undefined): n is number => n !== undefined && n !== null && Number.isFinite(n);

export function quadrantOf(impact: number, effort: number): PickQuadrant {
  const high = impact >= HIGH_IMPACT_FROM, low = effort <= LOW_EFFORT_UPTO;
  return high && low ? 'Implement' : high ? 'Challenge' : low ? 'Possible' : 'Kill';
}

/** The work in money: hours × the £ an hour, plus other spend. Only when every part it needs is given. */
export function effortMoney(row: Pick<PickRowIn, 'hours' | 'spendGbp'>, rate: number | undefined): number | undefined {
  const h = given(row.hours) ? row.hours : undefined;
  const s = given(row.spendGbp) ? row.spendGbp : undefined;
  if (h === undefined && s === undefined) return undefined;
  if (h !== undefined && h > 0 && !(given(rate) && rate > 0)) return undefined;
  return (h && rate ? h * rate : 0) + (s ?? 0);
}

export const paybackWeeksOf = (cost: number | undefined, worth: number | undefined): number | undefined =>
  cost !== undefined && given(worth) && worth > 0 ? (cost / worth) * 52 : undefined;

/** "under a week" · "4 weeks" · "1.4 years". */
export function paybackWords(weeks: number): string {
  if (weeks < 1) return 'under a week';
  if (weeks <= 104) { const w = Math.round(weeks); return `${w} week${w === 1 ? '' : 's'}`; }
  return `${(weeks / 52).toFixed(1)} years`;
}

const typed = (rows: PickRowIn[]) => rows.filter(r => r.name.trim());

export function rankPick(rowsIn: PickRowIn[], o: { rate?: number } = {}): { ok: PickRanked[]; counts: Record<PickQuadrant, number>; left?: string[] } | { problems: string[] } {
  const problems: string[] = [];
  if (!typed(rowsIn).length) return { ok: [], counts: { Implement: 0, Challenge: 0, Possible: 0, Kill: 0 } };
  const keep: (PickRowIn & { impact: number; effort: number; at: number })[] = [];
  typed(rowsIn).forEach((r, at) => {
    const name = r.name.trim();
    if (!whole(r.impact) || !whole(r.effort)) { problems.push(`“${name}” needs an impact and an effort, each a whole number from 1 to 5.`); return; }
    const bad = (['worthGbp', 'hours', 'spendGbp'] as const).find(k => given(r[k]) && (r[k] as number) < 0);
    if (bad) { problems.push(`“${name}” has a negative ${bad === 'worthGbp' ? 'worth' : bad === 'hours' ? 'number of hours' : 'spend'} — leave it empty or give it as 0 or more.`); return; }
    keep.push({ ...r, name, impact: r.impact, effort: r.effort, at });
  });
  if (!keep.length) return { problems: problems.length ? problems : ['Score at least one countermeasure.'] };
  const order = (q: PickQuadrant) => QUADRANTS.indexOf(q);
  const sorted = keep.map(r => ({ r, q: quadrantOf(r.impact, r.effort) }))
    .sort((a, b) => order(a.q) - order(b.q) || b.r.impact - a.r.impact || a.r.effort - b.r.effort
      || (b.r.worthGbp ?? -1) - (a.r.worthGbp ?? -1) || a.r.at - b.r.at);
  const counts: Record<PickQuadrant, number> = { Implement: 0, Challenge: 0, Possible: 0, Kill: 0 };
  const ok = sorted.map(({ r, q }, i): PickRanked => {
    counts[q]++;
    const cost = effortMoney(r, o.rate);
    return {
      id: r.id, name: r.name, impact: r.impact, effort: r.effort, worthGbp: r.worthGbp, hours: r.hours, spendGbp: r.spendGbp,
      score: i + 1, class: q, quadrant: q, onLine: r.impact === 3 || r.effort === 3,
      ...(cost !== undefined ? { effortGbp: cost } : {}),
      ...(paybackWeeksOf(cost, r.worthGbp) !== undefined ? { paybackWeeks: paybackWeeksOf(cost, r.worthGbp) } : {}),
    };
  });
  return { ok, counts, ...(problems.length ? { left: problems } : {}) };
}

export interface PickSummary {
  verdict: string;
  tone: LeanTone;
  sentence: string;
  tiles: LeanTile[];
  /** The money, in lines — each only when its inputs are given; what is missing, named. */
  money: string[];
  closing: string;
  caveats: string[];
}

const names = (rs: PickRanked[]): string => {
  const n = rs.map(r => r.name);
  return n.slice(0, 3).join(', ') + (n.length > 3 ? ` and ${n.length - 3} more` : '');
};

export function summarizePick(ranked: PickRanked[], o: { rate?: number } = {}): PickSummary {
  const by = (q: PickQuadrant) => ranked.filter(r => r.quadrant === q);
  const [imp, cha, pos, kil] = QUADRANTS.map(by);
  const verdict = !ranked.length ? 'Not scored yet' : imp.length ? `${imp.length} to do first` : 'None to do first';
  const clauses = [
    imp.length ? `Do first: ${names(imp)}.` : '',
    cha.length ? `Plan as projects: ${names(cha)}.` : '',
    pos.length ? `When there is slack: ${names(pos)}.` : '',
    kil.length ? `Decline: ${names(kil)}.` : '',
  ].filter(Boolean);
  const sentence = !ranked.length ? 'Score each countermeasure on impact and effort, then read what to do first.'
    : ranked.length === 1 ? 'One countermeasure is not a choice yet — add the others.'
    : (imp.length ? '' : 'No quick win on this list — plan the projects with the sponsor. ') + clauses.join(' ');
  const tiles: LeanTile[] = QUADRANTS.map(q => ({ k: q, v: String(by(q).length), of: DO[q], tone: 'n' }));

  const money: string[] = [];
  if (imp.length) {
    const worth = imp.filter(r => given(r.worthGbp)), hrs = imp.filter(r => given(r.hours));
    const rate = o.rate !== undefined && o.rate > 0 ? o.rate : undefined;
    const ofN = (k: number) => (k === imp.length ? '' : ` (${k} of ${imp.length} given)`);
    if (worth.length) {
      const w = worth.reduce((s, r) => s + (r.worthGbp as number), 0);
      const h = hrs.reduce((s, r) => s + (r.hours as number), 0);
      const labour = rate !== undefined && hrs.length ? h * rate : undefined;
      money.push(`The ${imp.length === 1 ? 'quick win is' : 'quick wins are'} worth ${fmtGBP(w)} a year${ofN(worth.length)}`
        + (hrs.length ? ` for ${Number(h.toFixed(1))} hours of work${ofN(hrs.length)}` : '')
        + (labour !== undefined ? ` (${fmtGBP(labour)} of labour at ${fmtGBP(rate as number)} an hour).` : '.'));
    } else money.push('Type what each is worth a year to say what the quick wins are worth.');
    if (!hrs.length) money.push('Give the hours, and the £ an hour, to say what the work costs.');
    else if (rate === undefined) money.push('Give the £ an hour for the people doing the work, to say what the hours cost.');
  } else if (ranked.length) {
    money.push('Nothing to do first, so no quick win to price.');
  }

  const online = ranked.filter(r => r.onLine).length;
  return {
    verdict, tone: 'n', sentence, tiles, money,
    closing: ranked.length ? 'Agree the first list with the team, put each on the Actions with who and by when, and prove each with the number it should move.' : 'Score each countermeasure, then read what to do first.',
    caveats: [
      'The scores are the team’s opinion until a trial or the Pareto bar says otherwise — impact is the share of the gap it should close.',
      `Impact ${HIGH_IMPACT_FROM} or more is high and effort ${LOW_EFFORT_UPTO} or less is low — Faultline’s cut; the PICK chart prints none.${online ? ` ${online} ${online === 1 ? 'row has' : 'rows have'} a 3 on an axis, so the quadrant turns on it — talk it over.` : ''}`,
      'This orders the work. It does not prove a countermeasure works — the check on the same number does.',
    ],
  };
}
