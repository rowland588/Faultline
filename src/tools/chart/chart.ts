/* THE CONTROL CHART — its figures and its words (knowledge/specs/FC-086-charts.md, W2; 24 October 2026).
 *
 * One record (lib/study AgreedChart on a ToolStudy of tool 'chart'), three kinds — the individuals and
 * moving range chart (FC-086), subgroups as X̄-R or X̄-S (FC-087), pre-control for a set-up (FC-092) —
 * and the modes as fields: the signals (FC-090), the CUSUM and EWMA (FC-091), short-run by product
 * (FC-093). The arithmetic is lib/ie/charts (validated against SciPy); this module turns a study's
 * readings into one picture's figures and the sentences the page and the paper say — never a second
 * copy of either. */
import type { AgreedChart, StudyReading } from '../../lib/study';
import type { LeanTile } from '../../lib/lean';
import { xmrLimits, subgroupLimits, nelson, cusum, ewma, levene, RULE_WORDS, WESTERN_ELECTRIC, type Signal, type Rule, type Cusum, type Ewma } from '../../lib/ie/charts';

/** Limits are set from this many readings (or subgroups) — before it they are provisional and said so. */
export const LIMITS_FROM = 20;
/** CUSUM's decision interval in σ (ARL₀ about 469 two-sided — spc.cusum-ewma); the EWMA's weight and width. */
export const CUSUM_H = 5;
export const EWMA_LAMBDA = 0.2;
export const EWMA_L = 2.962;
/** Pre-control: greens in a row that qualify a set-up (Shainin). */
export const GREENS_TO_QUALIFY = 5;

export type Tone = 'g' | 'a' | 'r' | 'n';
export type Zone = 'green' | 'amber' | 'red';
export interface ChartPoint {
  /** 1-based, in the order taken (a subgroup's number on an X̄ chart) */
  no: number;
  /** the reading's id (the first reading's, on a subgroup) */
  id: string;
  /** what is plotted: the reading, the subgroup's mean, the deviation from nominal, or z */
  y: number;
  /** the moving range, the subgroup's range or s — undefined on the first point */
  spread?: number;
  state: 'in' | 'beyond' | 'signal';
  product?: string;
  note?: string;
  zone?: Zone;
  /** a short subgroup (fewer than m readings) — plotted, not judged */
  short?: boolean;
}
export interface ShortRun {
  mode: 'dnom' | 'zmr';
  products: { product: string; nominal: number; n: number; mean: number; sd: number }[];
  levene?: { w: number; p: number };
  /** the spreads alike — Levene's p ≥ 0.05 and the largest s under twice the smallest */
  alike?: boolean;
  /** the point numbers where the product changes — a changeover boundary */
  boundaries: number[];
}
export interface PreControl {
  nominal: number;
  /** half the tolerance */
  t: number;
  /** greens in a row at the end of set-up (reset by an amber or a red) */
  greens: number;
  qualified: boolean;
  qualifiedAt?: number;
  pairs: { nos: [number, number]; zones: [Zone, Zone]; say: string; tone: Tone }[];
}
export interface ChartFigures {
  kind: AgreedChart['kind'];
  /** live readings (not struck) */
  n: number;
  points: ChartPoint[];
  centre?: number;
  lcl?: number;
  ucl?: number;
  sigma?: number;
  spreadCentre?: number;
  spreadUcl?: number;
  spreadLcl?: number;
  /** the limits are not set yet — from fewer than LIMITS_FROM, or from the first 20 but not frozen by a tap */
  provisional: boolean;
  /** what the limits were set from */
  from?: { from: number; to: number; n: number };
  signals: Signal[];
  /** readings beyond the specification limits */
  specOutside: number;
  cusum?: Cusum;
  ewma?: Ewma;
  shortRun?: ShortRun;
  pre?: PreControl;
  /** the subgroup size on an X̄ chart */
  m?: number;
  dp: number;
}

