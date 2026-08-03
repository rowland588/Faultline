/* Home — the workspaces. Each is a clean, isolated split (its own data, its own
 * tools). Tapping one resumes exactly where you left it. */
import { useEffect, useState } from 'react';
import type { Workspace } from '../types';
import { listWorkspaces, listObservations, createWorkspace } from '../db';
import { nav } from '../state/useRoute';
import { EmptyState } from '../ui/EmptyState';
import { fmtRelative, plural } from '../lib/format';

export function WorkspaceHome() {
  const [list, setList] = useState<Workspace[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const ws = await listWorkspaces();
      if (!alive) return;
      setList(ws);
      const c: Record<string, number> = {};
      for (const w of ws) c[w.id] = (await listObservations(w.id)).length;
      if (alive) setCounts(c);
    })();
    return () => { alive = false; };
  }, []);

  const create = async () => {
    const w = await createWorkspace(name);
    nav(`/w/${w.id}`);
  };

  return (
    <div className="wrap home">
      <div className="home-head">
        <div className="mark">Finder</div>
        <div className="sub">Find the opportunities on your floor.</div>
      </div>

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
            <button className="btn btn-primary" disabled={!name.trim()} onClick={create}>Create</button>
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
          {list.map((w, i) => (
            <button key={w.id} className="ws-card" onClick={() => nav(`/w/${w.id}`)}>
              <span className="ws-card-dot" style={{ background: w.color }} />
              <span className="ws-card-main">
                <span className="ws-card-name">{w.name}</span>
                <span className="ws-card-meta">
                  {plural(counts[w.id] ?? 0, 'observation')}
                  {w.updatedAt ? ` · ${fmtRelative(w.updatedAt)}` : ''}
                </span>
              </span>
              <span className="ws-card-go">{i === 0 && w.lastRoute ? 'Resume ›' : 'Open ›'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
