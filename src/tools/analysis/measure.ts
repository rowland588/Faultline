/* THE TWO QUESTIONS ABOUT HOW THE READINGS WERE MADE (W3c, builder F3, 25 October 2026) — is the gauge fit (FC-119 the Type 1 study,
 * FC-120 bias, linearity and stability: knowledge/specs/FC-119-gauge.md) and which shape fits (FC-114: knowledge/specs/FC-114-fitting.md).
 * Their figures, their words, their tiles, their pictures and the tables beside them — the page (AnalysisScreen) and the paper (lib/
 * studiesPdf) both read this module, so the two never part. The arithmetic is lib/ie/gauge and lib/ie/fit, proved against SciPy/NumPy
 * (scripts/knowledge/cases-w3c.py). Called from ./analysis (analysisFigures and the rest dispatch on `kind`); imports only the TYPES of
 * ./analysis, so there is no cycle. */
import type { AgreedAnalysis, AgreedGauge, StudyReading } from '../../lib/study';
import { learningCurve, LEARN_FAR, LEARN_FROM, type Learning } from '../../lib/ie/learn';
import type { LeanTile } from '../../lib/lean';
import { binomUpper, fewerThan, individualsLimits, runOnOneSide } from '../../lib/ie/dist';
import { describe, type Described } from '../../lib/ie/describe';
import { autocorrelation, type Autocorrelation } from '../../lib/ie/stats';
import { predictAt } from '../../lib/ie/relate';
import { RULE_WORDS } from '../../lib/ie/charts';
import {
  BASE_MIN, BASELINE, RESOLUTION_MAX, TYPE1_FIRM, TYPE1_FROM, REFS_FROM, REFS_FIRM, REF_READINGS_FIRM, REF_READINGS_FROM,
  leastCount, rangeStudy, stability, toleranceOf, type1, type RangeFigures, type Stability, type Type1,
} from '../../lib/ie/gauge';
import {
  FIT_FIRM, FIT_FROM, MODEL_WORDS, candidateOf, fitAll, probabilityPlot, tailOf, type Candidate, type FitSet, type ModelId, type Tail,
} from '../../lib/ie/fit';
import { gbpWord, inWords, kgWord, MISSING_KG, MISSING_PACKS, weightUnit } from '../capability/sample';
import { big, cap, fx, pct, pctWord, pSay, placesOf } from './format';
import { independenceCheck, outlierCheck } from './checks';
import type { AnalysisSays, Base, PicRow, Plot, Tone } from './analysis';

const live = (rs: StudyReading[]): StudyReading[] => rs.filter(r => !r.struck);
const values = (rs: StudyReading[]): number[] => live(rs).filter(r => typeof r.value === 'number').map(r => r.value as number);
const sure = (c: number): string => `we can be ${pctWord(c)} confident`;
const positive = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && v > 0;
const sg = (v: number, d = 3): string => (v === 0 ? '0' : Number(v.toPrecision(d)).toLocaleString('en-GB', { maximumSignificantDigits: d })).replace('-', '−');
const sign = (v: number, _dp?: number): string => `${v < 0 ? '−' : '+'}${sg(Math.abs(v))}`;
/** 20%, 10%, 4.4% — the slice as a person says it. */
const pc = (x: number): string => `${+(x * 100).toFixed(1)}%`;

/** A small table the page draws as a table and the paper as one — a row can be marked (its text is not coloured, it is set bold). */
export interface Grid { label: string; head: string[]; rows: string[][]; mark?: number[]; widths: number[] }

/* ================================================================== IS THE GAUGE FIT */
export interface GaugeMoney { dir: 'low' | 'high'; bias: number; unit: string; kgShift?: number; gbpShift?: number; gbpWeek?: number; missing: string[] }
export interface GaugeFigures extends Base {
  kind: 'gauge'; mode: AgreedGauge['mode']; g: AgreedGauge; n: number; enough: boolean; firm: boolean;
  /** what stops it being worked out, said as the box to fill */
  problem: string;
  xs: number[]; pts: { ref: number; value: number }[]; T?: number; tolHow?: 'both' | 'one';
  t1?: Type1; range?: RangeFigures; stab?: Stability; d?: Described; ac?: Autocorrelation; money?: GaugeMoney;
}

/** What cannot be agreed, said while agreeing. */
export function gaugeProblem(name: string, g: AgreedGauge | undefined): string {
  if (!name.trim()) return 'Which gauge — a name, "Bench scale".';
  if (!g) return 'How is it checked?';
  const num = (v: number | undefined): boolean => v === undefined || Number.isFinite(v);
  if (![g.reference, g.lower, g.upper, g.target, g.limit, g.slice, g.need, g.resolution, g.baseline, g.packsPerShift, g.shiftsPerWeek, g.costPerKg].every(num)) return 'Numbers only in the boxes.';
  if (g.mode === 'repeat' && g.reference === undefined) return 'The reference’s true value — the number on its certificate.';
  if (g.lower !== undefined && g.upper !== undefined && !(g.upper > g.lower)) return 'The upper limit has to be above the lower.';
  if (g.mode === 'repeat' && !toleranceOf(g.lower, g.upper, g.target)) {
    return (g.lower === undefined) !== (g.upper === undefined) ? 'One limit needs the target it is measured from — the tolerance is twice the distance between them.' : 'What it judges — a lower and an upper limit, so the tolerance can be worked out.';
  }
  if (g.slice !== undefined && !(g.slice > 0 && g.slice <= 1)) return 'The share of the tolerance it may use — above 0% and up to 100%.';
  if (g.need !== undefined && !(g.need > 0)) return 'The Cg wanted — a number above 0; 1.33 is usual.';
  if (g.resolution !== undefined && !(g.resolution > 0)) return 'The least count — a number above 0, or leave it blank.';
  if (g.mode === 'drift' && g.baseline !== undefined && !(Number.isInteger(g.baseline) && g.baseline >= BASE_MIN)) return `The limits come from at least ${BASE_MIN} first checks — a whole number.`;
  if ([g.packsPerShift, g.shiftsPerWeek, g.costPerKg].some(v => v !== undefined && !(v > 0))) return 'Packs a shift, shifts a week and £ a kilo are numbers above 0, or blank.';
  return '';
}

/** The money of a bias on a weight gauge (knowledge/MONEY.md FC-119/120, causation M): a gauge that reads LOW makes packs set by it heavier
 *  than they read — give-away; one that reads HIGH makes them lighter — short weight, which is not a saving and is never priced. */
function gaugeMoney(bias: number, real: boolean, unit: string, g: AgreedGauge): GaugeMoney | undefined {
  const wu = weightUnit(unit);
  if (!wu || !real) return undefined;
  if (bias > 0) return { dir: 'high', bias, unit, missing: [] };
  const per = Math.abs(bias), kg = wu === 'g' ? per / 1000 : per, m: GaugeMoney = { dir: 'low', bias: per, unit, missing: [] };
  if (!positive(g.packsPerShift)) m.missing.push(MISSING_PACKS);
  else {
    m.kgShift = kg * g.packsPerShift;
    if (!positive(g.costPerKg)) m.missing.push(MISSING_KG);
    else { m.gbpShift = m.kgShift * g.costPerKg; if (positive(g.shiftsPerWeek)) m.gbpWeek = m.gbpShift * g.shiftsPerWeek; }
  }
  return m;
}

