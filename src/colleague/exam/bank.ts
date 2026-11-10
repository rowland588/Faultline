/* THE EXAM (10 November, docs/LUNA-NEXT.md L6 — the plan Rowland agreed: "'Smarter' should be measured, not claimed … your real
 * questions, asked of your real data, each with an answer worked out by hand. Every change to Luna has to pass it").
 *
 * The questions are asked of a line's own records — its stops and its problems — with the dates written out, so the question is the
 * same however it is read. Each answer is worked out HERE, by plain loops over the raw records, never through Luna's capabilities or
 * lib/data, so the exam is independent of what it marks. A reply is graded by code:
 *   figure     the right figure is in the words (to the rounding it is written at), and the words name what it is about;
 *   cannot     the words say it cannot be answered from these records, and put no figure in its place;
 *   and always no figure in the reply rests on nothing (the turn's own check, colleague/figureCheck).
 * Pure. */
import type { Observation, Workspace } from '../../types';
import type { Snag } from '../../snag/types';

export interface ExamQuestion {
  id: string;
  /** The question as it is asked. */
  ask: string;
  kind: 'figure' | 'cannot';
  /** The answer, worked out from the records — the figure and how it may be written. */
  figure?: number;
  /** Decimal places the figure is worked to (it may be written rounded to fewer, never wrongly). */
  places?: number;
  /** Words the answer must carry (a category, a direction). */
  words?: string[];
  /** The answer in a sentence, as the exam worked it — shown beside Luna's. */
  worked: string;
}
export interface Exam { line: { id: string; name: string }; from: string; to: string; questions: ExamQuestion[] }
export interface Graded { id: string; pass: boolean; why: string[] }

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const said = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const r2 = (n: number) => Math.round(n * 100) / 100;
const w = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-GB') : String(r2(n)));

/** A stop's minutes as timed — none for a stop only counted (tapped), which is not zero. */
const minutesOf = (o: Observation): number | null => (o.timing !== 'instant' && o.durationMs > 0 ? o.durationMs / 60_000 : null);

/** The line with the most stops in its newest fortnight — the one with the most to ask about. */
export function examLine(lines: readonly Pick<Workspace, 'id' | 'name'>[], obs: readonly Observation[]): Pick<Workspace, 'id' | 'name'> | undefined {
  const count = (id: string) => obs.filter(o => !o.deletedAt && o.workspaceId === id && minutesOf(o) !== null).length;
  return [...lines].filter(l => count(l.id) >= 2).sort((a, b) => count(b.id) - count(a.id))[0];
}

