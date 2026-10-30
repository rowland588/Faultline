/* THE LINES TO PICK FROM — Your factory's, in floor order, wherever a record
 * is put on a line (a tool's New, a study's Where it sits). Rowland, 13
 * October: "assign everything to a production line". A project's own walk,
 * an archived line and the demo are not lines to put new work on; the line a
 * record is on already is always offered, so picking never hides where it
 * is. Read again when anything is written. */
import { useEffect, useState } from 'react';
import type { Workspace } from '../types';
import { inArchivedProject, listWorkspaces, onDataChange, projectWalkIds } from '../db';
import { allProjects } from '../db/projects';
import { liveProductionLines } from './lines';
import { jobFactoryLines } from './lineRecords';
import { allPaceLines } from '../db/pace';
import { linesDay, type LinesDay } from './lineLoss';

/** THE PLACES AN ARCHIVED JOB'S RECORDS SIT — `job:<id>` for each archived job,
 *  `ws:<id>` for each archived job's own walk — so a tool's list puts them away
 *  with the job (13 October: "archive is causing issues"). A line of the
 *  factory is never one: its records are the line's. Read again when
 *  anything is written. */
export function useArchivedPlaces(): Set<string> {
  const [put, setPut] = useState<Set<string>>(new Set());
  useEffect(() => {
    let live = true;
    const load = () => void (async () => {
      const [ps, walks] = await Promise.all([allProjects(), projectWalkIds()]);
      const gone = ps.filter(p => p.archivedAt || p.deletedAt);
      const out = new Set(gone.map(p => `job:${p.id}`));
      for (const w of walks) if (await inArchivedProject(w)) out.add(`ws:${w}`);
      if (live) setPut(out);
    })();
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return put;
}

export function useFactoryLines(keep?: string): Workspace[] {
  return useFactoryLinesRead(keep).lines;
}

/** The same, and whether the lines have been READ yet — so "this factory has no
 *  line" is said only once it is known, never in the first blink before the
 *  read (ui/LineField). */
export function useFactoryLinesRead(keep?: string): { lines: Workspace[]; read: boolean } {
  const [got, setGot] = useState<{ lines: Workspace[]; read: boolean }>({ lines: [], read: false });
  useEffect(() => {
    let live = true;
    const load = () => void (async () => {
      const all = await listWorkspaces();
      const floor = await liveProductionLines(all);
      const own = keep && !floor.some(w => w.id === keep) ? all.filter(w => w.id === keep) : [];
      if (live) setGot({ lines: [...floor, ...own], read: true });
    })();
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [keep]);
  return got;
}

/** EVERY JOB'S DAY OF ITS LINES NOT MAKING (lib/lineLoss linesDay, from
 *  Your factory) — what the control room's money reads (lib/roomLean).
 *  Undefined until the lines are read, so no job is said to have none. */
export async function readJobsDays(projectIds: readonly string[]): Promise<Map<string, LinesDay>> {
  const [jobLines, all] = await Promise.all([allPaceLines(), listWorkspaces()]);
  return new Map(projectIds.map(id => [id, linesDay(jobFactoryLines(id, jobLines, all))]));
}

export function useJobsDays(projectIds: readonly string[]): Map<string, LinesDay> | undefined {
  const [got, setGot] = useState<Map<string, LinesDay> | undefined>(undefined);
  const key = projectIds.join(',');
  useEffect(() => {
    let live = true;
    const ids = key ? key.split(',') : [];
    const load = () => void (async () => {
      const days = await readJobsDays(ids);
      if (live) setGot(days);
    })();
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [key]);
  return got;
}

/** A JOB'S LINES AS YOUR FACTORY HOLDS THEM (lib/lineRecords jobFactoryLines)
 *  — what a day late costs reads their speed, shifts and margin a pack
 *  (lib/lineLoss linesDay). `loading` until both are read, so the money is
 *  never said of no lines while the lines are still coming. */
export function useJobFactoryLines(projectId: string): { loading: boolean; lines: Workspace[] } {
  const [got, setGot] = useState<{ loading: boolean; lines: Workspace[] }>({ loading: true, lines: [] });
  useEffect(() => {
    let live = true;
    setGot({ loading: true, lines: [] });
    const load = () => void (async () => {
      const [jobLines, all] = await Promise.all([allPaceLines(), listWorkspaces()]);
      if (live) setGot({ loading: false, lines: jobFactoryLines(projectId, jobLines, all) });
    })();
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return got;
}
