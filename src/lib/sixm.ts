/* THE 6M — the cause families a running line's improvement is organised by.
 *
 * Decided with Rowland, 4 October (docs/OPEX.md, docs/SIXM.md): the
 * traditional Ishikawa fishbone, in plain words. It replaces People · Plant ·
 * Process ("3P"), which was three of these six; Material, Measurement and
 * Environment were the ones being lost inside the other three.
 *
 * Every finding, cause and countermeasure on a running line sits on one bone.
 * The bones make people look everywhere (not just blame the machine), route
 * ownership (engineering, the line manager, purchasing…), and give the client
 * the balanced picture. They are the LENS of the method, not its spine — the
 * spine is the gap → the problem → its causes → the countermeasures → proof
 * → holding (lib/fishbone.ts).
 *
 * The rule of thumb that keeps Machine and Measurement apart: equipment that
 * DOES the work is Machine; equipment or data that CHECKS or COUNTS the work
 * is Measurement. A photo-eye that finds the print mark is Machine; a
 * checkweigher rejecting good packs, or stops that were never logged, is
 * Measurement. */
import type { MediaRef } from '../types';

export type SixM = 'people' | 'machine' | 'method' | 'material' | 'measurement' | 'environment';

/** In the order the fishbone draws them — the four everyone names first, then
 *  the two that are easiest to forget. */
export const SIXM: { key: SixM; label: string; blurb: string }[] = [
  { key: 'people',      label: 'People',      blurb: 'who runs it, and whether they can' },
  { key: 'machine',     label: 'Machine',     blurb: 'the equipment that does the work' },
  { key: 'method',      label: 'Method',      blurb: 'the way the work is done' },
  { key: 'material',    label: 'Material',    blurb: 'the product, and what it is made and packed with' },
  { key: 'measurement', label: 'Measurement', blurb: 'how we check and count' },
  { key: 'environment', label: 'Environment', blurb: 'the conditions around the line' },
];

export const sixmLabel = (m: SixM | undefined | null): string => SIXM.find(x => x.key === m)?.label ?? '';

/** A bone from what is stored: the six keys, or the old 3P words — People
 *  stays People, Plant became Machine, Process became Method. Anything else
 *  is not sorted yet (null), never guessed. */
export function toSixM(v: string | null | undefined): SixM | null {
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return null;
  if (SIXM.some(x => x.key === s)) return s as SixM;
  if (s === 'plant') return 'machine';
  if (s === 'process') return 'method';
  if (/^(people|person|team|labour|labor|manning|crew|training|skills?|leader)/.test(s)) return 'people';
  if (/^(machine|machinery|equipment|asset|plant|kit|engineering|tooling)/.test(s)) return 'machine';
  if (/^(method|process|procedure|sop|standard|changeover|way of working)/.test(s)) return 'method';
  if (/^(material|product|film|packaging|ingredient|supplier)/.test(s)) return 'material';
  if (/^(measure|measurement|gauge|checkweigher|metal detector|vision|calibrat|data)/.test(s)) return 'measurement';
  if (/^(environment|temperature|humidity|heat|dust|hygiene|condition)/.test(s)) return 'environment';
  return null;
}

/* ------------------------------ evidence ------------------------------ */

/** How a cause is known — the grades every OpEx discipline uses, in plain
 *  words. Only MEASURED causes get a share of the gap; the rest are shown as
 *  what they are, never given invented numbers. */
export type Grade = 'measured' | 'counted' | 'observed' | 'reported';
export const GRADES: { key: Grade; label: string; blurb: string }[] = [
  { key: 'measured', label: 'Measured', blurb: 'data over time — the stops, the readings' },
  { key: 'counted',  label: 'Counted',  blurb: 'a check or audit — crew against the standard, skills' },
  { key: 'observed', label: 'Observed', blurb: 'seen first-hand on the line, by a named person' },
  { key: 'reported', label: 'Reported', blurb: 'told by someone' },
];

/** A cause is suspected until it is confirmed (go and see, check the data) or
 *  ruled out. Only a confirmed cause is drilled to its root. */
export type CauseStatus = 'suspected' | 'confirmed' | 'ruled_out';

