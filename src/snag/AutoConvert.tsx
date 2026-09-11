/* The bit that actually does it, and the one line of chrome that admits it.
 *
 * Mounted once for the whole signed-in app rather than on a screen, because the
 * work is not about the screen you are looking at: the phone that filmed Line 7
 * should fix Line 7's footage whether you are on the walk, the board or the
 * project page. Wandering off a screen must not abandon the job halfway.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { findConvertible, forgetVerdict, markPortable, type Stuck } from './autoConvert';
import { repairSegment } from './repair';
import { getSegment } from '../db';
import { useSyncedAt } from '../cloud/session';

type Phase =
  | { k: 'idle' }
  | { k: 'working'; name: string; done: number; total: number; fraction: number }
  | { k: 'finished'; n: number };

export function AutoConvert() {
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const [off, setOff] = useState(false);          // "Not now" — for this session only
  const running = useRef(false);
  const stop = useRef(false);
  const syncedAt = useSyncedAt();

  const run = useCallback(async () => {
    if (running.current || off) return;
    running.current = true;
    stop.current = false;
    try {
      const { mine } = await findConvertible();
      if (mine.length === 0) return;

      let done = 0;
      for (const item of mine as Stuck[]) {
        // Only while the app is actually on screen: re-encoding runs at
        // playback speed, and a phone that gets hot in your pocket for reasons
        // nobody explained is a phone that gets force-quit.
        if (stop.current || document.visibilityState !== 'visible') break;
        const name = item.seg.name || `Walk ${item.seg.sequence}`;
        setPhase({ k: 'working', name, done, total: mine.length, fraction: 0 });
        const oldKey = item.seg.videoKey;
        const outcome = await repairSegment(item.seg, f =>
          setPhase({ k: 'working', name, done, total: mine.length, fraction: f }));
        await forgetVerdict(oldKey);
        if (outcome === 'converted') {
          done++;
          // Trust our own encoder and never look at this clip again, so a
          // disagreement between what we write and what we sniff can't turn
          // into an endless re-encode.
          const fresh = await getSegment(item.seg.id);
          if (fresh?.videoKey) await markPortable(fresh.videoKey);
        }
        // Cannot decode after all — the verdict was wrong, and grinding through
        // the rest would fail the same way. Leave them to the phone that can.
        if (outcome === 'cannot-decode') break;
      }
      setPhase(done > 0 ? { k: 'finished', n: done } : { k: 'idle' });
      if (done > 0) window.setTimeout(() => setPhase({ k: 'idle' }), 9000);
    } catch {
      setPhase({ k: 'idle' });                    // never let this break the app
    } finally {
      running.current = false;
    }
  }, [off]);

  // On open, whenever a sync lands (footage can arrive from another device),
  // and whenever the app comes back to the front after being put away.
  useEffect(() => {
    const t = window.setTimeout(() => { void run(); }, 4000);   // let the app settle first
    const onVis = () => { if (document.visibilityState === 'visible') void run(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', onVis); };
  }, [run, syncedAt]);

  if (off || phase.k === 'idle') return null;

  return (
    <div className="autoconv" role="status">
      {phase.k === 'working' ? (
        <>
          <span className="autoconv-main">
            <b>Making “{phase.name}” play on your other devices</b>
            <span className="sub">
              {phase.total > 1 ? `${phase.done + 1} of ${phase.total} · ` : ''}
              Runs at the speed of the footage · keep the app open
            </span>
          </span>
          <div className="autoconv-prog"><div className="autoconv-bar" style={{ width: `${Math.round(phase.fraction * 100)}%` }} /></div>
          <button className="autoconv-x" onClick={() => { stop.current = true; setOff(true); }} aria-label="Stop converting">Not now</button>
        </>
      ) : (
        <span className="autoconv-main">
          <b>{phase.n === 1 ? 'That walk' : `${phase.n} walks`} will play on every device now</b>
          <span className="sub">Backing up the converted {phase.n === 1 ? 'copy' : 'copies'} — nothing else to do.</span>
        </span>
      )}
    </div>
  );
}
