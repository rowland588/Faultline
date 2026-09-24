import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, cloudConfigured } from './client';
import { startSync, syncNow, onSyncChange, syncStatus, type SyncStatus } from './sync';
import { wipeLocalData } from '../db/core';

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
/** Sign out, and take this device's copy of the job with it.
 *
 *  It used to clear only the session. The database, the sync cursors and the
 *  device's own settings stayed: on a shared tablet the next person found the
 *  last one's job, usable offline with no login, and a different account then
 *  pushed the first account's rows under its own name. So: one last push, and
 *  if anything has still not reached the cloud the sign-out is refused with
 *  the reason — losing a walk filmed with no signal is the one thing this must
 *  never do. Otherwise the local database and the app's own settings go, and
 *  the next sign-in pulls a clean copy. */
export async function signOut(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!supabase) return { ok: true };
  await syncNow();
  const s = syncStatus();
  if (s.state === 'error' || (s.pendingUp ?? 0) > 0) {
    return { ok: false, reason: s.state === 'error'
      ? `Some of this device's work has not reached the cloud yet (${s.error ?? 'sync failed'}). Get a signal, wait for it to sync, then sign out.`
      : `${s.pendingUp} file${s.pendingUp === 1 ? '' : 's'} on this device ${s.pendingUp === 1 ? 'has' : 'have'} not uploaded yet. Get a signal, wait for the upload, then sign out.` };
  }
  await supabase.auth.signOut();
  await wipeLocalData();
  return { ok: true };
}
