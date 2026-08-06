import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, cloudConfigured } from './client';
import { startSync, syncNow, onSyncChange, syncStatus, type SyncStatus } from './sync';

/** The signed-in session (null when signed out or cloud isn't configured). */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(cloudConfigured);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); if (data.session) startSync(); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (s) { startSync(); void syncNow(); } });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

/** Live sync status for the UI. */
export function useSyncStatus(): SyncStatus {
  const [s, setS] = useState<SyncStatus>(syncStatus());
  useEffect(() => onSyncChange(() => setS({ ...syncStatus() })), []);
  return s;
}

/** Ticks every time a sync FINISHES. Screens put this in their load effect's
 *  deps so freshly pulled data appears by itself — without it, a device that
 *  syncs in the background keeps showing whatever it read at mount (i.e. an
 *  empty list right after signing in on a new device). */
export function useSyncedAt(): number | null {
  return useSyncStatus().lastSyncedAt;
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync isn’t configured.');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}
export async function signUp(email: string, password: string): Promise<{ needsConfirm: boolean }> {
  if (!supabase) throw new Error('Cloud sync isn’t configured.');
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw mapSignUpError(error);
  return { needsConfirm: !data.session };
}

/** The invite gate lives in a DB trigger, so a rejected sign-up comes back as a
 *  generic auth/DB error. Translate that into the real reason for the user. */
function mapSignUpError(error: { message?: string }): Error {
  const m = (error.message ?? '').toLowerCase();
  if (m.includes('not_invited') || m.includes('database error'))
    return new Error('This email hasn’t been invited yet. Ask your administrator to add it, then try again.');
  return new Error(error.message || 'Could not create your account.');
}
export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}
