/* THE PLAN AS A GANTT CHART — see lib/gantt.ts for why and how it is laid out.
 *
 * The calendar runs across the top: months, then every day (or every week on a
 * long job), weekends shaded, today a line. Each row is one thing on the job,
 * grouped by gate; its bar starts and ends on the days it means. The left column
 * stays put while the calendar scrolls, so the "what" is never lost off the
 * edge, and the chart opens scrolled to today. Tapping a row opens its record.
 */
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { gantt, ganttHref, type GanttScale } from '../lib/gantt';
import type { PlanMark } from '../lib/standing';
import { nav } from '../state/useRoute';

const PX: Record<GanttScale, number> = { day: 34, week: 11 };
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TONE_WORD: Record<PlanMark['tone'], string> = {
  done: 'done', failed: 'ran, didn’t pass', ran: 'ran — nobody has said how it went',
  booked: 'still ahead', late: 'the day has gone', none: 'no date agreed',
};

export function Gantt({ marks, today, expectedAt, plannedAt, projectId }: {
  marks: PlanMark[]; today: string; expectedAt?: string; plannedAt?: string; projectId: string;
}) {
  const g = useMemo(() => gantt(marks, { today, expectedAt, plannedAt }), [marks, today, expectedAt, plannedAt]);
  /* On a phone a day column leaves room for six days; weeks show the month. */
  const [scale, setScale] = useState<GanttScale>(() => {
    try { if (window.matchMedia('(max-width: 640px)').matches) return 'week'; } catch { /* no window */ }
    return g.scale;
  });
  const ref = useRef<HTMLDivElement>(null);
  /* A day is never narrower than the scale wants, and the calendar always fills
     the card — a short job in weeks was a strip down the left with white beside it. */
  const [room, setRoom] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const lab = parseFloat(getComputedStyle(el).getPropertyValue('--gt-lab')) || 0;
      setRoom(Math.max(0, el.clientWidth - lab - 2));
    };
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : undefined;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const px = Math.max(PX[scale], room / g.days);
  const W = g.days * px;
  const T = W + 96;   // the track runs on past the last day, for a label hanging off the end

  /* Open on today — a few days of what has gone, then what is ahead. */
  const toToday = () => {
    const el = ref.current;
    if (el && g.today != null) el.scrollLeft = Math.max(0, (g.today - (scale === 'day' ? 3 : 10)) * px);
  };
  useLayoutEffect(toToday, [scale, g.today]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (href?: string) => { if (href) nav(href); };

  return (
    <div className="gt">
      <div className="gt-top">
        <span className="gt-seg" role="group" aria-label="Scale">
          <button type="button" className={scale === 'day' ? 'on' : ''} onClick={() => setScale('day')}>Days</button>
          <button type="button" className={scale === 'week' ? 'on' : ''} onClick={() => setScale('week')}>Weeks</button>
        </span>
        {g.today != null && <button type="button" className="gt-today-b" onClick={toToday}>Go to today</button>}
      </div>

      <div className="gt-scroll" ref={ref}>
        <div className="gt-inner" style={{ width: `calc(var(--gt-lab) + ${T}px)` }}>
          <div className="gt-head">
            <div className="gt-corner">What</div>
            <div className="gt-cal" style={{ width: T }}>
              <div className="gt-months">
                {g.months.map(m => <span key={m.label + m.start} style={{ left: m.start * px, width: m.span * px }}>{m.span * px >= 30 ? m.label : ''}</span>)}
              </div>
              {scale === 'day' ? (
                <div className="gt-days">
                  {g.dayList.map(d => (
                    <span key={d.iso} className={(d.weekend ? 'is-we' : '') + (d.at === g.today ? ' is-today' : '')} style={{ left: d.at * px, width: px }}>
                      <b>{d.day}</b><i>{DOW[d.dow]}</i>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="gt-days is-weeks">
                  {g.weeks.map(w => <span key={w.start} style={{ left: w.start * px, width: w.span * px }}><b>{w.label}</b></span>)}
                </div>
              )}
            </div>
          </div>

          <div className="gt-body">
            <div className="gt-under" style={{ width: W }} aria-hidden>
              {scale === 'day'
                ? g.dayList.filter(d => d.weekend).map(d => <span key={d.iso} className="gt-we" style={{ left: d.at * px, width: px }} />)
                : g.weeks.map(w => <span key={w.start} className="gt-wk" style={{ left: w.start * px }} />)}
              {g.months.slice(1).map(m => <span key={m.label + m.start} className="gt-mo" style={{ left: m.start * px }} />)}
              {g.agreed && <span className="gt-hand is-agreed" style={{ left: (g.agreed.at + 0.5) * px }}><b>Agreed {g.agreed.when}</b></span>}
              {g.expected && <span className="gt-hand" style={{ left: (g.expected.at + 0.5) * px }}><b>Handover {g.expected.when}</b></span>}
              {g.today != null && <span className="gt-today" style={{ left: (g.today + 0.5) * px }} />}
            </div>

            {g.groups.map(gr => (
              <div key={gr.kind} className="gt-group">
                <div className="gt-row gt-grow">
                  <div className="gt-lab gt-glab">{gr.label}<span className="gt-n">{gr.rows.length}</span></div>
                  <div className="gt-track" style={{ width: T }} />
                </div>
                {gr.rows.map((r, i) => {
                  const href = ganttHref(projectId, r);
                  const w = Math.max(r.span * px - 4, 10);
                  const inside = w >= r.when.length * 6.4 + 16;
                  const tip = `${r.label} · ${r.when} · ${TONE_WORD[r.tone]}`;
                  return (
                    <div key={`${r.id ?? r.label}-${i}`} className="gt-row">
                      <button type="button" className="gt-lab" title={tip} disabled={!href} onClick={() => open(href)}>
                        {/* "Wrapper — Dry run" reads as the step, with its machine under
                            it: cut short on a phone, every row began "Checkweigher —…". */}
                        {r.label.includes(' — ')
                          ? <><b>{r.label.slice(r.label.indexOf(' — ') + 3)}</b><small>{r.label.slice(0, r.label.indexOf(' — '))}</small></>
                          : <b>{r.label}</b>}
                      </button>
                      <div className="gt-track" style={{ width: T }}>
                        <button type="button" className={'gt-b is-' + r.tone} title={tip} aria-label={tip}
                          style={{ left: r.start * px + 2, width: w, padding: inside ? undefined : 0 } as CSSProperties} onClick={() => open(href)}>
                          {inside && r.when}
                        </button>
                        {!inside && <span className="gt-when" style={{ left: r.start * px + 2 + w + 6 }}>{r.when}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="gt-key sub">
        <span><i className="gt-k is-done" />done</span>
        <span><i className="gt-k is-failed" />ran, didn’t pass</span>
        <span><i className="gt-k is-ran" />ran, not yet called</span>
        <span><i className="gt-k is-late" />the day has gone</span>
        <span><i className="gt-k is-booked" />still ahead</span>
        <span><i className="gt-k-line" />today</span>
        {g.expected && <span><i className="gt-k-line is-hand" />handover</span>}
        <span className="gt-key-say">Tap a row to open it.</span>
      </p>
    </div>
  );
}
