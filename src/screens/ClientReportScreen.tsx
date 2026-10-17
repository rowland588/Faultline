/* THE CLIENT REPORT for a stage-gate job — the page you open before sending
 * it. What is shown IS the PDF (drawn once, previewed in place on a desk), so
 * the screen and the paper cannot disagree. See lib/clientReport.ts. */
import { useCaseLines } from '../lib/useJobCase';
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
import { commissioningReport, type CommissioningReport } from '../lib/commissioningReport';
import { boardPrograms } from '../lib/commissionPrograms';
import { OnTargetLine } from '../ui/OnTarget';
import { CriticalStory, CriticalTag } from '../ui/CriticalFields';
import { DraftArea } from '../ui/Draft';
import { useAccess } from '../cloud/access';
import { openRecord } from '../ui/RecordDrawer';
import { niceDay } from '../lib/weeks';
import { useJobStudies } from '../ui/StudyLinks';
import { useStudyContext } from '../ui/ShiftLosses';
import { nav } from '../state/useRoute';
import { useLineRecords } from '../lib/useLineRecords';
import { jobFactoryLines, jobLinePrograms } from '../lib/lineRecords';
import { moneyTile } from '../lib/stageGateLean';
import { listAllSnags, onDataChange } from '../db';
import { withoutDemo } from '../lib/demo';
import { openQuickSnag } from '../snag/QuickSnag';
import type { Snag } from '../snag/types';
import { PRIORITY_WORD } from '../lib/snagsReport';

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
type Which = 'status' | 'full' | 'programs' | 'handover' | 'commissioning';

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
  const setup = r.sections.find(s => s.gate === 'setup');
  const reading = setup?.programs;
  /* the job's lines' own programs, after the job's (lib/clientReport) */
  const linePrograms = setup?.linePrograms ?? [];
  await drawProgramsReport(doc, { name: r.name, ...(r.lead ? { lead: r.lead } : {}), printed: r.printed, linePrograms, money: moneyTile(r.figures),
    reading: reading ?? { lines: [], machines: [], total: 0, done: 0, baseline: 0, failed: 0, late: 0, open: 0, notTested: 0, noProgram: 0, doneAll: 0,
      says: linePrograms.length ? 'None of the job’s own yet — its line’s are below' : 'No programs yet' } });
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

/* THE COMMISSIONING REPORT AND ITS CARDS (lib/commissioningReport; Rowland,
   14 October: "a commissioning report, commissioning cards, something that way
   I can present in the meeting or send"). */
async function buildCommissioning(r: CommissioningReport, cards = false): Promise<jsPDF> {
  const { loadPdfLib, titlePdf } = await import('../lib/savePdf');
  const { drawCommissioningReport, drawCommissioningCards } = await import('../lib/commissioningPdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${r.name} — commissioning ${cards ? 'cards' : 'report'}`);
  if (cards) await drawCommissioningCards(doc, r); else await drawCommissioningReport(doc, r);
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
      ? async d => { const { drawStandards } = await import('../lib/standardPdf'); const { worksFor } = await import('../ui/WorkBalance'); const { shiftShortsFor } = await import('../ui/ShiftCapacity'); await drawStandards(d, r.standards, r.name, r.printed, await worksFor(r.standards), await shiftShortsFor(r.standards)); }
      : undefined,
  });
  return doc;
}

const fileName = (r: ClientReport, which: Which) => pdfFileName(r.name, which === 'status' ? 'status report' : which === 'programs' ? 'programs' : which === 'handover' ? 'handover report' : which === 'commissioning' ? 'commissioning report' : 'client report', todayISO());

