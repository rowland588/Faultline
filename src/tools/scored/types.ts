import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredCriterion, ScoredRow } from '../../lib/study';
import type { CriticalityRowIn, RankedRow } from '../../lib/ie/criticality';

export interface ScoredScale { id: string; label: string }

export interface ScoredExample {
  name: string;
  rows: ScoredRow[];
  /** A matrix: the criteria and the datum its rows (the options) were marked against. */
  criteria?: ScoredCriterion[];
  datum?: string;
  /** What the independent case says the module must give — read by scripts/acceptance/scored-shape.mjs. */
  expect: Record<string, number | string | string[] | Record<string, number>>;
}

/** What a scored register says of itself — the same on the page and on paper (a criticality summary is one). */
export interface ScoredResult {
  verdict: string;
  tone: LeanTone;
  sentence: string;
  tiles: LeanTile[];
  closing: string;
  caveats: string[];
  /** A list under the sentence, titled ("Before you choose"). */
  also?: { title: string; lines: string[] };
}

/** A matrix as a table: criteria down, the datum then the options across, a foot of counts; `columnIds` names the option of each column after the datum. */
export interface ScoredTable { head: string[]; rows: string[][]; foot: string[][]; shares: number[]; columnIds: string[] }

export type ScoredMatrixOut = { problems: string[] } | { result: ScoredResult; table: ScoredTable; leaders: string[] };

/** A register whose rows are OPTIONS marked against agreed criteria and a datum (Pugh, FC-143) rather than assets on fixed scales. */
export interface ScoredMatrix {
  datumDefault: string;
  analyse: (a: { datum?: string; criteria: ScoredCriterion[]; rows: ScoredRow[] }) => ScoredMatrixOut;
  /** What a new ranking starts with — blank rows to fill. */
  start: () => { datum: string; criteria: ScoredCriterion[]; rows: ScoredRow[] };
  /** The words of the New sheet and the empty list. */
  asks: { name: string; placeholder: string; empty: string };
}

export interface ScoredDef {
  key: string;
  fc: string;
  title: string;
  says: string;
  group: string;
  question: string;
  scales: ScoredScale[];
  limits: string[];
  examples: ScoredExample[];
  /** An asset register (criticality): each row ranked on the scales. Absent on a matrix. */
  rank?: (rows: CriticalityRowIn[]) => { ok: RankedRow[]; counts: Record<'A' | 'B' | 'C', number> } | { problems: string[] };
  /** A matrix (Pugh): set, the page draws the matrix editor where an asset register draws its table. */
  matrix?: ScoredMatrix;
}
