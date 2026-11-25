/* A CHART AND A REPORT IN THE CONVERSATION (10 November, docs/CONVERSATIONAL-DATA.md) — drawn where the step that made them is, from the
 * conversation's own results (lib/data/outputs), never a picture made up: the chart as the version that step made, with what it left
 * out and what was not recorded under it, and its download (SVG, PNG); the report or presentation with its sections in order — each
 * section's kind in a word, a finding's Check this beside it — and its PDF, slides or self-contained HTML. */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { chartSvg, svgToPng } from '../lib/data/chartSvg';
import { chartMedia, processMedia } from '../lib/data/presentationMedia';
import '../lib/data/presentationMedia.css';
import { seriesOf, SECTION_WORD, type Chart, type ConvReport, type DataResult } from '../lib/data/outputs';
import { derivedAt, derivedSaid } from '../lib/workbook/derive';
import { chartViews } from './autoChart';
import type { Used } from './conversation';
import type { CapRef } from '../capabilities/types';
import { deliverBlob } from '../lib/savePdf';

const safe = (s: string) => s.replace(/[^a-z0-9 -]+/gi, '').trim().replace(/\s+/g, ' ').slice(0, 60) || 'chart';

export function ChartCard({ chart, version, results, animated = false, resultPreview = false, inChat = false }: { chart: Chart; version: number; results: ReadonlyMap<string, DataResult>; animated?: boolean; resultPreview?: boolean; inChat?: boolean }) {
  const spec = chart.versions[Math.min(chart.versions.length, Math.max(1, version)) - 1];
  const series = useMemo(() => seriesOf(spec, results), [spec, results]);
  const focusId = useId();
  const [busy, setBusy] = useState('');
  const [exploring, setExploring] = useState(false);
  const [focus, setFocus] = useState(0);
  const [playing, setPlaying] = useState(false);
  const count = 'why' in series ? 0 : series.labels.length;
  useEffect(() => {
    if (!exploring || !playing || count < 2) return;
    const timer = window.setInterval(() => setFocus(i => (i + 1) % count), 1600);
    return () => window.clearInterval(timer);
  }, [exploring, playing, count]);
  if ('why' in series) return <div className="ai-out ai-chart is-off" data-chart={chart.id}><p className="sub">{series.why}</p></div>;
  const selected = Math.min(focus, count - 1);
  const main = results.get(spec.resultId);
  const labels = { mainLabel: main?.title, compareLabel: spec.compareLabel ?? (spec.compareResultId ? results.get(spec.compareResultId)?.title : undefined) };
  const svg = chartSvg(spec, series, labels);
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(chartSvg(spec, series, { ...labels, animated: animated && !exploring, ...(exploring ? { focusIndex: selected } : {}) }))}`;
  const value = (v: number | null) => v === null ? 'Not recorded' : `${v.toLocaleString('en-GB', { maximumFractionDigits: 20 })}${series.unit === '%' ? '%' : series.unit ? ` ${series.unit}` : ''}`;
  const barCeiling = Math.max(1, ...series.values.map(v => Math.abs(v ?? 0)), ...(series.compare ?? []).map(v => Math.abs(v ?? 0)));
  const pieTotal = spec.type === 'pie' ? series.values.reduce<number>((sum, v) => sum + Math.max(0, v ?? 0), 0) : 0;
  const pieShare = (v: number | null) => pieTotal > 0 && v !== null && v > 0 ? ` · ${((v / pieTotal) * 100).toLocaleString('en-GB', { maximumFractionDigits: 1 })}% of shown values` : '';
  const currentValue = series.values[selected];
  const comparedValue = series.compare?.[selected];
  const difference = typeof currentValue === 'number' && typeof comparedValue === 'number' ? currentValue - comparedValue : null;
  const save = async (as: 'svg' | 'png') => {
    setBusy(as);
    try {
      const blob = as === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : (await svgToPng(svg)).blob;
      await deliverBlob(blob, `${safe(spec.title)}.${as}`, { keep: false });
    } finally { setBusy(''); }
  };
  const scene = animated ? ((!inChat || ['bar', 'column', 'line'].includes(spec.type)) ? chartMedia(spec, series, main, inChat) : undefined) : undefined;
  const chartBody = (
    <figure className="ai-out ai-chart" data-chart={chart.id} data-chart-version={version}>
      <div className="ai-chart-viewport" role="region" aria-label={`Chart: ${spec.title}. Scroll to see every category.`} tabIndex={0}>
        <img className="ai-chart-img" src={src} alt={`${spec.title}: ${series.labels.map((l, i) => `${l} ${value(series.values[i])}`).join(', ')}`} />
      </div>
      {spec.type === 'bar' && <div className="ai-chart-phone-bars" aria-label={`${spec.title} values`}>
        {series.finding && <p className="ai-chart-phone-finding">{series.finding}</p>}
        {series.labels.map((label, i) => {
          const bar = (v: number | null, compared = false) => <div className="ai-chart-phone-row" key={compared ? 'compare' : 'main'}>
            <progress className={compared ? 'ai-chart-phone-track is-compare' : 'ai-chart-phone-track'} max={barCeiling} value={Math.abs(v ?? 0)} aria-label={`${label}: ${value(v)}`} />
            <span className="ai-chart-phone-value">{value(v)}</span>
          </div>;
          return <div className={`ai-chart-phone-item${exploring && selected === i ? ' is-focused' : ''}`} key={`${i}:${label}`}><strong>{label}</strong>{bar(series.values[i])}{series.compare && bar(series.compare[i], true)}</div>;
        })}
      </div>}
      {spec.type !== 'bar' && <div className="ai-chart-phone-values" role="group" aria-label={`${spec.title} exact values`}>
        <p className="ai-chart-phone-values-h">Exact values</p>
        {series.labels.map((label, i) => <div className={`ai-chart-phone-item${exploring && selected === i ? ' is-focused' : ''}`} key={`${i}:${label}`}>
          <strong>{label}</strong>
          <span>{labels.mainLabel || 'Value'}: <b>{value(series.values[i])}</b>{pieShare(series.values[i])}</span>
          {series.compare && <span>{labels.compareLabel || 'Comparison'}: <b>{value(series.compare[i])}</b></span>}
        </div>)}
      </div>}
      {count > 1 && <div className="ai-chart-explore">
        <button type="button" className="btn btn-sm" aria-expanded={exploring} onClick={() => { setExploring(v => !v); setPlaying(false); }}>Explore chart</button>
        {exploring && <div className="ai-chart-explore-body" role="group" aria-label={`Explore ${spec.title}`}>
          <label htmlFor={focusId}>Point {selected + 1} of {count}: <strong>{series.labels[selected]}</strong></label>
          <input id={focusId} type="range" min="0" max={count - 1} value={selected} onChange={e => { setFocus(Number(e.target.value)); setPlaying(false); }} aria-valuetext={series.labels[selected]} />
          <p className="ai-chart-explore-readout" aria-live="polite">{labels.mainLabel || 'Value'}: <strong>{value(series.values[selected])}</strong>{pieShare(series.values[selected])}{series.compare && <> · {labels.compareLabel || 'Comparison'}: <strong>{value(series.compare[selected])}</strong></>}{difference !== null && <> · Difference: <strong>{value(difference)}</strong></>}{spec.target !== undefined && <> · {spec.targetLabel || 'Target'}: <strong>{value(spec.target)}</strong></>}</p>
          <button type="button" className="btn btn-sm" aria-pressed={playing} onClick={() => setPlaying(v => !v)}>{playing ? 'Pause' : 'Play points'}</button>
        </div>}
      </div>}
      <figcaption className="ai-out-cap">
        <strong>{spec.title}</strong>
        <span className="ai-out-k">{resultPreview ? 'From saved result ' + spec.resultId : `Chart ${chart.id} · version ${version}${version < chart.versions.length ? ' of ' + chart.versions.length : ''}`}</span>
        {main && <span className="sub">From {main.source.name}{main.source.sheet ? ` › ${main.source.sheet}` : ''} — worked by the app’s code.</span>}
        {series.notes.map(n => <span key={n} className="sub ai-out-note">{n}</span>)}
        <details className="ai-chart-values" data-chart-values>
          <summary>All values and labels ({series.labels.length})</summary>
          <div className="ai-chart-table-scroll"><table><caption>{spec.title} — {spec.yLabel ?? series.measure}{series.unit ? ` (${series.unit})` : ''}</caption>
            <thead><tr><th scope="col">{spec.xLabel || 'Category'}</th><th scope="col">{labels.mainLabel || 'Value'}</th>{series.compare && <th scope="col">{labels.compareLabel || 'Comparison'}</th>}</tr></thead>
            <tbody>{series.labels.map((label, i) => <tr key={`${i}:${label}`}><th scope="row">{label}</th><td>{value(series.values[i])}</td>{series.compare && <td>{value(series.compare[i])}</td>}</tr>)}</tbody>
          </table></div>
        </details>
        <span className="ai-out-acts">
          <button type="button" className="btn btn-sm" data-chart-png disabled={!!busy} onClick={() => void save('png')}>{busy === 'png' ? 'Saving…' : 'Download PNG'}</button>
          <button type="button" className="btn btn-sm" data-chart-svg disabled={!!busy} onClick={() => void save('svg')}>{busy === 'svg' ? 'Saving…' : 'Download SVG'}</button>
        </span>
      </figcaption>
    </figure>
  );
  if (!scene) return chartBody;
  return <div className="lm-chart-slide">
    <div dangerouslySetInnerHTML={{ __html: scene }} />
    <details className="lm-details"><summary>Explore the full chart ({count})</summary>{chartBody}</details>
  </div>;
}

/** Reconstruct missing views in older answers from their saved results without editing the workbook or history. */
export function ReplyCharts({ request, steps, results, charts, onShow }: {
  request: string; steps: readonly Used[]; results: ReadonlyMap<string, DataResult>;
  charts: ReadonlyMap<string, Chart>; onShow?: (r: CapRef) => void;
}) {
  const items = useMemo(() => {
    const { views, missing } = chartViews(request, steps, results, charts);
    const entries = views.map(v => ({ ...v, preview: false }));
    for (const want of missing) {
      const result = results.get(want.resultId);
      if (!result) continue;
      entries.push({ chart: { id: result.id, at: result.at, versions: [{ ...want, title: result.title, measure: 0 }] }, version: 1, preview: true });
    }
    const order = steps.flatMap(s => s.refs.filter(r => r.kind === 'result').map(r => r.id));
    return entries.map(item => {
      const spec = item.chart.versions[item.version - 1];
      const result = results.get(spec.resultId);
      const groups = result?.result.groupBy ?? [];
      const key = groups.join(' × ') || spec.title;
      const sort = result?.query.order as { by?: unknown; desc?: boolean } | undefined;
      const limited = result && result.result.groups.length < result.result.groupsTotal;
      const direction = limited && typeof sort?.by === 'number' ? (sort.desc === false ? 'lowest' : 'highest') : '';
      const name = key === key.toUpperCase() ? key.charAt(0) + key.slice(1).toLowerCase() : key;
      return { ...item, spec, label: direction ? name + ' · ' + direction : name, order: order.indexOf(spec.resultId) };
    }).sort((a,b) => a.order - b.order);
  }, [request, steps, results, charts]);
  const panel = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [playback, setPlayback] = useState(0);
  useEffect(() => {
    if (!panel.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, [items.length]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const active = Math.min(index, items.length - 1);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = window.setTimeout(() => {
      if (active + 1 < items.length) setIndex(active + 1);
      else setPlaying(false);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [playing, active, items.length, visible]);
  const item = items[active];
  if (!item) return null;
  const id = item.preview ? item.spec.resultId : item.chart.id + '@' + item.version;
  const kind = item.preview ? 'result' : 'chart';
  return <section ref={panel} className="lm-chat-charts" aria-label="Graphs" data-graph-visible={visible} data-reply-graphs={items.length}>
    {items.length > 1 && <nav aria-label="Choose a graph" className="lm-graph-nav">
      {items.map((v, i) => <button key={v.chart.id + ':' + v.version} type="button" aria-pressed={i === active} onClick={() => { setIndex(i); setPlaying(false); }}>{v.label}</button>)}
      <button type="button" className="lm-graph-play" aria-pressed={playing} onClick={() => { if (!playing) { setIndex(0); setPlayback(n => n + 1); } setPlaying(!playing); }}>{playing ? 'Pause' : 'Play graphs'}</button>
    </nav>}
    {items.length === 1 && <button type="button" className="linkish lm-replay" onClick={() => setPlayback(n => n + 1)}>Replay graph</button>}
    <ChartCard key={id + ':' + playback} chart={item.chart} version={item.version} results={results} animated inChat resultPreview={item.preview} />
    {onShow && <button type="button" className="linkish ai-beside" data-show-beside={kind + ':' + id} onClick={() => onShow({ kind, id, label: item.spec.title, href: '' })}>{item.preview ? 'Open source data' : 'Open chart beside chat'}</button>}
  </section>;
}

export function ReportCard({ report, version, latest, results, charts, conversationId, by, onPresent }: { report: ConvReport; version: number; latest: boolean; results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; conversationId?: string; by?: string; /** Open fullscreen Present (docs/LUNA-ROOM.md M4). */ onPresent?: () => void }) {
  const [busy, setBusy] = useState('');
  const [said, setSaid] = useState('');
  if (!latest) return <p className="sub ai-out-line" data-report-step={report.id}>{report.form === 'presentation' ? 'Presentation' : 'Report'} “{report.title}” — version {version} made here; the newest is further down.</p>;
  const printed = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const make = async (as: 'pdf' | 'pptx' | 'html') => {
    setBusy(as); setSaid('');
    try {
      const input = { report, results, charts, printed, ...(by ? { by } : {}) };
      const blob = as === 'html' ? (await import('../lib/data/reportHtml')).reportHtml(input) : as === 'pdf' ? await (await import('../lib/data/reportFiles')).reportPdf(input) : await (await import('../lib/data/reportFiles')).reportDeck(input);
      await deliverBlob(blob, `${safe(report.title)}.${as}`, { keep: as === 'pdf' });
      if (as === 'html') {
        try {
          if (!conversationId) throw new Error('No conversation is open.');
          await (await import('./htmlArtifacts')).saveHtmlArtifact(conversationId, report, await blob.text());
          setSaid('The HTML is downloaded and saved in Artifacts.');
        } catch { setSaid('The HTML downloaded, but could not be saved in Artifacts. Try again from this report.'); }
      } else setSaid(as === 'pdf' ? 'The PDF is made — kept under Saved copies too.' : 'The slides are made.');
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
        {onPresent && <button type="button" className="btn btn-sm btn-primary" data-report-present data-put-on-screen onClick={onPresent} title="Full screen for the room or TV">Put on screen</button>}
        {report.form === 'presentation' ? <>
          <button type="button" className="btn btn-sm" data-report-html disabled={!!busy || !report.sections.length} onClick={() => void make('html')}>{busy === 'html' ? 'Preparing…' : 'Download animated presentation'}</button>
          <button type="button" className="btn btn-sm" data-report-pdf disabled={!!busy || !report.sections.length} onClick={() => void make('pdf')}>PDF handout</button>
        </> : <details className="ai-report-download"><summary className="btn btn-sm">Download</summary><div className="ai-report-download-options">
          <button type="button" className="btn btn-sm" data-report-pdf disabled={!!busy || !report.sections.length} onClick={() => void make('pdf')}>{busy === 'pdf' ? 'Making…' : 'PDF'}</button>
          <button type="button" className="btn btn-sm" data-report-pptx disabled={!!busy || !report.sections.length} onClick={() => void make('pptx')}>{busy === 'pptx' ? 'Making…' : 'Slides'}</button>
          <button type="button" className="btn btn-sm" data-report-html disabled={!!busy || !report.sections.length} onClick={() => void make('html')}>{busy === 'html' ? 'Making…' : 'HTML'}</button>
        </div></details>}
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
  /* a derived figure is drawn as what it is — a share as a percentage, a rate with enough figures to read (lib/workbook/derive) */
  const num = (v: number | string | null | undefined, j: number) => derivedSaid(v ?? null, derivedAt(r, j)) ?? (v === null || v === undefined ? 'not recorded' : typeof v === 'number' ? v.toLocaleString('en-GB', { maximumFractionDigits: 2 }) : v);
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
              {r.groups.map((g, i) => <tr key={i}>{g.key.map((k, j) => <td key={j}>{k}</td>)}{g.values.map((v, j) => <td key={j} className="is-n">{num(v, j)}</td>)}</tr>)}
            </tbody>
            {r.groupBy.length > 0 && <tfoot><tr><th scope="row" colSpan={r.groupBy.length}>Total</th>{r.totals.map((v, j) => <td key={j} className="is-n">{num(v, j)}</td>)}</tr></tfoot>}
          </table>
        </div>
      )}
      {/* (asked with a condition, the groups shown are the ones that met it — never "the first so many") */}
      {r.groupsTotal > r.groups.length && <p className="sub ai-out-note">{r.only ? `${r.groups.length} of ${r.groupsTotal} groups — only those with ${r.only}.` : `The first ${r.groups.length} of ${r.groupsTotal} groups.`}</p>}
      {r.skipped.map(s => <p key={s.measure} className="sub ai-out-note">Could not use {s.count} in {s.measure} ({s.refs.slice(0, 3).join(', ')}).</p>)}
      {r.notes.map(n => <p key={n} className="sub ai-out-note">{n}</p>)}
    </div>
  );
}

/** A report as the working document it is: each section's heading, its words, its chart or table, a Check this where a figure rests
 *  on nothing — with its PDF and slides from the card's own buttons. */
/** The report as the room sees it — sections with charts and tables, no download row (Present). */
export function ReportPresentBody({ report, results, charts, sectionIndex, animated = false }: { report: ConvReport; results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; sectionIndex?: number; animated?: boolean; by?: string }) {
  return (
    <article className="lr-present-doc" data-report-doc={report.id}>
      {sectionIndex === undefined && <header className="lr-present-h">
        <h1 className="lr-present-title">{report.title}</h1>
        <p className="sub lr-present-meta">{report.form === 'presentation' ? 'Presentation' : 'Report'} {report.id} · version {report.version}</p>
      </header>}
      {report.sections.filter((_s, i) => sectionIndex === undefined || i === sectionIndex).map(s => {
        const c = s.kind === 'chart' && s.chartId ? charts.get(s.chartId) : undefined;
        const res = s.kind === 'table' && s.resultId ? results.get(s.resultId) : undefined;
        return (
          <section key={s.id} className="lr-present-s ai-doc-s" data-doc-section={s.id} data-section-kind={s.kind}>
            <h2><span className={'ai-sec-k is-' + s.kind}>{SECTION_WORD[s.kind]}</span> {s.heading}</h2>
            {s.kind === 'process' ? <div dangerouslySetInnerHTML={{ __html: processMedia(s.text ?? '') }} /> : s.text && <p className="ai-doc-p lr-present-p">{s.text}</p>}
            {s.unbacked?.length ? <p className="ai-check">Check this: {s.unbacked.join(', ')}</p> : null}
            {s.kind === 'recommendation' && <p className="sub">{s.by === 'person' ? 'Your' : 'Luna’s'} view, not a finding.</p>}
            {c && <ChartCard chart={c} version={c.versions.length} results={results} animated={animated} />}
            {!c && res && <ResultTable result={res} />}
          </section>
        );
      })}
    </article>
  );
}

export function ReportDocument({ report, results, charts, conversationId, by, onPresent }: { report: ConvReport; results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; conversationId?: string; by?: string; onPresent?: () => void }) {
  return (
    <article className="ai-doc" data-report-doc={report.id}>
      <ReportCard report={report} version={report.version} latest results={results} charts={charts} conversationId={conversationId} {...(by ? { by } : {})} {...(onPresent ? { onPresent } : {})} />
      {report.sections.map(s => {
        const c = s.kind === 'chart' && s.chartId ? charts.get(s.chartId) : undefined;
        const res = s.kind === 'table' && s.resultId ? results.get(s.resultId) : undefined;
        return (
          <section key={s.id} className="ai-doc-s" data-doc-section={s.id}>
            <h3><span className={'ai-sec-k is-' + s.kind}>{SECTION_WORD[s.kind]}</span> {s.heading}</h3>
            {s.kind === 'process' ? <div dangerouslySetInnerHTML={{ __html: processMedia(s.text ?? '') }} /> : s.text && <p className="ai-doc-p">{s.text}</p>}
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
