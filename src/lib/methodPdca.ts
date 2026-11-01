/* PDCA'S CYCLES (docs/METHODS.md §16) — a PDCA is not one pass: a change is tried, checked, and if it did not hold or go far
 * enough the cycle is run again from what was learned. So the cycles are a LIST (MANUFACTURING IS MANY). The first cycle's answers are
 * kept as they always were (`method:pdca:<field>`); the next ones as `method:pdca:<field>@<n>` — the same questions, one set a cycle,
 * no new record and no new column. The board (project/method/shapes/pdca) and the paper (lib/report/pdcaPaper) both read cycles from
 * here, so the screen and the paper cannot part. Pure. */
import { fieldsOf, type SheetField } from './methodSheet';

export const QUARTERS = ['Plan', 'Do', 'Check', 'Act'] as const;
export type Quarter = typeof QUARTERS[number];

/** The answer key of a field in cycle n (cycle 1 is the plain field, as every PDCA project has always kept it). */
export const cycleKey = (field: string, n: number): string => (n <= 1 ? field : `${field}@${n}`);

/** The cycles that exist, ascending — always at least cycle 1. A cycle exists once any answer carries its number (a started one is marked `opened@n`). */
export function cycleNumbers(answers: Readonly<Record<string, string>>): number[] {
  const set = new Set<number>([1]);
  for (const k of Object.keys(answers)) { const m = /@(\d+)$/.exec(k); if (m && Number(m[1]) > 1) set.add(Number(m[1])); }
  return [...set].sort((a, b) => a - b);
}

/** One cycle's answers, by plain field id. */
export function cycleAnswers(answers: Readonly<Record<string, string>>, n: number): Record<string, string> {
  const out: Record<string, string> = {};
  const fields = new Set<string>(['opened']);
  for (const q of QUARTERS) for (const fl of fieldsOf('pdca', q)) fields.add(fl.id);
  for (const id of fields) { const v = answers[cycleKey(id, n)]; if (v !== undefined) out[id] = v; }
  return out;
}

/** Questions that may honestly stay blank: a change that held has no "next cycle", and not every fix is offered on. */
const OPTIONAL = new Set(['again', 'spread']);

export interface QuarterView { name: Quarter; fields: readonly SheetField[]; written: number; done: boolean; word: 'Not started' | 'Under way' | 'All written' }
export interface CycleView {
  n: number;
  answers: Record<string, string>;
  quarters: QuarterView[];
  /** The quarter the cycle is in: the first not fully written; none when all four are. */
  inHand: Quarter | undefined;
  /** In words. */
  status: string;
}

export function cycleView(answers: Readonly<Record<string, string>>, n: number): CycleView {
  const mine = cycleAnswers(answers, n);
  const quarters = QUARTERS.map((name): QuarterView => {
    const fields = fieldsOf('pdca', name);
    const written = fields.filter(x => (mine[x.id] ?? '').trim() !== '').length;
    /* a cycle that is adapted or abandoned has no standard to write and nobody to train — only an adopted (or undecided) one does */
    const unmade = name === 'Act' && decisionOf(mine.decision) !== undefined && decisionOf(mine.decision) !== 'adopt';
    const done = fields.filter(x => !OPTIONAL.has(x.id) && !(unmade && (x.id === 'standard' || x.id === 'trained'))).every(x => (mine[x.id] ?? '').trim() !== '');
    return { name, fields, written, done, word: written === 0 ? 'Not started' : written === fields.length ? 'All written' : 'Under way' };
  });
  const inHand = quarters.find(q => !q.done)?.name;
  const again = (mine.again ?? '').trim() !== '';
  const decided = (mine.decision ?? '').trim() !== '';
  const status = quarters.every(q => q.word === 'Not started') ? 'Not started'
    : inHand ? `Under way — in ${inHand}`
      : again ? 'Complete — the next cycle is planned' : decided ? 'Complete — decided' : 'Complete';
  return { n, answers: mine, quarters, inHand, status };
}

export const cyclesOf = (answers: Readonly<Record<string, string>>): CycleView[] => cycleNumbers(answers).map(n => cycleView(answers, n));

const filled = (v: string | undefined): string => (v ?? '').trim();

/** What starting the next cycle writes: the number and the cause carry over; the figure it ended at becomes where it starts; Act's
 *  "again" becomes Plan's change. Only what was written is carried; `opened` always marks the cycle. Keys are those of cycle n + 1. */
