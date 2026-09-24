/* WHAT ONE TRIAL LOOKS LIKE WHEN SOMEBODY READS IT BACK.
 *
 * Rowland, on the client report: "you'll see, run the BU at 75 packs per minute for
 * one hour — just says didn't pass with my commentary. Not any sort of loop,
 * you know, to show the structure of it."
 *
 * The structure IS the loop, and the app already holds all four parts of it:
 *
 *   PLANNED   what we set out to do, and what it passes on — agreed in advance
 *   HAPPENED  what we actually ran, and what it did
 *   FOUND     what was written down on the day
 *   NEXT      what was agreed, whose it is, and by when
 *
 * Printing the outcome word and one line of commentary throws three of those
 * four away. So one shape is read here, once, and both documents draw from it:
 * the TRIAL CARD, which is the whole of one day and gets sent out, and the client
 * REPORT, which lifts the fundamentals out of each one.
 *
 * NOTHING IN HERE TOUCHES A DOCUMENT. It is the reading, not the drawing —
 * which is why it can be tested without a PDF. */
import { actionOf, foundTally, isSettled, live, needsVerdict, outcomeWord, standingOfItem, type Asset, type Test, type TestItem, type TestKind } from './testing';

export interface CardFinding {
  what: string;
  owner?: string;
  /** new | actioned | noted — what somebody decided about it, in words. */
  decision: string;
  /** The action it became, when it became one. */
  action?: string;
  photos: number;
}

export interface CardNext {
  what: string;
  owner?: string;
  due?: string;
  done: boolean;
  /** True when this came out of an observation rather than being typed in. */
  fromFinding: boolean;
  /** True when somebody made it the next trial. */
  becameTest: boolean;
}

export interface TrialCard {
  id: string;
  /** Which face — the card says "Test card" or "Fix card" accordingly, and both
   *  documents take their words from lib/testing's WORDS rather than deciding. */
  kind: TestKind;
  title: string;
  machine: string;
  withWhom?: string;
  outcome: Test['outcome'];
  outcomeWord: string;

  /* the plan */
  plannedFor?: string;
  /** The last day of the planned window. Absent means one day. */
  plannedTo?: string;
  plannedProduct?: string;
  passesIf?: string;

  /* the day */
  ranOn?: string;
  /** The last day it actually took. Absent means one day. */
  ranTo?: string;
  product?: string;
  result?: string;

  findings: CardFinding[];
  /** written · actioned · to decide. */
  found: { written: number; actioned: number; undecided: number };
  next: CardNext[];
  openNext: number;

  /** The trial this one was planned from — the loop, read backwards. */
  follows?: string;
  /** The trials planned out of this one — the loop, read forwards. */
  ledTo: string[];

  photos: number;
  docs: number;
}

/* The three answers, in the words the buttons use — there is no "actioned"
   any more, there is a fix. */
const DECISION: Record<string, string> = {
  new: 'to decide', actioned: 'a fix', noted: 'not a problem',
};

/** One trial, read whole. `tests` and `items` are the project's, not the
 *  trial's: the loop and the links are only readable with the neighbours in
 *  hand. */
export function trialCard(test: Test, tests: Test[], items: TestItem[], assets: Asset[]): TrialCard {
  const mine = live(items).filter(i => i.testId === test.id);
  const findings = mine.filter(i => i.kind === 'found').sort((a, b) => a.sort - b.sort);
  /* WHAT COMES NEXT IS A LIST OF RECORDS, NOT A LIST OF LINES. An agreed next
     step is a FIX — its own days, its own findings, its own card — so the card
     reads them off the tests that came out of this one rather than off items
     underneath it. See db/testing's actionsBecomeFixes for why there is no
     longer a second word for a line. */
  const nexts = live(tests)
    .filter(t => t.fromTestId === test.id)
    .sort((a, b) => (a.plannedFor ?? '').localeCompare(b.plannedFor ?? '') || a.sort - b.sort);

  const tally = foundTally(findings, items);

  return {
    id: test.id,
    kind: test.kind ?? 'test',
    title: test.title,
    machine: assets.find(a => a.id === test.assetId)?.name ?? 'the line',
    withWhom: test.withWhom,
    outcome: test.outcome,
    outcomeWord: outcomeWord(test),

    plannedFor: test.plannedFor,
    plannedTo: test.plannedTo,
    plannedProduct: test.planned,
    passesIf: test.passesIf,

    ranOn: test.ranOn,
    ranTo: test.ranTo,
    product: test.product ?? test.planned,
    result: test.result,

    findings: findings.map(f => {
      /* What it became, when it became something — a fix with its own page,
         or (on a device that has not converted yet) the old line. */
      const became = f.becameTestId ? live(tests).find(t => t.id === f.becameTestId)?.title : undefined;
      return {
        what: f.what,
        owner: f.owner,
        decision: DECISION[standingOfItem(f, items)],
        action: became ?? actionOf(f, items)?.what,
        photos: (f.media ?? []).length,
      };
    }),
    found: { written: tally.written, actioned: tally.actioned, undecided: tally.undecided },

    next: nexts.map(n => ({
      what: n.title,
      owner: n.withWhom,
      /* The day it is wanted BY, which on a block of days is the last of them. */
      due: n.plannedTo ?? n.plannedFor,
      done: isSettled(n),
      /* True when an observation on this card points at it — the chain from
         "I saw this" to "so we are doing this", readable on the page. */
      fromFinding: mine.some(i => i.becameTestId === n.id),
      becameTest: (n.kind ?? 'test') === 'test',
    })),
    openNext: nexts.filter(n => !isSettled(n)).length,

    follows: test.fromTestId ? live(tests).find(t => t.id === test.fromTestId)?.title : undefined,
    ledTo: live(tests).filter(t => t.fromTestId === test.id).map(t => t.title),

    photos: (test.media ?? []).length,
    docs: (test.docs ?? []).length,
  };
}

/** The one line a client reads instead of the whole card: what it was meant to do,
 *  and whether it did it. Deliberately not the outcome word on its own — "didn't
 *  pass" without the expectation beside it is a verdict nobody can check. */
export function verdictLine(c: TrialCard): string {
  /* A trial that has not happened has no result, and saying "passes if ..."
     here repeats the line directly above it on the card — which read as the
     report having nothing to say twice. The day it is booked for is on the
     card's own meta line. */
  /* Ran, dated, written up, and nobody has said whether it passed: the result
     IS the line, with the missing verdict said plainly after it. "Not run yet"
     over a result somebody typed on the floor is the report hiding the day. */
  if (c.outcome === 'planned') {
    if (!needsVerdict(c)) return 'Not run yet';
    return c.result ? `${c.result} — no verdict given yet` : 'Ran — no verdict given yet';
  }
  if (c.outcome === 'notRun') return 'The day came and it did not happen';
  if (!c.result) return c.outcomeWord;
  return c.result;
}

/** The agreed next step a client should read, of however many there are: the first
 *  one still outstanding, because a done one is not what happens next. */
export function headlineNext(c: TrialCard): CardNext | undefined {
  return c.next.find(n => !n.done) ?? c.next[0];
}
