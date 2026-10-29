/* WHAT A LOG SAYS — its sentences, its tiles, its closing line and its action plan, from one module, so the page,
 * the paper and the acceptance script read the same words (docs/LEAN-PAGE.md; CLAUDE.md rule 2).
 *
 * Tiles are each OF the plan and SINCE the period before: checks done on time of those due, the misses, the
 * failures, the product held. Only the abnormal carries colour; a zero is grey. The cost is one output beside the
 * log's own figures, never its verdict (knowledge/MONEY.md). */
import type { LeanAction, LeanInsight, LeanTile, LeanTone } from '../../lib/lean';
import { since as sinceTile } from '../../lib/lean';
import type { Snag } from '../../snag/types';
import { fmtGBP, fmtPacks } from '../../lib/cost';
import { niceDay, isoDay } from '../../lib/weeks';
import { plural } from '../../lib/format';
import type { LogCheck, LogResult, ToolStudy } from '../../lib/study';
import { findingBelowOf, scoreOf } from './scoring';
import type { LogDef } from './def';
import { freqWords, valueSays, when, span, MIN } from './checks';
import type { FailureRow, LogFigures } from './figures';

const pct0 = (n: number) => `${Math.round(n)}%`;
export const dayOf = (ms: number): string => niceDay(isoDay(ms));

/** The sentence the log's page leads with, and its verdict for the band. */
export function logSays(f: LogFigures, s: ToolStudy, def: LogDef): { text: string; verdict: string; tone: LeanTone } {
  const log = s.agreed?.log;
  const n = log?.checks.filter(c => !c.removed).length ?? 0;
  if (!log || n === 0) return { text: 'Nothing is on the list to check yet.', verdict: 'No checks yet', tone: 'n' };
  const worst: string[] = [];
  if (f.failedNow) worst.push(`${plural(f.failedNow, 'check')} failed and not yet checked again`);
  if (f.overdue) worst.push(`${plural(f.overdue, 'check')} overdue`);
  if (f.due) worst.push(`${f.due} due`);
  const said = worst.length ? worst.join(' · ') : f.results ? `all ${plural(n, 'check')} up to date` : `${plural(n, 'check')} to do — none done yet`;
  const comp = f.comp.expected > 0 ? ` ${f.comp.onTime} of ${f.comp.expected} due checks done on time in the last 7 days (${pct0(f.comp.pct ?? 0)}).` : '';
  const verdict = f.failedNow ? `${plural(f.failedNow, 'check')} failed` : f.overdue ? `${f.overdue} overdue` : f.due ? `${f.due} due` : f.results ? 'Up to date' : 'Not started';
  const tone: LeanTone = f.failedNow || f.overdue ? 'r' : f.due ? 'a' : f.results ? 'g' : 'n';
  return { text: `${def.title}: ${said}.${comp}`, verdict, tone };
}

