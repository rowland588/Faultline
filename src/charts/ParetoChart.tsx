/* The Pareto — hand-built SVG. Ranked bars + the cumulative curve + the 80%
 * line; the vital few carry the accent, the trivial many recede. Every bar is a
 * tap target: tap it to drill one level deeper. Empty data draws nothing loud. */
import type { Pareto } from '../engine/pareto';
import { fmtDuration } from '../lib/format';

const W = 360;
const H = 244;
const padT = 16;
const padB = 54;
const padX = 12;

function short(s: string, n = 10): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function ParetoChart({ pareto, color, onDrill, canDrill }: {
  pareto: Pareto;
  color: string;
  onDrill?: (key: string) => void;
  canDrill?: boolean;
}) {
  const slices = pareto.slices;
  if (slices.length === 0) return null;

  const plotW = W - padX * 2;
  const plotH = H - padT - padB;
  const maxVal = slices[0].value;
  const n = slices.length;
  const colW = plotW / n;
  const barW = Math.min(52, colW * 0.6);

  const fmtVal = (v: number) => (pareto.measure === 'time' ? fmtDuration(v) : String(Math.round(v)));

  const x = (i: number) => padX + colW * i + colW / 2;
  const yTop = (v: number) => padT + plotH * (1 - v / maxVal);
  const yCum = (c: number) => padT + plotH * (1 - c);

  const cumPts = slices.map((s, i) => `${x(i)},${yCum(s.cumShare)}`).join(' ');
  const y80 = yCum(0.8);

  return (
    <svg className="pareto" viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={`Pareto by ${pareto.dimension}, ${pareto.measure}`}>
      {/* 80% line */}
      <line x1={padX} x2={W - padX} y1={y80} y2={y80} className="pareto-80" />
      <text x={W - padX} y={y80 - 4} className="pareto-80-lbl" textAnchor="end">80%</text>

      {slices.map((s, i) => {
        const bx = x(i) - barW / 2;
        const by = yTop(s.value);
        const bh = padT + plotH - by;
        const tappable = !!(onDrill && canDrill);
        return (
          <g key={s.key} className={'pareto-col' + (tappable ? ' tappable' : '')}
            onClick={tappable ? () => onDrill!(s.key) : undefined}>
            {/* full-height hit area */}
            {tappable && <rect x={x(i) - colW / 2} y={padT} width={colW} height={plotH + 8} fill="transparent" />}
            <rect className={'pareto-bar' + (s.isVitalFew ? ' vital' : '')} x={bx} y={by} width={barW} height={Math.max(1, bh)}
              rx={4} style={s.isVitalFew ? { fill: color } : undefined} />
            <text x={x(i)} y={by - 5} className="pareto-val" textAnchor="middle">{fmtVal(s.value)}</text>
            <text x={x(i)} y={H - padB + 18} className="pareto-lbl" textAnchor="middle">{short(s.key)}</text>
            <text x={x(i)} y={H - padB + 33} className="pareto-cum" textAnchor="middle">{Math.round(s.cumShare * 100)}%</text>
          </g>
        );
      })}

      {/* cumulative curve */}
      <polyline className="pareto-cumline" points={cumPts} />
      {slices.map((s, i) => <circle key={s.key} cx={x(i)} cy={yCum(s.cumShare)} r={2.6} className="pareto-cumdot" />)}
    </svg>
  );
}
