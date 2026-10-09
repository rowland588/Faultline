/* What one project's machine can run, live. Small on purpose — see
 * lib/programs.ts: three states, and a date is what makes one of them true. */
import { useCallback, useEffect, useState } from 'react';
import { listPrograms, putProgram, putPrograms, deleteProgram, onDataChange } from '../db';
import { uid, now } from './ids';
import { offerUndo } from '../ui/Undo';
import {
  inOrder, movedOne, ontoMachine, tally, todayISO, weeksFor,
  type Program, type ProgramState, type Tally, type Week,
} from './programs';

export interface ProgramsState {
  loading: boolean;
  /** In the order the person set (lib/programs inOrder). */
  programs: Program[];
  /** Move one a place up (-1) or down (+1) — among the ones on screen, when
   *  that is one machine's (lib/programs movedOne). */
  move: (id: string, by: -1 | 1, among?: (p: Program) => boolean) => Promise<void>;
  tally: Tally;
  /** The columns of the grid — this week forward, far enough to cover the last
   *  test anybody has booked. */
  weeks: Week[];

  add: (p: {
    what: string; runs?: string; lineId?: string; assetId?: string;
    from?: string; testOn?: string; state?: ProgramState; note?: string;
  }) => Promise<void>;
  save: (p: Program) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** It passed. The date is the day it was PROVED, which is not always today. */
  markProved: (id: string, on?: string, testId?: string) => Promise<void>;
  /** It didn't, or it was signed off in error. Back to on the machine — the
   *  test record keeps why, so the grid does not need a fourth colour. */
  markUnproved: (id: string) => Promise<void>;
  /** EVERY ONE OF THESE, ON THAT MACHINE. Rowland: "all the current existing
   *  programs set to the machine called pick and place."
   *
   *  A list arrives from the OEM with no machine on any row, and the per-row
   *  picker means one tap per program — which for thirty of them is the job the
   *  app is supposed to be doing. One write, so it is one sync and one undo. */
  putAllOn: (ids: string[], assetId: string) => Promise<void>;
}

/* The last reading of each job's programs (lib/useTesting lastRead). */
const lastRead = new Map<string, Program[]>();

export function usePrograms(projectId: string): ProgramsState {
  const [rows, setRows] = useState<Program[]>(lastRead.get(projectId) ?? []);
  const [loading, setLoading] = useState(!lastRead.has(projectId));

  const load = useCallback(async () => {
    const got = await listPrograms(projectId);
    lastRead.set(projectId, got);
    setRows(got);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  /* Where a new row lands: after everything already on the list. Memoised on
     the rows it reads, so the callbacks below can name it as the dependency it
     actually is instead of closing over a function that changes every render. */
  const nextSort = useCallback(() => rows.reduce((n, p) => Math.max(n, p.sort), 0) + 10, [rows]);

  const add = useCallback(async (p: Parameters<ProgramsState['add']>[0]) => {
    const what = p.what.trim();
    if (!what) return;
    const t = now();
    await putProgram({
      id: uid(), projectId, what,
      runs: p.runs?.trim() || undefined,
      lineId: p.lineId || undefined,
      assetId: p.assetId || undefined,
      from: p.from?.trim() || undefined,
      testOn: p.testOn || undefined,
      note: p.note?.trim() || undefined,
      state: p.state ?? 'needed',
      sort: nextSort(), createdAt: t, updatedAt: t,
    });
  }, [projectId, nextSort]);

  const save = useCallback(async (p: Program) => { await putProgram(p); }, []);

  const putAllOn = useCallback(async (ids: string[], assetId: string) => {
    await putPrograms(ontoMachine(rows, ids, assetId));
  }, [rows]);
  const remove = useCallback(async (id: string) => {
    const what = rows.find(x => x.id === id)?.what ?? "it";
    offerUndo(`Took “${what}” off the list`, await deleteProgram(id));
  }, [rows]);

  const markProved = useCallback(async (id: string, on = todayISO(), testId?: string) => {
    const p = rows.find(r => r.id === id);
    if (!p) return;
    /* The booked date comes off with the proving. Leaving it would put a row on
       the grid that is both proved and waiting for a test, and somebody would
       have to guess which of the two to believe. */
    await putProgram({ ...p, state: 'proved', provedOn: on, testOn: undefined, testId: testId ?? p.testId });
  }, [rows]);

  const markUnproved = useCallback(async (id: string) => {
    const p = rows.find(r => r.id === id);
    if (!p) return;
    /* `testId` is kept. A program that went backwards still came from a test,
       and that test is the only record of why it did. */
    await putProgram({ ...p, state: 'onMachine', provedOn: undefined });
  }, [rows]);

  const move = useCallback(async (id: string, by: -1 | 1, among?: (p: Program) => boolean) => {
    const changed = movedOne(rows, id, by, among);
    if (changed.length) await putPrograms(changed);
  }, [rows]);

  const today = todayISO();
  return {
    loading,
    programs: inOrder(rows),
    tally: tally(rows, today),
    weeks: weeksFor(rows, today),
    add, save, remove, markProved, markUnproved, putAllOn, move,
  };
}
