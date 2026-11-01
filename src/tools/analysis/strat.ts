/* STRATIFICATION — where does the problem live? (FC-153; knowledge/specs/FC-153-stratification.md; knowledge/methods/rca/stratification.md).
 *
 * The same counts or readings split by each factor they were tagged with — shift, line, machine, product, supplier — one factor at a time, then the
 * two strongest together. A counted split (rejected out of made) is a table of counts tested by χ² (Fisher's exact for two places) with Cramér's V
 * for its strength and the standardised residual of each place's rejects naming the ones beyond chance; a measured split is the groups test
 * (lib/ie/groups: the F or Kruskal–Wallis, Levene's check, Tukey's HSD). The number of splits tried is counted and the level divided by it
 * (Bonferroni, the record's caution), and a place is only named when enough was counted in it. The arithmetic is lib/ie/relate, groups and stats
 * (proved against SciPy); this module turns tagged readings into figures and the sentences the page and the paper say — never a second copy of either.
 * Imports only the TYPES of ./analysis, so there is no cycle. */
import type { AgreedAnalysis, StudyReading } from '../../lib/study';
import type { LeanTile } from '../../lib/lean';
import { describe } from '../../lib/ie/describe';
import { compareGroups, type GroupsResult } from '../../lib/ie/groups';
import { tableTest, type TableResult } from '../../lib/ie/relate';
import { mean, meanInterval, shareExact, twoShares, welch, type Interval } from '../../lib/ie/stats';
import { dagostinoPearson } from '../../lib/ie/dist';
import { big, cap, fx, pct, pctWord, pSay } from './format';
import { outlierCheck } from './checks';
import type { AnalysisSays, Base, Check, PicRow, Tone } from './analysis';
import type { Grid } from './measure';

/** The factors the page offers as chips — the floor's own can be typed. */
export const STRAT_CHOICES: readonly string[] = ['Shift', 'Line', 'Machine', 'Product', 'Supplier'];
export const STRAT_MAX_FACTORS = 4;
export const STRAT_MAX_LEVELS = 12;
/** A place is named as where the problem lives only with at least this many rejected in it (the record: "a stratum of 3 rejects says little"; Cochran's 5). */
export const STRAT_MIN_REJECTS = 5;
/** A measured place needs this many readings to be compared (as the groups question's). */
export const STRAT_MIN_READINGS = 3;
/** Two factors are said to move together when Cramér's V between them, over what was made (or taken), is at least this. */
export const STRAT_TOGETHER_V = 0.5;
/** Past this many cells the two factors together are not drawn (a 6 × 6). */
export const STRAT_MAX_CELLS = 36;
/** The standardised residual beyond which a place has more (or fewer) than chance would give — the table question's ±2. */
export const STRAT_RESIDUAL = 2;

/* ------------------------------------------- the record ------------------------------------------------- */
export interface StratRec { id: string; tags: Record<string, string>; made?: number; rejected?: number; value?: number }
const live = (rs: StudyReading[]): StudyReading[] => rs.filter(r => !r.struck);

/** The readings that are usable records of this agreement, and what could not be used. */
export function stratRecords(a: Pick<AgreedAnalysis, 'strat'>, readings: StudyReading[]): { recs: StratRec[]; unusable: number } {
  const counted = a.strat?.data !== 'measured';
  const recs: StratRec[] = []; let unusable = 0;
  for (const r of live(readings)) {
    if (!r.tags) { unusable++; continue; }
    if (counted) {
      if (typeof r.made === 'number' && typeof r.rejected === 'number' && r.made > 0 && r.rejected >= 0 && r.rejected <= r.made) recs.push({ id: r.id, tags: r.tags, made: r.made, rejected: r.rejected }); else unusable++;
    } else if (typeof r.value === 'number' && Number.isFinite(r.value)) recs.push({ id: r.id, tags: r.tags, value: r.value }); else unusable++;
  }
  return { recs, unusable };
}

/** What cannot be agreed, said while agreeing. */
export function stratProblem(name: string, s: AgreedAnalysis['strat']): string {
  if (!name.trim()) return 'What is measured — a name, "Rejects".';
  const fs = s?.factors ?? [];
  if (fs.length < 1 || fs.length > STRAT_MAX_FACTORS) return `The factors to split by — one to ${STRAT_MAX_FACTORS} names, separated by commas ("Shift, Product").`;
  if (new Set(fs.map(f => f.toLowerCase())).size !== fs.length) return 'Two factors have the same name.';
  if (s?.costEach !== undefined && !(Number.isFinite(s.costEach) && s.costEach >= 0)) return 'What one reject costs — a number, £.';
  return '';
}

