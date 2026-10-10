/* THE PERFORMANCE RUN — the test the line is accepted on, in numbers.
 *
 * Rowland, 7 October: "Commissioning ... performance run at the agreed rate —
 * the UI is poor. It needs to be product running, rate achieved, rejects ...
 * this is my time of acceptance, high focus on this section. People ask how
 * fast did we run, what did we net — speed, packs per minute — issues,
 * status: complete, passed."
 *
 * And later the same day: "Commissioning runs are MULTIPLE PRODUCTS. While
 * I'm prepping I want to plan: these are the tests I'm going to do, this is
 * the product I'm going to run — Save. Next one — Save ... Then on the line I
 * pull it up and all I do is put in the numbers, and it calculates for me
 * whether it passed or failed. When would I ever commission one thing?"
 *
 * NO NEW NOUN. It is a test (lib/testing) that holds a LIST of product runs
 * (`runs`), each one product down the machine:
 *
 *   AGREED (agreed)  the rate it must hold, for how long, and the most
 *                    rejects allowed — agreed before the day, kept by the
 *                    owner like a written "passes if"
 *   THE DAY (day)    how long it ran, the packs made, the rejects, the speed
 *                    it ran at, and the minutes it stood
 *
 * Everything else is worked out here and never typed, so the screen, the card
 * and the client report cannot disagree: the good packs, the NET rate (good
 * packs over the minutes run — "what did we net"), the reject %, whether each
 * agreed number was met — and, once every product is measured, the TEST'S OWN
 * VERDICT (patchRuns): every product met, passed; any short, didn't pass. The
 * person can still overrule it; they should never have to.
 *
 * A test written before the list existed kept one run in two fields
 * (`runAgreed`, `run`): it reads as the list's first product (productRuns),
 * so nothing recorded is lost, and the first change to the list writes it
 * into `runs` whole.
 *
 * Pure: read off what is kept. */
import type { Outcome, Test } from './testing';

export interface RunAgreed {
  /** Packs a minute it must net. */
  rate?: number;
  /** How long it must run, in minutes. */
  minutes?: number;
  /** The most rejects allowed, as a % of packs made. */
  rejectsMax?: number;
}

export interface RunDay {
  /** How long it ran, in minutes (start to finish, stops included). */
  minutes?: number;
  /** Packs made — the counter at the end, good and rejected. */
  packs?: number;
  /** Packs rejected. */
  rejects?: number;
  /** The speed it ran at, packs a minute — what the machine was set to. */
  speed?: number;
  /** Minutes it stood during the run. */
  stops?: number;
}

/** One agreed number against what the day did. */
export interface RunCheck {
  what: 'rate' | 'rejects' | 'length';
  /** "Net rate" · "Rejects" · "Run length". */
  label: string;
  /** "58.4 ppm" · "0.3%" · "60 min". */
  got: string;
  /** "60 ppm agreed" · "1% at most" · "60 min agreed". */
  agreed: string;
  ok: boolean;
  /** "1.6 ppm short" · "0.4% over" · "10 min short" — only when not met. */
  gap?: string;
}

export interface RunReading {
  agreed: RunAgreed;
  day: RunDay;
  /** Packs made less rejects. */
  good?: number;
  /** Good packs a minute, over the whole run. */
  net?: number;
  /** Rejects as a % of packs made. */
  rejectPct?: number;
  /** Each agreed number that the day can be judged against. */
  checks: RunCheck[];
  /** Every agreed number met — undefined until there is something to judge. */
  meets?: boolean;
  /** Anything on the day at all. */
  ran: boolean;
}

/** The tests that are runs at a rate — by name ("Runs with product at the
 *  agreed speed", "Performance run at the agreed rate") or because numbers
 *  have been kept on them. A whole word, so "accurate" is not a rate. */
