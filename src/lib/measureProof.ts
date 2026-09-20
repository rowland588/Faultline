/* PROOF FOR THE NUMBERS THE TEAM ACTUALLY PRODUCES.
 *
 * The app has always been able to prove a fix held — but only against
 * observations: somebody standing on the line with a stopwatch. That is the
 * measurement a lot of factories cannot feed, because it needs the team to work
 * differently, and the team's way is already set.
 *
 * What those teams DO produce, without being asked to change anything, is a
 * number per line per week — whatever number they already keep. So it can carry
 * a real proof: the same discipline the Case study runs on observations, applied
 * to the readings that are already here:
 *
 *   - the readings before the change and the ones after it, counted, never typed
 *   - both means, and the difference between them
 *   - a significance test, so "it went up" and "it went up for a reason" are
 *     not the same sentence
 *   - a verdict that is ALLOWED TO SAY NO, which is the only thing that makes
 *     a yes worth anything
 *   - frozen at the moment it is called, so later readings cannot quietly
 *     rewrite a claim somebody already made in a meeting
 *
 * WHICH WAY IS GOOD COMES FROM THE MEASURE. This used to assume up was good,
 * because it only ever ran on packs per minute. Run that assumption over a waste
 * figure and every improvement reads as a loss and every loss as a win —
 * silently. So the direction is passed in, and it decides both the arithmetic and
 * which way round the one-sided test is asked.
 */
import { welchOneSidedP, SIGNIFICANCE_P } from './proof';
import type { Direction } from './measures';

/** Both sides need this many readings before the difference between two means is
 *  worth reporting at all. Two either side is an anecdote. */
const MIN_READINGS = 2;

/** What the numbers say, once the readings are counted.
 *  - `proven`  — better, and the test says it is not luck
 *  - `better`  — better, but not enough readings yet, or the spread is too wide
 *  - `flat`    — no material change
 *  - `worse`   — worse. Shown exactly as loudly as a win, on purpose. */
export type ProofVerdict = 'proven' | 'better' | 'flat' | 'worse';

/** A change of less than this is not a result, it is a wobble. */
const FLAT_PCT = 1.5;

export interface NumberProof {
  /** The first reading that counts as "after" — where the change landed. */
  fromIndex: number;
  beforeN: number; beforeMean: number;
  afterN: number; afterMean: number;
  /** Signed in the measure's own units, POSITIVE WHEN BETTER whichever way good
   *  is: a waste figure that fell by 0.6 has a delta of +0.6. */
  delta: number;
  /** The same, as a percentage of the before mean. */
  changePct: number;
  /** null when either side has fewer than 3 readings — untestable, not failed. */
  pValue: number | null;
  significant: boolean | null;
  verdict: ProofVerdict;
  /** Read from a called receipt rather than from this week's numbers. */
  frozen: boolean;
}

/** Frozen at the moment somebody calls it, and stored on the win. Everything
 *  needed to reprint the claim later without recomputing it — because the
 *  readings after the call keep arriving, and a receipt that moves is not a
 *  receipt. */
export interface WinProof {
  /** Which line's readings these are. Key is the human one ('2A'); the name is
   *  kept alongside so a receipt still reads correctly if the line is renamed. */
  lineKey: string;
  lineName: string;
  /** WHAT was measured, and in what — kept on the receipt, because a measure can
   *  be renamed or stopped and the claim still has to read correctly. */
  measureName?: string;
  unit?: string;
  direction?: Direction;
  /** The date the change landed — a real date, not an index into a calendar the
   *  app happened to be built around. */
  fromAt?: string;
  calledAt: number;
  beforeN: number; beforeMean: number;
  afterN: number; afterMean: number;
  delta: number; changePct: number;
  pValue: number | null;
}

const mean = (xs: number[]) => xs.reduce((a, v) => a + v, 0) / xs.length;
const round1 = (v: number) => Math.round(v * 10) / 10;

