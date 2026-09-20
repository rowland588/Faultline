/* ONE LINE, ONE MEASURE, DRAWN — whatever the measure is.
 *
 * This replaced a chart that could only ever draw packs per minute against a Q1
 * target, with a hard-coded strip of four quarters at the foot. It takes a
 * series now: the measure's own name and unit, the readings with the DATES they
 * were taken on, the target for the period in play, and which way is good.
 *
 * WHICH WAY IS GOOD IS THE ONLY NEW THING IT NEEDS TO KNOW, and it is the thing
 * that stops the app congratulating somebody for making more waste.
 *
 * The x axis is TIME, not a week index. A fortnight's gap between two readings
 * is drawn as a fortnight's gap — the old chart spaced every reading evenly and
 * so drew a month of silence as though it were a week.
 *
 * Colours are the validated pair (actual #2b87d4 / target #c26a0a — CVD dE 25.1,
 * normal dE 28.7); the target also carries a dash, so the pair never relies on
 * colour alone. */
import { useState } from 'react';
import { vsTarget } from '../lib/measures';
import type { LineSeries } from '../lib/measures';

const ACTUAL = '#2b87d4';
const TARGET = '#c26a0a';

const W = 560, H = 232, L = 44, R = 66, T = 18, B = 34;

const num = (v: number) => String(Math.round(v * 100) / 100);
const day = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function MeasureChart({ series, who }: {
  series: LineSeries;
  /** The line's name and the people against it — a chart with a name on it is
   *  somebody's number rather than just a number. */
  who?: { name: string; owner?: string; sponsor?: string; variant?: string };
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { measure, points, target, period, across, meeting } = series;
  const unit = measure.unit ?? '';

  /* An empty measure is a real state and says so, rather than drawing an axis
     with nothing on it and leaving the reader to work out which it is. */
  if (points.length === 0) {
    return (
      <div className="pace-chart">
        <div className="pace-chart-head">
          <div>
            <h3 className="pace-chart-title">{who?.name ?? measure.name}</h3>
            <p className="pace-chart-sub">{measure.name}{unit && <> · {unit}</>}</p>
          </div>
        </div>
        <p className="sub mc-empty">
          Nothing recorded yet{target != null && <> · target {num(target)} {unit}{period && <> for {period.name}</>}</>}.
          Add a reading and the chart draws itself.
        </p>
      </div>
    );
  }

  const ts = points.map(p => Date.parse(p.at + 'T12:00:00'));
  const t0 = ts[0], t1 = ts[ts.length - 1];
  const vals = points.map(p => p.value);
  const lo = Math.min(...vals, ...(target != null ? [target] : []));
  const hi = Math.max(...vals, ...(target != null ? [target] : []));
  const span = hi - lo;
  const pad = span > 0 ? span * 0.35 : Math.max(Math.abs(hi) * 0.1, 1);
  const yMin = lo >= 0 ? Math.max(0, lo - pad) : lo - pad;
  const yMax = hi + pad;

  const x = (i: number) => (t1 === t0 ? (L + (W - R)) / 2 : L + ((ts[i] - t0) / (t1 - t0)) * (W - L - R));
  const y = (v: number) => T + ((yMax - v) / (yMax - yMin || 1)) * (H - T - B);

  const gridVals = [yMin, (yMin + yMax) / 2, yMax];
  const last = vals[vals.length - 1];

  /* Both right-hand labels sit on the value they annotate, so when actual lands
   * near target they collide. Push them apart symmetrically — never past the
   * plot edge — so the pair stays legible at any spacing. */
  const tY = target == null ? null : y(target);
  const aY = y(last);
  let tLabelY = tY, aLabelY: number = aY;
  if (tY != null && Math.abs(aY - tY) < 12) {
    const mid = (aY + tY) / 2;
    const up = Math.max(T + 6, mid - 7), dn = Math.min(H - B - 2, mid + 7);
    if (aY <= tY) { aLabelY = up; tLabelY = dn; } else { aLabelY = dn; tLabelY = up; }
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    for (let i = 0; i < points.length; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }
    setHover(best);
  };

  /* Only label the ends and the middle: a reading a day for three months would
     otherwise print ninety overlapping dates. */
  const ticks = points.length <= 2 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <div className="pace-chart">
      <div className="pace-chart-head">
        <div>
          <h3 className="pace-chart-title">{who?.name ?? measure.name}</h3>
          <p className="pace-chart-sub">
            {measure.name}
            {who?.owner && <> · Owner {who.owner}</>}
            {who?.sponsor && <> · Sponsor {who.sponsor}</>}
            {who?.variant && <> · {who.variant}</>}
          </p>
        </div>
        <div className={'pace-chart-delta ' + (meeting == null ? '' : meeting ? 'is-good' : 'is-bad')}>
          <span className="pace-delta-n">{num(last)}</span>
          <span className="pace-delta-u">{unit ? `${unit} latest` : 'latest'}</span>
          <span className="pace-delta-v">{vsTarget(series)}</span>
        </div>
      </div>

      {/* legend — two series, so it is never optional */}
      <div className="pace-legend">
        <span className="pace-key"><span className="pace-swatch" style={{ background: ACTUAL }} />{measure.name}</span>
        {target != null && (
          <span className="pace-key">
            <span className="pace-swatch pace-swatch-dash" style={{ background: TARGET }} />
            {period ? `${period.name} target` : 'Target'} · {num(target)}{unit && ` ${unit}`}
          </span>
        )}
        <span className="pace-key mc-dir">{measure.direction === 'up' ? 'higher is better' : 'lower is better'}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', touchAction: 'none' }}
        role="img"
        aria-label={`${who?.name ?? ''} ${measure.name}${unit ? ` in ${unit}` : ''}, ${points.length} reading${points.length === 1 ? '' : 's'}${target == null ? ', no target set' : `, against a target of ${num(target)}`}`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}
      >
        {/* recessive frame */}
        <g stroke="var(--line)" strokeWidth="1">
          {gridVals.map(v => <line key={v} x1={L} y1={y(v)} x2={W - R} y2={y(v)} strokeDasharray="3 4" />)}
          <line x1={L} y1={H - B} x2={W - R} y2={H - B} />
        </g>
        <g fontSize="10" fill="var(--muted)">
          {gridVals.map(v => <text key={v} x={L - 7} y={y(v) + 3} textAnchor="end">{num(v)}</text>)}
          {ticks.map(i => (
            <text key={i} x={x(i)} y={H - B + 15}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
              {day(points[i].at)}
            </text>
          ))}
        </g>

        {/* target reference — dashed, so colour is not the only cue */}
        {target != null && (
          <>
            <line x1={L} y1={y(target)} x2={W - R} y2={y(target)} stroke={TARGET} strokeWidth="2" strokeDasharray="7 5" />
            <text x={W - R + 6} y={(tLabelY ?? 0) + 3.5} fontSize="10.5" fontWeight="700" fill={TARGET}>Target</text>
          </>
        )}

        {/* the readings, in the order they were taken */}
        <path
          fill="none" stroke={ACTUAL} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          d={'M ' + points.map((p, i) => `${x(i)} ${y(p.value)}`).join(' L ')}
        />
        {points.map((p, i) => (
          <circle key={p.at + i} cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4.5}
            fill={ACTUAL} stroke="var(--surface)" strokeWidth="2" />
        ))}

        {/* direct label on the final reading */}
        <text x={W - R + 6} y={aLabelY + 3.5} fontSize="10.5" fontWeight="700" fill={ACTUAL}>{num(last)}</text>

        {/* hover crosshair */}
        {hover != null && points[hover] && (
          <g>
            <line x1={x(hover)} y1={T} x2={x(hover)} y2={H - B} stroke="var(--ink-2)" strokeWidth="1" opacity="0.35" />
            <rect x={Math.min(W - R - 104, Math.max(L, x(hover) - 52))} y={T + 2} width="104" height="34" rx="6"
              fill="var(--ink)" opacity="0.94" />
            <text x={Math.min(W - R - 52, Math.max(L + 52, x(hover)))} y={T + 15} fontSize="10" fill="#fff" textAnchor="middle">
              {day(points[hover].at)} · {num(points[hover].value)}{unit && ` ${unit}`}
            </text>
            <text x={Math.min(W - R - 52, Math.max(L + 52, x(hover)))} y={T + 28} fontSize="10" fontWeight="700"
              fill={target == null ? '#cfd8e3'
                : (measure.direction === 'up' ? points[hover].value >= target : points[hover].value <= target) ? '#7fd6a0' : '#ffb0a6'}
              textAnchor="middle">
              {target == null ? 'no target' : (() => {
                const m = measure.direction === 'up' ? points[hover].value - target : target - points[hover].value;
                return `${m >= 0 ? '+' : ''}${num(m)} vs target`;
              })()}
            </text>
          </g>
        )}
      </svg>

      {/* the trajectory a window of readings cannot show: every period's target,
          the one in play named — however many periods this business runs. */}
      {across.some(a => a.value != null) && (
        <div className="pace-periods">
          {across.map(a => (
            <div key={a.name} className={'pace-p' + (period?.name === a.name ? ' is-now' : '')}>
              <span className="pace-p-lbl">{a.name}</span>
              <span className="pace-p-val">{a.value == null ? '—' : num(a.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
