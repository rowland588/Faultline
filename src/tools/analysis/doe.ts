/* DESIGNED EXPERIMENTS — which settings drive the result, and do they interact? (FC-111; knowledge/specs/FC-111-doe.md; lib/ie/factorial).
 *
 * Two to five factors, each at a low and a high setting typed by hand; every corner of the design run `replicates` times (and any centre runs) in an
 * order shuffled from a stored seed and said; the response typed as each run is made. The effects, which are real and the settings the fitted model
 * puts best are worked out by lib/ie/factorial; this module turns the readings of a study into the run sheet, the figures and the sentences the page
 * and the paper say — never a second copy of either. Imports only the TYPES of ./analysis, so there is no cycle. */
import type { AgreedAnalysis, AgreedDoe, StudyReading } from '../../lib/study';
import type { LeanTile } from '../../lib/lean';
import { analyseFactorial, bestCorner, cornerIndex, modelMasks, modelR2, planRuns, simpleEffect, type BestCorner, type FactorialResult, type PlannedRun, type Term } from '../../lib/ie/factorial';
import { big, fx, pctWord, pSay } from './format';
import type { AnalysisSays, Base, Check, PicRow, Tone } from './analysis';
import type { Grid } from './measure';

export const DOE_MIN_FACTORS = 2;
export const DOE_MAX_FACTORS = 5;
export const DOE_MAX_REPLICATES = 4;
export const DOE_MAX_CENTRE = 6;
/** The lanes of the picture: the largest effects; the rest are in the table. */
export const DOE_LANES = 8;

/* ------------------------------------------- agreeing ------------------------------------------------- */
export function doeProblem(name: string, d: AgreedDoe | undefined): string {
  if (!name.trim()) return 'What is measured — the response, "Seal strength".';
  const fs = d?.factors ?? [];
  if (fs.length < DOE_MIN_FACTORS || fs.length > DOE_MAX_FACTORS) return `The factors — ${DOE_MIN_FACTORS} to ${DOE_MAX_FACTORS}, each with a name, a low and a high setting.`;
  if (fs.some(f => !f.name.trim())) return 'Every factor needs a name.';
  if (new Set(fs.map(f => f.name.trim().toLowerCase())).size !== fs.length) return 'Two factors have the same name.';
  if (fs.some(f => !Number.isFinite(f.low) || !Number.isFinite(f.high))) return `Every factor needs a low and a high setting — numbers.`;
  const bad = fs.find(f => !(f.high > f.low));
  if (bad) return `${bad.name.trim()}: the high setting has to be above the low one.`;
  if (!Number.isInteger(d?.replicates) || (d?.replicates as number) < 1 || (d?.replicates as number) > DOE_MAX_REPLICATES) return `How many times each corner is run — 1 to ${DOE_MAX_REPLICATES}.`;
  if (d?.centre !== undefined && (!Number.isInteger(d.centre) || d.centre < 0 || d.centre > DOE_MAX_CENTRE)) return `Centre runs — 0 to ${DOE_MAX_CENTRE}.`;
  if (!Number.isFinite(d?.seed)) return 'The run order has no seed.';
  if ((d?.packsPerRun !== undefined && !(d.packsPerRun >= 0)) || (d?.materialsPerPack !== undefined && !(d.materialsPerPack >= 0))) return 'Packs a run and materials a pack — numbers, not below 0.';
  return '';
}
const num = (v: number): string => String(Number(v.toPrecision(6)));
const setting = (d: AgreedDoe, j: number, level: number): string => { const f = d.factors[j], v = level < 0 ? f.low : level > 0 ? f.high : (f.low + f.high) / 2; return `${num(v)}${f.unit ? ` ${f.unit}` : ''}`; };
const levelWord = (level: number): string => (level < 0 ? 'low' : level > 0 ? 'high' : 'centre');
export const doeTermName = (d: AgreedDoe, factors: number[]): string => factors.map(j => d.factors[j].name.trim()).join(' × ');

