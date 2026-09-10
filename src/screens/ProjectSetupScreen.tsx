/* SET THE PROJECT UP — its lines, and the people against them.
 *
 * Three things, in the order you actually do them:
 *   1. the project    — what it is called and who leads it
 *   2. the lines      — add, rename, reorder, remove; owner and sponsor on each
 *   3. the people     — who is invited, so they see it on their own device
 *
 * Deliberately one page rather than a wizard: setting a project up is not a
 * one-off, it is something you come back to every time a line changes hands.
 *
 * Everything saves as you type (on blur), the same as the ppm grid — there is
 * no Save button to forget. */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { useProject, useProjects } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { createWorkspace, type PaceLineRow } from '../db';
import { useProjectMembers, type ProjectRole } from '../cloud/members';
import { LineTidyPanel } from './LineTidyPanel';
import { displayName } from '../cloud/team';
import { supabase } from '../cloud/client';

/** A text cell that keeps its own draft and writes on blur — so a slow save can
 *  never eat a keystroke, and one letter typed is not one row written. */
function Cell({ value, placeholder, onSave, wide }: {
  value: string; placeholder: string; onSave: (v: string) => void; wide?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  return (
    <input
      className={'pset-cell' + (wide ? ' is-wide' : '')}
      value={shown}
      placeholder={placeholder}
      maxLength={120}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft != null && draft !== value) onSave(draft.trim()); setDraft(null); }}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setDraft(null); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

/** Who is against a line, as a real person rather than a word.
 *
 * The list is the project's own members, so picking one records their ACCOUNT
 * (the email) alongside the name that prints. That is what turns "the word Lee
 * is written on Line 7" into "Lee owns Line 7" — the same person the invite
 * went to, the same person whose device the line's pack syncs to.
 *
 * Free text stays, because the person who runs a line is often not in the app
 * yet — and a line with a name on it and no account is still better than a line
 * with nothing. Such a name is kept and simply carries no email. */
function PersonPicker({ name, email, members, onChange }: {
  name: string; email: string;
  members: { email: string }[];
  onChange: (name: string, email: string) => void;
}) {
  const OTHER = '\u0000other';
  // A name typed by hand (or one whose person has since left the project) has
  // no matching option, so the control opens on the text field rather than
  // silently showing "nobody".
  const known = email && members.some(m => m.email === email);
  const [typing, setTyping] = useState(!!name && !known);

  if (typing || members.length === 0) {
    return (
      <div className="pset-person">
        {/* Editing the NAME keeps whatever account is already against the line.
            "Rowland Glew" reads better on a report than "rowlandglew35", and
            correcting how somebody's name prints should never quietly unassign
            them. Choosing "Someone not in the app" is what clears the account,
            because that is the one case where it means a different person. */}
        <Cell value={name} placeholder="Who runs it"
          onSave={v => onChange(v, email)} />
        {members.length > 0 && (
          <button className="pset-swap" type="button" onClick={() => setTyping(false)}
            title="Pick someone on this project instead">pick</button>
        )}
      </div>
    );
  }

  return (
    <div className="pset-person">
      <select
        className="pset-cell pset-pick"
        value={known ? email : (name ? OTHER : '')}
        onChange={e => {
          const v = e.target.value;
          // A different person, so the account against the line goes with it.
          if (v === OTHER) { onChange(name, ''); setTyping(true); return; }
          if (!v) { onChange('', ''); return; }
          // The name defaults to the email's local part; "rename" below fixes
          // it to how the person is actually called without unassigning them.
          onChange(displayName(v), v);
        }}
      >
        <option value="">— nobody yet —</option>
        {members.map(m => <option key={m.email} value={m.email}>{displayName(m.email)}</option>)}
        <option value={OTHER}>Someone not in the app…</option>
      </select>
      {known && (
        <button className="pset-swap" type="button" onClick={() => setTyping(true)}
          title="Write their name the way it should print, keeping the assignment">rename</button>
      )}
    </div>
  );
}

