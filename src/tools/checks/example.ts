/* A DEFINITION'S WORKED EXAMPLE, MADE INTO A LOG — for the unit tests and the acceptance script, which both run
 * every registered definition's examples through the shared module and compare what it says with the numbers the
 * example was hand-worked to (def.examples[].expect). Not used by the app itself. */
import type { LogResult, ToolStudy } from '../../lib/study';
import type { LogDef, LogExample } from './def';
import { starterLog } from './start';
import { MIN } from './checks';

/** A log started `ex.nowMin` minutes before `now`, with the example's results done at their minutes. */
export function exampleStudy(def: LogDef, ex: LogExample, now: number, o: { line?: string; where?: string; ids?: () => string } = {}): ToolStudy {
  const start = now - ex.nowMin * MIN;
  let n = 0;
  const id = o.ids ?? (() => `x${++n}`);
  const log = starterLog(def, { since: start, ...(ex.checks ? { pick: ex.checks } : {}), where: o.where ?? 'Line 1', id, ...(ex.set ? { set: ex.set } : {}) });
  const pick = ex.checks ?? def.starterChecks.map((_, i) => i);
  const idOf = (starter: number) => log.checks[pick.indexOf(starter)]?.id ?? '';
  const results: LogResult[] = ex.results.map((r, i): LogResult => {
    const c = log.checks[pick.indexOf(r.check)];
    const answers = r.levels && c?.items ? c.items.map((it, k) => ({ id: it.id, name: it.name, ...(it.group ? { group: it.group } : {}), level: r.levels?.[k] ?? null })) : undefined;
    return { id: `r${i + 1}`, checkId: idOf(r.check), at: start + r.min * MIN, outcome: r.outcome, ...(r.value !== undefined ? { value: r.value } : {}), ...(answers ? { answers } : {}), ...(r.made !== undefined ? { made: r.made } : {}) };
  });
  const tags = (ex.tags ?? []).map((t, i) => ({ id: `t${i + 1}`, checkId: idOf(t.check), at: start + t.min * MIN, colour: t.colour, what: 'An abnormality' }));
  return {
    id: 'ex', tool: 'log', name: def.title, workspaceId: o.line ?? 'ws', agreed: { log }, facts: { results, ...(tags.length ? { tags } : {}) }, uses: [],
    startedAt: start, createdAt: start, updatedAt: now,
  };
}

/** Which starter check an id belongs to, as an index into the example's `checks` (or the whole starter list). */
export const starterIndexOf = (ex: LogExample, def: LogDef, s: ToolStudy, checkId: string): number => {
  const pick = ex.checks ?? def.starterChecks.map((_, i) => i);
  const at = s.agreed?.log?.checks.findIndex(c => c.id === checkId) ?? -1;
  return at < 0 ? -1 : pick[at];
};
