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
 *                Handed over — once every machine's hand-over list is done
 *                (lib/standing), whatever is still open: its real day
 *                against the agreed one, and what it went with. Red if late
 *                or something open is late, amber while anything is open.
 *   6M · TREE    On target when every line judged is at its target; Behind
 *                target when any is short; Not measured yet with no readings
 *                against a target.
 *
 * Pure: the screen gathers the records, this answers. Nothing is stored. */
import { assetStateOf, isOverdue, isSettled, live, plannedEnd, type Asset, type Test, type TestItem } from './testing';
import { handedOverWith, lateOrProblem } from './install';
import { couldWords, criticalProblems, riskProblems } from './critical';
import { hoursWord } from './hoursLost';
import { isHere, type Material } from './materials';
import { stateOf, type Program } from './programs';
import { standing, type LateThing, type Standing } from './standing';
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
  /** WHY, IN ONE LINE — the date and the counts, no names (the control
   *  room's row, docs/CONTROLROOM.md): the names are on the row's "Critical"
   *  and "Next" lines, and the whole reason is one tap away. */
  brief?: string;
}

/** Something owed due within this many days puts a job at risk. */
export const AT_RISK_DAYS = 2;

/** "Behind target — handover expected Mon 2 Nov, …" — the word and its reason
 *  as one line, for an aria label or a title. */
export const onTargetSays = (o: OnTarget): string => `${o.word} — ${o.reason}`;

const day = (iso: string) => niceDay(iso, { weekday: 'short' });
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** The handover, against the date agreed, in words.
 *
 *  Rowland, 7 October: "It says handover expected on the 9th of October — no
 *  date agreed yet. Well, it is agreed, it's agreed on the 9th of October."
 *  A job with one handover date is judged on that date: it is said as the
 *  handover, never as "no date agreed". Two dates that differ are the only
 *  slip, and say both. */
function handoverWords(expectedAt?: string, plannedAt?: string): string {
  if (expectedAt && plannedAt && expectedAt !== plannedAt) {
    const d = daysBetween(plannedAt, expectedAt);
    return `handover expected ${day(expectedAt)}, ${days(Math.abs(d))} ${d > 0 ? 'after' : 'before'} the agreed ${day(plannedAt)}`;
  }
  if (plannedAt) return `handover ${day(plannedAt)} as agreed`;
  return expectedAt ? `handover ${day(expectedAt)}` : 'no handover date set yet';
}

/** A thing's name for the one-line answer: one line, and short — the whole
 *  of it is under its own heading below. A name pasted from a spreadsheet
 *  cell carried a line break, and the box on paper lost what followed it. */
export const nameIn = (s: string, max = 60): string => {
  const one = s.replace(/\s+/g, ' ').trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max + 1).replace(/\s+\S*$/, '');
  return `${cut.length > max / 2 ? cut : one.slice(0, max)}…`;
};

/** "Pick and place — Programs loaded (100 h lost)", "Fix: Send the regulator
 *  (was due Mon 5 Oct)". */
const lateOne = (l: LateThing): string =>
  `${nameIn(l.what)} (${l.hours ? `${hoursWord(l.hours)} lost` : l.was ? `was due ${day(l.was)}` : 'late'})`;

/** WHAT IS LATE, BY NAME — every one when there are three or fewer, the
 *  first two and how many more otherwise. "1 late: …", "4 late: …, … and 2
 *  more". The count is the job's own (lib/standing), so it is the number the
 *  band and the rail say. */
