/* THE COMMISSIONING REPORT — where commissioning has got to, machine by
 * machine, for the meeting or to send.
 *
 * Rowland, 14 October: "make sure we have a fully functional commissioning
 * report and structure ... clearly then make reports on the commissioning
 * stages, where we got to, the problems ... a commissioning report,
 * commissioning cards, something that way I can present in the meeting or
 * send."
 *
 * Read in the order every page of this app is (docs/SIMPLE.md): where we are
 * — the gate's count, the handover date, each machine's word; why we are not
 * where we should be — the tests that did not pass or are late, with what was
 * seen, the programs gone wrong, the critical issues; what we are doing about
 * it — the fixes with who and by when, the tests booked next, the problems
 * taken for the job. Then each machine whole: its tests against what each had
 * to show, its programs as the Commission board counts them, and everything
 * still open on it.
 *
 * NOTHING IS WORKED OUT TWICE. A machine's place, its tests and what is open
 * on it are the handover reading's (lib/handoverReport); the gate's count,
 * the fixes, the critical issues, the register's problems and the runs the
 * client report's (lib/clientReport); a machine's programs the board's
 * (lib/commission programsCell over lib/commissionPrograms) — so this paper,
 * the client report, the hand-over and Commission's own screen cannot
 * disagree. Pure. */
import type { ClientReport, CriticalRow, FixRow, RunRow } from './clientReport';
import type { HandoverReport, HoTest } from './handoverReport';
import type { OnTarget } from './onTarget';
import { latestAttempts, live, plannedEnd, type Asset, type Test } from './testing';
import { programsCell, programsWords } from './commission';
import type { Program } from './programs';
import { niceDay } from './weeks';
import { programJourney } from './programJourney';
import type { LeanTile, LeanTone } from './lean';
import { moneyTile } from './stageGateLean';
import { commissionClosing, commissionTiles } from './stageGatePages';

/** A machine's word, in the house's colours: g ready or handed over, r
 *  behind, a passed but with something still open, w under way, n not
 *  started. */
export type CmTone = 'g' | 'r' | 'a' | 'w' | 'n';

export interface CmMachine {
  name: string;
  /** "Installed", "at Commission", "Handed over" (lib/install machineAt). */
  at: string;
  verdict: { word: string; tone: CmTone };
  /** The latest attempt of each of its tests. */
  counts: { tests: number; passed: number; failed: number; late: number; booked: number; noDay: number };
  /** "4 of 6 passed · 1 didn't pass · 1 late · 1 booked". */
  testsSaid: string;
  tests: HoTest[];
  /** As the Commission board counts them — "4 programs · 1 proved · 2 being
   *  tested · 1 with no test"; absent with none. */
  programs?: string;
  /** Its programs' tests gone wrong — failed, not run, or their day gone. */
  programsWrong: number;
  /** Everything still open on it (the handover reading's). */
  open: string[];
  /** "Seal integrity — booked Thu 16 Oct": its next test with a day ahead. */
  next?: string;
  /** EACH PROGRAM'S JOURNEY — every test of it, first to last, with the speed
   *  and the time it ran (lib/programJourney; Rowland, 14 October: "show the
   *  journey of our commissioning"). Only programs tested at least once. */
  journeys: CmJourney[];
}

export interface CmJourney { what: string; says: string; best?: string; steps: { text: string; tone: CmTone }[] }

export interface CmLine { text: string; meta?: string; tone: CmTone }

export interface CommissioningReport {
  name: string;
  lead?: string;
  printed: string;
  link?: string;
  verdict: OnTarget;
  /** "4 of 9 passed · 1 didn't pass" — the gate's, as Commission says it. */
  says: string;
  /** "Handover agreed Mon 3 Nov · now expected Fri 7 Nov". */
  dates: string;
  /** "2 ready · 3 under way · 1 behind" — the machines in a line. */
  machinesSaid: string;
  commentary?: { text: string; on?: string; by?: string };
  machines: CmMachine[];
  /** WHY WE ARE NOT WHERE WE SHOULD BE — only the abnormal, red first. */
  why: CmLine[];
  /** WHAT WE ARE DOING ABOUT IT — fixes, the tests booked next, problems
   *  taken for the job; who and by when in the meta. */
  doing: CmLine[];
  /** The tests booked next, in day order (the next fortnight's and any with
   *  no day are in the machines). */
  booked: CmLine[];
  /** Open on no one machine (the handover reading's). */
  line: string[];
  /** The job's lines' own programs (the handover reading's). */
  linePrograms: { line: string; says: string; open: string[] }[];
  /** THE LEAN PAGE'S TILES AND CLOSING LINE (lib/stageGatePages) — the
   *  counts Commission's tiles say, and the job's money (lib/stageGateLean
   *  moneyTile, from the client report's figures). */
  tiles: LeanTile[];
  closing: { text: string; tone: LeanTone };
  /** The performance runs, a row a product (the client report's). */
  runs: RunRow[];
  /** The journeys of programs on the line itself — on no machine of the job. */
  lineJourneys: CmJourney[];
}

