import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredRow } from '../../lib/study';

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
  };
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
  /** `left` names the rows that could not be ranked while the rest were. */
  rank: (rows: ScoredRow[], o?: { rate?: number }) => { ok: ScoredRanked[]; counts: Record<string, number>; left?: string[] } | { problems: string[] };
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
}
