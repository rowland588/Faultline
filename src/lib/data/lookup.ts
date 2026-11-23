/* LOOKING UP ANOTHER SOURCE BY ITS KEY (docs/LUNA-ANALYSIS.md A1, A4) — the other side grouped by its key FIRST, so a row here is
 * never doubled. Pure: run over in-memory tables (lib/data/table) and over datasets handed to query_workbook (lib/workbook/query). */
import type { Calc, Lookup, TakeOp } from '../workbook/query';
import { LOOKUP_KEYS } from '../workbook/query';
import { PART_KINDS, PARTS_MAX, PART_SAID, hasTime, partType, partValue } from '../workbook/parts';
import { fieldOf, withParts, type Cell, type Dataset, type Field } from './table';

export const KEY_SEP = '\u0001';

/** How a resolved side is named in the map handed to runTable or runQuery. */
export function lookupSideKey(l: Pick<Lookup, 'source' | 'sheet'>): string {
  if (l.source) return l.sheet ? `${l.source}|${l.sheet}` : l.source;
  if (l.sheet) return l.sheet;
  return '';
}
const low = (v: unknown) => String(v ?? '').trim().toLowerCase();
const listOf = (x: string | string[]): string[] => (Array.isArray(x) ? x : [x]);

/** A lookup whose other side was brought together by key first — its value on each row must not be summed twice in a coarser group. */
export function isBroughtLookup(l: Lookup): boolean {
  const op = typeof l.take === 'string' ? undefined : l.take.op;
  return !!op && op !== 'only';
}

/** Measure names (lowercase) keyed by their lookup's `match` column names — after parts and lookups are on the table. */
export function broughtLookupMatches(q: { lookups?: Lookup[] }): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const l of q.lookups ?? []) if (isBroughtLookup(l)) m.set(low(l.as).replace(/\s+/g, ' '), listOf(l.match));
  return m;
}

const keyText = (v: Cell, f: Field): string => {
  if (v === null || v === '') return '';
  if (f.type === 'date') {
    const t = typeof v === 'number' ? v : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim()) ? Date.parse(v.trim().length === 10 ? `${v.trim()}T00:00:00Z` : v.trim()) : undefined;
    return t !== undefined && Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : String(v).trim();
  }
  if (f.type === 'yes/no') return v ? 'yes' : 'no';
  if (f.type === 'number') return String(v);
  return low(v).replace(/\s+/g, ' ');
};

type Agg = { sum: number; n: number; min: number; max: number; filled: number; first?: Cell; many: boolean };

export class LookupError extends Error {}

/** How a field’s figures are held — never add measured floor data to system data (docs/LUNA-ANALYSIS.md rule 5). */
export type FieldStanding = 'system' | 'floor' | 'worked';
export function fieldStanding(d: Dataset, f: Field): FieldStanding {
  if (f.calc) return 'worked';
  if (d.kind === 'production') return 'system';
  if (/^system\b/i.test(f.means) || f.means.startsWith('system —')) return 'system';
  return 'floor';
}

/** A row sum that adds or subtracts two figures: refused when they are of different standing. Multiply and divide are allowed across sources. */
export function checkCalcStanding(d: Dataset, names: string[]): string | undefined {
  const fields = names.map(n => fieldOf(d, n)).filter((x): x is { i: number; f: Field } => !!x);
  if (fields.length !== names.length) return undefined;
  const st = new Set(fields.map(x => fieldStanding(d, x.f)));
  if ((st.has('system') && st.has('floor')) && fields.length === 2) {
    return `“${fields[0].f.name}” is ${fieldStanding(d, fields[0].f) === 'system' ? 'system data' : 'what was measured or reported on the floor'}, and “${fields[1].f.name}” is the other — figures of different standing are never added or subtracted; multiply or divide them if a rate is wanted, or ask of one source at a time.`;
  }
  return undefined;
}

