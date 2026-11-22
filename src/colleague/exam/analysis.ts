/* THE ANALYSIS EXAM — the questions a manager asks of a log that used to take Luna ten steps, or could not be answered at all
 * (22 November 2026, docs/LUNA-ANALYSIS.md §3; docs/LUNA-EVAL.md).
 *
 * Rowland, 21 November: "no more analysis — Luna knows everything. Ask her a question." The slices of G4 let ONE question ask for a
 * share, a rate, a day of the week, the top few of each group, the groups that meet a condition, a change on the month before
 * (`derive`, `parts`, `top`, `having`). The unit tests prove the app's code works them; they say nothing of whether the REAL Luna
 * reaches for them. This exam does, through the same runner as the other exams (./investigation runScenario): the deployed
 * gateway, AI Mode's own loop and rules, the capabilities on the device.
 *
 * The workbook is the workbook exam's (./workbookBook — a made-up site's production log, the same bytes every run). Its truth is
 * worked HERE, by plain loops over the rows it was written from — never through the app's reader or its question engine — so a
 * wrong mark is Luna's, never the code's (`analysisExam.test.ts` proves the app's engine gives the same figures). Every turn is
 * also held to the figure check, and marked on HOW it was worked: a figure for each group asked in the question itself, never a
 * `work_out` a group. Nothing in the factory is written. */
import { allProjects, listAllStudies } from '../../db';
import { listAllSnags } from '../../db/walk';
import { allSources } from '../../capabilities/data';
import { called, done, m, names, noInvented, type ExamEnv, type ExamScenario, type ExamTurn, type Mark, type TurnSeen } from './investigation';
import { BOOK_NAME, LINES, bookRows, examWorkbookFile, type Row } from './workbookBook';
import { figuresIn, saysFigure, saysPercent } from './workbook';

/** The days a line stood more than this between the three lines — the condition of turn 5, said in the question. */
export const DAY_LIMIT = 300;
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface AnalysisTruth {
  down: number;
  /** Each line's downtime as a fraction of all of it. */
  downShareByLine: Record<string, number>;
  /** Packs made ÷ target, by line — from the two totals, never the rows' rates averaged. */
  attainByLine: Record<string, number>;
  downByWeekday: Record<string, number>;
  worstWeekday: { day: string; minutes: number };
  /** By line: the reasons WRITTEN, by their minutes, biggest first. */
  reasonsByLine: Record<string, [string, number][]>;
  /** The days whose downtime, across the lines, was more than DAY_LIMIT — and how many days there are. */
  daysOver: number; days: number;
  august: number; september: number;
  /** September less August, and that as a fraction of August. */
  change: number; pctChange: number;
}

/** The truth, worked row by row with plain loops. */
export function analysisTruth(rows: readonly Row[] = bookRows()): AnalysisTruth {
  const add = (o: Record<string, number>, k: string, v: number) => { o[k] = (o[k] ?? 0) + v; };
  const downByLine: Record<string, number> = {}, packs: Record<string, number> = {}, target: Record<string, number> = {};
  const downByWeekday: Record<string, number> = {}, downByDay: Record<string, number> = {}, byMonth: Record<string, number> = {};
  const reasons: Record<string, Record<string, number>> = {};
  let down = 0;
  for (const r of rows) {
    down += r.down;
    add(downByLine, r.line, r.down); add(packs, r.line, r.packs); add(target, r.line, r.target);
    add(downByWeekday, WEEKDAY[new Date(`${r.date}T12:00:00Z`).getUTCDay()], r.down);
    add(downByDay, r.date, r.down);
    add(byMonth, r.date.slice(0, 7), r.packs);
    if (r.down > 0 && r.reason) add((reasons[r.line] ??= {}), r.reason, r.down);
  }
  const worst = Object.entries(downByWeekday).sort((a, b) => b[1] - a[1])[0];
  const august = byMonth['2026-08'] ?? 0, september = byMonth['2026-09'] ?? 0;
  return {
    down,
    downShareByLine: Object.fromEntries(LINES.map(l => [l, downByLine[l] / down])),
    attainByLine: Object.fromEntries(LINES.map(l => [l, packs[l] / target[l]])),
    downByWeekday, worstWeekday: { day: worst[0], minutes: worst[1] },
    reasonsByLine: Object.fromEntries(LINES.map(l => [l, Object.entries(reasons[l] ?? {}).sort((a, b) => b[1] - a[1])])),
    daysOver: Object.values(downByDay).filter(v => v > DAY_LIMIT).length, days: Object.keys(downByDay).length,
    august, september, change: september - august, pctChange: (september - august) / august,
  };
}

let made: ReturnType<typeof examWorkbookFile> | undefined;
const book = () => (made ??= examWorkbookFile());
let truth: AnalysisTruth | undefined;
const T = (): AnalysisTruth => (truth ??= analysisTruth());
const n0 = (v: number) => Math.round(v).toLocaleString('en-GB');
const pc = (f: number) => `${(f * 100).toFixed(1)}%`;

