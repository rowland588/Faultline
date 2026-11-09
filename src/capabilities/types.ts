/* AI MODE'S CAPABILITIES — the shapes (the shared contract, 8 November; docs/DIRECTION.md as amended: two modes over ONE app).
 *
 * Claude operates Faultline only through these: each a small wrapper on the same src/db functions, readers and tool modules the
 * screens use, so a capability says what the page says and writes what the page writes. Reads run at once; a write is shown as a
 * card with its `preview` and runs only when the person confirms; `local` changes only the conversation or the device. Nothing
 * here deletes, nothing marks evidence verified, nothing works out a figure (the calculators do). */
import type { Access } from '../lib/access';
import type { CustomDef } from '../tools/doc/types';

/** How a thing is known. Only a person sets 'verified'. */
export type HowKnown = 'observed' | 'reported' | 'measured' | 'calculated' | 'hypothesised' | 'verified' | 'unknown';
/** What a capability may record: every way of knowing but 'verified'. */
export const HOW_SAID: readonly Exclude<HowKnown, 'verified'>[] = ['observed', 'reported', 'measured', 'calculated', 'hypothesised', 'unknown'];

export interface CapRef { kind: 'line' | 'machine' | 'project' | 'problem' | 'study' | 'story' | 'action' | 'report' | 'page'; id: string; label: string; href: string }

export interface CapCtx {
  email?: string;
  /** The person's name on the actions (lib/forYou myName). */
  me?: string;
  now: number;
  conversationId?: string;
  /** The signed-in user's id, when known — a project they own is theirs (lib/access accessOf). */
  userId?: string;
  isSuper?: boolean;
  /** The level the screen already knows for this person (cloud/access useAccess), which wins when given — e.g. the AI screen
   *  open on a project they were invited to as a client. */
  level?: Access;
  /** When the person's latest words were heard (their turn's time) — a live measurement stamps an event at the moment it was said,
   *  not when the reply came back (docs/AI-OPERATING.md §4). */
  saidAt?: number;
}

/** `show` — the record or page the work is in, opened in AI Mode's work pane beside the conversation (lib/pane; docs/AI-OPERATING.md):
 *  the real tool page, never a summary of it. */
export type CapResult = { ok: true; says: string; data?: unknown; refs: CapRef[]; show?: CapRef } | { ok: false; why: string };
export type Checked<T = any> = { ok: true; input: T } | { ok: false; why: string };   // eslint-disable-line @typescript-eslint/no-explicit-any
export type Allowed = { ok: true } | { ok: false; why: string };

