/* THE CLIENT REPORT'S DATA — everything the stage-gate paper is drawn from, as
 * the screen hands it over (docs/STEADY.md, S4). Read by every sheet in this
 * folder and by lib/paceReportPdf. */
import type { PillarKey } from '../pillars';
import type { PlanAxis, PlanLane } from '../plan';
import type { Shot } from '../testReport';
import type { Owes } from '../owes';
import type { CapacityReport } from '../capacity';
import type { LineSeries } from '../measures';

export interface PaceReportData {
  now: number;
  /** Whose project this is. The report used to say "Project Pace" because there
   *  was only one; now it says whatever the project is called, and who leads it,
   *  because the person receiving it needs to know who to go to. */
  title: string;
  lead?: string;
  /** What the lead IS on this report — the project's lead, or, on a line's own
   *  deck, that line's owner. The page prints the same words. */
  leadRole: string;
  subtitle: string;
  lines: {
    key: string; name: string; variant?: string;
    owner?: string; sponsor?: string;
    /** WHAT THIS LINE IS MEASURED ON, and where it stands — the same series the
     *  screen's chart takes, so the page and the file cannot disagree about
     *  which period is in play or which way is good. Absent on a project that
     *  has not said what it measures yet, and the panel says so. */
    series?: LineSeries;
  }[];
  atTarget: number;
  pctDone: number; complete: number; total: number; openTotal: number; openOnTrack: number; late: number;
  openSnags: number; winsThisWeek: number;
  /** The roll-up: one row per line, each number coming from that line's own
   *  pack. On a line's own deck this is the single line it covers. */
  byLine: {
    /** True for an area the tracker carries that no project line answers for —
     *  drawn muted, because the columns only a line can fill are empty by
     *  nature rather than by neglect. */
    noLine?: boolean;
    name: string; owner: string;
    open: number; late: number; done: number; total: number;
    nextOpen: number; nextDone: number; snags: number; wins: number;
    /** The latest reading on the measure the project leads on, and whether it is
     *  on the good side of its target — worked out where the direction is known
     *  rather than by comparing two numbers here. */
    latest: number | null; meeting?: boolean; unit?: string;
  }[];
  /* WHAT THE JOB IS WAITING ON, drawn as the sheet it comes off: a row per
     thing, a column per week, filled from the week it lands — indigo while it
     is still coming, green once it is in (green is done, everywhere; Rowland,
     4 October). `covered` is worked
     out by lib/materials alongside the screen's own grid, so the page and the
     file cannot disagree about which cells are green. Absent when the project
     is waiting on nothing, and then the sheet is not printed at all. */
  materials?: {
    total: number; here: number; waiting: number; late: number; nextDue?: string;
    weeks: { start: string; label: string; month: string }[];
    /* `due` arrives already written for print ("21 Sep"), the same as every
       other date in this contract: the drawer never looks at the DOM and never
       parses a date either. */
    rows: {
      what: string; due?: string; here: boolean; late?: number; covered: boolean[];
      /* The week it lands in, one entry per column and at most one of them set.
         The date is printed IN that cell: the side column is 62pt wide and easy
         to read past, which is how a sheet ends up looking like a row of grey
         squares to the person it was drawn for. */
      lands: (string | undefined)[];
    }[];
  };
  /* WHAT THE MACHINE CAN RUN, drawn the same way and for the same reason. The
     one difference is the fill: a film is green or it is not, a program is
     green (proved), amber (on the machine, unproved) or hollow (not written),
     with a ring on the week its test is booked. `fill` and `booked` are worked
     out by lib/programs beside the screen's own grid, so the page and the file
     cannot shade a different week. Absent when there are no programs, and then
     the sheet is not printed at all. */
  programs?: {
    total: number; proved: number; onMachine: number; needed: number;
    overdue: number; nextTest?: string;
    weeks: { start: string; label: string; month: string }[];
    /* `when` arrives already written for print ("proved 14 Sep", "29 Sep",
       "no date"), the same as every other date in this contract: the drawer
       never parses one. */
    rows: {
      what: string; runs?: string; when: string;
      state: 'needed' | 'onMachine' | 'proved'; overdue?: number;
      fill: ('proved' | 'machine' | 'none')[]; booked: boolean[];
    }[];
  };
  /* WHERE THE JOB IS, and WHEN — the sheet the report never had.
   *
   * The screen leads on a verdict card, a timeline and a table of what is
   * outstanding; until this existed the client got none of the three, and the
   * footer under the screen's table promised "the client report prints this
   * same table" while it did not. Same call, same numbers: `standing()` for
   * the sentence and the rows, `layoutPlan()` for the marks — laid out with
   * the SHEET's own minGap, because an A3 fits far more across than a phone
   * and should therefore stack fewer lines.
   *
   * Everything arrives drawn-ready, as everywhere else in this contract:
   * positions are fractions of the axis and dates are already words. */
  plan?: {
    /** The verdict, in the words the screen's card uses. */
    says: string;
    /** "The date has moved 8 days from what was agreed." Absent when it hasn't. */
    slip?: string;
    /** "13 dates · 4 done · 4 still ahead · 2 past the day" */
    counted: string;
    axis: PlanAxis;
    lanes: PlanLane[];
    /** The five rows of the screen's table, unchanged. */
    outstanding: { what: string; open: number; late: number; whose?: string }[];
  };
  /* THE TRIALS — a commissioning job's whole story, and the report had no page
     for it. Planned, which machine, what it passes on, who with; and for one
     that has happened, the day and what came of it. Absent on a line's own deck
     and on a project with none, and then no sheet is printed. */
  trials?: {
    planned: number; passed: number; failed: number; notRun: number;
    rows: {
      /* THE CHAIN NEEDS IDS, not titles. `follows`/`ledTo` carry the NAMES of
         the neighbours, which is enough to print a line about them and not
         enough to group by — two re-tests of the same thing share a title. */
      id: string;
      /** The test or fix this one was planned out of, when it was. */
      fromId?: string;
      kind: 'test' | 'fix';
      /** The day happened — dated or written up — whatever the verdict says. */
      ran: boolean;
      /** Past the day it was wanted and still not settled — by lib/testing's
       *  own rule, not a second comparison made here. A client report that
       *  prints an overdue date without saying it has gone is the report
       *  failing at the one thing it is for. */
      late: boolean;
      title: string; machine: string; when: string; passesIf: string;
      /** `when` as ISO, for page 3's ordering only — never printed. */
      on?: string;
      withWhom: string; product: string; result: string;
      outcome: 'planned' | 'passed' | 'failed' | 'notRun';
      outcomeWord: string;
      /* ---- the fundamentals the client acts on, lifted out of the whole day ----
       * The trial card prints everything. This prints the loop: what it was
       * meant to do, what it actually did, what that turned up, and what
       * happens next with a name and a date on it. */
      /** What happened, against what it was meant to do — never the outcome
       *  word alone, which is a verdict nobody in the room can check. */
      verdict: string;
      found: { written: number; actioned: number; undecided: number };
      /** The pictures of the day, already decoded — the record's own and the
       *  ones on what was found. The drawer is synchronous; the screen fetches
       *  them off the device first, the way the test card does. */
      shots?: Shot[];
      /** How many there are in the app, which can be more than `shots`. */
      photos?: number;
      /** The first next step still outstanding. */
      next?: { what: string; owner: string; due: string; done: boolean; late: boolean; on?: string };
      /** How many more there are after that one. */
      nextMore: number;
      follows?: string;
      ledTo: string[];
    }[];
  };
  /* WHO OWES WHAT, BY WHEN — the same debts as page 1, turned the other way
     up: one block per party. Built by lib/owes off the strands, the materials,
     the programs, the machines and the undecided observations; drawn-ready.
     Absent on a line's own deck and on a job that owes nothing. */
  owes?: Owes;
  /* INSTALLATION — each machine's steps between landing and running.
   *
   * Rowland: "the issues and stages that are taking place on a day to day
   * basis, telling a story." One row per machine: where it has got to, its
   * steps in the order they happen, and the sentence lib/install says about
   * it — the same sentence the Install screen prints, off the same call.
   * Absent when the job keeps no install steps, and then no sheet. */
  installation?: {
    done: number; total: number;
    /** Machines in (installed or running) of the machines on the sheet. */
    machinesIn: number; machines: number;
    late: number;
    rows: {
      machine: string; oem?: string;
      /** Print-ready: "On site · 22 Sept". */
      state: string;
      steps: { title: string; tone: 'done' | 'problem' | 'asking' | 'late' | 'ahead'; next: boolean }[];
      says: string;
      late: number;
      /** The four gates — Install, Set up, Commission, Hand over — and the one
       *  it is at. Off lib/install's journeyOf, as the Overview draws it. */
      journey?: { label: string; tone: 'done' | 'going' | 'late' | 'problem' | 'failed' | 'ahead' | 'none' }[];
      at?: string;
    }[];
  };
  /** Does this project keep an action board (6M, lever tree)? A stage-gate job
   *  does not, and printing it a ppm sheet, a board and an action list is three
   *  pages of scaffolding in front of the two it does carry. (The field keeps
   *  its first name, from when the board was an uploaded weekly tracker.) */
  tracker: boolean;
  /** Whether the actions, attention & movement sheet has anything to say.
   *  With no actions, no wins and nothing open on the walk it was six empty
   *  frames; it is left out, and the front page says there are no actions. */
  detail?: boolean;
  /** Which of the three methods the project runs — "Stage gate", "6M",
   *  "Lever tree" — printed at the head of page 1. See lib/planModel. */
  method?: string;
  lateActions: { line: string; what: string; owner: string; due: string }[];
  lateMore: number;
  todos: { state: 'todo' | 'waiting'; what: string; who: string; when: string }[];
  /** Finished lines and what came of them. A Next step marked Done used to drop
   *  out of the report entirely, taking its outcome with it — which is the one
   *  part the client most wants to read. */
  /** `proof` is the line's own numbers either side of the day it closed — the
   *  same words the board and the front page say (lib/impact). */
  completed: { what: string; who: string; outcome: string; proof?: { word: string; words: string; state: string } }[];
  completedMore: number;
  /** `line` is which line's walk it came off. On the project's report the
   *  snags are merged from every line, so without it the client reads six problems
   *  with no idea whose they are. Empty on a line's own deck, where the answer
   *  is on the masthead. */
  snags: { problem: string; owner: string; days: number; status: string; line: string }[];
  /* `impact` is the claim as it should read. When the win carries a proof it is
     the derived sentence and `verdict` says which way it went; with no proof it
     is whatever somebody typed and `verdict` is absent. The page draws the two
     differently on purpose — a measured claim should not look like a typed one. */
  wins: { title: string; impact: string; story: string; who: string; where: string;
          verdict?: 'proven' | 'better' | 'flat' | 'worse' }[];
  /* THE BOARD — every action on its bone, by line: People · Machine · Method ·
     Material · Measurement · Environment (lib/pillars, the screen's own six).
     Its own sheet, because six lanes of actions is the shape somebody is being
     handed — squeezed into a corner it stops being a board and becomes a list. */
  board: { area: string; pillar: PillarKey; title: string;
           owner: string; due: string; rag: string }[];
  /** Rows the workbook did not place. Printed as a count, never hidden. */
  boardUnplaced: number;
  /* WHERE THE TIME IS GOING. Present only when the project runs a Pareto and an
     upload has carried the sheet; absent is the normal case, and an absent
     Pareto costs the report a page rather than printing an empty one. */
  /** WHERE EACH LINE IS LIMITED — the Capacity ladder, one block per line that
   *  has stations counted (lib/capacity). Absent costs the report no page. */
  capacity?: CapacityReport;

  pareto?: {
    period?: string; beforePeriod?: string; headline?: string;
    totalMins: number; totalStops: number;
    vitalCount: number; vitalShare: number;
    comparable: boolean;
    rows: { category: string; mins: number; share: number; events: number;
            minPerEvent: number; vital: boolean; move: string; verdict: string }[];
    more: number;
    gone: string[];
  };
  /** The project's lever tree, flat — parent ids, drawn into a page of its own.
   *  Empty when nobody has drawn one, and then the page is not printed at all
   *  rather than printed blank. */
  tree: {
    id: string; parentId?: string; text: string; rag: string; sort: number;
    /** A box whose colour follows a number: the figure ("52 vs 44 ppm") and the
     *  state in words ("Behind target"), which replaces the status label. */
    number?: string; state?: string;
  }[];
}
