/* THE FACTORY — the one home (Rowland, 23 October: "What's the point of home? ... The control room,
 * is it required?"; the shape chosen: one home, a fixed menu). #/ and #/room: every project and line
 * at once, and where you were last, one tap back (lib/recentPlaces). It was the control room, and
 * before that Home — ONE front door: the projects.
 *
 * It used to offer two. A Projects section at the top, and a "＋ New workspace"
 * button below it with its own name field and its own starter picker. Two ways
 * in for one job, and Rowland went through Projects — "which I also think is a
 * little bit strange when I come to think of it" — while the other door sat
 * there looking equally official.
 *
 * They were never the same thing. A workspace is the container UNDER a line: its
 * captures, its walk, its evidence. Every route that needs one makes it by
 * itself (see lib/usePaceWorkspace and ProjectSetupScreen), so the only reason
 * to type a workspace name by hand was that this screen predates projects.
 *
 * So there is one way to start: a project, then a line. Workspaces that hang off
 * a line are already one tap away on the project card and are not listed here a
 * second time; the ones attached to nothing still are, because they hold film
 * that exists nowhere else and must never become unreachable. */
import { useEffect, useRef, useState } from 'react';
import type { Workspace } from '../types';
import {
  listWorkspaces, listObservations, listSegments, snagsForWorkspace, listCases, deleteWorkspace,
  listArchivedWorkspaces,
} from '../db';
import { Toast } from '../ui/Toast';
import { BuildStamp } from '../ui/BuildStamp';
import { nav } from '../state/useRoute';
import { CloudPanel } from '../cloud/CloudPanel';
import { useSyncedAt } from '../cloud/session';
import { InstallPanel } from '../ui/InstallPanel';
import { useProjects } from '../lib/useProjects';
import { inArchivedProject, listAllStudies, onDataChange, projectsOnWorkspace } from '../db';
import { lineRates, rateShort, WEEK } from '../lib/intelligence';
import { isDemo, dualOf, dualSaid } from '../lib/lines';
import { factorySays, liveProductionLines, productionLines } from '../lib/lines';
import { JobsBoard } from '../ui/JobsBoard';
import { useLineRecords } from '../lib/useLineRecords';
import { lineKit } from '../lib/lineRecords';
import { useCanStartProjects } from '../cloud/access';
import { lineProblems, type LineProblems } from '../lib/lineWork';
import { PageHeader } from '../ui/parts';
import { ControlRoomReports } from '../ui/ControlRoomReports';
import { lastOpen, type Place } from '../lib/recentPlaces';
import { liveRecentPlaces } from '../lib/recentPlacesLive';
import { Icon } from '../ui/Icon';
import { useLooking } from '../tools/gemba/useLooking';
import { lookingShort } from '../tools/gemba/looking';
import '../tools/gemba/looking.css';
import { niceDay, todayISO } from '../lib/weeks';

/* What a workspace card must answer: "what's in here?" — for ALL content, not
 * one kind of it. Counting only time observations made a workspace full of
 * walk videos and snags read "0 observations", i.e. "your work is gone". */
interface WsContents { obs: number; videos: number;
  /** Its problems open, critical and late — lib/lineWork lineProblems, the
   *  count the line's own page and the control room's numbers use. */
  problems: Pick<LineProblems, 'open' | 'critical' | 'late'>; cases?: number;
  /** The worst thing on it — the register's first row (critical, then late, then newest), who has it and when. */
  worst?: { what: string; owner?: string; due?: string; red: boolean } }

/** WHERE A LINE STANDS, in a word and its colour — the factory's board (27 October: "which line needs me?"). Red: a
 *  critical or late problem; amber: problems open; green: nothing open. Always with its words beside it. */
function lineState(c: WsContents | undefined): { word: string; tone: 'r' | 'a' | 'g' | 'n' } {
  if (!c) return { word: '…', tone: 'n' };
  const p = c.problems;
  if (p.critical || p.late) return { word: [p.late ? `${p.late} late` : '', p.critical ? `${p.critical} critical` : ''].filter(Boolean).join(' · '), tone: 'r' };
  if (p.open) return { word: `${p.open} problem${p.open === 1 ? '' : 's'} open`, tone: 'a' };
  return { word: 'Nothing late', tone: 'g' };
}

