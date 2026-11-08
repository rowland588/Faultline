/* THE CONSULTANT'S BRAND — who prepared the paper (8 November, docs/STORY.md S1; supabase/BRAND.sql).
 *
 * Rowland, 8 November: "is the first page our app name and business name and name of consultant"; "My business is Streamline
 * Synergy. That's who I am. Faultline is my tool." So every paper's foot and every cover a client is handed says who prepared it: his
 * name, his business, a strapline, a contact line and his logo — typed once (ui/BrandSheet, from the account menu), kept on his
 * profile (profiles.brand, written through set_my_brand) so his phone and laptop agree, and cached on this device so a paper made
 * offline still carries it. Pure but for the cache: the papers read `readBrand()` at the moment they are made. */
import { supabase } from '../cloud/client';

export interface Brand {
  /** The consultant's name — "Rowland Glew". */
  name: string;
  /** The business — "Streamline Synergy". */
  business: string;
  /** One line under the business on a cover — optional. */
  strapline?: string;
  /** How to reach them, one line — an email, a phone — optional. */
  contact?: string;
  /** A small logo as a PNG data URL (resized by the sheet to at most 240 px) — optional. */
  logo?: string;
}

/** Offered the first time, never assumed on a paper until saved: the sheet pre-fills these and he keeps or changes them. */
export const DEFAULT_BRAND: Brand = { name: 'Rowland Glew', business: 'Streamline Synergy' };

const KEY = 'faultline.brand';
let cached: Brand | null | undefined;

const clean = (v: unknown): Brand | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const s = (k: string, max = 120) => (typeof o[k] === 'string' ? (o[k] as string).trim().slice(0, max) : '');
  const name = s('name'), business = s('business');
  if (!name && !business) return null;
  const logo = typeof o.logo === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(o.logo) && o.logo.length < 400_000 ? o.logo : undefined;
  return { name, business, ...(s('strapline') ? { strapline: s('strapline') } : {}), ...(s('contact') ? { contact: s('contact') } : {}), ...(logo ? { logo } : {}) };
};

/** The brand as this device knows it — null until one is saved. */
export function readBrand(): Brand | null {
  if (cached !== undefined) return cached;
  try { cached = clean(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { cached = null; }
  return cached;
}

/** The profile's brand, as the cloud read it — kept on this device (cloud/admin useProfile calls it with the row's `brand`). */
export function cacheBrand(v: unknown): void {
  const b = clean(v);
  if (!b && v !== null) return; // an unreadable or missing column leaves the device's copy alone
  cached = b;
  try { if (b) localStorage.setItem(KEY, JSON.stringify(b)); else localStorage.removeItem(KEY); } catch { /* private mode */ }
}

/** Save the brand — on this device at once, in the cloud when there is one (set_my_brand, the caller's own row only). */
export async function saveBrand(b: Brand): Promise<{ ok: true } | { ok: false; why: string }> {
  const c = clean(b);
  if (!c) return { ok: false, why: 'A name or a business, at least.' };
  cacheBrand(c);
  if (!supabase) return { ok: true };
  const { error } = await supabase.rpc('set_my_brand', { b: c });
  return error ? { ok: false, why: `Kept on this device; the cloud said: ${error.message}` } : { ok: true };
}

/** For a test or the smoke seed: the brand as given, this device only. */
export const setBrandForTest = (b: Brand | null): void => cacheBrand(b);

/** The foot of a paper: "Rowland Glew · Streamline Synergy" — empty when no brand is saved. */
export function brandFoot(b: Brand | null = readBrand()): string {
  return b ? [b.name, b.business].filter(Boolean).join(' · ') : '';
}

/** "Prepared by Rowland Glew, Streamline Synergy" — empty when no brand is saved. */
export function preparedBy(b: Brand | null = readBrand()): string {
  if (!b) return '';
  return `Prepared by ${[b.name, b.business].filter(Boolean).join(', ')}`;
}
