/* The account control for screens that sit OUTSIDE a workspace.
 *
 * Every screen now carries this and the breadcrumb, and nothing else on top —
 * the workspace title bar is gone. It was once the only way to sign out, and
 * the screens without it had none at all — you had to find your way
 * back to Home first. Same sheet, same wording and the same confirm as the
 * workspace menu, so signing out feels like one thing wherever you do it. */
import { useEffect, useState } from 'react';
import { ACCOUNT_EVENT } from './everythingPlaces';
import { nav } from '../state/useRoute';
import { Sheet, SheetRow } from './Sheet';
import { cloudConfigured } from '../cloud/client';
import { useSession, signOut } from '../cloud/session';
import { useProfile } from '../cloud/admin';
import { AdminPanel } from '../cloud/AdminPanel';
import { UpdateRow } from './BuildStamp';
import { SyncDetail, syncTrouble } from '../cloud/CloudPanel';
import { useSyncStatus } from '../cloud/session';
import { useProjects } from '../lib/useProjects';
import { readBrand } from '../lib/brand';
import { BrandSheet } from './BrandSheet';
import { readPreferences } from '../lib/preferences';
import { PreferencesSheet } from './PreferencesSheet';
import { setAiMode, useAiMode } from '../colleague/aiMode';
import { AiBudgetRow } from './AiBudgetRow';

/** Sign out, after asking — the one way out, wherever it is pressed. Home's
 *  account row and its sheet signed out in one tap, with no question, and
 *  signing out clears this device's copy of every job. */
export async function signOutAsked(): Promise<boolean> {
  if (!window.confirm('Sign out of Faultline on this device? Its copy of the project is cleared — everything is in the cloud and comes back when you sign in again.')) return false;
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
  const { profile, failed, retry, loading } = useProfile();
  const sync = useSyncStatus();
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState(false);
  const [brand, setBrand] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const aiOn = useAiMode();

  /* opened from Everything too — "update the app", "sign out", "logo" are found by typing and land here (ui/everythingPlaces) */
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(ACCOUNT_EVENT, on);
    return () => window.removeEventListener(ACCOUNT_EVENT, on);
  }, []);

  if (!cloudConfigured || !session) return null;
  const email = session.user.email ?? 'signed in';

  const logout = async () => {
    setOpen(false);
    await signOutAsked();
  };

  /* BACKUP SAYS ITSELF HERE, QUIETLY (13 November): a dot on this button while files are still to go up or anything is wrong — the
     words are in the sheet's Backup section, never a banner across a page */
  const moving = syncTrouble(sync);
  return (
    <>
      <button className="acct-btn" onClick={() => setOpen(true)} title={email} data-backup-dot={moving ? '' : undefined}
        aria-label={`Account — ${email}${moving ? ' — backup has something to say' : ''}`}>
        {email.slice(0, 1).toUpperCase()}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Account">
        <div className="acct">
        {/* CALM (20 November — Rowland: "clean up the profile section, very busy, not good"): who you are, then one line a row — its
            name and, where there is one, a short word at its right — then the app and its backup under one small heading. Every row is
            the one it was (13 November's sections said what each is for in a sentence under it; the names now say it). */}
        <div className="acct-who"><span className="acct-av" aria-hidden>{email.slice(0, 1).toUpperCase()}</span><span className="acct-email">{email}</span></div>
        {/* AI MODE (8 November): Luna on or off on this device — the app is the same either way */}
        <SheetRow label="Luna" value={aiOn ? 'On' : 'Off'} onClick={() => setAiMode(!aiOn)} />
        {/* YOUR BRAND (8 November, docs/STORY.md S1): who prepares the papers — on the foot of every one and on every cover */}
        <SheetRow label="Your brand" value={readBrand() ? `${readBrand()?.name}${readBrand()?.business ? ` · ${readBrand()?.business}` : ''}` : 'Not set'}
          onClick={() => { setOpen(false); setBrand(true); }} />
        {/* MY TEMPLATES (11 November, docs/CONSULTANT-WORKSPACE.md C5): the consultant's own, at any customer */}
        <SheetRow label="My templates" onClick={() => { setOpen(false); nav('/templates'); }} />
        {/* HOW I WORK (8 November, docs/AI-MODE.md Memory): what Luna is always told about how you work */}
        <SheetRow label="How I work" value={readPreferences() ? 'Set' : 'Not set'} onClick={() => { setOpen(false); setPrefs(true); }} />
        {/* THE ADMINISTRATOR'S — the AI budget (12 November, read only while the sheet is open), Team & invites */}
        {open && profile?.is_super && <AiBudgetRow onOpen={() => { setOpen(false); nav('/ai/usage'); }} />}
        {failed && !profile && (
          <SheetRow label={loading ? 'Checking your admin access…' : 'Couldn’t check your admin access — tap to retry'} onClick={retry} />
        )}
        {profile?.is_super && <SheetRow label="Team & invites" onClick={() => { setOpen(false); setTeam(true); }} />}
        {/* Mounted only while the sheet is open: it reads the projects, and this button is on every screen. */}
        <ArchiveRow onGo={() => setOpen(false)} />
        <p className="acct-sec">App and backup</p>
        <UpdateRow />
        <SyncDetail onDone={() => setOpen(false)} />
        {profile?.is_super && <DemoRow />}
        <SheetRow label="Sign out" danger onClick={logout} />
        </div>
      </Sheet>
      {profile?.is_super && <AdminPanel open={team} onClose={() => setTeam(false)} />}
      {brand && <BrandSheet open={brand} onClose={() => setBrand(false)} />}
      {prefs && <PreferencesSheet open={prefs} onClose={() => setPrefs(false)} />}
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
      value={`${archived.length} project${archived.length === 1 ? '' : 's'}`}
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
      <SheetRow label={note ? `Building the demo… ${note}` : 'Rebuild the demo line'}
        onClick={() => void go()} />
      {error && <p className="sub" style={{ color: 'var(--st-r)', margin: '4px 0 8px' }}>{error}</p>}
    </>
  );
}
