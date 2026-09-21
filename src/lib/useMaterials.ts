/* What one project is waiting on, live. Small on purpose — see lib/materials.ts:
 * a material is what it is, when it is due, and whether it is here. */
import { useCallback, useEffect, useState } from 'react';
import { listMaterials, putMaterial, putMaterials, deleteMaterial, onDataChange } from '../db';
import { uid, now } from './ids';
import { byUrgency, tally, todayISO, weeksFor, type Material, type Tally, type Week } from './materials';

export interface MaterialsState {
  loading: boolean;
  /** In the order the list reads: late, then coming, then undated, then here. */
  materials: Material[];
  tally: Tally;
  /** The columns of the grid — this week forward, far enough to cover the last
   *  thing anybody is waiting for. */
  weeks: Week[];

  add: (m: { what: string; howMuch?: string; lineId?: string; from?: string; due?: string; note?: string }) => Promise<void>;
  save: (m: Material) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** It turned up. The date is the day it LANDED, which is not always today. */
  markIn: (id: string, on?: string) => Promise<void>;
  /** It has not, after all — put it back on the list with its date. */
  markOut: (id: string) => Promise<void>;
  /** A pasted plan, written in one go. */
  importRows: (rows: { what: string; due?: string; here?: boolean }[]) => Promise<void>;
}

export function useMaterials(projectId: string): MaterialsState {
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setRows(await listMaterials(projectId));
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  /* Where a new row lands: after everything already on the list. Memoised on
     the rows it reads, so the callbacks below can name it as the dependency it
     actually is instead of closing over a function that changes every render. */
  const nextSort = useCallback(() => rows.reduce((n, m) => Math.max(n, m.sort), 0) + 10, [rows]);

  const add = useCallback(async (m: Parameters<MaterialsState['add']>[0]) => {
    const what = m.what.trim();
    if (!what) return;
    const t = now();
    await putMaterial({
      id: uid(), projectId, what,
      howMuch: m.howMuch?.trim() || undefined,
      lineId: m.lineId || undefined,
      from: m.from?.trim() || undefined,
      due: m.due || undefined,
      note: m.note?.trim() || undefined,
      sort: nextSort(), createdAt: t, updatedAt: t,
    });
  }, [projectId, nextSort]);

  const save = useCallback(async (m: Material) => { await putMaterial(m); }, []);
  const remove = useCallback(async (id: string) => { await deleteMaterial(id); }, []);

  const markIn = useCallback(async (id: string, on = todayISO()) => {
    const m = rows.find(r => r.id === id);
    if (!m) return;
    await putMaterial({ ...m, here: true, inOn: on });
  }, [rows]);

  /* Putting it back clears the landing date with the flag. A row that said "in
     on the 14th" while sitting in Waiting is two facts contradicting each
     other, and somebody would have to guess which one to believe. */
  const markOut = useCallback(async (id: string) => {
    const m = rows.find(r => r.id === id);
    if (!m) return;
    await putMaterial({ ...m, here: undefined, inOn: undefined });
  }, [rows]);

  const importRows = useCallback(async (incoming: { what: string; due?: string; here?: boolean }[]) => {
    const t = now();
    let sort = nextSort();
    await putMaterials(incoming.map(r => ({
      id: uid(), projectId, what: r.what, due: r.due, here: r.here || undefined,
      sort: (sort += 10), createdAt: t, updatedAt: t,
    })));
  }, [projectId, nextSort]);

  const today = todayISO();
  return {
    loading,
    materials: byUrgency(rows, today),
    tally: tally(rows, today),
    weeks: weeksFor(rows, today),
    add, save, remove, markIn, markOut, importRows,
  };
}
