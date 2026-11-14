/* WHAT A CELL OF WORDS REALLY HOLDS (14 November, docs/WORKBOOKS.md — "any workbook"). A hand-kept sheet types its numbers with their
 * units ("45 min", "1,250", "£108.00", "85%") and its dates as words ("12/04/2026", "12-Apr-26"); it writes its own totals into its
 * rows ("Line 2 Total", "Grand Total"). These read such a cell — never guessing: a code with a leading zero is not a number, a product
 * whose name starts with "Total" is not a total. Pure. */

export interface TextNumber { value: number; unit: string; percent: boolean }
const NUM = /^\(?\s*([-−])?\s*([£$€])?\s*([-−])?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*\)?\s*(%|[a-zA-Z°µ]{1,8}(?:[\s/][a-zA-Z]{1,6})?)?\s*$/;
/** A number written as words — with its unit when it has one; a percentage as a fraction. */
export function textNumber(text: string): TextNumber | null {
  const t = text.trim();
  if (!t || t.length > 24) return null;
  const m = NUM.exec(t);
  if (!m) return null;
  const digits = m[4];
  /* a code, not a quantity: "0042" */
  if (digits.length > 1 && digits.startsWith('0') && !m[5] && !digits.includes(',')) return null;
  const v = Number(digits.replace(/,/g, '') + (m[5] ?? ''));
  if (!Number.isFinite(v)) return null;
  const neg = !!m[1] || !!m[3] || (t.startsWith('(') && t.endsWith(')'));
  const unit = m[6] ?? (m[2] ?? '');
  const percent = unit === '%';
  return { value: (neg ? -v : v) / (percent ? 100 : 1), unit, percent };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const year = (y: string): number => (y.length === 2 ? 2000 + Number(y) : Number(y));
const utc = (y: number, m: number, d: number): number | null => { const ms = Date.UTC(y, m, d); const x = new Date(ms); return x.getUTCFullYear() === y && x.getUTCMonth() === m && x.getUTCDate() === d ? ms : null; };
/** A date written as words — British day/month order unless a day over 12 says otherwise; its day in UTC. */
export function textDate(text: string): number | null {
  const t = text.trim();
  if (t.length < 6 || t.length > 24) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?$/.exec(t);
  if (m) return utc(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
  if (m) { let d = Number(m[1]), mo = Number(m[2]); if (mo > 12 && d <= 12) [d, mo] = [mo, d]; return mo >= 1 && mo <= 12 ? utc(year(m[3]), mo - 1, d) : null; }
  m = /^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})[\s-]([A-Za-z]{3,9})[\s,-]+(\d{2}|\d{4})$/.exec(t);
  if (m) { const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); return mo < 0 ? null : utc(year(m[3]), mo, Number(m[1])); }
  return null;
}

const TOTAL = /^\s*(?:(?:grand|sub|overall|running|page|report|sheet)[\s-]*totals?|sub-?totals?|totals?|.{1,40}\s(?:sub-?)?totals?)\s*:?\s*$/i;
/** A label that says its row is the sheet's own adding-up: "Total", "Grand Total", "Line 2 Total". */
export const isTotalLabel = (text: string): boolean => text.length <= 48 && TOTAL.test(text);

/** A heading that says its column is time lost or taken — a duration, not a time of day. */
export const DURATION = /duration|down\s*time|\bdt\b|\blost\b|stop(page|ped|s)?\b|elapsed|time taken|delay|\bwait(ing)?\b|\bmins?\b|\bminutes\b|\bhours?\b|\bhrs?\b/i;

/* ---- the periods a grid is headed by ---- */
export interface Period { kind: 'month' | 'date' | 'week' | 'quarter' | 'year' | 'day'; ms?: number; label: string }
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
/** A heading that names a period: a month ("Apr-26"), a date (its serial number, or written), a week ("Wk 15"), a quarter, a year, a day. */
export function periodOf(heading: string, epoch = Date.UTC(1899, 11, 30)): Period | null {
  const t = heading.trim();
  if (!t || t.length > 20) return null;
  const m = /^([A-Za-z]{3,9})[\s\-/'.]*((?:19|20)?\d{2})$/.exec(t);
  if (m) { const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); if (mo >= 0 && (m[1].length === 3 || /^(january|february|march|april|may|june|july|august|september|october|november|december|sept)$/i.test(m[1]))) return { kind: 'month', ms: Date.UTC(year(m[2]), mo, 1), label: t }; }
  if (/^\d{5}$/.test(t)) { const n = Number(t); if (n > 30_000 && n < 80_000) return { kind: 'date', ms: Math.round(epoch + n * 86_400_000), label: new Date(Math.round(epoch + n * 86_400_000)).toISOString().slice(0, 10) }; }
  const d = textDate(t);
  if (d !== null) return { kind: 'date', ms: d, label: t };
  if (/^(?:w(?:ee)?k\.?|w\/?[ce]|wc|we)\s*\d{1,2}$/i.test(t)) return { kind: 'week', label: t };
  if (/^q[1-4](?:[\s\-/']*(?:19|20)?\d{2})?$/i.test(t)) return { kind: 'quarter', label: t };
  if (/^(?:19|20)\d{2}$/.test(t)) return { kind: 'year', ms: Date.UTC(Number(t), 0, 1), label: t };
  if (/^(?:fy)?\s?\d{2}\/\d{2}$/i.test(t)) return { kind: 'year', label: t };
  if (DAYS.includes(t.slice(0, 3).toLowerCase()) && /^(mon|tues?|wed(nes)?|thur?s?|fri|sat(ur)?|sun)(day)?$/i.test(t)) return { kind: 'day', label: t };
  if (MONTHS.includes(t.slice(0, 3).toLowerCase()) && /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)$/i.test(t)) return { kind: 'month', label: t };
  return null;
}
/** A heading of a grid that is its own adding-up, not one of its periods. */
export const isSummaryHeading = (heading: string): boolean => /^\s*(?:(?:grand|sub|overall)?\s*totals?|ytd|mtd|avg|average|mean|sum|year to date|cumulative|cum\.?)\s*$/i.test(heading);
