/* Where the cloud credentials come from. Resolution order:
 *   1. Build-time env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *   2. A value saved in this browser via the in-app Setup screen
 *   3. Baked-in fallback constants (below)
 *
 * Why three: env vars are baked in at BUILD time, so a host that has them set
 * but built earlier ships an app with no cloud — silently, with no sign-in and
 * no sync. That failure is invisible and undiagnosable from the outside, and it
 * has cost real work. The Setup screen means the app can always be pointed at
 * its backend in 30 seconds, from any device, with no redeploy.
 *
 * The anon/publishable key is PUBLIC by design — it ships inside the JavaScript
 * either way. Row-level security is what protects the data, not key secrecy. */

const LS_KEY = 'faultline.cloud';

/** Baked-in defaults. Fill these in to make every device work with zero setup. */
const FALLBACK_URL = '';
const FALLBACK_KEY = '';

export interface CloudConfig { url: string; key: string }

const clean = (v: string | undefined): string => (v ?? '').trim().replace(/\/+$/, '');

function fromStorage(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<CloudConfig>;
    const url = clean(p.url), key = clean(p.key);
    return url && key ? { url, key } : null;
  } catch { return null; }
}

function resolve(): CloudConfig | null {
  const envUrl = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined);
  const envKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if (envUrl && envKey) return { url: envUrl, key: envKey };
  const saved = fromStorage();
  if (saved) return saved;
  const fbUrl = clean(FALLBACK_URL), fbKey = clean(FALLBACK_KEY);
  return fbUrl && fbKey ? { url: fbUrl, key: fbKey } : null;
}

export const cloudConfig: CloudConfig | null = resolve();

/** Where the active config came from — surfaced in Setup so it's never a mystery. */
export const configSource: 'env' | 'saved' | 'built-in' | 'none' = (() => {
  if (!cloudConfig) return 'none';
  const envUrl = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined);
  const envKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if (envUrl && envKey) return 'env';
  return fromStorage() ? 'saved' : 'built-in';
})();

/** Validate + save credentials for this browser, then reload so the client
 *  rebuilds against them. Throws with a plain-English reason if they're wrong. */
export function saveCloudConfig(urlRaw: string, keyRaw: string): void {
  const url = clean(urlRaw), key = clean(keyRaw);
  if (!url || !key) throw new Error('Both the Project URL and the anon key are needed.');
  if (!/^https:\/\/[^/\s]+$/.test(url)) throw new Error('The Project URL should look like https://abcdefgh.supabase.co');
  if (key.length < 20) throw new Error("That anon key looks too short — copy the whole 'anon' / 'publishable' key.");
  localStorage.setItem(LS_KEY, JSON.stringify({ url, key }));
  window.location.reload();
}

/** Forget saved credentials (does not touch env/built-in values). */
export function clearCloudConfig(): void {
  localStorage.removeItem(LS_KEY);
  window.location.reload();
}
