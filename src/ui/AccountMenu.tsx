/* The account control for screens that sit OUTSIDE a workspace.
 *
 * Every screen now carries this and the breadcrumb, and nothing else on top —
 * the workspace title bar is gone. It was once the only way to sign out, and
 * the screens without it had none at all — you had to find your way
 * back to Home first. Same sheet, same wording and the same confirm as the
 * workspace menu, so signing out feels like one thing wherever you do it. */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { Sheet, SheetRow } from './Sheet';
import { cloudConfigured } from '../cloud/client';
import { useSession, signOut } from '../cloud/session';
import { useProfile } from '../cloud/admin';
import { AdminPanel } from '../cloud/AdminPanel';
import { SyncDetail } from '../cloud/CloudPanel';
import { useProjects } from '../lib/useProjects';

/** Sign out, after asking — the one way out, wherever it is pressed. Home's
 *  account row and its sheet signed out in one tap, with no question, and
 *  signing out clears this device's copy of every job. */
export async function signOutAsked(): Promise<boolean> {
  if (!window.confirm('Sign out of Faultline on this device? Its copy of the job is cleared — everything is in the cloud and comes back when you sign in again.')) return false;
  const r = await signOut(); // session clears → the app returns to the sign-in screen
  if (!r.ok) window.alert(r.reason);
  return r.ok;
}

/* ONE PLACE FOR WHAT YOU DO ONCE IN A WHILE. Rowland, of Home: "invite is in
 * the middle, archive and demos are not where I would have them, and a large
 * sign out — all look unprofessional." Team & invites sat between the control
 * room and the projects, the demo builder and the archive link under the
 * project cards, and a full-width card with the email and a Sign out button
 * across the foot of every visit. None of them is the work. They live here
 * now, behind the account button that sits top right on every screen, Home
 * included — so Home holds the control room and the jobs, and nothing else. */
export function AccountMenu() {
  const { session } = useSession();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState(false);

  if (!cloudConfigured || !session) return null;
  const email = session.user.email ?? 'signed in';

  const logout = async () => {
    setOpen(false);
    await signOutAsked();
  };

  return (
    <>
      <button className="acct-btn" onClick={() => setOpen(true)} title={email}
        aria-label={`Account — ${email}`}>
        {email.slice(0, 1).toUpperCase()}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Account">
        <p className="sub" style={{ marginBottom: 10 }}>{email}</p>
        <SheetRow label="Control room" hint="every job" onClick={() => { setOpen(false); nav('/'); }} />
        {profile?.is_super && (
          <SheetRow label="Team & invites" hint="invite people, see who’s joined"
            onClick={() => { setOpen(false); setTeam(true); }} />
        )}
        {/* Mounted only while the sheet is open: it reads the projects, and
            this button is on every screen. */}
        <ArchiveRow onGo={() => setOpen(false)} />
        {profile?.is_super && <DemoRow />}
        <p className="acct-sec">Backup</p>
        <SyncDetail onDone={() => setOpen(false)} />
        <SheetRow label="Sign out" danger onClick={logout} />
      </Sheet>
      {profile?.is_super && <AdminPanel open={team} onClose={() => setTeam(false)} />}
    </>
  );
}

/** The archive, named with how much is in it — and not there at all when it
 *  is empty. The Projects page is where it opens. */
function ArchiveRow({ onGo }: { onGo: () => void }) {
  const { archived } = useProjects();
  if (!archived.length) return null;
  return (
    <SheetRow label="Archive"
      hint={`${archived.length} project${archived.length === 1 ? '' : 's'} — restore or delete`}
      onClick={() => { onGo(); nav('/projects?view=archive'); }} />
  );
}

/** The showcase builder — a superadmin tool, so it is in the menu, not on
 *  Home. It says how far it has got, and says so when it fails. */
function DemoRow() {
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState('');
  const go = async () => {
    if (note) return;
    setError(''); setNote('starting…');
    try {
      const { rebuildDemo } = await import('../lib/demo');
      const id = await rebuildDemo(setNote);
      // lands on the board, where ▶ Watch the demo (the film) sits
      nav(`/w/${id}/analyse`);
    } catch (e) {
      setNote(null);
      setError(e instanceof Error ? e.message : 'Demo seeding failed — try again.');
    }
  };
  return (
    <>
      <SheetRow label={note ? `Building the demo… ${note}` : 'Build / rebuild the demo line'}
        hint="replaces any demo already here" onClick={() => void go()} />
      {error && <p className="sub" style={{ color: 'var(--st-r)', margin: '4px 0 8px' }}>{error}</p>}
    </>
  );
}
