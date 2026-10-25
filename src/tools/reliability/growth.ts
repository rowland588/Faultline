/* RELIABILITY GROWTH — is the new machine getting better, and when will it
 * reach its MTBF? Crow–AMSAA on a count's failures against the running time
 * (knowledge/specs/FC-061-reliability-growth.md; knowledge/methods/
 * maintenance/reliability-growth.md).
 *
 * The failures of a repairable machine as a power-law process, N(t) = λ tᵝ.
 * For failures at running times t₁…tₙ and the observation ending at T (the
 * watch always ends at a time, not at a failure):
 *
 *   β̂ = n ÷ Σ ln(T ÷ tᵢ)        λ̂ = n ÷ T^β̂        β̄ = (n − 1) ÷ n × β̂
 *   the failure rate now ρ = λ̂ β̂ T^(β̂−1), so the MTBF NOW is T ÷ (n β̂)
 *   (the average since the start is T ÷ n)
 *
 * β < 1: the rate is falling (growth); β = 1: steady; β > 1: rising. The
 * 90% interval on β is exact: given n failures the (tᵢ÷T)^β are order
 * statistics of uniforms, so 2β Σ ln(T÷tᵢ) is χ² with 2n degrees of freedom
 * (derived, and its coverage simulated, scripts/knowledge/cases-w5.py).
 *
 * NOT done here: the Cramér–von Mises fit test (its critical values are the
 * handbook's, not read) and a bound on the MTBF now — said on the page. The
 * projection assumes the fixing continues at the same pace. Pure. */
import { chi2Quantile } from './chi2';
import { pct, sig, span } from './words';
import type { LeanTile, LeanTone } from '../../lib/lean';

/** Failures before the curve is fitted. */
export const GROWTH_MIN = 8;
/** Under this many it is called rough. */
export const GROWTH_FIRM = 20;
/** A projection further than this many times the running so far is not given. */
export const PROJECT_CAP = 20;

export type GrowthSays = 'improving' | 'steady' | 'worse';
export interface GrowthFigures {
  /** Failures read (those with a running time past the start), and the total running time. */
  n: number; hours: number;
  enough: 'none' | 'few' | 'rough' | 'enough';
  beta?: number; betaLo?: number; betaHi?: number; betaUnbiased?: number; lambda?: number;
  cumMtbfH?: number; instMtbfH?: number; growthRate?: number;
  /** Improving or worse only when the 90% interval is clear of 1; else steady
   *  ("no sign yet"), `leans` saying which way β̂ points. */
  says?: GrowthSays;
  leans?: 'better' | 'worse';
  /** The 90% interval is clear of 1. */
  sure?: boolean;
  /** The MTBF wanted, in hours, and what the fit says of reaching it. */
  wantedH?: number;
  reached?: boolean;
  /** Total running hours at which the MTBF wanted is reached, and more from now. */
  toTargetH?: number; moreH?: number;
  far?: boolean;
  /** The fitted curve, failures expected against running hours — to draw. */
  curve: { h: number; n: number }[];
}

/** The fit on failures at `at` running hours (ascending) over `hours` of
 *  running, against an MTBF wanted of `wantedH` hours (optional). */
export function growth(at: readonly number[], hours: number, wantedH?: number): GrowthFigures {
  const read = at.filter(h => h > 0 && h <= hours + 1e-9);
  const n = read.length;
  const out: GrowthFigures = { n, hours, enough: n === 0 ? 'none' : n < GROWTH_MIN ? 'few' : n < GROWTH_FIRM ? 'rough' : 'enough', curve: [] };
  if (wantedH && wantedH > 0) out.wantedH = wantedH;
  if (n < GROWTH_MIN || !(hours > 0)) return out;
  const S = read.reduce((s, h) => s + Math.log(hours / h), 0);
  if (!(S > 0)) { out.enough = 'few'; return out; }
  const beta = n / S, lambda = n / hours ** beta;
  out.beta = beta; out.lambda = lambda; out.betaUnbiased = ((n - 1) / n) * beta;
  out.betaLo = (beta * chi2Quantile(0.05, 2 * n)) / (2 * n);
  out.betaHi = (beta * chi2Quantile(0.95, 2 * n)) / (2 * n);
  out.cumMtbfH = hours / n;
  out.instMtbfH = hours / (n * beta);
  out.growthRate = 1 - beta;
  const clear = (out.betaHi as number) < 1 || (out.betaLo as number) > 1;
  out.says = clear ? (beta < 1 ? 'improving' : 'worse') : 'steady';
  if (!clear && beta !== 1) out.leans = beta < 1 ? 'better' : 'worse';
  out.sure = clear;
  if (out.wantedH !== undefined) {
    if ((out.instMtbfH as number) >= out.wantedH) out.reached = true;
    else if (out.says === 'improving') {
      const need = (1 / (out.wantedH * lambda * beta)) ** (1 / (beta - 1));
      if (need > PROJECT_CAP * hours) out.far = true;
      else { out.toTargetH = need; out.moreH = need - hours; }
    }
  }
  const steps = 40;
  out.curve = Array.from({ length: steps + 1 }, (_, i) => { const h = (hours * i) / steps; return { h, n: lambda * h ** beta }; });
  return out;
}