export function ClientReportScreen({ projectId }: { projectId: string }) {
  const { projects, loading, rename } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const can = useAccess(projectId);
  /* A row on the report opens its record in the drawer — the problem, the
     risk, the fix — to change it or take it off (docs/DOORS.md). Rowland, 9
     October: "I cannot edit the problem or delete it." */
  const open = (id?: string) => { if (id) openRecord(projectId, id); };
  /* A problem on the register opens where it is kept (snag/QuickSnag). */
  const openSnag = (id?: string) => { const sn = id ? snags?.find(x => x.id === id) : undefined; if (sn) openQuickSnag(sn); };
  const tt = useTesting(projectId);
  /* The job's studies — the Evidence appendix and each fix's line (lib/studyLinks). */
  const studies = useJobStudies(projectId);
  /* a loss count reads its line's stops and cost model (lib/studyLinks) */
  const studyContext = useStudyContext(studies);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  const standards = useStandards(projectId);
  const walk = useWalkSnags(projectId);
  /* THE JOB'S LINES (lib/useLineRecords) — their own programs, planned with
     no job and shown on the job's Programs page; every study, so a program
     proved by one on its line says so; the tests on any job that prove one. */
  const rec = useLineRecords();
  /* THE REGISTER'S PROBLEMS taken for this job — "Problems for this job —
     not on it yet" on the Fixes page, and on every paper here. */
  const [snags, setSnags] = useState<Snag[] | null>(null);
  useEffect(() => {
    let on = true;
    const load = () => void listAllSnags().then(a => { if (on) setSnags(a); }).catch(() => { if (on) setSnags([]); });
    load();
    const off = onDataChange(load);
    return () => { on = false; off(); };
  }, []);
  const lineFacts = useMemo(() => ({
    linePrograms: jobLinePrograms(projectId, rec.all, rec.machines, rec.programs, rec.jobLines),
    assigned: withoutDemo(snags ?? [], rec.all),
    lineName: (id: string) => rec.all.find(w => w.id === id)?.name ?? 'a line',
    /* what a day late costs — the job's lines' speed, shifts and margin a pack (lib/lineLoss linesDay) */
    factoryLines: jobFactoryLines(projectId, rec.jobLines, rec.all),
  }), [rec, snags, projectId]);
  const [withStandards, setWithStandards] = useState(true);
  /* ?doc=programs — opened from the Reports sheet or the Programs page. */
  const [which, setWhich] = useState<Which>(() => (/[?&]doc=programs\b/.test(window.location.hash) ? 'programs'
    : /[?&]doc=handover\b/.test(window.location.hash) ? 'handover'
      : /[?&]doc=commissioning\b/.test(window.location.hash) ? 'commissioning' : 'status'));
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

  /* the job's lines as its case reads them — the case under where we are (lib/useJobCase) */
  const caseLines = useCaseLines(projectId);
  const ready = !loading && !tt.loading && !mats.loading && !progs.loading && standards != null && walk != null && !rec.loading && snags != null && caseLines != null && !!project;
  const report = useMemo(() => (ready && project ? clientReport({
    project, projects, assets: tt.assets, tests: tt.tests, items: tt.items,
    materials: mats.materials, programs: progs.programs, standards: standards ?? [], walk: walk ?? [], studies, studyContext, today: todayISO(),
    proofStudies: rec.studies, provingTests: rec.provingTests, ...lineFacts, ...(caseLines ? { caseLines } : {}),
  }) : null), [ready, project, projects, tt.assets, tt.tests, tt.items, mats.materials, progs.programs, standards, walk, studies, studyContext, rec.studies, rec.provingTests, lineFacts, caseLines]);

  const handover = useMemo(() => (ready && project ? handoverReport({
    project, assets: tt.assets, tests: tt.tests, items: tt.items, materials: mats.materials, programs: progs.programs, studies, today: todayISO(),
    proofStudies: rec.studies, provingTests: rec.provingTests, ...lineFacts,
  }) : null), [ready, project, tt.assets, tt.tests, tt.items, mats.materials, progs.programs, studies, rec.studies, rec.provingTests, lineFacts]);

  /* THE COMMISSIONING REPORT — the client report's reading of Commission,
     the handover reading's machines, and the programs the board counts:
     the job's and each line's this job has a test for (lib/commissionPrograms). */
  const commissioning = useMemo(() => (report && handover ? commissioningReport({
    client: report, handover, assets: tt.assets, tests: tt.tests, today: todayISO(),
    programs: boardPrograms({ jobPrograms: progs.programs, lines: lineFacts.linePrograms, assets: tt.assets, tests: tt.tests, items: tt.items, holder: project ?? undefined, projectId }),
  }) : null), [report, handover, tt.assets, tt.tests, tt.items, progs.programs, lineFacts.linePrograms, project, projectId]);
  const [cardsBusy, setCardsBusy] = useState(false);

  /* The preview is the PDF itself, redrawn when what is on it changes — and
     only then (lib/usePdfPreview). */
  const previewKey = useMemo(() => (report && wide ? `${which}|${withStandards}|${JSON.stringify(which === 'handover' ? handover : which === 'commissioning' ? commissioning : report)}` : null), [report, handover, commissioning, withStandards, wide, which]);
  /* THE JOB'S ADDRESS, for the code on the first page (lib/report/codeHeader). */
  const link = jobLink(`${location.origin}${location.pathname}`, projectId);
  const build = () => (which === 'status' ? buildStatus({ ...(report as ClientReport), link })
    : which === 'programs' ? buildPrograms(report as ClientReport)
      : which === 'handover' ? buildHandover({ ...(handover as HandoverReport), link, money: moneyTile((report as ClientReport).figures) })
        : which === 'commissioning' ? buildCommissioning({ ...(commissioning as CommissioningReport), link })
          : buildPdf({ ...(report as ClientReport), link }, withStandards));
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

  /* THE CARDS — a page a machine, for the meeting (lib/commissioningPdf). */
  const downloadCards = async () => {
    if (!commissioning || cardsBusy) return;
    setCardsBusy(true); setSaid(null); setErr(null);
    try {
      const { deliverPdf } = await import('../lib/savePdf');
      const how = await deliverPdf(await buildCommissioning({ ...commissioning, link }, true), pdfFileName(commissioning.name, 'commissioning cards', todayISO()));
      setSaid(how === 'downloaded' ? 'Cards saved — open or send them from the bar below.' : 'Cards ready — open them from the bar below.');
    } catch (e) {
      console.error('commissioning cards failed', e);
      setErr(`The cards could not be made${e instanceof Error && e.message ? ` — ${e.message}` : ''}. Try again; if it fails again, reload the app.`);
    } finally { setCardsBusy(false); }
  };

  if (!ready || !report || !project) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  return (
    <div className="wrap pace cr">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1 className="pace-title">{which === 'programs' ? 'Programs report' : which === 'handover' ? 'Handover report' : which === 'commissioning' ? 'Commissioning report' : 'Client report'}</h1>
          <p className="pace-lede">{which === 'status'
            ? 'One page: where we are, why we are not where we should be, and what we are doing about it. The one to send.'
            : which === 'programs'
              ? 'Every program, machine by machine — where each stands, what was seen, and what was said before.'
              : which === 'handover'
                ? 'The line as it was really handed over — every machine, what it was proved against, what was still open, and who signed.'
              : which === 'commissioning'
                ? 'Where commissioning has got to, machine by machine — the tests, the programs, the problems and what is booked next. For the meeting, or to send; the cards are a page a machine.'
              : 'The whole record, in the order the job is run — for whoever wants every detail.'}</p>
          {/* The answer the first page leads with (lib/onTarget). */}
          {/* On the status view, the verdict and the handover only — what
              is wrong is listed under it, once. */}
          {/* Not on the programs report, which is about the programs alone. */}
          {which !== 'programs' && <OnTargetLine v={which === 'status' && status ? status.verdict : report.onTarget} />}
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-primary" onClick={() => void download()} disabled={busy}>{busy ? 'Making it…' : 'PDF'}</button>
          {which === 'commissioning' && (
            <button className="btn" onClick={() => void downloadCards()} disabled={cardsBusy || !commissioning}
              aria-label="Commissioning cards — a page a machine (PDF)">{cardsBusy ? 'Making…' : 'Cards — a page a machine'}</button>
          )}
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
          <span className="cr-note-h">Commentary <i className="cw-f-opt">on the status, full and commissioning reports, under where we are</i></span>
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
        <button type="button" className={'chip' + (which === 'commissioning' ? ' on' : '')} aria-pressed={which === 'commissioning'} onClick={() => setWhich('commissioning')}>Commissioning</button>
        <button type="button" className={'chip' + (which === 'handover' ? ' on' : '')} aria-pressed={which === 'handover'} onClick={() => setWhich('handover')}>Handover report</button>
      </span>

      {/* THE COMMISSIONING REPORT, in words beside its page (on a phone, the
          words alone) — the same reading the PDF draws */}
      {which === 'commissioning' && commissioning && (
        <div className={'cr-body' + (wide ? ' is-wide' : '')}>
          <ol className="cr-toc cm-toc">
            <li><b>Where we are</b><span>Commission: {commissioning.says}</span><span className="sub">{commissioning.dates}</span></li>
            <li><b>Machine by machine</b><span className="sub">{commissioning.machinesSaid}</span>
              {commissioning.machines.map(m => (
                <span key={m.name} className="cm-m">
                  <b>{m.name}</b> <span className={'cm-word is-' + m.verdict.tone}>{m.verdict.word}</span>
                  <span className="sub"> · {m.testsSaid}{m.programs ? ` · programs: ${m.programs}` : ''}{m.next ? ` · next: ${m.next}` : ''}</span>
                </span>
              ))}
            </li>
            <li><b>Why we are not where we should be</b>
              {commissioning.why.length ? commissioning.why.map((w, i) => <span key={i} className="in-problem">{w.text}{w.meta ? <span className="sub"> — {w.meta}</span> : null}</span>)
                : <span>Nothing — no test has failed or gone late, and no critical problem is open.</span>}
            </li>
            <li><b>What we are doing about it</b>
              {commissioning.doing.length ? commissioning.doing.map((w, i) => <span key={i}>{w.text}{w.meta ? <span className="sub"> — {w.meta}</span> : null}</span>)
                : <span>No fix open and no problem taken for the job.</span>}
              {commissioning.booked.length > 0 && <span className="sub">Booked next: {commissioning.booked.slice(0, 5).map(b => b.text).join(' · ')}{commissioning.booked.length > 5 ? ` · and ${commissioning.booked.length - 5} more` : ''}</span>}
            </li>
          </ol>
          {wide && (
            <div className="cr-page">
              {preview ? <iframe title="The commissioning report" src={preview} /> : <p className="sub">Drawing the report…</p>}
            </div>
          )}
        </div>
      )}

      {which === 'handover' && handover && (
        <div className={'cr-body' + (wide ? ' is-wide' : '')}>
          <ol className="cr-toc">
            <li><b>{handover.machinesSaid}</b><span>{handover.sentence}</span></li>
            {handover.machines.map(m => (
              <li key={m.name}><b>{m.name}</b>
                <span>{m.at}{m.with.length > 0 && <span className="in-problem"> · with {m.with.join(' · ')}</span>}</span>
                {m.programs && <span className="sub">Programs: {m.programs}</span>}
                {m.open.length > 0 && <span className="sub">{m.open.length} still open</span>}
              </li>
            ))}
            {handover.line.length > 0 && <li><b>Still open on the line</b>{handover.line.map((l, i) => <span key={i}>{l}</span>)}</li>}
            {handover.linePrograms.map(lp => <li key={lp.line}><b>On {lp.line}, with no job — programs</b><span>{lp.says}</span>{lp.open.map((o, i) => <span key={i} className="sub">{o}</span>)}</li>)}
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
        const lps = report.sections.find(s => s.gate === 'setup')?.linePrograms ?? [];
        return (
          <div className={'cr-body' + (wide ? ' is-wide' : '')}>
            <ol className="cr-toc">
              <li><b>Programs</b><span>{pr ? pr.says : lps.length ? 'None of the job’s own yet — its line’s are below.' : 'No programs yet — write them on Set up’s programs stage, or on the Programs page.'}</span></li>
              {pr?.machines.map(m => (
                <li key={m.name}><b>{m.name}</b>
                  {m.lines.map((l, i) => (
                    <span key={i}>{l.what} — <b className={'cr-prog is-' + l.tone}>{l.word}</b>{l.note ? `: ${l.note}` : ''}</span>
                  ))}
                </li>
              ))}
              {/* THE LINE'S OWN PROGRAMS — as the job's Programs page shows them */}
              {lps.map(lp => (
                <li key={lp.line}><b>On {lp.line}, with no job</b><span>{lp.reading.says}</span>
                  {lp.reading.lines.map((l, i) => <span key={i}>{l.machine} — {l.what} — <b className={'cr-prog is-' + l.tone}>{l.word}</b>{l.note ? `: ${l.note}` : ''}</span>)}
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
                const words = <><b className={w.kind === 'risk' || w.kind === 'problem' || w.kind === 'assigned' ? 'in-problem' : w.kind === 'unplanned' ? undefined : 'in-late'}>{w.tag}</b> {w.what}</>;
                return w.snagId ? <button key={i} type="button" className="cr-door" onClick={() => openSnag(w.snagId)}>{words}</button>
                  : w.id ? <button key={i} type="button" className="cr-door" onClick={() => open(w.id)}>{words}</button> : <span key={i}>{words}</span>;
              }) : <span>Nothing — everything is on plan.</span>}
              {status.whyMore > 0 && <span className="sub">and {status.whyMore} more — in the full report</span>}</li>
            <li><b>What we are doing about it — the fixes</b>
              {status.next.length ? status.next.map((n, i) => <button key={i} type="button" className="cr-door" onClick={() => open(n.id)}>{n.what} — <span className={n.late ? 'in-late' : undefined}>{n.when}</span></button>) : <span>No fixes open.</span>}
              {status.nextMore > 0 && <span className="sub">and {status.nextMore} more open — in the full report</span>}</li>
            {status.programs && <li><b>Programs</b><span>{status.programs}</span>
              {status.programLines.map((p, i) => <span key={i}>{p.what} — <b className={'cr-prog is-' + p.tone}>{p.word}</b>{p.note ? `: ${p.note}` : ''}</span>)}
              {status.programMore > 0 && <span className="sub">and {status.programMore} more — in the programs report</span>}</li>}
            {status.linePrograms.length > 0 && <li><b>The line’s own programs</b>{status.linePrograms.map((l, i) => <span key={i}>{l}</span>)}</li>}
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
          {([['Critical problems', report.critical, false], ['High risks', report.risks, true]] as const).map(([title, set, risk]) =>
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
              {/* What its Needs you says is missing, as the paper prints it (lib/install gateGaps). */}
              {s.grid && s.gaps?.map((g, i) => <span key={`gap${i}`} className="sub">Not added yet: {g}</span>)}
              {s.linePrograms?.map(lp => <span key={lp.line} className="sub">On {lp.line}, with no job — {lp.reading.says}</span>)}
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
          {/* THE REGISTER'S PROBLEMS FOR THIS JOB, NOT ON IT YET — the Fixes page's list, opened where each is kept. */}
          {report.assigned.length > 0 && <li><b>Problems for this job — not on it yet</b><span>{report.assigned.length} on the register</span>
            {report.assigned.map(a => <button key={a.id} type="button" className="cr-door" onClick={() => openSnag(a.id)}>
              <span className={'qsl-prio ' + ({ critical: 'is-r', high: 'is-a', low: 'is-g' } as const)[a.priority]}>{PRIORITY_WORD[a.priority]}</span>{a.what} — {a.meta}{a.due && <> · <span className={a.late ? 'in-late' : undefined}>{a.due}</span></>}</button>)}</li>}
          {report.notedRows.length > 0 && <li><b>Problems with no fix</b><span>{report.noted.open.length} open{report.noted.sorted.length ? ` · ${report.noted.sorted.length} sorted` : ''}</span>
            {report.notedRows.map(n => <button key={n.id} type="button" className={'cr-door' + (n.sorted ? ' is-sorted' : '')} onClick={() => open(n.id)}>{n.text}{n.sorted ? ' · sorted' : ''}</button>)}</li>}
          {/* EVIDENCE — every study on the job, as the paper's appendix prints it. */}
          {report.evidence.length > 0 && <li><b>Evidence</b><span>{report.evidence.length} {report.evidence.length === 1 ? 'study' : 'studies'} · measured by people at the line</span>
            {report.evidence.map(e => <button key={e.id} type="button" className="cr-door" onClick={() => nav(e.href)}>{e.title} — {e.line}</button>)}</li>}
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
