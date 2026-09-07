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
import { nav } from '../state/useRoute';
import { AccountMenu } from '../ui/AccountMenu';
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
  const pace = usePaceSnapshots();
  const ppm = usePaceLines();
  const [todos, setTodos] = useState<PaceTodoRow[] | null>(null);
  const [wins, setWins] = useState<PaceWinRow[] | null>(null);
  const [snags, setSnags] = useState<Snag[] | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const loading = pace.loading || ppm.loading || todos == null || wins == null || snags == null;

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
      setTodos(await listPaceTodos());
      setWins(await listPaceWins());
      const wsId = await getPaceWorkspaceId();
      setSnags(wsId ? await snagsForWorkspace(wsId) : []);
    })();
  }, []);

  /* Build the PDF in the app rather than handing off to window.print(): the
   * browser's print dialog adds its own header/footer (the URL, the date, page
   * numbers), can fall back to A4 and can drop the background colours — so the
   * saved file never matched the report. This renders each sheet to an image and
   * lays it on an A3 landscape page: one click, no dialog, identical to screen.
   *
   * A width is forced during capture so the two-column layout holds even when
   * the report is generated on a phone (where the responsive grid collapses). */
  const download = async () => {
    const el = root.current;
    if (!el || saving) return;
    setSaving(true);
    el.classList.add('is-exporting');
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas-pro')).default;
      const sheets = Array.from(el.querySelectorAll<HTMLElement>('.exec-sheet'));
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      /* html2canvas renders a CLONE of the page in an off-screen iframe, and by
       * default that clone links the stylesheet by URL and re-fetches it. If the
       * fetch has not finished when the clone is rasterised the page is drawn
       * with NO styles at all — the report came out as unstyled serif text. So
       * the stylesheet is read out of the live document (same-origin, so the
       * rules are readable) and injected into the clone as inline text: nothing
       * to fetch, nothing to race. */
      const cssText = Array.from(document.styleSheets)
        .map(sheet => {
          try { return Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); }
          catch { return ''; }   // a cross-origin sheet we cannot read; skip it
        })
        .join('\n');

      for (let i = 0; i < sheets.length; i++) {
        // 2.5x of a 1600px sheet is ~4000px across an A3 page — about 240dpi,
        // so the charts and the small print stay sharp when it is printed.
        const canvas = await html2canvas(sheets[i], {
          scale: 2.5,
          backgroundColor: '#ffffff',
          logging: false,
          // the clone must believe it is a desktop window, or the responsive
          // rules collapse the layout when the report is built on a phone
          windowWidth: SHEET_W + 120,
          windowHeight: SHEET_H + 120,
          onclone: (doc: Document, node: HTMLElement) => {
            const style = doc.createElement('style');
            style.textContent = cssText;
            doc.head.appendChild(style);
            // belt and braces: pin the sheet's own geometry on the clone, so it
            // cannot depend on a class or a media query surviving the copy
            node.style.width = `${SHEET_W}px`;
            node.style.height = `${SHEET_H}px`;
            node.style.transform = 'none';
            node.style.border = '0';
            node.style.borderRadius = '0';
            node.style.boxShadow = 'none';
          },
        });
        // JPEG, not PNG: a PNG of a full A3 page at 2× is ~12MB — two of them make
        // a 25MB file no mail server will send. On a white report JPEG at high
        // quality is indistinguishable and an order of magnitude smaller.
        const img = canvas.toDataURL('image/jpeg', 0.92);
        // the sheet is already A3-shaped, so it fills the page edge to edge
        // with no letterboxing and nothing squashed
        if (i > 0) pdf.addPage('a3', 'landscape');
        pdf.addImage(img, 'JPEG', 0, 0, pageW, pageH);
      }
      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`Project-Pace-report-${stamp}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      window.alert('Sorry — the PDF could not be generated. Please try again.');
    } finally {
      el.classList.remove('is-exporting');
      setSaving(false);
    }
  };

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
  const LATE_SHOWN = 10;
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
    <div className="exec-report" ref={root}>
      <div className="exec-bar no-print">
        <button className="btn btn-ghost" onClick={() => nav({ page: 'projectDashboard', projectId: 'pace' })}>← Back to Project Pace</button>
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
            <SectionHead n="1" title="Line pace" sowhat="Weekly packs per minute against the quarterly targets" />
            <div className="exec-charts">
              {ppm.lines.map(l => <PaceLineChart key={l.key} line={l} />)}
            </div>
          </section>
        </div>

        <footer className="exec-foot">
          <span>Project Pace · weekly executive report · page 1 of 2 — line pace</span>
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
          <span>Project Pace · weekly executive report · page 2 of 2 — tracker, attention & movement</span>
          <span>Generated {new Date(now).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </section>
      </div>
    </div>
  );
}