export interface CommissioningInput {
  client: ClientReport;
  handover: HandoverReport;
  /** The job's machines, its tests, and the programs the board counts
   *  (lib/commissionPrograms commissionPrograms). */
  assets: Asset[];
  tests: Test[];
  programs: Program[];
  today: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** When a test still to run is: "booked Thu 16 Oct", or, its block begun,
 *  "under way, to Thu 15 Oct". */
const whenBooked = (t: Test, today: string): string => {
  const end = plannedEnd(t) ?? t.plannedFor;
  return (t.plannedFor ?? '') < today && end ? `under way, to ${niceDay(end, { weekday: 'short' })}` : `booked ${niceDay(t.plannedFor, { weekday: 'short' })}`;
};

/** A machine's word from its tests and what is open on it. */
function verdictOf(m: { at: string; counts: CmMachine['counts']; open: string[]; programsWrong: number }): CmMachine['verdict'] {
  const c = m.counts;
  if (/handed over/i.test(m.at)) return { word: 'Handed over', tone: 'g' };
  if (c.failed || c.late || m.programsWrong) {
    const bits = [c.failed && `${c.failed} didn’t pass`, c.late && `${c.late} late`, m.programsWrong && `${plural(m.programsWrong, 'program')} gone wrong`].filter(Boolean);
    return { word: `Behind — ${bits.join(', ')}`, tone: 'r' };
  }
  if (!c.tests) return { word: 'Not started — no tests planned', tone: 'n' };
  if (c.passed === c.tests) return m.open.length ? { word: `Tests passed — ${m.open.length} still open`, tone: 'a' } : { word: 'Ready to hand over', tone: 'g' };
  if (c.passed === 0 && c.booked === 0) return { word: 'Not started — no test booked', tone: 'n' };
  return { word: 'Under way', tone: 'w' };
}

const fixLine = (f: FixRow): CmLine => ({
  text: `Fix: ${f.title}`,
  meta: [f.machine, f.problem && `for ${f.problem}`, f.who, f.when].filter(Boolean).join(' · '),
  tone: f.tone === 'late' || f.tone === 'notRun' ? 'r' : f.tone === 'soon' ? 'a' : f.tone === 'done' ? 'g' : 'w',
});
const criticalLine = (c: CriticalRow): CmLine => ({ text: `Critical: ${c.what}`, meta: [c.meta, c.state, c.fix].filter(Boolean).join(' · '), tone: 'r' });

export function commissioningReport(x: CommissioningInput): CommissioningReport {
  const { client: c, handover: h, today } = x;
  const tests = live(x.tests).filter(t => (t.kind ?? 'test') === 'test');
  const now = latestAttempts(tests);
  const assets = live(x.assets).sort((a, b) => a.sort - b.sort);
  const commission = c.sections.find(s => s.gate === 'commission');

  /* EACH MACHINE: the handover reading's place, tests and open list; the
     board's programs; its next test with a day ahead */
  const machines: CmMachine[] = h.machines.map(hm => {
    const a = assets.find(q => q.name === hm.name);
    const counts = {
      tests: hm.tests.length,
      passed: hm.tests.filter(t => t.tone === 'done').length,
      failed: hm.tests.filter(t => t.tone === 'failed').length,
      late: hm.tests.filter(t => t.tone === 'late').length,
      booked: hm.tests.filter(t => t.tone === 'ahead').length,
      noDay: hm.tests.filter(t => t.tone === 'none').length,
    };
    const pc = a ? programsCell(x.programs.filter(p => !p.deletedAt && (p.assetId ?? '') === a.id), tests, today) : undefined;
    const next = a ? now.filter(t => t.assetId === a.id && t.outcome === 'planned' && !!t.plannedFor && (plannedEnd(t) ?? t.plannedFor) >= today)
      .sort((p, q) => (p.plannedFor ?? '').localeCompare(q.plannedFor ?? ''))[0] : undefined;
    const testsSaid = counts.tests
      ? [`${counts.passed} of ${counts.tests} passed`, counts.failed && `${counts.failed} didn’t pass`, counts.late && `${counts.late} late`,
        counts.booked && `${counts.booked} booked`, counts.noDay && `${counts.noDay} with no day`].filter(Boolean).join(' · ')
      : 'no tests planned';
    const m = { at: hm.at, counts, open: hm.open, programsWrong: pc?.wrong ?? 0 };
    const journeys = a ? journeysOf(x.programs.filter(p => (p.assetId ?? '') === a.id), x.tests, today) : [];
    return {
      name: hm.name, at: hm.at, verdict: verdictOf(m), counts, testsSaid, tests: hm.tests,
      ...(pc ? { programs: programsWords(pc) } : {}), programsWrong: pc?.wrong ?? 0, open: hm.open,
      ...(next ? { next: `${next.title} — ${whenBooked(next, today)}` } : {}),
      journeys,
    };
  });

  /* WHY — only the abnormal: a test that did not pass or is late, with what
     was seen; a machine's programs gone wrong; a critical issue */
  const why: CmLine[] = [
    ...machines.flatMap(m => m.tests.filter(t => t.tone === 'failed' || t.tone === 'late').map((t): CmLine => ({
      text: `${m.name}: ${t.title} — ${t.word.toLowerCase()}${t.when ? `, ${t.when}` : ''}`,
      ...(t.said ? { meta: `Seen: ${t.said}` } : t.passesIf ? { meta: `Had to show: ${t.passesIf}` } : {}),
      tone: 'r',
    }))),
    ...machines.filter(m => m.programsWrong).map((m): CmLine => ({ text: `${m.name}: ${plural(m.programsWrong, 'program')}’ tests gone wrong`, meta: m.programs, tone: 'r' })),
    ...c.critical.open.map(criticalLine),
  ];

  /* WHAT WE ARE DOING — the fixes, then the problems taken for the job */
  const doing: CmLine[] = [
    ...c.fixes.open.map(fixLine),
    ...c.assigned.map((p): CmLine => ({ text: `Problem (${p.priority}): ${p.what}`, meta: [p.meta, p.due].filter(Boolean).join(' · '), tone: p.late ? 'r' : p.priority === 'critical' ? 'r' : p.priority === 'high' ? 'a' : 'w' })),
  ];

  /* BOOKED NEXT — every test still to run with a day ahead, in day order */
  const name = (id?: string) => assets.find(a => a.id === id)?.name ?? 'The line';
  const booked: CmLine[] = now.filter(t => t.outcome === 'planned' && !!t.plannedFor && (plannedEnd(t) ?? t.plannedFor) >= today)
    .sort((p, q) => (p.plannedFor ?? '').localeCompare(q.plannedFor ?? ''))
    .map(t => ({ text: `${(t.plannedFor ?? '') < today ? `On now, to ${niceDay(plannedEnd(t) ?? t.plannedFor, { weekday: 'short' })}` : niceDay(t.plannedFor, { weekday: 'short' })} — ${name(t.assetId)}: ${t.title}`, ...(t.withWhom?.trim() ? { meta: t.withWhom.trim() } : {}), tone: 'w' as const }));

  const tally = (tone: CmTone) => machines.filter(m => m.verdict.tone === tone).length;
  const machinesSaid = machines.length
    ? [tally('g') && `${tally('g')} ready or handed over`, tally('a') && `${tally('a')} passed with something open`, tally('w') && `${tally('w')} under way`,
      tally('r') && `${tally('r')} behind`, tally('n') && `${tally('n')} not started`].filter(Boolean).join(' · ')
    : 'no machines on the project yet';

  const dates = [h.agreed && `Handover agreed ${niceDay(h.agreed, { weekday: 'short' })}`,
    !h.handedOver && h.expected && h.expected !== h.agreed && `now expected ${niceDay(h.expected, { weekday: 'short' })}`,
    h.handedOver && h.handedOn && `handed over ${niceDay(h.handedOn, { weekday: 'short' })}`].filter(Boolean).join(' · ') || 'No handover date agreed yet';

  const counts = { passed: now.filter(t => t.outcome === 'passed').length, total: now.length, failed: now.filter(t => t.outcome === 'failed').length, notRun: now.filter(t => t.outcome === 'notRun').length };
  const money = moneyTile(c.figures);
  return {
    name: c.name, ...(c.lead ? { lead: c.lead } : {}), printed: c.printed, ...(c.link ? { link: c.link } : {}),
    tiles: commissionTiles(counts, money), closing: commissionClosing(counts, money),
    verdict: c.onTarget, says: commission?.says ?? 'No tests planned yet', dates, machinesSaid,
    ...(c.commentary ? { commentary: c.commentary } : {}),
    machines, why, doing, booked, line: h.line, linePrograms: h.linePrograms, runs: commission?.runs ?? [],
    lineJourneys: journeysOf(x.programs.filter(p => !p.assetId || !assets.some(a => a.id === p.assetId)), x.tests, today),
  };
}

/** Each program's journey, those tested at least once (lib/programJourney). */
function journeysOf(programs: Program[], tests: Test[], today: string): CmJourney[] {
  return programs.filter(p => !p.deletedAt).flatMap(p => {
    const j = programJourney(p, tests, today);
    return j.attempts.length ? [{ what: p.what, says: j.says ?? '', ...(j.best ? { best: j.best } : {}), steps: j.attempts.map(s => ({ text: s.text, tone: s.result.tone })) }] : [];
  });
}
