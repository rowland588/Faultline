import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { goBack } from '../state/useRoute';
import { listSegments, listSnagAssets, snagsForAsset } from '../db';
import { Sheet } from '../ui/Sheet';
import { useBlobUrl } from './useBlobUrl';
import PinImage, { type Pin } from './PinImage';
import { sectionLabel } from './labels';
import { SNAG_STATUS_META, type Segment, type SnagAsset, type Snag } from './types';

interface Flat { asset: SnagAsset; sequence: number; open: number }

export function WalkthroughScreen({ wsId }: { wsId: string }) {
  const { workspace } = useWorkspace();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [flat, setFlat] = useState<Flat[]>([]);
  const [snagsBy, setSnagsBy] = useState<Map<string, Snag[]>>(new Map());
  const [cur, setCur] = useState(0);
  const [t, setT] = useState(0);
  const [selected, setSelected] = useState<SnagAsset | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const curSeg = segments[cur];
  const videoUrl = useBlobUrl(curSeg?.videoKey);

  useEffect(() => {
    (async () => {
      const [segs, assets] = await Promise.all([listSegments(wsId), listSnagAssets(wsId)]);
      const seq = new Map(segs.map(s => [s.id, s.sequence]));
      const by = new Map<string, Snag[]>();
      await Promise.all(assets.map(async a => by.set(a.id, await snagsForAsset(a.id))));
      const fl: Flat[] = assets.map(a => ({ asset: a, sequence: seq.get(a.segmentId) ?? 0, open: (by.get(a.id) ?? []).filter(s => s.status !== 'closed').length }))
        .sort((x, y) => x.sequence - y.sequence || x.asset.timestampS - y.asset.timestampS);
      setSegments(segs); setFlat(fl); setSnagsBy(by);
    })();
  }, [wsId]);

  const inSeg = flat.filter(f => f.asset.segmentId === curSeg?.id);
  const nearest = inSeg.filter(f => f.asset.timestampS <= t + 0.25).slice(-1)[0] ?? inSeg[0];

  const onEnded = () => { if (cur < segments.length - 1) setCur(c => c + 1); };
  const onLoaded = () => { const v = videoRef.current; if (v && pendingSeek.current != null) { v.currentTime = pendingSeek.current; pendingSeek.current = null; } void v?.play().catch(() => {}); };
  const seekTo = (f: Flat) => { const i = segments.findIndex(s => s.id === f.asset.segmentId); if (i === cur) { if (videoRef.current) videoRef.current.currentTime = f.asset.timestampS; } else if (i >= 0) { pendingSeek.current = f.asset.timestampS; setCur(i); } };

  return (
    <div className="walk-stage">
      <div className="walk-stage-head">
        <button className="btn btn-ghost" onClick={() => goBack(`/w/${wsId}/snags`)}>‹ Exit</button>
        <span className="walk-stage-title">{workspace.name}{curSeg ? ` · ${sectionLabel(curSeg, inSeg.map(f => f.asset.name))}` : ''}</span>
      </div>
      <div className="walk-stage-body">
        <div className="walk-video-col">
          <div className="walk-video-frame">
            <video ref={videoRef} className="walk-video" src={videoUrl ?? undefined} playsInline controls autoPlay
              onEnded={onEnded} onLoadedMetadata={onLoaded} onTimeUpdate={e => setT((e.target as HTMLVideoElement).currentTime)} />
            {nearest && (
              <button className="walk-overlay" onClick={() => setSelected(nearest.asset)}>
                <span className="walk-overlay-name">{nearest.asset.name}</span>
                <span className={'walk-overlay-badge' + (nearest.open > 0 ? ' has' : '')}>{nearest.open} open</span>
              </button>
            )}
          </div>
          <div className="walk-segbar">
            {segments.map((s, i) => <button key={s.id} className={'walk-seg' + (i === cur ? ' on' : '')} onClick={() => { pendingSeek.current = 0; setCur(i); }}>{s.sequence}</button>)}
          </div>
        </div>
        <aside className="walk-rail">
          <div className="walk-rail-head">Assets · flow order</div>
          {flat.length === 0 ? <p className="sub" style={{ padding: '0 12px' }}>No assets marked yet.</p>
            : flat.map(f => (
              <button key={f.asset.id} className={'walk-rail-item' + (nearest?.asset.id === f.asset.id ? ' current' : '')} onClick={() => seekTo(f)}>
                <span className="wri-name">{f.asset.name}</span>
                <span className={'wri-badge' + (f.open > 0 ? ' has' : '')}>{f.open}</span>
              </button>
            ))}
        </aside>
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.name}${selected.code ? ' · ' + selected.code : ''}` : ''}>
        {selected && <ReadOnlyStill asset={selected} snags={snagsBy.get(selected.id) ?? []} />}
      </Sheet>
    </div>
  );
}

function ReadOnlyStill({ asset, snags }: { asset: SnagAsset; snags: Snag[] }) {
  const url = useBlobUrl(asset.stillKey);
  const pins: Pin[] = snags.map((s, i) => ({ id: s.id, xPct: s.xPct, yPct: s.yPct, color: SNAG_STATUS_META[s.status].color, label: s.problem, n: i + 1 }));
  return (
    <>
      <PinImage src={url} pins={pins} readOnly alt={asset.name} />
      <ol className="walk-panel-snags">
        {snags.length === 0 ? <p className="sub">No snags on this asset.</p>
          : snags.map(s => <li key={s.id}><span className="wps-dot" style={{ background: SNAG_STATUS_META[s.status].color }} /><b>{s.problem}</b>{s.proposedSolution ? ` — ${s.proposedSolution}` : ''} <span className="wps-status">[{SNAG_STATUS_META[s.status].label}]</span></li>)}
      </ol>
    </>
  );
}
