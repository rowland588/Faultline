/* The projects list — every improvement initiative this person can open.
 *
 * There is always at least one, because the app shipped with Project Pace and
 * the lines already on the user's devices belong to it. Everything else is
 * created here.
 *
 * Like the lines, this re-reads on any data change, so a project created on the
 * laptop shows up on the phone without a reload. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ensureProjects, createProject, updateProject, deleteProject, onDataChange,
  DEFAULT_PROJECT_ID,
} from '../db';
import type { Project } from '../types';

/** What the app shipped with. Only ever used to CREATE the default project the
 *  first time; after that the stored row is the truth and this is ignored, so
 *  renaming it in the app sticks. */
export const DEFAULT_PROJECT = {
  name: 'Project Pace',
  description: 'Packs per minute against quarterly targets, line by line.',
  color: '#2b87d4',
  lead: 'Rowland Glew',
};

export interface ProjectsState {
  loading: boolean;
  projects: Project[];
  create: (name: string, lead?: string) => Promise<Project>;
  rename: (p: Project, patch: Partial<Project>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** The palette new projects take their accent from, in order — so two projects
 *  made in a row never look the same, and nobody has to pick a colour. */
const COLORS = ['#2b87d4', '#1f8a4c', '#b4632a', '#7a4fd0', '#0f766e', '#c0392b'];

export function useProjects(): ProjectsState {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setProjects(await ensureProjects(DEFAULT_PROJECT));
    setLoading(false);
  }, []);

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    void refresh();
    return onDataChange(() => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void refresh(); }, 300);
    });
  }, [refresh]);

  return {
    loading, projects,
    create: async (name: string, lead?: string) => {
      const p = await createProject(name, COLORS[projects.length % COLORS.length], lead);
      await refresh();
      return p;
    },
    rename: async (p: Project, patch: Partial<Project>) => {
      await updateProject({ ...p, ...patch });
      await refresh();
    },
    remove: async (id: string) => {
      // The one project the app ships with stays: its lines carry the ppm
      // history, and there would be nothing to open with it gone.
      if (id === DEFAULT_PROJECT_ID) return;
      await deleteProject(id);
      await refresh();
    },
  };
}

/** One project by id, from the same live list — so a rename anywhere redraws
 *  everywhere. `null` while loading, `undefined` when there is no such project
 *  (a stale bookmark), which the caller shows as a way back rather than a crash. */
export function useProject(id: string): { loading: boolean; project: Project | undefined } {
  const { loading, projects } = useProjects();
  return { loading, project: projects.find(p => p.id === id) };
}
