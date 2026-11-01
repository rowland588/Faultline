/* A METHOD'S OWN SHEET — what the method itself asks, written in the project (docs/METHODS.md §16 — Rowland, 1 November 2026:
 * "I asked you to build the method and insert the tools where required"; 31 October: "build methods first … and we simply
 * insert the tools where required").
 *
 * A method is not a list of tools. It is the questions it asks, in its order: PDCA's plan is the number, the gap, the cause
 * suspected, the change and the effect expected, written before; the A3 is its boxes; the 8D is D0 to D8; Kata is the
 * challenge, the current and the target condition and the experiments. This module is those questions, once, for the seven
 * methods that are worked in words (the stage gate keeps its own screens — Install, Commission, Hand over). Each question is a
 * FIELD with the words a person reads, a hint, and — where a tool is what answers it — the tools that fall in there
 * (catalogue ids): the tool is offered at that question, never required, and a question is answered in words whether or not a
 * tool was used.
 *
 * Where it is kept: an answer is a project note whose scope is `method:<method>:<field>` (lib/noteScope, the same place a day's
 * commentary is kept as `day:<date>`), so it is the project's, syncs with it, is read by whoever can read the project and
 * written by whoever can edit it — no new record and no new column. The notes screens do not list it as a meeting note.
 * Pure. */
import type { MethodKey } from './methods';

export interface SheetField {
  /** Stable, lower-case, unique within its method. Kept in the answer's scope — never rename one. */
  id: string;
  /** The question, as a person reads it. */
  label: string;
  /** One line on what a good answer holds. */
  hint: string;
  /** A short line (a number, a name, a date) rather than a paragraph. */
  line?: boolean;
  /** The catalogue tools that answer it, offered beside it — never required (FC ids). */
  tools?: readonly string[];
}
/** The fields of each section, by the method's own section name (lib/methods). */
export type SheetSections = Readonly<Record<string, readonly SheetField[]>>;

const f = (id: string, label: string, hint: string, o: { line?: boolean; tools?: readonly string[] } = {}): SheetField => ({ id, label, hint, ...o });

