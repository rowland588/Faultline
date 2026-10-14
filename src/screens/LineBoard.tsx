/* The Line Board — the default view. One overarching Pareto of the whole line by
 * ASSET (which machine bleeds most: time + frequency + £), then a sharp, compact
 * Pareto for every asset (its own losses), worst-first. Tap any bar to walk in.
 * The line and every machine's story on one screen — built for the daily huddle
 * and for presales. Drawn on Analyse; its drills stay on Analyse. */
import { LOSS } from '../charts/loss';
import { nav, withQuery, buildAnalyseHash } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { buildCompare, divergenceTags } from '../engine/compare';
import { ParetoChart, type CompareSlice } from '../charts/ParetoChart';
import { EmptyState } from '../ui/EmptyState';
import { fmtDuration, fmtDurationWords, plural } from '../lib/format';
import { hasLabour, labourPerMs, fmtGBP } from '../lib/cost';
import { lostParts, lostWords, packsHow } from '../lib/lineLoss';
import { useLineNeck } from '../lib/useLineNeck';
import type { Observation, DimensionKey } from '../types';
import { Icon } from '../ui/Icon';
import { ShiftLossLine } from '../ui/ShiftLosses';

// 'shift' rides at the end of every order: the drill only offers a cut when it
// actually splits the rows, so workspaces without shift data never see it.
const ASSET_ORDER: DimensionKey[] = ['asset', 'category', 'subcategory', 'shift'];

function toSlices(rows: Observation[], dimension: DimensionKey, costable: boolean, factor: number): CompareSlice[] {
  const byId = new Map(rows.map(o => [o.id, o]));
  const cr = buildCompare(rows, dimension, 'time');
  const tags = divergenceTags(cr);
  return cr.map(r => ({
    key: r.key,
    timeShare: r.timeShare,
    freqShare: r.countShare,
    cumShare: r.cumShare,
    timeLabel: fmtDurationWords(r.timeMs),
    costLabel: costable ? fmtGBP(r.timeMs * factor) : undefined,
    freqLabel: `${r.count}×`,
    isVitalFew: r.isVitalFew,
    media: r.observationIds.reduce((a, id) => a + (byId.get(id)?.media.length ?? 0), 0),
    tag: tags[r.key],
  }));
}

/* There was a `present` switch here for a full-screen Present view. No screen
   ever passed it, and had one done so its drills would have opened /present
   with the drill dropped — removed 3 Oct 2026 (docs/HUNT.md). */
export function LineBoard({ since = 0, periodKey }: { since?: number; periodKey?: string }) {
  const { workspace, observations } = useWorkspace();
  // the period lens: the board ranks what happened INSIDE the window
  const live = observations.filter(o => o.deletedAt == null && o.startedAt >= since);
  const costable = hasLabour(workspace);
  const factor = labourPerMs(workspace);
  /* the line's bottleneck — a machine's packs are counted only when its stops stopped the line (lib/lineLoss) */
  const neck = useLineNeck(workspace.id);
  const screen = 'analyse';

  /* A SHIFT'S LOSSES, BESIDE THE PARETO (tool 7): how much of the latest
     shift's loss these stops explain, and the door to count one. */
  const shift = <ShiftLossLine workspaceId={workspace.id} canEdit />;
  if (live.length === 0) {
    const anyEver = observations.some(o => o.deletedAt == null);
    return <>{shift}{anyEver && since > 0 ? (
      <EmptyState title="A quiet window" icon={<Icon name="list" size="1em" />}>
        Nothing logged in this period. Widen the period above — or better, get to the line and log what you see.
      </EmptyState>
    ) : (
      <EmptyState title="Nothing logged yet" icon={<Icon name="list" size="1em" />}>
        Head to Capture and log what you see on the line — the board builds itself.
      </EmptyState>
    )}</>;
  }

  const assetSlices = toSlices(live, 'asset', costable, factor);
  /* what the window's lost time cost, in its two parts (lib/lineLoss) */
  const lostAll = lostParts(live, workspace, neck);

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
    nav(buildAnalyseHash(workspace.id, screen, 'time', [{ dimension: 'asset', value: asset }], ASSET_ORDER, periodKey));
  const goAssetCat = (asset: string, cat: string) =>
    nav(buildAnalyseHash(workspace.id, screen, 'time', [{ dimension: 'asset', value: asset }, { dimension: 'category', value: cat }], ASSET_ORDER, periodKey));

  const totalMs = live.reduce((a, o) => a + o.durationMs, 0);
  const multi = assets.length > 1; // one asset → the overarching by-asset chart is a lone 100% bar; skip it

  return (
    <>
      {multi && (
        <>
          <div className="chart-caption">
            Loss by <b>machine</b> — worst first<span className="chart-hint"> · tap a bar to walk into it</span>
          </div>
          <div className="chart-card" data-tour="line-chart">
            <ParetoChart slices={assetSlices} color={LOSS} rankLabel="cumulative time" onDrill={goAsset} canDrill />
          </div>
        </>
      )}
      {shift}
      <div className="analyse-meta">
        {plural(live.length, 'observation')} · {fmtDurationWords(totalMs)}{lostWords(lostAll) ? ` · ${lostWords(lostAll)}` : ''}
      </div>
      {packsHow(lostAll, neck) && <div className="analyse-meta sub">{packsHow(lostAll, neck)}</div>}

      {!costable && (
        <button className="cost-hint" onClick={() => withQuery('setup', '1')}>
          <Icon name="pound" size="1.15em" /> Put a £ on this lost time — add crew &amp; labour rate ›
        </button>
      )}

      <p className="eyebrow board-sec">{multi ? 'Each machine, up close' : 'This line, up close'}</p>
      <div className="asset-grid">
        {assets.map(a => (
          <div className="asset-card" key={a.name}>
            <button className="asset-card-head" onClick={() => goAsset(a.name)}>
              <span className="asset-card-name">{a.name}</span>
              <span className="asset-card-total">{fmtDuration(a.ms)}{lostWords(lostParts(a.rows, workspace, neck)) ? ` · ${lostWords(lostParts(a.rows, workspace, neck))}` : ''} ›</span>
            </button>
            <ParetoChart slices={toSlices(a.rows, 'category', costable, factor)} color={LOSS} rankLabel="cumulative time" onDrill={key => goAssetCat(a.name, key)} canDrill compact={multi} />
          </div>
        ))}
      </div>

      {/* No door to the meeting here: it is a tab in the row above. */}
    </>
  );
}
