/* CHARTS ON READINGS IN ORDER — the arithmetic (knowledge/specs/FC-086-charts.md, W2; 24 October 2026).
 *
 * The Shewhart constants, the individuals and subgroup limits, Nelson's eight tests (Western Electric's four
 * among them) each said with what it usually means, the tabular CUSUM with its change point and the EWMA as
 * the running level, Levene's check before a short-run chart pools, the runs about the median, Kendall's S and
 * τ with Sen's slope for a weekly number. Pure functions, no words of a page here — the chart tool
 * (src/tools/chart) and the weekly number (lib/measures) say them. Validated against SciPy in
 * scripts/knowledge/cases-spc.py and cases-w2.py (knowledge/STANDARD.md, step 4). */
import { fCdf, normalCdf, lnGamma } from './dist';

/* ============================== THE CONSTANTS ============================== */
/** ASTM / ISO 7870-2 control-chart constants by subgroup size m: d₂ (the range's mean in σ), A₂, D₃, D₄
 *  for X̄-R; c₄, A₃, B₃, B₄ for X̄-S (m > 10). From the standard tables (spc.control-charts-variables);
 *  d₂ and c₄ re-derived in cases-w2.py. */
export const CHART_CONSTANTS: Record<number, { d2: number; A2: number; D3: number; D4: number; c4: number; A3: number; B3: number; B4: number }> = {
  2: { d2: 1.128, A2: 1.880, D3: 0, D4: 3.267, c4: 0.7979, A3: 2.659, B3: 0, B4: 3.267 },
  3: { d2: 1.693, A2: 1.023, D3: 0, D4: 2.574, c4: 0.8862, A3: 1.954, B3: 0, B4: 2.568 },
  4: { d2: 2.059, A2: 0.729, D3: 0, D4: 2.282, c4: 0.9213, A3: 1.628, B3: 0, B4: 2.266 },
  5: { d2: 2.326, A2: 0.577, D3: 0, D4: 2.114, c4: 0.9400, A3: 1.427, B3: 0, B4: 2.089 },
  6: { d2: 2.534, A2: 0.483, D3: 0, D4: 2.004, c4: 0.9515, A3: 1.287, B3: 0.030, B4: 1.970 },
  7: { d2: 2.704, A2: 0.419, D3: 0.076, D4: 1.924, c4: 0.9594, A3: 1.182, B3: 0.118, B4: 1.882 },
  8: { d2: 2.847, A2: 0.373, D3: 0.136, D4: 1.864, c4: 0.9650, A3: 1.099, B3: 0.185, B4: 1.815 },
  9: { d2: 2.970, A2: 0.337, D3: 0.184, D4: 1.816, c4: 0.9693, A3: 1.032, B3: 0.239, B4: 1.761 },
  10: { d2: 3.078, A2: 0.308, D3: 0.223, D4: 1.777, c4: 0.9727, A3: 0.975, B3: 0.284, B4: 1.716 },
  11: { d2: 3.173, A2: 0.285, D3: 0.256, D4: 1.744, c4: 0.9754, A3: 0.927, B3: 0.321, B4: 1.679 },
  12: { d2: 3.258, A2: 0.266, D3: 0.283, D4: 1.717, c4: 0.9776, A3: 0.886, B3: 0.354, B4: 1.646 },
  15: { d2: 3.472, A2: 0.223, D3: 0.347, D4: 1.653, c4: 0.9823, A3: 0.789, B3: 0.428, B4: 1.572 },
  20: { d2: 3.735, A2: 0.180, D3: 0.415, D4: 1.585, c4: 0.9869, A3: 0.680, B3: 0.510, B4: 1.490 },
  25: { d2: 3.931, A2: 0.153, D3: 0.459, D4: 1.541, c4: 0.9896, A3: 0.606, B3: 0.565, B4: 1.435 },
};
/** c₄ in closed form for any m — the X̄-S chart between the table's rows. */
export const c4Of = (m: number): number => Math.sqrt(2 / (m - 1)) * Math.exp(lnGamma(m / 2) - lnGamma((m - 1) / 2));

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]): number => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };

