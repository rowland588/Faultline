/* THE WEEKLY EXECUTIVE REPORT — one download, sent to the General Manager.
 *
 * Not the meeting A3 (that stays on the dashboard, worked through live). This is
 * a self-contained double-sided A3 the GM reads on their own: a visual status,
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
import { PaceLineChart } from '../charts/PaceLineChart';
import { usePaceLines } from '../lib/usePaceLines';
import { usePaceSnapshots } from '../lib/usePaceSnapshots';
import { useProject } from '../lib/useProjects';
import { listPaceTodos, listPaceWins, getPaceWorkspaceId, snagsForWorkspace, DEFAULT_PROJECT_ID,
  type PaceTodoRow, type PaceWinRow } from '../db';
import type { Snag } from '../snag/types';
import type { PaceAction } from '../lib/projectPaceData';
import type { PaceReportData } from '../lib/paceReportPdf';

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
const LINE_BUCKETS = ['Line 2', 'Line 7', 'Line 10', 'All / other'] as const;
const bucketOf = (a: PaceAction): (typeof LINE_BUCKETS)[number] => {
  const l = norm(a.line).toLowerCase();
  if (l.includes('10')) return 'Line 10';
  if (l.includes('7')) return 'Line 7';
  if (l.includes('2')) return 'Line 2';
  return 'All / other';
};

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (s?: string) => {
  if (!s) return '—';
  const d = Date.parse(s);
  return Number.isNaN(d) ? s : new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
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

export function PaceExecReport() {
  // Which project this is a report on. Defaults to the one the app shipped
  // with, so the link that has always been #/pace-report still works.
  const route = useRoute();
  const projectId = route.query.get('project') || DEFAULT_PROJECT_ID;
  const { loading: projLoading, project } = useProject(projectId);

  const pace = usePaceSnapshots(projectId);
  const ppm = usePaceLines(projectId);
  const [todos, setTodos] = useState<PaceTodoRow[] | null>(null);
  const [wins, setWins] = useState<PaceWinRow[] | null>(null);
  const [snags, setSnags] = useState<Snag[] | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const loading = pace.loading || ppm.loading || projLoading || todos == null || wins == null || snags == null;

  // Scale the fixed-size sheets down to whatever width the window gives us, so
  // what is on screen is exactly what comes out of the PDF. Re-runs when the
  // data lands, because the sheets (and the ref) only exist once it has.
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = root.current;
    if (!el || loading) return;
    const fit = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, w / SHEET_W));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  useEffect(() => {
    void (async () => {
      setTodos(await listPaceTodos(projectId));
      setWins(await listPaceWins(projectId));
      const wsId = await getPaceWorkspaceId(projectId);
      setSnags(wsId ? await snagsForWorkspace(wsId) : []);
    })();
  }, [projectId]);

  /* Draw the PDF from the numbers — see lib/paceReportPdf.
   *
   * Deliberately NOT a screenshot of this page. Rasterising the DOM made the
   * output depend on the browser finishing a stylesheet fetch inside a hidden
   * clone, which failed on real devices in four different ways. Nothing here
   * touches the DOM, so the file is identical on every device. */
  const download = async () => {
    if (saving || loading) return;
    setSaving(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { drawPaceReport } = await import('../lib/paceReportPdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
      drawPaceReport(pdf, reportData());
      // The file lands in someone's inbox on its own, so its NAME has to say
      // which project it is — "report.pdf" from three projects is three files
      // nobody can tell apart.
      const slug = (project?.name ?? 'Project').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'Project';
      pdf.save(`${slug}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      window.alert('Sorry — the PDF could not be generated. Please try again.');
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

  // A report on a project that isn't here is a page of empty boxes with
  // "Project" at the top — say so and offer the way out instead.
  if (!project) {
    return (
      <div className="exec-report">
        <div className="exec-bar no-print">
          <button className="btn btn-ghost" onClick={() => nav('/projects')}>← Projects</button>
        </div>
        <p className="sub" style={{ padding: '40px' }}>That project isn’t here any more, so there is nothing to report on.</p>
      </div>
    );
  }

  const now = Date.now();
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const actions = pace.actions;

  const complete = actions.filter(isDone).length;
  const late = actions.filter(a => isLate(a, todayStart)).length;
  const openOnTrack = actions.length - complete - late;
  const openTotal = openOnTrack + late;
  const pctDone = actions.length ? Math.round((complete / actions.length) * 100) : 0;

  const atTarget = ppm.lines.filter(l => {
    const seen = l.weekly.filter((v): v is number => v != null);
    return seen.length > 0 && seen[seen.length - 1] >= l.q1;
  }).length;

  // The lines this project actually runs, read off the project rather than
  // written into the page — so adding a line changes what the report says it covers.
  const lineList = ppm.lines.map(l => l.key).join(' · ');

  const openSnags = snags.filter(s => s.status !== 'closed');
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

  const byLine = LINE_BUCKETS
    .map(name => {
      const mine = actions.filter(a => bucketOf(a) === name);
      return {
        name,
        total: mine.length,
        done: mine.filter(isDone).length,
        late: mine.filter(a => isLate(a, todayStart)).length,
        open: mine.filter(a => !isDone(a)).length,
      };
    })
    .filter(r => r.total > 0);

  const seg = (count: number) => (openTotal + complete ? (count / actions.length) * 100 : 0);

  /* Everything the PDF needs, as plain numbers and strings. The drawer never
   * looks at the DOM, so this is the whole contract between screen and file. */
  const reportData = (): PaceReportData => ({
    now,
    title: project?.name ?? 'Project',
    lead: project?.lead,
    subtitle: lineList
      ? `${lineList} — packs per minute, the action tracker, the line walk`
      : 'Packs per minute, the action tracker, the line walk',
    lines: ppm.lines.map(l => ({
      key: l.key, name: l.name, variant: l.variant,
      owner: l.owner, sponsor: l.sponsor,
      q1: l.q1, q2: l.q2, q3: l.q3, q4: l.q4, weekly: l.weekly,
    })),
    atTarget, pctDone,
    complete, total: actions.length, openTotal, openOnTrack, late,
    openSnags: openSnags.length, winsThisWeek: winsThisWeek.length,
    byLine: byLine.map(r => ({ name: r.name, open: r.open, late: r.late, done: r.done, total: r.total })),
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
      })),
    wins: showWins.map(w => ({
      title: w.title || 'Win', impact: w.impact || '', story: w.story || '',
      who: w.who || 'the team', where: w.where || '',
    })),
  });

  return (
    <div className="exec-report" ref={root}>
      <div className="exec-bar no-print">
        <button className="btn btn-ghost" onClick={() => nav(`/project/${projectId}`)}>← Back to {project?.name ?? 'the project'}</button>
        <div className="exec-bar-r">
          <span className="exec-bar-hint">One click — a ready-to-send double-sided A3 PDF</span>
          <button className="btn btn-primary" disabled={saving} onClick={() => void download()}>
            {saving ? 'Building PDF…' : 'Download PDF'}
          </button>
          <AccountMenu />
        </div>
      </div>

      {/* ================= PAGE 1 — STATUS AT A GLANCE ================= */}
      <div className="exec-pagewrap" style={{ height: SHEET_H * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <header className="exec-head">
          <div>
            <p className="exec-eyebrow">Improvement initiative · weekly executive report</p>
            <h1 className="exec-title">{project?.name ?? 'Project'}</h1>
            <p className="exec-lede">
              {lineList ? `${lineList} — ` : ''}packs per minute, the action tracker, the line walk
            </p>
          </div>
          <div className="exec-head-meta">
            <span className="exec-asat">Status as at</span>
            <span className="exec-asat-d">{fmtDate(now)}</span>
            <span className="exec-forwhom">Prepared for the General Manager</span>
            {project?.lead && <span className="exec-lead">Project lead · {project.lead}</span>}
          </div>
        </header>

        <div className="exec-stats">
          <Stat n={`${atTarget}/${ppm.lines.length}`} label="Lines at target" sub="latest week vs Q1"
            tone={atTarget === ppm.lines.length ? 'good' : atTarget === 0 ? 'bad' : 'warn'} />
          <Stat n={`${pctDone}%`} label="Actions complete" sub={`${complete} of ${actions.length}`} tone="good" />
          <Stat n={String(openTotal)} label="Still open" sub="in flight" tone="flat" />
          <Stat n={String(late)} label="Overdue" sub="past their date" tone={late > 0 ? 'bad' : 'good'} />
          <Stat n={String(openSnags.length)} label="Open snags" sub="on the line walk" tone={openSnags.length > 0 ? 'warn' : 'good'} />
          <Stat n={String(winsThisWeek.length)} label="Wins this week" sub="what worked" tone="good" />
        </div>

        <div className="exec-body-1">
          <section className="exec-box exec-box-lines">
            <SectionHead n="1" title="Line pace" sowhat="Weekly packs per minute against the quarterly targets" />
            <div className="exec-charts">
              {ppm.lines.map(l => <PaceLineChart key={l.key} line={l} />)}
            </div>
          </section>
        </div>

        <footer className="exec-foot">
          <span>{project?.name ?? 'Project'} · weekly executive report · page 1 of 2 — line pace</span>
          <span>The tracker workbook is the system of record; this report reads it.</span>
        </footer>
      </section>
      </div>

      {/* ================= PAGE 2 — TRACKER, ATTENTION & MOVEMENT ================= */}
      <div className="exec-pagewrap" style={{ height: SHEET_H * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-2">
          <section className="exec-box exec-box-actions">
            <SectionHead n="2" title="Action tracker" sowhat={`${actions.length} actions — where they stand`} />

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

            <table className="exec-matrix">
              <thead>
                <tr><th scope="col">Line</th><th scope="col">Open</th><th scope="col">Overdue</th><th scope="col">Complete</th><th scope="col">Total</th></tr>
              </thead>
              <tbody>
                {byLine.map(r => (
                  <tr key={r.name}>
                    <th scope="row">{r.name}</th>
                    <td>{r.open}</td>
                    <td className={r.late > 0 ? 'is-bad' : ''}>{r.late}</td>
                    <td>{r.done}</td>
                    <td className="exec-mtot">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="exec-box exec-box-late">
            <SectionHead n="3" title="Overdue & at risk" sowhat="The actions past their date — where help is needed" />
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

          <section className="exec-box exec-box-next">
            <SectionHead n="4" title="Next steps" sowhat="To do, waiting, and what came of the finished ones" />
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
            <SectionHead n="5" title="Line walk" sowhat={`${openSnags.length} open snag${openSnags.length === 1 ? '' : 's'} filmed on the line`} />
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
                        {s.owner || 'unassigned'} · {Math.max(0, Math.floor((now - s.raisedAt) / dayMs))}d
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="exec-box exec-box-wins">
            <SectionHead n="6" title="What worked" sowhat="Wins to build on — the proof the plan is landing" />
            {showWins.length === 0 ? (
              <p className="exec-empty">No wins logged yet.</p>
            ) : (
              <ul className="exec-wins">
                {showWins.map(w => (
                  <li key={w.id}>
                    <div className="exec-win-top">
                      <span className="exec-win-t">{w.title || 'Win'}</span>
                      {w.impact && <span className="exec-win-i">{w.impact}</span>}
                    </div>
                    {w.story && <p className="exec-win-s">{clip(w.story, 130)}</p>}
                    <p className="exec-win-by">{w.who || 'the team'}{w.where ? ` · ${w.where}` : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="exec-foot">
          <span>{project?.name ?? 'Project'} · weekly executive report · page 2 of 2 — tracker, attention &amp; movement</span>
          <span>Generated {new Date(now).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </section>
      </div>
    </div>
  );
}
