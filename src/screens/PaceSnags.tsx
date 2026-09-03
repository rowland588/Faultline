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
import { Toast } from '../ui/Toast';
import { nav } from '../state/useRoute';
import { listSegments, listSnagAssets, snagsForWorkspace, deleteSegment, deleteSnag, deleteSnagAsset } from '../db';
import { usePaceWorkspace } from '../lib/usePaceWorkspace';
import { useBlobUrl } from '../snag/useBlobUrl';
import type { Segment, SnagAsset, Snag } from '../snag/types';

const OPEN = (s: Snag) => s.status !== 'closed';
const fmtDur = (s?: number) => (!s || s <= 0 ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

function SegmentCard({ seg, assets, snags, onOpen, onDelete }: {
  seg: Segment; assets: SnagAsset[]; snags: Snag[]; onOpen: () => void; onDelete: () => void;
}) {
  const poster = useBlobUrl(seg.posterKey);
  const ids = new Set(assets.map(a => a.id));
  const mine = snags.filter(s => s.assetId && ids.has(s.assetId));
  const open = mine.filter(OPEN).length;
  return (
    <div className="ps-seg">
      <button className="ps-seg-open" onClick={onOpen}>
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
      <button className="ps-del" onClick={onDelete} aria-label={`Delete ${seg.name || 'walk ' + seg.sequence}`}>Delete</button>
    </div>
  );
}

function PinnedSnag({ snag, asset, onOpen, onDelete }: { snag: Snag; asset?: SnagAsset; onOpen: () => void; onDelete: () => void }) {
  const still = useBlobUrl(asset?.stillKey);
  const tone = snag.status === 'closed' ? 'done' : snag.status === 'in_progress' ? 'prog' : 'open';
  return (
    <div className={'ps-snag is-' + tone}>
      <button className="ps-snag-open" onClick={onOpen}>
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
      <button className="ps-del" onClick={onDelete} aria-label="Delete this snag">Delete</button>
    </div>
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

  /* A walk is footage that cannot be re-filmed, so deleting one is deferred
   * rather than confirmed: it leaves the list at once and a toast offers Undo.
   *
   * NOTHING is destroyed until the window elapses — Undo simply stops the
   * timer, so there is no restore path to get wrong. The deliberate
   * consequence is that closing the tab mid-window leaves the walk intact.
   * For a video you cannot shoot again, "it came back" is the right way to
   * fail; "it silently went" is not. */
  const [pending, setPending] = useState<Segment | null>(null);

  const commitPending = useCallback(async () => {
    const seg = pending;
    setPending(null);
    if (!seg || !wsId) return;
    await deleteSegment(seg.id);
    await load(wsId);
  }, [pending, wsId, load]);

  const removeSegment = async (seg: Segment) => {
    if (!wsId) return;
    // a second delete while one is still pending commits the first
    if (pending && pending.id !== seg.id) { await deleteSegment(pending.id); }
    setPending(seg);
  };

  const undoRemove = useCallback(() => setPending(null), []);

  /** What the toast should say is going with it. */
  const pendingSummary = (seg: Segment) => {
    const mine = assets.filter(a => a.segmentId === seg.id);
    const ids = new Set(mine.map(a => a.id));
    const pins = snags.filter(sn => sn.assetId && ids.has(sn.assetId)).length;
    const bits = [
      mine.length ? `${mine.length} frame${mine.length === 1 ? '' : 's'}` : '',
      pins ? `${pins} snag${pins === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    return `Deleted “${seg.name || 'Walk ' + seg.sequence}”` + (bits.length ? ` and ${bits.join(', ')}` : '');
  };

  const removeSnag = async (sn: Snag) => {
    if (!wsId) return;
    if (!window.confirm(`Delete this snag?\n\n"${sn.problem}"\n\nThis cannot be undone.`)) return;
    await deleteSnag(sn.id);
    await load(wsId);
  };

  const removeAsset = async (a: SnagAsset) => {
    if (!wsId) return;
    const pins = snags.filter(sn => sn.assetId === a.id).length;
    const msg = `Delete the marked frame "${a.name}"?`
      + (pins ? `\n\nThis also deletes ${pins} snag${pins === 1 ? '' : 's'} pinned on it.` : '')
      + '\n\nThis cannot be undone.';
    if (!window.confirm(msg)) return;
    await deleteSnagAsset(a.id);
    await load(wsId);
  };

  // The workspace is only created when a walk is actually started.
  const start = async () => {
    setBusy(true);
    try { nav(`/w/${await ensure()}/snags`); } finally { setBusy(false); }
  };

  if (loading) return <p className="sub">Loading the snag list…</p>;

  // everything below reads the view WITHOUT the walk awaiting deletion, so the
  // counts always describe what is actually on screen
  const shownSegments = segments.filter(sg => sg.id !== pending?.id);
  const shownAssets = assets.filter(a => a.segmentId !== pending?.id);
  const shownAssetIds = new Set(shownAssets.map(a => a.id));
  const shownSnags = snags.filter(sn => !sn.assetId || shownAssetIds.has(sn.assetId));

  const pinned = shownSnags.filter(s => s.assetId);
  const open = pinned.filter(OPEN);
  const assetById = new Map(shownAssets.map(a => [a.id, a]));

  if (!wsId || shownSegments.length === 0) {
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
        {pending && (
          <Toast message={pendingSummary(pending)} onUndo={undoRemove} onDismiss={() => void commitPending()} />
        )}
      </div>
    );
  }

  return (
    <div className="ps">
      <div className="ps-bar">
        <div className="ps-bar-stats">
          <b>{shownSegments.length}</b> walk{shownSegments.length === 1 ? '' : 's'} · <b>{shownAssets.length}</b> asset{shownAssets.length === 1 ? '' : 's'}
          {pinned.length > 0 && <> · <b className={open.length ? 'is-open' : ''}>{open.length}</b> open snag{open.length === 1 ? '' : 's'}</>}
        </div>
        <div className="ps-bar-actions">
          <button className="btn btn-primary" onClick={() => nav(`/w/${wsId}/walk`)}>▶ Show the walk</button>
          <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snags`)}>Film / edit</button>
          <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snaglist`)}>All snags</button>
        </div>
      </div>

      <div className="ps-segs">
        {shownSegments.map(seg => (
          <SegmentCard
            key={seg.id} seg={seg}
            assets={shownAssets.filter(a => a.segmentId === seg.id)} snags={shownSnags}
            onOpen={() => nav(`/w/${wsId}/segment/${seg.id}`)}
            onDelete={() => void removeSegment(seg)}
          />
        ))}
      </div>

      {shownAssets.length > 0 && (
        <>
          <h3 className="ps-h">Marked frames</h3>
          <div className="ps-assets">
            {shownAssets.map(a => (
              <div key={a.id} className="ps-asset">
                <span className="ps-asset-name">{a.name}</span>
                <span className="ps-asset-meta">{(() => { const n = shownSnags.filter(sn => sn.assetId === a.id).length;
                  return n === 0 ? 'no snags' : `${n} snag${n === 1 ? '' : 's'}`; })()}</span>
                <button className="ps-del" onClick={() => void removeAsset(a)} aria-label={`Delete ${a.name}`}>Delete</button>
              </div>
            ))}
          </div>
        </>
      )}

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
                  onDelete={() => void removeSnag(s)}
                />
              ))}
          </div>
        </>
      )}

      {pending && (
        <Toast message={pendingSummary(pending)} onUndo={undoRemove} onDismiss={() => void commitPending()} />
      )}
    </div>
  );
}
