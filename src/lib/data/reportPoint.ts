/* M2 — which report section the room means (docs/LUNA-ABILITIES.md §4). Speech and headings map to section ids already on the report;
 * every figure stays the app's. */
import { matches, wordsOf } from '../findWords';
import type { Chart } from './outputs';
import { chartNow } from './outputs';
import type { ConvReport, DataResult, ReportSection } from './outputs';

export type SectionPick = { section: ReportSection; score: number; why: string };

const queryText = (q: Record<string, unknown>): string => JSON.stringify(q).toLowerCase();

const sectionHaystack = (s: ReportSection, results: ReadonlyMap<string, DataResult>, charts: ReadonlyMap<string, Chart>): string => {
  const bits = [s.heading, s.text ?? '', s.kind];
  if (s.resultId) {
    const dr = results.get(s.resultId);
    if (dr) bits.push(queryText(dr.query));
  }
  if (s.chartId) {
    const c = charts.get(s.chartId);
    if (c) {
      const spec = chartNow(c);
      bits.push(spec.title);
      const dr = results.get(spec.resultId);
      if (dr) bits.push(queryText(dr.query));
    }
  }
  for (const e of s.evidence ?? []) {
    const dr = results.get(e);
    if (dr) bits.push(queryText(dr.query));
  }
  return bits.join(' ').toLowerCase();
};

function positionBonus(words: string, sections: ReportSection[], index: number, s: ReportSection): number {
  const w = words.toLowerCase();
  const charts = sections.map((x, i) => ({ x, i })).filter(x => x.x.kind === 'chart');
  const chartAt = charts.findIndex(x => x.i === index);
  if (/\b(first|left|top)\b/.test(w) && /\b(chart|graph|picture|section)\b/.test(w) && chartAt === 0) return 40;
  if (/\b(last|right|bottom)\b/.test(w) && /\b(chart|graph|picture|section)\b/.test(w) && chartAt === charts.length - 1 && chartAt >= 0) return 40;
  if (index === 0 && /\bfirst\b/.test(w) && !/\blast\b/.test(w)) return 12;
  if (index === sections.length - 1 && /\blast\b/.test(w)) return 12;
  if (/\bexecutive\b/.test(w) && /\bsummary\b/.test(w) && s.kind === 'summary') return 50;
  if (/\bthe chart\b/.test(w) && s.kind === 'chart' && charts.length === 1) return 35;
  if (/\bthe table\b/.test(w) && s.kind === 'table') return 35;
  return 0;
}

/** Score every section; return the best, or ask between close matches. */
export function scoreReportSections(
  words: string,
  report: ConvReport,
  results: ReadonlyMap<string, DataResult>,
  charts: ReadonlyMap<string, Chart>,
): SectionPick[] {
  const w = words.trim();
  if (!w) return [];
  return report.sections.map((s, i) => {
    const hay = sectionHaystack(s, results, charts);
    const headingHit = matches(s.heading, w) ? 30 : 0;
    const bodyHit = s.text && matches(s.text, w) ? 15 : 0;
    const hayHit = matches(hay, w) ? 20 : 0;
    const monthNames: Record<string, string> = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const monthWords = wordsOf(w).filter(x => monthNames[x] || /^\d{4}-\d{2}$/i.test(x));
    const monthHit = monthWords.some(m => {
      const low = m.toLowerCase();
      if (hay.includes(low) || s.heading.toLowerCase().includes(low)) return true;
      const mm = monthNames[low];
      return !!mm && (hay.includes(`-${mm}-`) || hay.includes(`-${mm}"`));
    }) ? 25 : 0;
    const pos = positionBonus(w, report.sections, i, s);
    const score = headingHit + bodyHit + hayHit + monthHit + pos + (s.kind === 'chart' && /\bchart|graph\b/i.test(w) ? 8 : 0);
    const why = [headingHit ? 'heading' : '', monthHit ? 'month or column' : '', pos ? 'position' : '', hayHit ? 'what it rests on' : ''].filter(Boolean).join(', ') || 'weak match';
    return { section: s, score, why };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
}

export function resolveReportSection(
  words: string,
  report: ConvReport,
  results: ReadonlyMap<string, DataResult>,
  charts: ReadonlyMap<string, Chart>,
  sectionId?: string,
): { ok: true; section: ReportSection; why: string } | { ok: false; why: string; ask?: { id: string; heading: string }[] } {
  if (sectionId) {
    const s = report.sections.find(x => x.id === sectionId);
    return s ? { ok: true, section: s, why: `section ${sectionId}` } : { ok: false, why: `There is no section ${sectionId} in “${report.title}”.` };
  }
  const ranked = scoreReportSections(words, report, results, charts);
  if (!ranked.length) return { ok: false, why: 'No section on this report matches those words — name its heading, say “the chart”, or a month like October.' };
  if (ranked.length > 1 && ranked[0].score - ranked[1].score < 8) {
    return { ok: false, why: `More than one section could be meant: ${ranked.slice(0, 3).map(x => `“${x.section.heading}” [${x.section.id}]`).join('; ')}. Ask which, or pass sectionId.`, ask: ranked.slice(0, 4).map(x => ({ id: x.section.id, heading: x.section.heading })) };
  }
  const best = ranked[0];
  return { ok: true, section: best.section, why: best.why };
}

/** Primary result behind a section — chart, table, or first evidence. */
export function resultBehindSection(
  s: ReportSection,
  results: ReadonlyMap<string, DataResult>,
  charts: ReadonlyMap<string, Chart>,
): DataResult | undefined {
  if (s.resultId && results.has(s.resultId)) return results.get(s.resultId);
  if (s.chartId) {
    const c = charts.get(s.chartId);
    if (c) return results.get(chartNow(c).resultId);
  }
  const ev = (s.evidence ?? []).find(id => results.has(id));
  return ev ? results.get(ev) : undefined;
}