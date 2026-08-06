/* The isolation boundary, in React. Given the active workspace id from the
 * route, this loads THAT workspace and ONLY its observations, and every screen
 * reads from here. Switching workspace remounts with a new id → a fresh scoped
 * query, never a leaked dataset. */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ID, Workspace, Observation } from '../types';
import {
  getWorkspace, listObservations, addObservation, softDeleteObservation,
  restoreObservation, patchWorkspaceRecord, setLastWorkspace,
} from '../db';
import { navReplace } from './useRoute';
import { BootSplash } from '../ui/Logo';

interface WorkspaceCtx {
  workspace: Workspace;
  observations: Observation[];
  reload: () => Promise<void>;
  addObs: (o: Observation) => Promise<void>;
  removeObs: (id: ID) => Promise<void>;
  restoreObs: (id: ID) => Promise<void>;
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
    try {
      const ws = await getWorkspace(wsId);
      if (!ws) { setMissing(true); return; }
      // Load both before setting state so we never render workspace-with-no-rows
      // (which flashed "Nothing logged yet" / "0 observations").
      const obs = await listObservations(wsId);
      setWorkspace(ws);
      setObservations(obs);
      void setLastWorkspace(wsId); // only remember it once we know it's real (no dangling pointer)
    } catch {
      setMissing(true); // storage unavailable → bounce Home rather than hang blank
    }
  }, [wsId]);

  useEffect(() => {
    setWorkspace(null);
    setObservations([]);
    setMissing(false);
    void reload();
  }, [wsId, reload]);

  useEffect(() => { if (missing) navReplace('/'); }, [missing]);

  const addObs = useCallback(async (o: Observation) => {
    await addObservation(o);
    setObservations(await listObservations(wsId));
  }, [wsId]);

  const removeObs = useCallback(async (id: ID) => {
    await softDeleteObservation(id);
    setObservations(await listObservations(wsId));
  }, [wsId]);

  const restoreObs = useCallback(async (id: ID) => {
    await restoreObservation(id);
    setObservations(await listObservations(wsId));
  }, [wsId]);

  const patchWorkspace = useCallback(async (patch: Partial<Workspace>) => {
    const next = await patchWorkspaceRecord(wsId, patch);
    if (next) setWorkspace(next);
  }, [wsId]);

  if (missing) return null; // redirect happens in the effect above
  if (!workspace) return <BootSplash />; // branded, not a blank flash, while the workspace loads

  return (
    <Ctx.Provider value={{ workspace, observations, reload, addObs, removeObs, restoreObs, patchWorkspace }}>
      {children}
    </Ctx.Provider>
  );
}
