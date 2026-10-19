/* A TIMED BOX ON THE FLOOR — a time taken as it happens, with a tap
 * (lib/flow/definition 'timer'; docs/BLUEPRINT.md §3, the new product).
 *
 * Measured by people, not by sensors (CLAUDE.md): a changeover, a jam
 * cleared, a cycle at the packer, a walk to the store — timed by the person
 * watching it, Start and Stop, and kept in the box's unit (seconds unless the
 * method says minutes or hours). A time is a number like any other box, so
 * every analysis, gate, decision and measure reads it the same; only the
 * taking of it differs. The clock keeps running when the phone locks or the
 * page reloads — its start is kept on the device until it is stopped — and a
 * time can always be typed or corrected by hand. In a log, Lap stops the
 * clock, adds the entry and times the next from the same moment, so cycle
 * after cycle is timed without a gap. */
import { useEffect, useState } from 'react';
import { timerUnit, type FlowField } from '../../lib/flow/definition';
import { clockSaid, timeIn } from '../../lib/flow/timing';
import { fmtNumber } from '../../lib/flow/analysis';
import { Num } from './MethodParts';

const STORE = 'fl-timer:';
const kept = (key: string): number | undefined => {
  try { const v = Number(localStorage.getItem(STORE + key)); return Number.isFinite(v) && v > 0 ? v : undefined; } catch { return undefined; }
};
const keep = (key: string, at: number | undefined) => {
  try { if (at === undefined) localStorage.removeItem(STORE + key); else localStorage.setItem(STORE + key, String(at)); } catch { /* the clock still runs while the page is open */ }
};

export function TimerBox({ f, value, onTime, keepAs, disabled, onLap }: {
  f: FlowField;
  value: number | undefined;
  onTime: (v: number | undefined) => void;
  /** Where the running clock's start is kept on the device — one per box. */
  keepAs: string;
  disabled?: boolean;
  /** In a log: add the entry with this time; true when it was added, so the next is timed from the same moment. */
  onLap?: (v: number) => Promise<boolean>;
}) {
  const unit = timerUnit(f);
  const [from, setFrom] = useState<number | undefined>(() => kept(keepAs));
  const [nowAt, setNowAt] = useState(() => Date.now());
  useEffect(() => { setFrom(kept(keepAs)); }, [keepAs]);
  useEffect(() => {
    if (from === undefined) return;
    const t = window.setInterval(() => setNowAt(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [from]);
  const start = (at = Date.now()) => { keep(keepAs, at); setFrom(at); setNowAt(at); };
  const stop = () => {
    if (from === undefined) return undefined;
    const at = Date.now(), v = timeIn(at - from, unit);
    keep(keepAs, undefined); setFrom(undefined);
    return { v, at };
  };
  const running = from !== undefined;
  return (
    <div className={'fw-timer' + (running ? ' is-running' : '')} data-timer={f.key}>
      {running ? (
        <>
          <b className="fw-timer-clock" role="timer" aria-label={`${f.label}, timing`}>{clockSaid(nowAt - from)}</b>
          <div className="fw-acts">
            <button type="button" className="btn btn-primary fw-timer-b" disabled={disabled} onClick={() => { const r = stop(); if (r) onTime(r.v); }}>Stop</button>
            {onLap && (
              <button type="button" className="btn fw-timer-b" disabled={disabled} onClick={() => {
                const r = stop();
                if (!r) return;
                void onLap(r.v).then(added => { if (added) start(r.at); else onTime(r.v); });
              }}>Lap — add it, time the next</button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => { keep(keepAs, undefined); setFrom(undefined); }}>Cancel</button>
          </div>
        </>
      ) : (
        <div className="fw-timer-idle">
          <button type="button" className="btn btn-primary fw-timer-b" disabled={disabled} aria-label={value === undefined ? `Start timing ${f.label.toLowerCase()}` : `Time ${f.label.toLowerCase()} again`} onClick={() => start()}>
            {value === undefined ? 'Start' : 'Time it again'}
          </button>
          <span className="fw-timer-or sub">{value === undefined ? 'or type it' : `${fmtNumber(value)} ${unit} — correct it`}</span>
          <Num value={value} label={`${f.label} (${unit})`} disabled={disabled} onSave={onTime} />
        </div>
      )}
    </div>
  );
}
