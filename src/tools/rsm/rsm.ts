/* OPTIMISING SETTINGS — the response surface (FC-112; knowledge/specs/FC-112-response-surface.md; knowledge/methods/stats/response-surface.md).
 *
 * Two or three factors, each run at five levels (a central composite design, face-centred or rotatable) or three (a Box–Behnken design, three factors), the runs
 * made in an order shuffled from a stored seed with centre runs repeated, the response typed as each is made. A quadratic model in coded units
 * ŷ = b₀ + Σbᵢxᵢ + Σbᵢᵢxᵢ² + Σbᵢⱼxᵢxⱼ is fitted by least squares; its standard errors, R², adjusted and PREDICTED R² (from PRESS), the whole-model F and the
 * LACK OF FIT against the centre runs' pure error are worked out; the stationary point −½B⁻¹b and the eigenvalues of B say whether it is a minimum, a maximum or a
 * saddle; the point is only quoted if it lies inside what was run — outside, or when it is the wrong kind, the best setting INSIDE the region is given on its edge
 * with "move the box and run again". Intervals for the mean and a single run at the chosen setting, and a confirmation run compared with the prediction interval.
 * Pure; the page and the paper read this module. The arithmetic of the fit is hand-rolled (normal equations by Gauss–Jordan); the t and F tails are lib/ie. */
import type { RsmSetup, ScoredRow } from '../../lib/study';
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredContext, ScoredRanked, ScoredResult, ScoredTable } from '../scored/types';
import { fCdf } from '../../lib/ie/dist';
import { tCdf, tQuantile } from '../../lib/ie/stats';
import { cornerOf, shuffled } from '../../lib/ie/factorial';

export type Design = NonNullable<RsmSetup['design']>;
export const DESIGNS: { key: Design; word: string; says: string; kMin: number; kMax: number }[] = [
  { key: 'ccf', word: 'Central composite, face-centred', says: 'corners, the middle of each face and the centre — three levels a factor, never outside the box you set', kMin: 2, kMax: 3 },
  { key: 'ccc', word: 'Central composite, rotatable', says: 'corners, points beyond them on each axis and the centre — five levels a factor, as sure in every direction', kMin: 2, kMax: 3 },
  { key: 'bbd', word: 'Box–Behnken', says: 'the middle of each edge and the centre — three levels, no corner run (three factors)', kMin: 3, kMax: 3 },
];
export const RSM_MAX_CENTRE = 8;
const plural = (n: number, one: string, many = `${one}s`): string => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const sig = (v: number, n = 3): string => (Number.isFinite(v) ? String(Number(v.toPrecision(n))) : '—');
const pSay = (p: number): string => (p < 0.0001 ? 'p < 0.0001' : `p ${p.toFixed(p < 0.01 ? 4 : 2)}`);
const gbp = (v: number): string => `£${v.toLocaleString('en-GB', { minimumFractionDigits: v < 100 ? 2 : 0, maximumFractionDigits: v < 100 ? 2 : 0 })}`;

/* ------------------------------------------- the design ------------------------------------------- */
/** The coded points of a design, without the centre runs. Rotatable α = (2ᵏ)^¼ — proved rotatable in the record. */
export function designPoints(k: number, design: Design): number[][] {
  if (design === 'bbd') {
    const out: number[][] = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) for (const a of [-1, 1]) for (const b of [-1, 1]) { const x = Array(k).fill(0); x[i] = a; x[j] = b; out.push(x); }
    return out;
  }
  const alpha = design === 'ccf' ? 1 : Math.pow(2 ** k, 0.25), out: number[][] = Array.from({ length: 2 ** k }, (_, i) => cornerOf(k, i) as number[]);
  for (let i = 0; i < k; i++) for (const s of [-1, 1]) { const x = Array(k).fill(0); x[i] = s * alpha; out.push(x); }
  return out;
}
/** The runs to make, centre runs included, in the order shuffled from `seed`. */
export function runPlan(k: number, design: Design, centre: number, seed: number): number[][] {
  const all = [...designPoints(k, design), ...Array.from({ length: centre }, () => Array(k).fill(0))];
  return shuffled(all.length, seed).map(i => all[i]);
}
export const terms = (k: number): number => 1 + 2 * k + (k * (k - 1)) / 2;
export function runCount(k: number, design: Design, centre: number): number { return designPoints(k, design).length + centre; }