const RATE = /\b(speed|rate|performance|ppm|throughput|output)\b/i;
export const isRunTest = (t: Pick<Test, 'kind' | 'title' | 'run' | 'runAgreed'> & Partial<Pick<Test, 'runs'>>,
  /** What its answer is, when the caller knows the job (lib/install answerOf):
   *  the owner's choice on the usual tests wins over the name — numbers kept
   *  always make it a run, so nothing on it is lost. */
  answer?: string): boolean =>
  (t.kind ?? 'test') === 'test' && (!!t.runs?.length || hasNumbers(t.run) || hasNumbers(t.runAgreed) || (answer ? answer === 'run' : RATE.test(t.title)));

const hasNumbers = (o?: object): boolean => !!o && Object.values(o).some(v => typeof v === 'number' && Number.isFinite(v));

/** A number as it reads: 58.4, 60, 3,500 — one decimal at most. */
export const num = (n: number): string => {
  const r = Math.round(n * 10) / 10;
  return (Number.isInteger(r) ? Math.round(r) : r).toLocaleString('en-GB', { maximumFractionDigits: 1 });
};
/** A percentage: two decimals under 1% (0.34%), one above (2.5%). */
export const pct = (n: number): string =>
  `${(n > 0 && n < 1 ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10).toLocaleString('en-GB', { maximumFractionDigits: 2 })}%`;

const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export function readRun(t: Pick<Test, 'run' | 'runAgreed'>): RunReading {
  const agreed = t.runAgreed ?? {}, day = t.run ?? {};
  const good = ok(day.packs) ? Math.max(0, day.packs - (ok(day.rejects) ? day.rejects : 0)) : undefined;
  const net = good != null && ok(day.minutes) && day.minutes > 0 ? good / day.minutes : undefined;
  const rejectPct = ok(day.packs) && day.packs > 0 && ok(day.rejects) ? (day.rejects / day.packs) * 100 : undefined;
  const checks: RunCheck[] = [];
  if (ok(agreed.rate) && net != null) {
    const met = net + 1e-9 >= agreed.rate;
    checks.push({ what: 'rate', label: 'Net rate', got: `${num(net)} ppm`, agreed: `${num(agreed.rate)} ppm agreed`, ok: met,
      ...(met ? {} : { gap: `${num(agreed.rate - net)} ppm short` }) });
  }
  if (ok(agreed.rejectsMax) && rejectPct != null) {
    const met = rejectPct <= agreed.rejectsMax + 1e-9;
    checks.push({ what: 'rejects', label: 'Rejects', got: pct(rejectPct), agreed: `${pct(agreed.rejectsMax)} at most`, ok: met,
      ...(met ? {} : { gap: `${pct(rejectPct - agreed.rejectsMax)} over` }) });
  }
  if (ok(agreed.minutes) && ok(day.minutes)) {
    const met = day.minutes >= agreed.minutes;
    checks.push({ what: 'length', label: 'Run length', got: `${num(day.minutes)} min`, agreed: `${num(agreed.minutes)} min agreed`, ok: met,
      ...(met ? {} : { gap: `${num(agreed.minutes - day.minutes)} min short` }) });
  }
  /* JUDGED ONCE EVERY AGREED NUMBER CAN BE: the rate has to be one of them —
     a run is accepted on its rate — and nothing agreed may still be waiting
     on a box. Judged the moment the packs went in, before the rejects, it
     said "passed" for a breath and then "didn't" — and the test's own
     verdict follows this (patchRuns), so it must not flicker. */
  const complete = net != null && (!ok(agreed.rejectsMax) || rejectPct != null) && (!ok(agreed.minutes) || ok(day.minutes));
  const meets = ok(agreed.rate) && complete ? checks.every(c => c.ok) : undefined;
  return {
    agreed, day, checks, ran: hasNumbers(day),
    ...(good != null ? { good } : {}), ...(net != null ? { net } : {}), ...(rejectPct != null ? { rejectPct } : {}),
    ...(meets != null ? { meets } : {}),
  };
}

/** WHAT WAS AGREED, in one line — "60 ppm net for 60 min, rejects 1% at most". */
export function agreedWords(a: RunAgreed): string {
  if (!ok(a.rate) && !ok(a.minutes) && !ok(a.rejectsMax)) return '';
  return [
    ok(a.rate) ? `${num(a.rate)} ppm net` : 'Run',
    ok(a.minutes) ? `for ${num(a.minutes)} min` : '',
  ].filter(Boolean).join(' ') + (ok(a.rejectsMax) ? `, rejects ${pct(a.rejectsMax)} at most` : '');
}

