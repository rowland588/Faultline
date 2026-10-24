/* THE SMED GRID — the changeover as the value stream map lays out a line
 * (ui/ValueStream; docs/TOOLKIT.md, tool 6). Rowland, 12 October: "SMED as
 * well, just like the way we've done the process mapping ... that sort of grid
 * style and how it presents itself, that'd be really ideal."
 *
 * Nothing drawn: the grid is the picture, in the map's own parts (.vs-*):
 *   SEQUENCE     the columns are the changeover's order; elements in the same
 *                column run at the same time — PARALLEL WORK, SMED's
 *                streamlining move
 *   WHO DOES IT  a lane per person or role (Op 1, the fitter, the team
 *                leader) — or, one tap, WHERE (the film unit, the jaws, the
 *                former); a square per element in its lane
 *   I · E        internal is solid ink, external hatched — by fill and its
 *                letter, never a hue (VA/NE/NV are the value stream's alone;
 *                state colours keep their meanings)
 *   THE PLAN     a mark on the square: →E convert, ↓ streamline, ✕ eliminate
 *   TIME ·       under the grid each column's time (its longest element) and
 *   ELAPSED      the running elapsed changeover, with the total column — the
 *                labour beside the elapsed
 * Play the changeover lights the columns in turn and adds up the elapsed
 * time; tap a square and everything about the element opens (its sheet). On
 * a phone the grid scrolls in its box with the lanes pinned, as the map's does. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { arrange, coLanes, lanesOfElement, mins, type CoLaneBy, type Placed, type Rung } from './changeover';
import type { ChangeoverStep } from '../../lib/study';

/** A time in a square: as short as it can be and still be read. */
const tiny = (sec: number): string => (sec <= 0 ? '' : sec < 60 ? `${+sec.toFixed(0)}s` : sec < 3600 ? `${+(sec / 60).toFixed(sec < 600 ? 1 : 0)}m` : `${+(sec / 3600).toFixed(1)}h`);

/** The plan's mark on a square, in words for a screen reader too. */
export const PLAN_MARK: Record<string, { mark: string; word: string }> = {
  convert: { mark: '→E', word: 'to be converted to external' },
  streamline: { mark: '↓', word: 'to be streamlined' },
  eliminate: { mark: '✕', word: 'to be eliminated' },
};

