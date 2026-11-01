/* DEFAULT PRODUCT STORY (29 October, docs/FAULTLINE-FAULT-MODEL.md).
 *
 * Faultline.opexelevate.co.uk leads with fault-centric Gemba CI: 6M performance
 * on the line and programs/tests as the prove loop. Commissioning narrative
 * papers (commissioning report, commissioning cards, handover report) stayed in
 * code for legacy URLs; they were not offered in Report ▾ by default. Since M4 (1 November,
 * docs/METHODS.md) they are the stage-gate method's own and are offered on stage-gate projects.
 * Lever tree is parked — hidden from New project until Rowland says otherwise. */

/** Commissioning report, commissioning cards, handover report in menus.
 *  M4 (1 November, docs/METHODS.md §13 decision 4, §15): back, as the stage-gate method's own papers — and for projects of
 *  that method ONLY. Every place that reads this is already inside a stage-gate project's page (Reports ▾ of its machines,
 *  Install's Hand over, a line machine going through a stage-gate project); the client report asks the project's kind too. */
export const commissioningNarrativePapersInMenus = true;

/** Lever tree on New project and on Details unless the project is already one. */
export const leverTreeInNewProject = false;

/** Install gate screens linked from Details (Machines / stages). Programs and tests live on the line.
 *  M4: back for a stage-gate project's Details (the one place that reads it asks `commissioning` first). */
export const installationProjectSurfaceInMenus = true;

const NARRATIVE_LABELS = new Set([
  'Commissioning report',
  'Handover report',
  'Commissioning cards — a page a machine',
  'Commissioning cards',
]);

/** Drop deprecated narrative papers from a Report ▾ list; keep programs, test cards, status. */
export const withoutCommissioningNarrativePapers = <T extends { label: string }>(papers: T[]): T[] =>
  commissioningNarrativePapersInMenus ? papers : papers.filter(p => !NARRATIVE_LABELS.has(p.label));
