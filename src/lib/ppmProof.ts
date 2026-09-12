/* PROOF FOR THE NUMBERS THE TEAM ACTUALLY PRODUCES.
 *
 * The app has always been able to prove a fix held — but only against
 * observations: somebody standing on the line with a stopwatch. That is the
 * measurement a lot of factories cannot feed, because it needs the team to work
 * differently, and the team's way is already set.
 *
 * What those teams DO produce, every week, without being asked to change
 * anything, is a ppm figure per line. It is a real measurement from a real
 * week. So it can carry a real proof — the same discipline the Case study runs
 * on observations, applied to the numbers that are already here:
 *
 *   - the weeks before the change and the weeks after it, counted, never typed
 *   - both means, and the difference between them
 *   - a significance test, so "it went up" and "it went up for a reason" are
 *     not the same sentence
 *   - a verdict that is ALLOWED TO SAY NO, which is the only thing that makes
 *     a yes worth anything
 *   - frozen at the moment it is called, so later weeks cannot quietly rewrite
 *     a claim somebody already made in a meeting
 *
 * The one difference from the Case study: up is good here. A ppm study is
 * testing that the after weeks are HIGHER, where a duration study is testing
 * that they are lower. Same test, arguments the other way round — see below,
 * because getting that backwards would turn every win into a loss and every
 * loss into a win, silently.
 */
import { welchOneSidedP, SIGNIFICANCE_P } from './proof';

/** Both sides need this many weeks before the difference between two means is
 *  worth reporting at all. Two weeks either side is an anecdote. */
const MIN_WEEKS = 2;

/** What the numbers say, once the weeks are counted.
 *  - `proven`  — up, and the test says it is not luck
 *  - `better`  — up, but not enough weeks yet, or the spread is too wide to tell
 *  - `flat`    — no material change
 *  - `worse`   — down. Shown exactly as loudly as a win, on purpose. */
export type PpmVerdict = 'proven' | 'better' | 'flat' | 'worse';

/** A change of less than this is not a result, it is a wobble. */
const FLAT_PCT = 1.5;

export interface PpmProof {
  /** The first week that counts as "after" — the week the change landed. */
  fromWeek: number;
  beforeN: number; beforeMean: number;
  afterN: number; afterMean: number;
  deltaPpm: number;
  changePct: number;
  /** null when either side has fewer than 3 weeks — untestable, not failed. */
  pValue: number | null;
  significant: boolean | null;
  verdict: PpmVerdict;
  /** Read from a called receipt rather than from this week's numbers. */
  frozen: boolean;
}

/** Frozen at the moment somebody calls it, and stored on the win. Everything
 *  needed to reprint the claim later without recomputing it — because the
 *  weeks after the call keep arriving, and a receipt that moves is not a
 *  receipt. */
export interface WinProof {
  /** Which line's weeks these are. Key is the human one ('2A'); the name is
   *  kept alongside so a receipt still reads correctly if the line is renamed. */
  lineKey: string;
  lineName: string;
  fromWeek: number;
  calledAt: number;
  beforeN: number; beforeMean: number;
  afterN: number; afterMean: number;
  deltaPpm: number; changePct: number;
  pValue: number | null;
}

const mean = (xs: number[]) => xs.reduce((a, v) => a + v, 0) / xs.length;
const round1 = (v: number) => Math.round(v * 10) / 10;

function verdictOf(changePct: number, significant: boolean | null): PpmVerdict {
  if (changePct <= -FLAT_PCT) return 'worse';
  if (changePct < FLAT_PCT) return 'flat';
  return significant === true ? 'proven' : 'better';
}

/** Derive the proof live from a line's weekly ppm.
 *
 *  `weekly` is the line's own array, indexed from PACE_START, with null for a
 *  week nobody measured — nulls are skipped rather than treated as zero, which
 *  would read a missed week as the line stopping.
 *
 *  Returns null when there are not enough measured weeks either side to say
 *  anything, so the caller can show "not enough weeks yet" instead of a number
 *  built out of one reading. */
export function ppmProof(weekly: (number | null)[], fromWeek: number): PpmProof | null {
  const before: number[] = [];
  const after: number[] = [];
  for (let i = 0; i < weekly.length; i++) {
    const v = weekly[i];
    if (v == null) continue;
    (i < fromWeek ? before : after).push(v);
  }
  if (before.length < MIN_WEEKS || after.length < MIN_WEEKS) return null;

  const b = mean(before), a = mean(after);
  if (b <= 0) return null;
  /* Arguments reversed against the Case study on purpose. welchOneSidedP tests
     H1: the SECOND group's mean is lower than the first's. A duration study
     wants after < before; a ppm study wants after > before, which is the same
     test asking whether before < after. */
  const pValue = welchOneSidedP(after, before);
  const changePct = ((a - b) / b) * 100;

  return {
    fromWeek,
    beforeN: before.length, beforeMean: b,
    afterN: after.length, afterMean: a,
    deltaPpm: a - b,
    changePct,
    pValue,
    significant: pValue == null ? null : pValue < SIGNIFICANCE_P,
    verdict: verdictOf(changePct, pValue == null ? null : pValue < SIGNIFICANCE_P),
    frozen: false,
  };
}

/** Freeze the live numbers onto the win. */
export function makeWinProof(p: PpmProof, lineKey: string, lineName: string, calledAt: number): WinProof {
  return {
    lineKey, lineName, fromWeek: p.fromWeek, calledAt,
    beforeN: p.beforeN, beforeMean: p.beforeMean,
    afterN: p.afterN, afterMean: p.afterMean,
    deltaPpm: p.deltaPpm, changePct: p.changePct,
    pValue: p.pValue,
  };
}

/** Read a called win's receipt back as a proof, without recomputing it. */
export function proofFromWin(w: WinProof): PpmProof {
  const significant = w.pValue == null ? null : w.pValue < SIGNIFICANCE_P;
  return {
    fromWeek: w.fromWeek,
    beforeN: w.beforeN, beforeMean: w.beforeMean,
    afterN: w.afterN, afterMean: w.afterMean,
    deltaPpm: w.deltaPpm, changePct: w.changePct,
    pValue: w.pValue, significant,
    verdict: verdictOf(w.changePct, significant),
    frozen: true,
  };
}

/** The claim in one line — what prints on the report and reads out in a room.
 *  Always carries both week counts, so nobody has to ask "out of how many?"
 *
 *  It deliberately does NOT name the verdict. Everywhere this is shown, a badge
 *  is shown beside it; saying "proven" twice in one row is noise, and the badge
 *  is the thing a reader's eye lands on first. */
export function proofSentence(p: PpmProof): string {
  const move = `${round1(p.beforeMean)} → ${round1(p.afterMean)} ppm`;
  const weeks = `${p.beforeN}w before · ${p.afterN}w after`;
  if (p.verdict === 'flat') return `${move} · no material change · ${weeks}`;
  return `${move} · ${p.changePct >= 0 ? '+' : ''}${round1(p.changePct)}% · ${weeks}`;
}

/** The short badge: what a reader sees before they read anything else. */
export function verdictLabel(v: PpmVerdict): string {
  return v === 'proven' ? 'Proven' : v === 'better' ? 'Not yet proven' : v === 'flat' ? 'No change' : 'Worse';
}
