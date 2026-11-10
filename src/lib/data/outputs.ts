/* WHAT A CONVERSATION MAKES (10 November, docs/CONVERSATIONAL-DATA.md — Rowland: "Make me a graph … Change that to percentages … Remove
 * Shift 3 … Put that into a report … Add your findings … Actually, use the other workbook … Go back to the original figures"; "All numerical
 * findings must be traceable to their source data and calculation method. Recommendations must be distinguishable from established
 * findings").
 *
 * Kept on the AI Mode conversation (facts.results, facts.charts, facts.reports), never a second copy of a record:
 *   a RESULT — one question asked of one source (a file, or Faultline's own records), its figures as the code worked them, the cells or
 *     records each came from. A result is never changed: a new question is a new result, pointing at the one it came from.
 *   a CHART — drawn only from results, kept as versions: every refinement is a new version, so "the original" and "the previous" are
 *     there to go back to. A chart says what it left out and which values were not recorded.
 *   a REPORT (or a presentation — the same sections, laid out as slides) — sections in order, each a summary, a finding, a chart, a
 *     table, a recommendation or plain text. A finding names the results it rests on; a figure written in it that none of them holds is
 *     flagged, never let stand as if worked out. A recommendation is marked as the colleague's or the person's view, not a finding.
 * Pure. */
import type { QueryResult } from '../workbook/query';

export interface ResultSource { kind: 'workbook' | 'dataset'; id: string; name: string; sheet?: string; sourceId?: string }
export interface DataResult {
  id: string;
  title: string;
  source: ResultSource;
  /** The question as asked — filters, groups, measures — so it can be asked again or changed. */
  query: Record<string, unknown>;
  result: QueryResult;
  at: number;
  /** The result this one was asked from ("now just Line 2"). */
  from?: string;
}

export type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'pareto';
export interface ChartSpec {
  resultId: string;
  type: ChartType;
  /** Which measure of the result (its index), the first by default. */
  measure: number;
  title: string;
  percent?: boolean;
  /** Categories taken out ("remove Shift 3"), by their label. */
  exclude?: string[];
  /** Only these categories ("just Line 2"). */
  only?: string[];
  /** The largest n only ("the top five"). */
  top?: number;
  target?: number;
  targetLabel?: string;
  /** A second result drawn beside it ("compare it with the previous week"). */
  compareResultId?: string;
  compareLabel?: string;
  unit?: string;
  xLabel?: string;
  yLabel?: string;
  note?: string;
}
export interface Chart { id: string; versions: ChartSpec[]; at: number }
export const chartNow = (c: Chart): ChartSpec => c.versions[c.versions.length - 1];

export type SectionKind = 'summary' | 'finding' | 'chart' | 'table' | 'recommendation' | 'text';
export const SECTION_WORD: Record<SectionKind, string> = { summary: 'Summary', finding: 'Finding', chart: 'Chart', table: 'Table', recommendation: 'Recommendation', text: 'Text' };
export interface ReportSection {
  id: string;
  kind: SectionKind;
  heading: string;
  text?: string;
  chartId?: string;
  resultId?: string;
  /** The results a finding or a summary rests on. */
  evidence?: string[];
  /** Figures written in it that no result it rests on holds — said beside it, on the screen and on paper. */
  unbacked?: string[];
  /** Who it is from: a recommendation is a view. */
  by?: 'luna' | 'person';
}
export interface ConvReport { id: string; title: string; form: 'report' | 'presentation'; sections: ReportSection[]; at: number; updated: number; version: number }

/* ------------------------------------------------------------------ the series a chart draws */
export interface Series {
  labels: string[];
  values: (number | null)[];
  compare?: (number | null)[];
  unit: string;
  /** What it says beside the picture: what was left out, what was not recorded, that a value is a share. */
  notes: string[];
  measure: string;
  total: number | null;
  /** WHAT IT SHOWS, worked by code (docs/LUNA-NEXT.md L5): the biggest and its share, a line's first-to-last change, how many beat a
   *  target, the gap to the comparison — drawn on the chart and said with it. */
  finding?: string;
  /** The value the finding is about, marked on the chart. */
  mark?: number;
}

