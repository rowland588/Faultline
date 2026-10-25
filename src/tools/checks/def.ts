/* A CHECK LOG'S DEFINITION — what one kind of log brings to the shape (knowledge/specs/FC-236-check-logs.md).
 *
 * The shape (checks.ts, the pages, the paper, the wiring) is built once. A log — metal detection, a 5S audit, a CILT
 * round — is one file in ./defs that exports a LogDef, found by registry.ts; adding one is that file, its
 * specification, its tests and its catalogue entry, and nothing else. A definition brings what is its own and can
 * not be shared: its starter list of checks, the standard it rests on (and what of that is still TO CONFIRM), its
 * limits, the words it says a reaction in, what a miss costs, and — for a scored checklist — its score rule.
 *
 * What a definition must never be is a template: a starter list is a starting point a person edits, never the
 * standard; a clause number is quoted only where it has been read.
 *
 * Pure: types and the default rule's words. Nothing here touches a record. */
import type { LogCheck, LogCheckKind, LogItem, LogResult } from '../../lib/study';

/** A level on the scale of a scored checklist: its number and the evidence-word that earns it. */
export interface ScaleLevel { v: number; word: string }

/** The scale a scored log's answers are on: 0–4 is the usual one (knowledge/methods/lean/five-s.md). */
export interface ScoreScale {
  levels: ScaleLevel[];
  /** An answer below this level is a finding — chosen by the definition, changeable on the check. */
  findingBelow: number;
}

/** What the rule makes of one audit's answers. */
export interface ScoreFigures {
  points: number;
  max: number;
  /** points ÷ max, in %; undefined when nothing was answered. */
  pct?: number;
  answered: number;
  of: number;
  groups: { name: string; points: number; max: number; pct: number }[];
  /** The ids of the answers below the finding level. */
  findings: string[];
}

export type ScoreRule = (items: readonly { id: string; group?: string; level: number | null }[], scale: ScoreScale, findingBelow: number) => ScoreFigures;

/** What a failure holds, as the page and the paper say it — a definition can say it its own way. */
export interface CostFacts {
  windowMin: number;
  packs?: number;
  packsFrom?: 'typed' | 'capacity' | 'rated';
  /** £ tied up at the line's materials a pack, when it is given. */
  tiedUp?: number;
  /** What is missing to say it, in words, and where to give it. */
  missing?: string;
  unit: string;
}

export interface LogDef {
  /** The file's name and the address: /log/<key>. */
  key: string;
  /** The catalogue entry the log is built for: FC-170. */
  fc: string;
  /** In the floor's words: "Metal detection checks". */
  title: string;
  /** One check, said once: "metal detector check". */
  noun: string;
  /** What it is for, in a line — the hub's row. */
  says: string;
  /** The hub's heading it sits under: "Food safety", "Lean", "Maintenance". */
  group: string;
  /** What the list rests on, said as it is known. A clause number is quoted only where it was read; what was not is in `confirm`. */
  standard: { rests: string; confirm: string[] };
  /** The kinds of check this log may hold. */
  kinds: LogCheckKind[];
  /** A sensible list to start from — edited, never presented as the standard. Ids are made when a log is started. */
  starterChecks: Omit<LogCheck, 'id'>[];
  /** What a person is told to do when a check fails, if the check says nothing of its own. */
  reactionWords: string;
  /** Words for "where": "Detector", "Machine", "Area". */
  whereLabel: string;
  /** A failure holds the product made since the last good check unless the check says otherwise. */
  holds: boolean;
  /** The priority of the problem a failure raises unless the check says otherwise. */
  priority: 'critical' | 'high' | 'low';
  /** Scored logs: the scale, and the rule (the shared share-of-maximum rule when absent). */
  scale?: ScoreScale;
  scoreRule?: ScoreRule;
  /** Abnormality tags can be raised from a check (CILT). */
  tags?: boolean;
  /** What a miss costs, in this log's own words; absent: the shared sentence (hold.ts). */
  costWords?: (f: CostFacts) => string | undefined;
  /** What the log does not do or does not decide — said on its page and on its paper. */
  limits: string[];
  /** Worked examples: a round, as results at minutes before the log began being read, and what the module must say of it. Read by the tests and by the acceptance script. */
  examples: LogExample[];
}

/** A worked round, for the tests and the acceptance script: results at `min` minutes from the log's start. */
export interface LogExample {
  name: string;
  /** Which starter checks are on the list (indexes); all when absent. */
  checks?: number[];
  /** Minutes from the log's start to "now". */
  nowMin: number;
  /** The line's rate, packs a minute, when the example prices a hold. */
  ratePerMin?: number;
  results: { check: number; min: number; outcome: LogResult['outcome']; value?: number; levels?: (number | null)[]; made?: number }[];
  /** What the example agrees on a starter check that the starter leaves open (a limit, a score to reach), by starter index. */
  set?: Record<number, Partial<LogCheck>>;
  /** Abnormality tags raised (a CILT log): which check, when, which colour. */
  tags?: { check: number; min: number; colour: 'red' | 'white' }[];
  /** What the shared module must say: independent numbers, worked by hand. */
  expect: {
    expected?: number; onTime?: number; missed?: number; failed?: number; packsHeld?: number;
    /** compliance, or for a scored log the newest audit's score — in % */
    pct?: number; weakest?: string; findings?: number; repeats?: number; falls?: number;
    /** a value log: how near the limit the latest is, and which way it is going */
    nearing?: 'lo' | 'hi'; headroomPct?: number; going?: 'up' | 'down' | 'flat';
    /** a CILT log: tags raised, and the checks tagged more than once */
    tags?: number; repeatTags?: number;
    states?: Record<number, string>;
  };
}

/** An item as a starter list writes it: "Sort | Unneeded items are gone". */
export const items = (rows: [string, string[]][]): LogItem[] =>
  rows.flatMap(([group, names], g) => names.map((name, i) => ({ id: `${g + 1}.${i + 1}`, group, name })));
