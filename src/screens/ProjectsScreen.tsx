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
import { useState } from 'react';
import { nav } from '../state/useRoute';
import { useProjects } from '../lib/useProjects';
import { MODELS, type PlanModel } from '../lib/planModel';
import { STORE_WORDS, updateProject } from '../db';
import { useCanStartProjects } from '../cloud/access';
import { useAccessByJob } from '../ui/JobsBoard';

export function ProjectsScreen() {
  const { loading, projects, archived, create, restore, purge, contents } = useProjects();
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  /* Somebody let in by a project invite works on the projects they were
     invited to and starts none of their own (supabase/ACCESS_LEVELS.sql). */
  const mayStart = useCanStartProjects();
  const [asked, setAdding] = useState(q.get('new') === '1');
  const adding = asked && mayStart;
  /* Restoring or deleting a project is its owner's (lib/access). */
  const accessOn = useAccessByJob(archived);
  /* THE ARCHIVE IS OPEN HERE. This page used to list the live projects again
     (Home already does) with the archive shut underneath; now Home is the list
     and this is where a project starts and where the archive lives. */
  const [showArchive, setShowArchive] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [lead, setLead] = useState('');
  const [handover, setHandover] = useState('');
  /* THE PLAN MODEL, ASKED FOR ONCE, AT THE START.
   *
   * A project runs its plan on the 3P board (People / Plant / Process, off the
   * weekly tracker) or on the lever tree (outcome -> conditions -> work, kept by
   * hand). Almost never both — they are two different ways of answering "what
   * are we doing and why", not two features to switch on. Asking here, before
   * the project has a single line in it, means nobody discovers the choice was
   * ever made by tripping over a ticked box in Lines & people three weeks in.
   * It stays changeable there afterwards; this is just where it starts.
   *
   * NOTHING IS PICKED FOR YOU. Three methods, each for a different kind of
   * job — a default is a choice made without anybody noticing there was one. */
  const [model, setModel] = useState<PlanModel | null>(null);

  const doCreate = async () => {
    if (!name.trim() || !model) return;
    const p = await create(name, lead.trim() || undefined, model);
    /* THE DATE IT IS MEASURED AGAINST, ASKED AT THE START. A stage-gate job
       is judged on its handover — every screen and the client report count
       to it — and it was only asked for later, under Details, so a new job
       opened with nothing to be measured against. What is agreed is also what
       is expected, until it moves (and then the move asks why). */
    if (model === 'commissioning' && handover) {
      await updateProject({ ...p, plannedAt: handover, expectedAt: handover, updatedAt: Date.now() });
    }
    setName(''); setLead(''); setHandover(''); setAdding(false); setModel(null);
    /* Straight into the job. A commissioning project starts with its machines
       and its first test, on the Testing screen; it used to land on Lines &
       people and ask for a line with a sponsor. A 3P or lever-tree project is
       its lines, so that one still starts there. Stage gate starts on Install
       now, where the machines are named. */
    nav(model === 'commissioning' ? `/project/${p.id}/install` : `/project/${p.id}/setup`);
  };

  if (loading) return <div className="wrap pace"><p className="sub">Loading projects…</p></div>;

  return (
    <div className="wrap pace projects-screen">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Projects</h1>
          <p className="pace-lede">
            {mayStart
              ? 'Every project is a change to a line. The live ones are on Home; this is where one starts, and where the archive is.'
              : 'Every project is a change to a line. The ones you’ve been invited to are on Home; the archive is here.'}
          </p>
        </div>
        <div className="pace-head-actions">
          {/* One blue button on the page: while the form is open, that is its
              Create — Cancel steps back to a quiet one. */}
          {mayStart && (
            <button className={'btn ' + (adding ? 'btn-ghost' : 'btn-primary')} onClick={() => setAdding(a => !a)}>
              {adding ? 'Cancel' : 'New project'}
            </button>
          )}
          {/* The Excel export of everything used to be a button here; it is a
              line in every project's Reports door now (ui/ReportsSheet), with
              the rest of what goes on paper. */}
        </div>
      </header>

      {adding && (
        <section className="card proj-new">
          <div className="field-label">New project</div>
          {/* START FROM THE SITUATION, NOT THE METHOD. Nobody should have to
              know what a "lever tree" is to start the right kind of change:
              say what you are trying to do and the way it is run follows. The
              name and the lead come once that is said. */}
          <div className="proj-model">
            <span className="field-label">What are you trying to do?</span>
            <div className="proj-model-grid">
              {MODELS.map(m => (
                <button key={m.id} type="button" aria-pressed={model === m.id}
                  className={'proj-model-opt' + (model === m.id ? ' on' : '')}
                  onClick={() => setModel(m.id)}>
                  <span className="proj-model-t">{m.situation}</span>
                  <span className="proj-model-q">{m.blurb}</span>
                  <span className="proj-model-s">{m.useWhen}</span>
                  <span className="proj-model-runs">Runs as <b>{m.label}</b></span>
                  <dl className="proj-model-dl">
                    <dt>Built from</dt><dd>{m.organised}</dd>
                    <dt>Rhythm</dt><dd>{m.rhythm}</dd>
                    <dt>Done when</dt><dd>{m.done}</dd>
                    <dt>Prints</dt><dd>{m.document}</dd>
                  </dl>
                </button>
              ))}
            </div>
            {!model && <p className="chip-hint">Pick the closest. It can be changed later under Details.</p>}
          </div>
          {model && (
            <div className="proj-new-grid" style={{ marginTop: 12 }}>
              <label className="proj-field">
                <span className="field-label">Name</span>
                <input className="text-input" autoFocus value={name} maxLength={80}
                  placeholder={model === 'board' ? 'e.g. Line 7 performance' : model === 'tree' ? 'e.g. Line 7 to 60 ppm by March' : 'e.g. Line 7 new wrapper'} onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }} />
              </label>
              <label className="proj-field">
                <span className="field-label">Lead</span>
                <input className="text-input" value={lead} maxLength={80}
                  placeholder="Who is accountable for it" onChange={e => setLead(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }} />
              </label>
              {model === 'commissioning' && (
                <label className="proj-field">
                  <span className="field-label">Handover agreed <span className="cw-f-opt">if there is one yet</span></span>
                  <input className="text-input" type="date" value={handover} onChange={e => setHandover(e.target.value)} />
                </label>
              )}
            </div>
          )}
          <div className="row-inline" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" disabled={!name.trim() || !model} onClick={() => void doCreate()}>
              {!model ? 'Say what you are trying to do' : model === 'commissioning' ? 'Create and add the machines' : 'Create and add lines'}
            </button>
          </div>
          {model && (
            <p className="chip-hint">
              {model === 'commissioning'
                ? 'You name the machines and who supplied them next, then their install stages and tests.'
                : 'You add the lines next — that is where owners and sponsors go.'}
            </p>
          )}
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
              archive below, with everything they hold. {mayStart ? 'Restore whichever you want back, or start a new one.' : 'Its owner can bring it back.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => setShowArchive(true)}>Open the archive</button>
              {mayStart && <button className="btn btn-primary" onClick={() => setAdding(true)}>Start a project</button>}
            </div>
          </div>
        ) : (
          <div className="card proj-empty">
            <h2 className="proj-empty-title">No projects yet</h2>
            {mayStart ? <>
              <p className="sub">
                A project is an initiative with lines under it — each line with an owner, a sponsor and a
                workspace of its own. Start one, or wait to be invited to somebody else’s: a project you are
                invited to appears here the next time the app syncs.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
                Start a project
              </button>
            </> : (
              <p className="sub">You’ll see the projects you’ve been invited to here, the next time the app syncs.</p>
            )}
          </div>
        )
      ) : !adding && (
        <p className="sub proj-live">
          {projects.length} project{projects.length === 1 ? '' : 's'} running —{' '}
          <button type="button" className="cw-link" onClick={() => nav('/')}>on Home ›</button>
        </p>
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
                  {accessOn(p.id).remove ? <>
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
                          ? owned.map(c => `${c.count} ${STORE_WORDS[c.store] ?? c.store}`).join('\n  ')
                          : 'nothing else — it is empty';
                        const ok = confirm(
                          `Delete “${p.name}” for ever?\n\nThis also deletes:\n  ${what}\n\n` +
                          'The filmed walks are NOT deleted — a walk belongs to its line and stays with it.\n\n' +
                          'This cannot be undone, on any device.',
                        );
                        if (ok) await purge(p.id);
                      } finally { setBusy(null); }
                    })()}>
                    Delete for ever
                  </button>
                  </> : <span className="sub">Its owner can restore it</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}


