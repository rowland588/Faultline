/* Superadmin & invites. All of this is a thin client over the `profiles` and
 * `allowed_emails` tables — RLS does the real gatekeeping, so a non-super caller
 * simply gets empty lists or a permission error, never elevated access. */
import { useEffect, useState } from 'react';
import { supabase } from './client';
import { useSession } from './session';

export interface Profile { id: string; email: string | null; is_super: boolean; created_at: string }
export interface Invite { email: string; created_at: string }

const norm = (e: string) => e.trim().toLowerCase();

/** The current user's profile — carries the `is_super` flag that gates the panel. */
export function useProfile(): { profile: Profile | null; loading: boolean } {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!supabase || !session) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    void supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (alive) { setProfile((data as Profile) ?? null); setLoading(false); } });
    return () => { alive = false; };
  }, [session]);

  return { profile, loading };
}

export async function listInvites(): Promise<Invite[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('allowed_emails').select('email, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Invite[]) ?? [];
}

export async function addInvite(email: string): Promise<void> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const clean = norm(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('That doesn’t look like an email address.');
  const { error } = await supabase.from('allowed_emails').upsert({ email: clean }, { onConflict: 'email' });
  if (error) throw error;
}

export async function removeInvite(email: string): Promise<void> {
  if (!supabase) throw new Error('Cloud isn’t configured.');
  const { error } = await supabase.from('allowed_emails').delete().eq('email', norm(email));
  if (error) throw error;
}

/** Everyone who has actually registered (superadmin-visible), so the panel can
 *  show which invites have been taken up. */
export async function listProfiles(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Profile[]) ?? [];
}