export function gaugeFigures(a: AgreedAnalysis, readings: StudyReading[], base: Base): GaugeFigures {
  const g = a.gauge ?? { mode: 'repeat' as const }, unit = a.unit ?? '';
  const problem = gaugeProblem(a.name, a.gauge);
  const f: GaugeFigures = { ...base, kind: 'gauge', mode: g.mode, g, n: 0, enough: false, firm: false, problem, xs: [], pts: [] };
  const tol = toleranceOf(g.lower, g.upper, g.target);
  if (tol) { f.T = tol.T; f.tolHow = tol.how; }
  if (g.mode === 'range') {
    f.pts = live(readings).filter(r => typeof r.value === 'number' && typeof r.with === 'number').map(r => ({ ref: r.with as number, value: r.value as number }));
    f.n = f.pts.length; f.dp = placesOf(f.pts.flatMap(p => [p.ref, p.value]));
    f.range = rangeStudy(f.pts, f.conf, g.limit);
    f.enough = f.range.refs.length >= 1; f.firm = f.range.refs.length >= REFS_FIRM && f.range.refs.every(r => r.n >= REF_READINGS_FIRM);
    const rg = f.range;
    if (rg.left.length) f.checks.push({ what: 'Too few', say: `Too few: ${rg.left.map(l => `${l.ref} (${l.n})`).join(', ')} ${rg.left.length === 1 ? 'has' : 'have'} fewer than ${REF_READINGS_FROM} readings, so ${rg.left.length === 1 ? 'it is' : 'they are'} left out until there are more.`, tone: 'a' });
    if (rg.refs.length >= 1 && (rg.refs.length < REFS_FIRM || rg.refs.some(r => r.n < REF_READINGS_FIRM))) {
      f.checks.push({ what: 'Size', say: `Size: ${rg.refs.length} reference${rg.refs.length === 1 ? '' : 's'}${rg.refs.length ? ` of ${rg.refs.map(r => r.n).join(', ')} readings` : ''} — the record asks for ${REFS_FIRM} references of ${REF_READINGS_FIRM} readings each; a line of bias from fewer is a hint.`, tone: 'a' });
    }
    if (g.limit !== undefined && rg.line && rg.at && !rg.at.inside) f.checks.push({ what: 'Limit', say: `Limit: ${g.limit}${unit ? ` ${unit}` : ''} is outside the references measured (${rg.line.xRange[0]}–${rg.line.xRange[1]}) — the line is not read there; add a reference at the limit.`, tone: 'a' });
    if (g.limit === undefined && rg.line) f.checks.push({ what: 'Limit', say: 'Limit: no limit that matters was agreed, so the bias is not read off the line anywhere — change what was agreed to name one.', tone: 'n' });
    return f;
  }
  const xs = values(readings); f.xs = xs; f.n = xs.length; f.dp = placesOf(xs);
  f.d = describe(xs); f.ac = autocorrelation(xs);
  if (g.mode === 'drift') {
    f.enough = xs.length >= BASE_MIN; f.firm = xs.length >= BASELINE;
    if (f.enough) f.stab = stability(xs, g.baseline ?? BASELINE, g.reference);
    if (f.stab) {
      const st = f.stab;
      if (xs.length < BASELINE) f.checks.push({ what: 'Size', say: `Size: ${xs.length} checks — limits are firm from ${BASELINE}; before that a signal is a hint.`, tone: 'a' });
      if (st.inBaseline !== undefined) f.checks.push({ what: 'Baseline', say: `Baseline: the first ${st.baseline} checks signal at check ${st.inBaseline} — the limits come from a period that was not steady, so they are too wide; agree a shorter baseline from the checks you know were good.`, tone: 'a' });
      if (g.baseline !== undefined && g.baseline > xs.length) f.checks.push({ what: 'Baseline', say: `Baseline: ${g.baseline} first checks were agreed but only ${xs.length} are in — the limits come from all ${xs.length}.`, tone: 'n' });
    }
    const oc = outlierCheck('Checks', f.d), ic = independenceCheck('Order', f.ac);
    if (oc && !f.stab?.first) f.checks.push(oc);
    if (ic && ic.tone === 'a') f.checks.push(ic);
    return f;
  }
  /* repeat — the Type 1 study */
  f.enough = xs.length >= TYPE1_FROM; f.firm = xs.length >= TYPE1_FIRM;
  if (f.enough && !problem && f.T !== undefined && g.reference !== undefined) {
    f.t1 = type1(xs, g.reference, f.T, { slice: g.slice, need: g.need, conf: f.conf, resolution: g.resolution });
    const t = f.t1;
    if (t) {
      if (!f.firm) f.checks.push({ what: 'Size', say: `Size: ${xs.length} readings — a Type 1 study is read from ${TYPE1_FROM} and called firm from ${TYPE1_FIRM}; Cg and Cgk from fewer are rough.`, tone: 'a' });
      if (t.step !== undefined && t.stepShare !== undefined) {
        const how = g.resolution !== undefined ? 'typed' : 'the smallest step the readings show';
        f.checks.push(t.stepOk
          ? { what: 'Least count', say: `Least count: ${sg(t.step)}${unit ? ` ${unit}` : ''} (${how}) is ${pct(t.stepShare)} of the tolerance — fine enough (under ${pct(RESOLUTION_MAX)}).`, tone: 'n' }
          : { what: 'Least count', say: `Least count: ${sg(t.step)}${unit ? ` ${unit}` : ''} (${how}) is ${pct(t.stepShare)} of the tolerance — too coarse (over ${pct(RESOLUTION_MAX)}): the gauge cannot show the differences that matter, whatever Cg says.`, tone: 'a' });
      }
      f.money = gaugeMoney(t.bias, t.real, unit, g);
    }
  }
  const oc = outlierCheck('Readings', f.d), ic = independenceCheck('Order', f.ac);
  if (oc) f.checks.push(oc);
  if (ic && f.ac?.enough) f.checks.push(ic);
  return f;
}

const GAUGE_NOT_CLAIMED = 'One reference, one operator, one day: this says how the gauge behaves on this reference — not who uses it (that is a gauge R&R), not its whole range, and not that the reference itself is right.';
const RANGE_NOT_CLAIMED = 'A bias at a food-safety limit is the team’s to guard, not this page’s: it says the true value a reading means; it does not move any limit. It does not say the references are right, or how several operators differ.';
const DRIFT_NOT_CLAIMED = 'A chart shows that the readings of the reference moved, not why — the gauge, the reference, the room or the person. It does not say how long ago.';

function moneyLines(m: GaugeMoney | undefined, g: AgreedGauge, name: string): string[] {
  if (!m) return [];
  const u = m.unit ? ` ${m.unit}` : '';
  if (m.dir === 'high') return [`In money: ${name} reads ${sg(m.bias)}${u} high, so packs set by it are really that much lighter than they read — short weight, which is not a saving and is not priced here.`];
  if (m.gbpShift === undefined) {
    const kg = m.kgShift !== undefined ? `${kgWord(m.kgShift)} a shift of ${big(g.packsPerShift as number)} packs` : '';
    return [`In money: ${name} reads ${sg(m.bias)}${u} low, so packs set by it run that much heavier than they read — give-away${kg ? `: ${kg}` : ''}${m.missing.length ? ` — ${m.missing.join('; ')}` : ''}.`];
  }
  return [`In money: ${name} reads ${sg(m.bias)}${u} low, so packs set by it run that much heavier than they read — ${kgWord(m.kgShift as number)} of product a shift (${big(g.packsPerShift as number)} packs), ${gbpWord(m.gbpShift)} a shift${m.gbpWeek !== undefined ? `, ${gbpWord(m.gbpWeek)} a week` : ''} at £${(g.costPerKg as number).toFixed(2)} a kilo — because of the bias.`];
}

