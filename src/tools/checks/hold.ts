/* WHAT A FAILED CHECK HOLDS — and the seam the Register's product-on-hold entry (FC-135) will read.
 *
 * A failed check puts in doubt everything made since the last good one (knowledge/methods/foodsafety/metal-
 * detection-verification.md: "product since the last good check = (time of failure − last good) × rate").
 * The window is the checks' (checks.failuresOf); the packs in it are TYPED on the failure if somebody counted them,
 * else the line's rate × the window — Line capacity's, else the line's rated speed — and if neither is given the
 * sentence says which input is missing and where to give it (knowledge/MONEY.md: nothing blocks, nothing is invented).
 * The money is the one the register already says for product held (lib/problemCost: tied up at the line's materials
 * a pack), never a second model.
 *
 * `holdFor(study, resultId, ctx)` returns the FACTS a hold needs and decides nothing: whether product is held,
 * released or scrapped is the site's call (CLAUDE.md / the brief: a food-safety tool states the team's rules and
 * records the result; it never decides a release). */
import type { AgreedLog, LogCheck, LogResult, ToolStudy } from '../../lib/study';
import type { Workspace } from '../../types';
import { fmtGBP, fmtPacks } from '../../lib/cost';
import { problemCost, type CostLine } from '../../lib/problemCost';
import type { Neck } from '../../lib/lineLoss';
import type { CostFacts, LogDef } from './def';
import { failuresOf, resultsOf, sinceOf, span, verdictOf, MIN, type Failure } from './checks';

/** What the line gives the cost of a hold: its rate, and its cost model. */
export interface LogCtx {
  line?: Partial<Pick<Workspace, 'name'>> & CostLine;
  /** The line's rate a minute, in its own unit, and where it comes from. */
  rate?: { perMin: number; from: 'capacity' | 'rated'; unit: string };
  neck?: Neck;
}

/** The line's rate: Line capacity's, else the line's rated speed. */
export function rateFor(line: (CostLine & { packsPerMin?: number }) | undefined, capacity?: { perMin: number; unit: string }): LogCtx['rate'] {
  if (capacity && capacity.perMin > 0) return { perMin: capacity.perMin, from: 'capacity', unit: capacity.unit || 'packs' };
  if (line?.packsPerMin && line.packsPerMin > 0) return { perMin: line.packsPerMin, from: 'rated', unit: 'packs' };
  return undefined;
}

export interface Hold {
  /** Does a failure of this check hold product at all? */
  holds: boolean;
  windowMin: number;
  /** The packs at risk: typed, or the rate × the window. */
  packs?: number;
  packsFrom?: 'typed' | 'capacity' | 'rated';
  unit: string;
  /** £ tied up at the line's materials a pack (lib/problemCost). */
  tiedUp?: number;
  /** What is missing to say it, in words with where to give it. */
  missing?: string;
  /** The sentence, ready for the page and the paper. */
  words: string;
}

/** Does a failure of this check hold product? The check's word, else the log's. */
export const holdsProduct = (c: LogCheck, def?: Pick<LogDef, 'holds'>): boolean => c.holds ?? def?.holds ?? false;

/** The hold of one failure. */
export function holdOf(f: Failure, ctx: LogCtx, def?: Pick<LogDef, 'costWords' | 'holds'>): Hold {
  const unit = ctx.rate?.unit ?? 'packs';
  if (!holdsProduct(f.check, def)) {
    return { holds: false, windowMin: f.windowMin, unit, words: 'Nothing held — this check does not hold product.' };
  }
  const typed = typeof f.result.made === 'number' && f.result.made >= 0 ? f.result.made : undefined;
  const windowMin = f.windowMin;
  let packs: number | undefined, from: Hold['packsFrom'];
  if (f.continues) { packs = 0; from = 'typed'; }
  else if (typed !== undefined) { packs = typed; from = 'typed'; }
  else if (ctx.rate) { packs = Math.round(windowMin * ctx.rate.perMin); from = ctx.rate.from; }
  const cost = packs !== undefined && packs > 0 ? problemCost({ heldPacks: packs }, f.check.where, ctx.line, ctx.neck) : undefined;
  const tiedUp = cost?.tiedUp;
  const missing = packs === undefined ? 'Give the line a rated speed (or a product’s Line capacity), or type the packs made since the last good check, to say the packs held.'
    : packs > 0 && tiedUp === undefined ? 'Give the line its materials a pack to say the product held in money.' : undefined;
  const facts: CostFacts = { windowMin, ...(packs !== undefined ? { packs, packsFrom: from } : {}), ...(tiedUp !== undefined ? { tiedUp } : {}), ...(missing ? { missing } : {}), unit };
  const own = def?.costWords?.(facts);
  const words = own ?? holdWords(f, facts);
  return { holds: true, windowMin, ...(packs !== undefined ? { packs, packsFrom: from } : {}), unit, ...(tiedUp !== undefined ? { tiedUp } : {}), ...(missing ? { missing } : {}), words };
}

/** The shared sentence: "Held: 60 min since the last good check at 10:00 — 6,600 packs at 110 a minute (the line’s rated speed), £1,320 tied up at £0.20 a pack." */
export function holdWords(f: Failure, c: CostFacts): string {
  if (f.continues) return 'Held: nothing more — the line was stopped between the failed check and this re-check.';
  const since = f.noGoodYet ? `since the log began (${span(c.windowMin * MIN)})` : `${span(c.windowMin * MIN)} since the last good check`;
  if (c.packs === undefined) return `Held: ${since}. ${c.missing ?? ''}`.trim();
  const how = c.packsFrom === 'typed' ? 'counted on the failure' : c.packsFrom === 'capacity' ? 'at Line capacity’s rate' : 'at the line’s rated speed';
  const packs = c.unit === 'packs' ? fmtPacks(c.packs) : `${c.packs.toLocaleString('en-GB')} ${c.unit}`;
  const money = c.tiedUp !== undefined ? `, ${fmtGBP(c.tiedUp)} tied up in materials` : '';
  return `Held: ${since} — ${packs} (${how})${money}.${c.tiedUp === undefined && c.missing ? ` ${c.missing}` : ''}`;
}