const numOf = (v: number | string | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function seriesOf(spec: ChartSpec, results: ReadonlyMap<string, DataResult>): Series | { why: string } {
  const r = results.get(spec.resultId);
  if (!r) return { why: 'The result this chart was drawn from is not in this conversation any more.' };
  const res = r.result;
  if (!res.groups.length) return { why: `“${r.title}” has no groups to draw — it is a total (${res.totals.map(v => v ?? 'not recorded').join(', ')}). Ask it by a field to chart it.` };
  const mi = Math.min(Math.max(0, spec.measure), res.measures.length - 1);
  let rows = res.groups.map(g => ({ label: g.key.join(' · '), v: numOf(g.values[mi]) }));
  const notes: string[] = [];
  const low = (s: string) => s.trim().toLowerCase();
  if (spec.only?.length) { const keep = new Set(spec.only.map(low)); const before = rows.length; rows = rows.filter(x => keep.has(low(x.label)) || x.label.split(' · ').some(p => keep.has(low(p)))); if (rows.length < before) notes.push(`Only ${spec.only.join(', ')}.`); }
  if (spec.exclude?.length) { const out = new Set(spec.exclude.map(low)); const gone = rows.filter(x => out.has(low(x.label)) || x.label.split(' · ').some(p => out.has(low(p)))); rows = rows.filter(x => !gone.includes(x)); if (gone.length) notes.push(`Left out: ${gone.map(x => x.label).join(', ')}.`); }
  if (spec.type === 'pareto' || spec.top) rows = [...rows].sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity));
  if (spec.top && rows.length > spec.top) { notes.push(`The top ${spec.top} of ${rows.length}.`); rows = rows.slice(0, spec.top); }
  const missing = rows.filter(x => x.v === null).map(x => x.label);
  if (missing.length) notes.push(`Not recorded (no value, not zero): ${missing.join(', ')}.`);
  const shown = rows.reduce((s, x) => s + (x.v ?? 0), 0);
  let values = rows.map(x => x.v);
  let unit = spec.unit ?? '';
  if (spec.percent) {
    if (!shown) return { why: 'Percentages need a total above zero among the values shown.' };
    values = values.map(v => (v === null ? null : Math.round((v / shown) * 1000) / 10));
    unit = '%';
    notes.push(`Each value is its share of the ${Math.round(shown * 100) / 100} shown — not of anything left out.`);
  }
  let compare: (number | null)[] | undefined;
  if (spec.compareResultId) {
    const c = results.get(spec.compareResultId);
    if (!c) notes.push('The result to compare with is not in this conversation any more.');
    else {
      const byLabel = new Map(c.result.groups.map(g => [low(g.key.join(' · ')), numOf(g.values[Math.min(mi, c.result.measures.length - 1)])]));
      const cTotal = c.result.groups.reduce((s, g) => s + (numOf(g.values[Math.min(mi, c.result.measures.length - 1)]) ?? 0), 0);
      compare = rows.map(x => { const v = byLabel.get(low(x.label)); return v === undefined || v === null ? null : spec.percent && cTotal ? Math.round((v / cTotal) * 1000) / 10 : v; });
      const absent = rows.filter((_x, i) => compare?.[i] === null).map(x => x.label);
      if (absent.length) notes.push(`${spec.compareLabel ?? c.title} has no value for ${absent.join(', ')}.`);
    }
  }
  if (spec.target !== undefined) notes.push(`${spec.targetLabel ?? 'Target'}: ${spec.target}${unit ? ` ${unit}` : ''}.`);
  for (const n of res.notes) notes.push(n);
  const out: Series = { labels: rows.map(x => x.label), values, ...(compare ? { compare } : {}), unit, notes: [...new Set(notes)], measure: res.measures[mi], total: spec.percent ? 100 : shown };
  const f = findingOf(spec, out);
  return f ? { ...out, finding: f.text, ...(f.mark !== undefined ? { mark: f.mark } : {}) } : out;
}

const fw = (v: number, unit: string) => `${Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-GB') : String(Math.round(v * 10) / 10)}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`;
const pc = (v: number) => `${Math.round(v * 10) / 10}%`;

/** What a chart shows, in one sentence, worked by code from the series it draws. Undefined when there is nothing to say (one value, or
 *  nothing recorded). */
