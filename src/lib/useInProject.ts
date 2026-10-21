/* THE PROJECT A TOOL'S PAGE IS OPENED IN (lib/inProject; docs/PROJECTS.md,
 * P2) — read from the page's address, with the factory's lines the project
 * is on: its own records are listed first, a new one is made on it, on its
 * line when it has one. Undefined outside a project, or for one that no
 * longer exists (an old link), so nothing is ever made on a project that
 * is not there. */
import { useEffect, useMemo, useState } from 'react';
import { loadPaceLines, onDataChange } from '../db';
import { asked } from './lines';
import { useProjects } from './useProjects';
import type { Project } from '../types';

export interface InProject {
  /** The project's id — only once it is known to exist. */
  id?: string;
  project?: Project;
  /** The factory's lines the project is on, in its own order. */
  lineIds: string[];
}

export function useInProject(): InProject {
  const asked0 = useMemo(() => asked('project'), []);
  const { projects, archived, loading } = useProjects();
  const [lineIds, setLineIds] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    if (!asked0) return;
    const load = () => void loadPaceLines(asked0).then(rows => {
      if (live) setLineIds([...new Set(rows.flatMap(r => (r.workspaceId ? [r.workspaceId] : [])))]);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [asked0]);
  const project = asked0 ? projects.find(p => p.id === asked0) ?? archived.find(p => p.id === asked0) : undefined;
  return { ...(project ? { id: project.id, project } : loading && asked0 ? { id: asked0 } : {}), lineIds };
}
