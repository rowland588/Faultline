/* The Pareto — calm by default, comparison on demand. One measure of bars at a
 * time (lost time in the workspace colour, or frequency in slate) picked by the
 * chips above the chart; "Both" overlays the two side-by-side for the
 * disagreement story (rare-but-costly vs frequent-but-quick). Everything is
 * share-of-total on ONE % axis, so heights stay honestly comparable. The
 * cumulative curve + 80% line follow whichever measure you ranked by.
 * A 📷 marks bars with evidence. Numbers sit on the vital-few bars only — the
 * tail keeps its bars and its tooltips but goes quiet. Narrow columns rotate
 * their names so labels can never merge. `compact` (the small per-asset cards)
 * drops the picker and shows lost time only. Beyond a cap the long tail folds
 * into one "+ N more" bar. Every real column is a tap AND keyboard target. */
import { useState } from 'react';

function short(s: string, n = 12): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export interface CompareSlice {
  key: string;
  timeShare: number;   // 0..1
  freqShare: number;   // 0..1
  cumShare: number;    // 0..1 (ranked measure)
  timeLabel: string;   // "6:00"
  costLabel?: string;  // "£11" (only when priced)
  freqLabel: string;   // "6×"
  isVitalFew: boolean;
  media: number;
  tag?: 'costly' | 'frequent'; // the divergence call-out
}

type Slice = CompareSlice & { aggregate?: boolean };
type Show = 'time' | 'freq' | 'both';

const TAG_TEXT: Record<'costly' | 'frequent', string> = {
  costly: 'rare but costly',
  frequent: 'frequent but quick',
};

