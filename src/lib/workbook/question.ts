/* THE SHAPE OF A QUESTION — shared by query_workbook and query_data (docs/LUNA-ANALYSIS.md). Checked before a row is read;
 * every refusal says how to ask. */
import type { Query, TakeOp } from './query';
import { LOOKUP_KEYS } from './query';
import { readDerive } from './derive';
import { readParts } from './parts';
import { readHaving, readTop } from './groups';

const word = (x: unknown): x is string => typeof x === 'string' && !!x.trim();
const keys = (x: unknown): string | string[] | undefined => (word(x) ? x : Array.isArray(x) && x.length >= 1 && x.length <= LOOKUP_KEYS && x.every(word) ? (x.length === 1 ? x[0] : x as string[]) : undefined);
const TAKE_OPS: TakeOp[] = ['sum', 'avg', 'min', 'max', 'count', 'only'];

export const LOOKUP_HOW_WORKBOOK = 'each lookup needs as, sheet, match (this sheet’s column — or up to three, together), on (that sheet’s column for each, one for one) and take: that sheet’s column to bring back, or { op: sum | avg | min | max | count | only, column } to bring its rows together for each key first (only = the one value a key holds)';
export const LOOKUP_HOW_DATA = 'each lookup needs as, source (the other source’s id — or sheet when both are sheets of one workbook), match, on and take the same way — the other side is brought together by its key first, so no row is doubled';

/** Lookups for query_workbook — the other sheet is always named `sheet`. */
export function readLookups(v: unknown): NonNullable<Query['lookups']> | string {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 4) return 'lookups is a list of at most four';
  const out: NonNullable<Query['lookups']> = [];
  for (const l of v) {
    const o = l && typeof l === 'object' ? l as Record<string, unknown> : {};
    const match = keys(o.match), on = keys(o.on);
    const t = o.take && typeof o.take === 'object' ? o.take as Record<string, unknown> : undefined;
    const take = word(o.take) ? o.take : t && word(t.op) && TAKE_OPS.includes(t.op as TakeOp) && word(t.column) ? { op: t.op as TakeOp, column: t.column } : undefined;
    if (!word(o.as) || !word(o.sheet) || !match || !on || !take) return LOOKUP_HOW_WORKBOOK;
    if ((Array.isArray(match) ? match.length : 1) !== (Array.isArray(on) ? on.length : 1)) return `match and on name the same columns one for one. ${LOOKUP_HOW_WORKBOOK}`;
    const lparts = readParts(o.parts);
    if (typeof lparts === 'string') return `“${String(o.as)}”: ${lparts}`;
    out.push({ as: String(o.as), sheet: String(o.sheet), match, on, take, ...(lparts.length ? { parts: lparts } : {}) });
  }
  return out;
}

/** Lookups for query_data — the other side is named `source` (cross-source) or `sheet` (another sheet of the same workbook). */
export function readDataLookups(v: unknown): NonNullable<Query['lookups']> | string {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 4) return 'lookups is a list of at most four';
  const out: NonNullable<Query['lookups']> = [];
  for (const l of v) {
    const o = l && typeof l === 'object' ? l as Record<string, unknown> : {};
    const match = keys(o.match), on = keys(o.on);
    const t = o.take && typeof o.take === 'object' ? o.take as Record<string, unknown> : undefined;
    const take = word(o.take) ? o.take : t && word(t.op) && TAKE_OPS.includes(t.op as TakeOp) && word(t.column) ? { op: t.op as TakeOp, column: t.column } : undefined;
    const source = word(o.source) ? String(o.source) : undefined;
    const sheet = word(o.sheet) ? String(o.sheet) : undefined;
    if (!word(o.as) || !match || !on || !take || (!source && !sheet)) return LOOKUP_HOW_DATA;
    if (source && sheet) return `“${String(o.as)}”: name source OR sheet — source for another register source, sheet for another sheet of the same workbook. ${LOOKUP_HOW_DATA}`;
    if ((Array.isArray(match) ? match.length : 1) !== (Array.isArray(on) ? on.length : 1)) return `match and on name the same columns one for one. ${LOOKUP_HOW_DATA}`;
    const lparts = readParts(o.parts);
    if (typeof lparts === 'string') return `“${String(o.as)}”: ${lparts}`;
    out.push({ as: String(o.as), ...(source ? { source } : { sheet: sheet as string }), match, on, take, ...(lparts.length ? { parts: lparts } : {}) });
  }
  return out;
}

export function readCalcs(v: unknown): NonNullable<Query['calcs']> | string {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 4) return 'calcs is a list of at most four';
  const out: NonNullable<Query['calcs']> = [];
  for (const c of v) {
    const o = c && typeof c === 'object' ? c as Record<string, unknown> : {};
    if (typeof o.as !== 'string' || typeof o.a !== 'string' || !['*', '/', '+', '-'].includes(String(o.op)) || !(typeof o.b === 'string' || (typeof o.b === 'number' && Number.isFinite(o.b)))) return 'each calc needs as, a (a column), op (* / + -) and b (a column or a number)';
    out.push({ as: o.as, a: o.a, op: o.op as '*', b: o.b as string | number });
  }
  return out;
}

export { readDerive, readParts, readHaving, readTop };