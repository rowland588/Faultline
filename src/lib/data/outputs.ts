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

export type SectionKind = 'summary' | 'finding' | 'chart' | 'table' | 'recommendation' | 'text' | 'process';
export const SECTION_WORD: Record<SectionKind, string> = { summary: 'Summary', finding: 'Finding', chart: 'Chart', table: 'Table', recommendation: 'Recommendation', text: 'Text', process: 'Process' };
export const processSteps = (text = '') => text.split(/\r?\n/).map(step => step.trim()).filter(Boolean);
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
export interface ConvReport { sourceNote?: string; id: string; title: string; form: 'report' | 'presentation'; sections: ReportSection[]; at: number; updated: number; version: number }
export const textDocument = (report: ConvReport) => report.form === 'report' && report.sections.length > 0 && report.sections.every(s => ['text', 'process', 'summary', 'recommendation'].includes(s.kind) && !s.evidence?.length && !s.chartId && !s.resultId);


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
  const sourceIsPartial = res.groupsTotal > res.groups.length;
  if (sourceIsPartial) notes.push(`Showing ${res.groups.length} of ${res.groupsTotal} groups in the saved result; this chart and its finding use only those shown. Narrow the question to inspect the others.`);
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
  if (f) return { ...out, finding: sourceIsPartial ? `Showing ${res.groups.length} of ${res.groupsTotal} groups. Among these: ${f.text}` : f.text, ...(f.mark !== undefined ? { mark: f.mark } : {}) };
  return sourceIsPartial ? { ...out, finding: `Showing ${res.groups.length} of ${res.groupsTotal} groups; the other groups are not drawn.` } : out;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A category as it is written on a chart: a month's key ("2026-08") as "Aug 2026"; anything else as it is. */
