/* "1 video won't play on your other devices."
 *
 * Two things were wrong with how that was being said.
 *
 * FIRST, IT READ AS A BACKUP FAILURE. It is not one. The clip uploaded, it is
 * in the cloud, it is on the other device — that device simply cannot DECODE
 * it. Phones record HEVC; a laptop browser plays such a file's sound and not
 * its picture. Saying "won't play on your other devices" without saying "it is
 * backed up, and safe" turns a playback limit into a scare about lost work.
 *
 * SECOND, ON THE LAPTOP IT WAS A DEAD END. The only thing on offer was an
 * instruction to go and use a different device — no button, nothing to do here,
 * and no way to see the footage in the meantime. Converting genuinely needs a
 * device that can decode the original, so that part stays true; but a screen
 * that can only tell you to leave is a screen that should at least hand you the
 * file. It plays in QuickTime, VLC, Photos — anything that is not a browser.
 *
 * And it lives in one place now, shown both on Walks and on the line's Evidence
 * lens, because a fix you can only find by knowing which screen hides it is a
 * fix most people never apply.
 */
import { useCallback, useEffect, useState } from 'react';
import { findUnportable, repairSegment, canRepairHere } from './repair';
import { getBlob } from '../db';
import { backedUp } from '../cloud/sync';
import { cloudConfigured } from '../cloud/client';
import { plural } from '../lib/format';
import type { Segment } from './types';

interface Progress { index: number; total: number; fraction: number }

export function ConvertBanner({ wsId, tick, onDone }: { wsId: string; tick?: unknown; onDone?: () => void }) {
  const [stuck, setStuck] = useState<Segment[]>([]);
  const [canHere, setCanHere] = useState(false);
  // Whether the clips have actually reached the cloud. "It is backed up" is a
  // claim about someone's only copy of a walk, so it gets checked, never
  // assumed — being wrong about that is worse than saying nothing.
  const [safe, setSafe] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<Progress | null>(null);
  const [msg, setMsg] = useState('');

  const scan = useCallback(async () => {
    const s = await findUnportable(wsId);
    setStuck(s);
    setCanHere(s.length > 0 ? await canRepairHere(s) : false);
    if (!cloudConfigured || s.length === 0) { setSafe(null); return; }
    const flags = await Promise.all(s.map(sg => backedUp(sg.updatedAt ?? sg.createdAt, [sg.videoKey, sg.posterKey])));
    setSafe(flags.every(Boolean));
  }, [wsId]);

  useEffect(() => { let alive = true; void scan().catch(() => { if (alive) setStuck([]); }); return () => { alive = false; }; }, [scan, tick, msg]);

  const run = async () => {
    setMsg('');
    let done = 0, blocked = false;
    for (let i = 0; i < stuck.length; i++) {
      setBusy({ index: i, total: stuck.length, fraction: 0 });
      const outcome = await repairSegment(stuck[i], f => setBusy({ index: i, total: stuck.length, fraction: f }));
      if (outcome === 'converted') done++;
      // No decoder here means no source to convert FROM — stop rather than
      // grind through clips that will each fail the same way.
      if (outcome === 'cannot-decode') { blocked = true; break; }
    }
    setBusy(null);
    onDone?.();
    setMsg(blocked
      ? `Converted ${done}. The rest need the phone that filmed them — this device can't read that format.`
      : done > 0
        ? `Converted ${plural(done, 'video')} — they'll play on every device once this one finishes syncing.`
        : 'Nothing could be converted here.');
  };

  /** Hand over the actual file, so this device is never a dead end: it plays in
   *  QuickTime, VLC or Photos even when no browser will touch it. */
  const download = async (seg: Segment) => {
    const blob = await getBlob(seg.videoKey);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(seg.name || `walk-${seg.sequence}`).replace(/[^\w]+/g, '-').toLowerCase()}.mp4`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (!busy && !msg && stuck.length === 0) return null;

  return (
    <div className="card convert-card">
      {busy ? (
        <>
          <b>Converting video {busy.index + 1} of {busy.total}…</b>
          <p className="sub" style={{ marginTop: 6 }}>Runs at playback speed — keep this screen open.</p>
          <div className="prog"><div className="prog-bar" style={{ width: `${Math.round(busy.fraction * 100)}%` }} /></div>
        </>
      ) : msg ? (
        <>
          <p className="sub">{msg}</p>
          {stuck.length > 0 && canHere && <button className="btn" style={{ marginTop: 10 }} onClick={() => void run()}>Try again</button>}
        </>
      ) : (
        <>
          <b>{plural(stuck.length, 'video')} won’t play on a laptop</b>
          {/* Said first, every time — and only ever said when it is true. */}
          <p className="sub" style={{ marginTop: 6 }}>
            {safe === true
              ? <>{stuck.length === 1 ? 'It is' : 'They are'} backed up and on your other devices. </>
              : safe === false
                ? <>{stuck.length === 1 ? 'It is' : 'They are'} still uploading — keep this device online and it
                    will finish by itself. </>
                : null}
            The marked frames and everything pinned on them play everywhere already. What a laptop can’t do is
            decode the picture: phones film in their own format, so you get the sound and a blank screen.
          </p>
          {canHere ? (
            <>
              {/* This device can do it, so it already is — the strip at the
                  bottom of the screen is the same job. Saying "press Convert"
                  next to something converting by itself is how you get two
                  encoders running on one clip. */}
              <p className="sub" style={{ marginTop: 6 }}>
                This device can read {stuck.length === 1 ? 'it' : 'them'}, so it is converting
                {stuck.length === 1 ? ' it' : ' them'} by itself — you should see it working at the bottom of the
                screen. Keep the app open and it finishes on its own; nothing marked is lost. It takes about as
                long as the footage runs.
              </p>
              <button className="btn" style={{ marginTop: 10 }} onClick={() => void run()}>
                Do it now
              </button>
            </>
          ) : (
            <>
              <p className="sub" style={{ marginTop: 6 }}>
                Converting means decoding the original first, and this device can’t — so it happens on the phone
                that filmed {stuck.length === 1 ? 'it' : 'them'}. <b>Just open Faultline on that phone and leave
                it on screen for a minute</b>: it converts by itself and {stuck.length === 1 ? 'the clip' : 'the clips'} will
                play here from then on. Nothing to press. Meanwhile you can still watch
                {stuck.length === 1 ? ' it' : ' them'} here — outside the browser.
              </p>
              <div className="convert-files">
                {stuck.map(s => (
                  <button key={s.id} className="btn" onClick={() => void download(s)}>
                    ⤓ {s.name || `Walk ${s.sequence}`}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
