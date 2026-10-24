/* THE LINE A RUN TEST IS ON, for its money (lib/runMoney runLineOf — the
 * machine's line, else the project's one line): its record, kept fresh as the
 * factory changes. */
import { useEffect, useState } from 'react';
import { allPaceLines, listAssets, listWorkspaces, onDataChange } from '../db';
import { runLineOf } from './runMoney';
import type { Test } from './testing';
import type { Workspace } from '../types';

export function useRunLine(t: Pick<Test, 'assetId' | 'projectId'>): Workspace | undefined {
  const [line, setLine] = useState<Workspace | undefined>(undefined);
  useEffect(() => {
    let gone = false;
    const load = async () => {
      const [assets, lines, ws] = await Promise.all([listAssets(t.projectId), allPaceLines(), listWorkspaces()]);
      if (!gone) setLine(runLineOf(t, assets, lines, ws));
    };
    void load();
    const off = onDataChange(() => { void load(); });
    return () => { gone = true; off(); };
  }, [t.assetId, t.projectId]);   // eslint-disable-line react-hooks/exhaustive-deps -- the test's id fields are what the line depends on
  return line;
}