/** The runs in the order to make them. */
export const doePlan = (d: AgreedDoe): PlannedRun[] => planRuns(d.factors.length, d.replicates, d.centre ?? 0, d.seed);
/** The line of a run: "Seal temperature 170 °C, Dwell 0.8 s, Pressure 3 bar". */
export function doeRunWords(d: AgreedDoe, run: Pick<PlannedRun, 'levels'>): string { return d.factors.map((f, j) => `${f.name.trim()} ${setting(d, j, run.levels[j])}`).join(', '); }
export function doeAgreedWords(d: AgreedDoe): string {
  return `, ${d.factors.map(f => `${f.name.trim()} ${num(f.low)}–${num(f.high)}${f.unit ? ` ${f.unit}` : ''}`).join(', ')}; every corner run ${d.replicates} time${d.replicates === 1 ? '' : 's'}${d.centre ? `, ${d.centre} centre run${d.centre === 1 ? '' : 's'}` : ''}, in a random order shuffled from ${d.seed}`;
}
/** What one reading says, in a line: "Run 7 · Seal temperature 170 °C, Dwell 0.8 s → 10.1 N". */
export function doeReadingWord(a: Pick<AgreedAnalysis, 'doe' | 'unit'>, r: StudyReading): string {
  const d = a.doe, u = a.unit ? ` ${a.unit}` : '';
  if (!d || !r.xs || r.xs.length !== d.factors.length) return typeof r.value === 'number' ? `${r.value}${u}` : '—';
  return `Run ${r.arm ?? '?'} · ${doeRunWords(d, { levels: r.xs })} → ${typeof r.value === 'number' ? `${r.value}${u}` : '—'}`;
}

/* ------------------------------------------- the figures ----------------------------------------------- */
export interface DoeFigures extends Base {
  kind: 'doe'; d: AgreedDoe; problem: string; k: number; better: 'lower' | 'higher' | 'either'; plan: PlannedRun[]; needed: number; done: number;
  /** the response at each run slot, by the slot's number */ responses: Map<number, number>; unusable: number;
  /** readings at each corner (standard order) and at the centre */ counts: number[]; centreN: number; balanced: boolean; r?: number; short: string[];
  res?: FactorialResult; masks: number[]; best?: BestCorner; r2?: number;
  money?: { runs: number; packs?: number; gbp?: number; missing?: string };
}
const live = (rs: StudyReading[]): StudyReading[] => rs.filter(r => !r.struck);
const cornerName = (d: AgreedDoe, i: number): string => d.factors.map((f, j) => `${f.name.trim()} ${((i >> j) & 1) ? 'high' : 'low'}`).join(', ');

