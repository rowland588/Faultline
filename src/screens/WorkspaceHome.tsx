/* Home — the workspaces. Each is a clean, isolated split (its own data, its own
 * tools). Tapping one resumes exactly where you left it. */
import { useEffect, useState } from 'react';
import type { Workspace } from '../types';
import { listWorkspaces, listObservations, createWorkspace } from '../db';
import { nav } from '../state/useRoute';
import { EmptyState } from '../ui/EmptyState';
import { Wordmark } from '../ui/Logo';
import { fmtRelative, plural } from '../lib/format';
import { CloudPanel } from '../cloud/CloudPanel';
import { AdminPanel } from '../cloud/AdminPanel';
import { useProfile } from '../cloud/admin';
import { useSyncedAt } from '../cloud/session';
import { InstallPanel } from '../ui/InstallPanel';

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

export function WorkspaceHome() {
  const [list, setList] = useState<Workspace[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { profile } = useProfile();
  const [adminOpen, setAdminOpen] = useState(false);

  // Re-reads whenever a sync finishes, so data pulled in the background (e.g.
  // straight after signing in on a new device) appears without a manual refresh.
  const syncedAt = useSyncedAt();
  useEffect(() => {
    let alive = true;
    (async () => {
      const ws = await listWorkspaces();
      if (!alive) return;
      setList(ws);
      const entries = await Promise.all(ws.map(async w => [w.id, (await listObservations(w.id)).length] as const));
      if (alive) setCounts(Object.fromEntries(entries));
    })();
    return () => { alive = false; };
  }, [syncedAt]);

  const create = async () => {
    if (busy || !name.trim()) return; // guard double Enter / double-tap → no duplicate workspaces
    setBusy(true); setError('');
    try {
      const w = await createWorkspace(name);
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
          <p className="sub" style={{ marginTop: 8 }}>A workspace keeps its own data and tools — a clean, separate space for one line, one project, one investigation.</p>
          {error && <p className="sub" style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
          <div className="row-end">
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={create}>{busy ? 'Creating…' : 'Create'}</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-lg new-ws" onClick={() => setCreating(true)}>＋ New workspace</button>
      )}

      {list === null ? null : list.length === 0 && !creating ? (
        <EmptyState title="No workspaces yet" icon="◱">
          Make one for a line, a project, or an investigation — the shop floor logs into it, the analysis stays inside it.
        </EmptyState>
      ) : (
        <div className="ws-list">
          {list.map(w => (
            <button key={w.id} className="ws-card" onClick={() => nav(`/w/${w.id}`)}>
              <span className="ws-card-dot" style={{ background: w.color }} />
              <span className="ws-card-main">
                <span className="ws-card-name">{w.name}</span>
                <span className="ws-card-meta">
                  {plural(counts[w.id] ?? 0, 'observation')}
                  {w.updatedAt ? ` · ${fmtRelative(w.updatedAt)}` : ''}
                </span>
              </span>
              <span className="ws-card-go">{w.lastRoute ? 'Resume ›' : 'Open ›'}</span>
            </button>
          ))}
        </div>
      )}

      <BuildStamp />
    </div>
  );
}
