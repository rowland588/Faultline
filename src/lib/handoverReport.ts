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
import { filesSaid, isOverdue, latestAttempts, live, outcomeWord, plannedEnd, testOfFix, type Asset, type Test, type TestItem } from './testing';
import { doneLateBy, handedOverWith, installOf, isSignOff, journeyOf, machineAt, stillOpenOn } from './install';
import { standing } from './standing';
import { stageGateOnTarget, type OnTarget } from './onTarget';
import { isHere, type Material } from './materials';
import type { Program } from './programs';
import { niceDay } from './weeks';
import type { Project } from '../types';

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
  /** Everything still open on it, by name (lib/install stillOpenOn). */
  open: string[];
}

export interface HandoverReport {
  name: string;
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
  /** Still open on no one machine — a fix for the line, a material not in. */
  line: string[];
  /** The lines to sign. */
  sign: string[];
}

export interface HandoverInput {
  project: Pick<Project, 'name' | 'lead' | 'plannedAt' | 'expectedAt'>;
  assets: Asset[]; tests: Test[]; items: TestItem[];
  materials: Material[]; programs: Program[];
  today: string;
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

  const machines: HoMachine[] = assets.map(a => {
    const j = journeyOf(a, tests, items, today, programs);
    const at = machineAt(a, j).says;
    const hand = installOf(a, tests, items, today, 'handover').steps.map(v => v.step);
    const on = at === 'Handed over'
      ? hand.filter(t => t.outcome === 'passed').map(t => t.ranTo ?? t.ranOn).filter((d): d is string => !!d).sort().pop()
      : undefined;
    const proofs = latestAttempts(tests).filter(t => t.assetId === a.id);
    return {
      name: a.name, at, ...(on ? { on } : {}),
      with: handedOverWith(a, tests, items, today, programs),
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
          title: t.title, state, tone, signOff: isSignOff(t),
          ...(t.withWhom?.trim() ? { who: t.withWhom.trim() } : {}),
          ...(t.result?.trim() ? { said: t.result.trim() } : {}),
          ...(filesSaid(t) ? { files: filesSaid(t) } : {}),
        };
      }),
      open: stillOpenOn(a, tests, items, today, programs).names,
    };
  });

  /* Open on no one machine — a fix for the line, a material not in. */
  const onMachine = new Set(assets.map(a => a.id));
  const line = [
    ...tests.filter(t => t.kind === 'fix' && t.outcome !== 'passed' && !onMachine.has((t.assetId ?? testOfFix(t, tests)?.assetId) ?? ''))
      .map(t => `Fix: ${t.title}${t.withWhom?.trim() ? ` · ${t.withWhom.trim()}` : ''}${t.plannedFor ? ` · ${isOverdue(t, today) ? 'was ' : ''}${day(plannedEnd(t) ?? t.plannedFor)}` : ''}`),
    ...materials.filter(m => !isHere(m))
      .map(m => `Material: ${m.what}${m.from?.trim() ? ` · ${m.from.trim()}` : ''}${m.due ? ` · ${m.due < today ? 'was due' : 'due'} ${day(m.due)}` : ''}`),
  ];

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
    machines, line,
    sign: ['Handed over by', 'Taken over by', 'Safety'],
  };
}
