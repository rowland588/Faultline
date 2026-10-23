/* THE A3'S PAGES ON SCREEN (docs/STEADY.md S4: a page's panels apart from the page) — each sheet of
 * the 6M / lever tree client report as the screen lists it beside the paper: the tree, the Pareto,
 * the capacity, the plan, the materials, the installation, who owes what, the trials, the programs,
 * the board. Read by screens/PaceExecReport; drawn on paper by lib/paceReportPdf. */















import { TreeStatic } from './TreeStatic';

import type { TreeNodeRow } from '../db';



import { orderStrands, strandsOf, strandWord, type Strand } from '../lib/strands';



import type { PaceAction } from '../lib/actionShapes';
import type { BoardSheetDrawn, PaceReportData } from '../lib/paceReportPdf';


import {  moveSentence, PARETO_SHEET_ROWS, type ParetoView } from '../lib/paretoView';
import { capacityPlan, fmtN, type CapacityReport } from '../lib/capacity';




import {   type PlanMark } from '../lib/standing';

import { Timeline } from '../ui/Timeline';


import {      type NumberSources } from '../lib/treeBind';

import { PILLARS, BOARD_ACT_H, BOARD_ACT_GAP, BOARD_AREA_GAP, BOARD_PX } from '../lib/pillars';









/* ---------- action status, computed once ---------- */
export const norm = (s?: string) => (s ?? '').trim();
export const isDone = (a: PaceAction) => /^done$/i.test(norm(a.status));
export const dueMs = (a: PaceAction) => {
  // A date with no year ("2 Oct", how an action kept in the app prints its
  // due day) parses as 2001 and would read as late; such an action carries its
  // lateness in `flag` instead.
  if (!a.due || !/\d{4}/.test(a.due)) return null;
  const d = Date.parse(a.due);
  return Number.isNaN(d) ? null : d;
};
export const isLate = (a: PaceAction, todayStart: number) =>
  !isDone(a) && (/overdue/i.test(a.flag ?? '') || (dueMs(a) != null && (dueMs(a) as number) < todayStart));

/** The tracker records actions against "Line 2 / 7 / 10 / All lines", not the
 *  2A/2B split the ppm uses — so actions are bucketed on the workbook's own
 *  vocabulary. 10 is checked before 2 so "Line 10" never falls into "Line 2". */
export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
/* en-GB, not the viewer's locale. Every date the app writes elsewhere is
   British (see `nice` on the materials and programs screens), and this one was
   the machine's guess — so the same film read "25 Sept" on the screen and
   "Sep 25" on the report drawn from the very same row. Worse, a PDF carries
   whatever the machine that generated it happened to think, to a reader who
   had no say in it. */
