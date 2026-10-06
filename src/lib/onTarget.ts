/* ARE WE ON TARGET? — one answer, worked out once.
 *
 * Rowland, 6 October: "the header must clearly show the answer to the
 * question: ARE WE ON TARGET?"
 *
 * Every number it needs was already on the job; what was missing was the
 * answer itself, said in a word, with the reason beside it in words. It is
 * read at the top of Today's update (screen and paper), the client report
 * (screen and paper), the job's front page band and the control room's row
 * for the job — this one function, so none of them can answer differently.
 *
 *   STAGE GATE   Behind target (red) — the handover is expected after the date
 *                agreed, or anything is late: a stage late by lib/install
 *                lateOrProblem (its day gone, or hours lost), a test, a fix,
 *                a material, a program or a machine past its day — the same
 *                late lib/standing counts.
 *                At risk (amber) — nothing late, but a stage hit a problem and
 *                lost no time, something owed falls due within 2 days, or a
 *                CRITICAL problem is open (lib/critical) — never "on target"
 *                while one is, and its count is in the reason either way.
 *                On target (a quiet green) — otherwise.
 *   6M · TREE    On target when every line judged is at its target; Behind
 *                target when any is short; Not measured yet with no readings
 *                against a target.
 *
 * Pure: the screen gathers the records, this answers. Nothing is stored. */
import { assetStateOf, isOverdue, isSettled, live, plannedEnd, type Asset, type Test, type TestItem } from './testing';
import { lateOrProblem } from './install';
import { criticalProblems } from './critical';
import { DAY_HOURS, hoursTally, hoursWord } from './hoursLost';
import { isHere, type Material } from './materials';
import { stateOf, type Program } from './programs';
import { standing, type Standing } from './standing';
import { say, type LineSeries } from './measures';
import { addDays, daysBetween, niceDay } from './weeks';

/** behind · at risk · on target · not measured (or no date to judge against). */
export type OnTargetTone = 'behind' | 'risk' | 'on' | 'none';

export interface OnTarget {
  tone: OnTargetTone;
  /** "Behind target", "At risk", "On target", "Not measured yet". */
  word: string;
  /** Why, in words: the dates and the counts. */
  reason: string;
}

/** Something owed due within this many days puts a job at risk. */
export const AT_RISK_DAYS = 2;

/** "Behind target — handover expected Mon 2 Nov, …" — the word and its reason
 *  as one line, for an aria label or a title. */
export const onTargetSays = (o: OnTarget): string => `${o.word} — ${o.reason}`;

const day = (iso: string) => niceDay(iso, { weekday: 'short' });
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** The handover, against the date agreed, in words. */
function handoverWords(expectedAt?: string, plannedAt?: string): string {
  if (expectedAt && plannedAt && expectedAt !== plannedAt) {
    const d = daysBetween(plannedAt, expectedAt);
    return `handover expected ${day(expectedAt)}, ${days(Math.abs(d))} ${d > 0 ? 'after' : 'before'} the agreed ${day(plannedAt)}`;
  }
  if (plannedAt) return `handover ${day(plannedAt)} as agreed`;
  if (expectedAt) return `handover expected ${day(expectedAt)} — no date agreed yet`;
  return 'no handover date agreed yet';
}

export interface StageGateInput {
  project: { expectedAt?: string; plannedAt?: string };
  tests: Test[];
  items: TestItem[];
  assets: Asset[];
  materials: Material[];
  programs: Program[];
  today: string;
}

/** A stage-gate job: is the handover on target? `st` is the job's standing
 *  when the caller has it already — its `late` IS the late counted here. */
