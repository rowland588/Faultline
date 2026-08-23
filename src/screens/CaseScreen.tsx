/* THE CASE — one improvement story on one page, the A3 that fills itself.
 * The Case record is a folder with a number on it (title, saved scope,
 * baseline, target); every box on this page DERIVES live: current condition
 * from the scoped rows' weekly loss, analysis from the drill engine,
 * countermeasures from the actions carrying this caseId, follow-up from the
 * scoped trend against the target. Print it and it's the A3 you hand upward. */
import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav, goBack, buildAnalyseHash } from '../state/useRoute';
import { getCase, updateCase, deleteCase, snagsForWorkspace, updateSnag } from '../db';
import { useSyncedAt } from '../cloud/session';
import { applyDrill, drillNode } from '../engine/drill';
import { weeklyLoss, weekStart } from '../lib/stats';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';
import { plural } from '../lib/format';
import { ActionComposer } from './ActionComposer';
import { TimeStrip, dueWord } from '../snag/TimeStrip';
import { SNAG_STATUS_META, isOverdue, isDueSoon, compareReview, dueToInput, dueFromInput, type Snag, type SnagStatus } from '../snag/types';
import { studyResult, defaultTargetN, makeReceipt, provenWin, fmtSpan } from '../lib/proof';
import type { Case, DimensionKey, WorkstreamView } from '../types';

/** Mean-per-event, in words a room can read aloud. */
export const fmtMean = (ms: number): string =>
  ms >= 60_000 ? `${(ms / 60_000).toFixed(1)} min` : `${Math.round(ms / 1000)}s`;

const BOARD_ORDER: DimensionKey[] = ['asset', 'category', 'subcategory', 'shift'];
const fmtH = (ms: number) => {
  const h = ms / 3600_000;
  return h >= 10 ? `${Math.round(h)} h` : h >= 1 ? `${Math.round(h * 10) / 10} h` : `${Math.round(ms / 60_000)} min`;
};
const dateNice = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });

export const scopeLabel = (c: Pick<Case, 'path'>): string =>
  c.path.length ? c.path.map(s => s.value).join(' · ') : 'the whole line';

/** Recent truth for a case: avg weekly loss of its scoped rows over the last
 *  3 FULL weeks. The number the baseline and target are judged against. */
export function caseNowMsWeek(scopedWeeklyMs: { start: number; ms: number; current: boolean }[]): number {
  const full = scopedWeeklyMs.filter(w => !w.current);
  const recent = full.slice(-3);
  return recent.length ? recent.reduce((a, w) => a + w.ms, 0) / recent.length : 0;
}

/** The 5-Whys chain. Each line is a "because…"; the LAST filled line wears the
 *  ROOT CAUSE badge. Edit any line; clear a line to drop it. The floor's
 *  action composer asks WHAT to do — this box asks WHY it happens. */
function WhyChain({ whys, onChange }: { whys: string[]; onChange: (w: string[]) => void }) {
  const rows = whys.length < 5 ? [...whys, ''] : [...whys];
  const commit = (i: number, raw: string) => {
    const next = [...whys];
    const v = raw.trim();
    if (i < next.length) { if (v) next[i] = v; else next.splice(i, 1); }
    else if (v) next.push(v);
    if (JSON.stringify(next) !== JSON.stringify(whys)) onChange(next);
  };
  const lastFilled = whys.length - 1;
  return (
    <div>
      {rows.map((w, i) => (
        <div key={`${i}-${w}`} className="why-row">
          <span className="why-n">{i + 1}</span>
          <span className="why-word">Why?</span>
          <input className="text-input why-input no-print" defaultValue={w} maxLength={200}
            placeholder={i === 0 ? 'Because… (start the chain)' : 'Because…'}
            onBlur={e => commit(i, e.target.value)} />
          {w ? <span className="print-only">{w}</span> : null}
          {i === lastFilled && w ? <span className="why-root">ROOT CAUSE</span> : null}
        </div>
      ))}
      <p className="sub no-print" style={{ marginTop: 4 }}>Keep asking until it stops answering — the last line is what the countermeasures must kill.</p>
    </div>
  );
}

/** The confirmation study, in its three states: not armed (the lab sheet),
 *  collecting (progress + live means), called (the verdict — the receipt).
 *  All arithmetic comes from lib/proof so no screen can disagree with it. */
