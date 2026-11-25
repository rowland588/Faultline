import { supabase } from '../cloud/client';
import type { CapCtx } from './types';

// The role belongs to the authenticated account. A name, email or model argument cannot grant it.
// Reuse the verification only while executing this particular foreground request.
const checks = new WeakMap<CapCtx, Promise<boolean>>();

export function canReviewCustomers(ctx?: CapCtx): Promise<boolean> {
  if (!ctx?.userId || !supabase) return Promise.resolve(false);
  const existing = checks.get(ctx);
  if (existing) return existing;
  const db = supabase;
  const check = (async () => {
    const { data, error } = await db.auth.getUser();
    if (error || !data.user || data.user.id !== ctx.userId) return false;
    const profile = await db.from('profiles').select('is_super').eq('id', data.user.id).maybeSingle();
    return !profile.error && profile.data?.is_super === true;
  })().catch(() => false);
  checks.set(ctx, check);
  return check;
}
