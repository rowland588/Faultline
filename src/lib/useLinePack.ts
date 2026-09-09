/* What is in a line's pack, counted.
 *
 * The project's roll-up and a line's own header ask the same question — how
 * much is open here, what has landed, what did the walk find — so it is
 * answered once. Reading it in one place is also what keeps the GM report and
 * the line's own deck from ever disagreeing about the same line.
 *
 * Snags live in the line's workspace rather than in a pace_* table, so they are
 * fetched per workspace; a line with no workspace yet simply has none. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { listPaceTodos, listPaceWins, snagsForWorkspace, onDataChange, type PaceLineRow } from '../db';

export interface LinePack {
  openTodos: number;
  doneTodos: number;
  waitingTodos: number;
  wins: number;
  openSnags: number;
}

const EMPTY: LinePack = { openTodos: 0, doneTodos: 0, waitingTodos: 0, wins: 0, openSnags: 0 };

async function readPack(projectId: string, lineId: string, workspaceId?: string): Promise<LinePack> {
  const [todos, wins] = await Promise.all([
    listPaceTodos(projectId, lineId),
    listPaceWins(projectId, lineId),
  ]);
  const snags = workspaceId ? await snagsForWorkspace(workspaceId) : [];
  return {
    openTodos: todos.filter(t => t.state === 'todo').length,
    waitingTodos: todos.filter(t => t.state === 'waiting').length,
    doneTodos: todos.filter(t => t.state === 'done').length,
    wins: wins.length,
    openSnags: snags.filter(s => s.status !== 'closed').length,
  };
}

/** One line's counts, kept live — a next step ticked off on the owner's phone
 *  changes the number on the project without a reload. */
export function useLinePackCounts(projectId: string, lineId: string, workspaceId?: string): LinePack {
  const [pack, setPack] = useState<LinePack>(EMPTY);
  const timer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    setPack(await readPack(projectId, lineId, workspaceId));
  }, [projectId, lineId, workspaceId]);

  useEffect(() => {
    void refresh();
    return onDataChange(() => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void refresh(); }, 300);
    });
  }, [refresh]);

  return pack;
}

/** Every line's counts at once, keyed by line id — the project's roll-up.
 *  This is the GM's "one source, fed from all the others": each number in it
 *  was typed by a line owner into their own pack. */
export function useAllLinePacks(projectId: string, lines: PaceLineRow[]): Map<string, LinePack> {
  const [packs, setPacks] = useState<Map<string, LinePack>>(new Map());
  const timer = useRef<number | undefined>(undefined);

  // The identity of the array changes on every render of the caller, so depend
  // on what actually matters — which lines, and where each keeps its walk.
  const sig = lines.map(l => `${l.id}:${l.workspaceId ?? ''}`).join(',');

  const refresh = useCallback(async () => {
    const next = new Map<string, LinePack>();
    for (const part of sig.split(',').filter(Boolean)) {
      const i = part.indexOf(':');
      const id = part.slice(0, i), ws = part.slice(i + 1) || undefined;
      next.set(id, await readPack(projectId, id, ws));
    }
    setPacks(next);
  }, [projectId, sig]);

  useEffect(() => {
    void refresh();
    return onDataChange(() => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void refresh(); }, 300);
    });
  }, [refresh]);

  return packs;
}

export const emptyPack = EMPTY;
