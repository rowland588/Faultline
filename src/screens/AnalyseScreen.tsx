/* Analyse — question-first. Pick a plain question; the app builds the Pareto and
 * shows BOTH measures at once: a lost-time bar (with its £ cost) beside a
 * frequency bar, for every category. You tap a bar to walk in (asset → category →
 * sub-category); the breadcrumb walks you back. The toggle changes only what you
 * RANK by — time or frequency — so you can flip the lens and watch the order
 * change. When the two rankings disagree, the app says so. All state in the URL. */
import { useEffect, useMemo, useState } from 'react';
import type { Route } from '../state/useRoute';
import { nav, readWorkstreamView, buildAnalyseHash } from '../state/useRoute';
import { useWorkspace } from '../state/WorkspaceProvider';
import { useSyncedAt } from '../cloud/session';
import { listCases, addCase } from '../db';
import { uid } from '../lib/ids';
import { applyDrill, drillNode, pushDrill } from '../engine/drill';
import { buildCompare, divergenceTags } from '../engine/compare';
import { DIM_LABEL } from '../engine/types';
import { weeklyLoss } from '../lib/stats';
import { scopeLabel, caseNowMsWeek } from './CaseScreen';
import type { Case, Measure, DrillPath } from '../types';
import { ParetoChart, type CompareSlice } from '../charts/ParetoChart';
import { LineBoard } from './LineBoard';
import { DrillBreadcrumb } from '../charts/DrillBreadcrumb';
import { DisagreementBanner } from '../charts/DisagreementBanner';
import { EvidenceStrip } from '../charts/EvidenceStrip';
import { ActionComposer } from './ActionComposer';
import { EmptyState } from '../ui/EmptyState';
import { fmtDuration, fmtDurationWords, plural } from '../lib/format';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';

/** Average weekly loss of the scope over its last 4 full weeks — the honest,
 *  measured "before" a new Case is born with. */
function baselineFor(rows: ReturnType<typeof applyDrill>, workspace: Parameters<typeof weeklyLoss>[1]): number {
  const full = weeklyLoss(rows, workspace, 6).filter(w => !w.current);
  const recent = full.slice(-4);
  if (recent.length) return Math.round(recent.reduce((a, w) => a + w.ms, 0) / recent.length);
  return rows.reduce((a, o) => a + o.durationMs, 0); // day-one workspace: all of it, one "week"
}

export function AnalyseScreen({ route }: { route: Route }) {
  const { workspace, observations } = useWorkspace();
  const view = readWorkstreamView(route, workspace.id);
  const node = useMemo(() => (view ? drillNode(observations, view) : null), [view, observations]);

  const [cases, setCases] = useState<Case[]>([]);
  const syncedAt = useSyncedAt();
  useEffect(() => { void listCases(workspace.id).then(setCases); }, [workspace.id, syncedAt]);
  const openCases = cases.filter(c => c.status === 'open');

  const samePath = (a: DrillPath, b: DrillPath) =>
    a.length === b.length && a.every((s, i) => s.dimension === b[i].dimension && s.value === b[i].value);

  if (!view) return (
    <div className="wrap analyse board" data-tour="board">
      <p className="eyebrow">The line</p>
      <h1 className="h1" style={{ marginBottom: 14 }}>Where's the line losing time?</h1>
      {openCases.length > 0 && (
        <div className="cases-strip">
          {openCases.map(c => {
            const now = caseNowMsWeek(weeklyLoss(applyDrill(observations, workspace.id, c.path), workspace, 12));
            const vs = c.baselineMsWeek > 0 ? Math.round(((now - c.baselineMsWeek) / c.baselineMsWeek) * 100) : null;
            return (
              <button key={c.id} className="case-chip" onClick={() => nav(`/w/${workspace.id}/case/${c.id}`)}>
                <span className="cc-title">📌 {c.title}</span>
                <span className="cc-sub">{scopeLabel(c)}{vs != null ? <b className={vs <= 0 ? 'mt-good' : 'mt-bad'}> · {vs <= 0 ? '▼' : '▲'} {Math.abs(vs)}%</b> : null}</span>
              </button>
            );
          })}
        </div>
      )}
      <LineBoard />
    </div>
  );
  if (!node) return null;

  const existing = view.path.length > 0 ? openCases.find(c => samePath(c.path, view.path)) : undefined;
  const openCaseHere = async () => {
    const c: Case = {
      id: uid(), workspaceId: workspace.id,
      title: view.path.map(s => s.value).join(' · '),
      path: view.path,
      baselineMsWeek: baselineFor(node.rows, workspace),
      status: 'open', openedAt: Date.now(), updatedAt: Date.now(),
    };
    await addCase(c);
    nav(`/w/${workspace.id}/case/${c.id}`);
  };

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

          {/* the board just said WHERE the fix goes — record it before it
              escapes into a notebook */}
          <ActionComposer wsId={workspace.id} path={view.path} caseId={existing?.id} />

          {/* the drill just picked the problem — a Case makes it a story with a
              baseline, a target and a page (the A3 that fills itself) */}
          {view.path.length > 0 && (
            existing
              ? <button className="board-cta" onClick={() => nav(`/w/${workspace.id}/case/${existing.id}`)}>
                  <span className="board-cta-ic" aria-hidden>📌</span>
                  <span className="board-cta-main">Open its Case — {existing.title}</span>
                  <span className="board-cta-go" aria-hidden>›</span>
                </button>
              : <button className="board-cta" onClick={() => void openCaseHere()}>
                  <span className="board-cta-ic" aria-hidden>📌</span>
                  <span className="board-cta-main">Open a Case on this — baseline it, target it, track it</span>
                  <span className="board-cta-go" aria-hidden>›</span>
                </button>
          )}

          {/* the Pareto says WHERE the pain is; the trend says whether the
              walks are changing anything — the natural next question */}
          <button className="board-cta" onClick={() => nav(`/w/${workspace.id}/trend`)}>
            <span className="board-cta-ic" aria-hidden>📈</span>
            <span className="board-cta-main">Is it getting better?</span>
            <span className="board-cta-go" aria-hidden>›</span>
          </button>
        </>
      )}
    </div>
  );
}
