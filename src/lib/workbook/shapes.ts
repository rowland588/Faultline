/* THE SHAPES A WORKBOOK COMES IN, READ AS TABLES (14 November, docs/WORKBOOKS.md — "any workbook"; Rowland: "Luna must understand any
 * work book"). The reader keeps each sheet as it is written. Three shapes are not tables as written, and are MADE into one here — a
 * table of the store like any other, so every question, sum and chart works on it unchanged:
 *   A GRID      periods across the top (Apr · May · Jun), or two rows of headings (Days / Nights over Packs · Downtime): read as rows
 *               — one a record a period, or a record a group — with the period or the group a column of its own;
 *   MANY TABS   the same headings on tabs whose names run in a series (Wk 15, Wk 16 …) or whose dates do not overlap: one table, the
 *               tab a column. Tabs with the same headings and the SAME dates are a copy and are left alone;
 *   FORMS       three or more tabs that are the same form filled in: a table — a row a tab, a column a label.
 * What a table is made from is said in words (`derived.said`); the sheets it is made from are marked (`readAs`) so they are not offered
 * twice; and each row keeps the sheet and the column it came from, so an answer still points at the original cell. Nothing is
 * interpreted and no cell is changed. Pure but for the store. */
import { Kind, chunkKey, rowsKey, unpackChunk, type WorkbookStore } from './store';
import type { Built, ColumnProfile, SheetProfile } from './read';
import type { RawCell, RawRow } from './xml';
import { periodOf, isSummaryHeading, type Period } from './textCells';

/** In a table made from sheets: the sheet each row came from (its index), and the column its figure came from. (As in read.ts.) */
const ORIGIN_SLOT = 16_381, ORIGIN_COL_SLOT = 16_380;
/** Where the columns a made table adds are kept: the period or group, then the tab. */
const DIM_SLOT = 16_000, TAB_SLOT = 16_002, VALUE_SLOT = 16_010;
const ROWS_CAP = 3_000_000;

interface Writer { sheet: number; rows: number; blankRows: number; dups: number; dupChecked: number; errors: number; row(r: RawRow): void; drain(): Promise<void>; finish(): Promise<Built> }
export interface NormaliseInput {
  store: WorkbookStore; profiles: SheetProfile[]; str: readonly string[]; id: (text: string) => number; epoch: number;
  make: (names: Map<number, string>) => Writer;
}

const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();
const q = (x: string) => `“${x}”`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const real = (s: SheetProfile): ColumnProfile[] => s.columns.filter(c => !c.colour);
const tidy = (t: string): string => (t === t.toUpperCase() && /[A-Z]{3}/.test(t) ? t.charAt(0) + t.slice(1).toLowerCase() : t);

type Cell = [number, number];
/** Every row of a sheet as stored: its row number, and each asked column's cell. */
async function scan(store: WorkbookStore, s: SheetProfile, slots: number[], fn: (row: number, cell: (slot: number) => Cell) => void): Promise<void> {
  for (let ch = 0; ch < s.chunks; ch += 1) {
    const rb = await store.get(rowsKey(s.index, ch));
    if (!rb) continue;
    const rows = new Int32Array(rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength));
    const cols = new Map<number, { kinds: Int8Array; vals: Float64Array }>();
    for (const slot of slots) { const b = await store.get(chunkKey(s.index, slot, ch)); if (b) cols.set(slot, unpackChunk(b)); }
    for (let i = 0; i < rows.length; i += 1) fn(rows[i], slot => { const c = cols.get(slot); return c ? [c.kinds[i], c.vals[i]] : [Kind.Blank, 0]; });
  }
}
/** A stored cell as the reader takes one in. */
function raw(col: number, [kind, val]: Cell, str: readonly string[]): RawCell | null {
  if (kind === Kind.Num) return { col, t: 'n', s: -1, v: String(val), hasF: false };
  if (kind === Kind.Str) return { col, t: 's', s: -1, v: String(val), hasF: false };
  if (kind === Kind.Date) return { col, t: 'd', s: -1, v: new Date(val).toISOString(), hasF: false };
  if (kind === Kind.Bool) return { col, t: 'b', s: -1, v: val ? '1' : '0', hasF: false };
  if (kind === Kind.Err) return { col, t: 'e', s: -1, v: str[val] ?? '#?', hasF: false };
  return null;
}
const num = (col: number, v: number): RawCell => ({ col, t: 'n', s: -1, v: String(v), hasF: false });

