/* A JOB — Luna's own plan of a piece of work, kept as she does it (21 November 2026, docs/LUNA-AGENT.md).
 *
 * Rowland, 21 November: "when I say intelligence level you must grade it in the future of the app — it's not just about reading files
 * and spouting out numbers … it's to get to the level of ChatGPT agent, fully agentic … I need you to understand and build."
 *
 * A question is answered; a JOB is taken and finished. When the person hands Luna a piece of work ("find out why and put it in a report",
 * "get me ready for Monday"), she writes her plan of it — the goal in their words and a few steps of her own — and keeps it up as she
 * works: each step to do · doing · done · blocked · skipped, with a few words of what came of it. The person watches the list tick
 * (colleague/JobList); she is told where it stands with every round (focusText), so a job that runs past one go of steps is picked up
 * where it was (colleagueAsk, the legs) and never started again.
 *
 * It is NOT the task of 10 November (capabilities/task): that is a route through the app's tools on a line, its progress read from the
 * line's records. A job is hers — any work, any steps, in her words — and nothing in it is a record of the business: it lives on the
 * conversation's subject and is put away with it.
 *
 * Pure: the plan made, a step moved, the words it is said in. The capabilities that keep it are capabilities/job. */
import type { ColleagueJob, JobStatus, JobStep } from '../capabilities/types';

export const JOB_LIMITS = { minSteps: 2, steps: 8, what: 140, note: 240, goal: 300 } as const;
/** The job exam counts her closing answer — spoken or written (docs/LUNA-AGENT.md §6). */
export const JOB_CLOSE_WORDS = 160;

const SENTENCE_END = /(?<=[.!?])\s+/;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** A finished job's last words, capped without sounding cut off — whole sentences first, then words, always ending cleanly. */
export function briefJobClose(text: string, max = JOB_CLOSE_WORDS): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t || wordCount(t) <= max) return t;
  const sentences = t.split(SENTENCE_END).map(s => s.trim()).filter(Boolean);
  while (sentences.length > 1 && wordCount(sentences.join(' ')) > max) sentences.pop();
  let out = sentences.join(' ');
  if (wordCount(out) <= max) return out;
  const words = out.split(/\s+/);
  while (words.length > max) words.pop();
  out = words.join(' ').replace(/[,;:\-—–]\s*$/, '').trim();
  if (out && !/[.!?]$/.test(out)) out += '.';
  return out;
}

/** Each state in a word — said beside its mark, never by colour alone. */
export const JOB_WORD: Record<JobStatus, string> = { todo: 'To do', doing: 'Doing', done: 'Done', blocked: 'Blocked', skipped: 'Skipped' };

const same = (a: string, b: string): boolean => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');
const isOpen = (s: JobStep): boolean => s.status === 'todo' || s.status === 'doing';

/** A job with something still to do. */
export const jobOpen = (j?: ColleagueJob | null): boolean => !!j && j.steps.some(isOpen);

/** THE STEPS STILL OPEN, IN WORDS — "3 “Write the report” (to do); 4 “Check it” (to do)" — or nothing when the job has none. What
 *  Luna is told when she gives an answer that leaves her own plan open (colleague/colleagueAsk, the second look). */
export function stepsOpenSaid(j?: ColleagueJob | null): string | undefined {
  if (!j || j.endedAt) return undefined;
  const open = j.steps.map((st, i) => ({ st, n: i + 1 })).filter(x => isOpen(x.st));
  return open.length ? open.map(x => `${x.n} “${x.st.what}” (${JOB_WORD[x.st.status].toLowerCase()})`).join('; ') : undefined;
}

/** The step in hand — the one being done, else the first still to do — as its number (1-based); 0 when none is left. */
export function nextOf(j: ColleagueJob): number {
  const doing = j.steps.findIndex(s => s.status === 'doing');
  if (doing >= 0) return doing + 1;
  return j.steps.findIndex(s => s.status === 'todo') + 1;
}

export interface JobCounts { total: number; done: number; blocked: number; skipped: number; left: number }
export function jobCounts(j: ColleagueJob): JobCounts {
  const n = (st: JobStatus) => j.steps.filter(s => s.status === st).length;
  return { total: j.steps.length, done: n('done'), blocked: n('blocked'), skipped: n('skipped'), left: j.steps.filter(isOpen).length };
}

/** THE PLAN MADE — or made again. A job planned again while it is open keeps what a step of the same words had already come to, so
 *  re-planning half-way never loses the work done; a new goal, or a job that had finished, starts clean. */
