/* A LOG, ALL OF IT WORKED OUT — one function the page, the paper, the hub, the line's page and its report all read,
 * so they cannot disagree (CLAUDE.md rule 2). Pure: a study, its definition, the moment and the line's cost model in;
 * the round, the compliance of the period and the one before it, every failure with what it held, each scored
 * check's series, each value's trend and the tags out. Nothing is stored. */
import type { LogAnswer, LogCheck, LogResult, ToolStudy } from '../../lib/study';
import type { Snag } from '../../snag/types';
import type { LogDef, ScoreFigures } from './def';
import { complianceOf, logOf, failuresOf, logCompliance, resultsOf, roundOf, valueTrend, cleanBound, verdictOf, DAY, type Compliance, type Failure, type Round, type ValueTrend } from './checks';
import { holdOf, type Hold, type LogCtx } from './hold';
import { fallsInARow, findingBelowOf, repeatsOf, scoreOf, weakest, FALLING_FROM } from './scoring';

/** The period a log is read over: the last 7 days (Faultline's choice, said on the page), and the 7 before. */
export const PERIOD_DAYS = 7;

export interface FailureRow { f: Failure; hold: Hold; inPeriod: boolean; problemId?: string }

/** One audit of a scored check, in order. */
export interface AuditRow { result: LogResult; figures: ScoreFigures; repeats: string[]; findings: string[] }
export interface ScoreSeries {
  check: LogCheck;
  audits: AuditRow[];
  latest?: AuditRow;
  pcts: number[];
  falls: number;
  falling: boolean;
  weakest?: { name: string; pct: number };
}

/** The abnormality tags of a CILT log: raised, open by age, and the places tagged again. */
export interface TagFigures {
  raised: number;
  open: number;
  closed: number;
  over7: number;
  over14: number;
  /** Checks tagged more than once within REPEAT_DAYS — the same place again. */
  repeats: { checkId: string; name: string; n: number }[];
}
/** A repeat abnormality: the same place tagged again within this many days (Faultline's choice). */
export const REPEAT_DAYS = 28;

export interface LogFigures {
  now: number;
  period: { from: number; to: number };
  before: { from: number; to: number };
  round: Round;
  comp: Compliance;
  compBefore: Compliance;
  failures: FailureRow[];
  /** Checks whose last result failed and nothing since passed. */
  failedNow: number;
  overdue: number;
  due: number;
  /** The packs held in the period (failures that hold product), and whether any had no figure. */
  heldPacks?: number;
  heldMissing: boolean;
  tiedUp?: number;
  /** The same for the period before. */
  heldBefore?: number;
  scored: ScoreSeries[];
  values: { check: LogCheck; trend: ValueTrend }[];
  tags?: TagFigures;
  /** Results standing / struck. */
  results: number;
  struck: number;
  /** passfail checks with n results and none failed → at most this share could fail at 95%. */
  clean?: { n: number; bound: number };
  /** Problems raised from this log that are open now / raised in all. */
  problems: { open: number; raised: number };
}

export interface LogInputs { s: ToolStudy; def: LogDef; now: number; ctx: LogCtx; snags?: readonly Snag[]; days?: number }

export function scoredSeries(c: LogCheck, s: ToolStudy, def: Pick<LogDef, 'scale' | 'scoreRule'>): ScoreSeries | undefined {
  if (c.kind !== 'scored' || !def.scale) return undefined;
  const below = findingBelowOf(c, def.scale);
  const audits: AuditRow[] = [];
  for (const r of resultsOf(s.facts.results, c.id)) {
    const figures = scoreOf(r, def.scale, def.scoreRule, below);
    if (!figures) continue;
    audits.push({ result: r, figures, repeats: repeatsOf(r.answers ?? [], audits[audits.length - 1]?.result.answers, def.scale, below), findings: figures.findings });
  }
  const pcts = audits.flatMap(a => (a.figures.pct !== undefined ? [a.figures.pct] : []));
  const latest = audits[audits.length - 1];
  const falls = fallsInARow(pcts);
  const w = latest ? weakest(latest.figures) : undefined;
  return { check: c, audits, ...(latest ? { latest } : {}), pcts, falls, falling: falls >= FALLING_FROM, ...(w ? { weakest: w } : {}) };
}

export function tagFigures(s: ToolStudy, snags: readonly Snag[] | undefined, now: number): TagFigures | undefined {
  const tags = (s.facts.tags ?? []).filter(t => !t.struck);
  if (!tags.length && !s.agreed?.log) return undefined;
  const byId = new Map((snags ?? []).map(x => [x.id, x]));
  let open = 0, closed = 0, over7 = 0, over14 = 0;
  for (const t of tags) {
    const p = t.problemId ? byId.get(t.problemId) : undefined;
    const isClosed = p ? p.status === 'closed' : false;
    if (isClosed) closed++; else { open++; const age = (now - t.at) / DAY; if (age > 7) over7++; if (age > 14) over14++; }
  }
  const per = new Map<string, number>();
  for (const t of tags) if (now - t.at <= REPEAT_DAYS * DAY) per.set(t.checkId, (per.get(t.checkId) ?? 0) + 1);
  const repeats = [...per.entries()].filter(([, n]) => n >= 2).map(([checkId, n]) => ({ checkId, name: s.agreed?.log?.checks.find(c => c.id === checkId)?.name ?? 'A check', n }));
  return { raised: tags.length, open, closed, over7, over14, repeats };
}

