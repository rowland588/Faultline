/* THE PERFORMANCE RUN — the test the line is accepted on, in numbers.
 *
 * Rowland, 7 October: "Commissioning ... performance run at the agreed rate —
 * the UI is poor. It needs to be product running, rate achieved, rejects ...
 * this is my time of acceptance, high focus on this section. People ask how
 * fast did we run, what did we net — speed, packs per minute — issues,
 * status: complete, passed."
 *
 * NO NEW NOUN. It is a test (lib/testing) that holds two more things:
 *
 *   AGREED (runAgreed)  the rate it must hold, for how long, and the most
 *                       rejects allowed — agreed before the day, kept by the
 *                       owner like a written "passes if"
 *   THE DAY (run)       how long it ran, the packs made, the rejects, the speed
 *                       it ran at, and the minutes it stood
 *
 * Everything else is worked out here and never typed, so the screen, the card
 * and the client report cannot disagree: the good packs, the NET rate (good
 * packs over the minutes run — "what did we net"), the reject %, and whether
 * each agreed number was met. The product is the test's own (product), the
 * issues are its "what we found", the status is its verdict — the person
 * still gives the verdict; the numbers say what they say beside it.
 *
 * Pure: read off what is kept. */
import type { Test } from './testing';

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
export const isRunTest = (t: Pick<Test, 'kind' | 'title' | 'run' | 'runAgreed'>): boolean =>
  (t.kind ?? 'test') === 'test' && (hasNumbers(t.run) || hasNumbers(t.runAgreed) || RATE.test(t.title));

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
  /* Judged only on what was agreed AND measured; the rate has to be one of
     them — a run is accepted on its rate. */
  const meets = checks.some(c => c.what === 'rate') ? checks.every(c => c.ok) : undefined;
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

/** What the numbers say about the verdict, in words, or nothing when they
 *  cannot say: "The numbers pass — every agreed number met." */
export function numbersSay(r: RunReading): string {
  if (r.meets == null) return '';
  if (r.meets) return 'The numbers pass — every agreed number met.';
  return `The numbers fall short — ${r.checks.filter(c => !c.ok).map(c => `${c.label.toLowerCase()} ${c.gap}`).join(', ')}.`;
}

/** Only the numbers given — blanks dropped, so an emptied box clears. */
export function cleanRun<T extends object>(o: T): T | undefined {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => ok(v))) as T;
  return Object.keys(out).length ? out : undefined;
}

/** ONE TILE ON THE BOARD — the screen's board (ui/RunPanel) and the card's
 *  strip (lib/trialCardPdf) draw these same five, so they cannot disagree. */
export interface RunTile {
  label: string;
  /** "58.4", or "—" when not measured. */
  value: string;
  unit?: string;
  sub: string;
  /** met: a quiet green wash · short: red · '': plain ink (nothing agreed). */
  tone: 'met' | 'short' | '';
}

export function runTiles(r: RunReading): RunTile[] {
  const check = (w: RunCheck['what']) => r.checks.find(c => c.what === w);
  const tone = (w: RunCheck['what']): RunTile['tone'] => { const c = check(w); return c ? (c.ok ? 'met' : 'short') : ''; };
  const v = (n?: number) => (n != null ? num(n) : '—');
  const { agreed: a, day: d } = r;
  const join = (...xs: string[]) => xs.filter(Boolean).join(' · ');
  return [
    { label: 'Net rate', value: v(r.net), unit: 'ppm', tone: tone('rate'),
      sub: a.rate != null ? join(`${num(a.rate)} agreed`, check('rate')?.gap ?? '') : 'good packs a minute' },
    { label: 'Ran at', value: v(d.speed), unit: 'ppm', tone: '', sub: 'machine speed' },
    { label: 'Packs made', value: v(d.packs), tone: '', sub: r.good != null && d.rejects != null ? `${num(r.good)} good` : 'on the counter' },
    { label: 'Rejects', value: v(d.rejects), tone: tone('rejects'),
      sub: join(r.rejectPct != null ? `${pct(r.rejectPct)} of packs` : '', a.rejectsMax != null ? `${pct(a.rejectsMax)} at most` : '') || '—' },
    { label: 'Ran for', value: v(d.minutes), unit: 'min', tone: tone('length'),
      sub: join(a.minutes != null ? `${num(a.minutes)} agreed` : '', d.stops ? `stood ${num(d.stops)} min` : '') || 'start to finish' },
  ];
}