/** What the setup asks of a person before a sheet can be made — "" when it is fit. */
export function setupProblem(s: RsmSetup | undefined): string {
  const fs = s?.factors ?? [];
  if (fs.length < 2 || fs.length > 3) return 'The factors — two or three, each with a name, a low and a high setting.';
  if (fs.some(f => !f.name.trim())) return 'Every factor needs a name.';
  if (new Set(fs.map(f => f.name.trim().toLowerCase())).size !== fs.length) return 'Two factors have the same name.';
  if (fs.some(f => !Number.isFinite(f.low) || !Number.isFinite(f.high) || !(f.high > f.low))) return 'Every factor needs a low and a high setting — numbers, the high above the low.';
  const d = DESIGNS.find(x => x.key === s?.design);
  if (!d) return 'Pick a design.';
  if (fs.length < d.kMin || fs.length > d.kMax) return `${d.word} needs ${d.kMin === d.kMax ? `${d.kMin} factors` : `${d.kMin} to ${d.kMax} factors`}.`;
  if (!Number.isInteger(s?.centre) || (s?.centre as number) < 0 || (s?.centre as number) > RSM_MAX_CENTRE) return `Centre runs — 0 to ${RSM_MAX_CENTRE}; the pure error, and so the lack-of-fit test, needs two or more.`;
  if (!Number.isFinite(s?.seed)) return 'The run order has no seed.';
  return '';
}

/* ------------------------------------------- the linear algebra (small) ------------------------------------------- */
type Mat = number[][];
function invert(A: Mat): Mat | undefined {
  const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-11) return undefined;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map(r => r.slice(n));
}
const mul = (A: Mat, v: number[]): number[] => A.map(r => r.reduce((s, a, j) => s + a * v[j], 0));
/** Eigenvalues of a small symmetric matrix by Jacobi rotations. */
export function eigenvalues(S: Mat): number[] {
  const n = S.length, A = S.map(r => [...r]);
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (off < 1e-24) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const kp = A[k][p], kq = A[k][q]; A[k][p] = c * kp - s * kq; A[k][q] = s * kp + c * kq; }
      for (let k = 0; k < n; k++) { const pk = A[p][k], qk = A[q][k]; A[p][k] = c * pk - s * qk; A[q][k] = s * pk + c * qk; }
    }
  }
  return A.map((r, i) => r[i]).sort((a, b) => a - b);
}

