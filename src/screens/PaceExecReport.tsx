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
import { actionsForLine } from '../lib/paceLineMatch';
import { loadPdfLib, deliverPdf, isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import { TreeStatic, useTreeNodes } from './TreeStatic';
import { Sweep } from '../ui/Sweep';
import type { TreeNodeRow } from '../db';
import { listPaceTodos, listPaceWins, getPaceWorkspaceId, snagsForWorkspace, DEFAULT_PROJECT_ID,
  type PaceTodoRow, type PaceWinRow } from '../db';
import type { Snag } from '../snag/types';
import type { PaceAction } from '../lib/projectPaceData';
import type { PaceReportData } from '../lib/paceReportPdf';
import { proofFromWin, proofSentence, verdictLabel } from '../lib/ppmProof';
import { withTrackerRows, bindSources } from '../lib/treeBind';

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

/* The tree gets its own sheet. It is the only thing in the report that says
 * WHY any of the rest is being done, and it needs the width of an A3 to say it
 * — squeezed into a corner of the pace page it would be a decoration. */
function TreePage({ rows, title, scale, sheetH }: {
  rows: TreeNodeRow[] | null; title: string; scale: number; sheetH: number;
}) {
  // No tree drawn yet: print nothing rather than a blank page with a heading on
  // it. A report should never contain an empty box.
  if (!rows || rows.length === 0) return null;
  return (
    <div className="exec-pagewrap" style={{ height: sheetH * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-1">
          <section className="exec-box">
            <SectionHead n="2" title="The plan"
              sowhat="What has to be true for the outcome, and where each part has got to" />
            <TreeStatic rows={rows} maxW={1520} maxH={860} />
          </section>
        </div>
        <footer className="exec-foot">
          <span>{title} · weekly executive report · page 2 of 3 — the plan</span>
          <span>Kept by hand on the project’s lever tree; the work under it comes off the tracker.</span>
        </footer>
      </section>
    </div>
  );
}

export function PaceExecReport() {
  // Which project this is a report on. Defaults to the one the app shipped
  // with, so the link that has always been #/pace-report still works.
  const route = useRoute();
  const projectId = route.query.get('project') || DEFAULT_PROJECT_ID;
  // ?line= turns this into ONE LINE'S deck — the owner's own A3, same drawer,
  // same layout, scoped to their line. Without it, it is the GM's, which is the
  // roll-up of every line's.
  const lineId = route.query.get('line') || undefined;
  const { loading: projLoading, project } = useProject(projectId);

  const pace = usePaceSnapshots(projectId);
  const ppm = usePaceLines(projectId);
  const line = lineId ? ppm.lines.find(l => l.id === lineId) : undefined;
  const [todos, setTodos] = useState<PaceTodoRow[] | null>(null);
  const [wins, setWins] = useState<PaceWinRow[] | null>(null);
  const [snags, setSnags] = useState<Snag[] | null>(null);
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
      const w = el.clientWidth;
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
      setSnags([...walk, ...[...byLineSnags.values()].flat()]);
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
  // A line's deck shows that line's slice of the tracker; the project's shows
  // the lot.
  const actions = actionsForLine(pace.actions, line?.key);

  /* The plan on the wall and the plan on the paper have to be the same plan.
   * A condition bound to the tracker grows its actions at draw time, so the
   * report runs the identical derivation the editor does rather than printing
   * only the boxes that happen to be stored. */
  const fullTree = withTrackerRows(treeRows ?? [], bindSources(pace.actions, todos ?? [], ppm.lines));
  // Which lines this report covers — one, or all of them.
  const reportLines = line ? [line] : ppm.lines;

  const complete = actions.filter(isDone).length;
  const late = actions.filter(a => isLate(a, todayStart)).length;
  const openOnTrack = actions.length - complete - late;
  const openTotal = openOnTrack + late;
  const pctDone = actions.length ? Math.round((complete / actions.length) * 100) : 0;

  const atTarget = reportLines.filter(l => {
    const seen = l.weekly.filter((v): v is number => v != null);
    return seen.length > 0 && seen[seen.length - 1] >= l.q1;
  }).length;

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
    : lineList
      ? `${lineList} — packs per minute, the action tracker, the line walk`
      : 'Packs per minute, the action tracker, the line walk';

  const openSnags = snags.filter(s => s.status !== 'closed');
  /* Which line each snag came off. The project's report merges every line's
   * walk, so a snag with no line against it is a problem the GM cannot route.
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
   * typed, the walk they filmed, the wins they logged. The GM reads one page;
   * it is fed by everybody else's.
   *
   * It used to bucket tracker actions into three fixed names ('Line 2', 'Line
   * 7', 'Line 10'), which could only ever describe the workbook. Now it
   * describes the project. */
  const byLine = reportLines.map(l => {
    const mine = actionsForLine(pace.actions, l.key);
    const lineTodos = todos.filter(t => t.lineId === l.id);
    const seen = l.weekly.filter((v): v is number => v != null);
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
      ppm: seen.length ? seen[seen.length - 1] : null,
      target: l.q1,
    };
  });

  const seg = (count: number) => (openTotal + complete ? (count / actions.length) * 100 : 0);

  /* Everything the PDF needs, as plain numbers and strings. The drawer never
   * looks at the DOM, so this is the whole contract between screen and file. */
  const reportData = (): PaceReportData => ({
    now,
    // The lever tree, flat. Only on the PROJECT's report: a line's own deck is
    // that line's page, and the whole project's plan on it would be somebody
    // else's work printed under their name.
    tree: line || !project?.leverTree ? [] : fullTree.map(n => ({
      id: n.id, parentId: n.parentId, text: n.text, rag: n.rag, sort: n.sort,
    })),
    // A line's deck is titled for the LINE and led by its owner — it is that
    // person's page to hand over. The project's is titled for the project.
    title, lead, leadRole, subtitle,
    lines: reportLines.map(l => ({
      key: l.key, name: l.name, variant: l.variant,
      owner: l.owner, sponsor: l.sponsor,
      q1: l.q1, q2: l.q2, q3: l.q3, q4: l.q4, weekly: l.weekly,
    })),
    atTarget, pctDone,
    complete, total: actions.length, openTotal, openOnTrack, late,
    openSnags: openSnags.length, winsThisWeek: winsThisWeek.length,
    byLine,
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
        <button className="btn btn-ghost"
          onClick={() => nav(line ? `/project/${projectId}/line/${line.id}` : `/project/${projectId}`)}>
          ← Back to {line ? line.name : (project?.name ?? 'the project')}
        </button>
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
              {line ? `${project?.name ?? 'Project'} · line report` : 'Improvement initiative · weekly executive report'}
            </p>
            <h1 className="exec-title">{title}</h1>
            <p className="exec-lede">{subtitle}</p>
          </div>
          <div className="exec-head-meta">
            <span className="exec-asat">Status as at</span>
            <span className="exec-asat-d">{fmtDate(now)}</span>
            <span className="exec-forwhom">Prepared for the General Manager</span>
            {lead && <span className="exec-lead">{leadRole} · {lead}</span>}
          </div>
        </header>

        <div className="exec-stats">
          {/* On a line's own deck "0/1 lines at target" is a riddle; the number
              the owner is judged on is the reading itself, against target. */}
          {line
            ? (() => {
                const last = [...line.weekly].reverse().find((v): v is number => v != null) ?? null;
                const d = last == null ? null : last - line.q1;
                return <Stat n={last == null ? '—' : String(last)} label="ppm latest"
                  sub={d == null ? `Q1 target ${line.q1}` : `${d >= 0 ? '+' : ''}${d} vs Q1 target ${line.q1}`}
                  tone={d == null ? 'flat' : d >= 0 ? 'good' : 'bad'} />;
              })()
            : <Stat n={`${atTarget}/${reportLines.length}`} label="Lines at target" sub="latest week vs Q1"
                tone={atTarget === reportLines.length ? 'good' : atTarget === 0 ? 'bad' : 'warn'} />}
          <Stat n={`${pctDone}%`} label="Actions complete" sub={`${complete} of ${actions.length}`} tone="good" />
          <Stat n={String(openTotal)} label="Still open" sub="in flight" tone="flat" />
          <Stat n={String(late)} label="Overdue" sub="past their date" tone={late > 0 ? 'bad' : 'good'} />
          <Stat n={String(openSnags.length)} label="Open evidence" sub="from the line walk" tone={openSnags.length > 0 ? 'warn' : 'good'} />
          <Stat n={String(winsThisWeek.length)} label="Wins this week" sub="what worked" tone="good" />
        </div>

        <div className="exec-body-1">
          <section className="exec-box exec-box-lines">
            <SectionHead n="1" title="Line pace" sowhat="Weekly packs per minute against the quarterly targets" />
            {/* one line's deck gets one full-width chart rather than one
                quarter of a grid built for four — same rule the PDF follows */}
            <div className={'exec-charts' + (reportLines.length === 1 ? ' is-one' : reportLines.length === 2 ? ' is-two' : '')}>
              {reportLines.map(l => <PaceLineChart key={l.key} line={l} />)}
            </div>
          </section>
        </div>

        <footer className="exec-foot">
          <span>{title} · weekly executive report · page 1 of 3 — line pace</span>
          <span>The tracker workbook is the system of record; this report reads it.</span>
        </footer>
      </section>
      </div>

      {/* ================= PAGE 2 — THE PLAN ================= */}
      {!line && project?.leverTree && <TreePage rows={fullTree} title={title} scale={scale} sheetH={SHEET_H} />}

      {/* ================= PAGE 3 — TRACKER, ATTENTION & MOVEMENT ================= */}
      <div className="exec-pagewrap" style={{ height: SHEET_H * scale }}>
      <section className="exec-sheet" style={{ transform: `scale(${scale})` }}>
        <div className="exec-body-2">
          <section className="exec-box exec-box-actions">
            <SectionHead n="3" title={line ? 'Action tracker' : 'Action tracker & the lines'}
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
                GM needs rather than one page per line. */}
            <table className="exec-matrix is-rollup">
              <thead>
                <tr>
                  <th scope="col">Line</th><th scope="col">Owner</th>
                  <th scope="col">ppm</th><th scope="col">Open</th><th scope="col">Late</th>
                  <th scope="col">Next</th><th scope="col">Evidence</th><th scope="col">Wins</th>
                </tr>
              </thead>
              <tbody>
                {byLine.map(r => (
                  <tr key={r.name}>
                    <th scope="row">{r.name}</th>
                    <td className="exec-mowner">{r.owner}</td>
                    <td className={'exec-mppm ' + (r.ppm == null ? '' : r.ppm >= r.target ? 'is-good' : 'is-bad')}>
                      {r.ppm == null ? '—' : r.ppm}
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
          </section>

          <section className="exec-box exec-box-late">
            <SectionHead n="4" title="Overdue & at risk" sowhat="The actions past their date — where help is needed" />
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
            <SectionHead n="5" title="Next steps" sowhat="To do, waiting, and what came of the finished ones" />
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
            <SectionHead n="6" title="Line walk" sowhat={`${openSnags.length} open snag${openSnags.length === 1 ? '' : 's'} filmed on the line`} />
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
                front of a GM, and a failure sitting under a heading that promises
                success is the kind of small lie that costs a report its credibility. */}
            <SectionHead n="7" title="What we tried" sowhat="What worked, what didn’t, and the weeks behind each" />
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
          <span>{title} · weekly executive report · page 3 of 3 — tracker, attention &amp; movement</span>
          <span>Generated {new Date(now).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </footer>
      </section>
      </div>
    </div>
  );
}