export function SmedGrid({ seq, rung, by, branched, onOpen }: {
  seq: ChangeoverStep[];
  /** As timed ('now'), or the plan ('streamlined'): its targets, nothing
   *  converted or eliminated inside, the parallel moves made. */
  rung: Rung;
  by: CoLaneBy;
  /** Elements a fix or a countermeasure was raised from — the branch off the element. */
  branched?: Set<string>;
  onOpen: (st: ChangeoverStep) => void;
}) {
  const a = arrange(seq, rung, { untimed: rung === 'now' });
  const lanes = coLanes(a, by);
  const [at, setAt] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<number | undefined>(undefined);
  const n = a.cols.length;
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => setAt(i => {
      const next = (i ?? -1) + 1;
      if (next >= n - 1) { setPlaying(false); return n - 1; }
      return next;
    }), 800 / speed);
    return () => window.clearInterval(timer.current);
  }, [playing, speed, n]);
  const lit = (i: number) => at === null || i <= at;
  let run = 0;
  const acc = a.cols.map(c => (run += c.sec));
  const cols: CSSProperties = { gridTemplateColumns: `var(--vs-area) repeat(${n}, var(--vs-col, 34px)) var(--vs-tot, 96px)` };
  const colIndex = new Map(a.cols.map((c, i) => [c.col, i]));
  const square = (p: Placed, lane: string) => {
    const i = colIndex.get(p.col) ?? 0, plan = p.st.plan?.kind && rung === 'now' ? PLAN_MARK[p.st.plan.kind] : undefined;
    const side = p.st.side === 'external' ? 'E' : 'I';
    return (
      <button key={`${p.st.id}|${lane}`} type="button"
        className={'vs-sq co-sq ' + (p.st.side === 'external' ? 'is-e' : 'is-i') + (p.sec > 0 ? '' : ' is-untimed') + (lit(i) ? '' : ' is-dim') + (branched?.has(p.st.id) ? ' has-fix' : '') + (p.st.source === 'carried' ? ' is-carried' : '')}
        aria-label={`Element ${p.st.order + 1} — ${lane}: ${p.st.name || 'an element'} (${p.st.side}${p.sec ? `, ${mins(p.sec)}` : ', no time yet'})${plan ? ` — ${plan.word}` : ''}${branched?.has(p.st.id) ? ' — being made better' : ''}`}
        title={`${p.st.name || 'An element'}${plan ? ` — ${plan.word}` : ''}`}
        onClick={() => onOpen(p.st)}><span className="co-l">{side}</span>{plan && <span className="co-mark" aria-hidden>{plan.mark}</span>}</button>
    );
  };
  if (!n) return <p className="sub ie-pic-empty">{rung === 'now' ? 'Each element lands here as it is recorded — a square in the lane of whoever does it, solid if the line is stopped for it, hatched if it could be done while it runs.' : 'Nothing is planned inside the stop yet.'}</p>;
  return (
    <div className="vs co-grid">
      {n > 1 && (
        <div className="vs-play">
          <button type="button" className="btn" onClick={() => { if (!playing && (at === null || at >= n - 1)) setAt(-1); setPlaying(p => !p); }}>
            {playing ? 'Pause' : at !== null && at < n - 1 ? 'Carry on' : 'Play the changeover'}
          </button>
          {at !== null && <button type="button" className="btn" onClick={() => { setPlaying(false); setAt(null); }}>Restart</button>}
          <label className="vs-speed">Speed <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="How fast it plays" /></label>
          {at !== null && at >= 0 && <span className="vs-at sub">Column {at + 1} of {n} — elapsed so far <b>{mins(acc[at] ?? 0)}</b></span>}
        </div>
      )}
      <div className="vs-scroll" role="region" aria-label={`The changeover — the elements across, ${by === 'who' ? 'who does each' : 'where each is done'} down the side`} tabIndex={0}>
        <div className="vs-grid" style={cols}>
          <div className="vs-h">Sequence</div>
          {a.cols.map((c, i) => <div key={c.col} className={'vs-sq vs-seq' + (c.ids.length > 1 ? ' co-par' : '') + (lit(i) ? '' : ' is-dim')} title={c.ids.length > 1 ? `${c.ids.length} elements at the same time` : undefined}>{i + 1}{c.ids.length > 1 ? '‖' : ''}</div>)}
          <div className="vs-tot vs-tot-h">Total</div>

          <div className="vs-h vs-areas-h">{by === 'who' ? 'Who does it' : 'Where'}</div>
          {a.cols.map(c => <div key={c.col} className="vs-gap" />)}
          <div />
          {lanes.map(lane => (
            <div key={lane} style={{ display: 'contents' }}>
              <div className="vs-lane"><span>{lane}</span></div>
              {a.cols.map((c, i) => {
                const here = a.placed.filter(p => p.col === c.col && lanesOfElement(p, by).includes(lane));
                return here.length ? square(here[0], lane) : <div key={c.col} className={'vs-sq vs-empty' + (lit(i) ? '' : ' is-dim')} aria-hidden />;
              })}
              <div />
            </div>
          ))}

          <div className="vs-h vs-times-h">Time</div>
          {a.cols.map((c, i) => <div key={c.col} className={'vs-sq vs-t vs-c' + (lit(i) ? '' : ' is-dim')}>{tiny(c.sec)}</div>)}
          <div className="vs-tot"><span>work</span> <b>{mins(a.labourSec)}</b></div>
          <div className="vs-h">Elapsed</div>
          {a.cols.map((c, i) => <div key={c.col} className={'vs-sq vs-t vs-l' + (lit(i) ? '' : ' is-dim')}>{tiny(acc[i] ?? 0)}</div>)}
          <div className="vs-tot vs-tot-lead"><b>{mins(at === null ? a.elapsedSec : acc[at] ?? 0)}</b></div>
        </div>
      </div>
      <p className="vs-key sub">
        <span className="vs-key-i co-key-sq is-i">I</span> internal — the line stopped
        <span className="vs-key-i co-key-sq is-e"><span className="co-l">E</span></span> external — could be done while it runs
        {rung === 'now' && <span>· →E convert · ↓ streamline · ✕ eliminate</span>}
        <span>· ‖ at the same time · tap a square for everything about that element · elapsed = the longest element in each column</span>
      </p>
    </div>
  );
}