export const fmtShort = (s?: string) => {
  if (!s) return '—';
  const d = Date.parse(s);
  return Number.isNaN(d) ? s : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
export const dayMs = 86_400_000;
/** The exec cut: one line per row, not the full workbook essay. */
export const clip = (s: string, n = 96) => (s.length > n ? s.slice(0, n).trimEnd() + '…' : s);

/* The sheet is laid out at a fixed size in the exact proportions of A3
 * landscape, so the captured image fills the PDF page edge to edge with no
 * letterboxing and nothing distorted. On screen the same sheet is scaled down
 * to fit the window, which makes the preview a true picture of the download. */
export const SHEET_W = 1600;
export const SHEET_H = 1131;

export function Stat({ n, label, sub, tone }: { n: string; label: string; sub?: string; tone?: 'good' | 'warn' | 'bad' | 'flat' }) {
  return (
    <div className={'exec-stat is-' + (tone ?? 'flat')}>
      <span className="exec-stat-n">{n}</span>
      <span className="exec-stat-l">{label}</span>
      {sub && <span className="exec-stat-s">{sub}</span>}
    </div>
  );
}

export function SectionHead({ n, title, sowhat }: { n: string; title: string; sowhat: string }) {
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
export function TreePage({ rows, numbers, title, scale, sheetH, n, of }: {
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
export function ParetoPage({ view, title, scale, sheetH, n, of }: {
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
export function CapacityPage({ report, sheet, title, scale, sheetH, n, of }: {
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
                  {l.vSays && <p className="exec-cp-says exec-cp-v">{l.vSays}</p>}
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
export function PlanPage({ pl, marks, today, expectedAt, plannedAt, title, scale, sheetH, n, of }: {
  pl: NonNullable<PaceReportData['plan']>; marks: PlanMark[]; today: string;
  expectedAt?: string; plannedAt?: string;
  title: string; scale: number; sheetH: number; n: number; of: number;
}) {
  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title="Where the project is" sowhat={pl.counted} />
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
          <span>{title} · client report · page {n} of {of} — where the project is</span>
          <span>Read off the same records the site and the OEM are working to.</span>
        </footer>
      </section>
    </div>
  );
}

/* WHAT WE ARE WAITING ON gets its own sheet, drawn the way the plan it comes
 * off is drawn: rows of what we need, weeks across the top, filled from the week
 * each one lands — indigo while it is coming, green once it is in. A list of
 * dates would fit in a corner of another page — the grid is here because
 * coverage is a SHAPE, and a client reads the block without reading a date.
 *
 * It takes the same block the PDF does, so the page and the file cannot shade
 * different weeks. */
export function MaterialsPage({ m, title, scale, sheetH, n, of }: {
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
                          className={'mt-cell' + (on ? ' is-on' : '') + (on && r.here ? ' is-here' : '') + (r.lands[i] ? ' is-lands' : '')}>
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
          <span>Indigo from the week it is due · green once it is in.</span>
        </footer>
      </section>
    </div>
  );
}

/* INSTALLATION — the screen's copy of the sheet: one row per machine, its
 * steps as a strip, and the sentence lib/install says about it. The same
 * block the file draws. */
export function InstallationPage({ ins, title, scale, sheetH, n, of }: {
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
          <span>Steps: green done · red ring late · red hit a problem · teal ring next.  Gates: green done · teal under way · red late.</span>
        </footer>
      </section>
    </div>
  );
}

/* WHO OWES WHAT, BY WHEN — the screen's copy of page 3. The same block the
 * file draws, one card per party: what has to happen, what it hangs off, by
 * when, and the ask. See lib/owes. */
export function OwesPage({ o, title, scale, sheetH, n, of }: {
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
                      {p.late > 0 && <b> · {p.late} late</b>}
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

export function TrialsBox({ t }: { t: PaceReportData['trials'] }) {
  /* Tests only, in the order the PDF prints them — late first. A fix on its
     own is page 3's business, as it is in the file. */
  const strands = t ? orderStrands(strandsOf(t.rows)).filter(x => x.kind === 'test') : [];
  if (strands.length === 0) {
    return (
      <section className="exec-box">
        <SectionHead n="1" title="What we are proving" sowhat="nothing planned yet" />
        <p className="exec-empty">No test has been planned on this project yet — plan the first one under Testing.</p>
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
export const STATE_LABEL = { needed: 'Not written', onMachine: 'On the machine', proved: 'Proved' } as const;

export function ProgramsPage({ p, title, scale, sheetH, n, of }: {
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

/* THE BOARD gets its own sheet, for the same reason the tree did: the SHAPE is
 * the message. Six lanes handed across a table — People · Machine · Method ·
 * Material · Measurement · Environment, lib/pillars' order — say "here is
 * every kind of cause and where the work on each stands"; the same actions as
 * a list say something much weaker.
 *
 * THE FILE'S BOARD, NOT A SECOND ONE. Once the PDF has been drawn off-screen
 * (see `file` below) the sheet is handed the file's own layout — which areas
 * on which sheet, the scale, and every card's lines exactly where the file
 * breaks them — so an action wraps on the screen where it wraps on paper and
 * no word is cut on either. Until then the cards wrap by themselves. */
export function BoardPage({ sheet: sh, unplaced, title, scale, sheetH, n, of, sheetNo, board, measured }: {
  /** The sheet as laid out — see layBoard in lib/paceReportPdf. */
  sheet: BoardSheetDrawn;
  /** True when the sheet came from the file: every card's lines are final. */
  measured: boolean;
  unplaced: number; title: string;
  /** What the board is called on this job — see boardName in lib/pillars. */
  board: string;
  scale: number; sheetH: number; n: number; of: number; sheetNo: number;
}) {
  if (sh.blocks.length === 0) return null;   // never a page with a heading and nothing under it

  /* THE SAME DRAWING AS THE PDF, AT THE SAME SIZE. Every measurement below is
   * the PDF's own number in points, converted once to this sheet's pixels and
   * multiplied by the fill scale — so the preview is not merely similar to the
   * file, it is the file. One unit, one arithmetic, no second opinion. */
  const u = BOARD_PX * sh.scale;
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
  const { laneGap, titleLead, metaLead } = sh.geom;
  /* Six lanes, not three, and the lane gap is the file's — horizontal measures
     are not scaled, only the type and the heights are. */
  const lanesStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${PILLARS.length}, minmax(0, 1fr))`,
    gap: `0 ${laneGap * BOARD_PX}px`,
  };

  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n={String(n)} title={`${board} — ${PILLARS.map(p => p.label).join(' · ')}` + (sheetNo > 1 ? ' (continued)' : '')}
              sowhat="One block per line · every action on the project’s board, on its bone" />
            <div className="exec-areas" style={geom}>
            {sh.blocks.map(blk => (
                <div key={blk.area + '#' + blk.part} className="exec-area"
                  style={measured ? { height: px(blk.h), marginBottom: px(BOARD_AREA_GAP), boxSizing: 'border-box' } : undefined}>
                  <p className="exec-area-h">
                    <b>{blk.area}{blk.part > 1 ? ' (continued)' : ''}</b>
                    <span>{blk.total} action{blk.total === 1 ? '' : 's'} · {blk.done} done</span>
                  </p>
                  <div className="exec-board" style={lanesStyle}>
                    {blk.lanes.map(ln => (
                        <section key={ln.key} className={'exec-bcol is-' + ln.key}>
                          <header className="exec-bcol-h" style={{ borderBottomColor: 'var(--ink-2)' }}>
                            <span className="exec-bcol-t">{ln.label}</span>
                            <span className="exec-bcol-n">{ln.count}</span>
                          </header>
                          {ln.cards.length === 0
                            ? (blk.part === 1 ? <p className="exec-empty">—</p> : null)
                            : ln.cards.map((c, i) => (
                              <article key={i} className={'exec-bact is-' + c.rag}
                                style={measured
                                  ? { height: px(c.h), paddingTop: px(2.4), paddingRight: px(6), overflow: 'visible' }
                                  : { height: 'auto', minHeight: px(BOARD_ACT_H) }}>
                                <span className="exec-bact-t"
                                  style={{ whiteSpace: measured ? 'pre' : 'normal', overflow: 'visible', textOverflow: 'clip', lineHeight: px(titleLead) }}>
                                  {c.title.map((t, j) => <span key={j} style={{ display: 'block' }}>{t}</span>)}
                                </span>
                                <span className="exec-bact-f"
                                  style={{ display: 'flex', whiteSpace: measured ? 'pre' : 'normal', overflow: 'visible', textOverflow: 'clip', lineHeight: px(metaLead), marginTop: px(1.6) }}>
                                  <b className={'exec-bst is-' + c.rag}>{c.status}</b>
                                  <span>{c.meta.map((m, j) => <span key={j} style={{ display: 'block' }}>{m}</span>)}</span>
                                </span>
                              </article>
                            ))}
                        </section>
                    ))}
                  </div>
                </div>
            ))}
            </div>
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · client report · page {n} of {of} — the board{sheetNo > 1 ? ` (${sheetNo})` : ''}</span>
          <span>{unplaced > 0
            ? `${unplaced} action${unplaced === 1 ? '' : 's'} not given a column yet`
            : 'Every action is on the board.'}</span>
        </footer>
      </section>
    </div>
  );
}

/* WHICH REPORT A PROJECT GETS. A 6M job (the board model) is reported as
 * the root cause story it is run as — the gap, where the loss is, each
 * problem's fishbone and its four parts (Problem · Why · Fix · Did it work), the board by bone
 * and what was seen on the line (lib/sixmReportPdf, docs/SIXM.md). The lever
 * tree keeps the A3 it has always had (lib/paceReportPdf, unchanged). */
