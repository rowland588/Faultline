/* PROBLEMS ON PAPER, FROM ANYWHERE — one problem's card, a group's report or
 * cards, a project's, a line's.
 *
 * Rowland, 12 October: "every problem can either have their own card, PDF
 * card, or every group. So if it's attached to a line, every group I can
 * send from that. Plus when it's sent to a project, on that project page
 * itself, also I can have a project card. So I have multiple ways and
 * avenues to create PDFs and send them out."
 *
 * One maker for the report and one for the cards, whichever page asks: the
 * Problems page (the whole page, a line's group, a project's group), a
 * line's own page and a project's own Problems page. The report is the
 * Problems report (lib/snagsReportPdf) read afresh for what is asked — its
 * sentence and tiles count that group, never the whole page; the cards are
 * the report cards (lib/snagCardPdf), one page each. */
import type { Snag } from '../snag/types';
import type { JobGroup } from './snagsReport';
import { snagsReading } from './snagsReport';
import type { SnagCardRow, JobCardRow } from './buildSnagCards';

import { isOpenOnLine } from './lineWork';
export interface ProblemsScope {
  /** The report's title — "Line 2B — problems", "Line 2 commissioning — problems". */
  title: string;
  /** The problems taken on lines in it (the register's records). */
  snags: Snag[];
  /** A project's own problems and fixes in it (lib/snagsReport jobGroup). */
  jobs: JobGroup[];
  lineName: (wsId: string) => string;
  jobName: (id?: string) => string | undefined;
  assetName?: (s: Snag) => string | undefined;
  stillOf?: (s: Snag) => string | undefined;
}

/** THE REPORT for a scope — what is still open in it, read afresh. */
export async function saveProblemsReportFor(x: ProblemsScope): Promise<void> {
  const r = snagsReading({ snags: x.snags.filter(s => !s.deletedAt && !s.archivedAt), jobs: x.jobs, lineName: x.lineName, jobName: x.jobName,
    became: new Map(), register: true, assetName: x.assetName, stillOf: x.stillOf });
  const lines = r.lines.map(l => ({ ...l, rows: l.rows.filter(row => row.status !== 'closed') })).filter(l => l.rows.length);
  const jobs = r.jobs.map(g => ({ ...g, rows: g.rows.filter(row => row.open) })).filter(g => g.rows.length);
  const { saveSnagsReport } = await import('./buildSnagsReport');
  await saveSnagsReport({ ...r, lines, jobs, moved: [] }, x.title);
}

/** THE CARDS for a scope — one page per problem still open, a line's and a
 *  project's alike. */
export async function saveProblemCardsFor(x: { name: string; note?: string; lineRows: SnagCardRow[]; jobRows: JobCardRow[] }): Promise<void> {
  const { saveProblemCards } = await import('./buildSnagCards');
  await saveProblemCards([
    ...x.lineRows.filter(r => r.snag.status !== 'closed').map(line => ({ line })),
    ...x.jobRows.filter(j => j.row.open).map(job => ({ job })),
  ], x.name, x.note);
}

/** How many a scope would print — a button with nothing behind it is greyed. */
export const openIn = (snags: Snag[], jobs: JobGroup[]): number =>
  snags.filter(s => isOpenOnLine(s, s.workspaceId)).length + jobs.reduce((n, g) => n + g.rows.filter(r => r.open).length, 0);