/* ================================ LIMITS ================================= */
export interface IndividualsLimits { centre: number; mrBar: number; sigma: number; lcl: number; ucl: number; mrUcl: number; n: number }
/** XmR limits from the readings given (the steady period): x̄ ± 2.66·MR̄, the MR chart's 3.267·MR̄, σ = MR̄/1.128. */
export function xmrLimits(xs: number[]): IndividualsLimits | undefined {
  if (xs.length < 2) return undefined;
  const centre = mean(xs), mrBar = mean(xs.slice(1).map((x, i) => Math.abs(x - xs[i])));
  return { centre, mrBar, sigma: mrBar / 1.128, lcl: centre - 2.66 * mrBar, ucl: centre + 2.66 * mrBar, mrUcl: 3.267 * mrBar, n: xs.length };
}
export interface SubgroupLimits { kind: 'R' | 'S'; m: number; grand: number; spreadBar: number; sigma: number; lcl: number; ucl: number; spreadLcl: number; spreadUcl: number; groups: number }
/** X̄-R (m ≤ 10) or X̄-S (m > 10) limits from the subgroups given; a subgroup short of m is left out of the limits. */
export function subgroupLimits(groups: number[][], m: number): SubgroupLimits | undefined {
  const full = groups.filter(g => g.length === m);
  if (m < 2 || full.length < 2) return undefined;
  const useS = m > 10, k = CHART_CONSTANTS[m] ?? (useS ? undefined : undefined);
  const means = full.map(mean), grand = mean(means);
  if (useS) {
    const c4 = k?.c4 ?? c4Of(m), A3 = k?.A3 ?? 3 / (c4 * Math.sqrt(m));
    const sBar = mean(full.map(sd)), sigma = sBar / c4;
    const B3 = k?.B3 ?? Math.max(0, 1 - 3 * Math.sqrt(1 - c4 * c4) / c4), B4 = k?.B4 ?? 1 + 3 * Math.sqrt(1 - c4 * c4) / c4;
    return { kind: 'S', m, grand, spreadBar: sBar, sigma, lcl: grand - A3 * sBar, ucl: grand + A3 * sBar, spreadLcl: B3 * sBar, spreadUcl: B4 * sBar, groups: full.length };
  }
  if (!k) return undefined;
  const rBar = mean(full.map(g => Math.max(...g) - Math.min(...g)));
  return { kind: 'R', m, grand, spreadBar: rBar, sigma: rBar / k.d2, lcl: grand - k.A2 * rBar, ucl: grand + k.A2 * rBar, spreadLcl: k.D3 * rBar, spreadUcl: k.D4 * rBar, groups: full.length };
}

/* ============================== THE SIGNALS ============================== */
/** Nelson's eight tests (1984). Western Electric's four are 'beyond', 'run' (eight, not nine — the WE count,
 *  chosen in the spec), '2of3' and '4of5'. */
export type Rule = 'beyond' | 'run' | 'trend' | 'alternate' | '2of3' | '4of5' | 'inside' | 'outside';
export const WESTERN_ELECTRIC: readonly Rule[] = ['beyond', 'run', '2of3', '4of5'];
export const ALL_RULES: readonly Rule[] = ['beyond', 'run', 'trend', 'alternate', '2of3', '4of5', 'inside', 'outside'];
export interface Signal { rule: Rule; /** 1-based points, the last the one that fired */ points: number[]; side?: 'above' | 'below'; }
/** The rules' names and what each usually means on the floor (spc.run-rules). */
export const RULE_WORDS: Record<Rule, { name: string; means: string }> = {
  beyond: { name: 'a point beyond a limit', means: 'something happened to that reading — a jam, a wrong pack, a mis-key — or the process jumped' },
  run: { name: 'eight in a row on one side of the centre', means: 'a step change — a new reel, a new operator, a set-point moved' },
  trend: { name: 'six in a row rising or falling', means: 'a trend — wear, warming, a hopper running down' },
  alternate: { name: 'fourteen in a row alternating up and down', means: 'over-adjustment, or two heads sampled in turn' },
  '2of3': { name: 'two of three beyond 2σ on one side', means: 'the process has shifted — look at what changed just before' },
  '4of5': { name: 'four of five beyond 1σ on one side', means: 'a smaller shift, persisting — look at what changed' },
  inside: { name: 'fifteen in a row within 1σ', means: 'too little variation — a stuck gauge, rounded readings, or limits set from a wider period' },
  outside: { name: 'eight in a row beyond 1σ, both sides', means: 'a mixture of two streams — two heads, two shifts, two reels' },
};
/** The signals on a stream against a centre and σ, by the rules asked. Each run reported once, at the point
 *  it first fires, and again only when a fresh run starts. */