/** The steps that ask the workbook a question. */
const ASKS = ['query_workbook', 'query_data'];
/** HOW it was worked: a figure for each group belongs in the question (derive, parts, top, having) — never a sum a group. */
const inTheQuestion = (s: TurnSeen): Mark => {
  const sums = called(s, 'work_out').length, asks = done(s, ...ASKS).length;
  return m('Asked in the question itself — no sum a group', sums === 0 && asks >= 1 && asks <= 2, `${asks} question${asks === 1 ? '' : 's'} of the workbook, no work_out`, `${asks} questions of the workbook and ${sums} work_out — ${names(s.steps)}`);
};
const percent = (s: TurnSeen, what: string, f: number): Mark => m(what, saysPercent(s.reply, f), `she said ${pc(f)}`, `not ${pc(f)}: “${s.reply.replace(/\s+/g, ' ').slice(0, 220)}”`);
const figure = (s: TurnSeen, what: string, want: number, unit = '', tol = 0.005): Mark => m(what, saysFigure(s.reply, want, tol), `she said ${n0(want)}${unit}`, `not ${n0(want)}${unit}: “${s.reply.replace(/\s+/g, ' ').slice(0, 220)}”`);

/** THE SIX TURNS. */
export const ANALYSIS_TURNS: readonly ExamTurn[] = [
  {
    id: 'share', scenario: 'A share of the whole, for each line',
    attach: () => book().file,
    say: 'I’ve attached our production log. What share of the total downtime does each line account for?',
    approve: [],
    marks: s => [...LINES.map(l => percent(s, `${l}’s share of the downtime`, T().downShareByLine[l])), inTheQuestion(s), noInvented(s)],
  },
  {
    id: 'rate', scenario: 'A rate from two totals, for each line',
    say: 'And how did each line do against its target — the packs it made as a percentage of its target?',
    approve: [],
    marks: s => [...LINES.map(l => percent(s, `${l}’s packs against target`, T().attainByLine[l])), inTheQuestion(s), noInvented(s)],
  },
  {
    id: 'weekday', scenario: 'A day of the week',
    say: 'Which day of the week costs us the most downtime, and how many minutes is it?',
    approve: [],
    marks: s => [
      m('Named the day', new RegExp(`\\b${T().worstWeekday.day}s?\\b`, 'i').test(s.reply), T().worstWeekday.day, `not ${T().worstWeekday.day}: “${s.reply.slice(0, 200)}”`),
      figure(s, 'Its minutes', T().worstWeekday.minutes, ' min'),
      inTheQuestion(s), noInvented(s),
    ],
  },
  {
    id: 'top-each', scenario: 'The top few within each group',
    say: 'What are the top two downtime reasons on each line? Leave out the stops with no reason written.',
    approve: [],
    marks: s => [
      ...LINES.flatMap(l => {
        const [first, second] = T().reasonsByLine[l];
        return [figure(s, `${l}: its biggest reason’s minutes (${first[0]})`, first[1], ' min', 0.001), figure(s, `${l}: its second reason’s minutes (${second[0]})`, second[1], ' min', 0.001)];
      }),
      m('Every line is there', LINES.every(l => new RegExp(`\\b${l}\\b`, 'i').test(s.reply)), 'all three lines named', `a line missing: “${s.reply.slice(0, 200)}”`),
      inTheQuestion(s), noInvented(s),
    ],
  },
  {
    id: 'condition', scenario: 'How many groups meet a condition',
    say: `On how many days did we lose more than ${DAY_LIMIT} minutes of downtime across the three lines?`,
    approve: [],
    marks: s => [
      m('The number of days', figuresIn(s.reply).includes(T().daysOver), `${T().daysOver} of ${T().days} days`, `not ${T().daysOver}: “${s.reply.replace(/\s+/g, ' ').slice(0, 220)}”`),
      inTheQuestion(s), noInvented(s),
    ],
  },
  {
    id: 'change', scenario: 'A change on the month before',
    say: 'How did September’s packs compare with August’s — the change in packs, and as a percentage?',
    approve: [],
    marks: s => [
      figure(s, 'The change in packs', Math.abs(T().change), ' packs'),
      m('The change as a percentage', figuresIn(s.reply).some(v => Math.abs(v - Math.abs(T().pctChange) * 100) <= 0.15), pc(Math.abs(T().pctChange)), `not ${pc(Math.abs(T().pctChange))}: “${s.reply.replace(/\s+/g, ' ').slice(0, 220)}”`),
      m('Which way', T().change >= 0 ? /\b(up|more|higher|rose|increase|grew|above|ahead)\b/i.test(s.reply) : /\b(down|fewer|less|lower|fell|drop|decrease|below|behind)\b/i.test(s.reply), T().change >= 0 ? 'up' : 'down', `the direction is not said: “${s.reply.slice(0, 160)}”`),
      noInvented(s),
    ],
  },
];

/** The records once every turn is said: the workbook once in the register, nothing made in the factory. */
async function audit(env: ExamEnv): Promise<Mark[]> {
  const src = (await allSources()).filter(x => x.facts.fileName === BOOK_NAME && x.facts.at >= env.since);
  const projects = (await allProjects()).filter(p => ((p as { createdAt?: number }).createdAt ?? 0) >= env.since);
  const problems = (await listAllSnags()).filter(x => x.raisedAt >= env.since);
  const studies = (await listAllStudies()).filter(x => x.createdAt >= env.since && !x.deletedAt && !env.conversations.includes(x.id) && x.tool !== 'talk' && x.tool !== 'source');
  return [
    m('The workbook is in the register once', src.length === 1, `“${src[0]?.facts.name}”`, `${src.length} register records of it`),
    m('No project or problem made', projects.length === 0 && problems.length === 0, 'none', `${projects.length} projects, ${problems.length} problems`),
    m('No tool record made', studies.length === 0, 'none', studies.map(x => `${x.tool} “${x.name}”`).join(', ')),
  ];
}

export const ANALYSIS_EXAM: ExamScenario = {
  key: 'analysis', title: 'Any question of the log, in one question', turns: ANALYSIS_TURNS,
  setup: async () => ({}),
  audit,
};