/* ------------------------------------------------------------------ in words */

export interface GrowthSaid { text: string; tone: 'r' | 'a' | 'g' | 'n' }

/** The sentence. */
export function growthSays(ev: string, g: GrowthFigures): GrowthSaid {
  const evs = ev.trim() || 'failure';
  if (g.beta === undefined) {
    if (g.n === 0) return { text: `No ${evs} counted yet — growth is fitted from ${GROWTH_MIN}.`, tone: 'n' };
    return { text: `${g.n} ${evs}${g.n === 1 ? '' : 's'} so far — growth is fitted from ${GROWTH_MIN}, because with fewer the curve swings wildly.`, tone: 'n' };
  }
  const range = `90% sure ${sig(g.betaLo ?? 0)}–${sig(g.betaHi ?? 0)}`;
  const b = `β ${sig(g.beta)}, ${range}`;
  const rough = g.enough === 'rough' ? ` — rough: ${g.n} ${evs}s so far, ${GROWTH_FIRM} before it is said firmly` : '';
  let head: string;
  if (g.says === 'improving') {
    head = `It is getting better: ${evs}s are coming ${g.growthRate !== undefined && g.growthRate >= 0.25 ? `about ${pct(g.growthRate)} slower` : 'slower'} as the running goes on (${b}, below 1 beyond doubt)`;
  } else if (g.says === 'worse') {
    head = `It is getting worse: ${evs}s are coming faster as the running goes on (${b}, above 1 beyond doubt) — a design or installation problem, not bedding in`;
  } else {
    head = `No sign yet of getting better or worse${g.leans ? `, though it leans ${g.leans === 'better' ? 'better' : 'worse'}` : ''} (${b}, which holds 1)`;
  }
  const now = `Its MTBF now is about ${span(g.instMtbfH ?? 0)} (an estimate) against ${span(g.cumMtbfH ?? 0)} averaged since the start.`;
  let to = '';
  if (g.wantedH !== undefined) {
    if (g.reached) to = ` That is at the ${span(g.wantedH)} wanted already.`;
    else if (g.says !== 'improving') to = ` It is not projected to the ${span(g.wantedH)} wanted until the improvement is beyond doubt.`;
    else if (g.far) to = ` At this rate the ${span(g.wantedH)} wanted is not within sight (more than ${PROJECT_CAP} times the running so far).`;
    else if (g.moreH !== undefined) to = ` At this rate it reaches the ${span(g.wantedH)} wanted after about ${span(g.moreH)} more running — if the fixing keeps pace.`;
  }
  return { text: `${head}${rough}. ${now}${to}`, tone: g.says === 'improving' && g.sure ? 'g' : g.says === 'worse' && g.sure ? 'r' : 'n' };
}

/** What the page does not do, said on it. */
export const GROWTH_CAVEATS = [
  'Running time, not the clock on the wall — a week idle adds nothing.',
  'Whether one smooth curve fits (a step change, two phases) is judged by eye on the picture: the handbook’s fit test is not run here.',
  'The MTBF now is an estimate with no range; the projection assumes the fixing carries on at the same pace.',
];

/** The tile a growth count adds: the MTBF now, against the average. */
export function growthTile(ev: string, g: GrowthFigures): LeanTile {
  if (g.instMtbfH === undefined) return { k: 'MTBF now', v: '—', of: g.n >= 1 ? `growth is fitted from ${GROWTH_MIN} ${ev}s — ${g.n} so far` : 'said once there are failures' };
  const tone: LeanTone | undefined = g.says === 'improving' && g.sure ? 'g' : g.says === 'worse' && g.sure ? 'r' : undefined;
  return { k: 'MTBF now', v: span(g.instMtbfH), of: `against ${span(g.cumMtbfH ?? 0)} averaged since the start · β ${sig(g.beta ?? 0)}${g.enough === 'rough' ? ' · rough' : ''}`, ...(tone ? { tone } : {}) };
}

/** The table, as rows of [label, value] — the page and the paper print it. */
export function growthRows(g: GrowthFigures): [string, string][] {
  if (g.beta === undefined) return [];
  const rows: [string, string][] = [
    ['β — below 1 getting better, above 1 worse', `${sig(g.beta)} (90% sure ${sig(g.betaLo ?? 0)}–${sig(g.betaHi ?? 0)}); unbiased ${sig(g.betaUnbiased ?? 0)}`],
    ['Growth rate (1 − β)', `${sig(g.growthRate ?? 0)}`],
    ['MTBF now', `${span(g.instMtbfH ?? 0)} (estimate)`],
    ['MTBF averaged since the start', span(g.cumMtbfH ?? 0)],
    ['Running time', span(g.hours)],
  ];
  if (g.wantedH !== undefined) rows.push(['MTBF wanted', span(g.wantedH)]);
  if (g.reached) rows.push(['Reaching it', 'already there']);
  else if (g.moreH !== undefined) rows.push(['Reaching it', `about ${span(g.moreH)} more running, if the fixing keeps pace`]);
  else if (g.far) rows.push(['Reaching it', `not within sight at this rate`]);
  return rows;
}
