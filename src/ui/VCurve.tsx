/* THE V-CURVE — every station's capacity as a share of the bottleneck's, in
 * the order the product flows (docs/CAPACITY.md §4; lib/capacity vCurve).
 *
 * The bottleneck sits at the bottom; the line protects it when every station
 * either side is faster by the margin the owner agrees — about 10% a step is
 * the usual starting point, a convention, so it is never drawn until it is
 * set. Two lines: once each station's own stops count (ink), and while it
 * runs (light). Only the abnormal carries colour: a station under the guide
 * is amber — at risk, not yet wrong — and the demand line is red only when
 * the bottleneck cannot meet it. The bottleneck is named in words, never by
 * a state colour. Nothing is stored here but the margin. */
import { useState } from 'react';
import { fmtN, type CapacityResult, type VCurve as V } from '../lib/capacity';

const W = 900, H = 330, L = 54, R = 20, T = 28, B = 66;

export function VCurveView({ r, v, target, margin, canAgree, onMargin }: {
  r: CapacityResult; v: V; target?: number; margin?: number; canAgree: boolean; onMargin: (m: number | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(margin ?? 10));
  if (!v.points.length || !v.limit) return null;
  const lim = v.limit.perMin;
  const tgt = target != null && lim > 0 ? (target / lim) * 100 : undefined;
  const top = Math.ceil((Math.max(150, ...v.points.map(p => Math.max(p.runningPct, p.guide ?? 0)), tgt ?? 0) + 10) / 10) * 10;
  const bottom = Math.min(80, Math.floor((Math.min(...v.points.map(p => p.pct), tgt ?? 100) - 10) / 10) * 10);
  const x = (i: number) => L + (i + 0.5) * ((W - L - R) / v.points.length);
  const y = (p: number) => T + (1 - (p - bottom) / (top - bottom)) * (H - T - B);
  const grid: number[] = [];
  for (let p = bottom; p <= top; p += top - bottom > 120 ? 40 : 20) grid.push(p);
  const short = (s: string) => (s.length > 16 ? `${s.slice(0, 15)}…` : s);
  const over = tgt != null && tgt > 100 + 1e-9;
  const save = () => { const m = Number(draft); onMargin(Number.isFinite(m) && m > 0 && m <= 100 ? m : undefined); setEditing(false); };
  return (
    <div className="vc">
      <div className="vc-box">
        <svg className="vc-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={v.sentence}>
          {grid.map(p => (
            <g key={p}><line className="vc-grid" x1={L} x2={W - R} y1={y(p)} y2={y(p)} /><text className="vc-axis" x={L - 8} y={y(p) + 4} textAnchor="end">{p}%</text></g>
          ))}
          {tgt != null && (
            <g><line className={'vc-target' + (over ? ' is-over' : '')} x1={L} x2={W - R} y1={y(tgt)} y2={y(tgt)} />
              <text className={'vc-axis' + (over ? ' is-over' : '')} x={W - R} y={y(tgt) - 6} textAnchor="end">{over ? `target ${fmtN(target ?? 0)} a min — above the bottleneck` : `target ${fmtN(target ?? 0)} a min`}</text></g>
          )}
          {margin != null && <polyline className="vc-guide" points={v.points.map((p, i) => `${x(i)},${y(p.guide ?? 100)}`).join(' ')} />}
          <polyline className="vc-run" points={v.points.map((p, i) => `${x(i)},${y(p.runningPct)}`).join(' ')} />
          <polyline className="vc-eff" points={v.points.map((p, i) => `${x(i)},${y(p.pct)}`).join(' ')} />
          {v.points.map((p, i) => (
            <g key={p.index}>
              <circle className="vc-ptrun" cx={x(i)} cy={y(p.runningPct)} r={3.5} />
              <circle className={'vc-pt' + (p.isLimit ? ' is-limit' : p.under ? ' is-under' : '')} cx={x(i)} cy={y(p.pct)} r={7} />
              <text className={'vc-val' + (p.under ? ' is-under' : '')} x={x(i)} y={y(p.pct) - 13} textAnchor="middle">{p.isLimit ? '100%' : `${fmtN(Math.round(p.pct))}%`}</text>
              {p.isLimit && <text className="vc-neck" x={x(i)} y={y(p.pct) + 25} textAnchor="middle">BOTTLENECK</text>}
              {p.under && <text className="vc-axis is-under" x={x(i)} y={y(p.pct) + 23} textAnchor="middle">under the V</text>}
              <text className="vc-lab" x={x(i)} y={H - B + 22} textAnchor="middle"><title>{p.name}</title>{short(p.name)}</text>
              <text className="vc-axis" x={x(i)} y={H - B + 38} textAnchor="middle">{fmtN(p.perMin)} {r.unit}/min</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="vc-key">
        <span><i className="vc-k is-eff" /> once its own stops count</span>
        <span><i className="vc-k is-run" /> while running</span>
        {margin != null && <span><i className="vc-k is-guide" /> the V: {fmtN(margin)}% faster a step</span>}
        <span className="sub">as a share of the bottleneck, in {r.unit} a minute</span>
      </p>
      <p className={'vc-says' + (v.under.length ? ' is-a' : '')}>{v.sentence}</p>
      <div className="vc-margin">
        {margin != null && !editing && <span className="sub">Agreed: each station {fmtN(margin)}% faster a step away from the bottleneck.</span>}
        {canAgree && !editing && <button type="button" className="linkish" onClick={() => { setDraft(String(margin ?? 10)); setEditing(true); }}>{margin != null ? 'Change the margin' : 'Set the V’s margin'}</button>}
        {editing && (
          <form className="vc-form" onSubmit={e => { e.preventDefault(); save(); }}>
            <label className="field"><span className="field-label">Faster a step away from the bottleneck, %</span>
              <input className="text-input" inputMode="decimal" value={draft} autoFocus onChange={e => setDraft(e.target.value)} aria-label="The V's margin in percent" /></label>
            <span className="sub">About 10% a step is the usual starting point on an accumulation line — a convention, not a law: change it to what your line needs.</span>
            <span className="vc-form-act">
              <button type="submit" className="btn btn-primary">Agree it</button>
              {margin != null && <button type="button" className="btn" onClick={() => { onMargin(undefined); setEditing(false); }}>Take it off</button>}
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Leave it</button>
            </span>
          </form>
        )}
      </div>
    </div>
  );
}
