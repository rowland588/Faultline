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
import { climbsOf, climbsOn } from './rampUp';
import { isRunTest, productFigures, productName, productRuns, readRuns, runsSay, type ProductFigures, type ProductState } from './run';
import { actionOf, foundTally, isSettled, live, needsVerdict, outcomeWord, standingOfItem, testOfFix, type Asset, type Test, type TestItem, type TestKind } from './testing';

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
  /** Set up or Hand over, on a step at those gates — see wordsOf. */
  gate?: Test['gate'];
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

  /** A RUN AT A RATE (lib/run): a row per product — what it was judged on,
   *  what it netted, ran at, its rejects, how long, and its verdict — and the
   *  totals line over them. The card prints them as a strip under the plan
   *  and the day, the screen as its table. Absent on any other test. */
  run?: {
    products: CardRunProduct[];
    /** "2 of 3 products run — 1 passed, 1 didn't pass." */
    say: string;
    /** What the plan says it is judged on: one product's agreed numbers in
     *  words, or that each product has its own. */
    agreed: string;
    /** Every product measured: did they all meet what was agreed. */
    meets?: boolean;
    ran: boolean;
    /** A product still to run. */
    open: boolean;
    /** THE CLIMB TO RATE (lib/rampUp) — this run's products on its machine,
     *  across every run of them on the job, a line each. */
    climbs?: { text: string; tone: 'risk' | 'on' | 'none' }[];
  };
  /** The product runs as kept — so the card's "no verdict yet" is asked the
   *  same way as the test's (lib/testing needsVerdict). */
  runs?: Test['runs'];

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

/** One product on the card, as every table prints it (lib/run productFigures). */
export interface CardRunProduct extends ProductFigures {
  id: string;
  product: string;
  state: ProductState;
  /** "Passed" · "Didn't pass" · "To run" … */
  word: string;
  /** What fell short and by how much. */
  gap: string;
  /** Run again further down — history, not what counts. */
  rerun: boolean;
  /** The day its numbers went in. */
  ranOn?: string;
}

/* The three answers, in the words the buttons use — there is no "actioned"
   any more, there is a fix. */
const DECISION: Record<string, string> = {
  /* Blank for an ordinary observation — it is a note. The other two survive
     only on observations decided before fixes moved to the Fixes screen. */
  new: '', actioned: 'a fix', noted: 'not a problem',
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
  /* The same reading the test's own page uses: a fix belongs to the nearest
     TEST above it (testOfFix), so a fix raised off another fix — old data —
     prints on the test's card as the page already shows it under the test. */
  const nexts = live(tests)
    .filter(t => ((t.kind ?? 'test') === 'fix' ? testOfFix(t, tests)?.id === test.id : t.fromTestId === test.id))
    .sort((a, b) => (a.plannedFor ?? '').localeCompare(b.plannedFor ?? '') || a.sort - b.sort);

  const tally = foundTally(findings, items);
  /* A RUN'S PRODUCTS (lib/run): printed when there is a product on the list. */
  const rr = isRunTest(test) ? readRuns(test) : undefined;
  const products = rr?.products ?? [];
  const names = (ps: typeof products) => [...new Set(ps.map(p => productName(p.run)))].join(' · ');

  return {
    id: test.id,
    kind: test.kind ?? 'test',
    gate: test.gate,
    title: test.title,
    machine: assets.find(a => a.id === test.assetId)?.name ?? 'the line',
    withWhom: test.withWhom,
    outcome: test.outcome,
    outcomeWord: outcomeWord(test),

    plannedFor: test.plannedFor,
    plannedTo: test.plannedTo,
    /* A run with products names them — the product boxes of the plan and
       the day say what the list says, never a second answer. */
    plannedProduct: products.length ? names(products) : test.planned,
    passesIf: test.passesIf,

    ranOn: test.ranOn,
    ranTo: test.ranTo,
    product: products.length ? names(products.filter(p => p.r.ran)) || undefined : test.product ?? test.planned,
    result: test.result,

    ...(rr && products.length ? { run: {
      products: products.map(p => ({ id: p.run.id, product: productName(p.run), state: p.state, word: p.word, gap: p.gap, rerun: p.rerun,
        ...(p.run.ranOn ? { ranOn: p.run.ranOn } : {}), ...productFigures(p) })),
      say: runsSay(rr),
      agreed: products.length === 1 ? productFigures(products[0]).agreed : `each of the ${rr.total} products on its own agreed numbers`,
      ran: rr.ran > 0, open: rr.open,
      ...(rr.verdict !== 'planned' ? { meets: rr.verdict === 'passed' } : {}),
      ...((cl => (cl.length ? { climbs: cl.map(c => ({ text: c.text, tone: c.tone })) } : {}))(climbsOn(climbsOf({ tests, assets }), test))),
    } } : {}),
    ...(test.runs ? { runs: test.runs } : {}),

    findings: findings.map(f => {
      /* What it became, when it became something — a fix with its own page,
         or (on a device that has not converted yet) the old line. */
      const became = f.becameTestId ? live(tests).find(t => t.id === f.becameTestId)?.title : undefined;
      /* Written on one product of a performance run — said so (lib/programRun). */
      const on = f.fromItemId ? productRuns(test).find(r => r.id === f.fromItemId) : undefined;
      return {
        what: on ? `On ${productName(on)}: ${f.what}` : f.what,
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

    /* The test's own pictures and the ones on what was found: the card prints
       them together, and the count has to be the count it prints. */
    photos: (test.media ?? []).length + mine.reduce((n, i) => n + (i.media ?? []).length, 0),
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
    /* A RUN PART-WAY THROUGH ITS PRODUCTS is under way, not "not run yet":
       its totals line says how far (lib/run runsSay). */
    if (c.run?.open && c.run.ran) return c.result?.trim() ? `${c.result.trim()} — ${c.run.say}` : c.run.say;
    /* A stage's account given part-way (it stays planned until marked done or
       a problem — Rowland, 5 October) is still printed: words said about the
       work never drop off the paper. */
    if (!needsVerdict(c)) return c.result?.trim() ? `${c.result.trim()} — not marked done yet` : 'Not run yet';
    return c.result ? `${c.result} — no verdict yet` : 'Ran — no verdict yet';
  }
  /* What somebody wrote about why it did not happen is the point of the
     line — the card used to replace it with the stock sentence, so the client
     never read it (found by the random-job stress run). */
  if (c.outcome === 'notRun') return c.result ? `Did not happen — ${c.result}` : 'The day came and it did not happen';
  if (!c.result) return c.outcomeWord;
  return c.result;
}

/** The agreed next step a client should read, of however many there are: the first
 *  one still outstanding, because a done one is not what happens next. */
export function headlineNext(c: TrialCard): CardNext | undefined {
  return c.next.find(n => !n.done) ?? c.next[0];
}