/** The exam on a line: a week to the day of its newest stop, and the week before. Undefined when the line has too little to ask. */
export function buildExam(line: Pick<Workspace, 'id' | 'name'>, obs: readonly Observation[], snags: readonly Snag[]): Exam | undefined {
  const mine = obs.filter(o => !o.deletedAt && o.workspaceId === line.id);
  const timed = mine.filter(o => minutesOf(o) !== null);
  if (timed.length < 2) return undefined;
  const last = isoDay(Math.max(...timed.map(o => o.startedAt)));
  const end = Date.parse(`${last}T00:00:00Z`);
  const from = isoDay(end - 6 * DAY), prevFrom = isoDay(end - 13 * DAY), prevTo = isoDay(end - 7 * DAY);
  const inn = (o: Observation, a: string, b: string) => { const d = isoDay(o.startedAt); return d >= a && d <= b; };
  const sum = (a: string, b: string, cat?: string) => timed.filter(o => inn(o, a, b) && (cat === undefined || (o.category ?? '').trim() === cat)).reduce((s, o) => s + (minutesOf(o) ?? 0), 0);
  const byCat = (a: string, b: string) => {
    const m = new Map<string, number>();
    for (const o of timed) if (inn(o, a, b)) { const c = (o.category ?? '').trim() || '(not recorded)'; m.set(c, (m.get(c) ?? 0) + (minutesOf(o) ?? 0)); }
    return m;
  };
  const week = `between ${said(from)} and ${said(last)}`, before = `between ${said(prevFrom)} and ${said(prevTo)}`;
  const now = sum(from, last), was = sum(prevFrom, prevTo);
  const cats = [...byCat(from, last).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const q: ExamQuestion[] = [];
  q.push({ id: 'total', ask: `How many minutes of stops were timed on ${line.name} ${week}?`, kind: 'figure', figure: r2(now), places: 2, worked: `${w(now)} minutes of timed stops ${week}.` });
  if (cats.length) {
    const [top, mins] = cats[0];
    q.push({ id: 'top', ask: `On ${line.name}, which stop category lost the most minutes ${week}, and how many?`, kind: 'figure', figure: r2(mins), places: 2, words: [top], worked: `${top}, ${w(mins)} minutes.` });
    if (now > 0) q.push({ id: 'share', ask: `What share of ${line.name}'s timed stop minutes ${week} was ${top}? Give it as a percentage.`, kind: 'figure', figure: r2((mins / now) * 100), places: 2, worked: `${w((mins / now) * 100)}% (${w(mins)} of ${w(now)} minutes).` });
  }
  if (now !== was) {
    const up = now > was;
    q.push({ id: 'change', ask: `Did ${line.name}'s timed stop minutes go up or down ${week} compared with ${before}, and by how many minutes?`, kind: 'figure', figure: r2(Math.abs(now - was)), places: 2, words: [up ? 'up' : 'down'], worked: `${up ? 'Up' : 'Down'} ${w(Math.abs(now - was))} minutes (${w(was)} to ${w(now)}).` });
    const a = byCat(prevFrom, prevTo), b = byCat(from, last);
    const moves = [...new Set([...a.keys(), ...b.keys()])].map(k => ({ k, d: (b.get(k) ?? 0) - (a.get(k) ?? 0) })).sort((x, y) => (up ? y.d - x.d : x.d - y.d) || x.k.localeCompare(y.k));
    if (moves.length > 1 && moves[0].d !== 0) q.push({ id: 'where', ask: `Which stop category on ${line.name} moved the most between ${before} and ${week}, and by how many minutes?`, kind: 'figure', figure: r2(Math.abs(moves[0].d)), places: 2, words: [moves[0].k], worked: `${moves[0].k}, ${moves[0].d > 0 ? '+' : '−'}${w(Math.abs(moves[0].d))} minutes.` });
  }
  q.push({ id: 'hours', ask: `Give me ${line.name}'s timed stop minutes ${week} in hours, to one decimal place.`, kind: 'figure', figure: Math.round((now / 60) * 10) / 10, places: 1, worked: `${(Math.round((now / 60) * 10) / 10).toFixed(1)} hours (${w(now)} ÷ 60).` });
  const open = snags.filter(s => !s.deletedAt && s.workspaceId === line.id && s.status !== 'closed').length;
  if (open >= 1) q.push({ id: 'open', ask: `How many problems are open on ${line.name} right now?`, kind: 'figure', figure: open, places: 0, worked: `${open} open problems.` });
  /* never answerable from the stops: no class is recorded on a stop, whatever the line */
  q.push({ id: 'mechanical', ask: `How much mechanical downtime did ${line.name} have ${week}, by shift?`, kind: 'cannot', worked: 'It cannot be said from the stops: a stop records what stopped it as tapped or typed, with no mechanical class' + (mine.some(o => (o.shift ?? '').trim()) ? '.' : ', and no shift.') });
  return { line: { id: line.id, name: line.name }, from, to: last, questions: q };
}

const FIG = /(?<![\p{L}\d.,:/_-])-?\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|(?<![\p{L}\d.,:/_-])-?\d+(?:\.\d+)?%?/gu;
const CANNOT = /\b(cannot|can['’]t|can not|isn['’]t recorded|not recorded|doesn['’]t record|does not record|no (?:mechanical|class|classification|shift)|not possible to say|no way to (?:say|tell))\b/i;

/** Is the right figure written — to the rounding it is written at (never wrong past it)? */
export function hasFigure(text: string, figure: number, places: number): boolean {
  for (const m of text.match(FIG) ?? []) {
    const raw = m.replace('%', '');
    const n = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    const dp = Math.min((raw.split('.')[1] ?? '').length, places);
    if (Math.abs(n - figure) <= 0.5 * 10 ** -dp + 1e-9 && (raw.split('.')[1] ?? '').length <= Math.max(places, 2)) return true;
  }
  return false;
}

/** A reply graded: its figure (or its "cannot"), its words, and no figure resting on nothing. */
export function grade(q: ExamQuestion, reply: string, check: { unsure: readonly string[] }): Graded {
  const why: string[] = [];
  if (!reply.trim()) return { id: q.id, pass: false, why: ['No answer.'] };
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const inWords = q.figure !== undefined && Number.isInteger(q.figure) && q.figure >= 0 && q.figure < 10 && new RegExp(`\\b${WORDS[q.figure]}\\b`, 'i').test(reply);
  if (q.kind === 'figure' && q.figure !== undefined && !inWords && !hasFigure(reply, q.figure, q.places ?? 2)) why.push(`The right figure (${q.worked}) is not in the answer.`);
  for (const word of q.words ?? []) if (!reply.toLowerCase().includes(word.toLowerCase())) why.push(`It does not say “${word}”.`);
  if (q.kind === 'cannot') {
    if (!CANNOT.test(reply)) why.push('It does not say this cannot be answered from these records.');
  }
  if (check.unsure.length) why.push(`${check.unsure.length === 1 ? 'A figure rests' : `${check.unsure.length} figures rest`} on nothing: ${check.unsure.join(', ')}.`);
  return { id: q.id, pass: !why.length, why };
}

/** The score in words. */
export const scoreSaid = (g: readonly Graded[]): string => `${g.filter(x => x.pass).length} of ${g.length} right`;
