/* HOW I WORK — what the colleague in AI Mode is always told about the person (8 November, docs/AI-MODE.md, Memory;
 * supabase/PREFERENCES.sql).
 *
 * Rowland's own words, in four labelled boxes: the words he uses ("the line" for a production line, a machine's nickname),
 * the methods he reaches for, how he likes a report, and anything else the colleague should always know. Typed in the How I
 * work sheet (ui/PreferencesSheet — the account menu and AI Mode's More ▾), or added a line at a time when he tells the
 * colleague "remember I call the checkweigher the CW" (the remember_preference capability, confirmed like every write). Kept
 * on his profile (profiles.preferences, written through set_my_preferences) so his phone and his laptop agree, and cached on
 * this device so AI Mode sends it even when the profile has not been read this visit. It is the person's words sent with each
 * question — never training, never a figure; at most PREFERENCES_MAX characters in all (2,000 with the labels). Modelled on lib/brand. */
import { supabase } from '../cloud/client';

export type PreferenceKey = 'words' | 'methods' | 'reports' | 'always';
export type Preferences = Partial<Record<PreferenceKey, string>>;

/** The four boxes, in the order the sheet shows them and the colleague reads them. */
export const PREFERENCE_FIELDS: readonly { key: PreferenceKey; label: string; hint: string }[] = [
  { key: 'words', label: 'The words I use', hint: 'e.g. “the line” for a production line; the CW is the checkweigher; Big Bertha is the Line 3 filler' },
  { key: 'methods', label: 'How I like to work', hint: 'e.g. I go to the floor before the data; I start with a Pareto of the stops; DMAIC for a client project' },
  { key: 'reports', label: 'How I like a report', hint: 'e.g. short, money first, one page for the GM, the actions with names and days' },
  { key: 'always', label: 'Always remember', hint: 'anything else Faultline should always know about how you work' },
];

/** All four boxes together, at most — so that with their labels what goes with every question stays under the gateway's
 *  2,000 characters (COLLEAGUE_LIMITS.preferencesChars). */
export const PREFERENCES_MAX = 1900;
/** What the gateway takes, labels and all. */
export const PREFERENCES_SENT_MAX = 2000;

const KEY = 'faultline.preferences';
let cached: Preferences | null | undefined;

const total = (p: Preferences): number => PREFERENCE_FIELDS.reduce((n, f) => n + (p[f.key]?.length ?? 0), 0);

/** Read defensively: each box trimmed; the boxes cut in their order so all of them fit in PREFERENCES_MAX; nothing written → null. */
export function cleanPreferences(v: unknown): Preferences | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const out: Preferences = {};
  let left = PREFERENCES_MAX;
  for (const f of PREFERENCE_FIELDS) {
    const s = typeof o[f.key] === 'string' ? (o[f.key] as string).trim().slice(0, left).trim() : '';
    if (s) { out[f.key] = s; left -= s.length; }
  }
  return Object.keys(out).length ? out : null;
}

/** How I work as this device knows it — null until something is saved. */
export function readPreferences(): Preferences | null {
  if (cached !== undefined) return cached;
  try { cached = cleanPreferences(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { cached = null; }
  return cached;
}

/** The profile's preferences, as the cloud read them — kept on this device. `undefined` (a profile read before the column
 *  existed) leaves the device's copy alone; null (nothing saved in the cloud) clears it. */
export function cachePreferences(v: unknown): void {
  if (v === undefined) return;
  const p = cleanPreferences(v);
  if (!p && v !== null) return; // unreadable: keep what the device has
  cached = p;
  try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch { /* private mode */ }
}

/** Save How I work — on this device at once, in the cloud when there is one (set_my_preferences, the caller's own row only).
 *  Every box empty clears it. More than PREFERENCES_MAX in all is refused, never cut silently. */
export async function savePreferences(p: Preferences): Promise<{ ok: true } | { ok: false; why: string }> {
  const trimmed: Preferences = {};
  for (const f of PREFERENCE_FIELDS) { const s = p[f.key]?.trim(); if (s) trimmed[f.key] = s; }
  const n = total(trimmed);
  if (n > PREFERENCES_MAX) return { ok: false, why: `That is ${n} characters — How I work holds ${PREFERENCES_MAX} in all. Shorten a box and save again.` };
  const c = cleanPreferences(trimmed);
  cached = c;
  try { if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); } catch { /* private mode: kept for this visit */ }
  if (!supabase) return { ok: true };
  const { error } = await supabase.rpc('set_my_preferences', { p: c ?? {} });
  return error ? { ok: false, why: `Kept on this device; the cloud said: ${error.message}` } : { ok: true };
}

/** One line added to a box — "remember I call the checkweigher the CW". Refused, with why, when it would not fit. */
export function withLine(p: Preferences | null, key: PreferenceKey, line: string): { ok: true; prefs: Preferences } | { ok: false; why: string } {
  const add = line.trim();
  if (!add) return { ok: false, why: 'Nothing to remember was said.' };
  const had = p?.[key]?.trim() ?? '';
  if (had.split('\n').some(l => l.trim().toLowerCase() === add.toLowerCase())) return { ok: false, why: `How I work already says “${add}”.` };
  const next: Preferences = { ...(p ?? {}), [key]: had ? `${had}\n${add}` : add };
  const n = total(next);
  if (n > PREFERENCES_MAX) return { ok: false, why: `How I work is full (${PREFERENCES_MAX} characters in all) — open How I work and shorten it first.` };
  return { ok: true, prefs: next };
}

/** The label of a box. */
export const preferenceLabel = (key: PreferenceKey): string => PREFERENCE_FIELDS.find(f => f.key === key)?.label ?? key;

/** What the colleague is sent: each box under its label — empty when nothing is saved. */
export function preferencesText(p: Preferences | null = readPreferences()): string {
  if (!p) return '';
  return PREFERENCE_FIELDS.filter(f => p[f.key]).map(f => `${f.label}:\n${p[f.key]}`).join('\n\n').slice(0, PREFERENCES_SENT_MAX);
}

/** For a test: the device's copy as given. */
export const setPreferencesForTest = (p: Preferences | null): void => { cached = cleanPreferences(p); };
/** For a test: forget the in-memory copy so the next read goes to localStorage. */
export const forgetPreferencesCacheForTest = (): void => { cached = undefined; };
