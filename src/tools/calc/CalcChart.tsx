/* A CALCULATOR'S CHART OF STEPS, ON THE SCREEN — the ASME flow process chart (FC-003): the symbols down the page joined by a line, each step's words
 * and its two figures beside it. Drawn from the one description (CalcChart in ./types) the paper draws too (lib/report/calcPaper). A symbol is told apart by
 * its SHAPE and the letter in it, never by a state colour (tools/flow/symbols). */
import { symbolShape } from '../flow/symbols';
import type { CalcChart } from './types';
import './calcChart.css';

const W = 440, ROW = 26, TOP = 30, SX = 22, WX = 50;
const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function CalcChartView({ chart }: { chart: CalcChart }) {
  const H = TOP + chart.rows.length * ROW + 8;
  const cy = (i: number) => TOP + i * ROW + ROW / 2;
  return (
    <figure className="calc-chart">
      <svg className="calc-chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${chart.title}. ${chart.caption}`}>
        <title>{chart.title}</title>
        <text className="cc-head" x={WX} y={16}>{chart.head[0]}</text>
        <text className="cc-head" x={W - 70} y={16} textAnchor="end">{chart.head[1]}</text>
        <text className="cc-head" x={W - 10} y={16} textAnchor="end">{chart.head[2]}</text>
        {chart.rows.length > 1 && <line className="cc-link" x1={SX} x2={SX} y1={cy(0)} y2={cy(chart.rows.length - 1)} />}
        {chart.rows.map((r, i) => {
          const sh = symbolShape(r.symbol, SX, cy(i), 9);
          return (
            <g key={r.n} data-step={r.n} data-symbol={r.symbol}>
              <line className="cc-row" x1={4} x2={W - 4} y1={TOP + i * ROW} y2={TOP + i * ROW} />
              {'circle' in sh
                ? <circle className={'cc-sym is-' + r.symbol} cx={sh.circle.cx} cy={sh.circle.cy} r={sh.circle.r} />
                : <polygon className={'cc-sym is-' + r.symbol} points={sh.poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />}
              <text className="cc-letter" x={SX} y={cy(i) + 3.5} textAnchor="middle">{r.symbol}</text>
              <text className="cc-what" x={WX} y={cy(i) + 4}><tspan className="cc-n">{r.n}.</tspan> {cut(r.what, 40)}</text>
              <text className="cc-fig" x={W - 70} y={cy(i) + 4} textAnchor="end">{r.time}</text>
              <text className="cc-fig" x={W - 10} y={cy(i) + 4} textAnchor="end">{r.distance}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sub calc-pic-cap"><b>{chart.title}.</b> {chart.caption}</figcaption>
    </figure>
  );
}
