/* Decimal money for the Loss Engine — pence integers only in the engine (never float £). */

export type Pence = number;

const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function assertPence(n: number): Pence {
  if (!Number.isFinite(n) || Math.round(n) !== n) throw new Error('Money must be whole pence');
  return n;
}

/** Parse "577.92" or 577.92 into 57792 pence. */
export function poundsToPence(pounds: number | string): Pence {
  if (typeof pounds === 'number') return assertPence(Math.round(pounds * 100 + (pounds >= 0 ? 1e-9 : -1e-9)));
  const s = pounds.trim();
  const neg = s.startsWith('-');
  const t = neg ? s.slice(1) : s;
  const [whole, frac = ''] = t.split('.');
  const w = parseInt(whole || '0', 10);
  const f = parseInt((frac + '00').slice(0, 2), 10);
  const p = w * 100 + f;
  return assertPence(neg ? -p : p);
}

export function penceToPounds(p: Pence): number {
  return p / 100;
}

export function formatPence(p: Pence): string {
  return GBP.format(penceToPounds(p));
}

/** Multiply pounds/hour (as pence/hour) by minutes without float drift on the result. */
export function labourPenceForMinutes(perHourPence: Pence, minutes: number): Pence {
  return assertPence(Math.round((perHourPence * minutes) / 60));
}

export function perHourLabourPence(crew: number, wagePencePerHour: Pence, burdenThousandths: number): Pence {
  return assertPence(Math.round((crew * wagePencePerHour * burdenThousandths) / 1000));
}