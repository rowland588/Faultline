/* "Is it getting better?" — the proof screen. The Pareto says where the pain
 * is; this says whether the walks are changing anything: lost hours per week
 * falling (or not), green flags on the weeks a snag was closed, and an honest
 * list of which losses are moving and which just sit there. */
import { useMemo } from 'react';
import { useWorkspace } from '../state/WorkspaceProvider';
import { nav } from '../state/useRoute';
import { snagsForWorkspace } from '../db';
import { useEffect, useState } from 'react';
import { weeklyLoss, headline, categoryTrends, closedEvents, type ClosedEvent, type WeekPoint } from '../lib/stats';
import { fmtGBP } from '../lib/cost';
import { useSyncedAt } from '../cloud/session';
import { EmptyState } from '../ui/EmptyState';
import type { Snag } from '../snag/types';

const fmtH = (ms: number) => {
  const h = ms / 3600_000;
  return h >= 10 ? `${Math.round(h)} h` : h >= 1 ? `${(Math.round(h * 10) / 10)} h` : `${Math.round(ms / 60_000)} min`;
};

export function TrendScreen() {
  const { workspace, observations } = useWorkspace();
  const [snags, setSnags] = useState<Snag[]>([]);
  const syncedAt = useSyncedAt();
  useEffect(() => { void snagsForWorkspace(workspace.id).then(setSnags); }, [workspace.id, syncedAt]);

  const weeks = useMemo(() => weeklyLoss(observations, workspace), [observations, workspace]);
  const kpi = useMemo(() => headline(weeks, workspace), [weeks, workspace]);
  const cats = useMemo(() => categoryTrends(observations, workspace), [observations, workspace]);
  const flags = useMemo(() => closedEvents(snags, weeks), [snags, weeks]);

  const enough = observations.length > 0 && weeks.filter(w => w.ms > 0).length >= 2;

  return (
    <div className="wrap">
      <div className="subhead">
        <button className="btn btn-ghost" onClick={() => nav(`/w/${workspace.id}/analyse`)}>‹ Analyse</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => nav(`/w/${workspace.id}/report`)}>📄 One-page report</button>
      </div>

      <p className="eyebrow">The proof</p>
      <h1 className="h1">Is it getting better?</h1>
      <p className="sub" style={{ marginTop: 4 }}>Lost time per week, and what changed it.</p>

      {!enough ? (
        <EmptyState icon="📈" title="Not enough history yet">
          The trend starts telling the truth after a couple of weeks of logging.
          Keep capturing — every entry lands on this chart.
        </EmptyState>
      ) : (
        <>
          <div className="kpi-row">
            <div className="kpi-card">
              <b>{fmtH(kpi.lastWeekMs)}</b>
              {kpi.deltaPct != null && (
                <span className={kpi.deltaPct <= 0 ? 'kpi-good' : 'kpi-bad'}>
                  {kpi.deltaPct <= 0 ? '▼' : '▲'} {Math.abs(kpi.deltaPct)}% vs 4-wk avg
                </span>
              )}
              <span className="kpi-lbl">lost last week</span>
            </div>
            {kpi.costable && (
              <div className="kpi-card">
                <b>{fmtGBP(kpi.lastWeekCost)}</b>
                {kpi.deltaPct != null && (
                  <span className={kpi.deltaPct <= 0 ? 'kpi-good' : 'kpi-bad'}>
                    {kpi.deltaPct <= 0 ? '▼' : '▲'} {Math.abs(kpi.deltaPct)}%
                  </span>
                )}
                <span className="kpi-lbl">cost of loss, last week</span>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="field-label">Lost hours by week</div>
            <p className="sub" style={{ margin: '2px 0 6px' }}>Green flags mark the week a snag was closed.</p>
            <TrendChart weeks={weeks} flags={flags} />
            <div className="trend-legend">
              <span><i style={{ background: 'var(--brand)' }} /> lost hours</span>
              <span><i style={{ background: 'var(--ok)' }} /> snag closed</span>
            </div>
          </div>

          {cats.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="field-label">Which losses are moving</div>
              <p className="sub" style={{ margin: '2px 0 8px' }}>Last 3 weeks vs the 3 before.</p>
              {cats.slice(0, 5).map(c => (
                <div key={c.category} className="cat-trend-row">
                  <div className="cat-trend-main">
                    <b>{c.category}</b>
                    <span className="sub">
                      {fmtH(c.msPerWeek)}/wk{c.costPerWeek > 0 ? ` · ${fmtGBP(c.costPerWeek)}/wk` : ''}
                      {c.changePct != null ? ` · ${c.changePct <= 0 ? '▼' : '▲'} ${Math.abs(c.changePct)}%` : ''}
                    </span>
                  </div>
                  <span className={'cat-verdict ' + c.verdict}>
                    {c.verdict === 'improving' ? '▼ WORKING' : c.verdict === 'worsening' ? '▲ WORSE' : '⚠ FLAT'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** The run chart, as inline SVG — no chart library, just the data. */
function TrendChart({ weeks, flags }: { weeks: WeekPoint[]; flags: ClosedEvent[] }) {
  const W = 440, H = 240, L = 40, R = 10, T = 24, B = 40;
  const maxMs = Math.max(...weeks.map(w => w.ms), 1);
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(weeks.length - 1, 1);
  const y = (ms: number) => T + (1 - ms / maxMs) * (H - T - B);
  const pts = weeks.map((w, i) => `${x(i)} ${y(w.ms)}`);
  const gridYs = [0.25, 0.5, 0.75].map(f => T + f * (H - T - B));
  const hoursAt = (f: number) => fmtH(maxMs * (1 - f));

  // A flag belongs to its week; only the two most recent get a text label so
  // a busy chart never turns into overlapping bubbles — the rest stay dots.
  const flagPts = flags.map(f => {
    const i = weeks.findIndex((w, idx) => f.at >= w.start && (idx === weeks.length - 1 || f.at < weeks[idx + 1].start));
    return i >= 0 ? { i, label: f.label } : null;
  }).filter(Boolean) as Array<{ i: number; label: string }>;
  const labelFrom = Math.max(0, flagPts.length - 2);

  // sparse x labels: first, middle, last
  const ticks = weeks.length > 1 ? [0, Math.floor((weeks.length - 1) / 2), weeks.length - 1] : [0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }} role="img" aria-label="Lost hours by week">
      <g stroke="var(--line)" strokeWidth="1">
        <line x1={L} y1={T} x2={L} y2={H - B} />
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} />
        {gridYs.map(gy => <line key={gy} x1={L} y1={gy} x2={W - R} y2={gy} strokeDasharray="3 4" />)}
      </g>
      <g fontSize="10" fill="var(--muted)">
        {gridYs.map((gy, gi) => <text key={gy} x={4} y={gy + 3}>{hoursAt([0.25, 0.5, 0.75][gi])}</text>)}
        {ticks.map(i => <text key={i} x={x(i) - 10} y={H - B + 16}>{weeks[i].label}</text>)}
      </g>
      <path d={`M ${pts.join(' L ')} L ${x(weeks.length - 1)} ${H - B} L ${x(0)} ${H - B} Z`} fill="rgba(var(--accent-rgb), 0.10)" />
      <path d={`M ${pts.join(' L ')}`} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {weeks.map((w, i) => <circle key={w.start} cx={x(i)} cy={y(w.ms)} r="4" fill="var(--brand)" />)}
      {flagPts.map(({ i, label }, n) => {
        const hasText = n >= labelFrom;
        const lift = 6 + (n % 2) * 26;             // alternate label rows
        const text = '✓ ' + truncate(label, 22);
        const tx = Math.min(x(i), W - R - (12 + text.length * 5.6)); // keep inside the frame
        return (
          <g key={`${i}-${n}`}>
            <line x1={x(i)} y1={y(weeks[i].ms)} x2={x(i)} y2={hasText ? lift + 17 : y(weeks[i].ms) - 10} stroke="var(--ok)" strokeWidth="1.5" />
            <circle cx={x(i)} cy={y(weeks[i].ms)} r="4.5" fill="var(--ok)" />
            {hasText && (
              <>
                <rect x={tx} y={lift} width={12 + text.length * 5.6} height={17} rx={8.5} fill="rgba(14,159,110,0.12)" />
                <text x={tx + 7} y={lift + 12} fontSize="10.5" fontWeight="700" fill="var(--ok)">{text}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
