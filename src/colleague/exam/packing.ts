/* THE PACKING-LINE INVESTIGATION — Luna operating Faultline, marked by the records (11 November, docs/LUNA-EVAL.md §5).
 *
 * Rowland, 11 November: "Build the real-model operational examination … The test must inspect the actual application records and
 * determine whether the correct work was created, populated and retained … Do not award marks for good conversational answers …
 * Identify any failures in the existing machinery separately from failures in the real model's ability to use that machinery."
 *
 * One investigation said to the REAL Luna as a person says it on the floor — ordinary words, an interruption, a correction, a figure
 * that is only what the operators reckon, a second problem in the middle, the next day in a new conversation. It runs through the
 * same runner as the bagger exam (./investigation runScenario): the deployed gateway, AI Mode's own loop and rules, the capabilities on
 * the device. Nothing of Luna is played. The exam answers her cards in the person's place by each turn's fixed rule (`approve`).
 *
 * Each turn is marked twice: on what she did and said (`marks`, on: turn), and on what the application's records hold afterwards
 * (`records`, on: records — read from the database, never from her words). Once every turn is said, the AUDIT reads every record the
 * investigation should have made: one project on the right line, the charter with what was said (the corrections in, the reported
 * figure never passed off as measured), the stop timed and corrected, the second problem on the other line, nothing duplicated, nothing
 * written on any other line.
 *
 * The practice factory is its own (client "Exam practice", Exam site › Packing hall): Packing Line 1 (Filler, Bagger, Checkweigher,
 * Case packer) and Packing Line 2 (Bagger, Labeller) — so "the packing line" and "the bagger" are honestly ambiguous. */
import { allProjects, listAllStudies, listObservations, listTestItems, listWorkspaces } from '../../db';
import { allPaceLines } from '../../db/pace';
import { listAllSnags } from '../../db/walk';
import { patchWorkspaceRecord } from '../../db/workspaces';
import { addMachineToLine, machineRecordFor } from '../../db/lineRecords';
import { addLineToFactory } from '../../lib/lines';
import { draftsOf } from '../../capabilities/draftStore';
import { missing } from '../../capabilities/drafts';
import type { ColleagueDraft, DraftValue } from '../../capabilities/types';
import type { ToolStudy } from '../../lib/study';
import type { Workspace } from '../../types';
import { EXAM_CLIENT, asks, called, done, doneWrites, m, names, noInvented, type ExamEnv, type ExamScenario, type ExamTurn, type Mark, type TurnSeen } from './investigation';

export const PACK_SITE = 'Exam site';
export const PACK_AREA = 'Packing hall';
export const LINE_1 = 'Packing Line 1';
export const LINE_2 = 'Packing Line 2';

/* ------------------------------------------------------------ reading the records */
const lower = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : Array.isArray(v) ? JSON.stringify(v) : '').toLowerCase();
const has = (v: unknown, re: RegExp) => re.test(lower(v));

