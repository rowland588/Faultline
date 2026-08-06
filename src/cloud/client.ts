/* The Supabase client. Credentials are resolved in ./config (env var → saved in
 * this browser → built-in), so a mis-set or late-added host env var can no
 * longer leave the app silently signed-out with no way in. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cloudConfig } from './config';

/** True when this app knows where its backend is — sign-in and sync are possible. */
export const cloudConfigured = Boolean(cloudConfig);

export const supabase: SupabaseClient | null = cloudConfig
  ? createClient(cloudConfig.url, cloudConfig.key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