/* ------------------------------------------- the figures ------------------------------------------------ */
export type StratFlag = 'more' | 'fewer' | 'few' | '';
export interface StratCountedLevel {
  name: string; made: number; rejected: number; rate: number; exact: Interval; shareRejects: number; shareMade: number;
  restRate?: number; /** rejects more (or fewer) than the rest's rate would give */ excess: number; residual: number; expected: number; flag: StratFlag; standsOut: boolean;
}
export interface StratMeasuredLevel { name: string; n: number; mean: number; sd: number; hi?: number; ci?: Interval; flag: 'higher' | 'lower' | 'few' | ''; standsOut: boolean }
export interface StratSplit {
  factor: string; levels: string[]; /** records with no level for this factor, left out of it */ untagged: number; tooMany: boolean;
  /** counted */ counted?: StratCountedLevel[]; table?: TableResult; lead?: 'chi2' | 'fisher' | 'approx';
  /** measured */ measured?: StratMeasuredLevel[]; groups?: GroupsResult; leads?: 'anova' | 'kruskal'; nonNormal?: boolean;
  p?: number; strength?: number; /** tested at all */ tested: boolean; /** p under the level divided by the splits tried, and the counts fit to trust */ passes: boolean; /** p under the plain level only, or not to be trusted */ maybe: boolean;
}
export interface StratCell { a: string; b: string; made: number; rejected: number; rate: number; restRate: number; n: number; mean?: number; restMean?: number; p?: number; excess: number; flag: 'more' | 'fewer' | 'higher' | 'lower' | ''; };
export interface StratCross { a: string; b: string; aLevels: string[]; bLevels: string[]; cells: StratCell[]; tried: number; alphaCell: number }
export interface StratMoney { levelName: string; factor: string; excess: number; gbp?: number; missing?: string }
export interface StratFigures extends Base {
  kind: 'strat'; data: 'counted' | 'measured'; factors: string[]; records: number; unusable: number;
  made: number; rejected: number; rate?: number; enough: boolean; splits: StratSplit[]; /** the splits tried, for the level */ tried: number; alphaFactor: number;
  lead?: StratSplit; cross?: StratCross; together: { a: string; b: string; v: number }[]; money?: StratMoney;
}

const MISSING_COST = 'Give what one reject costs (materials, labour wasted) and this says the excess in money.';

/** Records grouped by one factor's level, first-seen order, the untagged apart. */
function byLevel(recs: StratRec[], factor: string): { names: string[]; of: Map<string, StratRec[]>; untagged: number } {
  const of = new Map<string, StratRec[]>(); let untagged = 0;
  for (const r of recs) { const t = r.tags[factor]?.trim(); if (!t) { untagged++; continue; } if (!of.has(t)) of.set(t, []); (of.get(t) as StratRec[]).push(r); }
  return { names: [...of.keys()], of, untagged };
}

function countedSplit(recs: StratRec[], factor: string, conf: number, alphaFactor: number): StratSplit {
  const { names, of, untagged } = byLevel(recs, factor);
  const out: StratSplit = { factor, levels: names, untagged, tooMany: names.length > STRAT_MAX_LEVELS, tested: false, passes: false, maybe: false };
  const rows = names.map(n => { const rs = of.get(n) as StratRec[]; return { name: n, made: rs.reduce((t, r) => t + (r.made as number), 0), rejected: rs.reduce((t, r) => t + (r.rejected as number), 0) }; });
  const N = rows.reduce((t, r) => t + r.made, 0), K = rows.reduce((t, r) => t + r.rejected, 0);
  const levels: StratCountedLevel[] = rows.map(r => {
    const restN = N - r.made, restK = K - r.rejected, restRate = restN > 0 ? restK / restN : undefined;
    return { name: r.name, made: r.made, rejected: r.rejected, rate: r.made > 0 ? r.rejected / r.made : 0, exact: shareExact(r.rejected, r.made, conf), shareRejects: K > 0 ? r.rejected / K : 0, shareMade: N > 0 ? r.made / N : 0,
      ...(restRate !== undefined ? { restRate } : {}), excess: restRate !== undefined ? r.rejected - r.made * restRate : 0, residual: 0, expected: N > 0 ? r.made * K / N : 0, flag: '' as StratFlag, standsOut: false };
  });
  out.counted = levels;
  if (names.length < 2 || out.tooMany || K <= 0 || K >= N) return out;
  const t = tableTest(rows.map(r => [r.rejected, r.made - r.rejected]));
  if (!t) return out;
  out.table = t; out.tested = true; out.strength = t.cramersV;
  out.lead = t.two ? t.two.leads : t.trusted ? 'chi2' : 'approx';
  out.p = out.lead === 'fisher' && t.two ? t.two.pFisher : t.p;
  const trusted = out.lead !== 'approx', alpha = 1 - conf;
  out.passes = trusted && out.p < alphaFactor; out.maybe = !out.passes && (out.p < alpha || (!trusted && out.p < alpha));
  levels.forEach((l, i) => {
    l.residual = t.residuals[i][0];
    l.flag = l.residual > STRAT_RESIDUAL && l.rejected >= STRAT_MIN_REJECTS ? 'more' : l.residual < -STRAT_RESIDUAL && l.expected >= 5 ? 'fewer' : l.rejected < STRAT_MIN_REJECTS && l.expected < 5 ? 'few' : '';
    l.standsOut = out.passes && l.flag === 'more';
  });
  return out;
}

const normalNon = (xs: number[]): boolean => { if (xs.length < 20) return false; const dp = dagostinoPearson(xs); return !!dp && dp.p < 0.05; };