/* ------------------------------------------- the fit ------------------------------------------- */
/** The quadratic's terms for a coded point, in the order intercept, linear, squares, cross-products. */
export function termsOf(x: number[]): number[] {
  const k = x.length, v = [1, ...x, ...x.map(a => a * a)];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) v.push(x[i] * x[j]);
  return v;
}
export function termNames(names: string[]): string[] {
  const k = names.length, out = ['Intercept', ...names, ...names.map(n => `${n}²`)];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) out.push(`${names[i]} × ${names[j]}`);
  return out;
}
export interface Coef { name: string; b: number; se: number; t: number; p: number }
export interface Fit {
  n: number; p: number; df: number; coefs: Coef[]; b: number[]; s: number; sse: number; sst: number; r2: number; adj: number; pred?: number; f: number; pF: number;
  lof?: { ssLof: number; dfLof: number; ssPe: number; dfPe: number; f: number; p: number }; minv: Mat; tq: number;
}
export function fitSurface(xs: number[][], ys: number[], names: string[]): Fit | { problem: string } {
  const n = ys.length, k = names.length, p = terms(k);
  if (n <= p) return { problem: `${n} run${n === 1 ? '' : 's'} with a response — a ${k}-factor quadratic has ${p} terms and needs at least ${p + 1}.` };
  const X = xs.map(termsOf), Xt = Array.from({ length: p }, (_, j) => X.map(r => r[j]));
  const XtX = Xt.map(a => Xt.map(b => a.reduce((s, v, i) => s + v * b[i], 0)));
  const minv = invert(XtX);
  if (!minv) return { problem: 'The runs cannot separate every term of the quadratic — a run is missing or repeated where the design needs it.' };
  const b = mul(minv, Xt.map(a => a.reduce((s, v, i) => s + v * ys[i], 0)));
  const fitted = X.map(r => r.reduce((s, v, j) => s + v * b[j], 0)), e = ys.map((y, i) => y - fitted[i]);
  const sse = e.reduce((s, v) => s + v * v, 0), ybar = ys.reduce((s, v) => s + v, 0) / n, sst = ys.reduce((s, v) => s + (v - ybar) ** 2, 0), df = n - p;
  if (!(sst > 0)) return { problem: 'Every response is the same — there is nothing for a surface to explain.' };
  const mse = sse / df, s = Math.sqrt(mse), names2 = termNames(names);
  const coefs: Coef[] = b.map((bj, j) => { const se = s * Math.sqrt(minv[j][j]), t = se > 0 ? bj / se : 0; return { name: names2[j], b: bj, se, t, p: se > 0 ? 2 * (1 - tCdf(Math.abs(t), df)) : bj === 0 ? 1 : 0 }; });
  const h = X.map(r => r.reduce((s2, v, i) => s2 + v * minv[i].reduce((q, m, j) => q + m * r[j], 0), 0));
  const press = e.reduce((s2, ei, i) => s2 + (1 - h[i] > 1e-9 ? (ei / (1 - h[i])) ** 2 : NaN), 0);
  const ssr = sst - sse, f = (ssr / (p - 1)) / mse;
  const groups = new Map<string, number[]>(); xs.forEach((x, i) => { const key = x.map(v => v.toFixed(9)).join('|'); groups.set(key, [...(groups.get(key) ?? []), ys[i]]); });
  let ssPe = 0, dfPe = 0; for (const g of groups.values()) if (g.length > 1) { const m = g.reduce((s2, v) => s2 + v, 0) / g.length; ssPe += g.reduce((s2, v) => s2 + (v - m) ** 2, 0); dfPe += g.length - 1; }
  const dfLof = df - dfPe, ssLof = sse - ssPe;
  const lofF = dfPe > 0 && dfLof > 0 && ssPe > 0 ? (ssLof / dfLof) / (ssPe / dfPe) : undefined;
  return { n, p, df, coefs, b, s, sse, sst, r2: 1 - sse / sst, adj: 1 - (sse / df) / (sst / (n - 1)), ...(Number.isFinite(press) ? { pred: 1 - press / sst } : {}), f, pF: 1 - fCdf(f, p - 1, df), minv, tq: tQuantile(0.975, df),
    ...(lofF !== undefined ? { lof: { ssLof, dfLof, ssPe, dfPe, f: lofF, p: 1 - fCdf(lofF, dfLof, dfPe) } } : {}) };
}
export const predict = (fit: Fit, x: number[]): number => termsOf(x).reduce((s, v, j) => s + v * fit.b[j], 0);
/** Half-widths at a coded point: the mean's interval and a single run's. */
export function halfWidths(fit: Fit, x: number[]): { mean: number; run: number } {
  const v = termsOf(x), q = v.reduce((s, vi, i) => s + vi * fit.minv[i].reduce((a, m, j) => a + m * v[j], 0), 0);
  return { mean: fit.tq * fit.s * Math.sqrt(q), run: fit.tq * fit.s * Math.sqrt(1 + q) };
}