export function labelSaid(label: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(label.trim());
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${MON[Number(m[2]) - 1]} ${m[1]}` : label;
}
/** A figure below zero written with a true minus sign. */
const neg = (s: string) => s.replace(/^-/, '−');
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
  /* A SERIES THAT RUNS BELOW ZERO — a variance, a profit and loss (13 November: a chart of losses said "Line 2 is the biggest: −8,586"
     of the line that lost LEAST). "The biggest" is not the word: the lowest is named with its figure and — when every value is below
     zero — its share of the whole; when some are above, the highest is named too. Arithmetic, never a judgement of good or bad. */
  if (spec.type !== 'pareto' && !spec.percent && pts.some(p => p.v < 0)) {
    const low = pts.reduce((m, p) => (p.v < m.v ? p : m)), high = pts.reduce((m, p) => (p.v > m.v ? p : m));
    const all = pts.reduce((a, p) => a + p.v, 0);
    if (high.v <= 0) return { text: `${labelSaid(low.l)} is the lowest: ${neg(fw(low.v, u))}${all < 0 && low.v !== all ? ` of the ${neg(fw(all, u))} in all (${pc((low.v / all) * 100)})` : ''}.`, mark: low.i };
    return { text: `${labelSaid(low.l)} is the lowest: ${neg(fw(low.v, u))}; ${labelSaid(high.l)} the highest: ${fw(high.v, u)}.`, mark: low.i };
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
    /* a result that shows fewer groups than it has lends no share of the ones it shows — their sum is not the total (the same rule
       as the answer's own check, colleague/figureCheck, 21 November); its shares are against its TRUE total, for a figure added up
       or counted. A DERIVED figure (lib/workbook/derive, 22 November) lends itself, and the percentage it is said as where it is a
       fraction of one — never a share of its own column. */
    const cut = res.groupsTotal > res.groups.length;
    const firstDerived = res.measures.length - (res.derived?.length ?? 0);
    for (let mi = 0; mi < res.measures.length; mi++) {
      const vals = res.groups.map(g => numOf(g.values[mi]));
      if (mi >= firstDerived) {
        const pct = !!res.derived?.[mi - firstDerived]?.fraction;
        for (const v of [...vals, numOf(res.totals[mi] ?? null)]) if (v !== null) { out.push(v); if (pct) out.push(v * 100, Math.abs(v) * 100); }
        continue;
      }
      const shown = vals.reduce<number>((s, v) => s + (v ?? 0), 0);
      const whole = numOf(res.totals[mi] ?? null);
      const tot = !cut ? shown : whole !== null && /^(sum of |count of |rows$)/i.test(res.measures[mi]) ? whole : 0;
      for (const v of vals) if (v !== null) { out.push(v); if (tot) out.push((v / tot) * 100); }
      if (!cut) out.push(shown);
    }
    for (const g of res.groups) out.push(g.rows);
  }
  return out;
}

const PACK_G = /^g\b/i;

/** Numbers that are part of a row's label (500 in "500g"), never figures in a report. `labelSources` may be every result in the
 *  conversation, while `rs` is what the section rests on. */
function labelNumbers(rs: readonly DataResult[]): Set<string> {
  const out = new Set<string>();
  for (const r of rs) for (const g of r.result.groups) for (const k of g.key) {
    for (const m of k.match(FIG) ?? []) out.add(m);
    for (const m of k.matchAll(/(\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|lb|oz)\b/gi)) out.add(m[1].replace(/,/g, ''));
  }
  return out;
}

const heldHit = (h: number, n: number, tol: number) => Math.abs(h - n) <= tol || Math.abs(Math.abs(h) - Math.abs(n)) <= tol;

/** The figures written in a text that none of its results hold (to the rounding written) — years, small counts of things named
 *  ("top five", "3 shifts" written as words or digits under 10) and the results' own labels are not figures. */
export function unbackedFigures(text: string, rs: readonly DataResult[], labelSources?: readonly DataResult[]): string[] {
  const held = heldNumbers(rs);
  const labels = labelNumbers(labelSources ?? rs);
  const out: string[] = [];
  for (const m of text.matchAll(FIG)) {
    const raw = m[0];
    const at = m.index ?? 0;
    const n = Number(raw.replace(/[,%]/g, ''));
    if (!Number.isFinite(n) || labels.has(raw) || labels.has(raw.replace(/,/g, ''))) continue;
    if (PACK_G.test(text.slice(at + raw.length, at + raw.length + 2))) continue;
    if (Number.isInteger(n) && Math.abs(n) < 10) continue;
    if (Number.isInteger(n) && n >= 1990 && n <= 2100) continue;
    const dp = (raw.replace('%', '').split('.')[1] ?? '').length;
    const tol = 0.5 * 10 ** -dp + 1e-9;
    if (!held.some(h => heldHit(h, n, tol))) out.push(raw);
  }
  return [...new Set(out)];
}

/** Explicit evidence is the section's source, not an invitation to attach any other result with the same number.
 *  When no evidence was named, look for a result in this conversation that holds the figures. */
function evidenceFilled(text: string, named: string[], results: ReadonlyMap<string, DataResult>): { evidence: string[]; unbacked: string[] } {
  const all = [...results.values()];
  const ev = [...new Set(named.filter(id => results.has(id)))];
  let rs = ev.map(id => results.get(id) as DataResult);
  let unbacked = unbackedFigures(text, rs, all);
  if (ev.length) return { evidence: ev, unbacked };
  let guard = 40;
  while (unbacked.length && guard-- > 0) {
    let added = false;
    for (const [id, r] of results) {
      if (ev.includes(id)) continue;
      const next = unbackedFigures(text, [...rs, r], all);
      if (next.length < unbacked.length) {
        ev.push(id); rs = [...rs, r]; unbacked = next; added = true;
      }
    }
    if (!added) break;
  }
  return { evidence: ev, unbacked };
}

/* ------------------------------------------------------------------ building a report */
export type ReportOp =
  | { op: 'add'; section: Omit<ReportSection, 'id' | 'unbacked'>; after?: string }
  | { op: 'replace'; sectionId: string; section: Partial<Omit<ReportSection, 'id' | 'unbacked'>> }
  | { op: 'remove'; sectionId: string }
  | { op: 'move'; sectionId: string; after: string }
  | { op: 'title'; title: string }
  | { op: 'form'; form: 'report' | 'presentation' };

/** A section checked — a finding or summary's figures against its results; a chart's or table's result named. `fillEvidence` adds any
 *  conversation result that backs a figure still unmatched (build_report); off on refresh so stale results do not clear Check this. */
export function checkSection(s: ReportSection, results: ReadonlyMap<string, DataResult>, charts: ReadonlyMap<string, Chart>, fillEvidence = true): { ok: true; s: ReportSection } | { ok: false; why: string } {
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
  if (s.kind === 'process') {
    const steps = processSteps(s.text);
    if (steps.length < 2 || steps.length > 8 || steps.some(step => step.length > 120)) {
      return { ok: false, why: 'An illustrated process needs 2–8 steps in order, one per line, with up to 120 characters per step.' };
    }
  }
  const ev = (s.evidence ?? []).filter(id => results.has(id));
  if ((s.evidence ?? []).length !== ev.length) return { ok: false, why: `${(s.evidence ?? []).filter(id => !results.has(id)).join(', ')} is not a result in this conversation.` };
  if (s.kind === 'finding' && !ev.length) return { ok: false, why: 'A finding rests on a result — name the result(s) it comes from; a view with nothing behind it is a recommendation.' };
  const filled = s.kind === 'recommendation' || s.kind === 'text' ? { evidence: ev, unbacked: [] as string[] }
    : fillEvidence ? evidenceFilled(s.text ?? '', ev, results) : { evidence: ev, unbacked: unbackedFigures(s.text ?? '', ev.map(id => results.get(id) as DataResult), [...results.values()]) };
  const unbacked = filled.unbacked;
  return { ok: true, s: { ...s, evidence: filled.evidence, ...(unbacked.length ? { unbacked } : { unbacked: undefined }) } };
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
  const f = r.query as { filters?: { column: string; op: string; value?: unknown }[]; groupBy?: string[]; measures?: { op: string; column?: string }[]; time?: { column: string; by: string }; lookups?: { as: string; sheet?: string; source?: string; match: string | string[]; on: string | string[]; take: string | { op: string; column: string } }[]; calcs?: { as: string; a: string; op: string; b: string | number }[] };
  const what = (f.measures ?? []).map(m => (m.op === 'count' && !m.column ? 'rows counted' : `${m.op} of ${m.column}`)).join(', ');
  const by = [...(f.time ? [`${f.time.column} by ${f.time.by}`] : []), ...(f.groupBy ?? [])].join(' and ');
  const where = (f.filters ?? []).map(x => `${x.column} ${x.op} ${x.value ?? ''}`.trim()).join('; ');
  const join = (f.lookups ?? []).map(l => {
    const side = l.source ?? l.sheet ?? '?';
    const take = typeof l.take === 'string' ? l.take : `${l.take.op} of ${l.take.column}`;
    const match = Array.isArray(l.match) ? l.match.join(' + ') : l.match;
    const on = Array.isArray(l.on) ? l.on.join(' + ') : l.on;
    return `“${l.as}” — ${take} from ${side}, matched by ${match} with ${on} on the other side (its rows brought together by that key first, then joined)`;
  }).join('; ');
  const calc = (f.calcs ?? []).map(c => `“${c.as}” as ${c.a} ${c.op} ${typeof c.b === 'number' ? c.b : `“${c.b}”`} on each row`).join('; ');
  return `${r.source.name}${r.source.sheet && r.source.kind === 'workbook' ? ` › ${r.source.sheet}` : ''}: ${what}${by ? ` by ${by}` : ''}${where ? `, where ${where}` : ''}${join ? `; join — ${join}` : ''}${calc ? `; ${calc}` : ''} — ${r.result.rowsMatched.toLocaleString('en-GB')} of ${r.result.rowsScanned.toLocaleString('en-GB')} rows, worked by Faultline’s code.`;
}