function measuredSplit(recs: StratRec[], factor: string, conf: number, alphaFactor: number): StratSplit {
  const { names, of, untagged } = byLevel(recs, factor);
  const out: StratSplit = { factor, levels: names, untagged, tooMany: names.length > STRAT_MAX_LEVELS, tested: false, passes: false, maybe: false };
  const vals = names.map(n => (of.get(n) as StratRec[]).map(r => r.value as number));
  const all = vals.flat();
  const levels: StratMeasuredLevel[] = names.map((n, i) => {
    const d = describe(vals[i]);
    const rest = vals.filter((_, j) => j !== i).flat();
    return { name: n, n: vals[i].length, mean: d?.mean ?? NaN, sd: d?.sd ?? 0, ...(vals[i].length >= 2 && d ? { ci: meanInterval(d.n, d.mean, d.sd, conf) } : {}), ...(rest.length ? { hi: mean(rest) } : {}), flag: (vals[i].length < STRAT_MIN_READINGS ? 'few' : '') as StratMeasuredLevel['flag'], standsOut: false };
  });
  out.measured = levels;
  const used = names.map((n, i) => ({ name: n, values: vals[i] })).filter(g => g.values.length >= STRAT_MIN_READINGS);
  if (used.length < 2 || out.tooMany) return out;
  const res = compareGroups(used, conf);
  if (!res) return out;
  out.groups = res; out.tested = true; out.strength = res.eta2;
  out.nonNormal = used.some(g => normalNon(g.values));
  out.leads = (out.nonNormal || (res.levene && res.levene.p < 0.05)) ? 'kruskal' : 'anova';
  out.p = out.leads === 'kruskal' ? res.kruskal.p : res.p;
  const alpha = 1 - conf;
  out.passes = out.p < alphaFactor; out.maybe = !out.passes && out.p < alpha;
  if (all.length) {
    for (const l of levels) {
      if (l.flag === 'few' || !res.groups.some(g => g.name === l.name)) continue;
      const others = res.pairs.filter(p => p.a === l.name || p.b === l.name);
      const apart = others.length > 0 && others.every(p => p.p < alpha);
      const g = res.groups.find(x => x.name === l.name);
      const grand = mean(res.groups.reduce<number[]>((t, x) => [...t, ...(vals[names.indexOf(x.name)] ?? [])], []));
      if (apart && g) { l.flag = g.mean > grand ? 'higher' : 'lower'; l.standsOut = out.passes; }
    }
  }
  return out;
}

/** Cramér's V between two factors over what was made (or taken): do they run together? */
function togetherV(recs: StratRec[], a: string, b: string, counted: boolean): number | undefined {
  const A: string[] = [], B: string[] = [];
  for (const r of recs) { const x = r.tags[a]?.trim(), y = r.tags[b]?.trim(); if (!x || !y) continue; if (!A.includes(x)) A.push(x); if (!B.includes(y)) B.push(y); }
  if (A.length < 2 || B.length < 2) return undefined;
  const t = A.map(() => B.map(() => 0));
  for (const r of recs) { const x = r.tags[a]?.trim(), y = r.tags[b]?.trim(); if (!x || !y) continue; t[A.indexOf(x)][B.indexOf(y)] += counted ? (r.made as number) : 1; }
  return tableTest(t)?.cramersV;
}

function crossOf(recs: StratRec[], a: StratSplit, b: StratSplit, counted: boolean, conf: number, factorsTried: number): StratCross | undefined {
  const aL = a.levels, bL = b.levels;
  if (aL.length < 2 || bL.length < 2 || aL.length > STRAT_MAX_LEVELS || bL.length > STRAT_MAX_LEVELS || aL.length * bL.length > STRAT_MAX_CELLS) return undefined;
  const both = recs.filter(r => r.tags[a.factor]?.trim() && r.tags[b.factor]?.trim());
  const cellOf = (x: string, y: string) => both.filter(r => r.tags[a.factor].trim() === x && r.tags[b.factor].trim() === y);
  const tried = aL.length * bL.length, alphaCell = (1 - conf) / (factorsTried + tried);
  const cells: StratCell[] = [];
  const N = both.reduce((t, r) => t + (counted ? (r.made as number) : 0), 0), K = both.reduce((t, r) => t + (counted ? (r.rejected as number) : 0), 0);
  for (const x of aL) for (const y of bL) {
    const rs = cellOf(x, y);
    if (!rs.length) continue;
    if (counted) {
      const n = rs.reduce((t, r) => t + (r.made as number), 0), k = rs.reduce((t, r) => t + (r.rejected as number), 0), rn = N - n, rk = K - k;
      const t = rn > 0 && n > 0 ? twoShares(rk, rn, k, n) : undefined;
      const p = t ? (t.leads === 'fisher' ? t.pFisher : t.pZ) : undefined, rate = k / n, restRate = rn > 0 ? rk / rn : 0;
      cells.push({ a: x, b: y, made: n, rejected: k, rate, restRate, n: rs.length, ...(p !== undefined ? { p } : {}), excess: k - n * restRate,
        flag: p !== undefined && p < alphaCell && k >= STRAT_MIN_REJECTS && rate > restRate ? 'more' : p !== undefined && p < alphaCell && rate < restRate ? 'fewer' : '' });
    } else {
      const v = rs.map(r => r.value as number), rest = both.filter(r => !rs.includes(r)).map(r => r.value as number);
      const w = v.length >= STRAT_MIN_READINGS && rest.length >= STRAT_MIN_READINGS ? welch(rest, v, conf) : undefined;
      cells.push({ a: x, b: y, made: 0, rejected: 0, rate: 0, restRate: 0, n: v.length, mean: mean(v), ...(rest.length ? { restMean: mean(rest) } : {}), ...(w ? { p: w.p } : {}), excess: 0,
        flag: w && w.p < alphaCell ? (w.diff > 0 ? 'higher' : 'lower') : '' });
    }
  }
  return { a: a.factor, b: b.factor, aLevels: aL, bLevels: bL, cells, tried, alphaCell };
}

