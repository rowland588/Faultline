/* The Line Board — the default view. One overarching Pareto of the whole line by
 * ASSET (which machine bleeds most: time + frequency + £), then a sharp, compact
 * Pareto for every asset (its own losses), worst-first. Tap any bar to walk in.
 * The line and every machine's story on one screen — built for the daily huddle
 * and for presales. Reused in Present (calm, full-screen). */
import { nav, buildAnalyseHash } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { buildCompare, divergenceTags } from '../engine/compare';
import { ParetoChart, type CompareSlice } from '../charts/ParetoChart';
import { EmptyState } from '../ui/EmptyState';
import { fmtDuration, fmtDurationWords, plural } from '../lib/format';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';
import type { Observation, DimensionKey } from '../types';

const ASSET_ORDER: DimensionKey[] = ['asset', 'category', 'subcategory'];
const WHAT_ORDER: DimensionKey[] = ['category', 'subcategory', 'asset'];

function toSlices(rows: Observation[], dimension: DimensionKey, costable: boolean, factor: number): CompareSlice[] {
  const byId = new Map(rows.map(o => [o.id, o]));
  const cr = buildCompare(rows, dimension, 'time');
  const tags = divergenceTags(cr);
  return cr.map(r => ({
    key: r.key,
    timeShare: r.timeShare,
    freqShare: r.countShare,
    cumShare: r.cumShare,
    timeLabel: fmtDuration(r.timeMs),
    costLabel: costable ? fmtGBP(r.timeMs * factor) : undefined,
    freqLabel: `${r.count}×`,
    isVitalFew: r.isVitalFew,
    media: r.observationIds.reduce((a, id) => a + (byId.get(id)?.media.length ?? 0), 0),
    tag: tags[r.key],
  }));
}

export function LineBoard({ present = false }: { present?: boolean }) {
  const { workspace, observations } = useWorkspace();
  const live = observations.filter(o => o.deletedAt == null);
  const costable = hasCost(workspace);
  const factor = costPerMs(workspace);
  const screen = present ? 'present' : 'analyse';

  if (live.length === 0) {
    return (
      <EmptyState title="Nothing logged yet" icon="▤">
        Head to Capture and log what you see on the line — the board builds itself.
      </EmptyState>
    );
  }

  const assetSlices = toSlices(live, 'asset', costable, factor);

  // one card per asset, worst (most time) first
  const byAsset = new Map<string, Observation[]>();
  for (const o of live) {
    const k = o.asset || '(unassigned)';
    const arr = byAsset.get(k);
    if (arr) arr.push(o); else byAsset.set(k, [o]);
  }
  const assets = [...byAsset.entries()]
    .map(([name, rows]) => ({ name, rows, ms: rows.reduce((a, o) => a + o.durationMs, 0) }))
    .sort((a, b) => b.ms - a.ms);

  const goAsset = (asset: string) =>
    nav(buildAnalyseHash(workspace.id, screen, 'time', [{ dimension: 'asset', value: asset }], ASSET_ORDER));
  const goAssetCat = (asset: string, cat: string) =>
    nav(buildAnalyseHash(workspace.id, screen, 'time', [{ dimension: 'asset', value: asset }, { dimension: 'category', value: cat }], ASSET_ORDER));

  const totalMs = live.reduce((a, o) => a + o.durationMs, 0);
  const multi = assets.length > 1; // one asset → the overarching by-asset chart is a lone 100% bar; skip it

  return (
    <>
      {multi && (
        <>
          <div className="chart-caption">
            Loss by <b>asset</b> — time lost <i>and</i> how often<span className="chart-hint"> · tap a bar to walk into it</span>
          </div>
          <div className="chart-card">
            <ParetoChart slices={assetSlices} color={workspace.color} rankLabel="cumulative time" onDrill={goAsset} canDrill />
          </div>
        </>
      )}
      <div className="analyse-meta">
        {plural(live.length, 'observation')} · {fmtDurationWords(totalMs)}{costable ? ` · ${fmtGBP(totalMs * factor)}` : ''}
      </div>

      {!costable && !present && (
        <button className="cost-hint" onClick={() => nav(`/w/${workspace.id}/settings`)}>
          💷 Put a £ on this lost time — add crew &amp; labour rate ›
        </button>
      )}

      <p className="eyebrow board-sec">{multi ? 'Each asset, up close' : 'This line, up close'}</p>
      <div className="asset-grid">
        {assets.map(a => (
          <div className="asset-card" key={a.name}>
            <button className="asset-card-head" onClick={() => goAsset(a.name)}>
              <span className="asset-card-name">{a.name}</span>
              <span className="asset-card-total">{fmtDuration(a.ms)}{costable ? ` · ${fmtGBP(a.ms * factor)}` : ''} ›</span>
            </button>
            <ParetoChart slices={toSlices(a.rows, 'category', costable, factor)} color={workspace.color} rankLabel="cumulative time" onDrill={key => goAssetCat(a.name, key)} canDrill compact={multi} />
          </div>
        ))}
      </div>

      {!present && (
        <>
          <p className="eyebrow board-sec">Or ask another way</p>
          <div className="q-list">
            <button className="q-card" onClick={() => nav(buildAnalyseHash(workspace.id, 'analyse', 'count', [], WHAT_ORDER))}>
              <span className="q-dot" style={{ background: workspace.color }} />
              <span className="q-main"><span className="q-label">What's going wrong most often?</span><span className="q-sub">Across the whole line, by frequency</span></span>
              <span className="q-go">›</span>
            </button>
            <button className="q-card" onClick={() => nav(buildAnalyseHash(workspace.id, 'analyse', 'time', [], WHAT_ORDER))}>
              <span className="q-dot" style={{ background: workspace.color }} />
              <span className="q-main"><span className="q-label">Which problem costs the most time?</span><span className="q-sub">Across the whole line, by lost time</span></span>
              <span className="q-go">›</span>
            </button>
          </div>
          <button className="btn btn-primary present-cta" onClick={() => nav(`/w/${workspace.id}/present`)}>
            Present the board ›
          </button>
        </>
      )}
    </>
  );
}
