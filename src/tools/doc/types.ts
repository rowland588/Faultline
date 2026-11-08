/* THE DOCUMENT SHAPE — what a document's definition is (knowledge/specs/FC-240-documents.md).
 *
 * A document is a named, saved set of boxes for one situation — a charter, a SIPOC, a CTQ table, a Kano survey, an 8D report: text,
 * long text, a choice, a person, a date, a number, a LIST of rows with named columns, and photos. The SHAPE owns everything that is
 * the same (the record, the editor with its helps and its saved-a-moment-after-the-last-key, the list of rows, the photos, the sign-off
 * and the status, the live reading, the page, the paper, the line report, the checks on the boxes); a DEFINITION (one file in
 * ./defs/, found by import.meta.glob) owns everything that is the method's own: its sections and boxes in the floor's words, what
 * is needed before it can be agreed, the reading it gives back (the one sentence, the tiles, the tables worked out from what was
 * typed, the money where the industry has a causation), what it does not say. A definition is never a template filled in
 * (knowledge/STANDARD.md point 1).
 *
 * What the person typed is the record (facts.docValues, facts.docPhotos); what is worked out from it is DERIVED on every render
 * and never stored. */
import type { LeanTile, LeanTone } from '../../lib/lean';

/** One row of a list: its cells by column id. The id keeps a row's place when others are added or taken out. */
export interface DocRow { id: string; c: Record<string, string | number> }

/** What a box holds: text or a number as typed, a list's rows. */
export type DocValue = string | number | DocRow[];
export type DocValues = Record<string, DocValue | undefined>;

export interface DocChoice { value: string; label: string; help?: string }

export type ScalarKind = 'text' | 'long' | 'choice' | 'person' | 'date' | 'number';

/** One box. */
export interface DocField {
  id: string;
  kind: ScalarKind;
  /** In the floor's words — the page's own label, which the guide quotes. */
  label: string;
  /** One line under the box: what to put in, and where on the floor to find it. */
  help?: string;
  /** What a good answer looks like, shown in the empty box. */
  example?: string;
  options?: DocChoice[];
  /** Shown after a number box. */
  unit?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  maxLength?: number;
  /** The document is not ready to agree without it. */
  required?: boolean;
  /** Shown only when this holds — a choice that changes what is asked. */
  showIf?: (v: DocValues) => boolean;
  /** Offered from the project, the line or the person using it ("Use Sam Patel — the project's lead"), in one tap. */
  offer?: (ctx: DocCtx) => { value: string | number; words: string } | undefined;
}

/** A column of a list is a box in a row. */
export type DocColumn = Omit<DocField, 'showIf' | 'offer'>;

/** A table of rows with named columns — the steps of a process, the people on a team, the needs of a customer. */
export interface DocList {
  id: string;
  kind: 'list';
  label: string;
  help?: string;
  /** One row, said: "step", "person", "need" — the Add button and the empty list use it. */
  rowWord: string;
  columns: DocColumn[];
  /** Fewer rows than this is not ready (default 1 when required). */
  min?: number;
  max?: number;
  required?: boolean;
  /** Shown only when this holds. */
  showIf?: (v: DocValues) => boolean;
  /** Another list that does the same job: the need is met when either holds enough rows (a Kano survey typed answer by answer OR tallied by hand). */
  alt?: string;
}

/** Photos taken or chosen, each with a caption, kept on the device and sent to the cloud with the document. */
export interface DocPhotos {
  id: string;
  kind: 'photos';
  label: string;
  help?: string;
  max?: number;
  required?: boolean;
  showIf?: (v: DocValues) => boolean;
}

export type DocItem = DocField | DocList | DocPhotos;

export interface DocSection {
  id: string;
  title: string;
  /** What this part of the document is for, one line. */
  help?: string;
  items: DocItem[];
}

/** Something wrong or doubtful about what was typed — said beside the box and listed under "To put right". A document is never
 *  refused for it: it is saved as typed, and it is simply not ready to agree. */
export interface DocProblem { field?: string; say: string }

/** Something the project or the line holds that a document may read — never stored on the document. */
export interface CtxProblem { id: string; problem: string; status: string; priority?: string; owner?: string; raisedOn?: string; closedOn?: string; due?: string; line?: string }
export interface CtxAction { id: string; what: string; who: string; due?: string; state: 'todo' | 'waiting' | 'done'; doneOn?: string; why?: string }
export interface CtxStudy { id: string; name: string; tool: string; title: string; verdict: string; tone: LeanTone; says: string; href: string }
export interface CtxCause { id: string; bone: string; text: string; root: boolean; whys: number; by?: string }

/** The world outside the document: who is reading it, when, which project and line it is on, and what they hold. */
export interface DocCtx {
  /** ISO day. */
  today: string;
  me?: string;
  projectName?: string;
  lead?: string;
  /** ISO day the project began. */
  projectStarted?: string;
  lineName?: string;
  /** What a pack’s materials cost on the line, £ — offered for what a held unit cost; absent when the line has none. */
  materialsPerPack?: number;
  /** £ an hour for one person, from the line's cost model (wage × on-costs) — absent when the line has none. */
  labourPerHour?: number;
  /** What the project holds (the one reader, project/projectRead). Absent off a project or while it is being read. */
  problems?: CtxProblem[];
  actions?: CtxAction[];
  studies?: CtxStudy[];
  causes?: CtxCause[];
  /** What the project's METHOD sheet holds, by `method:field` ("dmaic:problem") — the words a document may OFFER where it asks the same question; read, never copied. */
  methodAnswers?: Record<string, string>;
  /** The project's newest is / is not specification (FC-149): what the 8D's D2 reads instead of asking twice. */
  isIsNot?: { name: string; since?: string; lines: { dim: string; is: string; isnot: string }[] };
}

