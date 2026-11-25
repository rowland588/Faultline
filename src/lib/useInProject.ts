/* THE PROJECT A TOOL'S PAGE IS OPENED IN (lib/inProject; docs/PROJECTS.md,
 * P2) — read from the page's address, with the factory's lines the project
 * is on: its own records are listed first, a new one is made on it, on its
 * line when it has one. Undefined outside a project, or for one that no
 * longer exists (an old link), so nothing is ever made on a project that
 * is not there. */
import { useEffect, useState } from 'react';
import { loadPaceLines, onDataChange } from '../db';
import { useRoute } from '../state/useRoute';
import { useProjects } from './useProjects';
import type { Project } from '../types';

export interface InProject {
  /** The project's id — only once it is known to exist. */
  id?: string;
  project?: Project;
  /** The requested project and its factory lines have loaded. */
  ready: boolean;
  /** The factory's lines the project is on, in its own order. */
  lineIds: string[];
}

export function useInProject(): InProject {
  const route = useRoute();
  const asked0 = route.query.get('project') ?? '';
  const { projects, archived } = useProjects();
  const [linesFor, setLinesFor] = useState<{ project: string; ids: string[] }>({ project: '', ids: [] });
  useEffect(() => {
    let live = true;
    if (!asked0) return;
    const load = () => void loadPaceLines(asked0).then(rows => {
      if (live) setLinesFor({ project: asked0, ids: [...new Set(rows.flatMap(r => (r.workspaceId ? [r.workspaceId] : [])))] });
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [asked0]);
  const project = asked0 ? projects.find(p => p.id === asked0) ?? archived.find(p => p.id === asked0) : undefined;
  return { ...(asked0 ? { id: asked0 } : {}), ...(project ? { project } : {}), ready: !asked0 || (!!project && linesFor.project === asked0), lineIds: linesFor.project === asked0 ? linesFor.ids : [] };
}
