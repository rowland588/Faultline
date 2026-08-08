/* Walks and asset history, DERIVED — no new tables, no migration. A "walk" is
 * the set of segments filmed the same calendar day; an asset's history is every
 * marked instance sharing its identity (code if both have one, else name,
 * case-insensitively) across those walks. Refilming the line and marking the
 * same machines is all it takes for "then vs now" to exist. */
import type { Segment, SnagAsset, Snag } from './types';

const dayOf = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export const assetKey = (a: { name: string; code?: string }): string =>
  (a.code?.trim() || a.name.trim()).toLowerCase();

export interface AssetAppearance {
  asset: SnagAsset;
  day: number;          // the walk's calendar day
  open: number;         // snags open on that instance TODAY
  closed: number;       // snags on that instance now closed
}

/** Every appearance of the same machine across walks, oldest → newest. */
export function assetHistory(
  target: SnagAsset,
  allAssets: SnagAsset[],
  allSegments: Segment[],
  allSnags: Snag[],
): AssetAppearance[] {
  const segDay = new Map(allSegments.map(s => [s.id, dayOf(s.createdAt)]));
  const key = assetKey(target);
  const byAsset = new Map<string, Snag[]>();
  for (const s of allSnags) if (s.assetId) byAsset.set(s.assetId, [...(byAsset.get(s.assetId) ?? []), s]);
  return allAssets
    .filter(a => assetKey(a) === key && segDay.has(a.segmentId))
    .map(a => {
      const snags = byAsset.get(a.id) ?? [];
      return {
        asset: a,
        day: segDay.get(a.segmentId)!,
        open: snags.filter(s => s.status !== 'closed').length,
        closed: snags.filter(s => s.status === 'closed').length,
      };
    })
    .sort((x, y) => x.day - y.day || x.asset.createdAt - y.asset.createdAt);
}

export interface CompareVerdict {
  closedSincePrev: number;  // snags on the PREVIOUS instance closed since then
  newOnLatest: number;      // open snags raised on the latest instance
  oldestOpenDays: number | null; // the longest-open snag across all appearances
}

export function compareVerdict(history: AssetAppearance[], allSnags: Snag[]): CompareVerdict {
  const prev = history[history.length - 2];
  const latest = history[history.length - 1];
  const on = (id: string) => allSnags.filter(s => s.assetId === id);
  const openAll = history.flatMap(h => on(h.asset.id)).filter(s => s.status !== 'closed');
  const oldest = openAll.length ? Math.min(...openAll.map(s => s.raisedAt)) : null;
  return {
    closedSincePrev: prev ? on(prev.asset.id).filter(s => s.status === 'closed').length : 0,
    newOnLatest: latest ? on(latest.asset.id).filter(s => s.status !== 'closed').length : 0,
    oldestOpenDays: oldest ? Math.floor((Date.now() - oldest) / 86_400_000) : null,
  };
}