export function stageGateOnTarget(x: StageGateInput, st?: Standing): OnTarget {
  const { today } = x;
  const tests = live(x.tests), items = live(x.items), assets = live(x.assets);
  const materials = live(x.materials), programs = live(x.programs);
  const { expectedAt, plannedAt } = x.project;
  const s = st ?? standing({ tests, items, assets, materials, programs, expectedAt, plannedAt, today });
  const when = handoverWords(expectedAt, plannedAt);

  if (!tests.length && !assets.length && !materials.length && !programs.length) {
    return { tone: 'none', word: 'Nothing planned yet', reason: `${when} · no machines or steps on the job yet` };
  }

  /* The stages, each by the one rule: late, or a problem — which. */
  const which = new Map(tests.filter(t => t.kind === 'install').map(t => [t.id, lateOrProblem(t, items, today)]));
  const lateSteps = tests.filter(t => which.get(t.id) === 'late');
  const problems = tests.filter(t => which.get(t.id) === 'problem').length;
  const lost = lateSteps.reduce((h, t) => h + hoursTally(t.id, items, DAY_HOURS).hours, 0);

  /* Due within two days, and not late — everything owed, on every list. */
  const soonEnd = addDays(today, AT_RISK_DAYS);
  const soon = (d?: string) => !!d && d >= today && d <= soonEnd;
  const owed = (t: Test) => !isSettled(t) || t.outcome === 'notRun';
  /* A stage already counted late or a problem is said once, as that. */
  const dueSoon = tests.filter(t => owed(t) && !isOverdue(t, today) && !which.get(t.id) && soon(plannedEnd(t))).length
    + materials.filter(m => !isHere(m) && soon(m.due)).length
    + programs.filter(p => stateOf(p) !== 'proved' && soon(p.testOn)).length
    + assets.filter(a => assetStateOf(a) === 'awaited' && !a.onSiteOn && soon(a.dueOn)).length;

  const lateWords = s.late ? `${s.late} late${lost ? `, ${hoursWord(lost)} lost` : ''}` : 'nothing late';
  const problemWords = problems ? `${problems} a problem, no time lost` : '';
  const slipped = !!expectedAt && !!plannedAt && expectedAt > plannedAt;
  const critical = criticalProblems(tests, items, assets).open.length;
  const criticalWords = critical ? `${critical} critical problem${critical === 1 ? '' : 's'} open` : '';

  if (slipped || s.late > 0) {
    return { tone: 'behind', word: 'Behind target', reason: [when, criticalWords, lateWords, problemWords].filter(Boolean).join(' · ') };
  }
  if (critical || problems || dueSoon) {
    return {
      tone: 'risk', word: 'At risk',
      reason: [when, criticalWords, lateWords, problemWords, dueSoon ? `${dueSoon} due within ${AT_RISK_DAYS} days` : ''].filter(Boolean).join(' · '),
    };
  }
  /* Nothing late and no date to be on target FOR — said, not guessed. */
  if (!expectedAt && !plannedAt) return { tone: 'none', word: 'No target date', reason: `${when} · nothing late` };
  return { tone: 'on', word: 'On target', reason: `${when} · ${lateWords}` };
}

/** A 6M or lever tree job: every line judged is at its target, or which are
 *  short and by how much — the front page's "Lines at target" reading. */
export function linesOnTarget(lines: { name: string; series?: LineSeries }[]): OnTarget {
  const none = (reason: string): OnTarget => ({ tone: 'none', word: 'Not measured yet', reason });
  if (!lines.length) return none('no lines on the job yet');
  if (!lines.some(l => l.series)) return none('no measure set yet');
  const judged = lines.filter(l => l.series?.meeting != null);
  if (!judged.length) return none('no line has a reading against a target yet');
  const short = judged.filter(l => l.series?.meeting === false);
  const head = `${judged.length - short.length} of ${judged.length} line${judged.length === 1 ? '' : 's'} at target`;
  const unjudged = lines.length - judged.length;
  const tail = unjudged ? ` · ${unjudged} not measured yet` : '';
  if (!short.length) return { tone: 'on', word: 'On target', reason: head + tail };
  const each = short.slice(0, 2).map(l => {
    const s = l.series as LineSeries;
    return `${l.name}: ${say(s.latest as number)} vs ${say(s.target as number, s.measure.unit)}`;
  });
  const more = short.length > 2 ? `; and ${short.length - 2} more` : '';
  return { tone: 'behind', word: 'Behind target', reason: `${head} (${each.join('; ')}${more})${tail}` };
}
