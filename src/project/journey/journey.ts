/* THE JOURNEY — a project between two dates, day by day (docs/JOURNEY.md).
 *
 * Rowland, 23 October: "we all report to someone and they need to see what we
 * have done and what we are doing next"; and "I should be able to pick a
 * range of reporting period ... from this date to that date. It should then
 * collate all the information between them two dates ... the entire history
 * ... it's the journey. It's all of it."
 *
 * THE RANGE IS A LENS, NEVER A RECORD. Nothing is stored for it: every line
 * here is a record's own date, read the way the app already reads it — a
 * stage-gate day as lib/day tells it (what got done, what did not go to
 * plan, what was found, what is due that day), the board's actions by the
 * day they were done or are due (the tool plans among them — an action
 * with a `tool`), the register's problems by the day they were raised, due
 * or closed, a study by the day it measured. Only two things are typed:
 * Rowland's commentary, a note on its day (lib/noteScope `day:`), and the
 * tool plans. Change the range and the page and the paper follow; the
 * paper prints this same reading (lib/journeyPdf), so the two never part.
 *
 * Nothing is written by AI: every line is a record's own words. */
import type { PaceTodoRow } from '../../db/rows';
import { toolByKey, toolLabel } from '../../catalogue/registry';
import { dayOf, type DayInput, type DayLine, type DayTone } from '../../lib/day';
import type { LeanTile, LeanTone } from '../../lib/lean';
import { dayOfNote } from '../../lib/noteScope';
import type { RegisterProblem } from '../../lib/projectActions';
import { PRIORITY_WORD } from '../../lib/projectActions';
import type { ToolStudy } from '../../lib/study';
import type { Material } from '../../lib/materials';
import type { Program } from '../../lib/programs';
import { measuredOn, studyHref } from '../../lib/studyLinks';
import { live, type TestItem } from '../../lib/testing';
import { addDays, daysBetween, isoDay, mondayOf, niceDay, todayISO } from '../../lib/weeks';

/* ------------------------------- the range ------------------------------- */

/** From a day to a day, both inside. */
export interface Range { from: string; to: string }

/** The one-tap ranges, in the order they are offered; `dates` is two picked. */
export type RangePick = 'thisWeek' | 'thisAndNext' | 'lastWeek' | 'sinceStart' | 'dates';
export const RANGE_PICKS: { id: RangePick; label: string }[] = [
  { id: 'thisWeek', label: 'This week' },
  { id: 'thisAndNext', label: 'This week and next' },
  { id: 'lastWeek', label: 'Last week' },
  { id: 'sinceStart', label: 'Since the start' },
  { id: 'dates', label: 'Pick dates' },
];

/** A range is never longer than this — two years of days is a page nobody
 *  reads and a year typed wrong must not make a thousand of them. */
export const MOST_DAYS = 731;

/** The range a pick means. `started` is the project's first day (its
 *  createdAt); since the start runs from it to a week from today, so what is
 *  booked next is on it too. Two dates the wrong way round are put right. */
export function rangeOf(pick: RangePick, today: string, started?: string, dates?: Partial<Range>): Range {
  const mon = mondayOf(today);
  switch (pick) {
    case 'thisWeek': return { from: mon, to: addDays(mon, 6) };
    case 'thisAndNext': return { from: mon, to: addDays(mon, 13) };
    case 'lastWeek': return { from: addDays(mon, -7), to: addDays(mon, -1) };
    case 'sinceStart': {
      const to = addDays(today, 7);
      const from = started && started <= to ? started : mon;
      return clamp({ from, to });
    }
    case 'dates': {
      const a = dates?.from || mon, b = dates?.to || addDays(mon, 13);
      return clamp(a <= b ? { from: a, to: b } : { from: b, to: a });
    }
  }
}

