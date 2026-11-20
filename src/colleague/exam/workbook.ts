/* THE WORKBOOK EXAM — Luna and a site's Excel, with the real model (20 November, docs/CONNECTED-LUNA.md X4; docs/LUNA-EVAL.md §3).
 *
 * Rowland, 20 November: "The most important aspect for Luna right now is upload Excel and that entire system … it's what Luna's
 * abilities are." The scripted acceptance scripts prove the machinery (the reader, the first look, the register); they say nothing of
 * whether the REAL Luna asks the workbook the right question, quotes the app's figure, averages a rate, notices a half month, refuses
 * to invent money, and finds the file again the next day. This exam does, through the same runner as the bagger and packing exams
 * (./investigation runScenario): the deployed gateway, AI Mode's own loop and rules, the capabilities on the device.
 *
 * The workbook is ./workbookBook — a made-up site's production log with its truth worked row by row as it was written (proved equal to
 * the app's reader by workbookBook.test.ts). It is attached on the first turn through colleague/attachWorkbook — the very function AI
 * Mode's ＋ and Connect to Microsoft read a file by, so its first look is said in code as a person sees it. Every figure is marked
 * against the generator's truth; every turn is also held to the figure check (no figure with nothing behind it). The next day is a
 * new conversation: the workbook is found again from the register, never attached twice. Nothing in the factory is written. */
import { allProjects, getStudy, listAllStudies } from '../../db';
import { listAllSnags } from '../../db/walk';
import { allSources, outputsOfConversation } from '../../capabilities/data';
import type { ToolStudy } from '../../lib/study';
import { factsOfConversation, turnsOfConversation } from '../conversation';
import { called, done, doneWrites, m, names, noInvented, type ExamEnv, type ExamScenario, type ExamTurn, type Mark, type TurnSeen } from './investigation';
import { BOOK_NAME, POUNDS_A_MINUTE, examWorkbookFile, type BookTruth } from './workbookBook';

/* the file and its truth, made once a page */
let made: ReturnType<typeof examWorkbookFile> | undefined;
const book = () => (made ??= examWorkbookFile());
const T = (): BookTruth => book().truth;