export function doeFigures(a: AgreedDoe | undefined, name: string, better: 'lower' | 'higher' | 'either', readings: StudyReading[], base: Base): DoeFigures {
  const d = a ?? { factors: [], replicates: 1, seed: 0 }, problem = doeProblem(name, a), k = d.factors.length;
  const f: DoeFigures = { ...base, kind: 'doe', d, problem, k, better, plan: [], needed: 0, done: 0, responses: new Map(), unusable: 0, counts: [], centreN: 0, balanced: false, short: [], masks: [] };
  if (problem) return f;
  f.plan = doePlan(d); f.needed = f.plan.length; f.counts = Array.from({ length: 2 ** k }, () => 0);
  const cells: number[][] = Array.from({ length: 2 ** k }, () => []), centre: number[] = [];
  for (const r of live(readings)) {
    if (typeof r.value !== 'number' || !Number.isFinite(r.value) || !Array.isArray(r.xs) || r.xs.length !== k) { f.unusable++; continue; }
    const slot = Number(r.arm);
    if (r.xs.every(x => x === 0)) { centre.push(r.value); f.centreN++; if (Number.isInteger(slot)) f.responses.set(slot, r.value); continue; }
    const i = cornerIndex(r.xs);
    if (i === undefined) { f.unusable++; continue; }
    cells[i].push(r.value); f.counts[i]++; if (Number.isInteger(slot)) f.responses.set(slot, r.value);
  }
  f.done = f.counts.reduce((a2, b) => a2 + b, 0) + f.centreN;
  const most = Math.max(...f.counts), least = Math.min(...f.counts);
  f.balanced = least >= 1 && most === least; f.r = f.balanced ? least : undefined;
  if (!f.balanced) {
    f.short = f.counts.map((c, i) => [c, i] as const).filter(([c]) => c < most || most < 1).slice(0, 4).map(([c, i]) => `${cornerName(d, i)} (${c} of ${most > 0 ? most : d.replicates})`);
    return f;
  }
  const res = analyseFactorial(k, cells, base.conf, centre);
  if (!res) return f;
  f.res = res; f.masks = modelMasks(res);
  if (better !== 'either' && f.masks.length) f.best = bestCorner(res, f.masks, better, base.conf);
  f.r2 = res.anova ? modelR2(res, f.masks) : undefined;
  /* the checks */
  const ck: Check[] = [];
  if (f.unusable) ck.push({ what: 'Readings', say: `Readings: ${f.unusable} reading${f.unusable === 1 ? '' : 's'} do not belong to this design (a different number of factors, or a setting that is neither low, high nor centre) — left out.`, tone: 'a' });
  if (res.r !== d.replicates) ck.push({ what: 'Replicates', say: `Replicates: ${res.r} reading${res.r === 1 ? '' : 's'} at every corner so far, ${d.replicates} agreed — worked out on what is there.`, tone: 'n' });
  if (res.mode === 'lenth') ck.push({ what: 'Error', say: 'Error: one reading at each corner gives no estimate of the noise, so the effects are judged against each other (Lenth’s method). It works when most effects are nothing — run a replicate to be sure.', tone: 'a' });
  else if (res.anova && res.anova.mse === 0) ck.push({ what: 'Error', say: 'Error: the readings at each corner are identical, so there is no spread to test against — every effect that moves the result at all is called real.', tone: 'a' });
  if (res.curvature) {
    const c = res.curvature;
    ck.push(Number.isFinite(c.p) ? { what: 'Curvature', say: c.p < base.alpha ? `Curvature: the centre runs average ${fx(c.meanC, base.dp + 1)} against ${fx(c.meanF, base.dp + 1)} at the corners (F ${fx(c.f, 2)} on 1 and ${c.df}, ${pSay(c.p)}) — the result bends between the two levels, so a straight line through them is not enough; a response surface (FC-112) is the next step.` : `Curvature: the centre runs average ${fx(c.meanC, base.dp + 1)} against ${fx(c.meanF, base.dp + 1)} at the corners (F ${fx(c.f, 2)} on 1 and ${c.df}, ${pSay(c.p)}) — no sign of a bend between the levels.`, tone: c.p < base.alpha ? 'a' : 'n' }
      : { what: 'Curvature', say: `Curvature: ${c.nC} centre run — at least two are needed to judge a bend against their own spread.`, tone: 'n' });
  } else ck.push({ what: 'Curvature', say: 'Curvature: with no centre runs a two-level design cannot see a bend between its levels — it draws a straight line between low and high.', tone: 'n' });
  f.checks = ck;
  const runs = f.needed, packs = d.packsPerRun, mat = d.materialsPerPack;
  f.money = packs !== undefined && mat !== undefined ? { runs, packs: runs * packs, gbp: runs * packs * mat } : { runs, missing: `Give ${packs === undefined && mat === undefined ? 'the packs a run makes and what a pack’s materials cost' : packs === undefined ? 'the packs a run makes' : 'what a pack’s materials cost'} and this says what the experiment costs.` };
  return f;
}

/* ------------------------------------------- the words --------------------------------------------------- */
const signed = (v: number, dp: number): string => `${v < 0 ? '−' : '+'}${fx(Math.abs(v), dp)}`;
const list = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const NOT_CLAIMED = 'A factorial shows what moved the result between the two settings tried, in these ranges, in the order the runs were made — not the shape between them (only centre runs warn of a bend), and not a cause outside the ranges. Run a confirmation at the settings chosen before the standard changes.';

