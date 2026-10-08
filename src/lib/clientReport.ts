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
 *                            with its checklist per machine and, under it, how
 *                            each stage went in the team's words (Set up also
 *                            its programs; Commission its tests)
 *   3  FIXES                 open first, with where each is on the line
 *   4  WHO OWES WHAT         the same table the Overview shows
 *   5  LINE STANDARD         one page per product, when there are any
 *
 * Notes are never on it: they are private preparation.
 *
 * Pure: the screen gathers the records, this shapes them, the drawer draws. */
import { isRunTest, productFigures, productName, readRuns, runsLine } from './run';
import type { MediaPin, Project } from '../types';
import { GATE_WORD, installGrid, jobJourney, lateOrProblemSays, machineAt, machinesWhere, journeyOf, usualStages, type GateTone, type JourneyGate, type StepView, lateByWords, heldUpBy } from './install';
import { stageGateOnTarget, type OnTarget } from './onTarget';
import { standing, slipWords, type OutstandingRow, type PlanMark } from './standing';
import { fixTone, type FixTone } from './fixTone';
import { isProgramsStage, type Program } from './programs';
import { programsReading, type ProgramsReading } from './programsReport';
import { live, hasRun, latestAttempts, outcomeWord, type Asset, type StepGate, type Test, type TestItem } from './testing';
import type { Material } from './materials';
import type { Standard } from './standard';
import { niceDay } from './weeks';
import { dayLength, daysWord, hoursTally, hoursWord } from './hoursLost';
import { notedProblems, partsOf, partWords, resultNow } from './noted';
import { couldWords, criticalProblems, criticalState, riskProblems, type Critical } from './critical';
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
  /** What is LATE at this gate, in words, for the line under it — a stage
   *  late by lib/install lateOrProblem (its day gone, or hours lost), with
   *  the hours when there are any. On Commission, the tests that did not
   *  pass or did not run. */
  late: string[];
  /** The stages that hit a problem and lost no time — amber, said apart from
   *  what is late (Rowland, 6 October: never "late or a problem"). */
  problems: string[];
  /** THE PARTS SAID TO HAVE FAILED — a program that did not pass, with what
   *  was seen (lib/noted resultNow): "Filler — Programs loaded — Tesco Express
   *  1.25 kg: seal temperature low". Red, its own list; never folded into
   *  late or a problem. Absent when none has. */
  failed?: string[];
  /** Install, Set up, Hand over: how each stage went, in the team's own words
   *  (the step's "What was done" — typed or said into "Say how it went"), for
   *  every step that has one, in the grid's order: machine, then stage. A step
   *  with nothing said is not listed — the grid already gives its state. */
  accounts?: StepAccount[];
  /** HOURS LOST at this gate (lib/hoursLost): the total in hours and days,
   *  and a line per stage that lost any — what pushed its finish, what is
   *  still short of a day, and the problems that cost them. */
  hours?: { total: string; lines: string[] };
  /** Set up only: THE PROGRAMS, every one, machine by machine — the floor's
   *  status and what was seen, and its proving in Commission
   *  (lib/programsReport). The same reading the programs report prints. */
  programs?: ProgramsReading;
  /** Commission only: the tests, in the order they were planned. */
  tests?: { title: string; machine?: string; when: string; outcome: string; tone: 'done' | 'failed' | 'booked' | 'ahead' | 'late'; result?: string; passesIf?: string;
    /** A run at a rate, in one line (lib/run runLine). */
    run?: string }[];
  /** Commission only: THE PERFORMANCE RUNS — a row per PRODUCT of the latest
   *  attempt of each run at a rate, with its numbers, first in the section.
   *  Rowland, 7 October: "this is my time of acceptance ... people ask how
   *  fast did we run, what did we net" — and "commissioning runs are
   *  multiple products." */
  runs?: RunRow[];
}

