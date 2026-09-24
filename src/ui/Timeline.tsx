/* THE PLAN — what is dated, on one axis, above the table of what is not done.
 *
 * The verdict card says where the job is in one sentence. The outstanding table
 * says what is waiting and whose it is. Neither says WHEN, and "27 days to go"
 * is a number a client has to take on trust until they can see the 27 days with
 * the work laid along them.
 *
 * Everything drawn here already existed as a date on a record. See lib/plan.ts
 * for the arithmetic and for why this is not literally a Gantt chart; the short
 * of it is that a Gantt wants dependencies nobody has declared, and this wants
 * only the days that are already written down.
 *
 * TWO DRAWINGS, ONE SET OF MARKS. Across the page where there is width for it;
 * read downwards on a phone, because four bands of labelled dots at 390 points
 * is a smear. Both are in the DOM and CSS chooses, so there is no resize
 * listener to get wrong and no flash of the wrong one on the way in.
 *
 * THE WORDS ARE MEASURED, NOT GUESSED. The packer in lib/plan.ts needs to know
 * how much of the axis each label takes. This used to be a per-character
 * estimate against a fixed 1020px track, which was wrong twice over: the track
 * is 604px on a tablet, and "P-104" and "Test pieces — ferrous 1.5mm,
 * non-ferrous 2.0mm, stainless 2.5mm" are not the same width per character.
 * So the words are measured with the font they are drawn in, against the
 * track as it actually is, and re-laid when either changes. A label that
 * still cannot fit on either side of its mark is trimmed with an ellipsis and
 * carries the whole of itself as a tooltip — it never leaves its lane.
 *
 * ON THE PDF: the same marks go on the client report's own sheet — see
 * planSheet in lib/paceReportPdf.ts — off the same layoutPlan call, and the
 * sheet measures and trims its words the same way with jsPDF's own ruler. A
 * person types a date into a box and then watches what it becomes; the screen
 * and the page are the two halves of that, and they are built together.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PlanMark } from '../lib/standing';
import { labelGap, layoutPlan, planAgenda, planSays, whenWords, type PlacedMark, type PlanLane } from '../lib/plan';

/** The lane-name column. Must match `.tl-lane { grid-template-columns }`. */
const LANE_W = 78;
/** px from the mark to the words (.tl-lab margin + padding), the padding at
 *  the far end, and the space between the words and their date. Kept in step
 *  with the .tl-lab rules in styles.css. */
const LAB_GAP = 4, LAB_PAD = 5, DATE_GAP = 6;
/** How close the two date pills under the axis can be before the agreed one
 *  drops to a second line rather than sitting on top of "At rate". */
const PILL_APART = 150;

const PCT = (n: number) => `${(n * 100).toFixed(3)}%`;

/* ------------------------------ the ruler ------------------------------- */

let ctx: CanvasRenderingContext2D | null | undefined;
const widths = new Map<string, number>();

/** Text width in px, in a given CSS font, the way the browser will draw it.
 *  Cached per string and font; a dashboard re-lays on every resize and the
 *  labels do not change between one and the next. */
function textWidth(text: string, font: string): number | undefined {
  if (ctx === undefined) {
    try { ctx = document.createElement('canvas').getContext('2d'); } catch { ctx = null; }
  }
  if (!ctx || !font) return undefined;
  const key = font + '\u0000' + text;
  const hit = widths.get(key);
  if (hit != null) return hit;
  ctx.font = font;
  const w = ctx.measureText(text).width;
  widths.set(key, w);
  return w;
}

