/* A STUDY — one use of a tool: a capability study of a weigher, a time study
 * of case packing (docs/TOOLKIT.md, Part 0; supabase/STUDIES.sql).
 *
 * Rowland, 10 October: "We're about to build tools that do two things. One,
 * can work independently. Two, can be attached to a project — possibly even
 * to a problem. It needs to be a full ecosystem." So every use of every tool
 * is this one record, and it attaches one way:
 *   - on its own, a quick session (no line, no job): its maker's alone;
 *   - on a line (workspaceId): the line's people see it;
 *   - on a job (projectId): the job's people, by level;
 *   - and `uses`: what inside its job it is evidence or proof for.
 *
 * WORK MOVES, EVIDENCE LINKS. A snag is work: it moves to the job and becomes
 * its problem. A study is evidence: it is never moved and never copied, so the
 * one record seen in many places cannot disagree with itself.
 *
 * ONLY FACTS ARE KEPT. What a person put in (the readings, and later the laps,
 * steps and taps), what it is judged against (agreed before it is measured),
 * and at close a receipt of the figures as they stood. The mean, the Cpk and
 * the verdict are worked out by the tool's module (lib/ie/), never stored.
 *
 * Never called "a study" on screen on its own — "Line study" already names a
 * line. It always carries its tool's name: "Capability study — Weight
 * accuracy 400 g". */
import type { ID } from '../types';

/** Every tool a study can be a use of. The cloud's check constraint holds the
 *  same list (studies_tool_check): a tool added here is a migration there. */
export const STUDY_TOOLS = ['capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout'] as const;
export type StudyTool = typeof STUDY_TOOLS[number];

export const isStudyTool = (v: unknown): v is StudyTool => (STUDY_TOOLS as readonly unknown[]).includes(v);

/** How a measured test is judged, agreed before the readings go in — by the
 *  owner on a job (can.agree). Either limit may be absent: "at least 400 g". */
export interface AgreedReadings {
  /** limits · sold by weight (the packers' three rules from the nominal) · a
   *  row of ticks */
  kind: 'limits' | 'packers' | 'ticks';
  unit?: string;
  nominal?: number;
  lower?: number;
  upper?: number;
  /** How many readings it needs. */
  count: number;
}

/** One reading, as taken. Struck, never erased: a mistype keeps its place. */
export interface StudyReading {
  id: string;
  /** limits, packers */
  value?: number;
  /** ticks */
  ok?: boolean;
  at: number;
  who?: string;
  note?: string;
  struck?: boolean;
}

/** A WORK BALANCE's agreement (docs/TOOLKIT.md, tools 3 and 4): the takt it
 *  is balanced against, and the allowance added to the timed work — agreed
 *  before the timing, by the owner on a job. */
export interface AgreedBalance {
  /** Seconds a piece: the pace the line must keep. */
  taktSec: number;
  /** Relaxation and contingency together, as a fraction: 0.14 is 14%. */
  allowance?: number;
}

/** One lap of a stopwatch on one element: what it took, when, who timed it.
 *  Foreign (an interruption) or struck (a mistake) are kept and count for
 *  nothing. */
export interface Lap { id: string; sec: number; at: number; who?: string; foreign?: boolean; struck?: boolean }

/** ONE ELEMENT OF WORK — the floor's words, whose it is, and how long it
 *  takes: timed (laps and the pace seen) or, until it is timed, typed. */
export interface BalanceStep {
  id: string;
  order: number;
  /** "Fold the case and tape it". */
  name: string;
  /** The person doing it — a person on the map ("Op 1"). */
  who: string;
  laps?: Lap[];
  /** The pace seen, on the British Standard scale: 100 is standard. */
  rating?: number;
  /** A time typed in, used until the element is timed — said "typed". */
  typedSec?: number;
}

/** THE VALUE STREAM (docs/TOOLKIT.md, tool 2): one step on a line's map —
 *  Rowland, 11 October: "keep the line large, different departments can
 *  affect the line", so a step is done by anyone whose work touches the
 *  line: an operator, the machine, the team leader, planning, stores,
 *  quality, maintenance. And "see the VSM like a grid — a swimlane grid. We
 *  can see a journey of what, who and the value": each step sits in the lane
 *  of who does it (or where), in the column of its turn, coloured by its value. */
export type FlowKind = 'operation' | 'move' | 'check' | 'wait' | 'store';
/** Adds value (only an operation can), needed (not value, but required —
 *  compliance, safety), or waste. Shown by fill, never by a state colour. */
export type FlowValue = 'adds' | 'needed' | 'waste';
export interface FlowStep {
  id: string;
  order: number;
  /** In the floor's (or the office's) own words. */
  name: string;
  /** MULTI-DIMENSIONAL (Rowland, 11 October: "we need it to be multi
   *  dimensional"): a step is what is done, WHO does it — one or more
   *  people or roles ("Op 1", "Op 2", "the machine", "Planner") — and WHERE
   *  — the area, station or machine ("Case packer", "Despatch", "the office").
   *  The grid's lanes are either; a step done by two people sits in both of
   *  their lanes, in the same column. */
  who?: string[];
  where?: string;
  /** The one lane a step had before it had both (B1, B1b) — read through
   *  whoOf / whereOf; still written, as the first who or the where, so an
   *  older build shows the step in a lane. */
  lane?: string;
  kind: FlowKind;
  value?: FlowValue;
  /** Seconds the work takes each time it is done. */
  cycleSec?: number;
  /** Pieces it covers each time — an order of 9,600, a week's plan, a
   *  pallet. Absent: one. Takt is held against the time a piece. */
  batch?: number;
  /** Seconds it sits before the next step. */
  waitSec?: number;
  /** Units sitting before it — turned into days of demand when demand is agreed. */
  queue?: number;
  people?: number;
  /** How its next job reaches it (VSM 4.0, kept light): "phone", "email",
   *  "the ERP", "paper", "the board". */
  info?: string;
  /** A kaizen burst: something here must change. */
  burst?: boolean;
  /** How its time is known — timed on the walk, typed, or CARRIED from the
   *  map before when a fix is being proved (Prove it copies the steps as
   *  they were; each is walked or typed again, and until then says so). */
  source?: 'timed' | 'typed' | 'carried';
}

