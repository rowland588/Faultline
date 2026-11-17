import type { Snag } from './types';

/** A selected machine is the physical location. A retained image label is only a legacy fallback. */
export function problemMachine(s: Pick<Snag, 'targetAsset'>, imageLabel?: string): string | undefined {
  return s.targetAsset?.trim() || imageLabel?.trim() || undefined;
}