const live = (rs: StudyReading[]): (StudyReading & { value: number })[] => rs.filter((r): r is StudyReading & { value: number } => !r.struck && typeof r.value === 'number');
const dpOf = (x: number): number => { const s = String(x); const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(4, s.length - i - 1); };
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]): number => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };

/** THE FIGURES of a chart from its agreement and its readings in order. */
export function chartFigures(a: AgreedChart, readings: StudyReading[]): ChartFigures {
  const rs = live(readings);
  const dp = rs.reduce((d, r) => Math.max(d, dpOf(r.value)), 0);
  const f: ChartFigures = { kind: a.kind, n: rs.length, points: [], provisional: true, signals: [], specOutside: rs.filter(r => (a.lower !== undefined && r.value < a.lower) || (a.upper !== undefined && r.value > a.upper)).length, dp };
  if (!rs.length) return f;
  if (a.kind === 'precontrol') return preControl(a, rs, f);
  if (a.kind === 'xbar') return xbar(a, rs, f);
  return xmr(a, rs, f);
}

/* ------------------------------ the individuals chart ------------------------------ */
function xmr(a: AgreedChart, rs: (StudyReading & { value: number })[], f: ChartFigures): ChartFigures {
  /* short-run: each reading's deviation from its product's nominal, or z when the spreads differ */
  let ys = rs.map(r => r.value);
  if (a.products) {
    const by = new Map<string, { nominal: number; xs: number[] }>();
    for (const r of rs) if (r.product && r.nominal !== undefined) { const e = by.get(r.product) ?? { nominal: r.nominal, xs: [] }; e.xs.push(r.value - r.nominal); by.set(r.product, e); }
    const products = [...by.entries()].map(([product, e]) => ({ product, nominal: e.nominal, n: e.xs.length, mean: mean(e.xs), sd: e.xs.length >= 2 ? sd(e.xs) : 0 }));
    const groups = [...by.values()].map(e => e.xs).filter(x => x.length >= 2);
    const lev = levene(groups);
    const sds = products.filter(p => p.n >= 2).map(p => p.sd).filter(v => v > 0);
    const alike = lev ? lev.p >= 0.05 && (sds.length < 2 || Math.max(...sds) < 2 * Math.min(...sds)) : undefined;
    const mode: ShortRun['mode'] = alike === false ? 'zmr' : 'dnom';
    const boundaries: number[] = [];
    rs.forEach((r, i) => { if (i > 0 && r.product !== rs[i - 1].product) boundaries.push(i + 1); });
    f.shortRun = { mode, products, ...(lev ? { levene: { w: lev.w, p: lev.p } } : {}), ...(alike !== undefined ? { alike } : {}), boundaries };
    const pooled = (() => { const all = [...by.values()].flatMap(e => e.xs); return all.length >= 2 ? sd(all) : 1; })();
    ys = rs.map(r => {
      const dev = r.nominal !== undefined ? r.value - r.nominal : r.value;
      if (mode === 'dnom') return dev;
      const p = r.product ? by.get(r.product) : undefined;
      const sp = p && p.xs.length >= LIMITS_FROM ? sd(p.xs) : pooled;
      return sp > 0 ? dev / sp : dev;
    });
  }
  const spreads = ys.map((y, i) => (i === 0 ? undefined : Math.abs(y - ys[i - 1])));
  /* short-run: the moving range across a changeover boundary is not used (it mixes two set-ups) */
  if (f.shortRun) for (const b of f.shortRun.boundaries) spreads[b - 1] = undefined;
  const zmr = f.shortRun?.mode === 'zmr';
  let lim: { centre: number; mrBar: number; sigma: number; lcl: number; ucl: number; mrUcl: number } | undefined;
  if (zmr) lim = { centre: 0, mrBar: 1.128, sigma: 1, lcl: -3, ucl: 3, mrUcl: 3.267 };
  else if (a.frozen && !a.products) { const fr = a.frozen; lim = { centre: fr.centre, mrBar: fr.spread, sigma: fr.sigma, lcl: fr.centre - 2.66 * fr.spread, ucl: fr.centre + 2.66 * fr.spread, mrUcl: 3.267 * fr.spread }; f.from = { from: fr.from, to: fr.to, n: fr.n }; f.provisional = false; }
  else if (a.frozen && a.products) { const fr = a.frozen; lim = { centre: fr.centre, mrBar: fr.spread, sigma: fr.sigma, lcl: fr.centre - 2.66 * fr.spread, ucl: fr.centre + 2.66 * fr.spread, mrUcl: 3.267 * fr.spread }; f.from = { from: fr.from, to: fr.to, n: fr.n }; f.provisional = false; }
  else {
    const first = ys.slice(0, LIMITS_FROM), l = xmrLimits(first);
    if (l) { lim = l; f.from = { from: 1, to: first.length, n: first.length }; }
    f.provisional = true;
  }
  if (lim) { f.centre = lim.centre; f.lcl = lim.lcl; f.ucl = lim.ucl; f.sigma = lim.sigma; f.spreadCentre = lim.mrBar; f.spreadUcl = lim.mrUcl; f.spreadLcl = 0; }
  f.signals = lim ? nelson(ys, lim.centre, lim.sigma, rulesOf(a)) : [];
  const flagged = new Set(f.signals.flatMap(s => s.points));
  f.points = rs.map((r, i) => ({ no: i + 1, id: r.id, y: ys[i], ...(spreads[i] !== undefined ? { spread: spreads[i] } : {}), state: lim && (ys[i] > lim.ucl || ys[i] < lim.lcl) ? 'beyond' : flagged.has(i + 1) ? 'signal' : 'in', ...(r.product ? { product: r.product } : {}), ...(r.note ? { note: r.note } : {}) }));
  /* the CUSUM and the EWMA against the target (else the centre), σ from the limits */
  if (lim && !zmr) {
    const target = a.target ?? lim.centre;
    if (a.cusum && a.cusum.shift > 0) f.cusum = cusum(ys, target, a.cusum.shift / 2, CUSUM_H * lim.sigma, a.cusum.headStart);
    if (a.ewma) f.ewma = ewma(ys, target, lim.sigma, EWMA_LAMBDA, EWMA_L);
  }
  return f;
}
export const rulesOf = (a: Pick<AgreedChart, 'rules'>): readonly Rule[] => (a.rules && a.rules.length ? a.rules : WESTERN_ELECTRIC);