/* ------------------------------------------------------------ reading figures in her words */
/** Every figure in a reply, as numbers: 2,199,187 · 2.2 million · 448.8k · 87.5% · £54,721.80. */
export function figuresIn(text: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(million|m\b|thousand|k\b)?/gi;
  for (const x of text.matchAll(re)) {
    let v = Number(x[1].replace(/,/g, '') + (x[2] ?? ''));
    const unit = (x[3] ?? '').toLowerCase();
    if (unit === 'million' || unit === 'm') v *= 1e6; else if (unit === 'thousand' || unit === 'k') v *= 1e3;
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}
/** A figure in the reply within `tol` (a share) of `want`. */
export const saysFigure = (text: string, want: number, tol = 0.01) => figuresIn(text).some(v => Math.abs(v - want) <= Math.max(tol * Math.abs(want), 0.5));
/** A percentage said either way — 87.5% or 0.875 — within `pp` points. */
export const saysPercent = (text: string, fraction: number, pp = 0.6) => figuresIn(text).some(v => Math.abs(v - fraction * 100) <= pp || Math.abs(v - fraction) <= pp / 100);
const n0 = (v: number) => Math.round(v).toLocaleString('en-GB');
const pc = (f: number) => `${(f * 100).toFixed(1)}%`;

/** The steps that read the workbook or the register. */
const LOOKS = ['workbook_profile', 'query_workbook', 'workbook_rows', 'query_data', 'source_fields', 'list_sources', 'resolve_source', 'read_workbook_as', 'workbook_pack'];
const figure = (s: TurnSeen, what: string, want: number, unit = '', tol = 0.01): Mark =>
  m(what, saysFigure(s.reply, want, tol), `she said ${n0(want)}${unit}`, `not ${n0(want)}${unit}: “${s.reply.replace(/\s+/g, ' ').slice(0, 200)}”`);
/** Nothing written in the factory — a workbook question changes no record. */
const wroteNothing = (s: TurnSeen): Mark => {
  const w = doneWrites(s).filter(u => !['make_chart', 'refine_chart', 'build_report', 'workbook_pack', 'read_workbook_as', 'name_source', 'update_context', 'keep_task', 'set_focus', 'park_focus'].includes(u.name));
  return m('Wrote nothing in the factory', w.length === 0, 'no record of the factory changed', `wrote: ${names(w)}`);
};
const CHARTS = ['make_chart', 'refine_chart', 'query_workbook', 'query_data', 'workbook_profile', 'list_sources', 'resolve_source'];

/** THE TEN TURNS — what a manager asks of a production log, in order. */
export const WORKBOOK_TURNS: readonly ExamTurn[] = [
  {
    id: 'whole-period', scenario: 'A workbook attached — the first question',
    attach: () => book().file,
    say: 'I’ve attached our production log for the last few months. How many packs did we make in total over the whole period?',
    approve: [],
    marks: s => [
      figure(s, 'The total over the period — the sheet’s own Total row left out', T().packs, ' packs', 0.005),
      m('Did not count the Total row as well', !saysFigure(s.reply, T().packs * 2, 0.005), 'the total not doubled', 'the Total row counted as a row of data'),
      noInvented(s), wroteNothing(s),
    ],
    records: async env => {
      const src = (await allSources()).filter(x => x.facts.fileName === BOOK_NAME && x.facts.at >= env.since);
      const turns = turnsOfConversation(factsOfConversation((await getStudy(env.conversationId)) as ToolStudy));
      return [
        m('The workbook is in the register, read', src.length === 1 && src[0].facts.status === 'ready', `“${src[0]?.facts.name}” — ${src[0]?.facts.status}`, `${src.length} register records of it${src[0] ? ` (${src[0].facts.status})` : ''}`),
        m('Its first look was said in code, no AI asked', turns.some(x => x.byCode && x.who !== 'You'), 'the first look is a turn of its own, marked done in the app', 'no first look in the conversation'),
      ];
    },
  },
  {
    id: 'best-line', scenario: 'A question by line and month',
    say: 'Which line made the most packs in September, and how many?',
    approve: [],
    marks: s => [
      m('Named the line', new RegExp(`\\b${T().bestLineSeptember.line}\\b`, 'i').test(s.reply), `${T().bestLineSeptember.line}`, `not ${T().bestLineSeptember.line}: “${s.reply.slice(0, 160)}”`),
      figure(s, 'Its September packs', T().bestLineSeptember.packs, ' packs'),
      noInvented(s),
    ],
  },
  {
    id: 'top-reason', scenario: 'Downtime by reason',
    say: 'What cost us the most downtime over the whole period — which reason, and how many minutes?',
    approve: [],
    marks: s => [
      m('Named the reason', new RegExp(T().topReason.reason, 'i').test(s.reply), T().topReason.reason, `not ${T().topReason.reason}: “${s.reply.slice(0, 160)}”`),
      figure(s, 'Its minutes', T().topReason.minutes, ' min'),
      noInvented(s),
    ],
  },
  {
    id: 'rate', scenario: 'A rate — averaged, never added',
    say: 'How did efficiency compare between day shifts and night shifts?',
    approve: [],
    marks: s => [
      m('Days’ efficiency, averaged', saysPercent(s.reply, T().effByShift.Days), `days ${pc(T().effByShift.Days)}`, `not ${pc(T().effByShift.Days)}: “${s.reply.slice(0, 200)}”`),
      m('Nights’ efficiency, averaged', saysPercent(s.reply, T().effByShift.Nights), `nights ${pc(T().effByShift.Nights)}`, `not ${pc(T().effByShift.Nights)}`),
      m('Never added up', [...s.reply.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*%/g)].every(x => Number(x[1].replace(/,/g, '')) <= 100), 'no efficiency over 100%', 'an efficiency added up past 100%'),
      noInvented(s),
    ],
  },
  {
    id: 'no-reason', scenario: 'What the workbook does not say',
    say: 'How much of that downtime has no reason written against it?',
    approve: [],
    marks: s => [figure(s, 'The minutes with no reason', T().noReason, ' min'), noInvented(s)],
  },
  {
    id: 'part-month', scenario: 'A month only half written',
    say: 'Did we make more in October than in September?',
    approve: [],
    marks: s => {
      const t = T(), perDayOct = t.packsByMonth.October / t.daysByMonth.October, perDaySep = t.packsByMonth.September / t.daysByMonth.September;
      return [
        m('Said October is only part of a month', /part(ial)?\b|only (runs |goes |covers )?(up )?(to|until)|so far|15(th)? oct|half (a |of )?(the )?month|incomplete|not (a )?(full|whole|complete)|first (two weeks|half|11|eleven)|11 (working |week)?days|eleven (working )?days/i.test(s.reply), 'October said to run only to the 15th', `October compared as if whole: “${s.reply.slice(0, 220)}”`),
        m('October’s figure, or its packs a day', saysFigure(s.reply, t.packsByMonth.October) || saysFigure(s.reply, perDayOct, 0.01), `October ${n0(t.packsByMonth.October)} (${n0(perDayOct)} a day)`, `neither ${n0(t.packsByMonth.October)} nor ${n0(perDayOct)} a day`),
        m('September’s figure, or its packs a day', saysFigure(s.reply, t.packsByMonth.September) || saysFigure(s.reply, perDaySep, 0.01), `September ${n0(t.packsByMonth.September)} (${n0(perDaySep)} a day)`, `neither ${n0(t.packsByMonth.September)} nor ${n0(perDaySep)} a day`),
        noInvented(s),
      ];
    },
  },
  {
    id: 'chart', scenario: 'A chart asked for',
    say: 'Show me the downtime minutes by line as a chart.',
    approve: ['make_chart', 'refine_chart'],
    marks: s => [
      m('Made the chart', done(s, 'make_chart', 'refine_chart').length > 0, 'a chart made by the app', `no chart — ${names(called(s, ...CHARTS))}`),
      noInvented(s),
    ],
    records: async env => {
      const o = outputsOfConversation((await getStudy(env.conversationId)) as ToolStudy);
      const ch = o.charts[o.charts.length - 1];
      const spec = ch?.versions[ch.versions.length - 1];
      const res = spec ? o.results.find(r => r.id === spec.resultId) : undefined;
      const got = Object.fromEntries((res?.result.groups ?? []).map(g => [String(g.key[0]), Number(g.values[spec?.measure ?? 0])]));
      const want = T().downByLine;
      const same = Object.keys(want).every(k => got[k] === want[k]) && Object.keys(got).length === Object.keys(want).length;
      return [m('The chart is downtime minutes by line, as the workbook holds them', same, Object.entries(want).map(([k, v]) => `${k} ${n0(v)}`).join(' · '), ch ? `the chart holds ${JSON.stringify(got)}` : 'no chart kept on the conversation')];
    },
  },
  {
    id: 'not-there', scenario: 'Money the workbook does not hold',
    say: 'What has all that downtime cost us in money?',
    approve: [],
    marks: s => [
      m('Made up no money', !/£\s?\d/.test(s.reply), 'no pound figure without a price', `a pound figure with nothing behind it: “${s.reply.slice(0, 200)}”`),
      m('Said what she needs to work it out', /not in|isn[’']?t in|doesn[’']?t (hold|have|say|include)|does not (hold|have|say|include)|no (cost|price|margin|£|money|pound)|cost (per|a|of a) minute|a minute|per minute|margin|contribution|\?/i.test(s.reply), 'she asked for the price of a minute, or said the file holds none', `no word of what is missing: “${s.reply.slice(0, 200)}”`),
    ],
  },
  {
    id: 'priced', scenario: 'A figure the person gives — worked by the app',
    say: `Take it as £${POUNDS_A_MINUTE.toFixed(2)} for every minute of downtime.`,
    approve: [],
    marks: s => [
      figure(s, 'The downtime in money', T().cost, ` (£ — ${n0(T().down)} min × £${POUNDS_A_MINUTE.toFixed(2)})`),
      m('Worked by the app, not in her head', done(s, 'work_out', 'query_workbook', 'query_data').length > 0, `worked: ${names(done(s, 'work_out', 'query_workbook', 'query_data'))}`, `worked in her own words — ${names(s.steps)}`),
      noInvented(s),
    ],
  },
  {
    /* the clock is not moved (as in the bagger exam), so the file was read "today": the words name no day (20 November — told
       "yesterday", she rightly asked whether the one file read today was the one meant) */
    id: 'next-day', scenario: 'The next day, a new conversation', nextDay: true,
    say: 'Morning. From the production log I gave you — what were our total packs in September?',
    approve: [],
    marks: s => [
      m('Found the workbook again — not attached twice', called(s, ...LOOKS).length > 0, `she looked: ${names(called(s, ...LOOKS))}`, `looked nothing up — ${names(s.steps)}`),
      figure(s, 'September’s packs', T().packsByMonth.September, ' packs'),
      noInvented(s),
    ],
  },
];

