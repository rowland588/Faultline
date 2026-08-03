/* The isolation boundary, in React. Given the active workspace id from the
 * route, this loads THAT workspace and ONLY its observations, and every screen
 * reads from here. Switching workspace remounts with a new id → a fresh scoped
 * query, never a leaked dataset. */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ID, Workspace, Observation } from '../types';
import {
  getWorkspace, listObservations, addObservation, softDeleteObservation,
  updateWorkspace, setLastWorkspace,
} from '../db';
import { navReplace } from './useRoute';

interface WorkspaceCtx {
  workspace: Workspace;
  observations: Observation[];
  reload: () => Promise<void>;
  addObs: (o: Observation) => Promise<void>;
  removeObs: (id: ID) => Promise<void>;
  patchWorkspace: (patch: Partial<Workspace>) => Promise<void>;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export function useWorkspace(): WorkspaceCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWorkspace must be used inside a WorkspaceProvider');
  return c;
}

export function WorkspaceProvider({ wsId, children }: { wsId: ID; children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [missing, setMissing] = useState(false);

  const reload = useCallback(async () => {
    const ws = await getWorkspace(wsId);
    if (!ws) { setMissing(true); return; }
    setWorkspace(ws);
    setObservations(await listObservations(wsId));
  }, [wsId]);

  useEffect(() => {
    setWorkspace(null);
    setObservations([]);
    setMissing(false);
    void setLastWorkspace(wsId);
    void reload();
  }, [wsId, reload]);

  const addObs = useCallback(async (o: Observation) => {
    await addObservation(o);
    setObservations(await listObservations(wsId));
  }, [wsId]);

  const removeObs = useCallback(async (id: ID) => {
    await softDeleteObservation(id);
    setObservations(await listObservations(wsId));
  }, [wsId]);

  const patchWorkspace = useCallback(async (patch: Partial<Workspace>) => {
    const cur = await getWorkspace(wsId);
    if (!cur) return;
    const next = { ...cur, ...patch };
    await updateWorkspace(next);
    setWorkspace(next);
  }, [wsId]);

  if (missing) { navReplace('/'); return null; }
  if (!workspace) return null; // brief; boot is already gated

  return (
    <Ctx.Provider value={{ workspace, observations, reload, addObs, removeObs, patchWorkspace }}>
      {children}
    </Ctx.Provider>
  );
}
