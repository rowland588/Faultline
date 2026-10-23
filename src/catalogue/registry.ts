/* THE REGISTRY — the app's tools, read from the catalogue (docs/STRUCTURE.md §14, B1).
 *
 * Before 23 October the tools were listed by hand in four places — the rail (which the front door
 * read too), Jump to, a line's page and the catalogue — and a new tool had to be added to each.
 * Now an entry says how its records behave (its kind), where one is started, and — for the tools a
 * person can open — how it shows (src/catalogue/types AppFace). Everything that lists, starts or
 * finds a tool reads it from here: the rail and the front door, a line's page, and from B2 the
 * scopes' pages, New ▾, ＋ and ⌘K. A new tool is one catalogue entry and its canvas. */
import { ENTRIES } from './index';
import type { AppFace, Entry, Kind, Starts } from './types';

export interface AppTool extends AppFace {
  /** Its catalogue number. */
  id: string;
  /** How its records behave. */
  kind: Kind;
  /** Where one is started. */
  starts: Starts;
  /** Its list's address, as nav() takes it — the first of the entry's built routes. */
  to: string;
}

/** A kind's usual place to start one: a study or a register on no line at all, a standard on a
 *  line for one of its products, a log or a document on a line. An entry says otherwise when it
 *  is otherwise (a value stream map is always a line's). */
const STARTS: Record<Kind, Starts> = { study: 'anywhere', standard: 'product', log: 'line', register: 'anywhere', document: 'line', board: 'anywhere' };

export const startsOf = (e: Entry): Starts | undefined => (e.kind ? e.starts ?? STARTS[e.kind] : undefined);

/** The tools a person can open, in the floor's order. */
export const APP_TOOLS: readonly AppTool[] = ENTRIES
  .filter((e): e is Entry & { app: AppFace; kind: Kind } => !!e.app && !!e.kind && !!e.built?.where.length)
  .map(e => ({ ...e.app, id: e.id, kind: e.kind, starts: startsOf(e) as Starts, to: e.built!.where[0] }))
  .sort((a, b) => a.order - b.order);

/** The app's tools of one kind — a scope's Tools, Products or Logs. */
export const toolsOfKind = (kind: Kind): AppTool[] => APP_TOOLS.filter(t => t.kind === kind);

/** An app tool by its key in the frame. */
export const toolByKey = (key: string): AppTool | undefined => APP_TOOLS.find(t => t.key === key);
