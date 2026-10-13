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
  const [lines, setLines] = useState<Workspace[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void (async () => {
      const all = await listWorkspaces();
      const floor = await liveProductionLines(all);
      const own = keep && !floor.some(w => w.id === keep) ? all.filter(w => w.id === keep) : [];
      if (live) setLines([...floor, ...own]);
    })();
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [keep]);
  return lines;
}
