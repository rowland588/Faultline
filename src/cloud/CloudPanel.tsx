import { useState } from 'react';
import { cloudConfigured } from './client';
import { useSession, useSyncStatus, signIn, signUp, signOut } from './session';
import { syncNow, fullResync } from './sync';
import { Sheet, SheetRow } from '../ui/Sheet';
import { fmtRelative } from '../lib/format';

/** The one bit of cloud UI: a backup/sync row on Home. When the build has no
 *  Supabase credentials the app still works (purely local) — but we SAY SO
 *  rather than silently hiding sign-in, because an unexplained missing login
 *  screen is impossible to diagnose from the outside. */
export function CloudPanel() {
  const { session, loading } = useSession();
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);

  // Unreachable in practice — the Router blocks an unconfigured build before any
  // screen renders — but kept honest rather than silently rendering nothing.
  if (!cloudConfigured || loading) return null;

  if (!session) {
    return (
      <>
        <button className="cloud-row" onClick={() => setOpen(true)}>
          <span className="cloud-ic" aria-hidden>☁</span>
          <span className="cloud-main"><b>Back up &amp; sync</b><span className="sub">sign in to save your work to the cloud and across devices</span></span>
          <span className="cloud-go" aria-hidden>›</span>
        </button>
        <AuthSheet open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  /* Signed in: just the account. Sync is automatic and invisible — surfacing
   * "Sync now" / "Full re-sync" here made the product wear its plumbing on the
   * outside. Those remain as RECOVERY tools behind a tap on the account row;
   * the row itself only ever speaks up if backup is genuinely stuck. */
  return (
    <>
      <div className="cloud-row cloud-signedin">
        <button className="cloud-account" onClick={() => setOpen(true)} title="Account">
          <span className={'cloud-ic' + (status.state === 'syncing' ? ' spin' : '')} aria-hidden>☁</span>
          <span className="cloud-main">
            <b>{session.user.email}</b>
            {status.state === 'error' && <span className="sub">Backup paused — it will retry by itself</span>}
            {status.schemaOutdated && (
              <span className="sub" style={{ color: 'var(--warn)' }}>
                Admin: run supabase/SYNC_UPGRADE.sql in the Supabase SQL editor once.
              </span>
            )}
          </span>
        </button>
        <button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Account">
        <p className="sub" style={{ marginBottom: 10 }}>
          Your work backs up and syncs to your devices automatically
          {status.lastSyncedAt ? ` — last checked in ${fmtRelative(status.lastSyncedAt)}` : ''}.
        </p>
        {status.state === 'error' && status.error && (
          <p className="sub" style={{ color: 'var(--danger)', marginBottom: 10 }}>{status.error}</p>
        )}
        <SheetRow label="Check for changes now" hint="usually unnecessary" onClick={() => { void syncNow(); setOpen(false); }} />
        <SheetRow label="Repair sync" hint="re-send and re-fetch everything" onClick={() => { void fullResync(); setOpen(false); }} />
        <SheetRow label="Sign out" danger onClick={() => { setOpen(false); void signOut(); }} />
      </Sheet>
    </>
  );
}

function AuthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const submit = async () => {
    setErr(''); setOk(''); setBusy(true);
    try {
      if (mode === 'in') { await signIn(email, pw); onClose(); }
      else { const { needsConfirm } = await signUp(email, pw); if (needsConfirm) setOk('Account created — check your email to confirm, then sign in.'); else onClose(); }
    } catch (e) { setErr(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'in' ? 'Back up & sync' : 'Create account'}>
      <p className="sub" style={{ marginBottom: 12 }}>Your data stays on this device; signing in adds an encrypted cloud copy and syncs it to your other devices.</p>
      <label className="field-label">Email</label>
      <input className="text-input" type="email" inputMode="email" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); }} />
      <label className="field-label" style={{ marginTop: 10 }}>Password</label>
      <input className="text-input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); }} />
      {err && <p className="sub" style={{ color: 'var(--danger)', marginTop: 8 }}>{err}</p>}
      {ok && <p className="sub" style={{ color: 'var(--ok)', marginTop: 8 }}>{ok}</p>}
      <div className="row-end" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={() => { setMode(m => (m === 'in' ? 'up' : 'in')); setErr(''); setOk(''); }}>{mode === 'in' ? 'Create account' : 'Have an account?'}</button>
        <button className="btn btn-primary" disabled={busy || !email.trim() || !pw} onClick={submit}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create'}</button>
      </div>
    </Sheet>
  );
}
