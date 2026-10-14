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

/** The speed it netted, packs a minute: good packs over the minutes run. */
export function nettedOf(t: Pick<Test, 'run'>): number | undefined {
  const r = t.run;
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

export function programJourney(p: Pick<Program, 'id' | 'testId'>, tests: Test[], today: string): Journey {
  const attempts: Attempt[] = attemptsOf(p, tests).map((t, i) => {
    const a = t.runAgreed, d = t.run;
    const aim = [num(a?.rate) != null && `aiming ${fmt(a?.rate as number)} ppm`, num(a?.minutes) != null && `for ${fmt(a?.minutes as number)} min`].filter(Boolean).join(' ') || undefined;
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
  const speedOf = (t: Test) => num(t.run?.speed) ?? nettedOf(t) ?? num(t.runAgreed?.rate);
  const passes = attempts.filter(a => a.test.outcome === 'passed');
  const top = passes.slice().sort((x, y) => (speedOf(y.test) ?? -1) - (speedOf(x.test) ?? -1))[0];
  const best = top ? [`Passed${speedOf(top.test) != null ? ` at ${fmt(speedOf(top.test) as number)} ppm` : ''}`,
    num(top.test.run?.minutes) != null ? `for ${fmt(top.test.run?.minutes as number)} min` : '',
    top.test.ranOn ? `on ${niceDay(top.test.ranOn)}` : '', `(test ${top.n})`].filter(Boolean).join(' ') : undefined;
  const n = (o: Test['outcome']) => attempts.filter(a => a.test.outcome === o).length;
  const says = [`${attempts.length} test${attempts.length === 1 ? '' : 's'}`, n('passed') && `${n('passed')} passed`,
    n('failed') && `${n('failed')} didn’t pass`, n('notRun') && `${n('notRun')} didn’t run`, n('planned') && `${n('planned')} to run`].filter(Boolean).join(' · ');
  return { attempts, ...(best ? { best } : {}), says };
}
