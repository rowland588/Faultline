/* 3P ACTIONS ARE NEXT STEPS.
 *
 * Rowland: "There will be no Excel that needs to be uploaded ... we're moving
 * away from the initial information base which was from another system where
 * I was doing an upload. This is about now fully using the app."
 *
 * The board, the meeting, a line's pack and the client report were all drawn
 * from an uploaded tracker workbook. The app already kept a list with a what,
 * a who, a when and a state on it — the project's next steps — so that list IS
 * the actions now, with the two things a board needs added to it: People,
 * Plant or Process, and a due date. No new kind of record.
 *
 * Every screen that drew the tracker reads PaceAction, so the steps are turned
 * into that shape here, in one place, rather than every screen learning a
 * second one. The action's uid is the step's id — that is how the board finds
 * the row to edit when a card is tapped. */
import { useCallback, useEffect, useState } from 'react';
import { listPaceTodos, loadPaceLines, onDataChange, type PaceLineRow, type PaceTodoRow } from '../db';
import type { PaceAction } from './tracker';
import type { PillarKey } from './pillars';
import { todayISO } from './weeks';

/** What a step that belongs to no one line is filed under on the board. */
export const WHOLE_PROJECT = 'All lines';

const PILLAR_WORD: Record<PillarKey, string> = { people: 'People', plant: 'Plant', process: 'Process' };

const short = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

/** Late: not done, and the day it was due has gone. */
export const isLate = (s: PaceTodoRow, today = todayISO()): boolean =>
  s.state !== 'done' && !!s.due && s.due < today;

export function stepAction(s: PaceTodoRow, lines: PaceLineRow[], today = todayISO()): PaceAction {
  const line = s.lineId ? lines.find(l => l.id === s.lineId) : undefined;
  return {
    uid: s.id,
    ref: s.id,
    priority: 3,
    line: line?.name ?? WHOLE_PROJECT,
    lineId: s.lineId,
    // The column, as the category the lever tree groups and binds by.
    category: s.pillar ? PILLAR_WORD[s.pillar] : '',
    action: s.what,
    problem: s.why,
    owner: s.who,
    due: s.due ? short(s.due) : s.when || undefined,
    // The words statusOfAction already reads: Done, Waiting (blocked on
    // someone else), To do. Not left blank — a blank status reads as "not
    // started" before the overdue flag is looked at, so a late step showed
    // grey instead of red.
    status: s.state === 'done' ? 'Done' : s.state === 'waiting' ? 'Waiting' : 'To do',
    flag: isLate(s, today) ? 'Overdue' : '',
    pillar: s.pillar ? PILLAR_WORD[s.pillar] : undefined,
  };
}

export interface ActionsState {
  loading: boolean;
  steps: PaceTodoRow[];
  lines: PaceLineRow[];
  actions: PaceAction[];
}

/** The project's actions, live — re-read whenever anything is written. */
export function useActions(projectId: string): ActionsState {
  const [st, setSt] = useState<Omit<ActionsState, 'actions'>>({ loading: true, steps: [], lines: [] });
  const load = useCallback(async () => {
    const [steps, lines] = await Promise.all([listPaceTodos(projectId), loadPaceLines(projectId)]);
    setSt({ loading: false, steps, lines });
  }, [projectId]);
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);
  const today = todayISO();
  return { ...st, actions: st.steps.map(s => stepAction(s, st.lines, today)) };
}
