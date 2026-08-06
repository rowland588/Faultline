/* The superadmin's team console: invite people by email, see who's joined, and
 * revoke an invite. Rendered only for a superadmin (the caller checks that), and
 * every write is re-checked by RLS on the server — this is UI, not the guard. */
import { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { fmtRelative } from '../lib/format';
import { listInvites, addInvite, removeInvite, listProfiles, type Invite, type Profile } from './admin';

export function AdminPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const refresh = async () => {
    try {
      const [inv, profs] = await Promise.all([listInvites(), listProfiles()]);
      setInvites(inv); setProfiles(profs);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load'); }
  };
  useEffect(() => { if (open) { setErr(''); void refresh(); } }, [open]);

  const registered = new Set(profiles.map(p => (p.email ?? '').toLowerCase()));

  const invite = async () => {
    if (busy || !email.trim()) return;
    setErr(''); setBusy(true);
    try { await addInvite(email); setEmail(''); await refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not add'); }
    finally { setBusy(false); }
  };

  const revoke = async (e: string) => {
    setErr('');
    try { await removeInvite(e); await refresh(); }
    catch (er) { setErr(er instanceof Error ? er.message : 'Could not remove'); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Team & invites">
      <p className="sub" style={{ marginBottom: 12 }}>
        Add someone's email to let them register. They set their own password on first sign-in.
        Anyone not on this list is turned away.
      </p>

      <div className="invite-add">
        <input
          className="text-input" type="email" inputMode="email" autoComplete="off"
          placeholder="name@company.com" value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void invite(); }}
        />
        <button className="btn btn-primary" disabled={busy || !email.trim()} onClick={invite}>{busy ? 'Adding…' : 'Invite'}</button>
      </div>
      {err && <p className="sub" style={{ color: 'var(--danger)', marginTop: 8 }}>{err}</p>}

      <div className="invite-list">
        {invites === null ? (
          <p className="sub" style={{ marginTop: 14 }}>Loading…</p>
        ) : invites.length === 0 ? (
          <p className="sub" style={{ marginTop: 14 }}>No one invited yet.</p>
        ) : invites.map(inv => {
          const joined = registered.has(inv.email);
          return (
            <div key={inv.email} className="invite-row">
              <span className="invite-mail">{inv.email}</span>
              <span className={'invite-tag' + (joined ? ' joined' : '')}>{joined ? 'Joined' : 'Invited'}</span>
              <span className="invite-when">{fmtRelative(new Date(inv.created_at).getTime())}</span>
              <button className="btn btn-ghost invite-x" onClick={() => void revoke(inv.email)} aria-label={`Remove ${inv.email}`}>Remove</button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
