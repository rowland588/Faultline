/* THE BRAIN'S HOMEWORK, KEPT (12 November, docs/LUNAR-BRAIN.md B1). For every line, the engine's findings are kept as one record — a
 * study of tool 'brain' (synced and guarded as every study is, supabase/BRAIN.sql), id `brain-<line>` — holding when the work was
 * done, by which engine, on which records (a fingerprint), and what it found. It is worked again only when the line's stop records
 * change or the day turns (the windows are days back from now); unchanged records are never worked twice. The state is always said:
 * up to date, out of date (records changed since), or not done yet — never a stale finding passed off as current. */
import { getStudy, listAllStandards, listObservations, listWorkspaces, putStudy } from '../../db';
import type { ToolStudy } from '../study';
import type { Workspace } from '../../types';
import { neckOf } from '../lineLoss';
import { ENGINE, homework, inputsOf, type Finding, type Homework } from './engine';
import { findingVersions } from '../knowledge/findings';
import { addEntries, listKnowledge } from '../knowledge/ledger';
import { mayAddKnowledge } from '../knowledge/may';

const DAY = 86_400_000;
export const brainId = (lineId: string) => `brain-${lineId}`;
export type BrainState = 'current' | 'stale' | 'none';
export interface LineBrain { lineId: string; lineName: string; state: BrainState; at?: number; findings: Finding[] }

const homeworkOf = (s: ToolStudy | undefined): Homework | undefined => (s && !s.deletedAt ? (s.facts as { brain?: Homework }).brain : undefined);

/** Do one line's homework if its records changed, the engine changed or a day has passed; returns whether it was worked. What it
 *  finds is kept twice over: the line's current homework (every figure as of now) and, when a claim says something new, a version in
 *  LUNAR's knowledge (lib/knowledge) — only when this person may add to the line (a viewer's device works it out and keeps nothing). */
export async function homeworkForLine(line: Workspace, now: number, opts: { write?: boolean } = {}): Promise<boolean> {
  const write = opts.write ?? mayAddKnowledge();
  const obs = await listObservations(line.id);
  const had = homeworkOf(await getStudy(brainId(line.id)));
  const inputs = inputsOf(obs);
  if (had && had.inputs === inputs && had.engine === ENGINE && now - had.at < DAY) return false;
  const hw = homework(line, obs, now, neckOf(await listAllStandards(), line.id));
  if (!write) return false;
  const study: ToolStudy = {
    id: brainId(line.id), tool: 'brain', name: `What LUNAR has found — ${line.name}`, workspaceId: line.id,
    facts: { brain: hw } as unknown as ToolStudy['facts'], uses: [], startedAt: had?.at ?? now, createdAt: had?.at ?? now, updatedAt: now,
  };
  await putStudy(study);
  await addEntries(findingVersions({ id: line.id, ...(line.clientName ? { client: line.clientName } : {}) }, hw.findings, await listKnowledge(line.id), now));
  return true;
}

/** Every line's homework, as needed. */
export async function homeworkForAll(now = Date.now()): Promise<number> {
  let worked = 0;
  for (const w of (await listWorkspaces()).filter(x => !x.archived)) if (await homeworkForLine(w, now)) worked++;
  return worked;
}

/** What is known of a line, and whether it is current — read from the kept record against the line's records now. */
export async function lineBrain(line: Pick<Workspace, 'id' | 'name'>, at = Date.now()): Promise<LineBrain> {
  const hw = homeworkOf(await getStudy(brainId(line.id)));
  if (!hw) return { lineId: line.id, lineName: line.name, state: 'none', findings: [] };
  const now = inputsOf(await listObservations(line.id));
  return { lineId: line.id, lineName: line.name, state: now === hw.inputs && hw.engine === ENGINE && at - hw.at < DAY ? 'current' : 'stale', at: hw.at, findings: hw.findings };
}

/** A viewer's view: the homework worked out now, in memory, kept nowhere — said as up to date because it was just worked. */
export async function lineBrainNow(line: Workspace, now = Date.now()): Promise<LineBrain> {
  const hw = homework(line, await listObservations(line.id), now, neckOf(await listAllStandards(), line.id));
  return { lineId: line.id, lineName: line.name, state: 'current', at: now, findings: hw.findings };
}

export const BRAIN_STATE_WORD: Record<BrainState, string> = { current: 'Up to date', stale: 'Out of date — records changed, or a day has passed, since', none: 'Not done yet' };
