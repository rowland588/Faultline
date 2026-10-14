/* THE HANDOVER REPORT — the line as it was really handed over
 * (docs/HANDOVER.md).
 *
 * Rowland, 9 October: "The handover page needs to show the reality, and in
 * reality things don't go to plan, and business will accept handovers ...
 * nothing gets blocked, but we show the status." And: it is an internal tool,
 * for a team to make sure things are done properly inside their own factory.
 *
 * So this is the record a team keeps that a line was handed over. For the
 * job: whether it was handed over, on what day against the day agreed, and
 * what was still open. Then every machine as it really is: where it is and
 * what it went with; its tests against what each had to show, including the
 * ones that did not pass, did not run or were never kept; its hand-over list
 * with the day each was planned and done; each sign-off with who signed and
 * what it accepted; and what is still open on it, with who and by when. Then
 * lines to sign.
 *
 * Nothing new is read or worked out here. The verdict is lib/onTarget's, the
 * sentence lib/standing's, a machine's place and what it went with
 * lib/install's, so the page and the screens cannot disagree. Pure. */
import { recordProvedLine } from './studyLinks';
import type { ToolStudy } from './study';
import { filesSaid, isOverdue, latestAttempts, live, outcomeWord, plannedEnd, testOfFix, type Asset, type Test, type TestItem } from './testing';
import { answerOf, doneLateBy, handedOverWith, installOf, isSignOff, journeyOf, machineAt, machineNow, stillOpenOn } from './install';
import { standing } from './standing';
import { stageGateOnTarget, type OnTarget } from './onTarget';
import { isHere, type Material } from './materials';
import type { Program } from './programs';
import { niceDay } from './weeks';
import type { Project } from '../types';
import type { Snag } from '../snag/types';
import { programsOpenOn, programsReading, type ProgramsReading } from './programsReport';
import { jobLineReadings, type JobLinePrograms } from './lineRecords';
import { notedProblems } from './noted';
import { assignedToJob, assignedWords, namesMachine, wentWithAlso } from './clientReport';
import { PRIORITY_WORD } from './snagsReport';

/** done · didn't pass · late (its day gone, or never run) · still ahead · no day. */
export type HoTone = 'done' | 'failed' | 'late' | 'ahead' | 'none';

export interface HoTest {
  title: string;
  /** What it had to show — as agreed. */
  passesIf?: string;
  /** "Passed", "Didn't pass", "Didn't run", "Planned"… (testing outcomeWord). */
  word: string;
  /** "27 Sept", "12 Oct", "was 3 Oct", "no day set". */
  when?: string;
  tone: HoTone;
  /** What was seen, as written. */
  said?: string;
  /** Its files by name — a test report, a certificate (docs/PANELS.md). */
  files?: string;
  /** What proved it — a study at the line (lib/studyLinks). */
  proved?: string;
}

export interface HoItem {
  title: string;
  who?: string;
  /** "done 7 Oct", "done 9 Oct, 2 days after the day planned", "late — was
   *  7 Oct", "planned 12 Oct", "no day set". */
  state: string;
  tone: HoTone;
  /** Its account, as written — on a sign-off, what it accepted. */
  said?: string;
  /** Its files by name — the drawings handed over, the signed sheet. */
  files?: string;
  signOff: boolean;
}

export interface HoMachine {
  name: string;
  /** "Handed over", "at Commission", "due on site" (lib/install machineAt). */
  at: string;
  /** The day it was handed over — its last hand-over line's. */
  on?: string;
  /** What it was handed over with (lib/install handedOverWith). */
  with: string[];
  tests: HoTest[];
  /** No test was ever kept on it. */
  noTest: boolean;
  items: HoItem[];
  /** Everything still open on it, by name (lib/install stillOpenOn) — and
   *  its programs not done as the Programs page says them (lib/programsReport
   *  programsOpenOn), its problems with no fix, and the register's problems
   *  for this job on it, not on the job yet. */
  open: string[];
  /** Its programs in a line — "4 programs · 3 done — 2 passed, 1 at
   *  baseline · 1 failed" — when it has any. */
  programs?: string;
}

export interface HandoverReport {
  name: string;
  /** The job's address, set by the screen at print time — the code on the
   *  first page (lib/report/codeHeader). */
  link?: string;
  lead?: string;
  printed: string;
  verdict: OnTarget;
  /** lib/standing's sentence: where the job is, or how it was handed over. */
  sentence: string;
  handedOver: boolean;
  agreed?: string;
  expected?: string;
  handedOn?: string;
  /** "3 of 4 machines handed over". */
  machinesSaid: string;
  machines: HoMachine[];
  /** Still open on no one machine — a fix for the line, a material not in,
   *  a problem on no machine, one on the register for the job. */
  line: string[];
  /** THE JOB'S LINES' OWN PROGRAMS — planned on the line with no job, shown
   *  on the job's Programs page and proved by its tests: the line's reading
   *  in a line, and those not done by name. */
  linePrograms: { line: string; says: string; open: string[] }[];
  /** The lines to sign. */
  sign: string[];
}