/** A made table, finished and put among the sheets. */
async function add(inp: NormaliseInput, w: Writer, o: { name: string; state: SheetProfile['state']; derived: NonNullable<SheetProfile['derived']>; inherit?: ColumnProfile[]; totals?: SheetProfile['totals'] }): Promise<SheetProfile> {
  const f = await w.finish();
  for (const c of f.columns) { const from = o.inherit?.find(x => x.slot === c.slot); if (from) { if (from.duration) c.duration = true; if (from.percent) c.percent = true; c.origin = from.name; } }
  let name = o.name;
  for (let n = 2; inp.profiles.some(x => x.name === name); n += 1) name = `${o.name} (${n})`;
  const made: SheetProfile = { index: w.sheet, name, state: o.state, headerRow: 0, above: [], rows: w.rows, blankRows: w.blankRows, chunks: f.chunks, columns: f.columns, hiddenColumns: [], merged: 0,
    formulas: 0, formulasNoValue: 0, errors: w.errors, duplicateRows: w.dups, duplicatesChecked: w.dupChecked, refersTo: [], tables: [], read: true, derived: o.derived, ...(o.totals ? { totals: o.totals } : {}) };
  inp.profiles.push(made);
  for (const from of o.derived.from) { const s = inp.profiles.find(x => x.name === from); if (s) s.readAs = name; }
  return made;
}

/** What a run of labels is, in a word: the periods they name, lines, shifts — else a group. */
function dimName(labels: string[], periods: (Period | null)[], taken: (n: string) => boolean): string {
  const kinds = new Set(periods.map(p => p?.kind ?? ''));
  const word = kinds.size === 1 && periods[0] ? { month: 'Month', date: 'Date', week: 'Week', quarter: 'Quarter', year: 'Year', day: 'Day' }[periods[0].kind]
    : labels.every(l => /^line\b/i.test(l)) ? 'Line' : labels.every(l => /^(days?|nights?|lates?|earl(y|ies)|mornings?|afternoons?|am|pm|[a-d]|shift\s*\w+)$/i.test(l)) ? 'Shift' : 'Group';
  return taken(word) ? (taken('Period') ? `${word} (heading)` : 'Period') : word;
}

/* ---- a grid: periods across the top, or two rows of headings ---- */
async function unpivot(inp: NormaliseInput, s: SheetProfile): Promise<void> {
  const cols = real(s).filter(c => c.named);
  const numeric = (c: ColumnProfile) => c.type === 'number' || c.type === 'mixed' || c.type === 'empty';
  /* TWO ROWS OF HEADINGS: every group holds the same headings */
  const grouped = cols.filter(c => c.group && c.base && numeric(c));
  const groups = [...new Set(grouped.map(c => c.group as string))];
  const bases = [...new Set(grouped.map(c => c.base as string))];
  const twoRows = groups.length >= 2 && groups.every(g => bases.every(b => grouped.some(c => c.group === g && c.base === b)));
  /* PERIODS ACROSS THE TOP: three or more number columns headed by periods of one kind, and most of the sheet's number columns */
  const summary = cols.filter(c => numeric(c) && isSummaryHeading(c.name));
  const headed = cols.filter(c => numeric(c) && !summary.includes(c)).map(c => ({ c, p: periodOf(c.name, inp.epoch) }));
  const per = headed.filter(x => x.p);
  const kind = per[0]?.p?.kind;
  const across = !twoRows && per.length >= 3 && per.every(x => x.p?.kind === kind) && per.length >= headed.length * 0.6;
  if (!twoRows && !across) return;
  const spread = twoRows ? grouped : per.map(x => x.c);
  const ids = cols.filter(c => !spread.includes(c) && !summary.includes(c) && !(across && numeric(c)));
  if (!ids.length || s.rows * (twoRows ? groups.length : per.length) > ROWS_CAP) return;
  const taken = (n: string) => ids.some(c => norm(c.name) === norm(n));
  const labels = twoRows ? groups : per.map(x => x.c.name);
  const periods = twoRows ? groups.map(g => periodOf(g, inp.epoch)) : per.map(x => x.p);
  const dim = dimName(labels, periods, taken);
  const dated = periods.every(p => p?.ms !== undefined);
  const title = [...s.above].reverse().find(a => a.length <= 48 && /[A-Za-z]{3}/.test(a) && !a.includes(' · '));
  let value = tidy(title ?? s.name);
  if (taken(value) || norm(value) === norm(dim)) value = `${value} (figure)`;
  const names = new Map<number, string>(ids.map(c => [c.slot, c.name]));
  names.set(DIM_SLOT, dim);
  const valueSlots = twoRows ? bases.map((b, k) => ({ b, slot: VALUE_SLOT + k })) : [{ b: value, slot: VALUE_SLOT }];
  for (const v of valueSlots) names.set(v.slot, v.b);
  const w = inp.make(names);
  const blocks = twoRows ? groups.map((g, gi) => ({ label: g, p: periods[gi], cells: bases.map((b, k) => ({ from: (grouped.find(c => c.group === g && c.base === b) as ColumnProfile).slot, to: VALUE_SLOT + k })) }))
    : per.map(x => ({ label: x.p?.label ?? x.c.name, p: x.p, cells: [{ from: x.c.slot, to: VALUE_SLOT }] }));
  const labelIds = blocks.map(b => inp.id(b.label));
  await scan(inp.store, s, [...ids.map(c => c.slot), ...spread.map(c => c.slot)], (row, cell) => {
    const base = ids.map(c => raw(c.slot, cell(c.slot), inp.str)).filter((c): c is RawCell => !!c);
    blocks.forEach((b, bi) => {
      const vals = b.cells.map(x => raw(x.to, cell(x.from), inp.str)).filter((c): c is RawCell => !!c);
      if (!vals.length) return;
      const d: RawCell = dated ? { col: DIM_SLOT, t: 'd', s: -1, v: new Date(b.p?.ms as number).toISOString(), hasF: false } : { col: DIM_SLOT, t: 's', s: -1, v: String(labelIds[bi]), hasF: false };
      w.row({ row, cells: [...base, d, ...vals, num(ORIGIN_COL_SLOT, b.cells[0].from), num(ORIGIN_SLOT, s.index)].sort((a, z) => a.col - z.col) });
    });
  });
  await w.drain();
  const idsSaid = ids.slice(0, 3).map(c => q(c.name)).join(', ');
  const said = twoRows
    ? `${q(s.name)} has two rows of headings — ${groups.slice(0, 4).map(q).join(', ')}${groups.length > 4 ? ` and ${groups.length - 4} more` : ''} over ${bases.map(q).join(', ')}. I have read it as rows — one for each row of the sheet for each of them, ${plural(w.rows, 'row')} in all — with ${q(dim)} a column of its own.`
    : `${q(s.name)} is a grid — ${idsSaid} down the side, ${plural(per.length, kind === 'date' ? 'date' : kind ?? 'period')} across the top (${per[0].p?.label} to ${per[per.length - 1].p?.label}). I have read it as rows — one for each ${ids.length === 1 ? ids[0].name.toLowerCase() : 'row'} for each ${dim.toLowerCase()}, ${plural(w.rows, 'row')} in all — and called the figure ${q(value)}${title ? ', from the title above it' : ', after the sheet'}.${summary.length ? ` Its ${summary.map(c => q(c.name)).join(', ')} column is the grid’s own adding-up and is left out.` : ''}`;
  await add(inp, w, { name: `${s.name} (as rows)`, state: s.state, derived: { how: 'unpivot', from: [s.name], said }, inherit: ids, ...(s.totals ? { totals: s.totals } : {}) });
}