export function findingOf(spec: Pick<ChartSpec, 'type' | 'target' | 'targetLabel' | 'compareLabel' | 'percent'>, s: Pick<Series, 'labels' | 'values' | 'compare' | 'unit'>): { text: string; mark?: number } | undefined {
  const pts = s.values.map((v, i) => ({ i, v, l: s.labels[i] })).filter((p): p is { i: number; v: number; l: string } => p.v !== null);
  if (pts.length < 2) return undefined;
  const u = s.unit;
  if (spec.type === 'line') {
    const a = pts[0], b = pts[pts.length - 1];
    const hi = pts.reduce((m, p) => (p.v > m.v ? p : m));
    const ch = b.v - a.v;
    return { text: `From ${fw(a.v, u)} (${a.l}) to ${fw(b.v, u)} (${b.l}) — ${ch === 0 ? 'no change' : `${ch > 0 ? 'up' : 'down'} ${fw(Math.abs(ch), u)}${a.v ? ` (${pc((Math.abs(ch) / Math.abs(a.v)) * 100)})` : ''}`}; the highest ${fw(hi.v, u)} at ${hi.l}.`, mark: hi.i };
  }
  if (spec.target !== undefined) {
    const over = pts.filter(p => p.v > (spec.target as number));
    return { text: `${over.length} of ${pts.length} above the ${(spec.targetLabel ?? 'target').toLowerCase()} of ${fw(spec.target, u)}${over.length ? ` — the furthest ${over.reduce((m, p) => (p.v > m.v ? p : m)).l}` : ''}.`, ...(over.length ? { mark: over.reduce((m, p) => (p.v > m.v ? p : m)).i } : {}) };
  }
  if (s.compare) {
    const pairs = pts.filter(p => s.compare?.[p.i] !== null && s.compare?.[p.i] !== undefined).map(p => ({ ...p, d: p.v - (s.compare?.[p.i] as number) }));
    if (!pairs.length) return undefined;
    const big = pairs.reduce((m, p) => (Math.abs(p.d) > Math.abs(m.d) ? p : m));
    const higher = pairs.filter(p => p.d > 0).length;
    return { text: `Higher than ${(spec.compareLabel ?? 'the comparison').toLowerCase()} in ${higher} of ${pairs.length}; the biggest difference ${big.l}, ${big.d >= 0 ? '+' : '−'}${fw(Math.abs(big.d), u)}.`, mark: big.i };
  }
  const tot = pts.reduce((a, p) => a + Math.max(0, p.v), 0);
  const top = pts.reduce((m, p) => (p.v > m.v ? p : m));
  if (spec.type === 'pareto' && tot > 0) {
    const sorted = [...pts].sort((a, b) => b.v - a.v);
    let run = 0, k = 0;
    while (k < sorted.length && run / tot < 0.8) { run += Math.max(0, sorted[k].v); k++; }
    return { text: `${k === 1 ? sorted[0].l : `The top ${k} (${sorted.slice(0, k).map(p => p.l).join(', ')})`} make${k === 1 ? 's' : ''} up ${pc((run / tot) * 100)} of the ${fw(tot, u)} shown.`, mark: top.i };
  }
  if (u === '%' && spec.percent) return { text: `${top.l} is the biggest: ${fw(top.v, '%')} of what is shown.`, mark: top.i };
  return { text: `${top.l} is the biggest: ${fw(top.v, u)}${tot > 0 && top.v > 0 ? ` of the ${fw(tot, u)} shown (${pc((top.v / tot) * 100)})` : ''}.`, mark: top.i };
}

/** What changed between two versions of a chart, in words — "percentages; Shift 3 left out". */
export function specChange(a: ChartSpec | undefined, b: ChartSpec): string {
  if (!a) return `${b.type} chart of “${b.title}”`;
  const out: string[] = [];
  if (a.type !== b.type) out.push(`a ${b.type} chart`);
  if (!!a.percent !== !!b.percent) out.push(b.percent ? 'percentages' : 'the figures, not percentages');
  if ((a.exclude ?? []).join('|') !== (b.exclude ?? []).join('|')) out.push(b.exclude?.length ? `left out ${b.exclude.join(', ')}` : 'nothing left out');
  if ((a.only ?? []).join('|') !== (b.only ?? []).join('|')) out.push(b.only?.length ? `only ${b.only.join(', ')}` : 'every category');
  if (a.top !== b.top) out.push(b.top ? `the top ${b.top}` : 'every category');
  if (a.resultId !== b.resultId) out.push('a different result');
  if (a.compareResultId !== b.compareResultId) out.push(b.compareResultId ? 'compared with another result' : 'no comparison');
  if (a.target !== b.target) out.push(b.target !== undefined ? `a target of ${b.target}` : 'no target');
  if (a.title !== b.title) out.push(`titled “${b.title}”`);
  if (a.measure !== b.measure) out.push('another measure');
  if (a.unit !== b.unit || a.xLabel !== b.xLabel || a.yLabel !== b.yLabel) out.push('its labels');
  return out.join('; ') || 'no change';
}

