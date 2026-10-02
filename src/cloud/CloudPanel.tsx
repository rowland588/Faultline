import { useState } from 'react';
import { cloudConfigured } from './client';
import { useSession, useSyncStatus, signIn, signUp, signOut } from './session';
import { syncNow, fullResync, stopWaitingForMissing, clearOverwritten } from './sync';
import { Sheet, SheetRow } from '../ui/Sheet';
import { fmtRelative } from '../lib/format';

/** The one bit of cloud UI: a backup/sync row on Home. When the build has no
 *  Supabase credentials the app still works (purely local) — but we SAY SO
 *  rather than silently hiding sign-in, because an unexplained missing login
 *  screen is impossible to diagnose from the outside. */
/* The record kinds in the words the screens use. */
const KIND_WORD: Record<string, string> = {
  workspaces: 'line studies', cases: 'cases', observations: 'timed stops', segments: 'walk clips',
  snag_assets: 'frames', snags: 'snags', projects: 'projects', project_targets: 'targets', project_actuals: 'actuals',
  pace_ppm: 'lines', pace_todos: 'actions', pace_snapshots: 'uploads', pace_wins: 'wins',
  tree_nodes: 'tree boxes', commission_assets: 'machines', tests: 'tests and steps', test_items: 'findings and fixes',
  targets: 'targets', readings: 'readings', materials: 'materials', programs: 'programs', standards: 'line standards',
};
const refusedRows = (r: { rows: number }[]): string => {
  const n = r.reduce((a, x) => a + x.rows, 0);
  return `${n} row${n === 1 ? '' : 's'}`;
};

