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
}

export type CapResult = { ok: true; says: string; data?: unknown; refs: CapRef[] } | { ok: false; why: string };
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
}

export interface CapCall { id: string; name: string; input: unknown }

/* ── The conversation's own record (a `studies` row, tool 'talk', facts.colleague) — the parts the capabilities write ── */

export interface ThreadNote { id: string; text: string; how: HowKnown; at: number; photo?: string }
export interface ThreadScope { lineId?: string; projectId?: string; problemId?: string; storyId?: string }
export interface ColleagueThread {
  id: string; title: string; status: 'current' | 'parked' | 'closed';
  scope: ThreadScope;
  notes: ThreadNote[];
  refs: CapRef[];
  at: number;
}
export interface ColleagueAction { callId: string; name: string; title: string; status: 'done' | 'declined' | 'failed'; says: string; refs: CapRef[]; at: number }

/* ── A DRAFT — a tool being filled from the conversation (8 November; docs/AI-MODE.md, Building tools in conversation) ──
 * Rowland: "The conversation itself should become the mechanism through which the application is populated … show me what it
 * has understood and populated, and confirm before committing." A draft lives on the conversation (facts.drafts) until the
 * person confirms make_record; then it is a real record, made through the same functions Manual Mode's New uses. */

/** The tool shapes a draft can fill. 'custom' is a sheet described in the conversation (a document of its own structure). */
export type DraftKind = 'calc' | 'doc' | 'check' | 'scored' | 'smed' | 'custom';
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
  at: number;
}

/** A device timer (start_timer), kept in localStorage under TIMERS_KEY; TIMERS_EVENT is dispatched on window when it changes. */
export interface DeviceTimer { id: string; label: string; endsAt: number }
export const TIMERS_KEY = 'faultline.timers';
export const TIMERS_EVENT = 'faultline-timers';
