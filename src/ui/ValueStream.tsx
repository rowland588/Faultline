/* THE VALUE STREAM AS A SWIMLANE GRID (docs/TOOLKIT.md, tool 2).
 *
 * Rowland, 11 October: "see the VSM like a grid — a swimlane grid. We can see
 * a journey of what, who and the value", and a picture of one: the steps in
 * sequence across the top, the areas down the side, one square per step in
 * the lane of whoever does it, each step classified VA · NE · NV, and under
 * it the cycle time, the wait and the lead time adding up step by step, with
 * a total at the end — played through, step by step, so the journey is seen.
 *
 *   CLASSIFICATION   VA adds value · NE necessary (not value, but needed) ·
 *                    NV non-value adding — waste; a wait is always NV
 *   SEQUENCE         1, 2, 3 … the journey's order
 *   AREAS            who does each step — the order office, planning, a line,
 *                    despatch, the customer — in the order the journey first
 *                    reaches them; the step's square in its lane
 *   CYCLE · WAIT ·   each step's work, what it waits after, and the lead time
 *   LEAD TIME        so far — the total at the end of each row
 *
 * VALUE BY FILL, NEVER A STATE COLOUR (Rowland's choice, 11 October): VA solid,
 * NE light, NV hatched grey, each with its letters — red, amber and green stay
 * late, waiting and done everywhere in the app, and a black-and-white print
 * still reads.
 *
 * Fixed-size squares, so the grid is its own arithmetic. On a phone it scrolls
 * sideways inside its box, the areas pinned; the page never does. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { dur, share, valueOf, waitOf, type FlowFigures } from '../lib/ie/steps';
import type { AgreedMap, FlowKind, FlowStep, FlowValue } from '../lib/study';

export const KIND: Record<FlowKind, { mark: string; word: string }> = {
  operation: { mark: '●', word: 'Operation' },
  move: { mark: '➝', word: 'Move' },
  check: { mark: '◆', word: 'Check' },
  wait: { mark: '◷', word: 'Wait' },
  store: { mark: '▽', word: 'Store' },
};
export const VALUE_WORD: Record<FlowValue, string> = { adds: 'adds value', needed: 'necessary', waste: 'non-value adding' };
export const VALUE_CODE: Record<FlowValue, string> = { adds: 'VA', needed: 'NE', waste: 'NV' };

const COL_W = 38, TOTAL_W = 96;

/** A time in a square: as short as it can be and still be read. */
const tiny = (sec: number): string => (sec < 60 ? `${+sec.toFixed(1)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : sec < 86_400 ? `${+(sec / 3600).toFixed(1)}h` : `${+(sec / 86_400).toFixed(1)}d`);

export function ValueStreamGrid({ flow, f, a, wasteOnly, onOpen, compare }: {
  flow: FlowStep[]; f: FlowFigures; a?: AgreedMap; wasteOnly?: boolean;
  onOpen?: (st: FlowStep) => void;
  /** Today's step of the same id, when this is the future — so a changed time says what it was. */
  compare?: Map<string, FlowStep>;
}) {
  const steps = [...flow].sort((x, y) => x.order - y.order);
  const lanes = f.lanes;
  const laneOf = (st: FlowStep) => Math.max(0, lanes.indexOf(st.lane?.trim() || 'Not said'));
  const [picked, setPicked] = useState<number | null>(null);
  /* PLAY THE JOURNEY — the order moving through, step by step. */
  const [at, setAt] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => setAt(i => {
      const next = (i ?? -1) + 1;
      if (next >= steps.length - 1) { setPlaying(false); return steps.length - 1; }
      return next;
    }), 800 / speed);
    return () => window.clearInterval(timer.current);
  }, [playing, speed, steps.length]);
  const lit = (i: number) => at === null || i <= at;

  /* The running lead time, step by step: work plus what waits after. */
  let run = 0;
  const acc = steps.map(st => (run += (st.cycleSec ?? 0) + (waitOf(st, a).sec ?? 0)));
  const shownLead = at === null ? f.leadSec : acc[at] ?? 0;
  /* The areas' column is var(--vs-area): narrower on a phone (styles.css). */
  const cols: CSSProperties = { gridTemplateColumns: `var(--vs-area) repeat(${steps.length}, ${COL_W}px) ${TOTAL_W}px` };
  const sel = picked !== null ? steps[picked] : undefined;

  const square = (st: FlowStep, i: number, body: React.ReactNode, cls: string, title: string) => (
    <button key={st.id} type="button" className={cls + (lit(i) ? '' : ' is-dim') + (picked === i ? ' is-picked' : '')} title={title}
      aria-label={title} aria-pressed={picked === i} onClick={() => setPicked(picked === i ? null : i)}>{body}</button>
  );

  return (
    <div className={'vs' + (wasteOnly ? ' is-waste-only' : '')}>
      <div className="vs-play">
        {steps.length > 1 && <>
          <button type="button" className="btn" onClick={() => { if (!playing && (at === null || at >= steps.length - 1)) setAt(-1); setPlaying(p => !p); }}>
            {playing ? 'Pause' : at !== null && at < steps.length - 1 ? 'Carry on' : 'Play the journey'}
          </button>
          {at !== null && <button type="button" className="btn" onClick={() => { setPlaying(false); setAt(null); }}>Show it all</button>}
          <label className="vs-speed">Speed <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="How fast it plays" /></label>
          {at !== null && at >= 0 && <span className="vs-at sub">Step {at + 1} of {steps.length} — lead time so far <b>{dur(acc[at] ?? 0)}</b></span>}
        </>}
      </div>
      <div className="vs-scroll" role="region" aria-label="The value stream — the journey across, who does it down the side" tabIndex={0}>
        <div className="vs-grid" style={cols}>
          {/* CLASSIFICATION */}
          <div className="vs-h">Classification</div>
          {steps.map((st, i) => {
            const v = valueOf(st);
            return square(st, i, v ? VALUE_CODE[v] : '?', 'vs-sq vs-cls is-' + (v ?? 'unmarked'), `Step ${i + 1}: ${v ? VALUE_WORD[v] : 'not marked yet'}`);
          })}
          <div className="vs-tot"><b>{share(f.pce ?? 0)}</b> VA</div>

          {/* SEQUENCE */}
          <div className="vs-h">Sequence</div>
          {steps.map((st, i) => square(st, i, i + 1, 'vs-sq vs-seq', `Step ${i + 1}: ${st.name || 'a step'}`))}
          <div className="vs-tot vs-tot-h">Total</div>

          {/* AREAS — who does each step */}
          <div className="vs-h vs-areas-h">Who does it</div>
          {steps.map(st => <div key={st.id} className="vs-gap" />)}
          <div />
          {lanes.map((lane, l) => (
            <div key={lane} style={{ display: 'contents' }}>
              <div className="vs-lane"><span>{lane}</span></div>
              {steps.map((st, i) => (laneOf(st) === l
                ? square(st, i, <span aria-hidden>{KIND[st.kind].mark}</span>, 'vs-sq vs-step is-' + (valueOf(st) ?? 'unmarked') + (st.burst ? ' is-burst' : ''),
                  `Step ${i + 1} — ${lane}: ${st.name || 'a step'} (${KIND[st.kind].word.toLowerCase()}, ${valueOf(st) ? VALUE_WORD[valueOf(st) as FlowValue] : 'not marked'})`)
                : <div key={st.id} className={'vs-sq vs-empty' + (lit(i) ? '' : ' is-dim')} aria-hidden />))}
              <div />
            </div>
          ))}

          {/* THE TIMES — cycle, wait, lead time so far */}
          <div className="vs-h vs-times-h">Cycle time</div>
          {steps.map((st, i) => <div key={st.id} className={'vs-sq vs-t vs-c' + (lit(i) ? '' : ' is-dim')}>{st.cycleSec ? tiny(st.cycleSec) : ''}</div>)}
          <div className="vs-tot"><b>{dur(f.leadSec - waitTotal(steps, a))}</b></div>
          <div className="vs-h">Wait</div>
          {steps.map((st, i) => { const w = waitOf(st, a).sec; return <div key={st.id} className={'vs-sq vs-t vs-w' + (w ? ' is-on' : '') + (lit(i) ? '' : ' is-dim')}>{w ? tiny(w) : ''}</div>; })}
          <div className="vs-tot"><b>{dur(waitTotal(steps, a))}</b></div>
          <div className="vs-h">Lead time so far</div>
          {steps.map((st, i) => <div key={st.id} className={'vs-sq vs-t vs-l' + (lit(i) ? '' : ' is-dim')}>{tiny(acc[i] ?? 0)}</div>)}
          <div className="vs-tot vs-tot-lead"><b>{f.untimed && at === null ? '≥ ' : ''}{dur(shownLead)}</b></div>
        </div>
      </div>
      {/* THE STEP TAPPED — what, who, the value, its times; one tap to change it. */}
      <div className="vs-picked" aria-live="polite">
        {sel && picked !== null ? (
          <>
            <b>Step {picked + 1} · {sel.lane}</b> — {sel.name || 'a step'}: {KIND[sel.kind].word.toLowerCase()}, {valueOf(sel) ? VALUE_WORD[valueOf(sel) as FlowValue] : 'not marked yet'}
            {sel.cycleSec ? ` · work ${dur(sel.cycleSec)}` : ''}{waitOf(sel, a).sec ? ` · waits ${dur(waitOf(sel, a).sec ?? 0)}${waitOf(sel, a).from === 'queue' ? ` (${sel.queue} waiting)` : ''}` : ''}
            {sel.people ? ` · ${sel.people} ${sel.people === 1 ? 'person' : 'people'}` : ''}{sel.info ? ` · its job arrives by ${sel.info}` : ''}{sel.burst ? ' · ✷ something here must change' : ''}
            {compare?.get(sel.id) && (compare.get(sel.id)?.cycleSec ?? 0) !== (sel.cycleSec ?? 0) ? ` · today ${dur(compare.get(sel.id)?.cycleSec ?? 0)}` : ''}
            {onOpen && <> <button type="button" className="linkish" onClick={() => onOpen(sel)}>Change this step</button></>}
          </>
        ) : <span className="sub">Tap a square to see the step{onOpen ? ' and change it' : ''}.</span>}
      </div>
      <p className="vs-key sub">
        <span className="vs-key-i is-adds">VA</span> adds value <span className="vs-key-i is-needed">NE</span> necessary — not value, but needed <span className="vs-key-i is-waste">NV</span> non-value adding — waste
        {' · '}{(Object.keys(KIND) as FlowKind[]).map(k => <span key={k} className="vs-key-k">{KIND[k].mark} {KIND[k].word.toLowerCase()}</span>)}
        {' · '}lead time = work + what waits after each step
      </p>
    </div>
  );
}

const waitTotal = (steps: FlowStep[], a?: AgreedMap) => steps.reduce((t, st) => t + (waitOf(st, a).sec ?? 0), 0);
