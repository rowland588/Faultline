/* THE VALUE STREAM AS A SWIMLANE GRID (docs/TOOLKIT.md, tool 2).
 *
 * Rowland, 11 October: "see the VSM like a grid — a swimlane grid. We can see
 * a journey of what, who and the value", a picture of one, and then: "there
 * is no drawing ... I do not want a Visio sort of diagram here ... You can see
 * the sequence of events due to the way the format presents itself in a grid
 * style format. And we can see the values just from the colours, and then I
 * click the colour and it opens up all the information of what's actually
 * happened in there."
 *
 * So NOTHING IS DRAWN: no arrows, no process symbols, no icons. The grid is
 * the picture —
 *   CLASSIFICATION   VA · NE · NV, a coloured square per step with its letters
 *   SEQUENCE         1, 2, 3 … — the columns ARE the journey's order
 *   WHO DOES IT      a lane per department, role or team, in the order the
 *                    journey reaches it; the step's square, coloured by its
 *                    value, in its lane
 *   CYCLE · WAIT ·   each step's work, what it waits after, the lead time so
 *   LEAD TIME        far; the totals at the end
 * Tap any square of a step — its value, its number, its lane — and everything
 * about that step opens (StepFacts).
 *
 * THE COLOURS are the method's own, Rowland's choice (11 October): VA green,
 * NE amber, NV red — the one place in the app those hues mean value, not
 * state (CLAUDE.md, visual management), and always with the letters beside
 * them, so a black-and-white print and colour-blind eyes still read them.
 *
 * Fixed-size squares; on a phone the grid scrolls sideways inside its box,
 * the lanes pinned; the page never does. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { dur, lanesOf, lanesOfStep, markable, share, tapValue, valueOf, valuesFor, waitOf, whereOf, whoOf, type ClassCounts, type FlowFigures, type LaneBy } from './steps';
import type { AgreedMap, FlowKind, FlowStep, FlowValue } from '../../lib/study';

export const KIND_WORD: Record<FlowKind, string> = { operation: 'Operation', move: 'Move', check: 'Check', wait: 'Wait', store: 'Store' };
export const VALUE_WORD: Record<FlowValue, string> = { adds: 'adds value', needed: 'necessary', waste: 'non-value adding' };
export const VALUE_CODE: Record<FlowValue, string> = { adds: 'VA', needed: 'NE', waste: 'NV' };

const COL_W = 34, TOTAL_W = 96;

/** A time in a square: as short as it can be and still be read. */
const tiny = (sec: number): string => (sec < 60 ? `${+sec.toFixed(1)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : sec < 86_400 ? `${+(sec / 3600).toFixed(1)}h` : `${+(sec / 86_400).toFixed(1)}d`);

export function ValueStreamGrid({ flow, f, a, wasteOnly, by, branched, onOpen, playSignal }: {
  flow: FlowStep[]; f: FlowFigures; a?: AgreedMap; wasteOnly?: boolean;
  /** Raised each time More ▾ says Play the journey: the order moves through, step by step. */
  playSignal?: number;
  /** Steps a fix or a countermeasure was raised from — the branch off the
   *  step: a mark on its squares, said in words for a screen reader. */
  branched?: Map<string, unknown>;
  /** Which dimension the lanes are: who does each step, or where it is done.
   *  A step done by two people sits in both their lanes, in its column. */
  by: LaneBy;
  /** A step's square tapped: everything about it opens. */
  onOpen: (st: FlowStep, n: number, leadSoFar: number) => void;
}) {
  const steps = [...flow].sort((x, y) => x.order - y.order);
  const lanes = lanesOf(steps, by, a);
  const inLane = (st: FlowStep, lane: string) => lanesOfStep(st, by, a).includes(lane);
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
  useEffect(() => { if (!playSignal) return; setAt(-1); setPlaying(true); }, [playSignal]);
  const lit = (i: number) => at === null || i <= at;

  /* The running lead time, step by step: work plus what waits after. */
  let run = 0;
  const acc = steps.map(st => (run += (st.cycleSec ?? 0) + (waitOf(st, a).sec ?? 0)));
  const waits = steps.reduce((t, st) => t + (waitOf(st, a).sec ?? 0), 0);
  const cycles = steps.reduce((t, st) => t + (st.cycleSec ?? 0), 0);
  /* the columns' widths are the stylesheet's (--vs-col, --vs-tot): wider on a
     phone, so a square is big enough for a thumb on the floor */
  const cols: CSSProperties = { gridTemplateColumns: `var(--vs-area) repeat(${steps.length}, var(--vs-col, ${COL_W}px)) var(--vs-tot, ${TOTAL_W}px)` };

  /** A step's square: its colour is its value; tapping it opens the step. ONE row of them is the
   *  step's control — the letter chips (Classification), which are its state and the way in, one
   *  button a step; the rest of the grid is the picture and takes the same tap without being a
   *  second button (Rowland, 30 October: "too complex, many different buttons"). */
  const square = (st: FlowStep, i: number, body: React.ReactNode, cls: string, control = false) => {
    const v = valueOf(st);
    const props = {
      className: cls + ' is-' + (v ?? 'unmarked') + (lit(i) ? '' : ' is-dim') + (branched?.has(st.id) ? ' has-fix' : ''),
      'aria-label': `Step ${i + 1} — ${lanesOfStep(st, by, a).join(', ')}: ${st.name || 'a step'} (${v ? VALUE_WORD[v] : 'not classified yet'})${branched?.has(st.id) ? ' — being made better' : ''}`,
      title: `${i + 1} · ${st.name || 'a step'}${branched?.has(st.id) ? ' — being made better' : ''}`,
      onClick: () => onOpen(st, i + 1, acc[i] ?? 0),
    };
    return control
      ? <button key={st.id} type="button" {...props}>{body}</button>
      : <div key={st.id} {...props} data-open aria-hidden="true">{body}</div>;
  };

  return (
    <div className={'vs' + (wasteOnly ? ' is-waste-only' : '')}>
      {at !== null && steps.length > 1 && (
        <div className="vs-play">
          <button type="button" className="btn" onClick={() => { if (!playing && at >= steps.length - 1) setAt(-1); setPlaying(p => !p); }}>
            {playing ? 'Pause' : at < steps.length - 1 ? 'Carry on' : 'Play again'}
          </button>
          <button type="button" className="btn" onClick={() => { setPlaying(false); setAt(null); }}>Stop playing</button>
          <label className="vs-speed">Speed <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="How fast it plays" /></label>
          {at >= 0 && <span className="vs-at sub">Step {at + 1} of {steps.length} — lead time so far <b>{dur(acc[at] ?? 0)}</b></span>}
        </div>
      )}
      <div className="vs-scroll tool-sig-vsm" role="region" aria-label="The value stream — the journey across, who does it down the side" tabIndex={0}>
        <div className="vs-grid" style={cols}>
          <div className="vs-h">Classification</div>
          {steps.map((st, i) => { const v = valueOf(st); return square(st, i, v ? VALUE_CODE[v] : '?', 'vs-sq vs-cls', true); })}
          <div className="vs-tot"><b className="vs-pce">{share(f.pce ?? 0)} VA</b></div>

          <div className="vs-h">Sequence</div>
          {steps.map((st, i) => square(st, i, i + 1, 'vs-sq vs-seq'))}
          <div className="vs-tot vs-tot-h">Total</div>

          <div className="vs-h vs-areas-h">{by === 'who' ? 'Who does it' : 'Where'}</div>
          {steps.map(st => <div key={st.id} className="vs-gap" />)}
          <div />
          {lanes.map(lane => (
            <div key={lane} style={{ display: 'contents' }}>
              <div className="vs-lane"><span>{lane}</span></div>
              {steps.map((st, i) => (inLane(st, lane)
                ? square(st, i, null, 'vs-sq vs-step')
                : <div key={st.id} className={'vs-sq vs-empty' + (lit(i) ? '' : ' is-dim')} aria-hidden />))}
              <div />
            </div>
          ))}

          <div className="vs-h vs-times-h">Cycle time</div>
          {steps.map((st, i) => <div key={st.id} className={'vs-sq vs-t vs-c' + (lit(i) ? '' : ' is-dim')}>{st.cycleSec ? tiny(st.cycleSec) : ''}</div>)}
          <div className="vs-tot"><b>{dur(cycles)}</b></div>
          <div className="vs-h">Wait</div>
          {steps.map((st, i) => { const w = waitOf(st, a).sec; return <div key={st.id} className={'vs-sq vs-t vs-w' + (w ? ' is-on' : '') + (lit(i) ? '' : ' is-dim')}>{w ? tiny(w) : ''}</div>; })}
          <div className="vs-tot"><b>{dur(waits)}</b></div>
          <div className="vs-h">Lead time so far</div>
          {steps.map((st, i) => <div key={st.id} className={'vs-sq vs-t vs-l' + (lit(i) ? '' : ' is-dim')}>{tiny(acc[i] ?? 0)}</div>)}
          <div className="vs-tot vs-tot-lead"><b>{f.untimed && at === null ? '≥ ' : ''}{dur(at === null ? f.leadSec : acc[at] ?? 0)}</b></div>
        </div>
      </div>
      <p className="vs-key sub">
        <span className="vs-key-i is-adds">VA</span> adds value
        <span className="vs-key-i is-needed">NE</span> necessary — not value, but needed
        <span className="vs-key-i is-waste">NV</span> (non-value adding, NVA) — waste
        <span className="vs-key-i is-unmarked">?</span> not classified yet
        <span>· Tap a step for everything about it, and to say VA · NE · NV · lead time = work + what waits after each step</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------ CLASSIFY A STEP IN ONE TAP
 * Rowland, 30 October: "it doesn't allow me to quickly reference the activity
 * as VNA, VA, etc ... we must have tools that are ready and functional". A
 * step's value — VA · NE · NV — was set only in the step's sheet. Here it is
 * three buttons on the step itself: one tap sets it, a second tap on the lit
 * one clears it. What a kind may be is steps.valuesFor, the same function the
 * sheet uses; a wait or a store is NV by definition and wears the letters with
 * no buttons. The method's hues, always with the letters (CLAUDE.md, visual
 * management); no new colour. */
const VALUE_ORDER: FlowValue[] = ['adds', 'needed', 'waste'];
const VALUE_HINT: Record<FlowValue, string> = { adds: 'VA — adds value', needed: 'NE — necessary, not value adding but needed', waste: 'NV — non-value adding (NVA), waste' };

export function ValueButtons({ st, n, onSet, big, walk }: {
  st: FlowStep; n: number;
  /** The value the step has after the tap (undefined = cleared), and the button tapped. */
  onSet: (next: FlowValue | undefined, tapped: FlowValue) => void;
  /** The classify walk's: each button with its words under the letters. */
  big?: boolean;
  /** The stopwatch's: each button ENDS the step being timed with that value and
   *  starts the next — an action, not a setting (nothing lit); `off` until the clock runs. */
  walk?: { off: boolean };
}) {
  const v = valueOf(st);
  if (!markable(st)) {
    return <span className="vs-fixed" role="img" aria-label={`Step ${n}: ${KIND_WORD[st.kind].toLowerCase()} — NV, non-value adding by definition`}><span className="vs-key-i is-waste">NV</span><small>{KIND_WORD[st.kind].toLowerCase()} — NV by definition</small></span>;
  }
  const allowed = valuesFor(st.kind);
  return (
    <span className={'vs-seg' + (big ? ' is-big' : '') + (walk ? ' is-walk' : '')} role={walk ? 'group' : 'radiogroup'} aria-label={walk ? 'What this step is — one tap ends it and starts the next' : `Value of step ${n}: ${st.name || 'a step'}`}>
      {VALUE_ORDER.map(x => {
        const can = allowed.includes(x);
        const off = !can || !!walk?.off;
        return (
          <button key={x} type="button" {...(walk ? {} : { role: 'radio', 'aria-checked': v === x })} disabled={off} data-value={x}
            className={'vs-seg-b is-' + x + (v === x && !walk ? ' on' : '')}
            title={can ? VALUE_HINT[x] : `${VALUE_HINT[x]} — only an operation adds value`} aria-label={walk ? `${VALUE_CODE[x]} — done, next` : VALUE_HINT[x]}
            onClick={() => onSet(tapValue(st, x), x)}>
            <b>{VALUE_CODE[x]}</b>{big && <small>{VALUE_WORD[x]}</small>}
          </button>
        );
      })}
    </span>
  );
}

/** What the step's panel needs to walk the map: where it is, and the moves. */
export interface StepWalk {
  at: number; total: number;
  /** Steps nobody has classified yet. */
  left: number;
  /** Where the walk ends: how many VA · NE · NV, the share, the lead time — said once none is left. */
  summary: string;
  onBack?: () => void; onNext?: () => void; onJump?: () => void;
}

/** EVERYTHING ABOUT ONE STEP — what opens when a step is tapped: where it is in
 *  the journey, its value in three big buttons (one tap says it and goes on to the
 *  next step nobody has classified — that is the whole walk, with Back, Next and
 *  Next unclassified), then what happens, who does it, what kind of step, its
 *  times, the lead time by here, the people, how its job arrives, and whether it
 *  must change. Rowland, 30 October: "too complex, many different buttons ...
 *  simplify" — so one panel, not a row of buttons on every step plus a walk. */
export function StepFacts({ st, n, leadSoFar, a, was, onValue, walk }: { st: FlowStep; n: number; leadSoFar: number; a?: AgreedMap; was?: FlowStep;
  /** Given to someone who may change the work: the value after the tap, and the button tapped. */
  onValue?: (v: FlowValue | undefined, tapped: FlowValue) => void;
  walk?: StepWalk }) {
  const v = valueOf(st);
  const w = waitOf(st, a);
  const rows: [string, string][] = [
    ['Who does it', whoOf(st, a).join(', ') || 'Not said'],
    ['Where', whereOf(st, a) ?? 'Not said'],
    ['What kind of step', KIND_WORD[st.kind]],
    ['The work', st.cycleSec ? `${dur(st.cycleSec)} each time${st.batch && st.batch > 1 ? ` — for ${st.batch} pieces, ${dur(st.cycleSec / st.batch)} a piece` : ''}` : 'no time yet'],
    ['Waits after', w.sec !== undefined ? `${dur(w.sec)}${w.from === 'queue' ? ` — ${st.queue} waiting, at ${a?.demandPerDay} a day` : ''}` : '—'],
    ['Lead time by here', dur(leadSoFar)],
    ...(st.people ? [['People', String(st.people)] as [string, string]] : []),
    ...(st.info ? [['Its job arrives by', st.info] as [string, string]] : []),
    ['How it is known', st.source === 'timed' ? 'timed on the walk' : st.source === 'carried' ? 'carried from the map before — not walked again yet' : 'typed'],
  ];
  if (was && ((was.cycleSec ?? 0) !== (st.cycleSec ?? 0) || (waitOf(was, a).sec ?? 0) !== (w.sec ?? 0))) {
    rows.push(['Today', `work ${was.cycleSec ? dur(was.cycleSec) : '—'} · waits ${waitOf(was, a).sec !== undefined ? dur(waitOf(was, a).sec ?? 0) : '—'}`]);
  }
  return (
    <div className="vs-facts">
      {walk && <p className="vs-cw-count" aria-live="polite">Step {walk.at + 1} of {walk.total} — {walk.left ? `${walk.left} still to classify` : 'all classified'}</p>}
      <p className="vs-facts-h" aria-label={`Step ${n}`}><span className={'vs-key-i is-' + (v ?? 'unmarked')}>{v ? VALUE_CODE[v] : '?'}</span> {v ? VALUE_WORD[v] : 'not classified yet'}</p>
      <h3>{st.name || 'A step'}</h3>
      {onValue && (markable(st)
        ? <ValueButtons st={st} n={n} big onSet={onValue} />
        : <p className="vs-cw-fixed"><span className="vs-key-i is-waste">NV</span> A {KIND_WORD[st.kind].toLowerCase()} is non-value adding (NVA) by definition — nothing to choose.</p>)}
      {onValue && markable(st) && <p className="sub vs-cw-help">VA adds value · NE necessary, not value adding but needed · NV (non-value adding, NVA) waste.{st.kind !== 'operation' ? ' Only an operation adds value.' : ''}<span className="vs-cw-keys"> Keys: V · E · N, ← →</span></p>}
      {walk && (
        <div className="vs-cw-nav">
          <button type="button" className="btn" onClick={walk.onBack} disabled={!walk.onBack}>‹ Back</button>
          <button type="button" className="btn" onClick={walk.onNext} disabled={!walk.onNext}>Next ›</button>
          {walk.onJump && <button type="button" className="btn btn-primary" onClick={walk.onJump}>Next unclassified ›</button>}
        </div>
      )}
      {walk && walk.left === 0 && <p className="vs-cw-sum" aria-label="What the map says now">{walk.summary}</p>}
      <dl className="vs-facts-l">{rows.map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{x}</dd></div>)}</dl>
      {st.burst && <p className="vs-facts-must"><b>Something here must change.</b></p>}
    </div>
  );
}

/* WALK IT (docs/TOOLKIT.md, tool 2) — the journey walked with a phone in the
 * hand: Start as the first step begins; Next step as each one ends, its time
 * the timestamps between taps; name it and say who does it as you go (or
 * after). The steps land in the grid as you walk, timed; a wait of days is
 * typed when you are back at a desk.
 *
 * WHAT EACH STEP IS (Rowland, 30 October: "I had a stop watch but no ability to
 * classify the activity, need 3 quick buttons next to the stop watch"): VA · NE
 * · NV under the clock. A letter ends the step being timed WITH its value and
 * starts the next — one tap; "Next step — not classified" is the quiet way on.
 * The kind a walked step has is the chip chosen (an operation unless a move or a
 * check is picked), and steps.valuesFor decides which letters it may take — the
 * same rule as the step's sheet. Undo the last step takes back its time, its
 * words and its value. */
export function WalkIt({ people, places, again, tally, onStep, onUndo, onDone }: {
  people: string[]; places: string[];
  /** Walking it again (a fix being proved): the steps carried from before,
   *  in their order — each Next times the one up next, its words filled in. */
  again?: FlowStep[];
  /** How the map's steps stand — VA · NE · NV so far (steps.classCounts). */
  tally: ClassCounts;
  /** A step ended: what was done, who did it, where, how long it took, what it
   *  is (VA · NE · NV — when the person said) — and, walking it again, which
   *  carried step it was. */
  onStep: (s: { name: string; who: string; where: string; kind: FlowKind; cycleSec: number; value?: FlowValue; again?: string }) => void;
  /** The last step ended is taken back — its time, its words and its value. */
  onUndo: () => void;
  onDone: () => void;
}) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [who, setWho] = useState('');
  const [where, setWhere] = useState('');
  const [kind, setKind] = useState<FlowKind>('operation');
  const [n, setN] = useState(0);
  /* the carried steps this walk has already timed — the next one is up */
  const [walked, setWalked] = useState<string[]>([]);
  /* what each step ended was, so Undo can put the form back as it was */
  const [ended, setEnded] = useState<{ again?: string; name: string; who: string; where: string; kind: FlowKind }[]>([]);
  const up = again?.find(x => !walked.includes(x.id));
  useEffect(() => {
    if (!up) return;
    setName(up.name); setWho(up.who?.[0] ?? up.lane ?? ''); setWhere(up.where ?? ''); setKind(up.kind);
  }, [up?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick(x => x + 1), 200); return () => window.clearInterval(t); }, []);
  const split = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  /* Ending a step: its time is the time between taps; a letter says what it is. */
  const close = (value?: FlowValue) => {
    if (!startedAt) return;
    const step = { name: name.trim() || `Step ${n + 1}`, who: who.trim(), where: where.trim(), kind };
    /* the same rule as the step's sheet: a move or a check is never VA */
    const v = value && valuesFor(kind).includes(value) ? value : undefined;
    onStep({ ...step, cycleSec: +((Date.now() - startedAt) / 1000).toFixed(1), ...(v ? { value: v } : {}), ...(up ? { again: up.id } : {}) });
    setEnded(e => [...e, { name, who, where, kind, ...(up ? { again: up.id } : {}) }]);
    if (up) setWalked(w => [...w, up.id]);
    setN(x => x + 1); setName(''); setKind('operation');
  };
  const undo = () => {
    const last = ended[ended.length - 1];
    if (!last) return;
    onUndo();
    setEnded(e => e.slice(0, -1)); setN(x => Math.max(0, x - 1));
    if (last.again) setWalked(w => w.filter(x => x !== last.again));
    else { setName(last.name); setWho(last.who); setWhere(last.where); setKind(last.kind); }
    if (startedAt) setStartedAt(Date.now());
  };
  /* opened from the page's primary, it comes into view — on a phone it would be below the fold */
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }, []);
  const tallyWords = `${tally.adds} VA · ${tally.needed} NE · ${tally.waste} NV so far`;
  return (
    <div className="wb-timer vs-walk" aria-label="Walking the journey" ref={box}>
      <div className="wb-t-h"><b>{again?.length ? 'Walk it again' : 'Walk it'}</b><span className="sub">{n} step{n === 1 ? '' : 's'} walked{up ? ` · up next: ${up.name.trim() || 'a step'}` : again?.length ? ' · every carried step walked — any more are added' : ''}</span></div>
      <output className="wb-split" aria-live="off">{startedAt ? dur(split) : '0.0 s'}</output>
      {!startedAt && <button type="button" className="wb-lap" onClick={() => setStartedAt(Date.now())}>Start — as the first step begins</button>}
      {/* WHAT THE STEP IS, beside the clock (Rowland, 30 October: "I had a stop watch but no ability to classify the
          activity, need 3 quick buttons next to the stop watch"): a letter ends the step being timed with its
          value and starts the next — one tap each */}
      <ValueButtons st={{ id: 'walk', order: 0, name, lane: '', kind }} n={n + 1} big walk={{ off: !startedAt }} onSet={(_next, tapped) => close(tapped)} />
      <p className="vs-walk-tally sub" aria-live="polite"><b>{tallyWords}</b>{tally.unclassified ? ` · ${tally.unclassified} not classified` : ''}</p>
      {startedAt && <button type="button" className="btn vs-walk-skip" onClick={() => close()}>Next step — not classified</button>}
      <label className="field"><span className="field-label">This step — what happens</span>
        <input className="text-input" value={name} placeholder={`Step ${n + 1} — e.g. Order keyed into the system`} onChange={e => setName(e.target.value)} /></label>
      <div className="vs-step-times">
        <label className="field"><span className="field-label">Who does it</span>
          <input className="text-input" value={who} list="vs-walk-who" placeholder="e.g. Op 1, the machine" onChange={e => setWho(e.target.value)} />
          <datalist id="vs-walk-who">{people.map(l => <option key={l} value={l} />)}</datalist></label>
        <label className="field"><span className="field-label">Where</span>
          <input className="text-input" value={where} list="vs-walk-where" placeholder="e.g. Bagger, Despatch" onChange={e => setWhere(e.target.value)} />
          <datalist id="vs-walk-where">{places.map(l => <option key={l} value={l} />)}</datalist></label>
      </div>
      <span className="chip-row" role="radiogroup" aria-label="What kind of step">
        {(Object.keys(KIND_WORD) as FlowKind[]).filter(k => k !== 'wait' && k !== 'store').map(k => <button key={k} type="button" role="radio" aria-checked={kind === k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{KIND_WORD[k]}</button>)}
      </span>
      <div className="wb-t-acts">
        {startedAt && <button type="button" className="btn" onClick={() => { close(); setStartedAt(null); onDone(); }}>Last step — finish</button>}
        {ended.length > 0 && <button type="button" className="btn" onClick={undo}>Undo the last step</button>}
        <button type="button" className="btn" onClick={onDone}>{startedAt ? 'Stop — keep what is walked' : 'Back'}</button>
      </div>
      <p className="sub">Tap what the step is — <b>VA</b>, <b>NE</b> or <b>NV</b> (non-value adding, NVA) — as it ends: one tap saves it with its time and starts the next. <b>Next step — not classified</b> if you cannot judge it yet; classify it later on the map. On the last one, tap its letter then Stop, or Last step — finish to leave it unclassified. Only an operation can be VA. Type the waits — an order sits for days — when you are back at a desk; a wait is NV already.</p>
    </div>
  );
}
