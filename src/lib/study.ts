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
import type { VideoEvent, VideoSource } from '../tools/video/record';
import type { FootageGone } from '../tools/video/footage';
import type { ID } from '../types';
import type { TalkTurn } from '../tools/talk/talk';

/** Every tool a study can be a use of. The cloud's check constraint holds the
 *  same list (studies_tool_check): a tool added here is a migration there. */
export const STUDY_TOOLS = ['capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout', 'talk', 'reliability', 'chart', 'analysis', 'calc', 'log', 'ledger', 'doc', 'scored', 'board', 'run'] as const;
export type StudyTool = typeof STUDY_TOOLS[number];

export const isStudyTool = (v: unknown): v is StudyTool => (STUDY_TOOLS as readonly unknown[]).includes(v);

/** How a measured test is judged, agreed before the readings go in — by the
 *  owner on a job (can.agree). Either limit may be absent: "at least 400 g". */
export interface AgreedReadings {
  /** a measurement against one limit or two · sold by weight (the packers'
   *  three rules from the nominal) · pass or fail, one at a time ("ticks" is
   *  the stored word, kept so every study reads as before) */
  kind: 'limits' | 'packers' | 'ticks' | 'rejects' | 'faults' | 'rate';
  /** W1 (knowledge/specs/FC-094-capability.md, parts 2–4 — 24 October). A measurement's
   *  question, which only changes the words and the one box each needs: a plain measurement
   *  (absent), residual oxygen in a pack, a seal's strength, a CCP's limit, a weigher's heads,
   *  one machine's consecutive parts (Cm/Cmk, FC-084). */
  question?: 'oxygen' | 'seal' | 'ccp' | 'weigher' | 'machine';
  /** Rejects out of what was made (FC-098) · faults found on each item (FC-099): the maximum agreed,
   *  in % — "at most 1% rejected", "at most 2 faults per 100 items". */
  maxShare?: number;
  /** Faults: the opportunities for a fault on one item, for DPMO (FC-102) — typed once, kept fixed. */
  opportunities?: number;
  /** Faults: the kinds the tally counts (FC-124), up to twelve words; "Other" is always offered. */
  faultKinds?: string[];
  /** Held at a rate (FC-083): the minutes in one interval (default 1); `count` is the intervals the
   *  rate must hold for; `lower` the floor or `upper` the ceiling, in the line's unit a minute. */
  intervalMin?: number;
  /** Held at a rate: the share of intervals that must be met to call it held with gaps, in % (default 90). */
  heldShare?: number;
  /** Machine capability (FC-084): the Cmk agreed for acceptance (default 1.67, said as the OEM's). */
  cmkAgreed?: number;
  /** Oxygen, seal, CCP (FC-167, FC-165, FC-169): where the limit comes from — the spec, the HACCP plan, the
   *  distribution trial — said beside it. */
  limitSource?: string;
  /** A CCP (FC-169): the probe's bias at the limit, in the unit — reads high when positive — applied as a
   *  guard band (`foodsafety.ccp-monitoring`). */
  probeBias?: number;
  /** Sold by volume, checked by weight (FC-163): the nominal in millilitres and the density in g/ml; `nominal`
   *  then holds their product in grams, and the TNE is the volume table's, converted. */
  nominalMl?: number;
  density?: number;
  /** Several deposits in one pack (FC-116, knowledge/specs/FC-116-stackup.md): each deposit's mean and spread, in the study's unit — the pack's
   *  spread is their root sum of squares. On a sold-by-weight study, or a measurement with a lower limit. */
  deposits?: { name: string; mean: number; sd: number }[];
  unit?: string;
  nominal?: number;
  lower?: number;
  upper?: number;
  /** How many readings it needs. */
  count: number;
  /** Pass or fail: how many may fail and it still passes (knowledge/specs/
   *  FC-094-capability.md). Absent on every study before 22 October — none
   *  may, the old rule. */
  allowFail?: number;
  /** Pass or fail: how it is judged (knowledge/specs/FC-094-capability.md, part 1b — Rowland, 23
   *  October): a number that may fail (absent — every study before reads so), a loss allowed (at least
   *  `good` % good), or a confidence level (`conf` confident at least `good` % good). */
  judge?: 'count' | 'loss' | 'confidence';
  /** Pass or fail: the share good it is judged against, in % — 98 for "at least 98% good". */
  good?: number;
  /** Pass or fail: how confident what the count proves is said — 0.9, 0.95 (absent) or 0.99. */
  conf?: number;
  /** MONEY (knowledge/specs/FC-156-capability-money.md — Rowland, 24 October: typed on each
   *  study, never read off the line): the packs a shift and the shifts a week the finding is scaled
   *  to; what the product costs a kilo (give-away, a measured study with a nominal in g or kg); a
   *  pack's materials and one rework (a failed item by its fate). Every one optional — the study
   *  says what is missing, and invents nothing. */
  packsPerShift?: number;
  shiftsPerWeek?: number;
  costPerKg?: number;
  materialsPerPack?: number;
  reworkPerPack?: number;
}

/** One reading, as taken. Struck, never erased: a mistype keeps its place. */
export interface StudyReading {
  id: string;
  /** limits, packers */
  value?: number;
  /** ticks */
  ok?: boolean;
  /** rejects (FC-098): one run — how many were made and how many of them rejected. */
  made?: number;
  rejected?: number;
  /** faults (FC-099): one inspection — how many items looked at, how many faults found, and the
   *  faults by kind (FC-124), the counts summing to `faults`; a kind not on the list is "Other". */
  inspected?: number;
  faults?: number;
  kinds?: Record<string, number>;
  /** a weigher's reading (FC-158): the head it came from, 1-based. */
  head?: number;
  /** a control chart's reading (W2): its product and that product's nominal on a short-run chart; its
   *  subgroup on an X̄ chart (1-based); what was done at it goes in `note` — "Adjusted", "New reel" */
  product?: string;
  nominal?: number;
  group?: number;
  /** an analysis's reading (W3a): the arm it belongs to — "before", "after" — and, for a pair, the second way's
   *  value (`value` is the first); a counted run reuses `made` and `rejected` (a rate: `rejected` the count, `made`
   *  the hours) */
  arm?: string;
  with?: number;
  /** an analysis's reading (W3b): a table's count — `arm` is its row, `col` its column, `made` the count — and a
   *  relation's row — `xs` the drivers in the order agreed, `value` the result */
  col?: string;
  xs?: number[];
  /** A failed item: what became of it (Rowland, 24 October — reworked, recovered by hand, or pure
   *  waste). Absent on every reading before: waste. */
  fate?: 'waste' | 'rework' | 'recovered';
  at: number;
  who?: string;
  note?: string;
  struck?: boolean;
}

