/* WRITING A LOG — a result added, struck or put back; a check agreed, edited or taken off; and the problems a
 * failure, a finding or a tag raises on the register (knowledge/specs/FC-236-check-logs.md §10).
 *
 * Every write goes through patchStudy, which reads and writes in one transaction, so a result tapped on one phone
 * while another lands is not lost between the read and the write; the results are a list merged by id when two
 * phones meet (cloud/sync). A result is struck, never erased. The register is the existing one: a failure is a
 * problem on the line and the machine, with the packs it holds (Snag.heldPacks); a re-test that fails again adds a
 * step to that problem's journey rather than a second problem. */
import { addSnag, patchSnag, patchStudy, putStudy } from '../../db';
import { machineOntoLine } from '../../lib/lines';
import { now as clock, uid } from '../../lib/ids';
import type { Snag } from '../../snag/types';
import type { LogAnswer, LogCheck, LogResult, LogTag, ToolStudy } from '../../lib/study';
import type { LogDef } from './def';
import { failedWords } from './hold';
import { failuresOf, resultsOf, verdictOf } from './checks';
import { previewFailure, type Hold, type LogCtx } from './hold';
import { findingBelowOf } from './scoring';

const SCALE_MAX = (def: LogDef): number => Math.max(...(def.scale?.levels.map(l => l.v) ?? [0]));

/** A result added — one list entry, merged by id across phones. */
export const addResult = (id: string, r: LogResult): Promise<void> =>
  patchStudy(id, cur => ({ facts: { ...cur.facts, results: [...(cur.facts.results ?? []), r] } }));

/** A result struck (or put back): kept, counting for nothing. */
export const strikeResult = (id: string, resultId: string, struck: boolean): Promise<void> =>
  patchStudy(id, cur => ({ facts: { ...cur.facts, results: (cur.facts.results ?? []).map(r => (r.id === resultId ? { ...r, struck: struck || undefined } : r)) } }));

/** A result's note, or the packs counted on a failure, changed where it stands. */
export const editResult = (id: string, resultId: string, change: Partial<Pick<LogResult, 'note' | 'made'>>): Promise<void> =>
  patchStudy(id, cur => ({ facts: { ...cur.facts, results: (cur.facts.results ?? []).map(r => (r.id === resultId ? { ...r, ...change } : r)) } }));

/** The list of checks as agreed, changed in one write. */
export const setChecks = (id: string, change: (checks: LogCheck[]) => LogCheck[]): Promise<void> =>
  patchStudy(id, cur => ({ agreed: { ...cur.agreed, log: { ...(cur.agreed!.log!), checks: change(cur.agreed!.log!.checks) } } }));

export const newResult = (c: LogCheck, by: string | undefined, o: Partial<LogResult> & Pick<LogResult, 'outcome'>): LogResult =>
  ({ id: uid(), checkId: c.id, at: clock(), ...(by ? { by } : {}), ...o });

/** The problem a failed check raises: what failed, where, when; the priority; the packs it holds; what to do. */
export function failureProblem(s: ToolStudy, c: LogCheck, r: LogResult, hold: Hold, def: LogDef): Snag {
  const t = r.at;
  const priority = c.priority ?? def.priority;
  return {
    id: uid(), workspaceId: s.workspaceId as string, problem: failedWords(c, r), priority, status: 'open', raisedAt: t, updatedAt: t, media: [],
    ...((c.where?.trim() || s.machine?.trim()) ? { targetAsset: (c.where?.trim() || s.machine?.trim()) } : {}),
    ...(s.projectId ? { projectId: s.projectId } : {}),
    ...(hold.holds && hold.packs ? { heldPacks: hold.packs } : {}),
    latestUpdate: [hold.holds ? hold.words : '', c.reaction?.trim() || def.reactionWords].filter(Boolean).join(' '), latestUpdateAt: t,
  };
}

/** Record a failed check and raise its problem. A re-test that fails again continues the failure before it: no
 *  second problem, a step on the first one's journey. Returns the problem's id when one was raised. */