export function nextCycleSeed(answers: Readonly<Record<string, string>>, n: number, today: string): Record<string, string> {
  const a = cycleAnswers(answers, n), next = n + 1, out: Record<string, string> = {};
  const put = (field: string, v: string) => { if (v) out[cycleKey(field, next)] = v; };
  put('number', filled(a.number));
  put('gap', filled(a.result) ? `Cycle ${n} ended at: ${filled(a.result)}` : '');
  put('cause', filled(a.cause));
  put('change', filled(a.again));
  out[cycleKey('opened', next)] = today;
  return out;
}

/** One line a cycle: the number, what was expected, what came of it, and the decision — the cycles at a glance. */
export function cycleLine(c: CycleView): string {
  const a = c.answers, bit = (label: string, v: string | undefined) => (filled(v) ? `${label} ${filled(v)}` : '');
  const parts = [bit('number:', a.number), bit('expected', a.expect), bit('result:', a.result), bit('decision:', a.decision)].filter(Boolean);
  return `Cycle ${c.n} — ${c.status}${parts.length ? `. ${parts.join('; ')}.` : '.'}`;
}

/* ---- THE CYCLES READ AGAINST THEIR PREDICTIONS (docs/METHODS.md §17) — what the dashboard's insight and the project report both say.
 * Nothing is worked out from the team's free words: a cycle "hit" its prediction only if the team began "Against what we predicted"
 * with Yes, Partly or No, and a decision is only Adopt, Adapt or Abandon if it begins with that word. Otherwise it is "not stated". */
export type Hit = 'yes' | 'partly' | 'no';
export type Decision = 'adopt' | 'adapt' | 'abandon';

/** How the team judged the prediction — from the first word of "Against what we predicted". */
export function hitOf(predicted: string | undefined): Hit | undefined {
  const m = /^\s*(yes|partly|partially|no)\b/i.exec(predicted ?? '');
  if (!m) return undefined;
  const w = m[1].toLowerCase();
  return w === 'yes' ? 'yes' : w === 'no' ? 'no' : 'partly';
}
/** What the team decided — from the first word of the decision. */
export function decisionOf(decision: string | undefined): Decision | undefined {
  const m = /^\s*(adopt|adapt|abandon)\b/i.exec(decision ?? '');
  return m ? (m[1].toLowerCase() as Decision) : undefined;
}
export const HIT_WORD: Record<Hit, string> = { yes: 'Yes — hit it', partly: 'Partly', no: 'No — missed' };

export interface CycleReading {
  n: number;
  status: string;
  inHand: Quarter | undefined;
  /** Where it was, and where it should be (Plan). */
  before: string;
  /** The effect expected, written in Plan. */
  predicted: string;
  /** The number after (Check). */
  after: string;
  /** The team's own words against the prediction. */
  against: string;
  hit: Hit | undefined;
  learned: string;
  beyond: string;
  decisionText: string;
  decision: Decision | undefined;
  again: string;
  standard: string;
  change: string;
  who: string;
  /** The decision's reason: its words after the leading Adopt, Adapt or Abandon. */
  why: string;
  /** Has anything been done or checked in this cycle (Do, Check or Act has an answer)? */
  started: boolean;
  /** Is the number after written? */
  checked: boolean;
}

export function readCycles(answers: Readonly<Record<string, string>>): CycleReading[] {
  return cyclesOf(answers).map((c): CycleReading => {
    const a = c.answers, g = (id: string) => filled(a[id]);
    const started = [...fieldsOf('pdca', 'Do'), ...fieldsOf('pdca', 'Check'), ...fieldsOf('pdca', 'Act')].some(x => g(x.id) !== '');
    return {
      n: c.n, status: c.status, inHand: c.inHand, before: g('gap'), predicted: g('expect'), after: g('result'), against: g('predicted'), hit: hitOf(a.predicted),
      learned: g('learned'), beyond: g('beyond'), decisionText: g('decision'), decision: decisionOf(a.decision), again: g('again'), standard: g('standard'), change: g('change'), who: g('who'), why: g('decision').replace(/^\s*(adopt|adapt|abandon)\b[\s—:,.-]*/i, ''), started, checked: g('result') !== '',
    };
  });
}
