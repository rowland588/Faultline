/* The HTML files the person actually saved from Luna. Reports, charts and uploaded workbooks
 * remain in their own places; only these files appear in Artifacts. */
import { patchStudy } from '../db';
import { uid } from '../lib/ids';
import type { ToolStudy } from '../lib/study';
import type { ConvReport } from '../lib/data/outputs';

export type HtmlArtifact = NonNullable<ToolStudy['facts']['htmlArtifacts']>[number];
export const htmlArtifactsOf = (s: Pick<ToolStudy, 'facts'>): HtmlArtifact[] => (s.facts.htmlArtifacts ?? []).filter(a => !a.deletedAt);
export const htmlArtifactBlob = (a: HtmlArtifact): Blob => new Blob([a.html], { type: 'text/html;charset=utf-8' });

export async function saveHtmlArtifact(conversationId: string, report: ConvReport, html: string): Promise<HtmlArtifact> {
  let saved: HtmlArtifact | undefined;
  await patchStudy(conversationId, cur => {
    const all = cur.facts.htmlArtifacts ?? [];
    const old = all.find(a => a.reportId === report.id && !a.deletedAt);
    const now = Date.now();
    saved = old ? { ...old, html, reportVersion: report.version, updatedAt: now } : {
      id: uid(), reportId: report.id, reportVersion: report.version, title: report.title.slice(0, 80), html, at: now, updatedAt: now,
    };
    return { facts: { ...cur.facts, htmlArtifacts: [...all.filter(a => a.id !== saved?.id), saved] } };
  });
  if (!saved) throw new Error('The HTML could not be saved to Artifacts.');
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