/* ------------------------------------------------------------------ figures that rest on nothing */
const FIG = /(?<![\w.])-?\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|(?<![\w.])-?\d+(?:\.\d+)?%?/g;

/** Every number a result holds, and what can honestly be read off it: its values, totals, rows, shares of the total, rounded to
 *  1 and 0 places. */
function heldNumbers(rs: readonly DataResult[]): number[] {
  const out: number[] = [];
  for (const r of rs) {
    const res = r.result;
    out.push(res.rowsMatched, res.rowsScanned, res.groupsTotal, res.groups.length);
    res.totals.forEach(v => { if (typeof v === 'number') out.push(v); });
    for (let mi = 0; mi < res.measures.length; mi++) {
      const vals = res.groups.map(g => numOf(g.values[mi]));
      const tot = vals.reduce<number>((s, v) => s + (v ?? 0), 0);
      for (const v of vals) if (v !== null) { out.push(v); if (tot) out.push((v / tot) * 100); }
      out.push(tot);
    }
    for (const g of res.groups) out.push(g.rows);
  }
  return out;
}

/** The figures written in a text that none of its results hold (to the rounding written) — years, small counts of things named
 *  ("top five", "3 shifts" written as words or digits under 10) and the results' own labels are not figures. */
export function unbackedFigures(text: string, rs: readonly DataResult[]): string[] {
  const held = heldNumbers(rs);
  const labels = new Set(rs.flatMap(r => r.result.groups.flatMap(g => g.key)).flatMap(k => k.match(FIG) ?? []));
  const out: string[] = [];
  for (const m of text.match(FIG) ?? []) {
    const n = Number(m.replace(/[,%]/g, ''));
    if (!Number.isFinite(n) || labels.has(m)) continue;
    if (Number.isInteger(n) && Math.abs(n) < 10) continue;
    if (Number.isInteger(n) && n >= 1990 && n <= 2100) continue;
    const dp = (m.replace('%', '').split('.')[1] ?? '').length;
    const tol = 0.5 * 10 ** -dp + 1e-9;
    if (!held.some(h => Math.abs(h - n) <= tol)) out.push(m);
  }
  return [...new Set(out)];
}

/* ------------------------------------------------------------------ building a report */
export type ReportOp =
  | { op: 'add'; section: Omit<ReportSection, 'id' | 'unbacked'>; after?: string }
  | { op: 'replace'; sectionId: string; section: Partial<Omit<ReportSection, 'id' | 'unbacked'>> }
  | { op: 'remove'; sectionId: string }
  | { op: 'move'; sectionId: string; after: string }
  | { op: 'title'; title: string }
  | { op: 'form'; form: 'report' | 'presentation' };

/** A section checked — a finding or summary's figures against its results; a chart's or table's result named. */
export function checkSection(s: ReportSection, results: ReadonlyMap<string, DataResult>, charts: ReadonlyMap<string, Chart>): { ok: true; s: ReportSection } | { ok: false; why: string } {
  if (s.kind === 'chart') {
    const c = s.chartId ? charts.get(s.chartId) : undefined;
    if (!c) return { ok: false, why: 'A chart section needs a chart made in this conversation (its id).' };
    return { ok: true, s: { ...s, evidence: [chartNow(c).resultId, ...(chartNow(c).compareResultId ? [chartNow(c).compareResultId as string] : [])] } };
  }
  if (s.kind === 'table') {
    if (!s.resultId || !results.has(s.resultId)) return { ok: false, why: 'A table section needs a result worked out in this conversation (its id).' };
    return { ok: true, s: { ...s, evidence: [s.resultId] } };
  }
  if (!s.text?.trim()) return { ok: false, why: `A ${SECTION_WORD[s.kind].toLowerCase()} needs its words.` };
  const ev = (s.evidence ?? []).filter(id => results.has(id));
  if ((s.evidence ?? []).length !== ev.length) return { ok: false, why: `${(s.evidence ?? []).filter(id => !results.has(id)).join(', ')} is not a result in this conversation.` };
  if (s.kind === 'finding' && !ev.length) return { ok: false, why: 'A finding rests on a result — name the result(s) it comes from; a view with nothing behind it is a recommendation.' };
  const unbacked = s.kind === 'recommendation' || s.kind === 'text' ? [] : unbackedFigures(s.text, ev.map(id => results.get(id) as DataResult));
  return { ok: true, s: { ...s, evidence: ev, ...(unbacked.length ? { unbacked } : { unbacked: undefined }) } };
}

