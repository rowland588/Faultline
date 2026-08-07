/* "This machine through time" — the same asset across every walk it appears
 * in. Two stills side by side (previous walk vs latest), each with its live
 * pins, a verdict strip, and the filmstrip of every appearance. Exists the
 * moment the same machine is marked in two walks — no setup. */
import { useEffect, useState } from 'react';
import { nav } from '../state/useRoute';
import { getSnagAsset, listSnagAssets, listSegments, snagsForWorkspace } from '../db';
import { useSyncedAt } from '../cloud/session';
import { useBlobUrl } from './useBlobUrl';
import PinImage, { type Pin } from './PinImage';
import { SNAG_STATUS_META, type Snag, type SnagAsset } from './types';
import { assetHistory, compareVerdict, type AssetAppearance } from './history';

const fmtDay = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function AssetHistoryScreen({ wsId, assetId }: { wsId: string; assetId: string }) {
  const [target, setTarget] = useState<SnagAsset | null>(null);
  const [history, setHistory] = useState<AssetAppearance[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [focus, setFocus] = useState<string | null>(null); // asset id shown on the RIGHT

  const syncedAt = useSyncedAt();
  useEffect(() => {
    void (async () => {
      const a = await getSnagAsset(assetId);
      if (!a) { nav(`/w/${wsId}/snags`); return; }
      const [assets, segments, sn] = await Promise.all([
        listSnagAssets(wsId), listSegments(wsId), snagsForWorkspace(wsId),
      ]);
      setTarget(a);
      setSnags(sn);
      setHistory(assetHistory(a, assets, segments, sn));
    })();
  }, [wsId, assetId, syncedAt]);

  if (!target) return null;
  const latest = history.find(h => h.asset.id === (focus ?? history[history.length - 1]?.asset.id)) ?? history[history.length - 1];
  const latestIdx = history.findIndex(h => h.asset.id === latest?.asset.id);
  const prev = latestIdx > 0 ? history[latestIdx - 1] : undefined;
  const verdict = compareVerdict(history, snags);

  return (
    <div className="wrap">
      <div className="subhead">
        <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/asset/${assetId}`)}>‹ Asset</button>
      </div>
      <div className="mark" style={{ fontSize: 22 }}>{target.name}{target.code ? <span className="sub" style={{ fontSize: 15, fontWeight: 400 }}> · {target.code}</span> : null}</div>
      <p className="sub" style={{ marginTop: 4 }}>
        {history.length > 1
          ? `The same machine across ${history.length} walks.`
          : 'Marked in one walk so far — film the line again and mark it to see then vs now.'}
      </p>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="hist-stills">
          {prev && <HistoryStill appearance={prev} snags={snags} />}
          {latest && <HistoryStill appearance={latest} snags={snags} highlight />}
        </div>
        {history.length > 1 && (
          <div className="hist-verdict">
            {verdict.closedSincePrev > 0 && <span className="chipv good">✓ {verdict.closedSincePrev} closed since {prev ? fmtDay(prev.day) : 'last walk'}</span>}
            {verdict.newOnLatest > 0 && <span className="chipv bad">{verdict.newOnLatest} open now</span>}
            {verdict.oldestOpenDays != null && verdict.oldestOpenDays > 30 && <span className="chipv warn">⚠ open {verdict.oldestOpenDays} days</span>}
          </div>
        )}
      </div>

      {history.length > 1 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="field-label">Every walk it appears in</div>
          <p className="sub" style={{ margin: '2px 0 8px' }}>Tap a frame to compare it. Dot = open snags on that day's marking.</p>
          <div className="hist-filmstrip">
            {history.map(h => (
              <FilmFrame key={h.asset.id} appearance={h} active={h.asset.id === latest?.asset.id} onTap={() => setFocus(h.asset.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryStill({ appearance, snags, highlight }: { appearance: AssetAppearance; snags: Snag[]; highlight?: boolean }) {
  const url = useBlobUrl(appearance.asset.stillKey);
  const mine = snags.filter(s => s.assetId === appearance.asset.id);
  const pins: Pin[] = mine.map((s, i) => ({ id: s.id, xPct: s.xPct, yPct: s.yPct, color: SNAG_STATUS_META[s.status].color, label: s.problem, n: i + 1 }));
  return (
    <div className={'hist-still' + (highlight ? ' hl' : '')}>
      <span className="hist-tag">{fmtDay(appearance.day)}</span>
      <PinImage src={url} pins={pins} readOnly alt={appearance.asset.name} />
    </div>
  );
}

function FilmFrame({ appearance, active, onTap }: { appearance: AssetAppearance; active: boolean; onTap: () => void }) {
  const url = useBlobUrl(appearance.asset.stillKey);
  return (
    <button className={'hist-frame' + (active ? ' on' : '')} onClick={onTap}>
      {url ? <img src={url} alt="" /> : <span className="hist-frame-ph">▶</span>}
      <small>{fmtDay(appearance.day)}</small>
      {appearance.open > 0 && <span className="hist-dot" />}
    </button>
  );
}
