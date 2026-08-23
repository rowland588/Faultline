/* THE PORTFOLIO / THE LEDGER — one page holding every Case across every
 * workspace. Two readers, one screen: the CI manager reads it as a portfolio
 * of improvement events (stage, owners, what's moving); the FD reads it as a
 * ledger of outcomes (at stake, proven, receipted). This is the enterprise
 * surface named in PRODUCT.md — and it is NOT a dashboard: it lists
 * improvement work and its evidence, nothing else. Every number derives live
 * from each workspace's own data with each workspace's own £ rate; nothing is
 * stored, so this page can never disagree with the Case pages it links to.
 *
 * Honesty rules: workspaces without a £ rate contribute HOURS, kept separate
 * from the £ totals (never silently mixed); "at stake" is the recent truth
 * (last full weeks) with the baseline as fallback; a study is allowed to have
 * said "no improvement" and that verdict is shown, not hidden. */
import { useEffect, useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { listWorkspaces, listObservations, listCases, snagsForWorkspace } from '../db';
import { useSyncedAt } from '../cloud/session';
import { applyDrill } from '../engine/drill';
import { weeklyLoss } from '../lib/stats';
import { studyResult, provenWin } from '../lib/proof';
import { hasCost, costPerMs, fmtGBP } from '../lib/cost';
import { scopeLabel, caseNowMsWeek } from './CaseScreen';
import { Wordmark } from '../ui/Logo';
import type { Case, Workspace } from '../types';

type Stage = 'working' | 'collecting' | 'proven' | 'failed' | 'closed';

interface Row {
  c: Case;
  ws: Workspace;
  stage: Stage;
  stageLabel: string;          // "study · 6/10", "proven 12 Aug"…
  owners: string[];            // from the actions carrying this caseId
  costable: boolean;
  nowMsWeek: number;           // recent truth (baseline fallback)
  vsBase: number | null;       // ▲/▼ % against the measured baseline
  savedMsWeek?: number;        // proven recoveries only
  factor: number;
}

const dn = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const hrs = (ms: number) => {
  const h = ms / 3600_000;
  return h >= 10 ? `${Math.round(h)} h` : h >= 1 ? `${Math.round(h * 10) / 10} h` : `${Math.round(ms / 60_000)} min`;
};

function CaseRow({ r }: { r: Row }) {
  const money = (ms: number) => (r.costable ? fmtGBP(ms * r.factor) : hrs(ms));
  const ic = r.stage === 'proven' ? '✓' : r.stage === 'failed' ? '✗' : r.stage === 'collecting' ? '🔬' : '📌';
  return (
    <button className={'pf-row pf-' + r.stage} onClick={() => nav(`/w/${r.ws.id}/case/${r.c.id}`)}>
      <span className="pf-ic" aria-hidden>{ic}</span>
      <span className="pf-main">
        <span className="pf-title">{r.c.title}</span>
        <span className="pf-meta">
          <span className="pf-ws"><i style={{ background: r.ws.color }} />{r.ws.name}</span>
          {' · '}{scopeLabel(r.c)} · {r.stageLabel}
          {r.owners.length > 0 && <> · {r.owners.slice(0, 2).join(', ')}{r.owners.length > 2 ? ` +${r.owners.length - 2}` : ''}</>}
        </span>
      </span>
      <span className="pf-money">
        {r.stage === 'proven' && r.savedMsWeek != null ? (
          <><b className="pf-good">{money(r.savedMsWeek)}/wk</b><span>{r.costable ? `${fmtGBP(r.savedMsWeek * r.factor * 52)}/yr banked` : 'recovered'}</span></>
        ) : (
          <>
            <b>{money(r.nowMsWeek)}/wk</b>
            <span>
              at stake{r.vsBase != null && (
                <b className={r.vsBase <= 0 ? ' pf-good' : ' pf-bad'}> {r.vsBase <= 0 ? '▼' : '▲'}{Math.abs(r.vsBase)}%</b>
              )}
            </span>
          </>
        )}
      </span>
    </button>
  );
}

export function PortfolioScreen() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const syncedAt = useSyncedAt();

  useEffect(() => {
    let alive = true;
    (async () => {
      const wss = await listWorkspaces();
      const out: Row[] = [];
      for (const ws of wss) {
        const cases = await listCases(ws.id);
        if (cases.length === 0) continue;
        const [obs, snags] = await Promise.all([listObservations(ws.id), snagsForWorkspace(ws.id)]);
        const live = obs.filter(o => o.deletedAt == null);
        const costable = hasCost(ws);
        const factor = costPerMs(ws);
        for (const c of cases) {
          const scoped = applyDrill(live, ws.id, c.path);
          const now = caseNowMsWeek(weeklyLoss(scoped, ws, 12));
          const nowMsWeek = now > 0 ? now : c.baselineMsWeek;
          const vsBase = c.baselineMsWeek > 0 && now > 0 ? Math.round(((now - c.baselineMsWeek) / c.baselineMsWeek) * 100) : null;
          const r = studyResult(c, scoped);
          const owners = [...new Set(snags.filter(s => s.caseId === c.id && s.status !== 'closed' && s.owner).map(s => s.owner!))];
          let stage: Stage; let stageLabel: string; let savedMsWeek: number | undefined;
          if (c.study?.closedAt && r) {
            if (provenWin(r)) {
              stage = 'proven'; savedMsWeek = r.savedMsWeek!;
              stageLabel = `proven ${dn(c.study.closedAt)}${r.sinceCall?.slipping ? ' · slipping ⚠' : ''}`;
            } else { stage = 'failed'; stageLabel = `called ${dn(c.study.closedAt)} — didn't hold`; }
          } else if (c.study && r) {
            stage = 'collecting'; stageLabel = `study · ${r.afterN}/${r.targetN} samples`;
          } else if (c.status === 'closed') {
            stage = 'closed'; stageLabel = `closed ${dn(c.closedAt ?? c.openedAt)} — no study`;
          } else {
            stage = 'working'; stageLabel = `opened ${dn(c.openedAt)}`;
          }
          out.push({ c, ws, stage, stageLabel, owners, costable, nowMsWeek, vsBase, savedMsWeek, factor });
        }
      }
      if (alive) setRows(out);
    })();
    return () => { alive = false; };
  }, [syncedAt]);

  const groups = useMemo(() => {
    if (!rows) return null;
    return {
      working: rows.filter(r => r.stage === 'working' || r.stage === 'collecting')
        .sort((a, b) => b.nowMsWeek * b.factor - a.nowMsWeek * a.factor),
      proven: rows.filter(r => r.stage === 'proven').sort((a, b) => (b.savedMsWeek ?? 0) * b.factor - (a.savedMsWeek ?? 0) * a.factor),
      failed: rows.filter(r => r.stage === 'failed'),
      closed: rows.filter(r => r.stage === 'closed'),
    };
  }, [rows]);

  // the ledger strip — £ and unpriced hours NEVER silently mixed
  const totals = useMemo(() => {
    if (!groups) return null;
    const stakeGBP = groups.working.filter(r => r.costable).reduce((a, r) => a + r.nowMsWeek * r.factor * 52, 0);
    const stakeMs = groups.working.filter(r => !r.costable).reduce((a, r) => a + r.nowMsWeek * 52, 0);
    const provenGBP = groups.proven.filter(r => r.costable).reduce((a, r) => a + (r.savedMsWeek ?? 0) * r.factor * 52, 0);
    const provenMs = groups.proven.filter(r => !r.costable).reduce((a, r) => a + (r.savedMsWeek ?? 0) * 52, 0);
    return { stakeGBP, stakeMs, provenGBP, provenMs };
  }, [groups]);

  return (
    <div className="wrap home pf-wrap">
      <div className="subhead">
        <button className="btn btn-ghost" onClick={() => nav('/')}>‹ Workspaces</button>
      </div>
      <div className="home-head" style={{ marginTop: 4 }}>
        <Wordmark />
        <p className="eyebrow" style={{ marginTop: 14 }}>The portfolio</p>
        <h1 className="h1">Improvement work, everywhere</h1>
      </div>

      {rows === null ? null : rows.length === 0 ? (
        <p className="sub" style={{ marginTop: 12 }}>
          No Cases yet. Open one from any board — drill to a problem and press 📌 Open a Case.
        </p>
      ) : (
        <>
          {/* the ledger strip: what the FD reads first */}
          {totals && (
            <div className="pf-ledger">
              <div className="pf-stat">
                <b>{fmtGBP(totals.stakeGBP)}<span>/yr</span></b>
                <span className="pf-stat-l">at stake in open work{totals.stakeMs > 0 ? ` (+ ${hrs(totals.stakeMs)}/yr unpriced)` : ''}</span>
              </div>
              <div className="pf-stat pf-stat-good">
                <b>{fmtGBP(totals.provenGBP)}<span>/yr</span></b>
                <span className="pf-stat-l">proven recovered · {groups!.proven.length} receipt{groups!.proven.length === 1 ? '' : 's'}{totals.provenMs > 0 ? ` (+ ${hrs(totals.provenMs)}/yr unpriced)` : ''}</span>
              </div>
              <div className="pf-stat">
                <b>{groups!.working.length}</b>
                <span className="pf-stat-l">case{groups!.working.length === 1 ? '' : 's'} being worked</span>
              </div>
            </div>
          )}

          {groups!.working.length > 0 && (
            <>
              <p className="eyebrow pf-sec">Being worked</p>
              <div className="pf-list">{groups!.working.map(r => <CaseRow key={r.c.id} r={r} />)}</div>
            </>
          )}
          {groups!.proven.length > 0 && (
            <>
              <p className="eyebrow pf-sec">The receipts</p>
              <div className="pf-list">{groups!.proven.map(r => <CaseRow key={r.c.id} r={r} />)}</div>
            </>
          )}
          {groups!.failed.length > 0 && (
            <>
              <p className="eyebrow pf-sec">Called — didn't hold</p>
              <div className="pf-list">{groups!.failed.map(r => <CaseRow key={r.c.id} r={r} />)}</div>
              <p className="sub" style={{ marginTop: 6 }}>An honest ✗ is what makes every ✓ above worth believing.</p>
            </>
          )}
          {groups!.closed.length > 0 && (
            <>
              <p className="eyebrow pf-sec">Closed without a study</p>
              <div className="pf-list">{groups!.closed.map(r => <CaseRow key={r.c.id} r={r} />)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
