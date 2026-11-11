/* A CHART AND A REPORT IN THE CONVERSATION (10 November, docs/CONVERSATIONAL-DATA.md) — drawn where the step that made them is, from the
 * conversation's own results (lib/data/outputs), never a picture made up: the chart as the version that step made, with what it left
 * out and what was not recorded under it, and its download (SVG, PNG); the report or presentation with its sections in order — each
 * section's kind in a word, a finding's Check this beside it — and its PDF or slides, made on the press. */
import { useMemo, useState } from 'react';
import { chartSvg, svgToPng } from '../lib/data/chartSvg';
import { seriesOf, SECTION_WORD, type Chart, type ConvReport, type DataResult } from '../lib/data/outputs';
import { deliverBlob } from '../lib/savePdf';

const safe = (s: string) => s.replace(/[^a-z0-9 -]+/gi, '').trim().replace(/\s+/g, ' ').slice(0, 60) || 'chart';

export function ChartCard({ chart, version, results }: { chart: Chart; version: number; results: ReadonlyMap<string, DataResult> }) {
  const spec = chart.versions[Math.min(chart.versions.length, Math.max(1, version)) - 1];
  const series = useMemo(() => seriesOf(spec, results), [spec, results]);
  const [busy, setBusy] = useState('');
  if ('why' in series) return <div className="ai-out ai-chart is-off" data-chart={chart.id}><p className="sub">{series.why}</p></div>;
  const main = results.get(spec.resultId);
  const svg = chartSvg(spec, series, { mainLabel: main?.title, compareLabel: spec.compareLabel ?? (spec.compareResultId ? results.get(spec.compareResultId)?.title : undefined) });
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const save = async (as: 'svg' | 'png') => {
    setBusy(as);
    try {
      const blob = as === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : (await svgToPng(svg)).blob;
      await deliverBlob(blob, `${safe(spec.title)}.${as}`, { keep: false });
    } finally { setBusy(''); }
  };
  return (
    <figure className="ai-out ai-chart" data-chart={chart.id} data-chart-version={version}>
      <img className="ai-chart-img" src={src} alt={`${spec.title}: ${series.labels.map((l, i) => `${l} ${series.values[i] ?? 'not recorded'}${series.unit === '%' ? '%' : ''}`).join(', ')}`} />
      <figcaption className="ai-out-cap">
        <span className="ai-out-k">Chart {chart.id} · version {version}{version < chart.versions.length ? ` of ${chart.versions.length}` : ''}</span>
        {main && <span className="sub">From {main.source.name}{main.source.sheet ? ` › ${main.source.sheet}` : ''} — worked by the app’s code.</span>}
        {series.notes.map(n => <span key={n} className="sub ai-out-note">{n}</span>)}
        <span className="ai-out-acts">
          <button type="button" className="btn btn-sm" data-chart-png disabled={!!busy} onClick={() => void save('png')}>{busy === 'png' ? 'Saving…' : 'Download PNG'}</button>
          <button type="button" className="btn btn-sm" data-chart-svg disabled={!!busy} onClick={() => void save('svg')}>{busy === 'svg' ? 'Saving…' : 'Download SVG'}</button>
        </span>
      </figcaption>
    </figure>
  );
}

export function ReportCard({ report, version, latest, results, charts, by }: { report: ConvReport; version: number; latest: boolean; results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; by?: string }) {
  const [busy, setBusy] = useState('');
  const [said, setSaid] = useState('');
  if (!latest) return <p className="sub ai-out-line" data-report-step={report.id}>{report.form === 'presentation' ? 'Presentation' : 'Report'} “{report.title}” — version {version} made here; the newest is further down.</p>;
  const printed = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const make = async (as: 'pdf' | 'pptx') => {
    setBusy(as); setSaid('');
    try {
      const f = await import('../lib/data/reportFiles');
      const input = { report, results, charts, printed, ...(by ? { by } : {}) };
      const blob = as === 'pdf' ? await f.reportPdf(input) : await f.reportDeck(input);
      await deliverBlob(blob, `${safe(report.title)}.${as}`, { keep: as === 'pdf' });
      setSaid(as === 'pdf' ? 'The PDF is made — kept under Saved copies too.' : 'The slides are made.');
    } catch (e) { setSaid(e instanceof Error ? e.message : 'It could not be made.'); } finally { setBusy(''); }
  };
  const flagged = report.sections.filter(s => s.unbacked?.length).length;
  return (
    <div className="ai-out ai-report" data-report={report.id} data-report-version={report.version}>
      <p className="ai-out-k">{report.form === 'presentation' ? 'Presentation' : 'Report'} {report.id} · version {report.version}</p>
      <p className="ai-out-t">{report.title}</p>
      {report.sections.length ? (
        <ol className="ai-report-l">
          {report.sections.map(s => (
            <li key={s.id} data-section={s.id} data-section-kind={s.kind}>
              <span className={'ai-sec-k is-' + s.kind}>{SECTION_WORD[s.kind]}</span>
              <span className="ai-sec-h">{s.heading}</span>
              {s.unbacked?.length ? <span className="ai-check" data-unbacked>Check this: {s.unbacked.join(', ')}</span> : null}
              {s.kind === 'recommendation' ? <span className="sub"> — {s.by === 'person' ? 'your' : 'Luna’s'} view, not a finding</span> : null}
            </li>
          ))}
        </ol>
      ) : <p className="sub">No sections yet.</p>}
      {flagged > 0 && <p className="sub ai-out-note">{flagged} section{flagged === 1 ? ' has' : 's have'} a figure none of its results holds — marked Check this, on paper too.</p>}
      <span className="ai-out-acts">
        <button type="button" className="btn btn-sm btn-primary" data-report-pdf disabled={!!busy || !report.sections.length} onClick={() => void make('pdf')}>{busy === 'pdf' ? 'Making…' : 'Download PDF'}</button>
        <button type="button" className="btn btn-sm" data-report-pptx disabled={!!busy || !report.sections.length} onClick={() => void make('pptx')}>{busy === 'pptx' ? 'Making…' : 'Download slides'}</button>
      </span>
      {said && <p className="sub" role="status" data-report-said>{said}</p>}
    </div>
  );
}