export function WorkspaceHome() {
  /* REPORT ▾ (B3): the control room report is made from the board's own reading (ui/JobsBoard
     fills this in); every other paper is the control room's Reports sheet. */
  const roomReport = useRef<(() => Promise<void>) | null>(null);
  const [allPapers, setAllPapers] = useState(false);
  /* where this device was last — read when the page opens; the frame notes each place as it is opened */
  const [places, setPlaces] = useState<Place[]>([]);
  /* LINE TALK, one tap from home (20 October: "I open Faultline, talk or type") — start one, or carry on the latest */
  const [talk, setTalk] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    const load = () => void listAllStudies().then(all => {
      const t = all.filter(x => x.tool === 'talk' && !x.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setTalk(t ? { id: t.id, name: t.name } : null);
    });
    load();
    return onDataChange(load);
  }, []);
  const [list, setList] = useState<Workspace[] | null>(null);
  const [counts, setCounts] = useState<Record<string, WsContents>>({});
  // A deleted workspace sits in limbo here for a few seconds with an Undo —
  // committed only when the toast expires. A flag left by a closed app is
  // treated as CANCELLED: losing an intent beats losing a workspace.
  const [pendingDel, setPendingDel] = useState<{ id: string; name: string } | null>(null);
  const [delTick, setDelTick] = useState(0);
  /* how many lines are archived — said beside the factory; they are kept on Your factory */
  const [archivedN, setArchivedN] = useState(0);

  /* RE-READ WHEN ANYTHING IS WRITTEN. This screen used to re-read only after a
     sync or a delete of its own, which was survivable while it was one list
     among several. It is the only door now: add a line on the project screen,
     come back here, and the card kept saying "0 lines · ＋ Add a line" — the one
     tap that matters, missing — until the app happened to be reloaded.
     Coalesced, because one save is often dozens of writes and filling these
     cards means counting the contents of every workspace. */
  const [dataTick, setDataTick] = useState(0);
  useEffect(() => {
    let t: number | undefined;
    const off = onDataChange(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => setDataTick(n => n + 1), 150);
    });
    return () => { window.clearTimeout(t); off(); };
  }, []);

  useEffect(() => {
    let on = true;
    const load = () => void liveRecentPlaces(4).then(p => { if (on) setPlaces(p); });
    load();
    const off = onDataChange(load);
    /* notePlace (ui/Frame) writes localStorage only — re-read when the address changes */
    window.addEventListener('hashchange', load);
    return () => { on = false; off(); window.removeEventListener('hashchange', load); };
  }, [delTick, dataTick]);

  useEffect(() => { void listArchivedWorkspaces().then(a => setArchivedN(a.length)); }, [delTick, dataTick]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('faultline-pending-delete');
      if (!raw) return;
      const v = JSON.parse(raw) as { id: string; name: string; until: number };
      if (v.until > Date.now()) { setPendingDel({ id: v.id, name: v.name }); return; }
      // The undo window elapsed while the app was closed or on another screen.
      // The delete was already confirmed by name in a dialog, so an elapsed
      // window means "no undo was taken" — commit it. Treating it as a
      // cancellation (what we did before) meant a workspace you deleted came
      // back the moment you refreshed before the toast timed out.
      sessionStorage.removeItem('faultline-pending-delete');
      void deleteWorkspace(v.id).then(() => setDelTick(t => t + 1));
    } catch { /* malformed flag — ignore */ }
  }, []);
  const undoDelete = () => { sessionStorage.removeItem('faultline-pending-delete'); setPendingDel(null); };
  const commitDelete = async () => {
    const target = pendingDel;
    sessionStorage.removeItem('faultline-pending-delete');
    setPendingDel(null);
    if (target) { await deleteWorkspace(target.id); setDelTick(t => t + 1); }
  };

  // The projects lead this screen now. They are how the work is actually
  // organised — a workspace is the container underneath a line, not the thing
  // anybody sets out to open.
  const { projects } = useProjects();
  /* Let in by a project invite: the projects they were invited to, and no
     door to start one of their own (supabase/ACCESS_LEVELS.sql). */
  const mayStart = useCanStartProjects();
  // Every job, on every method — the control room is not a stage-gate board.
  const jobs = projects;

  // Which line (and project) each workspace sits under, so the list below can
  // say so instead of showing a bare name that means nothing on its own.
  /* NULL UNTIL READ, not {}. The list below hides a workspace that belongs to a
     line, and an empty map says every one of them is loose — so an empty map
     used as "not read yet" would flash the whole list on every load. */
  const [belongs, setBelongs] = useState<Record<string, string> | null>(null);
  const jobsKey = projects.map(p => `${p.id}:${p.name}`).join('|');

  // Re-reads whenever a sync finishes, so data pulled in the background (e.g.
  // straight after signing in on a new device) appears without a manual refresh.
  const syncedAt = useSyncedAt();
  const dedupedDemos = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const ws = await listWorkspaces();
      if (!alive) return;
      setList(ws);
      const entries = await Promise.all(ws.map(async w => {
        const [obs, segs, snags, cases, away] = await Promise.all([
          listObservations(w.id), listSegments(w.id), snagsForWorkspace(w.id), listCases(w.id), inArchivedProject(w.id),
        ]);
        /* open, and not put away by a fresh start, moved or deleted (the
           Problems register) — critical and late counted by the one rule */
        const p = lineProblems(snags, w);
        const top = p.rows[0];
        return [w.id, {
          obs: obs.length,
          videos: segs.length,
          problems: { open: p.open, critical: p.critical, late: p.late },
          cases: away ? 0 : cases.length,
          ...(top ? { worst: { what: top.what, ...(top.owner ? { owner: top.owner } : {}), ...(top.due ? { due: top.due } : {}), red: top.priority === 'critical' || top.late } } : {}),
        } satisfies WsContents] as const;
      }));
      if (!alive) return;
      const byId = Object.fromEntries(entries);
      setCounts(byId);
      // self-heal: rebuilds across devices and sessions can leave several demo
      // workspaces synced into one account. There is ONE demo — keep the
      // richest copy, delete the rest (tombstones sync the cleanup everywhere).
      const demos = ws.filter(w => isDemo(w.name));
      if (demos.length > 1 && !dedupedDemos.current) {
        dedupedDemos.current = true;
        const keep = [...demos].sort((a, b) =>
          (byId[b.id]?.obs ?? 0) - (byId[a.id]?.obs ?? 0) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
        for (const d of demos) if (d.id !== keep.id) await deleteWorkspace(d.id);
        if (alive) setDelTick(t => t + 1);
      }
    })();
    return () => { alive = false; };
  }, [syncedAt, delTick, dataTick]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ws = list ?? [];
      /* every live job each line is on — a line of the factory can be on several (13 October) */
      const names = new Map(projects.map(p => [p.id, p.name]));
      const pairs = await Promise.all(ws.map(async w => [w.id, (await projectsOnWorkspace(w.id)).map(id => names.get(id)).filter(Boolean).join(', ')] as const));
      if (alive) setBelongs(Object.fromEntries(pairs.filter(([, v]) => v)));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the jobs' names, by key: the list is a new array every render
  }, [list, jobsKey]);

  /* WHAT IS LEFT OVER. A workspace that hangs off a line is one tap away on its
     project card, so listing it again here is the second door in list form —
     the same place under two names. These are the ones attached to nothing:
     from before there were projects, or a walk that never got a line. They hold
     film that exists nowhere else, so they are never hidden, only demoted.
     (`belongs === null` means not read yet — show none rather than all.) */
  /* every line worked on now — a line of an archived project goes with it into the archive */
  const [liveIds, setLiveIds] = useState<Set<string> | null>(null);
  useEffect(() => { let on = true; void liveProductionLines(list ?? []).then(ls => { if (on) setLiveIds(new Set(ls.map(w => w.id))); }); return () => { on = false; }; }, [list]);
  const rec = useLineRecords();
  /* WHAT EACH LINE CAN PLAN ON — its counted shifts over six weeks, read by
     the same function as its capacity panel (lib/intelligence lineRates), so
     the card and the panel cannot disagree (docs/upgrade-plan.md, O) */
  const [rateOf, setRateOf] = useState<Record<string, string>>({});
  useEffect(() => {
    let on = true;
    const load = async () => {
      const from = Date.now() - 6 * WEEK;
      const counts = (await listAllStudies()).filter(x => x.tool === 'losses' && !x.deletedAt && x.facts.losses && (x.facts.losses.from ?? 0) >= from);
      const by = new Map<string, typeof counts>();
      for (const c of counts) if (c.workspaceId) (by.get(c.workspaceId) ?? by.set(c.workspaceId, []).get(c.workspaceId))?.push(c);
      const out: Record<string, string> = {};
      for (const [id, cs] of by) { const t = rateShort(lineRates(cs.map(c => ({ id: c.id, count: c.facts.losses })))); if (t) out[id] = t; }
      if (on) setRateOf(out);
    };
    void load();
    const off = onDataChange(() => { void load(); });
    return () => { on = false; off(); };
  }, []);
  const prodLines = productionLines((list ?? []).filter(w => w.id !== pendingDel?.id && (liveIds === null || liveIds.has(w.id))));
  /* HOW FRESH THE LOOKING IS, a line at a time (FC-199, tools/gemba) — the silence made visible on the board */
  const looked = useLooking(prodLines.map(w => w.id));
  /* ON A PHONE THE ANSWER COMES FIRST (FLOW-AUDIT.md, 11): the first screen
     held the title, New project and the factory's cards, and the headline
     began at the foot of it, under the Problem button. The line cards go
     under the band there; at a desk the factory still leads. */
  const factory = (
    <section className="home-spaces fac-home ep-panel" aria-label="Lines">
      <div className="home-sec-head">
        <h2 className="home-sec-title">Lines</h2>
        {/* THE LINES THEMSELVES ARE SET UP IN SET UP (27 October — Rowland: "put the lines in the setup because it's
            factory setup"); every line's programs, problems and machines are on the line's own page */}
        {prodLines.length > 0 && (
          <span className="pl-sec-acts">
            <button className="btn" onClick={() => nav('/factory')}>Set up the lines</button>
          </span>
        )}
      </div>
      {prodLines.length === 0 ? (
        <div className="fac-empty">
          <p>Set up your factory first — your production lines, each with its name and its type. Every project, problem and tool then hangs off one of them.</p>
          <button className="btn btn-primary" onClick={() => nav('/factory?add=1')}>Set up your factory</button>
        </div>
      ) : (
        <>
          <p className="sub home-sec-sub fac-says">{factorySays(prodLines)}{archivedN > 0 ? ` · ${archivedN} archived` : ''}</p>
          <ul className="fac-floor" aria-label="The lines, in floor order">
            {prodLines.map(w => {
              const c = counts[w.id];
              const on = belongs?.[w.id];
              /* THE BOARD (27 October — "which line needs me?"; 29 October E1 — Planner cards on a Teams canvas) */
              const st = lineState(c);
              const k = lineKit(w, rec.machines, rec.programs, rec.jobLines);
              const named = k.machines.filter(m => m.name.trim() && m.name.trim().toLowerCase() !== 'whole line');
              const machineSaid = named.length
                ? (k.flow || named.map(m => (m.record?.oem ? `${m.name} (${m.record.oem})` : m.name)).join(' → '))
                : 'No machines named yet';
              const todo = k.programs.length - k.proved;
              /* a dual line's words keep their own element (.fac-dual), as Your factory's rows say them */
              const dual = dualSaid(dualOf(w, prodLines));
              const rate = rateOf[w.id];
              return (
                <li key={w.id}>
                  <button className={'fac-card is-' + st.tone} data-line={w.name} onClick={() => nav(`/lines/${w.id}`)}>
                    <div className="fac-card-head">
                      <b className="fac-card-name">{w.name}</b>
                    </div>
                    {st.tone === 'r' && c && (c.problems.critical || c.problems.late)
                      ? (
                        <span className="fac-card-state is-r">
                          {c.problems.critical > 0 && <b className="is-r">{c.problems.critical} critical</b>}
                          {c.problems.critical > 0 && c.problems.late > 0 && ' · '}
                          {c.problems.late > 0 && <b className="is-r">{c.problems.late} late</b>}
                        </span>
                      )
                      : <span className={'fac-card-state is-' + st.tone}>{st.word}</span>}
                    <span className="fac-card-type">{w.lineType || 'No type yet'}</span>
                    <span className="fac-card-machines">{machineSaid}</span>
                    <span className="fac-card-projects">{on ? `Projects: ${on}` : 'No project on it'}</span>
                    {(() => { const lk = looked?.find(x => x.id === w.id)?.looking; return lk ? <span className={'fac-card-looked is-' + lk.level}>{lookingShort(lk)}</span> : null; })()}
                    {c?.worst && <span className={'fac-card-worst' + (c.worst.red ? ' is-r' : '')}>{c.worst.what}<span className="sub"> · {c.worst.owner ?? 'nobody yet'}{c.worst.due ? ` · ${c.worst.due}` : ''}</span></span>}
                    {(todo > 0 || k.late || dual || rate) ? (
                      <span className="fac-card-meta">
                        {todo > 0 ? `${todo} program${todo === 1 ? '' : 's'} to prove` : ''}
                        {k.late ? <>{todo > 0 ? ' · ' : ''}<b className="is-r">{k.late} late</b></> : null}
                        {dual ? <>{todo > 0 || k.late ? ' · ' : ''}<span className="fac-dual">{dual}</span></> : null}
                        {rate ? <>{todo > 0 || k.late || dual ? ' · ' : ''}{rate}</> : null}
                      </span>
                    ) : null}
                    {/* the way in, named (27 October, where-am-i D: each card saying what a tap does) */}
                    <span className="fac-card-go">Open {w.name} ›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );

  const factoryLede = prodLines.length
    ? 'Open a line — programs, problems and tools live there. The board below is what needs you across projects.'
    : 'Add your production lines first; everything else hangs off them.';

  const facQuick = (
    <nav className="fac-quick home-talk" aria-label="On the factory">
      <button type="button" className="btn fd-talk-start" onClick={() => nav('/talk')}><Icon name="mic" size="1.1em" />Start a Line Talk</button>
      {talk && <button type="button" className="btn btn-ghost btn-sm fd-talk-on" onClick={() => nav(`/talk/${talk.id}`)}>Carry on: {talk.name}</button>}
      <button type="button" className="chip" onClick={() => nav('/programs')}>Programs</button>
      <button type="button" className="chip" onClick={() => nav('/snags')}>Problems</button>
      <button type="button" className="chip" onClick={() => nav('/tools')}>Tools</button>
    </nav>
  );

  const carryBack = places.length > 0 ? (
    <section className="fd-back" aria-label="Carry on where you were">
      <h2 className="ln-h">Carry on where you were</h2>
      <ul className="lt-rows fd-places">
        {places.map(p => (
          <li key={p.to} className="lt-li" data-place={p.kind}>
            <button type="button" className="lt-row" onClick={() => nav(p.to)}>
              <b className="lt-what">{p.scope}</b>
              <span className="lt-says">{p.page ?? (p.kind === 'project' ? 'The project' : 'The line')}</span>
              <span className="lt-where">{p.kind === 'project' ? 'Project' : 'Line'} · last open {lastOpen(p.at, todayISO(), d => niceDay(d, { weekday: 'short' }))}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  return (
    <div className="wrap home">
      {/* THE PAGE'S NAME, AND ITS ONE BUTTON. The wordmark and the account
          button that sat here are the frame's top bar now (ui/Frame), on
          every screen alike — so the control room is a page in the frame
          like any other, and its name says which. */}
      <PageHeader title="Factory"
        says={factoryLede}
        primary={mayStart ? { label: 'New project', run: () => nav('/projects?new=1') } : undefined}
        papers={jobs.length > 0 || prodLines.length > 0 ? [
          { label: 'Control room report — 1 page', for: 'For the business — every project and line on one A4: where each is, why, who owes what', make: async () => { await roomReport.current?.(); } },
          { label: 'Every report', for: 'The factory’s, each line’s and each project’s papers, in one list', make: () => setAllPapers(true) },
        ] : []} />
      {allPapers && <ControlRoomReports projects={projects} onClose={() => setAllPapers(false)} />}
      {facQuick}
      {factory}

      {jobs.length > 0 || prodLines.length > 0
        ? <JobsBoard projects={jobs} reportRef={roomReport} />
        : null}

      {/* ONE LIST OF JOBS. The project cards that sat here listed the same
          jobs the control room lists, a second time. Rowland agreed they go
          into the rows: each row's drawer now carries what only the card had —
          the lines with their owners, one tap each, and the Details door — and
          New project is at the top. Until there is a job, this is the start. */}
      {projects.length === 0 && !mayStart && (
        <section className="home-projects">
          <div className="home-sec-head">
            <h2 className="home-sec-title">Projects</h2>
          </div>
          <p className="sub home-sec-sub">
            You’ll see the projects you’ve been invited to here, with what is late and who owes what.
          </p>
        </section>
      )}
      {projects.length === 0 && mayStart && (
        <section className="home-projects">
          <div className="home-sec-head">
            <h2 className="home-sec-title">Projects</h2>
            <button className="btn btn-primary" onClick={() => nav('/projects?new=1')}>Start a project</button>
          </div>
          <p className="sub home-sec-sub">
            Set up your lines on the Factory, then prove with Programs — no project required for tests on the line.
            Start Performance (6M) when fault-finding and Actions need a project workspace. Every project shows
            here with what is late and who owes what.
          </p>
        </section>
      )}

      {carryBack}
      {!jobs.length && !prodLines.length && (
        <p className="home-tag">Gemba CI on your lines — prove programs and tests on the line, fault-find with 6M when you need a project.</p>
      )}

      {/* Signing in and installing are settings, not destinations. They used to
          sit above everything, so the first third of the app's front door was
          taken up by things you do once. */}
      <InstallPanel />
      <CloudPanel />

      {pendingDel && (
        <Toast message={`Deleted “${pendingDel.name}”`} onUndo={undoDelete} onDismiss={() => void commitDelete()} />
      )}
      <BuildStamp />
    </div>
  );
}
