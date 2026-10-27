/* A PROGRAM'S JOURNEY — every time it was tested, in order, with the speed
 * and the time it ran and how it went.
 *
 * Rowland, 14 October: "I have a program, I'm going to do a commissioning on
 * it, and I'm going to start to test these speeds. However, I only run for 30
 * minutes, so we decide to run a retest. The next retest ... we run at 45
 * minutes and we achieve another amount of speed ... I need it to be able to
 * show the journey of our commissioning." And: "it can change between
 * attempts ... even if it was successful, we can tick, yes, it was successful
 * at, say, 50 packs per minute. Great. Now let's do a retest at 55 ... There
 * is no real pass and fail ultimate. It's just the status of what was done."
 *
 * NO NEW RECORD. Each attempt is a proving test (Test.programId); a re-test
 * follows the one before (Test.fromTestId, lib/testing nextFrom). What each
 * aimed at is its agreed run (Test.runAgreed — set per attempt, so it can
 * move), what it did is its day (Test.run), how it went its outcome, what was
 * seen its result. A pass proves the program on its day; a later attempt that
 * does not pass leaves that proof standing (lib/programs programAfterTest:
 * only the test that proved it can take it back). Pure. */
import { live, type Test } from './testing';
import { testCell } from './commission';
import { niceDay } from './weeks';
import type { Program } from './programs';

export type AttemptTone = 'g' | 'r' | 'a' | 'w' | 'n';

export interface Attempt {
  n: number;
  test: Test;
  /** "14 Oct", or "booked 16 Oct", or "no day yet". */
  when: string;
  /** "aiming 55 ppm for 60 min". */
  aim?: string;
  /** "set at 50 ppm · ran 30 min · 1,480 packs · 12 rejects · netted 48.9 ppm". */
  did?: string;
  /** How it went — "passed", "didn't pass", "didn't run", "booked 16 Oct". */
  result: { word: string; tone: AttemptTone };
  seen?: string;
  /** The line as the row, the sheet and the paper print it. */
  text: string;
}

export interface Journey {
  attempts: Attempt[];
  /** "Passed at 50 ppm for 60 min on 14 Oct (test 2)" — the fastest pass;
   *  absent with none. */
  best?: string;
  /** "3 tests · 2 passed · 1 didn't pass" — absent with none. */
  says?: string;
}

const num = (n?: number) => (n == null || !Number.isFinite(n) ? undefined : n);
const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-GB') : n.toLocaleString('en-GB', { maximumFractionDigits: 1 }));

/** What an attempt aimed at and what it did, as it stands NOW. A test's numbers are edited in its record
 *  (ui/RunPanel), which writes the product-run list (`runs`) and leaves the single-run fields (`run`,
 *  `runAgreed`) as they were first written — so a test is read through the list when it has one, and
 *  through the old fields only when it has not (lib/run productRuns). Rowland, 25 October: "I changed
 *  ran for to 60 min … it still says netted 20 ppm". */
export function runOf(t: Pick<Test, 'run' | 'runAgreed' | 'runs'>): { agreed: Test['runAgreed']; day: Test['run'] } {
  const first = Array.isArray(t.runs) ? t.runs[0] : undefined;
  return Array.isArray(t.runs) ? { agreed: first?.agreed, day: first?.day } : { agreed: t.runAgreed, day: t.run };
}

/** The speed it netted, packs a minute: good packs over the minutes run. */
export function nettedOf(t: Pick<Test, 'run' | 'runAgreed' | 'runs'>): number | undefined {
  const r = runOf(t).day;
  const packs = num(r?.packs), mins = num(r?.minutes);
  if (packs == null || !mins) return undefined;
  return Math.max(0, packs - (num(r?.rejects) ?? 0)) / mins;
}

/** The program's tests, first to last: each chain followed from its first
 *  attempt, chains in the order they began. */
export function attemptsOf(p: Pick<Program, 'id' | 'testId'>, tests: Test[]): Test[] {
  const mine = live(tests).filter(t => (t.kind ?? 'test') === 'test' && (t.programId === p.id || (!!p.testId && t.id === p.testId)));
  const ids = new Set(mine.map(t => t.id));
  const roots = mine.filter(t => !t.fromTestId || !ids.has(t.fromTestId))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const out: Test[] = [];
  const seen = new Set<string>();
  for (const r of roots) {
    let cur: Test | undefined = r;
    for (let guard = 0; cur && guard < 100 && !seen.has(cur.id); guard++) {
      out.push(cur); seen.add(cur.id);
      const at: Test = cur;
      cur = mine.find(t => t.fromTestId === at.id && !seen.has(t.id));
    }
  }
  return out;
}

