import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';

export interface Pin { id: string; xPct: number; yPct: number; color: string; label?: string; n?: number; active?: boolean; }

/** A large image you can pinch-zoom/pan, with coloured pins anchored by
 *  x/y PERCENTAGE. Tap empty space to place (unless readOnly); tap a pin to open
 *  it. Pins keep a ~44px touch target by counter-scaling against the zoom. */
export default function PinImage({ src, pins, onPlace, onPinTap, readOnly, alt = '' }: {
  src?: string | null;
  pins: Pin[];
  onPlace?: (xPct: number, yPct: number) => void;
  onPinTap?: (id: string) => void;
  readOnly?: boolean;
  alt?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; moved: boolean } | null>(null);

  const clampScale = (s: number) => Math.min(5, Math.max(1, s));
  const zoomBy = (f: number) => setScale(s => {
    const next = clampScale(Math.round(s * f * 100) / 100);
    if (next === 1) { setTx(0); setTy(0); } // snapped back to fit → recentre
    return next;
  });

  const onPointerDown = (e: RPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale, moved: true };
    } else gesture.current = { dist: 0, scale, moved: false };
  };
  const onPointerMove = (e: RPointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const prev = ptrs.current.get(e.pointerId)!;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2 && gesture.current) {
      const [a, b] = [...ptrs.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.dist > 0) setScale(clampScale(gesture.current.scale * (dist / gesture.current.dist)));
      gesture.current.moved = true;
    } else if (ptrs.current.size === 1 && scale > 1) {
      setTx(v => v + (e.clientX - prev.x));
      setTy(v => v + (e.clientY - prev.y));
      if (gesture.current) gesture.current.moved = true;
    }
  };
  const onPointerUp = (e: RPointerEvent) => {
    ptrs.current.delete(e.pointerId);
    if (scale === 1) { setTx(0); setTy(0); }
  };

  const onImgClick = (e: React.MouseEvent) => {
    if (readOnly || !onPlace || gesture.current?.moved) return;
    const el = imgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const xPct = ((e.clientX - r.left) / r.width) * 100;
    const yPct = ((e.clientY - r.top) / r.height) * 100;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
    onPlace(Math.round(xPct * 100) / 100, Math.round(yPct * 100) / 100);
  };

  const display = deOverlap(pins);
  const hit = 44 / scale, dot = 24 / scale;

  return (
    // When NOT zoomed, allow normal vertical page scrolling over the image (a
    // one-finger drag scrolls the page past it). Only once zoomed do we take over
    // touch to pan the image — otherwise the tall still would trap the scroll.
    <div className="pin-wrap" style={{ touchAction: scale > 1 ? 'none' : 'pan-y' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onDoubleClick={() => { setScale(s => (s > 1 ? 1 : 2)); setTx(0); setTy(0); }}>
      <div className="pin-layer" style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
        {src
          ? <img ref={imgRef} className="pin-img" src={src} alt={alt} draggable={false} onClick={onImgClick} />
          : <div className="pin-img pin-img-empty">still not available</div>}
        {display.map(p => (
          <button key={p.id} type="button" className={'pin-dot' + (p.active ? ' active' : '')} title={p.label}
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, width: hit, height: hit }}
            onClick={ev => { ev.stopPropagation(); onPinTap?.(p.id); }}>
            <span className="pin-core" style={{ width: dot, height: dot, background: p.color, fontSize: 12.5 / scale }}>{p.n ?? ''}</span>
          </button>
        ))}
      </div>
      <div className="pin-zoom" onPointerDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
        <button type="button" aria-label="Zoom out" disabled={scale <= 1} onClick={e => { e.stopPropagation(); zoomBy(1 / 1.5); }}>−</button>
        <button type="button" aria-label="Zoom in" disabled={scale >= 5} onClick={e => { e.stopPropagation(); zoomBy(1.5); }}>＋</button>
      </div>
      {scale > 1 && <button className="pin-reset" onClick={() => { setScale(1); setTx(0); setTy(0); }}>Reset</button>}
    </div>
  );
}

/** Nudge pins within 5% of an earlier one so both stay tappable — display only. */
function deOverlap(pins: Pin[]): Pin[] {
  const placed: { x: number; y: number }[] = [];
  return pins.map(p => {
    let x = p.xPct, y = p.yPct, ring = 0;
    while (placed.some(q => Math.hypot(q.x - x, q.y - y) < 5) && ring < 12) {
      ring++;
      const ang = ring * 1.9;
      x = p.xPct + Math.cos(ang) * (3 + ring);
      y = p.yPct + Math.sin(ang) * (3 + ring);
    }
    x = Math.max(1, Math.min(99, x)); y = Math.max(1, Math.min(99, y));
    placed.push({ x, y });
    return { ...p, xPct: x, yPct: y };
  });
}