export function doeSays(f: DoeFigures, a: AgreedAnalysis): AnalysisSays {
  const name = a.name.trim() || 'The response', u = a.unit ? ` ${a.unit}` : '', dp = f.dp + 1, d = f.d;
  const none = (text: string, verdict: string): AnalysisSays => ({ text, tone: 'n', verdict, more: [], notClaimed: '' });
  if (f.problem) return none(f.problem, 'Not set up');
  const sorted = f.plan;
  if (f.done === 0) {
    const first = sorted[0];
    return { text: `${f.k} factors, ${f.needed} runs (${2 ** f.k} corners × ${d.replicates}${d.centre ? ` and ${d.centre} centre run${d.centre === 1 ? '' : 's'}` : ''}), in the random order below. Make run 1 first — ${doeRunWords(d, first)} — then type the response.`, tone: 'n', verdict: 'Not started', more: [`The order was shuffled from ${d.seed} and is kept, so a drifting line cannot pass itself off as a factor.`], notClaimed: '' };
  }
  const res = f.res;
  if (!res) {
    const why = f.short.length ? ` Short: ${f.short.join('; ')}.` : '';
    return none(`${f.done} of ${f.needed} runs done — the effects are worked out once every corner has the same number of readings.${why}`, 'Runs to make');
  }
  const real = res.terms.filter(t => t.real).sort((x, y) => Math.abs(y.effect) - Math.abs(x.effect));
  const mains = res.terms.filter(t => t.factors.length === 1), mainsReal = mains.filter(t => t.real);
  const interacts = real.filter(t => t.factors.length > 1);
  const nameOf = (t: Term): string => doeTermName(d, t.factors);
  const spanOf = (t: Term): string => `${nameOf(t)} from ${setting(d, t.factors[0], -1)} to ${setting(d, t.factors[0], 1)}`;
  const margin = res.mode === 'anova' ? (t: Term) => ` (${pctWord(f.conf)} between ${signed(t.lo as number, dp)} and ${signed(t.hi as number, dp)}${u}; ${pSay(t.p as number)})` : (t: Term) => ` (beyond Lenth’s margin ±${fx(res.lenth?.me ?? 0, dp + 1)}${u}${t.firm ? `, and beyond the simultaneous ±${fx(res.lenth?.sme ?? 0, dp + 1)}${u}` : ''})`;
  const more: string[] = [];
  more.push(res.mode === 'anova' && res.anova
    ? `The noise comes from the replicates themselves: s = ${fx(Math.sqrt(res.anova.mse), dp)}${u} on ${res.anova.dfe} degrees of freedom; each effect is known to ±${fx(res.anova.se, dp)}${u} (one standard error), and a term is real when its t-test is under ${fx(f.alpha, 2)}.`
    : `One reading at each corner has no error of its own, so Lenth’s method judges the ${res.terms.length} effects against each other: the pseudo standard error is ${fx(res.lenth?.pse ?? 0, dp + 1)}${u}, the margin of error ±${fx(res.lenth?.me ?? 0, dp + 1)}${u} at ${pctWord(f.conf)} (±${fx(res.lenth?.sme ?? 0, dp + 1)}${u} for all ${res.terms.length} together). An effect beyond the margin is real.`);
  const top = interacts[0];
  if (top && top.factors.length === 2) {
    const [i, j] = top.factors, lo = simpleEffect(res, i, j, -1), hi = simpleEffect(res, i, j, 1);
    const how = lo * hi < 0 ? 'in opposite directions — each setting changes what the other does' : Math.abs(hi) > Math.abs(lo) ? 'and more at the higher setting — they reinforce each other' : 'and less at the higher setting — they work against each other';
    more.push(`The interaction, read as two numbers: ${d.factors[i].name.trim()} changes ${name} by ${signed(lo, dp)}${u} at ${d.factors[j].name.trim()} ${setting(d, j, -1)} and by ${signed(hi, dp)}${u} at ${setting(d, j, 1)} — ${how}.`);
  }
  if (f.best && f.masks.length) {
    const b = f.best, parts = b.levels.map((lv, j) => `${d.factors[j].name.trim()} ${lv === 0 ? 'either' : `${levelWord(lv)} (${setting(d, j, lv)})`}`);
    more.push(`Settings the fitted model puts best (${f.better} is better): ${parts.join(', ')} — expected ${fx(b.predicted, dp)}${u}${b.half !== undefined ? `, ${pctWord(f.conf)} between ${fx(b.predicted - b.half, dp)} and ${fx(b.predicted + b.half, dp)}${u} for the average of many runs there` : ' (no error estimate to put an interval on)'}. Run it to confirm before the standard changes.`);
  } else if (f.better === 'either') more.push('No view on which way is better was given, so no best setting is picked — read the effects.');
  if (f.r2 !== undefined) more.push(`The fitted model — the real terms and the terms they stand on — accounts for ${Math.round(f.r2 * 100)}% of all the variation in the readings.`);
  if (f.money) more.push(f.money.gbp !== undefined ? `The experiment itself: ${big(f.money.runs)} runs × ${big(f.money.packs as number / f.money.runs)} packs × £${(d.materialsPerPack ?? 0).toFixed(2)} materials = £${big(f.money.gbp)} of product.` : `The experiment itself: ${big(f.money.runs)} runs. ${f.money.missing}`);
  const curve = res.curvature && Number.isFinite(res.curvature.p) && res.curvature.p < f.alpha;
  const tone: Tone = curve ? 'a' : 'n';
  if (!real.length) {
    return { text: `${name}: none of the ${res.terms.length} effects stands out from the noise — over the ranges tried, these settings do not move ${name} by more than chance would. Either they do not matter here, the two levels were too close together, or the readings are too noisy.`, tone, verdict: 'Nothing shown to matter', more, notClaimed: NOT_CLAIMED };
  }
  const lead = real.slice(0, 3).map(t => `${t.factors.length === 1 ? spanOf(t) : `${nameOf(t)} (together)`} ${t.factors.length === 1 ? 'changes it by ' : 'adds '}${signed(t.effect, dp)}${u}${margin(t)}`);
  const quiet = mains.filter(t => !t.real).map(t => d.factors[t.factors[0]].name.trim());
  const text = `${name}: ${mainsReal.length ? `${list(mainsReal.map(t => d.factors[t.factors[0]].name.trim()))} matter${mainsReal.length === 1 ? 's' : ''}` : 'only a combination of settings matters'}${interacts.length ? `, and ${interacts.length === 1 ? 'they interact' : 'some interact'}` : ''}. ${lead.join('; ')}.${quiet.length ? ` ${list(quiet)} ${quiet.length === 1 ? 'is' : 'are'} not shown to matter in these ranges — leave ${quiet.length === 1 ? 'it' : 'them'} where it is cheapest.` : ''}${curve ? ' The centre runs say the result bends between the levels.' : ''}`;
  return { text, tone, verdict: mainsReal.length ? `${list(mainsReal.map(t => d.factors[t.factors[0]].name.trim()))} matter${mainsReal.length === 1 ? 's' : ''}` : 'A combination matters', more, notClaimed: NOT_CLAIMED };
}