function ProofBox({ kase, scopedCount, result, costable, factor, onChange }: {
  kase: Case; scopedCount: number; result: ReturnType<typeof studyResult>;
  costable: boolean; factor: number; onChange: (patch: Partial<Case>) => Promise<void>;
}) {
  const [tN, setTN] = useState<number | null>(null);

  if (!kase.study) {
    const suggested = defaultTargetN(scopedCount);
    const target = tN ?? suggested;
    return (
      <div>
        <p className="sub">
          The weekly trend only shows what people happened to log — it can't prove a saving. A study can:
          re-measure <b>{scopeLabel(kase)}</b> the same way, compare the average time per event, and state both sample sizes.
        </p>
        <p className="sub" style={{ marginTop: 6 }}>
          Baseline sample so far: <b>{plural(scopedCount, 'observation')}</b>.
          Everything captured in this scope from the moment you start counts toward the after-sample.
        </p>
        <div className="row-inline no-print" style={{ marginTop: 10 }}>
          <label className="sub" htmlFor="study-n">Samples to collect:</label>
          <input id="study-n" className="text-input case-target" type="number" min={3} max={50} step={1}
            value={target} onChange={e => setTN(Math.max(3, Math.min(50, Number(e.target.value) || suggested)))} />
          <button className="btn btn-primary" disabled={scopedCount === 0}
            onClick={() => void onChange({ study: { startedAt: Date.now(), targetN: target } })}>
            🔬 Start the study
          </button>
        </div>
        {scopedCount === 0 && <p className="sub" style={{ marginTop: 6 }}>Needs a baseline first — capture some observations in this scope, then come back.</p>}
      </div>
    );
  }

  if (!result) return null;
  const money = (ms: number) => (costable ? fmtGBP(ms * factor) : fmtH(ms));
  const called = kase.study.closedAt != null;
  const better = (result.changePct ?? 0) < 0;
  const fmtP = (p: number) => (p < 0.01 ? 'p<0.01' : `p=${p.toFixed(2)}`);

  /* density — n means little without the calendar it covers */
  const density = (
    <p className="sub" style={{ marginTop: 6 }}>
      Sample density: before <b>{result.beforeN}</b> {result.beforeSpanMs > 0 ? <>over <b>{fmtSpan(result.beforeSpanMs)}</b></> : null}
      {' · '}after <b>{result.afterN}</b> {result.afterSpanMs > 0 && result.afterN > 0 ? <>over <b>{fmtSpan(result.afterSpanMs)}</b></> : null}
    </p>
  );
  /* frequency — informational only, and only once both spans can carry it */
  const showRates = result.beforeRateWk != null && result.afterRateWk != null
    && result.beforeSpanMs >= 14 * 24 * 3600_000 && result.afterSpanMs >= 7 * 24 * 3600_000;
  const rates = showRates ? (
    <p className="sub">
      Frequency: <b>{result.beforeRateWk!.toFixed(1)}/wk</b> → <b>{result.afterRateWk!.toFixed(1)}/wk</b>
      {' '}— for information; the £ claim compares time per event, at the baseline's frequency.
    </p>
  ) : null;

  const readout = (
    <div className="proof-readout">
      <div className="proof-side">
        <span className="proof-label">Before</span>
        <b>{fmtMean(result.beforeMeanMs)}</b>
        <span className="sub">avg per event · n={result.beforeN}</span>
      </div>
      <span className="proof-arrow" aria-hidden>→</span>
      <div className="proof-side">
        <span className="proof-label">After</span>
        <b>{result.afterN === 0 ? '—' : fmtMean(result.afterMeanMs)}</b>
        <span className="sub">avg per event · n={result.afterN}</span>
      </div>
      {result.changePct != null && (
        <div className="proof-side">
          <span className="proof-label">Change</span>
          <b className={better ? 'mt-good' : 'mt-bad'}>{result.changePct > 0 ? '+' : ''}{result.changePct}%</b>
          {result.savedMsWeek != null && (
            <span className="sub">
              {result.savedMsWeek >= 0 ? 'saving ≈ ' : 'costing ≈ '}
              <b>{money(Math.abs(result.savedMsWeek))}/wk</b>
              {costable ? ` (${fmtGBP(Math.abs(result.savedMsWeek) * factor * 52)}/yr)` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (called) {
    const won = provenWin(result);
    const noise = better && result.significant === false; // improved on average, but within noise
    const stamp = won ? '✓ PROVEN' : noise ? '✗ NOT PROVEN — within noise' : '✗ NO IMPROVEMENT';
    const since = result.sinceCall;
    return (
      <div>
        <p className={'proof-stamp ' + (won ? 'ps-good' : 'ps-bad')}>
          {stamp} — called {dateNice(kase.study.closedAt!)}
        </p>
        {noise && (
          <p className="sub">
            The averages moved, but with these samples the difference isn't distinguishable from chance
            {result.pValue != null ? <> ({fmtP(result.pValue)})</> : null}. Collect more and re-call, or let it stand as honest.
          </p>
        )}
        {readout}
        {density}
        {rates}
        <p className="sub" style={{ marginTop: 6 }}>
          Method: same scope, same capture method, both sample sizes shown. £ projected at the baseline's frequency.
          {result.frozen
            ? <> Numbers frozen at the call{result.pValue != null ? <> · {fmtP(result.pValue)}</> : null} — logs since then don't rewrite this receipt.</>
            : result.pValue != null ? <> {fmtP(result.pValue)} (one-sided).</> : null}
        </p>
        {won && since && (
          since.n === 0
            ? <p className="sub">Holding? Nothing logged in this scope since the call — silence is fine; watch the Line.</p>
            : <p className={'sub' + (since.slipping ? ' mt-bad' : '')}>
                {since.slipping ? '⚠ SLIPPING' : '✓ Holding'} — {plural(since.n, 'event')} since the call, averaging <b>{fmtMean(since.meanMs)}</b>
                {result.afterMeanMs > 0 ? <> vs <b>{fmtMean(result.afterMeanMs)}</b> proven</> : null}.
                {since.slipping ? ' The fix is drifting — reopen the case and look.' : ''}
              </p>
        )}
        <button className="linkish no-print" onClick={() => void onChange({ study: { ...kase.study!, closedAt: undefined, receipt: undefined } })}>
          Reopen the study
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="proof-progress" role="progressbar" aria-valuenow={result.afterN} aria-valuemax={result.targetN}>
        <span className="pp-fill" style={{ width: `${Math.min(100, (result.afterN / result.targetN) * 100)}%` }} />
      </div>
      <p className="sub" style={{ marginTop: 4 }}>
        🔬 Study running since {dateNice(kase.study.startedAt)} — <b>{result.afterN} of {result.targetN}</b> samples collected.
        Capture in this scope and they count automatically.
      </p>
      {result.stale && (
        <p className="sub mt-bad">
          ⚠ This study has drifted — armed over 60 days and still short of target. The line may have changed
          underneath it; abandon and re-arm for a clean before/after.
        </p>
      )}
      {result.afterN > 0 && readout}
      {result.afterN > 0 && density}
      {result.afterN > 0 && rates}
      {result.afterN > 0 && (
        <p className="sub">
          Signal: {result.pValue == null
            ? 'too early to test — needs at least 3 samples each side.'
            : result.significant && better
              ? <>the improvement is distinguishable from noise ({fmtP(result.pValue)}).</>
              : better
                ? <>looks better, but not yet distinguishable from noise ({fmtP(result.pValue)}) — keep collecting.</>
                : <>no improvement signal yet ({fmtP(result.pValue)}).</>}
        </p>
      )}
      <div className="row-inline no-print" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" disabled={!result.enough}
          title={result.enough ? undefined : `Collect ${result.targetN - result.afterN} more first`}
          onClick={() => {
            const calledAt = Date.now();
            // freeze the receipt AT the call — the verdict becomes a record, not a recompute
            void onChange({ study: { ...kase.study!, closedAt: calledAt, receipt: makeReceipt(result, calledAt) ?? undefined } });
          }}>
          {result.enough ? 'Call it — record the verdict' : `Needs ${result.targetN - result.afterN} more`}
        </button>
        <button className="btn btn-ghost"
          onClick={() => { if (window.confirm('Abandon this study? Its counting stops; observations stay.')) void onChange({ study: undefined }); }}>
          Abandon
        </button>
      </div>
    </div>
  );
}

export function CaseScreen({ caseId }: { caseId: string }) {
  const { workspace, observations } = useWorkspace();
  const costable = hasCost(workspace);
  const factor = costPerMs(workspace);
  const syncedAt = useSyncedAt();

  const [kase, setKase] = useState<Case | null | undefined>(undefined); // undefined = loading
  const [snags, setSnags] = useState<Snag[]>([]);
  const load = async () => {
    const [c, sn] = await Promise.all([getCase(caseId), snagsForWorkspace(workspace.id)]);
    setKase(c ?? null); setSnags(sn);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [workspace.id, caseId, syncedAt]);

  const scoped = useMemo(
    () => (kase ? applyDrill(observations, workspace.id, kase.path) : []),
    [observations, workspace.id, kase],
  );
  const weeks = useMemo(() => weeklyLoss(scoped, workspace, 12), [scoped, workspace]);
  const nowMsWeek = caseNowMsWeek(weeks);

  if (kase === undefined) return null;
  if (kase === null) return (
    <div className="wrap"><p className="sub" style={{ marginTop: 20 }}>This case is gone — deleted, or not synced to this device yet.</p></div>
  );

  const mutateCase = async (patch: Partial<Case>) => { await updateCase({ ...kase, ...patch }); await load(); };
  const mutateSnag = async (s: Snag) => { await updateSnag(s); await load(); };

  const mine = snags.filter(s => s.caseId === kase.id).sort((a, b) => compareReview(a, b));
  const openMine = mine.filter(s => s.status !== 'closed');
  const closedMine = mine.filter(s => s.status === 'closed');

  // suggestions: open board actions whose target sits inside this scope, not yet attached
  const inScope = (s: Snag) => kase.path.every(step =>
    (step.dimension === 'category' && s.targetCategory === step.value) ||
    (step.dimension === 'subcategory' && s.targetSubcategory === step.value) ||
    (step.dimension === 'asset' && s.targetAsset === step.value));
  const suggestions = snags.filter(s => !s.caseId && !s.assetId && s.status !== 'closed' && kase.path.length > 0 && inScope(s)).slice(0, 5);

  // the verdict: recent truth vs baseline and target
  const vsBase = kase.baselineMsWeek > 0 ? Math.round(((nowMsWeek - kase.baselineMsWeek) / kase.baselineMsWeek) * 100) : null;
  const targetMet = kase.targetMsWeek != null && nowMsWeek <= kase.targetMsWeek;
  const money = (v: number) => (costable ? `${fmtGBP(v * factor)}/wk` : `${fmtH(v)}/wk`);

  // analysis, derived live at the scope
  const view: WorkstreamView = { workspaceId: workspace.id, measure: 'time', dimensionOrder: BOARD_ORDER, path: kase.path, mode: 'analyse' };
  const node = drillNode(observations, view);
  const topSlices = node.pareto ? node.pareto.slices.slice(0, 3) : [];

  const maxWeekMs = Math.max(1, ...weeks.map(w => w.ms), kase.baselineMsWeek, kase.targetMsWeek ?? 0);
  const closedFlagWeeks = new Set(closedMine.map(s => weekStart(s.closedAt ?? s.raisedAt)));

  const remove = async () => {
    if (!window.confirm('Delete this case? Its actions keep living on the snag list.')) return;
    await deleteCase(kase.id);
    nav(`/w/${workspace.id}/analyse`);
  };

  return (
    <div className="wrap case-root print-root">
      <div className="subhead no-print">
        <button className="btn btn-ghost" data-tour="case-back" onClick={() => goBack(`/w/${workspace.id}/analyse`)}>‹ Back</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => window.print()}>Print A3</button>
        {kase.status === 'open'
          ? <button className="btn" onClick={() => void mutateCase({ status: 'closed', closedAt: Date.now() })}>Close the case</button>
          : <button className="btn" onClick={() => void mutateCase({ status: 'open', closedAt: undefined })}>Reopen</button>}
      </div>

      <header className="report-head">
        <input className="case-title" defaultValue={kase.title} maxLength={120} aria-label="Case title"
          onBlur={e => { const t = e.target.value.trim(); if (t && t !== kase.title) void mutateCase({ title: t }); }} />
        <p className="report-meta">
          {workspace.name} · {scopeLabel(kase)} · opened {dateNice(kase.openedAt)}
          {kase.status === 'closed' ? ` · closed ${dateNice(kase.closedAt ?? kase.openedAt)}` : ''}
        </p>
        <div className="report-stats">
          <span className={'report-stat ' + (kase.status === 'open' ? 'st-open' : 'st-closed')}><b>{kase.status === 'open' ? 'Open' : 'Closed'}</b></span>
          <span className="report-stat"><b>{money(kase.baselineMsWeek)}</b> baseline</span>
          <span className="report-stat"><b>{money(nowMsWeek)}</b> now</span>
          {kase.targetMsWeek != null && <span className={'report-stat ' + (targetMet ? 'st-closed' : 'st-open')}><b>{money(kase.targetMsWeek)}</b> target {targetMet ? '✓ met' : 'not yet'}</span>}
          {vsBase != null && <span className={'report-stat ' + (vsBase <= 0 ? 'st-closed' : 'st-open')}><b>{vsBase <= 0 ? '▼' : '▲'} {Math.abs(vsBase)}%</b> vs baseline</span>}
        </div>
      </header>

      {/* ── background ── */}
      <section className="case-box">
        <h2 className="case-box-h">Background</h2>
        <input className="text-input no-print" defaultValue={kase.note ?? ''} maxLength={300}
          placeholder="One line of background — why this case exists (optional)"
          onBlur={e => { const t = e.target.value.trim(); if (t !== (kase.note ?? '')) void mutateCase({ note: t || undefined }); }} />
        {kase.note ? <p className="case-note print-only">{kase.note}</p> : null}
        <p className="sub" style={{ marginTop: 6 }}>
          Watching <b>{scopeLabel(kase)}</b> by lost time. Baseline is the average of the 4 full weeks before opening — measured, not typed.
        </p>
        <div className="row-inline no-print" style={{ marginTop: 8 }}>
          <label className="sub" htmlFor="case-target">Target (hrs/week):</label>
          <input id="case-target" className="text-input case-target" type="number" min={0} step={0.5}
            defaultValue={kase.targetMsWeek != null ? Math.round((kase.targetMsWeek / 3600_000) * 10) / 10 : ''}
            onBlur={e => {
              const v = e.target.value.trim();
              const ms = v === '' ? undefined : Math.max(0, Number(v)) * 3600_000;
              if (ms !== kase.targetMsWeek) void mutateCase({ targetMsWeek: ms });
            }} />
        </div>
      </section>

      {/* ── current condition / follow-up: the scoped trend ── */}
      <section className="case-box">
        <h2 className="case-box-h">The number, week by week</h2>
        {scoped.length === 0 ? <p className="sub">No observations in this scope yet.</p> : (
          <div className="case-weeks">
            {kase.targetMsWeek != null && <div className="cw-line cw-target" style={{ bottom: `${(kase.targetMsWeek / maxWeekMs) * 100}%` }} title={`Target ${money(kase.targetMsWeek)}`} />}
            <div className="cw-line cw-base" style={{ bottom: `${(kase.baselineMsWeek / maxWeekMs) * 100}%` }} title={`Baseline ${money(kase.baselineMsWeek)}`} />
            {weeks.map(w => (
              <div key={w.start} className={'cw-col' + (w.current ? ' cur' : '')} title={`${fmtH(w.ms)}${costable ? ` · ${fmtGBP(w.ms * factor)}` : ''}`}>
                <span className="cw-flag">{closedFlagWeeks.has(w.start) ? '⚑' : ''}</span>
                <span className="cw-bar" style={{ height: `${Math.max(2, (w.ms / maxWeekMs) * 100)}%`, background: workspace.color }} />
                <span className="cw-lbl">{w.current ? 'now' : w.label}</span>
              </div>
            ))}
          </div>
        )}
        <p className="sub">— baseline · - - target · ⚑ a fix closed that week. The last 3 full weeks average <b>{money(nowMsWeek)}</b>.</p>
      </section>

      {/* ── analysis ── */}
      <section className="case-box">
        <h2 className="case-box-h">What's inside it</h2>
        {topSlices.length === 0 ? <p className="sub">{plural(node.rows.length, 'observation')} — drilled to the bottom; the evidence lives in Analyse.</p> : (
          <>
            {topSlices.map(sl => (
              <div key={sl.key} className="mt-bar-row">
                <span className="mt-bar" style={{ width: `${Math.round(sl.share * 100)}%`, background: workspace.color }} />
                <span className="mt-bar-lbl">{sl.key} · {Math.round(sl.share * 100)}%{costable ? ` · ${fmtGBP(sl.value * factor)}` : ` · ${fmtH(sl.value)}`}</span>
              </div>
            ))}
            {node.disagreement?.message && <p className="sub" style={{ marginTop: 6 }}>⚑ {node.disagreement.message}</p>}
          </>
        )}
        <button className="linkish no-print" style={{ marginTop: 8 }}
          onClick={() => nav(buildAnalyseHash(workspace.id, 'analyse', 'time', kase.path, BOARD_ORDER))}>
          Open in Analyse — drill and evidence ›
        </button>
      </section>

      {/* ── why it happens (the 5-Whys chain) ── */}
      <section className="case-box" data-tour="whys">
        <h2 className="case-box-h">Why it happens</h2>
        <WhyChain whys={kase.whys ?? []} onChange={w => void mutateCase({ whys: w.length ? w : undefined })} />
      </section>

      {/* ── countermeasures ── */}
      <section className="case-box">
        <h2 className="case-box-h">Countermeasures — {openMine.length} open · {closedMine.length} closed</h2>
        {kase.whys?.length ? (
          <p className="case-root">Aimed at the root cause: <b>{kase.whys[kase.whys.length - 1]}</b></p>
        ) : null}
        {mine.length === 0 && <p className="sub">No actions on this case yet. Raise the first one below.</p>}
        {mine.map(s => (
          <div key={s.id} className={'meet-action case-action' + (isOverdue(s) ? ' over' : '') + (s.status === 'closed' ? ' done' : '')}>
            <div className="ma-main">
              <span className="ma-problem">{s.problem}</span>
              <input className="mini-update ma-update no-print" defaultValue={s.latestUpdate ?? ''} placeholder="Latest update…" maxLength={200}
                onBlur={e => { const t = e.target.value.trim(); if (t !== (s.latestUpdate ?? '')) void mutateSnag({ ...s, latestUpdate: t || undefined, latestUpdateAt: t ? Date.now() : undefined }); }} />
              {s.latestUpdate ? <span className="print-only case-upd">↻ {s.latestUpdate}</span> : null}
            </div>
            <div className="ma-controls">
              <select className="mini-select no-print" value={s.status} aria-label="Status"
                onChange={e => { const status = e.target.value as SnagStatus; void mutateSnag({ ...s, status, closedAt: status === 'closed' ? (s.closedAt ?? Date.now()) : undefined }); }}>
                {(['open', 'in_progress', 'closed'] as SnagStatus[]).map(x => <option key={x} value={x}>{SNAG_STATUS_META[x].label}</option>)}
              </select>
              <span className="print-only">{SNAG_STATUS_META[s.status].label}</span>
              <input className="mini-owner no-print" defaultValue={s.owner ?? ''} placeholder="Owner" aria-label="Owner"
                onBlur={e => { const o = e.target.value.trim(); if (o !== (s.owner ?? '')) void mutateSnag({ ...s, owner: o || undefined }); }} />
              {s.owner ? <span className="print-only">· {s.owner}</span> : null}
              <input type="date" className="mini-due no-print" defaultValue={dueToInput(s.dueAt)} aria-label="Due date"
                onChange={e => { const dueAt = dueFromInput(e.target.value); if (dueAt !== s.dueAt) void mutateSnag({ ...s, dueAt }); }} />
              {s.dueAt ? <span className="print-only">· due {dateNice(s.dueAt)}</span> : null}
              <span className="ma-strip"><TimeStrip snag={s} />{dueWord(s) ? <span className={'due-word' + (isOverdue(s) ? ' dw-over' : isDueSoon(s) ? ' dw-soon' : '')}>{dueWord(s)}</span> : null}</span>
            </div>
          </div>
        ))}
        {suggestions.length > 0 && (
          <div className="no-print" style={{ marginTop: 10 }}>
            <p className="sub">Actions already raised on this scope — pull them in?</p>
            {suggestions.map(s => (
              <div key={s.id} className="case-suggest">
                <span className="cs-problem">⚑ {s.problem}{s.owner ? ` — ${s.owner}` : ''}</span>
                <button className="btn" onClick={() => void mutateSnag({ ...s, caseId: kase.id })}>Attach</button>
              </div>
            ))}
          </div>
        )}
        <div className="no-print">
          <ActionComposer wsId={workspace.id} path={kase.path} caseId={kase.id} onRaised={() => void load()} />
        </div>
      </section>

      {/* ── the proof: re-measure the same thing, the same way ── */}
      <section className="case-box" data-tour="proof">
        <h2 className="case-box-h">The proof</h2>
        <ProofBox kase={kase} scopedCount={scoped.length} result={studyResult(kase, scoped)}
          costable={costable} factor={factor} onChange={mutateCase} />
      </section>

      <p className="report-foot">Faultline · case · {workspace.name} · {scopeLabel(kase)}</p>
      <button className="linkish case-delete no-print" onClick={() => void remove()}>Delete this case</button>
    </div>
  );
}