/** A quarterly target — a number, so it gets a number field and its own draft. */
function NumCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className="pset-cell is-num" inputMode="numeric" type="number" min={0} max={999}
      value={draft ?? (value || '')}
      placeholder="—"
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        if (draft != null) { const n = Number(draft); if (Number.isFinite(n) && n >= 0) onSave(n); }
        setDraft(null);
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

function LineRow({ line, first, last, state, projectId, members }: {
  line: PaceLineRow; first: boolean; last: boolean; projectId: string;
  state: ReturnType<typeof usePaceLines>;
  members: { email: string }[];
}) {
  const [busy, setBusy] = useState(false);

  /* The line's own workspace — its snag list, its captures, its reports. Made
   * on first use, not on first view, so a line nobody has walked yet does not
   * litter the workspace list. */
  const openWorkspace = async () => {
    if (line.workspaceId) { nav(`/w/${line.workspaceId}/capture`); return; }
    setBusy(true);
    try {
      const ws = await createWorkspace(line.name, 'food-packing');
      await state.editLine(line.id, { workspaceId: ws.id });
      nav(`/w/${ws.id}/capture`);
    } finally { setBusy(false); }
  };

  const remove = () => {
    if (!window.confirm(
      `Remove ${line.name} from this project?\n\nIts ppm readings go with it. Anything captured in its workspace stays where it is.`
    )) return;
    void state.removeLine(line.id);
  };

  return (
    <tr className="pset-row">
      <td className="pset-order">
        <button className="pset-move" disabled={first} aria-label={`Move ${line.name} up`}
          onClick={() => void state.moveLine(line.id, -1)}>↑</button>
        <button className="pset-move" disabled={last} aria-label={`Move ${line.name} down`}
          onClick={() => void state.moveLine(line.id, 1)}>↓</button>
      </td>
      <td><span className="pset-key">{line.key}</span></td>
      <td><Cell value={line.name} placeholder="Line name" wide
        onSave={v => void state.editLine(line.id, { name: v || line.key })} /></td>
      <td><PersonPicker name={line.owner ?? ''} email={line.ownerEmail ?? ''} members={members}
        onChange={(n, e) => void state.editLine(line.id, { owner: n || undefined, ownerEmail: e || undefined })} /></td>
      <td><PersonPicker name={line.sponsor ?? ''} email={line.sponsorEmail ?? ''} members={members}
        onChange={(n, e) => void state.editLine(line.id, { sponsor: n || undefined, sponsorEmail: e || undefined })} /></td>
      <td className="pset-q"><NumCell value={line.q1} onSave={v => void state.setTarget(line.key, 'q1', v)} /></td>
      <td className="pset-q"><NumCell value={line.q2} onSave={v => void state.setTarget(line.key, 'q2', v)} /></td>
      <td className="pset-q"><NumCell value={line.q3} onSave={v => void state.setTarget(line.key, 'q3', v)} /></td>
      <td className="pset-q"><NumCell value={line.q4} onSave={v => void state.setTarget(line.key, 'q4', v)} /></td>
      <td className="pset-actions">
        {/* The pack is where this line's owner actually works, so it leads. The
            workspace is inside it too, but a direct way in is worth keeping for
            somebody heading straight for the camera. */}
        <button className="btn btn-ghost pset-ws" onClick={() => nav(`/project/${projectId}/line/${line.id}`)}>
          Open pack
        </button>
        <button className="btn btn-ghost pset-ws" disabled={busy} onClick={() => void openWorkspace()}>
          {busy ? 'Opening…' : line.workspaceId ? 'Workspace' : 'Workspace +'}
        </button>
        <button className="pset-x" onClick={remove} aria-label={`Remove ${line.name}`}>×</button>
      </td>
    </tr>
  );
}

