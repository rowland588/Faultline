/* THE DAY — what happened on the job on one date, told as a story.
 *
 * Rowland: "the ability to understand the issues and stages that are taking
 * place on a day to day basis, telling a story."
 *
 * NOTHING HERE IS TYPED. Every line is read off a date a record already
 * carries — the day a step was done, a test ran, a machine landed, a film
 * arrived, something was written down — so the story of a day is there the
 * moment the day's work has been logged, and nobody writes a diary on top of
 * it. A diary would be a fifth concept, and the second place the same fact
 * lived; this is the first place, read by date.
 *
 * The screen and the one-page PDF both draw this, so the page sent to the
 * client and the screen it was sent from cannot tell two stories.
 */
import { planCount, planFor } from './huddle';
import { isHere, type Material } from './materials';
import { daysOverdue, stateOf, type Program } from './programs';
import { standing } from './standing';
import {
  gateOf, isOverdue, isSettled, live, needsVerdict, outcomeWord, type Asset, type StepGate, type Test, type TestItem,
} from './testing';
import type { MediaRef } from '../types';
import { GATE_WORD, lateOrProblem, lateOrProblemSays, doneLateBy, heldUpBy, lateByWords } from './install';
import { niceDay, todayISO } from './weeks';
import { isRunTest, readRuns, runsOpen, runsSay } from './run';
import { RESULT_WORD, partLate, partOnStage, partsOnStages } from './noted';
import { couldWords, criticalProblems, criticalState, riskProblems, type Critical } from './critical';

export interface DayInput {
  tests: Test[];
  items: TestItem[];
  assets: Asset[];
  materials: Material[];
  programs: Program[];
}

/** done · it went wrong · the day came and it did not happen · waiting on a word
 *  · written down · booked · a stage that hit a problem and lost no time
 *  (amber — lib/install lateOrProblem) */
export type DayTone = 'done' | 'bad' | 'slipped' | 'asking' | 'found' | 'booked' | 'problem';

export interface DayLine {
  text: string;
  /** A second line under it — what was written against it. */
  detail?: string;
  tone: DayTone;
  /** The record it opens, when it is a test, a fix or an install step. */
  id?: string;
  /** Where it opens otherwise. */
  go?: 'materials' | 'programs' | 'install';
  /** A stage, late or a problem — which (lib/install lateOrProblem) — and
   *  the words in `text` that say it, drawn in its colour: red for late,
   *  amber for a problem that lost no time. */
  which?: 'late' | 'problem' | 'critical';
  mark?: string;
}

export interface DaySection {
  key: 'critical' | 'risk' | 'plan' | 'done' | 'wrong' | 'found' | 'late' | 'problem' | 'today' | 'going' | 'next';
  title: string;
  lines: DayLine[];
}

export interface Day {
  date: string;
  /** "Tue 29 Sept" */
  label: string;
  /** One sentence — how the day went, in numbers a person would say. */
  headline: string;
  sections: DaySection[];
  /** The pictures taken that day, on any record. */
  media: MediaRef[];
  /** Install, as it stood at the end of the day. Undefined on a job with no steps. */
  install?: { done: number; total: number };
  /** Every gate with steps on the job — Install, Set up, Hand over — as it
   *  stood that evening. `install` is the first of these, kept for callers
   *  that only ever read Install. */
  /** By the end of that day, each stage by the one rule (lib/install
   *  lateOrProblem — Rowland, 6 October): `late`, its day gone or hours lost;
   *  `problem`, it hit a problem and lost no time; `wrong`, the two together.
   *  The bar draws late red and a problem amber, and the words say each. */
  gates: { gate: StepGate; label: string; done: number; problem: number; late: number; wrong: number; total: number }[];
  /** Nothing happened and nothing was booked. */
  empty: boolean;
}

