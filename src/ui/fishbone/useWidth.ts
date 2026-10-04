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

/** A finger rather than a mouse — the marks grow to a thumb's size. */
export const coarsePointer = (): boolean => {
  try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; }
};
