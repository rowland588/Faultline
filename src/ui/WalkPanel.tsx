/* WHAT THE WALK FOUND — the panel a marker on the plan's walk lane opens.
 *
 * Each snag as the walk shows it: the frame with its pin, what is wrong, who
 * has it and by when — the open ones first, past due at the top. One tap on
 * the frame opens it on the walk, where it is edited and closed. Nothing is
 * edited here: the walk is where a snag lives, and the plan only points at it.
 */
import type { WalkSnag } from '../lib/walkSnags';
import { isLate } from '../lib/walkSnags';
import { niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';
import { PinnedFrame } from './OnTheLine';

const STATE: Record<WalkSnag['state'], string> = { open: 'Open', in_progress: 'In hand', closed: 'Closed' };

export function WalkPanel({ title, snags, today, projectId, onClose }: {
  title: string; snags: WalkSnag[]; today: string; projectId: string; onClose: () => void;
}) {
  const rank = (s: WalkSnag) => (isLate(s, today) ? 0 : s.state === 'open' ? 1 : s.state === 'in_progress' ? 2 : 3);
  const list = [...snags].sort((a, b) => rank(a) - rank(b) || a.found.localeCompare(b.found));
  const go = (s: WalkSnag) => nav(`/w/${s.wsId}/asset/${s.frameId}`);
  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="wp">
        <ol className="wp-list">
          {list.map(s => {
            const late = isLate(s, today);
            const tone = late ? 'late' : s.state === 'closed' ? 'done' : s.state === 'in_progress' ? 'prog' : 'open';
            return (
              <li key={s.id} className={'wp-row is-' + tone}>
                <span className="wp-pic">
                  {s.stillKey
                    ? <PinnedFrame stillKey={s.stillKey} x={s.x ?? 50} y={s.y ?? 50} onClick={() => go(s)} />
                    : <span className="otl-frame-ph">No picture</span>}
                </span>
                <span className="wp-body">
                  <span className={'wp-state is-' + tone}>{late ? 'Past due' : STATE[s.state]}</span>
                  <b className="wp-what">{s.what || 'A snag with no words yet'}</b>
                  <small className="wp-meta">
                    {s.frameName ? `${s.frameName} · ` : ''}found {niceDay(s.found, { weekday: 'short' })}
                    {s.state !== 'closed' && (s.due ? ` · due ${niceDay(s.due, { weekday: 'short' })}` : ' · no date agreed')}
                    {s.owner ? ` · ${s.owner}` : ''}
                  </small>
                  <button type="button" className="cw-link" onClick={() => go(s)}>Open it on the walk ›</button>
                </span>
              </li>
            );
          })}
        </ol>
        <button type="button" className="btn btn-ghost wp-all" onClick={() => nav(`/project/${projectId}?view=snags`)}>All the evidence ›</button>
      </div>
    </Sheet>
  );
}
