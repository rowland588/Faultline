/* Analyse — question-first. Pick a plain question; the app builds the Pareto and
 * shows BOTH measures at once: a lost-time bar (with its £ cost) beside a
 * frequency bar, for every category. You tap a bar to walk in (asset → category →
 * sub-category); the breadcrumb walks you back. The toggle changes only what you
 * RANK by — time or frequency — so you can flip the lens and watch the order
 * change. When the two rankings disagree, the app says so. All state in the URL. */
import { useMemo } from 'react';
import type { Route } from '../state/useRoute';
import { nav, readWorkstreamView, buildAnalyseHash } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { drillNode, pushDrill } from '../engine/drill';
import { buildCompare } from '../engine/compare';
import { DIM_LABEL } from '../engine/types';
import { QUESTIONS } from '../engine/questions';
import type { Measure } from '../types';
import { ParetoChart, type CompareSlice } from '../charts/ParetoChart';
import { DrillBreadcrumb } from '../charts/DrillBreadcrumb';
import { DisagreementBanner } from '../charts/DisagreementBanner';
import { EvidenceStrip } from '../charts/EvidenceStrip';
import { EmptyState } from '../ui/EmptyState';
import { fmtDuration, fmtDurationWords, plural } from '../lib/format';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';

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

  const rankByFreq = view.measure === 'count';
  const noRows = node.rows.length === 0;
  const hasChart = !!node.dimension && !noRows;
  const totalMs = node.rows.reduce((a, o) => a + o.durationMs, 0);
  const costable = hasCost(workspace);
  const factor = costPerMs(workspace);

  const byId = new Map(node.rows.map(o => [o.id, o]));
  const slices: CompareSlice[] = !hasChart || !node.dimension ? [] :
    buildCompare(node.rows, node.dimension, rankByFreq ? 'count' : 'time').map(r => ({
      key: r.key,
      timeShare: r.timeShare,
      freqShare: r.countShare,
      cumShare: r.cumShare,
      timeLabel: fmtDuration(r.timeMs),
      costLabel: costable ? fmtGBP(r.timeMs * factor) : undefined,
      freqLabel: `${r.count}×`,
      isVitalFew: r.isVitalFew,
      media: r.observationIds.reduce((a, id) => a + (byId.get(id)?.media.length ?? 0), 0),
    }));

  return (
    <div className="wrap analyse">
      <div className="analyse-top">
        <button className="link-btn" onClick={() => nav(`/w/${workspace.id}/analyse`)}>‹ Question</button>
        <div className="measure-toggle" role="group" aria-label="Rank by">
          <span className="mt-label">Rank by</span>
          <button className={'mt' + (!rankByFreq ? ' on' : '')} onClick={() => goto('time')}>Lost time</button>
          <button className={'mt' + (rankByFreq ? ' on' : '')} onClick={() => goto('count')}>Frequency</button>
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
                Every <b>{DIM_LABEL[node.dimension!].toLowerCase()}</b> — time lost <i>and</i> how often — ranked by <b>{rankByFreq ? 'frequency' : 'lost time'}</b>
                {slices.length > 1 && <span className="chart-hint"> · tap a bar to drill</span>}
              </div>
              <div className="chart-card">
                <ParetoChart
                  slices={slices}
                  color={workspace.color}
                  rankLabel={rankByFreq ? 'cumulative freq' : 'cumulative time'}
                  onDrill={drill}
                  canDrill
                />
              </div>
              <div className="analyse-meta">
                {plural(node.rows.length, 'observation')}{totalMs > 0 ? ` · ${fmtDurationWords(totalMs)}${costable ? ` · ${fmtGBP(totalMs * factor)}` : ''}` : ''}
              </div>
              {!costable && (
                <button className="cost-hint" onClick={() => nav(`/w/${workspace.id}/settings`)}>
                  💷 Put a £ on this lost time — add crew &amp; labour rate ›
                </button>
              )}
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
