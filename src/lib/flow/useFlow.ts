/* THE SCREENS' SIDE OF A METHOD — a project running one, read once and read
 * again whenever anything is written here or synced in (db onDataChange),
 * and who is acting, for every operation's context (lib/flow/operations).
 *
 * `undefined` while it is read; `null` when the project runs no method on
 * this device (or its method has not reached it yet). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listMethods, onDataChange } from '../../db';
import { todayISO } from '../weeks';
import { useSession } from '../../cloud/session';
import { can as canOf, type Access } from '../access';
import { loadFlowProject, type FlowProject, type OpContext } from './operations';
import type { Method } from './records';

export function useFlowProject(projectId: string): { fp: FlowProject | null | undefined; reload: () => Promise<void> } {
  const [fp, setFp] = useState<FlowProject | null | undefined>(undefined);
  const reload = useCallback(async () => {
    const next = await loadFlowProject(projectId, todayISO());
    setFp(next ?? null);
  }, [projectId]);
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const load = () => void loadFlowProject(projectId, todayISO()).then(next => { if (live) setFp(next ?? null); });
    load();
    /* a burst of writes is one read, a moment later */
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(load, 120); });
    return () => { live = false; window.clearTimeout(timer); off(); };
  }, [projectId]);
  return { fp, reload };
}

/** Every method on the device, read again on any write. */
export function useMethods(): Method[] | undefined {
  const [ms, setMs] = useState<Method[] | undefined>(undefined);
  useEffect(() => {
    let live = true;
    const load = () => void listMethods().then(rows => { if (live) setMs(rows); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return ms;
}

/** Who is acting, as an operation records it: the signed-in address, or this
 *  device's own when nobody is signed in. */
export function useWho(): string {
  const { session } = useSession();
  return session?.user.email ?? 'This device';
}

/** The context every operation is given — who, what they may do, today. */
export function useOpContext(level: Access): OpContext {
  const who = useWho();
  return useMemo(() => ({ who, can: canOf(level), today: todayISO() }), [who, level]);
}
