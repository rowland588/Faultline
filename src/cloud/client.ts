/* The Supabase client — the OPTIONAL cloud mirror. Finder stays local-first:
 * with no env vars (or signed out) the app runs fully offline on IndexedDB.
 * Set the two VITE_SUPABASE_* vars to enable backup + multi-device sync. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the build was given Supabase credentials — cloud sync is possible. */
export const cloudConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url as string, key as string, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
