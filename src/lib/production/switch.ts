/* PRODUCTION DATA — ON (15 November). Held on 12 November (Rowland: "Do not activate production data connections yet …" until the
 * business data model was agreed); switched on on 15 November at his word — "yes switch on" — with the cloud's scheduled pull made active
 * again (supabase/RESUME_PRODUCTION_DATA.sql). Holding it again is `false` here and PAUSE_PRODUCTION_DATA.sql; with it false a
 * development build may still switch it on for itself (localStorage 'luna.productionData' = 'on'), a live build never reads that. */
export const PRODUCTION_DATA_LIVE: boolean = true;

export function productionDataOn(): boolean {
  if (PRODUCTION_DATA_LIVE) return true;
  if (!import.meta.env.DEV) return false;
  try { return localStorage.getItem('luna.productionData') === 'on'; } catch { return false; }
}

export const PRODUCTION_DATA_HELD =
  'Not switched on yet. Production data waits until the business data model, product and process identities, where each figure comes from and how it is checked are agreed.';
