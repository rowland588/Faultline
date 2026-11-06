/* THE FACTORY-ONLINE CHIP — the foot of the rail (docs/LOOK.md §2, look E).
 *
 * The sync's state in words beside a dot: green when this device has the
 * cloud and the last pass went through, amber when something is waiting or
 * refused, grey when there is no signal or no account. A tap opens the
 * account sheet, where the same facts are said in full (ui/AccountMenu). The
 * word is always there — the dot alone would be a feeling, not an answer. */
import { cloudConfigured } from '../cloud/client';
import { useSession, useSyncStatus } from '../cloud/session';
import { useEffect, useState } from 'react';

function useOnline(): boolean {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
}

const clock = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** What the chip says: the dot's state and the two lines. */
export function syncSaid(s: { state: string; lastSyncedAt: number | null; pendingUp?: number; error?: string }, online: boolean, signedIn: boolean): { tone: 'g' | 'a' | 'n'; label: string; sub: string } {
  if (!cloudConfigured || !signedIn) return { tone: 'n', label: 'This device only', sub: 'Not signed in — nothing leaves the device' };
  if (!online) return { tone: 'n', label: 'Factory offline', sub: s.lastSyncedAt ? `Last synced ${clock(s.lastSyncedAt)} · kept here until signal` : 'Kept here until signal' };
  if (s.state === 'syncing') return { tone: 'g', label: 'Factory online', sub: 'Syncing now…' };
  if (s.state === 'error') return { tone: 'a', label: 'Factory online', sub: s.lastSyncedAt ? `Last sync had a problem · ${clock(s.lastSyncedAt)}` : 'Last sync had a problem' };
  if (s.pendingUp) return { tone: 'a', label: 'Factory online', sub: `${s.pendingUp} file${s.pendingUp === 1 ? '' : 's'} still going up` };
  return { tone: 'g', label: 'Factory online', sub: s.lastSyncedAt ? `Synced ${clock(s.lastSyncedAt)}` : 'Not synced yet' };
}

export function SyncChip({ onOpen }: { onOpen?: () => void }) {
  const s = useSyncStatus();
  const online = useOnline();
  const { session } = useSession();
  const said = syncSaid(s, online, !!session);
  return (
    <button type="button" className="nv-sync" onClick={onOpen} aria-label={`${said.label} — ${said.sub}`}>
      <span className={'nv-sync-dot is-' + said.tone} aria-hidden />
      <span>
        <span className="nv-sync-l">{said.label}</span>
        <br />
        <span className="nv-sync-s">{said.sub}</span>
      </span>
    </button>
  );
}
