/* POINT A CONDITION AT THE TRACKER, ONCE.
 *
 * After this, the work under that box arrives by itself: every weekly upload
 * files its rows under the condition they belong to, a closed action goes green
 * on its own, and nothing is ever copied out of Excel again.
 *
 * The binding is plumbing, so it is shown as plainly as possible: which line,
 * which categories, and — only if a category is too coarse to be one condition
 * — a word. The count updates as you tap, because the only question anybody
 * actually has here is "how many does that catch?", and answering it live beats
 * any amount of explaining.
 *
 * What this sheet does NOT do is write the condition for you. The box keeps the
 * words its author wrote; a category is a bucket and a condition is a statement
 * of intent, and the day the tree starts reading like a spreadsheet's column
 * headings is the day it stops being worth putting on a wall.
 */
import { useMemo, useState } from 'react';
import type { PaceAction } from '../lib/projectPaceData';
import type { PaceLineRow } from '../db';
import {
  actionsForBind, statusOfAction, bindActionText, trackerLines, allLinesCount, ALL_LINES,
  type TrackerBind,
} from '../lib/treeBind';

export function BindSheet({
  title, lines, actions, initial, onSave, onClear, onClose,
}: {
  /** The condition's own words, so it is obvious what is being bound. */
  title: string;
  lines: PaceLineRow[];
  actions: PaceAction[];
  initial?: TrackerBind;
  onSave: (b: TrackerBind) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  /* One entry per line THE TRACKER writes, not per line the app keys. The app
     splits Line 2 into 2A and 2B because they are measured apart; the tracker
     files both under "Line 2", so offering both would let the same 31 actions
     be hung on the tree twice. */
  const choices = useMemo(() => trackerLines(lines), [lines]);
  const spanning = useMemo(() => allLinesCount(actions), [actions]);
  const [line, setLine] = useState(
    initial?.allLines ? ALL_LINES : initial?.line ?? choices[0]?.key ?? '');
  const allLines = line === ALL_LINES;
  const [cats, setCats] = useState<string[]>(initial?.categories ?? []);
  const [keyword, setKeyword] = useState(initial?.keyword ?? '');

  /* Only the categories this line actually has actions in, with their weight.
     Offering all 27 of the workbook's categories would be true and useless —
     most of them have nothing on this line. */
  const available = useMemo(() => {
    const by = new Map<string, number>();
    for (const a of actionsForBind(actions, allLines ? { allLines: true } : { line })) {
      const c = (a.category ?? '').trim();
      if (c) by.set(c, (by.get(c) ?? 0) + 1);
    }
    return [...by.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  }, [actions, line, allLines]);

  const bind: TrackerBind = {
    ...(allLines ? { allLines: true } : { line: line || undefined }),
    categories: cats.length ? cats : undefined,
    keyword: keyword.trim() || undefined,
  };
  const caught = actionsForBind(actions, bind);
  const open = caught.filter(a => statusOfAction(a) !== 'g').length;

  const toggle = (c: string) =>
    setCats(cs => (cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]));

  return (
    <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Fill this box from the tracker">
      <div className="bs">
        <h2 className="lt-paste-t">Fill from the tracker</h2>
        <p className="sub bs-lede">
          The work under <b>“{title || 'this box'}”</b> comes straight off the weekly upload
          from here on. Nothing to copy, and nothing to keep up to date.
        </p>

        <p className="wp-lbl">Which line</p>
        <div className="wp-chips">
          {choices.map(l => (
            <button key={l.key} className={'chip' + (l.key === line ? ' on' : '')}
              onClick={() => { setLine(l.key); setCats([]); }}>{l.label}</button>
          ))}
          {/* The tracker's "All lines" rows belong to the project, not to any
              one branch — put under all three they read out three times in a
              meeting and treble-count on the report. They get a box of their
              own instead. */}
          {spanning > 0 && (
            <button className={'chip' + (allLines ? ' on' : '')}
              onClick={() => { setLine(ALL_LINES); setCats([]); }}>
              Across every line <span className="bs-n">{spanning}</span>
            </button>
          )}
        </div>

        <p className="wp-lbl">
          Which of the tracker’s categories
          {cats.length === 0 && <span className="bs-hint"> · none picked means all of them</span>}
        </p>
        {available.length === 0 ? (
          <p className="sub">That line has no actions on this week’s tracker.</p>
        ) : (
          <div className="wp-chips">
            {available.map(([c, n]) => (
              <button key={c} className={'chip' + (cats.includes(c) ? ' on' : '')} onClick={() => toggle(c)}>
                {c} <span className="bs-n">{n}</span>
              </button>
            ))}
          </div>
        )}

        <p className="wp-lbl">Narrow it by a word <span className="bs-hint">· optional</span></p>
        <input
          className="text-input" value={keyword} placeholder="e.g. bagger"
          onChange={e => setKeyword(e.target.value)}
        />

        {/* The answer to the only question anybody has, kept live. */}
        <div className="bs-catch">
          <p className="bs-catch-h">
            <b>{caught.length}</b> action{caught.length === 1 ? '' : 's'} land under this box
            {caught.length > 0 && <> · {open} still open</>}
          </p>
          {caught.length === 0 ? (
            <p className="sub">Nothing matches yet. Widen the categories, or clear the word.</p>
          ) : (
            <ul className="bs-list">
              {caught.slice(0, 7).map((a, i) => (
                <li key={a.uid || a.ref || i} className={'bs-row is-' + statusOfAction(a)}>
                  <span className="bs-dot" aria-hidden />
                  <span className="bs-row-t">{bindActionText(a)}</span>
                </li>
              ))}
              {caught.length > 7 && <li className="sub bs-more">and {caught.length - 7} more</li>}
            </ul>
          )}
        </div>

        <div className="wp-foot">
          {initial
            ? <button className="btn btn-ghost" onClick={onClear}>Unlink</button>
            : <button className="btn btn-ghost" onClick={onClose}>Cancel</button>}
          <div style={{ flex: 1 }} />
          {initial && <button className="btn btn-ghost" onClick={onClose}>Cancel</button>}
          <button className="btn btn-primary" disabled={caught.length === 0} onClick={() => onSave(bind)}>
            {initial ? 'Update the link' : 'Link it'}
          </button>
        </div>
        <p className="sub wp-fine">
          These rows are read from the tracker every time the tree is drawn — they are not copied
          onto it, so next week’s upload is already accounted for.
        </p>
      </div>
    </div>
  );
}
