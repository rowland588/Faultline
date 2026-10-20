/* WHAT LINE TALK'S ASSISTANT IS TOLD ABOUT THE LINE — Faultline's records,
 * in words (docs/LINE-TALK.md, What it knows).
 *
 * Rowland, 20 October: "allow the assistant to use existing Faultline
 * information, such as the current production line, machine details,
 * observations, measurements, problems and project information … Reuse
 * existing data and calculations rather than inventing new ones."
 *
 * So nothing here works a figure out. Every line is a sentence one of the
 * line's own modules already says — the problems as the register reads them
 * (lib/lineWork lineProblems), the machines in flow order with who made them
 * (lib/lineRecords lineKit), the programs not proved (lib/programs), what each
 * tool's latest found as its own list says it (the line's page, toolSaysOf),
 * the stops as the line's page counts them, the line's shifts and crew
 * (lib/lines lineFacts), and each job's verdict as the control room gives it
 * (lib/portfolio). This module only lays them out, under headings, cut to a
 * size, and says in a line what went in.
 *
 * Pure: the same on every screen and in every test. */
import { PRIORITY_WORD, type SnagRow } from './snagsReport';

export interface TalkContextProgram { what: string; machine: string; word: string; test?: string; late: boolean; job?: string }
export interface TalkContextJob { name: string; method: string; verdict?: string }

export interface TalkContextIn {
  line?: { name: string; type?: string; shifts?: string; crew?: string; cost?: string };
  /** The machines in flow order — "Bagger (Ishida) → Tray sealer → Wrapper". */
  machines?: string;
  problems: SnagRow[];
  programs: TalkContextProgram[];
  /** Each tool's latest finding on the line, as its own list says it. */
  tools: { label: string; says: string }[];
  /** The line's stops over the last four weeks, as its page says them. */
  stops?: string;
  /** The jobs on the line. */
  jobs: TalkContextJob[];
  /** The job this talk is on, when it is on one. */
  job?: TalkContextJob;
}

const CAP = { problems: 25, programs: 20, tools: 14, jobs: 10 };
const MAX_CHARS = 20000;

const more = (n: number, where: string) => (n > 0 ? [`- and ${n} more on ${where}`] : []);

/** The records as the assistant reads them, under headings — or '' when the talk is on no line and no job. */
export function talkContext(c: TalkContextIn): string {
  const out: string[] = [];
  if (c.line) {
    out.push(`PRODUCTION LINE: ${c.line.name}${c.line.type ? ` (${c.line.type})` : ''}`);
    if (c.line.shifts) out.push(`Shifts: ${c.line.shifts}`);
    if (c.line.crew) out.push(`Crew: ${c.line.crew}`);
    if (c.line.cost) out.push(`What its lost time costs: ${c.line.cost}`);
    out.push(`Machines in flow order: ${c.machines?.trim() || 'none listed yet'}`);
    out.push('');
    out.push(c.problems.length ? `OPEN PROBLEMS (${c.problems.length}, in priority order):` : 'OPEN PROBLEMS: none open on this line.');
    for (const p of c.problems.slice(0, CAP.problems)) {
      const step = p.journey[p.journey.length - 1];
      out.push(`- ${PRIORITY_WORD[p.priority]} · ${p.what}${p.machine ? ` — ${p.machine}` : ''} · ${p.word}${p.owner ? ` · owner ${p.owner}` : ' · nobody owns it yet'}${p.due ? ` · ${p.due}` : ''}${p.forJob ? ` · for ${p.forJob}` : ''}${p.plan ? ` · plan: ${p.plan}` : ''}${step ? ` · latest step (${step.day}): ${step.did}${step.result ? ` — ${step.result}` : ''}` : ''}`);
    }
    out.push(...more(c.problems.length - CAP.problems, "the line's Problems page"));
    out.push('');
    out.push(c.programs.length ? `PROGRAMS NOT PROVED YET (${c.programs.length}):` : 'PROGRAMS NOT PROVED YET: none.');
    for (const p of c.programs.slice(0, CAP.programs)) out.push(`- ${p.what} — ${p.machine} · ${p.word} · ${p.test ? `${p.late ? 'test was ' : 'test '}${p.test}` : 'no test day'}${p.job ? ` · on ${p.job}` : ''}`);
    out.push(...more(c.programs.length - CAP.programs, "the line's Programs page"));
    out.push('');
    const found = [...(c.stops ? [{ label: 'Stops timed (last four weeks)', says: c.stops }] : []), ...c.tools];
    out.push(found.length ? "WHAT ITS TOOLS FOUND (each tool's latest record on this line, in its own words):" : "WHAT ITS TOOLS FOUND: no tool has been used on this line yet.");
    for (const t of found.slice(0, CAP.tools)) out.push(`- ${t.label}: ${t.says}`);
    out.push('');
    out.push(c.jobs.length ? 'JOBS ON THIS LINE:' : 'JOBS ON THIS LINE: none.');
    for (const j of c.jobs.slice(0, CAP.jobs)) out.push(`- ${j.name} (${j.method})${j.verdict ? ` — ${j.verdict}` : ''}`);
    out.push(...more(c.jobs.length - CAP.jobs, 'the control room'));
  }
  if (c.job) {
    if (out.length) out.push('');
    out.push(`THIS CONVERSATION IS ON THE JOB: ${c.job.name} (${c.job.method})${c.job.verdict ? ` — ${c.job.verdict}` : ''}`);
  }
  const text = out.join('\n').trim();
  return text.length <= MAX_CHARS ? text : `${text.slice(0, MAX_CHARS).replace(/\n[^\n]*$/, '')}\n- and more in Faultline`;
}

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** What went in, in a line — "Line 7: 4 machines · 3 open problems · 2 programs to prove · 5 tool findings · 1 job". */
export function contextSaid(c: TalkContextIn): string {
  if (!c.line && !c.job) return 'Not on a line or a job — Line Talk answers from the conversation alone.';
  const machines = c.machines?.trim() ? c.machines.split(' → ').length : 0;
  const parts = c.line ? [
    n(machines, 'machine'), n(c.problems.length, 'open problem'), n(c.programs.length, 'program', 'programs') + ' to prove',
    n(c.tools.length + (c.stops ? 1 : 0), 'tool finding'), n(c.jobs.length, 'job'),
  ] : [];
  return `${c.line ? c.line.name : c.job?.name}: ${[...parts, ...(c.job && c.line ? [`on ${c.job.name}`] : [])].join(' · ') || 'its name and method'}`;
}