/** A table the document works out from what was typed — shown on the page and printed, the same. */
export interface DocTable { title: string; head: string[]; rows: string[][]; shares?: number[]; note?: string }

export interface DocWorking { label: string; value: string; note?: string }

export interface DocMoney {
  /** The finding in money, with its "because": absent when nothing could be worked out. */
  text?: string;
  figures?: [string, string][];
  /** The money inputs not given — each a whole sentence saying which and where (nothing is withheld for them). */
  missing: string[];
  /** The industry has no cost for this document, and why — said instead of a figure, never a blank. */
  none?: string;
}

export interface DocResult {
  /** The one sentence the document says; empty while too little is filled in to say anything. */
  sentence: string;
  /** The colour of the sentence: r and a only where the document itself says something is wrong or to check. */
  tone: LeanTone;
  more?: string[];
  tiles: LeanTile[];
  tables?: DocTable[];
  working?: DocWorking[];
  money: DocMoney;
  /** What it does not say and when not to trust it — always at least one. */
  caveats: string[];
  /** Things to put right, from the definition's own checks. */
  checks: DocProblem[];
  closing: string;
}

/** What signing is called on a document: "Agreed" by the sponsor, "Closed" by the lead. */
export interface DocSignoff {
  /** The word once it is done: "Agreed". */
  word: string;
  /** The word when everything needed is filled in and it waits for them: "Ready to agree". */
  ready: string;
  /** Who does it, mid-sentence: "the sponsor". */
  by: string;
  /** The button: "Agree the charter". */
  ask: string;
  /** Taking it back: "Reopen the charter". */
  back: string;
}

/** A worked case with its expected readings — written from an INDEPENDENT source (a textbook figure, a published table, SciPy), used
 *  by the unit test (the definition's reading equals it) and by the acceptance script (the page, typed through its real boxes, says it). */
export interface DocExample {
  name: string;
  /** Where the figures come from: "Pyzdek & Keller; scripts/knowledge/cases-doc.py C1". */
  source: string;
  values: DocValues;
  /** What the project holds, for a document that reads it. */
  ctx?: Partial<DocCtx>;
  expect: {
    sentence: string;
    /** Tile values by tile name. */
    tiles: Record<string, string>;
    /** The money sentence in full, or absent when the document says none or names a missing input. */
    money?: string;
    /** Words each check must carry. */
    checks?: string[];
    /** Rows of a table by its title (only the first cells of each are compared when shorter). */
    tables?: Record<string, string[][]>;
    /** The required boxes still blank, by label — empty when the example is ready to agree. */
    needs: string[];
  };
}

export interface DocDef {
  /** The address and the record's key: lower-case words with hyphens. */
  key: string;
  /** The catalogue entry whose tool this is — its `built.where` includes `/doc/<key>`. */
  fc: string;
  title: string;
  /** What it is for, one line, on the hub. */
  says: string;
  /** The floor's question, which the page opens on. */
  question: string;
  /** The hub groups by it. */
  group: string;
  /** One of them, said: "charter" — "New charter", "Delete the charter". */
  noun: string;
  sections: DocSection[];
  signoff?: DocSignoff;
  /** Cross-box checks beyond each box's own range (the shape does those). Advisory — the document is saved as typed. */
  check?: (v: DocValues, ctx: DocCtx) => DocProblem[];
  read: (v: DocValues, ctx: DocCtx, photos: DocPhoto[]) => DocResult;
  /** What the project must hold for the definition to read it ("the problems register") — said on the page so a missing part is not a mystery. */
  reads?: string;
  /** Boxes a new document starts with: only a said choice of Faultline's own (what the project's lead is called is offered, never filled in). */
  start?: DocValues;
  examples: DocExample[];
  /** Documents that carry on from this one, linked from its page. */
  see?: { key: string; why: string }[];
}

/** A photo of a document: on the study's facts (facts.docPhotos, an id-keyed list merged across devices), its file in the media store. */
export interface DocPhoto { id: string; field: string; blobKey: string; mime: string; caption?: string; at: number; by?: string; struck?: boolean }

/** Where a document is signed — the agreement is the owner's (the database keeps `agreed` for anyone else on a project). */
export interface DocSigned { by: string; at: number }

/* ------------------------------------------------------------------ a custom sheet (AI Mode, 8 November) */

/** A box of a custom sheet: one of four plain kinds; a list's columns are boxes too (never a list in a list). */
export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'choice' | 'list';
  unit?: string;
  options?: string[];
  /** A list's columns. */
  columns?: { id: string; label: string; type: 'text' | 'number' | 'choice'; unit?: string; options?: string[] }[];
  required?: boolean;
}
export interface CustomSection { id: string; title: string; fields: CustomField[] }
/** A metric worked out BY CODE from the sheet's numbers — never an expression, never the AI's: one of five kinds over named boxes
 *  (a number box by its id, or a list's number column as `list.column` — every row's). */
export interface CustomMetric { id: string; name: string; kind: 'sum' | 'average' | 'ratio' | 'difference' | 'count'; of: string[]; unit?: string }
/** A CUSTOM SHEET's structure, kept on its own record (facts.customDef): the sheet the person described in AI Mode — Rowland,
 *  8 November: "construct new working studies, documentation, data capture structures, metric definitions and reports based on
 *  what I describe". One record's own: it changes no definition and no other record. */
export interface CustomDef { title: string; purpose: string; sections: CustomSection[]; metrics?: CustomMetric[] }
