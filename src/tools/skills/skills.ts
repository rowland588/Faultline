/* THE SKILLS MATRIX AND COVER — FC-222 (knowledge/specs/FC-222-skills-matrix.md; knowledge/methods/people/skills-matrix.md).
 *
 * People down the side, the tasks that matter across, and in each cell how far that person can do that task — the I-L-U-O levels of
 * Training Within Industry and lean practice (Liker & Meier 2007, Toyota Talent): 0 not trained, 1 learning (I), 2 can do with help (L),
 * 3 can do alone to the standard (U), 4 can teach it (O). Read by column it is cover — the people at U or O on a shift; a column with one
 * is a line that stops when that person is off. Read by row it is a person's versatility.
 *
 *   cover   = people on the shift at U or O (level 3 or 4) on the task
 *   gap     = cover wanted − cover, where positive; a single point where cover is 1 (and more than one is wanted); nobody where it is 0
 *   teacher = a person at O; a task with cover but no teacher cannot grow its cover
 *   flexibility = the task × shift cells at their cover wanted
 *
 * Pure counts — no AI, nothing invented. The cover wanted is the matrix's (3 is the record's "often") unless a task says its own.
 * Independent case: scripts/knowledge/cases-projects-people-ergo-sust.py §Skills matrix (a second implementation), held by __tests__. */
import type { LeanTile, LeanTone } from '../../lib/lean';
import { fmtGBP } from '../../lib/cost';
import type { ScoredCriterion, ScoredRow } from '../../lib/study';
import type { ScoredMatrixOut, ScoredResult, ScoredTable } from '../scored/types';

export const LEVELS: { v: number; short: string; word: string; pick: string }[] = [
  { v: 0, short: '—', word: 'Not trained', pick: 'Not trained' },
  { v: 1, short: 'I', word: 'Learning', pick: 'Learning' },
  { v: 2, short: 'L', word: 'Can do it with help', pick: 'With help' },
  { v: 3, short: 'U', word: 'Can do it alone, to the standard', pick: 'Alone' },
  { v: 4, short: 'O', word: 'Can teach it', pick: 'Can teach' },
];
/** The level at which a person counts as cover. */
export const COVER_LEVEL = 3;
/** The record's "often 3 — one running, one cover, one on leave or training" — a starting point, changed on the page. */
export const TARGET_DEFAULT = 3;
export const NO_SHIFT = 'No shift given';
export const ALL_SHIFTS = 'All shifts';

