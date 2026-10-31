/* COMPLAINTS PER MILLION — FC-134 (knowledge/specs/FC-134-complaints.md; knowledge/methods/quality/complaints.md).
 *
 * Complaints are the faults that got through, counted by the customer and read per million units sold. The count is small and
 * lumpy, so the first thing said is how sure the rate is (the exact Poisson interval), the second whether the period is unusual
 * (the u-chart's range around the usual rate) or different from the one before (the exact conditional test of two Poisson
 * rates), the third which kinds make most of it (the Pareto). Pure arithmetic: the calculator's definition
 * (tools/calc/defs/complaints) says it in words, the screen and the paper both read that. Independent cases:
 * scripts/knowledge/cases-complaints.py (SciPy). */
import { binomCdf, poissonLower, poissonUpper, uLimits } from '../../lib/ie/dist';

/** The kinds a complaint is counted under — a short fixed list from the record (foreign body, taste, packaging, quantity,
 *  labelling) with Other last, so the calculator's boxes are a fixed set. Faultline's choice, not yet agreed with the floor. */
export const KINDS: readonly { id: string; label: string }[] = [
  { id: 'foreign', label: 'Foreign body' },
  { id: 'packaging', label: 'Packaging or seal' },
  { id: 'taste', label: 'Taste, smell or condition' },
  { id: 'quantity', label: 'Quantity or weight' },
  { id: 'labelling', label: 'Labelling or date code' },
  { id: 'other', label: 'Other' },
];

export const MILLION = 1e6;

export interface Cpmu {
  complaints: number; units: number;
  /** Complaints a million units. */
  perMillion: number;
  /** The exact Poisson 95% interval, a million units (lo is 0 with none). */
  lo: number; hi: number;
  /** The one-sided upper 95% bound a million — what "none received" can be at most (≈ 3 ÷ N). */
  upper: number;
}

/** CPMU = complaints ÷ units × 10⁶, with the exact Poisson interval χ²(0.025; 2c)/2N … χ²(0.975; 2c + 2)/2N, scaled to a million. */
export function cpmu(complaints: number, units: number): Cpmu {
  const per = (x: number) => x * MILLION;
  return {
    complaints, units,
    perMillion: per(complaints / units),
    lo: per(poissonLower(complaints, units, 0.975)),
    hi: per(poissonUpper(complaints, units, 0.975)),
    upper: per(poissonUpper(complaints, units, 0.95)),
  };
}

export interface UsualRange { usual: number; lcl: number; ucl: number }

/** The u-chart's range around the usual rate ū = Σc/ΣN: ū ± 3√(ū / n) for this period's n millions of units, the lower cut at 0.
 *  The periods before, not this one — a bad period does not pull its own limits. */
export function usualRange(usualComplaints: number, usualUnits: number, units: number): UsualRange {
  const ubar = (usualComplaints / usualUnits) * MILLION;
  const { lcl, ucl } = uLimits(ubar, units / MILLION);
  return { usual: ubar, lcl, ucl };
}

/** Is this period's rate different from the one before's? The exact conditional test: of c₁ + c₂ complaints, the earlier period's
 *  c₁ is Binomial(c₁ + c₂, N₁/(N₁ + N₂)) if the rates are equal; two-sided p = min(1, 2 × the smaller tail). Undefined with none
 *  in either period (nothing to compare). */
export function ratesDiffer(before: { c: number; n: number }, now: { c: number; n: number }): number | undefined {
  const t = before.c + now.c;
  if (t === 0 || before.n <= 0 || now.n <= 0) return undefined;
  const p = before.n / (before.n + now.n);
  const lower = binomCdf(before.c, t, p);                    // P(X ≤ c₁)
  const upper = binomCdf(t - before.c, t, 1 - p);            // P(X ≥ c₁), by symmetry — keeps a tiny tail exact
  return Math.min(1, 2 * Math.min(lower, upper));
}

export interface ParetoRow { id: string; label: string; count: number; share: number; cum: number; perMillion: number }

/** The kinds with at least one complaint, most first (a tie keeps the order the kinds are listed in), each with its share, the
 *  running share, and its own rate a million units. */
export function pareto(counts: { id: string; label: string; count: number }[], units: number): ParetoRow[] {
  const total = counts.reduce((s, k) => s + k.count, 0);
  const sorted = counts.map((k, i) => ({ k, i })).filter(x => x.k.count > 0).sort((a, b) => b.k.count - a.k.count || a.i - b.i);
  let run = 0;
  return sorted.map(({ k }) => {
    run += k.count;
    return { id: k.id, label: k.label, count: k.count, share: k.count / total, cum: run / total, perMillion: (k.count / units) * MILLION };
  });
}

/** The cost of the period's complaints (external failure, knowledge/MONEY.md): all at the one typed cost of a complaint. */
export function complaintCost(complaints: number, units: number, costEach: number): { total: number; perMillionUnits: number; perUnitPence: number } {
  const total = complaints * costEach;
  return { total, perMillionUnits: (total / units) * MILLION, perUnitPence: (total / units) * 100 };
}