/** HOW IT RAN, in one line — the line the square, the drawer, the lists and
 *  the client report all print: "Netted 58.4 ppm against 60 agreed — 1.6
 *  short · ran at 62 · 12 rejects (0.3%) · 60 min · Tesco Express 1.25 kg".
 *  Empty when nothing was measured. */
export function runLine(t: Pick<Test, 'run' | 'runAgreed' | 'product' | 'planned'>, opts: { product?: boolean } = {}): string {
  const r = readRun(t);
  if (!r.ran) return '';
  const rate = r.checks.find(c => c.what === 'rate');
  const head = r.net != null
    ? `Netted ${num(r.net)} ppm${ok(r.agreed.rate) ? ` against ${num(r.agreed.rate)} agreed${rate && !rate.ok ? ` — ${rate.gap}` : ''}` : ''}`
    : '';
  const bits = [
    head,
    ok(r.day.speed) ? `ran at ${num(r.day.speed)} ppm` : '',
    ok(r.day.rejects) ? `${num(r.day.rejects)} reject${r.day.rejects === 1 ? '' : 's'}${r.rejectPct != null ? ` (${pct(r.rejectPct)})` : ''}` : '',
    !ok(r.day.rejects) && ok(r.day.packs) ? `${num(r.day.packs)} packs` : '',
    ok(r.day.minutes) ? `${num(r.day.minutes)} min` : '',
    ok(r.day.stops) && r.day.stops > 0 ? `stood ${num(r.day.stops)} min` : '',
    opts.product !== false ? (t.product ?? t.planned ?? '') : '',
  ].filter(Boolean);
  return bits.join(' · ');
}

/** The short form for a square on the grid — "58.4 of 60 ppm". */
export function runShort(t: Pick<Test, 'run' | 'runAgreed'>): string {
  const r = readRun(t);
  if (r.net == null) return '';
  return ok(r.agreed.rate) ? `${num(r.net)} of ${num(r.agreed.rate)} ppm` : `${num(r.net)} ppm net`;
}

/** Only the numbers given — blanks dropped, so an emptied box clears. */
export function cleanRun<T extends object>(o: T): T | undefined {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => ok(v))) as T;
  return Object.keys(out).length ? out : undefined;
}

/** How one figure stands against what was agreed — met: a quiet green ·
 *  short: red · '': plain ink (nothing agreed to judge it on). The screen's
 *  table and every PDF colour a figure by this, so they cannot disagree.
 *  (It replaced the one run's five tiles: a run is many products now, and
 *  each product's row carries the same five figures.) */
export type RunTone = 'met' | 'short' | '';

/* ============================ MANY PRODUCTS ============================== */

/** ONE PRODUCT DOWN THE MACHINE — planned ahead (the product and what it is
 *  judged on), then the numbers off the machine on the day. */
export interface ProductRun {
  id: string;
  /** What went down the machine — "Finest Red 2kg". */
  product: string;
  agreed?: RunAgreed;
  day?: RunDay;
  /** The day its first number went in. */
  ranOn?: string;
  /** THE PROGRAM IT PROVES — a line of Set up's programs stage (its id),
   *  when it was planned from the program (lib/programRun). A row typed here
   *  is matched to a program by name instead. */
  program?: string;
  /** WHAT WAS SEEN on this product's run, in the team's words — its own
   *  commentary, as a program's status has (8 October). */
  note?: string;
}

type RunHolder = Pick<Test, 'id'> & Partial<Pick<Test, 'runs' | 'run' | 'runAgreed' | 'product' | 'planned' | 'ranOn'>>;

/** The id the one run of an older test takes in the list — the same on every
 *  device, so two devices writing the list for the first time agree on it,
 *  and the database knows which product carries the old agreed numbers
 *  (PERFORMANCE_RUNS.sql). */
export const firstRunId = (testId: string): string => `${testId}-r1`;

/** THE PRODUCT RUNS — the list when there is one, else the one run an older
 *  test kept, as the list's first product. An emptied list stays empty. */
