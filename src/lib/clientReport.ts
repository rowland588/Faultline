/* THE CLIENT REPORT FOR A STAGE-GATE JOB — what goes on it, worked out once.
 *
 * Rowland: "you have deleted the PDF report system — it's likely out of date
 * now we have a new system. Build a new one."
 *
 * The A3 report was built for the 3P tracker and had the gates bolted on; on a
 * job with no materials or programs it was not even offered. This one is the
 * stage-gate job told in the order it is run, and it reads only what the
 * screens already keep — nothing here is typed for the report:
 *
 *   1  WHERE THE JOB IS      the sentence, the dates, the four gates for the
 *                            whole job, and where each machine is
 *   2  GATE BY GATE          Install · Set up · Commission · Hand over, each
 *                            with its checklist per machine (Set up also its
 *                            programs; Commission its tests)
 *   3  FIXES                 open first, with where each is on the line
 *   4  WHO OWES WHAT         the same table the Overview shows
 *   5  LINE STANDARD         one page per product, when there are any
 *
 * Meeting notes are never on it: they are private preparation.
 *
 * Pure: the screen gathers the records, this shapes them, the drawer draws. */
import type { Project } from '../types';
import { GATE_WORD, installGrid, jobJourney, journeyNow, journeyOf, usualStages, type GateTone, type JourneyGate } from './install';
import { standing, slipWords, type OutstandingRow, type PlanMark } from './standing';
import { fixTone, type FixTone } from './fixTone';
import { stateOf, type Program } from './programs';
import { live, hasRun, latestAttempts, outcomeWord, type Asset, type StepGate, type Test, type TestItem } from './testing';
import type { Material } from './materials';
import type { Standard } from './standard';
import { niceDay } from './weeks';
import type { WalkSnag } from './walkSnags';

/** One cell of a gate's checklist: how that stage stands on that machine. */
/** `booked` is a step with a day, still ahead (indigo); `ahead` one with no
 *  day yet (grey) — the same two the grid on screen draws. */
export type CellTone = 'done' | 'problem' | 'asking' | 'late' | 'booked' | 'ahead' | 'none';

export interface GateSection {
  gate: StepGate | 'commission';
  label: string;
  /** "4 of 12 done · 1 late" */
  says: string;
  tone: GateTone;
  /** The checklist, machines down, stages across. Absent for Commission. */
  grid?: { columns: string[]; rows: { machine: string; cells: CellTone[] }[] };
  /** What is late or a problem at this gate, in words, for the line under it. */
  late: string[];
  /** Set up only: the programs. */
  programs?: { proved: number; total: number; notYet: { what: string; machine?: string; state: string }[] };
  /** Commission only: the tests, in the order they were planned. */
  tests?: { title: string; machine?: string; when: string; outcome: string; tone: 'done' | 'failed' | 'booked' | 'ahead' | 'late'; result?: string; passesIf?: string }[];
}

export interface FixRow {
  id: string;
  title: string;
  problem?: string;
  machine?: string;
  who?: string;
  when: string;
  tone: FixTone;
  /** For the drawer to fetch a picture: pinned on a frame, or its first photo. */
  pin?: Test['pin'];
  photoKey?: string;
}

export interface ClientReport {
  name: string;
  lead?: string;
  printed: string;
  sentence: string;
  /** "Handover expected 26 Oct · agreed 18 Oct" */
  dates?: string;
  slip?: string;
  gates: { gate: JourneyGate; label: string; tone: GateTone; says: string }[];
  machines: { name: string; at: string; gates: GateTone[] }[];
  sections: GateSection[];
  fixes: { open: FixRow[]; done: FixRow[] };
  waiting: OutstandingRow[];
  standards: Standard[];
  /** The job's dated marks — the same ones the project page's Gantt draws —
   *  for "The plan" page, with the day it was printed and both handover dates. */
  plan: PlanMark[];
  /** What happened to each stage, for the plan page's overruns and its "why"
   *  list — the steps, their fixes and what was found. Never the notes. */
  planRecords: { tests: Test[]; items: TestItem[]; walk?: WalkSnag[] };
  today: string;
  expectedAt?: string;
  plannedAt?: string;
}