const list = (xs: string[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export interface SkillsCell {
  task: string;
  taskId: string;
  shift: string;
  /** People at U or O on this shift, by name. */
  names: string[];
  cover: number;
  need: number;
  gap: number;
  /** One person, where more are wanted. */
  single: boolean;
  none: boolean;
  /** The task's weight 1–5 (how much it matters), for ranking the training. */
  weight: number;
}

export interface SkillsPerson { id: string; name: string; shift: string; levels: (number | undefined)[]; can: number }

export interface SkillsResult {
  target: number;
  shifts: string[];
  /** False when no one gave a shift: cover is counted across everyone, and said to hide a night gap. */
  byShift: boolean;
  tasks: { id: string; name: string; need: number; weight: number; teachers: number; cover: number }[];
  people: SkillsPerson[];
  cells: SkillsCell[];
  atTarget: number;
  singles: SkillsCell[];
  nobody: SkillsCell[];
  /** Below target, the training to do first: the task's weight, then how far below, then the order typed. */
  gaps: SkillsCell[];
  /** Tasks with cover somewhere and nobody who can teach them. */
  noTeacher: string[];
  /** People named but with no task marked at all. */
  untrained: string[];
}

export interface SkillsIn { target?: number; tasks: ScoredCriterion[]; people: ScoredRow[] }

const cleanLevel = (v: unknown): number | undefined | 'bad' => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 4 ? n : 'bad';
};

export function skills(input: SkillsIn): { ok: SkillsResult } | { problems: string[] } {
  const problems: string[] = [];
  const tasks = input.tasks.filter(t => t.name.trim());
  const people = input.people.filter(p => p.name.trim());
  const target = input.target ?? TARGET_DEFAULT;
  if (!Number.isInteger(target) || target < 1 || target > 20) problems.push('The cover wanted is a whole number of people, from 1 to 20.');
  if (!tasks.length) problems.push('Add at least one task — a machine’s set-up, a CCP check, a clean — across the top.');
  if (!people.length) problems.push('Add at least one person down the side.');
  for (const t of tasks) if (t.need !== undefined && (!Number.isInteger(t.need) || t.need < 1 || t.need > 20)) problems.push(`“${t.name.trim()}”: the people wanted is a whole number from 1 to 20.`);
  for (const t of tasks) if (t.weight !== undefined && (!Number.isInteger(t.weight) || t.weight < 1 || t.weight > 5)) problems.push(`“${t.name.trim()}”: how much it matters is a whole number from 1 to 5.`);
  for (const p of people) for (const t of tasks) if (cleanLevel(p.scores?.[t.id]) === 'bad') problems.push(`${p.name.trim()} on ${t.name.trim()}: a level is 0 to 4 (— I L U O).`);
  if (problems.length) return { problems };

  /* shifts as typed, in the order first seen; case and spacing do not make a second one */
  const shiftOf = (p: ScoredRow): string => (p.shift ?? '').trim().replace(/\s+/g, ' ');
  const given = people.map(shiftOf).filter(Boolean);
  const byShift = given.length > 0;
  const shifts: string[] = [];
  if (byShift) {
    for (const p of people) {
      const s = shiftOf(p) || NO_SHIFT;
      if (!shifts.some(x => x.toLowerCase() === s.toLowerCase())) shifts.push(s);
    }
  } else shifts.push(ALL_SHIFTS);
  const shiftName = (p: ScoredRow): string => (byShift ? shifts.find(x => x.toLowerCase() === (shiftOf(p) || NO_SHIFT).toLowerCase()) ?? NO_SHIFT : ALL_SHIFTS);

  const outPeople: SkillsPerson[] = people.map(p => {
    const levels = tasks.map(t => { const l = cleanLevel(p.scores?.[t.id]); return l === 'bad' ? undefined : l; });
    return { id: p.id, name: p.name.trim(), shift: shiftName(p), levels, can: levels.filter(l => l !== undefined && l >= COVER_LEVEL).length };
  });

  const cells: SkillsCell[] = [];
  for (const t of tasks) {
    const need = t.need ?? target;
    const weight = t.weight ?? 1;
    for (const sh of shifts) {
      const names = outPeople.filter(p => p.shift === sh && (p.levels[tasks.indexOf(t)] ?? 0) >= COVER_LEVEL).map(p => p.name);
      const cover = names.length;
      cells.push({ task: t.name.trim(), taskId: t.id, shift: sh, names, cover, need, gap: Math.max(0, need - cover), single: cover === 1 && need > 1, none: cover === 0, weight });
    }
  }
  const outTasks = tasks.map((t, j) => ({
    id: t.id, name: t.name.trim(), need: t.need ?? target, weight: t.weight ?? 1,
    teachers: outPeople.filter(p => p.levels[j] === 4).length, cover: outPeople.filter(p => (p.levels[j] ?? 0) >= COVER_LEVEL).length,
  }));
  const order = (c: SkillsCell): number => tasks.findIndex(t => t.id === c.taskId) * 1000 + shifts.indexOf(c.shift);
  const gaps = cells.filter(c => c.gap > 0).sort((a, b) => b.weight - a.weight || b.gap - a.gap || order(a) - order(b));
  return {
    ok: {
      target, shifts, byShift, tasks: outTasks, people: outPeople, cells,
      atTarget: cells.filter(c => c.gap === 0).length,
      singles: cells.filter(c => c.single), nobody: cells.filter(c => c.none), gaps,
      noTeacher: outTasks.filter(t => t.cover > 0 && t.teachers === 0).map(t => t.name),
      untrained: outPeople.filter(p => p.levels.every(l => l === undefined || l === 0)).map(p => p.name),
    },
  };
}

const where = (c: SkillsCell, r: SkillsResult): string => (r.byShift ? `${c.task} on ${c.shift}` : c.task);

/** The sentence, tiles, closing line and what it does not say — one source for the page, the paper and the tests. */
export function summarizeSkills(r: SkillsResult, o: { dayCost?: number } = {}): ScoredResult {
  const n = r.cells.length;
  const verdict = r.nobody.length ? `${plural(r.nobody.length, 'task')} with nobody` : r.singles.length ? `${plural(r.singles.length, 'single point')} of cover` : r.gaps.length ? `${plural(r.gaps.length, 'cell')} below the target` : 'Cover at target';
  const tone: LeanTone = r.nobody.length ? 'r' : r.gaps.length ? 'a' : 'g';
  const parts: string[] = [];
  if (r.nobody.length) parts.push(`Nobody can run ${list(r.nobody.map(c => where(c, r)))} alone.`);
  if (r.singles.length) parts.push(`${list(r.singles.map(c => `${where(c, r)} (${c.names[0]})`))} ${r.singles.length === 1 ? 'rests' : 'rest'} on one person — a single point of cover: the line stops when that person is off.`);
  const rest = r.gaps.filter(c => !c.single && !c.none);
  if (rest.length) parts.push(`${plural(rest.length, 'other cell')} ${rest.length === 1 ? 'is' : 'are'} below the cover wanted: ${list(rest.map(c => `${where(c, r)} (${c.cover} of ${c.need})`))}.`);
  const sentence = parts.length
    ? `${parts.join(' ')}${r.byShift ? '' : ' Cover is counted across everyone because no shift was given — a night gap would not show.'}`
    : `Every task has at least ${plural(r.target, 'person', 'people')} at the standard${r.byShift ? ' on every shift' : ''}.${r.byShift ? '' : ' Cover is counted across everyone because no shift was given — a night gap would not show.'}`;

  const tiles: LeanTile[] = [
    { k: 'Single points', v: String(r.singles.length), of: r.singles.length ? list(r.singles.map(c => where(c, r))) : 'no task rests on one person', tone: r.singles.length ? 'a' : 'n' },
    { k: 'Nobody', v: String(r.nobody.length), of: r.nobody.length ? list(r.nobody.map(c => where(c, r))) : 'every task and shift has someone', tone: r.nobody.length ? 'r' : 'n' },
    { k: 'At the cover wanted', v: `${r.atTarget} of ${n}`, of: `task × shift cell${n === 1 ? '' : 's'}`, tone: r.atTarget === n ? 'g' : 'n' },
    { k: 'Can teach it', v: `${r.tasks.filter(t => t.teachers > 0).length} of ${r.tasks.length}`, of: r.noTeacher.length ? `no teacher for ${list(r.noTeacher)}` : 'tasks with a teacher (O)', tone: r.noTeacher.length ? 'a' : 'n' },
  ];

  const money: string[] = [];
  if (r.singles.length || r.nobody.length) {
    const k = r.singles.length + r.nobody.length;
    money.push(o.dayCost !== undefined
      ? `Each of the ${k} is a shift the line cannot run when that person is off — a shift of the line not making costs ${fmtGBP(o.dayCost)} (the figure you gave); the absence rate is not held, so no yearly figure is guessed.`
      : 'Give what a shift of the line not making costs to say what a single point is worth — the training costs hours, the stopped shift costs the margin.');
  }

  const first = r.gaps[0];
  const closing = r.gaps.length
    ? `Train first: ${list(r.gaps.slice(0, 3).map(c => `${where(c, r)} — ${plural(c.need - c.cover, 'more person', 'more people')}`))}. ${r.noTeacher.length ? `${list(r.noTeacher)} ${r.noTeacher.length === 1 ? 'has' : 'have'} no one who can teach it, so cover cannot grow until someone does. ` : ''}Read it for the gaps, not for the people.`
    : `Cover is at the target everywhere it was asked${r.noTeacher.length ? `, but ${list(r.noTeacher)} ${r.noTeacher.length === 1 ? 'has' : 'have'} no one who can teach it` : ''}. Look again when someone leaves or a shift changes.`;

  const lists: ScoredResult['lists'] = [];
  if (r.gaps.length) lists.push({ title: 'Training to do first', lines: r.gaps.map((c, i) => `${i + 1}. ${where(c, r)}: ${plural(c.cover, 'person', 'people')} at the standard of ${c.need} wanted${c.weight > 1 ? ` (matters ${c.weight} of 5)` : ''}${c.names.length ? ` — ${list(c.names)}` : ''}. ${plural(c.need - c.cover, 'more person', 'more people')} to train.`) });
  const versatility = [...r.people].sort((a, b) => b.can - a.can || r.people.indexOf(a) - r.people.indexOf(b));
  lists.push({ title: 'Who can do how much', lines: versatility.map(p => `${p.name}${r.byShift ? ` (${p.shift})` : ''}: ${p.can} of ${r.tasks.length} ${r.tasks.length === 1 ? 'task' : 'tasks'} alone or better.`) });
  if (r.untrained.length) lists.push({ title: 'Nothing marked yet', lines: [`${list(r.untrained)} ${r.untrained.length === 1 ? 'has' : 'have'} no level on any task — mark what they can do, or take them off.`] });

  const caveats = [
    'A level is the team’s judgement, signed by the person who taught it — “can do” marked by the person themselves is a guess. Levels are not re-checked by this page: a U from three years ago is still a U here.',
    'The date each level was reached and who signed it are not kept here; the matrix is as good as the last time someone read it.',
    `Cover is people at U or O. ${r.byShift ? 'It is counted shift by shift because one number across shifts hides the night gap.' : 'No shift was given, so it is counted across everyone — give each person their shift to see a night gap.'}`,
    'The tasks should be the few that matter (a machine’s set-up, a CCP check, a clean) — a matrix of every job drowns them. It is read for the gaps, not the people.',
  ];
  if (first && !first.single && !first.none) caveats.push('Single points are only the cells with exactly one person where more than one is wanted; a task wanted by one is not flagged.');
  return { verdict, tone, sentence, tiles, closing, caveats, ...(money.length ? { money } : {}), lists };
}

/** The matrix as a table for the page's foot and the paper: people down, tasks across (their level letter), what each can do alone; cover per shift, the target and the teachers under it. */
export function skillsTable(input: SkillsIn, r: SkillsResult): ScoredTable {
  const tasks = input.tasks.filter(t => t.name.trim());
  const dash = '—';
  const head = ['Person', 'Shift', ...tasks.map(t => t.name.trim()), 'Can do alone'];
  const rows = r.people.map(p => [p.name, r.byShift ? p.shift : dash, ...p.levels.map(l => (l === undefined ? dash : LEVELS[l].short)), `${p.can} of ${r.tasks.length}`]);
  const foot: string[][] = [
    ...r.shifts.map(sh => [`Cover ${r.byShift ? `on ${sh}` : '(everyone)'}`, '', ...tasks.map(t => String(r.cells.find(c => c.taskId === t.id && c.shift === sh)?.cover ?? 0)), '']),
    ['Cover wanted', '', ...r.tasks.map(t => String(t.need)), ''],
    ['Teachers (O)', '', ...r.tasks.map(t => String(t.teachers)), ''],
  ];
  const nT = Math.max(tasks.length, 1);
  const rest = 1 - 0.2 - 0.1 - 0.11;
  return { head, rows, foot, shares: [0.2, 0.1, ...tasks.map(() => rest / nT), 0.11], columnIds: tasks.map(t => t.id) };
}

/** What the matrix asks of the person while it is empty. */
export const START = {
  name: 'What is this matrix for?',
  placeholder: 'e.g. Line 2 — setters and checks, by shift',
  empty: 'No skills matrix yet — name the tasks that matter, add the people and their shifts, then mark what each can do.',
};

export function analyseSkills(a: { criteria: ScoredCriterion[]; rows: ScoredRow[]; target?: number; dayCost?: number }): ScoredMatrixOut {
  const input: SkillsIn = { target: a.target, tasks: a.criteria, people: a.rows };
  const out = skills(input);
  if (!('ok' in out)) return { problems: out.problems };
  return { result: summarizeSkills(out.ok, { dayCost: a.dayCost }), table: skillsTable(input, out.ok), leaders: [] };
}
