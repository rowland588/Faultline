/* THE LEARNING CURVE — HOW FAST A NEW JOB IS BEING LEARNED (FC-027; knowledge/specs/FC-027-learning-curve.md; ie.learning-curve).
 *
 * Wright's unit-time form: the time of the n-th run is T₁·nᵇ, with b = log₂(the learning rate) — each time the number of
 * runs doubles the time falls to that share of itself (80% means to four fifths). It is fitted by the straight line of ln T
 * against ln n (lib/ie/relate, proved against SciPy), so the rate comes with the interval its slope gives, the share of the
 * falling the curve explains is R², and whether the runs fall evenly about it is the runs test the line already carries.
 * From it: the run at which the time reaches a standard, what to plan the first runs at (the average of the runs to get
 * there, not the standard) and — with the line's wage and the packs a run makes — what learning costs.
 *
 * Pure; the page, the paper and the acceptance script read these sentences. The independent case is
 * scripts/knowledge/cases-time.py §8 (the record's eight runs, SciPy). Nothing is claimed beyond the runs read: a projection
 * far past the last run is said to be a guess. */
import type { AgreedAnalysis, StudyReading } from '../../lib/study';
import type { LeanTile } from '../../lib/lean';
import { relate, type Line } from '../../lib/ie/relate';
import type { AnalysisSays, Base, Check, Tone } from './analysis';

/** A curve is fitted from this many runs (the record: five or six spanning a doubling is the minimum); said weak under WEAK_RUNS. */
export const LEARN_FROM = 5;
export const WEAK_RUNS = 8;
/** A projection past this many times the runs read is called a guess (the builder's choice, 25 October). */
export const FAR_TIMES = 3;

export interface LearnFigures extends Base {
  kind: 'learn';
  n: number; enough: boolean; weak: boolean;
  /** The time of each run, in the order taken — a struck run keeps its place and counts for nothing. */
  runs: { run: number; t: number }[];
  refusal?: string;
  line?: Line;
  /** Wright's b, T₁, the learning rate and its interval; whether the time is shown to be falling. */
  b?: number; t1?: number; rate?: number; rateLo?: number; rateHi?: number; r2?: number; falling: boolean;
  standard?: number;
  /** The run at which the fitted time reaches the standard (with the interval the slope allows), and the first run actually at it. */
  reach?: { run: number; lo?: number; hi?: number; already: boolean; far: boolean; actual?: number };
  /** What the runs to the standard (or those read) averaged on the curve, against the standard. */
  plan?: { upto: number; avg: number; readAvg: number };
  /** The extra time the runs to the standard take above it, seconds a unit, and in money when it can be said. */
  extra?: { seconds: number; units?: number; pounds?: number; missing?: string };
  /** The fitted time at some runs beyond the last — a projection, never a reading. */
  ahead: { run: number; t: number }[];
  /** The curve, run by run, for the picture. */
  curve: [number, number][];
}

const fx = (v: number, dp = 1): string => v.toFixed(dp).replace('-', '−');
const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
const sec = (v: number, unit: string): string => `${fx(v, v < 10 ? 2 : 1)} ${unit || 's'}`;
const secsOf = (unit: string): number | undefined => (!unit || /^s(ec(onds?)?)?$/i.test(unit) ? 1 : /^min(ute)?s?$/i.test(unit) ? 60 : undefined);

/** The runs: every reading with a number and no side, in the order taken; a struck one keeps its run number. */
export function learnRuns(readings: StudyReading[]): { run: number; t: number }[] {
  const all = readings.filter(r => !r.arm && typeof r.value === 'number');
  return all.map((r, i) => ({ run: i + 1, t: r.value as number, struck: !!r.struck })).filter(x => !x.struck).map(({ run, t }) => ({ run, t }));
}

