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
import { Crumbs } from '../ui/Crumbs';
import { ProjectCard } from '../ui/ProjectCard';
import { useProjects } from '../lib/useProjects';
import { MODELS, type PlanModel } from '../lib/planModel';
import { allPaceLines, onDataChange, DEFAULT_PROJECT_ID, type PaceLineRow } from '../db';

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

export function ProjectsScreen() {
  const { loading, projects, archived, create, archive, restore, purge, contents } = useProjects();
  const byProject = useLinesByProject();
  const [adding, setAdding] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [lead, setLead] = useState('');
  /* THE PLAN MODEL, ASKED FOR ONCE, AT THE START.
   *
   * A project runs its plan on the 3P board (People / Plant / Process, off the
   * weekly tracker) or on the lever tree (outcome -> conditions -> work, kept by
   * hand). Almost never both — they are two different ways of answering "what
   * are we doing and why", not two features to switch on. Asking here, before
   * the project has a single line in it, means nobody discovers the choice was
   * ever made by tripping over a ticked box in Lines & people three weeks in.
   * It stays changeable there afterwards; this is just where it starts. */
  const [model, setModel] = useState<PlanModel>('board');

  const doCreate = async () => {
    if (!name.trim()) return;
    const p = await create(name, lead.trim() || undefined, model);
    setName(''); setLead(''); setAdding(false); setModel('board');
    // Straight into setting it up: a project with no lines is not yet a project,
    // and the next thing to do is add one.
    nav(`/project/${p.id}/setup`);
  };

  if (loading) return <div className="wrap pace"><p className="sub">Loading projects…</p></div>;

  return (
    <div className="wrap pace projects-screen">
      <Crumbs trail={[{ label: 'Home', to: '/' }, { label: 'Projects' }]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">Improvement</p>
          <h1 className="pace-title">Projects</h1>
          <p className="pace-lede">Each project runs a set of lines. Every line has an owner, a sponsor and a workspace of its own for its snag list, its captures and its reports.</p>
        </div>
        <div className="pace-head-actions">
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
          <div className="proj-model">
            <span className="field-label">Plan model</span>
            <div className="proj-model-grid">
              {MODELS.map(m => (
                <button key={m.id} type="button"
                  className={'proj-model-opt' + (model === m.id ? ' on' : '')}
                  onClick={() => setModel(m.id)}>
                  <span className="proj-model-t">{m.label}</span>
                  <span className="proj-model-s">{m.blurb}</span>
                </button>
              ))}
            </div>
            <p className="chip-hint">Changeable later under Lines &amp; people, if the project turns out to need the other one.</p>
          </div>
          <div className="row-inline" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" disabled={!name.trim()} onClick={() => void doCreate()}>
              Create and add lines
            </button>
          </div>
          <p className="chip-hint">You add the lines next — that is where owners and sponsors go.</p>
        </section>
      )}

      {/* AN EMPTY LIST IS NOT ALWAYS AN EMPTY APP. Archive everything and this
          said "No projects yet" with an archive sitting underneath holding all
          of them — telling somebody their work is gone while it is visible on
          the same screen. The two states have different news and a different
          next move. */}
      {projects.length === 0 && !adding ? (
        archived.length > 0 ? (
          <div className="card proj-empty">
            <h2 className="proj-empty-title">Everything is archived</h2>
            <p className="sub">
              Nothing is lost — {archived.length === 1 ? 'one project is' : `all ${archived.length} projects are`} in the
              archive below, with everything they hold. Restore whichever you want back, or start a new one.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => setShowArchive(true)}>Open the archive</button>
              <button className="btn btn-primary" onClick={() => setAdding(true)}>Start a project</button>
            </div>
          </div>
        ) : (
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
        )
      ) : (
        <div className="proj-grid">
          {projects.map(p => (
            <ProjectCard key={p.id} p={p} lines={byProject.get(p.id) ?? []}
              onArchive={p.id === DEFAULT_PROJECT_ID ? undefined : () => void archive(p.id)} />
          ))}
        </div>
      )}

      {/* THE ARCHIVE. Behind one tap, and closed by default — it is where things
          go to stop being looked at, so it must not take up room in the list it
          was meant to shorten. */}
      {archived.length > 0 && (
        <section className="proj-arch">
          <button className="proj-arch-h" onClick={() => setShowArchive(v => !v)} aria-expanded={showArchive}>
            <span>Archived</span>
            <span className="proj-arch-n">{archived.length}</span>
            <span className="proj-arch-x" aria-hidden>{showArchive ? '−' : '+'}</span>
          </button>

          {showArchive && (
            <div className="proj-arch-list">
              {archived.map(p => (
                <div key={p.id} className="proj-arch-row">
                  <span className="proj-arch-dot" style={{ background: p.color }} aria-hidden />
                  <span className="proj-arch-main">
                    <span className="proj-arch-t">{p.name}</span>
                    <span className="proj-arch-s">
                      Archived {new Date(p.archivedAt ?? 0).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </span>
                  <button className="btn btn-ghost btn-sm" disabled={busy === p.id}
                    onClick={() => void restore(p.id)}>Restore</button>
                  {/* DELETING IS ONLY REACHABLE FROM HERE, and it says what it
                      will take before it takes it. Nobody can agree to "delete
                      everything" without being told what everything is. */}
                  <button className="btn btn-sm proj-arch-del" disabled={busy === p.id}
                    onClick={() => void (async () => {
                      setBusy(p.id);
                      try {
                        const owned = await contents(p.id);
                        const what = owned.length
                          ? owned.map(c => `${c.count} ${LABEL[c.store] ?? c.store}`).join('\n  ')
                          : 'nothing else — it is empty';
                        const ok = confirm(
                          `Delete “${p.name}” for ever?\n\nThis also deletes:\n  ${what}\n\n` +
                          'Its LINES and their walk evidence are not deleted — those belong to the line and outlive the project.\n\n' +
                          'This cannot be undone, on any device.',
                        );
                        if (ok) await purge(p.id);
                      } finally { setBusy(null); }
                    })()}>
                    Delete for ever
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** What each store is called when somebody is being asked to destroy it.
 *  "5 commission_items" is not something anybody can consent to. */
const LABEL: Record<string, string> = {
  tests: 'tests',
  test_items: 'things found and next steps',
  commission_assets: 'machines',
  tree_nodes: 'lever-tree nodes',
  project_targets: 'quarterly targets',
  project_actuals: 'weekly actuals',
};