export interface ClientReportInput {
  project: Project;
  projects: Project[];
  assets: Asset[];
  tests: Test[];
  items: TestItem[];
  materials: Material[];
  programs: Program[];
  standards: Standard[];
  /** What the filmed walk found — its lane on the plan page. */
  walk?: WalkSnag[];
  today: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function clientReport(x: ClientReportInput): ClientReport {
  const { project, today } = x;
  const tests = live(x.tests), items = live(x.items), assets = live(x.assets).sort((a, b) => a.sort - b.sort);
  const programs = live(x.programs);
  const machine = (id?: string) => assets.find(a => a.id === id)?.name;
  const st = standing({
    tests, items, assets, materials: x.materials, programs,
    expectedAt: project.expectedAt, plannedAt: project.plannedAt, today,
  });

  /* ---- where the job is ---- */
  const job = jobJourney(assets, tests, items, today, programs);
  const machines = assets.map(a => {
    const j = journeyOf(a, tests, items, today, programs);
    return { name: a.name, at: journeyNow(j), gates: j.map(g => g.tone) };
  });

  /* ---- gate by gate ---- */
  const stepGate = (gate: StepGate): GateSection => {
    const usual = usualStages(project, x.projects, gate).stages;
    const g = installGrid(assets, tests, items, today, usual, gate);
    const steps = tests.filter(t => t.kind === 'install' && (t.gate ?? 'install') === gate);
    const done = steps.filter(t => t.outcome === 'passed').length;
    const rows = g.rows.filter(r => r.view.total > 0).map(r => ({
      machine: r.asset?.name ?? 'The line',
      cells: r.cells.map(c => (!c ? 'none' : c.tone === 'ahead' && c.step.plannedFor ? 'booked' : c.tone) as CellTone),
    }));
    const lateSteps = g.rows.flatMap(r => r.view.steps
      .filter(s => s.tone === 'late' || s.tone === 'problem')
      .map(s => `${r.asset?.name ?? 'The line'} — ${s.step.title}${s.tone === 'problem' ? ' (a problem)' : ' (late)'}`));
    const tone = job.find(j => j.gate === gate)?.tone ?? 'none';
    // Said as the gate's own screen says it — stages with nothing planned count.
    const unplanned = rows.reduce((n, r) => n + r.cells.filter(c => c === 'none').length, 0);
    return {
      gate, label: GATE_WORD[gate], tone,
      /* A gate the machines are marked past with no steps kept is done, and
         says so — a green box reading "nothing kept" told the client two
         things at once (seen on a random-job report, 4 Oct). */
      says: steps.length === 0 ? (tone === 'done' ? 'Done — no steps kept for it' : 'Nothing kept at this gate yet')
        : `${done} of ${steps.length} done${lateSteps.length ? ` · ${lateSteps.length} late or a problem` : ''}${unplanned ? ` · ${unplanned} not added yet` : ''}`,
      grid: rows.length ? { columns: g.columns, rows } : undefined,
      late: lateSteps,
    };
  };

  const install = stepGate('install');
  const setup = stepGate('setup');
  const proved = programs.filter(p => stateOf(p) === 'proved').length;
  if (programs.length) {
    setup.programs = {
      proved, total: programs.length,
      notYet: programs.filter(p => stateOf(p) !== 'proved').map(p => ({
        what: p.what, machine: machine(p.assetId),
        state: stateOf(p) === 'onMachine' ? 'on the machine, not proved' : 'not written yet',
      })),
    };
    setup.says = setup.says === 'Nothing kept at this gate yet'
      ? `${proved} of ${programs.length} programs proved`
      : `${setup.says} · ${proved} of ${programs.length} programs proved`;
  }

  const proofs = tests.filter(t => (t.kind ?? 'test') === 'test').sort((a, b) => a.sort - b.sort);
  /* THE COUNTS ARE THE LATEST ATTEMPT OF EACH TEST. A test that failed and
     passed on its re-test is one test that passed; the rows below still list
     both attempts, because that is what happened. */
  const now = latestAttempts(tests).sort((a, b) => a.sort - b.sort);
  const passed = now.filter(t => t.outcome === 'passed').length;
  const failed = now.filter(t => t.outcome === 'failed').length;
  const notRun = now.filter(t => t.outcome === 'notRun').length;
  const endOf = (t: Test) => t.plannedTo ?? t.plannedFor;
  const commission: GateSection = {
    gate: 'commission', label: 'Commission', tone: job.find(j => j.gate === 'commission')?.tone ?? 'none',
    says: proofs.length === 0 ? 'No tests planned yet'
      // Every outcome said: "2 of 5 passed · 1 didn't pass" left a test that never ran unaccounted for.
      : `${passed} of ${now.length} passed${failed ? ` · ${failed} didn’t pass` : ''}${notRun ? ` · ${notRun} didn’t run` : ''}`,
    late: now.filter(t => t.outcome === 'failed' || t.outcome === 'notRun').map(t => `${t.title}${machine(t.assetId) ? ` — ${machine(t.assetId)}` : ''}`),
    tests: proofs.map(t => ({
      title: t.title, machine: machine(t.assetId),
      when: niceDay(t.ranOn ?? t.plannedFor) || 'no date',
      outcome: hasRun(t) ? outcomeWord(t) : 'planned',
      tone: t.outcome === 'passed' ? 'done' : t.outcome === 'failed' || t.outcome === 'notRun' ? 'failed'
        : (endOf(t) ?? '\uffff') < today ? 'late' : t.plannedFor ? 'booked' : 'ahead',
      result: t.result, passesIf: t.passesIf,
    })),
  };

  const handover = stepGate('handover');

  /* ---- fixes ---- */
  const fixRow = (t: Test): FixRow => {
    const ft = fixTone(t, today);
    const photo = (t.media ?? []).find(m => m.kind === 'photo')?.blobKey ?? (t.media ?? [])[0]?.thumbKey;
    return {
      id: t.id, title: t.title, problem: t.passesIf, machine: machine(t.assetId), who: t.withWhom,
      when: ft.when, tone: ft.tone, pin: t.pin, photoKey: photo,
    };
  };
  const rank: Record<FixTone, number> = { late: 0, notRun: 1, soon: 2, ahead: 3, done: 4 };
  const fixes = tests.filter(t => t.kind === 'fix').map(fixRow).sort((a, b) => rank[a.tone] - rank[b.tone]);

  const when = project.expectedAt ?? project.plannedAt;
  const moved = project.expectedAt && project.plannedAt && project.expectedAt !== project.plannedAt;

  return {
    name: project.name, lead: project.lead,
    printed: niceDay(today, { year: true }),
    sentence: st.sentence,
    dates: when ? `Handover ${moved ? 'expected' : ''} ${niceDay(when, { year: true })}${moved ? ` · agreed ${niceDay(project.plannedAt, { year: true })}` : ''}`.replace('  ', ' ') : undefined,
    slip: slipWords(st.slipDays),
    gates: job.map(g => {
      const s = [install, setup, commission, handover].find(x => x.gate === g.gate);
      return { gate: g.gate, label: g.label, tone: g.tone, says: s?.says ?? '' };
    }),
    machines,
    sections: [install, setup, commission, handover],
    fixes: { open: fixes.filter(f => f.tone !== 'done'), done: fixes.filter(f => f.tone === 'done') },
    waiting: st.rows,
    standards: live(x.standards),
    /* Meeting notes are never on the client's copy — they are private
       preparation — so a note's reminder stays off its plan page too. */
    plan: st.plan.filter(m => m.kind !== 'note'),
    planRecords: { tests, items: items.filter(i => i.kind === 'found'), ...(x.walk?.length ? { walk: x.walk } : {}) },
    today,
    ...(project.expectedAt ? { expectedAt: project.expectedAt } : {}),
    ...(project.plannedAt ? { plannedAt: project.plannedAt } : {}),
  };
}

/** "2 at Commission · 1 at Install" — the machines in one line. */
export function machinesSay(r: Pick<ClientReport, 'machines'>): string {
  const at = new Map<string, number>();
  for (const m of r.machines) at.set(m.at, (at.get(m.at) ?? 0) + 1);
  return [...at].map(([g, n]) => `${n} at ${g}`).join(' · ') || plural(0, 'machine');
}
