/* The Pareto — rebuilt to show BOTH measures at once, because the whole point of
 * Paretoing both ways is to see them disagree. For every category, two bars stand
 * side by side:
 *   · Lost time (the workspace colour) — labelled with its £ cost.
 *   · Frequency (slate) — how often it happened.
 * Both are drawn as share-of-total on ONE % axis (never a second value scale), so
 * their heights are honestly comparable: a tall frequency bar beside a short time
 * bar means "happens a lot, costs little" — and vice-versa. The cumulative curve
 * + 80% line follow whichever measure you ranked by. A 📷 marks bars with evidence.
 * `compact` drops the legend + footnote for the small per-asset charts on the board.
 * Beyond a cap the long tail folds into one "+ N more" bar so labels never collide.
 * Every real column is a tap AND keyboard target: activate to drill in. */

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

  const W = 440;
  const padL = compact ? 34 : 40;
  const padR = compact ? 34 : 40;
  const padT = compact ? 44 : 74;   // full: legend + stacked time/£ labels + evidence
  const padB = compact ? 44 : 54;   // full: category + tag + footnote
  const H = compact ? 244 : 336;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;

  const n = display.length;
  const colW = plotW / n;
  const barW = Math.min(compact ? 24 : 30, colW * 0.28);
  const gap = Math.min(compact ? 7 : 10, colW * 0.06);

  const cx = (i: number) => padL + colW * i + colW / 2;
  const timeCx = (i: number) => cx(i) - gap / 2 - barW / 2;
  const freqCx = (i: number) => cx(i) + gap / 2 + barW / 2;
  const yShare = (s: number) => baseY - plotH * Math.max(0, Math.min(1, s));

  const grid = [0, 0.25, 0.5, 0.75, 1];
  const cumPts = display.map((s, i) => `${cx(i)},${yShare(s.cumShare)}`).join(' ');
  const legFreqX = padL + 118;
  const legCumX = W - padR - 96;

  return (
    <svg className="pk" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Lost time versus frequency">
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

      {/* bars: lost time (colour) + frequency (slate). Real columns are interactive. */}
      {display.map((s, i) => {
        const tTop = yShare(s.timeShare);
        const fTop = yShare(s.freqShare);
        const op = s.isVitalFew ? 1 : 0.26;
        const hit = !!(onDrill && canDrill) && !s.aggregate;
        const activate = hit ? () => onDrill!(s.key) : undefined;
        const label = s.aggregate ? `${s.key} categories`
          : `${s.key}: ${s.timeLabel} lost${s.costLabel ? ` (${s.costLabel})` : ''}, ${s.freqLabel}${hit ? ' — activate to drill in' : ''}`;
        return (
          <g key={'b' + s.key} className={'pk-col' + (hit ? ' tap' : '')}
            onClick={activate} role={hit ? 'button' : undefined} tabIndex={hit ? 0 : undefined} aria-label={label}
            onKeyDown={hit ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate!(); } }) : undefined}>
            <title>{label}</title>
            {hit && <rect x={cx(i) - colW / 2} y={padT - 30} width={colW} height={plotH + 32} fill="transparent" />}
            <rect className="pk-bar-time" x={timeCx(i) - barW / 2} y={tTop} width={barW} height={Math.max(1.5, baseY - tTop)} rx={3.5} style={{ fill: color, opacity: op }} />
            <rect className="pk-bar-freq" x={freqCx(i) - barW / 2} y={fTop} width={barW} height={Math.max(1.5, baseY - fTop)} rx={3.5} style={{ opacity: op }} />
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
        return (
          <g key={'l' + s.key} style={{ pointerEvents: 'none' }}>
            {s.media > 0 && (
              <g className="pk-ev" transform={`translate(${timeCx(i)}, ${tTop - (s.costLabel ? 34 : 22)})`}>
                <rect className="pk-ev-pill" x={s.media > 1 ? -15 : -10} y={-8.5} width={s.media > 1 ? 30 : 20} height={15} rx={7.5} />
                <g transform={`translate(${s.media > 1 ? -5 : 0}, 0)`}>
                  <rect className="pk-ev-cam" x={-5} y={-2.2} width={10} height={7} rx={1.4} />
                  <rect className="pk-ev-cam" x={-1.8} y={-4} width={3.6} height={2} rx={0.6} />
                  <circle className="pk-ev-lens" cx={0} cy={1.2} r={2} />
                </g>
                {s.media > 1 && <text className="pk-ev-ct" x={6.5} y={2.5} textAnchor="middle">{s.media}</text>}
              </g>
            )}
            {s.costLabel && <text className="pk-val-cost" x={timeCx(i)} y={tTop - 19} textAnchor="middle">{s.costLabel}</text>}
            {s.timeLabel && <text className="pk-val-time" x={timeCx(i)} y={tTop - 7} textAnchor="middle">{s.timeLabel}</text>}
            {s.freqLabel && <text className="pk-val-freq" x={freqCx(i)} y={fTop - 7} textAnchor="middle">{s.freqLabel}</text>}
            <text className={'pk-lbl' + (s.aggregate ? ' pk-lbl-agg' : '')} x={cx(i)} y={baseY + 16} textAnchor="middle">{short(s.key)}</text>
            {s.tag && <text className={'pk-tag ' + s.tag} x={cx(i)} y={baseY + 29} textAnchor="middle">{TAG_TEXT[s.tag]}</text>}
          </g>
        );
      })}

      {/* legend + footnote (full mode only) */}
      {!compact && (
        <>
          <g className="pk-legend" style={{ pointerEvents: 'none' }}>
            <rect x={padL} y={13} width={12} height={12} rx={3} style={{ fill: color }} />
            <text x={padL + 17} y={23} className="pk-leg-t">Lost time</text>
            <rect className="pk-freq-sw" x={legFreqX} y={13} width={12} height={12} rx={3} />
            <text x={legFreqX + 17} y={23} className="pk-leg-t">Frequency</text>
            <line className="pk-cum pk-leg-line" x1={legCumX} x2={legCumX + 15} y1={19} y2={19} />
            <circle className="pk-cumdot" cx={legCumX + 7.5} cy={19} r={2.8} />
            <text x={legCumX + 21} y={23} className="pk-leg-t">{rankLabel}</text>
          </g>
          <text className="pk-foot" x={W / 2} y={H - 5} textAnchor="middle">bar height = share of total · numbers are the real amounts</text>
        </>
      )}
    </svg>
  );
}