/* ---- the same table on many tabs ---- */
const MONTH_WORD = /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?|mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(r(s(day)?)?)?|fri(day)?|sat(urday)?|sun(day)?|days?|nights?|lates?|earl(y|ies)|am|pm)\b/g;
const residue = (name: string): string => norm(name).replace(MONTH_WORD, '@').replace(/\d+/g, '#');
async function stackTabs(inp: NormaliseInput): Promise<void> {
  const cands = inp.profiles.filter(s => s.read && s.state === 'visible' && !s.form && !s.readAs && !s.derived && !s.partOf && s.headerRow > 0 && s.rows >= 1 && real(s).filter(c => c.named).length >= 2);
  const by = new Map<string, SheetProfile[]>();
  for (const s of cands) { const sig = real(s).filter(c => c.named).map(c => norm(c.name)).join('\u0001'); by.set(sig, [...(by.get(sig) ?? []), s]); }
  for (const tabs of by.values()) {
    if (tabs.length < 2 || tabs.reduce((t, s) => t + s.rows, 0) > ROWS_CAP) continue;
    const res = new Set(tabs.map(s => residue(s.name)));
    const series = res.size === 1 && /[#@]/.test([...res][0]);
    const spans = tabs.map(s => real(s).find(c => c.type === 'date' && c.min !== undefined)).map(c => (c ? [c.min as number, c.max as number] : null));
    const sorted = spans.every(x => x) ? [...(spans as number[][])].sort((a, b) => a[0] - b[0]) : [];
    const apart = sorted.length === tabs.length && sorted.every((x, i) => i === 0 || x[0] > sorted[i - 1][1]);
    if (!series && !apart) continue;
    const first = tabs[0], cols = real(first).filter(c => c.named);
    const tab = cols.some(c => norm(c.name) === 'tab') ? 'Sheet tab' : 'Tab';
    const w = inp.make(new Map<number, string>([...cols.map(c => [c.slot, c.name] as [number, string]), [TAB_SLOT, tab]]));
    for (const s of tabs) {
      const map = cols.map(c => ({ to: c.slot, from: (real(s).find(x => x.named && norm(x.name) === norm(c.name)) as ColumnProfile).slot }));
      const name: RawCell = { col: TAB_SLOT, t: 's', s: -1, v: String(inp.id(s.name)), hasF: false };
      await scan(inp.store, s, map.map(m => m.from), (row, cell) => {
        const cells = map.map(m => raw(m.to, cell(m.from), inp.str)).filter((c): c is RawCell => !!c);
        if (cells.length) w.row({ row, cells: [...cells, name, num(ORIGIN_SLOT, s.index)].sort((a, z) => a.col - z.col) });
      });
      await w.drain();
    }
    const names = tabs.map(s => s.name);
    const totals = tabs.reduce((t, s) => t + (s.totals?.count ?? 0), 0);
    const said = `${plural(tabs.length, 'tab')} — ${names.slice(0, 3).map(q).join(', ')}${names.length > 3 ? ` … ${q(names[names.length - 1])}` : ''} — have the same headings and ${series ? 'names that run in a series' : 'dates that do not overlap'}: I have read them as ONE table of ${plural(w.rows, 'row')}, with the tab as a column (${q(tab)}).`;
    await add(inp, w, { name: `${names[0]} to ${names[names.length - 1]}`, state: 'visible', derived: { how: 'stack', from: names, said }, inherit: cols, ...(totals ? { totals: { count: totals, examples: tabs.flatMap(s => s.totals?.examples ?? []).slice(0, 3) } } : {}) });
  }
}

/** A form's answers, in order: the label, and the cell beside it. */
export async function formPairs(store: WorkbookStore, s: SheetProfile): Promise<{ label: Cell; value: Cell; row: number }[]> {
  const cols = real(s).map(c => c.slot).sort((a, b) => a - b);
  const out: { label: Cell; value: Cell; row: number }[] = [];
  await scan(store, s, cols, (row, cell) => {
    const filled = cols.map(c => cell(c)).filter(c => c[0] !== Kind.Blank);
    if (filled.length >= 2 && filled[0][0] === Kind.Str) out.push({ label: filled[0], value: filled[1], row });
  });
  return out;
}
/* ---- the same form on many tabs ---- */
async function stackForms(inp: NormaliseInput): Promise<void> {
  const forms = inp.profiles.filter(s => s.read && s.form && !s.readAs && !s.partOf);
  if (forms.length < 3) return;
  const read = await Promise.all(forms.map(async s => ({ s, pairs: await formPairs(inp.store, s) })));
  const label = (c: Cell) => norm(inp.str[c[1]] ?? '').replace(/[:?]+$/, '');
  const seen = new Map<string, { name: string; n: number }>();
  for (const f of read) for (const k of new Set(f.pairs.map(p => label(p.label)))) { const was = seen.get(k); if (was) was.n += 1; else seen.set(k, { name: (inp.str[(f.pairs.find(p => label(p.label) === k) as { label: Cell }).label[1]] ?? '').trim().replace(/[:?]+$/, '').slice(0, 80), n: 1 }); }
  const common = [...seen].filter(([, v]) => v.n >= forms.length * 0.6).slice(0, 80);
  if (common.length < 4) return;
  const same = read.filter(f => common.filter(([k]) => f.pairs.some(p => label(p.label) === k)).length >= common.length * 0.6);
  if (same.length < 3) return;
  const tab = common.some(([k]) => k === 'tab') ? 'Sheet tab' : 'Tab';
  const w = inp.make(new Map<number, string>([...common.map(([, v], i) => [i, v.name] as [number, string]), [TAB_SLOT, tab]]));
  same.forEach((f, i) => {
    const cells = common.map(([k], col) => { const p = f.pairs.find(x => label(x.label) === k); return p ? raw(col, p.value, inp.str) : null; }).filter((c): c is RawCell => !!c);
    w.row({ row: i + 1, cells: [...cells, { col: TAB_SLOT, t: 's', s: -1, v: String(inp.id(f.s.name)), hasF: false }, num(ORIGIN_SLOT, f.s.index)].sort((a, z) => a.col - z.col) });
  });
  await w.drain();
  const names = same.map(f => f.s.name);
  const said = `${plural(same.length, 'tab')} — ${names.slice(0, 3).map(q).join(', ')}${names.length > 3 ? ` … ${q(names[names.length - 1])}` : ''} — are the same form filled in ${same.length} times. I have read them as a table: a row a tab, a column a label (${common.length} of them), with the tab as ${q(tab)}.`;
  await add(inp, w, { name: `${names[0]} to ${names[names.length - 1]} (forms)`, state: 'visible', derived: { how: 'forms', from: names, said } });
}

/** Make the tables the shapes call for, and put them among the sheets. */
export async function normalise(inp: NormaliseInput): Promise<void> {
  await stackForms(inp);
  for (const s of [...inp.profiles]) if (s.read && !s.form && !s.readAs && !s.derived && s.headerRow > 0 && s.rows >= 1) await unpivot(inp, s);
  await stackTabs(inp);
}
