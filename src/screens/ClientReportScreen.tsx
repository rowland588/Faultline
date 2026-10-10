/* THE CLIENT REPORT for a stage-gate job — the page you open before sending
 * it. What is shown IS the PDF (drawn once, previewed in place on a desk), so
 * the screen and the paper cannot disagree. See lib/clientReport.ts. */
import { jobLink } from '../lib/machineLabels';
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
import { handoverReport, type HandoverReport } from '../lib/handoverReport';
import { todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import type { Shot } from '../lib/testReport';
import type { jsPDF } from 'jspdf';
import { OnTargetLine } from '../ui/OnTarget';
import { CriticalStory, CriticalTag } from '../ui/CriticalFields';
import { DraftArea } from '../ui/Draft';
import { useAccess } from '../cloud/access';
import { openRecord } from '../ui/RecordDrawer';
import { niceDay } from '../lib/weeks';

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
/* THE HANDOVER REPORT (lib/handoverReport, docs/HANDOVER.md) — the line as
   it was really handed over, every machine, and the lines to sign. */
type Which = 'status' | 'full' | 'programs' | 'handover';

async function buildStatus(r: ClientReport): Promise<jsPDF> {
  const { loadPdfLib, titlePdf } = await import('../lib/savePdf');
  const { drawStatusReport } = await import('../lib/clientReportPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${r.name} — status report`);
  await drawStatusReport(doc, r);
  return doc;
}

async function buildPrograms(r: ClientReport): Promise<jsPDF> {
  const { loadPdfLib, titlePdf } = await import('../lib/savePdf');
  const { drawProgramsReport } = await import('../lib/programsReportPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${r.name} — programs report`);
  const reading = r.sections.find(s => s.gate === 'setup')?.programs;
  await drawProgramsReport(doc, { name: r.name, ...(r.lead ? { lead: r.lead } : {}), printed: r.printed,
    reading: reading ?? { lines: [], machines: [], total: 0, done: 0, baseline: 0, failed: 0, late: 0, open: 0, doneAll: 0, says: 'No programs yet' } });
  return doc;
}

async function buildHandover(r: HandoverReport): Promise<jsPDF> {
  const { loadPdfLib, titlePdf } = await import('../lib/savePdf');
  const { drawHandoverReport } = await import('../lib/handoverPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${r.name} — handover report`);
  await drawHandoverReport(doc, r);
  return doc;
}

async function buildPdf(r: ClientReport, withStandards: boolean): Promise<jsPDF> {
  const { loadPdfLib, titlePdf } = await import('../lib/savePdf');
  const { drawClientReport } = await import('../lib/clientReportPdf');
  const { pinShot, photoShot } = await import('../lib/testReport');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${r.name} — client report`);
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

const fileName = (r: ClientReport, which: Which) => pdfFileName(r.name, which === 'status' ? 'status report' : which === 'programs' ? 'programs' : which === 'handover' ? 'handover report' : 'client report', todayISO());

export function ClientReportScreen({ projectId }: { projectId: string }) {
  const { projects, loading, rename } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const can = useAccess(projectId);
  /* A row on the report opens its record in the drawer — the problem, the
     risk, the fix — to change it or take it off (docs/DOORS.md). Rowland, 9
     October: "I cannot edit the problem or delete it." */
  const open = (id?: string) => { if (id) openRecord(projectId, id); };
  const tt = useTesting(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  const standards = useStandards(projectId);
  const walk = useWalkSnags(projectId);
  const [withStandards, setWithStandards] = useState(true);
  /* ?doc=programs — opened from the Reports sheet or the Programs page. */
  const [which, setWhich] = useState<Which>(() => (/[?&]doc=programs\b/.test(window.location.hash) ? 'programs'
    : /[?&]doc=handover\b/.test(window.location.hash) ? 'handover' : 'status'));
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

  const handover = useMemo(() => (ready && project ? handoverReport({
    project, assets: tt.assets, tests: tt.tests, items: tt.items, materials: mats.materials, programs: progs.programs, today: todayISO(),
  }) : null), [ready, project, tt.assets, tt.tests, tt.items, mats.materials, progs.programs]);

  /* The preview is the PDF itself, redrawn when what is on it changes — and
     only then (lib/usePdfPreview). */
  const previewKey = useMemo(() => (report && wide ? `${which}|${withStandards}|${JSON.stringify(which === 'handover' ? handover : report)}` : null), [report, handover, withStandards, wide, which]);
  /* THE JOB'S ADDRESS, for the code on the first page (lib/report/codeHeader). */
  const link = jobLink(`${location.origin}${location.pathname}`, projectId);
  const build = () => (which === 'status' ? buildStatus({ ...(report as ClientReport), link })
    : which === 'programs' ? buildPrograms(report as ClientReport)
      : which === 'handover' ? buildHandover({ ...(handover as HandoverReport), link }) : buildPdf({ ...(report as ClientReport), link }, withStandards));
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
          <h1 className="pace-title">{which === 'programs' ? 'Programs report' : which === 'handover' ? 'Handover report' : 'Client report'}</h1>
          <p className="pace-lede">{which === 'status'
            ? 'One page: where we are, why we are not where we should be, and what we are doing about it. The one to send.'
            : which === 'programs'
              ? 'Every program, machine by machine — where each stands, what was seen, and what was said before.'
              : which === 'handover'
                ? 'The line as it was really handed over — every machine, what it was proved against, what was still open, and who signed.'
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

      {/* THE COMMENTARY — the lead's own words on where the job is, printed
          under "where we are" on the status report and the full report
          (Project.reportNote). The owner and the team write it; everybody reads it. */}
      {/* THE TEAM WRITES IT TOO (Rowland, 9 October: yes) — it is the work,
          not what was agreed: the live database lets the team change the
          project row and keeps only the agreed fields for the owner
          (faultline_keep_agreement), and the commentary is not one of them. */}
      {which !== 'programs' && which !== 'handover' && (can.edit || project.reportNote) && (
        <section className="cr-note">
          <span className="cr-note-h">Commentary <i className="cw-f-opt">on both reports, under where we are</i></span>
          {can.edit
            ? <DraftArea className="text-area" rows={3} better="note" value={project.reportNote ?? ''} ariaLabel="Commentary"
                placeholder="What the numbers mean this week — e.g. Install is two days behind on the Ishida, caught up by Friday; programs on track for the Tesco trial."
                onSave={v => void rename(project, { reportNote: v.trim() || undefined, reportNoteAt: v.trim() ? Date.now() : undefined })} />
            : <p className="cr-note-t">{project.reportNote}</p>}
          {project.reportNoteAt && project.reportNote && <span className="sub">written {niceDay(todayISO(new Date(project.reportNoteAt)))}</span>}
        </section>
      )}

      {/* WHICH ONE — the short one first. */}
      <span className="cw-seg cr-which" role="group" aria-label="Which report">
        <button type="button" className={'chip' + (which === 'status' ? ' on' : '')} aria-pressed={which === 'status'} onClick={() => setWhich('status')}>Status — 1 page</button>
        <button type="button" className={'chip' + (which === 'full' ? ' on' : '')} aria-pressed={which === 'full'} onClick={() => setWhich('full')}>Full report</button>
        <button type="button" className={'chip' + (which === 'programs' ? ' on' : '')} aria-pressed={which === 'programs'} onClick={() => setWhich('programs')}>Programs report</button>
        <button type="button" className={'chip' + (which === 'handover' ? ' on' : '')} aria-pressed={which === 'handover'} onClick={() => setWhich('handover')}>Handover report</button>
      </span>

      {which === 'handover' && handover && (
        <div className={'cr-body' + (wide ? ' is-wide' : '')}>
          <ol className="cr-toc">
            <li><b>{handover.machinesSaid}</b><span>{handover.sentence}</span></li>
            {handover.machines.map(m => (
              <li key={m.name}><b>{m.name}</b>
                <span>{m.at}{m.with.length > 0 && <span className="in-problem"> · with {m.with.join(' · ')}</span>}</span>
                {m.open.length > 0 && <span className="sub">{m.open.length} still open</span>}
              </li>
            ))}
            {handover.line.length > 0 && <li><b>Still open on the line</b>{handover.line.map((l, i) => <span key={i}>{l}</span>)}</li>}
            <li><b>Signed</b><span>{handover.sign.join(' · ')} — lines to sign on the paper</span></li>
          </ol>
          {wide && (
            <div className="cr-page">
              {preview ? <iframe title="The handover report" src={preview} /> : <p className="sub">Drawing the report…</p>}
            </div>
          )}
        </div>
      )}

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
              {status.why.length ? status.why.map((w, i) => {
                const words = <><b className={w.kind === 'risk' || w.kind === 'problem' ? 'in-problem' : w.kind === 'unplanned' ? undefined : 'in-late'}>{w.tag}</b> {w.what}</>;
                return w.id ? <button key={i} type="button" className="cr-door" onClick={() => open(w.id)}>{words}</button> : <span key={i}>{words}</span>;
              }) : <span>Nothing — everything is on plan.</span>}
              {status.whyMore > 0 && <span className="sub">and {status.whyMore} more — in the full report</span>}</li>
            <li><b>What we are doing about it — the fixes</b>
              {status.next.length ? status.next.map((n, i) => <button key={i} type="button" className="cr-door" onClick={() => open(n.id)}>{n.what} — <span className={n.late ? 'in-late' : undefined}>{n.when}</span></button>) : <span>No fixes open.</span>}
              {status.nextMore > 0 && <span className="sub">and {status.nextMore} more open — in the full report</span>}</li>
            {status.programs && <li><b>Programs</b><span>{status.programs}</span>
              {status.programLines.map((p, i) => <span key={i}>{p.what} — <b className={'cr-prog is-' + p.tone}>{p.word}</b>{p.note ? `: ${p.note}` : ''}</span>)}
              {status.programMore > 0 && <span className="sub">and {status.programMore} more — in the programs report</span>}</li>}
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
                  <button type="button" className="cr-door" onClick={() => open(c.id)}><CriticalTag risk={risk} /> <b>{c.what}</b></button>
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
                      {a.said && <p className="cr-said-t">{a.said}</p>}
                      {/* Its files by name, as the paper prints them (docs/PANELS.md). */}
                      {a.files && <p className="cr-said-t sub">{a.files}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {report.plan.length > 0 && <li><b>The plan</b><span>A Gantt chart, landscape — {report.plan.length} dated, on a calendar</span></li>}
          <li><b>Fixes</b><span>{report.fixes.open.length} open · {report.fixes.done.length} done</span>
            {report.fixes.open.map(f => <button key={f.id} type="button" className="cr-door" onClick={() => open(f.id)}>{f.title}{f.machine ? ` — ${f.machine}` : ''} · {f.when}</button>)}</li>
          {report.notedRows.length > 0 && <li><b>Problems with no fix</b><span>{report.noted.open.length} open{report.noted.sorted.length ? ` · ${report.noted.sorted.length} sorted` : ''}</span>
            {report.notedRows.map(n => <button key={n.id} type="button" className={'cr-door' + (n.sorted ? ' is-sorted' : '')} onClick={() => open(n.id)}>{n.text}{n.sorted ? ' · sorted' : ''}</button>)}</li>}
          {report.waiting.length > 0 && <li><b>What we’re waiting on</b>
            {report.waiting.filter(w => w.open > 0).map(w => <span key={w.key}><b>{w.what} {w.open}</b>{w.names?.length ? ` — ${w.names.slice(0, 8).join(' · ')}${w.names.length > 8 ? ` · and ${w.names.length - 8} more` : ''}` : ''}</span>)}</li>}
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
