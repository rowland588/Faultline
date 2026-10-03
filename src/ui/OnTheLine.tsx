/* A FIX, ON THE LINE — the filmed walk and the fix as one thing.
 *
 * Rowland: "we had a really good system where evidence was brought in … take
 * videos, with the pictures, press on the picture. At the moment I can't see
 * where it comes into play."
 *
 * It sat in its own tab, beside the gates. Now a fix can be pinned on a frame
 * of that walk: pick the frame, tap where. The fix shows the frame with its
 * dot; the frame shows the fix (snag/AssetScreen); the client report prints
 * the frame with the dot beside the fix. Nothing new to learn — it is the same
 * picture and the same tap the Evidence tab already uses. */
import { useEffect, useState } from 'react';
import type { Test } from '../lib/testing';
import type { SnagAsset } from '../snag/types';
import { framesForProject } from '../db';
import { nav } from '../state/useRoute';
import { useBlobUrl } from '../lib/useBlobUrl';
import { Sheet } from './Sheet';
import PinImage from '../snag/PinImage';
import { Icon } from './Icon';

type Frame = { frame: SnagAsset; wsId: string };

/** The frame, whole, with one dot on it. */
export function PinnedFrame({ stillKey, x, y, onClick }: { stillKey?: string; x: number; y: number; onClick?: () => void }) {
  const url = useBlobUrl(stillKey);
  return (
    <button type="button" className="otl-frame" onClick={onClick} disabled={!onClick}>
      {url ? <img src={url} alt="" /> : <span className="otl-frame-ph">Picture not on this device yet</span>}
      {url && <span className="otl-dot" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden />}
    </button>
  );
}

function Thumb({ f, onPick }: { f: Frame; onPick: () => void }) {
  const url = useBlobUrl(f.frame.stillKey);
  return (
    <button type="button" className="otl-thumb" onClick={onPick}>
      {url ? <img src={url} alt="" /> : <span className="otl-frame-ph">…</span>}
      <span className="otl-thumb-n">{f.frame.name}</span>
    </button>
  );
}

function Placer({ f, start, onPin, onBack }: {
  f: Frame; start?: { x: number; y: number }; onPin: (x: number, y: number) => void; onBack: () => void;
}) {
  const url = useBlobUrl(f.frame.stillKey);
  const [at, setAt] = useState<{ x: number; y: number }>(start ?? { x: 50, y: 50 });
  return (
    <>
      <p className="sub otl-say">Tap the picture where the problem is.</p>
      <PinImage src={url} alt={f.frame.name}
        pins={[{ id: 'here', xPct: at.x, yPct: at.y, color: 'var(--danger)', active: true }]}
        onPlace={(x, y) => setAt({ x, y })} />
      <div className="otl-foot">
        <button className="btn btn-primary" onClick={() => onPin(at.x, at.y)}>Pin it here</button>
        <button className="btn btn-ghost" onClick={onBack}>‹ Another frame</button>
      </div>
    </>
  );
}

export function OnTheLine({ projectId, pin, onSave, quiet }: {
  projectId: string; pin: Test['pin']; onSave: (pin: Test['pin'] | undefined) => void;
  /** Inside a finding's row: no heading, and nothing said when there is
   *  nothing filmed — the row has enough words already. */
  quiet?: boolean;
}) {
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<Frame | null>(null);
  useEffect(() => {
    let live = true;
    void framesForProject(projectId).then(f => { if (live) setFrames(f); });
    return () => { live = false; };
  }, [projectId]);

  if (!frames) return null;
  const pinId = pin?.frameId;
  const pinned = pinId ? frames.find(f => f.frame.id === pinId) : undefined;
  const open = (f?: Frame) => { setChosen(f ?? null); setPicking(true); };

  return (
    <div className="otl">
      {!quiet && <span className="otl-h">On the line</span>}
      {pin && pinned ? (
        <>
          <PinnedFrame stillKey={pinned.frame.stillKey} x={pin.x} y={pin.y}
            onClick={() => nav(`/w/${pinned.wsId}/asset/${pinned.frame.id}`)} />
          <span className="otl-acts">
            <span className="sub">{pinned.frame.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => nav(`/w/${pinned.wsId}/asset/${pinned.frame.id}`)}>Open on the walk ›</button>
            <button className="btn btn-ghost btn-sm" onClick={() => open(pinned)}>Move it</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onSave(undefined)}>Take it off</button>
          </span>
        </>
      ) : pin ? (
        <p className="sub otl-none">
          Pinned on a frame that is not on this device yet — it arrives with the next sync.{' '}
          <button className="cw-link" onClick={() => onSave(undefined)}>Take it off</button>
        </p>
      ) : frames.length > 0 ? (
        <button className="btn otl-add" onClick={() => open()}><Icon name="pin" /> Pin it on the line</button>
      ) : quiet ? null : (
        <p className="sub otl-none">
          Film the line on Install and freeze a frame — then this can be pinned on the picture.{' '}
          <button className="cw-link" onClick={() => nav(`/project/${projectId}/install`)}>Install ›</button>
        </p>
      )}

      <Sheet open={picking} onClose={() => setPicking(false)} title={chosen ? chosen.frame.name : 'Pin it on the line — which frame?'}>
        {chosen ? (
          <Placer f={chosen} start={pin?.frameId === chosen.frame.id ? pin : undefined}
            onBack={() => setChosen(null)}
            onPin={(x, y) => { onSave({ frameId: chosen.frame.id, x, y }); setPicking(false); }} />
        ) : (
          <div className="otl-grid">
            {frames.map(f => <Thumb key={f.frame.id} f={f} onPick={() => setChosen(f)} />)}
          </div>
        )}
      </Sheet>
    </div>
  );
}
