/* Analyse — question-first. Pick a plain question; the app builds the Pareto,
 * you tap a bar to walk in (asset → category → sub-category), the breadcrumb
 * walks you back. Count / time / £ is one tap; the chart shows both magnitude
 * and frequency together; when they disagree the app says so. All in the URL. */
import { useMemo } from 'react';
import type { Route } from '../state/useRoute';
import { nav, readWorkstreamView, buildAnalyseHash } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { drillNode, pushDrill } from '../engine/drill';
import { computePareto } from '../engine/pareto';
import { DIM_LABEL, MEASURE_LABEL } from '../engine/types';
import { QUESTIONS } from '../engine/questions';
import type { Measure } from '../types';
import { ParetoChart, type SecondaryInfo } from '../charts/ParetoChart';
import { DrillBreadcrumb } from '../charts/DrillBreadcrumb';
import { DisagreementBanner } from '../charts/DisagreementBanner';
import { EvidenceStrip } from '../charts/EvidenceStrip';
import { EmptyState } from '../ui/EmptyState';
import { fmtDuration, fmtDurationWords, plural } from '../lib/format';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';

const LEG: Record<Measure, string> = { count: 'Count', time: 'Time', cost: 'Cost' };

function QuestionPicker({ wsId, color }: { wsId: string; color: string }) {
  return (
    <div className="wrap">
      <p className="eyebrow">Analyse</p>
      <h1 className="h1">What do you want to know?</h1>
      <p className="sub" style={{ marginBottom: 16 }}>Pick a question — Finder picks the tool and ranks the answer.</p>
      <div className="q-list">
        {QUESTIONS.map(q => (
          <button key={q.id} className="q-card" onClick={() => nav(buildAnalyseHash(wsId, 'analyse', q.measure, [], q.order))}>
            <span className="q-dot" style={{ background: color }} />
            <span className="q-main">
              <span className="q-label">{q.label}</span>
              <span className="q-sub">{q.sub}</span>
            </span>
            <span className="q-go">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AnalyseScreen({ route }: { route: Route }) {
  const { workspace, observations } = useWorkspace();
  const view = readWorkstreamView(route, workspace.id);
  const node = useMemo(() => (view ? drillNode(observations, view) : null), [view, observations]);

  if (!view) return <QuestionPicker wsId={workspace.id} color={workspace.color} />;
  if (!node) return null;

  const goto = (m: Measure, path = view.path) => nav(buildAnalyseHash(workspace.id, 'analyse', m, path, view.dimensionOrder));
  const drill = (key: string) => { if (node.dimension) goto(view.measure, pushDrill(view, key, node.dimension).path); };
  const jump = (depth: number) => goto(view.measure, view.path.slice(0, depth));

  const noRows = node.rows.length === 0;
  const hasChart = !!node.dimension && !!node.pareto && node.pareto.slices.length > 0;
  const totalMs = node.rows.reduce((a, o) => a + o.durationMs, 0);
  const costable = hasCost(workspace);
  const factor = costPerMs(workspace);

  const fmtOf = (m: Measure) => (v: number) =>
    m === 'count' ? `${Math.round(v)}×` : m === 'time' ? fmtDuration(v) : fmtGBP(v * factor);

  // The second measure paired on the chart — magnitude ↔ frequency.
  const secondary: Measure = view.measure === 'count' ? 'time' : 'count';
  let secondaryByKey: Record<string, SecondaryInfo> = {};
  let mediaByKey: Record<string, number> = {};
  if (hasChart) {
    const byId = new Map(node.rows.map(o => [o.id, o]));
    for (const s of node.pareto!.slices) mediaByKey[s.key] = s.observationIds.reduce((a, id) => a + (byId.get(id)?.media.length ?? 0), 0);
    for (const s of computePareto(node.rows, node.dimension!, secondary).slices) secondaryByKey[s.key] = { value: s.value, share: s.share };
  }

  return (
    <div className="wrap analyse">
      <div className="analyse-top">
        <button className="link-btn" onClick={() => nav(`/w/${workspace.id}/analyse`)}>‹ Question</button>
        <div className="measure-toggle">
          <button className={'mt' + (view.measure === 'count' ? ' on' : '')} onClick={() => goto('count')}>Count</button>
          <button className={'mt' + (view.measure === 'time' ? ' on' : '')} onClick={() => goto('time')}>Time</button>
          {costable
            ? <button className={'mt' + (view.measure === 'cost' ? ' on' : '')} onClick={() => goto('cost')}>Cost £</button>
            : <button className="mt mt-add" title="Set crew & rate to see £" onClick={() => nav(`/w/${workspace.id}/settings`)}>£?</button>}
        </div>
      </div>

      <DrillBreadcrumb path={view.path} onJump={jump} />

      {noRows ? (
        <EmptyState title={observations.length === 0 ? 'Nothing logged yet' : 'Nothing here'} icon="▤">
          {observations.length === 0
            ? 'Head to Capture and log what you see — the Pareto builds itself.'
            : 'No observations match this drill. Step back up with the breadcrumb.'}
        </EmptyState>
      ) : (
        <>
          <DisagreementBanner d={node.disagreement} />

          {hasChart ? (
            <>
              <div className="chart-caption">
                Ranked by <b>{DIM_LABEL[node.dimension!].toLowerCase()}</b> · {MEASURE_LABEL[view.measure]}
                {node.pareto!.slices.length > 1 && <span className="chart-hint"> · tap a bar to drill</span>}
              </div>
              <div className="chart-card">
                <ParetoChart
                  pareto={node.pareto!}
                  color={workspace.color}
                  fmtPrimary={fmtOf(view.measure)}
                  fmtSecondary={fmtOf(secondary)}
                  secondaryByKey={secondaryByKey}
                  mediaByKey={mediaByKey}
                  primaryLegend={LEG[view.measure]}
                  secondaryLegend={LEG[secondary]}
                  onDrill={drill}
                  canDrill
                />
              </div>
              <div className="analyse-meta">{plural(node.rows.length, 'observation')}{totalMs > 0 ? ` · ${fmtDurationWords(totalMs)}${costable ? ` · ${fmtGBP(totalMs * factor)}` : ''}` : ''}</div>
            </>
          ) : (
            <div className="leaf">
              <div className="leaf-num">{plural(node.rows.length, 'observation')}</div>
              {totalMs > 0 && <div className="leaf-sub">{fmtDurationWords(totalMs)}{costable ? ` · ${fmtGBP(totalMs * factor)}` : ''} in total</div>}
              <p className="sub" style={{ marginTop: 6 }}>You've drilled to the bottom — this is the specific problem. The proof is below.</p>
            </div>
          )}

          <EvidenceStrip media={node.media} />

          <button className="btn btn-primary present-cta" onClick={() => nav(buildAnalyseHash(workspace.id, 'present', view.measure, view.path, view.dimensionOrder))}>
            Present this ›
          </button>
        </>
      )}
    </div>
  );
}