export function learnFigures(a: AgreedAnalysis, readings: StudyReading[], base: Base, opts: { rate?: number } = {}): LearnFigures {
  const runs = learnRuns(readings), n = runs.length, unit = a.unit ?? 's';
  const f: LearnFigures = { ...base, kind: 'learn', n, enough: n >= LEARN_FROM, weak: n >= LEARN_FROM && n < WEAK_RUNS, runs, falling: false, ahead: [], curve: [], ...(a.learn?.standard ? { standard: a.learn.standard } : {}) };
  if (!f.enough) return f;
  if (runs.some(r => !(r.t > 0))) { f.refusal = 'A time must be above 0 — a run with none cannot be put on a curve. Strike it, or correct it.'; return f; }
  const line = relate(runs.map(r => Math.log(r.run)), runs.map(r => Math.log(r.t)), base.conf);
  if (!line) { f.refusal = 'Every run took the same time, so there is no curve to fit — nothing has been learned between them.'; return f; }
  f.line = line;
  const b = line.slope, t1 = Math.exp(line.intercept);
  f.b = b; f.t1 = t1; f.rate = 2 ** b; f.rateLo = 2 ** line.slopeLo; f.rateHi = 2 ** line.slopeHi; f.r2 = line.r2; f.falling = line.slopeHi < 0;
  const at = (k: number) => t1 * k ** b;
  const last = runs[runs.length - 1].run;
  const S = f.standard;
  if (S && S > 0 && b < 0) {
    const need = (bb: number) => Math.max(1, Math.ceil((S / t1) ** (1 / bb) - 1e-9));
    const already = S >= t1;
    const run = already ? 1 : need(b);
    /* the steeper edge of the slope's interval gets there first, the shallower later (and never, if it reaches nought) */
    const lo = line.slopeLo < 0 && !already ? need(line.slopeLo) : undefined, hi = line.slopeHi < 0 && !already ? need(line.slopeHi) : undefined;
    const actual = runs.find(r => r.t <= S)?.run;
    f.reach = { run, ...(lo !== undefined ? { lo } : {}), ...(hi !== undefined ? { hi } : {}), already, far: run > FAR_TIMES * last, ...(actual !== undefined ? { actual } : {}) };
  }
  const upto = f.reach ? Math.min(Math.max(f.reach.run, 1), 1000) : last;
  const avg = (m: number) => { let t = 0; for (let k = 1; k <= m; k++) t += at(k); return t / m; };
  f.plan = { upto, avg: avg(upto), readAvg: runs.reduce((s, r) => s + r.t, 0) / n };
  f.ahead = [Math.max(last + 1, 2 * last), 4 * last].map(r => ({ run: r, t: at(r) }));
  const horizon = Math.min(Math.max(last, f.reach && !f.reach.far ? f.reach.run : last), 4 * last);
  f.curve = Array.from({ length: Math.min(horizon, 200) }, (_, i) => [i + 1, at(i + 1)] as [number, number]);
  if (f.reach && S && !f.reach.already) {
    let extra = 0; for (let k = 1; k <= f.reach.run; k++) extra += Math.max(0, at(k) - S);
    const toSec = secsOf(unit);
    const units = a.learn?.perRun;
    const e: NonNullable<LearnFigures['extra']> = { seconds: extra * (toSec ?? 1) };
    if (toSec === undefined) e.missing = `Money needs the times in seconds or minutes — these are in ${unit}.`;
    else if (!(opts.rate && opts.rate > 0)) e.missing = 'Give the line a wage to say the learning in money.';
    else if (!(units && units > 0)) e.missing = 'Say how many units each reading stands for (the box under “What is asked”) to put the learning in money.';
    else { e.units = units; e.pounds = (e.seconds * units * opts.rate) / 3600; }
    f.extra = e;
  }
  /* the checks, in the figures' own words */
  const checks: Check[] = [];
  if (f.weak) checks.push({ what: 'Size', say: `Size: fewer than ${WEAK_RUNS} runs — a rate from so few is a hint; read it as one.`, tone: 'a' });
  if (!f.falling && b >= 0) checks.push({ what: 'Falling', say: 'Falling: the time is not falling with the runs — nothing is being learned, or something else is holding it up.', tone: 'a' });
  else if (!f.falling) checks.push({ what: 'Falling', say: `Falling: the interval for the slope reaches nought (${pct(f.rateLo as number)} to ${pct(f.rateHi as number)}) — the fall may be chance.`, tone: 'a' });
  if (line.runs) {
    checks.push(line.runs.p < 0.05
      ? { what: 'Shape', say: `Shape: the runs fall above and below the curve in ${line.runs.runs} stretches where about ${fx(line.runs.expected, 0)} are expected (p = ${line.runs.p.toFixed(3)}) — the learning is not following one curve: it may be flattening or falling in steps. A plateau above the standard says the method or the station limits it — redesign, not more practice.`, tone: 'a' }
      : { what: 'Shape', say: `Shape: the runs fall above and below the curve in ${line.runs.runs} stretches, about as many as expected (${fx(line.runs.expected, 0)}) — no sign the curve is the wrong shape.`, tone: 'n' });
  }
  if (f.reach?.far) checks.push({ what: 'Far', say: `Far: the standard is reached at run ${f.reach.run}, more than ${FAR_TIMES} times the ${last} read — a projection that far is a guess.`, tone: 'a' });
  f.checks = checks;
  return f;
}

