import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Project ref for the fake sign-in token in acceptance scripts — must match VITE_SUPABASE_URL on the dev server. */
export function smokeSupabaseRef(root = process.cwd()) {
  if (process.env.SMOKE_SUPABASE_REF?.trim()) return process.env.SMOKE_SUPABASE_REF.trim();
  const fromEnv = refFromUrl(process.env.VITE_SUPABASE_URL);
  if (fromEnv) return fromEnv;
  try {
    const local = readFileSync(join(root, '.env.local'), 'utf8');
    const url = local.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
    const fromFile = refFromUrl(url);
    if (fromFile) return fromFile;
  } catch { /* no local env */ }
  return 'testproj';
}

function refFromUrl(url) {
  if (!url) return '';
  const m = String(url).trim().match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? '';
}