/* ------------------------------ the subgroup chart ------------------------------ */
function xbar(a: AgreedChart, rs: (StudyReading & { value: number })[], f: ChartFigures): ChartFigures {
  const m = a.subgroup && a.subgroup >= 2 ? Math.min(25, Math.round(a.subgroup)) : 4;
  f.m = m;
  /* readings carry their subgroup; absent, they fall into subgroups of m in order */
  const groups: (StudyReading & { value: number })[][] = [];
  if (rs.some(r => r.group !== undefined)) {
    const by = new Map<number, (StudyReading & { value: number })[]>();
    rs.forEach((r, i) => { const g = r.group ?? Math.floor(i / m) + 1; by.set(g, [...(by.get(g) ?? []), r]); });
    for (const k of [...by.keys()].sort((p, q) => p - q)) groups.push(by.get(k) as (StudyReading & { value: number })[]);
  } else for (let i = 0; i < rs.length; i += m) groups.push(rs.slice(i, i + m));
  const useS = m > 10;
  const stat = (g: number[]) => (useS ? (g.length >= 2 ? sd(g) : 0) : Math.max(...g) - Math.min(...g));
  let lim: ReturnType<typeof subgroupLimits>;
  if (a.frozen) {
    const fr = a.frozen, k = CHART_K(m);
    lim = useS
      ? { kind: 'S', m, grand: fr.centre, spreadBar: fr.spread, sigma: fr.sigma, lcl: fr.centre - k.A3 * fr.spread, ucl: fr.centre + k.A3 * fr.spread, spreadLcl: k.B3 * fr.spread, spreadUcl: k.B4 * fr.spread, groups: fr.n }
      : { kind: 'R', m, grand: fr.centre, spreadBar: fr.spread, sigma: fr.sigma, lcl: fr.centre - k.A2 * fr.spread, ucl: fr.centre + k.A2 * fr.spread, spreadLcl: k.D3 * fr.spread, spreadUcl: k.D4 * fr.spread, groups: fr.n };
    f.from = { from: fr.from, to: fr.to, n: fr.n }; f.provisional = false;
  } else {
    const full = groups.filter(g => g.length === m).slice(0, LIMITS_FROM);
    lim = subgroupLimits(full.map(g => g.map(r => r.value)), m);
    if (lim) f.from = { from: 1, to: full.length, n: full.length };
    f.provisional = true;
  }
  if (lim) { f.centre = lim.grand; f.lcl = lim.lcl; f.ucl = lim.ucl; f.sigma = lim.sigma; f.spreadCentre = lim.spreadBar; f.spreadUcl = lim.spreadUcl; f.spreadLcl = lim.spreadLcl; }
  const means = groups.map(g => mean(g.map(r => r.value)));
  const judged = groups.map(g => g.length === m);
  f.signals = lim ? nelson(means.filter((_, i) => judged[i]), lim.grand, lim.sigma / Math.sqrt(m), rulesOf(a)) : [];
  /* the signals' point numbers are among the judged subgroups — map back to the subgroup's number */
  const judgedNos = groups.map((_, i) => i + 1).filter((_, i) => judged[i]);
  f.signals = f.signals.map(s => ({ ...s, points: s.points.map(p => judgedNos[p - 1]) }));
  const flagged = new Set(f.signals.flatMap(s => s.points));
  f.points = groups.map((g, i) => {
    const y = means[i], sp = stat(g.map(r => r.value)), spreadOut = lim && judged[i] && (sp > lim.spreadUcl || sp < lim.spreadLcl);
    return { no: i + 1, id: g[0].id, y, spread: sp, state: !judged[i] ? 'in' : lim && (y > lim.ucl || y < lim.lcl || spreadOut) ? 'beyond' : flagged.has(i + 1) ? 'signal' : 'in', ...(judged[i] ? {} : { short: true }), ...(g.some(r => r.note) ? { note: g.filter(r => r.note).map(r => r.note).join('; ') } : {}) };
  });
  return f;
}
import { CHART_CONSTANTS, c4Of } from '../../lib/ie/charts';
const CHART_K = (m: number) => CHART_CONSTANTS[m] ?? (() => { const c4 = c4Of(m); return { d2: 0, A2: 0, D3: 0, D4: 0, c4, A3: 3 / (c4 * Math.sqrt(m)), B3: Math.max(0, 1 - 3 * Math.sqrt(1 - c4 * c4) / c4), B4: 1 + 3 * Math.sqrt(1 - c4 * c4) / c4 }; })();

