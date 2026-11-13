/* THE FIRST LOOK AS A PACK (13 November, docs/WORKBOOKS.md — "a finished pack from the first look"). The first look says in words what a
 * workbook holds. Sat beside a manufacturing manager, words are not what is handed over: a paper is. This lays the SAME look out as one
 * of the conversation's own reports (lib/data/outputs — the report Luna builds section by section), so it downloads as a PDF and as
 * slides through the code that already makes those, and can be added to, reordered and refreshed like any other:
 *   what it is         the sheet, its rows, the figure taken — in the look's own words;
 *   month by month     the lead figure by month, as a chart, with what the look said of the period under it;
 *   since last time    when the same report was read before;
 *   where it sits      the lead figure by each thing it was split by, as a chart, with the look's sentence where one stood out;
 *   what moved         between the last two whole months, and the flags;
 *   beside it          the other tables;
 *   to know first      what would mislead.
 * Every chart is drawn from a RESULT asked of the rows here and kept on the conversation, so every figure on the paper is traceable as
 * any other is. A sentence whose figures are all in its result is printed as a FINDING; one that also says a derived figure (a day's
 * average, a difference) is printed as plain text — worked by the same code, but not a sum the result holds, and never marked "check
 * this" for that. No AI is asked. Pure but for `run`. */
import type { Query } from './query';
import { by, dimSaid, figure, NOT_SAID, type Dim, type LookPart, type MeasureKind, type Run } from './firstLook';
import { applyReportOp, type Chart, type ChartSpec, type ConvReport, type DataResult, type ReportSection, type ResultSource } from '../data/outputs';

/** What is kept of a look on the conversation — enough to make its pack, or to read the workbook again the same way. */
export interface KeptLook {
  workbookId: string; name: string; at: number;
  sheet: string; headline: { column: string; kind: MeasureKind }; date?: string;
  dims: Dim[];
  parts: { part: LookPart; text: string }[];
  /** The lead figure over every row read, the months it runs over ("August 2026 to October 2026") and the rows — the pack opens with them. */
  total?: number | null; period?: string; rows?: number;
  /** What the person said to read it by, when they did. */
  asked?: { sheet?: string; result?: string; date?: string };
}
export interface Pack { results: DataResult[]; charts: Chart[]; report: ConvReport }
export const PACK_OFFER = 'Make this a pack';

const GROUPS_KEPT = 60;
/* ON PAPER the look's words lose what was said to the person at the screen — "say if it is another", "tell me and I will remember
   it": a paper handed across a desk asks nobody anything. Nothing else is changed, and no figure. */
const ASKS = [/ ?Say if it is another\./g, / ?Say if it is the one to use\./g, / ?Is that the one the business manages by\? Say yes and I will remember it, or name another\./g,
  / ?Which one does the business manage by\? Tell me and I will read it again by that one, and remember it\./g, / — say if you want only what the filter shows/g,
  / — tell me \(“red is a missed hour”\) and I will remember it/g, / ?What it MEANS is the next question\./g];
export const forPaper = (text: string): string => ASKS.reduce((t, re) => t.replace(re, ''), text).replace(/What a colour MEANS is/g, 'What a colour means is').replace(/[ \t]+\n/g, '\n').trim();
const said = (k: KeptLook, ...which: LookPart[]): string => forPaper(k.parts.filter(p => which.includes(p.part)).map(p => p.text).join('\n\n'));

