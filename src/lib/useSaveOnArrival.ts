/* A PAPER MADE ON ARRIVAL — ?save=1 (docs/STRUCTURE.md §15, B3). A page's Report ▾ names a paper
 * that is drawn on its own report page (the status report, the client report): picked there, the
 * report page opens and makes the file as soon as it has read what goes on it — one way of taking
 * paper, where there were three (a file at once, a report page with its button, a print page). The
 * page stays, its preview and its Download beside it; the address loses ?save=1 so a reload does
 * not make it again. */
import { useEffect, useRef } from 'react';

/** The address a paper is made at: `to` with ?save=1 (or &save=1) added. */
export function savingAt(to: string): string {
  return to + (to.includes('?') ? '&' : '?') + 'save=1';
}

/** The hash without its save=1. */
export function withoutSave(hash: string): string {
  return hash.replace(/([?&])save=1(&|$)/, (_m, a: string, b: string) => (b ? a : '')).replace(/[?&]$/, '');
}

/** Makes the page's paper once, when `ready`, if the address asked for it. */
export function useSaveOnArrival(ready: boolean, save: () => void | Promise<void>): void {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current || !/[?&]save=1(&|$)/.test(window.location.hash)) return;
    done.current = true;
    history.replaceState(history.state, '', window.location.pathname + window.location.search + withoutSave(window.location.hash));
    void save();
  }, [ready, save]);
}