/* ------------------------------ pre-control ------------------------------ */
export const zoneOf = (v: number, nominal: number, t: number): Zone => (Math.abs(v - nominal) <= t / 2 + 1e-9 ? 'green' : Math.abs(v - nominal) <= t + 1e-9 ? 'amber' : 'red');
function preControl(a: AgreedChart, rs: (StudyReading & { value: number })[], f: ChartFigures): ChartFigures {
  if (a.lower === undefined || a.upper === undefined || !(a.upper > a.lower)) { f.points = rs.map((r, i) => ({ no: i + 1, id: r.id, y: r.value, state: 'in' })); return f; }
  const nominal = (a.lower + a.upper) / 2, t = (a.upper - a.lower) / 2;
  const zones = rs.map(r => zoneOf(r.value, nominal, t));
  /* set-up: five greens in a row; an amber or a red restarts the count */
  let greens = 0, qualifiedAt: number | undefined;
  for (let i = 0; i < zones.length && qualifiedAt === undefined; i++) { greens = zones[i] === 'green' ? greens + 1 : 0; if (greens >= GREENS_TO_QUALIFY) qualifiedAt = i + 1; }
  const pre: PreControl = { nominal, t, greens: qualifiedAt === undefined ? greens : GREENS_TO_QUALIFY, qualified: qualifiedAt !== undefined, ...(qualifiedAt !== undefined ? { qualifiedAt } : {}), pairs: [] };
  /* running: the readings after qualification two at a time */
  if (qualifiedAt !== undefined) {
    for (let i = qualifiedAt; i + 1 < zones.length; i += 2) {
      const z: [Zone, Zone] = [zones[i], zones[i + 1]], nos: [number, number] = [i + 1, i + 2];
      const side = (k: number) => (rs[k].value >= nominal ? 'high' : 'low');
      let say: string, tone: Tone;
      if (z.includes('red')) { say = 'a red — stop, find why, re-qualify with five greens'; tone = 'r'; }
      else if (z[0] === 'amber' && z[1] === 'amber') {
        if (side(i) === side(i + 1)) { say = `both amber on the ${side(i)} side — adjust toward the nominal, then re-qualify`; tone = 'a'; }
        else { say = 'two amber on opposite sides — stop: the spread has grown, find why'; tone = 'r'; }
      } else { say = z.includes('amber') ? 'one green, one amber — carry on' : 'both green — carry on'; tone = 'g'; }
      pre.pairs.push({ nos, zones: z, say, tone });
    }
  }
  f.pre = pre;
  f.points = rs.map((r, i) => ({ no: i + 1, id: r.id, y: r.value, state: zones[i] === 'red' ? 'beyond' : zones[i] === 'amber' ? 'signal' : 'in', zone: zones[i], ...(r.note ? { note: r.note } : {}) }));
  return f;
}

