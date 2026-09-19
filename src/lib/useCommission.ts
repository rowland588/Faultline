/* The commissioning records for one project, and the five ways to add one.
 *
 * A separate maker per kind rather than one `add(kind, title)`: a program needs
 * an agreed rate the moment it exists, a material needs a quantity, a punch item
 * needs a severity. A single generic add is what produced records with nothing
 * in them but a title, which is how the first version of this ended up unable to
 * answer whether the line could be signed off.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  listCommissionItems, putCommissionItem, putCommissionItems,
  deleteCommissionItem, listCommissionPhases, putCommissionPhase, putCommissionPhases,
  onDataChange,
} from '../db';
import { uid, now } from './ids';
import { freshPhases } from './commissioning';
import type { CommissionItem, Program, Material, Check, Punch, Task, Run, Severity, Phase } from './commissioning';

export interface CommissionState {
  loading: boolean;
  items: CommissionItem[];
  /** The stages this line goes through. Empty until the programme is started —
   *  which is deliberate: six rows of blank dates on a project nobody has
   *  planned yet is clutter pretending to be a plan. */
  phases: Phase[];
  /** Lay out the six stages for the first time. */
  startProgramme: () => Promise<void>;
  savePhase: (p: Phase) => Promise<void>;
  addProgram: (title: string, agreedRate: number, asset?: string, unit?: string, phaseId?: string) => Promise<void>;
  addMaterial: (title: string, need: number, asset?: string, unit?: string, phaseId?: string) => Promise<void>;
  addCheck: (title: string, criterion: string, asset?: string, phaseId?: string) => Promise<void>;
  addPunch: (title: string, severity: Severity, asset?: string, phaseId?: string) => Promise<void>;
  addTask: (title: string, asset?: string, phaseId?: string) => Promise<void>;
  /** Record a run against a program — the evidence for its rate. */
  addRun: (programId: string, run: Omit<Run, 'id'>) => Promise<void>;
  save: (i: CommissionItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
  seed: (items: CommissionItem[]) => Promise<void>;
}

export function useCommission(projectId: string): CommissionState {
  const [items, setItems] = useState<CommissionItem[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [i, p] = await Promise.all([listCommissionItems(projectId), listCommissionPhases(projectId)]);
    setItems(i);
    setPhases(p);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  /** Appended, not inserted: a new row belongs at the bottom of its list, where
   *  the person who just typed it is looking. */
  const nextSort = useCallback(() => items.reduce((n, i) => Math.max(n, i.sort), 0) + 1, [items]);

  const base = useCallback((title: string, asset?: string, phaseId?: string) => {
    const t = now();
    return { id: uid(), projectId, title: title.trim(), asset, phaseId, sort: nextSort(), createdAt: t, updatedAt: t };
  }, [projectId, nextSort]);

  const addProgram = useCallback(async (title: string, agreedRate: number, asset?: string, unit?: string, phaseId?: string) => {
    const p: Program = { ...base(title, asset, phaseId), kind: 'program', agreedRate, rateUnit: unit || 'ppm', written: false, runs: [] };
    await putCommissionItem(p);
  }, [base]);

  const addMaterial = useCallback(async (title: string, need: number, asset?: string, unit?: string, phaseId?: string) => {
    const m: Material = { ...base(title, asset, phaseId), kind: 'material', need, have: 0, onOrder: 0, unit };
    await putCommissionItem(m);
  }, [base]);

  const addCheck = useCallback(async (title: string, criterion: string, asset?: string, phaseId?: string) => {
    const c: Check = { ...base(title, asset, phaseId), kind: 'check', criterion: criterion.trim(), outcome: 'notRun' };
    await putCommissionItem(c);
  }, [base]);

  const addPunch = useCallback(async (title: string, severity: Severity, asset?: string, phaseId?: string) => {
    const p: Punch = { ...base(title, asset, phaseId), kind: 'punch', severity, raisedAt: now() };
    await putCommissionItem(p);
  }, [base]);

  const addTask = useCallback(async (title: string, asset?: string, phaseId?: string) => {
    const t: Task = { ...base(title, asset, phaseId), kind: 'task', state: 'todo' };
    await putCommissionItem(t);
  }, [base]);

  const save = useCallback(async (i: CommissionItem) => {
    await putCommissionItem({ ...i, updatedAt: now() });
  }, []);

  /* A run is appended to the program it proves. Kept on the program rather than
     in a list of its own because a rate means nothing without the product it was
     run on, and every question anybody asks starts from the product. */
  const addRun = useCallback(async (programId: string, run: Omit<Run, 'id'>) => {
    const p = items.find(i => i.id === programId);
    if (!p || p.kind !== 'program') return;
    const next: Program = {
      ...p,
      // a run only happens on a machine whose program exists
      written: true,
      runs: [...(p.runs ?? []), { ...run, id: uid() }],
      updatedAt: now(),
    };
    await putCommissionItem(next);
  }, [items]);

  const remove = useCallback(async (id: string) => { await deleteCommissionItem(id); }, []);

  const seed = useCallback(async (rows: CommissionItem[]) => { await putCommissionItems(rows); }, []);

  /* The six stages, laid out with NO DATES. Inventing a baseline would put an
     agreement in the file that nobody made, and a baseline nobody agreed is
     worse than none — everything measures late or early against a fiction. */
  const startProgramme = useCallback(async () => {
    if (phases.length) return;
    await putCommissionPhases(freshPhases(projectId, uid, now()));
  }, [projectId, phases.length]);

  const savePhase = useCallback(async (p: Phase) => {
    await putCommissionPhase({ ...p, updatedAt: now() });
  }, []);

  return {
    loading, items, phases, startProgramme, savePhase,
    addProgram, addMaterial, addCheck, addPunch, addTask, addRun, save, remove, seed,
  };
}
