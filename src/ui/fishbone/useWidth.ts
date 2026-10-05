import { useLayoutEffect, useRef, useState } from 'react';

/** The width an element is given, kept current — the fish is laid out in real
 *  pixels so its words stay their true size at every width, rather than a
 *  drawing scaled until the text is too small to read or too big to fit. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(Math.floor(el.clientWidth));
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : undefined;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  return [ref, w];
}

/** The room inside an element — its width and height less padding and any
 *  scroll bar — kept current, through a callback ref so it follows the
 *  element however late it mounts. The fishbone page hands the fish the room
 *  under its bar and the fish grows into it; when the fish is taller than
 *  that and its frame scrolls, the bar's width comes off the drawing rather
 *  than pushing the head out sideways. 0 × 0 until measured. */
export function useInnerBox<T extends HTMLElement>(): [(el: T | null) => void, { w: number; h: number }] {
  const [el, setEl] = useState<T | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!el) { setBox(b => (b.w || b.h ? { w: 0, h: 0 } : b)); return; }
    const read = () => {
      const cs = getComputedStyle(el);
      const px = (v: string) => parseFloat(v || '0') || 0;
      const w = Math.max(0, Math.floor(el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight)));
      const h = Math.max(0, Math.floor(el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom)));
      setBox(b => (b.w === w && b.h === h ? b : { w, h }));
    };
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : undefined;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [el]);
  return [setEl, box];
}

/** A finger rather than a mouse — the marks grow to a thumb's size. */
export const coarsePointer = (): boolean => {
  try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; }
};
