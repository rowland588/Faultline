/* THE 6M CLIENT REPORT, ON SCREEN (docs/STEADY.md S4: its own file) — what is on it in words, and
 * the PDF itself beside it on a desk, so the screen and the paper cannot disagree; the one-page
 * status and the full report, downloaded from here (lib/sixmReportPdf). */
import { useEffect, useMemo, useState } from 'react';
import { useJourney } from '../project/journey/useJourney';
import { weekLine } from '../project/journey/journey';
import { usePdfPreview } from '../lib/usePdfPreview';
import { nav } from '../state/useRoute';







import type { Project } from '../types';
import { loadPdfLib, deliverPdf, isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import { pdfFileName } from '../lib/fileName';



import { listPaceTodos, type PaceTodoRow } from '../db';














import {     todayISO } from '../lib/materials';










import { onDataChange } from '../db';
import { loadProblems, viewsOf, type LoadedProblems } from '../lib/useProblems';
import type { SixMReport } from '../lib/sixmReportPdf';
import { sixmStatus } from '../lib/sixmStatus';
import type { jsPDF } from 'jspdf';
import { PageHeader } from '../ui/parts';
import { useSaveOnArrival } from '../lib/useSaveOnArrival';

async function sixmPdf(r: SixMReport, which: 'status' | 'full' = 'full'): Promise<jsPDF> {
  const { jsPDF } = await loadPdfLib();
  const { drawSixMReport, drawSixMStatus } = await import('../lib/sixmReportPdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  if (which === 'status') await drawSixMStatus(doc, r); else await drawSixMReport(doc, r);
  return doc;
}

/* THE 6M CLIENT REPORT, ON SCREEN — what is on it in words, and the PDF
 * itself beside it on a desk, so the screen and the paper cannot disagree. */
export function SixMReportScreen({ projectId, lineId, name, lead, project }: { projectId: string; lineId?: string; name: string; lead?: string; project: Project }) {
  const [loaded, setLoaded] = useState<LoadedProblems | null>(null);
  /* THIS WEEK AND NEXT (lib/journey weekLine) — the line the front page says, on the status and the full report */
  const jr = useJourney(project);
  const week = useMemo(() => (jr ? weekLine(jr.input, jr.today, jr.started) : undefined), [jr]);
  const [todos, setTodos] = useState<PaceTodoRow[] | null>(null);
  const [report, setReport] = useState<SixMReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [err, setErr] = useState<{ stale: boolean; msg: string } | null>(null);
  /* TWO, FROM ONE BUTTON, THE SHORT ONE FIRST (docs/SIMPLE.md; flow audit
     #17): the one-page status — the one that gets sent — and the full root
     cause story, both read off the same model (lib/sixmStatus). */
  const [which, setWhich] = useState<'status' | 'full'>(() => (/[?&]doc=full\b/.test(window.location.hash) ? 'full' : 'status'));
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 900px)');
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  useEffect(() => { void loadPdfLib().catch(() => { /* said when pressed */ }); }, []);

  /* Read once, and again whenever anything is written (debounced). */
  useEffect(() => {
    let alive = true, timer: number | undefined;
    const run = async () => {
      const [l, t] = await Promise.all([loadProblems(projectId), listPaceTodos(projectId)]);
      if (alive) { setLoaded(l); setTodos(t); }
    };
    void run();
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(() => { void run(); }, 300); });
    return () => { alive = false; off(); window.clearTimeout(timer); };
  }, [projectId]);

  useEffect(() => {
    if (!loaded || !todos) return;
    let alive = true;
    void import('../lib/sixmReportPdf').then(({ sixmReport }) => {
      const now = Date.now();
      const r = sixmReport({ project: { name, lead }, data: loaded.data, problems: viewsOf(loaded, projectId, lineId, now), todos, lineId, now, ...(week ? { week } : {}) });
      if (alive) setReport(r);
    });
    return () => { alive = false; };
  }, [loaded, todos, projectId, lineId, name, lead, week]);

  /* The preview is the PDF itself, with the mark it leaves with — redrawn
     only when what is on it changes (lib/usePdfPreview). */
  const previewKey = useMemo(() => (report && wide ? `${which}|${JSON.stringify(report)}` : null), [report, wide, which]);
  const preview = usePdfPreview(previewKey, () => sixmPdf(report as NonNullable<typeof report>, which));
  const status = useMemo(() => (report ? sixmStatus(report) : null), [report]);

  const line = lineId ? loaded?.data.lines.find(l => l.id === lineId) : undefined;
  const download = async () => {
    if (!report || busy) return;
    setBusy(true); setSaid(null); setErr(null);
    try {
      const how = await deliverPdf(await sixmPdf(report, which), pdfFileName(line ? `${name} ${line.name}` : name, which === 'status' ? 'status report' : 'client report', todayISO()));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('6M client report failed', e);
      setErr(isStaleBuildError(e)
        ? { stale: true, msg: 'This tab is still running an older version of the app, so the part that draws the PDF could not load.' }
        : { stale: false, msg: `The report could not be made${e instanceof Error && e.message ? ` — ${e.message}` : ''}. Try again; if it fails again, reload the app.` });
    } finally { setBusy(false); }
  };

  /* ?save=1 — named in the project's Report ▾ (lib/useSaveOnArrival). */
  useSaveOnArrival(!!report, download);

  if (!report) return <div className="wrap pace"><p className="sub">Preparing the report…</p></div>;
  if (lineId && loaded && !line) {
    return (
      <div className="wrap pace cr">
        <p className="sub">That line isn’t on {name} any more, so it has no report of its own.</p>
        <button className="btn btn-primary" onClick={() => nav(`/pace-report?project=${projectId}`)}>The project’s client report</button>
      </div>
    );
  }

  return (
    <div className="wrap pace cr">
      {/* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3): the paper's name and its one action. */}
      <PageHeader
        title={`Client report${line ? ` — ${line.name}` : ''}`}
        says={which === 'status'
            ? 'One page, the one that gets sent: where the lines are, why they are not where they should be, and what is being done — who, by when. The full report has every detail.'
            : 'The gap, where the loss is, and each problem beside its fishbone in four parts — Problem, Why, Fix, Did it work — drawn from what is kept here, nothing typed for it.'}
        primary={{ label: busy ? 'Making it…' : 'Download', icon: 'download', run: () => void download(), disabled: busy }} />
      <span className="cw-seg cr-which" role="group" aria-label="Which report">
        <button type="button" className={'chip' + (which === 'status' ? ' on' : '')} aria-pressed={which === 'status'} onClick={() => setWhich('status')}>Status — 1 page</button>
        <button type="button" className={'chip' + (which === 'full' ? ' on' : '')} aria-pressed={which === 'full'} onClick={() => setWhich('full')}>Full report</button>
      </span>
      {said && <p className="tc-ok" role="status">{said}</p>}
      {err && (
        <p className="sub tw-err" role="alert">
          {err.msg}{' '}
          {err.stale && <button className="btn btn-primary" onClick={() => void reloadOntoNewBuild()}>Reload the app</button>}
        </p>
      )}

      <div className={'cr-body' + (wide ? ' is-wide' : '')}>
        {which === 'status' && status ? (
        /* THE ONE PAGE IN WORDS — the same model the paper is drawn from. */
        <ol className="cr-toc cr-status">
          <li><b>{status.manyLines ? 'Where the lines are' : 'Where the line is'}</b><span>{status.sentence}</span>
            <span className="sub">{status.slip}</span>
            {status.lines.map(g => <span key={g.line} className={g.short ? 'cr-short' : undefined}>{g.says}</span>)}
            {status.gapNone && <span className="sub">{status.gapNone}</span>}</li>
          <li><b>Why we are not where we should be</b>
            {status.why.length === 0 && <span>Nothing — every line measured is at its target, nothing has slipped back, no check is missed and no countermeasure is past its day.</span>}
            {status.why.map((w, k) => (
              <span key={k}><span className={'cr-said-st ' + (w.kind === 'due' ? 'is-asking' : 'is-late')}>{w.tag}</span> {w.what}{w.detail ? <span className="sub"> — {w.detail}</span> : null}</span>
            ))}
            {status.whyMore > 0 && <span className="sub">and {status.whyMore} more — in the full report</span>}</li>
          <li><b>What we are doing about it</b>
            {status.problems.map((x, k) => <span key={`p${k}`}>{x.title}{x.number ? ` — ${x.number}` : ''} · {x.phase}</span>)}
            {status.problemsMore > 0 && <span className="sub">and {status.problemsMore} more open — in the full report</span>}
            {status.next.map((n, k) => <span key={`n${k}`} className={n.late ? 'cr-short' : undefined}>{n.what} · {n.who} · {n.when}</span>)}
            {status.next.length === 0 && <span className="sub">Nothing open on the board.</span>}
            {status.nextMore > 0 && <span className="sub">and {status.nextMore} more open — in the full report</span>}</li>
        </ol>
        ) : (
        <ol className="cr-toc">
          <li><b>{report.manyLines ? 'Where the lines are' : 'Where the line is'}</b><span>{report.sentence}</span>
            {/* Home's 6M row's words, the late part red and the waiting part amber there and here. */}
            <span className="sub">{report.slipSaid.map((x, k) => (x.tone ? <span key={k} className={'jb-said is-' + x.tone}>{x.text}</span> : x.text))}</span></li>
          {report.gaps.length > 0 && <li><b>The gap</b>{report.gaps.map(g => <span key={g.line}>{g.says}</span>)}</li>}
          {(report.pareto || report.constraints.length > 0) && (
            <li><b>Where the loss is</b>
              {report.pareto && <span>{report.pareto.says}{report.pareto.rows[0] ? ` — the biggest, ${report.pareto.rows[0].category}` : ''}</span>}
              {report.constraints.map(c => <span key={c.line}>{c.line}: {c.says}</span>)}
            </li>
          )}
          {report.noProblems && <li><b>Problems</b><span>{report.noProblems}</span></li>}
          {report.problems.map(p => <ProblemParts key={p.id} p={p} />)}
          {report.board.length > 0 && (
            <li><b>The board by bone</b><span>{report.boardSays}</span>
              <span className="sub">{report.board.map(b => `${b.label}: ${b.says}`).join(' · ')}</span>
            </li>
          )}
          {report.seen && <li><b>What was seen on the line</b><span>{report.seen.says}</span></li>}
        </ol>
        )}
        {wide && (
          <div className="cr-page">
            {preview ? <iframe title="The client report" src={preview} /> : <p className="sub">Drawing the report…</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ONE PROBLEM, AS THE PAPER PRINTS IT — the four parts it is worked in
 * (docs/SIXM.md: Problem · Why · Fix · Did it work), in the paper's own words,
 * read from the same model (lib/sixmReportPdf sixmReport), so the screen and
 * the PDF cannot say two different things. The fish is on the paper beside. */
function ProblemParts({ p }: { p: SixMReport['problems'][number] }) {
  const stateClass = (t: string) => (t === 'late' || t === 'failed' ? 'is-late' : t === 'waiting' ? 'is-asking' : t === 'done' ? 'is-done' : t === 'going' ? 'is-booked' : 'is-ahead');
  return (
    <li className="cr-prob">
      <b>Problem {p.n} — {p.title}</b>
      <span><span className={'cr-said-st ' + stateClass(p.tone)}>{p.phaseWord}</span> · {p.meta}</span>
      <div className="cr-part">
        <p className="cr-part-h">Problem</p>
        {p.says && <span className="cr-part-lead">{p.says}</span>}
        {p.measure && <span>{p.measure}</span>}
        {p.from && <span>Where it came from: {p.from}</span>}
        {p.is.length > 0 && <span>Is: {p.is.join(' · ')}</span>}
        {p.isNot.length > 0 && <span>Is not: {p.isNot.join(' · ')}</span>}
        {!p.says && !p.measure && !p.from && !p.is.length && !p.isNot.length && <span className="sub">Not measured yet.</span>}
      </div>
      <div className="cr-part">
        <p className="cr-part-h">Why{p.whySays && <small> · {p.whySays}</small>}</p>
        {p.suggested && <span className="sub">{p.suggested}</span>}
        {p.chains.map(ch => (
          <div key={ch.cause.id} className={'cr-chain' + (ch.state === 'out' ? ' is-out' : '')}>
            <span className="cr-chain-h">{ch.head}{ch.from ? ` · ${ch.from}` : ''}</span>
            <ol>
              {ch.answers.map((a, i) => {
                const root = ch.state === 'root' && i === ch.answers.length - 1;
                return <li key={i} className={root ? 'is-root' : undefined}>{a.text}{a.known ? ` (${a.known})` : ''}{root ? ' — the root' : ''}</li>;
              })}
            </ol>
            {ch.therefore.length > 0 && <span className="sub">Read back from the root: {ch.therefore.join('; ')}</span>}
          </div>
        ))}
        {p.rootless && <span className="sub">{p.rootless}</span>}
        {p.written && <span>Written before the fishbone: {p.written}</span>}
      </div>
      <div className="cr-part">
        <p className="cr-part-h">Fix{p.counterSays && <small> · {p.counterSays}</small>}</p>
        {p.counter.length === 0 && <span className="sub">No fix on the board for it yet.</span>}
        {/* Each fix as the paper prints it: what, bone and owner, its state
            and day — and the day in words when it has no date. */}
        {p.counter.map((c, i) => (
          <span key={i} className="cr-cm">
            {c.what} · {c.bone} · {c.owner || 'No owner'} · <span className={'cr-said-st ' + stateClass(c.tone)}>{c.when}</span>
            {c.words ? ` · When: ${c.words}` : ''}{c.cause ? ` · For: ${c.cause}` : ''}{c.expect && c.tone !== 'done' ? ` · Should change: ${c.expect}` : ''}
          </span>
        ))}
      </div>
      <div className="cr-part">
        <p className="cr-part-h">Did it work</p>
        <span className={'cr-part-lead' + (p.worked.tone === 'failed' ? ' cr-said-st is-late' : '')}>{p.worked.says}</span>
        {p.worked.number && <span>{p.worked.number}</span>}
        {p.worked.fixes.map((x, i) => (
          <span key={i} className="cr-cm">{x.what} — Expected: {x.expect ?? 'nothing written'} · <b>What happened: {x.happened}</b></span>
        ))}
        {p.hold && (
          <span className="cr-cm">Keeping the gain — The check: {p.hold.what} · {[p.hold.who, p.hold.every, `since ${p.hold.since}`, p.hold.last ? `last checked ${p.hold.last}` : 'not checked yet', p.hold.due].filter(Boolean).join(' · ')} · <span className={'cr-said-st ' + stateClass(p.hold.tone)}>{p.hold.word}</span></span>
        )}
      </div>
    </li>
  );
}

