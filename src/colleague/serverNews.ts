/* NEWS FROM THE SERVER POLL — what changed while the app was shut (23 November 2026, docs/LUNA-G6-SERVER.md).
 *
 * The keepup worker writes a row when a link's fingerprint differs; this module loads unacknowledged rows for the signed-in person
 * and marks them acked when the person dismisses the note (same spirit as keepUp readTold on the device). */
import { supabase } from '../cloud/client';

declare global {
  interface Window { __faultlineServerNews?: ServerNewsRow[] }
}

export interface ServerNewsRow {
  id: string;
  source_id: string;
  file_key: string;
  client: string;
  file_name: string;
  old_hash: string;
  new_hash: string;
  detected_at: string;
}

const TABLE = 'luna_server_news';

/** Rows waiting for this person — newest first. Empty when offline or unsigned. Acceptance sets `window.__faultlineServerNews`. */
export async function fetchServerNews(): Promise<ServerNewsRow[]> {
  if (typeof window !== 'undefined' && window.__faultlineServerNews) return [...window.__faultlineServerNews];
  if (!supabase) return [];
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];
  const { data, error } = await supabase.from(TABLE)
    .select('id, source_id, file_key, client, file_name, old_hash, new_hash, detected_at')
    .is('acked_at', null)
    .order('detected_at', { ascending: false });
  if (error) {
    console.warn('server keep-up news could not be read', error.message);
    return [];
  }
  return (data ?? []) as ServerNewsRow[];
}

/** The person acknowledged the note — Read it, Later or OK. */
export async function ackServerNews(id: string): Promise<void> {
  if (typeof window !== 'undefined' && window.__faultlineServerNews) {
    window.__faultlineServerNews = window.__faultlineServerNews.filter(x => x.id !== id);
    return;
  }
  if (!supabase) return;
  await supabase.from(TABLE).update({ acked_at: new Date().toISOString() }).eq('id', id);
}

/** Keep only news for the customer in hand (or every customer when all are shown). */
export function serverNewsInHand(rows: readonly ServerNewsRow[], client: string, filtering: boolean): ServerNewsRow[] {
  if (!filtering) return [...rows];
  const k = client.trim().toLowerCase();
  return rows.filter(r => !r.client.trim() || r.client.trim().toLowerCase() === k);
}