export function nelson(xs: number[], centre: number, sigma: number, rules: readonly Rule[] = WESTERN_ELECTRIC): Signal[] {
  const out: Signal[] = [];
  if (!(sigma > 0)) return out;
  const z = xs.map(x => (x - centre) / sigma), n = xs.length;
  const sideOf = (v: number): 'above' | 'below' | undefined => (v > 0 ? 'above' : v < 0 ? 'below' : undefined);
  const push = (s: Signal) => { if (!out.some(o => o.rule === s.rule && o.points[o.points.length - 1] === s.points[s.points.length - 1])) out.push(s); };
  const has = (r: Rule) => rules.includes(r);
  for (let i = 0; i < n; i++) {
    if (has('beyond') && Math.abs(z[i]) > 3) push({ rule: 'beyond', points: [i + 1], side: sideOf(z[i]) });
    const win = (len: number) => (i + 1 >= len ? z.slice(i + 1 - len, i + 1) : undefined);
    const w8 = win(8);
    if (has('run') && w8 && (w8.every(v => v > 0) || w8.every(v => v < 0))) {
      /* said once per run: only when the point before the window was on the other side or absent */
      const before = i - 8 >= 0 ? z[i - 8] : undefined;
      if (before === undefined || Math.sign(before) !== Math.sign(w8[0])) push({ rule: 'run', points: Array.from({ length: 8 }, (_, k) => i - 6 + k), side: sideOf(w8[0]) });
      else { const ex = out.find(o => o.rule === 'run' && o.side === sideOf(w8[0]) && o.points[o.points.length - 1] === i); if (ex) ex.points.push(i + 1); }   // the run goes on
    }
    const w6 = win(6);
    if (has('trend') && w6) {
      const d = w6.slice(1).map((v, k) => v - w6[k]);
      if (d.every(v => v > 0) || d.every(v => v < 0)) {
        const before = i - 6 >= 0 ? Math.sign(z[i - 5] - z[i - 6]) : 0, side = d[0] > 0 ? 'above' : 'below';
        if (before !== Math.sign(d[0])) push({ rule: 'trend', points: Array.from({ length: 6 }, (_, k) => i - 4 + k), side });
        else { const ex = out.find(o => o.rule === 'trend' && o.side === side && o.points[o.points.length - 1] === i); if (ex) ex.points.push(i + 1); }
      }
    }
    const w14 = win(14);
    if (has('alternate') && w14) {
      const d = w14.slice(1).map((v, k) => v - w14[k]);
      if (d.every((v, k) => k === 0 || Math.sign(v) === -Math.sign(d[k - 1])) && d.every(v => v !== 0)) push({ rule: 'alternate', points: Array.from({ length: 14 }, (_, k) => i - 12 + k) });
    }
    const w3 = win(3);
    if (has('2of3') && w3) for (const s of [1, -1] as const) if (w3.filter(v => s * v > 2).length >= 2 && s * z[i] > 2) push({ rule: '2of3', points: Array.from({ length: 3 }, (_, k) => i - 1 + k), side: s > 0 ? 'above' : 'below' });
    const w5 = win(5);
    if (has('4of5') && w5) for (const s of [1, -1] as const) if (w5.filter(v => s * v > 1).length >= 4 && s * z[i] > 1) push({ rule: '4of5', points: Array.from({ length: 5 }, (_, k) => i - 3 + k), side: s > 0 ? 'above' : 'below' });
    const w15 = win(15);
    if (has('inside') && w15 && w15.every(v => Math.abs(v) < 1)) { const before = i - 15 >= 0 ? Math.abs(z[i - 15]) : 9; if (before >= 1) push({ rule: 'inside', points: Array.from({ length: 15 }, (_, k) => i - 13 + k) }); }
    if (has('outside') && w8 && w8.every(v => Math.abs(v) > 1) && w8.some(v => v > 0) && w8.some(v => v < 0)) { const before = i - 8 >= 0 ? Math.abs(z[i - 8]) : 0; if (before <= 1) push({ rule: 'outside', points: Array.from({ length: 8 }, (_, k) => i - 6 + k) }); }
  }
  /* one episode, one signal: runs of the same test on the same side whose windows touch or overlap are
     merged (a sustained shift fires 2-of-3 and 4-of-5 at nearly every point — said once, from where it began) */
  const merged: Signal[] = [];
  for (const s of out.sort((p, q) => p.points[0] - q.points[0] || p.points[p.points.length - 1] - q.points[q.points.length - 1])) {
    const prev = merged.find(m => m.rule === s.rule && m.side === s.side && m.rule !== 'beyond' && s.points[0] <= m.points[m.points.length - 1] + 1);
    if (prev) { const to = Math.max(prev.points[prev.points.length - 1], s.points[s.points.length - 1]); prev.points = Array.from({ length: to - prev.points[0] + 1 }, (_, k) => prev.points[0] + k); }
    else merged.push({ ...s, points: [...s.points] });
  }
  return merged;
}