/** Where a cause came from — what the fishbone was filled from. `ref` points
 *  back at the record (an observation drill path, a snag id, a station…). */
export interface CauseSource {
  kind: 'pareto' | 'snag' | 'standard' | 'capacity' | 'material' | 'program' | 'reading' | 'observation';
  ref?: string;
  label?: string;
  /** For a time-based source, the loss it carries — minutes a week. */
  minutesWeek?: number;
}

/** One "why" in the chain under a cause; the last one is the root. */
export interface Why { id: string; text: string; grade?: Grade }

/** A cause on a bone of the fishbone. Stored on the problem (cases.causes)
 *  as a list merged by id, so two devices adding causes both keep theirs. */
export interface Cause {
  id: string;
  m: SixM;
  text: string;
  grade: Grade;
  status: CauseStatus;
  source?: CauseSource;
  /** The five whys, drilled from this cause down. A second line of reasoning
   *  is a second cause on the bone — the chains branch that way. */
  whys: Why[];
  /** The chain has reached a cause the team can act on and that passes the
   *  "therefore" test read back up to the problem. */
  root?: boolean;
  /** Who put it there and when — an observation is only evidence with a name
   *  and a day on it. */
  by?: string;
  at: number;
  media?: MediaRef[];
}

/** What the head of the fish was taken from. */
export interface ProblemSource {
  kind: 'gap' | 'pareto' | 'constraint' | 'observed';
  /** For a Pareto bar: its loss category, sub-category and machine. */
  category?: string;
  subcategory?: string;
  asset?: string;
  /** For the gap: the measure. For the constraint: the station. */
  measureId?: string;
  station?: string;
  /** Opened from a bar outside the vital few: why it still earns a root
   *  cause — safety, quality, the constraint (docs/SIXM.md, the working
   *  method). Absent for the vital few, which need no reason. */
  why?: string;
}

/** Keeping the gain — the check that says the fix is still working. */
export interface HoldCheck {
  what: string;
  who?: string;
  /** How often it is looked at, in days. */
  everyDays: number;
  since: string;          // YYYY-MM-DD
  lastChecked?: string;   // YYYY-MM-DD
  /** Whether the standard was updated with the new way of working. */
  standardUpdated?: boolean;
}

/* --------------------- where a timed stop's bone comes from --------------------- */

/** Words for the air around the line, not the machine's own heat. */
const ROOM = /humid|condensation|dust|draught|lighting|ambient|room temp|hot day|cold day|weather|damp/;

/** The bone a timed stop most likely belongs on, from its loss category and
 *  sub-category (lib/taxonomy.ts) — used only when the floor did not say
 *  (Observation.causeM). A suggestion, always shown as one, never stored as a
 *  cause until somebody accepts it.
 *
 *  In this order: the stop's own note naming the room's conditions
 *  ("condensation on the eye") — the floor's account of THIS stop, and the
 *  bone no sub-category names; then the sub-category's usual bone (boneOfSub,
 *  the shipped map); then the words of the sub-category and note; then the
 *  loss category. */
export function boneOfStop(category: string, subcategory?: string, note?: string): SixM {
  if (ROOM.test((note ?? '').toLowerCase())) return 'environment';
  const usual = boneOfSub(subcategory);
  if (usual) return usual;
  const t = `${subcategory ?? ''} ${note ?? ''}`.toLowerCase();
  if (/film|splice|reel|label|carton|tray|bag|pack(ag)?ing|product|ingredient|spec|supplier|material/.test(t)) return 'material';
  if (/checkweigh|metal detect|vision|reject|calibrat|scale|gauge|counter|sensor read|not logged/.test(t)) return 'measurement';
  /* The room's conditions, not the machine's: "seal jaw temperature" is the
     machine's own heat (Machine), "hot day", "humidity" or "condensation" is
     the air around the line (found by the engine agent). */
  if (ROOM.test(t)) return 'environment';
  if (/operator|crew|staff|labour|training|absence|short|agency|break|shift/.test(t)) return 'people';
  if (/changeover|set.?up|clean|sop|standard|procedure|method|schedule/.test(t)) return 'method';
  switch (category) {
    case 'Changeover': return 'method';
    case 'Waiting': return 'people';
    case 'Hygiene & cleaning': return 'method';
    case 'Quality': return 'material';
    default: return 'machine';   // Breakdown, Minor stop, Speed loss
  }
}