/** The minutes a changeover must come in at — the stop, with the external work done before and after, as
 *  StandardChangeover.minutes is. Set by whoever may agree it (can.agree). */
export interface AgreedChangeover { minutes: number }

/** The most a counted shift may lose, in minutes — what lossSays judges the count against. */
export interface AgreedLosses { maxLostMin: number }

/** A WORK BALANCE's agreement (docs/TOOLKIT.md, tools 3 and 4): the takt it
 *  is balanced against, and the allowance added to the timed work — agreed
 *  before the timing, by the owner on a job. */
export interface AgreedBalance {
  /** Seconds a piece of the LINE's unit: the pace the line must keep. */
  taktSec: number;
  /** TAKEN FROM LINE CAPACITY'S TARGET (Rowland, 17 October: the line
   *  balance "can be linked directly to the capacity"): the target lives in
   *  Line capacity, and the takt follows it — 60 ÷ the target a minute.
   *  Absent: agreed here, by hand, as before (a line with no target). */
  from?: 'target';
  /** Relaxation and contingency together, as a fraction: 0.14 is 14%. */
  allowance?: number;
  /** THE ALLOWANCE AS ITS PARTS (FC-025, knowledge/specs/FC-032-line-balance.md): each cause named
   *  with the percentage the site agreed for it — typed, never supplied (the ILO's table is not
   *  built in). When there are parts, `allowance` is their sum, kept so every reader still has it. */
  parts?: AllowancePart[];
}

/** One named part of an allowance — "Standing", 2 (per cent). */
export interface AllowancePart { id: string; name: string; pct: number }

/** One lap of a stopwatch on one element: what it took, when, who timed it.
 *  Foreign (an interruption) or struck (a mistake) are kept and count for
 *  nothing. */
export interface Lap { id: string; sec: number; at: number; who?: string; foreign?: boolean; struck?: boolean }

/** ONE ELEMENT OF WORK — the floor's words, whose it is, and how long it
 *  takes: timed (laps and the pace seen) or, until it is timed, typed. */
export interface BalanceStep {
  id: string;
  order: number;
  /** "Fold the case and tape it". */
  name: string;
  /** The person doing it — a person on the map ("Op 1"). */
  who: string;
  laps?: Lap[];
  /** The pace seen, on the British Standard scale: 100 is standard. */
  rating?: number;
  /** A time typed in, used until the element is timed — said "typed". */
  typedSec?: number;
  /** WHAT KIND OF TIME IT IS (the standardised work combination table):
   *  work, walking, or waiting — for a machine, for the next piece.
   *  Absent: work. Walking and waiting are told apart by fill and word,
   *  never by a state colour; waiting is time a person could take work in. */
  kind?: StepKind;
  /** THE ORDER OF THE WORK (FC-033): the steps (ids) that must come before this one. */
  after?: string[];
  /** THE FIVE QUESTIONS ASKED OF IT (FC-028): what is proposed, and what it is expected to take. */
  ecrs?: EcrsDecision;
  /** STANDARD DATA (FC-024): this step's basic time taken from the same step timed on another product. */
  reuse?: ReusedTime;
}

/** Walking and waiting by fill and word; **machine** is the machine's own run — it starts when the step
 *  before it ends and goes on alongside the person's next steps (the combination table, FC-007). */
export type StepKind = 'work' | 'walk' | 'wait' | 'machine';

/** Eliminate · Combine · Rearrange · Simplify — the ILO's critical examination, in its order. */
export type EcrsHow = 'E' | 'C' | 'R' | 'S';

/** What is proposed for one step and what it is EXPECTED to take (a standard time, seconds) — expected,
 *  until the work is timed again. `into`: the step a combined one joins (it gains `afterSec`); `to`: the
 *  person a rearranged one goes to ('' = off the line). */
export interface EcrsDecision { how: EcrsHow; afterSec?: number; into?: string; to?: string; why?: string; oneOff?: number }

/** A basic time borrowed from another product's timing of the same step: what it was, from how many
 *  cycles, and where it came from. */
export interface ReusedTime { basicSec: number; n: number; enough: boolean; product: string; studyId: string; stepId: string; at: number }

/** A PERSON IN THE LINE BALANCE, AND WHERE THEY ARE ON THE LINE — the
 *  station of the product's Line capacity they work at (Rowland, 17 October:
 *  "what is happening where and what people are doing"). Keyed by id, so two
 *  phones each keep what they set. `per` and `unit` are that station's,
 *  copied when it is linked and kept up with the capacity: a person at the
 *  tray loader times a TRAY, so their cycle is seconds a tray and their takt
 *  the line's takt × the packs in a tray. */
export interface BalanceCrew {
  id: string;
  /** As on the elements — "Op 1". */
  who: string;
  /** The Line capacity station's id. Absent: on no station (their cycle is
   *  then one of the line's own unit). */
  stationId?: string;
  /** The station's name, kept for paper and for when it is gone. */
  station?: string;
  /** How many of the line's unit are in one piece of theirs — 8 packs a tray. */
  per?: number;
  /** What one piece of theirs is — "trays". */
  unit?: string;
}

/** THE VALUE STREAM (docs/TOOLKIT.md, tool 2): one step on a line's map —
 *  Rowland, 11 October: "keep the line large, different departments can
 *  affect the line", so a step is done by anyone whose work touches the
 *  line: an operator, the machine, the team leader, planning, stores,
 *  quality, maintenance. And "see the VSM like a grid — a swimlane grid. We
 *  can see a journey of what, who and the value": each step sits in the lane
 *  of who does it (or where), in the column of its turn, coloured by its value. */
export type FlowKind = 'operation' | 'move' | 'check' | 'wait' | 'store';
/** Adds value (only an operation can), needed (not value, but required —
 *  compliance, safety), or waste. Shown by fill, never by a state colour. */
