/* A CALCULATOR'S TWO-HANDED CHART, ON THE SCREEN — the simo chart of micro-movements (FC-233): one row to a moment down the page, each element a box in its hand's lane with its
 * therblig's code, its words and its seconds. Drawn from the one description (CalcHands in ./types) the paper draws too (lib/report/calcPaper handsBlock). The three kinds of
 * motion are told apart by the box's LINE — heavy and solid for working motion, dashed for motion to question, thin for the rest — never by a state colour. */
import type { CalcHands } from './types';
import './calcHands.css';

const W = 440, ROW = 40, TOP = 30, NUMW = 26, SECW = 52;
/** Words broken into at most two lines of `n` characters, the second cut with an ellipsis. */
export function twoLines(s: string, n: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const out: string[] = [''];
  for (const w of words) {
    const cur = out[out.length - 1];
    if (!cur) out[out.length - 1] = w;
    else if ((cur + ' ' + w).length <= n) out[out.length - 1] = cur + ' ' + w;
    else if (out.length < 2) out.push(w);
    else out[1] = out[1] + ' ' + w;
  }
  return out.map(l => (l.length > n ? `${l.slice(0, n - 1)}…` : l));
}

export function CalcHandsView({ chart }: { chart: CalcHands }) {
  const H = TOP + chart.rows.length * ROW + 8;
  const laneW = (W - NUMW - SECW) / chart.lanes.length;
  const lx = (lane: number): number => NUMW + lane * laneW;
  const chars = Math.max(8, Math.floor((laneW - 44) / 5.6));
  return (
    <figure className="calc-hands">
      <svg className="calc-hands-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${chart.title}. ${chart.caption}`}>
        <title>{chart.title}</title>
        <text className="ch-head" x={4} y={16}>{chart.head[0]}</text>
        {chart.lanes.map((l, i) => <text key={l} className="ch-head" x={lx(i) + 4} y={16}>{l}</text>)}
        <text className="ch-head" x={W - 6} y={16} textAnchor="end">{chart.head[1]}</text>
        {chart.rows.map((r, i) => {
          const y = TOP + i * ROW;
          return (
            <g key={r.n} data-moment={r.n}>
              <line className="ch-row" x1={2} x2={W - 2} y1={y} y2={y} />
              <text className="ch-n" x={4} y={y + 22}>{r.n}.</text>
              {r.cells.map((c, k) => {
                const ls = twoLines(c.what, chars);
                return (
                  <g key={k} data-lane={c.lane} data-code={c.code} data-style={c.style}>
                    <rect className={'ch-box is-' + c.style} x={lx(c.lane) + 4} y={y + 5} width={30} height={18} rx={3} />
                    <text className="ch-code" x={lx(c.lane) + 19} y={y + 17} textAnchor="middle">{c.code}</text>
                    <text className="ch-sec" x={lx(c.lane) + 19} y={y + 35} textAnchor="middle">{c.sec}</text>
                    {ls.map((l, j) => <text key={j} className="ch-what" x={lx(c.lane) + 39} y={y + 15 + j * 12}>{l}</text>)}
                  </g>
                );
              })}
              <text className="ch-fig" x={W - 6} y={y + 22} textAnchor="end">{r.sec}</text>
            </g>
          );
        })}
        <line className="ch-row" x1={2} x2={W - 2} y1={TOP + chart.rows.length * ROW} y2={TOP + chart.rows.length * ROW} />
      </svg>
      <figcaption className="sub calc-pic-cap"><b>{chart.title}.</b> {chart.caption}</figcaption>
    </figure>
  );
}
