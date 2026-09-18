/* THE LINE WALK, SEEN FROM THE COMMISSIONING LIST.
 *
 * The evidence system is not a second app bolted on here — it is the same walk,
 * the same snags, the same workspace the Evidence tab shows. This only reads it
 * into the shape the commissioning screen needs: every snag on the project's
 * walk, each already carrying the still it was pinned on, so an item can be
 * linked to the picture that proves it.
 *
 * Read, never written. A snag's lifecycle belongs to the walk; linking it to an
 * item must not become a second place that can close it.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  getPaceWorkspaceId, snagsForWorkspace, listSnagAssets, onDataChange,
} from '../db';
import type { Snag, SnagAsset } from '../snag/types';

export interface WalkSnag {
  snag: Snag;
  /** The frame it was pinned on, when it was pinned on one. A snag raised from
   *  the board rather than the film has no still, and that is not a fault. */
  asset?: SnagAsset;
  /** Its own close-up beats the frame it sits on: the detail photo was taken
   *  BECAUSE the frame did not show enough. */
  stillKey?: string;
}

export interface CommissionEvidence {
  loading: boolean;
  /** Null until looked up; null after means the project has no walk yet. */
  workspaceId: string | null;
  snags: WalkSnag[];
  byId: Map<string, WalkSnag>;
}

export function useCommissionEvidence(projectId: string): CommissionEvidence {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [snags, setSnags] = useState<WalkSnag[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const ws = await getPaceWorkspaceId(projectId);
    setWorkspaceId(ws);
    if (!ws) { setSnags([]); setLoading(false); return; }
    const [list, assets] = await Promise.all([snagsForWorkspace(ws), listSnagAssets(ws)]);
    const byAsset = new Map(assets.map(a => [a.id, a]));
    setSnags(
      list
        .map(snag => {
          const asset = snag.assetId ? byAsset.get(snag.assetId) : undefined;
          return { snag, asset, stillKey: snag.detailPhotoKey ?? asset?.stillKey };
        })
        // Open first — the ones you are linking are nearly always the live ones
        .sort((a, b) =>
          (a.snag.status === 'closed' ? 1 : 0) - (b.snag.status === 'closed' ? 1 : 0)
          || b.snag.raisedAt - a.snag.raisedAt),
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  return {
    loading, workspaceId, snags,
    byId: new Map(snags.map(w => [w.snag.id, w])),
  };
}
