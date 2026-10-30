/* HOW MUCH EACH APP TOOL HAS BEEN USED (docs/TOOLS-SHOWCASE.md, TG1) — read from the records the
 * app already keeps, across the factory: a tool's studies, and a standard for the two that are
 * standards. Nothing new is stored. `n` is absent for a tool whose records this reader does not
 * count (a log, a talk), and the card then says nothing about use rather than "none". */
import { useEffect, useState } from 'react';
import { listAllStandards, listAllStudies, onDataChange } from '../db';
import { APP_TOOLS, type AppTool } from '../catalogue/registry';
import { usesOf } from '../screens/ProjectToolsScreen';
import type { ToolStudy } from '../lib/study';
import type { Standard } from '../tools/linestandard/standard';

export type ToolUse = { n?: number; latest?: string };

/** The factory's use of every app tool, by key; null while it reads. */
export function useToolUse(): Record<string, ToolUse> | null {
  const [got, setGot] = useState<{ studies: ToolStudy[]; standards: Standard[] } | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all([listAllStudies(), listAllStandards()]).then(([studies, standards]) => { if (live) setGot({ studies, standards }); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  if (!got) return null;
  const out: Record<string, ToolUse> = {};
  for (const t of APP_TOOLS as readonly AppTool[]) out[t.key] = usesOf(t, got.studies, got.standards);
  return out;
}

/** The words a card says about use — never a colour, never "none" for a tool that is not counted. */
export const usedSaid = (u: ToolUse | undefined): string | undefined =>
  !u || u.n === undefined ? undefined : u.n ? `Used · ${u.n} record${u.n === 1 ? '' : 's'}` : 'Not used yet';