function AddLine({ state }: { state: ReturnType<typeof usePaceLines> }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [note, setNote] = useState('');

  const add = async () => {
    const k = key.trim();
    if (!k) return;
    if (state.lines.some(l => l.key.toLowerCase() === k.toLowerCase())) {
      setNote(`This project already has a line ${k}.`);
      return;
    }
    await state.addLine({ key: k, name: name.trim() || undefined, owner: owner.trim() || undefined, sponsor: sponsor.trim() || undefined });
    setKey(''); setName(''); setOwner(''); setSponsor(''); setNote('');
  };

  return (
    <div className="pset-add">
      <div className="field-label">Add a line</div>
      <div className="pset-add-grid">
        <label className="proj-field">
          <span className="field-label">Line</span>
          <input className="text-input" value={key} placeholder="2A" maxLength={12}
            onChange={e => { setKey(e.target.value); setNote(''); }}
            onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field">
          <span className="field-label">Name</span>
          <input className="text-input" value={name} placeholder="Line 2A" maxLength={80}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field">
          <span className="field-label">Owner</span>
          <input className="text-input" value={owner} placeholder="Who runs it" maxLength={80}
            onChange={e => setOwner(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <label className="proj-field">
          <span className="field-label">Sponsor</span>
          <input className="text-input" value={sponsor} placeholder="Who sponsors it" maxLength={80}
            onChange={e => setSponsor(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void add(); }} />
        </label>
        <button className="btn btn-primary pset-add-btn" disabled={!key.trim()} onClick={() => void add()}>Add line</button>
      </div>
      {note && <p className="chip-note">{note}</p>}
    </div>
  );
}

const ROLES: { id: ProjectRole; label: string }[] = [
  { id: 'sponsor', label: 'Sponsor' },
  { id: 'owner', label: 'Line owner' },
  { id: 'member', label: 'Member' },
];

function ProjectPeople({ lead, people }: { lead?: string; people: ReturnType<typeof useProjectMembers> }) {
  const { members, loaded, myEmail, error, add, remove } = people;
  const [text, setText] = useState('');
  const [role, setRole] = useState<ProjectRole>('member');
  const [note, setNote] = useState('');

  const doAdd = async () => {
    const t = text.trim().toLowerCase();
    if (!t) return;
    if (members.some(m => m.email === t)) { setNote(`${t} is already on this project`); setText(''); return; }
    try { await add(t, role); setText(''); setNote(''); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Couldn’t add them — are you online?'); }
  };

  if (!supabase) {
    return <p className="sub">Sharing needs the cloud — sign in to invite people to this project.</p>;
  }

  return (
    <>
      <p className="sub" style={{ margin: '4px 0 8px' }}>
        Everyone here sees the project: its lines, the numbers, the next steps and the report.
        {lead && <> <b>{lead}</b> leads it.</>}
      </p>
      {error && <p className="chip-note">{error}</p>}
      <div className="chip-row">
        {members.map(m => (
          <span key={m.email} className="chip chip-editable" title={m.email}>
            <span className="chip-label">
              {m.email === myEmail ? 'You' : displayName(m.email)}
              <span className="pset-role"> · {m.role}</span>
            </span>
            <button className="chip-x" onClick={() => { void remove(m.email).catch(() => setNote('Couldn’t remove them — are you online?')); }}
              aria-label={`Remove ${m.email}`}>×</button>
          </span>
        ))}
        {loaded && members.length === 0 && !error && <span className="sub">Nobody else yet.</span>}
      </div>
      {note && <p className="chip-note">{note}</p>}
      <div className="row-inline" style={{ marginTop: 10 }}>
        <input className="text-input" type="email" value={text} placeholder="Invite by email…" maxLength={120}
          onChange={e => { setText(e.target.value); setNote(''); }}
          onKeyDown={e => { if (e.key === 'Enter') void doAdd(); }} />
        <select className="text-input pset-role-pick" value={role} onChange={e => setRole(e.target.value as ProjectRole)}>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button className="btn" onClick={() => void doAdd()} disabled={!text.trim()}>Invite</button>
      </div>
      <p className="chip-hint">They’ll see this project the next time the app syncs. The role is a label — it says why they’re here, and it prints on the report.</p>
    </>
  );
}

export function ProjectSetupScreen({ projectId }: { projectId: string }) {
  const { loading, project } = useProject(projectId);
  const lines = usePaceLines(projectId);
  // One people list, read by the invite box AND by the owner/sponsor pickers on
  // every line — so the moment somebody is invited they are assignable.
  const people = useProjectMembers(projectId);
  // The project's owner does not appear in project_members — they are the owner
  // — but they are very often the one running a line, so they are pickable too.
  const assignable = people.myEmail && !people.members.some(m => m.email === people.myEmail)
    ? [{ email: people.myEmail }, ...people.members]
    : people.members;

  if (loading || lines.loading) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  return (
    <div className="wrap pace project-setup">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">Set up</p>
          <h1 className="pace-title">{project.name}</h1>
          <p className="pace-lede">The lines this project runs, who owns each one, and who is invited to see it.</p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost pace-out" onClick={() => nav('/projects')}>‹ Projects</button>
          <button className="btn btn-primary" onClick={() => nav(`/project/${project.id}`)}>Open project</button>
          <AccountMenu />
        </div>
      </header>

      <ProjectIdentity projectId={projectId} />

      <section className="pace-sec">
        <div className="pace-sec-head">
          <h2 className="pace-sec-title">Lines</h2>
          <p className="pace-sec-sub">
            Each line has an owner who runs it and a sponsor who carries it — and a workspace of its own for its snag list, captures and reports ·
            targets are packs per minute per quarter
          </p>
        </div>

        {lines.lines.length === 0
          ? <p className="sub">No lines yet — add the first one below.</p>
          : (
            <div className="pset-table-wrap">
              <table className="pset-table">
                <thead>
                  <tr>
                    <th className="pset-order"><span className="sr-only">Order</span></th>
                    <th>Line</th><th>Name</th><th>Owner</th><th>Sponsor</th>
                    <th className="pset-q">Q1</th><th className="pset-q">Q2</th><th className="pset-q">Q3</th><th className="pset-q">Q4</th>
                    <th className="pset-actions">Its work</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.lines.map((l, i) => (
                    <LineRow key={l.id} line={l} state={lines} projectId={project.id} members={assignable}
                      first={i === 0} last={i === lines.lines.length - 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

        <AddLine state={lines} />

        {/* Work written before lines had packs of their own — offered for
            placing, once, and gone from the page as soon as it is placed. */}
        <LineTidyPanel projectId={project.id} lines={lines.lines} />
      </section>

      <section className="pace-sec">
        <div className="pace-sec-head">
          <h2 className="pace-sec-title">People</h2>
          <p className="pace-sec-sub">Sponsors and owners, invited by email · they see this project on their own device</p>
        </div>
        <div className="card">
          <ProjectPeople lead={project.lead} people={people} />
        </div>
      </section>
    </div>
  );
}

/** Name, lead and one line of description — the project's own identity, kept
 *  apart from the lines so it is obvious which is which. */
function ProjectIdentity({ projectId }: { projectId: string }) {
  const { project } = useProject(projectId);
  const { rename } = useProjects();
  if (!project) return null;
  return (
    <section className="card pset-identity">
      <div className="pset-identity-grid">
        <label className="proj-field">
          <span className="field-label">Project</span>
          <Cell value={project.name} placeholder="Project name" wide
            onSave={v => void rename(project, { name: v || project.name })} />
        </label>
        <label className="proj-field">
          <span className="field-label">Lead — one person, accountable</span>
          <Cell value={project.lead ?? ''} placeholder="Rowland Glew" wide
            onSave={v => void rename(project, { lead: v || undefined })} />
        </label>
        <label className="proj-field pset-identity-desc">
          <span className="field-label">What it is</span>
          <Cell value={project.description ?? ''} placeholder="One line, for the people you invite" wide
            onSave={v => void rename(project, { description: v || undefined })} />
        </label>
      </div>
    </section>
  );
}
