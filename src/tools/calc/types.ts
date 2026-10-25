/* THE CALCULATOR SHAPE — what a calculator's definition is (knowledge/specs/FC-235-calculators.md).
 *
 * A calculator is a named, saved set of inputs for one situation with a formula that turns them into a
 * sentence, a few tiles, the working, the caveats, the money and — only where it earns one — a picture.
 * The SHAPE owns everything that is the same (the record, the form with its units and sources, the live
 * result, the what-if, the saved before, the page, the paper, the line report, the checks on the inputs);
 * a DEFINITION (one file in ./defs/, found by import.meta.glob) owns everything that is the method's own:
 * its inputs and their words, the thresholds that turn a number into a word, the verdict's wording, its
 * caveat, its money and its picture. A definition is never a template filled in: STANDARD.md point 1.
 *
 * Results are DERIVED on every render from the inputs and never stored; the record holds only what a
 * person put in (StudyAgreed.calc) and, if they saved one, the inputs as they were before. */
import type { LeanTile, LeanTone } from '../../lib/lean';

/** The inputs of one calculation, parsed: a number box is a number (or undefined when blank or not a number),
 *  a choice or text box a string. What `compute` and `check` are handed. */
export type Values = Record<string, number | string | undefined>;
/** The inputs as they are kept on the record (agreed.calc.inputs): only what was put in. */
export type Inputs = Record<string, number | string>;

/** What the shape can offer from the line a calculation sits on — the one cost model, never a second. */
export type OfferSource = 'labourRate' | 'materialsPerPack' | 'packsPerMin' | 'marginPerPack';

export interface Offer {
  source: OfferSource;
  /** Where to give it when the line does not have it, said in the sentence "Give the line … to have it offered." */
  where: string;
  /** What the field is told in — the line's figure is multiplied by this first (packs a minute × 60 = an hour). */
  times?: number;
  /** What it is, mid-sentence: "the line’s wage with on-costs". */
  words: string;
}

export interface Choice { value: string; label: string; help?: string }

export interface Field {
  id: string;
  label: string;
  /** Shown after the box: "trays", "hours", "£ a unit", "%". */
  unit?: string;
  kind: 'number' | 'choice' | 'text';
  /** A starting point — ONLY where it is Faultline's own said choice (then `chosen` says why and whose); never a typical figure. */
  default?: number | string;
  chosen?: string;
  min?: number;
  max?: number;
  /** A whole number only. */
  integer?: boolean;
  step?: number;
  /** One line under the box: what to put in, and where to find it on the floor. */
  help?: string;
  options?: Choice[];
  /** May be left blank — the result is then said without it, and (for a money input) says which is missing. */
  optional?: boolean;
  /** A money input: grouped under "In money — all optional", never required, never blocks (MONEY.md rule 5). */
  money?: boolean;
  /** Offered from the line this sits on (its cost model), with the box still typed by hand if the person wants. */
  from?: Offer;
  /** Shown only when this holds — a choice that changes what is asked. */
  showIf?: (v: Values) => boolean;
}

/** Something wrong or doubtful about the inputs. `block` stops the result (it cannot be worked out); otherwise a warning beside it. */
export interface Problem { field?: string; say: string; block?: boolean }

/** A tile of the lean page, with the number behind it so the shape can say "since the saved one before". */
export interface CalcTile extends LeanTile {
  /** The raw number the tile says — compared with the saved before's. */
  n?: number;
  /** Which way is better: for the change's colour. Absent: neither (the change is grey). */
  better?: 'higher' | 'lower';
  /** A count of things (kanbans, orders): a change is "fewer", not "less". */
  counted?: boolean;
  /** The size of a change in the tile's own words: "2 kanbans", "£12.40". */
  fmt?: (n: number) => string;
}

export interface Working { label: string; value: string; note?: string }

export interface CalcMoney {
  /** The finding in money, with its "because": absent when nothing could be worked out. */
  text?: string;
  /** The figures it is made of, label and value. */
  figures?: [string, string][];
  /** The money inputs not given — each a whole sentence saying which and where (nothing is withheld for them). */
  missing: string[];
}

export interface PictureAxis { label: string; min: number; max: number; ticks: number[]; fmt: (n: number) => string }

/** A drawing both the screen (SVG) and the paper (jsPDF) make from the one description — so the two cannot part. */
export interface CalcPicture {
  title: string;
  /** What to read off it, in a sentence. */
  caption: string;
  x: PictureAxis;
  y: PictureAxis;
  lines: { points: [number, number][]; mark?: 'ink' | 'brand' | 'muted'; dash?: boolean }[];
  verticals: { x: number; label: string }[];
  horizontals: { y: number; label: string }[];
  dots: { x: number; y: number; label: string }[];
}

export interface CalcResult {
  /** The band's verdict, a few words: "8 kanbans". */
  verdict: string;
  tone: LeanTone;
  /** The one sentence the calculation says. */
  sentence: string;
  /** Further sentences under it (the method's own readings). */
  more?: string[];
  tiles: CalcTile[];
  /** How it was worked out, line by line, with the numbers in. */
  working: Working[];
  /** What it does not say and when not to trust it — always at least one. */
  caveats: string[];
  money?: CalcMoney;
  picture?: CalcPicture;
  /** The lean page's closing line: where are we, why, and what is being done. */
  closing: string;
}

/** A worked case with its expected outputs — written from an INDEPENDENT source (a textbook figure, SciPy), and used by the
 *  unit test (compute equals it) and by the acceptance script (the page, typed through its real boxes, says it). */
export interface Example {
  name: string;
  /** Where the figures come from: "Monden; scripts/knowledge/cases-calc.py K1". */
  source: string;
  inputs: Inputs;
  expect: { verdict: string; tone: LeanTone; sentence: string; tiles: Record<string, string>; money?: string;
    /** Words each warning beside the answer must carry (a doubtful input that does not stop it). */ warns?: string[] };
}
/** An input set the calculation must REFUSE, and the words the refusal carries. */
export interface Refused { name: string; inputs: Inputs; blocked: string }

export interface CalcDef {
  /** The address and the record's key: lower-case words with hyphens. */
  key: string;
  /** The catalogue entry whose tool this is — its `built.where` includes `/calc/<key>`. */
  fc: string;
  title: string;
  /** What it is for, one line, on the hub and the line's page. */
  says: string;
  /** The floor's question, which the page opens on. */
  question: string;
  /** The hub groups by it. */
  group: string;
  inputs: Field[];
  /** Cross-field checks beyond each box's own range (the shape does those). Only called when every box is sound. */
  check?: (v: Values) => Problem[];
  compute: (v: Values) => CalcResult;
  examples: Example[];
  refused: Refused[];
  /** Calculators that carry on from this one, linked from its page. */
  see?: { key: string; why: string }[];
}
