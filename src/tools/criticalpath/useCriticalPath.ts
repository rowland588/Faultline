/* THE PLAN'S CRITICAL PATH, LIVE — a project's machines and steps read at once, with the owner's waits and the lines' day (FC-215 part 2). */
import { useMemo } from 'react';
import { useProjects } from '../../lib/useProjects';
import { useTesting } from '../../lib/useTesting';
import { useJobFactoryLines } from '../../lib/useFactoryLines';
import { linesDay, type LinesDay } from '../../lib/lineLoss';
import { todayISO } from '../../lib/weeks';
import { updateProject } from '../../db';
import type { Project } from '../../types';
import { planPath, type PlanInput, type PlanOut } from './plan';

export interface CriticalPathState {
  loading: boolean;
  project?: Project;
  reading: PlanOut;
  /** What the reading was worked from — so a change can be tried before it is kept. */
  inputs: PlanInput;
  day: LinesDay | undefined;
  /** Store the waits (the owner's, `gate_stages`); undefined puts every step back to the proposal. */
  keep: (waitsFor: Record<string, string[]> | undefined) => Promise<void>;
}

export function useCriticalPath(projectId: string): CriticalPathState {
  const { projects, loading: pl } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const tt = useTesting(projectId);
  const factory = useJobFactoryLines(projectId);
  const today = todayISO();
  const waitsFor = project?.gateStages?.waitsFor;
  const handoverAt = project?.expectedAt ?? project?.plannedAt;
  const inputs = useMemo<PlanInput>(() => ({ assets: tt.assets, tests: tt.tests, waitsFor, today, handoverAt }), [tt.assets, tt.tests, waitsFor, today, handoverAt]);
  const reading = useMemo(() => planPath(inputs), [inputs]);
  const day = useMemo(() => (factory.loading ? undefined : linesDay(factory.lines)), [factory.loading, factory.lines]);
  const keep = async (next: Record<string, string[]> | undefined): Promise<void> => {
    if (!project) return;
    const { waitsFor: _was, ...rest } = project.gateStages ?? {};
    const gateStages = next ? { ...rest, waitsFor: next } : rest;
    await updateProject({ ...project, gateStages: Object.keys(gateStages).length ? gateStages : undefined });
  };
  return { loading: pl || tt.loading || factory.loading, project, reading, inputs, day, keep };
}
