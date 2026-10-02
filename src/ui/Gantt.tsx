/* THE PLAN AS A GANTT CHART — see lib/gantt.ts for why and how it is laid out.
 *
 * The calendar runs across the top: months, then every day (or every week on a
 * long job), weekends shaded, today a line. Each row is one thing on the job,
 * grouped by gate; its bar starts and ends on the days it means. The left column
 * stays put while the calendar scrolls, so the "what" is never lost off the
 * edge, and the chart opens scrolled to today. Tapping a row opens its record.
 */
import { Fragment, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { gantt, ganttHref, type GanttScale } from '../lib/gantt';
import { windowWords, whenWords as niceDayShort } from '../lib/plan';
import { HANDOVER_KEY } from '../lib/story';
import type { PlanMark } from '../lib/standing';
import type { Test, TestItem } from '../lib/testing';
import { StagePanel } from './StagePanel';
import { nav } from '../state/useRoute';

const PX: Record<GanttScale, number> = { day: 34, week: 11 };
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STAGE = new Set<PlanMark['kind']>(['install', 'setup', 'handover', 'test']);
const TONE_WORD: Record<PlanMark['tone'], string> = {
  done: 'done', failed: 'ran, didn’t pass', ran: 'ran — nobody has said how it went',
  booked: 'still ahead', late: 'the day has gone', none: 'no date agreed',
};

export function Gantt({ marks, today, expectedAt, plannedAt, projectId, name, tests, items }: {
  marks: PlanMark[]; today: string; expectedAt?: string; plannedAt?: string; projectId: string;
  /** The job's records — for what happened to each stage (lib/story). */
  tests?: Test[]; items?: TestItem[];
  /** The job's name, for the printed copy. */
  name: string;
}) {
  const g = useMemo(() => gantt(marks, { today, expectedAt, plannedAt }, tests && items ? { tests, items } : undefined), [marks, today, expectedAt, plannedAt, tests, items]);
  /* The panel a row opens: a stage's story (with its buttons), or the story of
     one of the other dates — the handover, a machine, a material, a program. */
  const [stage, setStageRaw] = useState<{ key: string; title: string; href?: string } | null>(null);
  const setStage = (key: string, title?: string, href?: string) => {
    const row = g.groups.flatMap(x => x.rows).find(r => r.key === key || r.id === key);
    setStageRaw({ key, title: title ?? row?.label ?? 'This stage', ...(href ? { href } : {}) });
  };
  /* ON A PHONE: the whole job on the screen, each step's name above its bar,
     and each gate folded to one bar until it is tapped. Rowland: "the Gantt
     isn't visible on a phone — it's just a long list." A fixed name column
     left a strip of calendar a third of the screen wide, with most bars off
     to the side. */
  const phone = (() => { try { return window.matchMedia('(max-width: 640px)').matches; } catch { return false; } })();
  const [scale, setScale] = useState<GanttScale | 'fit'>(() => (phone ? 'fit' : g.scale));
  const [closed, setClosed] = useState<Set<string> | null>(null);
  const isOpen = (kind: string) => (closed ? !closed.has(kind) : !phone);
  const toggle = (kind: string) => setClosed(c => {
    const next = new Set(c ?? (phone ? g.groups.map(x => x.kind) : []));
    if (next.has(kind)) next.delete(kind); else next.add(kind);
    return next;
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
  const fit = scale === 'fit';
  const px = fit ? Math.max(1, room / g.days) : Math.max(PX[scale], room / g.days);
  const W = g.days * px;
  const T = fit ? W : W + 96;   // the track runs on past the last day, for a label hanging off the end

  /* Open on today — a few days of what has gone, then what is ahead. */
  const toToday = () => {
    const el = ref.current;
    if (el && g.today != null) el.scrollLeft = Math.max(0, (g.today - (scale === 'day' ? 3 : 10)) * px);
  };
  useLayoutEffect(toToday, [scale, g.today]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (href?: string) => { if (href) nav(href); };

  /* ON PAPER. Rowland: "print the Gantt charts as well, and PDF." The whole job
     fitted across a landscape A4 — no scrolling on paper — drawn by the same
     code the client report uses for its plan page. */
  const [busy, setBusy] = useState(false);
  const print = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { loadPdfLib, deliverPdf } = await import('../lib/savePdf');
      const { drawGanttDoc } = await import('../lib/ganttPdf');
      const { pdfFileName } = await import('../lib/fileName');
      const { niceDay } = await import('../lib/weeks');
      const { jsPDF } = await loadPdfLib();
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const moved = !!expectedAt && !!plannedAt && expectedAt !== plannedAt;
      const when = expectedAt ?? plannedAt;
      const { moveLines } = await import('../lib/story');
      drawGanttDoc(doc, g, {
        moves: tests && items ? moveLines(g.groups.flatMap(x => x.rows), tests, items) : [],
        name, printed: niceDay(today, { year: true }),
        dates: when ? `Handover ${moved ? 'expected ' : ''}${niceDay(when, { year: true })}${moved ? ` · agreed ${niceDay(plannedAt, { year: true })}` : ''}` : undefined,
      });
      await deliverPdf(doc, pdfFileName(name, 'plan', today));
    } catch (e) {
      console.error('plan PDF failed', e);
      window.alert('Sorry — the plan could not be made into a PDF. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className={'gt' + (phone ? ' is-stacked' : '')}>
      <div className="gt-top">
        <span className="gt-seg" role="group" aria-label="Scale">
          <button type="button" className={fit ? 'on' : ''} onClick={() => setScale('fit')} title="The whole job on the screen">Fit</button>
          <button type="button" className={scale === 'day' ? 'on' : ''} onClick={() => setScale('day')}>Days</button>
          <button type="button" className={scale === 'week' ? 'on' : ''} onClick={() => setScale('week')}>Weeks</button>
        </span>
        <span className="gt-acts">
          {g.today != null && <button type="button" className="gt-today-b" onClick={toToday}>Go to today</button>}
          <button type="button" className="gt-today-b" onClick={() => void print()} disabled={busy}>{busy ? 'Making it…' : 'Print / PDF'}</button>
        </span>
      </div>

      {/* THE HANDOVER MOVED — the slip a client asks about first, and why. */}
      {g.handoverMoves && g.handoverMoves.length > 0 && (() => {
        const last = g.handoverMoves[g.handoverMoves.length - 1];
        const total = g.handoverMoves.reduce((n, m) => n + m.days, 0);
        return (
          <button type="button" className="gt-hand-moved" onClick={() => setStage(HANDOVER_KEY, 'Handover', `/project/${projectId}/setup`)}>
            <b>Handover moved +{total} day{total === 1 ? '' : 's'}</b> · now {niceDayShort(last.to)} · {last.why}
            {g.handoverMoves.length > 1 ? ` · and ${g.handoverMoves.length - 1} earlier` : ''} <span aria-hidden>›</span>
          </button>
        );
      })()}

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
                  {g.weeks.map(w => <span key={w.start} style={{ left: w.start * px, width: w.span * px }}>{w.span * px >= 34 ? <b>{w.label}</b> : null}</span>)}
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
              <div key={gr.kind} className={'gt-group' + (isOpen(gr.kind) ? ' is-open' : ' is-shut')}>
                <div className="gt-row gt-grow">
                  <button type="button" className="gt-lab gt-glab" onClick={() => toggle(gr.kind)} aria-expanded={isOpen(gr.kind)}>
                    <span className="gt-fold" aria-hidden>{isOpen(gr.kind) ? '▾' : '▸'}</span>{gr.label}<span className="gt-n">{gr.rows.length}</span>
                  </button>
                  <div className="gt-track" style={{ width: T }}>
                    {/* FOLDED: the gate as one bar, first start to last finish. */}
                    {!isOpen(gr.kind) && (() => {
                      const s0 = Math.min(...gr.rows.map(r => r.start));
                      const e0 = Math.max(...gr.rows.map(r => Math.max(r.start + r.span, r.slip ? r.slip.start + r.slip.span : 0, ...(r.fixes ?? []).map(f => f.start + f.span))));
                      const late = gr.rows.filter(r => r.tone === 'late' || r.tone === 'failed' || r.slip).length;
                      const done = gr.rows.every(r => r.tone === 'done');
                      const from = gr.rows.map(r => r.from).sort()[0], to = gr.rows.map(r => r.to).sort().pop() as string;
                      const words = `${windowWords(from, to)}${late ? ` · ${late} late or moved` : ''}`;
                      const w = Math.max((e0 - s0) * px - 4, 10);
                      return (
                        <button type="button" className={'gt-b gt-sum is-' + (late ? 'late' : done ? 'done' : 'booked') + (gr.kind === 'note' ? ' is-note' : '')}
                          style={{ left: s0 * px + 2, width: w }} onClick={() => toggle(gr.kind)} title={`${gr.label} · ${words} — tap to open`}>
                          {w >= words.length * 6.2 + 14 ? words : ''}
                        </button>
                      );
                    })()}
                  </div>
                </div>
                {isOpen(gr.kind) && gr.rows.map((r, i) => {
                  const href = ganttHref(projectId, r);
                  /* A stage with a story opens it; anything else opens its record. */
                  const go = () => (r.key && (STAGE.has(r.kind) || r.slip || r.marks) ? setStage(r.key, r.label, href) : open(href));
                  const w = Math.max(r.span * px - 4, 10);
                  const inside = w >= r.when.length * 6.4 + 16;
                  const tip = r.kind === 'note'
                    ? `Reminder: ${r.label} · ${r.when}${r.tone === 'done' ? ' · talked about' : r.tone === 'late' ? ' · the day has gone' : ''}`
                    : `${r.label} · ${r.when} · ${TONE_WORD[r.tone]}${r.slip ? ` · +${r.slip.days} day${r.slip.days === 1 ? '' : 's'} on the plan` : ''}`;
                  const afterBar = r.start * px + 2 + w + 6 + (r.slip ? 0 : 0);
                  return (
                    <Fragment key={`${r.id ?? r.label}-${i}`}>
                      <div className={'gt-row' + (r.slip || r.marks ? ' has-story' : '') + (r.overlap ? ' has-overlap' : '')}>
                        <button type="button" className={'gt-lab' + (r.kind === 'note' ? ' is-note' : '')} title={tip} disabled={!href && !r.id} onClick={go}>
                          {/* "Wrapper — Dry run" reads as the step, with its machine under
                              it: cut short on a phone, every row began "Checkweigher —…". */}
                          {r.kind !== 'note' && r.label.includes(' — ')
                            ? <><b>{r.label.slice(r.label.indexOf(' — ') + 3)}</b><small>{r.label.slice(0, r.label.indexOf(' — '))}{r.slip ? <em className="gt-lab-slip"> · +{r.slip.days}d</em> : null}{r.overlap ? <em className="gt-lab-over"> · overlaps {r.overlap}</em> : null}</small></>
                            : <b>{r.label}{r.slip ? <em className="gt-lab-slip"> +{r.slip.days}d</em> : null}{r.overlap ? <em className="gt-lab-over"> · overlaps {r.overlap}</em> : null}</b>}
                        </button>
                        <div className="gt-track" style={{ width: T }}>
                          <button type="button" className={'gt-b is-' + r.tone + (r.kind === 'note' ? ' is-note' : '')} title={tip} aria-label={tip}
                            style={{ left: r.start * px + 2, width: w, padding: inside ? undefined : 0 } as CSSProperties} onClick={go}>
                            {inside && r.when}
                          </button>
                          {/* THE OVERRUN — past the finish first planned, hatched, with how far. */}
                          {r.slip && (
                            <button type="button" className="gt-slip" onClick={go} title={`+${r.slip.days} days past the finish first planned — tap for why`}
                              style={{ left: r.slip.start * px + 1, width: Math.max(r.slip.span * px - 2, 6) }}>
                              {r.slip.span * px >= 46 && <span>+{r.slip.days}d</span>}
                            </button>
                          )}
                          {!inside && <span className="gt-when" style={{ left: afterBar }}>{r.when}{r.slip && r.slip.span * px < 46 ? ` · +${r.slip.days}d` : ''}</span>}
                          {/* SOMETHING HAPPENED HERE — a move, a problem written up. */}
                          {r.marks?.map(m => (
                            <button key={m.iso} type="button" className="gt-mk" onClick={go} aria-label={`Something happened on ${m.iso} — tap for the story`}
                              style={{ left: (m.at + 0.5) * px }} />
                          ))}
                        </div>
                      </div>
                      {/* ITS FIXES, directly under it — dated, or open-ended "no date agreed". */}
                      {r.fixes?.map(f => {
                        const fw = Math.max(f.span * px - 4, 10);
                        return (
                          <div key={f.id} className="gt-row gt-fixrow">
                            <button type="button" className="gt-lab gt-fixlab" onClick={() => open(`/project/${projectId}/testing/${encodeURIComponent(f.id as string)}`)}
                              title={`Fix: ${f.label} · ${f.when}`}>
                              <b>↳ Fix: {f.label}</b><small>{f.open ? 'no date agreed yet' : f.when}</small>
                            </button>
                            <div className="gt-track" style={{ width: T }}>
                              {f.open
                                ? <button type="button" className="gt-b gt-open" style={{ left: f.start * px + 2, width: Math.max(4 * px, 60) }}
                                  onClick={() => open(`/project/${projectId}/testing/${encodeURIComponent(f.id as string)}`)}>no date agreed</button>
                                : <button type="button" className={'gt-b gt-fixb is-' + f.tone} style={{ left: f.start * px + 2, width: fw }}
                                  onClick={() => open(`/project/${projectId}/testing/${encodeURIComponent(f.id as string)}`)} title={`Fix: ${f.label} · ${f.when}`} />}
                              {!f.open && <span className="gt-when" style={{ left: f.start * px + 2 + fw + 6 }}>{f.when}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {stage && tests && items && (
        <StagePanel stepId={stage.key} title={stage.title} href={stage.href} tests={tests} items={items} projectId={projectId} onClose={() => setStageRaw(null)} />
      )}

      <p className="gt-key sub">
        <span><i className="gt-k is-done" />done</span>
        <span><i className="gt-k is-failed" />ran, didn’t pass</span>
        <span><i className="gt-k is-ran" />ran, not yet called</span>
        <span><i className="gt-k is-late" />the day has gone</span>
        <span><i className="gt-k is-booked" />still ahead</span>
        {g.groups.some(x => x.kind === 'note') && <span><i className="gt-k is-note" />a reminder from the notes</span>}
        {g.groups.some(x => x.rows.some(r => r.slip)) && <span><i className="gt-k gt-k-slip" />past the finish first planned</span>}
        {g.groups.some(x => x.rows.some(r => r.marks)) && <span><i className="gt-k-mk" />something happened — tap for why</span>}
        {g.groups.some(x => x.rows.some(r => r.overlap)) && <span><i className="gt-k gt-k-over" />starts before the step ahead has finished</span>}
        <span><i className="gt-k-line" />today</span>
        {g.expected && <span><i className="gt-k-line is-hand" />handover</span>}
        <span className="gt-key-say">Tap a row to open it.</span>
      </p>
    </div>
  );
}
