/* GAUGE R&R — do people get the same answer? (FC-118; knowledge/specs/FC-118-gauge-rr.md; lib/ie/gaugeRr). */
import type { AgreedAnalysis, StudyReading } from '../../lib/study';
import type { LeanTile } from '../../lib/lean';
import { gaugeRr, type GrrCell, type GrrResult } from '../../lib/ie/gaugeRr';
import type { AnalysisSays, Base, Tone } from './analysis';
import { pct } from './format';

export const GRR_PARTS_FROM = 5;
export const GRR_OPS_FROM = 2;
export const GRR_TRIALS = 2;

export interface GrrFigures extends Base {
  kind: 'grr';
  g: NonNullable<AgreedAnalysis['grr']>;
  cells: GrrCell[];
  n: number;
  enough: boolean;
  firm: boolean;
  problem?: string;
  refusal?: string;
  res?: GrrResult;
}

const fx = (v: number, dp = 2): string => v.toFixed(dp).replace('-', '−');

export function grrCells(readings: StudyReading[]): GrrCell[] {
  return readings.filter(r => !r.struck && r.arm && r.col && typeof r.value === 'number')
    .map(r => ({ part: r.arm as string, appraiser: r.col as string, trial: r.group ?? 1, value: r.value as number }));
}

export function grrProblem(name: string, g: AgreedAnalysis['grr']): string {
  if (!name.trim()) return 'Which gauge — a name, "Seal strength tester".';
  if (!g?.parts?.length) return 'Which parts — at least five names or numbers spanning the range, not ten near-identical ones.';
  if (g.parts.length < GRR_PARTS_FROM) return `At least ${GRR_PARTS_FROM} parts are wanted for a crossed study — ${g.parts.length} named.`;
  if (!g.appraisers?.length || g.appraisers.length < GRR_OPS_FROM) return `At least ${GRR_OPS_FROM} appraisers — who will measure blind, in random order.`;
  if (g.lower !== undefined && g.upper !== undefined && g.upper <= g.lower) return 'The upper limit has to be above the lower.';
  return '';
}

export function grrFigures(a: AgreedAnalysis, readings: StudyReading[], base: Base): GrrFigures {
  const g = a.grr ?? { parts: [], appraisers: [], trials: GRR_TRIALS };
  const cells = grrCells(readings);
  const trials = g.trials ?? GRR_TRIALS;
  const need = g.parts.length * g.appraisers.length * trials;
  const f: GrrFigures = {
    ...base, kind: 'grr', g, cells, n: cells.length,
    enough: cells.length >= need && need >= 18,
    firm: cells.length >= need && g.parts.length >= 10 && g.appraisers.length >= 3,
    problem: grrProblem(a.name, g),
  };
  if (f.problem) return f;
  if (!f.enough) return f;
  const T = g.lower !== undefined && g.upper !== undefined && g.upper > g.lower ? g.upper - g.lower : undefined;
  const res = gaugeRr({ cells, tolerance: T });
  if (!res) { f.refusal = 'The grid is not complete — every part, every appraiser, every trial needs one reading.'; return f; }
  f.res = res;
  return f;
}

const NOT_CLAIMED = 'Blind and random order are agreed on the page — the app does not hide part labels or shuffle the run; the team runs it that way on the floor.';

export function grrSays(f: GrrFigures, a: AgreedAnalysis): AnalysisSays {
  const u = a.unit ? ` ${a.unit}` : '', name = a.name.trim() || 'The gauge';
  if (f.problem) return { text: f.problem, tone: 'n', verdict: 'Not set up', more: [], notClaimed: NOT_CLAIMED };
  if (!f.enough) {
    const trials = f.g.trials ?? GRR_TRIALS;
    const need = f.g.parts.length * f.g.appraisers.length * trials;
    return { text: `${f.n} of ${need} readings — every part × appraiser × trial before %GRR is said.`, tone: 'n', verdict: 'Too few', more: [], notClaimed: NOT_CLAIMED };
  }
  if (f.refusal || !f.res) return { text: f.refusal ?? 'The grid is not complete.', tone: 'a', verdict: 'Incomplete', more: [], notClaimed: NOT_CLAIMED };
  const r = f.res;
  const bandWord = r.band === 'acceptable' ? 'Acceptable' : r.band === 'marginal' ? 'May be acceptable' : 'Not acceptable';
  const tone: Tone = r.band === 'acceptable' ? 'g' : r.band === 'marginal' ? 'a' : 'r';
  const lead = r.lead === 'repeat' ? 'Repeatability is the larger part — look at the gauge and the method before the people.'
    : r.lead === 'reprod' ? 'Reproducibility is the larger part — training, the procedure and the fixture before a new gauge.'
      : 'Repeatability and reproducibility are about equal.';
  const tol = r.pctGrrTol !== undefined ? ` ${pct(r.pctGrrTol / 100)} of the tolerance (6σ_GRR).` : '';
  const ndcSay = r.ndc >= 5 ? `ndc ${r.ndc} — can tell parts apart.` : `ndc ${r.ndc} — under 5: the system cannot reliably split the range into categories.`;
  return {
    text: `${name}: %GRR ${fx(r.pctGrrTotal, 1)}% of total variation (${fx(r.pctContrib, 1)}% contribution)${tol} EV ${fx(r.ev)}${u}, AV ${fx(r.av)}${u}, PV ${fx(r.pv)}${u}; ${ndcSay} ${lead}`,
    tone, verdict: bandWord,
    more: r.var.pooled
      ? [`Interaction not significant (F ${fx(r.var.fInteraction, 2)}, p ${fx(r.var.pInteraction, 2)}) — pooled with repeatability (α ${fx((a.grr?.poolAlpha ?? 0.25) * 100, 0)}% rule).`]
      : [`Interaction kept (F ${fx(r.var.fInteraction, 2)}, p ${fx(r.var.pInteraction, 2)}).`],
    notClaimed: NOT_CLAIMED,
  };
}

export function grrGrids(f: GrrFigures): import('./measure').Grid[] {
  if (!f.res) return [];
  const r = f.res;
  return [{
    label: 'Variance components',
    head: ['Source', 'Variance', 'σ'],
    rows: [
      ['Repeatability (EV)', fx(r.var.repeat, 4), fx(r.ev, 3)],
      ['Reproducibility (AV)', fx(r.var.operator + r.var.interaction, 4), fx(r.av, 3)],
      ['Part (PV)', fx(r.var.part, 4), fx(r.pv, 3)],
      ['GRR', fx(r.var.grr, 4), fx(Math.sqrt(r.var.grr), 3)],
    ],
    widths: [44, 28, 28],
  }];
}

export function grrTiles(f: GrrFigures): LeanTile[] {
  if (!f.res) return [{ k: 'Readings', v: String(f.n), of: 'in' }];
  const r = f.res;
  return [
    { k: 'GRR', v: `${fx(r.pctGrrTotal, 1)}%`, of: 'of variation' },
    { k: 'ndc', v: String(r.ndc), of: r.ndc >= 5 ? 'distinct categories' : 'under 5' },
    ...(r.pctGrrTol !== undefined ? [{ k: 'GRR tol', v: `${fx(r.pctGrrTol, 1)}%`, of: 'of tolerance' }] : []),
    { k: 'EV', v: `${fx(r.ev)}`, of: 'repeatability σ' },
    { k: 'AV', v: `${fx(r.av)}`, of: 'reproducibility σ' },
  ];
}
