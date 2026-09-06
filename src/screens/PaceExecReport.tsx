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
 * Download = the browser's print-to-PDF. A named @page (see styles.css) sets A3
 * landscape, so "Save as PDF" comes out right without the GM touching a setting. */
import { useEffect, useState } from 'react';
import { nav } from '../state/useRoute';
import { PaceLineChart } from '../charts/PaceLineChart';
import { usePaceLines } from '../lib/usePaceLines';
import { usePaceSnapshots } from '../lib/usePaceSnapshots';
import { listPaceTodos, listPaceWins, getPaceWorkspaceId, snagsForWorkspace,
  type PaceTodoRow, type PaceWinRow } from '../db';
import type { Snag } from '../snag/types';
import type { PaceAction } from '../lib/projectPaceData';

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
  const pace = usePaceSnapshots();
  const ppm = usePaceLines();
  const [todos, setTodos] = useState<PaceTodoRow[] | null>(null);
  const [wins, setWins] = useState<PaceWinRow[] | null>(null);
  const [snags, setSnags] = useState<Snag[] | null>(null);

  useEffect(() => {
    void (async () => {
      setTodos(await listPaceTodos());
      setWins(await listPaceWins());
      const wsId = await getPaceWorkspaceId();
      setSnags(wsId ? await snagsForWorkspace(wsId) : []);
    })();
  }, []);

  // Set the print page to A3 landscape only while this report is on screen, so
  // the meeting's own "Print A3" is untouched. One global size for the whole
  // print — a per-element page size would emit a blank page on the size switch.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '@page { size: A3 landscape; margin: 9mm; }';
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const loading = pace.loading || ppm.loading || todos == null || wins == null || snags == null;
  if (loading) {
    return (
      <div className="exec-report">
        <div className="exec-bar no-print">
          <button className="btn btn-ghost" onClick={() => nav({ page: 'projectDashboard', projectId: 'pace' })}>← Back</button>
        </div>
        <p className="sub" style={{ padding: '40px' }}>Preparing the report…</p>
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

  const openSnags = snags.filter(s => s.status !== 'closed');
  const winsThisWeek = wins.filter(w => now - w.createdAt <= 7 * dayMs);
  const showWins = (winsThisWeek.length ? winsThisWeek : wins).slice(0, 4);

  // the exceptions — the only actions shown by name, worst (most overdue) first
  const lateAll = actions
    .filter(a => isLate(a, todayStart))
    .sort((a, b) => (dueMs(a) ?? Infinity) - (dueMs(b) ?? Infinity));
  const LATE_SHOWN = 8;
  const lateActions = lateAll.slice(0, LATE_SHOWN);
  const lateMore = lateAll.length - lateActions.length;

  const openTodos = todos
    .filter(t => t.state !== 'done')
    .sort((a, b) => (a.state === b.state ? 0 : a.state === 'todo' ? -1 : 1))
    .slice(0, 9);

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

  return (
    <div className="exec-report">
      <div className="exec-bar no-print">
        <button className="btn btn-ghost" onClick={() => nav({ page: 'projectDashboard', projectId: 'pace' })}>← Back to Project Pace</button>
        <div className="exec-bar-r">
          <span className="exec-bar-hint">Downloads as a double-sided A3 PDF — pick “Save as PDF” in the dialog</span>
          <button className="btn btn-primary" onClick={() => window.print()}>Download PDF</button>
        </div>
      </div>

      {/* ================= PAGE 1 — STATUS AT A GLANCE ================= */}
      <section className="exec-sheet">
        <header className="exec-head">
          <div>
            <p className="exec-eyebrow">Improvement initiative · weekly executive report</p>
            <h1 className="exec-title">Project Pace</h1>
            <p className="exec-lede">Lines 2A · 2B · 7 · 10 — packs per minute, the action tracker, the line walk</p>
          </div>
          <div className="exec-head-meta">
            <span className="exec-asat">Status as at</span>
            <span className="exec-asat-d">{fmtDate(now)}</span>
            <span className="exec-forwhom">Prepared for the General Manager</span>
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
            <SectionHead n="1" title="Line pace" sowhat="Weekly packs per minute against the Q1 target" />
            <div className="exec-charts">
              {ppm.lines.map(l => <PaceLineChart key={l.key} line={l} />)}
            </div>
          </section>

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
        </div>

        <footer className="exec-foot">
          <span>Project Pace · weekly executive report · page 1 of 2 — status</span>
          <span>The tracker workbook is the system of record; this report reads it.</span>
        </footer>
      </section>

      {/* ================= PAGE 2 — ATTENTION & MOVEMENT ================= */}
      <section className="exec-sheet">
        <div className="exec-body-2">
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
            <SectionHead n="4" title="Next steps" sowhat="What still needs doing, and what we are waiting on" />
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
          <span>Project Pace · weekly executive report · page 2 of 2 — attention & movement</span>
          <span>Generated {new Date(now).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </section>
    </div>
  );
}
