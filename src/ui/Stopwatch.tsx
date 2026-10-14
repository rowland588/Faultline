import { useEffect, useState } from 'react';
import { fmtDuration } from '../lib/format';
import { fmtPacks } from '../lib/cost';

/** A live mm:ss readout since `startedAt`. Ticks a few times a second — the
 *  source of truth is the timestamp, so it stays correct across a reload. */
export function Stopwatch({ startedAt }: { startedAt: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(iv);
  }, []);
  return <span className="sw-time">{fmtDuration(Date.now() - startedAt)}</span>;
}

/** What the stop is costing while the stopwatch runs, in its two parts —
 *  never one £ (lib/lineLoss; docs/CAPACITY.md §6): the crew's labour,
 *  elapsed × the line's idle-labour rate, ticking in pence; and, when this
 *  stop stops the line (its bottleneck, or the whole line), the packs not
 *  made at its rated speed. Renders nothing when the line has neither
 *  (never guesses). */
export function CostTicker({ startedAt, perMs, packsPerMs = 0 }: { startedAt: number; perMs: number; packsPerMs?: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, []);
  if (perMs <= 0 && packsPerMs <= 0) return null;
  const ms = Date.now() - startedAt;
  return (
    <div className="cost-ticker" aria-live="off">
      {perMs > 0 && <span className="ct-amount">£{(ms * perMs).toFixed(2)} <small>labour</small></span>}
      {packsPerMs > 0 && <span className="ct-amount">{fmtPacks(ms * packsPerMs)} <small>not made</small></span>}
      <span className="ct-label">this stop has cost, and counting</span>
    </div>
  );
}
