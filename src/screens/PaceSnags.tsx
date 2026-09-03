/* THE SNAG LIST on the project page.
 *
 * Capture and playback are NOT reimplemented here. Faultline already has a
 * video walk — film the line, scrub the footage, freeze a frame as an asset,
 * pin faults on that still with photos and a lifecycle — and it syncs. This
 * screen points that machinery at Project Pace's own workspace and shows what
 * is in it, so the meeting can go: here is the line, here is what is wrong,
 * here is the pin, here is the video.
 *
 * The walk-through is the one to open in front of people: full screen, the
 * footage and the pinned stills, nothing else on the page. */
import { useCallback, useEffect, useState } from 'react';
import { nav } from '../state/useRoute';
import { listSegments, listSnagAssets, snagsForWorkspace } from '../db';
import { usePaceWorkspace } from '../lib/usePaceWorkspace';
import { useBlobUrl } from '../snag/useBlobUrl';
import type { Segment, SnagAsset, Snag } from '../snag/types';

const OPEN = (s: Snag) => s.status !== 'closed';
const fmtDur = (s?: number) => (!s || s <= 0 ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

function SegmentCard({ seg, assets, snags, onOpen }: {
  seg: Segment; assets: SnagAsset[]; snags: Snag[]; onOpen: () => void;
}) {
  const poster = useBlobUrl(seg.posterKey);
  const ids = new Set(assets.map(a => a.id));
  const mine = snags.filter(s => s.assetId && ids.has(s.assetId));
  const open = mine.filter(OPEN).length;
  return (
    <button className="ps-seg" onClick={onOpen}>
      <span className="ps-seg-poster">{poster ? <img src={poster} alt="" /> : <span aria-hidden>▶</span>}</span>
      <span className="ps-seg-main">
        <span className="ps-seg-name">{seg.name || `Walk ${seg.sequence}`}</span>
        <span className="ps-seg-meta">
          {fmtDur(seg.durationS)} · {assets.length} asset{assets.length === 1 ? '' : 's'}
          {mine.length > 0 && <> · {open} open of {mine.length}</>}
        </span>
      </span>
      <span className="ps-seg-go" aria-hidden>›</span>
    </button>
  );
}

function PinnedSnag({ snag, asset, onOpen }: { snag: Snag; asset?: SnagAsset; onOpen: () => void }) {
  const still = useBlobUrl(asset?.stillKey);
  const tone = snag.status === 'closed' ? 'done' : snag.status === 'in_progress' ? 'prog' : 'open';
  return (
    <button className={'ps-snag is-' + tone} onClick={onOpen}>
      <span className="ps-snag-still">
        {still ? <img src={still} alt="" /> : <span aria-hidden>▦</span>}
        {/* the pin, in percentages, so it stays put at any size */}
        {snag.xPct != null && snag.yPct != null && (
          <span className="ps-pin" style={{ left: `${snag.xPct}%`, top: `${snag.yPct}%` }} aria-hidden />
        )}
      </span>
      <span className="ps-snag-body">
        <span className="ps-snag-problem">{snag.problem}</span>
        <span className="ps-snag-meta">
          {asset && <span className="ps-snag-asset">{asset.name}</span>}
          {snag.owner && <span>{snag.owner}</span>}
          <span className={'ps-snag-status is-' + tone}>
            {snag.status === 'in_progress' ? 'In progress' : snag.status === 'closed' ? 'Closed' : 'Open'}
          </span>
        </span>
      </span>
    </button>
  );
}

export function PaceSnags() {
  const { wsId, loading, ensure } = usePaceWorkspace();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [assets, setAssets] = useState<SnagAsset[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const [sg, as, sn] = await Promise.all([listSegments(id), listSnagAssets(id), snagsForWorkspace(id)]);
    setSegments(sg); setAssets(as); setSnags(sn);
  }, []);

  useEffect(() => { if (wsId) void load(wsId); }, [wsId, load]);

  // The workspace is only created when a walk is actually started.
  const start = async () => {
    setBusy(true);
    try { nav(`/w/${await ensure()}/snags`); } finally { setBusy(false); }
  };

  if (loading) return <p className="sub">Loading the snag list…</p>;

  const pinned = snags.filter(s => s.assetId);
  const open = pinned.filter(OPEN);
  const assetById = new Map(assets.map(a => [a.id, a]));

  if (!wsId || segments.length === 0) {
    return (
      <div className="ps-empty">
        <p className="ps-empty-title">No walk filmed yet</p>
        <p className="ps-empty-sub">
          Film the line infeed to outfeed, mark the frames that matter, then pin what is wrong
          on the still — with a photo. In the meeting you play the footage and point at the pin.
        </p>
        <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => void start()}>
          {busy ? 'Setting up…' : 'Film a walk'}
        </button>
      </div>
    );
  }

  return (
    <div className="ps">
      <div className="ps-bar">
        <div className="ps-bar-stats">
          <b>{segments.length}</b> walk{segments.length === 1 ? '' : 's'} · <b>{assets.length}</b> asset{assets.length === 1 ? '' : 's'}
          {pinned.length > 0 && <> · <b className={open.length ? 'is-open' : ''}>{open.length}</b> open snag{open.length === 1 ? '' : 's'}</>}
        </div>
        <div className="ps-bar-actions">
          <button className="btn btn-primary" onClick={() => nav(`/w/${wsId}/walk`)}>▶ Show the walk</button>
          <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snags`)}>Film / edit</button>
          <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snaglist`)}>All snags</button>
        </div>
      </div>

      <div className="ps-segs">
        {segments.map(seg => (
          <SegmentCard
            key={seg.id} seg={seg}
            assets={assets.filter(a => a.segmentId === seg.id)} snags={snags}
            onOpen={() => nav(`/w/${wsId}/segment/${seg.id}`)}
          />
        ))}
      </div>

      {pinned.length > 0 && (
        <>
          <h3 className="ps-h">Pinned on the line</h3>
          <div className="ps-snags">
            {[...pinned]
              .sort((a, b) => (OPEN(b) ? 1 : 0) - (OPEN(a) ? 1 : 0) || b.raisedAt - a.raisedAt)
              .map(s => (
                <PinnedSnag
                  key={s.id} snag={s} asset={s.assetId ? assetById.get(s.assetId) : undefined}
                  onOpen={() => nav(`/w/${wsId}/asset/${s.assetId}`)}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