async function projectLines(id: string): Promise<string[]> {
  const p = (await allProjects()).find(x => x.id === id);
  const jl = await allPaceLines();
  return [...(p?.workspaceIds ?? []), ...jl.filter(l => !l.deletedAt && l.projectId === id).map(l => l.workspaceId)].filter((x): x is string => !!x);
}
/** Projects made since the run began (setup kept the ones there before), with their lines. */
async function newProjects(env: ExamEnv) {
  const before = new Set<string>(JSON.parse(env.ids.projectsBefore ?? '[]') as string[]);
  const made = (await allProjects()).filter(p => !before.has(p.id) && !(p as { deletedAt?: number }).deletedAt);
  return Promise.all(made.map(async p => ({ p, lines: await projectLines(p.id) })));
}
const investigationOf = async (env: ExamEnv) => (await newProjects(env)).filter(x => x.lines.includes(env.ids.line1));
/** The stops timed on a line since the run began. */
const stopsOn = async (lineId: string, since: number) => (await listObservations(lineId)).filter(o => !o.deletedAt && o.startedAt >= since);
/** The problems raised on a line since the run began. */
const problemsOn = async (lineId: string, since: number) => (await listAllSnags()).filter(s => s.workspaceId === lineId && !(s as { deletedAt?: number }).deletedAt && s.raisedAt >= since);
/** The charter drafts in the exam's conversations. */
async function charterDrafts(env: ExamEnv): Promise<ColleagueDraft[]> {
  const all = await listAllStudies();
  return env.conversations.flatMap(id => { const s = all.find(x => x.id === id); return s ? draftsOf(s).filter(d => d.kind === 'doc' && d.key === 'charter') : []; });
}
/** The charter documents made since the run began. */
const charterRecords = async (since: number) => (await listAllStudies()).filter(s => s.tool === 'doc' && !s.deletedAt && (s.agreed as { doc?: { def?: string } } | undefined)?.doc?.def === 'charter' && s.createdAt >= since);
const docValue = (s: ToolStudy, id: string) => (s.facts as { docValues?: Record<string, unknown> }).docValues?.[id];
const draftValue = (d: ColleagueDraft, id: string): DraftValue | undefined => d.values[id]?.value;
/** The method sheet's answers on the investigation (project notes, one a question). */
async function methodAnswers(projectId: string): Promise<{ key: string; text: string }[]> {
  return (await listTestItems(projectId)).filter(x => x.kind === 'note' && !x.deletedAt && typeof x.testId === 'string' && x.testId.includes(':')).map(x => ({ key: x.testId as string, text: x.what ?? '' }));
}

/** Where the charter's words are now: the made record if there is one, else the newest draft — with which it is. */
async function charterNow(env: ExamEnv): Promise<{ where: 'record' | 'draft' | 'none'; get: (id: string) => unknown; draft?: ColleagueDraft; record?: ToolStudy }> {
  const recs = await charterRecords(env.since);
  if (recs.length) { const r = recs.sort((a, b) => b.updatedAt - a.updatedAt)[0]; return { where: 'record', get: id => docValue(r, id), record: r }; }
  const ds = await charterDrafts(env);
  if (ds.length) { const d = ds[ds.length - 1]; return { where: 'draft', get: id => draftValue(d, id), draft: d }; }
  return { where: 'none', get: () => undefined };
}
/** The reported "about an hour" never stands as a measured baseline: absent, or said to be the operators' / reported / estimated. */
function baselineHonest(c: Awaited<ReturnType<typeof charterNow>>): { ok: boolean; said: string } {
  const b = c.get('baseline');
  const how = lower(c.get('baselineHow'));
  const entryHow = c.draft?.values.baseline?.how;
  if (b === undefined || b === '') return { ok: true, said: 'no baseline written — none is measured yet' };
  const flagged = /operator|reported|reckon|estimate|said|not measured|anecdot|unverified|to be measured|to measure/.test(how) || entryHow === 'reported' || entryHow === 'estimated';
  return flagged ? { ok: true, said: `baseline ${String(b)} written and said to be reported (${how.slice(0, 80) || entryHow})` } : { ok: false, said: `baseline ${String(b)} written as if measured (how: “${how.slice(0, 80)}”${entryHow ? `, kept as ${entryHow}` : ''})` };
}


/* ------------------------------------------------------------ the conversation */
const BUILD = ['start_draft', 'fill_draft', 'adapt_draft', 'make_record', 'answer_method', 'record_observation', 'keep_task', 'update_context', 'link_to_project', 'set_focus', 'park_focus'];

