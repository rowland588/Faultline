import { useEffect, useState } from 'react';
import { fmtDuration } from '../lib/format';

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

/** The £ bleeding while the stopwatch runs: elapsed × the workspace's idle-
 *  labour rate, ticking in pence. The number nobody argues with — it's the
 *  same cost model the Pareto and the proof study already use. Renders
 *  nothing when the workspace has no rate (never guesses). */
export function CostTicker({ startedAt, perMs }: { startedAt: number; perMs: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(iv);
  }, []);
  if (perMs <= 0) return null;
  const v = (Date.now() - startedAt) * perMs;
  return (
    <div className="cost-ticker" aria-live="off">
      <span className="ct-amount">£{v.toFixed(2)}</span>
      <span className="ct-label">of idle labour, and counting</span>
    </div>
  );
}
