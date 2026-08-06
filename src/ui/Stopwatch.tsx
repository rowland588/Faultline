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