export const PACKING: readonly ExamTurn[] = [
  {
    id: 'opening', scenario: 'Understanding the problem from ordinary words',
    say: 'Luna, I want to investigate the packing line. We’re losing quite a bit of time around the bagger.',
    approve: ['update_context', 'keep_task', 'set_focus'],
    marks: s => [
      m('Looked in the factory for the line and the bagger', called(s, 'resolve', 'resolve_record', 'factory_map', 'find', 'plan_work', 'understand_task', 'line_state').length > 0, `she looked: ${names(called(s, 'resolve', 'resolve_record', 'factory_map', 'find', 'plan_work', 'understand_task', 'line_state'))}`, `she looked nowhere — ${names(s.steps)}`),
      m('Asked which packing line — two have a bagger', asks(s.reply) && (/line 1/i.test(s.reply) && /line 2/i.test(s.reply) || /which (one|line|bagger)/i.test(s.reply)), 'she asked which, naming the choice', `she did not ask which line: “${s.reply.slice(0, 180)}”`),
      m('Made nothing before the line was known', doneWrites(s).filter(u => !['update_context', 'keep_task', 'set_focus', 'set_position'].includes(u.name)).length === 0, 'no record made yet', `made before knowing the line: ${names(doneWrites(s))}`),
    ],
  },
  {
    id: 'which-line', scenario: 'Resolving the line and machine',
    say: 'Packing Line 1, in the packing hall — the one with the case packer. It’s got worse since we changed film supplier, about two weeks ago.',
    approve: ['update_context', 'keep_task', 'set_focus', 'record_observation'],
    marks: s => [
      m('Worked from Packing Line 1', called(s, 'resolve', 'resolve_record', 'update_context', 'understand_task', 'line_state', 'plan_work').length > 0 && /line 1/i.test(s.reply), 'she has Packing Line 1', `not on Packing Line 1: ${names(s.steps)} — “${s.reply.slice(0, 140)}”`),
      m('Proposed how to investigate it — a method or a first measurement', /dmaic|pdca|8d|a3|kaizen|investigat|time the stops|timing the stops|measure|stops/i.test(s.reply), 'she proposed an approach', `no approach proposed: “${s.reply.slice(0, 160)}”`),
      m('Kept the film-supplier change as something said, not a finding', !/(confirmed|proven|the cause is)/i.test(s.reply) || /reported|you said|operators|worth checking|check/i.test(s.reply), 'the film change kept as a lead to check', `the film change treated as proven: “${s.reply.slice(0, 160)}”`),
      noInvented(s),
    ],
  },
  {
    id: 'set-up', scenario: 'Creating the investigation',
    say: 'Sounds right. Set it up properly as an investigation and we’ll work inside it.',
    approve: ['start_project', 'work_within', ...BUILD],
    marks: s => [
      m('Started the investigation (on a card the person said yes to)', done(s, 'start_project').length > 0, 'the project was made', `no project made — ${names(called(s, 'start_project'))}${called(s, 'start_project').map(u => ` (${u.says.slice(0, 120)})`).join('')}`),
      m('Agreed to work within it', done(s, 'work_within').length > 0, 'Work within agreed', `Work within not asked — ${names(s.steps)}`),
    ],
    records: async env => {
      const ps = await investigationOf(env);
      const on2 = (await newProjects(env)).filter(x => x.lines.includes(env.ids.line2) && !x.lines.includes(env.ids.line1));
      return [
        m('One investigation on Packing Line 1', ps.length === 1, `“${ps[0]?.p.name}” — its method: ${ps[0]?.p.method ?? 'none'}`, `${ps.length} projects on Packing Line 1`),
        m('It has a method', !!ps[0]?.p.method, `method ${ps[0]?.p.method}`, 'no method on the project'),
        m('Nothing started on Packing Line 2', on2.length === 0, 'none on Line 2', `${on2.length} on Line 2`),
      ];
    },
  },
  {
    id: 'charter', scenario: 'Populating the investigation as it is said',
    say: 'Let’s get the charter going. The problem is the bagger on Line 1 keeps stopping — film jams and bags not opening. We measure it as bagger downtime, in minutes a shift. The operators reckon it’s about an hour a shift at the moment. We want it under 30 minutes a shift by the end of January. I’m leading it, and Mark Davies is sponsoring it.',
    approve: BUILD,
    marks: s => [
      m('Started filling the charter', done(s, 'start_draft', 'fill_draft', 'answer_method').length > 0, `she filled: ${names(done(s, 'start_draft', 'fill_draft', 'answer_method'))}`, `nothing filled — ${names(s.steps)}`),
      m('Asked for something the charter still needs', asks(s.reply) && /scope|team|sponsor|baseline|measur|date|who|out of scope|in scope/i.test(s.reply), 'she asked for what is missing', `asked nothing it still needs: “${s.reply.slice(-200)}”`),
      m('Did not take “about an hour” as measured', !/baseline (is|of) (60|an hour)|measured (at )?(60|an hour)/i.test(s.reply) || /reported|operators|reckon|estimate|not measured|measure it/i.test(s.reply), 'the hour said to be the operators’ estimate', `the hour taken as measured: “${s.reply.slice(0, 200)}”`),
      noInvented(s),
    ],
    records: async env => {
      const c = await charterNow(env);
      const ans = (await investigationOf(env))[0] ? await methodAnswers((await investigationOf(env))[0].p.id) : [];
      const prob = c.get('problem') ?? ans.find(a => /problem/.test(a.key))?.text;
      const base = baselineHonest(c);
      return [
        m('The charter is being written (a draft or the record)', c.where !== 'none', `the charter is a ${c.where}`, 'no charter draft or record'),
        m('Its problem says film jams and bags not opening', has(prob, /film/) && has(prob, /bag/), `problem: “${lower(prob).slice(0, 120)}”`, `problem: “${lower(prob).slice(0, 120) || 'empty'}”`),
        m('Its target is 30 (minutes a shift)', Number(c.get('target')) === 30, 'target 30', `target: ${String(c.get('target') ?? 'empty')}`),
        m('Its unit is minutes a shift', has(c.get('unit'), /min/), `unit: ${String(c.get('unit'))}`, `unit: ${String(c.get('unit') ?? 'empty')}`),
        m('The person is the lead; Mark Davies the sponsor', has(c.get('sponsor'), /mark/) , `sponsor: ${String(c.get('sponsor'))}, lead: ${String(c.get('lead') ?? '—')}`, `sponsor: ${String(c.get('sponsor') ?? 'empty')}`),
        m('The hour is not passed off as a measured baseline', base.ok, base.said, base.said),
      ];
    },
  },
  {
    id: 'correction', scenario: 'A correction, and more said',
    say: 'Sorry — Mark’s not the sponsor, it’s Priya Shah, the ops manager. Scope is just the bagger on Line 1, all three shifts. The filler and the case packer are out of scope.',
    approve: BUILD,
    marks: s => [
      m('Changed the charter, not started another', done(s, 'fill_draft', 'answer_method').length > 0 && done(s, 'start_draft').length === 0, `she changed it: ${names(done(s, 'fill_draft', 'answer_method'))}`, `${names(called(s, 'start_draft', 'fill_draft', 'answer_method'))}`),
    ],
    records: async env => {
      const c = await charterNow(env);
      const drafts = await charterDrafts(env);
      const earlier = c.draft?.values.sponsor?.earlier ?? [];
      return [
        m('The sponsor is Priya Shah now', has(c.get('sponsor'), /priya/), `sponsor: ${String(c.get('sponsor'))}`, `sponsor: ${String(c.get('sponsor') ?? 'empty')}`),
        m('Mark Davies kept as what it replaced, not lost', c.where !== 'draft' || earlier.some(e => has(e.value, /mark/)), 'Mark kept as the earlier value', `the earlier sponsor not kept (${JSON.stringify(earlier).slice(0, 80)})`),
        m('In scope: the bagger on Line 1', has(c.get('scopeIn'), /bagger/), `in scope: “${lower(c.get('scopeIn')).slice(0, 80)}”`, `in scope: “${lower(c.get('scopeIn')).slice(0, 80) || 'empty'}”`),
        m('Out of scope: the filler and the case packer', has(c.get('scopeOut'), /filler/) && has(c.get('scopeOut'), /case/), `out of scope: “${lower(c.get('scopeOut')).slice(0, 80)}”`, `out of scope: “${lower(c.get('scopeOut')).slice(0, 80) || 'empty'}”`),
        m('One charter, not two', drafts.length + (await charterRecords(env.since)).length <= 1 || (drafts.length === 1 && drafts[0].status === 'made'), 'one charter', `${drafts.length} drafts and ${(await charterRecords(env.since)).length} records`),
      ];
    },
  },
  {
    id: 'interruption', scenario: 'A change of subject',
    say: 'Oh — while I think of it, the labeller on Line 2 has been printing the wrong date code since this morning. Can you log that as a problem?',
    approve: ['raise_problem', 'resolve', 'set_focus', 'park_focus', 'update_context', 'keep_task'],
    marks: s => [
      m('Raised it as a problem (on a card)', done(s, 'raise_problem').length > 0, 'the problem was raised', `not raised — ${names(called(s, 'raise_problem'))}${called(s, 'raise_problem').map(u => ` (${u.says.slice(0, 120)})`).join('')}`),
    ],
    records: async env => {
      const p2 = await problemsOn(env.ids.line2, env.since);
      const p1 = await problemsOn(env.ids.line1, env.since);
      const lab = env.ids.labeller2;
      const hit = p2.filter(p => /date/i.test(p.problem));
      return [
        m('One problem on Packing Line 2 about the date code', hit.length === 1, `“${hit[0]?.problem.slice(0, 100)}”`, `${hit.length} such problems on Line 2 (${p2.map(p => p.problem.slice(0, 40)).join(' | ') || 'none'})`),
        m('On the Labeller', hit.some(p => p.assetId === lab || /labeller/i.test(p.targetAsset ?? '') || /labeller/i.test(p.problem)), 'on the Labeller', `machine: ${hit.map(p => p.assetId ?? p.targetAsset ?? 'none').join(', ') || 'no problem'}`),
        m('Nothing put on Packing Line 1 for it', !p1.some(p => /date/i.test(p.problem)), 'Line 1 untouched', 'a date-code problem on Line 1'),
      ];
    },
  },
  {
    id: 'back', scenario: 'Returning to the original investigation',
    say: 'Right, back to the bagger. Where are we with the charter?',
    approve: BUILD,
    marks: s => [
      m('Came back to the bagger investigation', /bagger|charter/i.test(s.reply), 'back on the bagger', `not back on it: “${s.reply.slice(0, 160)}”`),
      m('Gave the sponsor as Priya, not Mark', /priya/i.test(s.reply) || !/sponsor/i.test(s.reply), 'Priya, as corrected', `the sponsor said wrong: “${s.reply.slice(0, 200)}”`),
    ],
    records: async env => {
      const c = await charterNow(env);
      return [m('The charter still holds what was said before the interruption', has(c.get('sponsor'), /priya/) && Number(c.get('target')) === 30 && has(c.get('scopeOut'), /filler/), 'nothing lost', `sponsor ${String(c.get('sponsor'))}, target ${String(c.get('target'))}, out ${lower(c.get('scopeOut')).slice(0, 40)}`)];
    },
  },
  {
    id: 'state-missing', scenario: 'Knowing what is still missing',
    say: 'What else do you need from me to finish it?',
    approve: BUILD,
    marks: s => [m('Named what is still missing', asks(s.reply) || /need|missing|still/i.test(s.reply), 'she said what is still needed', `nothing named: “${s.reply.slice(0, 160)}”`)],
    records: async env => {
      const c = await charterNow(env);
      const need = c.draft ? missing(c.draft).map(f => f.label) : [];
      return [m('What she can name is what the draft is missing', c.where !== 'draft' || need.length > 0, `the draft is missing: ${need.join(', ') || 'nothing'}`, 'no draft to read')];
    },
  },
  {
    id: 'timing', scenario: 'Starting real measurement',
    say: 'Let’s start timing the bagger stops now so we’ve got real numbers, not the operators’ guess.',
    approve: ['start_measurement', 'set_position', 'keep_task', 'update_context', 'start_study'],
    marks: s => [m('Started timing the stops on Packing Line 1', done(s, 'start_measurement').some(u => (u.input as { lineId?: string } | undefined)?.lineId === s.ids.line1), 'the stops are timed on Line 1', `not on Line 1 — ${names(called(s, 'start_measurement', 'start_study'))}`)],
  },
  {
    id: 'stop', scenario: 'Measured evidence',
    say: 'Bagger’s stopped — film jam.',
    approve: ['capture_event'],
    marks: s => [m('Captured the stop', done(s, 'capture_event').length > 0, 'captured', `not captured — ${names(s.steps)}`)],
    records: async env => {
      /* a stop being timed is the line's running stopwatch (Workspace.activeTimer) until "running again" makes it an observation —
         the product's design (capabilities/connectors/measure), so either is the stop captured (fixed 11 November: marked the timer as none) */
      const st = await stopsOn(env.ids.line1, env.since);
      const timer = (await listWorkspaces()).find(w => w.id === env.ids.line1)?.activeTimer;
      const timing = !!timer && /bagger/i.test(timer.asset) && timer.startedAt >= env.since;
      return [m('A stop on the Bagger on Packing Line 1 (being timed, or timed)', timing || st.some(o => /bagger/i.test(o.asset)),
        timing ? `being timed: ${timer?.asset} · ${timer?.category}` : `${st.length} stop(s): ${st.map(o => `${o.asset} · ${o.category}`).join(' | ')}`,
        `stops on Line 1: ${st.map(o => `${o.asset} · ${o.category}`).join(' | ') || 'none'}, nothing being timed`)];
    },
  },
  {
    id: 'running', scenario: 'Measured evidence',
    say: 'It’s running again.',
    approve: ['capture_event'],
    marks: s => [m('Ended the stop', done(s, 'capture_event').length > 0, 'the stop ended', `not ended — ${names(s.steps)}`)],
    records: async env => {
      const st = (await stopsOn(env.ids.line1, env.since)).filter(o => /bagger/i.test(o.asset));
      return [m('The stop has a duration', st.some(o => o.durationMs > 0), `${st.map(o => `${Math.round(o.durationMs / 1000)} s`).join(', ')}`, 'no timed stop')];
    },
  },
  {
    id: 'correct-stop', scenario: 'A correction to measured evidence',
    say: 'Actually that one was the bags not opening, not a film jam.',
    approve: ['correct_capture'],
    marks: s => [m('Corrected the stop, not added another', done(s, 'correct_capture').length > 0 && done(s, 'capture_event').length === 0, 'corrected in place', `${names(s.steps)}`)],
    records: async env => {
      const st = (await stopsOn(env.ids.line1, env.since)).filter(o => /bagger/i.test(o.asset));
      const words = (o: (typeof st)[number]) => `${o.category} ${o.subcategory ?? ''} ${(o as { note?: string }).note ?? ''}`;
      return [
        m('One stop on the Bagger, not two', st.length === 1, '1 stop', `${st.length} stops`),
        m('Its reason is the bags not opening', st.some(o => /open/i.test(words(o))) && !st.some(o => /film/i.test(words(o))), `reason: ${st.map(words).join(' | ')}`, `reason: ${st.map(words).join(' | ') || 'none'}`),
      ];
    },
  },
  {
    id: 'reported-vs-measured', scenario: 'Reported against measured',
    say: 'So that confirms it’s costing us about an hour a shift — put that in the charter as the baseline.',
    approve: BUILD,
    marks: s => [m('Said one short stop does not confirm an hour a shift', /not (yet )?(confirm|enough|measured)|one stop|a few seconds|seconds|too early|can.t confirm|doesn.t confirm|reported|estimate/i.test(s.reply), 'she said it is not yet measured', `she did not challenge it: “${s.reply.slice(0, 200)}”`)],
    records: async env => { const b = baselineHonest(await charterNow(env)); return [m('The baseline is not written as measured', b.ok, b.said, b.said)]; },
  },
  {
    id: 'next-day', scenario: 'Recovering incomplete work — the next day, a new conversation',
    nextDay: true,
    say: 'Morning Luna. Let’s pick up the bagger investigation on Packing Line 1 — what have we got, and what’s still outstanding?',
    approve: [],
    marks: s => [
      m('Looked it up from the records', called(s, 'recall', 'task_state', 'project_state', 'read_record', 'resolve_record', 'line_state', 'measurement_state', 'draft_state', 'find').length > 0, `she looked: ${names(called(s, 'recall', 'task_state', 'project_state', 'read_record', 'resolve_record', 'line_state', 'measurement_state', 'draft_state', 'find'))}`, `looked nothing up — ${names(s.steps)}`),
      m('Found the investigation and the stop timed', /bagger/i.test(s.reply) && /stop/i.test(s.reply), 'she has the investigation and its stop', `not found: “${s.reply.slice(0, 180)}”`),
      m('Knew the charter is unfinished', /charter/i.test(s.reply), 'the charter mentioned', `the charter not mentioned: “${s.reply.slice(0, 180)}”`),
      m('Said what is next', /next|outstanding|still|need|to do/i.test(s.reply), 'what is outstanding said', 'nothing outstanding said'),
    ],
  },
  {
    id: 'finish', scenario: 'Completing and saving the work',
    say: 'Let’s finish the charter then. Deadline is the 31st of January. Team is me, Priya, and Tom Reed from engineering. Then save it.',
    approve: ['make_record', ...BUILD, 'resolve_record', 'draft_state'],
    marks: s => [m('Made the charter a record (on a card)', done(s, 'make_record').length > 0, 'made', `not made — ${names(called(s, 'make_record', 'start_draft', 'fill_draft'))}${called(s, 'make_record', 'fill_draft', 'start_draft').filter(u => u.status !== 'done').map(u => ` (${u.says.slice(0, 120)})`).join('')}`)],
  },
];

