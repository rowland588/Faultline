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
import { Fold } from '../ui/Fold';
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { offerUndo } from '../ui/Undo';
import { Crumbs } from '../ui/Crumbs';
import { Peers, projectPeers } from '../ui/Peers';
import { useStanding } from '../lib/useStanding';
import { COLORS, useProject, useProjects } from '../lib/useProjects';
import { DateWhy } from '../ui/DateWhy';
import { HANDOVER_KEY } from '../lib/story';
import { MODELS, methodOf, planModel, setPlanModel } from '../lib/planModel';
import { usePaceLines } from '../lib/usePaceLines';
import { createWorkspace, type PaceLineRow } from '../db';
import { useProjectMembers, type ProjectRole } from '../cloud/members';
import { LineTidyPanel } from './LineTidyPanel';
import { MeasuresSetup } from './MeasuresSetup';
import { displayName } from '../cloud/team';
import { supabase } from '../cloud/client';
import { DraftText as Cell } from '../ui/Draft';
import { Icon } from '../ui/Icon';

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
      `Remove ${line.name} from this project?\n\nIts readings and targets go with it. Anything captured on it — stops, walks, evidence — stays where it is.`
    )) return;
    void state.removeLine(line.id).then(back => { if (back) offerUndo(`Removed ${line.name}`, back); });
  };

  return (
    <tr className="pset-row">
      <td className="pset-order">
        <button className="pset-move" disabled={first} aria-label={`Move ${line.name} up`}
          onClick={() => void state.moveLine(line.id, -1)}><Icon name="arrowUp" size="1.1em" /></button>
        <button className="pset-move" disabled={last} aria-label={`Move ${line.name} down`}
          onClick={() => void state.moveLine(line.id, 1)}><Icon name="arrowDown" size="1.1em" /></button>
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
          {/* NAMED FOR WHAT IT OPENS — the line's stopwatch and its filmed
              walk. "Workspace +" was the old container's name (HUNT 29). */}
          {busy ? 'Opening…' : 'Time & film'}
        </button>
        <button className="pset-x" onClick={remove} aria-label={`Remove ${line.name}`}><Icon name="close" size="0.85em" /></button>
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
    try {
      const r = await add(t, role);
      setText('');
      // The invite is the add (supabase/OWNER_INVITES.sql): somebody with an
      // account hears nothing new; somebody without can create one now. On a
      // database without that file the front door is still the
      // administrator's, and the screen says so rather than promising.
      setNote(!r.invited
        ? `${t} is on the project. If they have no account yet, inviting them from here needs OWNER_INVITES.sql run in Supabase; until then the administrator invites them.`
        : r.registered ? ''
        : `${t} can sign up now — tell them to open Faultline and create an account with that address. This project will be waiting for them.`);
    }
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
              aria-label={`Remove ${m.email}`}><Icon name="close" size="0.85em" /></button>
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
  const { archive } = useProjects();
  const lines = usePaceLines(projectId);
  /* The numbers on the peers row come from lib/standing.ts, the same call the
     dashboard and the client report make — a row that said something different
     from the page under it would be the whole problem back again. */
  const stand = useStanding(projectId);
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

  const commissioning = planModel(project) === 'commissioning';
  const linesSection = (
      <Fold id="pset-lines" title="Lines" need={lines.lines.length === 0}
        says={lines.lines.length === 0 ? 'none yet' : `${lines.lines.length} line${lines.lines.length === 1 ? '' : 's'} · ${lines.lines.filter(l => l.owner).length} with an owner`}>

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
        <LineTidyPanel projectId={project.id} lines={lines.lines} planModel={planModel(project)} />
      </Fold>
  );

  return (
    <div className="wrap pace project-setup">
      <Crumbs trail={[
        { label: 'Control room', to: '/' },
        { label: project.name, to: `/project/${project.id}` },
        { label: commissioning ? 'Details' : 'Lines & people' },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">{commissioning ? 'Project details' : 'Lines & people'}</h1>
          <p className="pace-lede">
            {commissioning
              ? 'What it is called, who leads it, the two dates it is judged on, and who is invited to see it.'
              : 'The lines this project runs, who owns each one, and who is invited to see it.'}
          </p>
        </div>
        <div className="pace-head-actions">
        </div>
      </header>
      {/* The gates row belongs to a stage-gate job, and this page is none of
          them: 'setup' lit the Set up GATE while you stood on the Details.
          Under the header, as on every page — see "THE PAGE FRAME". */}
      {commissioning && <Peers peers={projectPeers(project.id, 'details', stand.counts)} />}

      {/* FOLDS. Project, lines, measures and people were all open at once —
          2,900px on a phone. Each is a line until it is the one being worked on. */}
      <Fold id="pset-project" title={commissioning ? 'The project' : 'The project'} says={`${project.name} · led by ${project.lead || 'nobody yet'}`}>
        <ProjectIdentity projectId={projectId} />
      </Fold>

      {/* WHERE THE MACHINES ARE. A stage-gate job's machines, who supplied
          them and their stage lists live on Install, the first gate — the
          grid they are worked on. Details does not hold them, and said nothing
          about where they were. */}
      {commissioning && (
        <button className="why-door" onClick={() => nav(`/project/${project.id}/install`)}>
          <span className="why-door-t">Machines, who supplied them, and their stage lists</span>
          <span className="why-door-s">They are kept on Install, the first gate, where each one is worked through its stages ›</span>
        </button>
      )}

      {!commissioning && linesSection}

      {/* WHAT THIS BUSINESS MEASURES. Only on a project that runs a plan — a
          commissioning job proves a rate once, per pack, and has no periods to
          set targets across. */}
      {paced && <MeasuresSetup projectId={project.id} lines={lines.lines} fold />}

      <Fold id="pset-people" title="People" start={false}
        says={people.members.length ? `${people.members.length} invited · they see this project on their own device` : 'nobody else yet — invite by email'}>
        <div className="card">
          <ProjectPeople lead={project.lead} people={people} />
        </div>
      </Fold>

      {/* PUT IT AWAY. Rowland: "you removed the archive and delete system for
          projects." It was only ever on the All projects page — nowhere on the
          job itself or on Home, so from where he works it was not there. Archive
          is here, on the job, and Home's cards carry it too. Deleting for ever
          stays where it was: inside the archive, after it says what it takes. */}
      <section className="pace-sec">
        <div className="pace-sec-head">
          <h2 className="pace-sec-title">Put this project away</h2>
          <p className="pace-sec-sub">Archive takes it off Home and the project list · nothing is deleted · restore it whenever you like</p>
        </div>
        <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn" onClick={() => {
            if (!confirm(`Archive “${project.name}”?\n\nIt leaves Home and the list and loses nothing. You can restore it whenever you like.`)) return;
            void archive(project.id).then(() => nav('/projects?view=archive'));
          }}>Archive this project</button>
          <button className="btn btn-ghost" onClick={() => nav('/projects?view=archive')}>Open the archive</button>
          <span className="sub">Delete for ever is offered from the archive, after it says what it will take.</span>
        </div>
      </section>

      {/* A COMMISSIONING JOB'S LINES GO LAST. It has them — materials can be
          for one line — but they are not what anybody comes here to change. */}
      {commissioning && linesSection}
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
          <Cell value={project.description ?? ''} placeholder="Line 2 — new flow wrapper and checkweigher, handed over by Ilapak" wide
            onSave={v => void rename(project, { description: v || undefined })} />
        </label>
        {/* THE TWO DATES, HERE AS WELL. They were only behind "Dates" on the
            Testing screen, which is not where anybody looks to change what a
            project is. Same two fields — both doors write them. */}
        {/* ITS COLOUR, chosen. The all-jobs board draws each job in its own,
            and the app picked it — with no way to change it, two jobs could
            end up the same blue. */}
        <div className="proj-field pset-identity-desc">
          <span className="field-label">Its colour — on the home board and the reports</span>
          <span className="pset-swatches" role="radiogroup" aria-label="Project colour">
            {COLORS.map(c => (
              <button key={c} type="button" role="radio" aria-checked={project.color === c} aria-label={c}
                className={'pset-swatch' + (project.color === c ? ' on' : '')} style={{ background: c }}
                onClick={() => void rename(project, { color: c })} />
            ))}
          </span>
        </div>
        {!paced && (
          <>
            <label className="proj-field">
              <span className="field-label">Handover agreed</span>
              <input className="pset-cell is-wide" type="date" value={project.plannedAt ?? ''}
                onChange={e => void rename(project, { plannedAt: e.target.value || undefined })} />
            </label>
            <div className="proj-field">
              <span className="field-label">Now expected</span>
              {/* Later than it was? Asks why — the handover slip a client asks about first. */}
              <DateWhy className="pset-cell is-wide" ariaLabel="Handover now expected" value={project.expectedAt}
                projectId={project.id} storyKey={HANDOVER_KEY} what="Handover"
                onChange={v => rename(project, { expectedAt: v })} />
            </div>
          </>
        )}
      </div>

      {/* THE PLAN MODEL — the same choice offered when the project was started
          (see ProjectsScreen), kept changeable here for a project that turns
          out to need the other one. Two buttons, not two checkboxes: a project
          runs ONE plan, not zero or both, so this is a switch and not a pair of
          independent opt-ins. */}
      <div className="pset-tools">
        <p className="field-label">How this project runs</p>
        <div className="proj-model-grid">
          {MODELS.map(m => (
            <button key={m.id} type="button"
              className={'proj-model-opt' + (planModel(project) === m.id ? ' on' : '')}
              onClick={() => {
                /* ASKED, NOT ASSUMED. One tap reshaped every screen and the
                   client report, and a lever tree vanished behind the new
                   method with nothing said. It says what the job becomes, and
                   that nothing is deleted — switch back and it is all there. */
                const now = methodOf(project);
                if (now.id === m.id) return;
                if (!window.confirm(
                  `Run ${project.name} as ${m.label} instead of ${now.label}?\n\n`
                  + `${m.label}: ${m.organised}. Every screen and the client report change to it.\n\n`
                  + `Nothing is deleted. What belongs to ${now.label} is kept out of sight, and comes back if you switch back.`,
                )) return;
                void rename(project, setPlanModel(m.id));
              }}>
              <span className="proj-model-t">{m.label}</span>
              <span className="proj-model-s">{m.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AN EXTRA TOOL, NOT PART OF THE MODEL CHOICE. The Pareto sits beside
          whichever plan the project runs — it does not replace either one, so
          it stays a plain opt-in rather than a third slot in the switch above.
          It is drawn from the stops timed on the project's lines in the app
          (lib/paretoFromLog) — no workbook. Offered on 3P and lever tree
          jobs, which are the ones run on a line's losses. */}
      {paced && (
      <div className="pset-tools">
        <p className="field-label">Extra tools</p>
        <label className="pset-tool">
          <input type="checkbox" checked={!!project.pareto}
            onChange={e => void rename(project, { pareto: e.target.checked || undefined })} />
          <span className="pset-tool-m">
            <b>Pareto</b>
            <span className="sub">
              Where the time is actually going, ranked, from the stops timed on each line in the app.
              At the start of a project it says where to aim; four weeks on, the same ranking is
              evidence of whether the category you went after got smaller.
            </span>
          </span>
        </label>
      </div>
      )}
    </section>
  );
}
