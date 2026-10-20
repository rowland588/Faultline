/* PARKED, 20 OCTOBER — the method builder and the assistant, off the screens
 * (docs/DIRECTION.md).
 *
 * Rowland, 20 October: "the whole AI thing coming in at the moment and build
 * your own is pointless. It's almost caused more friction than we actually
 * want." So "describe what you need", the design studio, methods of one's
 * own, Faultline's library of methods, the assistant's questions about a
 * project and its proposed changes, and the video study's naming of the work
 * from its frames are hidden — nothing deleted. A project already running
 * on a method keeps running and opens as before.
 *
 * One switch, kept on this device only: shown, every parked thing is back
 * exactly as it was. The acceptance scripts turn it on, so what was proved
 * stays proved while it is out of sight. */
import { useSyncExternalStore } from 'react';

export const PARKED_KEY = 'fl-parked-builder';
const EVENT = 'fl-parked';

/** The parked builder and assistant are shown on this device. */
export function builderShown(): boolean {
  try { return localStorage.getItem(PARKED_KEY) === 'shown'; } catch { return false; }
}

export function showBuilder(on: boolean): void {
  try { if (on) localStorage.setItem(PARKED_KEY, 'shown'); else localStorage.removeItem(PARKED_KEY); } catch { /* private mode: stays parked */ }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (on: () => void) => {
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on); };
};

/** The switch, read on every render and heard when it changes. */
export const useBuilderShown = (): boolean => useSyncExternalStore(subscribe, builderShown, () => false);
