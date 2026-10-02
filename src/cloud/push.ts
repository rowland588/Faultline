/* PUSH — a reminder that rings when the app is closed.
 *
 * The device says yes once (the Notification permission); this then registers
 * its push address with the cloud so supabase/functions/remind can reach it.
 * The address can rotate, so it is re-registered quietly on every start while
 * permission stands. Nothing here decides what to say — the function uses the
 * same rule as lib/reminders.ts. */
import { supabase } from './client';

const toKey = (b64url: string): Uint8Array<ArrayBuffer> => {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export const pushSupported = (): boolean =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Register this device for reminders. Returns false when it cannot (no
 *  worker, no cloud, the push service said no) — the cards still say it. */
export async function subscribePush(): Promise<boolean> {
  if (!pushSupported() || !supabase || Notification.permission !== 'granted') return false;
  try {
    const { data: key } = await supabase.rpc('push_public_key');
    if (!key) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription()
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key as string) });
    const j = sub.toJSON();
    const { data: me } = await supabase.auth.getUser();
    if (!me.user || !j.endpoint || !j.keys) return false;
    const { error } = await supabase.from('push_subscriptions')
      .upsert({ endpoint: j.endpoint, user_id: me.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
    return !error;
  } catch { return false; }
}

/** Stop reminders reaching this device. */
export async function unsubscribePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  } catch { /* nothing to undo */ }
}

/** Is this device registered right now? */
export async function pushRegistered(): Promise<boolean> {
  if (!pushSupported()) return false;
  try { return !!(await (await navigator.serviceWorker.ready).pushManager.getSubscription()); } catch { return false; }
}
