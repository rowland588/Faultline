/* A FIGURE AND WHAT IT IS MADE OF — "why this number" (docs/upgrade-plan.md
 * F1, F2). The floor trusts only the numbers it can trace to something a
 * person logged; so every figure a tool shows can carry its sum in words, its
 * period, and the records behind it, and the drawer (ui/WhyNumber) opens any
 * of them. No number is made here: a figure is described by the function that
 * computed it. Pure. */
import type { Confidence } from './confidence';

export type SourceKind = 'stop' | 'count' | 'station' | 'problem' | 'product';

export interface Source {
  kind: SourceKind;
  id: string;
  /** "Misfeed · Basketer · 14 min, 9 Oct 06:42". */
  label: string;
  /** Where it opens, as a hash route. */
  href?: string;
}

export interface Figure {
  /** The figure as it is shown: "412 min", "61.4 packs/min", "£3,180". */
  text: string;
  value?: number;
  unit?: string;
  /** The sum in words: "the minutes of the 37 stops logged on the Basketer, 6 Oct – 12 Oct". */
  how: string;
  /** The period it covers, epoch ms. */
  from?: number;
  to?: number;
  sources: Source[];
  confidence?: Confidence;
}

export function figure(text: string, how: string, sources: Source[] = [], o: Partial<Pick<Figure, 'value' | 'unit' | 'from' | 'to' | 'confidence'>> = {}): Figure {
  return { text, how, sources, ...o };
}