/* ============================== CUSUM AND EWMA ============================== */
export interface Cusum { k: number; h: number; plus: number[]; minus: number[]; /** the first point past H, 1-based */ signal?: number; side?: 'above' | 'below'; /** where the shift began — the point after the sum was last zero */ since?: number; level?: number }
/** Page's tabular CUSUM against a target: K the reference value (half the shift to catch), H the decision
 *  interval (5σ by the spec's choice); the change point counted back to where the sum was last zero and the
 *  new level estimated μ₀ ± (K + C/N). A head start sets both sums to H/2. */
export function cusum(xs: number[], target: number, k: number, h: number, headStart = false): Cusum {
  const plus: number[] = [], minus: number[] = [];
  let cp = headStart ? h / 2 : 0, cm = headStart ? h / 2 : 0, zp = 0, zm = 0;   // zp/zm: the index where each sum was last zero
  const out: Cusum = { k, h, plus, minus };
  for (let i = 0; i < xs.length; i++) {
    cp = Math.max(0, xs[i] - (target + k) + cp); cm = Math.max(0, (target - k) - xs[i] + cm);
    if (cp === 0) zp = i + 1; if (cm === 0) zm = i + 1;
    plus.push(cp); minus.push(cm);
    if (out.signal === undefined && (cp > h || cm > h)) {
      const up = cp > h, since = (up ? zp : zm) + 1, N = i + 1 - since + 1;
      out.signal = i + 1; out.side = up ? 'above' : 'below'; out.since = since;
      out.level = up ? target + k + cp / N : target - k - cm / N;
    }
  }
  return out;
}
export interface Ewma { lambda: number; L: number; z: number[]; upper: number[]; lower: number[]; signal?: number; level: number }
/** Roberts' EWMA: zᵢ = λxᵢ + (1 − λ)zᵢ₋₁ with its time-varying limits; the last z is the current level. */
export function ewma(xs: number[], target: number, sigma: number, lambda = 0.2, L = 2.962): Ewma {
  const z: number[] = [], upper: number[] = [], lower: number[] = [];
  let v = target; const out: Ewma = { lambda, L, z, upper, lower, level: target };
  for (let i = 0; i < xs.length; i++) {
    v = lambda * xs[i] + (1 - lambda) * v; z.push(v);
    const w = L * sigma * Math.sqrt((lambda / (2 - lambda)) * (1 - (1 - lambda) ** (2 * (i + 1))));
    upper.push(target + w); lower.push(target - w);
    if (out.signal === undefined && Math.abs(v - target) > w) out.signal = i + 1;
  }
  out.level = v;
  return out;
}

