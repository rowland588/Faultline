/* Present — the same analysis, calm and full-screen for the senior team. The big
 * two-measure Pareto (time + £ beside frequency), the one insight, the proof as
 * hero. Still live: drill in front of the room; exit lands back in Analyse. */
import { useEffect, useMemo, useState } from 'react';
import type { Route } from '../state/useRoute';
import { nav, readWorkstreamView, buildAnalyseHash } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { listSnagAssets, snagsForWorkspace } from '../db';
import { drillNode, pushDrill } from '../engine/drill';
import { buildCompare, divergenceTags } from '../engine/compare';
import type { Measure } from '../types';
import { ParetoChart, type CompareSlice } from '../charts/ParetoChart';
import { LineBoard } from './LineBoard';
import { DrillBreadcrumb } from '../charts/DrillBreadcrumb';
import { DisagreementBanner } from '../charts/DisagreementBanner';
import { EvidenceStrip } from '../charts/EvidenceStrip';
import { fmtDuration, fmtDurationWords, plural } from '../lib/format';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';

export function PresentScreen({ route }: { route: Route }) {
  const { workspace, observations } = useWorkspace();
  const view = readWorkstreamView(route, workspace.id);
  const node = useMemo(() => (view ? drillNode(observations, view) : null), [view, observations]);
  const [snag, setSnag] = useState<{ assets: number; snags: number } | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([listSnagAssets(workspace.id), snagsForWorkspace(workspace.id)])
      .then(([a, s]) => { if (alive) setSnag({ assets: a.length, snags: s.length }); });
    return () => { alive = false; };
  }, [workspace.id]);

  if (!view) {
    // A snag walk (assets/snags but no time-study observations) presents itself —
    // the video walkthrough and the snag report — not the empty loss board.
    const isSnagWalk = observations.length === 0 && !!snag && (snag.assets > 0 || snag.snags > 0);
    return (
      <div className="present">
        <button className="present-exit" onClick={() => nav(`/w/${workspace.id}/${isSnagWalk ? 'snags' : 'analyse'}`)} aria-label="Exit present">✕</button>
        <div className="present-body">
          <div className="present-head">
            <span className="present-ws"><span className="ws-dot" style={{ background: workspace.color }} />{workspace.name}</span>
            <h1 className="present-q">{isSnagWalk ? 'Present the snag walk' : "The line — where we're losing time"}</h1>
          </div>
          {isSnagWalk ? (
            <div className="present-snag">
              <p className="present-snag-sub">{plural(snag!.snags, 'snag')} across {plural(snag!.assets, 'asset')}. Show the walk to the team, or open the report to print / save as PDF.</p>
              <div className="present-snag-actions">
                <button className="btn btn-primary btn-lg" onClick={() => nav(`/w/${workspace.id}/walk`)}>▶ Walkthrough</button>
                <button className="btn btn-lg" onClick={() => nav(`/w/${workspace.id}/snaglist`)}>Snag report →</button>
              </div>
            </div>
          ) : (
            <LineBoard present />
          )}
        </div>
      </div>
    );
  }
  if (!node) return null; // unreachable when view is set; keeps types honest without navigating in render

  const goPresent = (m: Measure, path = view.path) => nav(buildAnalyseHash(workspace.id, 'present', m, path, view.dimensionOrder));
  const drill = (key: string) => { if (node.dimension) goPresent(view.measure, pushDrill(view, key, node.dimension).path); };
  const jump = (depth: number) => { if (depth === 0) nav(`/w/${workspace.id}/present`); else goPresent(view.measure, view.path.slice(0, depth)); };
  const leafName = view.path[view.path.length - 1]?.value;
  const exit = () => nav(buildAnalyseHash(workspace.id, 'analyse', view.measure, view.path, view.dimensionOrder));

  const rankByFreq = view.measure === 'count';
  const totalMs = node.rows.reduce((a, o) => a + o.durationMs, 0);
  const costable = hasCost(workspace);
  const factor = costPerMs(workspace);
  const hasChart = !!node.dimension && node.rows.length > 0;

  // The headline the room came for: the money and the hours, huge, with the
  // period they cover — before anyone has to read a chart.
  const spanDays = node.rows.length
    ? Math.max(1, Math.round((Math.max(...node.rows.map(o => o.startedAt)) - Math.min(...node.rows.map(o => o.startedAt))) / 86_400_000))
    : 0;
  const spanLabel = spanDays >= 14 ? `over ${Math.round(spanDays / 7)} weeks` : spanDays > 1 ? `over ${spanDays} days` : '';
  const bigHours = totalMs >= 36_000_000 ? `${Math.round(totalMs / 3_600_000)} h` : fmtDurationWords(totalMs);

  const byId = new Map(node.rows.map(o => [o.id, o]));
  const compareRows = !hasChart || !node.dimension ? [] : buildCompare(node.rows, node.dimension, rankByFreq ? 'count' : 'time');
  const tags = divergenceTags(compareRows);
  const slices: CompareSlice[] = compareRows.map(r => ({
    key: r.key,
    timeShare: r.timeShare,
    freqShare: r.countShare,
    cumShare: r.cumShare,
    // words, not a stopwatch: "32h 33m" reads across a boardroom, "32:32:42" doesn't
    timeLabel: fmtDurationWords(r.timeMs) || fmtDuration(r.timeMs),
    costLabel: costable ? fmtGBP(r.timeMs * factor) : undefined,
    freqLabel: `${r.count}×`,
    isVitalFew: r.isVitalFew,
    media: r.observationIds.reduce((a, id) => a + (byId.get(id)?.media.length ?? 0), 0),
    tag: tags[r.key],
  }));

  return (
    <div className="present">
      <button className="present-exit" onClick={exit} aria-label="Exit present">✕</button>

      <div className="present-body">
        <div className="present-head">
          <span className="present-ws"><span className="ws-dot" style={{ background: workspace.color }} />{workspace.name}</span>
          <h1 className="present-q">
            {node.dimension ? <>Where the line is losing time{leafName ? <> — {leafName}</> : null}</> : (leafName ?? 'Detail')}
          </h1>
          <DrillBreadcrumb path={view.path} onJump={jump} />
        </div>

        {node.rows.length > 0 && (
          <div className="present-stats">
            <div className="pstat">
              <b>{bigHours}</b>
              <span>lost {spanLabel || 'in this view'}</span>
            </div>
            {costable && totalMs > 0 && (
              <div className="pstat">
                <b>{fmtGBP(totalMs * factor)}</b>
                <span>cost of that time</span>
              </div>
            )}
            <div className="pstat">
              <b>{node.rows.length}</b>
              <span>observations{spanLabel ? ` ${spanLabel}` : ''}</span>
            </div>
          </div>
        )}

        <DisagreementBanner d={node.disagreement} />

        {hasChart ? (
          <div className="present-chart">
            <ParetoChart
              slices={slices}
              color={workspace.color}
              rankLabel={rankByFreq ? 'cumulative freq' : 'cumulative time'}
              onDrill={drill}
              canDrill
            />
          </div>
        ) : node.rows.length === 0 ? (
          <div className="leaf present-leaf">
            <div className="leaf-num">Nothing here</div>
            <p className="sub" style={{ marginTop: 6 }}>These filters match no observations — step back with the breadcrumb.</p>
          </div>
        ) : (
          <div className="leaf present-leaf">
            <div className="leaf-num">{plural(node.rows.length, 'observation')}</div>
            {totalMs > 0 && <div className="leaf-sub">{fmtDurationWords(totalMs)}{costable ? ` · ${fmtGBP(totalMs * factor)}` : ''} in total</div>}
            <p className="sub" style={{ marginTop: 6 }}>The bottom of the drill — this is the specific problem. Proof below.</p>
          </div>
        )}

        <EvidenceStrip media={node.media} />

        {hasChart && <p className="present-hint">Tap a bar to drill in front of the room · ✕ returns to Analyse</p>}
      </div>
    </div>
  );
}