export function applyReportOp(r: ConvReport, op: ReportOp, results: ReadonlyMap<string, DataResult>, charts: ReadonlyMap<string, Chart>, mkId: () => string, now: number): { ok: true; r: ConvReport; says: string } | { ok: false; why: string } {
  const at = (id: string) => r.sections.findIndex(s => s.id === id);
  const bump = (next: Partial<ConvReport>, says: string) => ({ ok: true as const, r: { ...r, ...next, updated: now, version: r.version + 1 }, says });
  switch (op.op) {
    case 'title': return op.title.trim() ? bump({ title: op.title.trim() }, `Titled “${op.title.trim()}”.`) : { ok: false, why: 'A title needs words.' };
    case 'form': return bump({ form: op.form }, op.form === 'presentation' ? 'Laid out as a presentation — a slide a section, the same sections.' : 'Laid out as a report.');
    case 'add': {
      const c = checkSection({ ...op.section, id: mkId() } as ReportSection, results, charts);
      if (!c.ok) return c;
      const i = op.after === 'start' ? 0 : op.after ? at(op.after) + 1 : r.sections.length;
      if (op.after && op.after !== 'start' && at(op.after) < 0) return { ok: false, why: `There is no section ${op.after} in “${r.title}”.` };
      const sections = [...r.sections]; sections.splice(i, 0, c.s);
      return bump({ sections }, `Added ${SECTION_WORD[c.s.kind].toLowerCase()} “${c.s.heading}”${c.s.unbacked?.length ? ` — ${c.s.unbacked.join(', ')} not in its results, marked Check this` : ''}.`);
    }
    case 'replace': {
      const i = at(op.sectionId);
      if (i < 0) return { ok: false, why: `There is no section ${op.sectionId} in “${r.title}”.` };
      const c = checkSection({ ...r.sections[i], ...op.section, id: op.sectionId } as ReportSection, results, charts);
      if (!c.ok) return c;
      const sections = [...r.sections]; sections[i] = c.s;
      return bump({ sections }, `Changed “${c.s.heading}”${c.s.unbacked?.length ? ` — ${c.s.unbacked.join(', ')} not in its results, marked Check this` : ''}.`);
    }
    case 'remove': {
      const i = at(op.sectionId);
      if (i < 0) return { ok: false, why: `There is no section ${op.sectionId} in “${r.title}”.` };
      return bump({ sections: r.sections.filter(s => s.id !== op.sectionId) }, `Took out “${r.sections[i].heading}”.`);
    }
    case 'move': {
      const i = at(op.sectionId);
      if (i < 0) return { ok: false, why: `There is no section ${op.sectionId} in “${r.title}”.` };
      const s = r.sections[i];
      const rest = r.sections.filter(x => x.id !== op.sectionId);
      const j = op.after === 'start' ? 0 : rest.findIndex(x => x.id === op.after) + 1;
      if (op.after !== 'start' && j === 0) return { ok: false, why: `There is no section ${op.after} in “${r.title}”.` };
      rest.splice(j, 0, s);
      return bump({ sections: rest }, `Moved “${s.heading}”.`);
    }
  }
}

/** Where a figure in the report comes from, in words — for the paper's "What the figures rest on". */
export function evidenceSaid(r: DataResult): string {
  const f = r.query as { filters?: { column: string; op: string; value?: unknown }[]; groupBy?: string[]; measures?: { op: string; column?: string }[]; time?: { column: string; by: string } };
  const what = (f.measures ?? []).map(m => (m.op === 'count' && !m.column ? 'rows counted' : `${m.op} of ${m.column}`)).join(', ');
  const by = [...(f.time ? [`${f.time.column} by ${f.time.by}`] : []), ...(f.groupBy ?? [])].join(' and ');
  const where = (f.filters ?? []).map(x => `${x.column} ${x.op} ${x.value ?? ''}`.trim()).join('; ');
  return `${r.source.name}${r.source.sheet && r.source.kind === 'workbook' ? ` › ${r.source.sheet}` : ''}: ${what}${by ? ` by ${by}` : ''}${where ? `, where ${where}` : ''} — ${r.result.rowsMatched.toLocaleString('en-GB')} of ${r.result.rowsScanned.toLocaleString('en-GB')} rows, worked by Faultline’s code.`;
}