export const SHEETS: Partial<Record<MethodKey, SheetSections>> = {
  pdca: {
    Plan: [
      f('number', 'The number we are improving', 'One measure, in its unit — packs a minute, rejects a shift, minutes lost.', { line: true, tools: ['FC-094', 'FC-049'] }),
      f('gap', 'Where it is, and where it should be', 'Today’s figure, the figure wanted, and the gap between them.', { tools: ['FC-154', 'FC-049'] }),
      f('cause', 'The cause we suspect, and why', 'What you think is making the gap, and what you have seen that says so.', { tools: ['FC-125', 'FC-146'] }),
      f('change', 'The change we will make', 'One change, small enough to try — what, where, on which line.'),
      f('expect', 'The effect we expect, in the number', 'Written before the change: how far should the number move?', { line: true }),
    ],
    Do: [
      f('who', 'Who does what, by when', 'The people and the days. It lands on the project’s Actions.', { tools: ['FC-194'] }),
      f('small', 'How small we start', 'One shift, one line, one product — the size of the trial.'),
      f('seen', 'What we saw while doing it', 'Surprises, what went differently from the plan.'),
    ],
    Check: [
      f('result', 'The number now, against before', 'The same measure, the same way — before and after.', { tools: ['FC-105', 'FC-086'] }),
      f('predicted', 'Against what we predicted', 'Did it move as far as you wrote down in Plan?'),
      f('beyond', 'Beyond the noise? How we know', 'Why the movement is the change and not ordinary variation.', { tools: ['FC-105', 'FC-086'] }),
    ],
    Act: [
      f('standard', 'Made the standard — where it is written', 'The procedure, line standard or checklist that now says it.', { tools: ['FC-007', 'FC-013'] }),
      f('trained', 'Who was trained', 'The people and the shifts, and the day.'),
      f('spread', 'Other lines to offer it to', 'Where the same machine or problem is.', { tools: ['FC-155'] }),
      f('again', 'Or: the next cycle’s change', 'If it did not hold or did not go far enough — what you plan next.'),
    ],
  },
  dmaic: {
    Define: [
      f('problem', 'The problem', 'What is wrong, where, since when — in a sentence a customer would recognise.', { tools: ['FC-142'] }),
      f('customer', 'The customer’s requirement', 'What they need, in their words.', { tools: ['FC-140'] }),
      f('ctq', 'The measure that matters (CTQ)', 'The one characteristic, its unit and its limits.', { line: true, tools: ['FC-140'] }),
      f('scope', 'Scope — in and out', 'Which line, product and process are in; what is deliberately out.', { tools: ['FC-139'] }),
      f('goal', 'The goal', 'The figure wanted, and the date.', { line: true }),
      f('worth', 'What it is worth', 'In pounds a year, and how that was worked out.', { tools: ['FC-128', 'FC-191'] }),
      f('team', 'The team', 'Sponsor, process owner, who does the work.', { line: true }),
    ],
    Measure: [
      f('baseline', 'The baseline of the measure', 'Today’s figure over a stretch long enough to see its pattern.', { tools: ['FC-094', 'FC-086'] }),
      f('gauge', 'The gauge proved fit — how', 'How you know the measurement can be trusted.', { tools: ['FC-118', 'FC-119'] }),
      f('capability', 'Baseline capability', 'How well the process meets its limits today.', { tools: ['FC-094', 'FC-095'] }),
    ],
    Analyse: [
      f('causes', 'Root causes found, and the data that shows each', 'Each cause with the evidence — not opinion.', { tools: ['FC-125', 'FC-146', 'FC-105'] }),
      f('vital', 'The vital few', 'The one to three causes that carry most of the problem.', { tools: ['FC-153'] }),
    ],
    Improve: [
      f('solutions', 'Solutions considered, and how one was chosen', 'The options and the criteria — Pugh, impact against effort.', { tools: ['FC-143', 'FC-144'] }),
      f('pilot', 'The pilot, and its result on the measure', 'What was tried, where, and what the measure did.', { tools: ['FC-105', 'FC-111'] }),
    ],
    Control: [
      f('plan', 'The control plan', 'What is checked, how often, by whom, and what is done when it drifts.', { tools: ['FC-086', 'FC-132'] }),
      f('standard', 'The standard that holds it', 'Where the new way is written.', { tools: ['FC-007'] }),
      f('handover', 'Handed over to', 'The process owner, and the day.', { line: true }),
    ],
  },
  'eight-d': {
    'D0–D1  Symptom, emergency response, team': [
      f('symptom', 'The symptom', 'What was reported, by whom, when.'),
      f('response', 'The emergency response', 'What was done at once to protect the customer.'),
      f('team', 'The team', 'Who is on it, and who leads.', { line: true }),
    ],
    'D2  Describe the problem': [
      f('is', 'What it is — what, where, when, how much', 'The facts, as measured.'),
      f('isnot', 'What it is not', 'What could have been wrong but is not — it narrows the cause.'),
    ],
    'D3  Contain': [
      f('contain', 'Containment', 'Product held, sorted or reworked; who checked, and how many.'),
      f('worked', 'Checked that it works', 'How you know nothing more is reaching the customer.'),
    ],
    'D4  Root cause and escape point': [
      f('why', 'Why it happened', 'The root cause, with the evidence.', { tools: ['FC-125', 'FC-146', 'FC-147'] }),
      f('escape', 'Why it was not caught', 'The escape point — the check that should have found it.', { tools: ['FC-146'] }),
      f('verified', 'Verified', 'How the cause was proved on and off — switched on, switched off.'),
    ],
    'D5–D6  Corrective action, implemented and validated': [
      f('action', 'The permanent corrective action', 'What was chosen and why.', { tools: ['FC-143', 'FC-194'] }),
      f('validated', 'Validated on the number', 'The measure after the action.', { tools: ['FC-105', 'FC-086'] }),
    ],
    'D7  Prevent recurrence': [
      f('system', 'What changed in the system', 'FMEA, control plan, standard — and the other lines it applies to.', { tools: ['FC-132', 'FC-007', 'FC-155'] }),
    ],
    'D8  Close': [
      f('evidence', 'Evidence for each discipline', 'Where it is kept.'),
      f('recognised', 'The team recognised', 'Who, and how.', { line: true }),
      f('sent', 'The report sent to', 'Whom, and on what day.', { line: true }),
    ],
  },
  a3: {
    Background: [
      f('why', 'Why it matters', 'The gap in the business’s number, and what it costs.', { tools: ['FC-154', 'FC-128'] }),
    ],
    'Current condition': [
      f('current', 'The facts, drawn, with the number', 'What is happening now — measured, not remembered.', { tools: ['FC-001', 'FC-049', 'FC-094'] }),
    ],
    Target: [
      f('target', 'The number wanted, by when', 'One measure, its figure and its date.', { line: true }),
    ],
    Analysis: [
      f('root', 'The root cause, with the evidence', 'Five whys or fishbone — and the data under it.', { tools: ['FC-146', 'FC-147', 'FC-125'] }),
    ],
    Countermeasures: [
      f('counter', 'What, who, by when, against which cause', 'Each countermeasure tied to a cause it answers.', { tools: ['FC-194', 'FC-143'] }),
    ],
    'Plan and follow-up': [
      f('plan', 'The steps', 'In order, with dates.', { tools: ['FC-194'] }),
      f('followup', 'The number checked — did it hold?', 'The follow-up date and what it showed.', { tools: ['FC-105', 'FC-086'] }),
    ],
  },
  'kaizen-event': {
    Prepare: [
      f('charter', 'The charter', 'The problem, the goal for the week, the scope.', { tools: ['FC-142'] }),
      f('team', 'The team', 'Who is released for the week.', { line: true }),
      f('baseline', 'The baseline', 'The measure on day one.', { tools: ['FC-019', 'FC-051'] }),
    ],
    Observe: [
      f('waste', 'The waste seen on the floor', 'What the team watched — waiting, walking, rework — with the numbers.', { tools: ['FC-001', 'FC-019', 'FC-199'] }),
    ],
    Improve: [
      f('tried', 'Changes tried in the week, and measured', 'Each change and what the measure did.', { tools: ['FC-105'] }),
    ],
    Standardise: [
      f('written', 'The new way, written', 'Where it is, and who has been trained.', { tools: ['FC-007'] }),
    ],
    Sustain: [
      f('open', 'Open actions to the 30-day check', 'Who owes what, by when.', { tools: ['FC-194'] }),
      f('holding', 'Is the gain still holding?', 'The measure at 30 days.', { tools: ['FC-086'] }),
    ],
  },
  kata: {
    'Understand the direction': [
      f('challenge', 'The challenge', 'A measurable aim months out, and why it matters.', { line: true }),
    ],
    'Grasp the current condition': [
      f('current', 'The process as it is — its pattern', 'Measured: the spread and the pattern, not the average.', { tools: ['FC-086', 'FC-094', 'FC-049'] }),
    ],
    'Establish the next target condition': [
      f('target', 'The target condition, and its date', 'A described state of the process a few weeks away — not a solution.'),
      f('obstacles', 'The obstacles in the way', 'What stands between today and that state, in the order you will take them.'),
    ],
    'Experiment toward it': [
      f('step', 'The next step', 'One small step.'),
      f('prediction', 'What we expect', 'Written before the step.'),
      f('result', 'What happened, and what we learned', 'After the step — the next step comes from this.', { tools: ['FC-105'] }),
    ],
  },
  toc: {
    'Identify the constraint': [
      f('constraint', 'The constraint', 'The one station or machine that limits the output.', { line: true, tools: ['FC-034', 'FC-038'] }),
      f('real', 'Real or a mirage — how we know', 'Whether a lost minute here costs the whole line a minute.', { tools: ['FC-034'] }),
    ],
    'Exploit it': [
      f('losses', 'What is lost at the constraint', 'Stops, slow running, changeovers, idle time — in minutes and packs.', { tools: ['FC-049', 'FC-056', 'FC-051'] }),
      f('exploit', 'What we will do to lose nothing', 'The actions, who and when.', { tools: ['FC-039', 'FC-194'] }),
    ],
    'Subordinate the rest': [
      f('rules', 'The rules the rest of the line works to', 'Buffers, release, schedule — written down.', { tools: ['FC-043', 'FC-179', 'FC-046'] }),
    ],
    'Elevate it': [
      f('option', 'The option, and its worth', 'More people, capacity or a faster machine — what it adds and when it pays back.', { tools: ['FC-191', 'FC-034'] }),
    ],
    'Go again': [
      f('moved', 'Where the constraint is now', 'The new constraint, and what to protect from the old one.', { tools: ['FC-034'] }),
    ],
  },
};