/** THE SEAM FOR FC-135: the facts a product-on-hold record needs from one failed result — what, where, when, from
 *  when, how much, why — and nothing it must decide. Undefined when the result is not a failure of this log. */
export interface HoldFacts {
  studyId: string;
  line?: string;
  project?: string;
  machine?: string;
  check: { id: string; name: string; where?: string };
  /** The failed result and when. */
  resultId: string;
  failedAt: number;
  /** The good check before it (absent: none yet). */
  goodAt?: number;
  from: number;
  windowMin: number;
  packs?: number;
  packsFrom?: Hold['packsFrom'];
  unit: string;
  tiedUp?: number;
  missing?: string;
  /** The check is of the kind that holds product. */
  holds: boolean;
  /** In words: what failed, as the register's problem says it. */
  reason: string;
  /** The problem raised for it, if one was. */
  problemId?: string;
  /** A re-check that failed again: the failure it continues. */
  continues?: string;
  by?: string;
}

export function holdFor(s: ToolStudy, resultId: string, ctx: LogCtx, def?: Pick<LogDef, 'costWords' | 'holds' | 'scale' | 'scoreRule'>): HoldFacts | undefined {
  const log = s.agreed?.log;
  const r = (s.facts.results ?? []).find((x: LogResult) => x.id === resultId);
  const c = log?.checks.find(x => x.id === r?.checkId);
  if (!log || !r || !c) return undefined;
  const f = failuresOf(c, log, s.facts.results, def).find(x => x.result.id === resultId);
  if (!f) return undefined;
  const h = holdOf(f, ctx, def);
  return {
    studyId: s.id, ...(s.workspaceId ? { line: s.workspaceId } : {}), ...(s.projectId ? { project: s.projectId } : {}),
    ...((c.where || s.machine) ? { machine: c.where || s.machine } : {}),
    check: { id: c.id, name: c.name, ...(c.where ? { where: c.where } : {}) },
    resultId: r.id, failedAt: r.at, ...(f.noGoodYet ? {} : { goodAt: f.from }), from: f.from, windowMin: f.windowMin,
    ...(h.packs !== undefined ? { packs: h.packs, packsFrom: h.packsFrom } : {}), unit: h.unit, ...(h.tiedUp !== undefined ? { tiedUp: h.tiedUp } : {}), ...(h.missing ? { missing: h.missing } : {}),
    holds: holdsProduct(c, def), reason: failedWords(c, r),
    ...(r.problemId ? { problemId: r.problemId } : {}), ...(f.continues ? { continues: f.continues } : {}), ...(r.by ? { by: r.by } : {}),
  };
}

/** What failed, in words: "Ferrous test piece failed at the Metal detector — a piece not rejected". */
export function failedWords(c: LogCheck, r: LogResult): string {
  const where = c.where?.trim() ? ` at ${c.where.trim()}` : '';
  if (c.kind === 'value' && typeof r.value === 'number') {
    const u = c.unit ? ` ${c.unit}` : '';
    const lim = c.hi !== undefined && r.value > c.hi ? `above the upper limit ${c.hi}${u}` : c.lo !== undefined && r.value < c.lo ? `below the lower limit ${c.lo}${u}` : 'outside its limits';
    return `${c.name}${where}: ${r.value}${u}, ${lim}`;
  }
  if (c.kind === 'count' && typeof r.count === 'number') return `${c.name}${where}: counted ${r.count}${c.target !== undefined ? `, target ${c.target}` : ''}`;
  return `${c.name} failed${where}${c.criterion?.trim() ? ` — ${c.criterion.trim()} not met` : ''}${r.note?.trim() ? ` (${r.note.trim()})` : ''}`;
}

/** A FAILURE AS IT WOULD BE if the check failed at `at` — before it is recorded, so the sheet can say what it
 *  holds. `again` when the check is already failed: the re-check failing again continues the failure before it. */
export function previewFailure(c: LogCheck, log: Pick<AgreedLog, 'since'>, results: readonly LogResult[] | undefined, at: number, def: Pick<LogDef, 'costWords' | 'holds' | 'scale' | 'scoreRule'> | undefined, ctx: LogCtx, made?: number): { failure: Failure; hold: Hold; again: boolean } {
  const mine = resultsOf(results, c.id);
  const last = mine[mine.length - 1];
  const again = !!last && verdictOf(c, last, def) === 'bad';
  const lastGood = [...mine].reverse().find(r => verdictOf(c, r, def) !== 'bad');
  const from = lastGood?.at ?? sinceOf(log, c);
  const result: LogResult = { id: 'preview', checkId: c.id, at, outcome: 'fail', ...(made !== undefined ? { made } : {}) };
  const failure: Failure = again && last
    ? { check: c, result, from, windowMin: 0, noGoodYet: !lastGood, continues: last.id }
    : { check: c, result, from, windowMin: Math.max(0, Math.round((at - from) / MIN)), noGoodYet: !lastGood };
  return { failure, hold: holdOf(failure, ctx, def), again };
}