function lateWords(things: LateThing[], n: number): string {
  if (!n) return 'nothing late';
  const named = things.length <= 3 ? things : things.slice(0, 2);
  const more = n - named.length;
  return `${n} late: ${named.map(lateOne).join('; ')}${more > 0 ? ` and ${more} more` : ''}`;
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

  /* HANDED OVER — the answer once every machine is (lib/standing), said with
     its real day against the agreed one and what it went with. Things do not
     go to plan and a handover is accepted anyway (Rowland, 9 October): red
     if it went after the agreed day or something still open is late, amber
     while anything is still open or a machine went with no test kept, a
     quiet green when it went on time with nothing left. */
  if (s.handedOver) {
    const d = s.handedVs;
    const on = s.handedOn ? day(s.handedOn) : '';
    const vs = d == null || !plannedAt ? '' : d === 0 ? 'the day agreed' : `${days(Math.abs(d))} ${d > 0 ? 'after' : 'before'} the agreed ${day(plannedAt)}`;
    const untested = assets.filter(a => handedOverWith(a, tests, items, today, programs).includes('no test kept')).length;
    const open = s.outstanding ? `${s.outstanding} still open${s.late ? `, ${s.late} late` : ''}` : 'nothing still open';
    const reason = [[on, vs].filter(Boolean).join(', ') || 'every machine handed over', open,
      untested ? `${untested} machine${untested === 1 ? '' : 's'} with no test kept` : ''].filter(Boolean).join(' · ');
    const tone: OnTargetTone = (d ?? 0) > 0 || s.late > 0 ? 'behind' : s.outstanding || untested ? 'risk' : 'on';
    return { tone, word: 'Handed over', reason, brief: reason };
  }

  /* The stages, each by the one rule: late, or a problem — which. */
  const which = new Map(tests.filter(t => t.kind === 'install').map(t => [t.id, lateOrProblem(t, items, today)]));
  const problemSteps = tests.filter(t => which.get(t.id) === 'problem');
  const problems = problemSteps.length;
  const machine = (t: Test) => assets.find(a => a.id === t.assetId)?.name ?? 'The line';

  /* Due within two days, and not late — everything owed, on every list. */
  const soonEnd = addDays(today, AT_RISK_DAYS);
  const soon = (d?: string) => !!d && d >= today && d <= soonEnd;
  const owed = (t: Test) => !isSettled(t) || t.outcome === 'notRun';
  /* A stage already counted late or a problem is said once, as that. */
  const dueSoon = tests.filter(t => owed(t) && !isOverdue(t, today) && !which.get(t.id) && soon(plannedEnd(t))).length
    + materials.filter(m => !isHere(m) && soon(m.due)).length
    + programs.filter(p => stateOf(p) !== 'proved' && soon(p.testOn)).length
    + assets.filter(a => assetStateOf(a) === 'awaited' && !a.onSiteOn && soon(a.dueOn)).length;

  /* Each thing said by name, so the line can be checked against the job:
     "1 late: Pick and place — Programs loaded (12 h lost)", "1 problem, no
     time lost: Wrapper — Change parts fitted". */
  const late = lateWords(s.lateThings ?? [], s.late);
  const problemWords = problems
    ? `${problems} problem${problems === 1 ? '' : 's'}, no time lost: ${problemSteps.slice(0, 2).map(t => nameIn(`${machine(t)} — ${t.title}`)).join('; ')}${problems > 2 ? ` and ${problems - 2} more` : ''}`
    : '';
  const slipped = !!expectedAt && !!plannedAt && expectedAt > plannedAt;
  const crit = criticalProblems(tests, items, assets).open;
  const critical = crit.length;
  const criticalWords = critical
    ? `${critical} critical: ${crit.slice(0, 2).map(c => nameIn(c.item.what)).join('; ')}${critical > 2 ? ` and ${critical - 2} more` : ''}`
    : '';
  /* HIGH RISKS (lib/critical) — not happened yet: they hold the job at At
     risk, never Behind, and say what each could cost as an estimate. */
  const risk = riskProblems(tests, items, assets).open;
  const riskWords = risk.length
    ? `${risk.length} high risk: ${risk.slice(0, 2).map(c => `${nameIn(c.item.what)}${c.item.couldLose ? `, ${couldWords(c.item)}` : ''}`).join('; ')}${risk.length > 2 ? ` and ${risk.length - 2} more` : ''}`
    : '';

  /* The one line: the handover and the counts — late first, then what holds
     it at risk. The critical has its own red line on the row. */
  const brief = [when, s.late ? `${s.late} late` : 'nothing late', problems ? `${problems} problem${problems === 1 ? '' : 's'}, no time lost` : '',
    risk.length ? `${risk.length} high risk` : '', dueSoon && !s.late ? `${dueSoon} due within ${AT_RISK_DAYS} days` : ''].filter(Boolean).join(' · ');
  if (slipped || s.late > 0) {
    return { tone: 'behind', word: 'Behind target', reason: [when, criticalWords, late, problemWords, riskWords].filter(Boolean).join(' · '), brief };
  }
  if (critical || risk.length || problems || dueSoon) {
    return {
      tone: 'risk', word: 'At risk',
      reason: [when, criticalWords, riskWords, late, problemWords, dueSoon ? `${dueSoon} due within ${AT_RISK_DAYS} days` : ''].filter(Boolean).join(' · '),
      brief,
    };
  }
  /* Nothing late and no date to be on target FOR — said, not guessed. */
  if (!expectedAt && !plannedAt) return { tone: 'none', word: 'No target date', reason: `${when} · nothing late`, brief };
  return { tone: 'on', word: 'On target', reason: `${when} · ${late}`, brief };
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
  if (!short.length) return { tone: 'on', word: 'On target', reason: head + tail, brief: head + tail };
  const each = short.slice(0, 2).map(l => {
    const s = l.series as LineSeries;
    return `${l.name}: ${say(s.latest as number)} vs ${say(s.target as number, s.measure.unit)}`;
  });
  const more = short.length > 2 ? `; and ${short.length - 2} more` : '';
  return { tone: 'behind', word: 'Behind target', reason: `${head} (${each.join('; ')}${more})${tail}`,
    /* The line: how many are short; which and by how much is the reason's. */
    brief: `${head} · ${short.length} short${tail}` };
}
