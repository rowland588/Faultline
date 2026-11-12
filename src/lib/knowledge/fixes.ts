/* EVERY FIX ON A LINE, READ WHERE IT LIVES (docs/LUNAR-KNOWLEDGE.md §4) — nothing copied:
 *   a problem closed on the line (snags: its machine and reason, else the reasons of the stops it was raised from; its close note as
 *     what was said);
 *   a countermeasure done on the line (pace_todos on a project line that is this factory line; its machine its `where`); its own
 *     before → after study, when it has one, is its measured outcome (lib/studyLinks beforeAfter, the 6M board's words);
 *   a 6M case's proof, called (cases: its frozen receipt, lib/proof — measured on the case's own scope).
 * Then each fix's outcome (outcomes.ts) and, when this person may add to the line, the versions the ledger does not hold yet. */
import { allPaceLines, listAllPaceTodos, listAllSnags, listAllStudies, listCases, listObservations, listSnagAssets } from '../../db';
import { applyDrill } from '../../engine/drill';
import { studyResult } from '../proof';
import { beforeAfter } from '../studyLinks';
import type { ToolStudy } from '../study';
import type { Workspace } from '../../types';
import { addEntries, listKnowledge } from './ledger';
import { mayAddKnowledge } from './may';
import { outcomeOf, outcomeVersions, type Fix, type Outcome } from './outcomes';

const DAY = 86_400_000;
const dayMs = (iso?: string) => { const t = iso ? Date.parse(`${iso}T12:00:00Z`) : NaN; return Number.isFinite(t) ? t : undefined; };

export async function fixesOn(line: Pick<Workspace, 'id' | 'assets'>): Promise<Fix[]> {
  const [snags, assets, obs, todos, pl, studies, cases] = await Promise.all([
    listAllSnags(), listSnagAssets(line.id), listObservations(line.id), listAllPaceTodos(), allPaceLines(), listAllStudies(), listCases(line.id),
  ]);
  const byObs = new Map(obs.map(o => [o.id, o] as const));
  const machines = (line.assets ?? []).map(a => a.trim()).filter(Boolean);
  const machineNamed = (words?: string) => machines.find(m => m.toLowerCase() === (words ?? '').trim().toLowerCase());
  const out: Fix[] = [];

  for (const s of snags) {
    if (s.workspaceId !== line.id || s.status !== 'closed' || !s.closedAt || s.deletedAt != null || s.archivedAt) continue;
    const linked = (s.linkedObsIds ?? []).map(id => byObs.get(id)).filter((o): o is NonNullable<typeof o> => !!o);
    const common = <K extends 'asset' | 'category'>(k: K) => {
      const n = new Map<string, number>();
      for (const o of linked) if (o[k]) n.set(o[k], (n.get(o[k]) ?? 0) + 1);
      return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    };
    const pinned = s.assetId ? assets.find(a => a.id === s.assetId) : undefined;
    const machine = s.targetAsset || common('asset') || machineNamed(pinned?.name);
    const reason = s.targetCategory || common('category');
    out.push({
      id: s.id, kind: 'problem', lineId: line.id, title: s.problem.trim() || 'A problem', at: s.closedAt,
      ...(machine ? { machine } : {}), ...(reason ? { reason } : {}),
      ...(s.closeNote?.trim() ? { saidWhenClosed: s.closeNote.trim() } : {}), ...(s.owner ? { by: s.owner } : {}),
      ...(s.fromFinding ? { fromFinding: s.fromFinding } : {}),
    });
  }

  const live = studies.filter(st => st.deletedAt == null) as ToolStudy[];
  for (const t of todos) {
    if (t.state !== 'done' || !t.doneOn) continue;
    const ws = pl.find(l => l.id === t.lineId)?.workspaceId;
    if (ws !== line.id) continue;
    const at = dayMs(t.doneOn);
    if (!at) continue;
    const machine = machineNamed(t.where);
    const ba = beforeAfter(live, t.id, 'action');
    out.push({
      id: t.id, kind: 'countermeasure', lineId: line.id, title: t.what.trim() || 'A countermeasure', at,
      ...(machine ? { machine } : {}), ...(t.who ? { by: t.who } : {}), ...(t.projectId ? { projectId: t.projectId } : {}),
      ...(ba ? { measured: { verdict: ba.tone === 'g' ? 'improved' : ba.tone === 'r' ? 'worse' : 'no-clear-change', says: `Its own before → after: ${ba.text}`, source: 'its before → after study', refs: [ba.before.id, ba.after.id] } } : {}),
    });
  }

  for (const c of cases) {
    const r = c.study?.closedAt ? studyResult(c, applyDrill(obs, line.id, c.path)) : null;
    if (!c.study?.closedAt || !r || r.changePct == null) continue;
    const better = r.changePct < 0 && r.significant !== false;
    const slipping = !!r.sinceCall?.slipping;
    const verdict = slipping ? 'came-back' : better ? 'improved' : r.changePct > 0 && r.significant ? 'worse' : 'no-clear-change';
    const scope = c.path.map(st => st.value).join(' · ');
    const asset = c.path.find(st => st.dimension === 'asset')?.value, category = c.path.find(st => st.dimension === 'category')?.value;
    out.push({
      id: c.id, kind: 'case', lineId: line.id, title: c.title.trim() || 'A 6M problem', at: c.study.closedAt,
      ...(asset ? { machine: asset } : {}), ...(category ? { reason: category } : {}),
      measured: {
        verdict, source: `its 6M proof (${scope || 'the whole line'})`, refs: [c.id],
        says: `Its proof, called: ${r.beforeN} stops before averaging ${Math.round(r.beforeMeanMs / 6000) / 10} min, ${r.afterN} after averaging ${Math.round(r.afterMeanMs / 6000) / 10} min (${r.changePct > 0 ? '+' : ''}${r.changePct}%${r.pValue != null ? `, p = ${Math.round(r.pValue * 1000) / 1000}` : ''})${slipping ? ' — and since it was called, stops are lasting longer again: slipping' : ''}.`,
      },
    });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Every fix on the line with its outcome, newest first; the outcomes the ledger does not hold yet added when this person may. */
export async function outcomesOn(line: Workspace, now = Date.now(), opts: { write?: boolean } = {}): Promise<Outcome[]> {
  const [fixes, obs] = await Promise.all([fixesOn(line), listObservations(line.id)]);
  const outcomes = fixes.map(f => outcomeOf(f, obs, now));
  if (opts.write ?? mayAddKnowledge()) {
    await addEntries(outcomeVersions({ id: line.id, ...(line.clientName ? { client: line.clientName } : {}) }, outcomes, await listKnowledge(line.id), now));
  }
  return outcomes;
}

export const FIX_WINDOW_DAYS = 28;
export const fixAge = (f: Fix, now: number) => Math.floor((now - f.at) / DAY);
