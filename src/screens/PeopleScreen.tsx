/* Who's in this room — and the one-tap way to grow the team. Each workspace is
 * independent: its creator owns it and chooses the stakeholders. Members see
 * everything in the workspace, including all history from before they joined;
 * the owner (or the app admin) manages the list. People management is
 * live-online: it talks straight to the cloud. */
import { useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { goBack } from '../state/useRoute';
import { supabase } from '../cloud/client';
import { useTeam, displayName } from '../cloud/team';
import { useMembers } from '../cloud/members';
import { useProfile } from '../cloud/admin';

export function PeoplePanel({ wsId, ownerId }: { wsId: string; ownerId?: string }) {
  const { whoIs, myId, members: team } = useTeam();
  const { profile } = useProfile();
  const { members, loaded, myEmail, add, remove } = useMembers(wsId);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');

  // No ownerId means this device created the workspace before it ever synced.
  const canManage = !ownerId || ownerId === myId || !!profile?.is_super;
  const ownerEmail = (ownerId ? whoIs(ownerId)?.email : myEmail) ?? '';
  const iAmOwner = !ownerId || ownerId === myId;

  const doAdd = async () => {
    const t = text.trim().toLowerCase();
    if (!t) return;
    if (t === ownerEmail || members.some(m => m.email === t)) { setNote(`${t} is already in this workspace`); setText(''); return; }
    try {
      await add(t);
      const registered = team.some(m => m.email.toLowerCase() === t);
      setNote(registered ? '' : `${t} isn’t in the app yet — the administrator needs to invite them before they can sign in. Once they do, this workspace will be waiting for them.`);
      setText('');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Couldn’t add them — are you online?');
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="field-label">People in this workspace</div>
      <p className="sub" style={{ margin: '4px 0 6px' }}>
        {iAmOwner
          ? 'Your workspace, your team — everyone here sees and works on the same data, including all history.'
          : `${displayName(ownerEmail) || 'The owner'} runs this workspace and chooses who’s in it.`}
      </p>
      <div className="chip-row" style={{ marginTop: 8 }}>
        <span className="chip" title={ownerEmail}>{iAmOwner ? 'You' : displayName(ownerEmail)} · owner</span>
        {members.filter(m => m.email !== ownerEmail).map(m => (
          <span key={m.email} className={canManage ? 'chip chip-editable' : 'chip'} title={m.email}>
            {canManage
              ? <>
                  <span className="chip-label">{m.email === myEmail ? 'You' : displayName(m.email)}</span>
                  <button className="chip-x" onClick={() => { void remove(m.email).catch(() => setNote('Couldn’t remove them — are you online?')); }}
                    aria-label={`Remove ${m.email}`}>×</button>
                </>
              : (m.email === myEmail ? 'You' : displayName(m.email))}
          </span>
        ))}
        {loaded && members.filter(m => m.email !== ownerEmail).length === 0 && (
          <span className="sub">{canManage ? 'Nobody else yet.' : ''}</span>
        )}
      </div>
      {note && <p className="chip-note">{note}</p>}
      {canManage && (
        <>
          <div className="row-inline" style={{ marginTop: 10 }}>
            <input className="text-input" type="email" value={text} placeholder="Add a person by email…" maxLength={120}
              onChange={e => { setText(e.target.value); setNote(''); }}
              onKeyDown={e => { if (e.key === 'Enter') void doAdd(); }} />
            <button className="btn" onClick={() => void doAdd()} disabled={!text.trim()}>Add</button>
          </div>
          <p className="chip-hint">They’ll see this workspace — and its full history — the next time the app syncs</p>
        </>
      )}
    </div>
  );
}

/** The 👥 destination — straight to inviting, nothing else in the way. */
export function PeopleScreen() {
  const { workspace } = useWorkspace();
  return (
    <div className="wrap">
      <div className="subhead">
        <button className="back-btn" onClick={() => goBack(`/w/${workspace.id}/capture`)}>‹ Back</button>
        <span className="subhead-title">People</span>
      </div>
      {supabase
        ? <PeoplePanel wsId={workspace.id} ownerId={workspace.ownerId} />
        : <p className="sub" style={{ marginTop: 16 }}>Sharing needs the cloud — sign in to invite people to this workspace.</p>}
    </div>
  );
}
