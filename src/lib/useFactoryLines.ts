/* THE LINES TO PICK FROM — Your factory's, in floor order, wherever a record
 * is put on a line (a tool's New, a study's Where it sits). Rowland, 13
 * October: "assign everything to a production line". A project's own walk,
 * an archived line and the demo are not lines to put new work on; the line a
 * record is on already is always offered, so picking never hides where it
 * is. Read again when anything is written. */
import { useEffect, useState } from 'react';
import type { Workspace } from '../types';
import { listWorkspaces, onDataChange } from '../db';
import { liveProductionLines } from './lines';

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
