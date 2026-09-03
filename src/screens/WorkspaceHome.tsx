/* Home — the workspaces. Each is a clean, isolated split (its own data, its own
 * tools). Tapping one resumes exactly where you left it. */
import { useEffect, useRef, useState } from 'react';
import type { Workspace } from '../types';
import { listWorkspaces, listObservations, listSegments, snagsForWorkspace, listCases, createWorkspace, deleteWorkspace } from '../db';
import { Toast } from '../ui/Toast';
import { nav } from '../state/useRoute';
import { EmptyState } from '../ui/EmptyState';
import { Wordmark } from '../ui/Logo';
import { fmtRelative, plural } from '../lib/format';
import { CloudPanel } from '../cloud/CloudPanel';
import { AdminPanel } from '../cloud/AdminPanel';
import { useProfile } from '../cloud/admin';
import { useSyncedAt } from '../cloud/session';
import { InstallPanel } from '../ui/InstallPanel';
import { TAXONOMIES, DEFAULT_TAXONOMY_ID } from '../lib/taxonomy';
import { seedDemoWorkspace, DEMO_NAME } from '../lib/demo';

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
    c.openSnags > 0 ? `${c.openSnags} open snag${c.openSnags === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'empty — tap to start';
}

export function WorkspaceHome() {
  const [list, setList] = useState<Workspace[] | null>(null);
  const [counts, setCounts] = useState<Record<string, WsContents>>({});
  const [casesTotal, setCasesTotal] = useState(0);
  const [creating, setCreating] = useState(false);
  // A deleted workspace sits in limbo here for a few seconds with an Undo —
  // committed only when the toast expires. A flag left by a closed app is
  // treated as CANCELLED: losing an intent beats losing a workspace.
  const [pendingDel, setPendingDel] = useState<{ id: string; name: string } | null>(null);
  const [delTick, setDelTick] = useState(0);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('faultline-pending-delete');
      if (!raw) return;
      const v = JSON.parse(raw) as { id: string; name: string; until: number };
      if (v.until > Date.now()) setPendingDel({ id: v.id, name: v.name });
      else sessionStorage.removeItem('faultline-pending-delete');
    } catch { /* malformed flag — ignore */ }
  }, []);
  const undoDelete = () => { sessionStorage.removeItem('faultline-pending-delete'); setPendingDel(null); };
  const commitDelete = async () => {
    const target = pendingDel;
    sessionStorage.removeItem('faultline-pending-delete');
    setPendingDel(null);
    if (target) { await deleteWorkspace(target.id); setDelTick(t => t + 1); }
  };
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState(DEFAULT_TAXONOMY_ID);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState<string | null>(null);
  const seedDemo = async () => {
    if (seeding) return;
    setSeeding('starting…');
    try {
      // REBUILD, never duplicate: any existing demo workspace goes first (the
      // delete cascades and syncs to every device, same as any delete).
      const existing = (await listWorkspaces()).filter(w => w.name === DEMO_NAME);
      for (const w of existing) { setSeeding('removing the old demo…'); await deleteWorkspace(w.id); }
      const id = await seedDemoWorkspace(setSeeding);
      // lands on the board, where ▶ Watch the demo (the film) sits
      nav(`/w/${id}/analyse`);
    } catch (e) {
      setSeeding(null);
      setError(e instanceof Error ? e.message : 'Demo seeding failed — try again.');
    }
  };
  const { profile } = useProfile();
  const [adminOpen, setAdminOpen] = useState(false);

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
        const [obs, segs, snags, cases] = await Promise.all([
          listObservations(w.id), listSegments(w.id), snagsForWorkspace(w.id), listCases(w.id),
        ]);
        return [w.id, {
          obs: obs.length,
          videos: segs.length,
          openSnags: snags.filter(s => s.status !== 'closed').length,
          cases: cases.length,
        }] as const;
      }));
      if (alive) setCasesTotal(entries.reduce((a, [, c]) => a + (c.cases ?? 0), 0));
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
  }, [syncedAt, delTick]);

  const create = async () => {
    if (busy || !name.trim()) return; // guard double Enter / double-tap → no duplicate workspaces
    setBusy(true); setError('');
    try {
      const w = await createWorkspace(name, taxId);
      nav(`/w/${w.id}`); // unmounts this screen on success
    } catch (e) {
      // Never leave the button stuck on "Creating…": surface the real reason and
      // let them retry. (A storage/upgrade fault used to hang here silently.)
      setError(e instanceof Error ? e.message : 'Could not create the workspace. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="wrap home">
      <div className="home-head">
        <Wordmark />
        <p className="home-tag">Walk the line, find the problems — lost time and pinned faults alike — and make what you find visible: a Pareto, a cost, a tracked snag list.</p>
      </div>

      <InstallPanel />
      <CloudPanel />

      {profile?.is_super && (
        <>
          <button className="admin-row" onClick={() => setAdminOpen(true)}>
            <span className="admin-ic" aria-hidden>◆</span>
            <span className="cloud-main"><b>Team &amp; invites</b><span className="sub">invite people, see who's joined</span></span>
            <span className="cloud-go" aria-hidden>›</span>
          </button>
          <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
        </>
      )}

      {creating ? (
        <div className="card create-card">
          <label className="field-label">Name this workspace</label>
          <input
            className="text-input" autoFocus value={name} maxLength={60}
            placeholder="e.g. Packing hall — August"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) void create(); if (e.key === 'Escape') setCreating(false); }}
          />
          {/* the domain moat, offered as a seed: pick the vocabulary your line
              already speaks — every string stays editable afterwards */}
          <label className="field-label" style={{ marginTop: 12 }}>Start from</label>
          <div className="tax-pick" role="radiogroup" aria-label="Loss categories to start from">
            {TAXONOMIES.map(t => (
              <button key={t.id} role="radio" aria-checked={taxId === t.id}
                className={'tax-opt' + (taxId === t.id ? ' on' : '')} onClick={() => setTaxId(t.id)}>
                <span className="tax-name">{t.name}</span>
                <span className="tax-sub">{t.sub}</span>
              </button>
            ))}
          </div>
          <p className="sub" style={{ marginTop: 8 }}>A workspace keeps its own data and tools — a clean, separate space for one line, one project, one investigation. Categories and assets from the starter are suggestions — rename, add or delete any of them in Settings.</p>
          {error && <p className="sub" style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
          <div className="row-end">
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={create}>{busy ? 'Creating…' : 'Create'}</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-lg new-ws" data-tour="new-ws" onClick={() => setCreating(true)}>＋ New workspace</button>
      )}

      {/* the enterprise surface: every Case, every line, one page — the
          portfolio for the CI manager, the ledger for the FD */}
      <button className="admin-row pf-door" onClick={() => nav('projects')}>
        <span className="admin-ic" aria-hidden>📊</span>
        <span className="cloud-main"><b>Projects</b><span className="sub">multi-line improvement initiatives — track pace across lines</span></span>
        <span className="cloud-go" aria-hidden>›</span>
      </button>

      {casesTotal > 0 && (
        <button className="admin-row pf-door" onClick={() => nav('/portfolio')}>
          <span className="admin-ic" aria-hidden>▥</span>
          <span className="cloud-main"><b>Improvement work</b><span className="sub">every case, every line — at stake &amp; proven</span></span>
          <span className="cloud-go" aria-hidden>›</span>
        </button>
      )}

      {list === null ? null : list.length === 0 && !creating ? (
        <EmptyState title="No workspaces yet" icon="◱">
          Make one for a line, a project, or an investigation — the shop floor logs into it, the analysis stays inside it.
        </EmptyState>
      ) : (
        <div className="ws-list">
          {list.filter(w => w.id !== pendingDel?.id).map(w => (
            <button key={w.id} className="ws-card" onClick={() => nav(`/w/${w.id}`)}>
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
          ))}
        </div>
      )}

      {/* the showcase builder, tucked at the bottom — a superadmin tool, not a
          headline. 14 weeks of story-shaped data; replaces any existing demo. */}
      {profile?.is_super && (
        <button className="home-guide-link" onClick={() => void seedDemo()} disabled={!!seeding}>
          ◈ {seeding ? `Building the demo… ${seeding}` : 'Build / rebuild the demo workspace ›'}
        </button>
      )}

      {/* documentation, not a demo — THE demo is the film on the demo board */}
      <button className="home-guide-link" onClick={() => nav('/guide')}>
        📖 User guide — how Faultline works ›
      </button>

      {pendingDel && (
        <Toast message={`Deleted “${pendingDel.name}”`} onUndo={undoDelete} onDismiss={() => void commitDelete()} />
      )}
      <BuildStamp />
    </div>
  );
}
