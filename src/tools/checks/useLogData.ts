/* WHAT A LOG'S PAGE READS BESIDE ITSELF — the clock, the line it is on (its cost model and rated speed), Line
 * capacity's rate for the line, and the problems on the register. Kept current as anything is written. */
import { useEffect, useMemo, useState } from 'react';
import { getWorkspace, listAllSnags, listAllStudies, listStandardsForLine, onDataChange } from '../../db';
import type { Workspace } from '../../types';
import type { ToolStudy } from '../../lib/study';
import type { Snag } from '../../snag/types';
import type { Standard } from '../linestandard/standard';
import type { LogCtx } from './hold';
import { ctxFrom } from './ctx';

/** The moment, re-read every so often — a check goes from done to due while the page is open. */
export function useNow(everyMs = 20_000, changed?: unknown): number {
  const [t, setT] = useState(() => Date.now());
  /* and again whenever the record changes: a result tapped a moment ago is not in the future */
  useEffect(() => { setT(Date.now()); }, [changed]);
  useEffect(() => {
    const id = window.setInterval(() => setT(Date.now()), everyMs);
    const on = () => setT(Date.now());
    document.addEventListener('visibilitychange', on);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', on); };
  }, [everyMs]);
  return t;
}

/** The line's cost model and rate, as a hold reads them. */
export function useLogCtx(wsId: string | undefined): LogCtx {
  const [line, setLine] = useState<Workspace | undefined>(undefined);
  const [std, setStd] = useState<Standard[]>([]);
  useEffect(() => {
    let live = true;
    if (!wsId) return;
    const load = () => void Promise.all([getWorkspace(wsId), listStandardsForLine(wsId)]).then(([w, st]) => { if (live) { setLine(w); setStd(st); } }).catch(() => {});
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [wsId]);
  return useMemo(() => ctxFrom(line, std, wsId), [line, std, wsId]);
}

/** The register's problems, live — the log reads their state (open, closed) and their owners. */
export function useSnags(): Snag[] {
  const [rows, setRows] = useState<Snag[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listAllSnags().then(r => { if (live) setRows(r); }).catch(() => {});
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return rows;
}

/** Every check log on this device, live. */
export function useLogStudies(): ToolStudy[] | undefined {
  const [rows, setRows] = useState<ToolStudy[] | undefined>(undefined);
  useEffect(() => {
    let live = true;
    const load = () => void listAllStudies().then(r => { if (live) setRows(r.filter(s => s.tool === 'log' && !!s.agreed?.log)); }).catch(() => {});
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return rows;
}