export function gaugeSays(f: GaugeFigures, a: AgreedAnalysis): AnalysisSays {
  const u = a.unit ? ` ${a.unit}` : '', name = a.name.trim() || 'The gauge', dp = f.dp + 1, g = f.g, c = f.conf;
  const none = (text: string, verdict = 'Not started'): AnalysisSays => ({ text, tone: 'n', verdict, more: [], notClaimed: '' });
  if (f.problem && f.mode === 'repeat') return none(f.problem, 'Not started');
  if (f.mode === 'repeat') {
    if (!f.n) return none(`Read the reference again and again — type or paste the readings, ${TYPE1_FROM} at least, 25 to 50 usual.`);
    const t = f.t1;
    if (!f.enough || !t) return none(`${f.n} reading${f.n === 1 ? '' : 's'} — a Type 1 study is read from ${TYPE1_FROM}; 25 to 50 is usual.`, 'Too few');
    const tolW = `${sg(t.T)}${u}`, bias = Math.abs(t.bias), side = t.bias >= 0 ? 'high' : 'low', slice = pc(t.slice);
    const notes = [`Mean ${fx(t.mean, dp)}${u} against the reference ${g.reference}${u}: bias ${sign(t.bias, dp + 1)}${u}, ${pctWord(c)} interval ${sg(t.biasLo)} to ${sg(t.biasHi)}${u} (t ${fx(t.t, 2)} on ${t.n - 1} degrees of freedom, ${pSay(t.p)}); the spread (s) is ${sg(t.s)}${u}.`,
      `How the indices are made: Cg = ${slice} of the tolerance ÷ 6s; Cgk = (${pc(t.slice / 2)} of the tolerance − the bias) ÷ 3s; both wanted at ${t.need} or more — the automotive practice’s constants (VDA volume 5, not read here), Faultline’s defaults, changeable where this was agreed.`,
      ...moneyLines(f.money, g, name)];
    if (t.verdict === 'noSpread') return { text: `Every reading is ${fx(t.mean, dp)}${u}: there is no spread to measure, so Cg and Cgk cannot be worked out — is the gauge reading finely enough? The bias is ${sign(t.bias, dp)}${u}.`, tone: 'n', verdict: 'Nothing to test', more: [], notClaimed: GAUGE_NOT_CLAIMED };
    const cg = fx(t.cg as number, 2), cgk = fx(t.cgk as number, 2), uses = pct(t.share6s);
    if (t.verdict === 'fit') {
      const bs = t.real ? `It reads ${sg(bias)}${u} ${side} (${sure(c)} between ${sg(Math.abs(t.bias >= 0 ? t.biasLo : t.biasHi))} and ${sg(Math.abs(t.bias >= 0 ? t.biasHi : t.biasLo))}${u}) — a real bias, small against the tolerance; correct it at the next calibration.`
        : `No bias is shown: ${sure(c)} it reads between ${sign(t.biasLo, dp + 1)} and ${sign(t.biasHi, dp + 1)}${u} of the reference.`;
      return { text: `${name}: Cg ${cg} and Cgk ${cgk} against ${t.need} — fit for a ${tolW} tolerance: its spread (6s = ${sg(6 * t.s)}${u}) uses ${uses} of it. ${bs}`, tone: 'g', verdict: 'Fit', more: notes, notClaimed: GAUGE_NOT_CLAIMED };
    }
    if (t.verdict === 'biased') {
      return { text: `${name} repeats well (Cg ${cg}) but reads ${sg(bias)}${u} ${side}: the bias takes Cgk to ${cgk}, under ${t.need} — correct the bias before it judges anything (${sure(c)} the bias is between ${sg(t.biasLo)} and ${sg(t.biasHi)}${u}).`, tone: 'a', verdict: 'Biased — correct it', more: notes, notClaimed: GAUGE_NOT_CLAIMED };
    }
    return { text: `${name} is not fit for a ${tolW} tolerance: its spread (6s = ${sg(6 * t.s)}${u}) uses ${uses} of it, more than the ${slice} it may — Cg ${cg} and Cgk ${cgk} against ${t.need}. Repair or replace it before any study that depends on it.`, tone: 'r', verdict: 'Not fit', more: notes, notClaimed: GAUGE_NOT_CLAIMED };
  }
  if (f.mode === 'range') {
    const rg = f.range;
    if (!f.n || !rg) return none('Read each reference several times — type a reference, then its readings (5 at least, 10 usual), for 4 references or more.');
    if (!rg.refs.length) return none(`${f.n} reading${f.n === 1 ? '' : 's'}, but no reference has ${REF_READINGS_FROM} yet — type more against each.`, 'Too few');
    const refs = rg.refs, lo = refs[0], hi = refs[refs.length - 1], worst = rg.worst as NonNullable<RangeFigures['worst']>;
    const word = (b: number): string => `${sg(Math.abs(b))}${u} ${b >= 0 ? 'high' : 'low'}`;
    const more: string[] = [`Bias by reference: ${refs.map(r => `${r.ref} → ${sign(r.bias)}${r.real ? '' : ' (not shown)'}`).join(' · ')}${u}.`];
    if (rg.line) {
      const l = rg.line;
      more.push(`The line of bias on the reference: ${sg(l.intercept)} ${l.slope < 0 ? '−' : '+'} ${sg(Math.abs(l.slope))} × reference${u}; the slope’s ${pctWord(c)} interval ${sg(l.slopeLo)} to ${sg(l.slopeHi)}, ${pSay(l.pR)}, R² ${fx(l.r2, 2)} — fitted to each reference’s mean bias, as the record does.`);
    }
    if (f.T !== undefined) more.push(`The largest bias, ${word(worst.bias)} at ${worst.ref}, is ${pct(Math.abs(worst.bias) / f.T)} of the ${sg(f.T)}${u} tolerance.`);
    const lim = rg.at && rg.at.inside && g.limit !== undefined ? ` At ${g.limit}${u}, the limit that matters, the line gives ${sign(rg.at.bias)}${u}: a reading of ${g.limit} means product at ${sg(rg.at.trueValue, 6)}${u}.` : '';
    if (!rg.anyReal) {
      return { text: `${name} reads true at ${refs.length} reference${refs.length === 1 ? '' : 's'}: no bias is shown at any of them (the largest, ${word(worst.bias)} at ${worst.ref}, is no more than ${worst.n} readings can tell from nothing).${rg.line ? lim : ` A line of bias needs ${REFS_FROM} references.`}`, tone: 'g', verdict: 'Reads true', more, notClaimed: RANGE_NOT_CLAIMED };
    }
    if (!rg.line) {
      const real = refs.filter(r => r.real);
      return { text: `${name} has a real bias at ${real.length} of ${refs.length} references — the largest, ${word(worst.bias)} at ${worst.ref}. A line of bias needs ${REFS_FROM} references, so whether it changes with the size is not yet shown.`, tone: 'a', verdict: 'Bias shown, no line yet', more, notClaimed: RANGE_NOT_CLAIMED };
    }
    const l = rg.line;
    if (rg.sloped) {
      return { text: `${name} reads ${word(lo.bias)} at ${lo.ref} and ${word(hi.bias)} at ${hi.ref} — the bias changes with the size (${sg(Math.abs(l.slope))}${u} ${l.slope > 0 ? 'more' : 'less'} for every extra 1${u} of the reference; ${sure(c)} between ${sg(l.slopeLo)} and ${sg(l.slopeHi)}, ${pSay(l.pR)}): one offset will not fix it.${lim}`, tone: 'a', verdict: 'The bias changes with size', more, notClaimed: RANGE_NOT_CLAIMED };
    }
    const mean = refs.reduce((s, r) => s + r.bias, 0) / refs.length;
    return { text: `${name} reads ${word(mean)} on average, real at ${refs.filter(r => r.real).length} of ${refs.length} references, and the bias does not change with the size (slope ${sg(l.slope)}, ${pSay(l.pR)}) — one offset fixes it.${lim}`, tone: 'a', verdict: 'One offset fixes it', more, notClaimed: RANGE_NOT_CLAIMED };
  }
  /* drift */
  if (!f.n) return none('Check the reference day after day — type or paste each reading, in the order taken, 20 at least for firm limits.');
  const st = f.stab;
  if (!f.enough || !st) return none(`${f.n} check${f.n === 1 ? '' : 's'} — at least ${BASE_MIN} are needed to draw limits (${BASELINE} usual).`, 'Too few');
  const ref = g.reference, lims = `${fx(st.lcl, dp)} to ${fx(st.ucl, dp)}${u}`, cen = `centre ${fx(st.centre, dp)}${u}${st.bias !== undefined ? `, ${sign(st.bias)}${u} against the reference` : ''}`;
  const more: string[] = [`The limits are x̄ ± 2.66 × the average moving range (${sg(st.mrBar)}${u}) of the first ${st.baseline} checks — an individuals chart; the signals are the four Western Electric tests (a point beyond a limit, eight in a row on one side, two of three beyond 2σ, four of five beyond 1σ).`];
  if (st.trend) more.push(`Over all ${st.n} checks: Kendall’s τ ${fx(st.trend.tau, 2)}, ${pSay(st.trend.p)}; Sen’s slope ${sign(st.trend.slope)}${u} a check (${st.trend.slope > 0 ? 'rising' : st.trend.slope < 0 ? 'falling' : 'flat'}).`);
  if (st.first === undefined) {
    return { text: `${name} held: ${st.n} checks${ref !== undefined ? ` against ${ref}${u}` : ''}, the limits from the first ${st.baseline} (${lims}; ${cen}) — no signal since.`, tone: 'g', verdict: 'Steady', more, notClaimed: DRIFT_NOT_CLAIMED };
  }
  const after = st.signals.filter(s => s.points[s.points.length - 1] > st.baseline), beyond = after.filter(s => s.rule === 'beyond');
  const up = beyond.filter(s => s.side === 'above').length, down = beyond.filter(s => s.side === 'below').length;
  const what = beyond.length ? `${beyond.length} check${beyond.length === 1 ? ' is' : 's are'} beyond the ${up >= down ? 'upper' : 'lower'} limit` : RULE_WORDS[after.sort((p, q) => p.points[0] - q.points[0])[0].rule].name;
  const dir = up > down ? 'up' : down > up ? 'down' : (st.trend ? (st.trend.slope >= 0 ? 'up' : 'down') : 'off');
  return { text: `${name} drifted ${dir}: the first ${st.baseline} checks put the limits at ${lims} (${cen}). From check ${st.first} it signals — ${what}. Product measured since check ${Math.max(1, st.first - 1)} is worth reviewing.`, tone: 'r', verdict: `Drifted from check ${st.first}`, more, notClaimed: DRIFT_NOT_CLAIMED };
}

