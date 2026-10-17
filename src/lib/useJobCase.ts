/* THE JOB'S CASE, WHEREVER THE JOB IS READ (docs/CASE.md) — its lines from
 * Your factory and its measure on each (lib/businessCase caseLinesOf), read
 * fresh on every change, so a margin changed in Your factory or a reading
 * taken on the line moves the case on the page at once. Undefined while
 * being read. */
import { useEffect, useState } from 'react';
import { allPaceLines, getProject, listReadings, listTargets, listWorkspaces, onDataChange } from '../db';
import { caseLinesOf, type CaseLineFacts } from './businessCase';
import { todayISO } from './weeks';

export function useCaseLines(projectId: string): CaseLineFacts[] | undefined {
  const [got, setGot] = useState<CaseLineFacts[] | undefined>();
  useEffect(() => {
    let live = true;
    setGot(undefined);
    const load = () => void (async () => {
      const [p, jobLines, all, targets, readings] = await Promise.all([getProject(projectId), allPaceLines(), listWorkspaces(), listTargets(projectId), listReadings(projectId)]);
      if (live) setGot(caseLinesOf(projectId, p ?? {}, jobLines, all, targets, readings, todayISO()));
    })();
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return got;
}
