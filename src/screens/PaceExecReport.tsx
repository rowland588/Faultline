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
import { Crumbs } from '../ui/Crumbs';
import { MeasureChart } from '../charts/MeasureChart';
import { usePaceLines } from '../lib/usePaceLines';
import { useProjectPareto } from '../lib/paretoFromLog';
import { useImpacts } from '../lib/useImpacts';
import { IMPACT_WORD } from '../lib/impact';
import { useActions, WHOLE_PROJECT } from '../lib/actions';
import { useProject } from '../lib/useProjects';
import { loadPdfLib, deliverPdf, isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import { pdfFileName } from '../lib/fileName';
import { TreeStatic, useTreeNodes } from './TreeStatic';
import { Sweep } from '../ui/Sweep';
import type { TreeNodeRow } from '../db';
import { listPaceTodos, listPaceWins, getPaceWorkspaceId, snagsForWorkspace,
  listTests, listAssets, listTestItems, type PaceTodoRow, type PaceWinRow } from '../db';
import { ASSET_STATE_WORD, assetStateOf, assetStateOn, hasRun, isOverdue, isSettled, plannedEnd, type Asset, type Test, type TestItem } from '../lib/testing';
import { GATE_WORD, installOf, journeyNow, journeyOf } from '../lib/install';
import { orderStrands, strandsOf, strandWord, type Strand } from '../lib/strands';
import { whoOwes, type Debt } from '../lib/owes';
import { trialCard, headlineNext, verdictLine } from '../lib/trialCard';
import type { Snag } from '../snag/types';
import type { PaceAction } from '../lib/tracker';
import type { FilePages, PaceReportData } from '../lib/paceReportPdf';
import type { Shot } from '../lib/testReport';
import { proofFromWin, proofSentence, verdictLabel } from '../lib/measureProof';
import { paretoView, moveSentence, PARETO_SHEET_ROWS, type ParetoView } from '../lib/paretoView';
import { capacityPlan, capacityReport, fmtN, type CapacityReport } from '../lib/capacity';
import { useMeasures } from '../lib/useMeasures';
import { useMaterials } from '../lib/useMaterials';
import { coveredIn, daysLate, isHere, landsIn, todayISO } from '../lib/materials';
import { usePrograms } from '../lib/usePrograms';
import { standing, slipWords, type PlanMark } from '../lib/standing';
import { layoutPlan, labelGap, planSays } from '../lib/plan';
import { Timeline } from '../ui/Timeline';
import { daysOverdue, fillIn, stateOf, testedIn } from '../lib/programs';
import { lineSeries, say, vsTarget, type LineSeries } from '../lib/measures';
import { withTrackerRows, bindSources, statusOfAction, boundNumber, type NumberSources } from '../lib/treeBind';
import { methodOf, planModel } from '../lib/planModel';
import { board as buildBoard, actionTitle, boardSheets, boardScale, runHeight,
  BOARD_ACT_H, BOARD_ACT_GAP, BOARD_AREA_GAP, BOARD_PX } from '../lib/pillars';

/* ---------- action status, computed once ---------- */
const norm = (s?: string) => (s ?? '').trim();
const isDone = (a: PaceAction) => /^done$/i.test(norm(a.status));
const dueMs = (a: PaceAction) => {
  // A date with no year ("2 Oct", how an action kept in the app prints its
  // due day) parses as 2001 and would read as late; such an action carries its
  // lateness in `flag` instead.
  if (!a.due || !/\d{4}/.test(a.due)) return null;
  const d = Date.parse(a.due);
  return Number.isNaN(d) ? null : d;
};
const isLate = (a: PaceAction, todayStart: number) =>
  !isDone(a) && (/overdue/i.test(a.flag ?? '') || (dueMs(a) != null && (dueMs(a) as number) < todayStart));

/** The tracker records actions against "Line 2 / 7 / 10 / All lines", not the
 *  2A/2B split the ppm uses — so actions are bucketed on the workbook's own
 *  vocabulary. 10 is checked before 2 so "Line 10" never falls into "Line 2". */
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
function TreePage({ rows, numbers, title, scale, sheetH, n, of }: {
  rows: TreeNodeRow[] | null; numbers: NumberSources; title: string; scale: number; sheetH: number; n: number; of: number;
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
            <TreeStatic rows={rows} numbers={numbers} maxW={1520} maxH={860} />
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — the plan</span>
          <span>Kept by hand on the project’s lever tree; the work under it comes off the board, and a box bound to a number takes its colour from the line’s latest reading.</span>
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
              <b>{view.vitalCount}</b> {view.vitalCount === 1 ? 'category carries' : 'categories carry'} <b>{Math.round(view.vitalShare * 100)}%</b> of
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
            : 'Nothing timed in the four weeks before — no movement can be claimed yet.'}</span>
        </footer>
      </section>
    </div>
  );
}

/* WHERE THE LINE IS LIMITED — one ladder per line that has its stations in.
 * Takes the same block the PDF does (lib/capacity capacityReport), the same
 * sheet plan and the same scale, so the page and the file draw one picture. */
