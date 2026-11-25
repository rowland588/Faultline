import { TalkReportDetails } from '../ui/TalkReportDetails';
/* THE 6M CLIENT REPORT, ON SCREEN (docs/STEADY.md S4: its own file) — what is on it in words, and
 * the PDF itself beside it on a desk, so the screen and the paper cannot disagree; the one-page
 * status and the full report, downloaded from here (lib/sixmReportPdf). */
import { useEffect, useMemo, useState } from 'react';
import type { jsPDF } from 'jspdf';
import type { Project } from '../types';
import { onDataChange } from '../db';
import { useJourney } from '../project/journey/useJourney';
import { weekLine } from '../project/journey/journey';
import { recoveryStory } from '../project/recovery/reportStory';
import { nav } from '../state/useRoute';
import { pdfFileName } from '../lib/fileName';
import { todayISO } from '../lib/materials';
import { loadPdfLib, deliverPdf, isStaleBuildError, reloadOntoNewBuild } from '../lib/savePdf';
import type { SixMReport } from '../lib/sixmReportPdf';
import { sixmStatus } from '../lib/sixmStatus';
import { usePdfPreview } from '../lib/usePdfPreview';
import { loadProblems, viewsOf, type LoadedProblems } from '../lib/useProblems';
import { useSaveOnArrival } from '../lib/useSaveOnArrival';
import { PageHeader } from '../ui/parts';