/* ============================= SHORT RUN, LEVENE ============================= */
/** Levene's test, median-centred (Brown–Forsythe): W and its p from the F distribution. Undefined with
 *  fewer than two groups of two. */
export function levene(groups: number[][]): { w: number; p: number; df1: number; df2: number } | undefined {
  const g = groups.filter(x => x.length >= 2);
  if (g.length < 2) return undefined;
  const dev = g.map(x => { const m = median(x); return x.map(v => Math.abs(v - m)); });
  const all = dev.flat(), N = all.length, grand = mean(all);
  const ssb = dev.reduce((s, d) => s + d.length * (mean(d) - grand) ** 2, 0);
  const ssw = dev.reduce((s, d) => { const m = mean(d); return s + d.reduce((t, v) => t + (v - m) ** 2, 0); }, 0);
  const df1 = g.length - 1, df2 = N - g.length;
  if (!(ssw > 0)) return undefined;
  const w = (ssb / df1) / (ssw / df2);
  return { w, p: 1 - fCdf(w, df1, df2), df1, df2 };
}
export const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/* ============================ A WEEKLY NUMBER'S TREND ============================ */
/** The runs about the median (points on it ignored): the count, and the fewest expected at 5% two-sided by the
 *  exact runs distribution for the counts above and below — fewer is a shift or a trend. */
export function runsAboutMedian(xs: number[]): { runs: number; fewest: number; above: number; below: number; signal: boolean } | undefined {
  const m = median(xs), s = xs.filter(x => x !== m).map(x => (x > m ? 1 : -1));
  const above = s.filter(v => v > 0).length, below = s.length - above;
  if (above < 2 || below < 2) return undefined;
  let runs = 1; for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1]) runs++;
  /* the smallest r with P(R ≤ r) > 2.5% — fewer than r runs is the signal */
  const C = (n: number, k: number): number => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  const total = C(above + below, above); let cum = 0, fewest = 2;
  for (let r = 2; r <= above + below; r++) {
    const kk = Math.floor(r / 2);
    const p = r % 2 === 0 ? 2 * C(above - 1, kk - 1) * C(below - 1, kk - 1) : C(above - 1, kk) * C(below - 1, kk - 1) + C(above - 1, kk - 1) * C(below - 1, kk);
    cum += p / total;
    if (cum > 0.025) { fewest = r; break; }
  }
  return { runs, fewest, above, below, signal: runs < fewest };
}
/** Mann–Kendall's S, Kendall's τ (b, with ties) and the p by the normal approximation with the continuity
 *  correction; Sen's slope the median of the pairwise slopes. Undefined under 8 points. */
export function mannKendall(xs: number[]): { s: number; tau: number; p: number; slope: number } | undefined {
  const n = xs.length;
  if (n < 8) return undefined;
  let s = 0; const slopes: number[] = []; const ties = new Map<number, number>();
  for (let i = 0; i < n; i++) { ties.set(xs[i], (ties.get(xs[i]) ?? 0) + 1); for (let j = i + 1; j < n; j++) { s += Math.sign(xs[j] - xs[i]); slopes.push((xs[j] - xs[i]) / (j - i)); } }
  const tieTerm = [...ties.values()].reduce((t, c) => t + c * (c - 1) * (2 * c + 5), 0);
  const varS = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;
  const z = s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const pairs = n * (n - 1) / 2, tiesPairs = [...ties.values()].reduce((t, c) => t + c * (c - 1) / 2, 0);
  const tau = s / Math.sqrt((pairs - tiesPairs) * pairs);
  return { s, tau, p, slope: median(slopes) };
}