/** One product of a performance run, as the client reads it (lib/run). */
export interface RunRow {
  /** The test it is a product of. */
  title: string;
  machine?: string;
  /** The product down the machine — "Product not named" when nobody said. */
  product: string;
  when: string;
  /** The figures, as the board shows them — "58.4 ppm", "—" when not measured. */
  net: string; agreed: string; speed: string; rejects: string; length: string;
  /** Net rate met · short · nothing agreed to judge it on. */
  netTone: 'met' | 'short' | '';
  rejectsTone: 'met' | 'short' | '';
  /** The product's verdict, from its numbers: "Passed" · "Didn't pass" ·
   *  "To run" · "Numbers going in" · "Ran — no rate agreed"; "… — run again"
   *  on a row run again further down. */
  outcome: string;
  tone: 'done' | 'failed' | 'booked' | 'ahead' | 'late';
  /** What fell short and by how much — empty when nothing did. */
  say: string;
  meets?: boolean;
  /** Run again further down the list — history; the later row counts. */
  rerun?: boolean;
}

/** One step's account, as the client reads it under its gate. */
export interface StepAccount {
  machine: string;
  stage: string;
  /** The day it was done, else the day it is booked for; "no date" when neither. */
  when: string;
  /** The grid's own tone for the step, so the word and its colour match the square. */
  tone: Exclude<CellTone, 'none'>;
  /** The state in words, the same words as the grid's key: "late, 2 h
   *  lost", "a problem, no time lost" (lib/install lateOrProblem). */
  state: string;
  /** The stage's parts of the plan (ui/StageParts), in words. */
  parts?: string[];
  /** What the team said, whole. */
  said: string;
}

/** The grid key's words — the account's state says the same as its square. */
export const CELL_WORD: Record<CellTone, string> = {
  done: 'done', problem: 'a problem, no time lost', asking: 'waiting on a verdict', late: 'late',
  booked: 'still ahead', ahead: 'no day yet', none: 'not added yet',
};

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
  /** What is marked on that photo (MediaRef.pins, ui/Evidence) — drawn on it
   *  and listed beside it by number when it is the picture printed. */
  photoPins?: MediaPin[];
}

export interface ClientReport {
  name: string;
  lead?: string;
  printed: string;
  sentence: string;
  /** "Handover expected 26 Oct · agreed 18 Oct" */
  dates?: string;
  slip?: string;
  /** ARE WE ON TARGET? (lib/onTarget) — at the top of the first page and of
   *  the report's screen. */
  onTarget: OnTarget;
  gates: { gate: JourneyGate; label: string; tone: GateTone; says: string }[];
  machines: { name: string; at: string; gates: GateTone[] }[];
  sections: GateSection[];
  fixes: { open: FixRow[]; done: FixRow[] };
  /** CRITICAL ISSUES (lib/critical) — straight under "Are we on target?":
   *  each open one told whole (what, where, what it means for the business,
   *  the ways round it and the one agreed, its fix), the sorted ones a line
   *  each. Rowland: "say in a report — look at this, this is a major problem,
   *  potential solutions." */
  critical: { open: CriticalRow[]; sorted: string[] };
  /** HIGH RISKS (lib/critical) — under the critical ones, in amber: not
   *  happened yet, told the same way, with what each could cost as an
   *  estimate. Rowland, 7 October: "flag a metric, and a risk of consequence." */
  risks: { open: CriticalRow[]; sorted: string[] };
  /** PROBLEMS WITH NO FIX (lib/noted) — in words, open ones first: what, where,
   *  the day, hours lost. Kept on paper so the journey is told whole. A
   *  critical one is told under Critical issues, not again here. */
  noted: { open: string[]; sorted: string[] };
  waiting: OutstandingRow[];
  standards: Standard[];
  /** The job's dated marks — the same ones the project page's Gantt draws —
   *  for "The plan" page, with the day it was printed and both handover dates. */
  plan: PlanMark[];
  /** What happened to each stage, for the plan page's overruns and its "why"
   *  list — the steps, their fixes, what was found and each stage's parts
   *  (drawn as branches under it). Never the notes. */
  planRecords: { tests: Test[]; items: TestItem[]; walk?: WalkSnag[];
    /** The machines and their programs — for the plan drawn machine by machine. */
    assets?: Asset[]; programs?: Program[];
    /** The job's working day, for hours lost (lib/hoursLost). */
    dayHours?: number;
    /** Each gate's list, for the plan by stage in the Install grid's order. */
    stages?: Partial<Record<StepGate, readonly string[]>> };
  today: string;
  expectedAt?: string;
  plannedAt?: string;
}