export function productRuns(t: RunHolder): ProductRun[] {
  if (Array.isArray(t.runs)) return t.runs;
  if (!hasNumbers(t.run) && !hasNumbers(t.runAgreed)) return [];
  return [{
    id: firstRunId(t.id), product: t.product ?? t.planned ?? '',
    ...(t.runAgreed ? { agreed: t.runAgreed } : {}), ...(t.run ? { day: t.run } : {}),
    ...(t.ranOn && hasNumbers(t.run) ? { ranOn: t.ranOn } : {}),
  }];
}

/** Where one product run is:
 *   toRun     nothing measured yet
 *   partial   numbers going in, not yet enough to judge what was agreed
 *   met       every agreed number met
 *   short     one or more agreed numbers missed
 *   unjudged  measured, with no rate agreed to judge it on — the person says */
export type ProductState = 'toRun' | 'partial' | 'met' | 'short' | 'unjudged';

export interface ProductReading {
  run: ProductRun;
  r: RunReading;
  state: ProductState;
  /** A later row runs the same product again: this one is history, and the
   *  later one is what counts — as a re-test is for a test. */
  rerun: boolean;
  /** "Passed" · "Didn't pass" · "To run" · "Numbers going in" · "Ran — no rate agreed". */
  word: string;
  /** What fell short and by how much — "net rate 4 ppm short, rejects 0.81% over". */
  gap: string;
  /** The boxes still wanted before it can be judged — "packs made", "rejects". */
  missing: string[];
}

export interface RunsReading {
  products: ProductReading[];
  /** The products that count — every row but one run again further down. */
  total: number;
  met: number;
  short: number;
  /** Still to run, or numbers still going in. */
  toRun: number;
  /** Measured with nothing agreed to judge it on. */
  unjudged: number;
  /** Measured at all. */
  ran: number;
  /** Any product still to run or with its numbers half in. */
  open: boolean;
  /** WHAT THE NUMBERS DECIDE for the test: every product met → passed; any
   *  short → failed; anything still to run, or one the numbers cannot judge,
   *  → planned (still running, or the person's to say). */
  verdict: Outcome;
}

const nameKey = (s: string) => s.trim().toLowerCase();
export const productName = (p: Pick<ProductRun, 'product'>): string => p.product.trim() || 'Product not named';

function missingOf(r: RunReading): string[] {
  const a = r.agreed, d = r.day, out: string[] = [];
  if ((ok(a.rate) || ok(a.minutes)) && !ok(d.minutes)) out.push('minutes run');
  if ((ok(a.rate) || ok(a.rejectsMax)) && !ok(d.packs)) out.push('packs made');
  if (ok(a.rejectsMax) && !ok(d.rejects)) out.push('rejects');
  return out;
}

export function readProduct(p: ProductRun, rerun = false): ProductReading {
  const r = readRun({ run: p.day, runAgreed: p.agreed });
  const state: ProductState = !r.ran ? 'toRun' : r.meets === true ? 'met' : r.meets === false ? 'short' : ok(r.agreed.rate) ? 'partial' : 'unjudged';
  const gap = r.checks.filter(c => !c.ok).map(c => `${c.label.toLowerCase()} ${c.gap}`).join(', ');
  const word = state === 'met' ? 'Passed' : state === 'short' ? 'Didn’t pass' : state === 'toRun' ? 'To run'
    : state === 'partial' ? 'Numbers going in' : 'Ran — no rate agreed';
  return { run: p, r, state, rerun, word, gap, missing: state === 'partial' ? missingOf(r) : [] };
}

export function readRuns(t: RunHolder): RunsReading {
  const list = productRuns(t);
  const products = list.map((p, i) => readProduct(p,
    !!nameKey(p.product) && list.slice(i + 1).some(q => nameKey(q.product) === nameKey(p.product))));
  const now = products.filter(p => !p.rerun);
  const n = (s: ProductState[]) => now.filter(p => s.includes(p.state)).length;
  const met = n(['met']), short = n(['short']), toRun = n(['toRun', 'partial']), unjudged = n(['unjudged']);
  const verdict: Outcome = now.length && met + short === now.length ? (short ? 'failed' : 'passed') : 'planned';
  return { products, total: now.length, met, short, toRun, unjudged, ran: now.filter(p => p.r.ran).length, open: toRun > 0, verdict };
}

