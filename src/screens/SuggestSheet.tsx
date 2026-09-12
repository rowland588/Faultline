/* THE FIRST RUN, WHICH IS WHERE THIS IS EITHER ADOPTED OR ABANDONED.
 *
 * Linking one condition to the tracker is a nice trick. Being told to write
 * eight conditions per line and link each of them before anything happens is a
 * job, and jobs get put off until the feature is forgotten.
 *
 * So the tedious half is done here: read which categories the line actually has
 * work in, rank them by weight, and offer one condition per category ALREADY
 * LINKED. Tick the ones that belong, and the branch is built.
 *
 * The wording is a first draft, and it says so. The author's own words are the
 * entire point of that level — a condition is a statement of intent, not a
 * spreadsheet column heading — so every line here is editable on the tree the
 * moment it lands, and the suggestion is deliberately a sentence somebody would
 * want to improve rather than one they would leave alone.
 */
import { useMemo, useState } from 'react';
import type { PaceAction } from '../lib/projectPaceData';
import type { PaceLineRow } from '../db';
import { suggestConditions, trackerLines, allLinesCount, ALL_LINES, type TrackerBind } from '../lib/treeBind';

export function SuggestSheet({
  title, lines, actions, onBuild, onClose,
}: {
  /** The "what needs to be true" box these conditions will hang under. */
  title: string;
  lines: PaceLineRow[];
  actions: PaceAction[];
  onBuild: (picked: { text: string; bind: TrackerBind }[]) => void;
  onClose: () => void;
}) {
  /* Guess the line from the box's own words before asking — "Line 2 achieves
     its ppm rate" is about Line 2, and making somebody say so again is the kind
     of small tax that adds up to not using it. */
  const choices = useMemo(() => trackerLines(lines), [lines]);
  const spanning = useMemo(() => allLinesCount(actions), [actions]);
  const guess = useMemo(() => {
    const n = title.match(/\b(\d+)\b/)?.[1];
    return (n && choices.find(l => l.key.replace(/\D/g, '') === n)?.key) || choices[0]?.key || '';
  }, [title, choices]);

  const [line, setLine] = useState(guess);
  const proposed = useMemo(() => suggestConditions(actions, line), [actions, line]);
  const [off, setOff] = useState<Set<string>>(new Set());

  const chosen = proposed.filter(p => !off.has(p.text));
  const toggle = (t: string) =>
    setOff(o => { const n = new Set(o); if (n.has(t)) n.delete(t); else n.add(t); return n; });

  return (
    <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Build the conditions from the tracker">
      <div className="bs">
        <h2 className="lt-paste-t">Build the conditions</h2>
        <p className="sub bs-lede">
          One condition for each kind of work the tracker has on this line, each one already linked.
          Untick anything that doesn’t belong, then <b>edit the wording on the tree</b> — these are a
          starting point, not the finished sentence.
        </p>

        {(choices.length > 1 || spanning > 0) && (
          <>
            <p className="wp-lbl">Which line</p>
            <div className="wp-chips">
              {choices.map(l => (
                <button key={l.key} className={'chip' + (l.key === line ? ' on' : '')}
                  onClick={() => { setLine(l.key); setOff(new Set()); }}>{l.label}</button>
              ))}
              {spanning > 0 && (
                <button className={'chip' + (line === ALL_LINES ? ' on' : '')}
                  onClick={() => { setLine(ALL_LINES); setOff(new Set()); }}>
                  Across every line <span className="bs-n">{spanning}</span>
                </button>
              )}
            </div>
          </>
        )}

        <p className="wp-lbl">Under “{title || 'this box'}”</p>
        {proposed.length === 0 ? (
          /* A line with nothing of its own is a real finding, not an error, and
             it is worth saying out loud: on the baseline workbook Line 7 has no
             dedicated actions at all — everything that looked like its work was
             the "All lines" rows, which used to be counted under all three
             branches at once. Say which it is, and point at the way forward. */
          <p className="sub">
            {line === ALL_LINES
              ? 'The tracker has no work marked as spanning every line.'
              : spanning > 0
                ? <>This line has no actions of its own on this week’s tracker — the only work
                    touching it is the {spanning} the tracker marks as spanning every line, and
                    those belong in <b>Across every line</b> above so they are not counted three
                    times over.</>
                : 'That line has no actions on this week’s tracker, so there is nothing to build from yet.'}
          </p>
        ) : (
          <ul className="sg-list">
            {proposed.map(p => (
              <li key={p.text}>
                <button
                  type="button"
                  className={'sg-row' + (off.has(p.text) ? ' is-off' : '')}
                  aria-pressed={!off.has(p.text)}
                  onClick={() => toggle(p.text)}
                >
                  <span className="sg-tick" aria-hidden>{off.has(p.text) ? '' : '✓'}</span>
                  <span className="sg-main">
                    <span className="sg-t">{p.text}</span>
                    <span className="sg-s">{p.bind.categories?.[0]} · {p.count} action{p.count === 1 ? '' : 's'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="wp-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div style={{ flex: 1 }} />
          {proposed.length === 0 && spanning > 0 && line !== ALL_LINES ? (
            <button className="btn btn-primary" onClick={() => { setLine(ALL_LINES); setOff(new Set()); }}>
              Show the {spanning} across every line
            </button>
          ) : (
            <button className="btn btn-primary" disabled={chosen.length === 0}
              onClick={() => onBuild(chosen.map(c => ({ text: c.text, bind: c.bind })))}>
              Build {chosen.length || ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
