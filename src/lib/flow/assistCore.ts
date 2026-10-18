/* THE GATEWAY'S RULES, WITHOUT THE NETWORK — what the assistant is told,
 * how its answer is read, what it costs, and when a person has used their
 * day's allowance (slice 4; supabase/functions/assist runs these, copied by
 * scripts/sync-assist.mjs, and the tests run them on recorded answers).
 *
 * The assistant designs; it never decides. Its answer is a proposal
 * (lib/flow/proposal) read into a definition and checked by the validator on
 * the server and again on the device; a person keeps it as a draft and
 * approves it like any other. It computes nothing a project depends on. */
import { fromProposal, type Proposed } from './proposal';
import { COMPONENTS } from './components';
import { BLOCK_CATALOGUE } from './analysis';
import { validateDefinition, type Issue } from './validate';

/** $ per million tokens, input and output (the claude-api reference, 6 October 2026). */
export const PRICES: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-fable-5-1': [10, 50],
};

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** What one answer cost, in millionths of a dollar — cache reads at a tenth,
 *  cache writes at a quarter more, as the API bills them. An unknown model
 *  is priced as the dearest, so a budget never runs over by a mistake. */
export function costMicros(model: string, u: Usage): number {
  const [inP, outP] = PRICES[model] ?? [10, 50];
  const cached = u.cache_read_input_tokens ?? 0, written = u.cache_creation_input_tokens ?? 0;
  const dollars = ((u.input_tokens ?? 0) * inP + cached * inP * 0.1 + written * inP * 1.25 + (u.output_tokens ?? 0) * outP) / 1_000_000;
  return Math.round(dollars * 1_000_000);
}

export interface Allowance { calls: number; micros: number }

/** May this person ask again today? Counted over the last 24 hours of their
 *  own answers, by number and by cost. */
export function allowance(rows: readonly { at: string | number; cost_micros: number | null }[], now: number, limit: Allowance): { ok: boolean; why?: string; used: Allowance } {
  const since = now - 86_400_000;
  const mine = rows.filter(r => (typeof r.at === 'number' ? r.at : Date.parse(r.at)) > since);
  const used = { calls: mine.length, micros: mine.reduce((n, r) => n + (r.cost_micros ?? 0), 0) };
  if (used.calls >= limit.calls) return { ok: false, why: `That is ${limit.calls} proposals in a day — the allowance comes back over the next 24 hours. Write the method by hand meanwhile.`, used };
  if (used.micros >= limit.micros) return { ok: false, why: `Today's allowance for the assistant is spent ($${(limit.micros / 1e6).toFixed(2)}). Write the method by hand meanwhile.`, used };
  return { ok: true, used };
}

/** The app's tools in words, from lib/flow/components — what the assistant
 *  may build a step on, and the numbers each gives back. */
const TOOLS_SAID = COMPONENTS.map(c => `  ${c.id} — ${c.name}: ${c.gives}.${c.figures.length ? ` Gives back: ${c.figures.map(f => `${f.label}${f.unit ? ` (${f.unit})` : ''}`).join(', ')}.` : ' Ticked by hand once looked at; gives back no numbers.'}`).join('\n');

/** The analysis blocks in words, from lib/flow/analysis — what a log's
 *  entries can be worked out by; a block written tomorrow is offered here
 *  the day it is written. */
const BLOCKS_SAID = BLOCK_CATALOGUE.map(b => `  ${b.id} — ${b.says}.${b.of === 'required' ? ` Needs of (a ${b.numeric ? 'number ' : ''}column).` : b.of === 'optional' ? ` of optional (a ${b.numeric ? 'number ' : ''}column; without it, it counts entries).` : ''}${b.by === 'required' ? ' Needs by (a words column: a choice, a reason, a person).' : ''}${b.when === 'required' ? ' Needs when (which entries it counts).' : b.when === 'optional' ? ' when optional.' : ''}${b.output === 'series' ? ' A picture only: no number for a gate or a measure.' : ''}`).join('\n');

/** WHAT THE ASSISTANT IS TOLD — the closed vocabulary in words, the app's
 *  tools, and the floor's rules (CLAUDE.md: measured by people, no OEE,
 *  plain British English). Kept word-for-word stable so it can be cached. */
