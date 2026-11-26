/* A Luna report or presentation as a self-contained HTML file. The report's kept sections,
 * results and chart SVGs are the only content: no model-written markup, remote assets or scripts. */
import mediaStyles from './presentationMedia.css?inline';
import { chartMedia, processMedia } from './presentationMedia';
import { chartSvg } from './chartSvg';
import { textDocument, chartNow, evidenceSaid, seriesOf, SECTION_WORD, type Chart, type ConvReport, type DataResult, type ReportSection } from './outputs';

export interface HtmlReportInputs { dashboard?: boolean; report: ConvReport; results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; by?: string; printed: string }

const esc = (s: unknown): string => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const value = (v: number | string | null): string => v === null ? 'not recorded' : typeof v === 'number' ? v.toLocaleString('en-GB', { maximumFractionDigits: 20 }) : String(v);
const prose = (s: string): string => s.split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
function documentProse(text: string): string {
  const blocks: string[] = [];
  let kind = '', lines: string[] = [];
  const flush = () => {
    if (lines.length) blocks.push(kind === 'p' ? prose(lines.join('\n')) : `<${kind}>${lines.map(line => `<li>${esc(line)}</li>`).join('')}</${kind}>`);
    lines = [];
  };
  for (const line of text.split('\n')) {
    const item = /^\s*(?:([-*•])|\d+[.)])\s+(.+)$/.exec(line);
    const next = item ? (item[1] ? 'ul' : 'ol') : 'p';
    if (!line.trim() || next !== kind) flush();
    if (line.trim()) { kind = next; lines.push(item ? item[2] : line); }
  }
  flush();
  return blocks.join('');
}
const table = (head: string[], rows: (number | string | null)[][]): string => `<div class="table-scroll"><table><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(c => `<td>${esc(c === null ? 'not recorded' : c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function sceneNavigation(previous: string, next: string, nextLabel: string): string {
  return `<nav class="lm-nav" aria-label="Presentation navigation"><a href="#contents">Contents</a><div>${previous === 'contents' ? '' : `<a href="#${previous}">Previous</a>`}<a class="lm-next" href="#${next}">${nextLabel} →</a></div></nav>`;
}

function sectionHtml(s: ReportSection, i: HtmlReportInputs, n: number, hasSources: boolean): string {
  const label = SECTION_WORD[s.kind];
  const body = s.kind === 'text' && s.text && !i.dashboard && textDocument(i.report) ? documentProse(s.text) : s.kind === 'process' ? processMedia(s.text ?? '') : s.text ? prose(s.text) : '';
  const check = s.unbacked?.length ? `<p class="check">Check this: ${esc(s.unbacked.join(', '))} — not in the results this section rests on.</p>` : '';
  const view = s.kind === 'recommendation' ? `<p class="view">A recommendation — ${s.by === 'person' ? 'your' : 'Luna’s'} view, not a finding.</p>` : '';
  let extra = '';
  if (s.kind === 'chart' && s.chartId) {
    const c = i.charts.get(s.chartId);
    if (!c) extra = '<p class="check">This chart is no longer in the conversation.</p>';
    else {
      const spec = chartNow(c);
      const ser = seriesOf(spec, i.results);
      if ('why' in ser) extra = `<p class="check">${esc(ser.why)}</p>`;
      else {
        const svg = chartSvg(spec, ser, { animated: i.dashboard || i.report.form === 'presentation', mainLabel: i.results.get(spec.resultId)?.title, compareLabel: spec.compareLabel ?? (spec.compareResultId ? i.results.get(spec.compareResultId)?.title : undefined) });
        const plotted = ser.labels.map((name, k) => [name, ser.values[k] === null ? 'not recorded' : `${value(ser.values[k])}${ser.unit === '%' ? '%' : ser.unit ? ` ${ser.unit}` : ''}`, ...(ser.compare ? [ser.compare[k] === null ? 'not recorded' : `${value(ser.compare[k])}${ser.unit === '%' ? '%' : ser.unit ? ` ${ser.unit}` : ''}`] : [])]);
        extra = `<figure class="chart">${svg}<figcaption>Scroll the graphic to see every category. Exact values are below.${ser.notes.map(note => `<p>${esc(note)}</p>`).join('')}</figcaption></figure><details class="values"${i.dashboard ? '' : ' open'}><summary>All plotted values (${ser.labels.length})</summary>${table(['Category', 'Value', ...(ser.compare ? ['Comparison'] : [])], plotted)}</details>`;
        const scene = (i.dashboard || i.report.form === 'presentation') ? chartMedia(spec, ser, i.results.get(spec.resultId)) : undefined;
        if (scene) extra = `${scene}<details class="lm-details"><summary>Explore the full chart (${ser.labels.length})</summary>${extra}</details>`;
      }
    }
  }
  if (s.kind === 'table' && s.resultId) {
    const r = i.results.get(s.resultId);
    if (!r) extra = '<p class="check">This result is no longer in the conversation.</p>';
    else {
      const q = r.result;
      const head = [...(q.groupBy.length ? q.groupBy : ['Group']), ...q.measures];
      const rows = q.groups.map(g => [...(g.key.length ? g.key : ['All']), ...g.values.map(value)]);
      extra = `${table(head, rows)}<p class="totals">Totals across all matched rows: ${esc(q.totals.map(value).join(' · '))}.</p>${q.groupsTotal > q.groups.length ? `<p class="check">Showing ${q.groups.length} of ${q.groupsTotal} groups in the saved result. Narrow the question to inspect the others.</p>` : ''}`;
    }
  }
  const last = n + 1 === i.report.sections.length;
  const footer = i.report.form === 'presentation'
    ? sceneNavigation(n ? 's' + n : 'contents', last ? (hasSources ? 'sources' : 's1') : 's' + (n + 2), last ? (hasSources ? 'View sources' : 'Replay') : 'Next scene')
    : '<div class="slide-foot"><span>Made with Luna in Faultline</span><a href="#contents">Contents ↑</a></div>';
  return `<section class="slide" tabindex="-1" id="s${n + 1}"><div class="slide-head"><span class="eyebrow">${esc(label)} · ${n + 1} / ${i.report.sections.length}</span><h2>${esc(s.heading || label)}</h2></div><div class="slide-body">${body}${check}${view}${extra}</div>${footer}</section>`;
}

export function reportHtml(i: HtmlReportInputs): Blob {
  const written = !i.dashboard && textDocument(i.report);
  const used = new Set<string>();
  for (const s of i.report.sections) {
    for (const id of s.evidence ?? []) used.add(id);
    if (s.resultId) used.add(s.resultId);
    const c = s.chartId ? i.charts.get(s.chartId) : undefined;
    if (c) { const spec = chartNow(c); used.add(spec.resultId); if (spec.compareResultId) used.add(spec.compareResultId); }
  }
  const sources = [...used].map(id => i.results.get(id)).filter((r): r is DataResult => !!r);
  const nav = i.report.sections.map((s, n) => `<a href="#s${n + 1}"><span>${String(n + 1).padStart(2, '0')}</span>${esc(s.heading || SECTION_WORD[s.kind])}</a>`).join('');
  const sourceHtml = sources.length ? `<section class="slide sources" id="sources"><div class="slide-head"><span class="eyebrow">Evidence</span><h2>What the figures rest on</h2></div><div class="slide-body">${sources.map(r => `<article><h3>${esc(r.title)}</h3><p>${esc(evidenceSaid(r))}</p>${r.result.notes.map(note => `<p class="note">${esc(note)}</p>`).join('')}</article>`).join('')}</div>${i.report.form === 'presentation' ? sceneNavigation('s' + i.report.sections.length, 's1', 'Replay') : ''}</section>` : '';
  const sections = i.report.sections.map((s, n) => sectionHtml(s, i, n, sources.length > 0)).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${esc(i.report.title)} — Luna</title><style>
  :root{color-scheme:light;font-family:Arial,Helvetica,sans-serif;--ink:#15263a;--muted:#526174;--line:#d9e2e9;--blue:#2359bb;--coral:#db624b;--paper:#fff}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:linear-gradient(145deg,#eaf3ff,#f7fbfa 42%,#fff5ee);font-size:16px;line-height:1.55}a{color:var(--blue)}.wrap{max-width:1100px;margin:auto;padding:22px clamp(16px,4vw,44px) 56px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:13px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--blue)}.hero{padding:clamp(44px,9vw,110px) 0 32px}.hero h1{font-size:clamp(38px,7vw,78px);line-height:1.04;letter-spacing:-.04em;max-width:850px;margin:16px 0}.meta,.intro,.eyebrow,.note{color:var(--muted)}.intro{max-width:760px}.contents{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:12px 0 30px}.contents a{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px;text-decoration:none;color:var(--ink);font-weight:650}.contents a:hover,.contents a:focus-visible{border-color:var(--blue);box-shadow:0 4px 16px #2359bb22}.contents span{color:var(--coral);margin-right:10px}.slide{background:var(--paper);border:1px solid var(--line);border-radius:24px;padding:clamp(20px,4vw,42px);margin:22px 0;min-height:320px;box-shadow:0 12px 38px #18324b0c}.slide-head{border-bottom:1px solid var(--line);padding-bottom:16px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--blue)}h2{font-size:clamp(27px,4vw,46px);line-height:1.12;letter-spacing:-.03em;margin:9px 0}h3{font-size:19px}.slide-body{padding-top:22px}.slide-body>p{max-width:80ch;white-space:normal}.check{border-left:4px solid var(--coral);background:#fff4ee;padding:12px 15px;border-radius:8px}.view,.totals,.note{font-size:14px}.chart{margin:18px 0;overflow-x:auto}.chart svg{max-width:none;height:auto;display:block;margin:auto}.chart figcaption{font-size:13px;color:var(--muted)}.table-scroll{overflow:auto;max-width:100%}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:9px 11px;vertical-align:top}th{background:#f2f7fb;white-space:nowrap}.values{margin-top:18px}.values summary{cursor:pointer;color:var(--blue);font-weight:700;min-height:44px;display:flex;align-items:center}.slide-foot{display:flex;justify-content:space-between;gap:12px;margin-top:28px;padding-top:15px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}.sources article{border-bottom:1px solid var(--line);padding:8px 0}.presentation .slide{min-height:80vh;scroll-margin-top:12px}.presentation .slide:target{outline:3px solid #2359bb44}@media(prefers-reduced-motion:no-preference){.presentation .slide:target .slide-body{animation:enter .55s ease-out both}@keyframes enter{from{opacity:.35;transform:translateY(12px)}to{opacity:1;transform:none}}}@media print{html{scroll-behavior:auto}body{background:#fff}.wrap{max-width:none;padding:0}.slide{box-shadow:none;break-after:page;border-radius:0;margin:0;min-height:0}.contents a{border-radius:0}.slide-foot a{display:none}}
  ${mediaStyles}
  .document .wrap{max-width:920px}.document .hero{padding:clamp(28px,6vw,68px) 0 18px}.document .hero h1{font-size:clamp(34px,6vw,60px);overflow-wrap:anywhere}.document .slide{min-height:0}.document .slide-body{padding-top:6px;overflow-wrap:anywhere}.document .slide h2{font-size:clamp(24px,3.5vw,35px)}.document .slide-body>p{max-width:74ch}.document li+li{margin-top:.4em}
  @media print{.document .slide{break-after:auto;margin:1em 0;padding:12px;border:0}.document .slide-head{break-after:avoid}.document .slide-foot,.document nav{display:none}}
  .dashboard .wrap{max-width:1400px}.dashboard .hero{padding:clamp(20px,4vw,52px) 0 12px}.dashboard .hero h1{font-size:clamp(30px,5vw,62px);margin:.25em 0;overflow-wrap:anywhere}
  .dashboard .contents{display:flex;flex-wrap:wrap;gap:.4em}.dashboard .contents a{padding:.5em .85em;border-radius:2em}
  .dashboard-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,370px),1fr));gap:1rem;align-items:start}
  .dashboard-grid .slide{min-width:0;min-height:0;margin:0;padding:clamp(14px,2vw,25px)}.dashboard-grid h2{font-size:clamp(20px,2.6vw,33px);overflow-wrap:anywhere}
  .dashboard-grid .slide-foot{display:none}.dashboard-grid .lm-scene{max-width:100%}.dashboard-grid .slide:target{outline:2px solid var(--blue)}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.dashboard *, .dashboard *::before, .dashboard *::after{animation:none!important;transition:none!important}}</style></head><body class="${i.dashboard ? 'dashboard' : i.report.form === 'presentation' ? 'presentation' : written ? 'document' : 'report'}"><main class="wrap"><div class="top"><span>Luna · Faultline</span><span>${esc(i.dashboard ? 'Dashboard' : i.report.form === 'presentation' ? i.report.title : written ? 'Document' : 'Report')}</span></div><header class="hero" id="contents" tabindex="-1"><p class="eyebrow">Made ${esc(i.printed)}${i.by ? ` · ${esc(i.by)}` : ''}</p><h1>${esc(i.report.title)}</h1>${i.dashboard || written ? '' : '<p class="intro">Findings use the named results. Recommendations are views. “Check this” marks a figure the saved results do not support.</p>'}</header><nav class="contents" aria-label="Sections">${nav}${sources.length ? '<a href="#sources"><span>↗</span>Sources and method</a>' : ''}</nav>${i.dashboard ? '<div class="dashboard-grid">' + sections + '</div>' : sections}${sourceHtml}</main></body></html>`;
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
