/* A LINK TO ONE PICTURE OR CLIP — the app's side of supabase/SHARE_LINKS.sql
 * and supabase/functions/share. The owner makes a share for one photo or clip
 * on a test, sends the link, sees how often it was opened, and can stop it.
 * The person with the link opens #/s/<token> with no account.
 *
 * Live-online, like the people list: shares are not part of the offline
 * sync, because a link only means anything when the cloud can serve it. */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './client';
import { useSession } from './session';

export interface Share {
  token: string; project_id: string; test_id: string; blob_key: string;
  kind: 'photo' | 'video'; caption: string | null;
  created_at: string; expires_at: string; revoked_at: string | null;
  views: number; last_viewed_at: string | null;
}

/** How long a link lasts, as the owner picks it. */
export const SHARE_FOR = [
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const;

const b64u = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** 24 random bytes — the whole secret of a link. */
export const newToken = (): string => b64u(crypto.getRandomValues(new Uint8Array(24)));

/** The address a share opens at, on whichever host the app is served from. */
export const shareUrl = (token: string): string => `${location.origin}${location.pathname}#/s/${token}`;

/** Live: open (not stopped, not expired) at this moment. */
export const isLive = (s: Share, now = Date.now()): boolean => !s.revoked_at && Date.parse(s.expires_at) > now;

const asError = (e: { message: string }): Error =>
  new Error(/fetch|network|load failed/i.test(e.message) ? 'Couldn’t reach the cloud — sharing needs a signal.'
    : /row-level security|permission denied|42501/i.test(e.message) ? 'Only the project’s owner can share from it.'
    : e.message);

/** Has this file reached the cloud yet? A clip filmed a minute ago may still be
 *  going up — its link would say "not reached the cloud yet" to whoever opens
 *  it, so the sheet says so to the owner first (found by the share agent). */
export async function inCloud(blobKey: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.storage.from('media').createSignedUrl(blobKey, 10);
  return !error && !!data?.signedUrl;
}

export async function createShare(o: { projectId: string; testId: string; blobKey: string; kind: 'photo' | 'video'; caption?: string; days: number }): Promise<Share> {
  if (!supabase) throw new Error('Sharing needs the cloud.');
  const row = {
    token: newToken(), project_id: o.projectId, test_id: o.testId, blob_key: o.blobKey, kind: o.kind,
    caption: o.caption?.trim() || null,
    expires_at: new Date(Date.now() + o.days * 86_400_000).toISOString(),
  };
  const { data, error } = await supabase.from('shares').insert(row).select('*').single();
  if (error) throw asError(error);
  return data as Share;
}

export async function stopShare(token: string): Promise<void> {
  if (!supabase) throw new Error('Sharing needs the cloud.');
  const { error } = await supabase.from('shares').update({ revoked_at: new Date().toISOString() }).eq('token', token);
  if (error) throw asError(error);
}

/** The shares made for one test, newest first, with make and stop that refresh in place. */
export function useShares(projectId: string, testId: string): {
  shares: Share[]; error: string;
  create: (o: { blobKey: string; kind: 'photo' | 'video'; caption?: string; days: number }) => Promise<Share>;
  stop: (token: string) => Promise<void>;
} {
  const { session } = useSession();
  const [shares, setShares] = useState<Share[]>([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data, error: e } = await supabase.from('shares').select('*')
      .eq('project_id', projectId).eq('test_id', testId).order('created_at', { ascending: false });
    if (e) { setError(/shares/.test(e.message) && !/fetch|network/i.test(e.message) ? 'Sharing isn’t switched on yet.' : ''); return; }
    setError('');
    setShares((data as Share[]) ?? []);
  }, [projectId, testId]);
  useEffect(() => { if (session) void refresh(); }, [session, refresh]);
  return {
    shares, error,
    create: async o => { const s = await createShare({ projectId, testId, ...o }); await refresh(); return s; },
    stop: async token => { await stopShare(token); await refresh(); },
  };
}

/** What the link opens — or why it no longer does. */
export type Opened =
  | { gone: false; kind: 'photo' | 'video'; url: string; poster: string | null; caption: string | null; project: string | null; test: string | null; machine: string | null; by: string | null; until: string }
  | { gone: true; why: string };

/** Asks the share function, with no account, what this token opens. */
export async function openShare(token: string): Promise<Opened> {
  if (!supabase) return { gone: true, why: 'This app has no cloud to open the link from.' };
  const { data, error } = await supabase.functions.invoke('share', { body: { token } });
  if (error) {
    /* supabase-js says a dropped signal as "Failed to send a request to the
       Edge Function" (a FunctionsFetchError), which the browser's own words
       do not cover (found by the share page's check). */
    const noSignal = error.name === 'FunctionsFetchError' || /fetch|network|load failed|failed to send/i.test(error.message);
    return { gone: true, why: noSignal ? 'Couldn’t reach Faultline — check the signal and try again.' : 'This link could not be opened.' };
  }
  const d = data as Record<string, unknown>;
  if (d?.gone) return { gone: true, why: String(d.why ?? 'This link no longer opens anything.') };
  return { gone: false, ...(d as Omit<Extract<Opened, { gone: false }>, 'gone'>) };
}
