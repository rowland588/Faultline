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
import { useEffect, useState } from 'react';
import { nav } from '../state/useRoute';
import { useProjects } from '../lib/useProjects';
import { METHODS, methodByKey, methodOfProject, type MethodKey } from '../lib/methods';

/* A PROJECT'S KIND IS ITS METHOD (docs/METHODS.md, M3): the eight methods' names, then — for a project from before them — the
   plan model it was made on (Performance (6M), Lever tree). One reader of it, for the chips and the rows. */
const kindOf = (p: Parameters<typeof planModel>[0] & { method?: MethodKey }): string => methodOfProject(p) ?? planModel(p);
const KINDS: { key: string; label: string }[] = [...METHODS.map(m => ({ key: m.key as string, label: m.name })), ...MODELS.map(m => ({ key: m.id as string, label: m.label }))];
const kindLabel = (p: Parameters<typeof kindOf>[0]): string => { const m = methodOfProject(p); return m ? (methodByKey(m)?.name ?? m) : methodOf(p).label; };
import { methodOf, MODELS, planModel, type PlanModel } from '../lib/planModel';
import { FilterBar, RecordRow, RecordRows } from '../ui/parts';
import { useLineRecords } from '../lib/useLineRecords';
import { STORE_WORDS, addPaceLine, listAllPrograms, listAllSnags, listObservations, listStudiesForLine, listWorkspaces, onDataChange, updateProject } from '../db';
import { lineKey, liveProductionLines } from '../lib/lines';
import type { Workspace } from '../types';
import { useCanStartProjects } from '../cloud/access';
import { useAccessByJob } from '../ui/JobsBoard';
import { lineProblems, lineProblemsSaid, ownProgramsOf, type LineProblems } from '../lib/lineWork';
import { PRIORITY_WORD } from '../lib/snagsReport';
import { currentLosses, lossCardLine } from '../lib/studyLinks';
import { daysOverdue, stateOf } from '../lib/programs';
import { niceDay, todayISO } from '../lib/weeks';

/* WHERE THE LINE IS, ABOVE THE CHOICE OF METHOD (FLOW-AUDIT.md, 19). "Start
 * a project on this line" opened three method cards that did not say the line,
 * and the new job started from nothing — CLAUDE.md: "start a change from the
 * situation (not from a method picker)". So a project started from a line's
 * page is "A change on Line 7", and over the three ways it is run sits what
 * the line already says: its problems open (worst first, the critical and the
 * late in red with their words — lib/lineWork, as its page and the control
 * room say them), its latest shift counted (the loss count's own sentence)
 * and its own programs past their test day. Nothing new is stored. */
interface Situation { problems: LineProblems; loss?: { text: string; abnormal: boolean }; programs: { what: string; was: string }[] }

