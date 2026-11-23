/* Conversation mode — one-line previews and which refs open as artifacts (23 November). */
import type { CapRef } from '../capabilities/types';

const ARTIFACT_KINDS = new Set<CapRef['kind']>(['study', 'report', 'page', 'line', 'project', 'machine', 'problem', 'result', 'chart', 'convreport']);

/** Refs that should offer “Open” in Conversation mode — not actions or duplicate page chips. */
export function artifactRefs(refs: readonly CapRef[] | undefined): CapRef[] {
  if (!refs?.length) return [];
  const out: CapRef[] = [];
  const seen = new Set<string>();
  for (const r of refs) {
    if (!ARTIFACT_KINDS.has(r.kind)) continue;
    const k = `${r.kind}:${r.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (r.href || r.kind === 'chart' || r.kind === 'convreport' || r.kind === 'result') out.push(r);
  }
  return out;
}

/** First sentence of a capability’s says — fits the artifact strip. */
export function artifactPreview(says: string | undefined, fallback = ''): string {
  const t = (says ?? fallback).trim();
  if (!t) return fallback.trim();
  const m = /^[^.!?\n]+[.!?]?/.exec(t.replace(/\s+/g, ' '));
  const one = (m?.[0] ?? t).trim();
  return one.length > 140 ? `${one.slice(0, 137)}…` : one;
}

export function canPresentOnScreen(ref: CapRef): boolean {
  return ref.kind === 'convreport' || ref.kind === 'report';
}