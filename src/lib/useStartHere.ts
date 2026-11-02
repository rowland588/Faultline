/* THE PARETO'S "START HERE" MARK, READ FOR A PANE (lib/paretoStart; knowledge/specs/FC-148-why-tree.md Part C).
 * Loads, for each line the pane covers, its workspace (the cost model), its Line capacity standards and its stops, and hands
 * them to the pure ranking. Reads only; writes nothing. `vital` are the vital-few categories in rank order. */
import { useEffect, useState } from 'react';
import { getWorkspace, listObservations, listStandardsForLine, onDataChange } from '../db';
import { PARETO_WINDOW_DAYS } from './paretoFromLog';
import { startHere, startLineOf, type StartHere, type StartLine } from './paretoStart';

const DAY = 86_400_000;

export function useStartHere(lines: readonly { name: string; workspaceId?: string }[], vital: readonly string[]): StartHere | null {
  const [lineRows, setLineRows] = useState<StartLine[] | null>(null);
  const key = JSON.stringify([lines.map(l => [l.name, l.workspaceId]), vital]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const to = Date.now(), from = to - PARETO_WINDOW_DAYS * DAY;
      const out: StartLine[] = [];
      for (const l of lines) {
        if (!l.workspaceId) continue;
        const [ws, standards, obs] = await Promise.all([getWorkspace(l.workspaceId), listStandardsForLine(l.workspaceId), listObservations(l.workspaceId)]);
        out.push(startLineOf(l.name, ws, standards, obs, vital, from, to));
      }
      if (live) setLineRows(out);
    };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return lineRows && vital.length ? startHere(vital, lineRows) : null;
}