export function stratFigures(a: AgreedAnalysis, readings: StudyReading[], base: Base): StratFigures {
  const s = a.strat ?? { factors: [], data: 'counted' as const }, counted = s.data !== 'measured', conf = base.conf, factors = s.factors;
  const { recs, unusable } = stratRecords(a, readings);
  const tried = factors.length, alphaFactor = tried > 0 ? (1 - conf) / tried : 1 - conf;
  const made = counted ? recs.reduce((t, r) => t + (r.made as number), 0) : 0, rejected = counted ? recs.reduce((t, r) => t + (r.rejected as number), 0) : 0;
  const f: StratFigures = { ...base, kind: 'strat', data: s.data, factors, records: recs.length, unusable, made, rejected, enough: false, splits: [], tried, alphaFactor, together: [] };
  if (counted && made > 0) f.rate = rejected / made;
  if (stratProblem(a.name, s) || !recs.length) return f;
  f.splits = factors.map(fa => (counted ? countedSplit(recs, fa, conf, alphaFactor) : measuredSplit(recs, fa, conf, alphaFactor)));
  f.enough = f.splits.some(x => x.tested);
  /* the strongest factor that passes leads */
  f.lead = [...f.splits].filter(x => x.passes).sort((x, y) => (y.strength ?? 0) - (x.strength ?? 0))[0];
  /* factors that run together over what was made */
  for (let i = 0; i < factors.length; i++) for (let j = i + 1; j < factors.length; j++) {
    const v = togetherV(recs, factors[i], factors[j], counted);
    if (v !== undefined && v >= STRAT_TOGETHER_V) f.together.push({ a: factors[i], b: factors[j], v });
  }
  /* the two strongest tested together */
  const tested = f.splits.filter(x => x.tested).sort((x, y) => (y.strength ?? 0) - (x.strength ?? 0));
  if (tested.length >= 2) f.cross = crossOf(recs, tested[0], tested[1], counted, conf, tried);
  /* money: the excess of the place that stands out, for the lead factor */
  if (counted && f.lead?.counted) {
    const out = f.lead.counted.filter(l => l.standsOut);
    const excess = out.reduce((t, l) => t + l.excess, 0);
    if (out.length) f.money = { levelName: out.map(l => l.name).join(' and '), factor: f.lead.factor, excess, ...(s.costEach !== undefined && s.costEach > 0 ? { gbp: excess * s.costEach } : { missing: MISSING_COST }) };
  }
  /* the checks */
  const ck: Check[] = [];
  if (unusable) ck.push({ what: 'Records', say: `Records: ${unusable} ${unusable === 1 ? 'reading' : 'readings'} could not be used (${counted ? 'a count needs made, rejected and no more rejected than made, with its levels' : 'a value needs its levels'}) — left out.`, tone: 'a' });
  for (const sp of f.splits) {
    if (sp.untagged) ck.push({ what: sp.factor, say: `${sp.factor}: ${sp.untagged} record${sp.untagged === 1 ? '' : 's'} carry no ${sp.factor.toLowerCase()} — left out of this split. A record without its tags cannot be stratified afterwards.`, tone: 'a' });
    if (sp.tooMany) ck.push({ what: sp.factor, say: `${sp.factor}: ${sp.levels.length} levels — more than ${STRAT_MAX_LEVELS}, so not a split anyone can act on. Group the small ones, or split by something coarser.`, tone: 'a' });
    else if (sp.levels.length < 2) ck.push({ what: sp.factor, say: `${sp.factor}: only ${sp.levels.length === 1 ? `one level (${sp.levels[0]})` : 'no level'} so far — a split needs at least two.`, tone: 'n' });
    else if (counted && sp.counted && !sp.tested && rejected === 0) ck.push({ what: sp.factor, say: `${sp.factor}: nothing rejected in these records, so there is no problem to place.`, tone: 'n' });
    else if (counted && sp.tested && sp.lead === 'approx' && sp.table) ck.push({ what: sp.factor, say: `${sp.factor}: counts too small — ${Math.round((1 - sp.table.shareFive) * 100)}% of the cells expect fewer than 5 (the smallest ${fx(sp.table.minExpected, 1)}), so the χ² is only an approximation and its ${pSay(sp.p as number)} is not to be trusted. Merge levels that mean the same, or count more.`, tone: 'a' });
    else if (counted && sp.tested && sp.lead === 'fisher') ck.push({ what: sp.factor, say: `${sp.factor}: the smallest expected count is under 5 — Fisher’s exact test leads.`, tone: 'n' });
    if (counted && sp.counted) { const few = sp.counted.filter(l => l.flag === 'few'); if (few.length && sp.tested) ck.push({ what: sp.factor, say: `${sp.factor}: too few to judge — ${few.map(l => `${l.name} (${l.rejected} rejected)`).join(', ')}; a place is named only with ${STRAT_MIN_REJECTS} or more rejected in it.`, tone: 'n' }); }
    if (!counted && sp.measured) {
      const few = sp.measured.filter(l => l.flag === 'few'); if (few.length) ck.push({ what: sp.factor, say: `${sp.factor}: too few to compare — ${few.map(l => `${l.name} (${l.n})`).join(', ')} ${few.length === 1 ? 'has' : 'have'} fewer than ${STRAT_MIN_READINGS} readings and ${few.length === 1 ? 'is' : 'are'} left out of the test.`, tone: 'a' });
      if (sp.tested && sp.leads === 'kruskal') ck.push({ what: sp.factor, say: `${sp.factor}: the groups are not bell-shaped or their spreads differ — Kruskal–Wallis leads and Tukey’s pairs are indicative.`, tone: 'n' });
    }
  }
  if (!counted) { const d = describe(recs.map(r => r.value as number)); const oc = outlierCheck('Readings', d); if (oc) ck.push(oc); }
  if (tried > 1) ck.push({ what: 'Splits', say: `Splits tried: ${tried} (${factors.join(', ')})${f.cross ? ` and ${f.cross.tried} cells together` : ''}. Each factor is tested at ${pctWord(1 - conf)} ÷ ${tried} = ${(alphaFactor * 100).toFixed(alphaFactor * 100 < 1 ? 2 : 1)}%${f.cross ? `, each cell at ${(f.cross.alphaCell * 100).toFixed(2)}%` : ''} — twelve splits at 5% find one by luck nearly half the time.`, tone: 'n' });
  for (const t of f.together) ck.push({ what: 'Together', say: `Together: ${t.a} and ${t.b} run together in these records (Cramér’s V ${fx(t.v, 2)}) — what shows for one may be the other’s, and these splits cannot tell which.`, tone: 'a' });
  f.checks = ck;
  return f;
}

