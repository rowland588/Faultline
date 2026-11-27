import type { CapRef } from '../capabilities/types';
import { outputsOfConversation } from '../capabilities/data';
import { getStudy } from '../db';
import type { ToolStudy } from '../lib/study';
import { chartNow, seriesOf, type Chart, type ConvReport, type DataResult, type ReportSection } from '../lib/data/outputs';
import { factsOfConversation, turnsOfConversation, type ColleagueTurn } from './conversation';
import { replyChartItems } from './autoChart';
import { activeClientNow } from '../lib/activeClient';
import { dashboardRecipe } from './dashboardTracking';
import { metricsFromResults, saveHtmlArtifact } from './htmlArtifacts';

export type WorkRef = CapRef | { kind: 'visuals' | 'artifact'; id: string; label: string; href: '' };
export interface VisualOutputs { results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; reports: readonly ConvReport[]; by?: string }

export function requestByReply(turns: readonly ColleagueTurn[]) {
  const requests = new Map<string, string>();
  let words = '';
  for (const turn of turns) {
    if (turn.struck) continue;
    if (turn.kind === 'typed' || turn.kind === 'said') words = turn.text ?? turn.heard ?? '';
    if (turn.kind === 'reply') { requests.set(turn.id, words); words = ''; }
  }
  return requests;
}

export function visualsOf(turn: ColleagueTurn, request: string, outs: VisualOutputs) {
  const steps = turn.used ?? [];
  const charts = replyChartItems(request, steps, outs.results, outs.charts);
  const reports = new Map<string, ConvReport>();
  const forms = new Map<string, CapRef>();
  for (const s of steps) {
    if (s.status !== 'done') continue;
    for (const ref of s.refs) {
      if (ref.kind === 'convreport') {
        const report = outs.reports.find(r => r.id === ref.id.split('@')[0]);
        if (report?.sections.length) reports.set(report.id, report);
      }
      if (ref.kind === 'study' && /^\/(?!\/)/.test(ref.href) && (s.name === 'make_record' || s.name === 'write_document' || s.name === 'show_work')) forms.set(ref.id, ref);
    }
  }
  return { charts, reports: [...reports.values()], forms: [...forms.values()] };
}

/** Only direct conversions of existing work go to the local exporter. Bespoke analysis stays with Luna. */
export function dashboardRequest(text: string) {
  const words = text.toLowerCase().trim().replace(/^(?:hey\s+)?luna[,\s]+/, '').replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  return /^(?:(?:please|can you|could you|would you)\s+)*(?:turn|convert|make|create|build|save|put|export)\s+(?:(?:me|us)\s+)?(?:(?:these|those|the|this|that|my|our|all the|all these|all those)\s+(?:graphs?|charts?|diagrams?|visuals?|figures?|report|presentation)|them|it|this|that)?\s*(?:(?:as|into|in|to)\s+)?(?:a |an |the )?(?:interactive |animated )?(?:html\s+)?dashboard(?:\s+(?:of|from|with|for)\s+(?:these|those|the|this|that)(?:\s+(?:graphs?|charts?|diagrams?|visuals?|figures?|report|presentation))?)?(?:\s+(?:in|to) artifacts)?(?:,? please)?$/i.test(words);
}

export function galleryRef(id: string, label = 'Visuals'): WorkRef { return { kind: 'visuals', id, label, href: '' }; }
export function artifactRef(id: string, label: string): WorkRef { return { kind: 'artifact', id, label, href: '' }; }

export async function makeVisualDashboard(study: ToolStudy, sourceTurn?: string) {
  const turns = turnsOfConversation(factsOfConversation(study)).filter(t => !t.struck);
  const requests = requestByReply(turns);
  const outputs = outputsOfConversation(study);
  const outs = { results: new Map(outputs.results.map(r => [r.id, r])), charts: new Map(outputs.charts.map(c => [c.id, c])), reports: outputs.reports };
  for (const turn of [...turns].reverse()) {
    if (turn.kind !== 'reply' || (turn.answering && turn.id !== sourceTurn) || (sourceTurn && turn.id !== sourceTurn)) continue;
    const visual = visualsOf(turn, requests.get(turn.id) ?? '', outs);
    if (!visual.charts.length && !visual.reports.length) continue;
    const charts = new Map(outs.charts);
    const sections: ReportSection[] = [];
    for (const report of visual.reports) sections.push(...report.sections);
    const included = new Set(sections.map(s => s.chartId));
    for (const { chart, spec, version, label } of visual.charts) {
      if (included.has(chart.id) && version === chart.versions.length) continue;
      const chartId = 'view-' + sections.length;
      charts.set(chartId, { ...chart, id: chartId, versions: [spec] });
      sections.push({ id: chartId, kind: 'chart', chartId, heading: label, evidence: [spec.resultId] });
    }
    const now = Date.now();
    const first = visual.charts[0];
    const measure = first && outs.results.get(first.spec.resultId)?.result.measures[0];
    const subject = visual.reports[0]?.title ?? measure?.replace(/^sum of /i, '') ?? first?.spec.title ?? 'Analysis';
    const title = (subject.length > 6 && subject === subject.toUpperCase() ? subject[0] + subject.slice(1).toLowerCase() : subject) + ' dashboard';
    const report: ConvReport = { id: 'dashboard-' + turn.id, title, form: 'report', at: now, updated: now, version: 1, sections };
    const { reportHtml } = await import('../lib/data/reportHtml');
    const html = await reportHtml({ report, charts, results: outs.results, printed: new Date(now).toLocaleDateString('en-GB'), dashboard: true }).text();
    const recipe = dashboardRecipe(report, charts, outs.results, (await activeClientNow()).client);
    const used = recipe ? recipe.queries.map(q => outs.results.get(q.id)).filter((r): r is NonNullable<typeof r> => !!r) : [];
    const artifact = await saveHtmlArtifact(study.id, report, html, recipe, metricsFromResults(used));
    const names = sections.filter(s => ['chart','process','table'].includes(s.kind)).map(s => s.heading);
    const reportChart = charts.get(sections.find(s => s.chartId)?.chartId ?? '');
    const firstSpec = first?.spec ?? (reportChart && chartNow(reportChart));
    const series = firstSpec && seriesOf(firstSpec, outs.results);
    const finding = series && !('why' in series) ? series.finding : undefined;
    return { artifact, names, finding };
  }
  return null;
}

export async function dashboardFromChat(cid: string, sourceTurn?: string) {
  const study = await getStudy(cid);
  if (!study || study.deletedAt) throw new Error('This conversation is unavailable.');
  return makeVisualDashboard(study, sourceTurn);
}

export function savedDashboardWords(saved: NonNullable<Awaited<ReturnType<typeof makeVisualDashboard>>>) {
  if (saved.artifact.tracking === 'live') return `“${saved.artifact.title}” is already tracking its source in Artifacts. Open it for the latest figures.`;
  const names = saved.names.slice(0, 3).join(', ');
  return `I saved “${saved.artifact.title}” in Artifacts. ${names ? 'Explore ' + names + (saved.names.length > 3 ? ' and the other views' : '') + '.' : 'Open it to explore the saved report.'}${saved.finding ? ' ' + saved.finding : ''}${saved.artifact.recipe && !saved.artifact.tracking ? ' Do you want this dashboard to track changes in its source data?' : ''}`;
}
