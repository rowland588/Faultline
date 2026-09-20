/* The commissioning records for one project: the machines, the packs, and the
 * claims about them.
 *
 * A separate maker per kind rather than one `add(kind, title)`: a program needs
 * an agreed rate the moment it exists, a material needs a quantity, a defect
 * needs a grade. A single generic add is what produced records with nothing in
 * them but a title, which is how the first version of this ended up unable to
 * answer whether the line could be accepted.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listCommissionItems, putCommissionItem, putCommissionItems, deleteCommissionItem,
  listCommissionAssets, putCommissionAsset, deleteCommissionAsset, assetContents,
  listCommissionPacks, putCommissionPack, deleteCommissionPack, packContents,
  onDataChange,
} from '../db';
import { uid, now } from './ids';
import { grid, sortBetween, standing, STARTER_CHECKS } from './commissioning';
import type {
  Asset, AssetState, Check, CommissionItem, DocRef, Grid, Material, Pack,
  Program, Punch, Run, Severity, Standing, Task,
} from './commissioning';

/** What every maker needs to know: which machine, which pack, how badly. */
export interface Where {
  assetId?: string;
  packId?: string;
  grade?: Severity;
  owner?: string;
  due?: string;
}

export interface CommissionState {
  loading: boolean;
  items: CommissionItem[];
  assets: Asset[];
  packs: Pack[];
  /** The whole answer, derived. Never assembled by a screen. */
  standing: Standing;
  /** Every asset against every pack. */
  grid: Grid;

  /* ---- the machines ---- */
  addAsset: (name: string, oem?: string, state?: AssetState) => Promise<string>;
  saveAsset: (a: Asset) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;
  /** What removing a machine would take with it, so the warning says a number. */
  assetCost: (id: string) => Promise<{ items: number }>;
  /** Attach a file the OEM sent. The bytes are already in the blob store. */
  addDoc: (assetId: string, doc: Omit<DocRef, 'id' | 'savedAt'>) => Promise<void>;
  markDocRead: (assetId: string, docId: string) => Promise<void>;
  removeDoc: (assetId: string, docId: string) => Promise<void>;

  /* ---- the packs ---- */
  addPack: (name: string, afterSort?: number) => Promise<string>;
  savePack: (p: Pack) => Promise<void>;
  removePack: (id: string) => Promise<void>;
  packCost: (id: string) => Promise<{ items: number }>;

