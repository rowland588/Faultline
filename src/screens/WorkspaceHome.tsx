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
  archiveWorkspace, restoreWorkspace, listArchivedWorkspaces, workspaceContents,
} from '../db';
import { Toast } from '../ui/Toast';
import { nav } from '../state/useRoute';
import { fmtRelative, plural } from '../lib/format';
import { CloudPanel } from '../cloud/CloudPanel';
import { useSyncedAt } from '../cloud/session';
import { InstallPanel } from '../ui/InstallPanel';
import { useProjects } from '../lib/useProjects';
import { chainForWorkspace, inArchivedProject, onDataChange } from '../db';
import { DEMO_NAME } from '../lib/demo';
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
    c.obs > 0 ? plural(c.obs, 'observation') : '',
    c.videos > 0 ? plural(c.videos, 'video') : '',
    c.openSnags > 0 ? `${c.openSnags} open on the walk` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'empty';
}

export function WorkspaceHome() {
  const [list, setList] = useState<Workspace[] | null>(null);
  const [counts, setCounts] = useState<Record<string, WsContents>>({});
  // A deleted workspace sits in limbo here for a few seconds with an Undo —
  // committed only when the toast expires. A flag left by a closed app is
  // treated as CANCELLED: losing an intent beats losing a workspace.
  const [pendingDel, setPendingDel] = useState<{ id: string; name: string } | null>(null);
  const [delTick, setDelTick] = useState(0);
  const [archived, setArchived] = useState<Awaited<ReturnType<typeof listArchivedWorkspaces>>>([]);
  const [showArchive, setShowArchive] = useState(false);

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

  useEffect(() => { void listArchivedWorkspaces().then(setArchived); }, [delTick, dataTick]);
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
          openSnags: snags.filter(s => s.status !== 'closed').length,
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
      const pairs = await Promise.all(ws.map(async w => {
        const c = await chainForWorkspace(w.id);
        return [w.id, c ? (c.lineName ? `${c.lineName} · ${c.projectName}` : c.projectName) : ''] as const;
      }));
      if (alive) setBelongs(Object.fromEntries(pairs.filter(([, v]) => v)));
    })();
    return () => { alive = false; };
  }, [list]);

  /* WHAT IS LEFT OVER. A workspace that hangs off a line is one tap away on its
     project card, so listing it again here is the second door in list form —
     the same place under two names. These are the ones attached to nothing:
     from before there were projects, or a walk that never got a line. They hold
     film that exists nowhere else, so they are never hidden, only demoted.
     (`belongs === null` means not read yet — show none rather than all.) */
  const loose = belongs === null ? [] : (list ?? []).filter(w => !belongs[w.id] && w.id !== pendingDel?.id);

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

      {/* NOT A DOOR. There is no "＋ New workspace" here any more: a line makes
          its own, and a second way to make one by hand is the thing he tripped
          over. This is a shelf for what is attached to nothing, and it is not
          on screen at all when there is nothing on it. */}
      {(loose.length > 0 || archived.length > 0) && (
        <section className="home-spaces">
          <div className="home-sec-head">
            <h2 className="home-sec-title">Not on a project</h2>
          </div>
          {loose.length === 0 ? (
            <p className="sub home-sec-sub">
              Everything is on a project. {archived.length === 1 ? 'One line is' : `All ${archived.length} lines are`} in
              the archive below, with everything it holds — restore whichever you want back.
            </p>
          ) : (
            <>
              <p className="sub home-sec-sub">
                These hold captures, film or evidence but hang off no line — from before there were
                projects, or a walk that never got one. Open one to read it, or archive it. Anything
                on a project opens from its line, one tap from its row in the control room above.
              </p>
              <div className="ws-list">
                {/* A ROW, NOT A CARD-SHAPED BUTTON. Archiving needs its own
                    control beside the open one, and a button inside a button is
                    invalid HTML that browsers disagree about. */}
                {loose.map(w => (
                  <div key={w.id} className="ws-row">
                    <button className="ws-card" onClick={() => nav(`/w/${w.id}`)}>
                      <span className="ws-card-dot" style={{ background: w.color }} />
                      <span className="ws-card-main">
                        <span className="ws-card-name">{w.name}</span>
                        <span className="ws-card-meta">
                          {contentsLabel(counts[w.id])}
                          {w.updatedAt ? ` · ${fmtRelative(w.updatedAt)}` : ''}
                        </span>
                      </span>
                      <span className="ws-card-go">{w.lastRoute ? 'Resume ›' : 'Open ›'}</span>
                    </button>
                    <button className="btn btn-ghost ws-archive" title={`Archive ${w.name}`}
                      onClick={() => {
                        if (!confirm(`Archive “${w.name}”?\n\nIt leaves this list and loses nothing — the captures, the walk and the evidence all stay. You can restore it whenever you like.`)) return;
                        void archiveWorkspace(w.id).then(() => setDelTick(t => t + 1));
                      }}>Archive</button>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* THE ARCHIVE. Behind one tap and closed by default — it is where
              things go to stop being looked at, so it must not take up room in
              the list it was meant to shorten. */}
          {archived.length > 0 && (
            <div className="proj-arch">
              <button className="proj-arch-h" onClick={() => setShowArchive(v => !v)} aria-expanded={showArchive}>
                <span>Archived lines</span>
                <span className="proj-arch-n">{archived.length}</span>
                <span className="proj-arch-x" aria-hidden>{showArchive ? '−' : '+'}</span>
              </button>
              {showArchive && (
                <div className="proj-arch-list">
                  {archived.map(w => (
                    <div key={w.id} className="proj-arch-row">
                      <span className="proj-arch-dot" style={{ background: w.color }} aria-hidden />
                      <span className="proj-arch-main">
                        <span className="proj-arch-t">{w.name}</span>
                        <span className="proj-arch-s">Archived · {fmtRelative(w.updatedAt)}</span>
                      </span>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => void restoreWorkspace(w.id).then(() => setDelTick(t => t + 1))}>
                        Restore
                      </button>
                      {/* DELETING A LINE DESTROYS FILM THAT EXISTS NOWHERE ELSE,
                          so the confirm counts it out loud first. */}
                      <button className="btn btn-sm proj-arch-del"
                        onClick={() => void (async () => {
                          const owned = await workspaceContents(w.id);
                          const what = owned.length
                            ? owned.map(c => `${c.count} ${c.what}`).join('\n  ')
                            : 'nothing — it is empty';
                          if (!confirm(
                            `Delete “${w.name}” for ever?\n\nThis also deletes:\n  ${what}\n\n` +
                            'The videos and photographs go with it, and they exist nowhere else.\n\n' +
                            'This cannot be undone, on any device.',
                          )) return;
                          await deleteWorkspace(w.id);
                          setDelTick(t => t + 1);
                        })()}>
                        Delete for ever
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
