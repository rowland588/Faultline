import { summarizeCriticality, type RankedRow } from '../../lib/ie/criticality';
import type { LeanTone } from '../../lib/lean';
import { uid } from '../../lib/ids';
import type { ScoredRow, ToolStudy } from '../../lib/study';
import { scoredByKey } from './registry';
import type { ScoredDef, ScoredResult, ScoredTable } from './types';

export interface ScoredReading {
  def: ScoredDef;
  rows: ScoredRow[];
  result?: ScoredResult;
  /** A register's ranking; absent on a matrix. */
  ranked?: ReturnType<NonNullable<ScoredDef['rank']>>;
  problems?: string[];
  /** The rows that could not be ranked while the rest were. */
  left?: string[];
  /** A matrix's table and who leads; absent on the other registers. */
  table?: ScoredTable;
  leaders?: string[];
}

export function studyScored(s: Pick<ToolStudy, 'agreed'>): ScoredReading | undefined {
  const agreed = s.agreed?.scored;
  const def = scoredByKey(agreed?.key);
  if (!agreed || !def) return undefined;
  const rows = agreed.rows ?? [];
  if (def.matrix) {
    const out = def.matrix.analyse({ datum: agreed.datum, criteria: agreed.criteria ?? [], rows });
    return 'problems' in out ? { def, rows, problems: out.problems } : { def, rows, result: out.result, table: out.table, leaders: out.leaders };
  }
  if (!def.rank) return { def, rows, problems: ['This register has no ranking yet.'] };
  const o = { rate: agreed.rate };
  const ranked = def.rank(rows, o);
  if ('problems' in ranked) return { def, rows, ranked, problems: ranked.problems };
  const result = def.summarize ? def.summarize(ranked.ok, o) : summarizeCriticality(ranked.ok as RankedRow[]);
  return { def, rows, ranked, result, ...('left' in ranked && ranked.left?.length ? { left: ranked.left } : {}) };
}

export const scoredTitle = (s: Pick<ToolStudy, 'agreed'>): string => scoredByKey(s.agreed?.scored?.key)?.title ?? 'Scored register';

export function scoredSays(s: Pick<ToolStudy, 'agreed'>): { text: string; verdict: string; tone: LeanTone } {
  const x = studyScored(s);
  if (!x) return { text: 'Not a scored register.', verdict: '—', tone: 'n' };
  if (x.problems?.length) return { text: x.problems.join(' '), verdict: 'Incomplete', tone: 'a' };
  const r = x.result;
  return r ? { text: r.sentence, verdict: r.verdict, tone: r.tone } : { text: `Add ${x.def.noun ?? 'machine'}s and score them.`, verdict: 'Not scored', tone: 'n' };
}

export function newScoredStudy(def: ScoredDef, o: { name: string; workspaceId: string; projectId?: string; now: number }): ToolStudy {
  const start = def.matrix?.start();
  return {
    id: uid(),
    tool: 'scored',
    name: o.name,
    workspaceId: o.workspaceId,
    projectId: o.projectId,
    agreed: { scored: start ? { key: def.key, ...start } : { key: def.key, rows: def.blank ? [{ id: uid(), name: '' }] : def.examples[0]?.rows.map(r => ({ ...r, id: uid() })) ?? [] } },
    facts: {},
    uses: [],
    startedAt: o.now,
    createdAt: o.now,
    updatedAt: o.now,
  };
}
