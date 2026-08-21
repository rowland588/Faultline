/* THE LINE — the workspace shown as the place it is. One machine fills the
 * screen (its latest still, pins glowing); swipe left and you step to the next
 * machine in LINE ORDER — the workspace's asset list, the order the machines
 * stand on the floor (Settings ‹ › sets it). Footage decorates the spine, the
 * spine never depends on the footage: a machine never marked on a walk still
 * appears, as a grey gap that asks to be filmed.
 *
 * The three-jobs rule that keeps the camera world legible:
 *   the hub files walks · THE LINE is where you stand and look · the asset
 *   page is the workbench. So this screen is READ-ONLY: tap the machine and
 *   you land on its asset page to zoom, pin, and close; Back returns here. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { listSnagAssets, snagsForWorkspace } from '../db';
import { useSyncedAt } from '../cloud/session';
import { useBlobUrl } from './useBlobUrl';
import { fmtRelative } from '../lib/format';
import { SNAG_STATUS_META, type Snag, type SnagAsset } from './types';

const STALE_MS = 7 * 24 * 3600_000; // an old photo is a claim about the past

interface Stop {
  name: string;
  asset?: SnagAsset;   // the latest marked still carrying this name
  pins: Snag[];        // pinned snags on that still (all states — colour tells)
  open: number;
}

function MachineSlide({ stop, wsId }: { stop: Stop; wsId: string }) {
  const still = useBlobUrl(stop.asset?.stillKey);
  const stale = !!stop.asset && Date.now() - stop.asset.createdAt > STALE_MS;
  if (!stop.asset) {
    return (
      <div className="line-slide">
        <div className="line-frame line-gap">
          <span className="line-gap-ic" aria-hidden>▦</span>
          <b>{stop.name}</b>
          <span className="sub">Not filmed yet — mark it on your next walk</span>
        </div>
      </div>
    );
  }
  return (
    <div className="line-slide">
      <button className="line-frame" onClick={() => nav(`/w/${wsId}/asset/${stop.asset!.id}`)}
        aria-label={`${stop.name} — open its page to zoom and pin`}>
        {still && <img className="line-still" src={still} alt={stop.name} />}
        {/* read-only pins — the workbench for them is one tap away */}
        {stop.pins.map((s, i) => (s.xPct != null && s.yPct != null) && (
          <span key={s.id} className="line-pin" style={{ left: `${s.xPct}%`, top: `${s.yPct}%`, background: SNAG_STATUS_META[s.status].color }}>{i + 1}</span>
        ))}
        <span className="line-name-tag">
          <b>{stop.name}</b>
          <span className={'line-stamp' + (stale ? ' stale' : '')}>
            filmed {fmtRelative(stop.asset.createdAt)}{stop.open > 0 ? ` · ${stop.open} open` : ' · clear'}
          </span>
        </span>
      </button>
    </div>
  );
}

export function LineScreen({ wsId }: { wsId: string }) {
  const { workspace } = useWorkspace();
  const [assets, setAssets] = useState<SnagAsset[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const syncedAt = useSyncedAt();
  useEffect(() => {
    void listSnagAssets(wsId).then(setAssets);
    void snagsForWorkspace(wsId).then(setSnags);
  }, [wsId, syncedAt]);

  // The spine: the workspace's machines, in line order. Footage joins by name
  // (marking picks from the same list, so the join holds by construction).
  const stops: Stop[] = useMemo(() => {
    const latestByName = new Map<string, SnagAsset>();
    for (const a of assets) {
      const cur = latestByName.get(a.name);
      if (!cur || a.createdAt > cur.createdAt) latestByName.set(a.name, a);
    }
    const named = workspace.assets.map(name => {
      const asset = latestByName.get(name);
      const pins = asset ? snags.filter(s => s.assetId === asset.id).sort((a, b) => a.raisedAt - b.raisedAt) : [];
      return { name, asset, pins, open: pins.filter(s => s.status !== 'closed').length };
    });
    // machines marked on walks but missing from the list (older data) still show, at the end
    const extras = [...latestByName.keys()].filter(n => !workspace.assets.includes(n)).map(name => {
      const asset = latestByName.get(name)!;
      const pins = snags.filter(s => s.assetId === asset.id).sort((a, b) => a.raisedAt - b.raisedAt);
      return { name, asset, pins, open: pins.filter(s => s.status !== 'closed').length };
    });
    return [...named, ...extras];
  }, [workspace.assets, assets, snags]);

  const strip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const onScroll = () => {
    const el = strip.current;
    if (el) setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const jump = (i: number) => {
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  if (stops.length === 0) {
    return (
      <div className="wrap">
        <div className="subhead">
          <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snags`)}>‹ Snags</button>
        </div>
        <p className="sub" style={{ marginTop: 16 }}>No machines yet — add them in Settings, or film a walk and mark them.</p>
      </div>
    );
  }

  return (
    <div className="wrap line-wrap">
      <div className="subhead">
        <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snags`)}>‹ Snags</button>
        <span className="subhead-title">The line</span>
        <div style={{ flex: 1 }} />
        <span className="sub line-count">{at + 1} / {stops.length}</span>
      </div>

      <div className="line-strip" ref={strip} onScroll={onScroll}>
        {stops.map(s => <MachineSlide key={s.name} stop={s} wsId={wsId} />)}
      </div>

      {/* the rail: the whole line at a glance — a dot per machine, ringed red
          while it carries open snags. The map, not a menu (calm rule). */}
      <div className="line-rail" role="tablist" aria-label="Machines on the line">
        {stops.map((s, i) => (
          <button key={s.name} role="tab" aria-selected={i === at} title={s.name}
            className={'line-dot' + (i === at ? ' on' : '') + (s.open > 0 ? ' hot' : '') + (!s.asset ? ' gap' : '')}
            onClick={() => jump(i)} />
        ))}
      </div>
      <p className="sub line-hint">Swipe along the line · tap the machine to zoom &amp; pin</p>
    </div>
  );
}
