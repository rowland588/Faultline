/* THE TOOLS A METHOD CAN USE — the app's own instruments, placed in a step
 * (docs/PLATFORM-REVIEW.md §6.4).
 *
 * A definition may say "this step is answered by a capability study" or "by
 * a shift's loss count": the step is then done by that tool's own record,
 * opened on the project's line, and judged by that tool's module — the
 * arithmetic stays where it is tested (lib/ie, lib/capacity). Only the ids
 * below are valid; a new one is code, written and tested once. */

export interface ComponentInfo {
  id: string;
  name: string;
  /** What it gives the step, in a sentence. */
  gives: string;
  /** The study tool it opens (lib/study STUDY_TOOLS), when it is one. */
  studyTool?: string;
}

export const COMPONENTS: readonly ComponentInfo[] = [
  { id: 'capability', name: 'Capability study', gives: 'Readings against limits, with Cp and Cpk and a verdict', studyTool: 'capability' },
  { id: 'losses', name: 'A shift’s losses', gives: 'Where a shift’s time went at the bottleneck’s speed, in packs and pounds', studyTool: 'losses' },
  { id: 'changeover', name: 'SMED', gives: 'A changeover timed element by element, internal and external', studyTool: 'changeover' },
  { id: 'balance', name: 'Line balance', gives: 'People’s work timed against takt', studyTool: 'balance' },
  { id: 'sampling', name: 'Work sampling', gives: 'What people are doing at random moments, with margins', studyTool: 'sampling' },
  { id: 'map', name: 'Value stream map', gives: 'The line’s steps, waits and value, walked', studyTool: 'map' },
  { id: 'capacity', name: 'Line capacity', gives: 'What each station can make and which one limits the line' },
];

export const componentOf = (id?: string): ComponentInfo | undefined => COMPONENTS.find(c => c.id === id);
