/* The team: everyone invited into this Faultline. Shared workspaces mean every
 * row can carry a captor — this resolves their auth id to a human-readable name
 * so the UI can say "logged by Dave" instead of a uuid. Cached per session;
 * refreshed quietly so a new joiner shows up without a reload. */
import { useEffect, useState } from 'react';
import { supabase } from './client';
import { useSession } from './session';

export interface TeamMember { id: string; email: string; name: string }

/** "rowland.glew@x.com" → "rowland.glew" — enough of a name until profiles
 *  carry real display names. */
export const displayName = (email: string | null | undefined): string =>
  (email ?? '').split('@')[0] || 'teammate';

let cache: TeamMember[] | null = null;
const listeners = new Set<() => void>();

async function refresh(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.from('profiles').select('id, email').order('created_at', { ascending: true });
  if (data) {
    cache = (data as Array<{ id: string; email: string | null }>).map(p => ({
      id: p.id, email: p.email ?? '', name: displayName(p.email),
    }));
    listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });
  }
}

/** All registered team members, and a lookup for row attribution. */
export function useTeam(): { members: TeamMember[]; whoIs: (id?: string) => TeamMember | undefined; myId?: string } {
  const { session } = useSession();
  const [members, setMembers] = useState<TeamMember[]>(cache ?? []);
  useEffect(() => {
    const off = () => setMembers(cache ?? []);
    listeners.add(off);
    if (session) void refresh();
    return () => { listeners.delete(off); };
  }, [session]);
  return {
    members,
    whoIs: (id?: string) => (id ? members.find(m => m.id === id) : undefined),
    myId: session?.user.id,
  };
}
