import { useState } from 'react';
import { cloudConfigured } from './client';
import { useSession, useSyncStatus, signIn, signUp, signOut } from './session';
import { syncNow } from './sync';
import { Sheet } from '../ui/Sheet';
import { fmtRelative } from '../lib/format';

/** The one bit of cloud UI: a backup/sync row on Home. Hidden entirely when the
 *  build has no Supabase credentials — the app stays purely local. */
export function CloudPanel() {
  const { session, loading } = useSession();
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);

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

  const label = status.state === 'syncing' ? 'Syncing…'
    : status.state === 'error' ? 'Sync error — will retry'
    : status.lastSyncedAt ? `Synced ${fmtRelative(status.lastSyncedAt)}` : 'Signed in';

  return (
    <div className="cloud-row cloud-signedin">
      <span className={'cloud-ic' + (status.state === 'syncing' ? ' spin' : '')} aria-hidden>☁</span>
      <span className="cloud-main">
        <b>{session.user.email}</b>
        <span className="sub">{label}{status.state === 'error' && status.error ? ` · ${status.error}` : ''}</span>
      </span>
      <span className="cloud-actions">
        <button className="btn" onClick={() => void syncNow()}>Sync now</button>
        <button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button>
      </span>
    </div>
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