/* ------------------------------------------- the words --------------------------------------------------- */
const sure = (c: number): string => `we can be ${pctWord(c)} confident`;
const share0 = (x: number): string => `${Math.round(x * 100)}%`;
const strengthWord = (f: StratFigures, sp: StratSplit): string => (f.data === 'counted' ? `Cramér’s V ${fx(sp.strength as number, 2)}` : `η² ${fx(sp.strength as number, 2)}`);
const testWord = (sp: StratSplit): string => (sp.counted
  ? (sp.lead === 'fisher' ? 'Fisher’s exact test' : `χ² ${fx((sp.table as TableResult).chi2, 1)} on ${(sp.table as TableResult).df} degree${(sp.table as TableResult).df === 1 ? '' : 's'} of freedom`)
  : sp.leads === 'kruskal' ? `Kruskal–Wallis H ${fx((sp.groups as GroupsResult).kruskal.h, 1)}` : `F ${fx((sp.groups as GroupsResult).f, 1)} on ${(sp.groups as GroupsResult).df1} and ${(sp.groups as GroupsResult).df2} degrees of freedom`);

const NOT_CLAIMED = 'Where a problem shows is not why it happens — the distinction behind that shift, line or product is for Is / is not and the fishbone. Each factor is split on its own; factors that run together cannot be told apart here. A place not shown to differ is not shown to be the same.';