export function logFigures(i: LogInputs): LogFigures | undefined {
  const { s, def, now, ctx } = i;
  const log = s.agreed?.log;
  if (!log) return undefined;
  const days = i.days ?? PERIOD_DAYS;
  const period = { from: now - days * DAY, to: now }, before = { from: now - 2 * days * DAY, to: now - days * DAY };
  const results = s.facts.results;
  const round = roundOf(log, results, now, def);
  const all = [...round.now, ...round.later, ...round.events];
  const failures: FailureRow[] = log.checks.flatMap(c => failuresOf(c, log, results, def)).map(f => ({
    f, hold: holdOf(f, ctx, def), inPeriod: f.result.at >= period.from && f.result.at <= period.to, ...(f.result.problemId ? { problemId: f.result.problemId } : {}),
  })).sort((a, b) => b.f.result.at - a.f.result.at);
  const held = (rows: FailureRow[]) => {
    const withPacks = rows.filter(r => r.hold.packs !== undefined);
    return withPacks.length ? withPacks.reduce((n, r) => n + (r.hold.packs ?? 0), 0) : undefined;
  };
  const inPeriod = failures.filter(r => r.inPeriod && !r.f.continues && r.hold.holds);
  const inBefore = failures.filter(r => r.f.result.at >= before.from && r.f.result.at < before.to && !r.f.continues && r.hold.holds);
  const tied = inPeriod.filter(r => r.hold.tiedUp !== undefined);
  const scored = log.checks.map(c => scoredSeries(c, s, def)).filter((x): x is ScoreSeries => !!x);
  const live = resultsOf(results);
  /* a clean record's bound: the pass-or-fail results of the log, none failed */
  const pf = log.checks.filter(c => c.kind === 'passfail').flatMap(c => resultsOf(results, c.id));
  const cleanN = pf.length;
  const noneFailed = pf.every(r => r.outcome !== 'fail');
  const bound = noneFailed ? cleanBound(cleanN) : undefined;
  const raisedIds = new Set([...live.flatMap(r => [r.problemId, ...(r.problemIds ?? [])]), ...(s.facts.tags ?? []).filter(t => !t.struck).map(t => t.problemId)].filter((x): x is string => !!x));
  const snagById = new Map((i.snags ?? []).map(x => [x.id, x]));
  const open = [...raisedIds].filter(id => { const p = snagById.get(id); return p && p.status !== 'closed' && !p.deletedAt; }).length;
  return {
    now, period, before, round,
    comp: logCompliance(log, results, period.from, period.to), compBefore: logCompliance(log, results, before.from, before.to),
    failures,
    failedNow: all.filter(x => x.key === 'failed').length, overdue: all.filter(x => x.key === 'overdue').length, due: all.filter(x => x.key === 'due' || x.key === 'soon').length,
    ...(held(inPeriod) !== undefined ? { heldPacks: held(inPeriod) } : {}), heldMissing: inPeriod.some(r => r.hold.packs === undefined),
    ...(tied.length ? { tiedUp: tied.reduce((n, r) => n + (r.hold.tiedUp ?? 0), 0) } : {}),
    ...(held(inBefore) !== undefined ? { heldBefore: held(inBefore) } : {}),
    scored,
    values: log.checks.filter(c => c.kind === 'value' && !c.removed).map(c => ({ check: c, trend: valueTrend(c, results) })),
    ...(def.tags || (s.facts.tags ?? []).length ? { tags: tagFigures(s, i.snags, now) } : {}),
    results: live.length, struck: (results ?? []).filter(r => r.struck).length,
    ...(bound !== undefined && cleanN >= 20 ? { clean: { n: cleanN, bound } } : {}),
    problems: { open, raised: raisedIds.size },
  };
}

/** The compliance of one check over the period — the row of a table. */
/** An audit's findings with the answers that made them, each saying whether it came back from the audit before. */
export const findingRows = (latest: AuditRow): { a: LogAnswer; again: boolean }[] => (latest.result.answers ?? []).filter(a => latest.findings.includes(a.id)).map(a => ({ a, again: latest.repeats.includes(a.id) }));

export const checkRow = (s: ToolStudy, c: LogCheck, f: LogFigures): Compliance => complianceOf(c, logOf(s), s.facts.results, f.period.from, f.period.to);

/** A result is good, bad or not judged — for a history row. */
export const resultVerdict = (def: LogDef, c: LogCheck | undefined, r: LogResult) => (c ? verdictOf(c, r, def) : 'info');