export interface HandoverInput {
  project: Pick<Project, 'name' | 'lead' | 'plannedAt' | 'expectedAt'> & Partial<Pick<Project, 'gateStages' | 'id'>>;
  assets: Asset[]; tests: Test[]; items: TestItem[];
  materials: Material[]; programs: Program[];
  /** The job's studies — what proved each test (lib/study). */
  studies?: ToolStudy[];
  /** The studies that can show a program proved — the job's and its lines'. */
  proofStudies?: ToolStudy[];
  /** The job's lines' own programs (lib/clientReport ClientReportInput). */
  linePrograms?: JobLinePrograms[];
  /** The tests that prove programs, on whichever job. */
  provingTests?: Test[];
  /** The register's problems taken for this job (Snag.projectId). */
  assigned?: Snag[];
  lineName?: (wsId: string) => string;
  today: string;
}

/** A PROGRAMS READING ON ONE MACHINE, in a line — "4 programs · 3 done — 2
 *  passed, 1 at baseline · 1 failed · 1 to do". Undefined with none. */
export function programsSaidOn(r: ProgramsReading | undefined, assetId: string): string | undefined {
  const ls = (r?.lines ?? []).filter(l => (l.assetId ?? '') === assetId);
  if (!ls.length) return undefined;
  const n = (b: string) => ls.filter(l => l.bucket === b).length;
  const done = n('done'), base = n('baseline'), all = done + base;
  return [`${plural(ls.length, 'program')}`, `${all} done${all ? ` — ${[`${done} passed`, base ? `${base} at baseline` : ''].filter(Boolean).join(', ')}` : ''}`,
    n('failed') ? `${n('failed')} failed` : '', n('late') ? `${n('late')} late` : '', n('open') ? `${n('open')} to do` : ''].filter(Boolean).join(' · ');
}

