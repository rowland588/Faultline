/* The projects list — every improvement initiative this person can open.
 *
 * There may be none. The app used to mint one called Project Pace on every
 * device, seeded with one factory's lines and undeletable; a person's first
 * project is now the one they start, or the one they are invited to.
 *
 * Like the lines, this re-reads on any data change, so a project created on the
 * laptop shows up on the phone without a reload. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ensureProjects, createProject, updateProject, deleteProject, onDataChange,
  archiveProject, restoreProject, purgeProject, projectContents,
} from '../db';
import type { Project } from '../types';
import type { PlanModel } from './planModel';

export interface ProjectsState {
  loading: boolean;
  /** The live list — what the screen shows. Archived projects are not in it. */
  projects: Project[];
  /** Put away, and gettable back. Kept separate so no screen has to remember
   *  to filter: forgetting the filter is how an archive stops being one. */
  archived: Project[];
  create: (name: string, lead?: string, model?: PlanModel) => Promise<Project>;
  rename: (p: Project, patch: Partial<Project>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  /** Gone for good, with everything the project owns. Only ever offered from
   *  the archive, so nothing can be destroyed in one step from the main list. */
  purge: (id: string) => Promise<void>;
  /** What a purge would take, counted so the confirm can say it out loud. */
  contents: (id: string) => Promise<{ store: string; count: number }[]>;
}

/** The palette new projects take their accent from, in order — so two projects
 *  made in a row never look the same, and nobody has to pick a colour. */
const COLORS = ['#2b87d4', '#1f8a4c', '#b4632a', '#7a4fd0', '#0f766e', '#c0392b'];

export function useProjects(): ProjectsState {
  const [all, setAll] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setAll(await ensureProjects());
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

  /* Split once, here, rather than filtered at each call site. A screen that
     forgets the filter shows archived projects in the live list, which makes
     the archive pointless in the quietest possible way. */
  const projects = all.filter(p => !p.archivedAt);
  const archived = all.filter(p => p.archivedAt)
    .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));

  return {
    loading, projects, archived,
    create: async (name: string, lead?: string, model?: PlanModel) => {
      const p = await createProject(name, COLORS[all.length % COLORS.length], lead, undefined, model);
      await refresh();
      return p;
    },
    rename: async (p: Project, patch: Partial<Project>) => {
      await updateProject({ ...p, ...patch });
      await refresh();
    },
    /* EVERY project can be archived and deleted, including the one the app used
       to ship with. It was exempted from all three of these, which meant the one
       project nobody chose was the one project nobody could get rid of. */
    remove: async (id: string) => { await deleteProject(id); await refresh(); },
    archive: async (id: string) => { await archiveProject(id); await refresh(); },
    restore: async (id: string) => { await restoreProject(id); await refresh(); },
    purge: async (id: string) => { await purgeProject(id); await refresh(); },
    contents: (id: string) => projectContents(id),
  };
}

/** One project by id, from the same live list — so a rename anywhere redraws
 *  everywhere. `null` while loading, `undefined` when there is no such project
 *  (a stale bookmark), which the caller shows as a way back rather than a crash. */
export function useProject(id: string): { loading: boolean; project: Project | undefined } {
  const { loading, projects } = useProjects();
  return { loading, project: projects.find(p => p.id === id) };
}
