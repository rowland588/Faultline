/* WHICH BUILD THIS IS, AND THE WAY TO GET THE NEWEST — in the Account sheet, under "This app" (13 November — Rowland: "to manually check
 * for updates, it's only available in lines … I want it somewhere like I check my account and it's there, update"). It was a small line
 * at the foot of the Lines page since October; it is one thing, so it has one place, and the account is where a person looks for it.
 *
 * An installed app keeps serving its cached shell until the service worker hands over, so a device can sit on an old build with nothing
 * on screen to say so — which makes "the fix isn't working" and "the fix hasn't arrived" look identical. The row says which build this
 * device is on and forces the newest through rather than waiting for it. Nothing saved on the device is touched: only the app's own
 * cached files are cleared. */
import { useState } from 'react';
import { SheetRow } from './Sheet';
import { PRODUCT } from '../lib/product';

export async function updateNow(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map(r => r.unregister()));
    if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
  } catch { /* nothing cached to clear */ }
  location.reload();
}

/** "Build 13 Nov 09:20" — when this device's copy of the app was made. */
export const buildSaid = (): string => `Build ${__BUILD_STAMP__}`;

export function UpdateRow() {
  const [busy, setBusy] = useState(false);
  return (
    <div data-acct-update>
      <SheetRow label={busy ? 'Updating…' : `Update ${PRODUCT.name}`} hint={`${buildSaid()} — get the newest version now; your work on this device is kept`}
        onClick={() => { if (!busy) { setBusy(true); void updateNow(); } }} />
    </div>
  );
}