/* ------------------------------------------- the stationary point and the best inside the region ------------------------------------------- */
export interface Stationary { x: number[]; y: number; eig: number[]; nature: 'minimum' | 'maximum' | 'saddle'; ridge: boolean }
export function stationary(fit: Fit, k: number): Stationary | undefined {
  const b1 = fit.b.slice(1, 1 + k), B: Mat = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) B[i][i] = fit.b[1 + k + i];
  let c = 1 + 2 * k; for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { B[i][j] = B[j][i] = fit.b[c++] / 2; }
  const eig = eigenvalues(B), top = Math.max(...eig.map(Math.abs)), Bi = invert(B);
  if (!Bi || top === 0) return undefined;
  const x = mul(Bi, b1).map(v => -v / 2), y = fit.b[0] + 0.5 * b1.reduce((s, v, i) => s + v * x[i], 0);
  const tiny = 1e-9 * top, nature = eig.every(l => l < -tiny) ? 'maximum' : eig.every(l => l > tiny) ? 'minimum' : 'saddle';
  return { x, y, eig, nature, ridge: Math.min(...eig.map(Math.abs)) < 0.1 * top };
}
const norm = (x: number[]): number => Math.sqrt(x.reduce((s, v) => s + v * v, 0));
/** The best predicted setting inside the ball of radius `r` — a grid, 0.02 for two factors, 0.05 for three. */
export function bestInside(fit: Fit, k: number, r: number, goal: 'min' | 'max'): { x: number[]; y: number } {
  const step = k === 2 ? 0.02 : 0.05, n = Math.ceil(r / step);
  let best: { x: number[]; y: number } | undefined;
  const sign = goal === 'min' ? 1 : -1, cand = (x: number[]) => { if (norm(x) > r + 1e-9) return; const y = predict(fit, x); if (!best || sign * (y - best.y) < 0) best = { x, y }; };
  const g = (i: number) => i * step;
  if (k === 2) { for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) cand([g(i), g(j)]); }
  else for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let l = -n; l <= n; l++) cand([g(i), g(j), g(l)]);
  /* the edge itself, where a corner or an axis point of the ball lies off the grid */
  const rim = 720; for (let a = 0; a < rim; a++) { const t = (a / rim) * 2 * Math.PI; if (k === 2) cand([r * Math.cos(t), r * Math.sin(t)]); }
  return best as { x: number[]; y: number };
}

/* ------------------------------------------- reading the sheet ------------------------------------------- */
export interface RunRead { id: string; no: number; x: number[]; y?: number; settings: string }
export const settingOf = (s: RsmSetup, j: number, coded: number): number => { const f = s.factors[j]; return (f.low + f.high) / 2 + coded * (f.high - f.low) / 2; };
const num = (v: number): string => String(Number(v.toPrecision(4)));
export const settingsWords = (s: RsmSetup, x: number[]): string => s.factors.map((f, j) => `${f.name.trim()} ${num(settingOf(s, j, x[j]))}${f.unit ? ` ${f.unit}` : ''}`).join(', ');
export function readRuns(rows: ScoredRow[], s: RsmSetup | undefined): RunRead[] {
  const k = s?.factors.length ?? 0;
  return rows.filter(r => r.run && Array.isArray(r.run.x) && r.run.x.length === k).map((r, i) => ({ id: r.id, no: i + 1, x: r.run?.x as number[], ...(typeof r.run?.y === 'number' && Number.isFinite(r.run.y) ? { y: r.run.y } : {}), settings: s ? settingsWords(s, r.run?.x as number[]) : '' }));
}

