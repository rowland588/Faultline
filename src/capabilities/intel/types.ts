/* THE TOOL INTELLIGENCE LAYER — what Faultline knows about each of its tools, so the AI can choose one, know what it needs, know how
 * that can be obtained, and know what it can and cannot do through conversation (10 November, docs/AI-TOOL-INTELLIGENCE.md).
 *
 * Rowland, 10 November: "Access to an application's underlying function does not automatically mean the AI can operate the complete
 * tool reliably through conversation … Assess individual operations within each tool … A tool's capability assessment must reflect
 * what is genuinely implemented and available today."
 *
 * One definition a tool, keyed as its connector is (capabilities/connectors). It sits ON the catalogue (what the tool is for, the
 * questions it answers, what it needs and gives — src/catalogue) and the connector (which of describe · fill · capture · read ·
 * report it has); it adds what neither says: what it cannot answer, when it is the wrong tool and what to use instead, what each input
 * is and how it can be obtained, how much evidence is enough, and — operation by operation — the level the AI can work at. The unit
 * test holds every claim to the code: a level 1 or 2 operation names capabilities that exist, a level 3 names the page and what the
 * person does there, a level 4 says why and what to do by hand. */

/** The four operating levels — said of an OPERATION of a tool, never of the whole tool.
 *  1 fully conversational: obtained, operated and reliable through conversation and the app's functions
 *  2 conversational with evidence: it can be done, but it needs measured evidence, records, a document, a photograph
 *  3 assisted human interaction: the AI prepares, guides and interprets; the person works a visual control or does a physical thing
 *  4 not supported today: said plainly, with the manual way */
export type OpLevel = 1 | 2 | 3 | 4;

export const LEVEL_WORD: Record<OpLevel, string> = {
  1: 'by conversation',
  2: 'by conversation, with evidence',
  3: 'with you on the page',
  4: 'not supported yet',
};

/** How information can reach a tool. */
export type Route =
  | 'conversation'    // said or typed in the conversation (reported)
  | 'records'         // already in Faultline: the line's records, another tool's study, the register
  | 'live'            // a live measurement through the conversation: stopwatch, counter, taps (capabilities/connectors/measure)
  | 'page-timer'      // the tool's own stopwatch or taps on its page
  | 'manual'          // measured by hand (a tape, a scale, a stopwatch) and said or typed
  | 'spreadsheet'     // a CSV or Excel file read in code
  | 'document'        // a PDF, Word or text document read in code
  | 'photo'           // a photograph
  | 'video'           // footage
  | 'drawing';        // drawn or placed on the page by the person

export type RouteStatus = 'supported' | 'unavailable' | 'future';

export interface Acquire {
  route: Route;
  status: RouteStatus;
  /** For a supported route: the capability or page that does it. For the others: why not, or what it would take. */
  how: string;
}

/** Something only a person can do — on the screen or on the floor. */
export type Interaction =
  | 'draw' | 'drag' | 'position' | 'select-on-screen' | 'review-visual'
  | 'film' | 'measure-distance' | 'observe' | 'inspect';

export const INTERACTION_WORD: Record<Interaction, string> = {
  draw: 'drawing on the page', drag: 'dragging things on the page', position: 'placing things on the page',
  'select-on-screen': 'picking things on the page', 'review-visual': 'looking at pictures or footage and judging them',
  film: 'filming', 'measure-distance': 'measuring a distance', observe: 'watching the floor', inspect: 'inspecting equipment',
};

export interface Operation {
  id: string;
  /** What the operation does, in a few words. */
  does: string;
  level: OpLevel;
  /** Level 1 · 2: the capabilities that do it, in order. Level 3: the capabilities around the person's part (opening the page,
   *  reading back what they did). */
  how?: string[];
  /** Level 2: the evidence it needs. */
  needs?: string;
  /** Level 3: what the person does, and on which page ('record' — the tool's record; 'line' — the line's page; or an address). */
  interaction?: Interaction[];
  page?: string;
  handover?: string;
  /** Level 3: what the AI reads back once they have done it. */
  after?: string;
  /** Level 4 (and a level 3 that is only partly possible): why, and the manual way. */
  why?: string;
}

export interface Field {
  name: string;
  required: boolean;
  /** How it can be obtained — the first is the best where it is available. */
  routes: Route[];
  /** Worked out by the tool, never asked for. */
  derived?: boolean;
}

export interface ToolIntel {
  key: string;
  /** What the tool actually does, in a sentence. */
  does: string;
  /** Questions it answers (the catalogue's are added to these when read). */
  answers: string[];
  /** Questions it cannot answer — said, so it is never used for them. */
  cannot: string[];
  when: string[];
  notWhen: string[];
  /** A tool to use instead, and when. */
  instead: { key: string; when: string }[];
  /** Where it sits in an investigation, by the methods' words. */
  stage?: string;
  /** What it reads from another record, when it depends on one. */
  dependsOn?: string[];
  fields: Field[];
  /** How much evidence is enough — numbers where the method sets them. */
  enough?: { n: number; of: string; why: string };
  assumptions: string[];
  /** How good the result is in different circumstances. */
  quality: string[];
  acquire: Acquire[];
  ops: Operation[];
}
