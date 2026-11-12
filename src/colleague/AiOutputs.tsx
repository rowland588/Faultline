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

/* ------------------------------------------------------------------ THE WORK BESIDE THE CONVERSATION (12 November — Rowland: "putting
 * actual charts, calculations, results and working documents into the work pane alongside conversations"). Drawn from the same kept
 * results, charts and reports as the cards above — never a second copy, nothing worked out here. */

/** A result as its table: each group a row, each measure a column, its total, what could not be used. */
export function ResultTable({ result }: { result: DataResult }) {
  const r = result.result;
  const num = (v: number | string | null) => (v === null ? 'not recorded' : typeof v === 'number' ? v.toLocaleString('en-GB', { maximumFractionDigits: 2 }) : v);
  return (
    <div className="ai-out ai-result" data-result={result.id}>
      <p className="ai-out-k">Result {result.id}</p>
      <p className="ai-out-t">{result.title}</p>
      <p className="sub">From {result.source.name}{result.source.sheet ? ` › ${result.source.sheet}` : ''} — {r.rowsMatched.toLocaleString('en-GB')} of {r.rowsScanned.toLocaleString('en-GB')} rows, worked by the app’s code.</p>
      {r.rowsMatched === 0 ? <p className="sub">No row matches — nothing to say, which is not the same as zero.</p> : (
        <div className="ai-result-scroll">
          <table className="ai-result-t">
            <thead><tr>{r.groupBy.map(g => <th key={g} scope="col">{g}</th>)}{r.measures.map(m => <th key={m} scope="col" className="is-n">{m}</th>)}</tr></thead>
            <tbody>
              {r.groups.map((g, i) => <tr key={i}>{g.key.map((k, j) => <td key={j}>{k}</td>)}{g.values.map((v, j) => <td key={j} className="is-n">{num(v)}</td>)}</tr>)}
            </tbody>
            {r.groupBy.length > 0 && <tfoot><tr><th scope="row" colSpan={r.groupBy.length}>Total</th>{r.totals.map((v, j) => <td key={j} className="is-n">{num(v)}</td>)}</tr></tfoot>}
          </table>
        </div>
      )}
      {r.groupsTotal > r.groups.length && <p className="sub ai-out-note">The first {r.groups.length} of {r.groupsTotal} groups.</p>}
      {r.skipped.map(s => <p key={s.measure} className="sub ai-out-note">Could not use {s.count} in {s.measure} ({s.refs.slice(0, 3).join(', ')}).</p>)}
      {r.notes.map(n => <p key={n} className="sub ai-out-note">{n}</p>)}
    </div>
  );
}

/** A report as the working document it is: each section's heading, its words, its chart or table, a Check this where a figure rests
 *  on nothing — with its PDF and slides from the card's own buttons. */
export function ReportDocument({ report, results, charts, by }: { report: ConvReport; results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; by?: string }) {
  return (
    <article className="ai-doc" data-report-doc={report.id}>
      <ReportCard report={report} version={report.version} latest results={results} charts={charts} {...(by ? { by } : {})} />
      {report.sections.map(s => {
        const c = s.chartId ? charts.get(s.chartId) : undefined;
        const res = s.resultId ? results.get(s.resultId) : undefined;
        return (
          <section key={s.id} className="ai-doc-s" data-doc-section={s.id}>
            <h3><span className={'ai-sec-k is-' + s.kind}>{SECTION_WORD[s.kind]}</span> {s.heading}</h3>
            {s.text && <p className="ai-doc-p">{s.text}</p>}
            {s.unbacked?.length ? <p className="ai-check">Check this: {s.unbacked.join(', ')} — no result it rests on holds {s.unbacked.length === 1 ? 'it' : 'them'}.</p> : null}
            {s.kind === 'recommendation' && <p className="sub">{s.by === 'person' ? 'Your' : 'Luna’s'} view, not a finding.</p>}
            {c && <ChartCard chart={c} version={c.versions.length} results={results} />}
            {!c && res && <ResultTable result={res} />}
          </section>
        );
      })}
    </article>
  );
}