export type FlowValue = 'adds' | 'needed' | 'waste';
export interface FlowStep {
  id: string;
  order: number;
  /** In the floor's (or the office's) own words. */
  name: string;
  /** MULTI-DIMENSIONAL (Rowland, 11 October: "we need it to be multi
   *  dimensional"): a step is what is done, WHO does it — one or more
   *  people or roles ("Op 1", "Op 2", "the machine", "Planner") — and WHERE
   *  — the area, station or machine ("Case packer", "Despatch", "the office").
   *  The grid's lanes are either; a step done by two people sits in both of
   *  their lanes, in the same column. */
  who?: string[];
  where?: string;
  /** The one lane a step had before it had both (B1, B1b) — read through
   *  whoOf / whereOf; still written, as the first who or the where, so an
   *  older build shows the step in a lane. */
  lane?: string;
  kind: FlowKind;
  value?: FlowValue;
  /** Seconds the work takes each time it is done. */
  cycleSec?: number;
  /** Pieces it covers each time — an order of 9,600, a week's plan, a
   *  pallet. Absent: one. Takt is held against the time a piece. */
  batch?: number;
  /** Seconds it sits before the next step. */
  waitSec?: number;
  /** Units sitting before it — turned into days of demand when demand is agreed. */
  queue?: number;
  people?: number;
  /** How its next job reaches it (VSM 4.0, kept light): "phone", "email",
   *  "the ERP", "paper", "the board". */
  info?: string;
  /** A kaizen burst: something here must change. */
  burst?: boolean;
  /** How its time is known — timed on the walk, typed, or CARRIED from the
   *  map before when a fix is being proved (Prove it copies the steps as
   *  they were; each is walked or typed again, and until then says so). */
  source?: 'timed' | 'typed' | 'carried';
}

/** What a value stream is held against: the customer's demand and the
 *  time available, so takt and days of inventory can be worked out. */
export interface AgreedMap {
  /** What it covers — now always 'line'. Rowland, 11 October: "who does it"
   *  as departments is a cross-functional business map; "that won't work for
   *  a single mapping of a line"; then "remove business-wide mapping ... but
   *  keep the line large, different departments can affect the line". So a
   *  map is ONE LINE's, its lanes everyone whose work touches it (Op 1, the
   *  machine, the team leader, planning, stores, quality, maintenance).
   *  'business' or absent: a map saved door to door before that (B1) — still
   *  read, its one lane per step taken as where. */
  scope?: 'business' | 'line';
  /** Pieces the customer takes a day. */
  demandPerDay?: number;
  /** Seconds a day the work is done in. */
  availableSecPerDay?: number;
  /** The customer and the supplier — the two ends of the stream. */
  customer?: string;
  supplier?: string;
  /** MONEY (knowledge/specs/FC-001-value-stream-money.md, 24 October — every cost optional, the
   *  missing one named): what a piece has cost by the time it waits (£), and the business's
   *  carrying rate a year (%) — capital, storage, service and risk; no default. */
  pieceCost?: number;
  carryingRatePerYear?: number;
}

/** SMED (docs/TOOLKIT.md, tool 6 — stored as `changeover`): one ELEMENT of
 *  changing the line from one product to the next, from the last good piece
 *  of the old product to the first good piece of the new at full rate — the
 *  run-up and the adjustments are elements too. Timed on the phone as it
 *  happens (Lap), typed, or CARRIED from the changeover before when a fix is
 *  being proved. Each is INTERNAL (done with the line stopped) or EXTERNAL
 *  (could be done while it runs) — Shingo's first distinction. */
export type ChangeoverSide = 'internal' | 'external';
/** Shingo's four functions of a changeover: preparing and checking
 *  materials and tools; removing and fitting; setting, measuring and
 *  adjusting; trial runs and the run-up to rate (typically half of it). */
export type SmedFunction = 'prepare' | 'mount' | 'adjust' | 'trial';
/** What is planned for an element: CONVERT it to external (stage 2),
 *  STREAMLINE it (stage 3), ELIMINATE it (an adjustment made unnecessary),
 *  or KEEP it as it is. */
export type SmedPlanKind = 'convert' | 'streamline' | 'eliminate' | 'keep';
/** How: converting — prepare in advance (kits, pre-heat, pre-stage),
 *  standardise the function (same heights, same fixings), an intermediate
 *  jig; streamlining — in parallel (two people), quick-release clamps
 *  instead of bolts, no adjustment (fixed stops, settings recorded,
 *  go/no-go), organise the external work (5S, shadow boards, kits). */
export type SmedHow = 'prepare' | 'standardise' | 'jig' | 'parallel' | 'clamps' | 'no-adjust' | 'organise';
export interface SmedPlan {
  kind: SmedPlanKind;
  how?: SmedHow;
  /** In the floor's words: "pre-heat the spare jaws in the oven". */
  note?: string;
  /** Seconds it is to take inside the stop after the plan — a streamlined
   *  element's target; for a converted one, what is left inside (absent: none). */
  targetSec?: number;
  /** In parallel: the element it is to run alongside, and who is to do it. */
  alongside?: string;
  crew?: string[];
}
export interface ChangeoverStep {
  id: string;
  order: number;
  /** The floor's words: "Change the former tube". */
  name: string;
  /** Seconds it took. Absent until it is timed or typed. */
  sec?: number;
  side: ChangeoverSide;
  source: 'timed' | 'typed' | 'carried';
  /** When it was timed or typed, and by whom (the person with the phone). */
  at?: number;
  who?: string;
  /** WHO DOES IT — the grid's lanes (Op 1, the fitter, the team leader); two
   *  people on one element sit in both lanes. */
  crew?: string[];
  /** WHERE — the part of the machine (the film unit, the jaws, the former). */
  where?: string;
  /** Done at the same time as another element (its id): the two share a
   *  column of the grid, and the changeover takes the longer of them. */
  alongside?: string;
  fn?: SmedFunction;
  plan?: SmedPlan;
  /** An external element: done before the line stops, or after it runs again
   *  (absent: worked out from where it falls in the sequence). */
  when?: 'before' | 'after';
}

/** HOW THE LINE RUNS — asked, never assumed (Rowland, 12 October: "it could
 *  be 7 days a week, but it could be the amount of hours as well of running
 *  time, because we could have different shifts"). */