export function logTiles(f: LogFigures, def: LogDef): LeanTile[] {
  const c = f.comp, b = f.compBefore;
  const tiles: LeanTile[] = [];
  const pc = c.pct, pb = b.pct;
  tiles.push({
    k: 'Done on time', v: c.expected ? `${c.onTime} of ${c.expected}` : '—',
    of: c.expected ? `${pct0(pc ?? 0)} of the checks due in 7 days` : 'nothing has come due in the last 7 days',
    ...(pc !== undefined && pb !== undefined ? { change: sinceTile(pc, pb, { fmt: n => `${Math.round(n)} points`, higher: true, against: 'the 7 days before', same: 0.5 }) } : {}),
    tone: !c.expected ? 'n' : c.missed ? 'r' : 'g',
  });
  tiles.push({
    k: 'Missed', v: String(c.missed), of: c.missed ? 'due moments that passed with no check' : 'every due check was done',
    ...(b.expected ? { change: sinceTile(c.missed, b.missed, { fmt: n => String(n), higher: false, against: 'the 7 days before', counted: true }) } : {}),
    tone: c.missed ? 'r' : 'n',
  });
  const failedN = f.failures.filter(r => r.inPeriod).length, failedBefore = f.failures.filter(r => r.f.result.at >= f.before.from && r.f.result.at < f.before.to).length;
  tiles.push({
    k: 'Failed', v: String(failedN), of: failedN ? `${f.problems.raised ? `${f.problems.open} of ${f.problems.raised} problems open` : 'raised as problems'}` : 'none failed in 7 days',
    ...(b.expected || failedBefore ? { change: sinceTile(failedN, failedBefore, { fmt: n => String(n), higher: false, against: 'the 7 days before', counted: true }) } : {}),
    tone: failedN ? 'r' : 'n',
  });
  const holding = f.failures.some(r => r.hold.holds);
  if (holding || def.holds) {
    tiles.push({
      k: 'Product held',
      v: f.heldPacks !== undefined ? fmtPacks(f.heldPacks) : f.failures.some(r => r.inPeriod && r.hold.holds) ? '—' : '0',
      of: f.heldPacks !== undefined ? (f.tiedUp !== undefined ? `${fmtGBP(f.tiedUp)} tied up in materials` : 'since the last good check, before each failure') : f.heldMissing ? 'rate or packs needed — see the failure' : 'since the last good check',
      ...(f.heldPacks !== undefined && f.heldBefore !== undefined ? { change: sinceTile(f.heldPacks, f.heldBefore, { fmt: n => Math.round(n).toLocaleString('en-GB'), higher: false, against: 'the 7 days before' }) } : {}),
      tone: f.heldPacks ? 'r' : 'n',
    });
  }
  if (f.backlogHours !== undefined && f.backlogHours > 0) {
    tiles.push({
      k: 'Backlog', v: `${f.backlogHours} h`, of: `${f.backlogJobs ?? 0} overdue PM task${(f.backlogJobs ?? 0) === 1 ? '' : 's'} at standard hours`,
      tone: 'r',
    });
  }
  const sc = f.scored.find(x => x.latest);
  if (sc?.latest && sc.latest.figures.pct !== undefined) {
    const prev = sc.pcts.length > 1 ? sc.pcts[sc.pcts.length - 2] : undefined;
    tiles.push({
      k: 'Latest score', v: pct0(sc.latest.figures.pct), of: `${sc.latest.figures.points} of ${sc.latest.figures.max} · ${sc.check.name}`,
      ...(prev !== undefined ? { change: sinceTile(sc.latest.figures.pct, prev, { fmt: n => `${Math.round(n)} points`, higher: true, against: 'the audit before', same: 0.5 }) } : {}),
      tone: sc.check.passPct !== undefined ? (sc.latest.figures.pct >= sc.check.passPct ? 'g' : 'r') : sc.falling ? 'a' : 'n',
    });
  }
  return tiles;
}

/** What it means: the insights under the tiles — only what the figures justify. */
export function logInsights(f: LogFigures): LeanInsight[] {
  const out: LeanInsight[] = [];
  for (const sc of f.scored) {
    if (!sc.latest || sc.latest.figures.pct === undefined) continue;
    const w = sc.weakest;
    out.push({ tone: sc.falling ? 'a' : 'n', text: `${sc.check.name}: ${pct0(sc.latest.figures.pct)}${w && sc.latest.figures.groups.length > 1 ? `; ${w.name} is the weakest at ${pct0(w.pct)}` : ''}${sc.falling ? ` — it has fallen ${sc.falls} audits running` : sc.pcts.length > 1 ? '' : ' — the first audit; the trend needs another'}.` });
    const rep = sc.latest.repeats.length;
    if (rep) out.push({ tone: 'a', text: `${plural(rep, 'finding')} of ${plural(sc.latest.findings.length, 'finding')} came back from the audit before — look for the cause in the system, not another re-training.` });
  }
  for (const { check, trend } of f.values) {
    const line = valueSays(check, trend);
    if (line) out.push({ tone: trend.nearing ? 'a' : 'n', text: `${check.name}${check.where ? ` (${check.where})` : ''}: ${line}.` });
    if (trend.n && check.lo === undefined && check.hi === undefined) out.push({ tone: 'a', text: `${check.name} has no limit set — it is recorded and trended, not judged. Set the limit from the maker’s data.` });
  }
  if (f.clean) out.push({ tone: 'n', text: `${f.clean.n} pass-or-fail checks and none failed: at most ${(f.clean.bound * 100).toFixed(1)}% of checks could fail, 95% sure — a clean record is not a guarantee.` });
  if (f.tags && f.tags.raised) {
    out.push({ tone: f.tags.over14 ? 'r' : f.tags.over7 ? 'a' : 'n', text: `${plural(f.tags.raised, 'tag')} raised: ${f.tags.open} open${f.tags.over7 ? `, ${f.tags.over7} older than a week` : ''}${f.tags.over14 ? ` (${f.tags.over14} older than a fortnight)` : ''}, ${f.tags.closed} closed.` });
    for (const r of f.tags.repeats) out.push({ tone: 'a', text: `${r.name} has been tagged ${r.n} times in the last 28 days — the fix may be a wipe and the source still there.` });
  }
  return out;
}

