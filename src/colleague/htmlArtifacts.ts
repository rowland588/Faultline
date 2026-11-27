/* Independent Luna artifacts — dashboards, HTML reports and generated output.
 * Chat is the birthplace only. Each file is its own talk study (`facts.lunaArtifact`),
 * listed in Artifacts, and survives the conversation that made it. Leftover copies
 * still stored on a conversation are listed until they are lifted. */
import { getStudy, listAllStudies, patchStudy, putStudy } from '../db';
import { uid } from '../lib/ids';
import { derivedAt, derivedSaid } from '../lib/workbook/derive';
import type { DataResult } from '../lib/data/outputs';
import type { ToolStudy } from '../lib/study';
import type { ConvReport } from '../lib/data/outputs';
import { isConversation } from './conversation';

export type HtmlArtifact = NonNullable<ToolStudy['facts']['htmlArtifacts']>[number];
export type StandingArtifact = HtmlArtifact & {
  conversationId: string;
  studyId: string;
  client?: string;
  folderId?: string;
};

export const htmlArtifactsOf = (s: Pick<ToolStudy, 'facts'>): HtmlArtifact[] => (s.facts.htmlArtifacts ?? []).filter(a => !a.deletedAt);
export const htmlArtifactBlob = (a: HtmlArtifact): Blob => new Blob([a.html], { type: 'text/html;charset=utf-8' });

export const isLunaArtifact = (s: Pick<ToolStudy, 'tool' | 'facts'>): boolean =>
  s.tool === 'talk' && (s.facts as { lunaArtifact?: unknown }).lunaArtifact === true;

const birthplaceOf = (s: Pick<ToolStudy, 'id' | 'facts'>): string =>
  (s.facts as { conversationId?: string }).conversationId ?? '';

const clientOf = (s: Pick<ToolStudy, 'facts'>): string | undefined =>
  (s.facts as { client?: string }).client;

const folderOf = (s: Pick<ToolStudy, 'facts'>): string | undefined =>
  (s.facts as { folderId?: string }).folderId;

function metricValue(v: number | string | null | undefined, i: number, result: DataResult['result']): string {
  if (v == null) return 'not recorded';
  const said = derivedSaid(typeof v === 'number' || typeof v === 'string' ? v : null, derivedAt(result, i));
  if (said) return said;
  if (typeof v !== 'number') return String(v);
  if (Math.abs(v) >= 1000) return v.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  if (Number.isInteger(v)) return String(v);
  return v.toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

/** Key figures for an Artifacts card — the code's totals, never the model's. */
export function metricsFromResults(results: Iterable<DataResult>): { label: string; value: string }[] {
  for (const r of results) {
    const out: { label: string; value: string }[] = [];
    for (let i = 0; i < r.result.measures.length && out.length < 3; i++) {
      out.push({
        label: r.result.measures[i].replace(/^sum of /i, ''),
        value: metricValue(r.result.totals[i], i, r.result),
      });
    }
    if (out.length) return out;
  }
  return [];
}

function asStanding(s: ToolStudy, a: HtmlArtifact, conversationId: string): StandingArtifact {
  const client = clientOf(s);
  const folderId = folderOf(s);
  return { ...a, conversationId, studyId: s.id, ...(client ? { client } : {}), ...(folderId ? { folderId } : {}) };
}

export async function standingArtifacts(): Promise<StandingArtifact[]> {
  const all = await listAllStudies();
  const out: StandingArtifact[] = [];
  const seen = new Set<string>();
  for (const s of all) {
    if (s.deletedAt || !isLunaArtifact(s)) continue;
    for (const a of htmlArtifactsOf(s)) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(asStanding(s, a, birthplaceOf(s)));
    }
  }
  for (const s of all) {
    if (s.deletedAt || isLunaArtifact(s) || !isConversation(s)) continue;
    for (const a of htmlArtifactsOf(s)) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(asStanding(s, a, s.id));
    }
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

export async function getStandingArtifact(id: string): Promise<StandingArtifact | undefined> {
  return (await standingArtifacts()).find(a => a.id === id);
}

async function writeStanding(artifact: HtmlArtifact, extra: { conversationId?: string; client?: string; folderId?: string } = {}): Promise<void> {
  const existing = await getStudy(artifact.id);
  const keep = existing && isLunaArtifact(existing) ? existing : undefined;
  const conversationId = extra.conversationId || birthplaceOf(keep ?? { id: artifact.id, facts: {} });
  const client = extra.client || (keep ? clientOf(keep) : undefined);
  const folderId = extra.folderId || (keep ? folderOf(keep) : undefined);
  const t = Date.now();
  await putStudy({
    id: artifact.id,
    tool: 'talk',
    name: artifact.title,
    facts: {
      ...(keep?.facts ?? {}),
      lunaArtifact: true,
      ...(conversationId ? { conversationId } : {}),
      ...(client ? { client } : {}),
      ...(folderId ? { folderId } : {}),
      htmlArtifacts: [artifact],
    } as ToolStudy['facts'],
    uses: keep?.uses ?? [],
    startedAt: keep?.startedAt ?? artifact.at,
    createdAt: keep?.createdAt ?? artifact.at,
    updatedAt: t,
  });
}

export async function patchHtmlArtifact(id: string, change: (a: HtmlArtifact) => HtmlArtifact): Promise<HtmlArtifact | undefined> {
  const found = await getStandingArtifact(id);
  if (!found) return undefined;
  const next = change(found);
  const study = await getStudy(found.studyId);
  if (study && isLunaArtifact(study)) {
    await writeStanding(next, { conversationId: found.conversationId, client: found.client, folderId: found.folderId });
  } else if (found.conversationId) {
    await patchStudy(found.conversationId, cur => ({
      facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => a.id === id && !a.deletedAt ? next : a) },
    }));
  }
  return next;
}

