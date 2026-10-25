/* RELIABILITY GROWTH ON THE PAGE (knowledge/specs/FC-061-reliability-growth.md)
 * — is the new machine getting better, and when will it reach its MTBF?
 * Failures against running hours with the fitted curve and the steady rate,
 * the sentence, the table and what was not run. Every figure and sentence is
 * the module's (growth.ts), the same one the paper reads. */
import { plural } from './words';
import { GROWTH_CAVEATS, growthRows, growthSays, type GrowthFigures } from './growth';
import { LeanPanel } from '../../ui/Lean';

const niceStep = (max: number, parts = 4): number => {
  const raw = max / parts, p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9))), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

/** The steps as they came, the fitted curve dashed, a steady rate dotted. */
function GrowthFigure({ g, points, event }: { g: GrowthFigures; points: readonly { h: number; n: number }[]; event: string }) {
  const W = 360, H = 200, L = 34, B = 28, T = 10, R = 10;
  const xMax = Math.max(g.hours, 1e-6), yMax = Math.max(points.length, ...g.curve.map(c => c.n), 1);
  const x = (h: number) => L + (h / xMax) * (W - L - R), y = (n: number) => T + (1 - n / yMax) * (H - T - B);
  let step = `M${x(0)},${y(0)}`;
  for (const q of points) step += ` H${x(q.h)} V${y(q.n)}`;
  step += ` H${x(g.hours)}`;
  const curve = g.curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.h)},${y(c.n)}`).join(' ');
  const xs = niceStep(xMax), ys = Math.max(1, Math.round(niceStep(yMax)));
  return (
    <figure className="rl-fig rl-growthfig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${points.length} ${plural(event, points.length)} against ${+g.hours.toFixed(1)} running hours, with the fitted growth curve`}>
        {Array.from({ length: Math.floor(yMax / ys) + 1 }, (_, i) => i * ys).map(v => (
          <g key={`y${v}`}><line className="ln-grid-l" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text className="ln-ax" x={L - 5} y={y(v) + 3} textAnchor="end">{v}</text></g>
        ))}
        {Array.from({ length: Math.floor(xMax / xs) + 1 }, (_, i) => i * xs).map(v => (
          <text key={`x${v}`} className="ln-ax rl-axx" x={x(v)} y={H - B + 13}>{+v.toFixed(1)}</text>
        ))}
        <line className="rl-steady rl-steady-dot" x1={x(0)} y1={y(0)} x2={x(g.hours)} y2={y(points.length)} />
        <path className="rl-fit" d={curve} />
        <path className="rl-step" d={step} />
        {points.map(p => <circle key={p.n} className="rl-dot" cx={x(p.h)} cy={y(p.n)} r={2.4}><title>{`${p.n} at ${+p.h.toFixed(2)} running hours`}</title></circle>)}
        <text className="ln-ax rl-axx" x={(L + W - R) / 2} y={H - 4}>running hours</text>
      </svg>
      <figcaption className="ln-legend"><span className="ln-key rl-key-step" aria-hidden /> {plural(event)} as they came · <span className="ln-key rl-key-fit" aria-hidden /> the fitted curve · <span className="ln-key rl-key-steady" aria-hidden /> a steady rate</figcaption>
    </figure>
  );
}

export function GrowthPanel({ g, points, event }: { g: GrowthFigures; points: readonly { h: number; n: number }[]; event: string }) {
  const said = growthSays(event, g);
  const rows = growthRows(g);
  return (
    <LeanPanel title="Reliability growth" className="ln-solo rl-growth-p">
      <p className={'rl-say2 is-' + said.tone} data-growth>{said.text}</p>
      {g.beta !== undefined && <GrowthFigure g={g} points={points} event={event} />}
      {rows.length > 0 && (
        <table className="rl-days rl-growth-t">
          <tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody>
        </table>
      )}
      <ul className="rl-caveats">{GROWTH_CAVEATS.map(c => <li key={c} className="sub">{c}</li>)}</ul>
    </LeanPanel>
  );
}
