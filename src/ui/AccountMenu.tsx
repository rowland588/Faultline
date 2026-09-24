/* The account control for screens that sit OUTSIDE a workspace.
 *
 * Project Pace and the portfolio render without the workspace TopBar, so until
 * now there was no way to sign out from them at all — you had to find your way
 * back to Home first. Same sheet, same wording and the same confirm as the
 * workspace menu, so signing out feels like one thing wherever you do it. */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { Sheet, SheetRow } from './Sheet';
import { cloudConfigured } from '../cloud/client';
import { useSession, signOut } from '../cloud/session';

export function AccountMenu() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);

  if (!cloudConfigured || !session) return null;
  const email = session.user.email ?? 'signed in';

  const logout = async () => {
    if (!window.confirm('Sign out of Faultline on this device? Its copy of the job is cleared — everything is in the cloud and comes back when you sign in again.')) return;
    setOpen(false);
    const r = await signOut(); // session clears → the app returns to the sign-in screen
    if (!r.ok) window.alert(r.reason);
  };

  return (
    <>
      <button className="acct-btn" onClick={() => setOpen(true)} title={email}
        aria-label={`Account — ${email}`}>
        {email.slice(0, 1).toUpperCase()}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Account">
        <p className="sub" style={{ marginBottom: 10 }}>{email}</p>
        <SheetRow label="All workspaces" hint="home" onClick={() => { setOpen(false); nav('/'); }} />
        <SheetRow label="Sign out" danger onClick={logout} />
      </Sheet>
    </>
  );
}