export function doeTiles(f: DoeFigures): LeanTile[] {
  const t = (k: string, v: string, of?: string, tone?: LeanTile['tone']): LeanTile => ({ k, v, ...(of ? { of } : {}), ...(tone ? { tone } : {}) });
  const res = f.res;
  const biggest = res ? [...res.terms].sort((x, y) => Math.abs(y.effect) - Math.abs(x.effect))[0] : undefined;
  return [
    t('Runs done', f.problem ? '—' : `${f.done} of ${f.needed}`, f.problem ? undefined : `${f.k} factors · ${2 ** f.k} corners`),
    t('Real effects', res ? `${res.terms.filter(x => x.real).length} of ${res.terms.length}` : '—', res ? (res.mode === 'anova' ? `t-test at ${pctWord(f.conf)}` : 'by Lenth’s margin') : undefined),
    t('Biggest', biggest ? doeTermName(f.d, biggest.factors) : '—', biggest ? `${signed(biggest.effect, f.dp + 1)}${f.unit ? ` ${f.unit}` : ''}` : undefined),
    t(res?.mode === 'lenth' ? 'PSE' : 'Noise s', res ? (res.mode === 'anova' && res.anova ? fx(Math.sqrt(res.anova.mse), f.dp + 1) : fx(res.lenth?.pse ?? 0, f.dp + 2)) : '—', res ? (res.mode === 'anova' ? `${res.anova?.dfe} df` : 'pseudo standard error') : undefined),
    t('Explained', f.r2 !== undefined ? `${Math.round(f.r2 * 100)}%` : '—', f.r2 !== undefined ? `by ${f.masks.length} term${f.masks.length === 1 ? '' : 's'}` : undefined),
  ];
}