/** STILL RUNNING — a written list with a product still to run or its numbers
 *  half in. Only a written list: an older test's one run with no numbers is
 *  "ran — passed?" as it always was. While this is true the test is not owed
 *  a verdict (lib/testing needsVerdict): it is under way, and late once its
 *  day has gone. */
export const runsOpen = (t: Partial<Pick<Test, 'runs'>>): boolean =>
  Array.isArray(t.runs) && t.runs.some(p => { const s = readProduct(p).state; return s === 'toRun' || s === 'partial'; });

/** UNDER WAY — still running, and a product's numbers already in: what the
 *  test says of itself in place of "Planned" (lib/testing outcomeWord). */
export const runsUnderWay = (t: Partial<Pick<Test, 'runs'>>): boolean =>
  runsOpen(t) && !!t.runs?.some(p => hasNumbers(p.day));

/** A CHANGE TO THE LIST, with what follows from it: the day the test ran is
 *  stamped when the first number goes in, and the test's verdict follows the
 *  numbers WHEN WHAT THEY DECIDE CHANGES — so a verdict the person gave by
 *  hand stands until the numbers say something new. */
export function patchRuns(cur: Test, next: ProductRun[], today: string): Partial<Test> {
  const before = readRuns(cur).verdict, after = readRuns({ ...cur, runs: next }).verdict;
  /* A product first measured on a later day stretches the days it ran. */
  const laterDay = !!cur.ranOn && cur.ranOn < today && (cur.ranTo ?? cur.ranOn) < today
    && next.some(p => p.ranOn === today && !productRuns(cur).some(q => q.id === p.id && q.ranOn === today));
  return {
    runs: next,
    ...(before !== after ? { outcome: after } : {}),
    ...(!cur.ranOn && next.some(p => hasNumbers(p.day)) ? { ranOn: today } : {}),
    ...(laterDay ? { ranTo: today } : {}),
  };
}

/** One product's day numbers changed: kept clean, and its own day stamped. */
export function withDay(p: ProductRun, k: keyof RunDay, v: number | undefined, today: string): ProductRun {
  const day = cleanRun({ ...(p.day ?? {}), [k]: v });
  const rest: ProductRun = { id: p.id, product: p.product, ...(p.program ? { program: p.program } : {}), ...(p.note ? { note: p.note } : {}), ...(p.agreed ? { agreed: p.agreed } : {}), ...(p.ranOn ? { ranOn: p.ranOn } : {}) };
  return { ...rest, ...(day ? { day } : {}), ...(!p.ranOn && v != null ? { ranOn: today } : {}) };
}

/** RUN IT AGAIN — each named product planned again straight under itself, on
 *  the same agreed numbers, its day empty: the later row is what counts. */
export function runAgain(runs: ProductRun[], ids: string[], mkId: () => string): ProductRun[] {
  return runs.flatMap(p => (ids.includes(p.id)
    ? [p, { id: mkId(), product: p.product, ...(p.program ? { program: p.program } : {}), ...(p.agreed ? { agreed: { ...p.agreed } } : {}) }] : [p]));
}

/** "Jacks Piper 1.25kg — net rate 4 ppm short" — the products that missed. */
export const shortWords = (ps: ProductReading[]): string =>
  ps.map(p => `${productName(p.run)} — ${p.gap}`).join('; ');

/** The products that did not pass and are not run again further down the
 *  list — what Needs you names. */
export const unplannedShorts = (rr: RunsReading): ProductReading[] => rr.products.filter(p => p.state === 'short' && !p.rerun);

/** THE TOTALS LINE, in words — over the table on the screen, on the card:
 *  "2 of 3 products run — 1 passed, 1 didn't pass." */