export interface Capability {
  /** snake_case, stable — the gateway's tool name. */
  name: string;
  /** Plain words for a card: "Raise a problem". */
  title: string;
  /** local = changes only the conversation or the device (focus, timer, open a page): no confirmation. */
  kind: 'read' | 'write' | 'local';
  validate(raw: unknown): Checked;
  /** The person's access, as the screens check it (lib/access, cloud/access accessOf / can). */
  allowed(ctx: CapCtx, input: any): Promise<Allowed>;   // eslint-disable-line @typescript-eslint/no-explicit-any
  /** A write: what will happen, in a sentence, BEFORE it runs. */
  preview?(ctx: CapCtx, input: any): Promise<string>;   // eslint-disable-line @typescript-eslint/no-explicit-any
  run(ctx: CapCtx, input: any): Promise<CapResult>;   // eslint-disable-line @typescript-eslint/no-explicit-any
  /** A write into one existing record: which (its id). Once the person has said yes to that record in this conversation, later
   *  writes into it go without a card (confirm once — docs/AI-OPERATING.md). */
  target?(input: any): string | undefined;   // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface CapCall { id: string; name: string; input: unknown }

/* ── The conversation's own record (a `studies` row, tool 'talk', facts.colleague) — the parts the capabilities write ── */

export interface ThreadNote { id: string; text: string; how: HowKnown; at: number; photo?: string }
export interface ThreadScope {
  lineId?: string; projectId?: string; problemId?: string; storyId?: string;
  /** The machine it is about, by its name on the line (9 November, the conversation's context). */
  machine?: string;
  /** The record the work is in — a study, a log, a calculation — once there is one (9 November). */
  studyId?: string;
}
/** WHAT KIND OF WORK A SUBJECT IS (9 November — Rowland: "Not every conversation is a project … A conversation must not be forced into
 *  a project simply because Faultline has project functionality"):
 *    talk        a conversation only — learning, a what-if, a test; nothing is to be kept as a record
 *    standalone  work kept on its line (or on none), in no project — the person said so, so no project is asked about again
 *    project     work in the project the scope names
 *  Absent: not decided — the colleague asks only when it matters (a record is about to be made and the line has projects). */
export type ThreadMode = 'talk' | 'standalone' | 'project';
/** Something settled or still open in a subject: a decision, an assumption, a question waiting for its answer. */
export interface ThreadPoint { id: string; kind: 'decision' | 'assumption' | 'question'; text: string; at: number; answered?: string }
export interface ColleagueThread {
  id: string; title: string; status: 'current' | 'parked' | 'closed';
  scope: ThreadScope;
  notes: ThreadNote[];
  refs: CapRef[];
  at: number;
  /** What the person is trying to do, in their words ("cut the changeover on the Filler to 25 minutes"). */
  objective?: string;
  mode?: ThreadMode;
  points?: ThreadPoint[];
  /** The task being worked (10 November, docs/AI-TASK.md) — its goal, its line, its steps in order; progress is read from the records. */
  task?: ColleagueTask;
}
/** A TASK the person is taking through to an outcome (10 November — Rowland: "The user describes the work. Faultline works out how to
 *  support it."): its goal in their words, its kind (capabilities/task ROUTES), its line, the tools it goes through in order (keys),
 *  and when it began — a step's progress is never stored, it is read from the line's records each time. */
export interface ColleagueTask { goal: string; kind?: string; lineId?: string; steps: string[]; startedAt: number }
export interface ColleagueAction { callId: string; name: string; title: string; status: 'done' | 'declined' | 'failed'; says: string; refs: CapRef[]; at: number }

/* ── A DRAFT — a tool being filled from the conversation (8 November; docs/AI-MODE.md, Building tools in conversation) ──
 * Rowland: "The conversation itself should become the mechanism through which the application is populated … show me what it
 * has understood and populated, and confirm before committing." A draft lives on the conversation (facts.drafts) until the
 * person confirms make_record; then it is a real record, made through the same functions Manual Mode's New uses. */

/** The tool shapes a draft can fill. 'custom' is a sheet described in the conversation (a document of its own structure). */
export type DraftKind = 'calc' | 'doc' | 'check' | 'scored' | 'smed' | 'custom' | 'factory';
/** A row of a list (a document's list, a register's rows, a changeover's elements), its cells by column name. */
export type DraftRow = Record<string, string | number>;
export type DraftValue = string | number | DraftRow[];
/** One value as said: how it is known (never verified), the words it was said in, when — and what it replaced. */
export interface DraftEntry {
  value: DraftValue;
  how: Exclude<HowKnown, 'verified'>;
  said?: string;
  at: number;
  /** What was said before a correction, newest last — kept, never lost. */
  earlier?: { value: DraftValue; how: Exclude<HowKnown, 'verified'>; said?: string; at: number }[];
}
/** A box of a draft's field map — read from the tool's own definition, or added to this record (adapt_draft), or a custom sheet's. */
export interface DraftField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'choice' | 'list' | 'date';
  unit?: string;
  /** A choice's values (what is kept) — `optionLabels` its words where they differ. */
  options?: string[];
  optionLabels?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  /** A list's columns. */
  columns?: DraftField[];
  /** The section it sits under, in the tool's own words. */
  section?: string;
  help?: string;
  /** Added to this record only (B) — never a change to the tool's definition. */
  added?: boolean;
}
export interface DraftExtra { section?: string; field: DraftField }
export interface ColleagueDraft {
  id: string;
  kind: DraftKind;
  /** The definition's key (a calculator's, a document's, a log's, a register's); 'smed'; 'custom'. */
  key: string;
  title: string;
  scope: { lineId?: string; projectId?: string };
  values: Record<string, DraftEntry>;
  /** B — fields added to this record only. */
  extra?: DraftExtra[];
  /** B — the definition's own optional boxes this record leaves out (never a required one). */
  removed?: string[];
  /** C — a custom sheet's structure. */
  structure?: CustomDef;
  status: 'draft' | 'made';
  /** The record once made. */
  studyId?: string;
  /** The values as they were when last made — so a second make_record changes only what the conversation changed since. */
  madeValues?: Record<string, DraftValue>;
  /** The thread it was started on. */
  threadId?: string;
  /** F3 — a factory being onboarded: the client, its sites › areas › lines › machines as said (kind 'factory', key 'factory'). */
  factory?: FactoryDraftBody;
  at: number;
}