/* =================================== WORDS =================================== */
const fx = (v: number, dp: number): string => v.toFixed(dp);
const big = (n: number): string => n.toLocaleString('en-GB');
export interface ChartSays { text: string; tone: Tone; verdict: string; /** each signal in words, with what it usually means */ signals: { text: string; means: string; tone: Tone }[]; since?: string }

/** A signal in words: the rule's name, where, and what it usually means. */
export function signalWords(s: Signal, unitWord: 'reading' | 'subgroup' = 'reading'): { text: string; means: string; tone: Tone } {
  const w = RULE_WORDS[s.rule];
  const where = s.points.length === 1 ? `${unitWord} ${s.points[0]}` : `${unitWord}s ${s.points[0]}–${s.points[s.points.length - 1]}`;
  const side = s.side ? ` (${s.side})` : '';
  return { text: `${w.name[0].toUpperCase()}${w.name.slice(1)}${side} — ${where}`, means: w.means, tone: s.rule === 'beyond' ? 'r' : 'a' };
}

/** THE SENTENCE on the band and the paper, and the signals' words. */
export function chartSays(f: ChartFigures, a: AgreedChart): ChartSays {
  const u = a.unit ? ` ${a.unit}` : '';
  const what = a.name || 'The chart';
  if (!f.n) return { text: `${what} — nothing recorded yet. Type the readings in the order taken; the limits are set from the first ${LIMITS_FROM}.`, tone: 'n', verdict: 'Not started', signals: [] };
  if (a.kind === 'precontrol') return preSays(f, a, what, u);
  const unitWord = a.kind === 'xbar' ? 'subgroup' : 'reading';
  const count = a.kind === 'xbar' ? `${f.points.length} subgroup${f.points.length === 1 ? '' : 's'} of ${f.m}` : `${f.n} reading${f.n === 1 ? '' : 's'}`;
  if (f.centre === undefined || f.lcl === undefined || f.ucl === undefined) return { text: `${what} — ${count}; two are needed before limits can be drawn.`, tone: 'n', verdict: 'Too few', signals: [] };
  const zmr = f.shortRun?.mode === 'zmr';
  const lim = zmr ? 'limits −3 to +3 on z (the products’ spreads differ, so each is standardised by its own)' : `limits ${fx(f.lcl, f.dp + 1)}–${fx(f.ucl, f.dp + 1)}${f.shortRun ? ' from the nominal' : u}`;
  const fromWords = f.provisional
    ? (f.from && f.from.n < LIMITS_FROM ? `provisional ${lim} from ${f.from.n} — set from ${LIMITS_FROM}` : `${lim} from the first ${f.from?.n ?? LIMITS_FROM}, not set yet — Set the limits keeps them`)
    : `${lim} set from ${unitWord}s ${f.from?.from}–${f.from?.to}`;
  const signals = f.signals.map(s => signalWords(s, unitWord));
  const beyond = f.points.filter(p => p.state === 'beyond' && !p.short);
  const parts: string[] = [];
  if (beyond.length) parts.push(`${beyond.length} beyond (${beyond.map(p => p.no).join(', ')})`);
  for (const s of f.signals.filter(x => x.rule !== 'beyond')) parts.push(`${RULE_WORDS[s.rule].name}${s.side ? ` ${s.side === 'above' ? 'above' : 'below'}` : ''} from ${unitWord} ${s.points[0]}`);
  let since: string | undefined;
  if (f.cusum?.signal !== undefined && f.cusum.since !== undefined) since = `the ${f.cusum.side === 'above' ? 'rise' : 'fall'} began about ${unitWord} ${f.cusum.since} (CUSUM, signalled at ${f.cusum.signal})${f.cusum.level !== undefined ? `; the level now about ${fx(f.cusum.level, f.dp)}${u}` : ''}`;
  else if (f.ewma) since = `the running level ${fx(f.ewma.level, f.dp)}${u} (EWMA)`;
  const moved = parts.length > 0;
  const verdict = moved ? (beyond.length ? 'Out of control' : 'A signal') : f.provisional ? 'In control so far' : 'In control';
  const tone: Tone = beyond.length ? 'r' : moved ? 'a' : f.provisional ? 'n' : 'g';
  const tail = moved ? `${parts.join(', ')} — ${verdict === 'Out of control' ? 'the process has moved' : 'the process may have moved'}${since ? `; ${since}` : ''}.` : `no signal — in control against those limits${since ? `; ${since}` : ''}.`;
  let short = '';
  if (f.shortRun) {
    const p = f.shortRun.products.length;
    short = ` ${p} product${p === 1 ? '' : 's'} on one chart${f.shortRun.levene ? ` — Levene p ${f.shortRun.levene.p.toFixed(2)}: the spreads ${f.shortRun.alike ? 'are alike, so the deviations are pooled' : 'differ, so each product is standardised (Z-MR)'}` : ''}.`;
  }
  return { text: `${what} — ${count} against ${fromWords}: ${tail}${short}`, tone, verdict, signals, ...(since ? { since } : {}) };
}
function preSays(f: ChartFigures, a: AgreedChart, what: string, u: string): ChartSays {
  const p = f.pre;
  if (!p) return { text: `${what} — pre-control needs both specification limits.`, tone: 'n', verdict: 'Not set', signals: [] };
  const setUp = p.qualified ? `Set-up: ${GREENS_TO_QUALIFY} greens in a row — qualified at reading ${p.qualifiedAt}.` : `Set-up: ${p.greens} green${p.greens === 1 ? '' : 's'} in a row of the ${GREENS_TO_QUALIFY} needed${f.n > p.greens ? ' (an amber or a red restarts the count)' : ''}.`;
  const last = p.pairs[p.pairs.length - 1];
  const running = last ? ` Running: pair ${p.pairs.length} (readings ${last.nos[0]} and ${last.nos[1]}) ${last.say}.` : p.qualified && f.n > (p.qualifiedAt ?? 0) ? ' Running: one more reading makes the first pair.' : '';
  const stop = p.pairs.some(x => x.tone === 'r');
  const tone: Tone = stop ? 'r' : last?.tone === 'a' ? 'a' : p.qualified ? 'g' : 'n';
  return { text: `${what} — zones from ${fx(a.lower as number, f.dp)}–${fx(a.upper as number, f.dp)}${u} (green within ±${fx(p.t / 2, f.dp)}${u} of ${fx(p.nominal, f.dp)}${u}). ${setUp}${running} Pre-control is a set-up rule, not a control chart and not capability.`, tone, verdict: stop ? 'Stop' : last?.tone === 'a' ? 'Adjust' : p.qualified ? 'Qualified' : 'Setting up', signals: [] };
}

