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
import { useClientScope } from '../lib/activeClient';
import { nav } from '../state/useRoute';
import { useProjects } from '../lib/useProjects';
import { modelOfMethod, putProjectOnLines } from '../lib/newProject';
import { METHODS, methodByKey, methodOfProject, type MethodKey } from '../lib/methods';
import { MethodPicture } from '../ui/MethodPicture';

/* A PROJECT'S KIND IS ITS METHOD (docs/METHODS.md, M3): the eight methods' names, then — for a project from before them — the
   plan model it was made on (Performance (6M), Lever tree). One reader of it, for the chips and the rows. */
const kindOf = (p: Parameters<typeof planModel>[0] & { method?: MethodKey; programKey?: 'line-recovery' }): string => p.programKey ?? methodOfProject(p) ?? planModel(p);
const KINDS: { key: string; label: string }[] = [{ key: 'line-recovery', label: 'Line recovery' }, ...METHODS.map(m => ({ key: m.key as string, label: m.name })), ...MODELS.map(m => ({ key: m.id as string, label: m.label }))];
const kindLabel = (p: Parameters<typeof kindOf>[0]): string => { if (p.programKey === 'line-recovery') return 'Line recovery'; const m = methodOfProject(p); return m ? (methodByKey(m)?.name ?? m) : methodOf(p).label; };
import { methodOf, MODELS, planModel, type PlanModel } from '../lib/planModel';
import { RecordRow, RecordRows } from '../ui/parts';
import { EmptyState } from '../ui/EmptyState';
import { useLineRecords } from '../lib/useLineRecords';
import { STORE_WORDS, listAllPrograms, listAllSnags, listObservations, listStudiesForLine, listWorkspaces, onDataChange, updateProject } from '../db';
import { liveProductionLines } from '../lib/lines';
import { linesAtSite, recoveryLinesForClient } from '../project/recovery/siteLines';
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
  const { loading, projects: everyLive, archived: everyArchived, create, restore, purge, contents } = useProjects();
  /* THE ACTIVE CLIENT'S PROJECTS (lib/activeClient, docs/CONSULTANT-WORKSPACE.md C1); under All clients each row says whose */
  const cs = useClientScope();
  const projects = useMemo(() => everyLive.filter(p => cs.project(p.id)), [everyLive, cs]);
  const archived = useMemo(() => everyArchived.filter(p => cs.project(p.id)), [everyArchived, cs]);
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  /* Somebody let in by a project invite works on the projects they were
     invited to and starts none of their own (supabase/ACCESS_LEVELS.sql). */
  const mayStart = useCanStartProjects();
  const [asked, setAdding] = useState(q.get('new') === '1');
  const [recovery, setRecovery] = useState(q.get('program') === 'line-recovery');
  const [combineLines, setCombineLines] = useState(false);
  const [showOtherSites, setShowOtherSites] = useState(false);
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
  const [allFactory, setFactory] = useState<Workspace[]>([]);
  /* the active client's lines — a new project is put on its own business's lines */
  const factory = useMemo(() => allFactory.filter(w => cs.line(w.id)), [allFactory, cs]);
  /* opened from a line's own page (Start a job on this line), that line is picked */
  const fromLine = q.get('line') ?? '';
  const fromSite = q.get('site') ?? '';
  const fromClient = q.get('client') ?? '';
  const [onLines, setOnLines] = useState<string[]>(() => (fromLine ? [fromLine] : []));
  const atSite = recovery ? linesAtSite(factory, fromSite, fromClient) : [];
  const pickedLines = factory.filter(w => onLines.includes(w.id));
  const oneClient = new Set(pickedLines.map(w => w.clientName?.trim() || '')).size === 1;
  const candidates = fromSite && !showOtherSites && recovery ? atSite : factory;
  const offeredLines = recovery && combineLines ? recoveryLinesForClient(candidates, pickedLines[0]) : candidates;
  const validRecovery = pickedLines.length > 0 && pickedLines.length === onLines.length
    && (combineLines || pickedLines.length === 1) && oneClient;
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
  const [method, setMethod] = useState<MethodKey | null>(() => q.get('program') === 'line-recovery' ? null : fromAddress(q));
  const model: PlanModel | null = method ? modelOfMethod(method) : null;
  /* ?new=1 ARRIVING WHILE THE PAGE IS OPEN — a link to start a project followed from Projects itself
     (the address changes, the page stays): open New, with the method the link names (B5) */
  useEffect(() => {
    const on = () => {
      const h = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      if (h.get('new') !== '1') return;
      setAdding(true);
      if (h.get('program') === 'line-recovery') { setRecovery(true); setMethod(null); setCombineLines(false); setShowOtherSites(false); setOnLines(h.get('line') ? [h.get('line') as string] : []); return; }
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
    if (!name.trim() || (recovery && !validRecovery) || (!recovery && (!model || !method))) return;
    const p = await create(name, lead.trim() || undefined, recovery ? 'board' : model ?? undefined, recovery ? 'dmaic' : method ?? undefined, recovery ? 'line-recovery' : undefined);
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
    await putProjectOnLines(p.id, pickedLines);
    const wasRecovery = recovery;
    setName(''); setLead(''); setHandover(''); setAdding(false); setMethod(null); setRecovery(false); setCombineLines(false); setShowOtherSites(false); setOnLines([]);
    /* Straight into the job. A commissioning project starts with its machines
       and its first test, on the Testing screen; it used to land on Lines &
       people and ask for a line with a sponsor. A 3P or lever-tree project is
       its lines, so that one still starts there. Stage gate starts on Install
       now, where the machines are named. A 6M or lever tree job lands on its
       own front page, which leads with "Getting it running" — the steps in
       order, the line first (lib/startHere). Rowland, 6 October: it dropped
       him on the whole setup form with "no clear start here, do this". */
    nav(wasRecovery ? `/project/${p.id}/recovery` : model === 'commissioning' ? `/project/${p.id}/install` : `/project/${p.id}`);
  };

  if (loading) return <div className="wrap pace"><p className="sub">Loading projects…</p></div>;

  return (
    <div className="wrap pace projects-screen">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Projects</h1>
        </div>
        <div className="pace-head-actions">
          {/* One blue button on the page: while the form is open, that is its
              Create — Cancel steps back to a quiet one. */}
          {mayStart && (
            <button className={'btn ' + (adding ? 'btn-ghost' : 'btn-primary')} onClick={() => { setRecovery(false); setAdding(a => !a); }}>
              {adding ? 'Cancel' : 'New project'}
            </button>
          )}
          {/* The Excel export of everything used to be a button here; it is a
              line in every project's Reports door now (ui/ReportsSheet), with
              the rest of what goes on paper. */}
        </div>
      </header>

      {!adding && mayStart && <section className="card proj-recovery-start" aria-label="Line recovery program">
        <div><h2>Underperforming line?</h2><p>Start a DMAIC project for the line.</p></div>
        <button type="button" className="btn" onClick={() => { setRecovery(true); setMethod(null); setAdding(true); }}>Start line recovery</button>
      </section>}

      {adding && (
        <section className="card proj-new">
          <div className="field-label">{recovery ? 'Line recovery' : 'New project'}</div>
          {startLine && <LineSituation ws={startLine} sit={sit} />}
          {/* START FROM THE SITUATION, NOT THE METHOD. Nobody should have to
              know what a "lever tree" is to start the right kind of change:
              say what you are trying to do and the way it is run follows. The
              name and the lead come once that is said. */}
          {recovery ? <p className="chip-hint">This starts a DMAIC project with the line tools in its phases. Choose one line for its own recovery and report. Start another project for the next line; both appear in the same control room. <button type="button" className="linkish" onClick={() => { setRecovery(false); setMethod(null); }}>Start a different project</button></p> : <div className="proj-model">
            <span className="field-label">{startLine ? `Which method will run it on ${startLine.name}?` : 'Which method will run it?'}</span>
            <div className="proj-model-grid">
              {METHODS.map(m => (
                <div key={m.key} className="proj-model-card">
                  <button type="button" aria-pressed={method === m.key}
                    className={'proj-model-opt' + (method === m.key ? ' on' : '')}
                    onClick={() => setMethod(m.key)}>
                    <MethodPicture method={m} />
                    <span className="proj-model-t">{m.name}</span>
                    <span className="proj-model-q">{m.question}</span>
                    <span className="proj-model-s">{m.sections.map(x => x.name).join(' · ')}</span>
                  </button>
                  {/* what the method is and what each step means — its own page, like a tool's (1 November) */}
                  <a className="proj-model-more" href={`#/methods/${m.key}`} aria-label={`How ${m.name} works — what each step means`}>How it works ›</a>
                </div>
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
          </div>}
          {(model || recovery) && (
            <div className="proj-new-grid">
              <label className="proj-field">
                <span className="field-label">Name</span>
                <input className="text-input" autoFocus value={name} maxLength={80}
                  placeholder={(n => (model === 'commissioning' ? `e.g. ${n} new wrapper` : recovery ? `e.g. ${n} recovery` : `e.g. ${n} performance`))(startLine?.name ?? factory.find(w => w.id === onLines[0])?.name ?? 'Line 7')} onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }} />
              </label>
              <label className="proj-field">
                <span className="field-label">Lead</span>
                <input className="text-input" value={lead} maxLength={80}
                  placeholder="Who is accountable for it" onChange={e => setLead(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void doCreate(); }} />
              </label>
              <div className="proj-field proj-lines" role="group" aria-label="Which lines it is on">
                <span className="field-label">{recovery && !combineLines ? 'Which line needs recovery?' : `Which line${factory.length === 1 ? '' : 's'} is it on?`} <span className="cw-f-opt">from your factory</span></span>
                {factory.length === 0
                  ? <span className="chip-hint">The factory has no lines yet. <a href="#/factory?add=1">Set up your factory ›</a>{recovery ? ' to start a line recovery.' : ' — or start now and add the lines later.'}</span>
                  : (
                    <span className="proj-lines-chips">
                      {offeredLines.map(w => {
                        const on = onLines.includes(w.id);
                        return (
                          <button key={w.id} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on}
                            onClick={() => setOnLines(xs => (recovery && !combineLines ? (on ? [] : [w.id]) : on ? xs.filter(x => x !== w.id) : [...xs, w.id]))}>
                            {w.name}{cs.all && w.clientName ? ` · ${w.clientName}` : ''}{factory.some(other => other.id !== w.id && other.name === w.name) && w.siteName ? ` · ${w.siteName}` : ''}{w.lineType ? <span className="proj-lines-t"> · {w.lineType}</span> : null}
                          </button>
                        );
                      })}
                    </span>
                  )}
                {recovery && fromSite && atSite.length < factory.length && <button type="button" className="linkish" onClick={() => setShowOtherSites(v => !v)}>{showOtherSites ? `Show only ${fromSite}` : 'Show other sites'}</button>}
                {recovery && factory.length > 1 && <button type="button" className="linkish" onClick={() => { setCombineLines(v => !v); setOnLines(xs => xs.slice(0, 1)); }}>{combineLines ? 'One line per project' : 'Include several lines in one project'}</button>}
                {recovery && combineLines && <span className="chip-hint">This makes one shared project report. For separate reports, start one project per line.</span>}
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
          {(model || recovery) && (
            <div className="row-inline" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" disabled={!name.trim() || (recovery && !validRecovery)} onClick={() => void doCreate()}>
                {recovery ? 'Create line recovery' : model === 'commissioning' ? 'Create and add the machines' : 'Create project'}
              </button>
            </div>
          )}
          {method && !recovery && (
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
          <EmptyState className="blank-list" title="Everything is archived"
            action={<>
              <button className="btn btn-ghost" onClick={() => setShowArchive(true)}>Open the archive</button>
              {mayStart && <button className="btn btn-primary" onClick={() => setAdding(true)}>Start a project</button>}
            </>}>
            Nothing is lost — {archived.length === 1 ? 'one project is' : `all ${archived.length} projects are`} in the
            archive below, with everything they hold. {mayStart ? 'Restore whichever you want back, or start a new one.' : 'Its owner can bring it back.'}
          </EmptyState>
        ) : (
          <EmptyState className="blank-list" title="No projects yet"
            action={mayStart ? <button className="btn btn-primary" onClick={() => setAdding(true)}>Start a project</button> : undefined}>
            {mayStart
              ? 'Prove with Programs on the line first — no project required. Start Performance (6M) when fault-finding and Actions need a project, or wait to be invited to somebody else’s: a project you are invited to appears here the next time the app syncs.'
              : 'You’ll see the projects you’ve been invited to here, the next time the app syncs.'}
          </EmptyState>
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
            <div className="proj-filters">
              <label className="proj-filter-kind"><span className="field-label">Show projects</span>
                <select className="text-input proj-kind-f" aria-label="Which projects" value={kind} onChange={e => setKind(e.target.value)}>
                  <option value="all">All projects · {projects.length}</option>
                  {KINDS.filter(k => projects.some(p => kindOf(p) === k.key)).map(k => <option key={k.key} value={k.key}>{k.label} · {projects.filter(p => kindOf(p) === k.key).length}</option>)}
                  {archived.length > 0 && <option value="archived">Archived · {archived.length}</option>}
                </select>
              </label>
              {kind !== 'archived' && factory.length > 1 && (
                <select className="text-input proj-line-f" value={onLine} onChange={e => setOnLine(e.target.value)} aria-label="On which line">
                  <option value="">All lines</option>
                  {factory.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
            </div>
            {kind !== 'archived' && (<>
              <div className="proj-th" aria-hidden><span>Project</span><span>Method</span><span>Led by</span><span>Lines</span><span>Handover</span></div>
              <RecordRows label="The projects, the first due first">
                {shown.length === 0 && <li className="sub">No project here — {onLine ? 'none is on that line' : 'none of this kind'}.</li>}
                {[...shown].sort((a, b) => (a.expectedAt ?? a.plannedAt ?? '\uffff').localeCompare(b.expectedAt ?? b.plannedAt ?? '\uffff') || a.name.localeCompare(b.name)).map(p => {
                  const due = p.expectedAt ?? p.plannedAt;
                  const lines = linesOf(p.id).map(l => l.name);
                  return (
                    /* a row a project, its parts in their own cells — a table at a desk as MinProjects draws it, one line each on a
                       phone; the words are those it always said (its method, who leads it, its lines, its handover) */
                    <RecordRow key={p.id} what={p.name}
                      says={<><span className="prc prc-method">{kindLabel(p)}</span><span className="prc prc-lead">{p.lead ? <><span className="prc-k"> · led by </span>{p.lead}</> : null}</span></>}
                      where={<><span className="prc prc-lines">{[cs.all ? cs.whose({ projectId: p.id }) : '', ...lines].filter(Boolean).join(' · ')}</span><span className="prc prc-due">{due ? <><span className="prc-k"> · </span>{`${due < today ? 'handover was' : 'handover'} ${niceDay(due, { weekday: 'short' })}`}</> : null}</span></>}
                      onOpen={() => nav(p.programKey === 'line-recovery' ? `/project/${p.id}/recovery` : `/project/${p.id}`)} />
                  );
                })}
              </RecordRows>
            </>)}
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


