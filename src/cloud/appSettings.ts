/* THE SETTINGS OF FAULTLINE ITSELF — set once by the administrator, read by every device (20 November, supabase/APP_SETTINGS.sql;
 * docs/CONNECTED-LUNA.md — Rowland: "when I make the Microsoft account … it needs to be ready to connect").
 *
 * The only one so far is Microsoft's Application (client) ID: saved here once, Connect to Microsoft is ready on every device of every
 * person — no rebuild, nothing typed on each device. Read when the app starts (and when the connect sheet opens), kept on the device so
 * it holds with no signal (lib/microsoft/auth clientId reads the kept copy). Not a secret: anyone may read it; only the administrator
 * writes it — the database refuses anyone else, and anything that is not an Application ID. */
import { supabase } from './client';

const KEPT = 'faultline.app.settings';
/** Said on the window when the settings were read again — what shows them listens for it. */
export const APP_SETTINGS_EVENT = 'faultline:app-settings';
export interface AppSettings { microsoftClientId?: string; /** When they were last read from the cloud. */ at: number }

export function keptAppSettings(): AppSettings {
  try { return (JSON.parse(localStorage.getItem(KEPT) ?? 'null') as AppSettings | null) ?? { at: 0 }; } catch { return { at: 0 }; }
}
function keepAppSettings(s: AppSettings): void {
  try { localStorage.setItem(KEPT, JSON.stringify(s)); } catch { /* this visit only */ }
  try { window.dispatchEvent(new Event(APP_SETTINGS_EVENT)); } catch { /* no window */ }
}

let reading: Promise<AppSettings> | null = null;
/** The settings read from the cloud and kept — the kept copy when the cloud cannot be reached (nothing is forgotten for want of signal). */
export function loadAppSettings(again = false): Promise<AppSettings> {
  if (!supabase) return Promise.resolve(keptAppSettings());
  if (reading && !again) return reading;
  const db = supabase;
  reading = (async () => {
    const { data, error } = await db.from('app_settings').select('key,value');
    if (error || !Array.isArray(data)) return keptAppSettings();
    const by = new Map((data as { key: string; value: string }[]).map(r => [r.key, (r.value ?? '').trim()]));
    const s: AppSettings = { ...(by.get('microsoft_client_id') ? { microsoftClientId: by.get('microsoft_client_id') } : {}), at: Date.now() };
    keepAppSettings(s);
    return s;
  })().catch(() => keptAppSettings());
  return reading;
}

/** Saved for everyone — the administrator's only; the database is the guarantee. `''` clears it. */
export async function saveMicrosoftClientId(value: string): Promise<{ ok: true } | { ok: false; why: string }> {
  if (!supabase) return { ok: false, why: 'This device is not connected to Faultline’s cloud, so it can only be used on this device.' };
  const { error } = await supabase.from('app_settings').upsert({ key: 'microsoft_client_id', value: value.trim(), updated_at: Date.now() });
  if (error) {
    const m = error.message ?? '';
    return { ok: false, why: /row-level security|permission|42501/i.test(`${m} ${error.code ?? ''}`) ? 'Only Faultline’s administrator can save it for everyone.'
      : /check constraint|23514/i.test(`${m} ${error.code ?? ''}`) ? 'That is not an Application ID.'
      : /Failed to fetch|NetworkError|network/i.test(m) ? 'No signal — it was not saved. Try again when you are back online.' : m };
  }
  await loadAppSettings(true);
  return { ok: true };
}
