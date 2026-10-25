/* A CALCULATOR'S PICTURE, ON THE SCREEN — drawn from the one description (CalcPicture in ./types) that the paper draws too
 * (lib/report/calcPaper), so the two cannot part. Plain axes, the curve, guides with their words, dots with theirs; no
 * colour carries a meaning (the brand's teal is the curve, graphite the guides) and every mark has its words beside it. */
import type { CalcPicture } from './types';

const W = 440, H = 280, L = 54, R = 18, T = 20, B = 44;

export function CalcPictureView({ pic }: { pic: CalcPicture }) {
  const w = W - L - R, h = H - T - B;
  const xs = (x: number) => L + ((x - pic.x.min) / (pic.x.max - pic.x.min)) * w;
  const ys = (y: number) => T + (1 - (y - pic.y.min) / (pic.y.max - pic.y.min)) * h;
  const right = (x: number) => xs(x) > L + w * 0.62;
  return (
    <figure className="calc-pic">
      <svg className="calc-pic-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${pic.title}. ${pic.caption}`}>
        <title>{pic.title}</title>
        {pic.y.ticks.map(t => (
          <g key={`y${t}`}>
            <line className="calc-pic-grid" x1={L} x2={L + w} y1={ys(t)} y2={ys(t)} />
            <text className="calc-pic-tick" x={L - 6} y={ys(t) + 4} textAnchor="end">{pic.y.fmt(t)}</text>
          </g>
        ))}
        {pic.x.ticks.map(t => (
          <g key={`x${t}`}>
            <line className="calc-pic-axis" x1={xs(t)} x2={xs(t)} y1={T + h} y2={T + h + 4} />
            <text className="calc-pic-tick" x={xs(t)} y={T + h + 17} textAnchor="middle">{pic.x.fmt(t)}</text>
          </g>
        ))}
        <line className="calc-pic-axis" x1={L} x2={L + w} y1={T + h} y2={T + h} />
        <line className="calc-pic-axis" x1={L} x2={L} y1={T} y2={T + h} />
        {pic.horizontals.map(g => (
          <g key={`h${g.y}`}>
            <line className="calc-pic-guide" x1={L} x2={L + w} y1={ys(g.y)} y2={ys(g.y)} />
            <text className="calc-pic-lab" x={L + w - 3} y={ys(g.y) - 4} textAnchor="end">{g.label}</text>
          </g>
        ))}
        {pic.verticals.map(g => (
          <g key={`v${g.x}`}>
            <line className="calc-pic-guide" x1={xs(g.x)} x2={xs(g.x)} y1={T} y2={T + h} />
            <text className="calc-pic-lab" x={xs(g.x) + (right(g.x) ? -4 : 4)} y={T + 11} textAnchor={right(g.x) ? 'end' : 'start'}>{g.label}</text>
          </g>
        ))}
        {pic.lines.map((l, i) => (
          <polyline key={i} className={'calc-pic-line is-' + (l.mark ?? 'brand') + (l.dash ? ' is-dash' : '')} fill="none" points={l.points.map(([x, y]) => `${xs(x).toFixed(1)},${ys(y).toFixed(1)}`).join(' ')} />
        ))}
        {pic.dots.map((d, i) => (
          <g key={`d${i}`}>
            <circle className="calc-pic-dot" cx={xs(d.x)} cy={ys(d.y)} r={4} />
            {d.label && <text className="calc-pic-val" x={xs(d.x) + (right(d.x) ? -8 : 8)} y={ys(d.y) + (d.y > 0.5 ? 14 : -7)} textAnchor={right(d.x) ? 'end' : 'start'}>{d.label}</text>}
          </g>
        ))}
        <text className="calc-pic-ax" x={L + w / 2} y={H - 6} textAnchor="middle">{pic.x.label}</text>
        <text className="calc-pic-ax" x={L} y={11}>{pic.y.label}</text>
      </svg>
      <figcaption className="sub calc-pic-cap"><b>{pic.title}.</b> {pic.caption}</figcaption>
    </figure>
  );
}
