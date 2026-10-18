/* WHAT IS KEPT WHEN A METHOD RUNS — three records, and why each exists
 * (docs/PLATFORM-REVIEW.md §6.1, §6.3, §6.7; BLUEPRINT §2).
 *
 * "A fifth concept is almost always the wrong answer" (CLAUDE.md), so each of
 * these has to earn its place, and each does:
 *
 *   Method      a definition, versioned. Nothing in the app held a method as
 *               data — the three were code — and a definition has a life of
 *               its own (drafted, approved, adapted, retired) apart from any
 *               project that runs on it.
 *   Flow step   one step done on a project running a method, or one gate
 *               passed. The same shape as a stage gate's step (lib/testing
 *               Test: planned, done by somebody, an outcome, what it showed,
 *               its photos and files) — kept apart from `tests` on purpose,
 *               because every reader of tests across projects (the control
 *               room, Needs you, the portfolio) would read these and get them
 *               wrong. Two faces, as a test and a fix are: a step, and a gate.
 *   Activity    who changed what, when, and whether it began as the
 *               assistant's proposal. Nothing recorded that before; the
 *               mandate needs it ("controlled, validated, versioned and
 *               auditable"). Written once, never changed.
 */
import type { ID, MediaRef } from '../../types';
import type { DocRef } from '../testing';
import type { FlowDefinition } from './definition';

/* -------------------------------- the method ------------------------------- */

export type MethodStatus = 'draft' | 'active' | 'retired';

export interface Method {
  id: ID;
  /** Every version of one method shares it — the first version's id. */
  familyId: ID;
  version: number;
  status: MethodStatus;
  /** The definition, as lib/flow/validate rebuilt it. Never edited once
   *  active: a change is a new version. */
  definition: FlowDefinition;
  /** The version this one was made from, or the method it was adapted from. */
  parentId?: ID;
  /** How it came to be — by hand, from the usual lists, a proposal, a copy
   *  of another method, or taken from Faultline's library (lib/flow/library). */
  origin?: 'hand' | 'usual' | 'assistant' | 'copy' | 'library';
  /** What changed from the version before, in words. */
  changeNote?: string;
  approvedBy?: string;
  approvedAt?: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/* --------------------------- a step done, a gate passed --------------------- */

export type FlowOutcome = 'planned' | 'done' | 'failed' | 'notRun';

export interface FlowRecord {
  id: ID;
  projectId: ID;
  kind: 'step' | 'gate';
  stageKey: string;
  /** The step's key; absent on a gate. */
  stepKey?: string;
  /** Which machine, when the step is done per machine. */
  assetId?: ID;
  /** The method version it was done under. */
  version: number;
  outcome: FlowOutcome;
  /** ISO day it is planned for. */
  plannedFor?: string;
  /** ISO day it was done — on a gate, the day it was passed. */
  doneOn?: string;
  /** Who is doing it — or, on a gate, who passed it. */
  who?: string;
  /** The step's fields, as typed. Worked-out fields are never kept. */
  values?: Record<string, string | number | boolean>;
  /** What happened, in words. */
  note?: string;
  /** A sign-off: who signed, and what was still open when they did. */
  signedBy?: string;
  openAtSign?: string[];
  media?: MediaRef[];
  docs?: DocRef[];
  /** A tool's record that answers the step (a study's id). */
  studyId?: ID;
  /* ---- a gate ---- */
  /** Passed while a blocking condition was unmet: the owner's reason. */
  override?: string;
  /** What was still unmet (warnings, or what the override passed over). */
  openAtPass?: string[];
  /** The manual checks confirmed at the gate, by condition id. */
  checks?: Record<string, string>;
  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/* -------------------------------- the activity ----------------------------- */

export interface ActivityEntry {
  id: ID;
  projectId?: ID;
  methodId?: ID;
  /** Who, as the person is known on screen. */
  who: string;
  at: number;
  /** The operation — "approveMethod", "completeStep", "passGate" … */
  op: string;
  /** What it says, in a sentence. */
  summary: string;
  /** Where it began: a person's own hand, or the assistant's proposal a
   *  person accepted. */
  source: 'person' | 'assistant';
  /** The record it touched. */
  target?: { kind: string; id: ID };
  /** Small and specific: the fields that changed, the reason given. */
  detail?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/** The project's link to its method: which family, which version. */
export interface ProjectFlow {
  methodId: ID;
  familyId: ID;
  version: number;
  /** The method's name when the project started on it — said on the control
   *  room's row and the rail without reading the method. */
  name?: string;
  /** ISO day the work started — steps due "n days from the start" count from it. */
  startedOn: string;
  /** Who does each role on this project — role key → a person's name. */
  people?: Record<string, string>;
}
