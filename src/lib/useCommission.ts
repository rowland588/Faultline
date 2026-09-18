/* The commissioning list for one project, live.
 *
 * Same shape as every other data hook here: reads on mount, re-reads on any
 * write from anywhere, so the list edited on a laptop is already right on the
 * phone in somebody's pocket on the factory floor. */
import { useCallback, useEffect, useState } from 'react';
import {
  listCommissionItems, putCommissionItem, putCommissionItems,
  deleteCommissionItem, onDataChange,
} from '../db';
import { uid, now } from './ids';
import type { CommissionItem, ItemKind } from './commissioning';

export interface CommissionState {
  loading: boolean;
  items: CommissionItem[];
  add: (stream: string, kind: ItemKind, title: string, asset?: string) => Promise<void>;
  save: (i: CommissionItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
  seed: (items: Omit<CommissionItem, 'id' | 'projectId' | 'sort' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
}

export function useCommission(projectId: string): CommissionState {
  const [items, setItems] = useState<CommissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setItems(await listCommissionItems(projectId));
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  const add = useCallback(async (stream: string, kind: ItemKind, title: string, asset?: string) => {
    const t = now();
    await putCommissionItem({
      id: uid(), projectId, asset, stream, kind, title,
      // A new item starts in the state that means "we know about it and that is
      // all" — never a default that quietly claims progress nobody has made.
      ...(kind === 'check' ? { stage: 'none' as const } : {}),
      ...(kind === 'task' ? { taskStage: 'todo' as const } : {}),
      ...(kind === 'supply' ? { need: 0, have: 0, onOrder: 0 } : {}),
      sort: Date.now(), createdAt: t, updatedAt: t,
    });
  }, [projectId]);

  const save = useCallback(async (i: CommissionItem) => { await putCommissionItem(i); }, []);
  const remove = useCallback(async (id: string) => { await deleteCommissionItem(id); }, []);

  const seed = useCallback(async (
    rows: Omit<CommissionItem, 'id' | 'projectId' | 'sort' | 'createdAt' | 'updatedAt'>[],
  ) => {
    const t = now();
    await putCommissionItems(rows.map((r, n) => ({
      ...r, id: uid(), projectId, sort: t + n, createdAt: t, updatedAt: t,
    })));
  }, [projectId]);

  return { loading, items, add, save, remove, seed };
}