/** Lift leftover conversation copies onto independent records, then tombstone the copies. */
export async function liftHtmlArtifactsFromChat(conversationId: string): Promise<void> {
  const s = await getStudy(conversationId);
  if (!s) return;
  const arts = htmlArtifactsOf(s);
  if (!arts.length) return;
  for (const a of arts) {
    await writeStanding(a, { conversationId, client: clientOf(s), folderId: folderOf(s) });
  }
  const at = Date.now();
  await patchStudy(conversationId, cur => ({
    facts: {
      ...cur.facts,
      htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => a.deletedAt ? a : { ...a, deletedAt: at, updatedAt: at }),
    },
  }));
}

export async function saveHtmlArtifact(conversationId: string, report: ConvReport, html: string, recipe?: HtmlArtifact['recipe'], metrics?: HtmlArtifact['metrics']): Promise<HtmlArtifact> {
  const birth = await getStudy(conversationId);
  const existing = (await standingArtifacts()).find(a => a.reportId === report.id && a.conversationId === conversationId)
    ?? htmlArtifactsOf(birth ?? { facts: {} }).find(a => a.reportId === report.id);
  if (existing?.tracking === 'live' && recipe) return existing;
  const now = Date.now();
  const saved: HtmlArtifact = existing ? {
    ...existing,
    ...(recipe ? { recipe } : {}),
    ...(metrics ? { metrics } : existing.metrics ? { metrics: existing.metrics } : {}),
    html,
    reportVersion: report.version,
    updatedAt: now,
  } : {
    id: uid(),
    ...(recipe ? { recipe } : {}),
    ...(metrics ? { metrics } : {}),
    reportId: report.id,
    reportVersion: report.version,
    title: report.title.slice(0, 80),
    html,
    at: now,
    updatedAt: now,
  };
  await writeStanding(saved, { conversationId, client: birth ? clientOf(birth) : undefined, folderId: birth ? folderOf(birth) : undefined });
  if (birth) {
    await patchStudy(conversationId, cur => {
      const all = cur.facts.htmlArtifacts ?? [];
      if (!all.some(a => a.id === saved.id && !a.deletedAt)) return {};
      return { facts: { ...cur.facts, htmlArtifacts: all.map(a => a.id === saved.id ? { ...a, deletedAt: now, updatedAt: now } : a) } };
    });
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('luna-artifact-saved', { detail: saved.id }));
  return saved;
}

export async function renameHtmlArtifact(_conversationId: string, id: string, title: string): Promise<void> {
  const name = title.trim().slice(0, 80);
  if (!name) return;
  await patchHtmlArtifact(id, a => ({ ...a, title: name, updatedAt: Date.now() }));
}