/** The other side as a lookup table: each key with the one value to bring back — aggregated first when an op is asked. */
export function lookupMapOf(side0: Dataset, l: Lookup): { map: Map<string, Cell>; conflicts: number; many: number; onNames: string[]; takeName: string; sideName: string; op?: TakeOp } {
  const { d: side, notes: _p } = withParts(side0, l.parts);
  if ((l.parts?.length ?? 0) > PARTS_MAX) throw new LookupError(`“${l.as}”: at most ${PARTS_MAX} parts.`);
  const lparts = new Map((l.parts ?? []).map(pt => [low(pt.as), pt]));
  const onNames = listOf(l.on);
  const matchNames = listOf(l.match);
  if (!matchNames.length || matchNames.length > LOOKUP_KEYS || matchNames.length !== onNames.length) throw new LookupError(`“${l.as}”: match and on name the same columns one for one — one to ${LOOKUP_KEYS}.`);
  const op = typeof l.take === 'string' ? undefined : l.take.op;
  const takeF = fieldOf(side, typeof l.take === 'string' ? l.take : l.take.column);
  if (!takeF) throw new LookupError(`“${l.as}”: ${side.name} holds no “${typeof l.take === 'string' ? l.take : l.take.column}”.`);
  if (op && op !== 'count' && op !== 'only' && takeF.f.type !== 'number' && !((op === 'min' || op === 'max') && takeF.f.type === 'date')) throw new LookupError(`“${takeF.f.name}” is not a number — it cannot be brought together as a ${op}.`);
  const onCols = onNames.map(n => {
    const pt = lparts.get(low(n));
    if (!pt) return fieldOf(side, n);
    if (!PART_KINDS.includes(pt.part)) throw new LookupError(`“${String(pt.part)}” is not a part of a date.`);
    const src = fieldOf(side, pt.column);
    if (!src || src.f.type !== 'date') throw new LookupError(`“${pt.column}” is not a date — a ${pt.part} cannot be taken from it.`);
    return src;
  });
  if (onCols.some(x => !x)) throw new LookupError(`“${l.as}”: a column named in on was not found on ${side.name}.`);
  type ColRef = NonNullable<(typeof onCols)[number]>;
  const onResolved = onCols as ColRef[];
  const map = new Map<string, Cell>();
  const aggs = new Map<string, Agg>();
  let conflicts = 0, many = 0, hourWarn: { name: string; dated: number; timed: number } | undefined;
  for (const row of side.rows) {
    const parts = onResolved.map((col, j) => {
      const pt = lparts.get(low(onNames[j]));
      const v = row[col.i];
      if (v === null || v === '') return '';
      if (pt) {
        const ms = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v.trim().length === 10 ? `${v.trim()}T00:00:00Z` : v.trim()) : NaN;
        if (!Number.isFinite(ms)) return '';
        if (pt.part === 'hour') hourWarn = { name: `the ${PART_SAID.hour} of ${col.f.name}`, dated: (hourWarn?.dated ?? 0) + 1, timed: (hourWarn?.timed ?? 0) + (hasTime(ms) ? 1 : 0) };
        const x = partValue(ms, pt.part);
        const type = partType(pt.part);
        return type === 'date' ? new Date(x as number).toISOString().slice(0, 10) : type === 'number' ? String(x) : low(x as string);
      }
      return keyText(v, col.f);
    });
    if (parts.some(x => !x)) continue;
    const k = parts.join(KEY_SEP);
    const takeV = row[takeF.i];
    if (!op) {
      const was = map.get(k);
      if (!was) map.set(k, takeV);
      else if (was !== takeV && was !== null && takeV !== null) conflicts += 1;
      continue;
    }
    let a = aggs.get(k);
    if (!a) { a = { sum: 0, n: 0, min: Infinity, max: -Infinity, filled: 0, many: false }; aggs.set(k, a); }
    if (takeV === null || takeV === '') continue;
    a.filled += 1;
    if (a.first === undefined) a.first = takeV;
    else if (a.first !== takeV) a.many = true;
    if (typeof takeV === 'number') { a.sum += takeV; a.n += 1; a.min = Math.min(a.min, takeV); a.max = Math.max(a.max, takeV); }
  }
  if (hourWarn && hourWarn.dated > 1 && !hourWarn.timed) throw new LookupError(`“${l.as}”: ${hourWarn.name} holds days with no time of day — an hour cannot be taken from it.`);
  if (op) for (const [k, a] of aggs) {
    if (op === 'count') map.set(k, a.filled);
    else if (op === 'only') { if (a.many) { many += 1; map.set(k, null); } else map.set(k, a.first ?? null); }
    else if (!a.n) map.set(k, null);
    else map.set(k, op === 'sum' ? a.sum : op === 'avg' ? a.sum / a.n : op === 'min' ? a.min : a.max);
  }
  return { map, conflicts, many, onNames, takeName: takeF.f.name, sideName: side.name, ...(op ? { op } : {}) };
}

export type LookupCol = { values: Cell[]; field: Field; notes: string[] };