/** THE TILES (docs/LEAN-PAGE.md): readings, centre, limits, signals, since, level — the verdict is the band's. */
export function chartTiles(f: ChartFigures, a: AgreedChart): LeanTile[] {
  return rawTiles(f, a).map(({ sub, tone, ...t }) => ({ ...t, ...(sub ? { of: sub } : {}), ...(tone && tone !== 'n' ? { tone } : {}) }));
}
function rawTiles(f: ChartFigures, a: AgreedChart): { k: string; v: string; sub?: string; tone?: Tone }[] {
  const u = a.unit ? ` ${a.unit}` : '';
  if (a.kind === 'precontrol') {
    const p = f.pre;
    return [
      { k: 'Readings', v: big(f.n) },
      { k: 'Set-up', v: p?.qualified ? 'Qualified' : `${p?.greens ?? 0} of ${GREENS_TO_QUALIFY}`, sub: p?.qualified ? `at reading ${p.qualifiedAt}` : 'greens in a row', tone: p?.qualified ? 'g' : 'n' },
      { k: 'Pairs', v: big(p?.pairs.length ?? 0), sub: p?.pairs.length ? p.pairs[p.pairs.length - 1].say.split(' — ')[0] : 'after the set-up' },
      { k: 'Red', v: big(f.points.filter(x => x.zone === 'red').length), tone: f.points.some(x => x.zone === 'red') ? 'r' : 'n' },
    ];
  }
  const beyond = f.points.filter(p => p.state === 'beyond' && !p.short).length;
  return [
    { k: a.kind === 'xbar' ? 'Subgroups' : 'Readings', v: a.kind === 'xbar' ? `${big(f.points.length)} of ${f.m}` : big(f.n), sub: f.from ? `limits from ${f.from.n}${f.provisional ? ', provisional' : ''}` : undefined },
    { k: 'Centre', v: f.centre !== undefined ? `${fx(f.centre, f.dp + 1)}${f.shortRun ? '' : u}` : '—', sub: f.shortRun ? 'from the nominal' : a.target !== undefined ? `target ${fx(a.target, f.dp)}${u}` : undefined },
    { k: 'Limits', v: f.lcl !== undefined && f.ucl !== undefined ? `${fx(f.lcl, f.dp + 1)}–${fx(f.ucl, f.dp + 1)}` : '—', sub: f.sigma !== undefined ? `σ ${fx(f.sigma, f.dp + 1)}` : undefined },
    { k: 'Signals', v: big(f.signals.length), sub: beyond ? `${beyond} beyond` : f.signals.length ? 'none beyond' : undefined, tone: beyond ? 'r' : f.signals.length ? 'a' : 'n' },
    { k: 'Since', v: f.cusum?.since !== undefined ? `${a.kind === 'xbar' ? 'subgroup' : 'reading'} ${f.cusum.since}` : f.cusum ? '—' : 'CUSUM off', sub: f.cusum?.signal !== undefined ? `signalled at ${f.cusum.signal}` : f.cusum ? 'no drift found' : 'turn it on to say since when', tone: f.cusum?.signal !== undefined ? 'a' : 'n' },
    { k: 'Level', v: f.cusum?.level !== undefined ? `${fx(f.cusum.level, f.dp)}${u}` : f.ewma ? `${fx(f.ewma.level, f.dp)}${u}` : f.centre !== undefined ? `${fx(f.centre, f.dp)}${u}` : '—', sub: f.cusum?.level !== undefined ? 'after the shift (CUSUM)' : f.ewma ? 'running (EWMA)' : 'the centre' },
  ];
}

