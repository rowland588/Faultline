/* Present — the same analysis, calm and full-screen for the senior team. Big
 * Pareto, the one insight, the proof as hero. Still live: drill in front of the
 * room, and exit lands back in Analyse at the very same spot. */
import { useMemo } from 'react';
import type { Route } from '../state/useRoute';
import { nav, navReplace, readWorkstreamView, buildAnalyseHash } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { drillNode, pushDrill } from '../engine/drill';
import { DIM_LABEL, MEASURE_LABEL } from '../engine/types';
import type { Measure } from '../types';
import { ParetoChart } from '../charts/ParetoChart';
import { DrillBreadcrumb } from '../charts/DrillBreadcrumb';
import { DisagreementBanner } from '../charts/DisagreementBanner';
import { EvidenceStrip } from '../charts/EvidenceStrip';
import { fmtDurationWords, plural } from '../lib/format';

export function PresentScreen({ route }: { route: Route }) {
  const { workspace, observations } = useWorkspace();
  const view = readWorkstreamView(route, workspace.id);
  const node = useMemo(() => (view ? drillNode(observations, view) : null), [view, observations]);

  if (!view || !node) { navReplace(`/w/${workspace.id}/analyse`); return null; }

  const goPresent = (m: Measure, path = view.path) => nav(buildAnalyseHash(workspace.id, 'present', m, path, view.dimensionOrder));
  const drill = (key: string) => { if (node.dimension) goPresent(view.measure, pushDrill(view, key, node.dimension).path); };
  const jump = (depth: number) => goPresent(view.measure, view.path.slice(0, depth));
  const exit = () => nav(buildAnalyseHash(workspace.id, 'analyse', view.measure, view.path, view.dimensionOrder));

  const totalMs = node.rows.reduce((a, o) => a + o.durationMs, 0);

  return (
    <div className="present">
      <button className="present-exit" onClick={exit} aria-label="Exit present">✕</button>

      <div className="present-body">
        <div className="present-head">
          <span className="present-ws"><span className="ws-dot" style={{ background: workspace.color }} />{workspace.name}</span>
          {node.dimension && (
            <h1 className="present-q">By {DIM_LABEL[node.dimension].toLowerCase()} · {MEASURE_LABEL[view.measure]}</h1>
          )}
          <DrillBreadcrumb path={view.path} onJump={jump} />
        </div>

        <DisagreementBanner d={node.disagreement} />

        {node.pareto && node.pareto.slices.length > 0 ? (
          <div className="present-chart">
            <ParetoChart pareto={node.pareto} color={workspace.color} onDrill={drill} canDrill />
          </div>
        ) : (
          <div className="leaf present-leaf">
            <div className="leaf-num">{plural(node.rows.length, 'observation')}</div>
            {totalMs > 0 && <div className="leaf-sub">{fmtDurationWords(totalMs)} in total</div>}
          </div>
        )}

        <EvidenceStrip media={node.media} />
      </div>
    </div>
  );
}
