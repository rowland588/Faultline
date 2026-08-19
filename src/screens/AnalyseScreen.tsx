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
import { listCases, listSegments, addCase } from '../db';
import { uid } from '../lib/ids';
import { applyDrill, drillNode, pushDrill } from '../engine/drill';
import { buildCompare, divergenceTags } from '../engine/compare';
import { DIM_LABEL } from '../engine/types';
import { weeklyLoss } from '../lib/stats';
import { studyResult } from '../lib/proof';
import { freshness, agoWord } from '../lib/gemba';
import { scopeLabel, caseNowMsWeek, fmtMean } from './CaseScreen';
import { DEMO_NAME } from '../lib/demo';
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

/** Weekly average ONLY when at least one full week backs it — the prize line
 *  refuses to annualize a Tuesday. */
function weeklyAvgFor(rows: ReturnType<typeof applyDrill>, workspace: Parameters<typeof weeklyLoss>[1]): number | null {
  const full = weeklyLoss(rows, workspace, 6).filter(w => !w.current);
  const recent = full.slice(-4);
  if (!recent.length) return null;
  const avg = recent.reduce((a, w) => a + w.ms, 0) / recent.length;
  return avg > 0 ? avg : null;
}

const fmtHrs = (ms: number) => {
  const h = ms / 3600_000;
  return h >= 10 ? `${Math.round(h)} h` : h >= 1 ? `${Math.round(h * 10) / 10} h` : `${Math.round(ms / 60_000)} min`;
};

/** The prize, spoken where the pain is shown: what this drill position runs at
 *  per week, and what halving it recovers — the consultant's whiteboard
 *  arithmetic, computed live, clearly labelled as the halving scenario. */
function PrizeLine({ weeklyMs, costable, factor }: { weeklyMs: number; costable: boolean; factor: number }) {
  const money = (ms: number) => (costable ? fmtGBP(ms * factor) : fmtHrs(ms));
  const year = (ms: number) => (costable ? fmtGBP(ms * factor * 52) : fmtHrs(ms * 52));
  return (
    <div className="prize-line" data-tour="prize">
      <span className="prize-ic" aria-hidden>💰</span>
      <span>
        Running at <b>{money(weeklyMs)}/wk</b> ({year(weeklyMs)}/yr).
        Halve it and you recover <b>{money(weeklyMs / 2)}/wk ≈ {year(weeklyMs / 2)}/yr</b>.
      </span>
    </div>
  );
}