  /* ---- the claims ---- */
  addProgram: (title: string, agreedRate: number, where?: Where, unit?: string) => Promise<void>;
  addMaterial: (title: string, need: number, where?: Where, unit?: string, spec?: string) => Promise<void>;
  addCheck: (title: string, criterion: string, where?: Where) => Promise<void>;
  addPunch: (title: string, severity: Severity, where?: Where) => Promise<void>;
  addTask: (title: string, where?: Where) => Promise<void>;
  /** Give a new machine the four things an acceptance usually turns on. Every
   *  one of them can then be renamed, deleted or added to. */
  addStarterChecks: (assetId: string) => Promise<void>;
  /** Record a run against a program — the evidence for its rate, including the
   *  material spec it was got on. */
  addRun: (programId: string, run: Omit<Run, 'id'>) => Promise<void>;
  save: (i: CommissionItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
  seed: (items: CommissionItem[]) => Promise<void>;
}

export function useCommission(projectId: string): CommissionState {
  const [items, setItems] = useState<CommissionItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [i, a, p] = await Promise.all([
      listCommissionItems(projectId), listCommissionAssets(projectId), listCommissionPacks(projectId),
    ]);
    setItems(i); setAssets(a); setPacks(p);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  /** Appended, not inserted: a new row belongs at the bottom of its list, where
   *  the person who just typed it is looking. */
  const nextSort = useCallback(() => items.reduce((n, i) => Math.max(n, i.sort), 0) + 1, [items]);

  const base = useCallback((title: string, w: Where = {}) => {
    const t = now();
    return {
      id: uid(), projectId, title: title.trim(),
      assetId: w.assetId, packId: w.packId, grade: w.grade, owner: w.owner, due: w.due,
      sort: nextSort(), createdAt: t, updatedAt: t,
    };
  }, [projectId, nextSort]);

  /* ------------------------------ machines ------------------------------- */

  const addAsset = useCallback(async (name: string, oem?: string, state: AssetState = 'onSite') => {
    const id = uid();
    const sort = assets.reduce((n, a) => Math.max(n, a.sort), 0) + 1;
    await putCommissionAsset({ id, projectId, name: name.trim(), oem: oem?.trim() || undefined, state, sort, updatedAt: now() });
    return id;
  }, [projectId, assets]);

  const saveAsset = useCallback(async (a: Asset) => { await putCommissionAsset({ ...a, updatedAt: now() }); }, []);

  const removeAsset = useCallback(async (id: string) => { await deleteCommissionAsset(id, projectId); }, [projectId]);

  const assetCost = useCallback((id: string) => assetContents(id, projectId), [projectId]);

  /* A document is metadata on the asset; its bytes are already in the blob store
     and travel by the media pipeline, the same as a snag photo. That is the
     whole reason a PDF the OEM emailed can be opened on the floor with no
     signal. */
  const withDocs = useCallback(async (assetId: string, f: (docs: DocRef[]) => DocRef[]) => {
    const a = assets.find(x => x.id === assetId);
    if (!a) return;
    await putCommissionAsset({ ...a, docs: f(a.docs ?? []), updatedAt: now() });
  }, [assets]);

  const addDoc = useCallback(async (assetId: string, doc: Omit<DocRef, 'id' | 'savedAt'>) => {
    await withDocs(assetId, docs => [...docs, { ...doc, id: uid(), savedAt: now() }]);
  }, [withDocs]);

  const markDocRead = useCallback(async (assetId: string, docId: string) => {
    await withDocs(assetId, docs => docs.map(d => (d.id === docId && !d.readAt ? { ...d, readAt: now() } : d)));
  }, [withDocs]);

  const removeDoc = useCallback(async (assetId: string, docId: string) => {
    await withDocs(assetId, docs => docs.filter(d => d.id !== docId));
  }, [withDocs]);

  /* -------------------------------- packs -------------------------------- */

  const addPack = useCallback(async (name: string, afterSort?: number) => {
    const id = uid();
    await putCommissionPack({ id, projectId, name: name.trim(), sort: sortBetween(packs, afterSort), updatedAt: now() });
    return id;
  }, [projectId, packs]);

  const savePack = useCallback(async (p: Pack) => { await putCommissionPack({ ...p, updatedAt: now() }); }, []);

  const removePack = useCallback(async (id: string) => { await deleteCommissionPack(id, projectId); }, [projectId]);

  const packCost = useCallback((id: string) => packContents(id, projectId), [projectId]);

  /* -------------------------------- claims -------------------------------- */

  const addProgram = useCallback(async (title: string, agreedRate: number, w?: Where, unit?: string) => {
    const p: Program = { ...base(title, w), kind: 'program', agreedRate, rateUnit: unit || 'ppm', written: false, runs: [] };
    await putCommissionItem(p);
  }, [base]);

  const addMaterial = useCallback(async (title: string, need: number, w?: Where, unit?: string, spec?: string) => {
    const m: Material = { ...base(title, w), kind: 'material', need, have: 0, onOrder: 0, unit, spec: spec?.trim() || undefined };
    await putCommissionItem(m);
  }, [base]);

  const addCheck = useCallback(async (title: string, criterion: string, w?: Where) => {
    const c: Check = { ...base(title, w), kind: 'check', criterion: criterion.trim(), outcome: 'notRun' };
    await putCommissionItem(c);
  }, [base]);

  const addPunch = useCallback(async (title: string, severity: Severity, w?: Where) => {
    const p: Punch = { ...base(title, w), kind: 'punch', severity, raisedAt: now() };
    await putCommissionItem(p);
  }, [base]);

  const addTask = useCallback(async (title: string, w?: Where) => {
    const t: Task = { ...base(title, w), kind: 'task', state: 'todo' };
    await putCommissionItem(t);
  }, [base]);

  const addStarterChecks = useCallback(async (assetId: string) => {
    const t = now();
    let sort = nextSort();
    const rows: CommissionItem[] = STARTER_CHECKS.map(s => ({
      id: uid(), projectId, assetId, title: s.title, criterion: s.criterion,
      kind: 'check' as const, outcome: 'notRun' as const,
      sort: sort++, createdAt: t, updatedAt: t,
    }));
    await putCommissionItems(rows);
  }, [projectId, nextSort]);

  const save = useCallback(async (i: CommissionItem) => { await putCommissionItem({ ...i, updatedAt: now() }); }, []);

  /* A run is appended to the program it proves. Kept on the program rather than
     in a list of its own because a rate means nothing without the pack it was
     run on — and, since the film transition, nothing without the material
     either. `provenOn` comes in with the run for exactly that reason. */
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

  /* Derived once per change, in one place, so the screens cannot each compose a
     slightly different answer to the same question. */
  const answer = useMemo(() => standing(items), [items]);
  const board = useMemo(() => grid(assets, packs, items), [assets, packs, items]);

  return {
    loading, items, assets, packs, standing: answer, grid: board,
    addAsset, saveAsset, removeAsset, assetCost, addDoc, markDocRead, removeDoc,
    addPack, savePack, removePack, packCost,
    addProgram, addMaterial, addCheck, addPunch, addTask, addStarterChecks,
    addRun, save, remove, seed,
  };
}
