/* UNDO, AFTER A DELETE — one bar for the whole app.
 *
 * Rowland's review: every delete asked first, and nothing could be brought
 * back once it had gone. Now every delete of a test, a fix, a thing found, a
 * machine, a material, a program or a photo offers Undo for a few seconds,
 * the way a verdict already does. The delete itself hands back how to take
 * it back (see db/sync restoreRows), so what Undo restores is exactly what
 * went — the rows, and the photos they pointed at — on every device.
 *
 * One bar, not one per screen: a delete often navigates away (a test deleted
 * from its own page lands on the list), and an undo that lived on the page
 * that did the deleting would vanish with it. */
import { useCallback, useEffect, useState } from 'react';
import type { Restore } from '../db';
import { Toast } from './Toast';

interface Offer { id: number; message: string; undo: Restore }
let offer: Offer | null = null;
const subs = new Set<() => void>();
const tell = () => subs.forEach(f => f());

/** Show "message · Undo". A second delete replaces the first offer. */
export function offerUndo(message: string, undo: Restore): void {
  offer = { id: Date.now() + Math.random(), message, undo };
  tell();
}

export function UndoHost() {
  const [o, setO] = useState<Offer | null>(offer);
  useEffect(() => {
    const f = () => setO(offer);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  const clear = useCallback(() => { offer = null; tell(); }, []);
  if (!o) return null;
  return (
    <Toast key={o.id} message={o.message} ms={8000} onDismiss={clear}
      onUndo={() => { const u = o.undo; clear(); void u(); }} />
  );
}
