/* A PROGRAM, PROVED AT SPEED — its run in Commission.
 *
 * Rowland, 8 October: "If I've got a program, then commissioning a program
 * would be the next logical choice, as in commissioning speed ... we still
 * have gaps in the system."
 *
 * A program is loaded on Set up (a line of the programs stage, ui/StageParts)
 * and proved in Commission on the machine's performance run — a product row
 * at the agreed rate (lib/run). No new record joins them: a product row names
 * the program it proves (ProductRun.program, when it was planned from the
 * program), or has the program's name, or the product it runs. Read on the
 * program's line, the Programs page and the reports; planned from the
 * program in one step. */
import { isRunTest, productFigures, readRuns, type ProductReading, type ProductRun, type RunAgreed } from './run';
import { live, type Test, type TestItem } from './testing';
import { niceDay } from './weeks';

const key = (s?: string) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** The machine's performance runs in Commission, in the order of the job. */
export const runTestsOn = (tests: Test[], assetId?: string): Test[] =>
  live(tests).filter(t => isRunTest(t) && (t.assetId ?? '') === (assetId ?? '')).sort((a, b) => a.sort - b.sort);

export interface ProgramRun { test: Test; p: ProductReading }

/** The run rows that are this program, on its machine — the latest of a
 *  product run again is the one that counts (lib/run readRuns). */
export function runsOfProgram(part: Pick<TestItem, 'id' | 'what'>, assetId: string | undefined, tests: Test[], alsoNames: string[] = []): ProgramRun[] {
  const names = new Set([part.what, ...alsoNames].map(key).filter(Boolean));
  return runTestsOn(tests, assetId).flatMap(test => readRuns(test).products
    .filter(p => !p.rerun && (p.run.program === part.id || (!p.run.program && names.has(key(p.run.product)))))
    .map(p => ({ test, p })));
}

/** Its run in words and the house colour — "run passed 9 Oct — 45 ppm net"
 *  green, "run short — net rate 1.5 ppm short" red, "run planned" indigo. */
export function programRunSays(rows: ProgramRun[]): { word: string; tone: 'g' | 'r' | 'w' | 'a' } | undefined {
  const last = rows[rows.length - 1];
  if (!last) return undefined;
  const { p } = last;
  const f = productFigures(p);
  const on = p.run.ranOn ? ` ${niceDay(p.run.ranOn)}` : '';
  if (p.state === 'met') return { word: `run passed${on} — ${f.net} net`, tone: 'g' };
  if (p.state === 'short') return { word: `run short${on} — ${p.gap}`, tone: 'r' };
  if (p.state === 'partial') return { word: 'run: numbers going in', tone: 'w' };
  if (p.state === 'unjudged') return { word: 'ran — no rate agreed', tone: 'a' };
  return { word: 'run planned', tone: 'w' };
}

/** The product row a program's run starts as — named for the program, and
 *  naming it, on the numbers agreed. */
export const plannedRun = (part: Pick<TestItem, 'id'>, product: string, agreed: RunAgreed | undefined, id: string): ProductRun =>
  ({ id, product: product.trim(), program: part.id, ...(agreed ? { agreed } : {}) });

/** The numbers the machine's last run agreed — a new product on it starts
 *  from them, as the run's own form does. */
export function agreedBefore(tests: Test[], assetId?: string): RunAgreed | undefined {
  const runs = runTestsOn(tests, assetId).flatMap(t => readRuns(t).products.map(p => p.run));
  return runs[runs.length - 1]?.agreed;
}
