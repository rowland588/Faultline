/* THE 6M BOARD'S ACTIONS ARE THE PROJECT'S NEXT STEPS.
 *
 * Rowland: "There will be no Excel that needs to be uploaded ... this is about
 * now fully using the app." The app already kept a list with a what, a who, a
 * when and a state on it — the project's next steps — so that list IS the
 * actions: one record, read the same by the board, the list, a line's pack,
 * the meeting, the fishbone (as countermeasures) and the client report. No
 * new kind of record.
 *
 * On top of what a next step always had, an action carries what a board and a
 * fishbone need (docs/SIXM.md): the bone it sits on (`pillar` — the six, the
 * old People / Plant / Process read across), a due date, the cause it is the
 * countermeasure for (`causeRef`) and what it should change (`expect`).
 *
 * Every screen that draws a board reads PaceAction, so the steps are turned
 * into that shape here, in one place, rather than every screen learning a
 * second one. The action's uid is the step's id — that is how the board finds
 * the row to edit when a card is tapped. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCase, listPaceTodos, loadPaceLines, onDataChange, type PaceLineRow, type PaceTodoRow } from '../db';
import type { PaceAction } from './tracker';
import { sixmLabel, toSixM } from './sixm';
import { addDays, todayISO } from './weeks';
import { parseCauseRef as parseRef } from './fishbone';

/** What a step that belongs to no one line is filed under on the board. */
export const WHOLE_PROJECT = 'All lines';

/** How close a due day has to be to count as "due soon" — amber on the house
 *  rules: worth a word in the meeting before it goes red. */
export const DUE_SOON_DAYS = 3;

/** The bone's word — the six (lib/sixm), with the old 3P words read across. */
const boneWord = (v?: string): string => sixmLabel(toSixM(v));

const short = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

/** Late: not done, and the day it was due has gone. */
export const isLate = (s: Pick<PaceTodoRow, 'state' | 'due'>, today = todayISO()): boolean =>
  s.state !== 'done' && !!s.due && s.due < today;

/** Due soon: not done, not late, and due within DUE_SOON_DAYS. */
export const isDueSoon = (s: Pick<PaceTodoRow, 'state' | 'due'>, today = todayISO()): boolean =>
  s.state !== 'done' && !!s.due && s.due >= today && s.due <= addDays(today, DUE_SOON_DAYS);

export function stepAction(s: PaceTodoRow, lines: PaceLineRow[], today = todayISO()): PaceAction {
  const line = s.lineId ? lines.find(l => l.id === s.lineId) : undefined;
  return {
    uid: s.id,
    ref: s.id,
    /* The workbook's Priority column, which an action kept in the app has
       not got. Every one is the same, so it ranks nothing; the board and the
       meeting sort by the due day instead (lib/pillars meetingOrder). */
    priority: 3,
    line: line?.name ?? WHOLE_PROJECT,
    lineId: s.lineId,
    lineKey: line?.key ?? '',
    caseId: s.caseId,
    causeRef: s.causeRef,
    expect: s.expect?.trim() || undefined,
    // The bone, as the category the lever tree groups and binds by.
    category: boneWord(s.pillar),
    action: s.what,
    problem: s.why,
    owner: s.who,
    due: s.due ? short(s.due) : s.when || undefined,
    dueISO: s.due,
    doneOn: s.doneOn,
    // The words statusOfAction already reads: Done, Waiting (blocked on
    // someone else), To do. Not left blank — a blank status reads as "not
    // started" before the overdue flag is looked at, so a late step showed
    // grey instead of red.
    status: s.state === 'done' ? 'Done' : s.state === 'waiting' ? 'Waiting' : 'To do',
    /* Overdue, or due soon. Only Overdue was ever set, so the meeting's
       "due soon" count read 0 whatever was coming up. */
    flag: isLate(s, today) ? 'Overdue' : isDueSoon(s, today) ? 'Due soon' : '',
    pillar: boneWord(s.pillar) || undefined,
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

/* ---------------------- the cause an action is for ---------------------- */

/** "<caseId>:<causeId>" → its two halves, or null for anything else. The
 *  rule is the fishbone engine's (lib/fishbone parseCauseRef), said once. */
export function parseCauseRef(ref: string | null | undefined): { caseId: string; causeId: string } | null {
  const p = parseRef(ref?.trim() || undefined);
  return p ? { caseId: p.problemId, causeId: p.causeId } : null;
}

/** What a cause link reads as on a card or in the editor. */
export interface CauseName {
  /** The cause's own words. */
  text: string;
  /** The problem it hangs off — the head of that fishbone. */
  problem: string;
  /** Where to open it: the problem's walk, when it has one. */
  workspaceId?: string;
  caseId: string;
}

/** The causes a set of actions point at, by causeRef — read from the problems
 *  (cases) they live on. A ref whose problem or cause has gone is simply not
 *  in the map, and the card says "on the fishbone" rather than inventing a
 *  sentence. */
export function useCauseNames(refs: (string | undefined)[]): Map<string, CauseName> {
  const key = useMemo(() => [...new Set(refs.filter((r): r is string => !!parseCauseRef(r)))].sort().join('|'), [refs]);
  const [map, setMap] = useState<Map<string, CauseName>>(new Map());
  useEffect(() => {
    if (!key) { setMap(new Map()); return; }
    let alive = true;
    const load = async () => {
      const wanted = key.split('|').flatMap(r => { const p = parseCauseRef(r); return p ? [{ r, ...p }] : []; });
      const cases = new Map<string, Awaited<ReturnType<typeof getCase>>>();
      for (const p of wanted) {
        if (!cases.has(p.caseId)) cases.set(p.caseId, await getCase(p.caseId));
      }
      const out = new Map<string, CauseName>();
      for (const { r, ...p } of wanted) {
        const c = cases.get(p.caseId);
        if (!c || c.deletedAt) continue;
        const cause = (c.causes ?? []).find(x => x.id === p.causeId);
        if (!cause) continue;
        out.set(r, { text: cause.text, problem: c.title, workspaceId: c.workspaceId, caseId: c.id });
      }
      if (alive) setMap(out);
    };
    void load();
    const off = onDataChange(() => { void load(); });
    return () => { alive = false; off(); };
  }, [key]);
  return map;
}