/** Which pick a range is, when it is one of them exactly; else `dates`. */
export function pickOf(r: Range, today: string, started?: string): RangePick {
  for (const p of RANGE_PICKS) {
    if (p.id === 'dates') continue;
    const x = rangeOf(p.id, today, started);
    if (x.from === r.from && x.to === r.to) return p.id;
  }
  return 'dates';
}

const clamp = (r: Range): Range => (daysBetween(r.from, r.to) + 1 > MOST_DAYS ? { from: addDays(r.to, -(MOST_DAYS - 1)), to: r.to } : r);

/** The same length of time, before or after: ‹ earlier · later ›. */
export function slideRange(r: Range, by: -1 | 1): Range {
  const n = daysBetween(r.from, r.to) + 1;
  return { from: addDays(r.from, by * n), to: addDays(r.to, by * n) };
}

/** "Mon 20 Oct – Sun 2 Nov", the year said when the two differ or neither is this year. */
export function rangeLabel(r: Range, today: string = todayISO()): string {
  const y = (iso: string) => iso.slice(0, 4);
  const year = y(r.from) !== y(r.to) || y(r.from) !== y(today);
  /* "Mon 28 Dec 2026", never "Mon, 28 Dec 2026" — the comma the locale puts in with a year */
  const say = (iso: string) => niceDay(iso, { weekday: 'short', year }).replace(',', '');
  if (r.from === r.to) return say(r.from);
  return `${say(r.from)} – ${say(r.to)}`;
}

/** Every day of the range, in order. */
export function daysOf(r: Range): string[] {
  const n = Math.max(0, Math.min(MOST_DAYS, daysBetween(r.from, r.to) + 1));
  return Array.from({ length: n }, (_, i) => addDays(r.from, i));
}

/* ------------------------------- the reading ------------------------------ */

export interface JourneyInput {
  /** A stage-gate project's records — the day told as lib/day tells it. */
  gate?: DayInput;
  /** The board's actions (lib/actions) — any project's; the tool plans among them. */
  steps?: readonly PaceTodoRow[];
  /** The register's problems taken for the project (lib/projectActions). */
  register?: readonly RegisterProblem[];
  /** Its notes (TestItem kind 'note') — the commentary is those on a day. */
  notes?: readonly TestItem[];
  /** Its studies, when it has no gate to read them through (a 6M project's). */
  studies?: readonly ToolStudy[];
  /** Its materials and programs, when it has no gate to read them through (a 6M project's) — arrived,
   *  proved, due, late, by the day's own rules (lib/day). */
  materials?: readonly Material[];
  programs?: readonly Program[];
}

export type JourneyTone = DayTone;

export interface JourneyLine {
  text: string;
  detail?: string;
  tone: JourneyTone;
  /** Its word on the page — Action, Tool plan, Problem, Study; absent on a
   *  stage-gate line, which names itself. */
  kind?: string;
  /** A test, fix or stage it opens (the project's drawer). */
  id?: string;
  /** Where it opens otherwise (lib/day). */
  go?: DayLine['go'];
  /** A study it opens. */
  href?: string;
  /** An action it opens (the Actions page's row). */
  stepId?: string;
  /** A register problem it opens. */
  snagId?: string;
  /** Whose, when the record says. */
  who?: string;
  /** Past its day and still owed — today's late, the one count every place says (docs/STEADY.md S1). A
   *  failure or a slip on a day gone is what did not go to plan, never late. */
  late?: boolean;
}

export interface JourneyDay {
  date: string;
  /** "Tue 21 Oct" */
  label: string;
  /** What happened, or what is due — the empty days are not here. */
  lines: JourneyLine[];
  /** Rowland's commentary written on this day, oldest first. */
  commentary: TestItem[];
  past: boolean;
  today: boolean;
}

export interface Journey {
  range: Range;
  /** The days with something on them, in order. */
  days: JourneyDay[];
  /** Days of the range with nothing on them. */
  skipped: number;
  /** done · still to do · late · planned (after today) */
  counts: { done: number; toDo: number; late: number; planned: number; wrong: number };
}

