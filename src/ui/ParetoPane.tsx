/* THE PARETO, AS A PANE — the left of the fishbone page on a laptop
 * (docs/SIXM.md, the working method). The bars ranked, the 80% line marked,
 * the vital few first; each bar opens its own problem, or starts one. Built
 * by the Pareto slice; this is the contract the fishbone page lays out. */
import type { Case } from '../types';

export interface ParetoPaneProps {
  projectId: string;
  /** The line the page is on; undefined = the whole project. */
  lineId?: string;
  /** The problem open on the page — its bar is drawn as the one selected. */
  selected?: Case;
  /** A bar's problem, opened or just created: the page shows it. */
  onOpen: (problemId: string) => void;
}

export function ParetoPane(_props: ParetoPaneProps) {
  return null;
}
