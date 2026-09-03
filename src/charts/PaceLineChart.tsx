/* PPM per line — actual against the quarter's target.
 *
 * Two series, so a legend is always present and both are direct-labelled at the
 * right-hand end. Colours are the validated pair (actual #2b87d4 / target
 * #c26a0a — CVD dE 25.1, normal dE 28.7); the target also carries a dash, so the
 * pair never relies on colour alone.
 *
 * A missing week BREAKS the line. Interpolating across it would draw a
 * measurement that was never taken. */
import { useState } from 'react';
import type { PaceLine } from '../lib/projectPaceData';

const ACTUAL = '#2b87d4';
const TARGET = '#c26a0a';

const W = 560, H = 232, L = 38, R = 66, T = 18, B = 34;

/** Contiguous runs of real readings — the gaps are what we refuse to bridge. */
function runs(weekly: (number | null)[]): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  weekly.forEach((v, i) => {
    if (v == null) { if (cur.length) out.push(cur); cur = []; }
    else cur.push(i);
  });
  if (cur.length) out.push(cur);
  return out;
}

export function PaceLineChart({ line }: { line: PaceLine }) {
  const [hover, setHover] = useState<number | null>(null);
  const weeks = line.weekly;
  const n = weeks.length;
  const target = line.q1;

  const vals = weeks.filter((v): v is number => v != null);
  const lo = Math.min(target, ...vals), hi = Math.max(target, ...vals);
  const pad = Math.max(4, (hi - lo) * 0.35);
  const yMin = Math.floor(lo - pad), yMax = Math.ceil(hi + pad);

  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, n - 1);
  const y = (v: number) => T + ((yMax - v) / (yMax - yMin)) * (H - T - B);

  const gridVals = [yMin, Math.round((yMin + yMax) / 2), yMax];
  const segs = runs(weeks);
  const missing = weeks.map((v, i) => (v == null ? i : -1)).filter(i => i >= 0);

  const last = vals.length ? vals[vals.length - 1] : null;
  const delta = last == null ? null : last - target;

  /* Both right-hand labels sit on the value they annotate, so when actual lands
   * near target they collide. Push them apart symmetrically — never past the
   * plot edge — so the pair stays legible at any spacing. */
  const tY = y(target);
  const aY = last == null ? null : y(last);
  let tLabelY = tY, aLabelY = aY;
  if (aY != null && Math.abs(aY - tY) < 12) {
    const mid = (aY + tY) / 2;
    const up = Math.max(T + 6, mid - 7), dn = Math.min(H - B - 2, mid + 7);
    if (aY <= tY) { aLabelY = up; tLabelY = dn; } else { aLabelY = dn; tLabelY = up; }
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }
    setHover(best);
  };

  return (
    <div className="pace-chart">
      <div className="pace-chart-head">
        <div>
          <h3 className="pace-chart-title">{line.name}</h3>
          {line.variant && <p className="pace-chart-sub">{line.variant}</p>}
        </div>
        <div className={'pace-chart-delta ' + (delta == null ? '' : delta >= 0 ? 'is-good' : 'is-bad')}>
          {last == null ? '—' : (
            <>
              <span className="pace-delta-n">{last}</span>
              <span className="pace-delta-u">ppm latest</span>
              <span className="pace-delta-v">{delta! >= 0 ? '+' : ''}{delta!.toFixed(0)} vs Q1 target</span>
            </>
          )}
        </div>
      </div>

      {/* legend — two series, so it is never optional */}
      <div className="pace-legend">
        <span className="pace-key"><span className="pace-swatch" style={{ background: ACTUAL }} />Actual</span>
        <span className="pace-key"><span className="pace-swatch pace-swatch-dash" style={{ background: TARGET }} />Q1 target · {target} ppm</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', touchAction: 'none' }}
        role="img" aria-label={`${line.name}: weekly packs per minute against a Q1 target of ${target}`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}
      >
        {/* recessive frame */}
        <g stroke="var(--line)" strokeWidth="1">
          {gridVals.map(v => <line key={v} x1={L} y1={y(v)} x2={W - R} y2={y(v)} strokeDasharray="3 4" />)}
          <line x1={L} y1={H - B} x2={W - R} y2={H - B} />
        </g>
        <g fontSize="10" fill="var(--muted)">
          {gridVals.map(v => <text key={v} x={L - 7} y={y(v) + 3} textAnchor="end">{v}</text>)}
          {weeks.map((_, i) => <text key={i} x={x(i)} y={H - B + 15} textAnchor="middle">W{i + 1}</text>)}
        </g>

        {/* target reference — dashed, so colour is not the only cue */}
        <line x1={L} y1={y(target)} x2={W - R} y2={y(target)} stroke={TARGET} strokeWidth="2" strokeDasharray="7 5" />
        <text x={W - R + 6} y={tLabelY + 3.5} fontSize="10.5" fontWeight="700" fill={TARGET}>Target</text>

        {/* a week with no reading: marked, never bridged */}
        {missing.map(i => (
          <g key={i}>
            <line x1={x(i)} y1={T} x2={x(i)} y2={H - B} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 3" />
            <text x={x(i)} y={T + 9} fontSize="9" fill="var(--muted)" textAnchor="middle">no data</text>
          </g>
        ))}

        {/* actual — one path per unbroken run */}
        {segs.map((run, si) => (
          <path
            key={si} fill="none" stroke={ACTUAL} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
            d={'M ' + run.map(i => `${x(i)} ${y(weeks[i]!)}`).join(' L ')}
          />
        ))}
        {weeks.map((v, i) => v == null ? null : (
          <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 6 : 4.5}
            fill={ACTUAL} stroke="var(--surface)" strokeWidth="2" />
        ))}

        {/* direct label on the final reading */}
        {aLabelY != null && (
          <text x={W - R + 6} y={aLabelY + 3.5} fontSize="10.5" fontWeight="700" fill={ACTUAL}>{last}</text>
        )}

        {/* hover crosshair */}
        {hover != null && weeks[hover] != null && (
          <g>
            <line x1={x(hover)} y1={T} x2={x(hover)} y2={H - B} stroke="var(--ink-2)" strokeWidth="1" opacity="0.35" />
            <rect x={Math.min(W - R - 92, Math.max(L, x(hover) - 46))} y={T + 2} width="92" height="34" rx="6"
              fill="var(--ink)" opacity="0.94" />
            <text x={Math.min(W - R - 46, Math.max(L + 46, x(hover)))} y={T + 15} fontSize="10" fill="#fff" textAnchor="middle">
              Week {hover + 1} · {weeks[hover]} ppm
            </text>
            <text x={Math.min(W - R - 46, Math.max(L + 46, x(hover)))} y={T + 28} fontSize="10" fontWeight="700"
              fill={weeks[hover]! >= target ? '#7fd6a0' : '#ffb0a6'} textAnchor="middle">
              {weeks[hover]! - target >= 0 ? '+' : ''}{(weeks[hover]! - target).toFixed(0)} vs target
            </text>
          </g>
        )}
      </svg>

      {/* the trajectory the weekly window cannot show */}
      <div className="pace-quarters">
        {([['Q1', line.q1], ['Q2', line.q2], ['Q3', line.q3], ['Q4', line.q4]] as const).map(([q, v], i) => (
          <div key={q} className={'pace-q' + (i === 0 ? ' is-now' : '')}>
            <span className="pace-q-lbl">{q}</span>
            <span className="pace-q-val">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
