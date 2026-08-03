/* The raw log — every observation, newest first. Thin in P0: read + delete.
 * The real edit affordances ride in with capture. */
import { useWorkspace } from '../state/WorkspaceProvider';
import { EmptyState } from '../ui/EmptyState';
import { fmtDuration, fmtRelative, plural } from '../lib/format';

export function LogScreen() {
  const { observations, removeObs } = useWorkspace();

  if (observations.length === 0) {
    return (
      <div className="wrap">
        <EmptyState title="Nothing logged yet" icon="✎">Head to Capture and log the first thing you see.</EmptyState>
      </div>
    );
  }

  return (
    <div className="wrap">
      <p className="eyebrow">The log</p>
      <h1 className="h1">{plural(observations.length, 'observation')}</h1>
      <div className="log-list">
        {observations.map(o => (
          <div key={o.id} className="log-row">
            <div className="log-main">
              <div className="log-title">
                <b>{o.category || '—'}</b>
                {o.asset && <span className="log-where"> · {o.asset}</span>}
              </div>
              <div className="log-meta">
                {o.durationMs > 0 ? fmtDuration(o.durationMs) : 'noted'} · {fmtRelative(o.startedAt)}
                {o.media.length > 0 && ` · 📷 ${o.media.length}`}
              </div>
            </div>
            <button className="log-del" onClick={() => removeObs(o.id)} aria-label="Delete">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
