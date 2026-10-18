/* THE TOOLS A METHOD CAN USE — the app's own instruments, placed in a step
 * (docs/PLATFORM-REVIEW.md §6.4; docs/PLATFORM-STATUS.md, the vision slice).
 *
 * A definition may say "this step is answered by a capability study" or "by
 * a shift's loss count": the step is then done by that tool's own record,
 * made on the project's line, and judged by that tool's module — the
 * arithmetic stays where it is tested (lib/ie, lib/ie/sample). What the tool
 * finds comes back into the step as its FIGURES (lib/flow/toolRead), each a
 * number with a name and a unit, so a gate can ask for one ("changeover
 * minutes at most 10") and a measure can be fed by one (before → now), the
 * same as a box a person types.
 *
 * Only the ids below are valid; a new one is code, written and tested once.
 * This list is also what the assistant is told it may build with
 * (lib/flow/assistCore) — the app's capabilities, not a model's guess. */

export interface ToolFigure {
  /** A field-style key — what a gate condition or a measure names. */
  key: string;
  label: string;
  unit?: string;
  /** Which way is better, for a measure fed by it. */
  better: 'higher' | 'lower';
}

export interface ComponentInfo {
  id: string;
  name: string;
  /** What it gives the step, in a sentence. */
  gives: string;
  /** The study tool it opens (lib/study STUDY_TOOLS), when it is one — a step
   *  using it is answered by attaching one of that tool's studies. */
  studyTool?: string;
  /** Answered by a product's line standard instead — its Line capacity, which
   *  lives on the standard, not as a study. */
  onStandard?: true;
  /** What it finds, as numbers the method can use. */
  figures: readonly ToolFigure[];
  /** Where the tool's own list opens — to start one on the line. */
  listPath: string;
  /** Another way to make the same record — a line balance read from footage
   *  of the line (lib/video) is a line balance study like one timed by hand. */
  alsoFrom?: { label: string; path: string };
}

export const COMPONENTS: readonly ComponentInfo[] = [
  {
    id: 'capability', name: 'Capability study', gives: 'Readings against limits, with Cp and Cpk and a verdict', studyTool: 'capability', listPath: '/capability',
    figures: [{ key: 'cpk', label: 'Cpk', better: 'higher' }, { key: 'ppk', label: 'Ppk', better: 'higher' }, { key: 'mean', label: 'Mean', better: 'higher' }],
  },
  {
    id: 'losses', name: 'A shift’s losses', gives: 'Where a shift’s time went at the bottleneck’s speed, in packs and pounds', studyTool: 'losses', listPath: '/losses',
    figures: [
      { key: 'lost_minutes', label: 'Lost minutes', unit: 'min', better: 'lower' },
      { key: 'packs_made', label: 'Packs made', unit: 'packs', better: 'higher' },
      { key: 'packs_short', label: 'Packs short', unit: 'packs', better: 'lower' },
      { key: 'rejects', label: 'Rejects', unit: 'packs', better: 'lower' },
    ],
  },
  {
    id: 'changeover', name: 'SMED', gives: 'A changeover timed element by element, internal and external', studyTool: 'changeover', listPath: '/smed',
    figures: [
      { key: 'changeover_minutes', label: 'Changeover minutes', unit: 'min', better: 'lower' },
      { key: 'internal_minutes', label: 'Internal minutes', unit: 'min', better: 'lower' },
      { key: 'external_minutes', label: 'External minutes', unit: 'min', better: 'lower' },
    ],
  },
  {
    id: 'balance', name: 'Line balance', gives: 'People’s work timed against takt', studyTool: 'balance', listPath: '/linebalance',
    alsoFrom: { label: 'Read it from a video of the line', path: '/video' },
    figures: [
      { key: 'balance_efficiency', label: 'Balance efficiency', unit: '%', better: 'higher' },
      { key: 'people_needed', label: 'People needed', unit: 'people', better: 'lower' },
      { key: 'longest_stack', label: 'Longest stack', unit: 's', better: 'lower' },
    ],
  },
  {
    id: 'sampling', name: 'Work sampling', gives: 'What people are doing at random moments, with margins', studyTool: 'sampling', listPath: '/sampling',
    figures: [{ key: 'share_working', label: 'Share working', unit: '%', better: 'higher' }, { key: 'taps', label: 'Moments sampled', better: 'higher' }],
  },
  {
    id: 'map', name: 'Value stream map', gives: 'The line’s steps, waits and value, walked', studyTool: 'map', listPath: '/value-stream',
    figures: [{ key: 'lead_time_minutes', label: 'Lead time', unit: 'min', better: 'lower' }, { key: 'value_added_share', label: 'Value-added share', unit: '%', better: 'higher' }],
  },
  /* Line capacity lives on a product's line standard, not as a study: a step
     using it is answered by that product's capacity, read by lib/capacity —
     the line's rate once stops count, the good out of the end, how far short
     of its target, and labour a pack from the one cost model (CLAUDE.md,
     Everything derives a cost). */
  {
    id: 'capacity', name: 'Line capacity', gives: 'What each station can make, which one limits the line, and what a pack costs in labour', onStandard: true, listPath: '/balances',
    figures: [
      { key: 'line_rate', label: 'Line rate', unit: 'a minute', better: 'higher' },
      { key: 'good_rate', label: 'Good out', unit: 'a minute', better: 'higher' },
      { key: 'short_of_target', label: 'Short of target', unit: 'a minute', better: 'lower' },
      { key: 'labour_per_pack', label: 'Labour a pack', unit: 'pence', better: 'lower' },
    ],
  },
];

/** Answered by one of the app's records — a study, or a product's Line capacity. */
export const answeredByRecord = (c?: ComponentInfo): boolean => !!c && (!!c.studyTool || !!c.onStandard);

export const componentOf = (id?: string): ComponentInfo | undefined => COMPONENTS.find(c => c.id === id);

/** A tool's figure by its key. */
export const figureOf = (tool: string | undefined, key: string): ToolFigure | undefined =>
  componentOf(tool)?.figures.find(f => f.key === key);