export function gaugeTiles(f: GaugeFigures, a: AgreedAnalysis): LeanTile[] {
  const u = a.unit ? ` ${a.unit}` : '', dp = f.dp + 1, conf = pctWord(f.conf);
  const t = (k: string, v: string, of?: string, tone?: Tone): LeanTile => ({ k, v, ...(of ? { of } : {}), ...(tone && tone !== 'n' ? { tone } : {}) });
  if (f.mode === 'repeat') {
    const x = f.t1;
    const money = f.money;
    const mt = !money ? t('In money', f.t1 && !weightUnit(a.unit) ? 'none' : '—', f.t1 && !weightUnit(a.unit) ? 'only a weight in g or kg' : undefined)
      : money.dir === 'high' ? t('In money', 'short weight', 'not a saving — not priced')
      : money.gbpShift !== undefined ? t('In money', `${gbpWord(money.gbpShift)} a shift`, money.gbpWeek !== undefined ? `${gbpWord(money.gbpWeek)} a week · give-away` : 'give-away')
      : t('In money', '—', money.missing[0] ?? '');
    return [t('Readings', big(f.n), f.n < TYPE1_FROM ? `at least ${TYPE1_FROM}` : f.n < TYPE1_FIRM ? `of ${TYPE1_FIRM} usual` : undefined, f.n < TYPE1_FROM ? 'a' : 'n'),
      t('Bias', x ? `${sign(x.bias)}${u}` : '—', x ? `${conf}: ${sg(x.biasLo)} to ${sg(x.biasHi)}` : undefined),
      t('Cg', x?.cg !== undefined ? fx(x.cg, 2) : '—', x ? `wanted ${x.need}` : undefined, x?.cg !== undefined && x.cg < x.need ? 'r' : 'n'),
      t('Cgk', x?.cgk !== undefined ? fx(x.cgk, 2) : '—', x ? `wanted ${x.need}` : undefined, x?.cgk !== undefined && x.cgk < x.need ? (x.cg !== undefined && x.cg >= x.need ? 'a' : 'r') : 'n'),
      t('Uses of tolerance', x ? pct(x.share6s) : '—', x ? `6s of ${sg(x.T)}${u}; may use ${pc(x.slice)}` : undefined, x && x.share6s > x.slice ? 'r' : 'n'), mt];
  }
  if (f.mode === 'range') {
    const rg = f.range;
    return [t('References', rg ? big(rg.refs.length) : '0', rg && rg.left.length ? `${rg.left.length} with too few` : `at least ${REFS_FROM} for a line`, rg && rg.refs.length < REFS_FROM ? 'a' : 'n'),
      t('Worst bias', rg?.worst ? `${sign(rg.worst.bias)}${u}` : '—', rg?.worst ? `at ${rg.worst.ref}` : undefined, rg?.worst?.real ? 'a' : 'n'),
      t('Real at', rg ? `${rg.refs.filter(r => r.real).length} of ${rg.refs.length}` : '—', 'references'),
      t('Changes with size', rg?.line ? (rg.sloped ? 'Yes' : 'No') : '—', rg?.line ? `slope ${pSay(rg.line.pR)}` : undefined, rg?.sloped ? 'a' : 'n'),
      t('At the limit', rg?.at && rg.at.inside ? `${sign(rg.at.bias)}${u}` : '—', rg?.at && rg.at.inside ? `a reading of ${rg.at.x} is ${sg(rg.at.trueValue, 6)}` : f.g.limit === undefined ? 'no limit agreed' : undefined)];
  }
  const st = f.stab;
  return [t('Checks', big(f.n), f.n < BASELINE ? `of ${BASELINE} for firm limits` : undefined, f.n < BASE_MIN ? 'a' : 'n'),
    t('Limits', st ? `${fx(st.lcl, dp)}–${fx(st.ucl, dp)}` : '—', st ? `from the first ${st.baseline}` : undefined),
    t('Centre', st ? `${fx(st.centre, dp)}${u}` : '—', st && st.bias !== undefined ? `${sign(st.bias)} against the reference` : undefined),
    t('Signals from', st ? (st.first !== undefined ? `check ${st.first}` : 'none') : '—', st && st.first !== undefined ? `${st.signals.filter(s => s.rule === 'beyond' && s.points[s.points.length - 1] > st.baseline).length} beyond a limit` : undefined, st?.first !== undefined ? 'r' : 'n'),
    t('Trend', st?.trend ? `${sign(st.trend.slope)} a check` : '—', st?.trend ? `τ ${fx(st.trend.tau, 2)} · ${pSay(st.trend.p)}` : undefined)];
}

/** The Type 1 picture: each reading's distance from the reference (zero is the reference), the mean bias with its interval, the gauge's 6s
 *  beside the slice of the tolerance it may use — the 6s inside the slice is Cg of 1 or more. */