export function CloudPanel() {
  const { session, loading } = useSession();
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);
  /* REPAIR SAYS WHAT IT DID. It used to close the sheet and work out of sight,
     so a tap looked like nothing. Now the sheet stays, says it is working, and
     ends with what it found. */
  const [repair, setRepair] = useState<'idle' | 'running' | 'done'>('idle');
  const runRepair = async () => {
    setRepair('running');
    try { await fullResync(); } finally { setRepair('done'); }
  };
  const missingWords = (n: number, films = 0) => {
    const photos = n - films;
    return [films ? `${films} film${films === 1 ? '' : 's'}` : '', photos ? `${photos} photo${photos === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ');
  };

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
            {status.state === 'error' && !status.refused?.length && <span className="sub">Backup paused — it will retry by itself</span>}
            {/* A refused row is work that has left nobody's device. It is the
                one thing here that must never read as "backed up". */}
            {!!status.overwritten?.length && !status.refused?.length && (
              <span className="sub" style={{ color: 'var(--st-a)' }}>
                {status.overwritten.length === 1 ? 'An edit of yours was replaced by a newer one' : `${status.overwritten.length} edits of yours were replaced by newer ones`} — see Account
              </span>
            )}
            {!!status.refused?.length && (
              <span className="sub" style={{ color: 'var(--st-r)' }}>
                {refusedRows(status.refused)} the cloud refused — {status.refused.map(r => KIND_WORD[r.kind] ?? r.kind).join(', ')}
              </span>
            )}
            {/* "Is everything synced?" answered with a number. Silence means
                yes; a count means the files still moving, and how many. */}
            {status.state !== 'error' && (status.pendingUp || status.pendingDown || status.missingDown) ? (
              <span className="sub">
                {[
                  status.pendingUp ? `${status.pendingUp} file${status.pendingUp === 1 ? '' : 's'} still to back up` : '',
                  status.pendingDown ? `${status.pendingDown} still to download` : '',
                  status.missingDown ? `${status.missingDown} only on the phone that took ${status.missingDown === 1 ? 'it' : 'them'}` : '',
                ].filter(Boolean).join(' · ')}
              </span>
            ) : status.state === 'idle' && status.lastSyncedAt ? (
              <span className="sub">Everything is backed up ✓</span>
            ) : null}
            {status.schemaOutdated && (
              <span className="sub" style={{ color: 'var(--warn)' }}>
                Admin: run supabase/SYNC_UPGRADE.sql in the Supabase SQL editor once.
              </span>
            )}
          </span>
        </button>
        <button className="btn btn-ghost" onClick={() => void signOut().then(r => { if (!r.ok) window.alert(r.reason); })}>Sign out</button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Account">
        <p className="sub" style={{ marginBottom: 10 }}>
          Your work backs up and syncs to your devices automatically
          {status.lastSyncedAt ? ` — last checked in ${fmtRelative(status.lastSyncedAt)}` : ''}.
        </p>
        {/* THREE DIFFERENT FACTS, NOT ONE COUNT. Records sync in seconds;
            this is only photos and films. What is coming down will arrive by
            itself. What is not in the cloud at all will not, however long this
            device waits — it is on the phone that took it, and saying "it
            carries on by itself" about those was not true. */}
        {!!status.refused?.length && (
          <div className="cloud-refused" style={{ marginBottom: 12 }}>
            <p className="sub" style={{ color: 'var(--st-r)', fontWeight: 700 }}>
              {refusedRows(status.refused)} on this device the cloud refused. {status.refused.length === 1 ? 'It stays' : 'They stay'} here and {status.refused.length === 1 ? 'is' : 'are'} sent again every pass.
            </p>
            {status.refused.map(r => (
              <p key={r.kind} className="sub" style={{ margin: '4px 0 0' }}>
                <b>{KIND_WORD[r.kind] ?? r.kind}</b> · {r.rows} row{r.rows === 1 ? '' : 's'} · <code>{r.message}</code>
              </p>
            ))}
            <p className="sub" style={{ marginTop: 6 }}>If the same message is still here tomorrow, send it to whoever runs the database — it is a rule or a column on their side, not this device.</p>
          </div>
        )}
        {!!status.overwritten?.length && (
          <div className="cloud-overwritten" style={{ marginBottom: 12 }}>
            <p className="sub" style={{ color: 'var(--st-a)', fontWeight: 700 }}>
              {status.overwritten.length === 1 ? 'An edit of yours was replaced' : `${status.overwritten.length} edits of yours were replaced`} by a newer copy from another device:
            </p>
            {status.overwritten.map(o => (
              <p key={`${o.kind}:${o.id}`} className="sub" style={{ margin: '4px 0 0' }}>
                <b>{o.title}</b> · {KIND_WORD[o.kind] ?? o.kind} · {fmtRelative(o.at)}
              </p>
            ))}
            <p className="sub" style={{ marginTop: 6 }}>Two people changed the same thing while one was offline, and the later change won. Check it says what you meant.</p>
            <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => void clearOverwritten()}>OK, seen</button>
          </div>
        )}
        {(status.pendingUp || status.pendingDown || status.missingDown) ? (
          <p className="sub" style={{ marginBottom: 10 }}>
            Tests, fixes and notes are already here — this is only photos and films.{' '}
            {status.pendingUp ? <><b>{status.pendingUp}</b> file{status.pendingUp === 1 ? '' : 's'} still going up from this device. </> : null}
            {status.pendingDown ? <><b>{status.pendingDown}</b> coming down now, photos first — films are the slow part. </> : null}
            {status.missingDown ? <><b>{status.missingDown}</b> — {missingWords(status.missingDown, status.missingFilms)} — never reached the cloud: {status.missingDown === 1 ? 'it is' : 'they are'} only on the phone that took {status.missingDown === 1 ? 'it' : 'them'}, and no repair on this device can fetch {status.missingDown === 1 ? 'it' : 'them'}. If that phone still has {status.missingDown === 1 ? 'it' : 'them'}, opening Faultline on it with a signal sends {status.missingDown === 1 ? 'it' : 'them'} across.</> : null}
          </p>
        ) : status.lastSyncedAt && !status.refused?.length ? (
          <p className="sub" style={{ marginBottom: 10 }}>Everything on this device is backed up ✓</p>
        ) : null}
        {status.missingDown ? (
          <div style={{ marginBottom: 12 }}>
            <button className="btn" onClick={() => void stopWaitingForMissing()}>Stop waiting for {status.missingDown === 1 ? 'it' : 'these'}</button>
            <p className="sub" style={{ marginTop: 6 }}>
              {status.missingDown === 1 ? 'It stops' : 'They stop'} being counted here. If {status.missingDown === 1 ? 'it ever reaches' : 'any ever reach'} the cloud, {status.missingDown === 1 ? 'it' : 'they'} still come{status.missingDown === 1 ? 's' : ''} down by {status.missingDown === 1 ? 'itself' : 'themselves'}.
            </p>
          </div>
        ) : null}
        {repair !== 'idle' && (
          <p className="sub" role="status" style={{ marginBottom: 10, color: repair === 'running' ? 'var(--ink-2)' : 'var(--ok, #1e6b4b)' }}>
            {repair === 'running'
              ? 'Repairing — re-sending everything from this device and fetching everything back…'
              : `Repair finished — everything re-sent and re-fetched${status.missingDown ? `. ${status.missingDown} still ${status.missingDown === 1 ? 'is' : 'are'} only on the phone that took ${status.missingDown === 1 ? 'it' : 'them'} — repair cannot bring ${status.missingDown === 1 ? 'that' : 'those'}` : ''}.`}
          </p>
        )}
        {status.state === 'error' && status.error && (
          <p className="sub" style={{ color: 'var(--danger)', marginBottom: 10 }}>{status.error}</p>
        )}
        <SheetRow label="Check for changes now" hint="usually unnecessary" onClick={() => { void syncNow(); setOpen(false); }} />
        <SheetRow label={repair === 'running' ? 'Repairing…' : 'Repair sync'} hint="re-send and re-fetch everything" onClick={() => { if (repair !== 'running') void runRepair(); }} />
        <SheetRow label="Sign out" danger onClick={() => { setOpen(false); void signOut().then(r => { if (!r.ok) window.alert(r.reason); }); }} />
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
