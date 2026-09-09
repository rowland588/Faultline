/* Workspace people list — who's in this room. Each workspace is independent:
 * its creator owns it and chooses the stakeholders. This is a thin client over
 * `workspace_members`; RLS does the real gatekeeping (owner or superadmin
 * manages the list, members can read it). The list is a live cloud fetch, not
 * part of the offline sync — you manage people while online. */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './client';
import { useSession } from './session';

export interface WsMember { workspace_id: string; email: string; created_at: string }

const norm = (e: string) => e.trim().toLowerCase();

export async function listMembers(workspaceId: string): Promise<WsMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('workspace_members')
    .select('workspace_id, email, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as WsMember[]) ?? [];
}

export async function addMember(workspaceId: string, email: string): Promise<void> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const clean = norm(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('That doesn’t look like an email address.');
  const { error } = await supabase.from('workspace_members')
    .upsert({ workspace_id: workspaceId, email: clean }, { onConflict: 'workspace_id,email' });
  if (error) throw error;
}

export async function removeMember(workspaceId: string, email: string): Promise<void> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const { error } = await supabase.from('workspace_members').delete()
    .eq('workspace_id', workspaceId).eq('email', norm(email));
  if (error) throw error;
}

/** The people list for one workspace, with add/remove that refresh in place. */
export function useMembers(workspaceId: string): {
  members: WsMember[]; loaded: boolean; myEmail: string;
  add: (email: string) => Promise<void>; remove: (email: string) => Promise<void>;
} {
  const { session } = useSession();
  const [members, setMembers] = useState<WsMember[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try { setMembers(await listMembers(workspaceId)); } catch { /* offline — panel shows what it has */ }
    setLoaded(true);
  }, [workspaceId]);

  useEffect(() => { if (session) void refresh(); else setLoaded(true); }, [session, refresh]);

  return {
    members, loaded,
    myEmail: norm(session?.user.email ?? ''),
    add: async (email: string) => { await addMember(workspaceId, email); await refresh(); },
    remove: async (email: string) => { await removeMember(workspaceId, email); await refresh(); },
  };
}

/* ---------- the same idea one level up: people on a PROJECT ----------
 * A project spans several lines, each of which is its own workspace. Being in
 * the project is what lets somebody see the ppm numbers, the next steps, the
 * wins and the report; being in a line's workspace is what lets them work in
 * it. The two lists are separate on purpose — a sponsor reads the project
 * without being handed edit rights on every line in it.
 *
 * `role` is a label, not a permission. Everyone in a project sees the same
 * project; the role says why they are there, which is what the report prints. */
export type ProjectRole = 'lead' | 'sponsor' | 'owner' | 'member';

export interface ProjectMember { project_id: string; email: string; role: ProjectRole; created_at: string }

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('project_members')
    .select('project_id, email, role, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ProjectMember[]) ?? [];
}

export async function addProjectMember(projectId: string, email: string, role: ProjectRole = 'member'): Promise<void> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const clean = norm(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('That doesn’t look like an email address.');
  const { error } = await supabase.from('project_members')
    .upsert({ project_id: projectId, email: clean, role }, { onConflict: 'project_id,email' });
  if (error) throw error;
}

export async function removeProjectMember(projectId: string, email: string): Promise<void> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const { error } = await supabase.from('project_members').delete()
    .eq('project_id', projectId).eq('email', norm(email));
  if (error) throw error;
}

/** The people on one project, with add/remove that refresh in place. Offline it
 *  reports what it last saw rather than an error: you manage people online, but
 *  reading the project must never depend on being online. */
export function useProjectMembers(projectId: string): {
  members: ProjectMember[]; loaded: boolean; myEmail: string; error: string;
  add: (email: string, role?: ProjectRole) => Promise<void>;
  remove: (email: string) => Promise<void>;
} {
  const { session } = useSession();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try { setMembers(await listProjectMembers(projectId)); setError(''); }
    catch (e) {
      // A missing table means the project-teams migration has not been run yet.
      // Say that plainly rather than showing an empty list as if nobody is here.
      const msg = e instanceof Error ? e.message : '';
      setError(/project_members/.test(msg) ? 'Sharing isn’t switched on yet — run PROJECT_TEAMS.sql in Supabase.' : '');
    }
    setLoaded(true);
  }, [projectId]);

  useEffect(() => { if (session) void refresh(); else setLoaded(true); }, [session, refresh]);

  return {
    members, loaded, error,
    myEmail: norm(session?.user.email ?? ''),
    add: async (email: string, role: ProjectRole = 'member') => { await addProjectMember(projectId, email, role); await refresh(); },
    remove: async (email: string) => { await removeProjectMember(projectId, email); await refresh(); },
  };
}
