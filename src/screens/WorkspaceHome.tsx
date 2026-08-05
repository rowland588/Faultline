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

export function WorkspaceHome() {
  const [list, setList] = useState<Workspace[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');

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
  }, []);

  const create = async () => {
    if (busy || !name.trim()) return; // guard double Enter / double-tap → no duplicate workspaces
    setBusy(true);
    const w = await createWorkspace(name);
    nav(`/w/${w.id}`);
  };

  return (
    <div className="wrap home">
      <div className="home-head">
        <Wordmark />
        <p className="home-tag">Walk the line, put a time to every stop, and watch the loss turn into a Pareto and a pound figure.</p>
      </div>

      <CloudPanel />

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
    </div>
  );
}