export function gaugePicture(f: GaugeFigures, a: AgreedAnalysis): PicRow[] {
  const t = f.t1, g = f.g;
  if (f.mode !== 'repeat' || !t || g.reference === undefined) return [];
  const u = a.unit ?? '', off = f.xs.map(x => x - (g.reference as number)), sixS = 3 * t.s, half = t.slice * t.T / 2;
  const m = Math.max(...off.map(Math.abs), Math.abs(t.bias) + sixS, half) * 1.12 || 1;
  const axis: [number, number] = [-m, m];
  return [
    { label: 'Each reading', axis, unit: u, zero: true, dots: off, point: { v: t.bias, text: sign(t.bias) }, band: { lo: t.biasLo, hi: t.biasHi, text: `${pctWord(f.conf)}: ${sg(t.biasLo)} to ${sg(t.biasHi)}` } },
    { label: 'Its 6s', axis, unit: u, zero: true, tone: t.verdict === 'notFit' ? 'r' : 'n', band: { lo: t.bias - sixS, hi: t.bias + sixS, text: `6s = ${sg(6 * t.s)}` } },
    { label: `May use ${pc(t.slice)}`, axis, unit: u, zero: true, band: { lo: -half, hi: half, text: `± ${sg(half)}` } },
  ];
}

const padded = (vs: number[]): [number, number] => { const lo = Math.min(...vs), hi = Math.max(...vs), p = Math.max((hi - lo) * 0.06, Math.abs(hi) * 0.0005, 1e-9); return [lo - p, hi + p]; };

export function gaugePlot(f: GaugeFigures, a: AgreedAnalysis): Plot | undefined {
  const u = a.unit ?? '';
  if (f.mode === 'range' && f.range && f.range.refs.length) {
    const rg = f.range, keep = new Set(rg.refs.map(r => r.ref)), pts = f.pts.filter(p => keep.has(p.ref)).map(p => [p.ref, p.value - p.ref] as [number, number]);
    const xs = rg.refs.map(r => r.ref), xAxis = padded(xs);
    if (rg.line) {
      const l = rg.line, steps = 24;
      const band = Array.from({ length: steps + 1 }, (_, i) => { const x = l.xRange[0] + (l.xRange[1] - l.xRange[0]) * i / steps, p = predictAt(l, x, f.conf); return { x, lo: p.y - p.meanHalf, hi: p.y + p.meanHalf }; });
      return { kind: 'scatter', xName: 'Reference', yName: 'Bias', xUnit: u, yUnit: u, pts, xAxis, yAxis: padded([...pts.map(p => p[1]), ...band.flatMap(b => [b.lo, b.hi]), 0]),
        line: [[l.xRange[0], l.intercept + l.slope * l.xRange[0]], [l.xRange[1], l.intercept + l.slope * l.xRange[1]]], band };
    }
    return { kind: 'scatter', xName: 'Reference', yName: 'Bias', xUnit: u, yUnit: u, pts, xAxis, yAxis: padded([...pts.map(p => p[1]), 0]) };
  }
  if (f.mode === 'drift' && f.stab) {
    const st = f.stab, n = f.xs.length, pts = f.xs.map((v, i) => [i + 1, v] as [number, number]);
    return { kind: 'scatter', xName: 'Check', yName: a.name || 'Reading', xUnit: '', yUnit: u, pts, xAxis: [0.5, n + 0.5], yAxis: padded([...f.xs, st.lcl, st.ucl, ...(f.g.reference !== undefined ? [f.g.reference] : [])]),
      line: [[1, st.centre], [n, st.centre]], band: [{ x: 0.5, lo: st.lcl, hi: st.ucl }, { x: n + 0.5, lo: st.lcl, hi: st.ucl }] };
  }
  return undefined;
}

export function gaugeGrids(f: GaugeFigures): Grid[] {
  if (f.mode !== 'range' || !f.range || !f.range.refs.length) return [];
  const rg = f.range, dp = f.dp + 1;
  return [{ label: 'Each reference — its bias and whether it is real', head: ['Reference', 'Readings', 'Mean', 'Bias', 't', 'p', 'Real?'],
    rows: rg.refs.map(r => [String(r.ref), String(r.n), fx(r.mean, dp), sign(r.bias), fx(r.t, 2), pSay(r.p).replace('p = ', '').replace('p < ', '< '), r.real ? 'real' : 'not shown']),
    mark: rg.refs.map((r, i) => (r.real ? i : -1)).filter(i => i >= 0), widths: [0.16, 0.12, 0.16, 0.16, 0.12, 0.14, 0.14] }];
}

/* ================================================================== WHICH SHAPE FITS */
export interface ShapeFigures extends Base {
  kind: 'shape'; n: number; enough: boolean; rough: boolean; firm: boolean; xs: number[]; lower?: number; upper?: number;
  set?: FitSet; leader?: Candidate; shown?: Candidate; tails: Partial<Record<ModelId, Tail>>;
  /** the count as measured: how many beyond the limits, and the exact bound on the share */
  measured?: { k: number; n: number; bound: number; below: number; above: number };
  /** the usual (bell) Ppk from the sample mean and spread, to put the percentile index beside */
  usualPpk?: number; steady: boolean; problem: string;
}
export function shapeProblem(name: string, s?: { lower?: number; upper?: number }): string {
  if (!name.trim()) return 'What is measured — a name, "Residual oxygen".';
  if (s?.lower !== undefined && !Number.isFinite(s.lower)) return 'Numbers only in the limit boxes.';
  if (s?.upper !== undefined && !Number.isFinite(s.upper)) return 'Numbers only in the limit boxes.';
  if (s?.lower !== undefined && s?.upper !== undefined && !(s.upper > s.lower)) return 'The upper limit has to be above the lower.';
  return '';
}

export function shapeFigures(a: AgreedAnalysis, readings: StudyReading[], base: Base): ShapeFigures {
  const xs = values(readings), s = a.shape ?? {}, problem = shapeProblem(a.name, a.shape);
  const f: ShapeFigures = { ...base, kind: 'shape', n: xs.length, enough: xs.length >= FIT_FROM, rough: xs.length < 30, firm: xs.length >= FIT_FIRM, xs, lower: s.lower, upper: s.upper, tails: {}, steady: true, problem };
  f.dp = placesOf(xs);
  if (!xs.length) return f;
  const d = describe(xs), ac = autocorrelation(xs);
  if (xs.length >= FIT_FROM && !problem) {
    const set = fitAll(xs); f.set = set;
    f.leader = set.leads ? candidateOf(set, set.leads) : undefined;
    f.shown = f.leader ?? (set.closest ? candidateOf(set, set.closest) : undefined);
    for (const c of set.candidates) f.tails[c.model.id] = tailOf(c.model, s.lower, s.upper);
    if (s.lower !== undefined || s.upper !== undefined) {
      const below = s.lower !== undefined ? xs.filter(x => x < (s.lower as number)).length : 0, above = s.upper !== undefined ? xs.filter(x => x > (s.upper as number)).length : 0;
      f.measured = { k: below + above, n: xs.length, bound: binomUpper(below + above, xs.length, f.conf), below, above };
      const normal = f.tails.normal;
      if (normal) { const mean = xs.reduce((p, q) => p + q, 0) / xs.length, sd = Math.sqrt(xs.reduce((p, q) => p + (q - mean) ** 2, 0) / (xs.length - 1)); const sides = [s.upper !== undefined ? (s.upper - mean) / (3 * sd) : undefined, s.lower !== undefined ? (mean - s.lower) / (3 * sd) : undefined].filter((v): v is number => v !== undefined); if (sides.length && sd > 0) f.usualPpk = Math.min(...sides); }
    }
    for (const x of set.excluded) f.checks.push({ what: 'Not tried', say: `Not tried: the ${MODEL_WORDS[x.id].name} — ${x.why}.`, tone: 'n' });
  }
  /* is it steady — a shape fitted to a set that drifted or mixed fits nothing honestly (the capability study's own check) */
  if (xs.length >= FIT_FROM) {
    const lim = individualsLimits(xs), mean = xs.reduce((p, q) => p + q, 0) / xs.length;
    const beyond = lim ? xs.map((v, i) => [v, i] as const).filter(([v]) => v > lim.ucl + 1e-12 || v < lim.lcl - 1e-12) : [], run = runOnOneSide(xs, mean);
    f.steady = !beyond.length && !run;
    if (!f.steady) {
      const parts: string[] = [];
      if (beyond.length) parts.push(`${beyond.length === 1 ? `reading ${beyond[0][1] + 1} is` : `readings ${beyond.slice(0, 3).map(b => b[1] + 1).join(', ')}${beyond.length > 3 ? ` and ${beyond.length - 3} more` : ''} are`} outside ${fx(lim?.lcl ?? 0, f.dp + 1)}–${fx(lim?.ucl ?? 0, f.dp + 1)}`);
      if (run) parts.push(`${run.to - run.from + 1} in a row sat ${run.side} the mean from reading ${run.from + 1}`);
      f.checks.push({ what: 'Steady', say: `Not steady — ${parts.join(' and ')}: a shape fitted to a set that drifted or mixed fits nothing honestly; look at the order first.`, tone: 'a' });
    } else f.checks.push({ what: 'Steady', say: 'Steady across the run.', tone: 'n' });
    const step = leastCount(xs);
    if (step !== undefined && d && d.sd / step < 4) f.checks.push({ what: 'Coarse', say: `Coarse: the readings step by ${sg(step)}${a.unit ? ` ${a.unit}` : ''}, a quarter or more of their spread (s ${sg(d.sd)}) — the goodness test is harsher than it should be on rounded readings, so read its rejections with care.`, tone: 'a' });
    const ic = independenceCheck('Order', ac); if (ic && ic.tone === 'a') f.checks.push(ic);
    const oc = outlierCheck('Readings', d); if (oc) f.checks.push(oc);
  }
  if (xs.length >= FIT_FROM && xs.length < 30) f.checks.push({ what: 'Size', say: `Size: ${xs.length} readings — a shape is read from 30 and told from its neighbours from ${FIT_FIRM}; this is a hint.`, tone: 'a' });
  else if (xs.length >= 30 && xs.length < FIT_FIRM) f.checks.push({ what: 'Size', say: `Size: ${xs.length} readings — enough to tell a normal from a lognormal, rarely a lognormal from a Weibull (that takes ${FIT_FIRM} or more); the tail is a model’s reach, not a measurement.`, tone: 'n' });
  return f;
}

