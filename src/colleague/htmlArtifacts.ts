/* The HTML files the person actually saved from Luna. Reports, charts and uploaded workbooks
 * remain in their own places; only these files appear in Artifacts. */
import { getStudy, patchStudy } from '../db';
import { uid } from '../lib/ids';
import type { ToolStudy } from '../lib/study';
import type { ConvReport } from '../lib/data/outputs';

export type HtmlArtifact = NonNullable<ToolStudy['facts']['htmlArtifacts']>[number];
export const htmlArtifactsOf = (s: Pick<ToolStudy, 'facts'>): HtmlArtifact[] => (s.facts.htmlArtifacts ?? []).filter(a => !a.deletedAt);
export const htmlArtifactBlob = (a: HtmlArtifact): Blob => new Blob([a.html], { type: 'text/html;charset=utf-8' });

export async function saveHtmlArtifact(conversationId: string, report: ConvReport, html: string, recipe?: HtmlArtifact['recipe']): Promise<HtmlArtifact> {
  let saved: HtmlArtifact | undefined;
  await patchStudy(conversationId, cur => {
    const all = cur.facts.htmlArtifacts ?? [];
    const old = all.find(a => a.reportId === report.id && !a.deletedAt);
    const now = Date.now();
    if (old?.tracking === 'live' && recipe) { saved = old; return {}; }
    saved = old ? { ...old, ...(recipe ? { recipe } : {}), html, reportVersion: report.version, updatedAt: now } : {
      id: uid(), ...(recipe ? { recipe } : {}), reportId: report.id, reportVersion: report.version, title: report.title.slice(0, 80), html, at: now, updatedAt: now,
    };
    return { facts: { ...cur.facts, htmlArtifacts: [...all.filter(a => a.id !== saved?.id), saved] } };
  });
  if (!saved) throw new Error('The HTML could not be saved to Artifacts.');
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('luna-artifact-saved', { detail: saved.id }));
  return saved;
}

export async function renameHtmlArtifact(conversationId: string, id: string, title: string): Promise<void> {
  const name = title.trim().slice(0, 80);
  if (!name) return;
  await patchStudy(conversationId, cur => ({ facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => a.id === id && !a.deletedAt ? { ...a, title: name, updatedAt: Date.now() } : a) } }));
}

export async function deleteHtmlArtifact(conversationId: string, id: string): Promise<() => Promise<void>> {
  await patchStudy(conversationId, cur => ({ facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => a.id === id ? { ...a, deletedAt: Date.now(), updatedAt: Date.now() } : a) } }));
  return async () => { await patchStudy(conversationId, cur => ({ facts: { ...cur.facts, htmlArtifacts: (cur.facts.htmlArtifacts ?? []).map(a => a.id === id ? { ...a, deletedAt: undefined, updatedAt: Date.now() } : a) } })); };
}

/* Keep the saved edition, date and words of an earlier Luna guide. Add its figure only when
 * the owning conversation still contains exactly the edition used to make the file. */
export async function illustratedArtifact(artifact: HtmlArtifact, cid: string): Promise<HtmlArtifact> {
  if (artifact.recipe || !artifact.html.includes('<body class="document">') || artifact.html.includes('data-guide-layout=')
    || !artifact.html.includes('</header><nav class="contents"')) return artifact;
  try {
    const study = await getStudy(cid);
    if (!study || study.deletedAt) return artifact;
    const { outputsOfConversation } = await import('../capabilities/data');
    const report = outputsOfConversation(study).reports.find(r => r.id === artifact.reportId && r.version === artifact.reportVersion);
    if (!report) return artifact;
    const { guideFigure, guideFigureHtml } = await import('../lib/data/guideFigures');
    const lead = guideFigure(report);
    if (!lead) return artifact;
    const { default: styles } = await import('../lib/data/guideFigures.css?inline');
    const html = artifact.html.replace('</style>', () => styles + '</style>')
      .replace('</header><nav class="contents"', () => '</header>' + guideFigureHtml(lead) + '<nav class="contents"')
      .replace('<main class="wrap">', '<main class="wrap" data-guide-layout="2">');
    return { ...artifact, html };
  } catch { return artifact; }
}

export async function downloadableArtifact(artifact: HtmlArtifact, cid: string) {
  return dashboardDownload(await illustratedArtifact(artifact, cid), cid);
}

/** A live download opens the same authenticated dashboard and reruns its tracked queries on that device. */
export function dashboardDownload(artifact: HtmlArtifact, cid: string): Blob {
  if (artifact.tracking !== 'live') return htmlArtifactBlob(artifact);
  const link = new URL(window.location.pathname, window.location.origin);
  link.hash = '/ai?' + new URLSearchParams({ c: cid, work: 'artifact:' + artifact.id });
  const url = link.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return new Blob([`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${url}"><title>Live dashboard · Luna</title></head><body><p><a href="${url}">Open your live dashboard in Faultline</a></p><p>Sign in to view the latest available source data.</p></body></html>`], { type: 'text/html;charset=utf-8' });
}
