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
import { clientReport, machinesSay, type ClientReport } from '../lib/clientReport';
import { todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import type { Shot } from '../lib/testReport';
import type { jsPDF } from 'jspdf';

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

const fileName = (r: ClientReport) => pdfFileName(r.name, 'client report', todayISO());

export function ClientReportScreen({ projectId }: { projectId: string }) {
  const { projects, loading } = useProjects();
  const project = projects.find(p => p.id === projectId);
  const tt = useTesting(projectId);
  const mats = useMaterials(projectId);
  const progs = usePrograms(projectId);
  const standards = useStandards(projectId);
  const walk = useWalkSnags(projectId);
  const [withStandards, setWithStandards] = useState(true);
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
  const previewKey = useMemo(() => (report && wide ? `${withStandards}|${JSON.stringify(report)}` : null), [report, withStandards, wide]);
  const preview = usePdfPreview(previewKey, () => buildPdf(report as ClientReport, withStandards));

  const download = async () => {
    if (!report || busy) return;
    setBusy(true); setSaid(null); setErr(null);
    try {
      const { deliverPdf } = await import('../lib/savePdf');
      const how = await deliverPdf(await buildPdf(report, withStandards), fileName(report));
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
          <h1 className="pace-title">Client report</h1>
          <p className="pace-lede">The job in the order it is run, drawn from what is kept here — nothing typed for it.</p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-primary" onClick={() => void download()} disabled={busy}>{busy ? 'Making it…' : 'PDF'}</button>
        </div>
      </header>
      {said && <p className="tc-ok" role="status">{said}</p>}
      {err && <p className="sub tw-err" role="alert">{err}</p>}

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
          <li><b>Where the job is</b><span>{report.sentence}</span><span className="sub">{machinesSay(report)}</span></li>
          {report.sections.map(s => (
            <li key={s.gate}>
              <b>{s.label}</b><span>{s.says}</span>
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
    </div>
  );
}
