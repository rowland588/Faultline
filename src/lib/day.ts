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
import { isHere, type Material } from './materials';
import { stateOf, type Program } from './programs';
import {
  gateOf, isSettled, live, needsVerdict, outcomeWord, type Asset, type StepGate, type Test, type TestItem,
} from './testing';
import type { MediaRef } from '../types';
import { GATE_WORD } from './install';
import { niceDay, todayISO } from './weeks';

export interface DayInput {
  tests: Test[];
  items: TestItem[];
  assets: Asset[];
  materials: Material[];
  programs: Program[];
}

/** done · it went wrong · the day came and it did not happen · waiting on a word
 *  · written down · booked */
export type DayTone = 'done' | 'bad' | 'slipped' | 'asking' | 'found' | 'booked';

export interface DayLine {
  text: string;
  /** A second line under it — what was written against it. */
  detail?: string;
  tone: DayTone;
  /** The record it opens, when it is a test, a fix or an install step. */
  id?: string;
  /** Where it opens otherwise. */
  go?: 'materials' | 'programs' | 'install';
}

export interface DaySection {
  key: 'done' | 'wrong' | 'found' | 'today' | 'next';
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
  gates: { gate: StepGate; label: string; done: number; total: number }[];
  /** Nothing happened and nothing was booked. */
  empty: boolean;
}

const dayOfMs = (ms: number): string => todayISO(new Date(ms));
const on = (d: string, from?: string, to?: string): boolean => !!from && from <= d && d <= (to && to > from ? to : from);
const short = (iso: string) => niceDay(iso, { weekday: 'short' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

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
  const booked: DayLine[] = [];

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
    const detail = t.result?.trim() || undefined;
    if (ranToday) {
      const word = outcomeWord(t);
      if (t.outcome === 'passed') {
        done.push({ text: t.kind === 'test' || !t.kind ? `${named(t)} passed${who(t.withWhom)}.` : `${named(t)} — ${word.toLowerCase()}${who(t.withWhom)}.`, detail, tone: 'done', id: t.id });
      } else if (t.outcome === 'failed') {
        wrong.push({ text: `${named(t)} — ${word.toLowerCase()}${who(t.withWhom)}.`, detail, tone: 'bad', id: t.id });
      } else if (t.outcome === 'notRun') {
        wrong.push({ text: `${named(t)} did not happen${who(t.withWhom)}.`, detail, tone: 'slipped', id: t.id });
      } else if (needsVerdict(t)) {
        done.push({ text: `${named(t)} was worked on — nobody has said how it went yet.`, detail, tone: 'asking', id: t.id });
      }
      continue;
    }
    /* Booked for this day, and it did not run on it. */
    if (bookedToday && !isSettled(t) && !t.ranOn) {
      if (past) wrong.push({ text: `${named(t)} was booked and did not happen${who(t.withWhom)}.`, tone: 'slipped', id: t.id });
      else booked.push({ text: `${named(t)}${who(t.withWhom)}.`, tone: 'booked', id: t.id });
    }
  }

  /* ---------------------------- what was found ---------------------------- */
  for (const i of items) {
    if (i.kind !== 'found' || dayOfMs(i.createdAt) !== date) continue;
    const onRec = tests.find(t => t.id === i.testId);
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
    .map(x => ({ gate: x.g, label: GATE_WORD[x.g], done: doneBy(x.ts), total: x.ts.length }));
  const first = gates.find(g => g.gate === 'install');
  const install = first ? { done: first.done, total: first.total } : undefined;

  const sections: DaySection[] = [
    { key: 'done' as const, title: 'What got done', lines: done },
    { key: 'wrong' as const, title: 'What did not go to plan', lines: wrong },
    { key: 'found' as const, title: 'What we found', lines: found },
    { key: 'today' as const, title: isToday ? 'Still booked for today' : 'Booked for the day', lines: booked },
    ...(ahead ? [{ key: 'next' as const, title: `Next — ${short(ahead.date)}`, lines: ahead.lines }] : []),
  ].filter(s => s.lines.length > 0);

  const happened = done.length + wrong.length + found.length;
  return {
    date, label: short(date),
    headline: headlineOf(done, wrong, found, booked, media.length, gates, isToday),
    sections, media, install, gates,
    empty: happened === 0 && booked.length === 0,
  };
}

function headlineOf(done: DayLine[], wrong: DayLine[], found: DayLine[], booked: DayLine[], pictures: number,
  gates: Day['gates'], isToday: boolean): string {
  const bits: string[] = [];
  const got = done.filter(l => l.tone === 'done').length;
  if (got) bits.push(`${plural(got, 'thing')} done`);
  if (wrong.length) bits.push(`${wrong.length} did not go to plan`);
  const newFound = found.filter(l => !l.text.startsWith('New fix:')).length;
  if (newFound) bits.push(`${plural(newFound, 'thing')} found`);
  if (pictures) bits.push(plural(pictures, 'picture'));
  let s = bits.length
    ? `${bits.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`
    : booked.length
      ? `${plural(booked.length, 'thing')} booked${isToday ? ', nothing logged yet' : ''}.`
      : isToday ? 'Nothing logged yet today.' : 'Nothing was logged for this day.';
  s = s[0].toUpperCase() + s.slice(1);
  /* Not on a blank day — "Nothing was logged. Install 0 of 3" is noise. */
  if (bits.length || booked.length) for (const g of gates) s += ` ${g.label} ${g.done} of ${g.total} steps done.`;
  return s;
}

function nextBooked(input: DayInput, date: string, today: string): { date: string; lines: DayLine[] } | undefined {
  const within = (d?: string) => !!d && d > date && d >= today && d <= addDays(date, 14);
  const dates: string[] = [];
  const tests = live(input.tests).filter(t => !isSettled(t) && !t.ranOn);
  for (const t of tests) if (within(t.plannedFor)) dates.push(t.plannedFor as string);
  for (const a of live(input.assets)) if (!a.onSiteOn && within(a.dueOn)) dates.push(a.dueOn as string);
  for (const m of live(input.materials)) if (!isHere(m) && within(m.due)) dates.push(m.due as string);
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
