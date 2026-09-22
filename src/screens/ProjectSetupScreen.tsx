/* SET THE PROJECT UP — its lines, and the people against them.
 *
 * Four things, in the order you actually do them:
 *   1. the project    — what it is called and who leads it
 *   2. the lines      — add, rename, reorder, remove; owner and sponsor on each
 *   3. the measures   — what this business judges a line on, and its targets
 *   4. the people     — who is invited, so they see it on their own device
 *
 * Deliberately one page rather than a wizard: setting a project up is not a
 * one-off, it is something you come back to every time a line changes hands.
 *
 * Everything saves as you type (on blur). There is no Save button to forget. */
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { useProject, useProjects } from '../lib/useProjects';
import { MODELS, planModel, setPlanModel } from '../lib/planModel';
import { usePaceLines } from '../lib/usePaceLines';
import { createWorkspace, type PaceLineRow } from '../db';
import { useProjectMembers, type ProjectRole } from '../cloud/members';
import { LineTidyPanel } from './LineTidyPanel';
import { MeasuresSetup } from './MeasuresSetup';
import { displayName } from '../cloud/team';
import { supabase } from '../cloud/client';
import { DraftText as Cell } from '../ui/Draft';

/* The write-on-blur inputs are shared — see ui/Draft.tsx for why a cell owns its
   draft while it has focus. */

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
      `Remove ${line.name} from this project?\n\nIts readings and targets go with it. Anything captured in its workspace stays where it is.`
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
  /* Measures and targets belong to an improvement initiative, not to a handover.
     A commissioning job's rate is agreed once, per pack, and either proved or
     not — asking it for a quarterly target is asking a question the job has no
     answer to. */
  const paced = !!project && planModel(project) !== 'commissioning';
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
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${project.id}` },
        { label: 'Lines & people' },
      ]} />
      <Peers peers={projectPeers(project.id, 'setup')} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Lines &amp; people</h1>
          <p className="pace-lede">The lines this project runs, who owns each one, and who is invited to see it.</p>
        </div>
        <div className="pace-head-actions">
          <AccountMenu />
        </div>
      </header>

      <ProjectIdentity projectId={projectId} />

      <section className="pace-sec">
        <div className="pace-sec-head">
          <h2 className="pace-sec-title">Lines</h2>
          <p className="pace-sec-sub">
            Each line has an owner who runs it and a sponsor who carries it — and a workspace of its own for its snag list, captures and reports
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

      {/* WHAT THIS BUSINESS MEASURES. Only on a project that runs a plan — a
          commissioning job proves a rate once, per pack, and has no periods to
          set targets across. */}
      {paced && <MeasuresSetup projectId={project.id} lines={lines.lines} />}

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
  const paced = planModel(project) !== 'commissioning';
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

      {/* THE PLAN MODEL — the same choice offered when the project was started
          (see ProjectsScreen), kept changeable here for a project that turns
          out to need the other one. Two buttons, not two checkboxes: a project
          runs ONE plan, not zero or both, so this is a switch and not a pair of
          independent opt-ins. */}
      <div className="pset-tools">
        <p className="field-label">Plan model</p>
        <div className="proj-model-grid">
          {MODELS.map(m => (
            <button key={m.id} type="button"
              className={'proj-model-opt' + (planModel(project) === m.id ? ' on' : '')}
              onClick={() => void rename(project, setPlanModel(m.id))}>
              <span className="proj-model-t">{m.label}</span>
              <span className="proj-model-s">{m.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AN EXTRA TOOL, NOT PART OF THE MODEL CHOICE. The Pareto sits beside
          whichever plan the project runs — it does not replace either one, so
          it stays a plain opt-in rather than a third slot in the switch above.
          Ticking it on does not use, publish or send anywhere any Pareto
          reading already on file; it only turns on the surface so the NEXT
          upload that carries a Pareto sheet has somewhere to be read. */}
      {/* Pareto is read off the Pareto sheet of the weekly workbook upload, and
          a commissioning job has no workbook to upload. Offering it there is a
          door to a page that can only ever be empty. */}
      {paced && (
      <div className="pset-tools">
        <p className="field-label">Extra tools</p>
        <label className="pset-tool">
          <input type="checkbox" checked={!!project.pareto}
            onChange={e => void rename(project, { pareto: e.target.checked || undefined })} />
          <span className="pset-tool-m">
            <b>Pareto</b>
            <span className="sub">
              Where the time is actually going, ranked, read off the Pareto sheet of the weekly
              upload. At the start of a project it says where to aim; run again during it, the same
              ranking is evidence of whether the category you went after got smaller. Needs a Pareto
              sheet in the workbook — a project that measures its losses another way does not want
              this page.
            </span>
          </span>
        </label>
      </div>
      )}
    </section>
  );
}
