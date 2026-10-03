/* Who's in this room — and the one-tap way to grow the team. Each workspace is
 * independent: its creator owns it and chooses the stakeholders. Members see
 * everything in the workspace, including all history from before they joined;
 * the owner (or the app admin) manages the list. People management is
 * live-online: it talks straight to the cloud. */
import { useState } from 'react';
import { useTeam, displayName } from '../cloud/team';
import { useMembers } from '../cloud/members';
import { useProfile } from '../cloud/admin';
import { useOwningProject } from '../lib/usePaceWorkspace';

export function PeoplePanel({ wsId, ownerId }: { wsId: string; ownerId?: string }) {
  const { whoIs, myId, members: team } = useTeam();
  const { profile } = useProfile();
  const { members, loaded, unreached, myEmail, add, remove } = useMembers(wsId);
  // A line's study is under its project: everyone on the project sees it
  // (supabase/LINE_STUDY_ACCESS.sql). This list is for anyone on the line
  // who is not on the project.
  const project = useOwningProject(wsId);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');

  // No ownerId means this device created the workspace before it ever synced.
  const canManage = !ownerId || ownerId === myId || !!profile?.is_super;
  const ownerEmail = (ownerId ? whoIs(ownerId)?.email : myEmail) ?? '';
  const iAmOwner = !ownerId || ownerId === myId;

  const doAdd = async () => {
    const t = text.trim().toLowerCase();
    if (!t) return;
    if (t === ownerEmail || members.some(m => m.email === t)) { setNote(`${t} is already on it`); setText(''); return; }
    try {
      const r = await add(t);
      // The add is the invite (supabase/OWNER_INVITES.sql): somebody who has
      // an account hears nothing new; somebody who hasn't can create one now.
      // On a database without that file the front door is still the
      // administrator's, and the screen says so rather than promising.
      const registered = r.invited ? r.registered : team.some(m => m.email.toLowerCase() === t);
      setNote(registered ? ''
        : r.invited
          ? `${t} can sign up now — tell them to open Faultline and create an account with that address. This line will be waiting for them.`
          : `${t} isn’t in the app yet — inviting them from here needs OWNER_INVITES.sql run in Supabase; until then the administrator invites them. This line will be waiting for them.`);
      setText('');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Couldn’t add them — are you online?');
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="field-label">Who can see this line’s study</div>
      <p className="sub" style={{ margin: '4px 0 6px' }}>
        {project && <>Everyone on <b>{project.name}</b> sees it. </>}
        {iAmOwner
          ? (project
              ? 'Add anyone on the line who is not on the project — they see the same stops, walks and evidence, including all history.'
              : 'Everyone here sees and works on the same stops, walks and evidence, including all history.')
          : `${displayName(ownerEmail) || 'The owner'} runs this line’s study and chooses who else is in it.`}
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
        {/* "Nobody else yet" only when the list was actually read: offline it
            said so anyway, which is a claim the screen could not know. */}
        {loaded && members.filter(m => m.email !== ownerEmail).length === 0 && (
          <span className="sub">{unreached ? 'Couldn’t reach the people list — are you online?' : canManage ? 'Nobody else yet.' : ''}</span>
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
          <p className="chip-hint">They’ll see this line’s study — and its full history — the next time the app syncs</p>
        </>
      )}
    </div>
  );
}

/** The 👥 destination — straight to inviting, nothing else in the way. */