export function planJob(goal: string, steps: readonly string[], now: number, was?: ColleagueJob): ColleagueJob | string {
  const g = goal.trim().slice(0, JOB_LIMITS.goal);
  const list = steps.map(s => s.trim().slice(0, JOB_LIMITS.what)).filter(Boolean).filter((s, i, all) => all.findIndex(x => same(x, s)) === i);
  if (!g) return 'A job needs its goal — what the person asked for, in their words.';
  if (list.length < JOB_LIMITS.minSteps) return `A job is at least ${JOB_LIMITS.minSteps} steps — a single step is just done, with no plan.`;
  if (list.length > JOB_LIMITS.steps) return `A job is at most ${JOB_LIMITS.steps} steps — put the small ones together.`;
  const carry = was && jobOpen(was) && same(was.goal, g) ? was : undefined;
  return {
    goal: g,
    steps: list.map((what): JobStep => { const old = carry?.steps.find(s => same(s.what, what)); return old ? { ...old, what } : { what, status: 'todo' }; }),
    startedAt: carry?.startedAt ?? now,
    ...(carry?.writesApproved ? { writesApproved: carry.writesApproved } : {}),
  };
}

/** A STEP MOVED: its state, with a few words of what came of it. The job ends when nothing is left to do or being done. */
export function stepJob(j: ColleagueJob, n: number, status: JobStatus, note: string | undefined, now: number): ColleagueJob | string {
  if (!Number.isInteger(n) || n < 1 || n > j.steps.length) return `There is no step ${n} — the job has ${j.steps.length}.`;
  const words = note?.trim().slice(0, JOB_LIMITS.note);
  if (status === 'blocked' && !words) return 'A blocked step says why — what is missing, or what stopped it.';
  const steps = j.steps.map((s, i): JobStep => {
    if (i !== n - 1) return s;
    const { note: _old, ...rest } = s; void _old;
    return { ...rest, status, ...(words ? { note: words } : status === 'doing' && s.note ? { note: s.note } : {}), at: now };
  });
  const { endedAt: _e, ...rest } = j; void _e;
  return { ...rest, steps, ...(steps.some(isOpen) ? {} : { endedAt: now }) };
}

/** Where a job stands in a few words: "2 of 5 done", "4 of 5 done · 1 blocked", "Finished — 5 of 5 done". */
export function jobStands(j: ColleagueJob): string {
  const c = jobCounts(j);
  const bits = [`${c.done} of ${c.total} done`, ...(c.blocked ? [`${c.blocked} blocked`] : []), ...(c.skipped ? [`${c.skipped} skipped`] : [])];
  return `${c.left ? '' : 'Finished — '}${bits.join(' · ')}`;
}

/** What a step's move is said back to Luna as — with the next step always named, so she goes on to it. */
export function stepSaid(j: ColleagueJob, n: number): string {
  const s = j.steps[n - 1];
  const head = `Step ${n} of ${j.steps.length} ${JOB_WORD[s.status].toLowerCase()}${s.note ? ` — ${s.note}` : ''}.`;
  const next = nextOf(j);
  if (next && next !== n) return `${head} Next: step ${next} — ${j.steps[next - 1].what}.`;
  if (next === n) return `${head} Carry it through, then mark it done with what it found.`;
  const c = jobCounts(j);
  const stuck = j.steps.map((x, i) => ({ x, i })).filter(({ x }) => x.status === 'blocked').map(({ x, i }) => `step ${i + 1} (${x.note ?? 'no reason given'})`);
  return `${head} Nothing is left to do: ${jobStands(j).replace(/^Finished — /, '')}${stuck.length ? ` — blocked: ${stuck.join('; ')}` : ''}. The job is finished — give the person the result in strictly at most 160 words (the job exam counts them): name the report by its title, one sentence on the main finding, what is established against what is still only a hypothesis${c.blocked ? '; say plainly what could not be done and why' : ''}; do not repeat the report section by section or list figures already in it.`;
}

/** THE JOB AS LUNA IS TOLD IT EACH ROUND (conversation focusText): its goal, every step with where it stands and what came of it, and
 *  the step in hand — so a job carried past one go of steps is picked up where it was. A finished job is one line. */
export function jobSaid(j: ColleagueJob): string[] {
  if (!jobOpen(j)) return [`  Job (finished): ${j.goal} — ${jobStands(j).replace(/^Finished — /, '')}. A new piece of work is a new plan_job.`];
  const next = nextOf(j);
  return [
    `  JOB IN HAND: ${j.goal} — ${jobStands(j)}. Finish it: work the steps in order, job_step as each is done; do not start again or repeat a step that is done.`,
    ...j.steps.map((s, i) => `    ${i + 1}. [${JOB_WORD[s.status]}] ${s.what}${s.note ? ` — ${s.note}` : ''}${i + 1 === next ? '   ← the step in hand' : ''}`),
  ];
}
