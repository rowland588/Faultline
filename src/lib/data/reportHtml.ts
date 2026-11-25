/* A Luna report or presentation as a self-contained HTML file. The report's kept sections,
 * results and chart SVGs are the only content: no model-written markup, remote assets or scripts. */
import { chartSvg } from './chartSvg';
import { chartNow, evidenceSaid, seriesOf, SECTION_WORD, type Chart, type ConvReport, type DataResult, type ReportSection } from './outputs';

export interface HtmlReportInputs { report: ConvReport; results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; by?: string; printed: string }

const esc = (s: unknown): string => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const value = (v: number | string | null): string => v === null ? 'not recorded' : typeof v === 'number' ? v.toLocaleString('en-GB', { maximumFractionDigits: 20 }) : String(v);
const prose = (s: string): string => s.split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
const table = (head: string[], rows: (number | string | null)[][]): string => `<div class="table-scroll"><table><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(c => `<td>${esc(c === null ? 'not recorded' : c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function sectionHtml(s: ReportSection, i: HtmlReportInputs, n: number): string {
  const label = SECTION_WORD[s.kind];
  const body = s.text ? prose(s.text) : '';
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
        const svg = chartSvg(spec, ser, { animated: i.report.form === 'presentation', mainLabel: i.results.get(spec.resultId)?.title, compareLabel: spec.compareLabel ?? (spec.compareResultId ? i.results.get(spec.compareResultId)?.title : undefined) });
        const plotted = ser.labels.map((name, k) => [name, ser.values[k] === null ? 'not recorded' : `${value(ser.values[k])}${ser.unit === '%' ? '%' : ser.unit ? ` ${ser.unit}` : ''}`, ...(ser.compare ? [ser.compare[k] === null ? 'not recorded' : `${value(ser.compare[k])}${ser.unit === '%' ? '%' : ser.unit ? ` ${ser.unit}` : ''}`] : [])]);
        extra = `<figure class="chart">${svg}<figcaption>${ser.notes.map(note => `<p>${esc(note)}</p>`).join('')}</figcaption></figure><details class="values"><summary>All plotted values (${ser.labels.length})</summary>${table(['Category', 'Value', ...(ser.compare ? ['Comparison'] : [])], plotted)}</details>`;
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
  return `<section class="slide" id="s${n + 1}"><div class="slide-head"><span class="eyebrow">${esc(label)} · ${n + 1} / ${i.report.sections.length}</span><h2>${esc(s.heading || label)}</h2></div><div class="slide-body">${body}${check}${view}${extra}</div><div class="slide-foot"><span>Made with Luna in Faultline</span><a href="#contents">Contents ↑</a></div></section>`;
}

export function reportHtml(i: HtmlReportInputs): Blob {
  const used = new Set<string>();
  for (const s of i.report.sections) {
    for (const id of s.evidence ?? []) used.add(id);
    if (s.resultId) used.add(s.resultId);
    const c = s.chartId ? i.charts.get(s.chartId) : undefined;
    if (c) { const spec = chartNow(c); used.add(spec.resultId); if (spec.compareResultId) used.add(spec.compareResultId); }
  }
  const sources = [...used].map(id => i.results.get(id)).filter((r): r is DataResult => !!r);
  const nav = i.report.sections.map((s, n) => `<a href="#s${n + 1}"><span>${String(n + 1).padStart(2, '0')}</span>${esc(s.heading || SECTION_WORD[s.kind])}</a>`).join('');
  const sourceHtml = sources.length ? `<section class="slide sources" id="sources"><div class="slide-head"><span class="eyebrow">Evidence</span><h2>What the figures rest on</h2></div><div class="slide-body">${sources.map(r => `<article><h3>${esc(r.title)}</h3><p>${esc(evidenceSaid(r))}</p>${r.result.notes.map(note => `<p class="note">${esc(note)}</p>`).join('')}</article>`).join('')}</div></section>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${esc(i.report.title)} — Luna</title><style>
  :root{color-scheme:light;font-family:Arial,Helvetica,sans-serif;--ink:#15263a;--muted:#526174;--line:#d9e2e9;--blue:#2359bb;--coral:#db624b;--paper:#fff}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:linear-gradient(145deg,#eaf3ff,#f7fbfa 42%,#fff5ee);font-size:16px;line-height:1.55}a{color:var(--blue)}.wrap{max-width:1100px;margin:auto;padding:22px clamp(16px,4vw,44px) 56px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:13px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--blue)}.hero{padding:clamp(44px,9vw,110px) 0 32px}.hero h1{font-size:clamp(38px,7vw,78px);line-height:1.04;letter-spacing:-.04em;max-width:850px;margin:16px 0}.meta,.intro,.eyebrow,.note{color:var(--muted)}.intro{max-width:760px}.contents{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:12px 0 30px}.contents a{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px;text-decoration:none;color:var(--ink);font-weight:650}.contents a:hover,.contents a:focus-visible{border-color:var(--blue);box-shadow:0 4px 16px #2359bb22}.contents span{color:var(--coral);margin-right:10px}.slide{background:var(--paper);border:1px solid var(--line);border-radius:24px;padding:clamp(20px,4vw,42px);margin:22px 0;min-height:320px;box-shadow:0 12px 38px #18324b0c}.slide-head{border-bottom:1px solid var(--line);padding-bottom:16px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--blue)}h2{font-size:clamp(27px,4vw,46px);line-height:1.12;letter-spacing:-.03em;margin:9px 0}h3{font-size:19px}.slide-body{padding-top:22px}.slide-body>p{max-width:80ch;white-space:normal}.check{border-left:4px solid var(--coral);background:#fff4ee;padding:12px 15px;border-radius:8px}.view,.totals,.note{font-size:14px}.chart{margin:18px 0}.chart svg{max-width:100%;height:auto;display:block;margin:auto}.chart figcaption{font-size:13px;color:var(--muted)}.table-scroll{overflow:auto;max-width:100%}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:9px 11px;vertical-align:top}th{background:#f2f7fb;white-space:nowrap}.values{margin-top:18px}.values summary{cursor:pointer;color:var(--blue);font-weight:700;min-height:44px;display:flex;align-items:center}.slide-foot{display:flex;justify-content:space-between;gap:12px;margin-top:28px;padding-top:15px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}.sources article{border-bottom:1px solid var(--line);padding:8px 0}.presentation .slide{min-height:80vh;scroll-margin-top:12px}.presentation .slide:target{outline:3px solid #2359bb44}@media(prefers-reduced-motion:no-preference){.presentation .slide:target .slide-body{animation:enter .55s ease-out both}@keyframes enter{from{opacity:.35;transform:translateY(12px)}to{opacity:1;transform:none}}}@media print{html{scroll-behavior:auto}body{background:#fff}.wrap{max-width:none;padding:0}.slide{box-shadow:none;break-after:page;border-radius:0;margin:0;min-height:0}.contents a{border-radius:0}.slide-foot a{display:none}}
  </style></head><body class="${i.report.form === 'presentation' ? 'presentation' : 'report'}"><main class="wrap"><div class="top"><span>Luna · Faultline</span><span>${esc(i.report.form === 'presentation' ? 'Presentation' : 'Report')}</span></div><header class="hero" id="contents"><p class="eyebrow">Made ${esc(i.printed)}${i.by ? ` · ${esc(i.by)}` : ''}</p><h1>${esc(i.report.title)}</h1><p class="intro">Findings use the named results. Recommendations are views. “Check this” marks a figure the saved results do not support.</p></header><nav class="contents" aria-label="Sections">${nav}${sources.length ? '<a href="#sources"><span>↗</span>Sources and method</a>' : ''}</nav>${i.report.sections.map((s, n) => sectionHtml(s, i, n)).join('')}${sourceHtml}</main></body></html>`;
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