/** The records once every turn is said: the workbook once in the register, nothing made in the factory. */
async function audit(env: ExamEnv): Promise<Mark[]> {
  const src = (await allSources()).filter(x => x.facts.fileName === BOOK_NAME && x.facts.at >= env.since);
  const projects = (await allProjects()).filter(p => (p as { createdAt?: number }).createdAt !== undefined && ((p as { createdAt?: number }).createdAt ?? 0) >= env.since);
  const problems = (await listAllSnags()).filter(x => x.raisedAt >= env.since);
  const studies = (await listAllStudies()).filter(x => x.createdAt >= env.since && !x.deletedAt && !env.conversations.includes(x.id) && x.tool !== 'talk' && x.tool !== 'source');
  return [
    m('The workbook is in the register once', src.length === 1, `“${src[0]?.facts.name}”`, `${src.length} register records of it`),
    m('No project or problem made', projects.length === 0 && problems.length === 0, 'none', `${projects.length} projects, ${problems.length} problems`),
    m('No tool record made', studies.length === 0, 'none', studies.map(x => `${x.tool} “${x.name}”`).join(', ')),
  ];
}

export const WORKBOOK_EXAM: ExamScenario = {
  key: 'workbook', title: 'The production workbook', turns: WORKBOOK_TURNS,
  setup: async () => ({}),
  audit,
};
