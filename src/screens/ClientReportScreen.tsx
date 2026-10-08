/* THE CLIENT REPORT for a stage-gate job — the page you open before sending
 * it. What is shown IS the PDF (drawn once, previewed in place on a desk), so
 * the screen and the paper cannot disagree. See lib/clientReport.ts. */
import { useEffect, useMemo, useState } from 'react';
import { usePdfPreview } from '../lib/usePdfPreview';
import { useWalkSnags } from '../lib/useWalkSnags';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { useMaterials } from '../lib/useMaterials';
import { usePrograms } from '../lib/usePrograms';
import { useStandards } from '../ui/StandardsCard';
import { statusReport } from '../lib/statusReport';
import { clientReport, machinesSay, type ClientReport } from '../lib/clientReport';
import { todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import type { Shot } from '../lib/testReport';
import type { jsPDF } from 'jspdf';
import { OnTargetLine } from '../ui/OnTarget';
import { CriticalStory, CriticalTag } from '../ui/CriticalFields';

/** A gate's counts with the abnormal ones in their colour — "2 late" red,
 *  "1 a problem" amber — the rest plain (the colour rules). */
function Says({ says }: { says: string }) {
  return <span>{says.split(' · ').map((p, i) => (
    <span key={i}>{i > 0 && ' · '}<span className={/^\d+ late$/.test(p) ? 'in-late' : /^\d+ a problem$/.test(p) ? 'in-problem' : undefined}>{p}</span></span>
  ))}</span>;
}

/* WHICH REPORT. The status report is one page and is the one that gets sent
   (lib/statusReport, docs/SIMPLE.md) — Rowland, 7 October: "I can't send that
   report out. It's too massive." The full report is the whole record, for
   whoever wants it. Both read the same reading, so they cannot disagree.
   THE PROGRAMS have a report of their own (8 October: "on programs they are
   missing from the reports — need its own report"): every program, machine
   by machine, its state and what was seen (lib/programsReport) — the rows the
   full report's Programs section prints. */
type Which = 'status' | 'full' | 'programs';

async function buildStatus(r: ClientReport): Promise<jsPDF> {
  const { loadPdfLib } = await import('../lib/savePdf');
  const { drawStatusReport } = await import('../lib/clientReportPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  await drawStatusReport(doc, r);
  return doc;
}

async function buildPrograms(r: ClientReport): Promise<jsPDF> {
  const { loadPdfLib } = await import('../lib/savePdf');
  const { drawProgramsReport } = await import('../lib/programsReportPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const reading = r.sections.find(s => s.gate === 'setup')?.programs;
  await drawProgramsReport(doc, { name: r.name, ...(r.lead ? { lead: r.lead } : {}), printed: r.printed,
    reading: reading ?? { lines: [], machines: [], total: 0, done: 0, baseline: 0, failed: 0, late: 0, open: 0, says: 'No programs yet' } });
  return doc;
}

async function buildPdf(r: ClientReport, withStandards: boolean): Promise<jsPDF> {
  const { loadPdfLib } = await import('../lib/savePdf');
  const { drawClientReport } = await import('../lib/clientReportPdf');
  const { pinShot, photoShot } = await import('../lib/testReport');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  /* One picture a fix: where it is on the line if it was pinned, otherwise its
     first photo, with what is marked on it. Fetched before drawing — the
     drawer never touches the store. */
  const shots = new Map<string, Shot>();
  for (const f of r.fixes.open) {
    const s = (await pinShot(f)) ?? (f.photoKey ? await photoShot(f.photoKey, f.photoPins) : undefined);
    if (s) shots.set(f.id, s);
  }
  const { ganttBy } = await import('../lib/gantt');
  await drawClientReport(doc, r, {
    shots,
    /* The plan page grouped the way this device's plan is drawn. */
    planBy: ganttBy(),
    standards: withStandards && r.standards.length
      ? async d => { const { drawStandards } = await import('../lib/standardPdf'); await drawStandards(d, r.standards, r.name, r.printed); }
      : undefined,
  });
  return doc;
}

const fileName = (r: ClientReport, which: Which) => pdfFileName(r.name, which === 'status' ? 'status report' : which === 'programs' ? 'programs' : 'client report', todayISO());

export function ClientReportScreen({ projectId }: { projectId: string }) {
  const { projects, loading } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const tt = useTesting(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  const standards = useStandards(projectId);
  const walk = useWalkSnags(projectId);
  const [withStandards, setWithStandards] = useState(true);
  /* ?doc=programs — opened from the Reports sheet or the Programs page. */
  const [which, setWhich] = useState<Which>(() => (/[?&]doc=programs\b/.test(window.location.hash) ? 'programs' : 'status'));
  const [busy, setBusy] = useState(false);
  /* What happened to the last press, said beside the button the way the test
     card and the day say it — a download with no word back read as nothing
     having happened, and a failure was an alert box. */
  const [said, setSaid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /* The preview beside the contents is for a desk. Followed, not read once: a
     laptop window snapped to half the screen and back kept whichever it
     opened at. */
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 900px)');
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const ready = !loading && !tt.loading && !mats.loading && !progs.loading && standards != null && walk != null && !!project;
  const report = useMemo(() => (ready && project ? clientReport({
    project, projects, assets: tt.assets, tests: tt.tests, items: tt.items,
    materials: mats.materials, programs: progs.programs, standards: standards ?? [], walk: walk ?? [], today: todayISO(),
  }) : null), [ready, project, projects, tt.assets, tt.tests, tt.items, mats.materials, progs.programs, standards, walk]);

  /* The preview is the PDF itself, redrawn when what is on it changes — and
     only then (lib/usePdfPreview). */
  const previewKey = useMemo(() => (report && wide ? `${which}|${withStandards}|${JSON.stringify(report)}` : null), [report, withStandards, wide, which]);
  const build = () => (which === 'status' ? buildStatus(report as ClientReport)
    : which === 'programs' ? buildPrograms(report as ClientReport) : buildPdf(report as ClientReport, withStandards));
  const preview = usePdfPreview(previewKey, build);
  const status = useMemo(() => (report ? statusReport(report) : null), [report]);

  const download = async () => {
    if (!report || busy) return;
    setBusy(true); setSaid(null); setErr(null);
    try {
      const { deliverPdf } = await import('../lib/savePdf');
      const how = await deliverPdf(await build(), fileName(report, which));
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('client report failed', e);
      setErr(`The report could not be made${e instanceof Error && e.message ? ` — ${e.message}` : ''}. Try again; if it fails again, reload the app.`);
    } finally { setBusy(false); }
  };

  if (!ready || !report || !project) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  return (
    <div className="wrap pace cr">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">{which === 'programs' ? 'Programs report' : 'Client report'}</h1>
          <p className="pace-lede">{which === 'status'
            ? 'One page: where we are, why we are not where we should be, and what we are doing about it. The one to send.'
            : which === 'programs'
              ? 'Every program, machine by machine — where each stands, what was seen, and what was said before.'
              : 'The whole record, in the order the job is run — for whoever wants every detail.'}</p>
          {/* The answer the first page leads with (lib/onTarget). */}
          {/* On the status view, the verdict and the handover only — what
              is wrong is listed under it, once. */}
          {/* Not on the programs report, which is about the programs alone. */}
          {which !== 'programs' && <OnTargetLine v={which === 'status' && status ? status.verdict : report.onTarget} />}
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-primary" onClick={() => void download()} disabled={busy}>{busy ? 'Making it…' : 'PDF'}</button>
        </div>
      </header>
      {said && <p className="tc-ok" role="status">{said}</p>}
      {err && <p className="sub tw-err" role="alert">{err}</p>}

      {/* WHICH ONE — the short one first. */}
      <span className="cw-seg cr-which" role="group" aria-label="Which report">
        <button type="button" className={'chip' + (which === 'status' ? ' on' : '')} aria-pressed={which === 'status'} onClick={() => setWhich('status')}>Status — 1 page</button>
        <button type="button" className={'chip' + (which === 'full' ? ' on' : '')} aria-pressed={which === 'full'} onClick={() => setWhich('full')}>Full report</button>
        <button type="button" className={'chip' + (which === 'programs' ? ' on' : '')} aria-pressed={which === 'programs'} onClick={() => setWhich('programs')}>Programs</button>
      </span>

      {which === 'programs' && (() => {
        const pr = report.sections.find(s => s.gate === 'setup')?.programs;
        return (
          <div className={'cr-body' + (wide ? ' is-wide' : '')}>
            <ol className="cr-toc">
              <li><b>Programs</b><span>{pr ? pr.says : 'No programs yet — write them on Set up’s programs stage, or on the Programs page.'}</span></li>
              {pr?.machines.map(m => (
                <li key={m.name}><b>{m.name}</b>
                  {m.lines.map((l, i) => (
                    <span key={i}>{l.what} — <b className={'cr-prog is-' + l.tone}>{l.word}</b>{l.note ? `: ${l.note}` : ''}</span>
                  ))}
                </li>
              ))}
            </ol>
            {wide && (
              <div className="cr-page">
                {preview ? <iframe title="The programs report" src={preview} /> : <p className="sub">Drawing the report…</p>}
              </div>
            )}
          </div>
        );
      })()}

      {which === 'status' && status && (
        <div className={'cr-body' + (wide ? ' is-wide' : '')}>
          <ol className="cr-toc">
            <li><b>Where we are</b><span>{report.gates.map(g => `${g.label}: ${g.says}`).join(' · ')}</span></li>
            <li><b>Why we are not where we should be</b>
              {status.why.length ? status.why.map((w, i) => <span key={i}><b className={w.kind === 'risk' || w.kind === 'problem' ? 'in-problem' : 'in-late'}>{w.tag}</b> {w.what}</span>) : <span>Nothing — everything is on plan.</span>}
              {status.whyMore > 0 && <span className="sub">and {status.whyMore} more — in the full report</span>}</li>
            <li><b>What we are doing about it</b>
              {status.next.length ? status.next.map((n, i) => <span key={i}>{n.what} — <span className={n.late ? 'in-late' : undefined}>{n.when}</span></span>) : <span>No fixes open.</span>}
              {status.nextMore > 0 && <span className="sub">and {status.nextMore} more open — in the full report</span>}</li>
            {status.programs && <li><b>Programs</b><span>{status.programs}</span></li>}
            {status.runs.length > 0 && <li><b>Performance runs</b>{status.runs.map((r, i) => <span key={i}>{r.title}{r.machine ? ` — ${r.machine}` : ''}: net {r.net} · {r.outcome}</span>)}</li>}
          </ol>
          {wide && (
            <div className="cr-page">
              {preview ? <iframe title="The status report" src={preview} /> : <p className="sub">Drawing the report…</p>}
            </div>
          )}
        </div>
      )}

      {which === 'full' && <>
      {report.standards.length > 0 && (
        <label className="cr-opt">
          <input type="checkbox" checked={withStandards} onChange={e => setWithStandards(e.target.checked)} />
          Include the line standard — {report.standards.length} product{report.standards.length === 1 ? '' : 's'}, a page each
        </label>
      )}

      {/* What is in it, in words — the whole of it on a phone, the contents
          beside the page on a desk. */}
      <div className={'cr-body' + (wide ? ' is-wide' : '')}>
        <ol className="cr-toc">
          {/* CRITICAL ISSUES — first, as on the paper, each told whole
              (lib/critical): what it means for the business, the ways round
              it with the agreed one, its fix and how it stands. */}
          {([['Critical issues', report.critical, false], ['High risks', report.risks, true]] as const).map(([title, set, risk]) =>
            (set.open.length + set.sorted.length) > 0 && (
            <li key={title} className="cr-crit">
              <b>{title}</b>
              <span>{set.open.length} open{set.sorted.length ? ` · ${set.sorted.length} sorted` : ''}</span>
              {set.open.map((c, i) => (
                <div key={i} className={'crit-on-stage' + (risk ? ' is-risk' : '')}>
                  <span><CriticalTag risk={risk} /> <b>{c.what}</b></span>
                  <span className="sub">{c.meta}</span>
                  <CriticalStory impact={c.impact} risk={risk} couldLose={c.couldLose}
                    ways={c.ways.map((w, k) => ({ id: String(k), what: w.what, agreed: w.agreed }))} />
                  {c.fix && <span className="sub">{c.fix}</span>}
                  <span className="sub"><b>Now:</b> {c.state}</span>
                </div>
              ))}
              {set.sorted.map((l, i) => <span key={i} className="sub">{l}</span>)}
            </li>
          ))}
          <li><b>Where the job is</b><span>{report.sentence}</span><span className="sub">{machinesSay(report)}</span></li>
          {report.sections.map(s => (
            <li key={s.gate}>
              <b>{s.label}</b><Says says={s.says} />
              {/* How each stage went — the same rows, in the same words, as
                  the paper prints under the gate's grid. */}
              {s.accounts && s.accounts.length > 0 && (
                <ul className="cr-said" aria-label={`How each stage went — ${s.label}`}>
                  {s.accounts.map((a, i) => (
                    <li key={i}>
                      <p className="cr-said-h">
                        <b>{a.machine} — {a.stage}</b>
                        <span className="cr-said-when">{a.when}</span>
                        <span className={`cr-said-st is-${a.tone}`}>{a.state}</span>
                      </p>
                      <p className="cr-said-t">{a.said}</p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {report.plan.length > 0 && <li><b>The plan</b><span>A Gantt chart, landscape — {report.plan.length} dated, on a calendar</span></li>}
          <li><b>Fixes</b><span>{report.fixes.open.length} open · {report.fixes.done.length} done</span></li>
          {(report.noted.open.length + report.noted.sorted.length) > 0 && <li><b>Problems with no fix</b><span>{report.noted.open.length} open{report.noted.sorted.length ? ` · ${report.noted.sorted.length} sorted` : ''}</span></li>}
          {report.waiting.length > 0 && <li><b>What we’re waiting on</b><span>{report.waiting.map(w => `${w.what} ${w.open}`).join(' · ')}</span></li>}
          {report.standards.length > 0 && withStandards && <li><b>Line standard</b><span>{report.standards.map(s => s.product).join(' · ')}</span></li>}
        </ol>
        {wide && (
          <div className="cr-page">
            {preview ? <iframe title="The client report" src={preview} /> : <p className="sub">Drawing the report…</p>}
          </div>
        )}
      </div>
      </>}
    </div>
  );
}