export function runsSay(rr: RunsReading): string {
  const { total: n, met, short, unjudged, ran } = rr;
  if (!n) return '';
  const many = n !== 1;
  if (!ran) return many ? `${n} products planned — none run yet.` : 'Planned — not run yet.';
  const counts = [`${met} passed`, short ? `${short} didn’t pass` : '',
    unjudged ? `${unjudged} with no rate agreed to judge ${unjudged === 1 ? 'it' : 'them'} on` : ''].filter(Boolean).join(', ');
  if (rr.open) return `${ran} of ${n} product${many ? 's' : ''} run — ${counts}.`;
  if (unjudged) return `${many ? `All ${n} products run` : 'Run'} — ${counts}.`;
  if (!short) return many ? `All ${n} products passed — every agreed number met.` : 'Passed — every agreed number met.';
  const shorts = unplannedShorts(rr);
  return many ? `${met} of ${n} products passed — ${shortWords(shorts)}.` : `Didn’t pass — ${shorts[0]?.gap ?? ''}.`;
}

/** THE SQUARE ON THE BOARD — "2 of 3 products passed", with "1 short" said
 *  apart so it alone can carry red. One product reads as its numbers did:
 *  "61.8 of 60 ppm". */
export function runsBoard(t: RunHolder): { said: string; short: string } {
  const rr = readRuns(t);
  if (!rr.total) return { said: '', short: '' };
  if (rr.total === 1) {
    const one = rr.products.find(p => !p.rerun);
    return { said: one ? runShort({ run: one.run.day, runAgreed: one.run.agreed }) : '', short: '' };
  }
  if (!rr.ran) return { said: `${rr.total} products planned`, short: '' };
  return { said: `${rr.met} of ${rr.total} products passed`, short: rr.short ? `${rr.short} short` : '' };
}

/** The square's words as one string — for a title, a phone card or a screen reader. */
export const runsBoardWords = (t: RunHolder): string => { const b = runsBoard(t); return [b.said, b.short].filter(Boolean).join(' · '); };

/** THE FIGURES OF ONE PRODUCT, as every table prints them — "61.8 ppm",
 *  "14 (0.38%)", "—" where nothing is in. */
export interface ProductFigures {
  net: string; speed: string; packs: string; rejects: string; length: string;
  netTone: RunTone; rejectsTone: RunTone; lengthTone: RunTone;
  /** "60 ppm net for 60 min, rejects 1% at most", or '' when nothing is agreed. */
  agreed: string;
}
export function productFigures(p: ProductReading): ProductFigures {
  const { r } = p;
  const tone = (w: RunCheck['what']): RunTone => { const c = r.checks.find(x => x.what === w); return c ? (c.ok ? 'met' : 'short') : ''; };
  const dash = '—';
  return {
    net: r.net != null ? `${num(r.net)} ppm` : dash,
    speed: ok(r.day.speed) ? `${num(r.day.speed)} ppm` : dash,
    packs: ok(r.day.packs) ? num(r.day.packs) : dash,
    rejects: ok(r.day.rejects) ? `${num(r.day.rejects)}${r.rejectPct != null ? ` (${pct(r.rejectPct)})` : ''}` : dash,
    length: ok(r.day.minutes) ? `${num(r.day.minutes)} min${ok(r.day.stops) && r.day.stops > 0 ? `, stood ${num(r.day.stops)}` : ''}` : dash,
    netTone: tone('rate'), rejectsTone: tone('rejects'), lengthTone: tone('length'),
    agreed: agreedWords(r.agreed),
  };
}

/** Every product in one line, for a list that prints a test in one line (an
 *  earlier attempt in the client report): "Finest Red 2kg: Netted 61.8 ppm
 *  against 60 agreed · …; Jacks Piper 1.25kg: …". One product reads as it
 *  always did. */
export function runsLine(t: RunHolder): string {
  const ps = productRuns(t);
  if (ps.length <= 1) return ps[0] ? runLine({ run: ps[0].day, runAgreed: ps[0].agreed }, { product: false }) : '';
  return ps.map(p => { const l = runLine({ run: p.day, runAgreed: p.agreed }, { product: false }); return l ? `${productName(p)}: ${l}` : ''; })
    .filter(Boolean).join('; ');
}