const pWord = (c: Candidate | undefined): string => {
  if (!c?.ad) return 'not tested';
  const e = c.ad.edge, p = Number(c.ad.p.toPrecision(2));
  return e === 'above' ? `p at least ${p}` : e === 'below' ? `p at most ${p}` : pSay(c.ad.p);
};
const article = (id: ModelId): string => MODEL_WORDS[id].article;
const listOf = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const SHAPE_NOT_CLAIMED = 'A shape is the nearest of four on these readings, not the process’s law; from 30 readings the far tail is a model’s reach, not a measurement — the count as measured stands beside it.';

/** The parameters of a fitted shape in the floor’s words. */
function paramsSay(c: Candidate, dp: number, u: string): string {
  const m = c.model, p = m.p;
  switch (m.id) {
    case 'normal': return `Normal: mean ${fx(p.mu, dp)}${u}, spread ${fx(p.sigma, dp)}${u}.`;
    case 'lognormal': return `Lognormal: median ${fx(Math.exp(p.mu), dp)}${u}, the spread of ln x ${fx(p.sigma, 3)} (the higher, the longer the right tail).`;
    case 'weibull': return `Weibull: shape β ${fx(p.beta, 2)} (${p.beta > 1.1 ? 'above 1: gaps that wear out — long ones more likely than short' : p.beta < 0.9 ? 'below 1: early failures — short gaps more likely' : 'about 1: no memory, as an exponential'}), scale η ${fx(p.eta, dp)}${u} (63% of the set falls below it).`;
    case 'exponential': return `Exponential: mean ${fx(p.mean, dp)}${u}, no memory — the next gap is as likely to be short now as it was.`;
  }
}

export function shapeSays(f: ShapeFigures, a: AgreedAnalysis): AnalysisSays {
  const u = a.unit ? ` ${a.unit}` : '', name = a.name.trim() || 'The readings', dp = f.dp + 1, c = f.conf;
  const none = (text: string, verdict = 'Not started'): AnalysisSays => ({ text, tone: 'n', verdict, more: [], notClaimed: '' });
  if (f.problem) return none(f.problem);
  if (!f.n) return none(`Type or paste the readings in the order taken — ${FIT_FROM} at least, 30 or more better.`);
  if (!f.enough || !f.set) return none(`${f.n} reading${f.n === 1 ? '' : 's'} — a shape is fitted from ${FIT_FROM}; 30 or more is better and ${FIT_FIRM} tells a lognormal from a Weibull.`, 'Too few');
  if (!f.set.candidates.length) return none(`Every reading is the same, or too alike to fit any shape: ${listOf(f.set.excluded.map(x => `the ${MODEL_WORDS[x.id].name} (${x.why})`))}.`, 'Nothing to fit');
  const set = f.set, lead = f.leader, shown = f.shown as Candidate;
  const sidesPhrase = f.lower !== undefined && f.upper !== undefined ? `outside ${f.lower}–${f.upper}${u}` : f.upper !== undefined ? `over ${f.upper}${u}` : `under ${f.lower}${u}`;
  const counted = f.measured
    ? `as counted, ${f.measured.k} of ${f.measured.n} ${f.measured.k === 1 ? 'is' : 'are'} ${sidesPhrase} (${sure(c)} the true share is ${fewerThan(f.measured.bound)})`
    : '';
  const tail = (id: ModelId): string => { const t = f.tails[id]; return t?.out !== undefined ? inWords(t.out) : ''; };
  const rejected = set.candidates.filter(x => x.rejected);
  const more: string[] = [];
  if (lead) more.push(paramsSay(lead, dp, u));
  const lt = shown ? f.tails[shown.model.id] : undefined;
  if (lt) more.push(`Under the ${MODEL_WORDS[shown.model.id].name}: median ${fx(lt.p50, dp)}${u}; 99.7% of the set between ${fx(lt.p00135, dp)} and ${fx(lt.p99865, dp)}${u} (the 0.135% and 99.865% points, the ±3σ of a bell).`);
  for (const id of set.alsoFit) {
    const other = candidateOf(set, id) as Candidate, ot = f.tails[id];
    if (ot && lt && lead) more.push(`The ${MODEL_WORDS[id].name} fits about as well (${pWord(other)}, AIC within 2 of the ${MODEL_WORDS[lead.model.id].name}) and puts the 99.865th point at ${fx(ot.p99865, dp)}${u} where the ${MODEL_WORDS[lead.model.id].name} says ${fx(lt.p99865, dp)}${u} — ${f.n} readings cannot tell them apart.`);
  }
  if (lt && lt.ppk !== undefined) more.push(`Percentile Ppk ${fx(lt.ppk, 2)} — the distance from the median to the limit over the distance from the median to the ${lt.side === 'low' ? '0.135%' : '99.865%'} point, the form of ISO 22514-2${f.usualPpk !== undefined ? `; the bell’s Ppk from the sample’s mean and spread is ${fx(f.usualPpk, 2)}` : ''}.`);
  more.push(`AIC (lower is better): ${set.candidates.map(x => `${MODEL_WORDS[x.model.id].name} ${fx(x.model.aic, 1)}`).join(' · ')}.`);
  if (!lead) {
    const near = MODEL_WORDS[shown.model.id].name;
    return { text: `${name}: none of the ${set.candidates.length} shape${set.candidates.length === 1 ? '' : 's'} tried fits these readings (the ${near} is nearest, ${pWord(shown)}) — read the tail from the count, not from a model${counted ? `: ${counted}` : f.lower === undefined && f.upper === undefined ? ' (name a limit to see the count)' : ''}.`, tone: 'a', verdict: 'No shape fits', more, notClaimed: SHAPE_NOT_CLAIMED };
  }
  const id = lead.model.id;
  const others = rejected.map(x => `the ${MODEL_WORDS[x.model.id].name} (${pWord(x)})`);
  const reject = others.length ? ` ${cap(listOf(others))} ${others.length === 1 ? 'does' : 'do'} not.` : '';
  const shareText = f.measured || lt?.out !== undefined ? ` Under the ${MODEL_WORDS[id].name}, ${tail(id)} would be ${sidesPhrase}${counted ? `; ${counted}` : ''}.` : '';
  if (id === 'normal') return { text: `${name}: a normal fits (Anderson–Darling ${pWord(lead)}) — bell-shaped enough for the usual Ppk.${reject}${shareText}`, tone: 'g', verdict: 'Bell-shaped', more, notClaimed: SHAPE_NOT_CLAIMED };
  return { text: `${name}: ${article(id)} fits (Anderson–Darling ${pWord(lead)}, the lowest AIC).${reject}${shareText}`, tone: 'n', verdict: `Follows ${article(id)}`, more, notClaimed: SHAPE_NOT_CLAIMED };
}

