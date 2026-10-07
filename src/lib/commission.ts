/* COMMISSION, MACHINE BY MACHINE — the usual tests, and the programs.
 *
 * Rowland, 6 October: "in commissioning we don't yet have a default set that
 * you made for the other gates — I now want this. Also programs are directly
 * linked to commissioning, so make the link."
 *
 * Install, Set up and Hand over each have a usual list ticked off per machine
 * on a grid. Commission now has one too: its usual TESTS (testing
 * COMMISSION_TESTS, edited per job like the stages — lib/install usualStages
 * with the gate 'commission'). And beside them, each machine's programs —
 * loaded at Set up, PROVED here, one test each (lib/programs programAfterTest).
 *
 * Nothing is stored here: a square is the latest attempt of the test of that
 * name on that machine, read off the tests; the programs square is read off
 * the programs and the tests that prove them. */
import { isOverdue, latestAttempts, live, needsVerdict, type Asset, type Test } from './testing';
import { stageKey } from './install';
import { isProved, live as liveProgs, stateOf, type Program } from './programs';
import { niceDay } from './weeks';

/** The house colours (CLAUDE.md): green done, red late or failed, amber owed
 *  a verdict, indigo booked, grey no day yet. */
export type CellTone = 'g' | 'r' | 'a' | 'w' | 'n';

export interface TestCell {
  /** The latest attempt — what the square says. */
  test: Test;
  tone: CellTone;
  /** "passed 3 Oct" · "didn't pass" · "booked 9 Oct" · "no day yet". */
  word: string;
}

/** A test as it stands, in a word and a colour — the square, the programs
 *  list and the drawer's program line all say it the same way. */
export function testCell(t: Test, today: string): Pick<TestCell, 'tone' | 'word'> {
  if (t.outcome === 'passed') return { tone: 'g', word: `passed${t.ranOn ? ` ${niceDay(t.ranOn)}` : ''}` };
  if (t.outcome === 'failed') return { tone: 'r', word: 'didn’t pass' };
  if (t.outcome === 'notRun') return { tone: 'r', word: 'didn’t run' };
  if (needsVerdict(t)) return { tone: 'a', word: 'ran — passed?' };
  if (isOverdue(t, today)) return { tone: 'r', word: `late · was ${niceDay(t.plannedFor)}` };
  if (t.plannedFor) return { tone: 'w', word: `booked ${niceDay(t.plannedFor)}` };
  return { tone: 'n', word: 'no day yet' };
}

/** The newest attempt of a test — its re-tests followed forward. */
export function latestOf(t: Test, tests: Test[]): Test {
  const ts = live(tests).filter(x => (x.kind ?? 'test') === 'test');
  let cur = t;
  for (let guard = 0; guard < 50; guard++) {
    const next = ts.find(x => x.fromTestId === cur.id);
    if (!next) break;
    cur = next;
  }
  return cur;
}

export interface ProgramsCell {
  total: number;
  proved: number;
  /** Not proved, and a test booked or under way for it. */
  testing: number;
  /** Not proved, and no test planned for it yet. */
  noTest: number;
  /** Its test has gone wrong — failed, did not run, or its day has gone. */
  wrong: number;
}

export interface CommissionRow {
  asset?: Asset;
  /** One per column — the usual tests, in the list's order; absent where it
   *  is not on this machine. */
  cells: (TestCell | undefined)[];
  /** THIS MACHINE'S OTHER TESTS — planned by hand, or named before the list
   *  existed. They are this machine's, so they sit in its row, never as a
   *  column across every machine (docs/SIMPLE.md). */
  others: TestCell[];
  /** How many of the USUAL tests are not on this machine yet. */
  missing: number;
  programs?: ProgramsCell;
}

export interface CommissionBoard {
  /** The usual tests — the job's list, kept in one place (Edit the usual
   *  tests). Only those: Rowland, 7 October, could not remove a column made
   *  from a test planned once on one machine, because it was never on the
   *  list. A program's test is counted under the machine's programs. */
  columns: string[];
  usualCount: number;
  rows: CommissionRow[];
}

/** A program's proving test as it stands now, if it has one. */
export function provingTestOf(p: Program, tests: Test[]): Test | undefined {
  const ts = live(tests).filter(t => (t.kind ?? 'test') === 'test');
  const linked = ts.find(t => t.id === p.testId) ?? ts.find(t => t.programId === p.id);
  return linked && latestOf(linked, ts);
}

export function programsCell(progs: Program[], tests: Test[], today: string): ProgramsCell | undefined {
  if (!progs.length) return undefined;
  const c: ProgramsCell = { total: progs.length, proved: 0, testing: 0, noTest: 0, wrong: 0 };
  for (const p of progs) {
    if (isProved(p)) { c.proved++; continue; }
    const t = provingTestOf(p, tests);
    if (!t) { c.noTest++; continue; }
    c.testing++;
    if (testCell(t, today).tone === 'r') c.wrong++;
  }
  return c;
}

/** "5 programs · 2 proved · 1 being tested · 2 with no test", and "· 1 gone
 *  wrong" — the only part that carries colour. */
