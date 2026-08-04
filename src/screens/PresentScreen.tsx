/* Present — the same analysis, calm and full-screen for the senior team. The big
 * two-measure Pareto (time + £ beside frequency), the one insight, the proof as
 * hero. Still live: drill in front of the room; exit lands back in Analyse. */
import { useMemo } from 'react';
import type { Route } from '../state/useRoute';
import { nav, navReplace, readWorkstreamView, buildAnalyseHash } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { drillNode, pushDrill } from '../engine/drill';
import { buildCompare, divergenceTags } from '../engine/compare';
import { DIM_LABEL } from '../engine/types';
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

  if (!view) {
    return (
      <div className="present">
        <button className="present-exit" onClick={() => nav(`/w/${workspace.id}/analyse`)} aria-label="Exit present">✕</button>
        <div className="present-body">
          <div className="present-head">
            <span className="present-ws"><span className="ws-dot" style={{ background: workspace.color }} />{workspace.name}</span>
            <h1 className="present-q">The line — where we're losing time</h1>
          </div>
          <LineBoard present />
        </div>
      </div>
    );
  }
  if (!node) { navReplace(`/w/${workspace.id}/analyse`); return null; }

  const goPresent = (m: Measure, path = view.path) => nav(buildAnalyseHash(workspace.id, 'present', m, path, view.dimensionOrder));
  const drill = (key: string) => { if (node.dimension) goPresent(view.measure, pushDrill(view, key, node.dimension).path); };
  const jump = (depth: number) => goPresent(view.measure, view.path.slice(0, depth));
  const exit = () => nav(buildAnalyseHash(workspace.id, 'analyse', view.measure, view.path, view.dimensionOrder));

  const rankByFreq = view.measure === 'count';
  const totalMs = node.rows.reduce((a, o) => a + o.durationMs, 0);
  const costable = hasCost(workspace);
  const factor = costPerMs(workspace);
  const hasChart = !!node.dimension && node.rows.length > 0;

  const byId = new Map(node.rows.map(o => [o.id, o]));
  const compareRows = !hasChart || !node.dimension ? [] : buildCompare(node.rows, node.dimension, rankByFreq ? 'count' : 'time');
  const tags = divergenceTags(compareRows);
  const slices: CompareSlice[] = compareRows.map(r => ({
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

  return (
    <div className="present">
      <button className="present-exit" onClick={exit} aria-label="Exit present">✕</button>

      <div className="present-body">
        <div className="present-head">
          <span className="present-ws"><span className="ws-dot" style={{ background: workspace.color }} />{workspace.name}</span>
          {node.dimension && <h1 className="present-q">By {DIM_LABEL[node.dimension].toLowerCase()} — time &amp; frequency</h1>}
          <DrillBreadcrumb path={view.path} onJump={jump} />
        </div>

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
        ) : (
          <div className="leaf present-leaf">
            <div className="leaf-num">{plural(node.rows.length, 'observation')}</div>
            {totalMs > 0 && <div className="leaf-sub">{fmtDurationWords(totalMs)}{costable ? ` · ${fmtGBP(totalMs * factor)}` : ''} in total</div>}
          </div>
        )}

        <EvidenceStrip media={node.media} />
      </div>
    </div>
  );
}
