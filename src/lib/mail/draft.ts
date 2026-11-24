/* WHAT “THIS” IS ON AN EMAIL (24 November 2026, docs/LUNA-MAIL.md) — the latest chart in the conversation, else the latest report.
 * The body is those artifacts’ own words and figures, already in the app. Pure: no send, no AI. */
import { chartNow, seriesOf, type Chart, type ConvReport, type DataResult } from '../data/outputs';
import { chartSvg as drawChart } from '../data/chartSvg';

export interface MailThis {
  kind: 'chart' | 'report';
  id: string;
  title: string;
  /** The artifact’s own words — figures already worked by the app. */
  body: string;
  file?: { name: string; contentType: string; bytes: string };
}

export interface MailOutputs { results: DataResult[]; charts: Chart[]; reports: ConvReport[] }

const resultMap = (o: MailOutputs) => new Map(o.results.map(r => [r.id, r]));

const fileName = (title: string, ext: string): string => {
  const base = title.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 48) || 'attachment';
  return `${base}.${ext}`;
};

const b64 = (s: string): string => {
  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }
  return Buffer.from(s, 'utf8').toString('base64');
};

function chartBody(c: Chart, results: ReadonlyMap<string, DataResult>): MailThis | { why: string } {
  const spec = chartNow(c);
  const s = seriesOf(spec, results);
  if ('why' in s) return { why: s.why };
  const unit = s.unit === '%' ? '%' : s.unit ? ` ${s.unit}` : '';
  const rows = s.labels.map((l, i) => `${l}: ${s.values[i] === null ? 'not recorded' : `${s.values[i]}${unit}`}`).join('\n');
  const finding = s.finding ? `${s.finding}\n\n` : '';
  const svg = drawChart(spec, s);
  return {
    kind: 'chart', id: c.id, title: spec.title,
    body: `${spec.title}\n\n${finding}${rows}${s.notes.length ? `\n\n${s.notes.join(' ')}` : ''}`,
    file: { name: fileName(spec.title, 'svg'), contentType: 'image/svg+xml', bytes: b64(svg) },
  };
}

function reportBody(r: ConvReport): MailThis {
  const parts = r.sections.map(s => {
    const head = s.heading;
    const text = (s.text ?? '').trim();
    const flag = s.unbacked?.length ? `\n(Check this: ${s.unbacked.join(', ')} — not in its results.)` : '';
    return text ? `${head}\n${text}${flag}` : `${head}${flag}`;
  }).filter(Boolean);
  return {
    kind: 'report', id: r.id, title: r.title,
    body: [`${r.title}`, ...parts].join('\n\n'),
  };
}

/** The thing “this” means: a named chart or report, else the latest chart, else the latest report. */
export function thisOf(o: MailOutputs, want: { chartId?: string; reportId?: string } = {}): MailThis | { why: string } {
  const results = resultMap(o);
  if (want.chartId) {
    const c = o.charts.find(x => x.id === want.chartId);
    if (!c) return { why: `There is no chart ${want.chartId} in this conversation.` };
    return chartBody(c, results);
  }
  if (want.reportId) {
    const r = o.reports.find(x => x.id === want.reportId);
    if (!r) return { why: `There is no report ${want.reportId} in this conversation.` };
    return reportBody(r);
  }
  const chart = o.charts[o.charts.length - 1];
  if (chart) return chartBody(chart, results);
  const report = o.reports[o.reports.length - 1];
  if (report) return reportBody(report);
  return { why: 'There is nothing in this conversation to send — make a chart or a report first.' };
}

/** The email as it will be sent: a covering line (no figures of its own) then the artifact. */
export function emailBody(artifact: MailThis, note?: string): string {
  const cover = (note ?? '').trim();
  return cover ? `${cover}\n\n${artifact.body}` : artifact.body;
}

export function emailSubject(artifact: MailThis, subject?: string): string {
  const s = (subject ?? '').trim();
  return s || artifact.title;
}
