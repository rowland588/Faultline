/* The Pareto — hand-built SVG, built to be read across a boardroom.
 *   · bars = the primary measure (time / count / £), ranked descending; the vital
 *     few carry the workspace colour, the trivial many recede to the same hue faded.
 *   · the cumulative curve + the 80% line frame the vital few (the classic Pareto).
 *   · every bar is DUAL-LABELLED — the ranked measure on the bar, the paired measure
 *     (time↔frequency) beneath it — so magnitude and frequency are read together
 *     without a forbidden second value axis. When they disagree, the banner says so.
 *   · a 📷 badge marks bars that have evidence behind them.
 * Every bar is a tap target: tap to drill in. */
import type { Pareto } from '../engine/pareto';

const W = 428;
const H = 320;
const padL = 46;
const padR = 42;
const padT = 66;   // roomy top margin: legend + value + evidence badge all clear
const padB = 56;
const plotW = W - padL - padR;
const plotH = H - padT - padB;
const baseY = padT + plotH;

function short(s: string, n = 11): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export interface SecondaryInfo { value: number; share: number }

export function ParetoChart({
  pareto, color, fmtPrimary, fmtSecondary,
  secondaryByKey, mediaByKey, primaryLegend, secondaryLegend, onDrill, canDrill,
}: {
  pareto: Pareto;
  color: string;
  fmtPrimary: (v: number) => string;
  fmtSecondary: (v: number) => string;
  secondaryByKey: Record<string, SecondaryInfo>;
  mediaByKey: Record<string, number>;
  primaryLegend: string;
  secondaryLegend: string;
  onDrill?: (key: string) => void;
  canDrill?: boolean;
}) {
  const slices = pareto.slices;
  if (slices.length === 0) return null;

  const maxVal = slices[0].value;
  const n = slices.length;
  const colW = plotW / n;
  const barW = Math.min(54, colW * 0.6);

  const x = (i: number) => padL + colW * i + colW / 2;
  const yVal = (v: number) => baseY - plotH * (maxVal > 0 ? v / maxVal : 0);
  const yPct = (p: number) => baseY - plotH * p; // p in 0..1 — shares top & baseline with the value axis

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map(f => f * maxVal);
  const cumPts = slices.map((s, i) => `${x(i)},${yPct(s.cumShare)}`).join(' ');
  const tappable = !!(onDrill && canDrill);
  const legRX = W - padR - 108;

  return (
    <svg className="pk" viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={`Pareto by ${pareto.dimension}, ${primaryLegend}`}>
      {/* horizontal gridlines (both axes share top = max = 100% and baseline = 0) */}
      {gridVals.map((v, i) => (
        <line key={'g' + i} className={'pk-grid' + (i === 0 ? ' base' : '')} x1={padL} x2={padL + plotW} y1={yVal(v)} y2={yVal(v)} />
      ))}

      {/* left value axis (label the ends + middle) */}
      {[0, 2, 4].map(i => (
        <text key={'l' + i} className="pk-ax" x={padL - 10} y={yVal(gridVals[i]) + 3.4} textAnchor="end">{fmtPrimary(gridVals[i])}</text>
      ))}
      {/* right cumulative % axis */}
      {[0, 0.5, 1].map((p, i) => (
        <text key={'r' + i} className="pk-ax pk-ax-r" x={padL + plotW + 10} y={yPct(p) + 3.4} textAnchor="start">{Math.round(p * 100)}%</text>
      ))}

      {/* 80% reference line */}
      <line className="pk-80" x1={padL} x2={padL + plotW} y1={yPct(0.8)} y2={yPct(0.8)} />
      <text className="pk-80-t" x={padL + plotW - 2} y={yPct(0.8) - 5} textAnchor="end">80%</text>

      {/* bars */}
      {slices.map((s, i) => {
        const by = yVal(s.value);
        return (
          <rect key={'bar' + s.key} className={'pk-bar' + (s.isVitalFew ? ' vital' : '')}
            x={x(i) - barW / 2} y={by} width={barW} height={Math.max(2, baseY - by)} rx={4} ry={4}
            style={{ fill: color, opacity: s.isVitalFew ? 1 : 0.24 }} />
        );
      })}

      {/* cumulative curve (rides the % axis) */}
      <polyline className="pk-cum" points={cumPts} />
      {slices.map((s, i) => <circle key={'cd' + s.key} cx={x(i)} cy={yPct(s.cumShare)} r={3} className="pk-cumdot" />)}

      {/* per-bar text: value on the bar, evidence badge above, category + paired measure beneath */}
      {slices.map((s, i) => {
        const by = yVal(s.value);
        const sec = secondaryByKey[s.key];
        const media = mediaByKey[s.key] ?? 0;
        const cx = x(i);
        return (
          <g key={'lab' + s.key} className={'pk-col' + (tappable ? ' tap' : '')}
            onClick={tappable ? () => onDrill!(s.key) : undefined}>
            {tappable && <rect x={cx - colW / 2} y={padT - 30} width={colW} height={plotH + 32} fill="transparent" />}
            {media > 0 && (
              <g className="pk-ev" transform={`translate(${cx}, ${by - 27})`}>
                <rect className="pk-ev-pill" x={media > 1 ? -16 : -11} y={-9} width={media > 1 ? 32 : 22} height={16} rx={8} />
                {/* crisp vector camera (emoji won't recolour) */}
                <g transform={`translate(${media > 1 ? -6 : 0}, 0)`}>
                  <rect className="pk-ev-cam" x={-5.5} y={-2.4} width={11} height={7.6} rx={1.5} />
                  <rect className="pk-ev-cam" x={-2} y={-4.4} width={4} height={2.2} rx={0.6} />
                  <circle className="pk-ev-lens" cx={0} cy={1.3} r={2.2} />
                </g>
                {media > 1 && <text className="pk-ev-ct" x={7} y={2.7} textAnchor="middle">{media}</text>}
              </g>
            )}
            <text className="pk-val" x={cx} y={by - 8} textAnchor="middle">{fmtPrimary(s.value)}</text>
            <text className="pk-lbl" x={cx} y={baseY + 17} textAnchor="middle">{short(s.key)}</text>
            {sec && <text className="pk-sub" x={cx} y={baseY + 31} textAnchor="middle">{fmtSecondary(sec.value)}</text>}
          </g>
        );
      })}

      {/* legend */}
      <g className="pk-legend">
        <rect x={padL} y={13} width={12} height={12} rx={3} style={{ fill: color }} />
        <text x={padL + 17} y={23} className="pk-leg-t">{primaryLegend}</text>
        <line className="pk-cum pk-leg-line" x1={legRX} x2={legRX + 16} y1={19} y2={19} />
        <circle className="pk-cumdot" cx={legRX + 8} cy={19} r={3} />
        <text x={legRX + 22} y={23} className="pk-leg-t">cumulative %</text>
      </g>

      {/* footnote: what the small figure under each bar is */}
      <text className="pk-foot" x={W / 2} y={H - 5} textAnchor="middle">
        figure under each bar = {secondaryLegend.toLowerCase()}
      </text>
    </svg>
  );
}