export const programsWords = (c: ProgramsCell): string =>
  [`${c.total} program${c.total === 1 ? '' : 's'}`, c.proved && `${c.proved} proved`,
    c.testing && `${c.testing} being tested`, c.noTest && `${c.noTest} with no test`].filter(Boolean).join(' · ');

/** Every machine's row — and the line itself, when it has tests or programs
 *  of its own. */
export function commissionGrid(assets: Asset[], tests: Test[], programs: Program[], usual: readonly string[], today: string): CommissionBoard {
  const ts = live(tests).filter(t => (t.kind ?? 'test') === 'test');
  const progs = liveProgs(programs);
  /* The first attempt carries the name; its re-tests are "— re-test". */
  const roots = ts.filter(t => !t.fromTestId || !ts.some(x => x.id === t.fromTestId));
  const columns: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => { const k = stageKey(s); if (k && !seen.has(k)) { seen.add(k); columns.push(s.trim()); } };
  usual.forEach(add);
  const usualCount = columns.length;
  const rowOf = (asset?: Asset): CommissionRow => {
    const mine = roots.filter(t => (t.assetId ?? '') === (asset?.id ?? ''));
    const others = mine.filter(t => !t.programId && !seen.has(stageKey(t.title))).sort((a, b) => a.sort - b.sort)
      .map(root => { const test = latestOf(root, ts); return { test, ...testCell(test, today) }; });
    const cells = columns.map(name => {
      const root = mine.find(t => !t.programId && stageKey(t.title) === stageKey(name));
      if (!root) return undefined;
      const test = latestOf(root, ts);
      return { test, ...testCell(test, today) };
    });
    const pc = programsCell(progs.filter(p => (p.assetId ?? '') === (asset?.id ?? '')), ts, today);
    return { ...(asset ? { asset } : {}), cells, others, missing: cells.filter(c => !c).length, ...(pc ? { programs: pc } : {}) };
  };
  const rows = live(assets).map(a => rowOf(a));
  const line = rowOf(undefined);
  /* The line itself, when it has tests or programs of its own. */
  if (line.cells.some(Boolean) || line.others.length || line.programs) rows.push(line);
  return { columns, usualCount, rows };
}

/** The programs still to prove on a job, in the order they are owed: gone
 *  wrong, then booked, then no test yet — with the test that proves each. */
export function programsToProve(programs: Program[], tests: Test[], today: string): { program: Program; test?: Test; tone: CellTone; word: string }[] {
  const rank: Record<CellTone, number> = { r: 0, a: 1, w: 2, n: 3, g: 4 };
  return liveProgs(programs).filter(p => !isProved(p)).map(program => {
    const test = provingTestOf(program, tests);
    const said = test ? testCell(test, today)
      : { tone: 'n' as const, word: stateOf(program) === 'needed' ? 'not written · no test yet' : 'on the machine · no test yet' };
    return { program, ...(test ? { test } : {}), ...said };
  }).sort((a, b) => rank[a.tone] - rank[b.tone] || a.program.sort - b.program.sort);
}

/* NEEDS YOU — only what is owed on Commission (docs/SIMPLE.md: normal is
 * counted, abnormal is named). Rowland, 7 October: "they want to know the
 * current status ... the failures of why we're not where we should be, and
 * then what we're going to do about it next." Everything on plan is a square
 * on the board and is not listed again.
 *
 *   failed   didn't pass or didn't run, and no re-test planned
 *   late     its day has gone and it has not happened
 *   verdict  it ran and nobody has said how it went
 *   program  a program with no test to prove it
 *
 * In that order: what went wrong first, then what is owed. */
export type NeedKind = 'failed' | 'late' | 'verdict' | 'program';
export interface Need {
  kind: NeedKind;
  test?: Test;
  program?: Program;
  /** "didn't pass — no re-test planned" · "was due 4 Oct" · "ran 6 Oct — passed?" */
  word: string;
  /** Why, when the record says: what happened, or the program's machine. */
  why?: string;
}

export function commissionNeeds(tests: Test[], programs: Program[], today: string): Need[] {
  const latest = latestAttempts(tests).sort((a, b) => a.sort - b.sort);
  const failed: Need[] = [], late: Need[] = [], verdict: Need[] = [];
  for (const t of latest) {
    const why = t.result?.trim() || undefined;
    if (t.outcome === 'failed' || t.outcome === 'notRun') {
      failed.push({ kind: 'failed', test: t, word: `${t.outcome === 'failed' ? 'didn’t pass' : 'didn’t run'} — no re-test planned`, ...(why ? { why } : {}) });
    } else if (needsVerdict(t)) {
      verdict.push({ kind: 'verdict', test: t, word: `ran${t.ranOn ? ` ${niceDay(t.ranOn)}` : ''} — passed?`, ...(why ? { why } : {}) });
    } else if (t.outcome === 'planned' && isOverdue(t, today)) {
      late.push({ kind: 'late', test: t, word: `was due ${niceDay(t.plannedTo ?? t.plannedFor)}` });
    }
  }
  const program: Need[] = liveProgs(programs).filter(p => !isProved(p) && !provingTestOf(p, tests))
    .map(p => ({ kind: 'program', program: p, word: 'no test to prove it yet' }));
  return [...failed, ...late, ...verdict, ...program];
}
