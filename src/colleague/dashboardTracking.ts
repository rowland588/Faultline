import type { CapCtx } from '../capabilities/types';
import { allSources, askSource } from '../capabilities/data';
import { getStudy, patchStudy } from '../db';
import { activeClientNow } from '../lib/activeClient';
import { chartNow, checkSection, type Chart, type ConvReport, type DataResult } from '../lib/data/outputs';
import { fileKey, type Source } from '../lib/data/sources';
import { reportHtml } from '../lib/data/reportHtml';
import type { Query } from '../lib/workbook/query';
import { htmlArtifactsOf, type HtmlArtifact } from './htmlArtifacts';

type Binding = Pick<DataResult, 'id' | 'title' | 'source' | 'query'>;
export interface DashboardRecipe {
  report: ConvReport;
  charts: Chart[];
  queries: Binding[];
  client: string;
}

export function dashboardRecipe(report: ConvReport, charts: ReadonlyMap<string, Chart>, results: ReadonlyMap<string, DataResult>, client: string): DashboardRecipe | undefined {
  const needed = new Set<string>();
  const drawn = new Map<string, Chart>();
  for (const section of report.sections) {
    for (const id of section.evidence ?? []) needed.add(id);
    if (section.resultId) needed.add(section.resultId);
    if (!section.chartId) continue;
    const chart = charts.get(section.chartId);
    if (!chart) return undefined;
    const spec = chartNow(chart);
    drawn.set(chart.id, { ...chart, versions: [spec] });
    needed.add(spec.resultId);
    if (spec.compareResultId) needed.add(spec.compareResultId);
  }
  if (!needed.size) return undefined;
  const queries: Binding[] = [];
  for (const id of needed) {
    const result = results.get(id);
    if (!result || !Array.isArray(result.query.measures)) return undefined;
    queries.push({ id, title: result.title, source: result.source, query: result.query });
  }
  return { report, charts: [...drawn.values()], queries, client };
}

// A connected file receives a new register entry for each reading. Identity includes its customer.
// Ordinary uploads stay bound to their own file; a matching filename is never enough.
function currentSource(id: string, sources: readonly Source[]): string {
  const key = id.replace(/^file:/, '');
  const pinned = sources.find(s => s.id === key || s.facts.fileId === key);
  const family = pinned && fileKey(pinned);
  return (family && sources.find(s => fileKey(s) === family)?.id) || pinned?.id || id;
}

export async function refreshDashboard(ctx: CapCtx, cid: string, id: string, enable = false): Promise<HtmlArtifact> {
  const study = await getStudy(cid);
  const saved = study && htmlArtifactsOf(study).find(a => a.id === id);
  if (!saved?.recipe || (!enable && saved.tracking !== 'live')) throw new Error('This dashboard has no active data connection.');
  const recipe = saved.recipe;
  if ((await activeClientNow()).client !== recipe.client) throw new Error('Open the customer workspace where this dashboard was created to refresh it.');
  const sources = await allSources();
  const results = new Map<string, DataResult>();
  for (const query of recipe.queries) {
    const { sheet, ...params } = query.query as Partial<Query>;
    const question = { ...params, ...(params.lookups ? { lookups: params.lookups.map(l => l.source ? { ...l, source: currentSource(l.source, sources) } : l) } : {}) } as Omit<Query, 'sheet'>;
    const source = currentSource(query.source.sourceId ?? query.source.id, sources);
    const answer = await askSource({ ...ctx, now: Date.now(), conversationId: cid }, source, sheet ?? query.source.sheet, question);
    if (!answer.ok) throw new Error(query.source.name + ' — ' + (answer.why === 'cannot' ? 'a required column is missing.' : answer.why));
    results.set(query.id, { ...query, at: ctx.now, result: answer.result, source: { ...query.source, id: answer.id, name: answer.name } });
  }
  const charts = new Map(recipe.charts.map(c => [c.id, c]));
  const sections = recipe.report.sections.map(s => {
    const checked = checkSection(s, results, charts, false);
    if (!checked.ok) throw new Error(checked.why);
    return checked.s;
  });
  const report = { ...recipe.report, title: saved.title, sections };
  const html = await reportHtml({ dashboard: true, report, charts, results, printed: new Date().toLocaleDateString('en-GB') }).text();
  if (saved.tracking === 'live' && saved.html === html) return saved;
  let next: HtmlArtifact | undefined;
  await patchStudy(cid, cur => ({ facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => {
    if (a.id !== id || a.deletedAt || a.updatedAt !== saved.updatedAt) return a;
    next = { ...a, html, tracking: 'live', updatedAt: Date.now(), refreshedAt: Date.now() };
    return next;
  }) } }));
  if (!next) throw new Error('The dashboard changed during this check. Open it again to see its latest version.');
  return next;
}

export async function freezeDashboard(cid: string, id: string) {
  await patchStudy(cid, cur => ({ facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => a.id === id && !a.deletedAt ? { ...a, tracking: 'snapshot' as const, updatedAt: Date.now() } : a) } }));
}

export function trackingAnswer(words: string, pending: boolean): boolean | undefined {
  const said = words.trim().toLowerCase().replace(/^(?:hey )?luna[, ]+/, '').replace(/[.!?]+$/, '').trim();
  if (/^(?:(?:yes[, ]+|please )?(?:track (?:it|this|changes|this dashboard)|(?:make|keep) (?:it|this dashboard) live|turn (?:on )?tracking(?: on)?))(?: please)?$/.test(said)) return true;
  if (/^(?:stop tracking(?: it| this dashboard)?|keep (?:a |the |this )?snapshot|keep it (?:static|as a snapshot))$/.test(said)) return false;
  if (pending && /^(?:yes|yep|yeah|sure|please do|yes[, ]+please)$/.test(said)) return true;
  if (pending && /^(?:no|nope|no[, ]+thanks|no[, ]+thank you)$/.test(said)) return false;
  return undefined;
}
