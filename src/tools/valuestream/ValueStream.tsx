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
import { dur, lanesOf, lanesOfStep, share, valueOf, waitOf, whereOf, whoOf, type FlowFigures, type LaneBy } from './steps';
import type { AgreedMap, FlowKind, FlowStep, FlowValue } from '../../lib/study';

export const KIND_WORD: Record<FlowKind, string> = { operation: 'Operation', move: 'Move', check: 'Check', wait: 'Wait', store: 'Store' };
export const VALUE_WORD: Record<FlowValue, string> = { adds: 'adds value', needed: 'necessary', waste: 'non-value adding' };
export const VALUE_CODE: Record<FlowValue, string> = { adds: 'VA', needed: 'NE', waste: 'NV' };

const COL_W = 34, TOTAL_W = 96;

/** A time in a square: as short as it can be and still be read. */
const tiny = (sec: number): string => (sec < 60 ? `${+sec.toFixed(1)}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : sec < 86_400 ? `${+(sec / 3600).toFixed(1)}h` : `${+(sec / 86_400).toFixed(1)}d`);

export function ValueStreamGrid({ flow, f, a, wasteOnly, by, branched, onOpen }: {
  flow: FlowStep[]; f: FlowFigures; a?: AgreedMap; wasteOnly?: boolean;
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
  const lit = (i: number) => at === null || i <= at;

  /* The running lead time, step by step: work plus what waits after. */
  let run = 0;
  const acc = steps.map(st => (run += (st.cycleSec ?? 0) + (waitOf(st, a).sec ?? 0)));
  const waits = steps.reduce((t, st) => t + (waitOf(st, a).sec ?? 0), 0);
  const cycles = steps.reduce((t, st) => t + (st.cycleSec ?? 0), 0);
  /* the columns' widths are the stylesheet's (--vs-col, --vs-tot): wider on a
     phone, so a square is big enough for a thumb on the floor */
  const cols: CSSProperties = { gridTemplateColumns: `var(--vs-area) repeat(${steps.length}, var(--vs-col, ${COL_W}px)) var(--vs-tot, ${TOTAL_W}px)` };

  /** A step's square: its colour is its value; tapping it opens the step. */
  const square = (st: FlowStep, i: number, body: React.ReactNode, cls: string) => {
    const v = valueOf(st);
    return (
      <button key={st.id} type="button" className={cls + ' is-' + (v ?? 'unmarked') + (lit(i) ? '' : ' is-dim') + (branched?.has(st.id) ? ' has-fix' : '')}
        aria-label={`Step ${i + 1} — ${lanesOfStep(st, by, a).join(', ')}: ${st.name || 'a step'} (${v ? VALUE_WORD[v] : 'not marked yet'})${branched?.has(st.id) ? ' — being made better' : ''}`} title={`${i + 1} · ${st.name || 'a step'}${branched?.has(st.id) ? ' — being made better' : ''}`}
        onClick={() => onOpen(st, i + 1, acc[i] ?? 0)}>{body}</button>
    );
  };

  return (
    <div className={'vs' + (wasteOnly ? ' is-waste-only' : '')}>
      {steps.length > 1 && (
        <div className="vs-play">
          <button type="button" className="btn" onClick={() => { if (!playing && (at === null || at >= steps.length - 1)) setAt(-1); setPlaying(p => !p); }}>
            {playing ? 'Pause' : at !== null && at < steps.length - 1 ? 'Carry on' : 'Play the journey'}
          </button>
          {at !== null && <button type="button" className="btn" onClick={() => { setPlaying(false); setAt(null); }}>Restart</button>}
          <label className="vs-speed">Speed <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="How fast it plays" /></label>
          {at !== null && at >= 0 && <span className="vs-at sub">Step {at + 1} of {steps.length} — lead time so far <b>{dur(acc[at] ?? 0)}</b></span>}
        </div>
      )}
      <div className="vs-scroll tool-sig-vsm" role="region" aria-label="The value stream — the journey across, who does it down the side" tabIndex={0}>
        <div className="vs-grid" style={cols}>
          <div className="vs-h">Classification</div>
          {steps.map((st, i) => { const v = valueOf(st); return square(st, i, v ? VALUE_CODE[v] : '?', 'vs-sq vs-cls'); })}
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
        <span className="vs-key-i is-waste">NV</span> non-value adding — waste
        <span className="vs-key-i is-unmarked">?</span> not marked yet
        <span>· Tap a square for everything about that step · lead time = work + what waits after each step</span>
      </p>
    </div>
  );
}

/** EVERYTHING ABOUT ONE STEP — what opens when its colour is tapped: what
 *  happens, who does it, its value, what kind of step, its times, the lead
 *  time by here, the people, how its job arrives, and whether it must change. */
export function StepFacts({ st, n, leadSoFar, a, was }: { st: FlowStep; n: number; leadSoFar: number; a?: AgreedMap; was?: FlowStep }) {
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
      <p className="vs-facts-h" aria-label={`Step ${n}`}><span className={'vs-key-i is-' + (v ?? 'unmarked')}>{v ? VALUE_CODE[v] : '?'}</span> {v ? VALUE_WORD[v] : 'not marked yet'}</p>
      <h3>{st.name || 'A step'}</h3>
      <dl className="vs-facts-l">{rows.map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{x}</dd></div>)}</dl>
      {st.burst && <p className="vs-facts-must"><b>Something here must change.</b></p>}
    </div>
  );
}

/* WALK IT (docs/TOOLKIT.md, tool 2) — the journey walked with a phone in the
 * hand: Start as the first step begins; Next step as each one ends, its time
 * the timestamps between taps; name it and say who does it as you go (or
 * after). The steps land in the grid as you walk, timed; a wait of days is
 * typed when you are back at a desk. */
export function WalkIt({ people, places, again, onStep, onDone }: {
  people: string[]; places: string[];
  /** Walking it again (a fix being proved): the steps carried from before,
   *  in their order — each Next times the one up next, its words filled in. */
  again?: FlowStep[];
  /** A step ended: what was done, who did it, where, how long it took — and,
   *  walking it again, which carried step it was. */
  onStep: (s: { name: string; who: string; where: string; kind: FlowKind; cycleSec: number; again?: string }) => void;
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
  const up = again?.find(x => !walked.includes(x.id));
  useEffect(() => {
    if (!up) return;
    setName(up.name); setWho(up.who?.[0] ?? up.lane ?? ''); setWhere(up.where ?? ''); setKind(up.kind);
  }, [up?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick(x => x + 1), 200); return () => window.clearInterval(t); }, []);
  const split = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const close = () => {
    if (!startedAt) return;
    onStep({ name: name.trim() || `Step ${n + 1}`, who: who.trim(), where: where.trim(), kind, cycleSec: +((Date.now() - startedAt) / 1000).toFixed(1), ...(up ? { again: up.id } : {}) });
    if (up) setWalked(w => [...w, up.id]);
    setN(x => x + 1); setName(''); setKind('operation');
  };
  return (
    <div className="wb-timer vs-walk" aria-label="Walking the journey">
      <div className="wb-t-h"><b>{again?.length ? 'Walk it again' : 'Walk it'}</b><span className="sub">{n} step{n === 1 ? '' : 's'} walked{up ? ` · up next: ${up.name.trim() || 'a step'}` : again?.length ? ' · every carried step walked — any more are added' : ''}</span></div>
      <output className="wb-split" aria-live="off">{startedAt ? dur(split) : '0.0 s'}</output>
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
      {!startedAt
        ? <button type="button" className="wb-lap" onClick={() => setStartedAt(Date.now())}>Start — as the first step begins</button>
        : <button type="button" className="wb-lap" onClick={() => { close(); setStartedAt(Date.now()); }}>Next step — this one is done</button>}
      <div className="wb-t-acts">
        {startedAt && <button type="button" className="btn" onClick={() => { close(); setStartedAt(null); onDone(); }}>Last step — finish</button>}
        <button type="button" className="btn" onClick={onDone}>{startedAt ? 'Stop — keep what is walked' : 'Back'}</button>
      </div>
      <p className="sub">Each tap ends the step on the screen and starts the next; its time is the time between taps. Mark what adds value, and type the waits — an order sits for days — when you are back at a desk.</p>
    </div>
  );
}