/* ------------------------------------------------------------ the practice factory */
async function ensurePackLine(all: readonly Workspace[], name: string, machines: readonly string[]): Promise<Workspace> {
  let ws = all.find(w => w.name === name && w.clientName === EXAM_CLIENT && !w.archived);
  if (!ws) {
    ws = await addLineToFactory(name, 'Packing');
    ws = (await patchWorkspaceRecord(ws.id, { clientName: EXAM_CLIENT, siteName: PACK_SITE, areaName: PACK_AREA })) ?? ws;
  }
  for (const mc of machines) await addMachineToLine(ws.id, mc);
  return ws;
}

/* ------------------------------------------------------------ the audit, once every turn is said */
async function audit(env: ExamEnv): Promise<Mark[]> {
  const out: Mark[] = [];
  const ps = await investigationOf(env);
  const all = await newProjects(env);
  out.push(m('One investigation, on Packing Line 1', ps.length === 1 && all.length === 1, `“${ps[0]?.p.name}” (${ps[0]?.p.method ?? 'no method'})`, `${ps.length} on Line 1, ${all.length} made in all`));
  const recs = await charterRecords(env.since);
  const c = recs[0];
  const g = (id: string) => (c ? docValue(c, id) : undefined);
  /* where the charter's words went when no charter was made — the DMAIC Define sheet's answers, said beside the failure (11 November:
     every run wrote the charter into the sheet; the content is shown so a reader can tell a wrong route from a lost fact) */
  const sheet = ps[0] ? (await methodAnswers(ps[0].p.id)).filter(a => a.text.trim()) : [];
  const sheetSaid = sheet.length ? ` — the Define sheet holds ${sheet.length}: ${sheet.map(a => `${a.key.split(':').pop()} “${a.text.replace(/\s+/g, ' ').slice(0, 90)}”`).join(' · ')}` : ' — and nothing in the Define sheet';
  out.push(m('The charter is a record', recs.length === 1, `“${c?.name}”`, `${recs.length} charter records${recs.length ? '' : sheetSaid}`));
  out.push(m('The charter is in the investigation or on Packing Line 1', !!c && (c.projectId === ps[0]?.p.id || c.workspaceId === env.ids.line1), `project ${c?.projectId === ps[0]?.p.id ? 'yes' : 'no'}, line ${c?.workspaceId === env.ids.line1 ? 'Line 1' : c?.workspaceId ?? 'none'}`, `on project ${c?.projectId ?? 'none'}, line ${c?.workspaceId ?? 'none'}`));
  out.push(m('Problem: film jams and bags not opening', has(g('problem'), /film/) && has(g('problem'), /bag/), `“${lower(g('problem')).slice(0, 100)}”`, `“${lower(g('problem')).slice(0, 100) || 'empty'}”`));
  out.push(m('Target 30, in minutes a shift', Number(g('target')) === 30 && has(g('unit'), /min/), `30 ${String(g('unit'))}`, `target ${String(g('target') ?? 'empty')}, unit ${String(g('unit') ?? 'empty')}`));
  out.push(m('By 31 January', has(g('by'), /-01-31|31 jan/), String(g('by')), `by: ${String(g('by') ?? 'empty')}`));
  out.push(m('Sponsor Priya Shah (the correction held)', has(g('sponsor'), /priya/) && !has(g('sponsor'), /mark/), String(g('sponsor')), `sponsor: ${String(g('sponsor') ?? 'empty')}`));
  out.push(m('Scope in: the bagger; out: the filler and case packer', has(g('scopeIn'), /bagger/) && has(g('scopeOut'), /filler/) && has(g('scopeOut'), /case/), 'scope as said', `in “${lower(g('scopeIn')).slice(0, 50)}”, out “${lower(g('scopeOut')).slice(0, 50)}”`));
  out.push(m('Team includes Tom Reed and Priya', has(g('team'), /tom/) && has(g('team'), /priya/), lower(g('team')).slice(0, 100), `team: ${lower(g('team')).slice(0, 100) || 'empty'}`));
  const b = baselineHonest({ where: c ? 'record' : 'none', get: g, ...(c ? { record: c } : {}) });
  out.push(m('The baseline is not passed off as measured', b.ok, b.said, b.said));
  const st = (await stopsOn(env.ids.line1, env.since)).filter(o => /bagger/i.test(o.asset));
  out.push(m('One timed stop on the Bagger, its reason the bags not opening', st.length === 1 && st[0].durationMs > 0 && /open/i.test(`${st[0].category} ${st[0].subcategory ?? ''}`), st.map(o => `${o.category} · ${Math.round(o.durationMs / 1000)} s`).join(''), `${st.length} stops: ${st.map(o => `${o.category} · ${Math.round(o.durationMs / 1000)} s`).join(' | ')}`));
  const p2 = (await problemsOn(env.ids.line2, env.since)).filter(p => /date/i.test(p.problem));
  out.push(m('One date-code problem on Packing Line 2', p2.length === 1, `“${p2[0]?.problem.slice(0, 80)}”`, `${p2.length}`));
  /* nothing written anywhere else: no stop or problem on any line but the two, made during the run */
  const others = (await listWorkspaces()).filter(w => w.id !== env.ids.line1 && w.id !== env.ids.line2);
  let stray = 0;
  for (const w of others) stray += (await stopsOn(w.id, env.since)).length + (await problemsOn(w.id, env.since)).length;
  out.push(m('Nothing written on any other line', stray === 0, 'no other line touched', `${stray} stops or problems on other lines`));
  return out;
}

export const PACKING_EXAM: ExamScenario = {
  key: 'packing', title: 'The packing-line investigation', turns: PACKING,
  setup: async () => {
    const all = await listWorkspaces();
    const l1 = await ensurePackLine(all, LINE_1, ['Filler', 'Bagger', 'Checkweigher', 'Case packer']);
    const l2 = await ensurePackLine(all, LINE_2, ['Bagger', 'Labeller']);
    const labeller = await machineRecordFor(l2.id, 'Labeller');
    return { line1: l1.id, line2: l2.id, labeller2: labeller.id, projectsBefore: JSON.stringify((await allProjects()).map(p => p.id)) };
  },
  audit,
};
export type { TurnSeen };