const day = (iso?: string) => (iso ? niceDay(iso) : undefined);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function handoverReport(x: HandoverInput): HandoverReport {
  const { today } = x;
  const tests = live(x.tests), items = live(x.items), assets = live(x.assets).sort((a, b) => a.sort - b.sort);
  const materials = live(x.materials), programs = live(x.programs);
  const { plannedAt, expectedAt } = x.project;
  const st = standing({ tests, items, assets, materials, programs, expectedAt, plannedAt, today });
  const verdict = stageGateOnTarget({ project: x.project, tests, items, assets, materials, programs, today }, st);

  /* THE PROGRAMS, read once — as the Programs page and the programs report
     say them, proved by a test or a study on the line (lib/programsReport). */
  const progs = programsReading({ tests, items, assets, programs, today, holder: x.project, studies: x.proofStudies ?? x.studies ?? [] });
  /* PROBLEMS WITH NO FIX (lib/noted) — the machine's, and the line's. */
  const noted = notedProblems(tests, items, assets).open;
  const flag = (i: { critical?: boolean; risk?: boolean }) => (i.critical ? ' (critical)' : i.risk ? ' (high risk)' : '');
  const problemOf = (r: (typeof noted)[number]) => `Problem, no fix${flag(r.item)}: ${r.item.what}${r.on ? ` — ${r.on.title}` : ''}`;
  /* THE REGISTER'S PROBLEMS FOR THIS JOB, NOT ON IT YET — on the machine
     they name, else on the line (the Fixes page's list). */
  const assigned = assignedToJob(x.assigned ?? [], x.project.id ?? '').map(sn => ({ sn, w: assignedWords(sn, today, x.lineName) }));
  const assignedOf = (a: { sn: Snag; w: ReturnType<typeof assignedWords> }) => `Problem for this job, not on it yet (${PRIORITY_WORD[a.sn.priority ?? 'low']}): ${a.w.what} — ${[a.w.meta, a.w.due].filter(Boolean).join(' · ')}`;
  const onAsset = (a: Asset, sn: Snag) => namesMachine(sn, a);

  const machines: HoMachine[] = assets.map(a => {
    const j = journeyOf(a, tests, items, today, programs);
    const at = machineAt(a, j).says;
    const progOpen = programsOpenOn(progs, a.id, programs);
    const mineNoted = noted.filter(r => r.on?.assetId === a.id);
    const mineAssigned = assigned.filter(x => onAsset(a, x.sn));
    const progSaid = programsSaidOn(progs, a.id);
    const hand = installOf(a, tests, items, today, 'handover').steps.map(v => v.step);
    const on = at === 'Handed over'
      ? hand.filter(t => t.outcome === 'passed').map(t => t.ranTo ?? t.ranOn).filter((d): d is string => !!d).sort().pop()
      : undefined;
    const proofs = latestAttempts(tests).filter(t => t.assetId === a.id);
    return {
      name: a.name, at, ...(on ? { on } : {}),
      /* what it went with — a program that failed or is not proved, a
         problem with no fix, among it (flow audit #3) */
      with: machineNow(j) === 'Handed over' ? [...handedOverWith(a, tests, items, today, programs), ...wentWithAlso(a, progs, programs, noted, assigned.map(x => x.sn))] : [],
      ...(progSaid ? { programs: progSaid } : {}),
      tests: proofs.map((t): HoTest => {
        const tone: HoTone = t.outcome === 'passed' ? 'done' : t.outcome === 'failed' ? 'failed'
          : t.outcome === 'notRun' || isOverdue(t, today) ? 'late' : t.plannedFor ? 'ahead' : 'none';
        /* The word says planned or not run; the day beside it is the day. */
        const when = t.ranOn ? day(t.ranTo ?? t.ranOn)
          : t.plannedFor ? `${tone === 'late' ? 'was ' : ''}${day(plannedEnd(t) ?? t.plannedFor)}` : 'no day set';
        return {
          title: t.title, word: outcomeWord(t), tone, ...(when ? { when } : {}),
          ...(t.passesIf?.trim() ? { passesIf: t.passesIf.trim() } : {}),
          ...(t.result?.trim() ? { said: t.result.trim() } : {}),
          ...(filesSaid(t) ? { files: filesSaid(t) } : {}),
          ...(() => { const pr = recordProvedLine(x.studies ?? [], t); return pr ? { proved: pr } : {}; })(),
        };
      }),
      noTest: proofs.length === 0,
      items: hand.map((t): HoItem => {
        const done = t.outcome === 'passed';
        const by = done ? doneLateBy(t, items) : 0;
        const tone: HoTone = done ? 'done' : isOverdue(t, today) ? 'late' : t.plannedFor ? 'ahead' : 'none';
        const state = done
          ? `done ${day(t.ranTo ?? t.ranOn) ?? ''}${by ? `, ${plural(by, 'day')} after the day planned` : ''}`.trim()
          : tone === 'late' ? `late — was ${day(plannedEnd(t) ?? t.plannedFor)}`
            : t.plannedFor ? `planned ${day(plannedEnd(t) ?? t.plannedFor)}` : 'no day set';
        return {
          title: t.title, state, tone, signOff: isSignOff(t, x.project),
          ...(t.withWhom?.trim() ? { who: t.withWhom.trim() } : {}),
          ...(t.result?.trim() ? { said: t.result.trim() } : {}),
          /* What was handed over, by name — and a paperwork line done with
             nothing attached says so, in its place (docs/PANELS.md). */
          ...(filesSaid(t) ? { files: filesSaid(t) } : done && answerOf(t, x.project, items) === 'paperwork' ? { files: 'No file kept' } : {}),
        };
      }),
      open: [...stillOpenOn(a, tests, items, today, programs).names, ...progOpen.names, ...mineNoted.map(problemOf), ...mineAssigned.map(assignedOf)],
    };
  });

  /* Open on no one machine — a fix for the line, a material not in. */
  const onMachine = new Set(assets.map(a => a.id));
  const line = [
    ...tests.filter(t => t.kind === 'fix' && t.outcome !== 'passed' && !onMachine.has((t.assetId ?? testOfFix(t, tests)?.assetId) ?? ''))
      .map(t => `Fix: ${t.title}${t.withWhom?.trim() ? ` · ${t.withWhom.trim()}` : ''}${t.plannedFor ? ` · ${isOverdue(t, today) ? 'was ' : ''}${day(plannedEnd(t) ?? t.plannedFor)}` : ''}`),
    ...materials.filter(m => !isHere(m))
      .map(m => `Material: ${m.what}${m.from?.trim() ? ` · ${m.from.trim()}` : ''}${m.due ? ` · ${m.due < today ? 'was due' : 'due'} ${day(m.due)}` : ''}`),
    /* a program on the line itself, not done (lib/programsReport programsOpenOn) */
    ...programsOpenOn(progs, '', programs).names,
    ...noted.filter(r => !r.on?.assetId || !onMachine.has(r.on.assetId)).map(problemOf),
    ...assigned.filter(x => !assets.some(a => onAsset(a, x.sn))).map(assignedOf),
  ];
  /* THE LINE'S OWN PROGRAMS, as the line's Programs page reads them */
  const proving = [...tests, ...(x.provingTests ?? []).filter(t => !tests.some(u => u.id === t.id))];
  const linePrograms = jobLineReadings(x.linePrograms ?? [], today, { tests: proving, studies: x.proofStudies ?? [] }).map(({ line: name, reading: r }) => ({
    line: name, says: r.says, open: r.lines.filter(p => p.bucket !== 'done' && p.bucket !== 'baseline').map(p => `${p.machine} — ${p.what}: ${p.word}${p.who ? ` · ${p.who}` : ''}`),
  }));

  const handed = machines.filter(m => m.at.startsWith('Handed over')).length;
  return {
    name: x.project.name,
    ...(x.project.lead ? { lead: x.project.lead } : {}),
    printed: niceDay(today, { year: true }),
    verdict, sentence: st.sentence, handedOver: !!st.handedOver,
    ...(plannedAt ? { agreed: plannedAt } : {}),
    ...(expectedAt ? { expected: expectedAt } : {}),
    ...(st.handedOn ? { handedOn: st.handedOn } : {}),
    machinesSaid: assets.length ? `${handed} of ${plural(assets.length, 'machine')} handed over` : 'No machines on the job yet',
    machines, line, linePrograms,
    sign: ['Handed over by', 'Taken over by', 'Safety'],
  };
}
