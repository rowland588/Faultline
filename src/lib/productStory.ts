/* DEFAULT PRODUCT STORY (29 October, docs/FAULTLINE-FAULT-MODEL.md).
 *
 * Faultline.opexelevate.co.uk leads with fault-centric Gemba CI: 6M performance
 * on the line and programs/tests as the prove loop. Commissioning narrative
 * papers (commissioning report, commissioning cards, handover report) stay in
 * code for legacy URLs and slice 2; they are not offered in Report ▾ by default.
 * Lever tree is parked — hidden from New project until Rowland says otherwise. */

/** Commissioning report, commissioning cards, handover report in menus. */
export const commissioningNarrativePapersInMenus = false;

/** Lever tree on New project and on Details unless the project is already one. */
export const leverTreeInNewProject = false;

const NARRATIVE_LABELS = new Set([
  'Commissioning report',
  'Handover report',
  'Commissioning cards — a page a machine',
  'Commissioning cards',
]);

/** Drop deprecated narrative papers from a Report ▾ list; keep programs, test cards, status. */
export const withoutCommissioningNarrativePapers = <T extends { label: string }>(papers: T[]): T[] =>
  commissioningNarrativePapersInMenus ? papers : papers.filter(p => !NARRATIVE_LABELS.has(p.label));
