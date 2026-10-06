/* THE PLAN AS A GANTT CHART — see lib/gantt.ts for why and how it is laid out.
 *
 * The calendar runs across the top: months, then every day (or every week on a
 * long job), weekends shaded, today a line. Each row is one thing on the job,
 * grouped by machine (a band each, its header saying where it stands) or by
 * gate; its bar starts and ends on the days it means. The left column
 * stays put while the calendar scrolls, so the "what" is never lost off the
 * edge, and the chart opens scrolled to today. Tapping a row opens its record.
 */
import { Fragment, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { gantt, ganttBy, ganttHref, keepGanttBy, withMachines, type GanttBy, type GanttMachine, type GanttRow, type GanttScale } from '../lib/gantt';
import { windowWords, whenWords as niceDayShort } from '../lib/plan';
import { HANDOVER_KEY } from '../lib/story';
import type { PlanMark } from '../lib/standing';
import type { Asset, Test, TestItem } from '../lib/testing';
import type { Program } from '../lib/programs';
import { StagePanel } from './StagePanel';
import { openRecord } from './RecordDrawer';
import { WalkPanel } from './WalkPanel';
import { walkMarkers, type WalkSnag } from '../lib/walkSnags';
import { niceDay } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { useSyncStatus } from '../cloud/session';
import { asOfWords } from '../lib/asOf';
import { Icon } from './Icon';

const PX: Record<GanttScale, number> = { day: 34, week: 11 };
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/* A ROW THAT IS A RECORD — a step, a test, a fix — opens in the drawer
   (ui/RecordDrawer), like every other door onto it. */
const RECORD = new Set<PlanMark['kind']>(['install', 'setup', 'handover', 'test', 'fix']);
const BANDS_KEY = 'faultline.gantt.bands';
const BAND_TONE: Record<PlanMark['tone'], string> = {
  done: 'done', failed: 'a problem', ran: 'waiting on a verdict', booked: 'under way or ahead', late: 'late or a problem', none: 'not started',
};
const TONE_WORD: Record<PlanMark['tone'], string> = {
  done: 'done', failed: 'ran, didn’t pass', ran: 'ran — nobody has said how it went',
  booked: 'still ahead', late: 'the day has gone', none: 'no date agreed',
};

export function Gantt({ marks, today, expectedAt, plannedAt, projectId, name, tests, items, walk, assets, programs, dayHours }: {
  marks: PlanMark[]; today: string; expectedAt?: string; plannedAt?: string; projectId: string;
  /** The job's records — for what happened to each stage (lib/story). */
  tests?: Test[]; items?: TestItem[];
  /** Its machines and programs — for the plan drawn machine by machine. */
  assets?: Asset[]; programs?: readonly Program[];
  /** What the filmed walk found — drawn as one lane (lib/walkSnags). */
  walk?: WalkSnag[];
  /** The job's name, for the printed copy. */
  name: string;
  /** The job's working day, for hours lost on paper (lib/hoursLost). */
  dayHours?: number;
}) {
  const g = useMemo(() => gantt(marks, { today, expectedAt, plannedAt }, tests && items ? { tests, items, ...(walk ? { walk } : {}) } : undefined), [marks, today, expectedAt, plannedAt, tests, items, walk]);
  /* The walk's panel: the snags behind one marker, or all of them. */
  const [walkOpen, setWalkOpen] = useState<{ title: string; ids: string[] } | null>(null);
  /* The panel a row opens when it is not a record: the story of one of the
     other dates — the handover, a machine, a material, a program. */
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
  /* BY MACHINE OR BY STAGE. Rowland: "we have different machines but all
     muddled together on the Gantt — difficult to see machine status." By
     machine is each machine's band, saying where it stands (lib/gantt
     withMachines); by stage is the gates, as the plan always was. The choice
     is this device's, and the PDF follows it. A job with no machines has
     nothing to band by, and keeps the gates. */
  const [by, setByRaw] = useState<GanttBy>(ganttBy);
  const setBy = (b: GanttBy) => { setByRaw(b); keepGanttBy(b); };
  const gm = useMemo(() => (assets && tests && items ? withMachines(g, { assets, tests, items, programs, today }) : g),
    [g, assets, tests, items, programs, today]);
  const canBand = !!gm.machines?.some(b => b.id);
  const bands = by === 'machine' && canBand ? gm.machines ?? null : null;
  /* A band folded or open, remembered on this device; a machine never touched
     is open on a desk and folded on a phone — its header still says where it
     stands, so the folded list IS the glance. */
  const [bandOpen, setBandOpen] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(BANDS_KEY) ?? '{}') as Record<string, boolean>; } catch { return {}; }
  });
  const bandIsOpen = (k: string) => bandOpen[k] ?? !phone;
  const toggleBand = (k: string) => setBandOpen(o => {
    const next = { ...o, [k]: !(o[k] ?? !phone) };
    try { localStorage.setItem(BANDS_KEY, JSON.stringify(next)); } catch { /* lasts the visit */ }
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
    /* Fitted, the whole job is already on the screen — nothing to scroll to,
       and scrolling cut the first days off ("4 Sep" for "14 Sep"). */
    if (el && fit) { el.scrollLeft = 0; return; }
    if (el && g.today != null) el.scrollLeft = Math.max(0, (g.today - (scale === 'day' ? 3 : 10)) * px);
  };
  useLayoutEffect(toToday, [scale, g.today]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (href?: string) => { if (href) nav(href); };

  /* ON PAPER. Rowland: "print the Gantt charts as well, and PDF." The whole job
     fitted across a landscape A4 — no scrolling on paper — drawn by the same
     code the client report uses for its plan page. */
  const [busy, setBusy] = useState(false);
  /* Whether what is on the screen is current — the one thing to know before
     the laptop is turned round for somebody (lib/asOf). */
  const sync = useSyncStatus();
  const asOf = asOfWords(sync.lastSyncedAt, sync.state !== 'signedout');

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
      /* The paper is drawn the way the screen is: by machine, or by stage. */
      drawGanttDoc(doc, bands ? gm : g, {
        moves: tests && items ? moveLines(g.groups.flatMap(x => x.rows), tests, items, dayHours && dayHours > 0 ? dayHours : undefined) : [],
        name, printed: niceDay(today, { year: true }),
        asOf: asOf?.words,
        dates: when ? `Handover ${moved ? 'expected ' : ''}${niceDay(when, { year: true })}${moved ? ` · agreed ${niceDay(plannedAt, { year: true })}` : ''}` : undefined,
      });
      await deliverPdf(doc, pdfFileName(name, 'plan', today));
    } catch (e) {
      console.error('plan PDF failed', e);
      window.alert('Sorry — the plan could not be made into a PDF. Please try again.');
    } finally { setBusy(false); }
  };

  /* THE WALK'S LANE — one row, wherever the problems sit in the order: after
     the gates, before the fixes they lead to. */
  const walkAt = (() => { const i = g.groups.findIndex(x => x.kind === 'fix' || x.kind === 'action'); return i < 0 ? g.groups.length : i; })();
  const walkLane = g.walk && g.walk.days.length > 0 && (() => {
    const lane = g.walk;
    const ms = walkMarkers(lane, px);
    const all = walk ?? [];
    const markerWords = (m: { start: number; span: number }) => {
      const d0 = g.dayList[m.start]?.iso, d1 = g.dayList[Math.min(g.days - 1, m.start + m.span - 1)]?.iso;
      return m.span === 1 ? niceDay(d0, { weekday: 'short' }) : `${niceDay(d0)} – ${niceDay(d1)}`;
    };
    return (
      <div className="gt-group is-open gt-walkgroup">
        <div className={'gt-row gt-walk-row' + (lane.late ? ' has-late' : '')}>
          <button type="button" className="gt-lab gt-walklab" onClick={() => setWalkOpen({ title: 'Found on the walk', ids: all.map(s => s.id) })}
            title={`Found on the walk · ${lane.words} — tap for the list`}>
            <b>Found on the walk</b><small className={lane.late ? 'is-late' : lane.open ? 'is-open' : 'is-done'}>{lane.words}</small>
          </button>
          <div className="gt-track" style={{ width: T }}>
            {ms.map(m => {
              const tone = m.late ? 'late' : m.open ? 'open' : 'done';
              const say = `${markerWords(m)}: ${m.ids.length} found${m.open ? `, ${m.open} still open` : ', all closed'}${m.late ? `, ${m.late} past due` : ''} — tap to see them`;
              return (
                <button key={m.start} type="button" className={'gt-walk is-' + tone} title={say} aria-label={say}
                  style={{ left: (m.start + m.span / 2) * px }}
                  onClick={() => setWalkOpen({ title: `Found on the walk · ${markerWords(m)}`, ids: m.ids })}>
                  {m.open > 0 ? m.open : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  })();

  /* ONE ROW AND ITS FIXES — the same drawing in either layout. */
  const rowOf = (r: GanttRow, i: number, machine?: string) => {
    const href = ganttHref(projectId, r);
    /* Inside a machine's band the row says only the step; its panel and its
       tip still say which machine. */
    const named = machine && r.kind !== 'machine' ? `${machine} — ${r.label}` : r.label;
    /* A record opens in the drawer, over the plan; one of the other dates
       with a story opens its panel; anything else goes where it is kept. */
    const go = () => (r.id && RECORD.has(r.kind) ? openRecord(projectId, r.id)
      : r.key && (r.slip || r.marks) ? setStage(r.key, named, href) : open(href));
    const w = Math.max(r.span * px - 4, 10);
    const inside = w >= r.when.length * 6.4 + 16;
    const tip = r.kind === 'note'
      ? `Reminder: ${r.label} · ${r.when}${r.tone === 'done' ? ' · talked about' : r.tone === 'late' ? ' · the day has gone' : ''}`
      : `${named} · ${r.when} · ${TONE_WORD[r.tone]}${r.slip ? ` · +${r.slip.days} day${r.slip.days === 1 ? '' : 's'} on the plan` : ''}`;
    const afterBar = r.start * px + 2 + w + 6 + (r.slip ? 0 : 0);
    return (
      <Fragment key={`${r.id ?? r.label}-${i}`}>
        <div className={'gt-row' + (r.slip || r.marks ? ' has-story' : '') + (r.overlap ? ' has-overlap' : '')}>
          <button type="button" className={'gt-lab' + (r.kind === 'note' ? ' is-note' : '')} title={tip} disabled={!href && !r.id} onClick={go}>
            {/* "Wrapper — Dry run" reads as the step, with its machine under
                it: cut short on a phone, every row began "Checkweigher —…".
                Only the machine is split off: "Weight accuracy — 400g" read
                as a step called "400g" on a machine called "Weight accuracy". */}
            {r.on && r.label.startsWith(`${r.on} — `)
              ? <><b>{r.label.slice(r.on.length + 3)}</b><small>{r.on}{r.slip ? <em className="gt-lab-slip"> · +{r.slip.days}d</em> : null}{r.overlap ? <em className="gt-lab-over"> · overlaps {r.overlap}</em> : null}</small></>
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
              <button type="button" className="gt-lab gt-fixlab" onClick={() => openRecord(projectId, f.id as string)}
                title={`Fix: ${f.label} · ${f.when}`}>
                <b>↳ Fix: {f.label}</b><small>{f.open ? 'no date agreed yet' : f.when}</small>
              </button>
              <div className="gt-track" style={{ width: T }}>
                {f.open
                  ? <button type="button" className="gt-b gt-open" style={{ left: f.start * px + 2, width: Math.max(4 * px, 60) }}
                    onClick={() => openRecord(projectId, f.id as string)}>no date agreed</button>
                  : <button type="button" className={'gt-b gt-fixb is-' + f.tone} style={{ left: f.start * px + 2, width: fw }}
                    onClick={() => openRecord(projectId, f.id as string)} title={`Fix: ${f.label} · ${f.when}`} />}
                {!f.open && <span className="gt-when" style={{ left: f.start * px + 2 + fw + 6 }}>{f.when}</span>}
              </div>
            </div>
          );
        })}
      </Fragment>
    );
  };

  /* ONE MACHINE'S BAND — its header says where it stands, in the colours and
     the words of the "Where each machine is" strip; tapping the header goes
     where that strip's tile for the gate it is at goes. Its rows follow, gate
     by gate, each gate named where it starts. The chevron folds the band. */
  const bandOf = (b: GanttMachine) => {
    const k = b.id ?? 'job';
    const isOpenB = bandIsOpen(k);
    const go = () => (b.path ? nav(`/project/${projectId}/${b.path}`) : toggleBand(k));
    const tip = `${b.name} · ${b.says}${b.bar ? ` · ${b.bar.when}` : ''} — ${b.path ? 'tap to open it' : isOpenB ? 'tap to fold it' : 'tap to open it'}`;
    const bw = b.bar ? Math.max(b.bar.span * px - 4, 10) : 0;
    return (
      <div key={k} className={'gt-group gt-mband' + (isOpenB ? ' is-open' : ' is-shut')}>
        <div className={'gt-row gt-mrow is-' + b.tone}>
          <div className="gt-lab gt-mlab">
            <button type="button" className="gt-mfold" onClick={() => toggleBand(k)} aria-expanded={isOpenB}
              aria-label={`${isOpenB ? 'Fold' : 'Open'} ${b.name}`} title={isOpenB ? 'Fold it' : 'Show its stages'}>
              <Icon name={isOpenB ? 'chevronDown' : 'chevron'} size="1.2em" />
            </button>
            <button type="button" className="gt-mgo" onClick={go} title={tip} aria-label={`${b.name}: ${b.says} (${BAND_TONE[b.tone]})`}>
              <b>{b.name}</b><small className={'is-' + b.tone}>{b.says}</small>
            </button>
          </div>
          <button type="button" className="gt-track gt-mtrack" style={{ width: T }} onClick={go} tabIndex={-1} aria-hidden title={tip}>
            {b.bar && (
              <span className={'gt-b gt-msum is-' + b.tone} style={{ left: b.bar.start * px + 2, width: bw }}>
                {bw >= b.bar.when.length * 6.2 + 14 ? b.bar.when : ''}
              </span>
            )}
            {b.bar && bw < b.bar.when.length * 6.2 + 14 && <span className="gt-when" style={{ left: b.bar.start * px + 2 + bw + 6 }}>{b.bar.when}</span>}
          </button>
        </div>
        {isOpenB && b.groups.map(gr => (
          <Fragment key={gr.kind}>
            <div className="gt-row gt-gaterow"><span className="gt-lab gt-gatelab">{gr.label}</span><div className="gt-track" style={{ width: T }} /></div>
            {gr.rows.map((r, i) => rowOf(r, i, b.id ? b.name : undefined))}
          </Fragment>
        ))}
        {isOpenB && b.walk && walkLane}
      </div>
    );
  };

  return (
    <div className={'gt' + (phone ? ' is-stacked' : '')}>
      <div className="gt-top">
        <span className="gt-segs">
        {canBand && (
          <span className="gt-seg" role="group" aria-label="Group the plan">
            <button type="button" className={by === 'machine' ? 'on' : ''} aria-pressed={by === 'machine'} onClick={() => setBy('machine')}>By machine</button>
            <button type="button" className={by === 'stage' ? 'on' : ''} aria-pressed={by === 'stage'} onClick={() => setBy('stage')}>By stage</button>
          </span>
        )}
        <span className="gt-seg" role="group" aria-label="Scale">
          <button type="button" className={fit ? 'on' : ''} onClick={() => setScale('fit')} title="The whole job on the screen">Fit</button>
          <button type="button" className={scale === 'day' ? 'on' : ''} onClick={() => setScale('day')}>Days</button>
          <button type="button" className={scale === 'week' ? 'on' : ''} onClick={() => setScale('week')}>Weeks</button>
        </span>
        </span>
        <span className="gt-acts">
          {asOf && <span className={'gt-asof' + (asOf.stale ? ' is-stale' : '')} role="status">{asOf.words}</span>}
          {/* Not when fitted: today is already on the screen, and the button did nothing. */}
          {g.today != null && !fit && <button type="button" className="gt-today-b" onClick={toToday}>Go to today</button>}
          <button type="button" className="gt-today-b" onClick={() => void print()} disabled={busy}>{busy ? 'Making it…' : 'PDF'}</button>
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
              {/* FITTED, the track ends at the last day, so a date near the end
                  hangs its words to the LEFT of its line — they ran off the
                  card ("Handover 3…") and made the fitted chart scroll. */}
              {g.agreed && <span className={'gt-hand is-agreed' + (fit && g.agreed.at > g.days * 0.6 ? ' is-left' : '')} style={{ left: (g.agreed.at + 0.5) * px }}><b>Agreed {g.agreed.when}</b></span>}
              {g.expected && <span className={'gt-hand' + (fit && g.expected.at > g.days * 0.6 ? ' is-left' : '')} style={{ left: (g.expected.at + 0.5) * px }}><b>Handover {g.expected.when}</b></span>}
              {g.today != null && <span className="gt-today" style={{ left: (g.today + 0.5) * px }} />}
            </div>

            {bands ? bands.map(bandOf) : (<>
              {g.groups.map((gr, gi) => (
                <Fragment key={gr.kind}>
                {gi === walkAt && walkLane}
                <div className={'gt-group' + (isOpen(gr.kind) ? ' is-open' : ' is-shut')}>
                  <div className="gt-row gt-grow">
                    <button type="button" className="gt-lab gt-glab" onClick={() => toggle(gr.kind)} aria-expanded={isOpen(gr.kind)}>
                      <span className="gt-fold" aria-hidden><Icon name={isOpen(gr.kind) ? 'chevronDown' : 'chevron'} size="1.2em" /></span>{gr.label}<span className="gt-n">{gr.rows.length}</span>
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
                  {isOpen(gr.kind) && gr.rows.map((r, i) => rowOf(r, i))}
                </div>
                </Fragment>
              ))}
              {walkAt === g.groups.length && walkLane}
            </>)}
          </div>
        </div>
      </div>

      {stage && tests && items && (
        <StagePanel thingKey={stage.key} title={stage.title} href={stage.href} projectId={projectId} onClose={() => setStageRaw(null)} />
      )}

      {walkOpen && (
        <WalkPanel title={walkOpen.title} today={today} projectId={projectId} onClose={() => setWalkOpen(null)}
          snags={(walk ?? []).filter(s => walkOpen.ids.includes(s.id))} />
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
        {walkLane && <span><i className="gt-k-walk">2</i>found on the walk — the number still open; solid, past due</span>}
        <span><i className="gt-k-line" />today</span>
        {g.expected && <span><i className="gt-k-line is-hand" />handover</span>}
        <span className="gt-key-say">Tap a row to open it.</span>
      </p>
    </div>
  );
}
