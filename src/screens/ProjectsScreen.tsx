/* PROJECTS — the door into the app's improvement work.
 *
 * A project is an initiative with lines under it; each line has an owner, a
 * sponsor and a workspace of its own. This screen is deliberately thin: it
 * lists what exists, says who is accountable for each one, and gets out of the
 * way. Everything else happens inside a project.
 *
 * It exists because the app grew a second reader. When Project Pace was one
 * person's page, opening straight onto the A3 was right. Now that people are
 * invited into it, "which project?" is a real question and has to be asked
 * before the answer is shown. */
import { useEffect, useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { useProjects } from '../lib/useProjects';
import { allPaceLines, onDataChange, type PaceLineRow } from '../db';
import type { Project } from '../types';

/** The lines, grouped by project — the counts and the names shown on each card. */
function useLinesByProject(): Map<string, PaceLineRow[]> {
  const [lines, setLines] = useState<PaceLineRow[]>([]);
  useEffect(() => {
    const read = () => { void allPaceLines().then(setLines); };
    read();
    return onDataChange(read);
  }, []);
  return useMemo(() => {
    const by = new Map<string, PaceLineRow[]>();
    for (const l of lines) {
      const k = l.projectId ?? '';
      if (!by.has(k)) by.set(k, []);
      by.get(k)!.push(l);
    }
    return by;
  }, [lines]);
}

function ProjectCard({ p, lines }: { p: Project; lines: PaceLineRow[] }) {
  const withOwner = lines.filter(l => l.owner).length;
  return (
    <article className="proj-card" style={{ ['--proj' as string]: p.color }}>
      <button className="proj-open" onClick={() => nav(`/project/${p.id}`)}>
        <h2 className="proj-name">{p.name}</h2>
        {p.description && <p className="proj-desc">{p.description}</p>}
        <p className="proj-lead">
          {p.lead ? <><span className="proj-lead-role">Lead</span> {p.lead}</> : <span className="sub">No lead set</span>}
        </p>
        <div className="proj-lines">
          {lines.length === 0
            ? <span className="sub">No lines yet</span>
            : lines.map(l => (
                <span key={l.id} className="proj-chip" title={l.owner ? `${l.name} · ${l.owner}` : l.name}>
                  <span className="proj-chip-k">{l.key}</span>
                  {l.owner && <span className="proj-chip-o">{l.owner.split(' ')[0]}</span>}
                </span>
              ))}
        </div>
      </button>
      <footer className="proj-foot">
        <span className="sub">
          {lines.length} line{lines.length === 1 ? '' : 's'}
          {lines.length > 0 && ` · ${withOwner} owned`}
        </span>
        <span className="proj-foot-actions">
          <button className="btn btn-ghost" onClick={() => nav(`/project/${p.id}/setup`)}>Lines &amp; people</button>
          <button className="btn btn-primary" onClick={() => nav(`/project/${p.id}`)}>Open</button>
        </span>
      </footer>
    </article>
  );
}

export function ProjectsScreen() {
  const { loading, projects, create } = useProjects();
  const byProject = useLinesByProject();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [lead, setLead] = useState('');

  const doCreate = async () => {
    if (!name.trim()) return;
    const p = await create(name, lead.trim() || undefined);
    setName(''); setLead(''); setAdding(false);
    // Straight into setting it up: a project with no lines is not yet a project,
    // and the next thing to do is add one.
    nav(`/project/${p.id}/setup`);
  };

  if (loading) return <div className="wrap pace"><p className="sub">Loading projects…</p></div>;

  return (
    <div className="wrap pace projects-screen">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">Improvement</p>
          <h1 className="pace-title">Projects</h1>
          <p className="pace-lede">Each project runs a set of lines. Every line has an owner, a sponsor and a workspace of its own for its snag list, its captures and its reports.</p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-ghost pace-out" onClick={() => nav('/')}>‹ Workspaces</button>
          <button className="btn btn-primary" onClick={() => setAdding(a => !a)}>
            {adding ? 'Cancel' : 'New project'}
          </button>
          <AccountMenu />
        </div>
      </header>

      {adding && (
        <section className="card proj-new">
          <div className="field-label">New project</div>
          <div className="proj-new-grid">
            <label className="proj-field">
              <span className="field-label">Name</span>
              <input className="text-input" autoFocus value={name} maxLength={80}
                placeholder="Project Pace" onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }} />
            </label>
            <label className="proj-field">
              <span className="field-label">Lead</span>
              <input className="text-input" value={lead} maxLength={80}
                placeholder="Who is accountable for it" onChange={e => setLead(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }} />
            </label>
          </div>
          <div className="row-inline" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" disabled={!name.trim()} onClick={() => void doCreate()}>
              Create and add lines
            </button>
          </div>
          <p className="chip-hint">You add the lines next — that is where owners and sponsors go.</p>
        </section>
      )}

      {projects.length === 0 && !adding ? (
        <div className="card proj-empty">
          <h2 className="proj-empty-title">No projects yet</h2>
          <p className="sub">
            A project is an initiative with lines under it — each line with an owner, a sponsor and a
            workspace of its own. Start one, or wait to be invited to somebody else’s: a project you are
            invited to appears here the next time the app syncs.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
            Start a project
          </button>
        </div>
      ) : (
        <div className="proj-grid">
          {projects.map(p => <ProjectCard key={p.id} p={p} lines={byProject.get(p.id) ?? []} />)}
        </div>
      )}
    </div>
  );
}