export interface CriticalRow {
  what: string;
  /** "Pick and place — Programs loaded · raised Mon 5 Oct · Ilapak UK · 6 h lost" */
  meta: string;
  impact?: string;
  ways: { what: string; agreed: boolean }[];
  /** "Fix: Rewrite the programs — booked Fri 9 Oct, Ilapak UK" */
  fix?: string;
  /** "open · going with: a belt to bypass the robot" (lib/critical criticalState). */
  state: string;
  /** "could cost 100 h (an estimate)" — never counted as lost — and the hours. */
  could?: string;
  couldLose?: number;
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
    /* "Due on site" for a machine not here yet, never "Install" (machineAt). */
    return { name: a.name, at: machineAt(a, j).short, gates: j.map(g => g.tone) };
  });

  /* ---- gate by gate ---- */
  const stepGate = (gate: StepGate): GateSection => {
    const usual = usualStages(project, x.projects, gate).stages;
    const g = installGrid(assets, tests, items, today, usual, gate);
    const steps = tests.filter(t => t.kind === 'install' && (t.gate ?? 'install') === gate);
    const done = steps.filter(t => t.outcome === 'passed').length;
    /* LATE, OR A PROBLEM — WHICH (lib/install lateOrProblem): a stage late
       by its day or by the hours its problems lost is a late square; one that
       hit a problem and lost no time is a problem square, amber. */
    const cellOf = (c: StepView): Exclude<CellTone, 'none'> => {
      const which = lateOrProblemSays(c.step, items, today)?.which;
      if (which) return which;
      return (c.tone === 'ahead' && c.step.plannedFor ? 'booked' : c.tone) as Exclude<CellTone, 'none'>;
    };
    const rows = g.rows.filter(r => r.view.total > 0).map(r => ({
      machine: r.asset?.name ?? 'The line',
      cells: r.cells.map(c => (!c ? 'none' : cellOf(c)) as CellTone),
    }));
    /* HOW EACH STAGE WENT. Rowland, 4 October: the account a step is given
       ("Say how it went") is "part of the reports — how did it go, what
       happened". It used to reach the paper only when the step hit a problem.
       In the grid's order — machine, then stage — and then any step the grid
       could not give a square of its own (two steps of one name on a machine). */
    const accounts: StepAccount[] = g.rows.flatMap(r => {
      const inGrid = r.cells.filter((c): c is StepView => !!c);
      const rest = r.view.steps.filter(s => !inGrid.includes(s));
      return [...inGrid, ...rest].filter(s => s.step.result?.trim() || (!isProgramsStage(s.step) && partsOf(s.step.id, items).length)).map(s => {
        const tone = cellOf(s);
        /* A programs stage's parts are the programs — said once, under
           Programs, with their status and what was seen. */
        const parts = isProgramsStage(s.step) ? [] : partsOf(s.step.id, items).map(p => partWords(p, today));
        return {
          machine: r.asset?.name ?? 'The line', stage: s.step.title,
          when: niceDay(s.step.ranOn ?? s.step.plannedFor) || 'no date',
          /* Done after its first planned finish says so (lib/install doneLateBy). */
          tone, state: [lateOrProblemSays(s.step, items, today)?.words ?? (s.lateBy ? `done, ${lateByWords(s.lateBy)}` : CELL_WORD[tone]),
            /* Why, when it was the stage before (lib/install heldUpBy). */
            heldUpBy(s.step, tests, items, today, usual)?.words].filter(Boolean).join(' — '), said: (s.step.result ?? '').trim(),
          ...(parts.length ? { parts } : {}),
        };
      });
    });
    /* LATE, OR A PROBLEM — WHICH. Rowland, 6 October: "We know if it's a
       problem and if it's late, because I put hours in the problem to tell
       the app it caused lateness." Each stage is one or the other by the one
       rule (lib/install lateOrProblem): late — its day gone, or hours lost,
       said with the hours — or a problem that lost no time. Two lists, two
       counts, never "late or a problem". */
    const all = g.rows.flatMap(r => r.view.steps.map(s => ({ r, s, w: lateOrProblemSays(s.step, items, today) })));
    const named = (r: (typeof all)[number]['r'], s: StepView) => `${r.asset?.name ?? 'The line'} — ${s.step.title}`;
    const lateSteps = all
      .filter(({ s, w }) => w?.which === 'late' || (!w && cellOf(s) === 'late'))
      .map(({ r, s, w }) => { const h = heldUpBy(s.step, tests, items, today, usual); return `${named(r, s)}${w?.lost ? ` — ${hoursWord(w.lost)} lost` : ''}${h ? ` — ${h.words}` : ''}`; });
    const problemSteps = all.filter(({ w }) => w?.which === 'problem').map(({ r, s }) => named(r, s));
    const failedParts = all.flatMap(({ r, s }) => partsOf(s.step.id, items).flatMap(p => {
      const said = resultNow(p);
      return said?.is === 'failed' ? [`${named(r, s)} — ${p.what}${said.note ? `: ${said.note}` : ''}`] : [];
    }));
    /* Rowland, 6 October: "2 hours here, 1 hour there, 5 hours here ... that
       was one day fully missed, or half a day." */
    const day = dayLength(project);
    let lostAll = 0;
    const hourLines = all.flatMap(({ r, s }) => {
      const h = hoursTally(s.step.id, items, day);
      if (!h.hours) return [];
      lostAll += h.hours;
      const each = items.filter(i => i.testId === s.step.id && i.kind === 'found' && (i.hoursLost ?? 0) > 0)
        .sort((a, b) => a.createdAt - b.createdAt).map(i => `${i.what} ${hoursWord(i.hoursLost as number)}`);
      /* Said once: "30 min lost" needs no "30 min not yet a day" after it. */
      const state = h.pushedDays
        ? `, pushed the finish ${h.pushedDays} day${h.pushedDays === 1 ? '' : 's'}${h.banked ? `; ${hoursWord(h.banked)} towards the next` : ''}`
        : h.hours >= day ? ' — the finish has not been moved for it' : '';
      return [`${r.asset?.name ?? 'The line'} — ${s.step.title}: ${hoursWord(h.hours)} lost${state} (${each.join('; ')})`];
    });
    const problems = problemSteps.length;
    const lateN = lateSteps.length;
    /* DONE, BUT LATE — Rowland, 7 October: "planned 5 to the 6th, done the
       7th, so it was late." Counted in the gate's line, as it happened. */
    const doneLateN = all.filter(({ s }) => s.lateBy > 0).length;
    const tone = job.find(j => j.gate === gate)?.tone ?? 'none';
    // Said as the gate's own screen says it — stages with nothing planned count.
    const unplanned = rows.reduce((n, r) => n + r.cells.filter(c => c === 'none').length, 0);
    return {
      gate, label: GATE_WORD[gate], tone,
      /* A gate the machines are marked past with no steps kept is done, and
         says so — a green box reading "nothing kept" told the client two
         things at once (seen on a random-job report, 4 Oct). */
      says: steps.length === 0 ? (tone === 'done' ? 'Done — no steps kept for it' : 'Nothing kept at this gate yet')
        : `${done} of ${steps.length} done${doneLateN ? ` (${doneLateN} done late)` : ''}${lateN ? ` · ${lateN} late` : ''}${problems ? ` · ${problems} a problem` : ''}${unplanned ? ` · ${unplanned} not added yet` : ''}`,
      grid: rows.length ? { columns: g.columns, rows } : undefined,
      late: lateSteps,
      problems: problemSteps,
      ...(failedParts.length ? { failed: failedParts } : {}),
      ...(hourLines.length ? { hours: { total: `${hoursWord(lostAll)} lost to problems — ${daysWord(lostAll, day)} at ${hoursWord(day)} a day`, lines: hourLines } } : {}),
      ...(accounts.length ? { accounts } : {}),
    };
  };

  const install = stepGate('install');
  const setup = stepGate('setup');
  const progs = programsReading({ tests, items, assets, programs, today });
  if (progs) {
    setup.programs = progs;
    setup.says = setup.says === 'Nothing kept at this gate yet'
      ? `${progs.doneAll} of ${progs.total} programs done`
      : `${setup.says} · ${progs.doneAll} of ${progs.total} programs done`;
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
    problems: [],
    tests: proofs.map(t => ({
      title: t.title, machine: machine(t.assetId),
      when: niceDay(t.ranOn ?? t.plannedFor) || 'no date',
      outcome: hasRun(t) ? outcomeWord(t) : 'planned',
      tone: t.outcome === 'passed' ? 'done' : t.outcome === 'failed' || t.outcome === 'notRun' ? 'failed'
        : (endOf(t) ?? '\uffff') < today ? 'late' : t.plannedFor ? 'booked' : 'ahead',
      result: t.result, passesIf: t.passesIf,
      /* A run's numbers are in the Performance runs table above; an earlier
         attempt, not in that table, carries them on its own line. */
      ...(runsLine(t) && !(isRunTest(t) && now.includes(t)) ? { run: runsLine(t) } : {}),
    })),
    ...(() => {
      /* A row per product planned or run — not every test with "rate" in its
         name as a row of dashes. Each product judged on its own numbers; a
         product still to run takes its test's day (booked, or late once the
         day has gone). */
      const runs = now.filter(t => isRunTest(t)).flatMap(t => {
        const testTone: RunRow['tone'] = (endOf(t) ?? '\uffff') < today ? 'late' : t.plannedFor ? 'booked' : 'ahead';
        return readRuns(t).products.map((p): RunRow => {
          const f = productFigures(p);
          const tone: RunRow['tone'] = p.rerun ? 'ahead' : p.state === 'met' ? 'done' : p.state === 'short' ? 'failed'
            : p.state === 'unjudged' ? (t.outcome === 'passed' ? 'done' : t.outcome === 'failed' ? 'failed' : 'booked') : testTone;
          return {
            title: t.title, machine: machine(t.assetId), product: productName(p.run),
            when: niceDay(p.run.ranOn ?? t.ranOn ?? t.plannedFor) || 'no date',
            net: f.net, speed: f.speed, rejects: f.rejects, length: f.length,
            agreed: f.agreed || 'nothing agreed yet',
            netTone: f.netTone, rejectsTone: f.rejectsTone,
            outcome: p.rerun ? `${p.word}, re-run` : p.state === 'toRun' && testTone === 'late' ? 'Not run — late' : p.word,
            tone, say: p.gap, ...(p.r.meets != null ? { meets: p.r.meets } : {}), ...(p.rerun ? { rerun: true } : {}),
          };
        });
      });
      return runs.length ? { runs } : {};
    })(),
  };

  const handover = stepGate('handover');

  /* ---- fixes ---- */
  const fixRow = (t: Test): FixRow => {
    const ft = fixTone(t, today);
    /* The fix's own picture, else the one taken with the problem that booked
       it (Hit a problem keeps the photo on the problem) — the same picture
       the Fixes page shows on its box. */
    const seen = items.filter(i => i.kind === 'found' && i.becameTestId === t.id).flatMap(i => i.media ?? []);
    const media = [...(t.media ?? []), ...seen];
    const pic = media.find(m => m.kind === 'photo');
    const photo = pic?.blobKey ?? media[0]?.thumbKey;
    /* Named by its problem when nobody gave it words of its own: the problem
       is then the title, not printed a second time under it. */
    const problem = t.passesIf && t.passesIf.trim() !== t.title.trim() ? t.passesIf : undefined;
    return {
      id: t.id, title: t.title, problem, machine: machine(t.assetId), who: t.withWhom,
      when: ft.when, tone: ft.tone, pin: t.pin, photoKey: photo,
      ...(pic?.pins?.length ? { photoPins: pic.pins } : {}),
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
    onTarget: stageGateOnTarget({ project, tests, items, assets, materials: x.materials, programs, today }, st),
    dates: when ? `Handover ${moved ? 'expected' : ''} ${niceDay(when, { year: true })}${moved ? ` · agreed ${niceDay(project.plannedAt, { year: true })}` : ''}`.replace('  ', ' ') : undefined,
    slip: slipWords(st.slipDays),
    gates: job.map(g => {
      const s = [install, setup, commission, handover].find(x => x.gate === g.gate);
      return { gate: g.gate, label: g.label, tone: g.tone, says: s?.says ?? '' };
    }),
    machines,
    sections: [install, setup, commission, handover],
    fixes: { open: fixes.filter(f => f.tone !== 'done'), done: fixes.filter(f => f.tone === 'done') },
    ...(() => {
      const fixWords = (f: Test) => `Fix: ${f.title} — ${f.outcome === 'passed' ? `done${f.ranOn ? ` ${niceDay(f.ranOn)}` : ''}`
        : f.plannedFor ? `booked ${niceDay(f.plannedFor)}` : 'no day yet'}${f.withWhom ? `, ${f.withWhom}` : ''}`;
      const told = (c: { open: Critical[]; sorted: Critical[] }) => ({
        open: c.open.map(r => ({
          what: r.item.what,
          meta: [r.where, `raised ${niceDay(r.day)}`, r.item.owner, r.item.hoursLost ? `${hoursWord(r.item.hoursLost)} lost` : ''].filter(Boolean).join(' · '),
          ...(r.item.impact ? { impact: r.item.impact } : {}),
          ways: (r.item.ways ?? []).map(w => ({ what: w.what, agreed: !!w.agreed })),
          ...(r.fix ? { fix: fixWords(r.fix) } : {}),
          /* The agreed way is marked in the list just above — said once. */
          state: r.agreed ? 'open · a way round it is agreed' : criticalState(r),
          ...(r.item.couldLose ? { could: couldWords(r.item), couldLose: r.item.couldLose } : {}),
        })),
        sorted: c.sorted.map(r => `${r.item.what} — ${r.where} · ${criticalState(r)}${r.agreed ? ` · went with: ${r.agreed.what}` : ''}`),
      });
      return { critical: told(criticalProblems(tests, items, assets)), risks: told(riskProblems(tests, items, assets)) };
    })(),
    noted: (() => {
      const n = notedProblems(tests, items, assets);
      const line = (r: typeof n.open[number]) => `${r.item.what} — ${r.where}, ${niceDay(r.day)}${r.item.hoursLost ? ` · ${hoursWord(r.item.hoursLost)} lost` : ''}`;
      const plain = (r: typeof n.open[number]) => !r.item.critical && !r.item.risk;
      return { open: n.open.filter(plain).map(line), sorted: n.sorted.filter(plain).map(line) };
    })(),
    waiting: st.rows,
    standards: live(x.standards),
    /* Notes are never on the client's copy — they are private
       preparation — so a note's reminder stays off its plan page too. */
    plan: st.plan.filter(m => m.kind !== 'note'),
    planRecords: { tests, items: items.filter(i => i.kind === 'found' || i.kind === 'next'), assets, programs, ...(x.walk?.length ? { walk: x.walk } : {}), ...(project.dayHours ? { dayHours: project.dayHours } : {}),
      stages: Object.fromEntries((['install', 'setup', 'handover'] as const).map(gt => [gt, usualStages(project, x.projects, gt).stages])) },
    today,
    ...(project.expectedAt ? { expectedAt: project.expectedAt } : {}),
    ...(project.plannedAt ? { plannedAt: project.plannedAt } : {}),
  };
}

/** "2 at Commission · 1 at Install" — the machines in one line. */
export function machinesSay(r: Pick<ClientReport, 'machines'>): string {
  return machinesWhere(r.machines.map(m => m.at)) || plural(0, 'machine');
}