export async function recordFailure(s: ToolStudy, c: LogCheck, def: LogDef, by: string | undefined, o: { note?: string; made?: number; value?: number; count?: number }, ctx: LogCtx): Promise<{ result: LogResult; problemId?: string }> {
  const base = newResult(c, by, { outcome: c.kind === 'value' ? 'value' : c.kind === 'count' ? 'count' : 'fail', ...(typeof o.value === 'number' ? { value: o.value } : {}), ...(typeof o.count === 'number' ? { count: o.count } : {}), ...(o.note?.trim() ? { note: o.note.trim() } : {}), ...(typeof o.made === 'number' ? { made: o.made } : {}) });
  const log = s.agreed!.log!;
  const mine = resultsOf(s.facts.results, c.id);
  const last = mine[mine.length - 1];
  if (last && verdictOf(c, last, def) === 'bad') {
    /* the check was already failed: this is the re-check failing again */
    const runs = failuresOf(c, log, s.facts.results, def).filter(f => !f.continues);
    const first = runs[runs.length - 1]?.result;
    const result = { ...base, ...(first?.problemId ? { problemId: first.problemId } : {}) };
    await addResult(s.id, result);
    if (first?.problemId) {
      await patchSnag(first.problemId, cur => ({ journey: [...(cur.journey ?? []), { id: uid(), at: base.at, did: `Checked again — failed again${base.note ? ` (${base.note})` : ''}`, result: 'Nothing more held: the line was stopped between the checks' }] }));
    }
    return { result, ...(first?.problemId ? { problemId: first.problemId } : {}) };
  }
  if (!s.workspaceId) { await addResult(s.id, base); return { result: base }; }
  const { hold } = previewFailure(c, log, s.facts.results, base.at, def, ctx, base.made);
  const snag = failureProblem(s, c, base, hold, def);
  await addSnag(snag);
  const result = { ...base, problemId: snag.id };
  await addResult(s.id, result);
  await machineOntoLine(s.workspaceId, snag.targetAsset);
  return { result, problemId: snag.id };
}

/** An audit's findings raised as problems — one for each ticked: the check, the area, the heading and question,
 *  the level; High when the same question was below the line in the audit before. */
export async function raiseFindings(s: ToolStudy, c: LogCheck, def: LogDef, resultId: string, ticked: string[], repeats: string[]): Promise<string[]> {
  const r = (s.facts.results ?? []).find(x => x.id === resultId);
  if (!r?.answers || !s.workspaceId || !def.scale) return [];
  const top = SCALE_MAX(def), below = findingBelowOf(c, def.scale), ids: string[] = [];
  const t = clock();
  for (const a of r.answers.filter((x: LogAnswer) => ticked.includes(x.id) && x.level !== null && x.level < below)) {
    const again = repeats.includes(a.id);
    const snag: Snag = {
      id: uid(), workspaceId: s.workspaceId, status: 'open', raisedAt: t, updatedAt: t, media: [],
      problem: `${c.name}${c.where ? ` — ${c.where}` : ''}: ${a.group ? `${a.group} — ` : ''}${a.name} (scored ${a.level} of ${top})${again ? ' — came back from the audit before' : ''}`,
      priority: again ? 'high' : c.priority ?? def.priority,
      ...((c.where?.trim() || s.machine?.trim()) ? { targetAsset: c.where?.trim() || s.machine?.trim() } : {}), ...(s.projectId ? { projectId: s.projectId } : {}),
      latestUpdate: c.reaction?.trim() || def.reactionWords, latestUpdateAt: t,
    };
    await addSnag(snag); ids.push(snag.id);
  }
  if (ids.length) await patchStudy(s.id, cur => ({ facts: { ...cur.facts, results: (cur.facts.results ?? []).map(x => (x.id === resultId ? { ...x, problemIds: [...(x.problemIds ?? []), ...ids] } : x)) } }));
  return ids;
}

/** An abnormality tag: a problem on the line and the machine — red is the fitter's (High), white the operator's (Low). */
export async function raiseTag(s: ToolStudy, c: LogCheck, colour: 'red' | 'white', what: string, by: string | undefined): Promise<LogTag | undefined> {
  const words = what.trim();
  if (!words || !s.workspaceId) return undefined;
  const t = clock();
  const snag: Snag = {
    id: uid(), workspaceId: s.workspaceId, status: 'open', raisedAt: t, updatedAt: t, media: [],
    problem: `Tag (${colour}) — ${c.where ? `${c.where}: ` : ''}${words}`, priority: colour === 'red' ? 'high' : 'low',
    ...((c.where?.trim() || s.machine?.trim()) ? { targetAsset: c.where?.trim() || s.machine?.trim() } : {}), ...(s.projectId ? { projectId: s.projectId } : {}),
    latestUpdate: colour === 'red' ? 'Red tag: needs the fitter.' : 'White tag: the operator fixes it.', latestUpdateAt: t,
  };
  await addSnag(snag);
  const tag: LogTag = { id: uid(), checkId: c.id, at: t, ...(by ? { by } : {}), colour, what: words, problemId: snag.id };
  await patchStudy(s.id, cur => ({ facts: { ...cur.facts, tags: [...(cur.facts.tags ?? []), tag] } }));
  await machineOntoLine(s.workspaceId, snag.targetAsset);
  return tag;
}

export const strikeTag = (id: string, tagId: string, struck: boolean): Promise<void> =>
  patchStudy(id, cur => ({ facts: { ...cur.facts, tags: (cur.facts.tags ?? []).map(t => (t.id === tagId ? { ...t, struck: struck || undefined } : t)) } }));

export { putStudy };
