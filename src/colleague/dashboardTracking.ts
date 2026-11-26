import type { CapCtx } from '../capabilities/types';
import { allSources, askSource, resolveId } from '../capabilities/data';
import { getStudy, patchStudy } from '../db';
import { activeClientNow } from '../lib/activeClient';
import { chartNow, checkSection, type Chart, type ConvReport, type DataResult } from '../lib/data/outputs';
import { fileKey, type Source } from '../lib/data/sources';
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

// Several graphs can use one linked file. Share the in-flight read and poll its remote
// version at most once every five minutes while the dashboard is visible.
const remoteChecks = new Map<string, { at: number; running: boolean; read: Promise<void> }>();
async function checkRemote(source: Source, ctx: CapCtx, force: boolean) {
  const origin = source.facts.origin;
  if (!origin) return;
  const resolved = await resolveId(source.id, ctx);
  if ('why' in resolved) throw new Error(resolved.why);
  const key = JSON.stringify([ctx.conversationId, ctx.userId, fileKey(source)]);
  const now = Date.now();
  const previous = remoteChecks.get(key);
  if (previous && (previous.running || (!force && now - previous.at < 300000))) return previous.read;
  const check = async () => {
    const { readQuietly } = await import('./readQuietly');
    let change;
    if (origin.kind === 'link') {
      const { linkNewerThan } = await import('../lib/fileLink/link');
      const result = await linkNewerThan(origin);
      if (!result.newer) return;
      change = result;
    } else {
      const { newerThan, download } = await import('../lib/microsoft/graph');
      const result = await newerThan(origin);
      if (!result.newer) return;
      change = await download({ ...result.item, name: source.facts.fileName }, origin.path);
    }
    const reading = await readQuietly(change.file, { origin: change.origin, versionOf: source.id, client: source.facts.client, lineId: source.lineId, projectId: source.projectId });
    if (!reading) throw new Error('The linked file changed, but its new version could not be read.');
  };
  const entry = { at: now, running: true, read: check().finally(() => { entry.running = false; }) };
  remoteChecks.set(key, entry);
  return entry.read;
}

export class DashboardLinkNeeded extends Error {
  constructor(readonly binding: string, name: string) {
    super('I have an uploaded copy of “' + name + '”. Paste a link to the original Excel workbook here so I can track its changes.');
  }
}

export async function refreshDashboard(ctx: CapCtx, cid: string, id: string, enable = false, force = false): Promise<HtmlArtifact> {
  const study = await getStudy(cid);
  const saved = study && htmlArtifactsOf(study).find(a => a.id === id);
  if (!saved?.recipe || (!enable && saved.tracking !== 'live')) throw new Error('This dashboard has no active data connection.');
  const recipe = saved.recipe;
  if ((await activeClientNow()).client !== recipe.client) throw new Error('Open the customer workspace where this dashboard was created to refresh it.');
  const originalSources = await allSources();
  const linked = new Set<Source>();
  for (const binding of recipe.queries) {
    const lookups = (binding.query as Partial<Query>).lookups ?? [];
    for (const id of [binding.source.sourceId ?? binding.source.id, ...lookups.map(l => l.source).filter((id): id is string => !!id)]) {
      const current = currentSource(id, originalSources);
      const source = originalSources.find(s => s.id === current);
      if (source?.facts.origin) linked.add(source);
    }
  }
  for (const source of linked) await checkRemote(source, { ...ctx, conversationId: cid }, force);
  const sources = linked.size ? await allSources() : originalSources;
  const results = new Map<string, DataResult>();
  for (const query of recipe.queries) {
    const { sheet, ...params } = query.query as Partial<Query>;
    const question = { ...params, ...(params.lookups ? { lookups: params.lookups.map(l => l.source ? { ...l, source: currentSource(l.source, sources) } : l) } : {}) } as Omit<Query, 'sheet'>;
    const id = query.source.sourceId ?? query.source.id;
    const source = currentSource(id, sources);
    if (query.source.kind === 'workbook' && !sources.find(s => s.id === source)?.facts.origin) throw new DashboardLinkNeeded(id, query.source.name);
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
  const { reportHtml } = await import('../lib/data/reportHtml');
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

/** The person explicitly supplies the original URL for an uploaded workbook. Validate every bound query
 * against that workbook before changing the file's recipe. Other artifacts and source records keep their bindings. */
export async function connectDashboardWorkbook(ctx: CapCtx, cid: string, aid: string, binding: string, url: string) {
  const study = await getStudy(cid);
  const artifact = study && htmlArtifactsOf(study).find(a => a.id === aid);
  if (!artifact?.recipe || (await activeClientNow()).client !== artifact.recipe.client) throw new Error('Open the original customer workspace to link this workbook.');
  const bound = artifact.recipe.queries.filter(q => (q.source.sourceId ?? q.source.id) === binding);
  if (!bound.length) throw new Error('This workbook is no longer used by the dashboard.');
  const { fetchLink } = await import('../lib/fileLink/link');
  const { readQuietly } = await import('./readQuietly');
  const file = await fetchLink(url);
  const original = (await allSources()).find(s => s.id === binding || s.facts.fileId === binding);
  const linked = await readQuietly(file.file, { origin: file.origin, conversationId: cid, client: original?.facts.client ?? artifact.recipe.client, lineId: original?.lineId, projectId: original?.projectId });
  if (!linked) throw new Error('I could not read that Excel workbook.');
  for (const b of bound) {
    const { sheet, ...q } = b.query as Partial<Query>;
    const result = await askSource({ ...ctx, conversationId: cid }, linked.sourceId, sheet ?? b.source.sheet, q as Omit<Query, 'sheet'>);
    if (!result.ok) throw new Error('The linked workbook does not supply the data used for “' + b.title + '”. Check the file, sheet and column names.');
  }
  await patchStudy(cid, cur => ({ facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => {
    if (a.id !== aid || a.deletedAt || !a.recipe || a.updatedAt !== artifact.updatedAt) return a;
    return { ...a, updatedAt: Date.now(), recipe: { ...a.recipe, queries: a.recipe.queries.map(q =>
      (q.source.sourceId ?? q.source.id) === binding ? { ...q, source: { ...q.source, sourceId: linked.sourceId } } : q) } };
  }) } }));
  return refreshDashboard(ctx, cid, aid, true);
}