/** What a value stream is held against: the customer's demand and the
 *  time available, so takt and days of inventory can be worked out. */
export interface AgreedMap {
  /** What it covers — now always 'line'. Rowland, 11 October: "who does it"
   *  as departments is a cross-functional business map; "that won't work for
   *  a single mapping of a line"; then "remove business-wide mapping ... but
   *  keep the line large, different departments can affect the line". So a
   *  map is ONE LINE's, its lanes everyone whose work touches it (Op 1, the
   *  machine, the team leader, planning, stores, quality, maintenance).
   *  'business' or absent: a map saved door to door before that (B1) — still
   *  read, its one lane per step taken as where. */
  scope?: 'business' | 'line';
  /** Pieces the customer takes a day. */
  demandPerDay?: number;
  /** Seconds a day the work is done in. */
  availableSecPerDay?: number;
  /** The customer and the supplier — the two ends of the stream. */
  customer?: string;
  supplier?: string;
}

/** What it is judged against, by tool — each tool its own key, so a new tool
 *  adds one and changes none. */
export interface StudyAgreed {
  readings?: AgreedReadings;
  balance?: AgreedBalance;
  map?: AgreedMap;
}

/** What people put in, by tool. Every list is keyed by `id`, so two phones
 *  adding to one study both keep what they added (docs/BUILD.md, 2b). */
export interface StudyFacts {
  readings?: StudyReading[];
  /** A work balance's elements, each with its laps. */
  steps?: BalanceStep[];
  /** A value stream's steps as it runs today, end to end. */
  flow?: FlowStep[];
  /** The same stream as it could run — copied from the flow, then struck,
   *  merged and shortened. */
  future?: FlowStep[];
}

/** What a study is evidence for, inside its job. Both ends write the same
 *  link: "Use it for…" from the study, "How we know" or "Prove it" from the
 *  problem, the fix or the test. */
export interface StudyUse {
  id: string;
  kind: 'problem' | 'case' | 'cause' | 'fix' | 'action' | 'test';
  /** The TestItem, Case, "<caseId>:<causeId>", Test or PaceTodoRow. */
  ref: ID;
  /** How we know · how we know it worked (or that it passes). */
  role: 'evidence' | 'proof';
  at: number;
  by?: string;
  /** On a value stream map: the step the record is about — the wait or the
   *  waste a fix was raised from, so its before → after is that step's too,
   *  and the step on the grid shows the branch. */
  step?: string;
}

/** A person's word over the app's verdict, kept beside it. */
export interface StudyOverrule {
  verdict: string;
  why: string;
  by?: string;
  at: number;
}

/** The figures as they stood when it was closed, so next month's edits cannot
 *  rewrite last month's claim. The owner can reopen it, and why is kept. */
export interface StudyReceipt {
  at: number;
  by?: string;
  /** The tool's sentence and verdict at close, in its own words. */
  text: string;
  tone: 'r' | 'a' | 'w' | 'g' | 'n';
  figures: Record<string, number | string | null>;
  reopened?: { at: number; by?: string; why: string }[];
}

export interface ToolStudy {
  id: ID;
  /** Who started it — a quick session is theirs alone. Absent until the
   *  cloud has said who is signed in; the push then names the device's own. */
  ownerId?: string;
  tool: StudyTool;
  /** In the person's words: "Weight accuracy 400 g". */
  name: string;
  /** The line it is on. Absent: not filed. */
  workspaceId?: ID;
  /** The job it is attached to. Absent: none. One job at a time. */
  projectId?: ID;
  /** The machine, in the line's words. */
  machine?: string;
  /** The job's machine, on a stage-gate job. */
  assetId?: ID;
  product?: string;
  programId?: ID;
  /** The product's line standard it measures. */
  standardId?: ID;
  agreed?: StudyAgreed;
  facts: StudyFacts;
  uses: StudyUse[];
  startedAt: number;
  /** Closed = a receipt: its figures are frozen. */
  closedAt?: number;
  receipt?: StudyReceipt;
  overrule?: StudyOverrule;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/** A list off the wire, or none: only an entry with a string id is one — the
 *  sync merges these lists by it. */
export function listById<T extends { id: string }>(v: unknown): T[] {
  return Array.isArray(v) ? v.filter((x): x is T => !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string') : [];
}

/** The facts off the wire: an object of id-keyed lists. A key this build does
 *  not know is KEPT as it came — a newer phone's tool, read and saved back by
 *  an older one, must not lose what the newer one put in. */
export function factsOf(v: unknown): StudyFacts {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
  return { ...o, ...(o.readings !== undefined ? { readings: listById<StudyReading>(o.readings) } : {}),
    ...(o.steps !== undefined ? { steps: listById<BalanceStep>(o.steps).map(st => ({ ...st, laps: listById<Lap>(st.laps) })) } : {}),
    ...(o.flow !== undefined ? { flow: listById<FlowStep>(o.flow) } : {}),
    ...(o.future !== undefined ? { future: listById<FlowStep>(o.future) } : {}) };
}
