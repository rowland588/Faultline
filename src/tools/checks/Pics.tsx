/* THE LOG'S PICTURES — evidence the method uses, never decoration (knowledge/STANDARD.md): a value against its
 * limits point by point, and a scored checklist's audits against the score to reach. Plain SVG; the words under each
 * are the module's (checks.valueSays, says.logInsights), so a person who cannot see the colour is told the same. */
import type { LogCheck } from '../../lib/study';
import type { ValueTrend } from './checks';
import type { ScoreSeries } from './figures';
import { dayOf } from './says';

const W = 360, H = 150, L = 38, R = 8, T = 12, B = 22;

const fmt = (v: number): string => `${+v.toFixed(2)}`;

/** A value's readings in the order taken, the limits dashed, a reading outside them marked with its word. */
export function ValuePic({ check, trend, label }: { check: LogCheck; trend: ValueTrend; label: string }) {
  const pts = trend.points;
  if (!pts.length) return null;
  const vs = [...pts.map(p => p.v), ...(check.lo !== undefined ? [check.lo] : []), ...(check.hi !== undefined ? [check.hi] : [])];
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const pad = Math.max((hi - lo) * 0.12, Math.abs(hi) * 0.002, 1e-9);
  lo -= pad; hi += pad;
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const x = (i: number) => L + (pts.length === 1 ? (W - L - R) / 2 : (i / (pts.length - 1)) * (W - L - R));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return (
    <figure className="lg-pic">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="lg-svg">
        {check.hi !== undefined && <g><line className="lg-lim is-hi" x1={L} x2={W - R} y1={y(check.hi)} y2={y(check.hi)} /><text className="lg-lbl" x={L - 4} y={y(check.hi) + 3} textAnchor="end">{fmt(check.hi)}</text></g>}
        {check.lo !== undefined && <g><line className="lg-lim is-lo" x1={L} x2={W - R} y1={y(check.lo)} y2={y(check.lo)} /><text className="lg-lbl" x={L - 4} y={y(check.lo) + 3} textAnchor="end">{fmt(check.lo)}</text></g>}
        <path className="lg-line" d={path} />
        {pts.map((p, i) => <circle key={p.at} className={'lg-pt' + (p.bad ? ' is-bad' : '')} data-point cx={x(i)} cy={y(p.v)} r={p.bad ? 4 : 3} />)}
        <text className="lg-lbl" x={L} y={H - 6}>{dayOf(pts[0].at)}</text>
        <text className="lg-lbl" x={W - R} y={H - 6} textAnchor="end">{dayOf(pts[pts.length - 1].at)}</text>
      </svg>
      <figcaption className="sub">{pts.length} reading{pts.length === 1 ? '' : 's'}{check.unit ? ` in ${check.unit}` : ''}; the dashed lines are the limits{pts.some(p => p.bad) ? '; a reading outside them is drawn larger and is a failure' : ''}.</figcaption>
    </figure>
  );
}

/** A scored checklist's audits as bars (the score of each), the score to reach as a dashed line. */
export function ScorePic({ series }: { series: ScoreSeries }) {
  const bars = series.audits.filter(a => a.figures.pct !== undefined);
  if (!bars.length) return null;
  const bw = Math.min(40, (W - L - R) / bars.length * 0.6), slot = (W - L - R) / bars.length;
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  return (
    <figure className="lg-pic">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${series.check.name}: ${bars.map(b => `${Math.round(b.figures.pct ?? 0)}%`).join(', ')}`} className="lg-svg">
        {[0, 50, 100].map(g => <g key={g}><line className="lg-grid" x1={L} x2={W - R} y1={y(g)} y2={y(g)} /><text className="lg-lbl" x={L - 4} y={y(g) + 3} textAnchor="end">{g}%</text></g>)}
        {series.check.passPct !== undefined && <line className="lg-lim is-hi" x1={L} x2={W - R} y1={y(series.check.passPct)} y2={y(series.check.passPct)} />}
        {bars.map((b, i) => {
          const pct = b.figures.pct ?? 0, cx = L + slot * i + slot / 2, last = i === bars.length - 1;
          return (
            <g key={b.result.id}>
              <rect className={'lg-bar' + (last ? ' is-now' : '')} data-audit x={cx - bw / 2} y={y(pct)} width={bw} height={Math.max(1, y(0) - y(pct))} />
              <text className="lg-lbl" x={cx} y={y(pct) - 3} textAnchor="middle">{Math.round(pct)}%</text>
              {bars.length <= 8 && <text className="lg-lbl" x={cx} y={H - 6} textAnchor="middle">{dayOf(b.result.at)}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="sub">The score of each audit{series.check.passPct !== undefined ? `; the dashed line is the ${series.check.passPct}% to reach` : ''}.</figcaption>
    </figure>
  );
}