/** Where a SMED study's line speed came from (StudyFacts.ratePerMin). */
export type SmedRateFrom = 'plate' | 'person' | 'standard' | 'line' | 'typed';

export interface RunningPattern {
  shiftsPerDay?: number;
  /** Hours a shift, when every shift is the same length … */
  hoursPerShift?: number;
  /** … or each shift's hours, when they differ (one per shift). */
  shiftHours?: number[];
  /** PLANNED BREAKS THE LINE STOPS FOR, minutes a shift — a shift's running
   *  time is the shift less these (docs/CAPACITY.md §5: planned production
   *  time). Breaks covered by relief, the line running on, are not counted:
   *  0 is an answer. Asked, never assumed. */
  breakMin?: number;
  /** … or each shift's breaks, when the shifts are told apart (one per shift). */
  shiftBreaks?: number[];
  daysPerWeek?: number;
  /** Weeks a year the line runs — for the year's figure; absent, no year is said. */
  weeksPerYear?: number;
}

/** A product run on the line, for the changeover's interval (every product
 *  every how many days): what the customer takes a day and the line's rate
 *  on it — the line balance's target, offered, or typed — or its run time a
 *  day typed outright where there is no rate. */
export interface ChangeoverProduct {
  id: string;
  product: string;
  /** Its line standard, when it has one on the line. */
  standardId?: string;
  /** Pieces a day. */
  demandPerDay?: number;
  /** The line's rate on it, a minute. */
  ratePerMin?: number;
  /** Minutes a day, typed where there is no rate to work it out from. */
  runMinPerDay?: number;
}

/** THE AGREED CHANGEOVER into a product, kept on its line standard inside
 *  the balance's `capacity` (Set as the standard — lib/ie/changeover): the
 *  sequence as agreed, its minutes, when, by whom and from which study. One
 *  per product it is changed FROM: a line changes to a product from many. */
export interface StandardChangeover {
  id: string;
  from?: string;
  steps: { name: string; side: ChangeoverSide; sec?: number; fn?: SmedFunction; crew?: string[]; plan?: SmedPlan; when?: 'before' | 'after' }[];
  /** The agreed minutes: the stop, with the external work done before and after. */
  minutes: number;
  /** The plan's minutes — streamlined — when the elements carry a plan. */
  targetMinutes?: number;
  /** The checklist: what is prepared before the line stops, what is done
   *  with it stopped, what after it runs again. */
  checklist?: { before: string[]; stopped: string[]; after: string[] };
  agreedAt: number;
  by?: string;
  fromStudyId: string;
}

/** WORK SAMPLING (docs/TOOLKIT.md, tool 9): who is watched, the activities
 *  a tap can be, the margin wanted, and the shift's random moments — drawn
 *  once when it starts, so every phone asks at the same instants. Agreed
 *  before the first tap, so a tap never moves what it is counted against. */
export interface AgreedSampling {
  /** The people or roles watched — "Op 1", "Op 2", the team leader. */
  who: string[];
  /** What a tap can say: working · walking · waiting · searching · away, in the floor's words. */
  activities: string[];
  /** The margin wanted on each share, in points: 5 is ±5. */
  marginPts: number;
  /** The shift watched. */
  from: number;
  to: number;
  /** The instants the phone asks at, inside the shift. */
  prompts: number[];
  /** Instants in `prompts` that were TAKEN BY HAND ("Take a sample now") rather than drawn at random — kept apart so
   *  the page and the paper say how many of the moments were not random (tools/sampling takeNow). */
  extra?: number[];
  /** A BOTTLENECK WALK (docs/CAPACITY.md §3): the line's stations watched
   *  instead of people, each tapped working · starved · blocked · down at
   *  each moment — Roser's walk, repeated, on a product's line standard. */
  walk?: boolean;
  /** A program's criterion (30 October): the share of the time the first activity (the work itself) must be at least,
   *  in % — for every person watched, read with the margin their taps allow. Absent: shares only, no verdict. */
  workAtLeast?: number;
}

/** A SHIFT'S LOSSES, BY HAND (docs/TOOLKIT.md, tool 7; docs/BUILD.md, E):
 *  the few numbers a person counts at the end of a shift — never a sensor.
 *  The stops are NOT here: they are the line's stops log (Observation) in
 *  the window, read when the figures are worked out, as the Pareto reads
 *  them. One object, one person's count; the window is the truth. */
export interface LossCount {
  /** The shift as the line names it ("Shift 1", "Days"), when one was picked;
   *  absent for a window typed by hand. */
  shift?: string;
  /** The window, epoch ms — the shift's clock on the day, or typed. */
  from: number;
  to: number;
  /** PLANNED PRODUCTION TIME: the shift less its planned stops — the window
   *  less the breaks the line stops for (docs/CAPACITY.md §5). Worked out
   *  when the count starts; changed for the day only with `plannedWhy`. */
  plannedMin?: number;
  /** The breaks the planned minutes were worked out with — the shift's
   *  (Shift.breakMin), or typed with a window typed by hand. */
  breakMin?: number;
  /** Relief covered the breaks: the line ran through them, none came off. */
  relief?: boolean;
  /** Why the planned minutes are not the shift less its breaks on this day —
   *  "stood an hour, no orders" — kept with the count. */
  plannedWhy?: string;
  /** Good packs out — counted. */
  made?: number;
  /** Packs rejected — counted. */
  rejects?: number;
  /** The rate, packs a minute in the line's unit, that the shift is judged
   *  against: the ideal speed of the line's slowest station — a machine's
   *  plate speed, a person's standard time (lib/ie/losses rateOf). */
  ratePerMin?: number;
  /** Where the rate is from: the plate speed of the machine that sets the
   *  pace; the standard time of the person who does ('standard-time'); the
   *  line standard's target, only when no station on the line has an ideal
   *  speed; or typed. A count made before plate speed reads 'standard' as
   *  it always did. */
  rateFrom?: 'plate' | 'standard-time' | 'standard' | 'typed';
  /** The machine whose plate speed the rate is. */
  rateMachine?: string;
  /** The person (a people station) whose standard time the rate is — and
   *  `rateTimed` when it is their pace as timed, not from the time study. */
  ratePerson?: string;
  rateTimed?: boolean;
}

/** A RUNNING SPEED TIMED on a loss count: the packs counted over a timed
 *  spell while the line runs (docs/CAPACITY.md §5) — what tells slow running
 *  from short stops. Each with when and who; struck, never erased. */
