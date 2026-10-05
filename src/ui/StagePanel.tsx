/* WHY ONE OF THE OTHER DATES MOVED — the panel the plan opens on a date that
 * is not a stage: the handover, a machine, a material, a program.
 *
 * Rowland: "There's the plan. Plans change. This is the reason why. This is
 * what happened. Look at the film. Look at the picture."
 *
 * Read off lib/story: each move with its reason, the film and the pictures,
 * in the order it happened; and the way to where the date itself is kept. A
 * STAGE (a step, a test, a fix) no longer comes here — the plan opens it in
 * the record's drawer (ui/RecordDrawer), where its story, its dates and the
 * floor's buttons are, like every other door onto it.
 */
import { useState } from 'react';
import type { MediaRef } from '../types';
import { keyOf, storyOf } from '../lib/story';
import { niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';
import { EvidenceThumb, EvidenceViewer } from './Evidence';
import { useTesting } from '../lib/useTesting';
import { offerUndo } from './Undo';
import { useAccess } from '../cloud/access';

export function StagePanel({ thingKey, title, href, projectId, onClose }: {
  thingKey: string; title: string; href?: string; projectId: string; onClose: () => void;
}) {
  const tt = useTesting(projectId);
  /* A client reads the story; the team rewords a reason but removes none. */
  const can = useAccess(projectId);
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const st = storyOf(thingKey, tt.tests, tt.items);
  const total = st.moves.reduce((n, m) => n + m.days, 0);
  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="sp">
        <p className="sp-dates">
          {st.moves.length ? <><b className="sp-slip">+{total} day{total === 1 ? '' : 's'}</b> since first planned ({niceDay(st.original)})</> : 'Nothing has moved it yet.'}
        </p>
        {st.moves.length > 0 && (
          <ol className="sp-list">
            {st.moves.map(m => (
              <li key={m.id}><span className="sp-on">{niceDay(m.on, { weekday: 'short' })}</span>
                <div className="sp-body">
                  <span className="sp-k is-move">Moved</span>
                  <p className="sp-t"><b>{niceDay(m.from)} → {niceDay(m.to)}</b> · +{m.days} day{m.days === 1 ? '' : 's'}</p>
                  {editing === m.id ? (
                    <span className="sp-edit">
                      <textarea className="text-area" rows={2} defaultValue={m.why} autoFocus id={`sp-e-${m.id}`} aria-label="Why it moved" />
                      <span className="sp-edit-acts">
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => {
                          const v = (document.getElementById(`sp-e-${m.id}`) as HTMLTextAreaElement | null)?.value.trim();
                          const it = tt.items.find(i => i.id === m.id);
                          if (it && v && v !== it.what) { void tt.saveItem({ ...it, what: v }); offerUndo('Reason changed', () => tt.saveItem(it)); }
                          setEditing(null);
                        }}>Save</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                      </span>
                    </span>
                  ) : <p className="sp-why">{m.why}</p>}
                  {m.media.length > 0 && <span className="sp-ev">{m.media.map(x => <EvidenceThumb key={x.id} media={x} size={64} onClick={() => setViewing(x)} />)}</span>}
                  {editing !== m.id && can.edit && (
                    <span className="sp-row-acts">
                      <button type="button" className="cw-link" onClick={() => setEditing(m.id)}>Edit</button>
                      {can.remove && <button type="button" className="cw-link sp-rm" onClick={() => void tt.removeItem(m.id)}>Remove</button>}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        {/* The handover date was agreed: only the owner changes it. */}
        {href && <button type="button" className="btn btn-primary sp-open" onClick={() => nav(href)}>
          {can.edit && (can.agree || thingKey !== keyOf('handover')) ? 'Change the date ›' : 'Where the date is kept ›'}
        </button>}
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </Sheet>
  );
}
