/* The one manual update door: check, explain the outcome, install before reloading. */
import { useState } from 'react';
import { SheetRow } from './Sheet';
import { PRODUCT } from '../lib/product';
import { updateNow } from '../lib/appUpdate';
export { updateNow } from '../lib/appUpdate';
export const buildSaid = (): string => `Build ${__BUILD_STAMP__}`;

export function UpdateRow() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const check = async () => {
    if (busy) return;
    setBusy(true); setMessage('Checking for a newer version…');
    try { const result = await updateNow(); setMessage(result === 'current' ? 'Faultline is up to date.' : 'Update installed. Reloading…'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not check for updates. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div data-acct-update aria-busy={busy}>
    <SheetRow label={busy ? 'Checking for updates…' : `Update ${PRODUCT.name}`} value={buildSaid()} onClick={() => void check()} />
    {message && <p className="sub app-update-message" role="status">{message}</p>}
  </div>;
}