export function stratSays(f: StratFigures, a: AgreedAnalysis): AnalysisSays {
  const name = a.name.trim() || 'The measure', u = a.unit ? ` ${a.unit}` : '', dp = f.dp + 1;
  const none = (text: string, verdict = 'Not started'): AnalysisSays => ({ text, tone: 'n', verdict, more: [], notClaimed: '' });
  const problem = stratProblem(a.name, a.strat);
  if (problem) return none(problem, 'Not set up');
  if (!f.records) return none(f.data === 'counted' ? 'Nothing counted yet. Add a record — what each factor was, how many were made, how many were rejected.' : 'No readings yet. Add a record — what each factor was, and the reading.');
  if (!f.enough) {
    const lone = f.splits.every(s => s.levels.length < 2);
    return none(f.data === 'counted' && f.rejected === 0 ? `${big(f.records)} record${f.records === 1 ? '' : 's'}, ${big(f.made)} made and none rejected — there is no problem to place yet.`
      : lone ? `${big(f.records)} record${f.records === 1 ? '' : 's'}, but every factor has one level so far — a split needs at least two places to compare.`
        : `${big(f.records)} record${f.records === 1 ? '' : 's'} so far — not enough in two or more places to test a split yet (${f.data === 'counted' ? `each place needs counts to compare, and the splits are too small or too many` : `each place needs ${STRAT_MIN_READINGS} readings`}).`, 'Too few');
  }
  const more: string[] = [];
  const counted = f.data === 'counted';
  const lead = f.lead;
  /* every tested factor, strongest first, in a line each */
  const tested = f.splits.filter(s => s.tested).sort((x, y) => (y.strength ?? 0) - (x.strength ?? 0));
  for (const sp of tested) {
    const verdict = sp.passes ? 'shows a difference' : sp.maybe ? (sp.lead === 'approx' ? 'counts too small to trust' : `looks different at ${pctWord(f.conf)} but not once ${f.tried} splits are counted`) : 'does not show one';
    more.push(`${sp.factor}: ${verdict} (${testWord(sp)}, ${pSay(sp.p as number)}; ${strengthWord(f, sp)}).`);
  }
  for (const sp of f.splits.filter(s => !s.tested)) more.push(`${sp.factor}: ${sp.tooMany ? 'too many levels to split' : sp.levels.length < 2 ? 'one level so far' : counted && f.rejected === 0 ? 'nothing rejected' : 'not enough to test'}.`);
  if (f.money) {
    const m = f.money;
    more.push(m.gbp !== undefined ? `In money: had ${m.levelName} run at the rate of the rest, there would be about ${big(Math.round(m.excess))} fewer rejects in these records — about £${big(m.gbp)} at £${(a.strat?.costEach ?? 0).toFixed(2)} each. That is the gap to the rest, not a saving promised.` : `In money: had ${m.levelName} run at the rate of the rest, there would be about ${big(Math.round(m.excess))} fewer rejects in these records. ${m.missing}`);
  }
  /* the cross */
  let crossWord = '';
  if (f.cross) {
    const hot = f.cross.cells.filter(c => c.flag === 'more' || c.flag === 'higher' || (!counted && c.flag === 'lower')).sort((x, y) => Math.abs(y.excess) - Math.abs(x.excess));
    if (hot.length) {
      const c = hot[0];
      crossWord = counted ? `Together: ${c.a} on ${c.b} stands out — ${pct(c.rate)} (${big(c.rejected)} of ${big(c.made)}) against ${pct(c.restRate)} for everything else.` : `Together: ${c.a} on ${c.b} stands out — mean ${fx(c.mean as number, dp)}${u} (${c.n} readings) against ${fx(c.restMean as number, dp)}${u} for everything else.`;
      more.push(crossWord + (hot.length > 1 ? ` ${hot.length - 1} other cell${hot.length === 2 ? '' : 's'} stand${hot.length === 2 ? 's' : ''} out too.` : ''));
    } else more.push(`Together (${f.cross.a} × ${f.cross.b}): no one of the ${f.cross.cells.length} cells stands out from the rest once ${f.cross.tried} cells are counted.`);
  }
  const nc = NOT_CLAIMED;
  if (!lead) {
    if (crossWord) return { text: `${name}: no single factor shows it alone, but looked at together ${crossWord.replace(/^Together: /, '').replace(/ stands out/, ' does stand out')}`, tone: 'a', verdict: 'Lives in one combination', more, notClaimed: nc };
    const maybe = f.splits.find(s => s.maybe);
    return { text: `${name}: ${sure(f.conf)} only that these ${counted ? 'counts' : 'readings'} cannot place the problem in one ${f.factors.join(', ').toLowerCase().replace(/, ([^,]*)$/, ' or $1')} — ${maybe ? `${maybe.factor} looks different at ${pctWord(f.conf)} but not once ${f.tried} splits are counted, so it is a place to look, not a finding` : 'it is spread across them as far as these records can tell'}.`, tone: 'n', verdict: 'Not in one place', more, notClaimed: nc };
  }
  /* a factor passes */
  if (counted && lead.counted) {
    const out = lead.counted.filter(l => l.standsOut).sort((x, y) => y.excess - x.excess);
    const rest = lead.counted.filter(l => !l.standsOut);
    if (out.length) {
      const o = out[0], where = out.map(l => l.name).join(' and ');
      const restMade = rest.reduce((t, l) => t + l.made, 0), restRej = rest.reduce((t, l) => t + l.rejected, 0);
      const share = out.reduce((t, l) => t + l.shareRejects, 0), exposure = out.reduce((t, l) => t + l.shareMade, 0);
      return { text: `${name} by ${lead.factor.toLowerCase()}: ${sure(f.conf)} the problem is not spread evenly (${testWord(lead)}, ${pSay(lead.p as number)}; ${strengthWord(f, lead)}). ${cap(where)} carr${out.length === 1 ? 'ies' : 'y'} ${share0(share)} of the rejects from ${share0(exposure)} of what was made: ${pct(o.rate)} (${big(o.rejected)} of ${big(o.made)})${out.length === 1 ? '' : ' in the first'} against ${restMade > 0 ? pct(restRej / restMade) : '—'} for the rest.`,
        tone: 'a', verdict: `Lives in ${where}`, more, notClaimed: nc };
    }
    return { text: `${name} by ${lead.factor.toLowerCase()}: ${sure(f.conf)} the ${lead.factor.toLowerCase()}s differ (${testWord(lead)}, ${pSay(lead.p as number)}; ${strengthWord(f, lead)}), but no single place has ${STRAT_MIN_REJECTS} or more rejected and stands out beyond chance — the difference is spread over several.`, tone: 'n', verdict: `The ${lead.factor.toLowerCase()}s differ`, more, notClaimed: nc };
  }
  /* measured */
  const g = lead.groups as GroupsResult, high = (lead.measured ?? []).filter(l => l.standsOut), tone: Tone = high.length ? 'a' : 'n';
  const means = (lead.measured ?? []).map(l => `${l.name} ${fx(l.mean, dp)}${u} (n ${l.n})`).join(' · ');
  if (high.length) {
    const o = high[0], word = o.flag === 'higher' ? 'above' : 'below';
    return { text: `${name} by ${lead.factor.toLowerCase()}: ${sure(f.conf)} the ${lead.factor.toLowerCase()}s differ (${testWord(lead)}, ${pSay(lead.p as number)}; ${strengthWord(f, lead)} — ${share0(g.eta2)} of the variation is between them). ${o.name} is ${word} every other: mean ${fx(o.mean, dp)}${u} against ${fx(o.hi as number, dp)}${u} for the rest. ${means}.`, tone, verdict: `${o.name} stands out`, more, notClaimed: nc };
  }
  return { text: `${name} by ${lead.factor.toLowerCase()}: ${sure(f.conf)} the ${lead.factor.toLowerCase()}s differ (${testWord(lead)}, ${pSay(lead.p as number)}; ${strengthWord(f, lead)}), but Tukey’s test sets no single one apart from all the others. ${means}.`, tone: 'n', verdict: `The ${lead.factor.toLowerCase()}s differ`, more, notClaimed: nc };
}

