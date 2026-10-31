/* A MACHINE ON PAPER — the shape every machine paper is drawn in (lib/machinePaperPdf): a machine in full (its
 * reading is lib/machineDetail), a list of machines before them (a line's, a project's, the factory's).
 *
 * Rowland, 27 October: "Machines is good but no report system"; then "all you've done is headlines ... The tests
 * that have been done, you can't see the results" — so a row carries its detail, a line each, and a machine its
 * tiles and its closing line. Pure. */

/** The house's five colours, one meaning each (CLAUDE.md): red gone or failed, amber waiting, violet under way or
 *  ahead, green done, grey not started. */
export type PaperTone = 'r' | 'a' | 'w' | 'g' | 'n';

/** One labelled line of a row's detail (27 October — Rowland: "it's difficult to read ... it must be easy to read
 *  plain English, and nobody can make a mistake when reading this"): what it is on the left ("Has to show",
 *  "Attempt 2 · 26 Oct", "Problem found 27 Oct"), the words on the right — a result, when there is one, first and in
 *  its colour ("DIDN'T PASS"), and a second line under them when the line has more to say (what it aimed at and did). */
export interface PaperDetail { label: string; text: string; word?: string; tone?: PaperTone; more?: string }

export interface PaperRow { what: string; says?: string; word: string; tone: PaperTone;
  /** The detail under it — every attempt, what was seen, what was written, each step of a journey — a labelled line each. */
  detail?: PaperDetail[];
  /** In a table section (what needs doing): what kind of thing it is, who has it and by when, each its own column. */
  kind?: string; who?: string; when?: string }
export interface PaperSection {
  title: string; count: string; rows: PaperRow[]; empty: string;
  /** One plain sentence under the heading — what this part of the report holds. */
  intro?: string;
  /** Drawn as a table — what, who, by when, its status — rather than a card a row. */
  table?: boolean;
}

export interface MachinePaper {
  /** "MACHINE · Line 2 commissioning" */
  eyebrow: string;
  name: string;
  status?: { word: string; tone: PaperTone };
  /** Who made it, when it came, its line — each a short fact. */
  facts: string[];
  /** "Going through Line 2 commissioning — an installation project — up to Commission." */
  inProject?: string;
  gates?: { label: string; says: string; tone: PaperTone }[];
  sections: PaperSection[];
  /** A few counted figures, each of what it should be (the lean page's tiles). */
  tiles?: { label: string; value: string; of?: string; tone: PaperTone }[];
  /** The machine in one sentence, at the foot (the lean page's closing line). */
  closing?: string;
}

/** A row on a list of machines: its name, its status, its line of words and what is next. */
export interface MachinesPaperRow { n?: number; name: string; status?: { word: string; tone: PaperTone }; says: string; right: string; rightTone?: PaperTone }

/** Several machines: a front of rows (grouped by line, or one group), then — when any — a page a machine. */
export interface MachinesPaper {
  eyebrow: string;
  title: string;
  says: string;
  groups: { head?: string; rows: MachinesPaperRow[]; empty?: string }[];
  machines: MachinePaper[];
  /** The foot of every page. */
  foot: string;
}

/** A status word's colour — handed over green, not here yet grey, the rest under way. */
export const statusTone = (word: string): PaperTone => (word === 'Handed over' ? 'g' : word === 'Not here yet' ? 'n' : 'w');
