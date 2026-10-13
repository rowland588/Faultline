/* Home — ONE front door: the projects.
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
import { nav } from '../state/useRoute';
import { plural } from '../lib/format';
import { CloudPanel } from '../cloud/CloudPanel';
import { useSyncedAt } from '../cloud/session';
import { InstallPanel } from '../ui/InstallPanel';
import { useProjects } from '../lib/useProjects';
import { inArchivedProject, onDataChange, projectsOnWorkspace } from '../db';
import { DEMO_NAME } from '../lib/lines';
import { factorySays, liveProductionLines, productionLines } from '../lib/lines';
import { JobsBoard } from '../ui/JobsBoard';
import { useCanStartProjects } from '../cloud/access';

/* An installed PWA keeps serving its cached shell until the service worker
 * hands over, so a device can sit on an old build for a long time with nothing
 * on screen to say so — which makes "the fix isn't working" and "the fix hasn't
 * arrived" look identical. This shows which build you're on, and forces the
 * update through rather than waiting for it. */
function BuildStamp() {
  const [busy, setBusy] = useState(false);
  const update = async () => {
    setBusy(true);
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
      await Promise.all(regs.map(r => r.unregister()));
      if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
    } catch { /* nothing cached to clear */ }
    location.reload();
  };
  return (
    <p className="build-stamp">
      Build {__BUILD_STAMP__}
      <button className="build-refresh" disabled={busy} onClick={update}>
        {busy ? 'updating…' : 'check for update'}
      </button>
    </p>
  );
}

/* What a workspace card must answer: "what's in here?" — for ALL content, not
 * one kind of it. Counting only time observations made a workspace full of
 * walk videos and snags read "0 observations", i.e. "your work is gone". */
interface WsContents { obs: number; videos: number; openSnags: number; cases?: number }

function contentsLabel(c: WsContents | undefined): string {
  if (!c) return '…';
  const parts = [
    /* its problems first — what a line is opened for (12 October) */
    c.openSnags > 0 ? `${c.openSnags} problem${c.openSnags === 1 ? '' : 's'} open` : '',
    c.obs > 0 ? plural(c.obs, 'observation') : '',
    c.videos > 0 ? plural(c.videos, 'video') : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nothing on it yet';
}

export function WorkspaceHome() {
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
        return [w.id, {
          obs: obs.length,
          videos: segs.length,
          /* open, and not put away by a fresh start or deleted (the Problems register) */
          openSnags: snags.filter(s => s.status !== 'closed' && !s.archivedAt && !s.deletedAt).length,
          cases: away ? 0 : cases.length,
        }] as const;
      }));
      if (!alive) return;
      const byId = Object.fromEntries(entries);
      setCounts(byId);
      // self-heal: rebuilds across devices and sessions can leave several demo
      // workspaces synced into one account. There is ONE demo — keep the
      // richest copy, delete the rest (tombstones sync the cleanup everywhere).
      const demos = ws.filter(w => w.name === DEMO_NAME);
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
  const prodLines = productionLines((list ?? []).filter(w => w.id !== pendingDel?.id && (liveIds === null || liveIds.has(w.id))));

  return (
    <div className="wrap home">
      {/* THE PAGE'S NAME, AND ITS ONE BUTTON. The wordmark and the account
          button that sat here are the frame's top bar now (ui/Frame), on
          every screen alike — so the control room is a page in the frame
          like any other, and its name says which. */}
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">Control room</h1>
          <p className="cw-handover">
            {/* How many jobs — the board under it says how many are running
                and how many are handed over (docs/HANDOVER.md); "3 jobs
                running" here said otherwise. */}
            <span className="sub">{jobs.length === 0 ? 'Nothing running yet' : `${jobs.length} job${jobs.length === 1 ? '' : 's'}`}</span>
          </p>
        </div>
        {/* NEW PROJECT, where a page's main action sits — it was the
            Projects section's button, and that section was a second list
            of the jobs the control room already lists. */}
        {mayStart && projects.length > 0 && (
          <div className="pace-head-actions">
            <button className="btn btn-primary" onClick={() => nav('/projects?new=1')}>New project</button>
          </div>
        )}
      </header>
      {/* The pitch is for somebody with nothing running yet. Once a job is,
          the board under it says more than the paragraph could. */}
      {!jobs.length && (
        /* What the app is now — the control room for change on the lines. The
           old pitch ("walk the line … a tracked snag list") described the
           line-study tool it began as, which is now a tool inside a change. */
        <p className="home-tag">A control room for change on your lines — new equipment brought into use, a line made to perform better, a number hit by a date — and one view of whether all of it is in hand.</p>
      )}

      {/* YOUR FACTORY — first, above the jobs: the backbone everything hangs
          off. Rowland, 13 October: "a factory setup before the new projects
          ... your production lines. So then we were able to assign everything
          to a production line ... build your factory, edit your factory."
          The lines in floor order, each with its type and what is open on it,
          one tap to its own page; every change to them — a line added,
          renamed, typed, moved, archived — is made on Your factory
          (screens/FactoryScreen). This takes the place of the Production
          lines list that sat under the jobs, with its New line and its
          archive: those are on Your factory now, with the type and the floor
          order beside the name, so a line is made and changed in one place. */}
      <section className="home-spaces fac-home" aria-label="Your factory">
        <div className="home-sec-head">
          <h2 className="home-sec-title">Your factory</h2>
          {prodLines.length > 0 && <button className="btn" onClick={() => nav('/factory')}>Edit your factory</button>}
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
                return (
                  <li key={w.id}>
                    <button className="fac-card" onClick={() => nav(`/lines/${w.id}`)}>
                      <b className="fac-card-name">{w.name}</b>
                      <span className="fac-card-type">{w.lineType || 'No type yet'}</span>
                      <span className="fac-card-meta">{contentsLabel(c)}{on ? ` · on ${on}` : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* EVERY JOB, ONE HOME — the first thing the app opens on. Rowland
          reviewing the board: it lived one tap in, on Projects, which is not
          where the app opens. Everything below it on this screen stays. */}
      {jobs.length > 0 && <JobsBoard projects={jobs} />}

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
            Start here. Say what you are trying to change — new equipment, a line that has to
            perform better, or a number to hit by a date — and the project is run the way that
            kind of change is run. Every project you start shows up on this screen, with what is
            late and who owes what.
          </p>
        </section>
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