const DONE: ReadonlySet<JourneyTone> = new Set(['done']);
const WRONG: ReadonlySet<JourneyTone> = new Set(['bad', 'slipped', 'problem']);

/** THE JOURNEY between two dates, day by day. `today` decides which days are
 *  told as what happened and which as what is due. */
export function journeyOf(input: JourneyInput, range: Range, today: string = todayISO()): Journey {
  const commentaryBy = new Map<string, TestItem[]>();
  for (const n of live([...(input.notes ?? [])]).filter(i => i.kind === 'note')) {
    const d = dayOfNote(n.testId);
    if (!d) continue;
    const list = commentaryBy.get(d) ?? [];
    list.push(n);
    commentaryBy.set(d, list);
  }
  /* a project with no gate still has materials, programs and studies — read by the day's own rules */
  const gate: DayInput | undefined = input.gate ?? ((input.materials?.length || input.programs?.length || input.studies?.length)
    ? { tests: [], items: [], assets: [], materials: [...(input.materials ?? [])], programs: [...(input.programs ?? [])], studies: [...(input.studies ?? [])] }
    : undefined);
  const days: JourneyDay[] = [];
  let skipped = 0;
  const counts = { done: 0, toDo: 0, late: 0, planned: 0, wrong: 0 };
  for (const date of daysOf(range)) {
    const past = date < today, isToday = date === today;
    const lines = [
      ...gateLines(gate, date, today),
      ...stepLines(input.steps ?? [], date, today),
      ...problemLines(input.register ?? [], date, today),
      ...(gate ? [] : studyLines(input.studies ?? [], date)),
    ];
    const commentary = (commentaryBy.get(date) ?? []).slice().sort((a, b) => a.createdAt - b.createdAt);
    if (!lines.length && !commentary.length) { skipped++; continue; }
    /* done; booked — still to do by today, planned after it; past its day on
       today — late and still to do; on a day gone, slipped is what did not
       go to plan, as a failure or a problem is */
    for (const l of lines) {
      if (DONE.has(l.tone)) counts.done++;
      else if (l.late) { counts.late++; counts.toDo++; }
      else if (l.tone === 'booked') { if (past || isToday) counts.toDo++; else counts.planned++; }
      else if (WRONG.has(l.tone)) counts.wrong++;
    }
    days.push({ date, label: niceDay(date, { weekday: 'short' }), lines, commentary, past, today: isToday });
  }
  return { range, days, skipped, counts };
}

/** A stage-gate day, as lib/day tells it: what got done, what did not go to
 *  plan, what was found and the plan for the day on a day gone; today, the
 *  late and the problems too; ahead, what is due that day. "Under way" is
 *  said on today only — a week's booking is one line, not five. */
function gateLines(gate: DayInput | undefined, date: string, today: string): JourneyLine[] {
  if (!gate) return [];
  const d = dayOf(gate, date, today);
  const want: ReadonlySet<string> = date < today ? new Set(['plan', 'done', 'wrong', 'found'])
    : date === today ? new Set(['plan', 'done', 'wrong', 'found', 'late', 'problem', 'today', 'going'])
      : new Set(['plan', 'today']);
  return d.sections.filter(s => want.has(s.key)).flatMap(s => s.lines.map((l): JourneyLine => ({
    text: l.text, tone: l.tone, ...(s.key === 'late' ? { late: true } : {}),
    ...(l.detail ? { detail: l.detail } : {}), ...(l.id ? { id: l.id } : {}), ...(l.go ? { go: l.go } : {}), ...(l.href ? { href: l.href } : {}),
  })));
}

const short = (iso: string): string => niceDay(iso);
const who = (w?: string) => (w?.trim() ? ` (${w.trim()})` : '');

/** The tool a plan names, in the catalogue's word — "Line capacity". */
export const toolWord = toolLabel;

