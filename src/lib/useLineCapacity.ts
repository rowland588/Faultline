/* WHAT A JOB'S LINES CAN MAKE, AND WHAT THEY COUNTED — kept current, for the
 * 6M job's front page and its Numbers (flow audit #8: "The gap is typed, not
 * counted. Line 7's pace is On target at 44 a minute. Line 7's own count says
 * 91 a minute against a plate speed of 100").
 *
 *   capacities  each line's capacity as the job reads it (lib/fishbone
 *               lineCapacityOf): its own line balance, else the product's
 *               Line capacity on the line — the job's standards and the
 *               line's own, a Line capacity worked out with no job included
 *   counts      each line's shifts counted (Loss count, lib/ie/losses), the
 *               newest first, from the line's workspace — whichever job, or
 *               none, they were counted on: they are the line's
 *
 * Nothing is stored here. Read from the stores the tools already keep. */
import { useEffect, useMemo, useState } from 'react';
import { listPrograms, listStandards, listStandardsForLine, listStudiesForLine, onDataChange, type PaceLineRow } from '../db';
import { lineCapacityOf, type LineCapacity } from './fishbone';
import type { Standard } from './standard';
import type { Program } from './programs';
import type { ToolStudy } from './study';

interface Read { standards: Standard[]; programs: Program[]; counts: Map<string, ToolStudy[]> }

export function useLineCapacity(projectId: string, lines: PaceLineRow[]): { capacities: Map<string, LineCapacity>; counts: Map<string, ToolStudy[]> } {
  const [read, setRead] = useState<Read>({ standards: [], programs: [], counts: new Map() });
  const ws = [...new Set(lines.flatMap(l => (l.workspaceId ? [l.workspaceId] : [])))];
  const key = ws.join('|');
  useEffect(() => {
    let alive = true, timer: number | undefined;
    const lineWs = key ? key.split('|') : [];
    const load = async () => {
      const [own, onLines, programs, studies] = await Promise.all([
        projectId ? listStandards(projectId) : Promise.resolve([] as Standard[]),
        Promise.all(lineWs.map(id => listStandardsForLine(id))),
        projectId ? listPrograms(projectId) : Promise.resolve([] as Program[]),
        Promise.all(lineWs.map(id => listStudiesForLine(id))),
      ]);
      const standards = [...new Map([...own, ...onLines.flat()].map(s => [s.id, s])).values()];
      const counts = new Map(lineWs.map((id, i) => [id, studies[i]
        .filter(s => !s.deletedAt && s.tool === 'losses' && !!s.facts.losses)
        .sort((a, b) => (b.facts.losses?.from ?? 0) - (a.facts.losses?.from ?? 0))]));
      if (alive) setRead({ standards, programs, counts });
    };
    void load();
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 250); });
    return () => { alive = false; window.clearTimeout(timer); off(); };
  }, [projectId, key]);
  const capacities = useMemo(() => new Map(lines.flatMap(l => {
    const c = lineCapacityOf(l, read.standards, read.programs);
    return c ? [[l.id, c] as const] : [];
  })), [lines, read]);
  const counts = useMemo(() => new Map(lines.map(l => [l.id, (l.workspaceId && read.counts.get(l.workspaceId)) || []] as const)), [lines, read]);
  return { capacities, counts };
}