export interface RsmOut { result: ScoredResult; table: ScoredTable; ranked: ScoredRanked[]; fit: Fit; station?: Stationary; best: { x: number[]; y: number; edge: boolean; stationary: boolean }; runs: RunRead[]; rMax: number }
export function rsmAnalyse(a: { rows: ScoredRow[]; ctx: ScoredContext }): { problems: string[] } | RsmOut {
  const s = a.ctx.rsm, bad = setupProblem(s);
  if (!s || bad) return { problems: [bad || 'Set the factors and make the run sheet.'] };
  const runs = readRuns(a.rows, s), k = s.factors.length, names = s.factors.map(f => f.name.trim());
  if (!runs.length) return { problems: ['Make the run sheet — the runs to make, in the order to make them.'] };
  const done = runs.filter(r => r.y !== undefined), unit = s.unit?.trim() ?? '', what = s.response?.trim() || 'The response';
  const fit = fitSurface(done.map(r => r.x), done.map(r => r.y as number), names);
  if ('problem' in fit) return { problems: [`${done.length} of ${runs.length} runs have a response. ${fit.problem}`] };
  const goal = s.goal === 'max' ? 'max' : 'min', st = stationary(fit, k), rMax = Math.max(...runs.map(r => norm(r.x)));
  const inside = !!st && norm(st.x) <= rMax + 1e-9, wanted = !!st && st.nature === (goal === 'min' ? 'minimum' : 'maximum');
  const useStationary = !!st && inside && wanted;
  const edge = useStationary ? undefined : bestInside(fit, k, rMax, goal);
  const bx = useStationary ? (st as Stationary).x : (edge as { x: number[] }).x, by = predict(fit, bx), hw = halfWidths(fit, bx);
  const u = unit ? ` ${unit}` : '';
  const at = settingsWords(s, bx);
  const lof = fit.lof, lofSays = lof ? `Lack of fit F ${sig(lof.f, 2)}, ${pSay(lof.p)} — ${lof.p < 0.05 ? 'the quadratic does not describe the runs: a cubic term, a transform or a run that went wrong; do not trust the best setting' : 'no sign the quadratic is wrong'}.` : 'Lack of fit cannot be tested — it needs two or more centre runs to give the pure error.';
  const where = useStationary ? `The best setting is the stationary point, ${at} — a ${st?.nature}, ${sig(norm(bx), 2)} from the centre against ${sig(rMax, 3)} run, inside what was run; predicted ${sig(by)}${u}.`
    : st && inside && !wanted ? `The stationary point (${settingsWords(s, st.x)}) is a ${st.nature}, not the ${goal === 'min' ? 'minimum' : 'maximum'} wanted; the best inside what was run is on its edge, ${at}, predicted ${sig(by)}${u}.`
    : st && st.nature !== 'saddle' ? `The ${st.nature} lies at ${sig(norm(st.x), 3)} from the centre — beyond the ${sig(rMax, 3)} that was run, so it is not quoted. The best inside what was run is on its edge, ${at}, predicted ${sig(by)}${u}: the best setting is beyond what you tried — move the box and run again.`
    : `The surface is a saddle or has no single stationary point — a ridge, to be walked rather than quoted; the best inside what was run is ${at}, predicted ${sig(by)}${u}.`;
  const conf = s.confirm !== undefined && Number.isFinite(s.confirm) ? s.confirm : undefined;
  const confSays = conf === undefined ? 'No confirmation run yet: make one run at the chosen setting and type it — the surface is a prediction until it is checked.'
    : Math.abs(conf - by) <= hw.run ? `The confirmation run, ${sig(conf)}${u}, is inside the prediction interval ${sig(by - hw.run)} to ${sig(by + hw.run)}${u} — the model holds at that setting.`
      : `The confirmation run, ${sig(conf)}${u}, is outside the prediction interval ${sig(by - hw.run)} to ${sig(by + hw.run)}${u} — the surface does not hold there; do not adopt the setting.`;
  const sentence = [`${what}: ${plural(done.length, 'run')} of ${runs.length} fitted to ${plural(fit.p, 'term')}${fit.df < 3 ? ' — few degrees of freedom, the intervals are wide' : ''}. R² ${sig(fit.r2, 3)}, adjusted ${sig(fit.adj, 3)}${fit.pred !== undefined ? `, predicted ${sig(fit.pred, 3)}` : ''}; the whole model ${pSay(fit.pF)}. ${lofSays}`,
    where, `At that setting the mean is ${sig(by)} ± ${sig(hw.mean)}${u} (95%) and a single run ${sig(hw.run)}${u} either side. ${confSays}`].join(' ');
  const good = useStationary && (!lof || lof.p >= 0.05) && (conf === undefined || Math.abs(conf - by) <= hw.run);
  const tone: LeanTone = lof && lof.p < 0.05 ? 'r' : conf !== undefined && Math.abs(conf - by) > hw.run ? 'r' : good && conf !== undefined ? 'g' : 'a';
  const verdict = lof && lof.p < 0.05 ? 'Does not fit' : conf !== undefined && Math.abs(conf - by) > hw.run ? 'Not confirmed' : useStationary ? (conf !== undefined ? 'Confirmed' : `Best ${sig(by)}${u}`) : 'Beyond the runs';
  const tiles: LeanTile[] = [
    { k: 'Runs', v: `${done.length}`, of: `of ${runs.length}`, ...(done.length < runs.length ? { tone: 'a' as LeanTone } : {}) },
    { k: 'R²', v: sig(fit.r2, 3), of: fit.pred !== undefined ? `predicted ${sig(fit.pred, 3)}` : `adjusted ${sig(fit.adj, 3)}` },
    { k: 'Lack of fit', v: lof ? pSay(lof.p).replace('p ', '') : '—', of: lof ? (lof.p < 0.05 ? 'p — the quadratic is wrong' : 'p — no sign') : 'needs centre runs', ...(lof && lof.p < 0.05 ? { tone: 'r' as LeanTone } : {}) },
    { k: useStationary ? 'Best setting' : 'Best inside', v: `${sig(by)}${u}`, of: at },
    { k: 'Distance', v: sig(norm(bx), 2), of: `of ${sig(rMax, 3)} run${useStationary ? '' : ' — on the edge'}`, ...(useStationary ? {} : { tone: 'a' as LeanTone }) },
  ];
  const money: string[] = [];
  const ppr = s.packsPerRun, mat = s.materialsPerPack;
  if (ppr !== undefined && ppr > 0 && mat !== undefined && mat > 0) money.push(`The ${runs.length} runs cost about ${gbp(runs.length * ppr * mat)} in materials (${runs.length} × ${ppr.toLocaleString('en-GB')} packs × ${gbp(mat)} a pack) — the price of the answer, before any saving.`);
  else money.push('Give the packs a run uses and the materials a pack to see what the runs cost. The saving from a better setting is in the response’s own unit; price it with the capability study’s give-away costs. Nothing waits on it.');
  const closing = `${verdict} — ${plural(done.length, 'run')} of ${runs.length}, R² ${sig(fit.r2, 3)}${fit.pred !== undefined ? ` (predicted ${sig(fit.pred, 3)})` : ''}.`;
  const caveats = [
    'A quadratic describes the surface only inside the box that was run; the same formula beyond it is a parabola with no physics behind it — which is why a stationary point outside the runs is not quoted.',
    'The fit assumes the runs were made in the order given with the other conditions held; replicates at the centre are real repeats, not the same reading twice. Run in the order shuffled, or a drifting machine looks like a factor.',
    'Predicted R² far below R² means the model fits the runs and predicts nothing; a significant lack of fit means a cubic term, a transform or a run that went wrong — never “good model”.',
    'One response is optimised at a time; the window where the prediction stays near the best, several responses at once (desirability) and blocks are not built.',
  ];
  const coefRows = fit.coefs.map(c => [c.name, sig(c.b, 4), sig(c.se, 3), sig(c.t, 3), pSay(c.p).replace('p ', '')]);
  const table: ScoredTable = { head: ['Term (coded units)', 'Coefficient', 'Std error', 't', 'p'], rows: coefRows, foot: [], shares: [0.36, 0.2, 0.18, 0.12, 0.14], columnIds: [] };
  const lists = [{ title: 'The runs, in the order to make them', lines: runs.map(r => `Run ${r.no} · ${r.settings}${r.y !== undefined ? ` → ${sig(r.y, 4)}${u}` : ' → not run yet'}`) }];
  const result: ScoredResult = { verdict, tone, sentence, tiles, closing, caveats, ...(money.length ? { money } : {}), lists };
  return { result, table, ranked: done.map((r, i) => ({ id: r.id, name: `Run ${r.no}`, score: i + 1, class: 'run' })), fit, ...(st ? { station: st } : {}), best: { x: bx, y: by, edge: !useStationary, stationary: useStationary }, runs, rMax };
}
export const rsmStart = (): ScoredRow[] => [];