function verdictOf(changePct: number, significant: boolean | null): ProofVerdict {
  if (changePct <= -FLAT_PCT) return 'worse';
  if (changePct < FLAT_PCT) return 'flat';
  return significant === true ? 'proven' : 'better';
}

/** Derive the proof live from a line's readings for one measure.
 *
 *  `values` is the series oldest first, and `fromIndex` the first reading that
 *  counts as after. There are no gaps to skip: a reading is a date and a number,
 *  so a week nobody measured is simply not in the list.
 *
 *  Returns null when there are not enough readings either side to say anything,
 *  so the caller can show "not enough yet" instead of a number built out of one
 *  measurement. */
export function numberProof(values: number[], fromIndex: number, direction: Direction): NumberProof | null {
  const before = values.slice(0, fromIndex);
  const after = values.slice(fromIndex);
  if (before.length < MIN_READINGS || after.length < MIN_READINGS) return null;

  const b = mean(before), a = mean(after);
  if (b === 0) return null;                 // no percentage to quote against zero

  /* Arguments chosen by direction. welchOneSidedP tests H1: the SECOND group's
     mean is lower than the first's. An "up is good" measure wants after > before,
     which is the same test asking whether before < after; a "down is good" one
     wants after < before, which asks it the other way round. Getting this
     backwards would turn every win into a loss, silently. */
  const pValue = direction === 'up' ? welchOneSidedP(after, before) : welchOneSidedP(before, after);
  const delta = direction === 'up' ? a - b : b - a;
  const changePct = (delta / Math.abs(b)) * 100;
  const significant = pValue == null ? null : pValue < SIGNIFICANCE_P;

  return {
    fromIndex,
    beforeN: before.length, beforeMean: b,
    afterN: after.length, afterMean: a,
    delta, changePct, pValue, significant,
    verdict: verdictOf(changePct, significant),
    frozen: false,
  };
}

/** Freeze the live numbers onto the win. */
export function makeWinProof(p: NumberProof, about: {
  lineKey: string; lineName: string;
  measureName?: string; unit?: string; direction?: Direction; fromAt?: string;
}, calledAt: number): WinProof {
  return {
    ...about, calledAt,
    beforeN: p.beforeN, beforeMean: p.beforeMean,
    afterN: p.afterN, afterMean: p.afterMean,
    delta: p.delta, changePct: p.changePct,
    pValue: p.pValue,
  };
}

/** Read a called win's receipt back as a proof, without recomputing it. */
export function proofFromWin(w: WinProof): NumberProof {
  const significant = w.pValue == null ? null : w.pValue < SIGNIFICANCE_P;
  return {
    fromIndex: 0,
    beforeN: w.beforeN, beforeMean: w.beforeMean,
    afterN: w.afterN, afterMean: w.afterMean,
    delta: w.delta, changePct: w.changePct,
    pValue: w.pValue, significant,
    verdict: verdictOf(w.changePct, significant),
    frozen: true,
  };
}

/** The claim in one line — what prints on the report and reads out in a room.
 *  Always carries both counts, so nobody has to ask "out of how many?"
 *
 *  It deliberately does NOT name the verdict. Everywhere this is shown, a badge
 *  is shown beside it; saying "proven" twice in one row is noise, and the badge
 *  is the thing a reader's eye lands on first. */
export function proofSentence(p: NumberProof, unit?: string): string {
  const u = unit ? ` ${unit}` : '';
  const move = `${round1(p.beforeMean)} → ${round1(p.afterMean)}${u}`;
  const counts = `${p.beforeN} before · ${p.afterN} after`;
  if (p.verdict === 'flat') return `${move} · no material change · ${counts}`;
  return `${move} · ${p.changePct >= 0 ? '+' : ''}${round1(p.changePct)}% · ${counts}`;
}

/** The short badge: what a reader sees before they read anything else. */
export function verdictLabel(v: ProofVerdict): string {
  return v === 'proven' ? 'Proven' : v === 'better' ? 'Not yet proven' : v === 'flat' ? 'No change' : 'Worse';
}
