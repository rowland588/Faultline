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
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------- the add is the invite ----------
 * The front door is `allowed_emails`: a sign-up whose address is not on it is
 * turned away, and only the superadmin could write that list. So an owner who
 * added a colleague put them on the people list and the screen had to say "the
 * administrator needs to invite them". supabase/OWNER_INVITES.sql gives the
 * owner one call that does both — the front door and the people list — and
 * answers whether that person already has an account, so the screen can say
 * the true thing: nothing new when they do, "sign up" when they don't.
 *
 * On a database that has not run that file yet the call comes back "function
 * not found"; the add then falls through to the plain insert RLS always
 * guarded, and `invited: false` tells the screen the front door is still the
 * administrator's. */
export type AddResult = { invited: true; registered: boolean } | { invited: false };

const rpcMissing = (e: { code?: string; message: string }) =>
  e.code === 'PGRST202' || /invite_member/.test(e.message);
/** supabase-js hands a dead network back as an error object whose message is
 *  the browser's — "TypeError: Failed to fetch" — not a sentence for a screen. */
const offline = (e: { code?: string; message: string }) =>
  !e.code || /fetch|network|load failed/i.test(e.message);
const asError = (e: { code?: string; message: string }): Error =>
  new Error(offline(e) ? 'Couldn’t add them — are you online?' : e.message);

async function invite(kind: 'project' | 'workspace', targetId: string, email: string, role: ProjectRole = 'member'): Promise<AddResult | null> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const { data, error } = await supabase.rpc('invite_member', { kind, target_id: targetId, invitee: email, invitee_role: role });
  if (!error) return { invited: true, registered: data === true };
  if (rpcMissing(error)) return null;
  throw asError(error);
}

export async function listMembers(workspaceId: string): Promise<WsMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('workspace_members')
    .select('workspace_id, email, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as WsMember[]) ?? [];
}

export async function addMember(workspaceId: string, email: string): Promise<AddResult> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const clean = norm(email);
  if (!EMAIL.test(clean)) throw new Error('That doesn’t look like an email address.');
  const done = await invite('workspace', workspaceId, clean);
  if (done) return done;
  const { error } = await supabase.from('workspace_members')
    .upsert({ workspace_id: workspaceId, email: clean }, { onConflict: 'workspace_id,email' });
  if (error) throw asError(error);
  return { invited: false };
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
  /** The list could not be read (offline, or the cloud refused). The panel
   *  must not then say "nobody else" — it does not know. */
  unreached: boolean;
  add: (email: string) => Promise<AddResult>; remove: (email: string) => Promise<void>;
} {
  const { session } = useSession();
  const [members, setMembers] = useState<WsMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unreached, setUnreached] = useState(false);

  const refresh = useCallback(async () => {
    try { setMembers(await listMembers(workspaceId)); setUnreached(false); } catch { setUnreached(true); /* offline — panel shows what it has */ }
    setLoaded(true);
  }, [workspaceId]);

  /* Loaded means READ. Before the session arrives nothing has been asked, so
     the panel says nothing yet rather than "nobody else". */
  useEffect(() => { if (session) void refresh(); }, [session, refresh]);

  return {
    members, loaded, unreached,
    myEmail: norm(session?.user.email ?? ''),
    add: async (email: string) => { const r = await addMember(workspaceId, email); await refresh(); return r; },
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

/** What a person may do on the project (lib/access, supabase/ACCESS_LEVELS.sql):
 *  the team does the work; a client reads it and takes the reports. */
export type ProjectAccess = 'team' | 'client';

export interface ProjectMember { project_id: string; email: string; role: ProjectRole; access?: ProjectAccess; created_at: string }

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ProjectMember[]) ?? [];
}

export async function addProjectMember(projectId: string, email: string, role: ProjectRole = 'member', access: ProjectAccess = 'team'): Promise<AddResult> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const clean = norm(email);
  if (!EMAIL.test(clean)) throw new Error('That doesn’t look like an email address.');
  const done = await invite('project', projectId, clean, role);
  if (!done) {
    const { error } = await supabase.from('project_members')
      .upsert({ project_id: projectId, email: clean, role }, { onConflict: 'project_id,email' });
    if (error) throw asError(error);
  }
  /* The invite writes the person as the team (the column's default); a client
     is set straight after, by the owner, who manages this list anyway. */
  if (access !== 'team') await setProjectAccess(projectId, clean, access, role);
  return done ?? { invited: false };
}

/** Change what somebody may do on the project — and the role that goes with it. */
export async function setProjectAccess(projectId: string, email: string, access: ProjectAccess, role?: ProjectRole): Promise<void> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const { error } = await supabase.from('project_members')
    .update(role ? { access, role } : { access }).eq('project_id', projectId).eq('email', norm(email));
  if (error) throw asError(error);
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
  add: (email: string, role?: ProjectRole, access?: ProjectAccess) => Promise<AddResult>;
  setAccess: (email: string, access: ProjectAccess, role?: ProjectRole) => Promise<void>;
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
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? '';
      /* Not reached is not "nobody": the panel said "Nobody else yet" with no
         signal, a claim it could not know (found by the UI audit). */
      setError(/project_members/.test(msg) && !/fetch|network|load failed/i.test(msg)
        ? 'Sharing isn’t switched on yet — run PROJECT_TEAMS.sql in Supabase.'
        : 'Couldn’t reach the cloud — who is on this project shows once this device is online.');
    }
    setLoaded(true);
  }, [projectId]);

  useEffect(() => { if (session) void refresh(); else setLoaded(true); }, [session, refresh]);

  return {
    members, loaded, error,
    myEmail: norm(session?.user.email ?? ''),
    add: async (email: string, role: ProjectRole = 'member', access: ProjectAccess = 'team') => { const r = await addProjectMember(projectId, email, role, access); await refresh(); return r; },
    setAccess: async (email: string, access: ProjectAccess, role?: ProjectRole) => { await setProjectAccess(projectId, email, access, role); await refresh(); },
    remove: async (email: string) => { await removeProjectMember(projectId, email); await refresh(); },
  };
}
