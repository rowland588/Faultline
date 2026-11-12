/* PRODUCTION DATA — HELD (12 November). Rowland: "Do not activate production data connections yet. I want to establish the business
 * data model, product and process identities, source traceability and validation requirements before we start feeding production
 * data into Luna." So the connections are built (docs/DATA-CONNECTIONS.md) but switched off: no connection can be made, no file brought
 * in, and the cloud's scheduled pull is paused (supabase/PAUSE_PRODUCTION_DATA.sql). Turning it on is one change here, made only on his
 * word. A development build may switch it on for its own acceptance script (localStorage 'luna.productionData' = 'on'), so the code that
 * waits stays proved; a live build never reads that. */
export const PRODUCTION_DATA_LIVE = false;

export function productionDataOn(): boolean {
  if (PRODUCTION_DATA_LIVE) return true;
  if (!import.meta.env.DEV) return false;
  try { return localStorage.getItem('luna.productionData') === 'on'; } catch { return false; }
}

export const PRODUCTION_DATA_HELD =
  'Not switched on yet. Production data waits until the business data model, product and process identities, where each figure comes from and how it is checked are agreed.';