export async function lookPack(k: KeptLook, run: Run, source: ResultSource, o: { id: (prefix: string) => string; now: number }): Promise<Pack> {
  const H = k.headline.column;
  const results: DataResult[] = [], charts: Chart[] = [];
  const keep = async (title: string, q: Query): Promise<DataResult> => {
    const r = await run(q);
    const kept: DataResult = { id: o.id('R'), title, source, query: q as unknown as Record<string, unknown>, result: { ...r, groups: r.groups.slice(0, GROUPS_KEPT) }, at: o.now };
    results.push(kept);
    return kept;
  };
  const draw = (r: DataResult, type: ChartSpec['type'], extra: Partial<ChartSpec> = {}): Chart => {
    const c: Chart = { id: o.id('C'), versions: [{ resultId: r.id, type, measure: 0, title: r.title, ...extra }], at: o.now };
    charts.push(c);
    return c;
  };
  let report: ConvReport = { id: o.id('D'), title: `${k.name.replace(/\.[a-z0-9]{2,5}$/i, '')} — first look`, form: 'report', sections: [], at: o.now, updated: o.now, version: 1 };
  const add = (section: Omit<ReportSection, 'id' | 'unbacked'>): void => {
    const rm = new Map(results.map(r => [r.id, r])), cm = new Map(charts.map(c => [c.id, c]));
    let t = applyReportOp(report, { op: 'add', section }, rm, cm, () => o.id('S'), o.now);
    /* a sentence that also says a derived figure is the code's own working, not a sum its result holds: printed as text, never flagged */
    if (t.ok && t.r.sections[t.r.sections.length - 1].unbacked?.length) t = applyReportOp(report, { op: 'add', section: { ...section, kind: 'text', evidence: undefined } }, rm, cm, () => o.id('S'), o.now);
    if (t.ok) report = t.r;
  };
  const words = (heading: string, text: string): void => { if (text.trim()) add({ kind: 'text', heading, text }); };

  /* IN SHORT — the three things a manager reads first: the figure over the period, where it sits most, what moved */
  const first = (part: LookPart) => forPaper(k.parts.find(p => p.part === part)?.text ?? '');
  const short = [
    k.total !== undefined && k.total !== null ? `${k.period ? `${k.period}: ` : ''}“${H}” is ${figure(k.total, H, k.headline.kind)}${k.rows ? ` over ${k.rows.toLocaleString('en-GB')} rows of “${k.sheet}”` : ''}.` : '',
    first('where'), first('moved'), k.parts.filter(p => p.part === 'since').map(p => forPaper(p.text)).find(t => t.includes('CHANGED')) ?? '',
  ].filter(Boolean);
  if (short.length >= 2) words('In short', short.join('\n\n'));
  words('What this workbook holds', said(k, 'what', 'figure'));
  if (k.date) {
    const r = await keep(`${H} by month`, { sheet: k.sheet, time: { column: k.date, by: 'month' }, measures: [{ op: 'sum', column: H }], order: { by: 'group' }, limit: 200 });
    if (r.result.groups.length >= 2) add({ kind: 'chart', heading: 'Month by month', chartId: draw(r, r.result.groups.length > 12 ? 'line' : 'column').id });
    const t = said(k, 'period');
    if (t) add({ kind: 'finding', heading: 'The period', text: t, evidence: [r.id] });
  }
  words('Since it was last read', said(k, 'since'));
  const lostLike = k.headline.kind === 'lost' || k.headline.kind === 'money';
  for (const d of k.dims.slice(0, 3)) {
    const r = await keep(`${H} by ${d.said}`, { sheet: k.sheet, ...by(d), measures: [{ op: 'sum', column: H }], order: { by: 0, desc: lostLike }, limit: 15 });
    const named = r.result.groups.filter(g => !NOT_SAID.test(g.key[0].trim()));
    if (named.length < 2) continue;
    const left = r.result.groups.filter(g => NOT_SAID.test(g.key[0].trim())).map(g => g.key[0]);
    add({ kind: 'chart', heading: `By ${d.said}`, chartId: draw(r, 'bar', left.length ? { exclude: left } : {}).id });
    const t = k.parts.filter(p => p.part === 'where' && p.text.startsWith(`By ${dimSaid(d)}`)).map(p => p.text).join('\n\n');
    if (t) add({ kind: 'finding', heading: `What stands out by ${d.said}`, text: t, evidence: [r.id] });
  }
  words('What moved', said(k, 'moved', 'flags'));
  words('The tables beside it', said(k, 'beside'));
  words('Colours', said(k, 'colours'));
  words('To know before trusting it', said(k, 'gaps').replace(/^To know before trusting any of it: /, ''));
  return { results, charts, report };
}
