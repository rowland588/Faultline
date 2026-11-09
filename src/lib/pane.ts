/* THE WORK PANE (10 November, docs/AI-OPERATING.md — Rowland: "When the AI populates a study, I want to be able to see the real study
 * and its information being populated. I don't want a chat summary pretending to be the underlying application").
 *
 * AI Mode shows the real page of the record being worked on — the tool's own page, its capture screen, its report — beside the
 * conversation, in a frame named WORK_PANE. The app inside that frame is the same app on the same device's data: it draws the page
 * with no frame of its own (no menu, no top bar) and leaves syncing to the window around it, which it tells of every write
 * (db/core, the 'faultline-data' channel). Moving about inside the frame keeps it the pane: the frame's name is the mark, not the
 * address. */
export const WORK_PANE = 'fl-work';

/** Is this window the work pane inside AI Mode? */
export const inPane = (): boolean => {
  try { return typeof window !== 'undefined' && window.name === WORK_PANE && window.parent !== window; } catch { return false; }
};

/** The address a page is shown at in the pane: the app's own, under its hash. */
export const paneSrc = (href: string): string => `${window.location.pathname}${window.location.search}#${href.startsWith('/') ? href : `/${href}`}`;