export interface RunTiming { id: string; at: number; by?: string; packs: number; sec: number; struck?: boolean }

/* ------------------------------------------------------------------------------------------------
   A CHECK LOG (knowledge/specs/FC-236-check-logs.md; 25 October 2026) — a list of checks, each on a schedule or
   a trigger, and the results added to it as they are done. Which log it is — metal detection, a 5S audit, a CILT
   round — is `agreed.log.key`, a definition in src/tools/checks/defs; the study holds what is agreed (the checks
   and their limits) and what was done (the results). What is due, done, missed or failed, and what a failure
   holds, is worked out each time (src/tools/checks/checks), never stored.
   ------------------------------------------------------------------------------------------------ */

/** How often a check is done: every so many minutes, hours, shifts, days or weeks — or when something happens. */
export type LogFreq =
  | { every: number; unit: 'min' | 'hour' | 'shift' | 'day' | 'week' }
  | { when: 'startup' | 'changeover' | 'trigger'; note?: string };

/** What a check is: pass or fail · a number against a limit, trended · a scored checklist · a count in a slot. */
export type LogCheckKind = 'passfail' | 'value' | 'scored' | 'count';

/** One question of a scored checklist, under a heading ("Sort" in a 5S audit). */
export interface LogItem { id: string; name: string; group?: string }

/** One check on a log's list — agreed before it is done (the owner's, can.agree). */
export interface LogCheck {
  id: string;
  /** In the floor's words: "Ferrous test piece", "Packing hall — 5S". */
  name: string;
  /** A line, a machine or a place, typed: "Metal detector". */
  where?: string;
  /** Who does it, as typed: "Team leader". */
  who?: string;
  when: LogFreq;
  kind: LogCheckKind;
  /** Pass or fail: what passes, in words. */
  criterion?: string;
  /** A value: the limits, either may be absent, and the unit. */
  lo?: number; hi?: number; unit?: string;
  /** A scored checklist: its questions, the score it must reach (in %) and the level below which an answer is a finding. */
  items?: LogItem[];
  passPct?: number;
  findingBelow?: number;
  /** A count in a slot: the number a slot should reach. */
  target?: number;
  /** What to do if it fails, in words. */
  reaction?: string;
  /** The priority of the problem a failure raises. */
  priority?: 'critical' | 'high' | 'low';
  /** A failure holds the product made since the last good check. */
  holds?: boolean;
  /** When it began to be due; absent: when the log began. */
  addedAt?: number;
  /** Taken off the list: no longer due, its results kept. */
  removed?: boolean;
  /** Planned maintenance (FC-063): standard hours for this task — backlog is summed in these hours. */
  stdHours?: number;
}

export interface AgreedLog {
  /** The definition: a file in src/tools/checks/defs. */
  key: string;
  checks: LogCheck[];
  /** When the schedule began — the first check is due then. */
  since: number;
  /** Hours in a shift, for a check "every shift" (absent: 8). */
  shiftHours?: number;
  /** A program's criterion (30 October): how many results in a row, of every check on the list, must have passed — the
   *  latest N of each, none failing. A count, not the clock: `tools/checks/inARow`. Absent: figures only. */
  inARow?: number;
}

/** One answer of a scored checklist as it was asked — name and group kept, so editing the list later never re-scores it. */
export interface LogAnswer { id: string; name: string; group?: string; level: number | null }

/** One check done, at the moment it was done. Struck, never erased. */
export interface LogResult {
  id: string;
  checkId: string;
  at: number;
  by?: string;
  /** pass · fail · value (a number) · score (a checklist) · count (a number in a slot). */
  outcome: 'pass' | 'fail' | 'value' | 'score' | 'count';
  value?: number;
  answers?: LogAnswer[];
  count?: number;
  slot?: string;
  note?: string;
  /** A failure: the packs made since the last good check, if it is known (otherwise worked out from a rate). */
  made?: number;
  /** The problem raised on the register for it (or for each finding of an audit). */
  problemId?: string;
  problemIds?: string[];
  struck?: boolean;
}

/** An abnormality tag raised from a CILT check: red needs the fitter, white the operator fixes. */
export interface LogTag { id: string; checkId: string; at: number; by?: string; colour: 'red' | 'white'; what: string; problemId?: string; struck?: boolean }

/** What it is judged against, by tool — each tool its own key, so a new tool
 *  adds one and changes none. */
export interface StudyAgreed {
  readings?: AgreedReadings;
  /** W2 — a control chart's agreement (knowledge/specs/FC-086-charts.md). */
  chart?: AgreedChart;
  /** W3a — an analysis's agreement (knowledge/specs/FC-105-analysis.md). */
  analysis?: AgreedAnalysis;
  /** FC-235 — a calculator's inputs (knowledge/specs/FC-235-calculators.md): which calculator, and what was put in. */
  calc?: AgreedCalc;
  balance?: AgreedBalance;
  /** SMED (30 October, a program's criterion): the minutes the changeover must come in at, typed on the study itself —
   *  what changeoverSays judges it against when no product's line standard has agreed minutes of its own. */
  changeover?: AgreedChangeover;
  /** A shift's losses (30 October, a program's criterion): the most minutes a shift may lose — typed on the count. */
  losses?: AgreedLosses;
  map?: AgreedMap;
  sampling?: AgreedSampling;
  reliability?: AgreedReliability;
  /** A CHECK LOG's agreement (knowledge/specs/FC-236-check-logs.md): which log, and the checks on its list. */
  log?: AgreedLog;
  /** A SCORED REGISTER (FC-064): which ranking, and the rows scored on its scales. */
  scored?: AgreedScored;
  /** A BOARD (FC-067): which board, and typed inputs it owns (reactive hours until FC-059 feeds them). */
  board?: AgreedBoard;
}

/** A board’s own typed fields — measures are read from sibling records on the line. */
export interface AgreedBoard {
  key: string;
  reactiveHours?: number;
}

/** One asset row on a criticality or FMEA register — agreed before the meeting signs it off. */
export interface ScoredRow {
  id: string;
  name: string;
  production?: number;
  safety?: number;
  quality?: number;
  repair?: number;
  likelihood?: number;
  ccp?: boolean;
  standby?: boolean;
}

