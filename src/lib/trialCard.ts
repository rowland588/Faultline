/* WHAT ONE TRIAL LOOKS LIKE WHEN SOMEBODY READS IT BACK.
 *
 * Rowland, on the GM report: "you'll see, run the BU at 75 packs per minute for
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
 * the TRIAL CARD, which is the whole of one day and gets sent out, and the GM
 * REPORT, which lifts the fundamentals out of each one.
 *
 * NOTHING IN HERE TOUCHES A DOCUMENT. It is the reading, not the drawing —
 * which is why it can be tested without a PDF. */
import { OUTCOME_WORD, actionOf, foundTally, live, type Asset, type Test, type TestItem } from './testing';

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
  title: string;
  machine: string;
  withWhom?: string;
  outcome: Test['outcome'];
  outcomeWord: string;

  /* the plan */
  plannedFor?: string;
  plannedProduct?: string;
  passesIf?: string;

  /* the day */
  ranOn?: string;
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

const DECISION: Record<string, string> = {
  new: 'to decide', actioned: 'actioned', noted: 'no action needed',
};

/** One trial, read whole. `tests` and `items` are the project's, not the
 *  trial's: the loop and the links are only readable with the neighbours in
 *  hand. */
export function trialCard(test: Test, tests: Test[], items: TestItem[], assets: Asset[]): TrialCard {
  const mine = live(items).filter(i => i.testId === test.id);
  const findings = mine.filter(i => i.kind === 'found').sort((a, b) => a.sort - b.sort);
  const nexts = mine.filter(i => i.kind === 'next').sort((a, b) => a.sort - b.sort);

  const tally = foundTally(findings, items);

  return {
    id: test.id,
    title: test.title,
    machine: assets.find(a => a.id === test.assetId)?.name ?? 'the line',
    withWhom: test.withWhom,
    outcome: test.outcome,
    outcomeWord: OUTCOME_WORD[test.outcome],

    plannedFor: test.plannedFor,
    plannedProduct: test.planned,
    passesIf: test.passesIf,

    ranOn: test.ranOn,
    product: test.product ?? test.planned,
    result: test.result,

    findings: findings.map(f => {
      const action = actionOf(f, items);
      return {
        what: f.what,
        owner: f.owner,
        decision: DECISION[action ? 'actioned' : f.doneAt != null ? 'noted' : 'new'],
        action: action?.what,
        photos: (f.media ?? []).length,
      };
    }),
    found: { written: tally.written, actioned: tally.actioned, undecided: tally.undecided },

    next: nexts.map(n => ({
      what: n.what,
      owner: n.owner,
      due: n.due,
      done: n.doneAt != null,
      fromFinding: !!n.fromItemId,
      becameTest: !!n.becameTestId,
    })),
    openNext: nexts.filter(n => n.doneAt == null).length,

    follows: test.fromTestId ? live(tests).find(t => t.id === test.fromTestId)?.title : undefined,
    ledTo: live(tests).filter(t => t.fromTestId === test.id).map(t => t.title),

    photos: (test.media ?? []).length,
    docs: (test.docs ?? []).length,
  };
}

/** The one line a GM reads instead of the whole card: what it was meant to do,
 *  and whether it did it. Deliberately not the outcome word on its own — "didn't
 *  pass" without the expectation beside it is a verdict nobody can check. */
export function verdictLine(c: TrialCard): string {
  if (c.outcome === 'planned') {
    return c.passesIf ? `Passes if ${lower(c.passesIf)}` : 'Not run yet';
  }
  if (c.outcome === 'notRun') return 'The day came and it did not happen';
  if (!c.result) return c.outcomeWord;
  return c.result;
}

const lower = (s: string): string => (s && s[0] === s[0].toUpperCase() && s[1] !== s[1]?.toUpperCase()
  ? s[0].toLowerCase() + s.slice(1)
  : s);

/** The agreed next step a GM should read, of however many there are: the first
 *  one still outstanding, because a done one is not what happens next. */
export function headlineNext(c: TrialCard): CardNext | undefined {
  return c.next.find(n => !n.done) ?? c.next[0];
}