/** What is wrong with what was agreed, said while agreeing. */
export function learnProblem(a: Pick<AgreedAnalysis, 'learn'>): string {
  const l = a.learn;
  if (l?.standard !== undefined && !(l.standard > 0)) return 'The standard the job is heading for — a time above 0, in the unit.';
  if (l?.perRun !== undefined && !(l.perRun > 0 && Number.isFinite(l.perRun))) return 'How many units each reading stands for — a number above 0.';
  return '';
}

export function learnSays(f: LearnFigures, a: AgreedAnalysis): AnalysisSays {
  const u = a.unit ?? 's', name = a.name.trim() || 'The job';
  if (f.n === 0) return { text: 'Type the time of each run in the order it was made — run 1 first.', tone: 'n', verdict: 'Not started', more: [], notClaimed: '' };
  if (!f.enough) return { text: `${f.n} run${f.n === 1 ? '' : 's'} — at least ${LEARN_FROM} are needed to fit a curve (five or six, over a doubling or two).`, tone: 'n', verdict: 'Too few', more: [], notClaimed: '' };
  if (f.refusal || !f.rate || !f.t1 || f.b === undefined) return { text: f.refusal ?? 'No curve could be fitted.', tone: 'a', verdict: 'No curve', more: [], notClaimed: '' };
  const sure = `we can be ${Math.round(f.conf * 100)}% confident`;
  const head = f.falling
    ? `${f.n} runs: each time the runs double, the time falls to ${pct(f.rate)} of itself — ${sure} the rate is between ${pct(f.rateLo as number)} and ${pct(f.rateHi as number)} (the curve explains ${pct(f.r2 as number)} of the change).`
    : `${f.n} runs: the time is not shown to be falling — the rate is ${pct(f.rate)} but ${sure} only that it is between ${pct(f.rateLo as number)} and ${pct(f.rateHi as number)}.`;
  const S = f.standard, R = f.reach;
  const reach = !S ? 'Give the standard the job is heading for (change what was agreed) to say when it will be reached.'
    : !R ? (f.b >= 0 ? `The time is not falling, so the ${sec(S, u)} standard is not being approached.` : '')
      : R.already ? `The curve starts at ${sec(f.t1, u)}, already at the ${sec(S, u)} standard.`
        : `The ${sec(S, u)} standard is reached at about run ${R.run}${R.lo !== undefined && R.hi !== undefined ? ` (between run ${R.lo} and run ${R.hi} by the slope’s interval)` : ''}${R.actual !== undefined ? `; run ${R.actual} was the first read at or under it` : ''}.`;
  const more: string[] = [];
  if (f.plan) more.push(f.reach && !f.reach.already
    ? `Plan the first ${f.plan.upto} runs at about ${sec(f.plan.avg, u)} each on average — not at the standard; the ${f.n} read averaged ${sec(f.plan.readAvg, u)}.`
    : `The ${f.n} runs read averaged ${sec(f.plan.readAvg, u)}; the curve puts them at ${sec(f.plan.avg, u)} on average.`);
  if (f.ahead.length) more.push(`At this rate run ${f.ahead[0].run} takes ${sec(f.ahead[0].t, u)} and run ${f.ahead[1].run} ${sec(f.ahead[1].t, u)} — projections, not readings.`);
  if (f.extra) {
    if (f.extra.pounds !== undefined) more.push(`Learning to the standard costs about ${fx(f.extra.seconds / 3600 * (f.extra.units ?? 1), 1)} hours of one person’s time over what the standard would take — £${Math.round(f.extra.pounds).toLocaleString('en-GB')} at the line’s rate, over ${f.reach?.run} runs of ${f.extra.units} units.`);
    else if (f.extra.missing) more.push(f.extra.missing);
  }
  more.push(`Wright’s curve: T = ${fx(f.t1, 1)} × run^${fx(f.b, 3)}.`);
  return { text: [head, reach].filter(Boolean).join(' '), tone: f.falling ? (f.checks.some(c => c.tone === 'a') ? 'a' : 'g') : 'a',
    verdict: f.falling ? `Learning at ${Math.round(f.rate * 100)}%` : 'Not shown to be falling', more,
    notClaimed: `The curve is a fit to what was timed for ${name.toLowerCase()} — beyond the last run it is a projection. It measures time, not quality (early runs also reject more); pooling two people or two products is two curves averaged into nonsense, and a change of method starts a new curve.` };
}