/* ------------------- how a cause is known, in plain words ------------------- */

/** The grades as the working method says them (docs/SIXM.md): seen · data ·
 *  counted · told. The stored keys do not change. */
export const KNOWN_WORD: Record<Grade, string> = {
  measured: 'data', counted: 'counted', observed: 'seen', reported: 'told',
};

/* --------------------- the bone a sub-category points at --------------------- */

/** The bone a stop's sub-category usually belongs on — shipped food
 *  knowledge (lib/taxonomy), so a Pareto is sorted onto the six bones without
 *  anyone sorting it. A suggestion: the chain on the problem says the real
 *  bone, and the floor's own tap (Observation.causeM) beats it. Keyed by the
 *  sub-category exactly as lib/taxonomy ships it (matched ignoring case);
 *  undefined means "no usual bone — guess from the words". */
export const DEFAULT_BONE: Record<string, SixM> = {
  /* Machine — the equipment that DOES the work. A seal is made by the jaws;
     a utility (air, steam, chill) is plant engineering owns. */
  'Mechanical': 'machine',
  'Electrical': 'machine',
  'Utilities (air / steam / chill)': 'machine',
  'Sensor trip': 'machine',
  'Sensor / photo-eye fault': 'machine',
  'Tooling': 'machine',
  'Seal fault': 'machine',
  'Running below rated': 'machine',
  /* Measurement — what CHECKS or COUNTS the work, or holds it to be checked. */
  'Checkweigher false reject': 'measurement',
  'Waiting QA release': 'measurement',
  'Swab / QA hold': 'measurement',
  /* Material — the product, and what it is made and packed with. */
  'Film / packaging snag': 'material',
  'No packaging / consumables': 'material',
  'No ingredients': 'material',
  'Product out of spec (size / shape)': 'material',
  /* Method — the way it is done: changeovers, standards, cleaning, the plan. */
  'Setup': 'method',
  'No standard': 'method',
  'Product change': 'method',
  'Size / format change': 'method',
  'Allergen changeover': 'method',
  'Hygiene cleandown': 'method',
  'Label / date change': 'method',
  'Scheduled clean': 'method',
  'Unscheduled clean': 'method',
  'Short runs': 'method',
  'Waiting forklift / logistics': 'method',
  /* People — who runs it, and whether they can. */
  'No labour': 'people',
  'Untrained cover': 'people',
  'Uneven crewing': 'people',
  /* Environment — the conditions around the line. */
  'Condensation / ambient temperature': 'environment',
  /* Left out on purpose — no usual bone, so the words decide: Jam /
     blockage, Misfeed, Manual clear (any of the six), Starved upstream and
     Blocked downstream (the cause is at the other machine), Reject, Rework,
     Scrap / waste, Giveaway / overfill, Underweight reject, Label / date
     fault, Foreign body / detector reject (each a symptom any bone can
     cause). */
};

export function boneOfSub(subcategory: string | undefined): SixM | undefined {
  const k = (subcategory ?? '').trim().toLowerCase();
  if (!k) return undefined;
  const hit = Object.keys(DEFAULT_BONE).find(s => s.toLowerCase() === k);
  return hit ? DEFAULT_BONE[hit] : undefined;
}

/** A why that ends at a person is not a root cause (docs/OPEX.md). Returns
 *  the prompt to ask instead, or null. */
export function blamesAPerson(text: string): string | null {
  /* Phone keyboards type the curly apostrophe ("didn’t"): both count. */
  return /\b(operator|human|they|he|she|staff|someone|somebody|fitter|engineer)\b.*\b(error|forgot|mistake|didn[’']?t|did not|failed to|careless|wrong)\b|\b(human error|operator error|not following|didn[’']?t follow|forgot)\b/i.test(text)
    ? 'What let that happen? A missing standard, an unclear instruction, no check, no training, or a design that allows it?'
    : null;
}