function CapacityPage({ report, sheet, title, scale, sheetH, n, of }: {
  report: CapacityReport; sheet: number; title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  const idx = capacityPlan(report)[sheet] ?? [];
  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="Where the line is limited"
              sowhat="each station in one unit — the shortest is what holds the rest back" />
            {idx.map(li => {
              const l = report.lines[li];
              const at = (v: number) => `${Math.min(100, (v / l.top) * 100)}%`;
              return (
                <div key={l.name} className="exec-cp">
                  <div className="exec-cp-h"><b>{l.name}</b>{l.owner && <span>owned by {l.owner}</span>}</div>
                  <p className="exec-cp-says">{l.sentence}</p>
                  <ol className="exec-cp-rows">
                    {l.rows.map(r => (
                      <li key={r.name} className={'exec-cp-row' + (r.limit ? ' is-limit' : '')}>
                        <span className="exec-cp-who"><b>{r.name}</b>{r.limit && <em>limits the line</em>}{r.chain && <small>{r.chain}</small>}{/arrive/.test(r.feed) && <small className="exec-cp-feed">{r.feed}</small>}<small className="exec-cp-detail">{r.detail}</small></span>
                        <span className="exec-cp-track">
                          <span className="exec-cp-bar is-run" style={{ width: at(r.running) }} />
                          <span className="exec-cp-bar is-eff" style={{ width: at(r.effective) }} />
                          {l.target != null && <span className="exec-cp-target" style={{ left: at(l.target) }} />}
                        </span>
                        <span className="exec-cp-val">{fmtN(r.effective)}{r.effective < r.running - 1e-9 && <small>{fmtN(r.running)} running</small>}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="exec-cp-key">
                    {l.unit} a minute · solid bar: with its own stops · pale: at running speed
                    {l.target != null && <> · dashed: target {fmtN(l.target)}</>}
                    {l.more > 0 && <> · +{l.more} more station{l.more === 1 ? '' : 's'} not shown</>}
                  </p>
                  {/* The what-ifs kept beside the line, each judged against it in
                      one sentence AND drawn as its own ladder on the same scale —
                      the client sees the bars move, which station is marked as
                      changed, and where the limit would go. */}
                  {l.whatIfs.length > 0 && (
                    <ul className="exec-cp-whatifs">
                      {l.whatIfs.map(x => (
                        <li key={x.name}>
                          <b>What if {x.name}</b> — {x.says}{x.onBoard && <em> · on the board</em>}
                          {x.changed.length > 0 && <span className="exec-cp-changed">{x.changed.slice(0, 3).join(' · ')}{x.changed.length > 3 ? ` · +${x.changed.length - 3} more` : ''}</span>}
                          {x.rows.length > 0 && (
                            <ol className="exec-cp-rows is-whatif">
                              {x.rows.map(r => (
                                <li key={r.name} className={'exec-cp-row' + (r.limit ? ' is-limit' : '') + (r.changed ? ' is-changed' : '')}>
                                  <span className="exec-cp-who"><b>{r.name}</b>{r.limit && <em>would limit the line</em>}{r.changed && <small className="exec-cp-moved">changed</small>}</span>
                                  <span className="exec-cp-track">
                                    <span className="exec-cp-bar is-run" style={{ width: at(r.running) }} />
                                    <span className="exec-cp-bar is-eff" style={{ width: at(r.effective) }} />
                                    {x.target != null && <span className="exec-cp-target" style={{ left: at(x.target) }} />}
                                  </span>
                                  <span className="exec-cp-val">{fmtN(r.effective)}{r.effective < r.running - 1e-9 && <small>{fmtN(r.running)} running</small>}</span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — where the line is limited</span>
          <span>A steady-state screen: buffers hide short stops, so it shows where to look — not a promise.</span>
        </footer>
      </section>
    </div>
  );
}

/* WHERE THE JOB IS — the screen's copy of the sheet the file prints behind the
 * front page on a 3P job: the sentence, the dates on one axis, and what is
 * outstanding with whose it mostly is. The file printed it and the preview
 * did not, so the client was sent a page nobody had seen, and every page after
 * it was numbered one more than the screen could account for. The same
 * standing() call and the same rows as the file's block. */
function PlanPage({ pl, marks, today, expectedAt, plannedAt, title, scale, sheetH, n, of }: {
  pl: NonNullable<PaceReportData['plan']>; marks: PlanMark[]; today: string;
  expectedAt?: string; plannedAt?: string;
  title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="Where the job is" sowhat={pl.counted} />
            <p className="exec-plan-says">{pl.says}</p>
            {pl.slip && <p className="exec-plan-slip">{pl.slip}</p>}
            <Timeline marks={marks} today={today} expectedAt={expectedAt} plannedAt={plannedAt} />
            {pl.outstanding.length > 0 && (
              <>
                <h3 className="exec-plan-h">What we are waiting on <span>and whose it is</span></h3>
                <table className="exec-list">
                  <thead><tr><th scope="col" /><th scope="col">Open</th><th scope="col">Late</th><th scope="col">Mostly whose</th></tr></thead>
                  <tbody>
                    {pl.outstanding.map(r => (
                      <tr key={r.what}>
                        <th scope="row">{r.what}</th>
                        <td>{r.open}</td>
                        <td className={r.late ? 'is-late' : undefined}>{r.late || '—'}</td>
                        <td>{r.whose || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — where the job is</span>
          <span>Read off the same records the site and the OEM are working to.</span>
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
                        {r.here ? 'In stock' : r.due ? r.due : 'no date'}
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

/* INSTALLATION — the screen's copy of the sheet: one row per machine, its
 * steps as a strip, and the sentence lib/install says about it. The same
 * block the file draws. */
function InstallationPage({ ins, title, scale, sheetH, n, of }: {
  ins: NonNullable<PaceReportData['installation']>;
  title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="The machines — install, and every gate"
              sowhat={[
                `${ins.done} of ${ins.total} steps done`,
                `${ins.machinesIn} of ${ins.machines} machine${ins.machines === 1 ? '' : 's'} in`,
                ins.late > 0 ? `${ins.late} step${ins.late === 1 ? '' : 's'} late` : 'nothing late',
              ].join(' · ')} />
            <div className="ex-in">
              <div className="ex-in-row ex-in-h">
                <span>Machine</span><span>Steps, in the order they happen</span><span>Where it has got to</span>
              </div>
              {ins.rows.map((r, i) => (
                <div key={i} className={'ex-in-row' + (r.late > 0 ? ' is-late' : '')}>
                  <span className="ex-in-m">
                    <b>{r.machine}</b>
                    <span>{[r.oem, r.state].filter(Boolean).join(' · ')}</span>
                    {/* The four gates, as the file draws them. */}
                    {r.journey
                      ? <span className="ex-jr">{r.journey.map(g => <span key={g.label} className={'ex-jr-g is-' + g.tone}>{g.label}</span>)}</span>
                      : <em>{r.state}</em>}
                  </span>
                  {r.steps.length === 0
                    ? <span className="ex-in-none">No install steps planned</span>
                    : (
                      <ol className="in-strip ex-in-strip">
                        {r.steps.map((s, k) => (
                          <li key={k} className={'in-seg is-' + s.tone + (s.next ? ' is-next' : '')}>
                            <span className="in-seg-bar" aria-hidden />
                            <span className="in-seg-t">{s.title}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  <span className="ex-in-says">{r.says}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — the machines</span>
          <span>Steps: green done · red ring late · red hit a problem · blue ring next.  Gates: green done · blue under way · red late.</span>
        </footer>
      </section>
    </div>
  );
}

/* WHO OWES WHAT, BY WHEN — the screen's copy of page 3. The same block the
 * file draws, one card per party: what has to happen, what it hangs off, by
 * when, and the ask. See lib/owes. */
function OwesPage({ o, title, scale, sheetH, n, of }: {
  o: NonNullable<PaceReportData['owes']>;
  title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  const SHOWN = 14;   // the same cap the file uses
  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="Who owes what, by when" sowhat={o.says} />
            <div className={'ow-grid is-' + Math.min(3, o.parties.length === 4 ? 2 : o.parties.length)}>
              {o.parties.map(p => (
                <article key={p.who} className={'ow-card is-' + p.kind + (p.late ? ' is-late' : '')}>
                  <header className="ow-head">
                    <h3>{p.kind === 'nobody' ? 'Nobody named yet — needs an owner' : `${p.who} owes`}</h3>
                    <span className="ow-n">
                      {p.lines.length} thing{p.lines.length === 1 ? '' : 's'}
                      {p.late > 0 && <b> · {p.late} past the day</b>}
                    </span>
                  </header>
                  <ol className="ow-lines">
                    {p.lines.slice(0, SHOWN).map((l, i) => (
                      <li key={i} className={'ow-line is-' + l.tone}>
                        <span className="ow-what">
                          <b>{l.what}</b>
                          <span>{[l.about, l.person].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="ow-when">{l.when}</span>
                      </li>
                    ))}
                  </ol>
                  {p.lines.length > SHOWN && (
                    <p className="exec-more">+{p.lines.length - SHOWN} more — on the Testing, Fixes, Materials and Programs screens</p>
                  )}
                  <p className="ow-ask">
                    <span>Before the next report</span>
                    {p.ask.replace(/^Before the next report: /, '').replace(/^./, c => c.toUpperCase())}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — who owes what, by when</span>
          <span>The same debts as page 1, sorted by who owes them. Every line names what it hangs off.</span>
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
/* PAGE 1, AS THE PDF DRAWS IT — one card per test, with the fixes for it.
 *
 * The preview still drew the old card: Expected / Happened / Found / Next, one
 * test to a card, the re-test a card of its own. The PDF moved to strands —
 * a test, every attempt at it, the fixes for it, and the one thing next — and
 * the screen somebody reads before sending it went on showing the old shape.
 * Built from the same strandsOf() call, so the card on the screen is the card
 * in the file. */
const STRAND_TONE: Record<Strand['state'], string> = { proved: 'ok', failed: 'bad', noVerdict: 'warn', notRun: 'flat' };
const FIX_TONE_CLASS: Record<string, string> = { done: 'ok', failed: 'bad', waiting: 'warn', late: 'bad', due: 'flat' };
const RUN_TONE: Record<string, string> = { passed: 'ok', failed: 'bad', notRun: 'bad', planned: 'warn' };

function StrandCard({ s }: { s: Strand }) {
  const tone = s.state === 'notRun' && s.late ? 'bad' : STRAND_TONE[s.state];
  return (
    <article className={'st-card is-' + tone}>
      <header>
        <h4>{s.name}</h4>
        <span className={'st-badge is-' + tone}>{strandWord(s)}</span>
      </header>
      <p className="tr-meta">{[s.machine, s.withWhom && `with ${s.withWhom}`].filter(Boolean).join(' \u00b7 ')}</p>
      <p className="st-passes"><b>Passes if:</b> <span className={s.provesIf ? '' : 'is-none'}>{s.provesIf || 'nothing agreed in advance'}</span></p>
      <div className="st-rows">
        {s.runs.slice(-4).map((r, i) => (
          <div className="st-row" key={`r${i}`}>
            <span className="st-c1">{r.when || '\u2014'}</span>
            <span className={'st-c2 is-' + (RUN_TONE[r.outcome] ?? 'flat')}>{r.word}</span>
            <span className="st-c3">{r.reason || '\u2014'}</span>
          </div>
        ))}
        {s.fixes.slice(0, 3).map((f, i) => (
          <div className="st-row" key={`f${i}`}>
            <span className="st-c1 is-ink">Fix</span>
            <span className={'st-c2 is-' + (FIX_TONE_CLASS[f.tone] ?? 'flat')}>{f.word}</span>
            <span className="st-c3">{[f.what, f.who || 'nobody yet', f.when].filter(Boolean).join(' \u00b7 ')}</span>
          </div>
        ))}
        {s.fixes.length > 3 && <p className="st-more">+{s.fixes.length - 3} more fixes — see who owes what</p>}
      </div>
      {s.next && (
        <div className={'st-row st-next' + (s.next.late ? ' is-late' : '')}>
          <span className="st-c1 is-ink">Next</span>
          <span className="st-c2 is-bad">{s.next.late ? 'LATE' : ''}</span>
          <span className="st-c3"><b>{[s.next.what, s.next.who || 'nobody yet', s.next.when].filter(Boolean).join(' \u00b7 ')}</b></span>
        </div>
      )}
    </article>
  );
}

function TrialsBox({ t }: { t: PaceReportData['trials'] }) {
  /* Tests only, in the order the PDF prints them — late first. A fix on its
     own is page 3's business, as it is in the file. */
  const strands = t ? orderStrands(strandsOf(t.rows)).filter(x => x.kind === 'test') : [];
  if (strands.length === 0) {
    return (
      <section className="exec-box">
        <SectionHead n="1" title="What we are proving" sowhat="nothing planned yet" />
        <p className="exec-empty">No test has been planned on this job yet — plan the first one under Testing.</p>
      </section>
    );
  }
  const SHOWN = 6;
  const shown = strands.slice(0, SHOWN);
  return (
    <section className="exec-box">
      <SectionHead n="1" title="What we are proving" sowhat="" />
      <div className={'st-cards' + (shown.length <= 3 ? ' is-one' : '')}>
        {shown.map((s, i) => <StrandCard key={`${s.name}-${i}`} s={s} />)}
      </div>
      {strands.length > shown.length && (
        <p className="exec-more">+{strands.length - shown.length} more on the sheet behind this one</p>
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
            {/* The file's columns: one, read down, while the list is short;
                two halves once it is long. The page dealt rows out alternately
                into two columns, so a proved program sat above one still on
                the machine and the order the file prints was lost. */}
            <div className="pg-cols">
              {(rows.length > 16 ? [rows.slice(0, Math.ceil(rows.length / 2)), rows.slice(Math.ceil(rows.length / 2))] : [rows]).map((colRows, col) => (
                <table className="pg-list" key={col}>
                  <thead>
                    <tr>
                      <th scope="col">Program</th>
                      <th scope="col">What it runs</th>
                      <th scope="col">Where it has got to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colRows.map(r => (
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
    n: 'Not started', w: 'In progress', a: 'Waiting', r: 'Overdue', g: 'Done',
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
              sowhat="One card per line · every action on the project’s board" />
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
            ? `${unplaced} action${unplaced === 1 ? '' : 's'} not given a column yet`
            : 'Every action is on the board.'}</span>
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

  // The Pareto sheet still comes off an upload where one exists; the actions
  // are the project's own, kept in the app (lib/actions.ts).
  const ax = useActions(projectId);
  // Did it work? — each closed action against the line's numbers (lib/impact).
  const { impacts } = useImpacts(projectId);
  // The Pareto from the stops timed in the app — no upload (lib/paretoFromLog).
  const pareto = useProjectPareto(projectId);
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

  /* THE PAGE NUMBERS COME FROM THE FILE. After every render the report's data
     is compared with the last one drawn; when it has changed, the PDF is drawn
     off-screen (no pictures — they move no page break) and each preview page
     takes its number from the page its panel title landed on. Until that
     comes back, the preview's own count stands in. */
  const [file, setFile] = useState<FilePages | null>(null);
  const fileData = useRef<PaceReportData | null>(null);
  const fileKey = useRef('');
  useEffect(() => {
    const data = fileData.current;
    if (!data) return;
    const key = JSON.stringify({ ...data, now: 0 });
    if (key === fileKey.current) return;
    fileKey.current = key;
    setTimeout(() => {
      if (fileKey.current !== key) return;
      void (async () => {
        try {
          const { jsPDF } = await loadPdfLib();
          const { readPages } = await import('../lib/paceReportPdf');
          const read = readPages(new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' }), data);
          if (fileKey.current === key) setFile(read);
        } catch { /* the preview's own count stands */ }
      })();
    }, 250);
  });
  const loading = pareto.loading || ax.loading || ppm.loading || projLoading || todos == null || wins == null || snags == null;

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
      /* A line's deck carries the actions written for every line as well, the
         way its board sheet and the line's own Actions list do. */
      setTodos((await listPaceTodos(projectId)).filter(t => !lineId || t.lineId === lineId || !t.lineId));
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
      /* The pictures come off the device's store, so they are fetched before
         the drawer runs — four per record, the same first four the card
         shows. A record with none costs nothing here. */
      const { shotsFor, shotKey, pinShot } = await import('../lib/testReport');
      const shots = new Map<string, Shot[]>();
      for (const t of trialRows) {
        const keys = mediaOf(t).map(shotKey).filter((k): k is string => !!k);
        /* A fix pinned on the line leads with where it is: the walk frame, dot drawn in. */
        const where = await pinShot(t);
        const rest = keys.length ? await shotsFor(keys, where ? 3 : 4) : [];
        const all = where ? [where, ...rest] : rest;
        if (all.length) shots.set(t.id, all);
      }
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
      drawPaceReport(pdf, reportData(shots));
      // The file lands in someone's inbox on its own, so its NAME has to say
      // which project it is — "report.pdf" from three projects is three files
      // nobody can tell apart.
      const name = line ? `${project?.name ?? 'Project'} ${line.name}` : (project?.name ?? 'Project');
      const how = await deliverPdf(pdf, pdfFileName(name, 'client report', todayISO()));
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

  /* A deck for a line that has gone is a dead link, not the whole project's
     report under that line's address — which is what it silently became. */
  if (lineId && !line) {
    return (
      <div className="exec-report">
        <div className="exec-bar no-print">
          <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}`)}>← Back</button>
        </div>
        <p className="sub" style={{ padding: '40px 40px 12px' }}>That line isn’t on {project.name} any more, so it has no deck of its own.</p>
        <button className="btn btn-primary" style={{ margin: '0 40px' }} onClick={() => nav(`/pace-report?project=${projectId}`)}>The project’s client report</button>
      </div>
    );
  }

  const now = Date.now();
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  // A line's deck shows that line's slice of the tracker; the project's shows
  // the lot.
  const actions = line ? ax.actions.filter(a => a.lineId === line.id || a.line === WHOLE_PROJECT) : ax.actions;

  /* The plan on the wall and the plan on the paper have to be the same plan.
   * A condition bound to the tracker grows its actions at draw time, so the
   * report runs the identical derivation the editor does rather than printing
   * only the boxes that happen to be stored. */
  const numSources: NumberSources = { measures: nums.measures, periods: nums.periods, targets: nums.targets, readings: nums.readings };
  const fullTree = withTrackerRows(treeRows ?? [], bindSources(ax.actions, todos ?? [], ppm.lines, numSources));

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

  /* The Pareto, when the project runs one and something has been timed on its
     lines in the last four weeks — against the four before. */
  const pView: ParetoView | null = !line && project?.pareto && pareto.now
    ? paretoView(pareto.now, pareto.before)
    : null;
  const hasPareto = !!pView;
  /* WHERE EACH LINE IS LIMITED — the stations kept on the lines, the same block
     the PDF is handed. A line's own deck carries only that line. */
  const capBlock: CapacityReport | undefined = capacityReport(line ? [line] : ppm.lines);
  const capSheetCount = capBlock ? capacityPlan(capBlock).length : 0;
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
    /* Tests and fixes. An install step is not a trial: it is owed on page 3,
       under whoever is doing it, and drawn in its own lane on the plan. */
    .filter(t => !t.deletedAt && t.kind !== 'install')
    .slice()
    .sort((a, b) => {
      const ap = !hasRun(a), bp = !hasRun(b);
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
  /* A record's pictures: its own, then the ones on what was found under it. */
  const mediaOf = (t: Test) => [
    ...(t.media ?? []),
    ...testItems.filter(i => i.testId === t.id && !i.deletedAt).flatMap(i => i.media ?? []),
  ];
  const trialsBlockWith = (shots?: Map<string, Shot[]>): PaceReportData['trials'] => line || trialRows.length === 0 ? undefined : {
    planned: trialRows.filter(t => !hasRun(t)).length,
    passed: trialRows.filter(t => t.outcome === 'passed').length,
    failed: trialRows.filter(t => t.outcome === 'failed').length,
    notRun: trialRows.filter(t => t.outcome === 'notRun').length,
    rows: trialRows.map(t => {
      const c = trialCard(t, tests, testItems, machines);
      const nx = headlineNext(c);
      return {
        id: t.id,
        fromId: t.fromTestId,
        kind: c.kind === 'fix' ? 'fix' as const : 'test' as const,
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
        /* The day as a date, for page 3's ordering. A run waiting on its
           verdict is owed SINCE the day it ran, not the day it was booked. */
        on: hasRun(t) ? (t.ranOn ?? t.plannedFor) : t.plannedFor,
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
          /* Its OWN lateness, off its own ISO date — not its parent's. */
          late: !nx.done && !!nx.due && nx.due < todayISO(),
          on: nx.due,
        } : undefined,
        nextMore: Math.max(0, c.next.length - 1),
        follows: c.follows,
        ledTo: c.ledTo,
        shots: shots?.get(t.id),
        photos: mediaOf(t).length,
      };
    }),
  };
  /* The screen's copy, without pictures: the preview draws thumbnails off
     the records themselves. */
  const trialsBlock = trialsBlockWith();

  /* A JOB WITH NO TRACKER IS NOT A TRACKER JOB.
     The report was Project Pace's, and every project got its shape: a ppm sheet,
     a 3P board, an action tracker. A commissioning job has none of those, so it
     printed three pages of empty scaffolding and buried the two things it does
     carry behind them. What prints is now what the project HAS. */
  /* A 3P or tree job is reported as one from its first day — an empty one
     printed the stage-gate front page ("Tests being proved on this job",
     "plan the first one under Testing") until something was on its board. */
  const hasTracker = (!!project && planModel(project) !== 'commissioning') || actions.length > 0 || nums.measures.length > 0;

  /* WHO OWES WHAT, BY WHEN — page 3. Every line read off a record the pages
     before it already draw: the strands' owed lines (so page 1 and page 3
     cannot disagree), the materials not in, the programs not proved, the
     machines not running, and the observations nobody has decided on. Left off
     a line's own deck, like the plan: the debts belong to the job. */
  const owesBlock = ((): PaceReportData['owes'] => {
    if (line || !project?.commissioning) return undefined;
    const debts: Debt[] = [];
    for (const s of trialsBlock ? strandsOf(trialsBlock.rows) : []) {
      for (const o of s.owed) {
        debts.push({ who: o.owner, what: o.what, about: s.name, on: o.on, late: o.late, since: o.since });
      }
    }
    /* INSTALL STEPS still to do, under whoever is doing them — the fitter's
       name resolves to the supplier when it is theirs, and to the site when
       it is not, by the same rule as a fix. */
    for (const t of tests) {
      if (t.deletedAt || t.kind !== 'install' || isSettled(t)) continue;
      /* A set-up step or a hand-over item says which gate it is. */
      debts.push({ who: t.withWhom ?? '', what: t.gate ? `${GATE_WORD[t.gate]}: ${t.title}` : t.title,
        about: machines.find(a => a.id === t.assetId)?.name ?? 'the line',
        on: plannedEnd(t), late: isOverdue(t, today) });
    }
    for (const m of mats.materials) {
      if (m.deletedAt || isHere(m)) continue;
      debts.push({ who: m.from ?? '', what: m.what, about: 'to arrive on site',
        on: m.due, late: !!m.due && m.due < today });
    }
    for (const pr of progs.programs) {
      if (pr.deletedAt || stateOf(pr) === 'proved') continue;
      debts.push({ who: pr.from ?? '', what: `Prove ${pr.what}`,
        about: machines.find(a => a.id === pr.assetId)?.name ?? 'program',
        on: pr.testOn, late: daysOverdue(pr, today) != null });
    }
    for (const a of machines) {
      if (a.deletedAt || a.state === 'running') continue;
      const landed = !!a.onSiteOn || a.state !== 'awaited';
      debts.push({ who: a.oem ?? '', what: landed ? 'Get it running' : 'Get it on site', about: a.name,
        on: landed ? undefined : a.dueOn, late: !landed && !!a.dueOn && a.dueOn < today });
    }
    /* No "decide on N observations" lines: an observation is a note now, and
       whatever needs doing about one is a fix — owed above, by whoever does it. */
    if (debts.length === 0) return undefined;
    const suppliers = [
      ...machines.map(a => a.oem), ...mats.materials.map(m => m.from),
      /* A TEST's "done with" names the other side. A FIX's is who is doing it,
         and that is as often Dave on nights as it is the OEM — counting it made
         Dave a company of his own on the client's page. */
      ...progs.programs.map(pr => pr.from), ...tests.filter(t => (t.kind ?? 'test') === 'test').map(t => t.withWhom),
    ].filter((x): x is string => !!x);
    return whoOwes(debts, { suppliers, today, day: iso => fmtShort(iso) });
  })();

  /* INSTALLATION — how far each machine has got, off lib/install: the same
     sentence the Install screen prints. Only when the job keeps install steps.
     A machine already running with no steps is left off: it has nothing to
     say about installing. */
  const installBlock = ((): PaceReportData['installation'] => {
    if (line || !project?.commissioning) return undefined;
    const liveMachines = machines.filter(a => !a.deletedAt).sort((a, b) => a.sort - b.sort);
    /* EVERY MACHINE, now that each row carries its journey through the gates:
       one already running with no install steps still has a place in Set up,
       Commission and Hand over. The line's own row only when it has steps. */
    const views = [...liveMachines.map(a => installOf(a, tests, testItems, today)), installOf(undefined, tests, testItems, today)]
      .filter(v => v.total > 0 || !!v.asset);
    if (views.length === 0) return undefined;
    const onMachines = views.filter(v => v.asset);
    return {
      done: views.reduce((n, v) => n + v.done, 0),
      total: views.reduce((n, v) => n + v.total, 0),
      machinesIn: onMachines.filter(v => v.asset && ['installed', 'running'].includes(assetStateOf(v.asset))).length,
      machines: onMachines.length,
      late: views.reduce((n, v) => n + v.late, 0),
      rows: views.map(v => {
        const st = v.asset ? assetStateOf(v.asset) : undefined;
        const on = v.asset ? assetStateOn(v.asset) : undefined;
        return {
          machine: v.asset?.name ?? 'The line itself',
          oem: v.asset?.oem || undefined,
          state: st ? `${ASSET_STATE_WORD[st]}${on ? ` · ${fmtShort(on)}` : ''}` : 'Across the line',
          steps: v.steps.map(s => ({ title: s.step.title, tone: s.tone, next: s.next })),
          says: v.says,
          late: v.late,
          ...(v.asset ? (() => {
            const j = journeyOf(v.asset, tests, testItems, today, progs.programs);
            return { journey: j.map(g => ({ label: g.label, tone: g.tone })), at: journeyNow(j) };
          })() : {}),
        };
      }),
    };
  })();

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

  /* One order, counted once. Pace, then where the time is going, then the plan,
     then the work, then the detail — and every page number falls out of the
     same arithmetic the pages themselves are rendered from. */
  /* Who owes what sits directly behind the front page on a commissioning job,
     as it does in the file. */
  const hasOwes = !hasTracker && !!owesBlock && owesBlock.parties.length > 0;
  const hasInstall = !!installBlock;
  const hasMaterials = !!materialsBlock && materialsBlock.rows.length > 0;
  const hasPrograms = !!programsBlock && programsBlock.rows.length > 0;
  /* The detail page is the tracker's, as it is in the file: a commissioning
     job gets no tracker sheet there ("a different product's report stapled to
     the back of the client's"), and the preview printed one anyway — a page
     on screen the client would never be sent. */
  /* The actions, attention & movement sheet only when it has something to say:
     with no actions, no wins and nothing open on the walk it was six empty
     frames. Rowland: one sentence instead — the front page's foot says it. */
  const hasDetail = hasTracker && (actions.length > 0 || (wins?.length ?? 0) > 0
    || (snags ?? []).some(sn => sn.status !== 'closed'));
  /* The preview's own count, used until the file has been read — see above. */
  /* The file prints WHERE THE JOB IS as its own sheet behind the front page on
     a tracker's report (on a commissioning one it rides under the tests). */
  const hasPlanSheet = hasTracker && !!planBlock;
  const guess = (() => {
    const plan = 2;
    const owes = plan + (hasPlanSheet ? 1 : 0);
    const install = owes + (hasOwes ? 1 : 0);
    const pareto = install + (hasInstall ? 1 : 0);
    const capacity = pareto + (hasPareto ? 1 : 0);
    const materials = capacity + capSheetCount;
    const programs = materials + (hasMaterials ? 1 : 0);
    const tree = programs + (hasPrograms ? 1 : 0);
    const board = tree + (hasTree ? 1 : 0);
    const of = 1 + (hasPlanSheet ? 1 : 0) + (hasOwes ? 1 : 0) + (hasInstall ? 1 : 0) + (hasDetail ? 1 : 0) + (hasPareto ? 1 : 0) + capSheetCount
      + (hasMaterials ? 1 : 0) + (hasPrograms ? 1 : 0) + (hasTree ? 1 : 0) + boardPlan.length;
    return { plan, owes, install, pareto, capacity, materials, programs, tree, board, of };
  })();
  /* Inline rather than imported: the drawing module is loaded only when needed. */
  const onFile = (re: RegExp, fallback: number, notOn?: number): number =>
    (file ? file.texts.find(t => t.page !== notOn && re.test(t.text))?.page ?? fallback : fallback);
  const planPageNo = onFile(/^Where the job is$/, guess.plan);
  const owesPageNo = onFile(/^Who owes what, by when/, guess.owes);
  const installPageNo = onFile(/^Installation/, guess.install);
  const paretoPageNo = onFile(/^Where the time is going/, guess.pareto);
  const capacityPageNo = onFile(/^Where the line is limited/, guess.capacity);
  // Not the plan's page: its table is headed "What we are waiting on" too.
  const materialsPageNo = onFile(/^What we are waiting on/, guess.materials, hasPlanSheet ? planPageNo : undefined);
  const programsPageNo = onFile(/^What the machine can run/, guess.programs);
  const treePageNo = onFile(/^The plan$/, guess.tree);
  const boardPageNo = onFile(/^3P Board/, guess.board);
  const pageCount = file?.of ?? guess.of;
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
      : [lineList, nums.measures[0]?.name ?? 'the numbers', 'the board', 'the line walk']
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

  /* When it is due: the date on the board where there is one, the free words
     where there is not. The column printed "—" against every action once the
     date moved onto the board. */
  const whenOf = (t: PaceTodoRow) => (t.due ? fmtShort(t.due) : t.when) || '—';
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
    const mine = ax.actions.filter(a => a.lineId === l.id);
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
  // Every action kept in the app is on a project line or on every line, so
  // there is no area the project has not heard of.
  const extraAreas: string[] = [];
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

  const reportData = (shots?: Map<string, Shot[]>): PaceReportData => ({
    now,
    // The lever tree, flat. Only on the PROJECT's report: a line's own deck is
    // that line's page, and the whole project's plan on it would be somebody
    // else's work printed under their name.
    board: boardRows,
    boardUnplaced: boardData.unplaced.length,
    /* The same view the screen draws, flattened to numbers and sentences — the
       drawer never looks at the DOM, so this is the whole contract. */
    capacity: capBlock,
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
    /* A box bound to a number carries the figure and the state in words, so the
       PDF says "52 vs 44 ppm · Behind target" exactly as the screen does. */
    tree: line || !project?.leverTree ? [] : fullTree.map(n => {
      const num = boundNumber(n.bind, numSources);
      return {
        id: n.id, parentId: n.parentId, text: n.text, rag: n.rag, sort: n.sort,
        number: num?.figure, state: num?.words,
      };
    }),
    // A line's deck is titled for the LINE and led by its owner — it is that
    // person's page to hand over. The project's is titled for the project.
    title, lead, leadRole,
    /* The improvement board's lede — "L7 · L8 — tests and fixes, what we are
       waiting on…" — named the lines of a tracker a commissioning job does not
       keep. The commissioning report says what it is. */
    subtitle: hasTracker ? subtitle : 'What we are proving · where the job is · who owes what, by when',
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
    trials: shots ? trialsBlockWith(shots) : trialsBlock,
    plan: planBlock,
    owes: owesBlock,
    installation: installBlock,
    tracker: hasTracker,
    detail: hasDetail,
    method: project ? methodOf(project).label : undefined,
    lateActions: lateActions.map(a => ({
      line: norm(a.line) || '—',
      what: a.action || a.problem || `Action ${a.ref}`,
      owner: a.owner || a.who || '—',
      due: fmtShort(a.due),
    })),
    lateMore,
    completed: doneTodos.map(t => {
      const im = impacts.get(t.id);
      return {
        what: t.what || '—',
        who: t.who || '',
        outcome: t.outcome || t.notes || '',
        proof: im && im.state !== 'none' ? { word: IMPACT_WORD[im.state], words: im.words, state: im.state } : undefined,
      };
    }),
    completedMore: doneMore,
    todos: openTodos.map(t => ({
      state: t.state === 'waiting' ? 'waiting' : 'todo',
      what: [t.what || '—', t.where].filter(Boolean).join(' · '),
      who: t.who || '—',
      when: whenOf(t),
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
  // What the off-screen read of the file draws — see `file` above.
  fileData.current = reportData();

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
            {saving ? 'Building…' : 'PDF'}
          </button>
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
                : `${project ? methodOf(project).label : hasTracker ? '3P' : 'Stage gate'} · client report`}
            </p>
            <h1 className="exec-title">{title}</h1>
            <p className="exec-lede">{hasTracker ? subtitle : 'What we are proving · where the job is · who owes what, by when'}</p>
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
            {/* THE PDF'S OWN TILES. These said Booked / Passed or fixed /
                Programs proved / Films late while the file said Tests /
                Proved / Failed / Waiting / Past the day — two sets of numbers
                for one job, a tap apart. Same strands, same owes total. */}
            {(() => {
              const heads = orderStrands(strandsOf(trialsBlock?.rows ?? [])).filter(x => x.kind === 'test');
              const n = (st: Strand['state']) => heads.filter(x => x.state === st).length;
              const reBooked = heads.filter(x => x.state === 'failed' && x.next?.what === 'Re-test').length;
              const pastDay = owesBlock?.parties.reduce((k, pt) => k + pt.late, 0) ?? 0;
              return (<>
                <Stat n={String(heads.length)} label="Tests" sub="being proved on this job" tone="flat" />
                <Stat n={String(n('proved'))} label="Proved" sub={`of ${heads.length}`} tone={n('proved') > 0 ? 'good' : 'flat'} />
                <Stat n={String(n('failed'))} label="Failed" sub={n('failed') ? `${reBooked} with a re-test booked` : 'none'} tone={n('failed') > 0 ? 'bad' : 'flat'} />
                <Stat n={String(n('noVerdict') + n('notRun'))} label="Waiting" sub={`${n('noVerdict')} no verdict \u00b7 ${n('notRun')} not run`} tone={n('noVerdict') + n('notRun') > 0 ? 'warn' : 'flat'} />
                <Stat n={String(pastDay)} label="Past the day" sub="owed across the job — see who owes what" tone={pastDay > 0 ? 'bad' : 'flat'} />
                {installBlock && installBlock.total > 0 && (
                  <Stat n={`${installBlock.machinesIn}/${installBlock.machines}`} label="Installed"
                    sub={`${installBlock.done} of ${installBlock.total} install steps done`}
                    tone={installBlock.late > 0 ? 'bad' : installBlock.done === installBlock.total ? 'good' : 'flat'} />
                )}
                {openSnags.length > 0 && <Stat n={String(openSnags.length)} label="Open evidence" sub="from the line walk" tone="warn" />}
              </>);
            })()}
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
            {/* Only the abnormal number carries colour (CLAUDE.md, visual management):
                a zero is grey, and "17% complete" is the work, not good news. */}
            <Stat n={`${pctDone}%`} label="Actions complete" sub={`${complete} of ${actions.length}`} tone="flat" />
            <Stat n={String(openTotal)} label="Still open" sub="in flight" tone="flat" />
            <Stat n={String(late)} label="Overdue" sub="past their date" tone={late > 0 ? 'bad' : 'flat'} />
            <Stat n={String(openSnags.length)} label="Open evidence" sub="from the line walk" tone={openSnags.length > 0 ? 'warn' : 'flat'} />
            <Stat n={String(winsThisWeek.length)} label="Wins this week" sub="what worked" tone={winsThisWeek.length > 0 ? 'good' : 'flat'} />
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
          <span>{title} · client report · page 1 of {pageCount} — {hasTracker ? 'the numbers' : 'what we are proving'}</span>
          <span>{hasTracker
            ? (hasDetail ? 'Every action is kept on the project’s board.' : 'No actions on the board yet.')
            : 'One card per test, with the fixes for it. Who owes what, in full, is further on.'}</span>
        </footer>
      </section>
      </div>

      {hasPlanSheet && planBlock && planStanding && (
        <PlanPage pl={planBlock} marks={planStanding.plan} today={today} expectedAt={project?.expectedAt} plannedAt={project?.plannedAt}
          title={title} scale={scale} sheetH={SHEET_H} n={planPageNo} of={pageCount} />
      )}

      {hasOwes && owesBlock && (
        <OwesPage o={owesBlock} title={title} scale={scale} sheetH={SHEET_H} n={owesPageNo} of={pageCount} />
      )}

      {installBlock && (
        <InstallationPage ins={installBlock} title={title} scale={scale} sheetH={SHEET_H} n={installPageNo} of={pageCount} />
      )}

      {/* ================= PAGE 2 — THE PLAN ================= */}
      {pView && <ParetoPage view={pView} title={title} scale={scale} sheetH={SHEET_H} n={paretoPageNo} of={pageCount} />}
      {capBlock && Array.from({ length: capSheetCount }, (_, i) => (
        <CapacityPage key={i} report={capBlock} sheet={i} title={title} scale={scale} sheetH={SHEET_H} n={capacityPageNo + i} of={pageCount} />
      ))}
      {materialsBlock && (
        <MaterialsPage m={materialsBlock} title={title} scale={scale} sheetH={SHEET_H}
          n={materialsPageNo} of={pageCount} />
      )}
      {programsBlock && (
        <ProgramsPage p={programsBlock} title={title} scale={scale} sheetH={SHEET_H}
          n={programsPageNo} of={pageCount} />
      )}
      {!line && project?.leverTree && <TreePage rows={fullTree} numbers={numSources} title={title} scale={scale} sheetH={SHEET_H} n={treePageNo} of={pageCount} />}
      {/* No note about a missing board sheet any more: it explained a 3P
          column in a workbook that is no longer uploaded. The board's own
          "not on the board yet" list is where an unsorted action is fixed. */}
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
            <SectionHead n={String(sec + 0)} title={line ? 'The actions' : 'The actions & the lines'}
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
                  {/* No Next column: a line's next steps ARE its actions now. */}
                  <th scope="col">Evidence</th><th scope="col">Wins</th>
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
            {lateMore > 0 && <p className="exec-more">+{lateMore} more overdue — see the board</p>}
          </section>
          )}

          <section className="exec-box exec-box-next">
            <SectionHead n={String(sec + 2)} title="Who is doing what" sowhat="To do, waiting, and what came of the finished ones" />
            {openTodos.length === 0 ? (
              <p className="exec-empty">Nothing outstanding.</p>
            ) : (
              <table className="exec-list">
                <thead><tr><th scope="col">State</th><th scope="col">What</th><th scope="col">Who</th><th scope="col">When</th></tr></thead>
                <tbody>
                  {openTodos.map(t => (
                    <tr key={t.id}>
                      <td><span className={'exec-tag is-' + t.state}>{t.state === 'waiting' ? 'Waiting' : 'To do'}</span></td>
                      <td className="c-what">{clip(t.what || '—', 64)}{t.where ? <span className="c-where"> · {clip(t.where, 24)}</span> : null}</td>
                      <td className="c-who">{t.who || '—'}</td>
                      <td className="c-due">{whenOf(t)}</td>
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
                      {(() => {
                        const im = impacts.get(t.id);
                        return im && im.state !== 'none'
                          ? <p className={'exec-done-proof is-' + im.state}><b>{IMPACT_WORD[im.state]}</b> {im.words}</p>
                          : null;
                      })()}
                    </li>
                  ))}
                </ul>
                {doneMore > 0 && <p className="exec-more" style={{ color: 'var(--muted)' }}>+{doneMore} more finished</p>}
              </div>
            )}
          </section>

          <section className="exec-box exec-box-snags">
            <SectionHead n={String(sec + 3)} title="Line walk" sowhat={`${openSnags.length} open on the walk`} />
            {openSnags.length === 0 ? (
              <p className="exec-empty">Nothing open on the walk.</p>
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
              <p className="exec-empty">Nothing logged yet.</p>
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
          <span>{title} · client report · page {pageCount} of {pageCount} — actions, attention &amp; movement</span>
          <span>Generated {new Date(now).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </section>
      </div>
      </>)}
    </div>
  );
}