export function learnTiles(f: LearnFigures, a: AgreedAnalysis): LeanTile[] {
  const u = a.unit ?? 's', conf = Math.round(f.conf * 100);
  const t = (k: string, v: string, of?: string, tone?: Tone): LeanTile => ({ k, v, ...(of ? { of } : {}), ...(tone && tone !== 'n' ? { tone } : {}) });
  const has = f.enough && f.rate !== undefined;
  return [
    t('Runs', String(f.n), f.n < LEARN_FROM ? `at least ${LEARN_FROM} for a curve` : f.weak ? `at least ${WEAK_RUNS} for a firm one` : undefined, f.n < LEARN_FROM || f.weak ? 'a' : 'n'),
    t('Learning rate', has ? pct(f.rate as number) : '—', has ? `${conf}%: ${pct(f.rateLo as number)}–${pct(f.rateHi as number)}` : undefined, has && !f.falling ? 'a' : 'n'),
    t('Explained', has ? pct(f.r2 as number) : '—', has ? 'R² of the curve' : undefined),
    t('Standard reached', f.reach ? (f.reach.already ? 'run 1' : `run ${f.reach.run}`) : '—', f.reach?.lo !== undefined ? `run ${f.reach.lo}–${f.reach.hi}` : f.standard ? undefined : 'give a standard', f.reach?.far ? 'a' : 'n'),
    t('Plan the first runs at', f.plan ? sec(f.plan.avg, u) : '—', f.plan ? `average of the first ${f.plan.upto}` : undefined),
  ];
}

/** The picture: the runs, the curve and the standard — what the page draws as a scatter and the paper as the same plot. */
export function learnPlot(f: LearnFigures, a: AgreedAnalysis) {
  if (!f.enough || !f.curve.length) return undefined;
  const xs = [1, ...f.runs.map(r => r.run), ...f.curve.map(c => c[0])], ys = [...f.runs.map(r => r.t), ...f.curve.map(c => c[1]), ...(f.standard ? [f.standard] : [])];
  const lo = Math.min(...ys), hi = Math.max(...ys), pad = Math.max((hi - lo) * 0.08, 1e-9);
  return { kind: 'scatter' as const, xName: 'Run', yName: a.name, xUnit: '', yUnit: a.unit ?? 's', pts: f.runs.map(r => [r.run, r.t] as [number, number]),
    xAxis: [Math.min(...xs) - 0.5, Math.max(...xs) + 0.5] as [number, number], yAxis: [Math.max(0, lo - pad), hi + pad] as [number, number],
    curve: f.curve, ...(f.standard ? { ref: { y: f.standard, label: `standard ${fx(f.standard, 1)} ${a.unit ?? 's'}` } } : {}) };
}
