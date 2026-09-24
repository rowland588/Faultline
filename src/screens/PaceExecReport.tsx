/* THE CLIENT REPORT — one download, sent to the client.
 *
 * Not the meeting A3 (that stays on the dashboard, worked through live). This is
 * a self-contained double-sided A3 the client reads on their own: a visual status,
 * the exec cut — summaries and the exceptions that need attention, never the
 * full 40-row tracker. It reads the same synced data every other view does, so
 * each week's download is simply the current state.
 *
 * Lean-A3 shape: split, boxed sections, each with a heading and a one-line "so
 * what". Two A3 landscape pages — page 1 the status at a glance, page 2 what
 * needs attention and what moved.
 *
 * The download is built here, not handed to the print dialog: each sheet is laid
 * out at exactly A3-landscape proportions, rendered to an image and dropped onto
 * an A3 page. What is on screen is what lands in the PDF. */
import { useEffect, useRef, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
import { Crumbs } from '../ui/Crumbs';
import { MeasureChart } from '../charts/MeasureChart';
import { usePaceLines } from '../lib/usePaceLines';
import { usePaceSnapshots } from '../lib/usePaceSnapshots';
import { useProject } from '../lib/useProjects';
import { actionsForLine, uncoveredAreas } from '../lib/paceLineMatch';
import { loadPdfLib, deliverPdf, isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import { TreeStatic, useTreeNodes } from './TreeStatic';
import { Sweep } from '../ui/Sweep';
import type { TreeNodeRow } from '../db';
import { listPaceTodos, listPaceWins, getPaceWorkspaceId, snagsForWorkspace,
  listTests, listAssets, listTestItems, type PaceTodoRow, type PaceWinRow } from '../db';
import { foundWords, hasRun, plannedEnd, type Asset, type Test, type TestItem } from '../lib/testing';
import { trialCard, headlineNext, verdictLine } from '../lib/trialCard';
import type { Snag } from '../snag/types';
import type { PaceAction } from '../lib/tracker';
import type { PaceReportData } from '../lib/paceReportPdf';
import { proofFromWin, proofSentence, verdictLabel } from '../lib/measureProof';
import { paretoView, moveSentence, PARETO_SHEET_ROWS, type ParetoView } from '../lib/paretoView';
import { useMeasures } from '../lib/useMeasures';
import { useMaterials } from '../lib/useMaterials';
import { coveredIn, daysLate, isHere, landsIn, todayISO } from '../lib/materials';
import { usePrograms } from '../lib/usePrograms';
import { standing, slipWords } from '../lib/standing';
import { layoutPlan, labelGap, planSays } from '../lib/plan';
import { daysOverdue, fillIn, stateOf, testedIn } from '../lib/programs';
import { lineSeries, say, vsTarget, type LineSeries } from '../lib/measures';
import type { PaceParetoSheet } from '../lib/paceWorkbook';
import { withTrackerRows, bindSources, statusOfAction } from '../lib/treeBind';
import { board as buildBoard, actionTitle, boardSheets, boardScale, runHeight,
  BOARD_ACT_H, BOARD_ACT_GAP, BOARD_AREA_GAP, BOARD_PX } from '../lib/pillars';

/* ---------- action status, computed once ---------- */
const norm = (s?: string) => (s ?? '').trim();
const isDone = (a: PaceAction) => /^done$/i.test(norm(a.status));
const dueMs = (a: PaceAction) => {
  if (!a.due) return null;
  const d = Date.parse(a.due);
  return Number.isNaN(d) ? null : d;
};
const isLate = (a: PaceAction, todayStart: number) =>
  !isDone(a) && (/overdue/i.test(a.flag ?? '') || (dueMs(a) != null && (dueMs(a) as number) < todayStart));

/** The tracker records actions against "Line 2 / 7 / 10 / All lines", not the
 *  2A/2B split the ppm uses — so actions are bucketed on the workbook's own
 *  vocabulary. 10 is checked before 2 so "Line 10" never falls into "Line 2". */
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
/* en-GB, not the viewer's locale. Every date the app writes elsewhere is
   British (see `nice` on the materials and programs screens), and this one was
   the machine's guess — so the same film read "25 Sept" on the screen and
   "Sep 25" on the report drawn from the very same row. Worse, a PDF carries
   whatever the machine that generated it happened to think, to a reader who
   had no say in it. */
const fmtShort = (s?: string) => {
  if (!s) return '—';
  const d = Date.parse(s);
  return Number.isNaN(d) ? s : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const dayMs = 86_400_000;
/** The exec cut: one line per row, not the full workbook essay. */
const clip = (s: string, n = 96) => (s.length > n ? s.slice(0, n).trimEnd() + '…' : s);

/* The sheet is laid out at a fixed size in the exact proportions of A3
 * landscape, so the captured image fills the PDF page edge to edge with no
 * letterboxing and nothing distorted. On screen the same sheet is scaled down
 * to fit the window, which makes the preview a true picture of the download. */
const SHEET_W = 1600;
const SHEET_H = 1131;

function Stat({ n, label, sub, tone }: { n: string; label: string; sub?: string; tone?: 'good' | 'warn' | 'bad' | 'flat' }) {
  return (
    <div className={'exec-stat is-' + (tone ?? 'flat')}>
      <span className="exec-stat-n">{n}</span>
      <span className="exec-stat-l">{label}</span>
      {sub && <span className="exec-stat-s">{sub}</span>}
    </div>
  );
}

function SectionHead({ n, title, sowhat }: { n: string; title: string; sowhat: string }) {
  return (
    <div className="exec-sec-head">
      <span className="exec-sec-n">{n}</span>
      <h2 className="exec-sec-title">{title}</h2>
      <span className="exec-sec-sowhat">{sowhat}</span>
    </div>
  );
}

/* The tree gets its own sheet. It is the only thing in the report that says
 * WHY any of the rest is being done, and it needs the width of an A3 to say it
 * — squeezed into a corner of the pace page it would be a decoration. */
function TreePage({ rows, title, scale, sheetH, n, of }: {
  rows: TreeNodeRow[] | null; title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  // No tree drawn yet: print nothing rather than a blank page with a heading on
  // it. A report should never contain an empty box.
  if (!rows || rows.length === 0) return null;
  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="The plan"
              sowhat="What has to be true for the outcome, and where each part has got to" />
            <TreeStatic rows={rows} maxW={1520} maxH={860} />
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — the plan</span>
          <span>Kept by hand on the project’s lever tree; the work under it comes off the tracker.</span>
        </footer>
      </section>
    </div>
  );
}

/* WHERE THE TIME IS GOING — its own sheet, only when the project runs a Pareto.
 *
 * It sits straight after the pace, because it is the answer to the question the
 * pace raises: the line is behind, so where is the time actually going? And
 * when a second Pareto has been uploaded it carries the movement, which is the
 * only thing on this report that says whether the work CHANGED anything rather
 * than merely happened. */
function ParetoPage({ view, title, scale, sheetH, n, of }: {
  view: ParetoView; title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  const SHOWN = PARETO_SHEET_ROWS;   // shared with the PDF — see lib/paretoView
  const rows = view.rows.filter(r => r.verdict !== 'gone').slice(0, SHOWN);
  const gone = view.rows.filter(r => r.verdict === 'gone');
  const max = rows[0]?.mins ?? 0;
  const more = view.rows.filter(r => r.verdict !== 'gone').length - rows.length;
  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="Where the time is going"
              sowhat={view.comparable
                ? `${view.period} against ${view.beforePeriod} — what moved`
                : `${view.period ?? 'the measured period'} — ${Math.round(view.totalMins).toLocaleString()} minutes across ${view.totalStops} stops`} />
            <p className="exec-pr-vital">
              <b>{view.vitalCount}</b> categories carry <b>{Math.round(view.vitalShare * 100)}%</b> of
              the lost time{view.headline ? ` · ${view.headline}` : ''}
            </p>
            <table className="exec-pr">
              <thead>
                <tr>
                  <th scope="col">Category</th><th scope="col">Minutes</th>
                  <th scope="col">Share</th><th scope="col">Stops</th><th scope="col">Min/stop</th>
                  {view.comparable && <th scope="col">Change</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.category} className={m.vital ? 'is-vital' : ''}>
                    <th scope="row">{m.category}</th>
                    <td className="exec-pr-bar-c">
                      <span className="exec-pr-bar" style={{ width: `${max > 0 ? (m.mins / max) * 100 : 0}%` }} aria-hidden />
                      <span className="exec-pr-m">{Math.round(m.mins).toLocaleString()}</span>
                    </td>
                    <td className="c-num">{Math.round(m.share * 100)}%</td>
                    <td className="c-num">{m.events}</td>
                    <td className="c-num">{Math.round(m.minPerEvent * 10) / 10}</td>
                    {view.comparable && (
                      <td className={'exec-pr-mv is-' + (m.verdict ?? 'flat')}>{moveSentence(m)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {(more > 0 || gone.length > 0) && (
              <p className="exec-more">
                {more > 0 && <>+{more} smaller categor{more === 1 ? 'y' : 'ies'} below these</>}
                {more > 0 && gone.length > 0 && ' · '}
                {gone.length > 0 && <>gone entirely: {gone.map(g => g.category).join(', ')}</>}
              </p>
            )}
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — where the time is going</span>
          <span>{view.comparable
            ? `Measured against the Pareto covering ${view.beforePeriod}.`
            : 'One Pareto so far — no movement can be claimed from a single reading.'}</span>
        </footer>
      </section>
    </div>
  );
}

/* WHAT WE ARE WAITING ON gets its own sheet, drawn the way the plan it comes
 * off is drawn: rows of what we need, weeks across the top, green from the week
 * each one lands. A list of dates would fit in a corner of another page — the
 * grid is here because coverage is a SHAPE, and a client reads the block of green
 * without reading a single date.
 *
 * It takes the same block the PDF does, so the page and the file cannot shade
 * different weeks. */
function MaterialsPage({ m, title, scale, sheetH, n, of }: {
  m: NonNullable<PaceReportData['materials']>;
  title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  const SHOWN = 26;
  const rows = m.rows.slice(0, SHOWN);
  const more = m.rows.length - rows.length;

  /* Each month printed once, over the run of weeks that share it. */
  const months: { month: string; span: number }[] = [];
  for (const w of m.weeks) {
    const last = months[months.length - 1];
    if (last && last.month === w.month) last.span += 1;
    else months.push({ month: w.month, span: 1 });
  }

  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="What we are waiting on"
              sowhat={m.late > 0
                ? `${m.late} late · ${m.waiting} still to come · ${m.here} of ${m.total} in`
                : `${m.waiting} still to come · ${m.here} of ${m.total} in`} />
            <div className="mt-grid-wrap">
              <table className="mt-grid">
                <thead>
                  <tr>
                    <th className="mt-grid-item" rowSpan={2} scope="col">What we need</th>
                    <th className="mt-grid-when" rowSpan={2} scope="col">Planned for arrival</th>
                    {months.map(x => (
                      <th key={x.month} colSpan={x.span} scope="colgroup" className="mt-grid-month">{x.month}</th>
                    ))}
                  </tr>
                  <tr>
                    {m.weeks.map(w => <th key={w.start} scope="col" className="mt-grid-wk">{w.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.what}>
                      <th scope="row" className="mt-grid-item">{r.what}</th>
                      <td className={'mt-grid-when is-' + (r.here ? 'here' : r.late != null ? 'late' : r.due ? 'waiting' : 'undated')}>
                        {r.here ? 'In stock' : r.due ? r.due : '—'}
                        {r.late != null && <span className="mt-grid-late">{r.late}d late</span>}
                      </td>
                      {r.covered.map((on, i) => (
                        <td key={m.weeks[i]?.start ?? i}
                          className={'mt-cell' + (on ? ' is-on' : '') + (r.lands[i] ? ' is-lands' : '')}>
                          {r.lands[i] && <span className="mt-cell-d">{r.lands[i]}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {more > 0 && <p className="exec-more">+{more} more on the list than fit this sheet</p>}
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — what we are waiting on</span>
          <span>Green from the week it lands, the same as the plan it comes off.</span>
        </footer>
      </section>
    </div>
  );
}

/* THE TRIALS — the front page of a job that runs on them.
 *
 * Not a grid: a trial is a sentence, not a state. What we plan to do, on which
 * machine, what it passes on, who with — and once the day has happened, what
 * actually ran and what came of it. The plan and the day stay two columns,
 * because the difference between what you meant to run and what you ran is
 * usually the story.
 */
function TrialsBox({ t }: { t: PaceReportData['trials'] }) {
  if (!t || t.rows.length === 0) {
    return (
      <section className="exec-box">
        <SectionHead n="1" title="The trials" sowhat="nothing planned yet" />
        <p className="exec-empty">No trial has been booked on this job yet.</p>
      </section>
    );
  }
  const SHOWN = 6;
  const rows = t.rows.slice(0, SHOWN);
  return (
    <section className="exec-box">
      <SectionHead n="1" title="The trials"
        sowhat={`${t.planned} booked \u00b7 ${t.passed} passed${t.failed ? ` \u00b7 ${t.failed} didn\u2019t` : ''}${
          t.notRun ? ` \u00b7 ${t.notRun} didn\u2019t run` : ''}`} />
      <div className="tr-cards">
        {rows.map((r, i) => (
          <article className={'tr-card is-' + r.outcome} key={`${r.title}-${i}`}>
            <header>
              <h4>{r.title}</h4>
              <span className={'tr-out is-' + r.outcome}>{r.outcomeWord}</span>
            </header>
            <p className="tr-meta">
              {[r.machine, r.withWhom && `with ${r.withWhom}`, r.when, r.product].filter(Boolean).join(' \u00b7 ')}
            </p>
            <dl className="tr-loop">
              <dt>Expected</dt>
              <dd className={r.passesIf ? '' : 'is-none'}>{r.passesIf || 'nothing agreed in advance'}</dd>
              <dt>Happened</dt>
              <dd className={r.outcome === 'planned' ? 'is-none' : 'is-strong'}>{r.verdict || '\u2014'}</dd>
              <dt>Found</dt>
              <dd className={r.found.undecided ? 'is-warn' : ''}>
                {foundWords(r.found)}
              </dd>
              <dt>Next</dt>
              <dd className={r.next ? (r.next.owner ? 'is-strong' : 'is-bad') : 'is-none'}>
                {r.next
                  ? [r.next.what, r.next.owner || 'nobody yet', r.next.due].filter(Boolean).join(' \u00b7 ')
                    + (r.nextMore ? ` (+${r.nextMore} more)` : '')
                  : 'nothing agreed yet'}
              </dd>
            </dl>
          </article>
        ))}
      </div>
      {t.rows.length > rows.length && (
        <p className="exec-more">+{t.rows.length - rows.length} on the sheet behind this one</p>
      )}
    </section>
  );
}

/* WHAT THE MACHINE CAN RUN — the materials grid's twin, drawn the same way.
 *
 * The one thing it does differently is write the state in words beside the
 * colour. Three fills read fine on a screen; across a meeting table, on a
 * photocopy, or to somebody who cannot separate red from green, a column that
 * says "On the machine" is the only reason the sheet still works.
 *
 * It takes the same block the PDF does, so the page and the file cannot shade
 * different weeks. */
/** The three states in the words the sheet prints. Kept beside the page that
 *  prints them rather than imported from the model: this is presentation, and
 *  the model's own STATE_WORD is for the screen. */
const STATE_LABEL = { needed: 'Not written', onMachine: 'On the machine', proved: 'Proved' } as const;

function ProgramsPage({ p, title, scale, sheetH, n, of }: {
  p: NonNullable<PaceReportData['programs']>;
  title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  const SHOWN = 26;
  const rows = p.rows.slice(0, SHOWN);
  const more = p.rows.length - rows.length;

  const months: { month: string; span: number }[] = [];
  for (const w of p.weeks) {
    const last = months[months.length - 1];
    if (last && last.month === w.month) last.span += 1;
    else months.push({ month: w.month, span: 1 });
  }

  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="What the machine can run"
              sowhat={p.overdue > 0
                ? `${p.overdue} past its test date · ${p.proved} of ${p.total} proved`
                : `${p.proved} of ${p.total} proved · ${p.onMachine} on the machine · ${p.needed} not written`} />
            {/* NO CALENDAR HERE. See paceReportPdf.ts, programsSheet, for why:
                a program is not a thing that arrives, so painting its state
                across eight week columns produced eight columns of one colour.
                Two lists across the sheet instead, saying the four things
                somebody actually asks. */}
            <div className="pg-cols">
              {[0, 1].map(col => (
                <table className="pg-list" key={col}>
                  <thead>
                    <tr>
                      <th scope="col">Program</th>
                      <th scope="col">What it runs</th>
                      <th scope="col">Where it&rsquo;s got to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter((_, i) => i % 2 === col).map(r => (
                      <tr key={r.what}>
                        <th scope="row">
                          <span className={'pg-dot is-' + (r.overdue != null ? 'late' : r.state)} aria-hidden />
                          {r.what}
                        </th>
                        <td className="pg-runs">{r.runs ?? '\u2014'}</td>
                        <td className={'pg-when is-pg-' + (r.overdue != null ? 'late' : r.state)}>
                          {r.when}
                          {r.overdue != null && <span className="mt-grid-late">{r.overdue} days ago</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
            <p className="pg-key">
              <span className="pg-key-i"><span className="pg-dot is-proved" aria-hidden /> Proved</span>
              <span className="pg-key-i"><span className="pg-dot is-onMachine" aria-hidden /> On the machine, not proved</span>
              <span className="pg-key-i"><span className="pg-dot is-late" aria-hidden /> Test date gone</span>
              <span className="pg-key-i"><span className="pg-dot is-needed" aria-hidden /> Not written yet</span>
            </p>
            {more > 0 && <p className="exec-more">+{more} more on the list than fit this sheet</p>}
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — what the machine can run</span>
          <span>Proved carries the day it was proved. The word on its own is an opinion.</span>
        </footer>
      </section>
    </div>
  );
}

/* PEOPLE · PROCESS · PLANT gets its own sheet, for the same reason the tree did:
 * the SHAPE is the message. Three columns handed across a table say "these are
 * the three kinds of problem and here is where each stands"; the same actions as
 * a list say something much weaker. */
function BoardPage({ rows, unplaced, title, scale, sheetH, n, of, areas: plan, sheet, fill }: {
  rows: PaceReportData['board']; unplaced: number; title: string;
  scale: number; sheetH: number; n: number; of: number;
  /** The areas this particular sheet carries — see boardSheets in lib/pillars. */
  areas: string[]; sheet: number;
  /** How much the board is scaled to fill this sheet — see boardScale. */
  fill: number;
}) {
  if (rows.length === 0) return null;   // never a page with a heading and nothing under it
  const cols = [
    { key: 'people' as const, label: 'People' },
    { key: 'plant' as const, label: 'Plant' },
    { key: 'process' as const, label: 'Process' },
  ];
  const LABEL: Record<string, string> = {
    n: 'Not started', w: 'In progress', a: 'Overdue', r: 'Blocked', g: 'Done',
  };
  const areas = plan;

  /* THE SAME DRAWING AS THE PDF, AT THE SAME SIZE. Every measurement below is
   * the PDF's own number in points, converted once to this sheet's pixels and
   * multiplied by the fill scale — so the preview is not merely similar to the
   * file, it is the file. One unit, one arithmetic, no second opinion. */
  const u = BOARD_PX * fill;
  const px = (pt: number) => `${pt * u}px`;
  const geom = {
    '--ba-head': px(16),
    '--ba-colhead': px(14),
    '--ba-card': px(BOARD_ACT_H),
    '--ba-gap': px(BOARD_ACT_GAP),
    '--ba-areagap': px(BOARD_AREA_GAP),
    '--ba-pad': px(8),
    '--ba-f-area': px(10),
    '--ba-f-col': px(8),
    '--ba-f-card': px(7.8),
    '--ba-f-meta': px(6.5),
  } as React.CSSProperties;

  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title={'3P Board — People · Plant · Process' + (sheet > 1 ? ' (continued)' : '')}
              sowhat="One card per area · every action off this week’s workbook" />
            <div className="exec-areas" style={geom}>
            {areas.map(area => {
              const mine = rows.filter(r => r.area === area);
              return (
                <div key={area} className="exec-area">
                  <p className="exec-area-h">
                    <b>{area}</b>
                    <span>{mine.length} action{mine.length === 1 ? '' : 's'} · {mine.filter(r => r.rag === 'g').length} done</span>
                  </p>
                  <div className="exec-board">
                    {cols.map(c => {
                      const cr = mine.filter(r => r.pillar === c.key);
                      return (
                        <section key={c.key} className={'exec-bcol is-' + c.key}>
                          <header className="exec-bcol-h">
                            <span className="exec-bcol-t">{c.label}</span>
                            <span className="exec-bcol-n">{cr.length}</span>
                          </header>
                          {cr.length === 0
                            ? <p className="exec-empty">—</p>
                            : cr.map((r, i) => (
                              <article key={i} className={'exec-bact is-' + r.rag}>
                                <span className="exec-bact-t">{r.title}</span>
                                <span className="exec-bact-f">
                                  <b className={'exec-bst is-' + r.rag}>{LABEL[r.rag]}</b>
                                  {[r.owner, r.due && 'due ' + r.due].filter(Boolean).join(' · ')}
                                </span>
                              </article>
                            ))}
                        </section>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — the 3P board{sheet > 1 ? ` (${sheet})` : ''}</span>
          <span>{unplaced > 0
            ? `${unplaced} tracker row${unplaced === 1 ? '' : 's'} with no 3P value`
            : 'Every tracker row is on the board.'}</span>
        </footer>
      </section>
    </div>
  );
}

export function PaceExecReport() {
  /* Which project this is a report on. There is no default: a deck with no
     project named is a bad link, and it says so below rather than reporting on
     whichever project the app happened to invent. */
  const route = useRoute();
  const projectId = route.query.get('project') ?? '';
  // ?line= turns this into ONE LINE'S deck — the owner's own A3, same drawer,
  // same layout, scoped to their line. Without it, it is the client's, which is the
  // roll-up of every line's.
  const lineId = route.query.get('line') || undefined;
  const { loading: projLoading, project } = useProject(projectId);

  const pace = usePaceSnapshots(projectId);
  const ppm = usePaceLines(projectId);
  const nums = useMeasures(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  const line = lineId ? ppm.lines.find(l => l.id === lineId) : undefined;
  const [todos, setTodos] = useState<PaceTodoRow[] | null>(null);
  const [wins, setWins] = useState<PaceWinRow[] | null>(null);
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [machines, setMachines] = useState<Asset[]>([]);
  /** Open snags per line, so the roll-up can say WHOSE they are. */
  const [snagsByLine, setSnagsByLine] = useState<Map<string, Snag[]>>(new Map());

  // Read once, here, so the sheet on screen and the page in the PDF are drawn
  // from the same rows rather than two reads that could disagree.
  const treeRows = useTreeNodes(projectId);

  const root = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<{ stale: boolean; msg: string } | null>(null);

  /* Fetch the PDF library when the REPORT opens, not when the button is
   * pressed. It is a separate 350KB chunk, and this is an installed PWA whose
   * worker keeps serving the build it booted with — so after a deploy the page
   * asks for a filename the server no longer has, the import rejects, and the
   * button appears to do nothing. Loading it up front turns a dead button into
   * something that can say what is wrong while you are still reading the page. */
  useEffect(() => { void loadPdfLib().catch(() => { /* reported when pressed */ }); }, []);
  const loading = pace.loading || ppm.loading || projLoading || todos == null || wins == null || snags == null;

  // Scale the fixed-size sheets down to whatever width the window gives us, so
  // what is on screen is exactly what comes out of the PDF. Re-runs when the
  // data lands, because the sheets (and the ref) only exist once it has.
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = root.current;
    if (!el || loading) return;
    const fit = () => {
      /* The CONTENT box, not clientWidth — that includes the page's own side
         padding, so the sheet was scaled 32px wider than the space it had and
         every preview page lost its right-hand edge. */
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
      if (w > 0) setScale(Math.min(1, w / SHEET_W));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // Which walks to read. A line's deck reads its own; the project's reads the
  // project walk AND every line's — that is the report pulling from all the
  // others rather than from one workspace that only ever had the plant in it.
  const walkSig = ppm.lines.map(l => `${l.id}:${l.workspaceId ?? ''}`).join(',');
  useEffect(() => {
    void (async () => {
      setTodos(await listPaceTodos(projectId, lineId));
      setWins(await listPaceWins(projectId, lineId));
      /* THE TRIALS. A commissioning job's whole story is here — what is planned,
         what it passes on, and what happened on the day — and the report had no
         page for it, which is why a project with two trials booked printed a 3P
         board and an empty action list instead. */
      setTests(await listTests(projectId));
      setMachines(await listAssets(projectId));
      /* And what each one turned up. Without the items a trial prints as an
         outcome word and one line of commentary, which is what made the report
         "not sufficient enough of the detail" — the four parts of the loop were
         all in the database and none of them on the page. */
      setTestItems(await listTestItems(projectId));

      const byLineSnags = new Map<string, Snag[]>();
      for (const part of walkSig.split(',').filter(Boolean)) {
        const i = part.indexOf(':');
        const id = part.slice(0, i), ws = part.slice(i + 1);
        if (ws) byLineSnags.set(id, await snagsForWorkspace(ws));
      }
      setSnagsByLine(byLineSnags);

      if (lineId) { setSnags(byLineSnags.get(lineId) ?? []); return; }
      const wsId = await getPaceWorkspaceId(projectId);
      const walk = wsId ? await snagsForWorkspace(wsId) : [];

      /* ONE SNAG, ONCE — even when the same walk is reachable twice.
       *
       * A snag belongs to a WORKSPACE, and a workspace can be reached by more
       * than one route: the project's own line-walk workspace is very often
       * also a line's, and two lines set up together can share one. Merging the
       * lists straight meant the same snag arrived two or three times.
       *
       * It showed up as a duplicate React key, which is the harmless half. The
       * half that matters is that every count downstream reads off this list —
       * "6 open snags filmed on the line" on a sheet going to a General
       * Manager, when there were two. A report that inflates its own numbers is
       * worse than one that omits them. */
      const byId = new Map<string, Snag>();
      for (const sn of [...walk, ...[...byLineSnags.values()].flat()]) byId.set(sn.id, sn);
      setSnags([...byId.values()]);
    })();
  }, [projectId, lineId, walkSig]);

  /* Draw the PDF from the numbers — see lib/paceReportPdf.
   *
   * Deliberately NOT a screenshot of this page. Rasterising the DOM made the
   * output depend on the browser finishing a stylesheet fetch inside a hidden
   * clone, which failed on real devices in four different ways. Nothing here
   * touches the DOM, so the file is identical on every device. */
  const download = async () => {
    if (saving || loading) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const { jsPDF } = await loadPdfLib();
      const { drawPaceReport } = await import('../lib/paceReportPdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
      drawPaceReport(pdf, reportData());
      // The file lands in someone's inbox on its own, so its NAME has to say
      // which project it is — "report.pdf" from three projects is three files
      // nobody can tell apart.
      const name = line ? `${project?.name ?? 'Project'} ${line.name}` : (project?.name ?? 'Project');
      const slug = name.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'Project';
      const how = await deliverPdf(pdf, `${slug}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      // Downloading is invisible on a phone, and "opened in a tab" needs saying
      // or it looks like nothing happened at all.
      if (how === 'opened') setSaveErr({ stale: false, msg: 'Your browser would not save it, so it is open in a new tab — share or print it from there.' });
    } catch (err) {
      console.error('PDF export failed', err);
      setSaveErr(isStaleBuildError(err)
        ? { stale: true, msg: 'This tab is still running an older version of the app, so the part that draws the PDF could not load.' }
        : { stale: false, msg: err instanceof Error ? err.message : 'The PDF could not be built.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="exec-report">
        <div className="exec-bar no-print">
          <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}`)}>← Back</button>
        </div>
        <p className="sub" style={{ padding: '40px' }}>Preparing the report…</p>
      </div>
    );
  }

  /* A report on a project that isn't here is a page of empty boxes with
     "Project" at the top — say so and offer the way out instead. A link with no
     project named at all is a different sentence: this deck used to default to
     the one project the app invented, and there is no such thing now. */
  if (!project) {
    return (
      <div className="exec-report">
        <div className="exec-bar no-print">
          <button className="btn btn-ghost" onClick={() => nav('/projects')}>← Projects</button>
        </div>
        <p className="sub" style={{ padding: '40px' }}>
          {projectId
            ? 'That project isn’t here any more, so there is nothing to report on.'
            : 'A deck is a report on one project. Pick which, and it opens on its own.'}
        </p>
      </div>
    );
  }

  const now = Date.now();
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  // A line's deck shows that line's slice of the tracker; the project's shows
  // the lot.
  const actions = actionsForLine(pace.actions, line?.key);

  /* The plan on the wall and the plan on the paper have to be the same plan.
   * A condition bound to the tracker grows its actions at draw time, so the
   * report runs the identical derivation the editor does rather than printing
   * only the boxes that happen to be stored. */
  const fullTree = withTrackerRows(treeRows ?? [], bindSources(pace.actions, todos ?? [], ppm.lines));

  /* The board reads the same actions the rest of the report does — narrowed to
   * the line when this is a line's own deck, so an owner's page shows only
   * their three columns. */
  const boardData = buildBoard(actions);
  const boardRows: PaceReportData['board'] = boardData.areas.flatMap(ar =>
    ar.columns.flatMap(c => c.rows.map(a => ({
      area: ar.name, pillar: c.key, title: actionTitle(a),
      owner: (a.owner || a.who || '').trim(), due: a.due ?? '',
      rag: statusOfAction(a),
    }))));

  /* Page numbers have to agree with the PDF's, because somebody will have one
   * on screen and the other in their hand. Both optional sheets are counted the
   * same way, in the same order. */
  const hasTree = !line && !!project?.leverTree && fullTree.length > 0;

  /* The Pareto, when the project runs one and an upload has carried the sheet.
     The comparison skips uploads that brought no Pareto with them: most weeks
     the tracker changes and the loss analysis does not, and "nothing to compare"
     the moment one file lacks the sheet would be wrong. */
  const paretoSnaps = pace.snapshots.filter(s => !!s.pareto) as
    (typeof pace.snapshots[number] & { pareto: PaceParetoSheet })[];
  const pView: ParetoView | null = !line && project?.pareto && paretoSnaps[0]
    ? paretoView(paretoSnaps[0].pareto, paretoSnaps[1]?.pareto)
    : null;
  const hasPareto = !!pView;
  /* The identical rule the PDF uses — see lib/pillars. Two rules is how a
   * four-page PDF ends up stamped "page 2 of 3", and two units is how the same
   * rule reaches two answers, so the available height lives there too. */
  const boardPlan = boardSheets(
    boardData.areas.map(a => ({ name: a.name, counts: a.columns.map(c => c.rows.length) })),
  );
  /* WHAT WE ARE WAITING ON, in the shape the sheet is drawn from — and worked
     out HERE rather than in the drawer, so the grid on the page and the grid in
     the file shade the same weeks. A line's own deck leaves it out: materials
     belong to the job, not to one line's A3. */
  const today = todayISO();
  const materialsBlock: PaceReportData['materials'] = line || mats.materials.length === 0 ? undefined : {
    total: mats.tally.total, here: mats.tally.here,
    waiting: mats.tally.waiting, late: mats.tally.late, nextDue: mats.tally.nextDue,
    weeks: mats.weeks.map(w => ({ start: w.start, label: w.label, month: w.month })),
    rows: mats.materials.map(m => ({
      what: m.what,
      due: m.due ? fmtShort(m.due) : undefined,
      here: isHere(m),
      late: daysLate(m, today),
      covered: mats.weeks.map(w => coveredIn(m, w, today)),
      /* The week it lands in, already written for print. One entry per column,
         at most one of them set — see landsIn. */
      lands: mats.weeks.map(w => (landsIn(m, w, today) ? fmtShort(m.due) : undefined)),
    })),
  };

  /* The programs block, worked out beside the grid the screen draws, for the
     same reason as materials: one call, so the page and the file cannot
     disagree. `when` is written for print here — the drawer never parses a
     date, and it carries the STATE in words as well, which is what keeps the
     sheet readable in black and white. */
  const programsBlock: PaceReportData['programs'] = line || progs.programs.length === 0 ? undefined : {
    total: progs.tally.total, proved: progs.tally.proved,
    onMachine: progs.tally.onMachine, needed: progs.tally.needed,
    overdue: progs.tally.overdue, nextTest: progs.tally.nextTest,
    weeks: progs.weeks.map(w => ({ start: w.start, label: w.label, month: w.month })),
    rows: progs.programs.map(p => {
      const state = stateOf(p);
      return {
        what: p.what,
        runs: p.runs,
        state,
        when: state === 'proved' ? `Proved ${p.provedOn ? fmtShort(p.provedOn) : ''}`.trim()
          : p.testOn ? `${STATE_LABEL[state]} · test ${fmtShort(p.testOn)}`
            : STATE_LABEL[state],
        overdue: daysOverdue(p, today),
        fill: progs.weeks.map(w => fillIn(p, w)),
        booked: progs.weeks.map(w => testedIn(p, w)),
      };
    }),
  };

  /* THE TRIALS, for a job that runs on them. Ordered the way the screen orders
     them: what is booked and still ahead first, soonest first, then what has
     already happened, most recent first. A client wants "what is coming" before
     "what we did". */
  const trialRows = tests
    .filter(t => !t.deletedAt)
    .slice()
    .sort((a, b) => {
      const ap = a.outcome === 'planned', bp = b.outcome === 'planned';
      if (ap !== bp) return ap ? -1 : 1;
      if (ap) return (a.plannedFor ?? '9999').localeCompare(b.plannedFor ?? '9999');
      return (b.ranOn ?? '').localeCompare(a.ranOn ?? '');
    });
  /* THE FUNDAMENTALS, LIFTED OUT OF EACH TRIAL.
   *
   * "At the moment it's just not sufficient enough of the detail, the format.
   * It's not good... you'll see, run the BU at 75 packs per minute for one hour
   * — just says didn't pass with my commentary."
   *
   * The whole of a day is the trial card's job. What a client acts on is four
   * lines, and they are the four the loop is made of: what it was meant to do,
   * what it actually did, what that turned up, and what happens next with
   * somebody's name on it. Read through the same lib/trialCard.ts the card
   * uses, so the two documents cannot disagree about what a trial says. */
  const trialsBlock: PaceReportData['trials'] = line || trialRows.length === 0 ? undefined : {
    planned: trialRows.filter(t => t.outcome === 'planned').length,
    passed: trialRows.filter(t => t.outcome === 'passed').length,
    failed: trialRows.filter(t => t.outcome === 'failed').length,
    notRun: trialRows.filter(t => t.outcome === 'notRun').length,
    rows: trialRows.map(t => {
      const c = trialCard(t, tests, testItems, machines);
      const nx = headlineNext(c);
      return {
        id: t.id,
        fromId: t.fromTestId,
        kind: c.kind,
        ran: hasRun(t),
        /* STILL OWED, AND THE DAY HAS GONE.
           Not lib/testing's isOverdue, and the difference matters: there, a
           test whose day came and went is SETTLED — the day happened, whatever
           came of it — which is right for the screen's late count. Here the
           question is a different one. The client is owed a changeover
           demonstration; the 17th has been and gone and they still have not
           had it. Both readings are true and this page needs this one. */
        late: (() => {
          /* Still owed a DAY — not a verdict. One that ran and is waiting to be
             called passed or not is a different debt, said on its own line. */
          if (!(c.outcome === 'notRun' || (c.outcome === 'planned' && !hasRun(t)))) return false;
          const end = plannedEnd(t);
          return !!end && end < todayISO();
        })(),
        title: c.title,
        machine: c.machine,
        /* The plan and the day are two fields, never one — the difference
           between what you meant to run and what you ran is usually the story. */
        when: c.outcome === 'planned' ? fmtShort(c.plannedFor) : fmtShort(c.ranOn ?? c.plannedFor),
        passesIf: c.passesIf ?? '',
        withWhom: c.withWhom ?? '',
        product: c.product ?? '',
        result: c.result ?? '',
        outcome: c.outcome,
        outcomeWord: c.outcomeWord,
        verdict: verdictLine(c),
        found: c.found,
        next: nx ? {
          what: nx.what,
          owner: nx.owner ?? '',
          due: nx.due ? fmtShort(nx.due) : '',
          done: nx.done,
        } : undefined,
        nextMore: Math.max(0, c.next.length - 1),
        follows: c.follows,
        ledTo: c.ledTo,
      };
    }),
  };

  /* A JOB WITH NO TRACKER IS NOT A TRACKER JOB.
     The report was Project Pace's, and every project got its shape: a ppm sheet,
     a 3P board, an action tracker. A commissioning job has none of those, so it
     printed three pages of empty scaffolding and buried the two things it does
     carry behind them. What prints is now what the project HAS. */
  const hasTracker = actions.length > 0 || nums.measures.length > 0;

  /* One order, counted once. Pace, then where the time is going, then the plan,
     then the work, then the detail — and every page number falls out of the
     same arithmetic the pages themselves are rendered from. */
  const paretoPageNo = 2;
  const hasMaterials = !!materialsBlock && materialsBlock.rows.length > 0;
  const materialsPageNo = 2 + (hasPareto ? 1 : 0);
  const hasPrograms = !!programsBlock && programsBlock.rows.length > 0;
  const programsPageNo = materialsPageNo + (hasMaterials ? 1 : 0);
  const treePageNo = programsPageNo + (hasPrograms ? 1 : 0);
  const boardPageNo = treePageNo + (hasTree ? 1 : 0);
  /* The detail page carries the tracker, the next steps, the walk and the wins.
     With none of them it is a page of headings, so it is not printed. */
  const hasDetail = hasTracker || (todos?.length ?? 0) > 0 || wins.length > 0 || snags.length > 0;
  const pageCount = 1 + (hasDetail ? 1 : 0) + (hasPareto ? 1 : 0) + (hasMaterials ? 1 : 0) + (hasPrograms ? 1 : 0)
    + (hasTree ? 1 : 0) + boardPlan.length;
  /* The panels on the last page carry on from the numbered pages before them.
     They used to be typed 3 to 7, which was right only while there were exactly
     two pages in front of them — add a Pareto and the report has two panels
     called 3. */
  const sec = boardPageNo + boardPlan.length;
  // Which lines this report covers — one, or all of them.
  const reportLines = line ? [line] : ppm.lines;

  const complete = actions.filter(isDone).length;
  const late = actions.filter(a => isLate(a, todayStart)).length;
  const openOnTrack = actions.length - complete - late;
  const openTotal = openOnTrack + late;
  const pctDone = actions.length ? Math.round((complete / actions.length) * 100) : 0;

  /* WHERE EVERY LINE STANDS on the measure this project leads on — one series
     per line, read by the page, the roll-up and the PDF, so all three say the
     same thing. `meeting` is only true when there is both a reading and a target
     to judge it against: a line with nothing recorded is not "at target". */
  const seriesByLine = new Map<string, LineSeries | undefined>(reportLines.map(l => [
    l.id, lineSeries(nums.measures, nums.periods, nums.targets, nums.readings, l.id),
  ]));
  const atTarget = reportLines.filter(l => seriesByLine.get(l.id)?.meeting === true).length;

  // The lines this report actually covers, read off the project rather than
  // written into the page — so adding a line changes what the report says it covers.
  const lineList = reportLines.map(l => l.key).join(' · ');

  /* What this report is CALLED, worked out once.
   *
   * The page and the PDF both read these. They used to be written out twice —
   * once in the JSX, once in reportData — and the moment a line's own deck
   * arrived the two disagreed: the file said "Line 7" while the page it is
   * supposed to be a picture of still said "Project Pace". One definition is
   * the only way that stays true. */
  const title = line ? line.name : (project?.name ?? 'Project');
  const lead = line ? line.owner : project?.lead;
  const leadRole = line ? 'Line owner' : 'Project lead';
  const subtitle = line
    ? [line.owner && `Owner ${line.owner}`, line.sponsor && `Sponsor ${line.sponsor}`,
       `part of ${project?.name ?? 'the project'}`].filter(Boolean).join(' · ')
    /* The masthead names what is actually in the report. On a job with no
       tracker it used to promise "the numbers, the action tracker, the line
       walk" over a front page carrying none of the three. */
    : !hasTracker
      ? [lineList, 'tests and fixes', 'what we are waiting on', 'what the machine can run']
          .filter(Boolean).join(' — ').replace(/ — (?=what we)/, ', ').replace(/ — (?=what the)/, ', ')
      : [lineList, nums.measures[0]?.name ?? 'the numbers', 'the action tracker', 'the line walk']
          .filter(Boolean).join(' — ').replace(/ — (?=the action)/, ', ').replace(/ — (?=the line walk)/, ', ');

  const openSnags = snags.filter(s => s.status !== 'closed');
  /* Which line each snag came off. The project's report merges every line's
   * walk, so a snag with no line against it is a problem the client cannot route.
   * On a line's own deck it stays blank — the masthead already said whose. */
  const snagLine = new Map<string, string>();
  if (!line) {
    for (const [id, list] of snagsByLine) {
      const name = ppm.lines.find(l => l.id === id)?.name ?? '';
      for (const sn of list) snagLine.set(sn.id, name);
    }
  }
  const winsThisWeek = wins.filter(w => now - w.createdAt <= 7 * dayMs);
  const showWins = (winsThisWeek.length ? winsThisWeek : wins).slice(0, 4);

  // the exceptions — the only actions shown by name, worst (most overdue) first
  const lateAll = actions
    .filter(a => isLate(a, todayStart))
    .sort((a, b) => (dueMs(a) ?? Infinity) - (dueMs(b) ?? Infinity));
  const LATE_SHOWN = 10;
  const lateActions = lateAll.slice(0, LATE_SHOWN);
  const lateMore = lateAll.length - lateActions.length;

  const openTodos = todos
    .filter(t => t.state !== 'done')
    .sort((a, b) => (a.state === b.state ? 0 : a.state === 'todo' ? -1 : 1))
    .slice(0, 9);

  // Finished lines, most recently touched first. These used to be filtered out
  // of the report entirely, so a line you ticked off took its outcome with it.
  const DONE_SHOWN = 4;
  const doneAll = todos
    .filter(t => t.state === 'done')
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const doneTodos = doneAll.slice(0, DONE_SHOWN);
  const doneMore = doneAll.length - doneTodos.length;

  /* THE ROLL-UP. One row per line, and every number in it comes from that
   * line's own pack — the actions its owner is carrying, the next steps they
   * typed, the walk they filmed, the wins they logged. The client reads one page;
   * it is fed by everybody else's.
   *
   * It used to bucket tracker actions into three fixed names ('Line 2', 'Line
   * 7', 'Line 10'), which could only ever describe the workbook. Now it
   * describes the project. */
  const byLine = reportLines.map(l => {
    const mine = actionsForLine(pace.actions, l.key);
    const lineTodos = todos.filter(t => t.lineId === l.id);
    const ser = seriesByLine.get(l.id);
    return {
      name: l.name,
      owner: l.owner ?? '—',
      total: mine.length,
      done: mine.filter(isDone).length,
      late: mine.filter(a => isLate(a, todayStart)).length,
      open: mine.filter(a => !isDone(a)).length,
      nextOpen: lineTodos.filter(t => t.state !== 'done').length,
      nextDone: lineTodos.filter(t => t.state === 'done').length,
      snags: (snagsByLine.get(l.id) ?? []).filter(s => s.status !== 'closed').length,
      wins: wins.filter(w => w.lineId === l.id).length,
      latest: ser?.latest ?? null,
      meeting: ser?.meeting,
      unit: ser?.measure.unit,
    };
  });

  /* AREAS THE PROJECT HAS NO LINE FOR. The weekly upload can introduce work the
   * project has never heard of — a line commissioned this week, an area like
   * Cellox that was never a measured line. The board shows it at once because
   * the board is drawn from the workbook; the roll-up is one row per line the
   * project holds, so that work was appearing on the board and vanishing from
   * the page the client actually reads.
   *
   * They join the roll-up with an em dash where the numbers only a project line
   * can have would be — no reading, no next steps, no walk, no wins — which
   * says both things at once: here is the work, and here is what this area has
   * not got yet. A line's own deck never shows them: it is that line's page. */
  const extraAreas = line ? [] : uncoveredAreas(actions, reportLines.map(l => l.key));
  const byArea = extraAreas.map(name => {
    const mine = actions.filter(a => (a.line ?? '').trim() === name);
    return {
      name, owner: '—', total: mine.length,
      done: mine.filter(isDone).length,
      late: mine.filter(a => isLate(a, todayStart)).length,
      open: mine.filter(a => !isDone(a)).length,
      nextOpen: 0, nextDone: 0, snags: 0, wins: 0,
      latest: null as number | null, meeting: undefined as boolean | undefined,
      unit: undefined as string | undefined, noLine: true,
    };
  });
  const rollup = [...byLine.map(r => ({ ...r, noLine: false })), ...byArea];

  const seg = (count: number) => (openTotal + complete ? (count / actions.length) * 100 : 0);

  /* Everything the PDF needs, as plain numbers and strings. The drawer never
   * looks at the DOM, so this is the whole contract between screen and file. */
  /* WHERE THE JOB IS — the sheet that leads the report, off the same two calls
     the project screen makes. Not a second opinion assembled here: standing()
     gives the sentence and the rows, layoutPlan() gives the marks, and the only
     thing this decides is the minGap, which is the width of a label — an A3
     fits far more across than a phone, so it stacks fewer lines.

     Left off a line's own deck, like materials and programs: the position
     belongs to the job, not to one line's page. */
  const planStanding = line ? undefined : standing({
    tests, items: testItems, assets: machines,
    materials: mats.materials, programs: progs.programs,
    expectedAt: project?.expectedAt, plannedAt: project?.plannedAt, today,
  });
  const planLayout = layoutPlan(planStanding?.plan ?? [], {
    today, expectedAt: project?.expectedAt, plannedAt: project?.plannedAt,
    /* The A3's own geometry: 1190pt wide, 26pt margins, 14pt inset each side
       and a 74pt lane column leave ~1036pt of track. A label is drawn at 7.5pt
       bold with its date beside it, so ~3.9pt a character plus 46pt of date
       and padding. See labelGap — an estimate on purpose, and a generous one. */
    widthOf: m => labelGap(m.label, 3.9, 46, 1036),
  });
  const planBlock: PaceReportData['plan'] = !planStanding || planStanding.plan.length === 0
    ? undefined
    : {
      says: planStanding.sentence,
      slip: slipWords(planStanding.slipDays),
      counted: planSays(planStanding.plan, today),
      axis: planLayout.axis,
      lanes: planLayout.lanes,
      outstanding: planStanding.rows.map(r => ({
        what: r.what, open: r.open, late: r.late, whose: r.whose,
      })),
    };

  const reportData = (): PaceReportData => ({
    now,
    // The lever tree, flat. Only on the PROJECT's report: a line's own deck is
    // that line's page, and the whole project's plan on it would be somebody
    // else's work printed under their name.
    board: boardRows,
    boardUnplaced: boardData.unplaced.length,
    /* The same view the screen draws, flattened to numbers and sentences — the
       drawer never looks at the DOM, so this is the whole contract. */
    pareto: pView ? {
      period: pView.period, beforePeriod: pView.beforePeriod, headline: pView.headline,
      totalMins: pView.totalMins, totalStops: pView.totalStops,
      vitalCount: pView.vitalCount, vitalShare: pView.vitalShare,
      comparable: pView.comparable,
      rows: pView.rows.filter(r => r.verdict !== 'gone').slice(0, PARETO_SHEET_ROWS).map(r => ({
        category: r.category, mins: r.mins, share: r.share, events: r.events,
        minPerEvent: r.minPerEvent, vital: r.vital,
        move: r.verdict ? moveSentence(r) : '', verdict: r.verdict ?? 'flat',
      })),
      more: Math.max(0, pView.rows.filter(r => r.verdict !== 'gone').length - PARETO_SHEET_ROWS),
      gone: pView.rows.filter(r => r.verdict === 'gone').map(r => r.category),
    } : undefined,
    tree: line || !project?.leverTree ? [] : fullTree.map(n => ({
      id: n.id, parentId: n.parentId, text: n.text, rag: n.rag, sort: n.sort,
    })),
    // A line's deck is titled for the LINE and led by its owner — it is that
    // person's page to hand over. The project's is titled for the project.
    title, lead, leadRole, subtitle,
    lines: reportLines.map(l => ({
      key: l.key, name: l.name, variant: l.variant,
      owner: l.owner, sponsor: l.sponsor,
      series: seriesByLine.get(l.id),
    })),
    atTarget, pctDone,
    complete, total: actions.length, openTotal, openOnTrack, late,
    openSnags: openSnags.length, winsThisWeek: winsThisWeek.length,
    byLine: rollup,
    materials: materialsBlock,
    programs: programsBlock,
    trials: trialsBlock,
    plan: planBlock,
    tracker: hasTracker,
    lateActions: lateActions.map(a => ({
      line: norm(a.line) || '—',
      what: a.action || a.problem || `Action ${a.ref}`,
      owner: a.owner || a.who || '—',
      due: fmtShort(a.due),
    })),
    lateMore,
    completed: doneTodos.map(t => ({
      what: t.what || '—',
      who: t.who || '',
      outcome: t.outcome || t.notes || '',
    })),
    completedMore: doneMore,
    todos: openTodos.map(t => ({
      state: t.state === 'waiting' ? 'waiting' : 'todo',
      what: [t.what || '—', t.where].filter(Boolean).join(' · '),
      who: t.who || '—',
      when: t.when || '—',
    })),
    snags: openSnags
      .slice()
      .sort((a, b) => a.raisedAt - b.raisedAt)
      .slice(0, 6)
      .map(s => ({
        problem: s.problem || 'Snag',
        owner: s.owner || 'unassigned',
        days: Math.max(0, Math.floor((now - s.raisedAt) / dayMs)),
        status: s.status,
        line: snagLine.get(s.id) ?? '',
      })),
    /* A proved win reports its OWN sentence — both means, both week counts,
       the verdict — and the typed impact is dropped rather than printed
       alongside it. Two numbers claiming the same thing is how a report loses
       a room, and only one of the two was measured. */
    wins: showWins.map(w => {
      const pr = w.proof ? proofFromWin(w.proof) : null;
      return {
        title: w.title || 'Win',
        impact: pr ? proofSentence(pr) : (w.impact || ''),
        verdict: pr?.verdict,
        story: w.story || '',
        who: w.who || 'the team', where: w.where || '',
      };
    }),
  });

  return (
    <div className="exec-report" ref={root}>
      {/* the second before it goes up on the wall */}
      <Sweep id={'report:' + projectId + (lineId ?? '')} />
      <div className="exec-bar no-print">
        {/* THE SPINE, NOT A LONE BACK BUTTON. This screen and the walk were the
            only two in the app with no trail at all — and they are the two you
            most need to get out of, because both fill the window. A back button
            that knows one destination cannot tell you where you are. */}
        <Crumbs trail={[
          { label: 'Projects', to: '/projects' },
          ...(project ? [{ label: project.name, to: `/project/${projectId}` }] : []),
          ...(line ? [{ label: line.name, to: `/project/${projectId}/line/${line.id}` }] : []),
          { label: 'Client report' },
        ]} />
        <div className="exec-bar-r">
          <span className="exec-bar-hint">One click — a ready-to-send double-sided A3 PDF</span>
          <button className="btn btn-primary" disabled={saving} onClick={() => void download()}>
            {saving ? 'Building PDF…' : 'Download PDF'}
          </button>
          <AccountMenu />
        </div>
      </div>

      {/* What went wrong, in words, where the button is — an alert saying "try
          again" on a report somebody needs for a meeting is a shrug, not an
          error message. A stale build gets the one action that fixes it. */}
      {saveErr && (
        <div className={'exec-saveerr no-print' + (saveErr.stale ? ' is-stale' : '')} role="alert">
          <span>{saveErr.msg}</span>
          {saveErr.stale && (
            <button className="btn btn-primary" onClick={() => void reloadOntoNewBuild()}>
              Reload the app
            </button>
          )}
          <button className="exec-saveerr-x" onClick={() => setSaveErr(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ================= PAGE 1 — STATUS AT A GLANCE ================= */}
      <div className="exec-pagewrap" style={{ height: SHEET_H * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <header className="exec-head">
          <div>
            <p className="exec-eyebrow">
              {line
                ? `${project?.name ?? 'Project'} · line report`
                : hasTracker
                  ? 'Improvement initiative · client report'
                  : 'Commissioning · client report'}
            </p>
            <h1 className="exec-title">{title}</h1>
            <p className="exec-lede">{subtitle}</p>
          </div>
          <div className="exec-head-meta">
            <span className="exec-asat">Status as at</span>
            <span className="exec-asat-d">{fmtDate(now)}</span>
            <span className="exec-forwhom">Prepared for the client</span>
            {lead && <span className="exec-lead">{leadRole} · {lead}</span>}
          </div>
        </header>

        <div className="exec-stats">
          {/* A JOB WITH NO TRACKER GETS ITS OWN NUMBERS. "0% actions complete"
              and "0/2 lines at target" are not facts about a commissioning job,
              they are facts about a spreadsheet it does not keep. */}
          {!hasTracker ? (<>
            <Stat n={String(trialsBlock?.planned ?? 0)} label="Booked" sub="still to do" tone="flat" />
            <Stat n={String(trialsBlock?.passed ?? 0)} label="Passed or fixed" sub={`of ${trialRows.length} run or booked`} tone="good" />
            <Stat n={String(trialsBlock?.failed ?? 0)} label="Didn’t pass" sub="and what came of it" tone={(trialsBlock?.failed ?? 0) > 0 ? 'bad' : 'good'} />
            <Stat n={String(progs.tally.proved)} label="Programs proved" sub={`of ${progs.tally.total} on the machine`} tone={progs.tally.proved > 0 ? 'good' : 'flat'} />
            <Stat n={String(mats.tally.late)} label="Films late" sub="past the date, still not here" tone={mats.tally.late > 0 ? 'bad' : 'good'} />
            <Stat n={String(openSnags.length)} label="Open evidence" sub="from the line walk" tone={openSnags.length > 0 ? 'warn' : 'good'} />
          </>) : line
            ? (() => {
                const ser = seriesByLine.get(line.id);
                if (!ser) return <Stat n="—" label="No measures set" sub="set them up on the project" tone="flat" />;
                return <Stat n={ser.latest == null ? '—' : say(ser.latest)}
                  label={`${ser.measure.name} latest`}
                  sub={vsTarget(ser)}
                  tone={ser.meeting == null ? 'flat' : ser.meeting ? 'good' : 'bad'} />;
              })()
            : <Stat n={`${atTarget}/${reportLines.length}`} label="Lines at target" sub="latest reading vs target"
                tone={atTarget === reportLines.length ? 'good' : atTarget === 0 ? 'bad' : 'warn'} />}
          {hasTracker && <>
            <Stat n={`${pctDone}%`} label="Actions complete" sub={`${complete} of ${actions.length}`} tone="good" />
            <Stat n={String(openTotal)} label="Still open" sub="in flight" tone="flat" />
            <Stat n={String(late)} label="Overdue" sub="past their date" tone={late > 0 ? 'bad' : 'good'} />
            <Stat n={String(openSnags.length)} label="Open evidence" sub="from the line walk" tone={openSnags.length > 0 ? 'warn' : 'good'} />
            <Stat n={String(winsThisWeek.length)} label="Wins this week" sub="what worked" tone="good" />
          </>}
        </div>

        <div className="exec-body-1">
          {!hasTracker ? (
            <TrialsBox t={trialsBlock} />
          ) : (
          <section className="exec-box exec-box-lines">
            <SectionHead n="1" title={nums.measures[0]?.name ?? 'The numbers'}
              sowhat={nums.measures[0]
                ? `Every reading against the target for the period it falls in${nums.measures[0].unit ? ` · ${nums.measures[0].unit}` : ''}`
                : 'This project has not said what it measures yet'} />
            {/* one line's deck gets one full-width chart rather than one
                quarter of a grid built for four — same rule the PDF follows */}
            <div className={'exec-charts' + (reportLines.length === 1 ? ' is-one' : reportLines.length === 2 ? ' is-two' : '')}>
              {reportLines.map(l => {
                const ser = seriesByLine.get(l.id);
                return ser
                  ? <MeasureChart key={l.key} series={ser}
                      who={{ name: l.name, owner: l.owner, sponsor: l.sponsor, variant: l.variant }} />
                  : null;
              })}
            </div>
          </section>
          )}
        </div>

        <footer className="exec-foot">
          <span>{title} · client report · page 1 of {pageCount} — {hasTracker ? 'the numbers' : 'the trials'}</span>
          <span>{hasTracker
            ? 'The tracker workbook is the system of record; this report reads it.'
            : 'A trial is planned, then run, and what it found becomes the next one.'}</span>
        </footer>
      </section>
      </div>

      {/* ================= PAGE 2 — THE PLAN ================= */}
      {pView && <ParetoPage view={pView} title={title} scale={scale} sheetH={SHEET_H} n={paretoPageNo} of={pageCount} />}
      {materialsBlock && (
        <MaterialsPage m={materialsBlock} title={title} scale={scale} sheetH={SHEET_H}
          n={materialsPageNo} of={pageCount} />
      )}
      {programsBlock && (
        <ProgramsPage p={programsBlock} title={title} scale={scale} sheetH={SHEET_H}
          n={programsPageNo} of={pageCount} />
      )}
      {!line && project?.leverTree && <TreePage rows={fullTree} title={title} scale={scale} sheetH={SHEET_H} n={treePageNo} of={pageCount} />}
      {/* WHY THE BOARD SHEET IS NOT IN THIS REPORT.
          A page with a heading and nothing under it has no place in something
          going to a client, so when the workbook has no 3P column the
          board sheet is simply not built. But silence at this end reads as a
          missing feature rather than as missing data — you go looking for the
          board, find nothing, and have no way to tell which of the two it is.
          So the report SCREEN says it, and the file stays clean: this note does
          not print and is not in the PDF. */}
      {/* And the note about the missing board only where a board was ever
          expected — it is a note about the TRACKER's 3P column. */}
      {hasTracker && boardRows.length === 0 && (
        <div className="exec-note no-print">
          <p>
            <b>No 3P board sheet in this report.</b>{' '}
            {actions.length === 0
              ? <>There are no tracker actions on this {line ? 'line' : 'project'} yet.</>
              : <>The tracker the app has read carries {actions.length} action{actions.length === 1 ? '' : 's'} and
                  no <b>3P</b> column, so there is nothing to draw. Add one column to the Tracker sheet headed
                  {' '}<b>3P</b>, with <b>People</b>, <b>Plant</b> or <b>Process</b> against each row, and the board
                  becomes page {2 + (hasTree ? 1 : 0)} of this report.</>}
          </p>
          <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}?view=data`)}>
            Upload the workbook
          </button>
        </div>
      )}
      {boardPlan.map((sheetAreas, i) => (
        <BoardPage key={i} rows={boardRows} unplaced={boardData.unplaced.length} title={title}
          scale={scale} sheetH={SHEET_H} n={boardPageNo + i} of={pageCount}
          areas={sheetAreas.map(a => a.name)} sheet={i + 1}
          fill={boardScale(runHeight(sheetAreas))} />
      ))}

      {/* ================= PAGE 3 — TRACKER, ATTENTION & MOVEMENT =================
          Only when there is something on it. On a commissioning job it was an
          action tracker with no actions, a next-steps list with no next steps
          and a wins list with no wins — a page of headings saying nothing,
          printed because the report was built for a project that always had
          them. */}
      {hasDetail && (<>
      <div className="exec-pagewrap" style={{ height: SHEET_H * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-2">
          {/* THE TRACKER BOX ONLY WHERE THERE IS A TRACKER. On a job that
              keeps none, this printed "0 actions" over an empty bar and a
              heading about lines that have no actions against them. The
              walk and the wins below it are real, so the page stays. */}
          {hasTracker && (
          <section className="exec-box exec-box-actions">
            <SectionHead n={String(sec + 0)} title={line ? 'Action tracker' : 'Action tracker & the lines'}
              sowhat={line
                ? `${actions.length} actions on this line — where they stand`
                : `${actions.length} actions — and what each line's own pack holds`} />

            <div className="exec-splitbar" role="img"
              aria-label={`${complete} complete, ${openOnTrack} open on track, ${late} overdue`}>
              {complete > 0 && <span className="seg is-done" style={{ width: `${seg(complete)}%` }} />}
              {openOnTrack > 0 && <span className="seg is-open" style={{ width: `${seg(openOnTrack)}%` }} />}
              {late > 0 && <span className="seg is-late" style={{ width: `${seg(late)}%` }} />}
            </div>
            <div className="exec-legend">
              <span className="lg"><i className="sw is-done" />Complete <b>{complete}</b></span>
              <span className="lg"><i className="sw is-open" />Open <b>{openOnTrack}</b></span>
              <span className="lg"><i className="sw is-late" />Overdue <b>{late}</b></span>
            </div>

            {/* The roll-up. Every column after the owner is that person's own
                pack, read from here — which is what makes this one page the
                client needs rather than one page per line. */}
            <table className="exec-matrix is-rollup">
              <thead>
                <tr>
                  <th scope="col">Line</th><th scope="col">Owner</th>
                  <th scope="col">{rollup.find(r => r.unit)?.unit ?? 'Latest'}</th>
                  <th scope="col">Open</th><th scope="col">Late</th>
                  <th scope="col">Next</th><th scope="col">Evidence</th><th scope="col">Wins</th>
                </tr>
              </thead>
              <tbody>
                {rollup.map(r => (
                  <tr key={r.name} className={r.noLine ? 'is-noline' : undefined}>
                    <th scope="row">{r.name}</th>
                    <td className="exec-mowner">{r.owner}</td>
                    <td className={'exec-mppm ' + (r.meeting == null ? '' : r.meeting ? 'is-good' : 'is-bad')}>
                      {r.latest == null ? '—' : say(r.latest)}
                    </td>
                    <td>{r.open}</td>
                    <td className={r.late > 0 ? 'is-bad' : ''}>{r.late}</td>
                    <td>{r.nextOpen}</td>
                    <td className={r.snags > 0 ? 'is-warn' : ''}>{r.snags}</td>
                    <td className={r.wins > 0 ? 'is-good' : ''}>{r.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {extraAreas.length > 0 && (
              <p className="exec-mnote">
                {extraAreas.join(' · ')} {extraAreas.length === 1 ? 'is an area' : 'are areas'} on the tracker
                with no line on the project — the actions are counted, the rest needs a line adding under
                Lines &amp; people.
              </p>
            )}
          </section>
          )}

          {/* Same rule: "the actions past their date" is a tracker sentence. */}
          {hasTracker && (
          <section className="exec-box exec-box-late">
            <SectionHead n={String(sec + 1)} title="Overdue & at risk" sowhat="The actions past their date — where help is needed" />
            {lateActions.length === 0 ? (
              <p className="exec-empty">Nothing overdue. Every open action is within its date.</p>
            ) : (
              <table className="exec-list">
                <thead><tr><th scope="col">Line</th><th scope="col">Action</th><th scope="col">Owner</th><th scope="col">Due</th></tr></thead>
                <tbody>
                  {lateActions.map((a, i) => (
                    <tr key={a.uid ?? a.ref ?? i}>
                      <td className="c-line">{norm(a.line) || '—'}</td>
                      <td className="c-what">{clip(a.action || a.problem || `Action ${a.ref}`)}</td>
                      <td className="c-who">{a.owner || a.who || '—'}</td>
                      <td className="c-due is-bad">{fmtShort(a.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {lateMore > 0 && <p className="exec-more">+{lateMore} more overdue — see the tracker</p>}
          </section>
          )}

          <section className="exec-box exec-box-next">
            <SectionHead n={String(sec + 2)} title="Next steps" sowhat="To do, waiting, and what came of the finished ones" />
            {openTodos.length === 0 ? (
              <p className="exec-empty">Nothing outstanding logged.</p>
            ) : (
              <table className="exec-list">
                <thead><tr><th scope="col">State</th><th scope="col">What</th><th scope="col">Who</th><th scope="col">When</th></tr></thead>
                <tbody>
                  {openTodos.map(t => (
                    <tr key={t.id}>
                      <td><span className={'exec-tag is-' + t.state}>{t.state === 'waiting' ? 'Waiting' : 'To do'}</span></td>
                      <td className="c-what">{clip(t.what || '—', 64)}{t.where ? <span className="c-where"> · {clip(t.where, 24)}</span> : null}</td>
                      <td className="c-who">{t.who || '—'}</td>
                      <td className="c-due">{t.when || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Finished lines and their outcome. A Next step marked Done used to
                drop out of the report entirely, taking the outcome with it. */}
            {doneTodos.length > 0 && (
              <div className="exec-done">
                <p className="exec-done-h">Done — what came of it</p>
                <ul className="exec-done-list">
                  {doneTodos.map(t => (
                    <li key={t.id}>
                      <div className="exec-done-top">
                        <span className="exec-done-what">{clip(t.what || '—', 58)}</span>
                        {t.who && <span className="exec-done-who">{clip(t.who, 18)}</span>}
                      </div>
                      {(t.outcome || t.notes) && (
                        <p className="exec-done-out">{clip(t.outcome || t.notes || '', 110)}</p>
                      )}
                    </li>
                  ))}
                </ul>
                {doneMore > 0 && <p className="exec-more" style={{ color: 'var(--muted)' }}>+{doneMore} more finished</p>}
              </div>
            )}
          </section>

          <section className="exec-box exec-box-snags">
            <SectionHead n={String(sec + 3)} title="Line walk" sowhat={`${openSnags.length} open snag${openSnags.length === 1 ? '' : 's'} filmed on the line`} />
            {openSnags.length === 0 ? (
              <p className="exec-empty">{snags.length ? 'All logged snags are closed.' : 'No walk recorded this week.'}</p>
            ) : (
              <ul className="exec-snags">
                {openSnags
                  .sort((a, b) => a.raisedAt - b.raisedAt)
                  .slice(0, 6)
                  .map(s => (
                    <li key={s.id}>
                      <span className={'exec-snag-dot is-' + s.status} aria-hidden />
                      <span className="exec-snag-p">{clip(s.problem || 'Snag', 66)}</span>
                      <span className="exec-snag-m">
                        {[snagLine.get(s.id), s.owner || 'unassigned',
                          `${Math.max(0, Math.floor((now - s.raisedAt) / dayMs))}d`]
                          .filter(Boolean).join(' · ')}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="exec-box exec-box-wins">
            {/* Not "What worked" any more. This panel can now carry a WORSE verdict in
                front of a client, and a failure sitting under a heading that promises
                success is the kind of small lie that costs a report its credibility. */}
            <SectionHead n={String(sec + 4)} title="What we tried" sowhat="What worked, what didn’t, and the weeks behind each" />
            {showWins.length === 0 ? (
              <p className="exec-empty">No wins logged yet.</p>
            ) : (
              <ul className="exec-wins">
                {showWins.map(w => (
                  <li key={w.id}>
                    <div className="exec-win-top">
                      <span className="exec-win-t">{w.title || 'Win'}</span>
                      {w.proof
                        ? <span className={'exec-win-v is-' + proofFromWin(w.proof).verdict}>
                            {verdictLabel(proofFromWin(w.proof).verdict)}
                          </span>
                        : w.impact && <span className="exec-win-i">{w.impact}</span>}
                    </div>
                    {w.proof && <p className={'exec-win-p is-' + proofFromWin(w.proof).verdict}>
                      {proofSentence(proofFromWin(w.proof))}
                    </p>}
                    {w.story && <p className="exec-win-s">{clip(w.story, 130)}</p>}
                    <p className="exec-win-by">{w.who || 'the team'}{w.where ? ` · ${w.where}` : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="exec-foot">
          <span>{title} · client report · page {pageCount} of {pageCount} — tracker, attention &amp; movement</span>
          <span>Generated {new Date(now).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </section>
      </div>
      </>)}
    </div>
  );
}