/** THE CLOSING LINE. */
export function chartClosing(f: ChartFigures, a: AgreedChart, said: ChartSays): { text: string; tone: Tone } {
  if (!f.n) return { text: 'Nothing recorded yet.', tone: 'n' };
  if (a.kind === 'precontrol') return { text: `${said.verdict} — ${f.pre?.qualified ? `qualified at reading ${f.pre.qualifiedAt}, ${f.pre.pairs.length} pair${f.pre.pairs.length === 1 ? '' : 's'} since` : `${f.pre?.greens ?? 0} greens of ${GREENS_TO_QUALIFY}`}.`, tone: said.tone };
  const beyond = f.points.filter(p => p.state === 'beyond' && !p.short).length;
  return { text: `${said.verdict} — ${f.n} readings, ${f.signals.length} signal${f.signals.length === 1 ? '' : 's'}${beyond ? ` (${beyond} beyond)` : ''}${said.since ? `; ${said.since}` : ''}.`, tone: said.tone };
}

/** WHAT CANNOT BE AGREED, said while agreeing. */
export function chartProblem(a: Pick<AgreedChart, 'kind' | 'name' | 'lower' | 'upper' | 'subgroup' | 'cusum'>): string {
  if (!a.name.trim()) return 'What is measured — a name, "Fill weight".';
  if (a.kind === 'xbar' && !(a.subgroup !== undefined && a.subgroup >= 2 && a.subgroup <= 25)) return 'Readings in a subgroup — 2 to 25.';
  if (a.kind === 'precontrol' && (a.lower === undefined || a.upper === undefined)) return 'Pre-control needs both specification limits.';
  if (a.lower !== undefined && a.upper !== undefined && a.lower >= a.upper) return 'The lower limit has to be below the upper.';
  if (a.cusum && !(a.cusum.shift > 0)) return 'The shift worth catching — a number above 0, in the unit.';
  return '';
}

/** THE LIMITS SET FROM A SPAN — what a tap on "Set the limits" writes to the agreement. */
export function freezeFrom(a: AgreedChart, readings: StudyReading[], from: number, to: number, at?: number, who?: string): AgreedChart['frozen'] | undefined {
  const rs = live(readings).slice(from - 1, to);
  if (a.kind === 'xbar') {
    const m = a.subgroup && a.subgroup >= 2 ? a.subgroup : 4;
    const groups: number[][] = []; for (let i = 0; i + m <= rs.length; i += m) groups.push(rs.slice(i, i + m).map(r => r.value));
    const l = subgroupLimits(groups, m);
    return l ? { from, to, centre: l.grand, spread: l.spreadBar, sigma: l.sigma, n: l.groups, ...(at ? { at } : {}), ...(who ? { who } : {}) } : undefined;
  }
  const ys = a.products ? rs.map(r => (r.nominal !== undefined ? r.value - r.nominal : r.value)) : rs.map(r => r.value);
  const l = xmrLimits(ys);
  return l ? { from, to, centre: l.centre, spread: l.mrBar, sigma: l.sigma, n: l.n, ...(at ? { at } : {}), ...(who ? { who } : {}) } : undefined;
}