function useLineSituation(ws?: Workspace): Situation | null {
  const [sit, setSit] = useState<Situation | null>(null);
  useEffect(() => {
    let live = true;
    if (!ws) { setSit(null); return; }
    const load = () => void Promise.all([listAllSnags(), listStudiesForLine(ws.id), listObservations(ws.id), listAllPrograms()]).then(([snags, studies, obs, programs]) => {
      if (!live) return;
      const cur = currentLosses(studies.filter(x => !x.deletedAt), ws.id);
      const loss = cur ? lossCardLine(cur, { observations: obs, workspaces: [ws] }) : undefined;
      const today = todayISO();
      setSit({
        problems: lineProblems(snags, ws),
        ...(loss ? { loss } : {}),
        programs: ownProgramsOf(programs, ws.id).filter(p => stateOf(p) !== 'proved' && daysOverdue(p, today) != null)
          .map(p => ({ what: p.what, was: niceDay(p.testOn ?? today) })),
      });
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [ws]);
  return sit;
}

function LineSituation({ ws, sit }: { ws: Workspace; sit: Situation | null }) {
  const first = sit?.problems.rows.slice(0, 3) ?? [];
  const more = (sit?.problems.open ?? 0) - first.length;
  return (
    <div className="proj-sit" role="group" aria-label={`Where ${ws.name} is`}>
      <h2 className="proj-sit-h">A change on {ws.name}</h2>
      {!sit ? <p className="sub">Reading the line…</p> : <>
        <p className="proj-sit-says">
          {lineProblemsSaid(sit.problems).map((x, i) => (x.red ? <b key={i} className="is-r">{x.text}</b> : x.text))}
          {sit.problems.open ? '' : ' on it.'}
        </p>
        {first.length > 0 && (
          <ul className="proj-sit-list">
            {first.map(r => (
              <li key={r.id}>
                <span className={'qsl-prio ' + (r.priority === 'critical' ? 'is-r' : r.priority === 'high' ? 'is-a' : 'is-g')}>{PRIORITY_WORD[r.priority]}</span>
                <b>{r.what}</b>
                {r.due && <span className={r.late ? 'is-r' : 'sub'}> · {r.due}</span>}
              </li>
            ))}
            {more > 0 && <li className="sub"><a href={`#/snags?line=${encodeURIComponent(ws.id)}`}>and {more} more on its register ›</a></li>}
          </ul>
        )}
        <p className="proj-sit-l"><span className="sub">The latest shift counted: </span>
          {sit.loss ? <span className={sit.loss.abnormal ? 'is-a' : ''}>{sit.loss.text}</span> : <span className="sub">none counted yet — a loss count on this line says where the time goes</span>}
        </p>
        {sit.programs.length > 0 && (
          <p className="proj-sit-l"><span className="sub">Its programs: </span>
            {sit.programs.map((p, i) => <span key={i}>{i ? ' · ' : ''}{p.what} — <b className="is-r">test was {p.was}</b></span>)}
          </p>
        )}
      </>}
    </div>
  );
}

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
  /* PROJECTS LISTS THE PROJECTS (docs/STRUCTURE.md §5.6, D4, B5): the live ones first, by kind and by
     line, the archive behind its own chip — where this page said they were on the control room. */
  const [kind, setKind] = useState<string>('all');
  const [onLine, setOnLine] = useState('');
  const rec = useLineRecords();
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [lead, setLead] = useState('');
  const [handover, setHandover] = useState('');
  /* WHICH LINES IT IS ON — taken from Your factory (Rowland, 13 October: "a
     factory setup before the new projects ... assign everything to a
     production line"). Several, as manufacturing is; none is allowed and
     added later in Lines & people. */
  const [factory, setFactory] = useState<Workspace[]>([]);
  /* opened from a line's own page (Start a job on this line), that line is picked */
  const fromLine = q.get('line') ?? '';
  const [onLines, setOnLines] = useState<string[]>(() => (fromLine ? [fromLine] : []));
  useEffect(() => {
    let live = true;
    const load = () => void listWorkspaces().then(liveProductionLines).then(ls => { if (live) setFactory(ls); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
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
  /* THE METHOD IS THE PROJECT (docs/METHODS.md, M3 — Rowland, 31 October: "the method equals the
     project"). Eight methods are offered, none picked for you; ?method= (or the older
     ?model=commissioning, the stage gate's address) picks one. The plan model the older readers
     want follows from it: the stage gate is the commissioning list, every other method a board. */
  const fromAddress = (h: URLSearchParams): MethodKey | null => {
    const m = h.get('method');
    if (m && METHODS.some(x => x.key === m)) return m as MethodKey;
    return h.get('model') === 'commissioning' ? 'stage-gate' : null;
  };
  const [method, setMethod] = useState<MethodKey | null>(() => fromAddress(q));
  const model: PlanModel | null = method ? (method === 'stage-gate' ? 'commissioning' : 'board') : null;
  /* ?new=1 ARRIVING WHILE THE PAGE IS OPEN — a link to start a project followed from Projects itself
     (the address changes, the page stays): open New, with the method the link names (B5) */
  useEffect(() => {
    const on = () => {
      const h = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      if (h.get('new') !== '1') return;
      setAdding(true);
      const m = fromAddress(h);
      if (m) setMethod(m);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  /* the line it was started from, and where that line is */
  const startLine = factory.find(w => w.id === fromLine);
  const sit = useLineSituation(startLine);

  const doCreate = async () => {
    if (!name.trim() || !model || !method) return;
    const p = await create(name, lead.trim() || undefined, model, method ?? undefined);
    /* THE DATE IT IS MEASURED AGAINST, ASKED AT THE START. A stage-gate job
       is judged on its handover — every screen and the client report count
       to it — and it was only asked for later, under Details, so a new job
       opened with nothing to be measured against. What is agreed is also what
       is expected, until it moves (and then the move asks why). */
    if (model === 'commissioning' && handover) {
      await updateProject({ ...p, plannedAt: handover, expectedAt: handover, updatedAt: Date.now() });
    }
    /* the lines picked from the factory become the project's lines, each
       naming its factory line — never a second line of the same name */
    const picked = factory.filter(w => onLines.includes(w.id));
    for (const [i, w] of picked.entries()) await addPaceLine({ projectId: p.id, key: lineKey(w.name), name: w.name, workspaceId: w.id, sort: i + 1 });
    setName(''); setLead(''); setHandover(''); setAdding(false); setMethod(null); setOnLines([]);
    /* Straight into the job. A commissioning project starts with its machines
       and its first test, on the Testing screen; it used to land on Lines &
       people and ask for a line with a sponsor. A 3P or lever-tree project is
       its lines, so that one still starts there. Stage gate starts on Install
       now, where the machines are named. A 6M or lever tree job lands on its
       own front page, which leads with "Getting it running" — the steps in
       order, the line first (lib/startHere). Rowland, 6 October: it dropped
       him on the whole setup form with "no clear start here, do this". */
    nav(model === 'commissioning' ? `/project/${p.id}/install` : `/project/${p.id}`);
  };

  if (loading) return <div className="wrap pace"><p className="sub">Loading projects…</p></div>;

  return (
    <div className="wrap pace projects-screen">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Projects</h1>
          <p className="pace-lede">
            {mayStart
              ? 'Every project is a change to a line — the first due first, by kind and by line, the archive behind its chip.'
              : 'Every project you have been invited to — the first due first, by kind and by line, the archive behind its chip.'}
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
          {startLine && <LineSituation ws={startLine} sit={sit} />}
          {/* START FROM THE SITUATION, NOT THE METHOD. Nobody should have to
              know what a "lever tree" is to start the right kind of change:
              say what you are trying to do and the way it is run follows. The
              name and the lead come once that is said. */}
          <div className="proj-model">
            <span className="field-label">{startLine ? `Which method will run it on ${startLine.name}?` : 'Which method will run it?'}</span>
            <div className="proj-model-grid">
              {METHODS.map(m => (
                <button key={m.key} type="button" aria-pressed={method === m.key}
                  className={'proj-model-opt' + (method === m.key ? ' on' : '')}
                  onClick={() => setMethod(m.key)}>
                  <span className="proj-model-t">{m.name}</span>
                  <span className="proj-model-q">{m.question}</span>
                  <span className="proj-model-s">{m.sections.map(x => x.name).join(' · ')}</span>
                </button>
              ))}
            </div>
            <p className="chip-hint">
              The tools fit into the method’s sections — add or leave out whichever you need.
              Programs and tests live on the line —{' '}
              {startLine
                ? <a href={`#/programs?line=${encodeURIComponent(startLine.id)}`}>open {startLine.name}’s Programs ›</a>
                : <a href="#/factory">set up a line on the Factory ›</a>}
              {' '}when you only need to prove, not a project.
            </p>
          </div>
          {model && (
            <div className="proj-new-grid">
              <label className="proj-field">
                <span className="field-label">Name</span>
                <input className="text-input" autoFocus value={name} maxLength={80}
                  placeholder={(n => (model === 'commissioning' ? `e.g. ${n} new wrapper` : `e.g. ${n} performance`))(startLine?.name ?? 'Line 7')} onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }} />
              </label>
              <label className="proj-field">
                <span className="field-label">Lead</span>
                <input className="text-input" value={lead} maxLength={80}
                  placeholder="Who is accountable for it" onChange={e => setLead(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }} />
              </label>
              <div className="proj-field proj-lines" role="group" aria-label="Which lines it is on">
                <span className="field-label">Which line{factory.length === 1 ? '' : 's'} is it on? <span className="cw-f-opt">from your factory</span></span>
                {factory.length === 0
                  ? <span className="chip-hint">The factory has no lines yet. <a href="#/factory?add=1">Set up your factory ›</a> — or start now and add the lines later.</span>
                  : (
                    <span className="proj-lines-chips">
                      {factory.map(w => {
                        const on = onLines.includes(w.id);
                        return (
                          <button key={w.id} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on}
                            onClick={() => setOnLines(xs => (on ? xs.filter(x => x !== w.id) : [...xs, w.id]))}>
                            {w.name}{w.lineType ? <span className="proj-lines-t"> · {w.lineType}</span> : null}
                          </button>
                        );
                      })}
                    </span>
                  )}
              </div>
              {model === 'commissioning' && (
                <label className="proj-field">
                  <span className="field-label">Handover agreed <span className="cw-f-opt">if there is one yet</span></span>
                  <input className="text-input" type="date" value={handover} onChange={e => setHandover(e.target.value)} />
                </label>
              )}
            </div>
          )}
          {/* the Create comes with the kind of project picked */}
          {model && (
            <div className="row-inline" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" disabled={!name.trim()} onClick={() => void doCreate()}>
                {model === 'commissioning' ? 'Create and add the machines' : 'Create project'}
              </button>
            </div>
          )}
          {method && (
            <p className="chip-hint">
              {model === 'commissioning'
                ? 'Machines on the line, programs and tests; open the line’s Programs without a project when you only need to prove.'
                : 'It opens on the method’s sections — tools go in where they are needed.'}
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
                Prove with Programs on the line first — no project required. Start Performance (6M) when fault-finding
                and Actions need a project, or wait to be invited to somebody else’s: a project you are invited to
                appears here the next time the app syncs.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
                Start a project
              </button>
            </> : (
              <p className="sub">You’ll see the projects you’ve been invited to here, the next time the app syncs.</p>
            )}
          </div>
        )
      ) : !adding && (() => {
        /* each project's lines — Your factory's name, or the project's own for a line not in the factory yet */
        const linesOf = (id: string) => [...new Map(rec.jobLines.filter(l => !l.deletedAt && l.projectId === id).map(l => {
          const w = rec.all.find(x => x.id === l.workspaceId);
          return [w?.id ?? l.id, { id: w?.id ?? l.id, name: w?.name ?? (l as { name?: string }).name ?? 'a line' }] as const;
        })).values()];
        const shown = projects.filter(p => (kind === 'all' || kindOf(p) === kind) && (!onLine || linesOf(p.id).some(l => l.id === onLine)));
        const today = todayISO();
        return (
          <section className="proj-list" aria-label="The projects">
            {/* THE FILTERS ARE THE COUNTS (CLAUDE.md, simplicity 1): every project, each kind, the archive */}
            <FilterBar label="Which projects" value={kind} onChange={k => setKind(k)}
              filters={[{ key: 'all', label: 'All', count: projects.length },
                ...KINDS.filter(k => projects.some(p => kindOf(p) === k.key)).map(k => ({ key: k.key, label: k.label, count: projects.filter(p => kindOf(p) === k.key).length })),
                ...(archived.length ? [{ key: 'archived', label: 'Archived', count: archived.length }] : [])]}>
              {kind !== 'archived' && factory.length > 1 && (
                <select className="text-input proj-line-f" value={onLine} onChange={e => setOnLine(e.target.value)} aria-label="On which line">
                  <option value="">All lines</option>
                  {factory.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
            </FilterBar>
            {kind !== 'archived' && (
              <RecordRows label="The projects, the first due first">
                {shown.length === 0 && <li className="sub">No project here — {onLine ? 'none is on that line' : 'none of this kind'}.</li>}
                {[...shown].sort((a, b) => (a.expectedAt ?? a.plannedAt ?? '\uffff').localeCompare(b.expectedAt ?? b.plannedAt ?? '\uffff') || a.name.localeCompare(b.name)).map(p => {
                  const due = p.expectedAt ?? p.plannedAt;
                  const lines = linesOf(p.id).map(l => l.name);
                  return (
                    <RecordRow key={p.id} what={p.name}
                      says={<>{kindLabel(p)}{p.lead ? <> · led by {p.lead}</> : null}</>}
                      where={[lines.length ? lines.join(', ') : 'No line yet', due ? `${due < today ? 'handover was' : 'handover'} ${niceDay(due, { weekday: 'short' })}` : 'no handover date'].join(' · ')}
                      onOpen={() => nav(`/project/${p.id}`)} />
                  );
                })}
              </RecordRows>
            )}
          </section>
        );
      })()}

      {archived.length > 0 && (kind === 'archived' || projects.length === 0) && (
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


