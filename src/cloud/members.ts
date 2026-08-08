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
