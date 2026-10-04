/* THE CONTRACT BETWEEN THE 6M ENGINE, ITS SCREENS AND ITS REPORT.
 *
 * docs/SIXM.md is the design. This file is only the shapes everything agrees
 * on, so the fishbone engine (lib/fishbone.ts), the data hook
 * (lib/useProblems.ts), the interactive fishbone (ui/Fishbone.tsx,
 * ui/CauseSheet.tsx), the screens and the client report can be built side by
 * side and meet in the middle. Nothing here computes anything. */
import type { Case } from '../types';
import type { PaceAction } from './tracker';
import type { Cause, CauseSource, Grade, SixM } from './sixm';

/** Where a problem is on its way — said in words on screen and paper, and
 *  coloured by the house rules (docs: CLAUDE.md visual management):
 *  finding = indigo (under way), acting = indigo, proving = indigo,
 *  holding = green (done, quiet), slipped = red, closed = green. */
export type Phase =
  | 'finding'   // causes being found and checked — no confirmed root yet
  | 'acting'    // a confirmed root, countermeasures open
  | 'proving'   // countermeasures done, the effect being checked
  | 'holding'   // closed, and the check says it is still working
  | 'slipped'   // closed, and the number has gone back
  | 'closed';   // closed with no hold check set

export const PHASE_WORD: Record<Phase, string> = {
  finding: 'Finding the cause',
  acting: 'Acting on it',
  proving: 'Checking it worked',
  holding: 'Holding',
  slipped: 'Slipped back',
  closed: 'Closed',
};

/** Something the data says might belong on a bone — derived each time, never
 *  stored until somebody accepts it (then it becomes a Cause with its source). */
export interface Suggestion {
  /** Stable for the same evidence, so an accepted one is recognised and not offered twice. */
  key: string;
  m: SixM;
  text: string;
  grade: Grade;
  source: CauseSource;
  /** For time-based evidence, its loss — minutes a week. */
  minutesWeek?: number;
  /** One line saying what it is based on — "18 stops in 4 weeks, 11 on nights". */
  detail?: string;
  /** True when the bone was guessed from the stop's category and words rather
   *  than said by the floor (Observation.causeM) — the screen says so. */
  guessed?: boolean;
}

/** The problem's own number — what the head of the fish measures, before and now. */
export interface ProblemMeasure {
  label: string;           // "Minor stops on the bagger" / "Line 2 rate"
  unit: string;            // "h a week" / "ppm"
  before?: number;
  now?: number;
  target?: number;
  /** Lower is better (a loss) or higher is better (a rate). */
  better: 'lower' | 'higher';
  /** Whether it has moved the right way since the countermeasures closed. */
  moved?: 'better' | 'worse' | 'same';
}

/** One bone of a problem's fishbone, as drawn. */
export interface Bone {
  m: SixM;
  causes: Cause[];
  suggestions: Suggestion[];
}

/** A problem (a Case) as every screen and the report read it. */
export interface ProblemView {
  problem: Case;
  phase: Phase;
  /** All six, in SIXM order, even when empty — an empty bone says "looked, nothing found". */
  bones: Bone[];
  measure: ProblemMeasure | null;
  /** The countermeasures — actions whose causeRef points at one of its causes (or caseId at it). */
  actions: PaceAction[];
  /** Causes confirmed and drilled to a root. */
  roots: Cause[];
  /** A sentence for the head of the fish and the report — "3.2 h a week lost, 41% of the line's stops". */
  says: string;
}

/** The hook's surface (lib/useProblems.ts implements it). */
export interface ProblemsApi {
  problems: ProblemView[];
  loading: boolean;
  /** Open a problem from the gap, a Pareto bar, the constraint, or something seen. */
  create(o: { title: string; lineId?: string; source: Case['source'] }): Promise<Case>;
  /** Add or change a cause (accepting a suggestion is saving a cause with its source). */
  saveCause(problemId: string, cause: Cause): Promise<void>;
  removeCause(problemId: string, causeId: string): Promise<void>;
  /** Close it (it worked) with the check that keeps the gain, or reopen it. */
  close(problemId: string, hold?: Case['hold']): Promise<void>;
  reopen(problemId: string): Promise<void>;
  /** Record that the hold check was looked at today. */
  checked(problemId: string): Promise<void>;
}
