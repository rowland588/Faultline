/* The week on one page — what gets printed, PDF'd, or put under a manager's
 * nose on a Monday. Everything derives from the workspace's own rows via
 * lib/stats, so every number here agrees with Trend and Analyse. Print uses
 * the browser's own dialog (Save as PDF included) — no server, no export lib. */
import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { snagsForWorkspace } from '../db';
import { useSyncedAt } from '../cloud/session';
import { weeklyLoss, headline } from '../lib/stats';
import { fmtGBP, costPerMs } from '../lib/cost';
import { fmtDurationWords } from '../lib/format';
import { LogoMark } from '../ui/Logo';
import { ageDays, type Snag } from '../snag/types';

const WEEK_MS = 7 * 24 * 3600_000;

type Paper = 'A4' | 'A3';

export function ReportScreen() {
  const { workspace, observations } = useWorkspace();
  const [snags, setSnags] = useState<Snag[]>([]);
  // A4 for the desk, A3 for the line-side board. The choice writes an @page
  // rule so the browser's print dialog is pre-set to the right sheet, and the
  // A3 class scales the content ~√2 so it FILLS the bigger paper rather than
  // sitting in a small column of it.
  const [paper, setPaper] = useState<Paper>('A4');
  const syncedAt = useSyncedAt();
  useEffect(() => { void snagsForWorkspace(workspace.id).then(setSnags); }, [workspace.id, syncedAt]);

  const weeks = useMemo(() => weeklyLoss(observations, workspace), [observations, workspace]);
  const kpi = useMemo(() => headline(weeks, workspace), [weeks, workspace]);
  const factor = costPerMs(workspace);

  // "This week" on the report = the last 7 days, live.
  const from = Date.now() - WEEK_MS;
  const recent = observations.filter(o => o.startedAt >= from);
  const byCat = new Map<string, number>();
  for (const o of recent) byCat.set(o.category, (byCat.get(o.category) ?? 0) + o.durationMs);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxMs = cats[0]?.[1] ?? 1;
  const totalMs = recent.reduce((a, o) => a + o.durationMs, 0);

  const open = snags.filter(s => s.status !== 'closed').sort((a, b) => a.raisedAt - b.raisedAt);
  const stale = open.filter(s => ageDays(s.raisedAt) > 30);
  const closedThisWeek = snags.filter(s => s.status === 'closed' && (s.closedAt ?? 0) >= from);

  const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`report-stage paper-${paper}`}>
      <style>{`@page { size: ${paper} portrait; margin: 12mm; }`}</style>
      <div className="report-actions no-print">
        <button className="btn btn-ghost" onClick={() => nav(`/w/${workspace.id}/trend`)}>‹ Back</button>
        <div style={{ flex: 1 }} />
        <div className="paper-toggle" role="group" aria-label="Paper size">
          {(['A4', 'A3'] as Paper[]).map(sz => (
            <button key={sz} className={'pt' + (paper === sz ? ' on' : '')} onClick={() => setPaper(sz)}>{sz}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print / save PDF</button>
      </div>

      <div className="report-page">
        <div className="report-head">
          <span className="report-brand"><LogoMark size={28} /> Faultline</span>
          <span className="report-meta">LINE HEALTH<br />{workspace.name} · {today}</span>
        </div>

        <h1 className="report-h1">{workspace.name} — the week on one page</h1>
        <p className="report-sub">Everything below comes from walks and floor logs. No manual reporting.</p>

        <div className="report-stats">
          <div className="rstat">
            <b>{fmtDurationWords(kpi.lastWeekMs) || '0 min'}</b><span>lost last week</span>
            {kpi.deltaPct != null && <em className={kpi.deltaPct <= 0 ? 'good' : 'bad'}>{kpi.deltaPct <= 0 ? '▼' : '▲'} {Math.abs(kpi.deltaPct)}% vs 4-wk avg</em>}
          </div>
          {kpi.costable && (
            <div className="rstat"><b>{fmtGBP(kpi.lastWeekCost)}</b><span>cost of loss</span></div>
          )}
          <div className="rstat">
            <b>{open.length}</b><span>open snags</span>
            {stale.length > 0 && <em className="bad">{stale.length} stale (30d+)</em>}
          </div>
          <div className="rstat">
            <b>{closedThisWeek.length}</b><span>closed this week</span>
            {closedThisWeek.length > 0 && <em className="good">keep going</em>}
          </div>
        </div>

        <div className="report-cols">
          <div>
            <h2 className="report-h2">Where the time went <span className="report-note">last 7 days</span></h2>
            {cats.length === 0 ? <p className="report-empty">Nothing logged this week.</p> : cats.map(([cat, ms], i) => (
              <div className="rbar" key={cat}>
                <span className="rbar-lbl">{cat}</span>
                <span className="rbar-track" style={{ width: `${Math.max(8, (ms / maxMs) * 160)}px`, background: i === 0 ? '#fb923c' : 'var(--brand)' }} />
                <span className="rbar-val">{fmtDurationWords(ms)}{factor > 0 ? ` · ${fmtGBP(ms * factor)}` : ''}</span>
              </div>
            ))}
            {totalMs > 0 && <p className="report-note" style={{ marginTop: 8 }}>Total {fmtDurationWords(totalMs)}{factor > 0 ? ` · ${fmtGBP(totalMs * factor)}` : ''} across {recent.length} entries.</p>}
          </div>

          <div>
            <h2 className="report-h2">Snags needing a push</h2>
            {open.length === 0 ? <p className="report-empty">None open. 🎉</p> : open.slice(0, 4).map(s => (
              <div className="rsnag" key={s.id}>
                <span>{s.problem}</span>
                <span className={'rbadge ' + (ageDays(s.raisedAt) > 30 ? 'bad' : ageDays(s.raisedAt) > 7 ? 'warn' : 'new')}>
                  {ageDays(s.raisedAt) <= 1 ? 'new' : `${ageDays(s.raisedAt)} days`}
                </span>
              </div>
            ))}

            {closedThisWeek.length > 0 && (
              <>
                <h2 className="report-h2" style={{ marginTop: 16 }}>Closed this week ✓</h2>
                {closedThisWeek.slice(0, 5).map(s => (
                  <div className="rsnag" key={s.id}>
                    <span>{s.problem}</span>
                    <span className="rbadge good">{s.owner || '✓'}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="report-foot">
          <span>Faultline — live data; open the app to act on any of it</span>
          <span>{today}</span>
        </div>
      </div>
    </div>
  );
}