/** The closing line: what the log can say to the meeting. */
export function logClosing(f: LogFigures, s: ToolStudy): { text: string; tone: LeanTone } {
  const log = s.agreed?.log;
  const n = log?.checks.filter(c => !c.removed).length ?? 0;
  if (!n) return { text: 'Put the checks on the list, and the first round can start.', tone: 'n' };
  if (!f.results) return { text: `${plural(n, 'check')} on the list; none done yet.`, tone: f.overdue || f.due ? 'a' : 'n' };
  const c = f.comp;
  const parts: string[] = [];
  if (c.expected) parts.push(`${c.onTime} of ${c.expected} checks done on time in the last 7 days`);
  else parts.push('nothing has come due in the last 7 days');
  const fails = f.failures.filter(r => r.inPeriod).length;
  if (c.missed) parts.push(`${c.missed} missed`);
  if (fails) parts.push(`${plural(fails, 'check')} failed${f.heldPacks ? ` — ${fmtPacks(f.heldPacks)} held` : ''}`);
  if (f.failedNow) parts.push(`${f.failedNow} still to be checked again`);
  return { text: `${parts.join('; ')}.`, tone: f.failedNow || fails || c.missed ? 'r' : f.overdue || f.due ? 'a' : 'g' };
}

/** The problems raised from the log, as the action plan's rows: what, who, by when, where it stands. */
export function logActions(f: LogFigures, s: ToolStudy, snags: readonly Snag[]): LeanAction[] {
  const by = new Map(snags.map(x => [x.id, x]));
  const ids = new Set<string>();
  const out: LeanAction[] = [];
  const rows = [...(s.facts.results ?? []).filter(r => !r.struck), ...[]].sort((a, b) => b.at - a.at);
  const add = (id: string | undefined, from: string) => {
    if (!id || ids.has(id)) return; ids.add(id);
    const p = by.get(id);
    if (!p || p.deletedAt) return;
    const closed = p.status === 'closed';
    const late = !closed && p.dueAt != null && p.dueAt < f.now;
    out.push({
      what: p.problem, ...(p.owner ? { who: p.owner } : {}), ...(p.dueAt != null ? { due: dayOf(p.dueAt) } : {}),
      state: closed ? 'Closed' : late ? 'Late' : p.status === 'in_progress' ? 'In hand' : 'Open', tone: closed ? 'g' : late || p.priority === 'critical' ? 'r' : p.priority === 'high' ? 'a' : 'n', from,
    });
  };
  for (const r of rows) { add(r.problemId, 'a failed check'); for (const id of r.problemIds ?? []) add(id, 'an audit finding'); }
  for (const t of (s.facts.tags ?? []).filter(x => !x.struck)) add(t.problemId, `a ${t.colour} tag`);
  const rank = (a: LeanAction) => (a.state === 'Closed' ? 3 : a.tone === 'r' ? 0 : a.tone === 'a' ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b));
}

/** One failure, as a row: what failed, when, what it held. */
export function failureLine(r: FailureRow, ref: number): string {
  const { f } = r;
  return `${when(f.result.at, ref)} — ${f.check.name}${f.check.where ? ` at ${f.check.where}` : ''}${f.result.note ? ` (${f.result.note})` : ''}. ${r.hold.words}`;
}

/** One result in words: "passed", "failed", "62 °C", "65% (52 of 80)", "counted 94". */
export function resultWords(c: LogCheck | undefined, r: LogResult, def: Pick<LogDef, 'scale' | 'scoreRule'> | undefined): string {
  if (r.outcome === 'pass') return 'passed';
  if (r.outcome === 'fail') return 'failed';
  if (r.outcome === 'value') return `${typeof r.value === 'number' ? r.value : '—'}${c?.unit ? ` ${c.unit}` : ''}`;
  if (r.outcome === 'count') return `counted ${r.count ?? '—'}${r.slot ? ` (${r.slot})` : ''}`;
  const f = def?.scale && c ? scoreOf(r, def.scale, def.scoreRule, findingBelowOf(c, def.scale)) : undefined;
  return f?.pct !== undefined ? `${Math.round(f.pct)}% (${f.points} of ${f.max})` : 'scored';
}

/** The frequency, as the list says it. */
export const everyWords = freqWords;
/** A window in words. */
export const windowWords = (min: number): string => span(min * MIN);
