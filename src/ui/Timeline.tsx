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
 * ON THE PDF: the same marks go on the client report's own sheet — see
 * planSheet in lib/paceReportPdf.ts — off the same layoutPlan call. A person
 * types a date into a box and then watches what it becomes; the screen and the
 * page are the two halves of that, and they are built together.
 */
import { useMemo } from 'react';
import type { PlanMark } from '../lib/standing';
import { labelGap, layoutPlan, planAgenda, planSays, type PlacedMark } from '../lib/plan';

/** A label past this point would run off the right edge, so it is written back
 *  towards the middle instead. The alternative is clipping the one mark a
 *  client most wants to read: the last one. */
const FLIP_AT = 0.72;

/** Wide enough that a two-month axis has room for labels; below it the agenda
 *  is shown instead. Matches the breakpoint the rest of the app turns on. */
const PCT = (n: number) => `${(n * 100).toFixed(3)}%`;

function Mark({ m }: { m: PlacedMark }) {
  const flip = m.at > FLIP_AT;
  /* A machine occupies time — arriving and running are different days — and
     everything else happens on one. */
  const until = m.until != null && m.until > m.at ? m.until : undefined;

  return (
    <span
      className={'tl-m is-' + m.tone + (flip ? ' is-flip' : '') + (until ? ' is-bar' : '')}
      style={until != null
        ? { left: PCT(m.at), width: PCT(until - m.at) }
        : { left: PCT(m.at) }}
    >
      <span className="tl-dot" aria-hidden />
      <span className="tl-lab">
        <span className="tl-lab-t">{m.label}</span>
        <span className="tl-lab-d">{m.when}</span>
      </span>
    </span>
  );
}

export function Timeline({ marks, today, expectedAt, plannedAt }: {
  marks: PlanMark[];
  today: string;
  expectedAt?: string;
  plannedAt?: string;
}) {
  /* minGap is the width of a label as a fraction of the axis. It belongs to
     whoever is drawing — the A3 sheet passes its own, and gets fewer lines. */
  const plan = useMemo(
    () => layoutPlan(marks, {
      today, expectedAt, plannedAt,
      /* The widest this ever draws is a ~1100px card less the 78px lane
         column; labels are 11.5px semibold with a date beside them, so ~6.2px
         a character plus 58px. Estimated rather than measured, and estimated
         generously: too roomy costs a line, too tight overlaps, and only one
         of those cannot be read. */
      widthOf: m => labelGap(m.label, 6.2, 58, 1020),
    }),
    [marks, today, expectedAt, plannedAt],
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

  return (
    <section className="tl">
      <div className="tl-head">
        <h3 className="tl-h">The plan</h3>
        <span className="sub">{says}</span>
      </div>

      {/* ------------------------------ across ----------------------------- */}
      <div className="tl-wide">
        <div className="tl-months">
          {axis.ticks.map(t => (
            <span key={t.label} className="tl-month" style={{ left: PCT(t.at) }}>{t.label}</span>
          ))}
        </div>

        <div className="tl-body">
          {/* the month gridlines, behind everything */}
          {axis.ticks.map(t => (
            <span key={t.label} className="tl-grid" style={{ left: PCT(t.at) }} aria-hidden />
          ))}
          {slip && (
            <span className="tl-slip" aria-hidden
              style={{ left: PCT(slip.from), width: PCT(slip.to - slip.from) }} />
          )}
          {axis.today != null && <span className="tl-today" style={{ left: PCT(axis.today) }} aria-hidden />}
          {axis.agreed && <span className="tl-when is-agreed" style={{ left: PCT(axis.agreed.at) }} aria-hidden />}
          {axis.expected && <span className="tl-when is-rate" style={{ left: PCT(axis.expected.at) }} aria-hidden />}

          {plan.lanes.map(lane => (
            <div key={lane.kind} className="tl-lane">
              <span className="tl-lane-l">{lane.label}</span>
              <div className="tl-rows">
                {lane.rows.map((row, i) => (
                  <div key={i} className="tl-row">
                    {row.map((m, j) => <Mark key={`${m.label}-${j}`} m={m} />)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="tl-feet">
          {axis.today != null && <span className="tl-foot is-today" style={{ left: PCT(axis.today) }}>Today</span>}
          {axis.agreed && (
            <span className="tl-foot is-agreed" style={{ left: PCT(axis.agreed.at) }}>
              {axis.agreed.label} · {axis.agreed.when}
            </span>
          )}
          {axis.expected && (
            <span className="tl-foot is-rate" style={{ left: PCT(axis.expected.at) }}>
              {axis.expected.label} · {axis.expected.when}
            </span>
          )}
        </div>

        <p className="tl-key sub">
          <span className="tl-k is-done" /> done
          <span className="tl-k is-failed" /> ran, didn’t pass
          <span className="tl-k is-late" /> the day has gone
          <span className="tl-k is-booked" /> still ahead
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
                  <span className="tl-ag-what">{it.label}</span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}
