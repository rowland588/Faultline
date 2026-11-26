/* The HTML files the person actually saved from Luna. Reports, charts and uploaded workbooks
 * remain in their own places; only these files appear in Artifacts. */
import { patchStudy } from '../db';
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

/** A live download opens the same authenticated dashboard and reruns its tracked queries on that device. */
export function dashboardDownload(artifact: HtmlArtifact, cid: string): Blob {
  if (artifact.tracking !== 'live') return htmlArtifactBlob(artifact);
  const link = new URL(window.location.pathname, window.location.origin);
  link.hash = '/ai?' + new URLSearchParams({ c: cid, work: 'artifact:' + artifact.id });
  const url = link.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return new Blob([`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${url}"><title>Live dashboard · Luna</title></head><body><p><a href="${url}">Open your live dashboard in Faultline</a></p><p>Sign in to view the latest available source data.</p></body></html>`], { type: 'text/html;charset=utf-8' });
}