/** The fields of a method's section, none when the method keeps its own screens or a section is not here. */
export const fieldsOf = (method: MethodKey, section: string): readonly SheetField[] => SHEETS[method]?.[section] ?? [];

/** Does a method have a sheet of its own to write in? */
export const hasSheet = (method: MethodKey): boolean => !!SHEETS[method];

const PREFIX = 'method:';
/** The scope an answer is kept under (a project note's `testId`). */
export const answerScope = (method: MethodKey, field: string): string => `${PREFIX}${method}:${field}`;
/** Is this note an answer of a method's sheet — never a meeting note. */
export const isMethodAnswer = (testId: string | undefined): boolean => !!testId && testId.startsWith(PREFIX);
/** Which method and field an answer is for. */
export const answerOf = (testId: string): { method: string; field: string } | undefined => {
  if (!isMethodAnswer(testId)) return undefined;
  const [method, ...rest] = testId.slice(PREFIX.length).split(':');
  const field = rest.join(':');
  return method && field ? { method, field } : undefined;
};

export interface SectionState {
  fields: number;
  written: number;
  /** In words — never colour alone. */
  word: 'Not started' | 'Under way' | 'All written';
}
/** How far a section is written, from the answers held (field id → words). A blank answer is not written. */
export function sectionState(method: MethodKey, section: string, answers: Readonly<Record<string, string>>): SectionState {
  const fs = fieldsOf(method, section);
  const written = fs.filter(x => (answers[x.id] ?? '').trim() !== '').length;
  return { fields: fs.length, written, word: !fs.length || written === 0 ? 'Not started' : written === fs.length ? 'All written' : 'Under way' };
}
