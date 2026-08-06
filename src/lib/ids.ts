import type { ID, Millis } from '../types';

/** A stable unique id — the sync key AND the cloud's `id uuid` primary key, so it
 *  must be a valid UUID (else Supabase inserts fail) and must never change. */
export const uid = (): ID => {
  // Loose cast so the fallback is genuinely optional (the DOM Crypto type assumes
  // randomUUID always exists, which it doesn't in old / insecure-context browsers).
  const g = (typeof crypto !== 'undefined' ? crypto : undefined) as
    | { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array }
    | undefined;
  if (g?.randomUUID) return g.randomUUID();
  // RFC-4122 v4 fallback so ids stay valid UUIDs for the cloud's uuid columns.
  const b = new Uint8Array(16);
  if (g?.getRandomValues) g.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = Array.from(b, x => x.toString(16).padStart(2, '0'));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
};

/** Epoch ms — one clock for the whole app. */
export const now = (): Millis => Date.now();
