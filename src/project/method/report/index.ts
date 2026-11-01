/* A METHOD'S OWN SECTIONS OF THE PROJECT REPORT (docs/METHODS.md §17). One entry a method, filled by whoever owns the method:
 * DMAIC's phase reviews, PDCA's cycles, the A3's sheet, the 8D's form, the Kaizen week, the Kata's experiments, the Theory of
 * Constraints' five steps. An entry is a pure function from what the report knows (MethodReportCtx — the method, the answers,
 * the studies, the dashboard, what is owed, today) to sections made of typed items (ReportItem: paragraph · facts · bullets ·
 * table · callout · money · bars · tool · qa). The screen draws those items and the paper pours the same items, so an entry
 * writes each section once. A section may add `flags` (text and a tone) to "what needs attention". A method with no entry gets
 * the default: its questions and the team's answers, section by section. Additive: register an entry, change nothing else. */
import type { MethodKey } from '../../../lib/methods';
import type { MethodReportFn } from '../../../lib/methodReportModel';
import { dmaicReport } from './dmaic';

export const METHOD_REPORT: Partial<Record<MethodKey, MethodReportFn>> = {
  dmaic: dmaicReport,
};

export type { MethodReportCtx, MethodReportFn, ReportItem, ReportSection } from '../../../lib/methodReportModel';
