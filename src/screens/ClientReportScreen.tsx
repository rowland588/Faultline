/* THE CLIENT REPORT for a stage-gate job — the page you open before sending
 * it. What is shown IS the PDF (drawn once, previewed in place on a desk), so
 * the screen and the paper cannot disagree. See lib/clientReport.ts. */
import { useEffect, useMemo, useState } from 'react';
import { useProjects } from '../lib/useProjects';
import { useTesting } from '../lib/useTesting';
import { useMaterials } from '../lib/useMaterials';
import { usePrograms } from '../lib/usePrograms';
import { useStandards } from '../ui/StandardsCard';
import { clientReport, machinesSay, type ClientReport } from '../lib/clientReport';
import { todayISO } from '../lib/weeks';
import { pdfFileName } from '../lib/fileName';
import { Crumbs } from '../ui/Crumbs';
import type { Shot } from '../lib/testReport';
import type { jsPDF } from 'jspdf';

async function buildPdf(r: ClientReport, withStandards: boolean): Promise<jsPDF> {
  const { loadPdfLib } = await import('../lib/savePdf');
  const { drawClientReport } = await import('../lib/clientReportPdf');
  const { pinShot, shotsFor } = await import('../lib/testReport');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  /* One picture a fix: where it is on the line if it was pinned, otherwise its
     first photo. Fetched before drawing — the drawer never touches the store. */
  const shots = new Map<string, Shot>();
  for (const f of r.fixes.open) {
    const s = (await pinShot(f)) ?? (f.photoKey ? (await shotsFor([f.photoKey], 1))[0] : undefined);
    if (s) shots.set(f.id, s);
  }
  await drawClientReport(doc, r, {
    shots,
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
  const [withStandards, setWithStandards] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wide = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 900px)').matches;

  const ready = !loading && !tt.loading && !mats.loading && !progs.loading && standards != null && !!project;
  const report = useMemo(() => (ready && project ? clientReport({
    project, projects, assets: tt.assets, tests: tt.tests, items: tt.items,
    materials: mats.materials, programs: progs.programs, standards: standards ?? [], today: todayISO(),
  }) : null), [ready, project, projects, tt.assets, tt.tests, tt.items, mats.materials, progs.programs, standards]);

  /* The preview is the PDF itself, redrawn when what is on it changes. */
  useEffect(() => {
    if (!report || !wide) return;
    let live = true, url: string | null = null;
    void buildPdf(report, withStandards).then(doc => {
      if (!live) return;
      url = URL.createObjectURL(doc.output('blob') as Blob);
      setPreview(url);
    }).catch(() => undefined);
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [report, withStandards, wide]);

  const download = async () => {
    if (!report || busy) return;
    setBusy(true);
    try {
      const { deliverPdf } = await import('../lib/savePdf');
      await deliverPdf(await buildPdf(report, withStandards), fileName(report));
    } catch (e) {
      console.error('client report failed', e);
      window.alert('Sorry — the report could not be made. Please try again.');
    } finally { setBusy(false); }
  };

  if (!ready || !report || !project) return <div className="wrap pace"><p className="sub">Loading…</p></div>;

  return (
    <div className="wrap pace cr">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Client report' },
      ]} />
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pace-eyebrow">{project.name}</p>
          <h1 className="pace-title">Client report</h1>
          <p className="pace-lede">The job in the order it is run: where it is, each gate, the fixes, who owes what — and the line standard. Drawn from what is kept here; nothing typed for it.</p>
        </div>
        <div className="pace-head-actions">
          <button className="btn btn-primary" onClick={() => void download()} disabled={busy}>{busy ? 'Making it…' : 'Download PDF'}</button>
        </div>
      </header>

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
          {report.sections.map(s => <li key={s.gate}><b>{s.label}</b><span>{s.says}</span></li>)}
          <li><b>Fixes</b><span>{report.fixes.open.length} open · {report.fixes.done.length} done</span></li>
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