export function AnalyseScreen({ route }: { route: Route }) {
  const { workspace, observations } = useWorkspace();
  const view = readWorkstreamView(route, workspace.id);
  const node = useMemo(() => (view ? drillNode(observations, view) : null), [view, observations]);

  const [cases, setCases] = useState<Case[]>([]);
  const [walkTimes, setWalkTimes] = useState<number[]>([]);
  const [winsOpen, setWinsOpen] = useState(false);
  const [film, setFilm] = useState(false); // the tutorial film, played in place
  const syncedAt = useSyncedAt();
  useEffect(() => {
    void listCases(workspace.id).then(setCases);
    void listSegments(workspace.id).then(s => setWalkTimes(s.map(x => x.createdAt)));
  }, [workspace.id, syncedAt]);
  const openCases = cases.filter(c => c.status === 'open');

  const samePath = (a: DrillPath, b: DrillPath) =>
    a.length === b.length && a.every((s, i) => s.dimension === b[i].dimension && s.value === b[i].value);

  if (!view) {
    const live = observations.filter(o => o.deletedAt == null);
    const fr = freshness(live, walkTimes);
    const costableB = hasCost(workspace);
    const factorB = costPerMs(workspace);
    const perYr = (msWeek: number) => (costableB ? `${fmtGBP(msWeek * factorB * 52)}/yr` : `${fmtHrs(msWeek * 52)}/yr`);
    const dn = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    // the trophy shelf: cases whose study was CALLED and showed a real reduction
    const wins = cases
      .map(c => (c.study?.closedAt ? { c, r: studyResult(c, applyDrill(observations, workspace.id, c.path)) } : null))
      .filter((x): x is { c: Case; r: NonNullable<ReturnType<typeof studyResult>> } =>
        !!x && !!x.r && (x.r.changePct ?? 0) < 0 && (x.r.savedMsWeek ?? 0) > 0);
    const totalSavedWk = wins.reduce((a, w) => a + (w.r.savedMsWeek ?? 0), 0);
    return (
    <div className="wrap analyse board" data-tour="board">
      <p className="eyebrow">The line</p>
      <h1 className="h1" style={{ marginBottom: 14 }}>Where's the line losing time?</h1>
      {/* THE demo (owner decision, Aug 2026): one automatic film — the whole
          app used start to finish, narrated as it goes. */}
      {workspace.name === DEMO_NAME && (
        <button className="chip demo-tour-pill" onClick={() => setFilm(true)}>▶ Watch the demo — the app, start to finish</button>
      )}
      {/* ONE quiet status row — the calm rule: signals share a strip, the
          chart is the hero. Each pill expands or navigates on tap. */}
      <div className="status-strip">
        {(live.length > 0 || walkTimes.length > 0) && (
          <span className={'st-pill gm-' + fr.level} data-tour="gemba"
            title={`Eyes on the line: observed ${agoWord(fr.daysSinceObs)} · walked ${agoWord(fr.daysSinceWalk)}. The board is only as honest as the last visit.`}>
            👁 {agoWord(fr.daysSinceObs)}{fr.level !== 'fresh' ? ' — go and see' : ''}
          </span>
        )}
        {wins.length > 0 && (
          <button className="st-pill st-wins" data-tour="wins" onClick={() => setWinsOpen(o => !o)}>
            🏆 <b>{perYr(totalSavedWk)}</b> proven · {plural(wins.length, 'win')} {winsOpen ? '▾' : '›'}
          </button>
        )}
        {openCases.length > 0 && (
          <span className="st-cases" data-tour="cases">
            {openCases.map(c => {
              const now = caseNowMsWeek(weeklyLoss(applyDrill(observations, workspace.id, c.path), workspace, 12));
              const vs = c.baselineMsWeek > 0 ? Math.round(((now - c.baselineMsWeek) / c.baselineMsWeek) * 100) : null;
              return (
                <button key={c.id} className="st-pill st-case" onClick={() => nav(`/w/${workspace.id}/case/${c.id}`)} title={scopeLabel(c)}>
                  📌 {c.title}{vs != null ? <b className={vs <= 0 ? 'mt-good' : 'mt-bad'}> {vs <= 0 ? '▼' : '▲'}{Math.abs(vs)}%</b> : null}
                </button>
              );
            })}
          </span>
        )}
      </div>
      {winsOpen && wins.length > 0 && (
        <div className="wins-shelf">
          {wins.map(({ c, r }) => (
            <button key={c.id} className="win-row" onClick={() => nav(`/w/${workspace.id}/case/${c.id}`)}>
              <span className="win-title">✓ {c.title}</span>
              <span className="win-meta">{fmtMean(r.beforeMeanMs)} → {fmtMean(r.afterMeanMs)} per event · {perYr(r.savedMsWeek ?? 0)} · proven {dn(c.study!.closedAt!)}</span>
            </button>
          ))}
        </div>
      )}
      <LineBoard />
      {film && (
        <div className="film-overlay" onClick={() => setFilm(false)} role="dialog" aria-label="Tutorial film">
          <video controls autoPlay playsInline onClick={e => e.stopPropagation()}>
            {/* mp4 first: iPhones and iPads don't play VP8 webm */}
            <source src="/demo/tutorial.mp4" type="video/mp4" />
            <source src="/demo/tutorial.webm" type="video/webm" />
          </video>
          <button className="film-close" onClick={() => setFilm(false)} aria-label="Close the film">×</button>
        </div>
      )}
    </div>
    );
  }
  if (!node) return null;

  const existing = view.path.length > 0 ? openCases.find(c => samePath(c.path, view.path)) : undefined;
  const weeklyMs = weeklyAvgFor(node.rows, workspace);
  const openCaseHere = async () => {
    const baseline = baselineFor(node.rows, workspace);
    const c: Case = {
      id: uid(), workspaceId: workspace.id,
      title: view.path.map(s => s.value).join(' · '),
      path: view.path,
      baselineMsWeek: baseline,
      // the prize becomes the promise: default target = halve it (editable on the Case)
      targetMsWeek: Math.round(baseline / 2),
      status: 'open', openedAt: Date.now(), updatedAt: Date.now(),
    };
    await addCase(c);
    nav(`/w/${workspace.id}/case/${c.id}`);
  };

  const goto = (m: Measure, path = view.path) => nav(buildAnalyseHash(workspace.id, 'analyse', m, path, view.dimensionOrder));
  const drill = (key: string) => { if (node.dimension) goto(view.measure, pushDrill(view, key, node.dimension).path); };
  // "All" means the line: land back on the board, not a rootless drill view
  const jump = (depth: number) => { if (depth === 0) nav(`/w/${workspace.id}/analyse`); else goto(view.measure, view.path.slice(0, depth)); };

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
                Every <b>{DIM_LABEL[node.dimension!].toLowerCase()}</b>, ranked by <b>{rankByFreq ? 'frequency' : 'lost time'}</b>
                {slices.length > 1 && <span className="chart-hint"> · tap a bar to drill</span>}
              </div>
              <div className="chart-card" data-tour="drill-chart">
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

          {/* the board just said WHERE the fix goes — record it before it
              escapes into a notebook. ONE prominent thing (the calm rule):
              raising the action; presenting is a quiet link below. */}
          <ActionComposer wsId={workspace.id} path={view.path} caseId={existing?.id} />

          {/* the prize, right where the pain is — then one tap makes it the target */}
          {weeklyMs != null && <PrizeLine weeklyMs={weeklyMs} costable={costable} factor={factor} />}

          {/* quiet next steps — the composer above is the one loud thing */}
          <div className="next-row">
            {view.path.length > 0 && (
              existing
                ? <button className="linkish" data-tour="case-cta" onClick={() => nav(`/w/${workspace.id}/case/${existing.id}`)}>📌 Open its Case — {existing.title} ›</button>
                : <button className="linkish" data-tour="case-cta" onClick={() => void openCaseHere()}>📌 Open a Case on this ›</button>
            )}
            <button className="linkish" onClick={() => nav(`/w/${workspace.id}/trend`)}>📈 Is it getting better? ›</button>
          </div>

          <button className="linkish present-link" onClick={() => nav(buildAnalyseHash(workspace.id, 'present', view.measure, view.path, view.dimensionOrder))}>
            Present this ›
          </button>
        </>
      )}
    </div>
  );
}