export function shapeTiles(f: ShapeFigures, a: AgreedAnalysis): LeanTile[] {
  const u = a.unit ? ` ${a.unit}` : '', dp = f.dp + 1;
  const t = (k: string, v: string, of?: string, tone?: Tone): LeanTile => ({ k, v, ...(of ? { of } : {}), ...(tone && tone !== 'n' ? { tone } : {}) });
  const shown = f.shown, lt = shown ? f.tails[shown.model.id] : undefined;
  const lead = f.leader;
  const beyond = lt?.out !== undefined ? inWords(lt.out).replace(/^about /, '') : '—';
  return [t('Readings', big(f.n), f.n < FIT_FROM ? `at least ${FIT_FROM}` : f.n < 30 ? '30 or more better' : f.n < FIT_FIRM ? `${FIT_FIRM} to tell neighbours apart` : undefined, f.n < FIT_FROM ? 'a' : 'n'),
    t('Shape', f.set && f.set.candidates.length ? (lead ? MODEL_WORDS[lead.model.id].name : 'None fits') : '—', f.set && f.set.candidates.length ? (lead ? `of ${f.set.candidates.length} tried` : shown ? `nearest: ${MODEL_WORDS[shown.model.id].name}` : undefined) : undefined, f.set && f.set.candidates.length && !lead ? 'a' : 'n'),
    t('Fit', shown?.ad ? pWord(shown).replace('p = ', '').replace('p ', '') : '—', shown?.ad ? `Anderson–Darling A² ${fx(shown.ad.a2, 2)}` : undefined),
    t('99.865th point', lt ? `${fx(lt.p99865, dp)}${u}` : '—', lt ? `median ${fx(lt.p50, dp)}` : undefined),
    t('Beyond the limit', f.lower !== undefined || f.upper !== undefined ? beyond : '—', f.measured ? `as counted ${f.measured.k} of ${f.measured.n}` : 'name a limit to see it')];
}

export function shapePlot(f: ShapeFigures, a: AgreedAnalysis): Plot | undefined {
  const c = f.shown; if (!c || !f.enough) return undefined;
  const pts = probabilityPlot(c.model, f.xs), all = [...pts.flatMap(p => [p[0], p[1]])], ax = padded(all);
  return { kind: 'scatter', xName: `Expected under the ${MODEL_WORDS[c.model.id].name}`, yName: a.name || 'Reading', xUnit: a.unit ?? '', yUnit: a.unit ?? '', pts, xAxis: ax, yAxis: ax, line: [[ax[0], ax[0]], [ax[1], ax[1]]], equal: true };
}

export function shapeGrids(f: ShapeFigures): Grid[] {
  if (!f.set || !f.set.candidates.length) return [];
  const dp = f.dp + 1, hasLimit = f.lower !== undefined || f.upper !== undefined;
  const rows = f.set.candidates.map(c => {
    const t = f.tails[c.model.id], id = c.model.id;
    return [MODEL_WORDS[id].name, !c.ad ? 'not tested' : c.rejected ? 'rejected' : f.set?.leads === id ? 'leads' : f.set?.alsoFit.includes(id) ? 'fits about as well' : 'fits', c.ad ? pWord(c).replace('p = ', '').replace('p ', '') : '—', fx(c.model.aic, 1),
      t ? fx(t.p50, dp) : '—', t ? fx(t.p99865, dp) : '—', hasLimit && t?.out !== undefined ? inWords(t.out).replace(/^about /, '') : '—', t?.ppk !== undefined ? fx(t.ppk, 2) : '—'];
  });
  return [{ label: 'Every shape tried', head: ['Shape', 'Fit', 'A–D p', 'AIC', 'Median', '99.865th', 'Beyond', 'Ppk'], rows,
    mark: f.set.candidates.map((c, i) => (f.set?.leads === c.model.id ? i : -1)).filter(i => i >= 0), widths: [0.15, 0.17, 0.12, 0.1, 0.11, 0.12, 0.13, 0.1] }];
}