export function ParetoChart({
  slices, color, rankLabel, onDrill, canDrill, compact = false,
}: {
  slices: CompareSlice[];
  color: string;
  rankLabel: string; // labels the cumulative curve
  onDrill?: (key: string) => void;
  canDrill?: boolean;
  compact?: boolean;
}) {
  // ranked by frequency → open showing frequency bars
  const [picked, setPicked] = useState<Show>(rankLabel.includes('freq') ? 'freq' : 'time');
  const show: Show = compact ? 'time' : picked;

  if (slices.length === 0) return null;

  // Fold the long tail into one "+ N more" bar so labels never collide at scale.
  const MAX = compact ? 8 : 12;
  const tail = slices.length > MAX ? slices.slice(MAX - 1) : [];
  const display: Slice[] = tail.length
    ? [...slices.slice(0, MAX - 1), {
        key: `+ ${tail.length} more`,
        timeShare: tail.reduce((a, s) => a + s.timeShare, 0),
        freqShare: tail.reduce((a, s) => a + s.freqShare, 0),
        cumShare: 1,
        timeLabel: '', freqLabel: '', isVitalFew: false, media: 0, aggregate: true,
      }]
    : slices;

  const n = display.length;

  const W = 440;
  const padL = compact ? 34 : 40;
  const padR = compact ? 34 : 40;
  const padT = compact ? 44 : 50;          // room for the stacked £/time labels + 📷
  const plotH = compact ? 156 : 212;
  const plotW = W - padL - padR;
  const colW = plotW / n;

  // narrow columns rotate their names — the one layout where labels CAN'T merge
  const rot = colW < 52 && n > 4;
  const padB = compact ? (rot ? 58 : 44) : (rot ? 68 : 54);
  const H = padT + plotH + padB;
  const baseY = padT + plotH;

  const both = show === 'both';
  const barW = both ? Math.min(compact ? 24 : 30, colW * 0.28) : Math.min(compact ? 30 : 38, colW * 0.5);
  const gap = Math.min(compact ? 7 : 10, colW * 0.06);

  const cx = (i: number) => padL + colW * i + colW / 2;
  const timeCx = (i: number) => both ? cx(i) - gap / 2 - barW / 2 : cx(i);
  const freqCx = (i: number) => both ? cx(i) + gap / 2 + barW / 2 : cx(i);
  const yShare = (s: number) => baseY - plotH * Math.max(0, Math.min(1, s));

  // calm rule, in-chart: past a few columns, numbers on EVERY bar collide into
  // noise — the vital few keep their figures, the tail goes quiet.
  const numsFor = (s: Slice) => s.isVitalFew || n <= 5;

  const grid = [0, 0.25, 0.5, 0.75, 1];
  const cumPts = display.map((s, i) => `${cx(i)},${yShare(s.cumShare)}`).join(' ');

  const picker = !compact && (
    <div className="pk-picker" role="group" aria-label="Choose what the bars show">
      <button type="button" className={'pk-pick' + (show === 'time' ? ' on' : '')} onClick={() => setPicked('time')}>
        <i className="pk-sw" style={{ background: color }} /> Lost time{display.some(s => s.costLabel) ? ' · £' : ''}
      </button>
      <button type="button" className={'pk-pick' + (show === 'freq' ? ' on' : '')} onClick={() => setPicked('freq')}>
        <i className="pk-sw pk-sw-freq" /> Frequency
      </button>
      <button type="button" className={'pk-pick' + (show === 'both' ? ' on' : '')} onClick={() => setPicked('both')}>
        Both
      </button>
    </div>
  );

  return (
    <div className="pk-wrap">
      {picker}
      <svg className="pk" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Pareto of losses">
        {/* gridlines + left % axis (one axis: everything is share of total) */}
        {grid.map((g, i) => (
          <line key={'g' + i} className={'pk-grid' + (i === 0 ? ' base' : '')} x1={padL} x2={padL + plotW} y1={yShare(g)} y2={yShare(g)} />
        ))}
        {[0, 0.5, 1].map((g, i) => (
          <text key={'a' + i} className="pk-ax" x={padL - 7} y={yShare(g) + 3.2} textAnchor="end">{Math.round(g * 100)}%</text>
        ))}

        {/* 80% reference line */}
        <line className="pk-80" x1={padL} x2={padL + plotW} y1={yShare(0.8)} y2={yShare(0.8)} />
        {!compact && <text className="pk-80-t" x={padL + plotW - 1} y={yShare(0.8) - 5} textAnchor="end">80%</text>}

        {/* bars — the picked measure (or both, side by side). Real columns are interactive. */}
        {display.map((s, i) => {
          const tTop = yShare(s.timeShare);
          const fTop = yShare(s.freqShare);
          const op = s.isVitalFew ? 1 : 0.26;
          const hit = !!(onDrill && canDrill) && !s.aggregate;
          const activate = hit ? () => onDrill!(s.key) : undefined;
          const label = s.aggregate ? `${s.key} categories`
            : `${s.key}: ${s.timeLabel} lost${s.costLabel ? ` (${s.costLabel})` : ''}, ${s.freqLabel}${s.tag ? ` — ${TAG_TEXT[s.tag]}` : ''}${hit ? ' — activate to drill in' : ''}`;
          return (
            <g key={'b' + s.key} className={'pk-col' + (hit ? ' tap' : '')}
              onClick={activate} role={hit ? 'button' : undefined} tabIndex={hit ? 0 : undefined} aria-label={label}
              onKeyDown={hit ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate!(); } }) : undefined}>
              <title>{label}</title>
              {hit && <rect x={cx(i) - colW / 2} y={padT - 30} width={colW} height={plotH + 32} fill="transparent" />}
              {(show !== 'freq') && (
                <rect className="pk-bar-time" x={timeCx(i) - barW / 2} y={tTop} width={barW} height={Math.max(1.5, baseY - tTop)} rx={3.5} style={{ fill: color, opacity: op }} />
              )}
              {(show !== 'time') && (
                <rect className="pk-bar-freq" x={freqCx(i) - barW / 2} y={fTop} width={barW} height={Math.max(1.5, baseY - fTop)} rx={3.5} style={{ opacity: op }} />
              )}
            </g>
          );
        })}

        {/* cumulative curve of the ranked measure */}
        <polyline className="pk-cum" points={cumPts} />
        {display.map((s, i) => <circle key={'cd' + s.key} cx={cx(i)} cy={yShare(s.cumShare)} r={compact ? 2.3 : 2.8} className="pk-cumdot" />)}

        {/* labels + evidence (non-interactive overlay so text never eats a tap) */}
        {display.map((s, i) => {
          const tTop = yShare(s.timeShare);
          const fTop = yShare(s.freqShare);
          const nums = numsFor(s);
          const showT = show !== 'freq';
          const showF = show !== 'time';
          // in Both, a wide time label can run into the freq label when the two
          // bars top out at similar heights — lift the freq figure a row
          const fLift = both && Math.abs(tTop - fTop) < 13 ? 12 : 0;
          // narrow columns: ADJACENT vital-few labels can kiss — lift every
          // other labelled column a row so neighbours never share a baseline
          const vLift = colW < 40 && i % 2 === 1 ? 13 : 0;
          const evTop = showT ? tTop : fTop;
          return (
            <g key={'l' + s.key} style={{ pointerEvents: 'none' }}>
              {s.media > 0 && (
                <g className="pk-ev" transform={`translate(${showT ? timeCx(i) : freqCx(i)}, ${evTop - vLift - (nums && showT && s.costLabel ? 34 : 22)})`}>
                  <rect className="pk-ev-pill" x={s.media > 1 ? -15 : -10} y={-8.5} width={s.media > 1 ? 30 : 20} height={15} rx={7.5} />
                  <g transform={`translate(${s.media > 1 ? -5 : 0}, 0)`}>
                    <rect className="pk-ev-cam" x={-5} y={-2.2} width={10} height={7} rx={1.4} />
                    <rect className="pk-ev-cam" x={-1.8} y={-4} width={3.6} height={2} rx={0.6} />
                    <circle className="pk-ev-lens" cx={0} cy={1.2} r={2} />
                  </g>
                  {s.media > 1 && <text className="pk-ev-ct" x={6.5} y={2.5} textAnchor="middle">{s.media}</text>}
                </g>
              )}
              {nums && showT && s.costLabel && <text className="pk-val-cost" x={timeCx(i)} y={tTop - 19 - vLift} textAnchor="middle">{s.costLabel}</text>}
              {/* the ACTUAL time on every bar — the vital few carry £ + time in
                  full voice; the tail still says its time, just quietly. (In
                  Both, two series of numbers collide, so the tail stays bare.) */}
              {showT && s.timeLabel && (nums
                ? <text className="pk-val-time" x={timeCx(i)} y={tTop - 7 - vLift} textAnchor="middle">{s.timeLabel}</text>
                : !both && <text className="pk-val-time pk-val-dim" x={timeCx(i)} y={tTop - 6 - vLift} textAnchor="middle">{s.timeLabel}</text>)}
              {showF && s.freqLabel && (nums
                ? <text className="pk-val-freq" x={freqCx(i)} y={fTop - 7 - fLift} textAnchor="middle">{s.freqLabel}</text>
                : !both && <text className="pk-val-freq pk-val-dim" x={freqCx(i)} y={fTop - 6} textAnchor="middle">{s.freqLabel}</text>)}
              {rot
                ? <text className={'pk-lbl' + (s.aggregate ? ' pk-lbl-agg' : '')} x={cx(i) + 5} y={baseY + 14}
                    textAnchor="end" transform={`rotate(-35 ${cx(i) + 5} ${baseY + 14})`}>{short(s.key)}</text>
                : <text className={'pk-lbl' + (s.aggregate ? ' pk-lbl-agg' : '')} x={cx(i)} y={baseY + 16} textAnchor="middle">{short(s.key)}</text>}
              {/* the divergence call-out needs the horizontal row; when names are
                  rotated it lives in the bar's tooltip instead */}
              {s.tag && !rot && <text className={'pk-tag ' + s.tag} x={cx(i)} y={baseY + 29} textAnchor="middle">{TAG_TEXT[s.tag]}</text>}
            </g>
          );
        })}

        {/* footnote (full mode only) — the curve's one-line legend lives here */}
        {!compact && (
          <text className="pk-foot" x={W / 2} y={H - 5} textAnchor="middle">─○─ {rankLabel} · bar height = share of total · numbers are the real amounts</text>
        )}
      </svg>
    </div>
  );
}
