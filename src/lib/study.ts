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

/** What it is judged against, by tool — each tool its own key, so a new tool
 *  adds one and changes none. */
export interface StudyAgreed {
  readings?: AgreedReadings;
}

/** What people put in, by tool. Every list is keyed by `id`, so two phones
 *  adding to one study both keep what they added (docs/BUILD.md, 2b). */
export interface StudyFacts {
  readings?: StudyReading[];
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
  return { ...o, ...(o.readings !== undefined ? { readings: listById<StudyReading>(o.readings) } : {}) };
}