async function sixmPdf(r: SixMReport, which: 'status' | 'full' = 'full', kind = '6M'): Promise<jsPDF> {
  const { jsPDF } = await loadPdfLib();
  const { drawSixMReport, drawSixMStatus } = await import('../lib/sixmReportPdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  if (which === 'status') await drawSixMStatus(doc, r, kind); else await drawSixMReport(doc, r, kind);
  return doc;
}

/* THE 6M CLIENT REPORT, ON SCREEN — what is on it in words, and the PDF
 * itself beside it on a desk, so the screen and the paper cannot disagree. */
interface ReportProps { projectId: string; lineId?: string; name: string; lead?: string; project: Project }

export function SixMReportScreen(props: ReportProps) {
  return <ReportForScope key={JSON.stringify([props.projectId, props.lineId])} {...props} />;
}

function ReportForScope({ projectId, lineId, name, lead, project }: ReportProps) {
  const recovery = project.programKey === 'line-recovery';
  const dmaic = recovery && project.method === 'dmaic';
  const paperKind = dmaic ? 'Line recovery · DMAIC' : recovery ? 'Line recovery' : '6M';
  const [loaded, setLoaded] = useState<LoadedProblems | null>(null);
  const [readError, setReadError] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);
  /* THIS WEEK AND NEXT (lib/journey weekLine) — the line the front page says, on the status and the full report */
  const jr = useJourney(project);
  const week = useMemo(() => (jr ? weekLine(jr.input, jr.today, jr.started) : undefined), [jr]);
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
    let revision = 0;
    const run = async () => {
      const current = ++revision;
      try {
        const problems = await loadProblems(projectId);
        if (alive && current === revision) {
          setLoaded(problems);
          setReadError(false);
        }
      } catch {
        if (alive && current === revision) {
          setLoaded(null);
          setReport(null);
          setReadError(true);
        }
      }
    };
    void run();
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(() => { void run(); }, 300); });
    return () => { alive = false; off(); window.clearTimeout(timer); };
  }, [projectId, readAttempt]);

  useEffect(() => {
    if (!loaded || !week || !jr) { setReport(null); return; }
    let alive = true;
    void import('../lib/sixmReport').then(({ sixmReport }) => {
      const now = Date.now();
      const wholeProject = !lineId || (loaded.data.lines.length === 1 && loaded.data.lines[0].id === lineId);
      const story = dmaic && wholeProject ? recoveryStory(projectId, jr.input.notes ?? [], loaded.data.studies) : undefined;
      const r = sixmReport({
        project: { id: projectId, name, lead }, recoveryStory: story, register: jr.input.register, data: loaded.data,
        problems: viewsOf(loaded, projectId, lineId, now), todos: jr.steps, lineId, now,
        ...(wholeProject ? { week } : {}),
      });
      if (alive) setReport(r);
    });
    return () => { alive = false; };
  }, [loaded, projectId, lineId, name, lead, week, jr, dmaic]);

  /* The preview is the PDF itself, with the mark it leaves with — redrawn
     only when what is on it changes (lib/usePdfPreview). */
  const previewKey = useMemo(() => (report && wide ? `${which}|${JSON.stringify(report)}` : null), [report, wide, which]);
  const preview = usePdfPreview(previewKey, () => sixmPdf(report as NonNullable<typeof report>, which, paperKind));
  const status = useMemo(() => (report ? sixmStatus(report) : null), [report]);

  const line = lineId ? loaded?.data.lines.find(l => l.id === lineId) : undefined;
  const download = async () => {
    if (!report || busy || (lineId && !line)) return;
    setBusy(true); setSaid(null); setErr(null);
    try {
      const how = await deliverPdf(await sixmPdf(report, which, paperKind), pdfFileName(line ? `${name} ${line.name}` : name, which === 'status' ? 'status report' : 'client report', todayISO()));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('6M client report failed', e);
      setErr(isStaleBuildError(e)
        ? { stale: true, msg: 'This tab is still running an older version of the app, so the part that draws the PDF could not load.' }
        : { stale: false, msg: `The report could not be made${e instanceof Error && e.message ? ` — ${e.message}` : ''}. Try again; if it fails again, reload the app.` });
    } finally { setBusy(false); }
  };

  /* ?save=1 — named in the project's Report ▾ (lib/useSaveOnArrival). */
  useSaveOnArrival(!!report && (!lineId || !!line), download);

  if (readError) return <div className="wrap pace"><p role="alert">The project records could not be read.</p>
    <button type="button" className="btn" onClick={() => { setReadError(false); setReadAttempt(n => n + 1); }}>Try again</button></div>;
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
        title={`${recovery ? 'Customer report' : 'Client report'}${line ? ` — ${line.name}` : ''}`}
        says={recovery ? `${name} · ${paperKind}` : which === 'status'
            ? 'Line performance, open problems and next actions.'
            : 'Line performance, causes, actions and evidence.'}
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
          {status.statement && <li><b>Problem statement</b><span>{status.statement}</span></li>}
          <li><b>{status.manyLines ? 'Where the lines are' : 'Where the line is'}</b><span>{status.sentence}</span>
            <span className="sub">{status.slip}</span>
            {status.lines.map(g => <span key={g.line} className={g.short ? 'cr-short' : undefined}>{g.says}</span>)}
            {status.gapNone && <span className="sub">{status.gapNone}</span>}</li>
          <li><b>{recovery ? 'What needs attention' : 'Why we are not where we should be'}</b>
            {status.why.length === 0 && <span>{status.noExceptions}</span>}
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
          {report.recoveryStory?.phases.map(phase => <li key={phase.name}><b>{phase.name}</b>{phase.entries.map((entry, i) => <span key={i}><strong>{entry.label}</strong> · {entry.value}</span>)}</li>)}
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
          {report.noProblems && <li><b>{recovery ? 'Line findings' : 'Problems'}</b><span>{report.noProblems}</span></li>}
          {report.problems.map(p => <ProblemParts key={p.id} p={p} />)}
          {report.board.length > 0 && (
            <li><b>{recovery ? 'Actions' : 'The board by bone'}</b><span>{report.boardSays}</span>
              {report.board.flatMap(group => group.rows.map((row, i) => <span key={group.label + i}>
                <strong>{row.what}</strong> · {row.owner || 'No owner recorded'} · {row.when}
                {row.proved && <span className="sub">{row.proved}</span>}
              </span>))}
            </li>
          )}
          {!!report.talkReports?.length && <li><b>Line Talk reports</b>
            {report.talkReports.map(talk => <TalkReportDetails key={talk.id} report={talk} />)}
          </li>}
          {report.evidence.length > 0 && <li><b>Tool evidence</b>{report.evidence.map((entry, i) => <span key={i}><strong>{entry.title}</strong> · {entry.line}</span>)}</li>}
          {report.seen && <li><b>Problems recorded on the line</b><span>{report.seen.says}</span>{report.seen.rows.map((row, i) => <span key={i}>{row.what} · {row.state}{row.where && ' · ' + row.where}</span>)}{report.seen.closed.map((what, i) => <span key={`closed-${i}`}>Closed · {what}</span>)}</li>}
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
        {p.money && <span className="sub">{p.money}</span>}
        {p.from && <span>Where it came from: {p.from}</span>}
        {p.is.length > 0 && <span>Is: {p.is.join(' · ')}</span>}
        {p.isNot.length > 0 && <span>Is not: {p.isNot.join(' · ')}</span>}
        {!p.says && !p.measure && !p.from && !p.is.length && !p.isNot.length && <span className="sub">Not measured yet.</span>}
      </div>
      <div className="cr-part">
        <p className="cr-part-h">Why{p.whySays && <small> · {p.whySays}</small>}</p>
        {p.suggested && <span className="sub">{p.suggested}</span>}
        {p.checks.length > 0 && (
          <div className="cr-chain" aria-label="Causes thought of and checked">
            <span className="cr-chain-h">Causes thought of and checked{p.checkSays ? ` · ${p.checkSays}` : ''}</span>
            {p.checks.map((r, i) => (
              <span key={i} className="cr-cm">{r.cause} · {r.bone} · {r.rating} · {r.check} · {r.state}{r.found !== '—' ? ` · It found: ${r.found}` : ''}</span>
            ))}
            <span className="sub">Ratings are the team’s judgement, not measurements; the check decides.</span>
          </div>
        )}
        {p.chains.map(ch => (
          <div key={ch.cause.id} className={'cr-chain' + (ch.state === 'out' ? ' is-out' : '')}>
            <span className="cr-chain-h">{ch.head}{ch.from ? ` · ${ch.from}` : ''}</span>
            {ch.says && <span className="sub">{ch.says}</span>}
            {ch.checked && <span className="sub">{ch.checked}</span>}
            <ol>
              {ch.answers.map((a, i) => {
                const root = a.tag ? a.tag === 'the root' : ch.state === 'root' && i === ch.answers.length - 1;
                return <li key={i} className={root ? 'is-root' : undefined}>{a.depth && a.depth > 1 ? `${'– '.repeat(a.depth - 1)}` : ''}{a.text}{a.known ? ` (${a.known})` : ''}{a.tag ? ` — ${a.tag}` : root ? ' — the root' : ''}</li>;
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
        {p.counterWorth && <p className="sub">{p.counterWorth}</p>}
        {p.counter.length === 0 && <span className="sub">No fix on the board for it yet.</span>}
        {/* Each fix as the paper prints it: what, bone and owner, its state
            and day — and the day in words when it has no date. */}
        {p.counter.map((c, i) => (
          <span key={i} className="cr-cm">
            {c.what} · {c.bone} · {c.owner || 'No owner'} · <span className={'cr-said-st ' + stateClass(c.tone)}>{c.when}</span>
            {c.words ? ` · When: ${c.words}` : ''}{c.cause ? ` · For: ${c.cause}` : ''}{c.expect && c.tone !== 'done' ? ` · Should change: ${c.expect}` : ''}{c.worth ? ` · ${c.worth}` : ''}
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