export function stratTiles(f: StratFigures): LeanTile[] {
  const t = (k: string, v: string, of?: string, tone?: LeanTile['tone']): LeanTile => ({ k, v, ...(of ? { of } : {}), ...(tone ? { tone } : {}) });
  const counted = f.data === 'counted';
  const strongest = [...f.splits].filter(s => s.tested).sort((x, y) => (y.strength ?? 0) - (x.strength ?? 0))[0];
  const named = f.splits.flatMap(s => (s.counted ?? []).filter(l => l.standsOut).map(l => l.name).concat((s.measured ?? []).filter(l => l.standsOut).map(l => l.name)));
  return [
    t('Records', big(f.records), f.unusable ? `${f.unusable} left out` : undefined),
    counted ? t('Made', big(f.made), f.rate !== undefined ? `${big(f.rejected)} rejected · ${pct(f.rate)}` : undefined) : t('Readings', big(f.records)),
    t('Splits', String(f.splits.length), f.splits.length ? `${f.splits.filter(s => s.tested).length} tested` : undefined),
    t('Stands out', named.length ? named.slice(0, 2).join(' · ') : f.enough ? 'none' : '—', named.length ? `${named.length} place${named.length === 1 ? '' : 's'}` : undefined, named.length ? 'a' : 'n'),
    t('Strongest', strongest ? strongest.factor : '—', strongest ? `${counted ? 'V' : 'η²'} ${fx(strongest.strength as number, 2)}` : undefined),
  ];
}

/* ------------------------------------------- the tables and the picture ------------------------------------ */
const rateWord = (k: number, n: number): string => `${pct(k / n)} · ${big(k)}/${big(n)}`;
export function stratGrids(f: StratFigures, a?: AgreedAnalysis): Grid[] {
  if (!f.enough && !f.splits.some(s => s.levels.length)) return [];
  const u = a?.unit ? ` ${a.unit}` : '', dp = f.dp + 1, counted = f.data === 'counted';
  const out: Grid[] = [];
  const tested = f.splits.filter(s => s.tested);
  if (tested.length) {
    out.push({
      label: 'Every split tried', head: ['Factor', 'Levels', 'Test', 'p', counted ? 'Cramér’s V' : 'η²', 'Shows'],
      rows: f.splits.map(s => [s.factor, String(s.levels.length), s.tested ? (counted ? (s.lead === 'fisher' ? 'Fisher’s exact' : s.lead === 'approx' ? 'χ², approximate' : 'χ²') : s.leads === 'kruskal' ? 'Kruskal–Wallis' : 'ANOVA') : '—',
        s.p !== undefined ? pSay(s.p).replace('p = ', '').replace('p < ', '< ') : '—', s.strength !== undefined ? fx(s.strength, 2) : '—', s.passes ? 'a difference' : s.maybe ? 'maybe — see the checks' : s.tested ? 'no difference shown' : '—']),
      widths: [24, 10, 24, 14, 14, 24],
    });
  }
  for (const s of f.splits) {
    if (s.counted && s.counted.length) {
      out.push({
        label: `By ${s.factor.toLowerCase()}`, head: [s.factor, 'Made', 'Rejected', 'Rate', `${pctWord(f.conf)} between`, 'Of the rejects', 'Of what was made', 'Against chance'],
        rows: s.counted.map(l => [l.name, big(l.made), big(l.rejected), pct(l.rate), `${pct(l.exact.lo)}–${pct(l.exact.hi)}`, share0(l.shareRejects), share0(l.shareMade), l.flag === 'more' ? (l.standsOut ? 'more — stands out' : 'more') : l.flag === 'fewer' ? 'fewer' : l.flag === 'few' ? 'too few to judge' : '—']),
        mark: s.counted.map((l, i) => (l.standsOut ? i : -1)).filter(i => i >= 0), widths: [18, 11, 11, 10, 18, 11, 11, 20],
      });
    } else if (s.measured && s.measured.length) {
      out.push({
        label: `By ${s.factor.toLowerCase()}`, head: [s.factor, 'Readings', 'Mean', 's', `${pctWord(f.conf)} between`, 'The rest', 'Against the others'],
        rows: s.measured.map(l => [l.name, String(l.n), `${fx(l.mean, dp)}${u}`, fx(l.sd, dp), l.ci ? `${fx(l.ci.lo, dp)}–${fx(l.ci.hi, dp)}` : '—', l.hi !== undefined ? fx(l.hi, dp) : '—', l.flag === 'higher' ? (l.standsOut ? 'above all — stands out' : 'above all') : l.flag === 'lower' ? (l.standsOut ? 'below all — stands out' : 'below all') : l.flag === 'few' ? 'too few' : '—']),
        mark: s.measured.map((l, i) => (l.standsOut ? i : -1)).filter(i => i >= 0), widths: [20, 12, 14, 10, 18, 12, 22],
      });
    }
  }
  if (f.cross) {
    const c = f.cross;
    out.push({
      label: `Together — ${c.a} × ${c.b}`, head: [`${c.a} ╲ ${c.b}`, ...c.bLevels],
      rows: c.aLevels.map(x => [x, ...c.bLevels.map(y => {
        const cell = c.cells.find(z => z.a === x && z.b === y);
        if (!cell) return '—';
        const flag = cell.flag === 'more' || cell.flag === 'higher' ? ' — stands out' : cell.flag === 'fewer' || cell.flag === 'lower' ? ' — below the rest' : '';
        return counted ? `${rateWord(cell.rejected, cell.made)}${flag}` : `${fx(cell.mean as number, dp)}${u} · n ${cell.n}${flag}`;
      })]),
      widths: [20, ...c.bLevels.map(() => Math.floor(80 / c.bLevels.length))],
    });
  }
  return out;
}

