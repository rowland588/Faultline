import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredCriterion, ScoredRow } from '../../lib/study';

export interface ScoredScale { id: string; label: string }

/** A ranked row, whatever the definition ranks by: a place, a score and the class or quadrant it falls in. */
export interface ScoredRanked { id: string; name: string; score: number; class: string }

/** What a definition says of its ranking — the same words on the screen and on paper. */
export interface ScoredResult {
  verdict: string;
  tone: LeanTone;
  sentence: string;
  tiles: LeanTile[];
  closing: string;
  caveats: string[];
  /** The money, in lines — only for a definition that has some. */
  money?: string[];
  /** A list under the sentence, titled ("Before you choose" on a Pugh matrix). */
  also?: { title: string; lines: string[] };
}

/** One box a definition asks in each row (beside the name). */
export interface ScoredField {
  id: 'production' | 'safety' | 'quality' | 'repair' | 'likelihood' | 'impact' | 'effort' | 'worthGbp' | 'hours' | 'spendGbp' | 'ccp' | 'standby';
  label: string;
  kind: 'score' | 'tick' | 'money' | 'hours';
}

/** One column a definition shows after the boxes (and prints): from the ranked row. */
export interface ScoredColumn { label: string; of: (r: ScoredRanked) => string; tone?: (r: ScoredRanked) => LeanTone }

export interface ScoredExample {
  name: string;
  rows: ScoredRow[];
  /** A matrix (Pugh): the criteria and the datum its rows (the options) were marked against. */
  criteria?: ScoredCriterion[];
  datum?: string;
  /** £ an hour the example is worked at, when it has one. */
  rate?: number;
  expect: {
    classA?: number; classB?: number; classC?: number;
    /** The count in each class or quadrant, by name. */
    counts?: Record<string, number>;
    /** The names in order, first to last. */
    order?: string[];
    /** Tile values by tile name. */
    tiles?: Record<string, string>;
    verdict?: string;
    /** Lines the money must say, in full. */
    money?: string[];
    /** A matrix: who leads, and every option's weighted score by name. */
    leader?: string;
    scores?: Record<string, number>;
  };
}

/** A matrix as a table: criteria down, the datum then the options across, a foot of counts; `columnIds` names the option of each column after the datum. */
export interface ScoredTable { head: string[]; rows: string[][]; foot: string[][]; shares: number[]; columnIds: string[] }

export type ScoredMatrixOut = { problems: string[] } | { result: ScoredResult; table: ScoredTable; leaders: string[] };

/** A register whose rows are OPTIONS marked against agreed criteria and a datum (Pugh, FC-143) rather than things scored on boxes. */
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
  /** `left` names the rows that could not be ranked while the rest were. Absent on a matrix (Pugh), which works itself out in `matrix`. */
  rank?: (rows: ScoredRow[], o?: { rate?: number }) => { ok: ScoredRanked[]; counts: Record<string, number>; left?: string[] } | { problems: string[] };
  /** The sentence, tiles, money and closing line. Criticality's own when not given. */
  summarize?: (ok: ScoredRanked[], o?: { rate?: number }) => ScoredResult;
  /** What a row is called ("machine"); the boxes asked in each row; the columns shown after them. Criticality's when not given. */
  noun?: string;
  help?: string;
  fields?: ScoredField[];
  columns?: ScoredColumn[];
  /** Asks for the £ an hour of the people doing the work (for the cost of hours). */
  asksRate?: boolean;
  /** The paper prints every box the register asks and every column it works out (not only the name, score and class). */
  paperInputs?: boolean;
  /** A new ranking starts with one empty row, not the worked example. */
  blank?: boolean;
  /** A matrix (Pugh): set, the page draws the matrix editor where the other registers draw their boxes. */
  matrix?: ScoredMatrix;
}
