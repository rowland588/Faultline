/* A FILE CONNECTED FROM DATA CONNECTIONS — held until Luna’s page takes it (24 November).
 * Data connections is the factory page; connecting a link there must not open a sheet over Luna.
 * The file is handed to the conversation once #/ai is showing (screens/AiModeScreen). */
import type { LinkOrigin } from './link';

export const LINK_FILE_EVENT = 'faultline-link-file';

let pending: { file: File; origin: LinkOrigin } | null = null;

export function holdLink(file: File, origin: LinkOrigin): void {
  pending = { file, origin };
  try { window.dispatchEvent(new Event(LINK_FILE_EVENT)); } catch { /* no window */ }
}

export function takeLink(): { file: File; origin: LinkOrigin } | null {
  const p = pending;
  pending = null;
  return p;
}
