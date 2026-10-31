/* THE COST OF POOR QUALITY — FC-128 (knowledge/specs/FC-128-cost-of-poor-quality.md; knowledge/methods/quality/copq.md).
 *
 * The PAF model (Feigenbaum 1956; Juran & De Feo 2010; BS 6143-2): what is spent to get quality right — PREVENTION and
 * APPRAISAL — and what is paid when it goes wrong — INTERNAL failure (before despatch) and EXTERNAL failure (after). Each bucket is
 * a list of items; each item is priced from the one cost model (hours × the wage, packs × a pack's materials, packs × what putting
 * one through again costs, a complaint × the typed cost of one) or is a figure in pounds the person typed from the record that
 * holds it. Pure arithmetic: the page, the paper and the tests all read it.
 *
 * Honest by construction (knowledge/MONEY.md rules 4–6): every input optional; an item whose price is missing is COUNTED, NOT PRICED
 * and named — never a figure invented; a bucket nobody gave anything for is "not given", never "nothing"; no overhead is allocated
 * and no "hidden factory" multiplier is applied (copq.md: only counted costs). */

export type Bucket = 'prevention' | 'appraisal' | 'internal' | 'external';
export const BUCKETS: readonly Bucket[] = ['prevention', 'appraisal', 'internal', 'external'];
export const BUCKET_LABEL: Record<Bucket, string> = { prevention: 'Prevention', appraisal: 'Appraisal', internal: 'Internal failure', external: 'External failure' };
/** In a sentence: "spent preventing", "spent checking". */
export const isFailure = (b: Bucket): boolean => b === 'internal' || b === 'external';

export interface CopqInput {
  /** One person's cost an hour (the wage with on-costs). */ rate?: number;
  /** A pack's materials. */ materials?: number;
  /** What it costs to put one pack through again. */ reworkCost?: number;
  /** What one complaint costs to handle (the business's own figure). */ complaintCost?: number;
  prevHours?: number; prevOther?: number;
  apprHours?: number; apprSamples?: number; apprOther?: number;
  scrapPacks?: number; reworkPacks?: number; giveaway?: number; holds?: number; stops?: number;
  complaints?: number; credits?: number; withdrawals?: number;
  /** The period's sales — to say the cost as a share of them. */ sales?: number;
  /** Packs made in the period — to say the cost a pack. */ packsMade?: number;
}

/** One line of a bucket: what it is, how it was priced, and its pounds (undefined = counted, not priced). */
export interface CopqItem {
  id: string;
  bucket: Bucket;
  label: string;
  /** In a sentence: "give-away", "rework". */
  short: string;
  /** "80 hours × £15.00 an hour", "typed". */
  basis: string;
  amount?: number;
}

export interface BucketTotal {
  bucket: Bucket;
  /** Pounds of what could be priced; undefined when nothing in the bucket was given. */
  total?: number;
  /** Something was given for this bucket (priced or not). */
  given: boolean;
  /** Items given but not priced. */
  unpriced: number;
  /** Share of the cost of quality (priced). */
  share?: number;
}

export interface FailureRow { item: CopqItem; share: number }

export interface CopqResult {
  items: CopqItem[];
  buckets: BucketTotal[];
  /** Everything priced: the cost of quality. */
  total: number;
  /** Internal + external failure priced: the cost of poor quality. */
  poor: number;
  /** Prevention + appraisal priced. */
  spent: number;
  /** Failure as a share of the cost of quality (undefined when the total is 0). */
  failureShare?: number;
  /** Failure items ranked by pounds, with their share of failure. */
  ranked: FailureRow[];
  poorOfSales?: number;
  totalOfSales?: number;
  /** Poor quality per pack made, in pounds. */
  poorPerPack?: number;
  /** How many items were given but could not be priced. */
  unpricedCount: number;
  /** Whole sentences naming each missing input (nothing waits on them). */
  missing: string[];
  /** Of those, the ones that stop an item being priced (the wage, a pack's materials, the cost of rework or of a complaint). */
  needs: string[];
  /** Any item at all priced. */
  priced: boolean;
}

