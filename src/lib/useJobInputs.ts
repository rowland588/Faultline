/* EVERY JOB, READ THE WAY ITS OWN METHOD READS IT — what lib/portfolio is
 * worked from. The control room (ui/JobsBoard) reads every job with it; a
 * line's page (screens/ProductionLineScreen) reads the jobs on that line with
 * it, so a job's verdict on the line's page is the control room's own, never
 * a second opinion (FLOW-AUDIT.md, 10). Moved here from ui/JobsBoard, where
 * it was the board's alone. */
import { useEffect, useState } from 'react';
import type { Project } from '../types';
import {
  listAssets, listMaterials, listPrograms, listStudies, listTestItems, listTests, listPaceTodos, listTargets, listReadings,
  loadPaceLines, onDataChange, listTreeNodes,
} from '../db';
import { bindSources, treeStanding, withTrackerRows } from './treeBind';
import { stepAction } from './actions';
import { planModel } from './planModel';
import { gapOf, lineSeries } from './measures';
import { loadProblems, viewsOf } from './useProblems';
import { currentLosses, lossCardLine, studyHref } from './studyLinks';
import { linesOnTarget } from './onTarget';
import { todayISO } from './weeks';
import type { JobInput, PacedInput, SixMProblem } from './portfolio';

export interface JobInputs { gate: JobInput[]; paced: PacedInput[] }

/** Every project, read the way its own method reads it. `null` until read. */
export function useJobInputs(projects: Project[]): JobInputs | null {
  const [inputs, setInputs] = useState<JobInputs | null>(null);
  const ids = projects.map(p => `${p.id}:${p.updatedAt}`).join('|');
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const load = async () => {
      const gateProjects = projects.filter(p => planModel(p) === 'commissioning');
      const pacedProjects = projects.filter(p => planModel(p) !== 'commissioning');
      const gate = await Promise.all(gateProjects.map(async project => ({
        project,
        tests: await listTests(project.id),
        items: await listTestItems(project.id),
        assets: await listAssets(project.id),
        materials: await listMaterials(project.id),
        programs: await listPrograms(project.id),
        /* a test proved by a study still short says so on its row */
        studies: await listStudies(project.id),
      })));
      const paced = await Promise.all(pacedProjects.map(async (project): Promise<PacedInput> => {
        const [steps, lines, targets, readings, items, materials, programs] = await Promise.all([
          listPaceTodos(project.id), loadPaceLines(project.id), listTargets(project.id), listReadings(project.id), listTestItems(project.id),
          /* What it waits on — late here is late on the job (lib/portfolio pacedOwed). */
          listMaterials(project.id), listPrograms(project.id),
        ]);
        // The same call the project's own page makes, so the row and the page agree.
        const series = lines.map(l => lineSeries(project.measures ?? [], project.periods ?? [], targets, readings, l.id));
        /* A lever tree job's tree, drawn the way the tree and the report draw
           it — board rows hung in, and a box bound to a number in that
           number's colour — so the row cannot say something the tree does not. */
        const tree = planModel(project) === 'tree'
          ? treeStanding(withTrackerRows(await listTreeNodes(project.id), bindSources(
            steps.map(s => stepAction(s, lines)), steps, lines,
            { measures: project.measures ?? [], periods: project.periods ?? [], targets, readings })))
          : undefined;
        /* A 6M job's problems, read by the engine its fishbone and its client
           report read them with — the phase is phaseOf's, not worked out here —
           and each line against its target in the report's own sentence. */
        let problems: SixMProblem[] | undefined;
        let gaps: PacedInput['gaps'];
        let losses: PacedInput['losses'];
        if (planModel(project) === 'board') {
          const day = todayISO();
          const loaded = await loadProblems(project.id).catch(() => null);
          problems = loaded
            ? viewsOf(loaded, project.id, undefined, Date.parse(`${day}T23:59:59`)).map(v => ({
              id: v.problem.id, title: v.problem.title, phase: v.phase, says: v.says,
              ...(v.problem.lineId ? { lineId: v.problem.lineId } : {}),
            }))
            : undefined;
          gaps = (project.measures ?? []).length
            ? lines.map((l, i) => ({ lineId: l.id, line: l.name, ...gapOf(l.name, series[i]) }))
            : [];
          /* each line's latest shift counted (tool 7), read from the same
             stops and cost model its fishbone reads */
          losses = loaded ? lines.flatMap(l => {
            const cur = l.workspaceId ? currentLosses(loaded.data.studies, l.workspaceId) : undefined;
            const said = cur ? lossCardLine(cur, { observations: loaded.data.observations, workspaces: loaded.data.workspaces }) : undefined;
            return cur && said ? [{ lineId: l.id, line: l.name, ...said, href: studyHref(cur) }] : [];
          }) : [];
        }
        return {
          project, steps, lines, notes: items.filter(i => i.kind === 'note'), tree, problems, gaps, losses, materials, programs,
          atTarget: series.filter(x => x?.meeting === true).length,
          judged: series.filter(x => x?.meeting != null).length,
          /* Are its lines on target? — the answer its front page leads with. */
          onTarget: linesOnTarget(lines.map((l, i) => ({ name: l.name, series: series[i] }))),
        };
      }));
      if (live) setInputs({ gate, paced });
    };
    void load();
    /* Anything written anywhere — here, or synced from the phone — redraws
       the board a moment later. Bursts collapse into one load. */
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 250); });
    return () => { live = false; window.clearTimeout(timer); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ids` is the projects, keyed by what can change
  }, [ids]);
  return inputs;
}