export const DESIGN_SYSTEM = `You design methods for Faultline, a control room for change on factory production lines (food packing and similar). A method is how one kind of work is run: its stages, the steps in each, who does them, what each must show, and what each stage's gate needs before the work moves on. Your answer is a proposal a person will read, change and approve; it is never run until they approve it.

Write the method in the JSON shape you are given. Use only its choices:
- kind: stagegate (equipment or a change taken through gates to handover), investigation (finding a cause), improvement (making a running line better), other.
- roles: the people steps are given to, by job ("OEM fitter", "Site engineer", "Quality"), each the supplier's, the site's, or either.
- stages, in order. Each has steps and a gate. Three to seven stages is usual; three to ten steps in a stage.
- a step: a short title in plain words; per "machine" when it is done on every machine of the project, "line" when once for the job; its answer:
  done (a task: done, or it hit a problem), check (a test: passed or did not pass), paperwork (files or photos are the answer), signoff (someone signs; always names who), measure (numbers judged against limits), form (boxes filled in), log (many entries, each the step's columns — every stop, every reject, every reading over a week — worked out by its analyses);
  role: one of the roles' names, or "" for nobody; passes_if: what it must show, agreed before the day, or ""; photos and files: how many it needs (0 if none); due_days: days from the project's start, or null; after: titles of earlier steps it waits on; tool: one of the app's tools when the step is done with it (below), else ""; fields: boxes a person fills on the floor; help: one line on how to do it, or "".
- the app's tools. A step with a tool is answered by that tool's own record, made on the line; the numbers it gives back count as the step's boxes, by those names, for a gate condition or a measure. Prefer a tool whenever the work is what it does — timing a changeover, where a shift's time went, whether a process holds its limits, people's work against takt, what people are doing, the flow and its waits:
${TOOLS_SAID}
- a log: when the work is to record the same thing many times and work out what it adds up to, the step's answer is log. columns: what each entry asks (fields, below — a choice for a reason, a number for minutes or a count; a calc column works out from the same entry's numbers); analyses: each a label and a block from the list below, of (the column it works on, by its label, or ""), by (the column it groups by, or ""), when_column, when_op (= != >= <= > < or "") and when_value (which entries count, or all ""), unit or ""; min_entries: how many entries before the step can be done, or null. Every analysis that gives a number is a box of the step, by its label, for a gate condition or a measure — so a log built twice (before and after the change) feeds a measure's before and after, and a gate can wait on a log's figure. Build a log whenever no tool above does the work: this is how a new tool is made from blocks.
  The blocks:
${BLOCKS_SAID}
- needs: when what is asked needs arithmetic or analysis that neither a tool nor a block does (a reliability fit, a forecast, an optimisation, a statistical test not listed), do not imitate it with blocks that only look like it. Say it in needs — what is needed, why, from what inputs, by what method, and how it would be checked — and build the rest of the method on what exists. A need is work for development, shown on the method's page; it is never run.
- a field: label; type one of text, number, reading (a number with limits), date, choice (give options), yesno, person, calc (worked out by the app from the step's other numbers); unit or ""; min and max (null when not given); formula for calc only, naming the step's other fields by their label in lower case with underscores (e.g. "packs_made / minutes_run"), else ""; required.
- a gate condition: type one of stepsDone (every step in the stage done), stepDone (one step done; give step), evidence (a step has its photos or files; give step, evidence, min), signedOff (give a signoff step), fieldMeets (a measured field or a tool's number meets a figure; give step, field label, op, value, value2 for between), measureMet (a measure meets its target; give measure by its name — only a measure with a target), noOpenProblems (give priority), dateReached (give due_days), manual (a check confirmed by hand at the pass; give label). policy block when the gate must wait for it, warn when it may pass and say it was open. Fill unused parts with "" or null. Every stage should have at least stepsDone.
- measures: the numbers the work has to move, each with a before and an after — name, unit or "", better (higher or lower), target (null when not given), from: the steps (by title) and the box label or tool number that feeds it. The first reading is the before and the latest is now, so a method that improves something measures it early and again after the change (the same tool twice is usual). Any improvement or investigation has at least one measure; a stage gate may have none.

Rules:
- Everything is measured, counted, timed or photographed by a person. Nothing reads a machine. Never use OEE.
- Never invent a figure. If a limit, speed or count was not given, leave min/max or value null and ask for it in questions.
- Say in assumptions what you took for granted (at most eight, one line each); in questions what you would ask before it is used (at most five).
- Plain British English, the floor's words, no jargon, no headings in text fields.`;

/** The person's words, as the assistant is sent them. */
export const designUser = (description: string): string =>
  `Design a method for this work, in the person's own words:\n\n${description.trim().slice(0, 4000)}`;

/** A method as it stands and the change asked for, as the assistant is sent them. */
export const changeUser = (current: unknown, request: string): string =>
  `Here is the method as it stands, in the JSON shape you answer in:\n\n${JSON.stringify(current).slice(0, 60000)}\n\nChange it as the person asks, in their own words:\n\n${request.trim().slice(0, 2000)}\n\nKeep every stage, step, box and gate condition the request does not touch exactly as it is — the same names and titles, word for word, in the same order — and answer with the whole method. Say in assumptions what you changed and why; in questions anything you could not decide.`;

export type Read =
  | { ok: true; raw: unknown; proposed: Proposed; errors: Issue[]; warnings: Issue[] }
  | { ok: false; why: string };

/** READ AN ANSWER — the message the API sent back: refused, cut short or
 *  unreadable is said so; otherwise the proposal read into a definition and
 *  checked. Never trusts the answer's shape. */
export function readDesign(message: unknown): Read {
  const m = (message && typeof message === 'object' ? message : {}) as { stop_reason?: string; content?: unknown };
  if (m.stop_reason === 'refusal') return { ok: false, why: 'The assistant would not propose a method for that. Write it by hand, or describe the work differently.' };
  if (m.stop_reason === 'max_tokens') return { ok: false, why: 'The proposal ran too long to finish. Describe a smaller piece of the work, or split it into two methods.' };
  const text = (Array.isArray(m.content) ? m.content : [])
    .map(b => (b && typeof b === 'object' && (b as { type?: string }).type === 'text' ? String((b as { text?: unknown }).text ?? '') : ''))
    .join('').trim();
  if (!text) return { ok: false, why: 'The assistant sent nothing back. Try again in a moment.' };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, why: 'The assistant’s answer could not be read. Try again in a moment.' }; }
  const proposed = fromProposal(raw);
  const checked = validateDefinition(proposed.def);
  return { ok: true, raw, proposed: { ...proposed, def: checked.def ?? proposed.def }, errors: checked.errors, warnings: checked.warnings };
}