/** EVERY ATTEMPT OF ONE TEST — the test and every re-test that followed it (Test.fromTestId), first to last, in the
 *  same words as a program's journey: what each aimed at, what it did, how it went, what was seen. A test that is
 *  not a program's (seal integrity, a performance run) has a journey too (27 October — Rowland: "the tests that
 *  have been done, you can't see the results ... the efforts that have been put in place"). */
export function testChain(t: Test, tests: Test[]): Test[] {
  const mine = live(tests).filter(x => (x.kind ?? 'test') === 'test');
  let root: Test = t;
  for (let guard = 0; guard < 100; guard++) {
    const back = root.fromTestId ? mine.find(x => x.id === root.fromTestId) : undefined;
    if (!back) break;
    root = back;
  }
  const out: Test[] = [];
  const seen = new Set<string>();
  for (let cur: Test | undefined = root, guard = 0; cur && guard < 100 && !seen.has(cur.id); guard++) {
    out.push(cur); seen.add(cur.id);
    const at: Test = cur;
    cur = mine.find(x => x.fromTestId === at.id && !seen.has(x.id));
  }
  return out;
}

/** A test's journey — every attempt of it (testChain). */
export const testJourney = (t: Test, tests: Test[], today: string): Journey => journeyOfAttempts(testChain(t, tests), today);

export function programJourney(p: Pick<Program, 'id' | 'testId'>, tests: Test[], today: string): Journey {
  return journeyOfAttempts(attemptsOf(p, tests), today);
}

function journeyOfAttempts(list: Test[], today: string): Journey {
  const attempts: Attempt[] = list.map((t, i) => {
    const { agreed: a, day: d } = runOf(t);
    const aim = [num(a?.rate) != null && `aiming ${fmt(a?.rate as number)} ppm`, num(a?.minutes) != null && `for ${fmt(a?.minutes as number)} min`, num(a?.net) != null && `· net ${fmt(a?.net as number)} ppm`].filter(Boolean).join(' ') || undefined;
    const net = nettedOf(t);
    const did = [num(d?.speed) != null && `set at ${fmt(d?.speed as number)} ppm`, num(d?.minutes) != null && `ran ${fmt(d?.minutes as number)} min`,
      num(d?.packs) != null && `${fmt(d?.packs as number)} packs`, num(d?.rejects) != null && `${fmt(d?.rejects as number)} rejects`,
      net != null && `netted ${fmt(net)} ppm`].filter(Boolean).join(' · ') || undefined;
    const c = testCell(t, today);
    /* passed carries its day in `when`, not twice */
    const word = t.outcome === 'passed' ? 'passed' : c.word;
    const when = t.ranOn ? niceDay(t.ranOn) : t.plannedFor ? `booked ${niceDay(t.plannedFor)}` : 'no day yet';
    const seen = t.result?.trim() || undefined;
    const text = [`Test ${i + 1}`, t.ranOn ? when : undefined, aim, did].filter(Boolean).join(' · ') + ` — ${word}${seen ? `: ${seen}` : ''}`;
    return { n: i + 1, test: t, when, ...(aim ? { aim } : {}), ...(did ? { did } : {}), result: { word, tone: c.tone as AttemptTone }, ...(seen ? { seen } : {}), text };
  });
  if (!attempts.length) return { attempts };
  /* The fastest pass — the speed it ran at, else what it netted, else what it aimed at. */
  const speedOf = (t: Test) => num(runOf(t).day?.speed) ?? nettedOf(t) ?? num(runOf(t).agreed?.rate);
  const passes = attempts.filter(a => a.test.outcome === 'passed');
  const top = passes.slice().sort((x, y) => (speedOf(y.test) ?? -1) - (speedOf(x.test) ?? -1))[0];
  const best = top ? [`Passed${speedOf(top.test) != null ? ` at ${fmt(speedOf(top.test) as number)} ppm` : ''}`,
    num(runOf(top.test).day?.minutes) != null ? `for ${fmt(runOf(top.test).day?.minutes as number)} min` : '',
    top.test.ranOn ? `on ${niceDay(top.test.ranOn)}` : '', `(test ${top.n})`].filter(Boolean).join(' ') : undefined;
  const n = (o: Test['outcome']) => attempts.filter(a => a.test.outcome === o).length;
  const says = [`${attempts.length} test${attempts.length === 1 ? '' : 's'}`, n('passed') && `${n('passed')} passed`,
    n('failed') && `${n('failed')} didn’t pass`, n('notRun') && `${n('notRun')} didn’t run`, n('planned') && `${n('planned')} to run`].filter(Boolean).join(' · ');
  return { attempts, ...(best ? { best } : {}), says };
}