/* ------------------------------------------- the tables and the picture ------------------------------------- */
export function doeGrids(f: DoeFigures, a?: AgreedAnalysis): Grid[] {
  if (f.problem) return [];
  const d = f.d, u = a?.unit ? ` ${a.unit}` : '', dp = f.dp + 1, out: Grid[] = [];
  const res = f.res;
  if (res) {
    const sorted = [...res.terms].sort((x, y) => Math.abs(y.effect) - Math.abs(x.effect));
    out.push({
      label: res.mode === 'anova' ? `Every effect — ${pctWord(f.conf)} intervals` : `Every effect — against Lenth’s margin ±${fx(res.lenth?.me ?? 0, dp + 1)}`,
      head: ['Term', `Effect${u}`, res.mode === 'anova' ? `${pctWord(f.conf)} between` : 'Margin', res.mode === 'anova' ? 'p' : 'Beyond', 'Real?'],
      rows: sorted.map(t => [doeTermName(d, t.factors), signed(t.effect, dp), `${signed(t.lo as number, dp)} to ${signed(t.hi as number, dp)}`,
        res.mode === 'anova' ? (t.p !== undefined ? pSay(t.p).replace('p = ', '').replace('p < ', '< ') : '—') : (t.firm ? 'simultaneous margin' : t.real ? 'margin' : '—'), t.real ? 'yes' : 'no']),
      mark: sorted.map((t, i) => (t.real ? i : -1)).filter(i => i >= 0), widths: [30, 16, 26, 16, 12],
    });
  }
  out.push({
    label: f.done === 0 ? 'The runs, in the order to make them' : 'The runs, in the order they were made',
    head: ['Run', 'Corner', ...d.factors.map(x => `${x.name.trim()}${x.unit ? ` (${x.unit})` : ''}`), 'Response'],
    rows: f.plan.map(p => [String(p.no), p.centre ? `centre ${p.rep}` : `${p.std + 1}, time ${p.rep}`, ...d.factors.map((_, j) => num(p.levels[j] < 0 ? d.factors[j].low : p.levels[j] > 0 ? d.factors[j].high : (d.factors[j].low + d.factors[j].high) / 2)), f.responses.has(p.no) ? String(f.responses.get(p.no)) : '']),
    widths: [8, 16, ...d.factors.map(() => Math.floor(60 / d.factors.length)), 16],
  });
  return out;
}

export function doePicture(f: DoeFigures, a: AgreedAnalysis): PicRow[] {
  const res = f.res;
  if (!res) return [];
  const sorted = [...res.terms].sort((x, y) => Math.abs(y.effect) - Math.abs(x.effect)).slice(0, DOE_LANES), dp = f.dp + 1;
  const m = Math.max(...sorted.flatMap(t => [Math.abs(t.lo as number), Math.abs(t.hi as number), Math.abs(t.effect)]), 1e-9) * 1.1, axis: [number, number] = [-m, m];
  return sorted.map(t => ({ label: `${doeTermName(f.d, t.factors)} · ${t.real ? 'matters' : 'not shown'}`, axis, unit: a.unit ?? '', zero: true, tone: 'n' as Tone, point: { v: t.effect, text: signed(t.effect, dp) }, band: { lo: t.lo as number, hi: t.hi as number, text: res.mode === 'anova' ? `${pctWord(f.conf)}: ${signed(t.lo as number, dp)} to ${signed(t.hi as number, dp)}` : `±${fx(res.lenth?.me ?? 0, dp)}` } }));
}