/** A plan to use a tool, or any other action, by the day it was done or is due. */
function stepLines(steps: readonly PaceTodoRow[], date: string, today: string): JourneyLine[] {
  const out: JourneyLine[] = [];
  const isToday = date === today, past = date < today;
  for (const s of steps) {
    const kind = s.tool ? `Tool plan — ${toolWord(s.tool)}` : 'Action';
    const what = s.tool ? `${toolWord(s.tool)}: ${s.what}` : s.what;
    const open = { kind, stepId: s.id, ...(s.who.trim() ? { who: s.who.trim() } : {}) };
    if (s.state === 'done' && s.doneOn === date) {
      out.push({ text: `${what} — done${who(s.who)}.`, tone: 'done', ...(s.outcome?.trim() ? { detail: s.outcome.trim() } : {}), ...open });
      continue;
    }
    if (s.state === 'done') continue;
    if (s.due === date) {
      if (past) out.push({ text: `${what} — was due and not done${who(s.who)}.`, tone: 'slipped', ...open });
      else out.push({ text: `${what}${who(s.who)}${s.state === 'waiting' ? ' — waiting' : ''}.`, tone: 'booked', ...open });
    } else if (isToday && s.due && s.due < date) {
      out.push({ text: `${what}${who(s.who)} — was due ${short(s.due)}.`, tone: 'slipped', late: true, ...open });
    }
  }
  return out;
}

/** A register problem taken for the project: raised, due, closed — each on its day. */
function problemLines(register: readonly RegisterProblem[], date: string, today: string): JourneyLine[] {
  const out: JourneyLine[] = [];
  const isToday = date === today, past = date < today;
  for (const p of register) {
    if (p.deletedAt) continue;
    const pri = p.priority ? `${PRIORITY_WORD[p.priority]} · ` : '';
    const open = { kind: 'Problem', snagId: p.id, ...(p.owner?.trim() ? { who: p.owner.trim() } : {}) };
    const closed = p.closedAt != null ? isoDay(p.closedAt) : undefined;
    const raised = p.raisedAt != null ? isoDay(p.raisedAt) : undefined;
    const due = p.dueAt != null ? isoDay(p.dueAt) : undefined;
    if (closed === date) out.push({ text: `Problem closed: ${p.problem}${who(p.owner)}.`, tone: 'done', ...open });
    if (raised === date && closed !== date) out.push({ text: `Problem raised: ${pri}${p.problem}${who(p.owner)}.`, tone: 'found', ...open });
    if (!closed && due) {
      if (due === date) out.push({ text: `${pri}${p.problem}${who(p.owner)}${past ? ' — was due and not closed' : ''}.`, tone: past ? 'slipped' : 'booked', ...open });
      else if (isToday && due < date) out.push({ text: `${pri}${p.problem}${who(p.owner)} — was due ${short(due)}.`, tone: 'slipped', late: true, ...open });
    }
  }
  return out;
}

/** What a study measured on a day (lib/studyLinks measuredOn), on a project with no gate to tell it. */
function studyLines(studies: readonly ToolStudy[], date: string): JourneyLine[] {
  const out: JourneyLine[] = [];
  for (const s of studies) {
    if (s.deletedAt) continue;
    const m = measuredOn(s, date, isoDay);
    if (m) out.push({ text: `${m.text}.`.replace(/\.\.$/, '.'), tone: 'found', kind: 'Study', href: studyHref(s) });
  }
  return out;
}

/* ------------------------------- the tiles -------------------------------- */

