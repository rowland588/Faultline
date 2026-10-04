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
  /* A pass already running answers the call above by queueing one, and
     returns at once: wait for the real answer rather than read a status that
     is still "syncing". */
  for (let i = 0; i < 100 && syncStatus().state === 'syncing'; i++) await new Promise(r => setTimeout(r, 200));
  const s = syncStatus();
  /* It used to ask only "error, or files waiting". With no signal the pass
     reported "signed out" rather than an error, no file was waiting, and the
     phone's database — a clip and a finding made offline — was wiped
     (scripts/sync-two-devices.mjs, scenario 3). Now: anything unsent at all,
     any pass still running, or any file the cloud refused as too big, and
     the answer is no. */
  const unsent = s.unsent ?? 0, big = s.tooBig?.length ?? 0;
  if (s.state === 'error' || s.state === 'syncing' || s.state === 'signedout' || (s.pendingUp ?? 0) > 0 || unsent > 0 || big > 0) {
    return { ok: false, reason: big > 0
      ? `${big} file${big === 1 ? ' is' : 's are'} too large for the cloud and only on this device — signing out would delete ${big === 1 ? 'it' : 'them'}. Save ${big === 1 ? 'it' : 'them'} somewhere else or take ${big === 1 ? 'it' : 'them'} off the record first.`
      : s.state === 'error' || unsent > 0 || s.state !== 'idle'
      ? `Some of this device's work has not reached the cloud yet${unsent ? ` (${unsent} change${unsent === 1 ? '' : 's'})` : ''}${s.error ? ` — ${s.error}` : ''}. Get a signal, wait for it to sync, then sign out.`
      : `${s.pendingUp} file${s.pendingUp === 1 ? '' : 's'} on this device ${s.pendingUp === 1 ? 'has' : 'have'} not uploaded yet. Get a signal, wait for the upload, then sign out.` };
  }
  await supabase.auth.signOut();
  await wipeLocalData();
  return { ok: true };
}