/** The lanes of the picture: the leading (else the strongest) factor, a lane a place with its interval. */
export function stratPicture(f: StratFigures, a: AgreedAnalysis): PicRow[] {
  const sp = f.lead ?? [...f.splits].filter(s => s.tested).sort((x, y) => (y.strength ?? 0) - (x.strength ?? 0))[0];
  if (!sp) return [];
  const c = pctWord(f.conf), dp = f.dp + 1, u = a.unit ?? '';
  if (sp.counted) {
    const hi = Math.min(1, Math.max(...sp.counted.map(l => l.exact.hi)) * 1.15), axis: [number, number] = [0, Math.max(hi, 0.001)];
    return sp.counted.map(l => ({ label: `${l.name} · ${big(l.rejected)}/${big(l.made)}`, axis, unit: '%', tone: (l.standsOut ? 'a' : 'n') as Tone, point: { v: l.rate, text: pct(l.rate) }, band: { lo: l.exact.lo, hi: l.exact.hi, text: `${c}: ${pct(l.exact.lo)}–${pct(l.exact.hi)}` } }));
  }
  if (sp.measured) {
    const vs = sp.measured.flatMap(l => (Number.isFinite(l.mean) ? [l.mean, ...(l.ci ? [l.ci.lo, l.ci.hi] : [])] : []));
    if (!vs.length) return [];
    const lo = Math.min(...vs), hi = Math.max(...vs), pad = Math.max((hi - lo) * 0.15, Math.abs(hi) * 0.001, 1e-9), axis: [number, number] = [lo - pad, hi + pad];
    return sp.measured.filter(l => Number.isFinite(l.mean)).map(l => ({ label: `${l.name} · ${l.n}`, axis, unit: u, tone: (l.standsOut ? 'a' : 'n') as Tone, point: { v: l.mean, text: fx(l.mean, dp) }, ...(l.ci ? { band: { lo: l.ci.lo, hi: l.ci.hi, text: `${c}: ${fx(l.ci.lo, dp)}–${fx(l.ci.hi, dp)}` } } : {}) }));
  }
  return [];
}

/* ------------------------------------------- reading the entry ------------------------------------------------ */
/** What one record says, in a line: "Shift Nights · Product A: 230 of 24,000". */
export function stratRecordWord(a: Pick<AgreedAnalysis, 'strat' | 'unit'>, r: StudyReading): string {
  const tags = (a.strat?.factors ?? []).map(fa => `${fa} ${r.tags?.[fa] ?? '—'}`).join(' · ');
  const u = a.unit ? ` ${a.unit}` : '';
  return `${tags}: ${typeof r.made === 'number' ? `${r.rejected} of ${r.made}` : typeof r.value === 'number' ? `${r.value}${u}` : '—'}`;
}

/** Rows pasted from a sheet — one line a record: the levels in the order agreed, then `made rejected` (counted) or the `value` (measured); separated by tabs, commas or semicolons
 *  (a level may hold spaces). Whatever is not such a line is listed in `skipped`, never silently dropped. */
export function parseStrat(text: string, factors: string[], data: 'counted' | 'measured'): { rows: { tags: Record<string, string>; made?: number; rejected?: number; value?: number }[]; skipped: string[] } {
  const out = { rows: [] as { tags: Record<string, string>; made?: number; rejected?: number; value?: number }[], skipped: [] as string[] };
  const width = factors.length + (data === 'counted' ? 2 : 1);
  const num = (t: string): number => (/^[+-]?(\d[\d,]*\.?\d*|\.\d+)$/.test(t) ? Number(t.replace(/,(?=\d{3}\b)/g, '')) : NaN);
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = (line.includes('\t') ? line.split('\t') : line.split(/[;,]/)).map(c => c.trim());
    if (cells.length !== width) { out.skipped.push(line.trim()); continue; }
    const tags: Record<string, string> = {}; let bad = false;
    factors.forEach((fa, i) => { if (!cells[i]) bad = true; tags[fa] = cells[i]; });
    if (bad) { out.skipped.push(line.trim()); continue; }
    if (data === 'counted') {
      const m = num(cells[factors.length]), k = num(cells[factors.length + 1]);
      if (!(Number.isInteger(m) && Number.isInteger(k) && m > 0 && k >= 0 && k <= m)) { out.skipped.push(line.trim()); continue; }
      out.rows.push({ tags, made: m, rejected: k });
    } else {
      const v = num(cells[factors.length]);
      if (!Number.isFinite(v)) { out.skipped.push(line.trim()); continue; }
      out.rows.push({ tags, value: v });
    }
  }
  return out;
}