export interface AgreedScored {
  key: string;
  rows: ScoredRow[];
}

/** A CALCULATOR (src/tools/calc; knowledge/specs/FC-235-calculators.md — 25 October): which one it is (`key`, the name of its
 *  definition file in src/tools/calc/defs) and what was put into it. The result is worked out from these on every render by the
 *  definition and never stored. `before` is a copy of the inputs taken by "Save as before", so a change made after it reads
 *  as a before → after; its own result is worked out from it, not kept. */
export interface AgreedCalc {
  key: string;
  inputs: Record<string, number | string>;
  /** Where an offered figure came from — field id → "Line 7’s set-up" — for the paper's Source column. Cleared when the box is typed over. */
  src?: Record<string, string>;
  before?: { at: number; by?: string; inputs: Record<string, number | string>; src?: Record<string, string> };
}

/** AN ANALYSIS (W3a, knowledge/specs/FC-105-analysis.md — 24 October): one question asked first — how sure am I of
 *  this figure, did it change, do two ways of measuring agree, how many readings do I need — and the readings or
 *  counts that answer it. W3b adds the groups, the counts in a table and the relations as more kinds. */
export interface AgreedAnalysis {
  kind: 'sure' | 'change' | 'paired' | 'plan' | 'groups' | 'table' | 'relate' | 'learn' | 'gauge' | 'shape' | 'grr' | 'attr';
  /** what is measured — "Fill weight", "Reject rate" */
  name: string;
  unit?: string;
  /** 0.9, 0.95 (default) or 0.99 */
  confidence?: 0.9 | 0.95 | 0.99;
  /** how sure: a mean from readings, a share counted, a rate counted */
  of?: 'mean' | 'share' | 'rate';
  /** did it change: measured readings or counted runs */
  data?: 'measured' | 'counted';
  /** which way is better — used for the words and the tone, never to halve a p-value */
  better?: 'lower' | 'higher' | 'either';
  /** paired: the names of the two ways, and the largest difference that does not matter (in the unit) */
  firstName?: string;
  secondName?: string;
  within?: number;
  /** how many readings: what is asked and what is known */
  plan?: AnalysisPlan;
  /** a table (W3b): the names down the side and across the top — `firstName` is what the rows are ("Lane"), `secondName` what the
   *  columns are ("Fault type"); groups: `firstName` is what the groups are ("Shift"). A relation: one to five drivers, in the order typed. */
  rows?: string[];
  cols?: string[];
  drivers?: { name: string; unit?: string }[];
  /** a learning curve (FC-027): the time each run took, in the order made; the standard the job is heading for (in the unit) and how many units each
   *  reading stands for — both optional, the second only to say what learning costs in money */
  learn?: { standard?: number; perRun?: number };
  /** the gauge studies (W3c, FC-119/120): how the gauge is checked and what it judges */
  gauge?: AgreedGauge;
  /** which shape fits (W3c, FC-114): the limits that matter, optional */
  shape?: { lower?: number; upper?: number };
  /** gauge R&R (FC-118): crossed parts × appraisers × trials */
  grr?: AgreedGrr;
  /** attribute agreement (FC-121): pieces × inspectors × looks vs a reference */
  attr?: AgreedAttr;
}
/** GAUGE R&R (FC-118). Parts and appraisers are named before measuring; trials default to 2. Tolerance optional but needed for %GRR of tolerance. */
export interface AgreedGrr {
  parts: string[];
  appraisers: string[];
  trials?: 2 | 3;
  lower?: number;
  upper?: number;
  /** Pool interaction when p exceeds this (default 0.25). */
  poolAlpha?: number;
}
/** ATTRIBUTE AGREEMENT (FC-121). Item codes and inspectors named before judging; looks default to 2. Reference verdicts use readings with col `reference`. */
export interface AgreedAttr {
  items: string[];
  inspectors: string[];
  looks?: 2 | 3;
  materialsPerPack?: number;
  packsPerShift?: number;
}
/** IS THE GAUGE FIT (W3c, knowledge/specs/FC-119-gauge.md). `repeat`: one reference read again and again (Type 1); `range`: references
 *  across the range, each reading carrying its reference in `with` (bias and linearity); `drift`: one reference checked day after day
 *  (stability). The tolerance is what the gauge judges — both limits, or one limit and the target it is measured from. */
export interface AgreedGauge {
  mode: 'repeat' | 'range' | 'drift';
  /** repeat and drift: the reference's true value */
  reference?: number;
  lower?: number;
  upper?: number;
  target?: number;
  /** range: the limit that matters, where the bias is read off the line */
  limit?: number;
  /** the share of the tolerance the gauge's 6s may use (0.2 by default) and the Cg and Cgk wanted (1.33 by default) */
  slice?: number;
  need?: number;
  /** the gauge's least count; absent: the smallest step the readings show */
  resolution?: number;
  /** drift: how many first readings the chart's limits come from (20 by default) */
  baseline?: number;
  /** the money of a bias on a weight gauge — as the capability study asks it */
  packsPerShift?: number;
  shiftsPerWeek?: number;
  costPerKg?: number;
}
export interface AnalysisPlan {
  ask: 'mean' | 'difference' | 'share' | 'twoShares' | 'zero' | 'cycles';
  /** a guess of the spread; absent: taken from the readings (a pilot of 8 or more) */
  sd?: number;
  /** the precision wanted (± e, in the unit; for a share, in points as a fraction: 0.02) */
  e?: number;
  /** the difference that matters, in the unit */
  delta?: number;
  /** the share expected (absent: 0.5, the worst case); two shares: before and after */
  p?: number;
  p1?: number;
  p2?: number;
  /** 0.8 (default) or 0.9 */
  power?: 0.8 | 0.9;
  /** a finite population (one batch) */
  population?: number;
  /** zero failures: the share allowed to be bad */
  p0?: number;
  /** cycles: the precision as a share of the mean (0.05 is ±5%) */
  k?: number;
  /** seconds one reading takes — to say what the study costs, when the line has a rate */
  seconds?: number;
}

/** A CONTROL CHART (W2, knowledge/specs/FC-086-charts.md — 24 October): readings in order against limits
 *  set from a steady period and frozen, the signals said in words, the CUSUM saying since when. One
 *  record, three kinds: the individuals and moving range chart (FC-086), subgroups as X̄-R or X̄-S
 *  (FC-087), pre-control for a set-up (FC-092); the modes as fields — the CUSUM and EWMA (FC-091),
 *  short-run by product (FC-093). The readings are `facts.readings`, each a `StudyReading` with its
 *  value, and for a short-run chart its product and nominal. */