const pos = (x: number | undefined): x is number => x !== undefined && Number.isFinite(x) && x >= 0;
const g = (n: number, dp = 2): string => n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: dp });
const pounds = (n: number): string => `£${n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** The missing sentences, one place so the page and the paper and the tests say one thing. */
export const SAY = {
  rate: 'Give the line a wage (with on-costs) to say the hours spent preventing and checking in money.',
  materials: 'Give a pack’s materials to say the scrapped packs and the samples destroyed in money.',
  reworkCost: 'Give what putting a pack through again costs to say the rework in money.',
  complaintCost: 'Give the cost of a complaint to say external failure in money.',
  sales: 'Give the period’s sales to say the cost as a share of them.',
  packsMade: 'Give the packs made in the period to say the cost of poor quality a pack.',
  bucket: (b: Bucket): string => `Nothing was given for ${BUCKET_LABEL[b].toLowerCase()} — it is left out of the total, not counted as nothing.`,
} as const;

/** Every item the figures given make, priced where the cost model has what it needs. */
export function copqItems(i: CopqInput): { items: CopqItem[]; missing: Set<keyof typeof SAY> } {
  const items: CopqItem[] = [];
  const missing = new Set<keyof typeof SAY>();
  const times = (id: string, bucket: Bucket, label: string, short: string, count: number | undefined, unit: number | undefined, unitWords: string, need: keyof typeof SAY, countWords: string) => {
    if (!pos(count)) return;
    if (pos(unit)) items.push({ id, bucket, label, short, basis: `${g(count)} ${countWords} × ${unitWords}`, amount: count * unit });
    else { items.push({ id, bucket, label, short, basis: `${g(count)} ${countWords} — not priced` }); missing.add(need); }
  };
  const typed = (id: string, bucket: Bucket, label: string, short: string, amount: number | undefined) => {
    if (pos(amount)) items.push({ id, bucket, label, short, basis: 'typed', amount });
  };
  const rate = pos(i.rate) ? `${pounds(i.rate)} an hour` : '';
  const mat = pos(i.materials) ? `${pounds(i.materials)} a pack` : '';
  const rew = pos(i.reworkCost) ? `${pounds(i.reworkCost)} a pack` : '';
  const comp = pos(i.complaintCost) ? `${pounds(i.complaintCost)} each` : '';

  times('prevHours', 'prevention', 'Prevention work — training, process design, mistake-proofing, supplier assurance', 'prevention work', i.prevHours, i.rate, rate, 'rate', 'hours');
  typed('prevOther', 'prevention', 'Other prevention — courses, audits, supplier visits', 'other prevention', i.prevOther);
  times('apprHours', 'appraisal', 'Checking — inspection, testing, audits, calibration', 'checking', i.apprHours, i.rate, rate, 'rate', 'hours');
  times('apprSamples', 'appraisal', 'Samples destroyed by testing', 'samples destroyed', i.apprSamples, i.materials, mat, 'materials', 'packs');
  typed('apprOther', 'appraisal', 'Other appraisal — lab fees, gauges', 'other appraisal', i.apprOther);
  times('scrapPacks', 'internal', 'Scrap', 'scrap', i.scrapPacks, i.materials, mat, 'materials', 'packs');
  times('reworkPacks', 'internal', 'Rework', 'rework', i.reworkPacks, i.reworkCost, rew, 'reworkCost', 'packs');
  typed('giveaway', 'internal', 'Give-away', 'give-away', i.giveaway);
  typed('holds', 'internal', 'Holds and downgrades', 'holds and downgrades', i.holds);
  typed('stops', 'internal', 'Line time lost to quality stops', 'quality stops', i.stops);
  times('complaints', 'external', 'Complaints handled', 'complaints', i.complaints, i.complaintCost, comp, 'complaintCost', 'complaints');
  typed('credits', 'external', 'Credits and charge-backs', 'credits and charge-backs', i.credits);
  typed('withdrawals', 'external', 'Returns, withdrawals and recalls', 'returns and recalls', i.withdrawals);
  return { items, missing };
}

export function copq(i: CopqInput): CopqResult {
  const { items, missing } = copqItems(i);
  const buckets: BucketTotal[] = BUCKETS.map(bucket => {
    const mine = items.filter(x => x.bucket === bucket);
    const priced = mine.filter(x => x.amount !== undefined);
    return {
      bucket, given: mine.length > 0, unpriced: mine.length - priced.length,
      ...(priced.length ? { total: priced.reduce((n, x) => n + (x.amount as number), 0) } : {}),
    };
  });
  const sum = (bs: readonly Bucket[]) => buckets.filter(b => bs.includes(b.bucket)).reduce((n, b) => n + (b.total ?? 0), 0);
  const total = sum(BUCKETS), poor = sum(['internal', 'external']), spent = sum(['prevention', 'appraisal']);
  for (const b of buckets) if (b.total !== undefined && total > 0) b.share = b.total / total;
  const failItems = items.filter(x => isFailure(x.bucket) && x.amount !== undefined);
  const ranked: FailureRow[] = failItems.slice().sort((a, b) => (b.amount as number) - (a.amount as number))
    .map(item => ({ item, share: poor > 0 ? (item.amount as number) / poor : 0 }));
  const names: Record<'sales' | 'packsMade', boolean> = { sales: pos(i.sales) && (i.sales as number) > 0, packsMade: pos(i.packsMade) && (i.packsMade as number) > 0 };
  if (!names.sales) missing.add('sales');
  if (!names.packsMade) missing.add('packsMade');
  const order: (keyof typeof SAY)[] = ['rate', 'materials', 'reworkCost', 'complaintCost', 'sales', 'packsMade'];
  const sentences = order.filter(k => missing.has(k)).map(k => SAY[k] as string);
  const needs = (['rate', 'materials', 'reworkCost', 'complaintCost'] as const).filter(k => missing.has(k)).map(k => SAY[k]);
  for (const b of buckets) if (!b.given) sentences.push(SAY.bucket(b.bucket));
  return {
    items, buckets, total, poor, spent,
    ...(total > 0 ? { failureShare: poor / total } : {}),
    ranked,
    ...(names.sales ? { poorOfSales: poor / (i.sales as number), totalOfSales: total / (i.sales as number) } : {}),
    ...(names.packsMade ? { poorPerPack: poor / (i.packsMade as number) } : {}),
    unpricedCount: buckets.reduce((n, b) => n + b.unpriced, 0),
    missing: sentences,
    needs,
    priced: items.some(x => x.amount !== undefined),
  };
}

/** The independent worked week (scripts/knowledge/cases-calc.py Q1; cases-quality.py quality.copq). */
export const COPQ_WORKED: CopqInput = {
  sales: 310000, packsMade: 155000, rate: 15, materials: 0.5, reworkCost: 1.4, complaintCost: 80,
  prevHours: 80, prevOther: 600, apprHours: 160, apprSamples: 1000, apprOther: 300,
  scrapPacks: 3400, reworkPacks: 2000, giveaway: 4100, holds: 800, complaints: 20, credits: 1000,
};