/** A column of looked-up values, one a row of the base table — left blank where the key was not found, never guessed. */
export function lookupColumn(base: Dataset, l: Lookup, side: Dataset): LookupCol {
  const { map, conflicts, many, onNames, takeName, sideName, op } = lookupMapOf(side, l);
  const matchNames = listOf(l.match);
  const matches = matchNames.map(n => fieldOf(base, n));
  if (matches.some(x => !x)) throw new LookupError(`“${l.as}”: ${base.name} holds no “${matchNames.find((_n, i) => !matches[i])}”.`);
  type MatchRef = NonNullable<(typeof matches)[number]>;
  const matchResolved = matches as MatchRef[];
  const field: Field = { name: l.as, type: typeof map.values().next().value === 'number' || op ? 'number' : 'text', means: `brought from ${sideName}`, ...(op && op !== 'only' ? { calc: `brought together from ${sideName}` } : {}) };
  let missed = 0;
  const missing = new Set<string>();
  const values = base.rows.map(row => {
    const parts = matchResolved.map(m => keyText(row[m.i], m.f));
    if (parts.some(x => !x)) return null;
    const hit = map.get(parts.join(KEY_SEP));
    if (hit === undefined) { missed += 1; if (missing.size < 5) missing.add(parts.join(' · ')); return null; }
    return hit;
  });
  const notes: string[] = [];
  const by = (cs: string[]) => cs.map(c => `“${c}”`).join(' + ');
  const HOW: Record<TakeOp, string> = { sum: 'the sum of', avg: 'the average of', min: 'the lowest', max: 'the highest', count: 'how many rows fill', only: 'the one value of' };
  notes.push(op
    ? `“${l.as}” is ${HOW[op]} “${takeName}” on “${sideName}” for each ${by(onNames)} (${map.size.toLocaleString('en-GB')} there), brought onto each row by its ${by(matchNames)} — that source is brought together by its key first, so no row here is counted twice.`
  : `“${l.as}” is “${takeName}” from “${sideName}”, found by ${by(matchNames)} in its ${by(onNames)} (${map.size.toLocaleString('en-GB')} there).`);
  if (conflicts) notes.push(`“${sideName}” lists ${conflicts.toLocaleString('en-GB')} ${onNames.map(c => `“${c}”`).join(' + ')} more than once with a different “${takeName}” — the first is used; say which is right if it matters.`);
  if (many) notes.push(`${many.toLocaleString('en-GB')} ${onNames.join(' + ')} on “${sideName}” hold more than one different “${takeName}” — left blank for those rows, never the first taken.`);
  if (missed) notes.push(`${missed.toLocaleString('en-GB')} rows had a value not found for “${l.as}” (e.g. ${[...missing].map(x => `“${x}”`).join(', ')}) — left blank, never guessed.`);
  return { values, field, notes };
}

/** A sum worked on each row — columns must exist and, for +/−, must not mix system and floor standing. */
export function calcColumn(base: Dataset, fields: Field[], rows: Cell[][], c: Calc, _extra: Map<string, Cell[]>): { field: Field; values: Cell[]; notes: string[] } {
  const own = (name: string) => {
    const i = fields.findIndex(f => low(f.name).replace(/\s+/g, ' ') === low(name).replace(/\s+/g, ' '));
    if (i >= 0) return { i, f: fields[i] };
    const f = fieldOf(base, name);
    return f ? { i: f.i, f: f.f } : undefined;
  };
  const a = own(c.a);
  if (!a) throw new LookupError(`“${c.as}”: no column “${c.a}”.`);
  const b = typeof c.b === 'number' ? null : own(c.b);
  if (typeof c.b !== 'number' && !b) throw new LookupError(`“${c.as}”: no column “${c.b}”.`);
  if ((c.op === '+' || c.op === '-') && typeof c.b === 'string') {
    const why = checkCalcStanding({ ...base, fields }, [c.a, c.b]);
    if (why) throw new LookupError(why);
  }
  for (const x of [a, b]) if (x && x.f.type !== 'number') throw new LookupError(`“${x.f.name}” is not a number — it cannot be used in a row sum.`);
  const vals = rows.map(row => {
    const u = row[a.i];
    const wn: number | null = typeof c.b === 'number' ? c.b : b && typeof row[b.i] === 'number' ? row[b.i] as number : null;
    if (typeof u !== 'number' || wn === null) return null;
    const r = c.op === '*' ? u * wn : c.op === '/' ? (wn === 0 ? NaN : u / wn) : c.op === '+' ? u + wn : u - wn;
    return Number.isFinite(r) ? r : null;
  });
  return {
    field: { name: c.as, type: 'number', means: `worked on each row`, calc: `“${a.f.name}” ${c.op === '*' ? '×' : c.op === '/' ? '÷' : c.op} ${b ? `“${b.f.name}”` : String(c.b)}` },
    values: vals,
    notes: [`“${c.as}” is “${a.f.name}” ${c.op === '*' ? '×' : c.op === '/' ? '÷' : c.op} ${b ? `“${b.f.name}”` : String(c.b)}, worked on each row where both are numbers.`],
  };
}

export function extendDataset(base: Dataset, extraFields: Field[], extraCols: Cell[][]): Dataset {
  return { ...base, fields: [...base.fields, ...extraFields], rows: base.rows.map((row, r) => [...row, ...extraCols.map(c => c[r])]) };
}