/* ── A FACTORY DRAFT (9 November; docs/FACTORY-KNOWLEDGE.md F3–F5) ──
 * Rowland, 8 November: "We're onboarding a new customer … two factories … let's start with packaging"; "propose structured records
 * for review and approval, retain the source documents and trace extracted information back to its source". A factory said in the
 * conversation, or read from a document, held as a TREE of nodes (a flat list with each node's parent) until make_record makes the
 * lines and machines through lib/lines and db/lineRecords. Every value keeps how it is known: reported (said in the conversation,
 * with the words) or document (with the document and its exact words). Never 'confirmed' — only a person on a machine's page. */
export type FactoryLevel = 'site' | 'area' | 'line' | 'machine';
export interface FactorySource { kind: 'conversation' | 'document'; id?: string; quote?: string; label?: string; /** the document's own day, YYYY-MM-DD, when typed or read */ day?: string }
export interface FactoryFact {
  value: string;
  how: 'reported' | 'document';
  /** The words it was said in (a conversation). */
  said?: string;
  source?: FactorySource;
  at: number;
  /** What was said before a correction, newest last — kept, never lost. */
  earlier?: Omit<FactoryFact, 'earlier'>[];
}
/** A machine's facts, by the names the record keeps them under (maker is the record's oem). */
export type FactoryField = 'kind' | 'model' | 'serial' | 'maker';
export interface FactoryNode {
  id: string;
  level: FactoryLevel;
  /** The node it sits under: a site for an area, an area (or a site) for a line, a line for a machine. */
  parent?: string;
  name: FactoryFact;
  facts?: Partial<Record<FactoryField, FactoryFact>>;
  /** From a document: waiting for the person's word (pending), kept, or left out. Absent: said in the conversation. */
  review?: 'pending' | 'kept' | 'out';
  /** Where a value differs from what Faultline holds, the person's pick: keep what is recorded, or take the new. By field
   *  (a machine's kind · model · serial · maker; a line's site · area). */
  picks?: Partial<Record<FactoryField | 'site' | 'area', 'recorded' | 'new'>>;
  /** Once made: the line's or the machine record's id, and when. */
  made?: { id: string; at: number };
}
export interface FactoryDraftBody {
  client: FactoryFact;
  nodes: FactoryNode[];
  /** The documents read into it (factory sources — a document record each). */
  sources?: { id: string; label: string; day?: string }[];
}

/** A device timer (start_timer), kept in localStorage under TIMERS_KEY; TIMERS_EVENT is dispatched on window when it changes. */
export interface DeviceTimer { id: string; label: string; endsAt: number }
export const TIMERS_KEY = 'faultline.timers';
export const TIMERS_EVENT = 'faultline-timers';
