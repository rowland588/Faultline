/* Where the backend lives.
 *
 * Resolution: build-time env vars, else the baked-in constants below. The
 * constants exist so the app is never at the mercy of a host's env-var settings
 * being right at build time — a mis-set var used to ship an app with no sign-in
 * at all, silently. This is normal practice: the anon/publishable key is PUBLIC
 * by design and ships inside the JavaScript of every Supabase web app. Access is
 * controlled by row-level security and the invite gate on the server, never by
 * hiding this key.
 *
 * Users never see or enter any of this. */

/** Baked-in backend. Set these and every device works with zero configuration. */
const BAKED_URL = '';
const BAKED_KEY = '';

export interface CloudConfig { url: string; key: string }

const clean = (v: string | undefined): string => (v ?? '').trim().replace(/\/+$/, '');

function resolve(): CloudConfig | null {
  const envUrl = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined);
  const envKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if (envUrl && envKey) return { url: envUrl, key: envKey };
  const url = clean(BAKED_URL), key = clean(BAKED_KEY);
  return url && key ? { url, key } : null;
}

export const cloudConfig: CloudConfig | null = resolve();