const dayOfMs = (ms: number): string => todayISO(new Date(ms));
const on = (d: string, from?: string, to?: string): boolean => !!from && from <= d && d <= (to && to > from ? to : from);
/** The last day of a step's booked window — the day it is due. */
const endOf = (t: Test): string => (t.plannedTo && t.plannedFor && t.plannedTo > t.plannedFor ? t.plannedTo : t.plannedFor ?? t.plannedTo ?? '');
const short = (iso: string) => niceDay(iso, { weekday: 'short' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** The line under a part of a stage: what it is, and whose. */
const partDetail = (p: TestItem) => `Part of the plan${p.owner?.trim() ? ` · ${p.owner.trim()}` : ''}`;

/** Every date on which something HAPPENED — for stepping back and forward a
 *  day at a time without landing on blank ones. */
export function activeDays(input: DayInput): string[] {
  const days = new Set<string>();
  const add = (d?: string) => { if (d) days.add(d); };
  for (const t of live(input.tests)) {
    if (t.ranOn) { add(t.ranOn); if (t.ranTo && t.ranTo > t.ranOn) add(t.ranTo); }
    if (t.kind === 'fix') add(dayOfMs(t.createdAt));
  }
  for (const i of live(input.items)) if (i.kind === 'found') add(dayOfMs(i.createdAt));
  /* A day the huddle agreed a plan for has a story to tell (lib/huddle). */
  for (const i of live(input.items)) if (i.kind === 'today') add(i.due);
  /* A part of a stage ticked done (ui/StageParts) is something that happened. */
  for (const { part } of partsOnStages(input.tests, input.items)) if (part.doneAt != null) add(dayOfMs(part.doneAt));
  /* …and so is its status said, with what was seen (lib/noted). */
  for (const { part } of partsOnStages(input.tests, input.items)) for (const r of part.results ?? []) add(r.on);
  for (const a of live(input.assets)) { add(a.onSiteOn); add(a.installedOn); add(a.runningOn); }
  for (const m of live(input.materials)) add(m.inOn);
  for (const p of live(input.programs)) add(p.provedOn);
  return [...days].sort();
}

export function dayOf(input: DayInput, date: string, today: string = todayISO()): Day {
  const tests = live(input.tests);
  const items = live(input.items);
  const assets = live(input.assets);
  const past = date < today;
  const isToday = date === today;
  const machine = (id?: string) => assets.find(a => a.id === id)?.name;
  const where = (t: Test) => machine(t.assetId);
  /* "Case packer — Air and power connected". An install step is nothing
     without its machine; a test or a fix usually says it in its title. */
  const named = (t: Test) => (t.kind === 'install' ? `${where(t) ?? 'The line'} — ${t.title}` : t.title);
  const who = (w?: string) => (w?.trim() ? ` (${w.trim()})` : '');

  const done: DayLine[] = [];
  const wrong: DayLine[] = [];
  const found: DayLine[] = [];
  /* BOOKED, SAID AS IT IS. Rowland, 5 October: "it's showing everything is
     due today, and it's not. A lot of the things start from today to the end
     of the week." Every step whose window took in the day was listed under
     "Still booked for today" by its name alone, so a Monday-to-Friday step
     read as due on Monday. Now what FINISHES that day is due that day; what
     runs on past it is under way, with the day it is due; and each says its
     window. */
  const booked: DayLine[] = [];
  const going: DayLine[] = [];
  /* Past its day, still not done — today's only: the thing a lead sends
     about first, and it was on none of the day's lists. */
  const late: DayLine[] = [];
  /* A STAGE THAT HIT A PROBLEM AND LOST NO TIME — today's only, amber, apart
     from what is late. Rowland, 6 October: "We know if it's a problem and if
     it's late, because I put hours in the problem to tell the app it caused
     lateness." */
  const problems: DayLine[] = [];
  /* LATE, OR A PROBLEM — WHICH (lib/install lateOrProblem), as it stood that
     evening: the hours written by then, the days gone by then. */
  const evening = new Date(`${date}T23:59:59`).getTime();
  const itemsBy = items.filter(i => i.createdAt <= evening);
  const which = (t: Test) => (t.kind === 'install' ? lateOrProblemSays(t, itemsBy, date) : undefined);

  /* ------------------------------- machines ------------------------------- */
  for (const a of assets) {
    if (a.onSiteOn === date) done.push({ text: `${a.name} arrived on site${who(a.oem)}.`, tone: 'done', go: 'install' });
    if (a.installedOn === date) done.push({ text: `${a.name} installed.`, tone: 'done', go: 'install' });
    if (a.runningOn === date) done.push({ text: `${a.name} running.`, tone: 'done', go: 'install' });
    const landedBy = a.onSiteOn && a.onSiteOn <= date;
    if (a.dueOn === date && !landedBy) {
      (past ? wrong : booked).push({
        text: past ? `${a.name} was due on site and did not arrive${who(a.oem)}.` : `${a.name} due on site${who(a.oem)}.`,
        tone: past ? 'slipped' : 'booked', go: 'install',
      });
    }
  }

  /* ---------------------- install steps, tests, fixes --------------------- */
  const order = (t: Test) => (t.kind === 'install' ? 0 : t.kind === 'fix' ? 2 : 1);
  for (const t of [...tests].sort((x, y) => order(x) - order(y) || x.sort - y.sort)) {
    const ranToday = on(date, t.ranOn, t.ranTo);
    const bookedToday = on(date, t.plannedFor, t.plannedTo);
    /* A performance run's products, in one line, when nothing was written:
       "2 of 3 products run — 1 passed, 1 didn't pass." (lib/run) */
    const detail = t.result?.trim() || (isRunTest(t) ? runsSay(readRuns(t)) : '') || undefined;
    if (ranToday) {
      const word = outcomeWord(t);
      if (t.outcome === 'passed') {
        /* Done after its first planned finish says so, in red words — "done,
           1 day late" (lib/install doneLateBy). */
        const by = t.kind === 'install' ? doneLateBy(t, items) : 0;
        const late = by ? lateByWords(by) : '';
        /* And why, when the stage before lost the time (lib/install heldUpBy). */
        const held = by ? heldUpBy(t, tests, items, today) : undefined;
        done.push({ text: t.kind === 'test' || !t.kind ? `${named(t)} passed${who(t.withWhom)}.` : `${named(t)} — ${word.toLowerCase()}${late ? `, ${late}` : ''}${held ? ` — ${held.words}` : ''}${who(t.withWhom)}.`, detail, tone: 'done', id: t.id,
          ...(late ? { which: 'late' as const, mark: late } : {}) });
      } else if (t.outcome === 'failed') {
        /* A stage says which: "— late, 2 h lost" in red, "— a problem, no
           time lost" in amber; a test keeps its "didn't pass". */
        const w = which(t);
        if (w) wrong.push({ text: `${named(t)} — ${w.words}${who(t.withWhom)}.`, detail, tone: w.which === 'late' ? 'bad' : 'problem', id: t.id, which: w.which, mark: w.words });
        else wrong.push({ text: `${named(t)} — ${word.toLowerCase()}${who(t.withWhom)}.`, detail, tone: 'bad', id: t.id });
      } else if (t.outcome === 'notRun') {
        wrong.push({ text: `${named(t)} did not happen${who(t.withWhom)}.`, detail, tone: 'slipped', id: t.id });
      } else if (needsVerdict(t)) {
        done.push({ text: `${named(t)} was worked on — nobody has said how it went yet.`, detail, tone: 'asking', id: t.id });
      } else if (runsOpen(t)) {
        /* Part-way through its products: under way, its verdict to come
           from the numbers when the last product is in. */
        done.push({ text: `${named(t)} under way${who(t.withWhom)}.`, detail, tone: 'booked', id: t.id });
      } else if (t.kind === 'install') {
        /* A stage worked on and not yet marked done stays planned (Rowland, 5
           October) — still on the day's story, with what was said, in the
           colour of still ahead. */
        const w = which(t);
        done.push({ text: `${named(t)} was worked on — not marked done yet${w ? ` — ${w.words}` : ''}.`, detail,
          tone: !w ? 'booked' : w.which === 'late' ? 'slipped' : 'problem', id: t.id, ...(w ? { which: w.which, mark: w.words } : {}) });
      }
      continue;
    }
    /* TODAY, A STAGE LATE OR A PROBLEM IS SAID ONCE, AS WHICH — in its own
       list, with its hours and its day. A stage that hit a problem on another
       day was on none of today's lists. */
    const w = isToday ? which(t) : undefined;
    if (w) {
      const end = endOf(t);
      const due = end ? `, ${end < date ? 'was due' : 'due'} ${short(end)}` : '';
      const held = w.which === 'late' ? heldUpBy(t, tests, items, today) : undefined;
      (w.which === 'late' ? late : problems).push({
        text: `${named(t)} — ${w.words}${due}${held ? ` — ${held.words}` : ''}${who(t.withWhom)}.`, detail: t.outcome === 'failed' ? detail : undefined,
        tone: w.which === 'late' ? 'slipped' : 'problem', id: t.id, which: w.which, mark: w.words,
      });
      continue;
    }
    /* Booked over this day, and it did not run on it. Only the LAST day of
       its window is the day it was due: a past day in the middle of a week's
       booking was a day it was under way, not one where it "did not happen". */
    if (bookedToday && !isSettled(t) && !t.ranOn) {
      const end = endOf(t);
      if (end === date) {
        if (past) wrong.push({ text: t.plannedFor && t.plannedFor < date
          ? `${named(t)} was due and did not happen${who(t.withWhom)} — booked from ${short(t.plannedFor)}.`
          : `${named(t)} was booked and did not happen${who(t.withWhom)}.`, tone: 'slipped', id: t.id });
        else booked.push({ text: `${named(t)}${who(t.withWhom)}${t.plannedFor && t.plannedFor < date ? ` — since ${short(t.plannedFor)}` : ''}.`, tone: 'booked', id: t.id });
      } else {
        const from = t.plannedFor === date ? `starts ${isToday ? 'today' : 'that day'}` : `since ${short(t.plannedFor as string)}`;
        going.push({ text: `${named(t)}${who(t.withWhom)} — ${from}, due ${short(end)}.`, tone: 'booked', id: t.id });
      }
    } else if (isToday && isOverdue(t, date)) {
      /* Everything lib/standing counts late, so the day's count and the
         verdict above it are one number: a test that did not happen is still
         owed until it is rebooked. */
      late.push({ text: `${named(t)}${who(t.withWhom)} — ${t.outcome === 'notRun' ? 'did not happen, ' : ''}was due ${short(endOf(t))}.`, tone: 'slipped', id: t.id });
    }
  }
  /* PARTS OF THE PLAN — a stage's own lines (ui/StageParts), each said with
     its stage first and its machine after, a branch of the stage that opens
     it: ticked done that day; due that day; past its day, today. Rowland, 6
     October: "It should appear like a branch: it comes off the main action." */
  for (const { part: p, stage } of partsOnStages(tests, items)) {
    const text = partOnStage(p, stage, where(stage));
    const detail = partDetail(p);
    const doneOn = p.doneAt != null ? dayOfMs(p.doneAt) : undefined;
    /* ITS STATUS SAID THAT DAY — the last one said on it, with what was seen:
       passed is done, failed went wrong, baseline achieved is under way. */
    const said = (p.results ?? []).filter(r => r.on === date).pop();
    const saidText = said && `${text} — ${RESULT_WORD[said.is]}${said.note ? `: ${said.note}` : ''}.`;
    if (said && saidText && said.is === 'failed') wrong.push({ text: saidText, detail, tone: 'slipped', id: stage.id });
    else if (said && saidText && said.is === 'baseline') going.push({ text: saidText, detail, tone: 'booked', id: stage.id });
    else if (said && saidText && doneOn === date) done.push({ text: saidText, detail, tone: 'done', id: stage.id });
    else if (doneOn === date) done.push({ text: `${text}.`, detail, tone: 'done', id: stage.id });
    else if (p.due === date && !(doneOn && doneOn < date)) {
      if (past) wrong.push({ text: `${text} — was due and not done.`, detail, tone: 'slipped', id: stage.id });
      else booked.push({ text: `${text}.`, detail, tone: 'booked', id: stage.id });
    } else if (isToday && partLate(p, date)) {
      late.push({ text: `${text} — was due ${short(p.due as string)}.`, detail, tone: 'slipped', id: stage.id });
    }
  }
  /* A machine or a delivery past the day it was due, today. */
  if (isToday) {
    for (const a of assets) {
      if (!a.onSiteOn && a.dueOn && a.dueOn < date) late.push({ text: `${a.name} not on site${who(a.oem)} — was due ${short(a.dueOn)}.`, tone: 'slipped', go: 'install' });
    }
    for (const m of live(input.materials)) {
      if (!isHere(m) && m.due && m.due < date) late.push({ text: `${m.what} not here${who(m.from)} — was due ${short(m.due)}.`, tone: 'slipped', go: 'materials' });
    }
    for (const p of live(input.programs)) {
      if (stateOf(p) !== 'proved' && daysOverdue(p, date) != null) late.push({ text: `${p.what} not proved${who(p.from)} — was due ${short(p.testOn as string)}.`, tone: 'slipped', go: 'programs' });
    }
  }

  /* --------------------------- critical problems --------------------------- */
  /* OPEN THAT EVENING, they lead the day — one line each, as it stood: written
     by then, and not sorted (nor its fix passed) by then. Rowland, 6 October:
     "look at this, this is a major problem, potential solutions." */
  const crits = criticalProblems(input.tests, input.items, input.assets);
  const sortedBy = (c: Critical) => {
    const at = c.item.doneAt ?? (c.fix?.outcome === 'passed' && c.fix.ranOn ? Date.parse(`${c.fix.ranOn}T12:00:00`) : undefined);
    return at != null && at <= evening;
  };
  const openThen = [...crits.open, ...crits.sorted].filter(c => c.item.createdAt <= evening && !(c.sorted && sortedBy(c)));
  const critical: DayLine[] = [...openThen]
    .sort((a, b) => a.item.createdAt - b.item.createdAt)
    .map(c => ({
      text: `Critical: ${critLine(c)} · ${c.sorted ? 'open' : criticalState(c)}.`,
      ...(c.item.impact?.trim() ? { detail: c.item.impact.trim() } : {}),
      tone: 'bad' as const, ...(c.on ? { id: c.on.id } : {}), which: 'critical' as const, mark: 'Critical',
    }));

  /* HIGH RISKS open that evening, after the critical ones, in amber — not
     happened yet; what each could cost said as an estimate (lib/critical). */
  const risks = riskProblems(input.tests, input.items, input.assets);
  const riskThen = [...risks.open, ...risks.sorted].filter(c => c.item.createdAt <= evening && !(c.sorted && sortedBy(c)));
  const risky: DayLine[] = riskThen.sort((a, b) => a.item.createdAt - b.item.createdAt).map(c => ({
    text: `High risk: ${critLine(c)}${c.item.couldLose ? ` · ${couldWords(c.item)}` : ''} · ${c.sorted ? 'open' : criticalState(c)}.`,
    ...(c.item.impact?.trim() ? { detail: c.item.impact.trim() } : {}),
    tone: 'problem' as const, ...(c.on ? { id: c.on.id } : {}), which: 'problem' as const, mark: 'High risk',
  }));

  /* ---------------------------- what was found ---------------------------- */
  for (const i of items) {
    if (i.kind !== 'found' || dayOfMs(i.createdAt) !== date) continue;
    const onRec = tests.find(t => t.id === i.testId);
    /* A CRITICAL PROBLEM written that day did not go to plan, and says so —
       unless it is still open that evening, when the line leading the day
       already says it, with how it stands (one thing, one place). */
    const c = i.critical ? [...crits.open, ...crits.sorted].find(x => x.item.id === i.id) : undefined;
    if (c && openThen.includes(c)) continue;
    if (c) {
      wrong.push({
        text: `Critical: ${critLine(c)}.`, ...(i.impact?.trim() ? { detail: i.impact.trim() } : {}),
        tone: 'bad', ...(onRec ? { id: onRec.id } : {}), which: 'critical', mark: 'Critical',
      });
      continue;
    }
    found.push({
      text: i.what,
      detail: onRec ? `Found on ${named(onRec)}` : undefined,
      tone: 'found', id: onRec?.id,
    });
  }
  /* A fix planned that day is the decision about what was found. */
  for (const f of tests) {
    if (f.kind !== 'fix' || dayOfMs(f.createdAt) !== date) continue;
    const by = f.plannedTo ?? f.plannedFor;
    found.push({
      text: `New fix: ${f.title}${f.withWhom?.trim() ? ` — ${f.withWhom.trim()}` : ' — nobody named yet'}${by ? `, by ${short(by)}` : ''}.`,
      tone: 'found', id: f.id,
    });
  }

  /* ------------------------ materials and programs ------------------------ */
  for (const m of live(input.materials)) {
    if (m.inOn === date) done.push({ text: `${m.what} arrived${m.from ? ` from ${m.from}` : ''}.`, tone: 'done', go: 'materials' });
    /* Marked here with no date: it came, and saying it did not would be the
       one thing this must never invent. */
    const inBy = m.inOn ? m.inOn <= date : isHere(m);
    if (m.due === date && !inBy) {
      (past ? wrong : booked).push({
        text: past ? `${m.what} was due and did not arrive${who(m.from)}.` : `${m.what} due${who(m.from)}.`,
        tone: past ? 'slipped' : 'booked', go: 'materials',
      });
    }
  }
  for (const p of live(input.programs)) {
    if (p.provedOn === date) done.push({ text: `${p.what} proved${machine(p.assetId) ? ` on ${machine(p.assetId)}` : ''}.`, tone: 'done', go: 'programs' });
    else if (p.testOn === date && stateOf(p) !== 'proved' && !past) {
      booked.push({ text: `Prove ${p.what}${who(p.from)}.`, tone: 'booked', go: 'programs' });
    }
  }

  /* ------------------------------- next up -------------------------------- */
  /* The next day with anything booked, within a fortnight — the last line of
     TODAY's story is what happens next. Not a past day's: "Next — Thu 1 Oct"
     at the foot of 23 September is today's future, not that day's, and the
     day after a past one is a tap away. */
  const ahead = date >= today ? nextBooked(input, date, today) : undefined;

  /* ------------------------------- pictures ------------------------------- */
  const media = [
    ...tests.flatMap(t => t.media ?? []),
    ...items.flatMap(i => i.media ?? []),
  ].filter(m => dayOfMs(m.capturedAt) === date).sort((a, b) => a.capturedAt - b.capturedAt);

  /* ------------------------- install, end of day -------------------------- */
  /* Every step on the job, done by that evening — not only the ones created
     by then, because steps are often logged after the work, and a day whose
     steps were written up the next morning would otherwise have none. */
  const doneBy = (ts: Test[]) => ts.filter(t => t.outcome === 'passed' && (t.ranOn ?? '') <= date && !!t.ranOn).length;
  const gates = (['install', 'setup', 'handover'] as const)
    .map(g => ({ g, ts: tests.filter(t => t.kind === 'install' && gateOf(t) === g) }))
    .filter(x => x.ts.length > 0)
    /* THE BAR SHOWS WHAT IS WRONG TOO. It was a green length only, so a gate
       with a step late read the same as one on time (the colour rules: the
       abnormal stands out). Late by the end of THAT day — a past day reads as
       it stood. */
    .map(x => {
      const lp = (t: Test) => lateOrProblem(t, itemsBy, date);
      const late = x.ts.filter(t => lp(t) === 'late').length;
      const problem = x.ts.filter(t => lp(t) === 'problem' && (t.ranOn ?? '') <= date).length;
      return { gate: x.g, label: GATE_WORD[x.g], done: doneBy(x.ts), problem, late, wrong: late + problem, total: x.ts.length };
    });
  const first = gates.find(g => g.gate === 'install');
  const install = first ? { done: first.done, total: first.total } : undefined;

  /* THE PLAN FOR THE DAY (lib/huddle) — what the morning huddle agreed, and
     how it went: done said done in green; still to do, today, indigo; not
     done on a day that has gone, red-edged and said so. In words beside each,
     so it survives a black-and-white print. */
  const agreed = planFor(items, date);
  const byId = new Map(tests.map(t => [t.id, t]));
  const plan: DayLine[] = agreed.map(i => {
    const on = byId.get(i.testId);
    const state = i.doneAt != null ? 'done' : past ? 'not done' : 'to do';
    return {
      /* A line added from the stage itself is its name — said once. */
      text: `${i.what}${on && named(on) !== i.what.trim() ? ` — ${named(on)}` : ''}${who(i.owner)} — ${state}`,
      ...(i.note?.trim() ? { detail: i.note.trim() } : {}),
      tone: i.doneAt != null ? 'done' as const : past ? 'slipped' as const : 'booked' as const,
      ...(on ? { id: on.id } : {}),
    };
  });
  const planSays = planCount(agreed, past);

  const sections: DaySection[] = [
    { key: 'critical' as const, title: 'Critical — open', lines: critical },
    { key: 'risk' as const, title: 'High risk — open', lines: risky },
    { key: 'plan' as const, title: `${isToday ? 'The plan for today' : 'The plan for the day'} — ${planSays}`, lines: plan },
    { key: 'done' as const, title: 'What got done', lines: done },
    { key: 'wrong' as const, title: 'What did not go to plan', lines: wrong },
    /* "Late", not "past its day": a stage whose problems lost hours is late
       before its day goes (lib/install lateOrProblem). */
    { key: 'late' as const, title: 'Late — still not done', lines: late },
    { key: 'problem' as const, title: 'A problem — no time lost', lines: problems },
    { key: 'found' as const, title: 'What we found', lines: found },
    { key: 'today' as const, title: isToday ? 'Due today' : 'Due that day', lines: booked },
    { key: 'going' as const, title: isToday ? 'Under way — due later' : 'Under way that day', lines: going },
    ...(ahead ? [{ key: 'next' as const, title: `Next — ${short(ahead.date)}`, lines: ahead.lines }] : []),
  ].filter(s => s.lines.length > 0);

  const happened = done.length + wrong.length + found.length;
  return {
    date, label: short(date),
    headline: (critical.length ? `${critical.length} critical open. ` : '') + (agreed.length ? `Plan for the day: ${planSays}. ` : '') + headlineOf(done, wrong, found, booked, going, late, problems, media.length, gates, isToday,
      /* Today's counts are the job's own — lib/standing's late, and every
         stage that hit a problem and lost no time — the numbers the verdict
         at the top of the page says (lib/onTarget). */
      isToday ? {
        late: standing({ tests, items, assets, materials: input.materials, programs: input.programs, today: date }).late,
        problem: tests.filter(t => t.kind === 'install' && lateOrProblem(t, items, date) === 'problem').length,
      } : undefined),
    sections, media, install, gates,
    empty: happened === 0 && critical.length === 0 && risky.length === 0 && plan.length === 0 && booked.length === 0 && going.length === 0 && late.length === 0 && problems.length === 0,
  };
}

/** "<what> (<machine>) — <stage>", or "<what> — the job" off any stage. */
const critLine = (c: Critical): string =>
  c.on ? `${c.item.what}${c.machine ? ` (${c.machine})` : ''} — ${c.on.title}` : `${c.item.what} — the job`;

function headlineOf(done: DayLine[], wrong: DayLine[], found: DayLine[], booked: DayLine[], going: DayLine[], late: DayLine[],
  problems: DayLine[], pictures: number, gates: Day['gates'], isToday: boolean, counts?: { late: number; problem: number }): string {
  const bits: string[] = [];
  const got = done.filter(l => l.tone === 'done').length;
  if (got) bits.push(`${plural(got, 'thing')} done`);
  if (wrong.length) bits.push(`${wrong.length} did not go to plan`);
  const newFound = found.filter(l => !l.text.startsWith('New fix:')).length;
  if (newFound) bits.push(`${plural(newFound, 'thing')} found`);
  if (pictures) bits.push(plural(pictures, 'picture'));
  /* What is ahead, in the words its lists use: due that day, under way. */
  const ahead = [
    booked.length ? `${booked.length} due ${isToday ? 'today' : 'that day'}` : '',
    going.length ? `${going.length} under way` : '',
  ].filter(Boolean).join(', ');
  let s = bits.length
    ? `${bits.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`
    : ahead
      ? `${ahead}${isToday ? ', nothing logged yet' : ''}.`
      : isToday ? 'Nothing logged yet today.' : 'Nothing was logged for this day.';
  s = s[0].toUpperCase() + s.slice(1);
  /* LATE AND A PROBLEM, COUNTED APART — "2 late · 1 a problem" (Rowland,
     6 October). Today's only, as its lists are: every stage that is either,
     wherever its line is, and everything else past its day. */
  if (counts) {
    const split = [counts.late ? `${counts.late} late` : '', counts.problem ? `${counts.problem} a problem` : ''].filter(Boolean).join(' · ');
    if (split) s += ` ${split}.`;
  }
  /* Not on a blank day — "Nothing was logged. Install 0 of 3" is noise. */
  if (bits.length || ahead || late.length || problems.length) for (const g of gates) s += ` ${g.label} ${g.done} of ${g.total} steps done.`;
  return s;
}

function nextBooked(input: DayInput, date: string, today: string): { date: string; lines: DayLine[] } | undefined {
  const within = (d?: string) => !!d && d > date && d >= today && d <= addDays(date, 14);
  const dates: string[] = [];
  const tests = live(input.tests).filter(t => !isSettled(t) && !t.ranOn);
  for (const t of tests) if (within(t.plannedFor)) dates.push(t.plannedFor as string);
  for (const a of live(input.assets)) if (!a.onSiteOn && within(a.dueOn)) dates.push(a.dueOn as string);
  for (const m of live(input.materials)) if (!isHere(m) && within(m.due)) dates.push(m.due as string);
  /* A part of a stage with a day, not done — under its stage's name. */
  const parts = partsOnStages(input.tests, input.items).filter(x => x.part.doneAt == null && !!x.part.due);
  for (const { part } of parts) if (within(part.due)) dates.push(part.due as string);
  const next = dates.sort()[0];
  if (!next) return undefined;
  const machine = (id?: string) => live(input.assets).find(a => a.id === id)?.name;
  const who = (w?: string) => (w?.trim() ? ` (${w.trim()})` : '');
  const lines: DayLine[] = [
    ...live(input.assets).filter(a => !a.onSiteOn && a.dueOn === next)
      .map(a => ({ text: `${a.name} due on site${who(a.oem)}.`, tone: 'booked' as const, go: 'install' as const })),
    ...tests.filter(t => t.plannedFor === next).sort((a, b) => a.sort - b.sort).map(t => ({
      text: `${t.kind === 'install' ? `${machine(t.assetId) ?? 'The line'} — ` : t.kind === 'fix' ? 'Fix: ' : ''}${t.title}${who(t.withWhom)}.`,
      tone: 'booked' as const, id: t.id,
    })),
    ...parts.filter(x => x.part.due === next).map(({ part, stage }) => ({
      text: `${partOnStage(part, stage, machine(stage.assetId))}.`,
      detail: partDetail(part), tone: 'booked' as const, id: stage.id,
    })),
    ...live(input.materials).filter(m => !isHere(m) && m.due === next)
      .map(m => ({ text: `${m.what} due${who(m.from)}.`, tone: 'booked' as const, go: 'materials' as const })),
  ];
  return { date: next, lines };
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}