/* ================================================================== HOW FAST IS IT LEARNING */
export interface LearnFigures extends Base {
  kind: 'learn'; n: number; enough: boolean; xs: number[]; l?: Learning; standard?: number; noun: string; perRun: number; problem: string;
  /** the labour of learning: the time over the standard, summed to the run it arrives at, in hours, and in pounds at the line's rate */
  hours?: number; gbp?: number; moneyMissing?: string;
}
export function learnProblem(name: string, standard?: number, perRun?: number): string {
  if (!name.trim()) return 'What is timed — a name, "Seconds a pack, new starter".';
  if (standard !== undefined && !(Number.isFinite(standard) && standard > 0)) return 'The standard it is heading for — a time above 0, in the unit, or leave it blank.';
  if (perRun !== undefined && !(Number.isInteger(perRun) && perRun >= 1)) return 'Units in a run — a whole number, 1 or more, or leave it blank.';
  return '';
}
const secondsOf = (unit?: string): number | undefined => { const u = (unit ?? '').trim().toLowerCase(); return u === 's' || u === 'sec' || u === 'secs' || u === 'second' || u === 'seconds' ? 1 : u === 'min' || u === 'mins' || u === 'minute' || u === 'minutes' ? 60 : undefined; };
export function learnFigures(a: AgreedAnalysis, readings: StudyReading[], base: Base, rate?: number): LearnFigures {
  const xs = values(readings), noun = (a.firstName ?? '').trim().toLowerCase() || 'run', perRun = a.perRun ?? 1;
  const f: LearnFigures = { ...base, kind: 'learn', n: xs.length, enough: xs.length >= LEARN_FROM, xs, standard: a.standard, noun, perRun, problem: learnProblem(a.name, a.standard, a.perRun) };
  f.dp = placesOf(xs);
  if (f.problem || !f.enough) return f;
  f.l = learningCurve(xs, f.conf, a.standard);
  const l = f.l;
  if (!l) { f.checks.push({ what: 'Fit', say: `Fit: no curve can be fitted — every ${noun} the same time, or a time of zero or less.`, tone: 'a' }); return f; }
  if (l.r2 < 0.7) f.checks.push({ what: 'Fit', say: `Fit: R² ${fx(l.r2, 2)} — the ${noun}s do not fall steadily; learning in steps, or a change of method or person mid-series, makes one curve a poor description. A new curve starts when the method changes.`, tone: 'a' });
  if (xs.length < 8) f.checks.push({ what: 'Size', say: `Size: ${xs.length} ${noun}s — a curve is read from ${LEARN_FROM}, firm from about 8 spanning three doublings; projecting far beyond the ${noun}s timed is a guess.`, tone: 'n' });
  if (l.extra !== undefined) {
    const sec = secondsOf(a.unit);
    if (sec === undefined) f.moneyMissing = 'the labour of learning in money needs the time in seconds or minutes';
    else if (a.perRun === undefined) f.moneyMissing = `give the units of work in a ${noun} to say the learning in money`;
    else {
      f.hours = (l.extra * sec * perRun) / 3600;
      if (rate !== undefined && rate > 0) f.gbp = f.hours * rate; else f.moneyMissing = 'give the line a wage to say the learning in money';
    }
  }
  return f;
}
export function learnSays(f: LearnFigures, a: AgreedAnalysis): AnalysisSays {
  const u = a.unit ? ` ${a.unit}` : '', name = a.name.trim() || 'The time', dp = Math.max(f.dp, 0) + 1, noun = f.noun, c = f.conf, S = f.standard;
  const none = (text: string, verdict = 'Not started'): AnalysisSays => ({ text, tone: 'n', verdict, more: [], notClaimed: '' });
  if (f.problem) return none(f.problem);
  if (!f.n) return none(`Type or paste the time of each ${noun} in the order timed — ${LEARN_FROM} at least, spanning a doubling or two.`);
  if (!f.enough) return none(`${f.n} ${noun}${f.n === 1 ? '' : 's'} — a curve is fitted from ${LEARN_FROM}, spanning a doubling or two.`, 'Too few');
  const l = f.l; if (!l) return none(`No curve can be fitted to these ${noun}s.`, 'Nothing to fit');
  const rate = (x: number): string => `${fx(x * 100, 1)}%`;
  const head = `${name}: learning at ${rate(l.rate)} a doubling (${sure(c)} between ${rate(l.rateLo)} and ${rate(l.rateHi)}; R² ${fx(l.r2, 3)}) — each time the ${noun}s double, the time falls to ${rate(l.rate)} of itself.`;
  const plan = ` Plan the first ${f.n} ${noun}s at about ${fx(l.cumAvg, dp)}${u}, the average so far${S !== undefined ? `, not at the standard` : ''}.`;
  const more: string[] = [`The curve: time at ${noun} n = ${fx(l.t1, dp)}${u} × n^${fx(l.b, 3)} (Wright’s unit-time form, fitted to ln time against ln ${noun}). At ${noun} ${2 * f.n} it gives ${fx(l.at(2 * f.n), dp)}${u}, at ${4 * f.n} ${fx(l.at(4 * f.n), dp)}${u} — beyond the ${noun}s timed it is a projection, not a measurement.`];
  if (f.hours !== undefined) {
    const h = f.hours < 1 ? `${Math.max(1, Math.round(f.hours * 60))} minutes` : `${f.hours >= 10 ? Math.round(f.hours) : +f.hours.toFixed(1)} hours`;
    more.push(f.gbp !== undefined ? `In money: learning to the standard takes about ${h} of extra time over the ${l.nStar} ${noun}s — ${gbpWord(f.gbp)} of labour at the line’s rate, because of the time over the standard.` : `In money: learning to the standard takes about ${h} of extra time over the ${l.nStar} ${noun}s — ${f.moneyMissing}.`);
  } else if (f.moneyMissing) more.push(`In money: ${f.moneyMissing}.`);
  const atRun = (k: number): string => (k > 9999 ? `a ${noun} beyond 10,000` : `${noun} ${k}`);
  const notClaimed = 'The curve describes these runs; it does not say the person or product will keep learning at this rate, or that the standard is right — a plateau, a change of method or a break in production changes it.';
  if (l.plateau) return { text: `${head} But the last four ${noun}s have stopped falling (slope ${fx(l.plateau.slope, 2)} against ${fx(l.b, 2)} overall) while still above the ${S}${u} standard: the method or the station limits it, not the person — redesign, not more practice.${plan}`, tone: 'a', verdict: 'Flattening above the standard', more, notClaimed };
  if (S === undefined) return { text: `${head}${plan}`, tone: 'n', verdict: `Learning at ${rate(l.rate)}`, more, notClaimed };
  if (l.reached !== undefined && f.xs[f.n - 1] <= S) return { text: `${head} The ${S}${u} standard was first met at ${noun} ${l.reached}.${plan}`, tone: 'g', verdict: `Standard met at ${noun} ${l.reached}`, more, notClaimed };
  if (l.nStar === undefined) return { text: `${head} The time is not falling toward the ${S}${u} standard, so learning alone will not reach it.${plan}`, tone: 'a', verdict: 'Not reaching the standard', more, notClaimed };
  if (l.far) return { text: `${head} The ${S}${u} standard would arrive at ${atRun(l.nStar)} — more than ${LEARN_FAR} times the ${f.n} ${noun}s timed, a guess and not a forecast.${plan}`, tone: 'a', verdict: l.nStar > 9999 ? 'Standard far off' : `Standard far off (${noun} ${l.nStar})`, more, notClaimed };
  return { text: `${head} The ${S}${u} standard arrives at ${noun} ${l.nStar}${l.reached !== undefined ? ` (first met at ${noun} ${l.reached})` : ''}.${plan}`, tone: 'n', verdict: `Standard at ${noun} ${l.nStar}`, more, notClaimed };
}
export function learnTiles(f: LearnFigures, a: AgreedAnalysis): LeanTile[] {
  const u = a.unit ? ` ${a.unit}` : '', dp = Math.max(f.dp, 0) + 1, conf = pctWord(f.conf), l = f.l, S = f.standard;
  const t = (k: string, v: string, of?: string, tone?: Tone): LeanTile => ({ k, v, ...(of ? { of } : {}), ...(tone && tone !== 'n' ? { tone } : {}) });
  const rate = (x: number): string => `${fx(x * 100, 1)}%`;
  return [t(cap(`${f.noun}s`), big(f.n), f.n < LEARN_FROM ? `at least ${LEARN_FROM}` : undefined, f.n < LEARN_FROM ? 'a' : 'n'),
    t('Learning rate', l ? rate(l.rate) : '—', l ? `${conf}: ${rate(l.rateLo)}–${rate(l.rateHi)} · R² ${fx(l.r2, 3)}` : undefined),
    t('Standard arrives', l && S !== undefined ? (l.reached !== undefined && l.nStar === undefined ? `${f.noun} ${l.reached}` : l.nStar !== undefined ? (l.nStar > 9999 ? 'beyond 10,000' : `${f.noun} ${l.nStar}`) : 'not by learning') : '—', S !== undefined ? `standard ${S}${u}` : undefined, l?.plateau || (l && S !== undefined && l.nStar === undefined && l.reached === undefined) || l?.far ? 'a' : 'n'),
    t('Plan at', l ? `${fx(l.cumAvg, dp)}${u}` : '—', l ? `the average of the ${f.n} so far` : undefined),
    t('In money', f.gbp !== undefined ? gbpWord(f.gbp) : '—', f.gbp !== undefined ? 'labour of learning to the standard' : S === undefined ? 'name a standard' : f.moneyMissing)];
}
export function learnPlot(f: LearnFigures, a: AgreedAnalysis): Plot | undefined {
  const l = f.l; if (!l) return undefined;
  const last = Math.max(f.n, l.nStar !== undefined && !l.far ? Math.ceil(l.nStar * 1.2) : 2 * f.n), steps = 40;
  const curve = Array.from({ length: steps + 1 }, (_, i) => { const k = 1 + (last - 1) * i / steps; return [k, l.at(k)] as [number, number]; });
  const ys = [...f.xs, ...curve.map(p => p[1]), ...(f.standard !== undefined ? [f.standard] : [])];
  return { kind: 'scatter', xName: cap(f.noun), yName: a.name || 'Time', xUnit: '', yUnit: a.unit ?? '', pts: f.xs.map((v, i) => [i + 1, v] as [number, number]), xAxis: [0.5, last + 0.5], yAxis: padded(ys),
    curve, ...(f.standard !== undefined ? { hline: { y: f.standard, label: `standard ${f.standard}${a.unit ? ` ${a.unit}` : ''}` } } : {}) };
}