/** done · still to do · late · planned — each of what it should be. */
export function journeyTiles(j: Journey, today: string = todayISO()): LeanTile[] {
  const c = j.counts;
  const ahead = j.range.to > today;
  const gone = j.range.from <= today;
  return [
    { k: 'Done', v: String(c.done), of: gone ? `in the range${c.wrong ? ` · ${c.wrong} did not go to plan` : ''}` : 'the range is still ahead', tone: c.done ? 'g' : 'n' },
    { k: 'Still to do', v: String(c.toDo), of: c.toDo ? 'due by today, not done' : 'nothing owed by today', tone: c.toDo ? (c.late ? 'r' : 'a') : 'n' },
    { k: 'Late', v: String(c.late), of: c.late ? 'past the day agreed' : 'nothing past its day', tone: c.late ? 'r' : 'n' },
    { k: 'Planned', v: String(c.planned), of: ahead ? 'due after today, in the range' : 'the range has gone by', tone: c.planned ? undefined : 'n' },
  ];
}

/** The closing line — "Line 7 pace, 20 Oct – 2 Nov: 4 done, 2 still to do (1 late), 3 planned." */
export function journeyClosing(j: Journey, project: string, today: string = todayISO()): { text: string; tone: LeanTone } {
  const c = j.counts;
  const bits = [
    `${c.done} done`,
    c.toDo ? `${c.toDo} still to do${c.late ? ` (${c.late} late)` : ''}` : 'nothing still to do',
    j.range.to > today ? `${c.planned} planned` : '',
  ].filter(Boolean);
  const nothing = !c.done && !c.toDo && !c.planned && !c.wrong;
  const text = nothing ? `${project}, ${rangeLabel(j.range, today)}: nothing recorded.` : `${project}, ${rangeLabel(j.range, today)}: ${bits.join(', ')}.`;
  return { text, tone: c.late ? 'r' : c.toDo ? 'a' : nothing ? 'n' : 'g' };
}

/* ------------------------------ this week and next ------------------------- */

/** THIS WEEK AND NEXT in one line — the project's front page, the status
 *  and client reports and the 6M report all say it from here, so they say
 *  one thing: "This week and next: 9 done · 8 still to do (5 late) · 10
 *  planned." */
export interface WeekLine { text: string; tone: LeanTone; range: Range }

export function weekLine(input: JourneyInput, today: string = todayISO(), started?: string): WeekLine {
  const range = rangeOf('thisAndNext', today, started);
  const c = journeyOf(input, range, today).counts;
  const toDo = c.toDo ? `${c.toDo} still to do${c.late ? ` (${c.late} late)` : ''}` : 'nothing still to do';
  return { text: `This week and next: ${c.done} done · ${toDo} · ${c.planned} planned.`, tone: c.late ? 'r' : c.toDo ? 'a' : c.done || c.planned ? 'g' : 'n', range };
}

/* ------------------------------ the tool plans ----------------------------- */

export interface ToolPlan {
  /** The catalogue key. */
  tool: string;
  /** Its word — "Line capacity". */
  name: string;
  /** What for, as typed. */
  what: string;
  who: string;
  /** The day planned. */
  due?: string;
  done: boolean;
  doneOn?: string;
  step: PaceTodoRow;
}

/** The project's plans to use its tools — one a tool, the latest plan where
 *  there are several, in the catalogue's order (lib/catalogue registry). */
export function toolPlansOf(steps: readonly PaceTodoRow[]): ToolPlan[] {
  const by = new Map<string, PaceTodoRow>();
  for (const s of steps) {
    if (!s.tool) continue;
    const had = by.get(s.tool);
    if (!had || s.updatedAt > had.updatedAt) by.set(s.tool, s);
  }
  return [...by.values()]
    .map(s => ({ tool: s.tool as string, name: toolWord(s.tool as string), what: s.what, who: s.who, done: s.state === 'done', step: s,
      ...(s.due ? { due: s.due } : {}), ...(s.doneOn ? { doneOn: s.doneOn } : {}) }))
    .sort((a, b) => (toolByKey(a.tool)?.order ?? 1e9) - (toolByKey(b.tool)?.order ?? 1e9) || a.name.localeCompare(b.name));
}