/** The `font` shorthand the canvas wants, read off an element as it is styled. */
function fontOf(el: Element | null): string {
  if (!el) return '';
  const cs = getComputedStyle(el);
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

interface Track {
  /** px across the axis; 0 while the across drawing is not being shown. */
  px: number;
  /** the fonts the words and the dates are drawn in */
  fontT: string;
  fontD: string;
}

/* -------------------------------- a mark -------------------------------- */

function Mark({ m, track }: { m: PlacedMark; track: Track }) {
  const left = m.side === 'left';
  /* A machine occupies time — arriving and running are different days — and
     everything else happens on one. */
  const until = m.until != null && m.until > m.at ? m.until : undefined;

  /* Trim only when the words genuinely cannot fit on the side they were given.
     The whole label then rides on the tooltip. Without a track (the agenda is
     showing, or there is no canvas) nothing is trimmed, and nothing needs to be. */
  let maxWidth: number | undefined;
  let clipped = false;
  if (track.px > 0) {
    const tW = textWidth(m.label, track.fontT), dW = textWidth(m.when, track.fontD);
    if (tW != null && dW != null) {
      const need = tW + DATE_GAP + dW + 2 * LAB_PAD;
      const room = (m.room ?? 1) * track.px - LAB_GAP;
      if (need > room + 0.5) { clipped = true; maxWidth = Math.max(48, Math.floor(room)); }
    }
  }

  return (
    <span
      className={'tl-m is-' + m.tone + (left ? ' is-left' : '') + (until ? ' is-bar' : '')}
      style={until != null ? { left: PCT(m.at), width: PCT(until - m.at) } : { left: PCT(m.at) }}
    >
      <span className="tl-dot" aria-hidden />
      <span
        className={'tl-lab' + (clipped ? ' is-cut' : '')}
        style={maxWidth != null ? { maxWidth } : undefined}
        title={clipped ? `${m.label} · ${m.when}` : undefined}
      >
        <span className="tl-lab-t">{m.label}</span>
        <span className="tl-lab-d">{m.when}</span>
      </span>
    </span>
  );
}

/** "4 of 17 done" — the lane's own count, off its own marks. */
function laneTally(lane: PlanLane): string {
  const all = lane.rows.reduce((n, r) => n + r.length, 0);
  const done = lane.rows.reduce((n, r) => n + r.filter(m => m.tone === 'done').length, 0);
  return all === 1 ? (done ? 'done' : '1') : `${done} of ${all} done`;
}

/* ------------------------------ the drawing ----------------------------- */

export function Timeline({ marks, today, expectedAt, plannedAt }: {
  marks: PlanMark[];
  today: string;
  expectedAt?: string;
  plannedAt?: string;
}) {
  const wideRef = useRef<HTMLDivElement>(null);
  const probeT = useRef<HTMLSpanElement>(null);
  const probeD = useRef<HTMLSpanElement>(null);
  const [track, setTrack] = useState<Track>({ px: 0, fontT: '', fontD: '' });

  /* The track is measured, not assumed: before first paint, whenever the card
     changes width, and once more when the web font lands (a fallback font
     measures differently, and the first layout can happen before the real one
     is in). When the across drawing is hidden, its width is 0 and the agenda
     is what is showing, so nothing here is drawn from a stale number. */
  useLayoutEffect(() => {
    const el = wideRef.current;
    if (!el) return;
    const read = () => {
      const px = Math.max(0, el.clientWidth - LANE_W);
      const fontT = fontOf(probeT.current), fontD = fontOf(probeD.current);
      setTrack(t => (t.px === px && t.fontT === fontT && t.fontD === fontD ? t : { px, fontT, fontD }));
    };
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : undefined;
    ro?.observe(el);
    if (!ro) window.addEventListener('resize', read);
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    let live = true;
    fonts?.ready.then(() => { if (live) { widths.clear(); read(); } }).catch(() => undefined);
    return () => {
      live = false;
      ro?.disconnect();
      if (!ro) window.removeEventListener('resize', read);
    };
  }, []);

  const plan = useMemo(
    () => layoutPlan(marks, {
      today, expectedAt, plannedAt,
      widthOf: m => {
        if (track.px > 0) {
          const tW = textWidth(m.label, track.fontT), dW = textWidth(whenWords(m.at), track.fontD);
          if (tW != null && dW != null) return (LAB_GAP + tW + DATE_GAP + dW + 2 * LAB_PAD + 2) / track.px;
        }
        /* Not measured yet, or nowhere to measure: the old estimate, which
           errs roomy. It only ever decides a layout nobody is looking at. */
        return labelGap(m.label, 6.2, 58, 1020);
      },
    }),
    [marks, today, expectedAt, plannedAt, track],
  );
  const agenda = useMemo(() => planAgenda(marks), [marks]);
  const says = useMemo(() => planSays(marks, today), [marks, today]);

  /* A project where nothing carries a date has no plan to draw, and an axis
     with an empty middle reads as a fault rather than as an absence. */
  if (plan.empty) return null;

  const { axis } = plan;
  /* The ground between the day it was agreed and the day it is now expected.
     The verdict card counts those days; this is what they look like. */
  const slip = axis.agreed && axis.expected
    ? { from: Math.min(axis.agreed.at, axis.expected.at), to: Math.max(axis.agreed.at, axis.expected.at) }
    : undefined;
  /* Two pills on nearby days would sit on top of each other; the agreed one
     drops a line. Measured against the track, so it happens only when it must. */
  const pillsClash = !!(axis.agreed && axis.expected && track.px > 0
    && Math.abs(axis.agreed.at - axis.expected.at) * track.px < PILL_APART);
  /* A pill is centred on its day, except at the ends, where centring would
     push half of it off the track. */
  const pillAt = (at: number) => (at < 0.08 ? ' at-start' : at > 0.92 ? ' at-end' : '');

  return (
    <section className="tl">
      <div className="tl-head">
        <h3 className="tl-h">The plan</h3>
        <span className="sub">{says}</span>
      </div>

      {/* ------------------------------ across ----------------------------- */}
      <div className="tl-wide" ref={wideRef}>
        {/* the ruler's reference: the words and the date, styled but unseen */}
        <span className="tl-probe" aria-hidden>
          <span className="tl-lab-t" ref={probeT}>x</span>
          <span className="tl-lab-d" ref={probeD}>x</span>
        </span>

        <div className="tl-months">
          {axis.ticks.map(t => (
            <span key={t.label} className="tl-month" style={{ left: PCT(t.at) }}>{t.label}</span>
          ))}
        </div>

        <div className="tl-body">
          {/* Everything that runs the full height — month rules, the slip,
              today and the two dates — sits in one overlay exactly the width
              of the track, so a fraction of the axis lands where the marks'
              fractions do. */}
          <div className="tl-under" aria-hidden>
            {axis.ticks.map(t => <span key={t.label} className="tl-grid" style={{ left: PCT(t.at) }} />)}
            {slip && <span className="tl-slip" style={{ left: PCT(slip.from), width: PCT(slip.to - slip.from) }} />}
            {axis.agreed && <span className="tl-when is-agreed" style={{ left: PCT(axis.agreed.at) }} />}
            {axis.expected && <span className="tl-when is-rate" style={{ left: PCT(axis.expected.at) }} />}
            {axis.today != null && <span className="tl-today" style={{ left: PCT(axis.today) }} />}
          </div>

          {plan.lanes.map(lane => (
            <div key={lane.kind} className="tl-lane">
              <span className="tl-lane-l">
                {lane.label}
                <span className="tl-lane-n">{laneTally(lane)}</span>
              </span>
              <div className="tl-rows">
                {lane.rows.map((row, i) => (
                  <div key={i} className="tl-row">
                    {row.map((m, j) => <Mark key={`${m.label}-${j}`} m={m} track={track} />)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={'tl-feet' + (pillsClash ? ' is-two' : '')}>
          {axis.today != null && (
            <span className={'tl-foot is-today' + pillAt(axis.today)} style={{ left: PCT(axis.today) }}>Today</span>
          )}
          {axis.agreed && (
            <span className={'tl-foot is-agreed' + pillAt(axis.agreed.at) + (pillsClash ? ' is-below' : '')}
              style={{ left: PCT(axis.agreed.at) }}>
              {axis.agreed.label} · {axis.agreed.when}
            </span>
          )}
          {axis.expected && (
            <span className={'tl-foot is-rate' + pillAt(axis.expected.at)} style={{ left: PCT(axis.expected.at) }}>
              {axis.expected.label} · {axis.expected.when}
            </span>
          )}
        </div>

        {/* THE KEY — the one rule, then the three lines. Each entry is the
            thing itself, drawn small, beside its words. */}
        <p className="tl-key sub">
          <span className="tl-key-i"><span className="tl-k is-done" />done</span>
          <span className="tl-key-i"><span className="tl-k is-failed" />ran, didn’t pass</span>
          <span className="tl-key-i"><span className="tl-k is-late" />the day has gone</span>
          <span className="tl-key-i"><span className="tl-k is-booked" />still ahead</span>
          {axis.today != null && <span className="tl-key-i"><span className="tl-kl is-today" />today</span>}
          {axis.expected && <span className="tl-key-i"><span className="tl-kl is-rate" />at rate</span>}
          {axis.agreed && <span className="tl-key-i"><span className="tl-kl is-agreed" />agreed, before it moved</span>}
          <span className="tl-key-say">Filled means it happened.</span>
        </p>
      </div>

      {/* ------------------------------- down ------------------------------ */}
      <ol className="tl-agenda">
        {agenda.map(month => (
          <li key={month.label} className="tl-ag-month">
            <h4 className="tl-ag-h">{month.label}</h4>
            <ol className="tl-ag-list">
              {month.items.map((it, i) => (
                <li key={`${it.label}-${i}`} className={'tl-ag-item is-' + it.tone}>
                  <span className="tl-ag-when">{it.when}</span>
                  <span className="tl-ag-dot" aria-hidden />
                  <span className="tl-ag-what">
                    {it.label}
                    <span className="tl-ag-kind">{it.kind}</span>
                  </span>
                </li>
              ))}
            </ol>
          </li>
        ))}
        <li className="tl-ag-key sub">
          <span className="tl-key-i"><span className="tl-k is-done" />done</span>
          <span className="tl-key-i"><span className="tl-k is-failed" />ran, didn’t pass</span>
          <span className="tl-key-i"><span className="tl-k is-late" />the day has gone</span>
          <span className="tl-key-i"><span className="tl-k is-booked" />still ahead</span>
        </li>
      </ol>
    </section>
  );
}
