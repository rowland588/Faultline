/* DO THE STOPS COME IN BURSTS? — FC-241 part 3 (knowledge/specs/FC-241-workstation-stops.md, Part 3).
 *
 * The range on a count of stops assumes they arrive independently at a steady average rate (a Poisson process). Stops that come in clusters break that: the same
 * number can be seen in a quiet stretch and a burst, and a sample that happened to catch none, or a burst, says less than the count suggests. When the page has the
 * moment of every stop and every stretch watched, the watched time is cut into equal bins and the counts in them are tested against the Poisson's own spread —
 * the index of dispersion D = Σ(cᵢ − c̄)² / c̄, χ² on k − 1 degrees of freedom (Cox & Lewis, The Statistical Analysis of Series of Events; Fisher 1950). A significant
 * excess (D / (k − 1) = φ > 1, p < 0.05) widens the count's interval about the count by √φ — the quasi-Poisson correction (McCullagh & Nelder, Generalized Linear Models).
 * Pure. Independent cases: scripts/knowledge/cases-stops-extrapolation.py (Part 3). */
import { lnGamma } from '../../lib/ie/dist';

export interface Span { s: number; e: number }

/** "t;t;t" (milliseconds since 1970) → numbers; anything else dropped. */
export const parseLog = (txt: unknown): number[] => (typeof txt === 'string' ? txt.split(';').map(Number).filter(n => Number.isFinite(n) && n > 0) : []);
/** "s-e;s-e" → the stretches watched, in order, those with a positive length. */
export function parseSpans(txt: unknown): Span[] {
  if (typeof txt !== 'string') return [];
  return txt.split(';').flatMap(p => { const [s, e] = p.split('-').map(Number); return Number.isFinite(s) && Number.isFinite(e) && e > s ? [{ s, e }] : []; });
}

/** The regularised lower incomplete gamma P(a, x) — series below a + 1, continued fraction above (Numerical Recipes gser / gcf). */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  const g = lnGamma(a);
  if (x < a + 1) {
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 500; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
    return sum * Math.exp(-x + a * Math.log(x) - g);
  }
  const TINY = 1e-300;
  let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - g) * h;
}
/** The upper tail of the χ² distribution on `df` degrees of freedom. */
export const chiSquareSf = (x: number, df: number): number => Math.max(0, 1 - gammaP(df / 2, x / 2));

export interface Cluster {
  /** The stops with a moment that fell in a stretch watched, and the stops with none (so they are not in the test). */
  used: number;
  outside: number;
  bins?: number;
  counts?: number[];
  D?: number;
  p?: number;
  /** D / (k − 1): 1 is a Poisson's own spread, more is bursty, less is evenly spaced. */
  phi?: number;
  /** Significantly bursty (p < 0.05 and φ > 1). */
  clustered?: boolean;
  /** Why it cannot be said, in words, when it cannot. */
  why?: string;
}

/** Cut the watched time into k equal bins (k = stops ÷ 5, so each expects about five, at most 12) and test the counts. */
export function clusterTest(stops: number[], spans: Span[]): Cluster {
  const ordered = [...spans].sort((a, b) => a.s - b.s);
  const total = ordered.reduce((n, x) => n + (x.e - x.s), 0);
  const at = (t: number): number | undefined => {
    let before = 0;
    for (const x of ordered) { if (t >= x.s && t <= x.e) return before + (t - x.s); before += x.e - x.s; }
    return undefined;
  };
  const clock = stops.map(at).filter((x): x is number => x !== undefined);
  const out: Cluster = { used: clock.length, outside: stops.length - clock.length };
  if (!ordered.length || total <= 0) return { ...out, why: 'the watching was typed, not timed, so there is no record of when each stop fell in it' };
  if (clock.length < 10) return { ...out, why: `only ${clock.length} stop${clock.length === 1 ? ' has' : 's have'} a moment inside the watching${out.outside ? ` (${out.outside} ${out.outside === 1 ? 'was' : 'were'} pressed while the watch was not running)` : ''} — about ten are needed to tell whether they come in bursts` };
  const k = Math.min(12, Math.floor(clock.length / 5));
  const counts = Array.from({ length: k }, () => 0);
  for (const t of clock) counts[Math.min(k - 1, Math.floor((t / total) * k))]++;
  const mean = clock.length / k;
  const D = counts.reduce((n, c) => n + (c - mean) ** 2, 0) / mean;
  const phi = D / (k - 1), p = chiSquareSf(D, k - 1);
  return { ...out, bins: k, counts, D, p, phi, clustered: p < 0.05 && phi > 1 };
}