export async function deleteHtmlArtifact(_conversationId: string, id: string): Promise<() => Promise<void>> {
  const found = await getStandingArtifact(id);
  if (!found) return async () => { /* already gone */ };
  const at = Date.now();
  const study = await getStudy(found.studyId);
  if (study && isLunaArtifact(study)) {
    await writeStanding({ ...found, deletedAt: at, updatedAt: at }, found);
    return async () => { await writeStanding({ ...found, deletedAt: undefined, updatedAt: Date.now() }, found); };
  }
  await patchStudy(found.conversationId, cur => ({
    facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => a.id === id ? { ...a, deletedAt: at, updatedAt: at } : a) },
  }));
  return async () => {
    await patchStudy(found.conversationId, cur => ({
      facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => a.id === id ? { ...a, deletedAt: undefined, updatedAt: Date.now() } : a) },
    }));
  };
}

/* Keep the saved edition, date and words of an earlier Luna guide. Add its figure only when
 * the owning conversation still contains exactly the edition used to make the file. */
export async function illustratedHtml(html: string, cid: string, reportId: string, version: number): Promise<string> {
  if (!html.includes('<body class="document">') || html.includes('data-guide-layout="5"') || !html.includes('class="contents"')) return html;
  try {
    const study = await getStudy(cid);
    if (!study || study.deletedAt) return html;
    const { outputsOfConversation } = await import('../capabilities/data');
    const report = outputsOfConversation(study).reports.find(r => r.id === reportId && r.version === version);
    if (!report) return html;
    const { guideFigure, guideFigureHtml, guideSectionFigure } = await import('../lib/data/guideFigures');
    const lead = guideFigure(report);
    const { default: styles } = await import('../lib/data/guideFigures.css?inline');
    const parsed = new DOMParser().parseFromString(html,'text/html');
    const main = parsed.querySelector('main.wrap'), nav = main?.querySelector(':scope > nav.contents');
    if (!main || !nav) return html;
    const edition = main.getAttribute('data-guide-layout');
    if (edition && !['2','3','4'].includes(edition)) return html;
    main.querySelector(':scope > figure[data-guide-figure]')?.remove();
    if (lead) nav.insertAdjacentHTML('beforebegin',guideFigureHtml(lead));
    const { lessonReading } = await import('../lib/data/learningMap');
    report.sections.forEach((s,index)=>{
      const inset=guideSectionFigure(report,s), body=main.querySelector('#s'+(index+1)+' > .slide-body');
      if (!body) return;
      if (inset && !body.querySelector('[data-guide-figure="'+inset.kind+'"]')) body.insertAdjacentHTML('afterbegin',guideFigureHtml(inset));
      const reading=lessonReading(report,s), first=body.querySelector(':scope > p');
      if (!reading || !first || first.children.length || !first.textContent?.startsWith(reading.lead) || body.querySelector('.lg-reading')) return;
      const extra=first.textContent.slice(reading.lead.length).trim();
      first.textContent=reading.lead;
      body.prepend(first);
      const details=parsed.createElement('details'), summary=parsed.createElement('summary');
      details.className='lg-reading'; summary.textContent='Detail and examples'; details.append(summary);
      if (extra) {const p=parsed.createElement('p');p.textContent=extra;details.append(p);}
      for (const node of body.querySelectorAll(':scope > p,:scope > ul,:scope > ol')) if(node!==first && !node.className) details.append(node);
      if(details.childElementCount>1) body.append(details);
    });
    const sheet = parsed.createElement('style');
    sheet.textContent=styles;
    parsed.head.append(sheet);
    main.setAttribute('data-guide-layout','5');
    return '<!doctype html>'+parsed.documentElement.outerHTML;
  } catch { return html; }
}

export async function illustratedArtifact(artifact: HtmlArtifact, cid: string): Promise<HtmlArtifact> {
  const html = artifact.recipe ? artifact.html : await illustratedHtml(artifact.html, cid, artifact.reportId, artifact.reportVersion);
  return html === artifact.html ? artifact : { ...artifact, html };
}

export async function downloadableArtifact(artifact: HtmlArtifact, cid: string) {
  return dashboardDownload(await illustratedArtifact(artifact, cid), cid);
}

/** A live download opens the same authenticated dashboard and reruns its tracked queries on that device. */
export function dashboardDownload(artifact: HtmlArtifact, _cid?: string): Blob {
  if (artifact.tracking !== 'live') return htmlArtifactBlob(artifact);
  const link = new URL(window.location.pathname, window.location.origin);
  link.hash = '/ai?' + new URLSearchParams({ work: 'artifact:' + artifact.id });
  const url = link.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return new Blob([`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${url}"><title>Live dashboard · Luna</title></head><body><p><a href="${url}">Open your live dashboard in Faultline</a></p><p>Sign in to view the latest available source data.</p></body></html>`], { type: 'text/html;charset=utf-8' });
}
