/* PICK THE WORK OFF THE TRACKER AND HANG IT ON THE TREE.
 *
 * Every earlier version of this had the user copying rows out of the
 * spreadsheet and pasting them in — which was solving the wrong problem.
 * The tracker is already IN the app: it is uploaded every week, parsed, and
 * sitting in pace_snapshots. Asking somebody to go back to Excel, find the
 * column, copy it and paste it into a box was asking them to fetch something
 * from the next room that was already on the table.
 *
 * So: tap a box, see this week's actions, tap the ones that belong under it.
 * No copying, no window-switching, no retyping — and identical on a phone and
 * a laptop, because tapping a row in a list is the one gesture that works
 * everywhere.
 *
 * Typing or pasting is still here, behind a link, for work that is real but
 * not in the tracker yet. It is the exception now rather than the route.
 */
import { useMemo, useState } from 'react';
import type { PaceAction } from '../lib/projectPaceData';

const DONE = /^(done|complete|completed|closed)$/i;

/** What a picked row should say on the tree. The action's own words, plus who
 *  has it — the two things you need when looking at the shape of the project.
 *  The date deliberately stays behind in the tracker, which is where it gets
 *  changed and where it stays right. */
export function actionText(a: PaceAction): string {
  const what = (a.action || a.problem || '').trim() || `Action ${a.ref}`;
  const who = (a.owner || a.who || '').trim();
  return who ? `${what} · ${who}` : what;
}

export function TrackerPicker({
  title, actions, alreadyOn, onAdd, onClose, onTypeInstead,
}: {
  title: string;
  actions: PaceAction[];
  /** Normalised text of everything already somewhere on the tree, so a row can
   *  say so rather than letting the same action be hung twice. */
  alreadyOn: Set<string>;
  onAdd: (picked: PaceAction[]) => void;
  onClose: () => void;
  onTypeInstead: () => void;
}) {
  const [q, setQ] = useState('');
  const [line, setLine] = useState('');
  const [hideDone, setHideDone] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const lines = useMemo(
    () => [...new Set(actions.map(a => a.line).filter(Boolean))].sort(),
    [actions],
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return actions.filter(a => {
      if (line && a.line !== line) return false;
      if (hideDone && DONE.test(a.status.trim())) return false;
      if (!needle) return true;
      return [a.action, a.problem, a.owner, a.who, a.category, a.ref]
        .some(v => (v ?? '').toLowerCase().includes(needle));
    });
  }, [actions, q, line, hideDone]);

  const key = (a: PaceAction) => a.uid || a.ref;
  const toggle = (a: PaceAction) => {
    const k = key(a);
    setPicked(p => {
      const next = new Set(p);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const chosen = actions.filter(a => picked.has(key(a)));

  return (
    <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Add work from the tracker">
      <div className="lt-pick">
        <div className="lt-pick-head">
          <h2 className="lt-paste-t">Add under “{title}”</h2>
          <p className="sub">
            This week’s tracker, as uploaded. Tap the work that belongs here.
          </p>

          <input
            className="text-input" value={q} autoFocus
            placeholder="Search the action, the owner, the category…"
            onChange={e => setQ(e.target.value)}
          />

          <div className="lt-pick-filters">
            <button className={'chip' + (line === '' ? ' on' : '')} onClick={() => setLine('')}>All lines</button>
            {lines.map(l => (
              <button key={l} className={'chip' + (line === l ? ' on' : '')} onClick={() => setLine(l)}>{l}</button>
            ))}
            <button className={'chip' + (hideDone ? ' on' : '')} onClick={() => setHideDone(v => !v)}>
              {hideDone ? 'Hiding done' : 'Showing done'}
            </button>
          </div>
        </div>

        <div className="lt-pick-list">
          {shown.length === 0 ? (
            <p className="sub lt-pick-none">
              {actions.length === 0
                ? 'No tracker uploaded to this project yet. Upload this week’s workbook on the project’s Data tab, and the actions will be here.'
                : 'Nothing matches. Try a different word, or clear the filters.'}
            </p>
          ) : shown.map(a => {
            const k = key(a);
            const on = picked.has(k);
            const dup = alreadyOn.has(actionText(a).toLowerCase());
            return (
              <button
                key={k} type="button"
                className={'lt-pick-row' + (on ? ' is-on' : '') + (dup ? ' is-dup' : '')}
                aria-pressed={on}
                onClick={() => toggle(a)}
              >
                <span className="lt-pick-tick" aria-hidden>{on ? '✓' : ''}</span>
                <span className="lt-pick-main">
                  <span className="lt-pick-what">{a.action || a.problem || `Action ${a.ref}`}</span>
                  <span className="lt-pick-meta">
                    {[a.line && 'Line ' + a.line, a.owner || a.who, a.category, a.status]
                      .filter(Boolean).join(' · ')}
                    {dup && <b className="lt-pick-dup"> · already on the tree</b>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="lt-pick-foot">
          <button className="btn btn-ghost" onClick={onTypeInstead}>Type it</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={chosen.length === 0} onClick={() => onAdd(chosen)}>
            Add {chosen.length || ''}
          </button>
        </div>
      </div>
    </div>
  );
}
