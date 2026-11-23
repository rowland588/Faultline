/* LUNA IN THE CLOUD — which linked files to poll while the app is shut (23 November 2026, docs/LUNA-G6-SERVER.md G2 remainder).
 *
 * The device's own look (colleague/keepUp) runs when Luna's page is open. This module is the same rules in pure form: the newest
 * reading of each link for a customer, not archived, not too big to fetch unasked, not looked at within KEEP_UP.everyMs. The edge
 * function `keepup` uses it; the app's tests prove what the cloud runs. */
import { fileKey, type Source } from '../lib/data/sources';
import type { LinkOrigin } from '../lib/fileLink/link';
import { KEEP_UP } from './keepUp';

export type ServerLinkSource = {
  fileKey: string;
  sourceId: string;
  ownerId: string;
  client: string;
  name: string;
  url: string;
  hash: string;
  bytes: number;
  readAt: number;
};

/** A story study's client name is archived when every story of it has agreed.story.archivedAt. */
export function archivedClients(stories: readonly { agreed?: { story?: { client?: string; archivedAt?: number } } }[]): Set<string> {
  const by = new Map<string, number[]>();
  for (const s of stories) {
    const st = s.agreed?.story;
    const c = (st?.client ?? '').trim();
    if (!c) continue;
    const k = c.toLowerCase();
    const list = by.get(k) ?? [];
    list.push(typeof st?.archivedAt === 'number' ? st.archivedAt : 0);
    by.set(k, list);
  }
  const out = new Set<string>();
  for (const [k, stamps] of by) if (stamps.length && stamps.every(t => t > 0)) out.add(k);
  return out;
}

/** The newest source record per linked file (link origin only), with owner — for server polling. */
export function newestLinkSources(
  sources: readonly (Source & { ownerId: string })[],
): ServerLinkSource[] {
  const by = new Map<string, ServerLinkSource & { readAt: number }>();
  for (const s of sources) {
    const o = s.facts.origin;
    if (!o || o.kind !== 'link') continue;
    const k = fileKey(s);
    if (!k) continue;
    const link = o as LinkOrigin;
    const had = by.get(k);
    if (had && had.readAt >= (s.facts.at ?? s.at)) continue;
    by.set(k, {
      fileKey: k,
      sourceId: s.id,
      ownerId: s.ownerId,
      client: (s.facts.client ?? '').trim(),
      name: s.facts.name,
      url: link.url,
      hash: link.hash,
      bytes: s.facts.bytes ?? 0,
      readAt: s.facts.at ?? s.at,
    });
  }
  return [...by.values()];
}

/** Which links are due a server look — same cadence and size cap as colleague/keepUp dueNow. */
export function dueServerLinks(
  rows: readonly ServerLinkSource[],
  now: number,
  checkedAt: Readonly<Record<string, number>>,
  archived: ReadonlySet<string>,
  o: { everyMs: number; most: number; maxBytes: number } = KEEP_UP,
): ServerLinkSource[] {
  return rows
    .filter(r => !r.client || !archived.has(r.client.toLowerCase()))
    .filter(r => r.bytes <= o.maxBytes)
    .filter(r => now - (checkedAt[r.fileKey] ?? 0) >= o.everyMs)
    .sort((a, b) => (checkedAt[a.fileKey] ?? 0) - (checkedAt[b.fileKey] ?? 0))
    .slice(0, o.most);
}

export const linkHashChanged = (kept: string, found: string): boolean => kept.length > 0 && found.length > 0 && kept !== found;