export interface AgreedChart {
  kind: 'xmr' | 'xbar' | 'precontrol';
  /** what is measured — "Fill weight", "Seal temperature" */
  name: string;
  unit?: string;
  /** the target the CUSUM and EWMA judge against (the nominal); absent: the frozen centre */
  target?: number;
  /** the specification limits — drawn faint, never the chart's limits; both needed for pre-control */
  lower?: number;
  upper?: number;
  /** xbar: the readings in each subgroup (2–25) */
  subgroup?: number;
  /** the run rules on — Western Electric's four by default (lib/ie/charts WESTERN_ELECTRIC) */
  rules?: ('beyond' | 'run' | 'trend' | 'alternate' | '2of3' | '4of5' | 'inside' | 'outside')[];
  /** the limits set from a steady period and kept: the readings it spans (1-based, inclusive), the centre,
   *  the mean moving range (or the mean range / s of the subgroups), σ, how many it was set from, when and who */
  frozen?: { from: number; to: number; centre: number; spread: number; sigma: number; n: number; at?: number; who?: string };
  /** the limits set before, kept for the paper (re-set only by a tap that says so) */
  frozenBefore?: { from: number; to: number; centre: number; spread: number; sigma: number; n: number; at?: number; who?: string }[];
  /** CUSUM: the shift worth catching, in the unit (K = half of it, H = 5σ); a head start after an adjustment */
  cusum?: { shift: number; headStart?: boolean };
  /** the EWMA drawn as the running level (λ 0.2, L 2.962) */
  ewma?: boolean;
  /** short-run: each reading carries its product and nominal — deviation from nominal, Z-MR when the spreads differ */
  products?: boolean;
}

/** ONE THING COUNTED on a reliability study — a stop, a failure, a pick, or
 *  the floor's own word — each with its own button at the machine and its
 *  own figures (lib/ie/reliability). Taken off, never erased: its taps are
 *  kept and come back with it. */
export interface RelCount {
  id: string;
  /** "stop" — one, as it is said: "12 stops". */
  name: string;
  /** The MTBF wanted, in minutes of watched running. */
  targetMin?: number;
  /** Minutes the line stands each time one happens, as the floor knows it —
   *  for what they cost. */
  downMin?: number;
  removed?: boolean;
  /** FC-059 / FC-015: how each one is timed. Absent: counted only. `stop` —
   *  each one is timed (help arrived, running again) and takes the machine out
   *  of running; `call` — a call for help (andon), the same two stamps, its
   *  reason and the response wanted. */
  timed?: 'stop' | 'call';
  /** FC-015 (and any timed count): the short list a stop or call is picked from. */
  reasons?: string[];
  /** FC-015: help should arrive within this many minutes. */
  respondMin?: number;
  /** FC-059: what a fitter costs the business an hour — prices the repairs. */
  fitterRate?: number;
  /** FC-061: fit the reliability growth (Crow–AMSAA) — a machine bedding in. */
  growth?: boolean;
  /** FC-060: the thing counted is a part that wears and is replaced — its lives. */
  wear?: RelWear;
}

/** FC-060: a part's life, the unit its age is in, what the lives are taken
 *  from and the two costs the age-replacement interval rests on. */
export interface RelWear {
  unit?: string;
  /** Use this study's gaps between events as lives (the part replaced at each). */
  fromWatch?: boolean;
  /** The part was new when the watching began — the first gap is a life. */
  newAtStart?: boolean;
  /** £ a planned change; £ a failure. */
  swapCost?: number;
  failCost?: number;
}

/** One life of a part for the Weibull: how old it was when it failed, or how
 *  old it is and still running. Struck, never erased. */
export interface RelLife { id: string; count: string; age: number; failed: boolean; note?: string; by?: string; at?: number; struck?: boolean }

/** A RELIABILITY STUDY's agreement (lib/ie/reliability): what is counted —
 *  one thing or several at once, all on the one watch (Rowland, 22 October:
 *  "three buttons ... three data sets going on ... three of everything"). */
export interface AgreedReliability {
  counts?: RelCount[];
  /** BEFORE 22 OCTOBER one thing was counted, with what one could be —
   *  still read, as the first count (lib/ie/reliability countersOf); the
   *  kinds were taken off the set-up the same day ("What can it be? ... I
   *  don't know what that is"): several counts do what they were for. */
  event?: string;
  kinds?: string[];
  targetMin?: number;
  downMin?: number;
  /** A LINE WATCH (Rowland, 25 October: "start one clock for the entire line and I can click through
   *  the UI on each individual asset"): the machines watched together are one study each, sharing this
   *  id — one clock starts and stops them all (src/tools/reliability/lineWatch). */
  group?: string;
}

/** One stretch the watch ran at the machine: started, and stopped — absent
 *  while it runs. Watched time is these stretches, never the clock on the
 *  wall: the watch is stopped while the machine is down or nobody watches. */
export interface WatchRun { id: string; from: number; to?: number; by?: string; struck?: boolean }

/** One event tapped at the machine, at the moment it was seen. Struck, never
 *  erased: a mistap keeps its place and counts for nothing. */
export interface RelEvent {
  id: string; at: number; by?: string; note?: string; struck?: boolean;
  /** Which thing counted (RelCount.id). None: the first — a tap made before
   *  several were counted. */
  count?: string;
  /** What one was, on a study set up before 22 October. */
  kind?: string;
  /** FC-059: when help arrived, and when the machine ran again (ms) — on a
   *  timed count. `est`: the time was said ("took 40 s"), not clocked. */
  arrivedAt?: number;
  fixedAt?: number;
  est?: boolean;
  /** FC-015 / FC-059: the reason, from the count's list. */
  reason?: string;
}

/** A REMARK — commentary kept on a study, for its page and its paper. Taken
 *  off by striking, so Undo can bring it back. */
export interface Remark { id: string; at: number; text: string; by?: string; editedAt?: number; struck?: boolean }

/** One tap of work sampling: what one person was doing at one moment. Struck,
 *  never erased: a mistap keeps its place and counts for nothing. */
