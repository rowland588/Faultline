/* WHAT THE FLOOR SAID OF A JOB'S PROGRAMS, for the line's Programs (flow
 * audit #3: "one program, two records, two answers" — PR-04 "Proved 12 Oct"
 * on the line, "Failed · closed 13 Oct" on the job). A job's program shows on
 * its line's Programs; the status its job's Set up said of it — baseline
 * achieved, passed, failed, with what was seen — is the job's programs reading
 * (lib/programsReport), read here once per job and kept current, so the line
 * says it beside the record's own state. Nothing is stored. */
import { useEffect, useState } from 'react';
import { getProject, listAssets, listPrograms, listStudies, listTestItems, listTests, onDataChange } from '../db';
import { programsReading, type ProgBucket, type ProgTone, type ProgramLine } from './programsReport';
import { lineOfMachine, onlyLineOf, type JobLine } from './lineRecords';
import type { Asset } from './testing';
import { todayISO } from './weeks';
import { judgedByCriteria } from './programs';

export interface FloorWord {
  /** "Failed · closed 13 Oct", "baseline achieved — done 13 Oct". */
  word: string;
  tone: ProgTone;
  /** What the job's reading counts it as — failed, done, open… — so the
   *  line's totals count it the same (walkthrough, 25 October: the factory's
   *  programs said "none failed" while the job's status report, over the same
   *  six programs, said "1 failed"). */
  bucket?: ProgBucket;
  /** What was seen, with the status it stands on. */
  note?: string;
}

/** A job's programs that are only a line on a machine's *Programs loaded* — no program record behind them
 *  (23 October: "programs on the line in my factory, it's like you don't have any programs"); with the
 *  job's machine they stand on, read as the job's own Programs page reads them. */
export interface StageOnly { projectId: string; projectName: string; assetId?: string; line: ProgramLine }

/** The floor's word on each of these jobs' programs, by program id — only
 *  where the job's Set up said something of it; and each job's programs that are only on its stage. */
/** The floor's word on these jobs' programs, read once — what the hook reads, for a paper made on a press. */
export async function loadJobFloor(jobIds: readonly string[]): Promise<Map<string, FloorWord> & { stageOnly?: StageOnly[] }> {
  const ids = [...new Set(jobIds.filter(Boolean))];
  const all = await Promise.all(ids.map(async pid => {
    const [tests, items, assets, programs, project] = await Promise.all([listTests(pid), listTestItems(pid), listAssets(pid), listPrograms(pid), getProject(pid)]);
    /* the studies only where a program is judged by criteria (lib/programCriteria) */
    const studies = programs.some(judgedByCriteria) ? await listStudies(pid) : undefined;
    const lines = programsReading({ tests, items, assets, programs, today: todayISO(), ...(studies ? { studies } : {}), ...(project ? { holder: project } : {}) })?.lines ?? [];
    return lines.map(l => ({ l, pid, name: project?.name ?? 'its project' }));
  }));
  const m: Map<string, FloorWord> & { stageOnly?: StageOnly[] } = new Map<string, FloorWord>();
  m.stageOnly = all.flat().filter(x => x.l.partId && !x.l.programId)
    .map(x => ({ projectId: x.pid, projectName: x.name, ...(x.l.assetId ? { assetId: x.l.assetId } : {}),
      line: { ...x.l, proving: `On ${x.name}'s Commission — a line on ${x.l.machine}'s Programs loaded, not on a Programs list yet` } }));
  for (const { l } of all.flat()) {
    /* Only where the floor's status leads the row — the newer fact; one
       proved since the floor last spoke reads as proved, as it does here. */
    if (!l.programId || !l.partId || !l.record) continue;
    m.set(l.programId, { word: l.word, tone: l.tone, bucket: l.bucket, ...(l.note ? { note: l.note } : {}) });
  }
  return m;
}

export function useJobFloor(jobIds: readonly string[]): Map<string, FloorWord> & { stageOnly?: StageOnly[] } {
  const key = [...new Set(jobIds.filter(Boolean))].sort().join(',');
  const [got, setGot] = useState<Map<string, FloorWord> & { stageOnly?: StageOnly[] }>(() => new Map());
  useEffect(() => {
    let live = true;
    const ids = key ? key.split(',') : [];
    const load = () => void loadJobFloor(ids).then(m => { if (live) setGot(m); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [key]);
  return got;
}

/** Each stage-only program on the line it stands on — its machine's line, else its project's only line. */
export function stageOnlyByLine(stage: readonly StageOnly[], machines: readonly Asset[], jobLines: readonly JobLine[]): Map<string, StageOnly[]> {
  const m = new Map<string, StageOnly[]>();
  for (const x of stage) {
    const a = x.assetId ? machines.find(q => q.id === x.assetId) : undefined;
    const ws = a ? lineOfMachine(a, jobLines) : onlyLineOf(x.projectId, jobLines);
    if (ws) m.set(ws, [...(m.get(ws) ?? []), x]);
  }
  return m;
}

/** The projects on these lines — the ones whose stage-only programs a line's pages say. */
export function projectsOnLines(lineIds: readonly string[], jobLines: readonly JobLine[], live: (projectId: string) => boolean): string[] {
  const ids = new Set(lineIds);
  return jobLines.filter(l => !l.deletedAt && l.workspaceId && ids.has(l.workspaceId) && l.projectId && live(l.projectId)).map(l => l.projectId as string);
}
