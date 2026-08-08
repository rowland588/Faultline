/* The raw log — every observation, newest first. Read, inspect the evidence, and
 * delete with an Undo (soft-delete + one-tap restore). */
import { useState } from 'react';
import type { MediaRef, Observation } from '../types';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav, goBack } from '../state/useRoute';
import { EmptyState } from '../ui/EmptyState';
import { Toast } from '../ui/Toast';
import { EvidenceViewer } from '../ui/Evidence';
import { fmtDuration, fmtDurationWords, fmtRelative, plural } from '../lib/format';
import { useTeam } from '../cloud/team';

export function LogScreen() {
  const { workspace, observations, removeObs, restoreObs } = useWorkspace();
  const { whoIs, myId } = useTeam();
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [viewing, setViewing] = useState<MediaRef | null>(null);

  const del = async (o: Observation) => {
    await removeObs(o.id);
    setToast({ msg: `Deleted · ${o.asset} · ${o.category}`, undo: () => void restoreObs(o.id) });
  };

  if (observations.length === 0) {
    return (
      <div className="wrap">
        <div className="subhead">
          <button className="back-btn" onClick={() => goBack(`/w/${workspace.id}/capture`)}>‹ Back</button>
          <span className="subhead-title">The log</span>
        </div>
        <EmptyState title="Nothing logged yet" icon="✎"
          action={<button className="btn btn-primary" onClick={() => nav(`/w/${workspace.id}/capture`)}>Go to Capture ›</button>}>
          Head to Capture and log the first thing you see — it lands here.
        </EmptyState>
      </div>
    );
  }

  const total = observations.reduce((a, o) => a + o.durationMs, 0);

  return (
    <div className="wrap">
      <div className="subhead">
        <button className="back-btn" onClick={() => goBack(`/w/${workspace.id}/capture`)}>‹ Back</button>
        <span className="subhead-title">The log</span>
      </div>
      <h1 className="h1">{plural(observations.length, 'observation')}</h1>
      <p className="sub" style={{ marginTop: 4 }}>{fmtDurationWords(total)} logged</p>
      <div className="log-list">
        {observations.map(o => (
          <div key={o.id} className="log-row">
            <span className="log-dot" style={{ background: workspace.color }} />
            <div className="log-main">
              <div className="log-title">{o.asset} · <b>{o.category || '—'}</b>{o.subcategory ? ` · ${o.subcategory}` : ''}</div>
              <div className="log-meta">
                {o.durationMs > 0 ? fmtDuration(o.durationMs) : 'noted'} · {fmtRelative(o.startedAt)}
                {o.ownerId && myId && o.ownerId !== myId && <> · <b>{whoIs(o.ownerId)?.name ?? 'teammate'}</b></>}
              </div>
            </div>
            {o.media.length > 0 && (
              <button className="log-ev" onClick={() => setViewing(o.media[0])} aria-label={`View ${plural(o.media.length, 'clip')}`}>
                📷 {o.media.length}
              </button>
            )}
            <button className="log-del" onClick={() => void del(o)} aria-label={`Delete ${o.category} on ${o.asset}`}>✕</button>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast.msg} onUndo={toast.undo ? () => { toast.undo!(); setToast(null); } : undefined} onDismiss={() => setToast(null)} />}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