export interface Tap { id: string; at: number; who: string; activity: string; by?: string; struck?: boolean }

/** What people put in, by tool. Every list is keyed by `id`, so two phones
 *  adding to one study both keep what they added (docs/BUILD.md, 2b). */
export interface StudyFacts {
  readings?: StudyReading[];
  /** A work balance's elements, each with its laps. */
  steps?: BalanceStep[];
  /** A work balance's people and where each is on the line. */
  crew?: BalanceCrew[];
  /** MACHINES ONE PERSON TENDS (FC-026): by person, what the machine costs an hour and what one cycle of
   *  it makes — both optional, both the business's own figures. */
  tend?: Record<string, { machineRate?: number; packsPerCycle?: number }>;
  /** A value stream's steps as it runs today, end to end. */
  flow?: FlowStep[];
  /** The same stream as it could run — copied from the flow, then struck,
   *  merged and shortened. */
  future?: FlowStep[];
  /** A CHANGEOVER's steps, in order — its own key, as the map's `flow` is,
   *  so the balance's `steps` stays what it is (lib/ie/changeover). */
  sequence?: ChangeoverStep[];
  /** The two products: what the line ran, and what it changed to. */
  fromProduct?: string;
  toProduct?: string;
  /** How the line runs: shifts, their hours, days a week, weeks a year. */
  running?: RunningPattern;
  /** How many changeovers, as the floor knows it — a shift, a day or a week. */
  changeovers?: { count: number; per: 'shift' | 'day' | 'week' };
  /** THE LINE'S SPEED, a minute in its own unit — for the packs a stop
   *  costs. Rowland, 12 October: "we go by plate speed ... unless human"
   *  (docs/CAPACITY.md §1). Offered from the product's line balance: the
   *  critical machine's PLATE speed, or a person's timed pace where people
   *  set it; else the standard's target or the line's rated speed, each said
   *  as not a plate speed; else typed. Which is kept, and the station's name. */
  ratePerMin?: number;
  rateFrom?: SmedRateFrom;
  rateStation?: string;
  /** The products run on the line, for the interval — each with its demand
   *  a day and the line's rate on it, or its run time a day typed. */
  products?: ChangeoverProduct[];
  /** Older records: changeovers a week, and minutes a day, typed before the
   *  running pattern was asked — still read. */
  perWeek?: number;
  availableMinPerDay?: number;
  /** Work sampling's taps — one per person per moment. */
  taps?: Tap[];
  /** A RELIABILITY STUDY (lib/ie/reliability): the stretches the watch ran,
   *  the events tapped in them and the commentary — each its own list, so
   *  two phones at one machine both keep theirs; a study carried on another
   *  day adds to the same lists. */
  watch?: WatchRun[];
  events?: RelEvent[];
  remarks?: Remark[];
  /** FC-060: the lives of a part that wears, each its own entry (merged by id). */
  lives?: RelLife[];
  /** A shift's losses: the end-of-shift count (tool 7). The stops are the
   *  line's log in its window, never copied in. */
  losses?: LossCount;
  /** The running speed timed through that shift — its own list, so two
   *  phones timing at once both keep theirs. */
  timings?: RunTiming[];
  /** A STUDY READ FROM FOOTAGE (lib/video, docs/VIDEO.md): the recording, its
   *  facts and the job that reads it. Its laps are then the accepted events'
   *  lengths, worked out each time it is read, never stored as laps. */
  video?: VideoSource;
  /** The events found in the footage and what a person decided about each. */
  vevents?: VideoEvent[];
  /** LINE TALK (lib/talk, docs/LINE-TALK.md): the conversation — each piece
   *  said with its recording and what was heard, each photo, each typed line. */
  turns?: TalkTurn[];
  /** The footage deleted — its own fact, so it is never undone by a device
   *  still writing the video (lib/video/footage). */
  videoGone?: FootageGone;
  /** A CHECK LOG's results (src/tools/checks): one per check done, added on several phones — a list merged by id, struck and never erased. */
  results?: LogResult[];
  /** A CILT log's abnormality tags (src/tools/checks, FC-062): each a problem on the register, raised from a check. */
  tags?: LogTag[];
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
  /** On a value stream map: the step the record is about — the wait or the
   *  waste a fix was raised from, so its before → after is that step's too,
   *  and the step on the grid shows the branch. On a loss count: the bar
   *  (lib/ie/losses LossBar.key — a cause, the changeovers, the rejects, the
   *  slow running and short stops or either once told apart) the record was
   *  raised from, the same way. */
  step?: string;
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
  return { ...o, ...(o.readings !== undefined ? { readings: listById<StudyReading>(o.readings) } : {}),
    ...(o.steps !== undefined ? { steps: listById<BalanceStep>(o.steps).map(st => ({ ...st, laps: listById<Lap>(st.laps) })) } : {}),
    ...(o.crew !== undefined ? { crew: listById<BalanceCrew>(o.crew) } : {}),
    ...(o.flow !== undefined ? { flow: listById<FlowStep>(o.flow) } : {}),
    ...(o.future !== undefined ? { future: listById<FlowStep>(o.future) } : {}),
    ...(o.sequence !== undefined ? { sequence: listById<ChangeoverStep>(o.sequence) } : {}),
    ...(o.products !== undefined ? { products: listById<ChangeoverProduct>(o.products) } : {}),
    ...(o.taps !== undefined ? { taps: listById<Tap>(o.taps) } : {}),
    ...(o.watch !== undefined ? { watch: listById<WatchRun>(o.watch) } : {}),
    ...(o.events !== undefined ? { events: listById<RelEvent>(o.events) } : {}),
    ...(o.remarks !== undefined ? { remarks: listById<Remark>(o.remarks) } : {}),
    ...(o.lives !== undefined ? { lives: listById<RelLife>(o.lives) } : {}),
    ...(o.timings !== undefined ? { timings: listById<RunTiming>(o.timings) } : {}),
    ...(o.vevents !== undefined ? { vevents: listById<VideoEvent>(o.vevents) } : {}),
    ...(o.results !== undefined ? { results: listById<LogResult>(o.results) } : {}),
    ...(o.tags !== undefined ? { tags: listById<LogTag>(o.tags) } : {}),
    ...(o.turns !== undefined ? { turns: listById<TalkTurn>(o.turns) } : {}) };
}
