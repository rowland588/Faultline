/* THE LIBRARY — every paper you have made, across your customers and inside each (11 November, docs/CONSULTANT-WORKSPACE.md C4 —
 * Rowland: "Where is my overall library of work? … All reports I've created … I need to be able to browse my work across businesses,
 * but also open an individual business and see everything associated with it. I don't want reports disappearing into individual
 * projects … I also need to distinguish between my own internal working documents and finished client-facing reports").
 *
 * Every PDF the app makes is kept where it was made (lib/keptPdfs), and since C4 synced (supabase/KEPT_PAPERS.sql). This module is
 * the reading of those copies, pure, so the page, the tests and the acceptance script say the same:
 *   · WHAT PAPER IT IS — read from the address of the page it was made on (paperKindOf), never asked: a line's report, the Story, a
 *     tool's own paper …
 *   · WHO IT IS FOR — client-facing or internal: by default from its kind (a finished report is the client's; a tool's own paper, a
 *     working sheet, a calculation is yours), changeable on each copy;
 *   · WHOSE IT IS — the customer it was made for, from the line, the project or the record its page names, else the customer active
 *     when it was made (placePaper);
 *   · WHICH ARE SHOWN — the active customer's only once two are named (separation first, as every list since C1), all of them under
 *     All customers, each saying whose; then by kind, audience and words (libraryRows). */
import type { KeptPaperRow, PaperAudience } from '../db/rows';

export type PaperKind = 'story' | 'visit-report' | 'line-report' | 'area-report' | 'project-report' | 'problems' | 'actions' | 'factory'
  | 'tool' | 'talk' | 'other';

/** Each kind as it is said, in the order the filter offers them. */
export const KIND_WORDS: Record<PaperKind, string> = {
  'story': 'Story',
  'visit-report': 'Visit report',
  'line-report': 'Line report',
  'area-report': 'Area report',
  'project-report': 'Project report',
  'problems': 'Problems',
  'actions': 'Actions',
  'factory': 'Factory',
  'tool': 'Tool paper',
  'talk': 'Line Talk',
  'other': 'Other',
};
export const PAPER_KINDS = Object.keys(KIND_WORDS) as PaperKind[];
export const kindWord = (k: string): string => KIND_WORDS[k as PaperKind] ?? 'Other';

/** The finished papers a client is given (Rowland's list): the Story's, a visit's report, a line's or an area's, the project report
 *  (the full package is the line report's) — everything else, a tool's own paper, a working sheet, a calculation, is internal. */
const CLIENT_FACING = new Set<PaperKind>(['story', 'visit-report', 'line-report', 'area-report', 'project-report']);
export const audienceOf = (kind: string): PaperAudience => (CLIENT_FACING.has(kind as PaperKind) ? 'client' : 'internal');
export const AUDIENCE_WORDS: Record<PaperAudience, string> = { client: 'Client-facing', internal: 'Internal' };

/* the tools' own pages — a record of one, or its list (src/state/useRoute) */
const TOOL_PAGES = new Set(['capability', 'value-stream', 'map', 'sampling', 'reliability', 'analysis', 'calc', 'doc', 'scored', 'board', 'chart',
  'log', 'logs', 'smed', 'changeover', 'losses', 'balances', 'standards', 'linebalance', 'video', 'registers', 'hold', 'skills', 'readiness',
  'fmea', 'control-plan', 'fault-tree', 'rsm', 'stops', 'spaghetti', 'flow']);

/** What paper it is, from the address of the page it was made on (lib/keptPdfs pageOf — no query). */
export function paperKindOf(page: string): PaperKind {
  const segs = page.replace(/^#/, '').split('/').filter(Boolean);
  const [a, , c] = segs;
  if (!a || a === 'story') return 'story';
  if (a === 'visit' || a === 'visits') return 'visit-report';
  if (a === 'lines') return 'line-report';
  /* a line's older pages: its one-page report and its evidence cards; its tools' pages are tools */
  if (a === 'w') return c === 'report' || c === 'meeting' || c === 'present' ? 'line-report' : c === 'snaglist' || c === 'snags' ? 'problems' : 'tool';
  if (a === 'area') return 'area-report';
  if (a === 'project') return c === 'actions' ? 'actions' : c === 'snags' ? 'problems' : 'project-report';
  if (a === 'snags') return 'problems';
  if (a === 'actions') return 'actions';
  if (a === 'room' || a === 'factory' || a === 'machines' || a === 'programs' || a === 'today' || a === 'portfolio') return 'factory';
  if (a === 'talk' || a === 'talks') return 'talk';
  if (TOOL_PAGES.has(a) || segs.length >= 2) return 'tool';
  return 'other';
}

/** The world a paper is placed in when it is made — read from the device by lib/keptPdfs, kept small. */
export interface PaperWorld {
  lines: readonly { id: string; clientName?: string }[];
  projects: readonly { id: string }[];
  /** Which factory lines each project is on (lib/lineRecords JobLine). */
  jobLines: readonly { projectId?: string; workspaceId?: string; deletedAt?: number }[];
  studies: readonly { id: string; workspaceId?: string; projectId?: string }[];
}
export interface PaperPlace { workspaceId?: string; projectId?: string; studyId?: string; client?: string }

const trim = (s: string | undefined) => (s ?? '').trim();

/** WHERE A PAPER BELONGS, from the ids its page names: the record, the line, the project — and so its customer: the line's, else the
 *  project's lines' (the first named), else the record's line's or project's, else the area's client in its address, else the
 *  customer active when it was made. */
export function placePaper(ids: readonly string[], world: PaperWorld, active: string, query?: URLSearchParams): PaperPlace {
  const line = world.lines.find(w => ids.includes(w.id));
  const study = world.studies.find(s => ids.includes(s.id));
  const project = world.projects.find(p => ids.includes(p.id));
  const workspaceId = line?.id ?? study?.workspaceId;
  const projectId = project?.id ?? study?.projectId;
  const lineClient = (id?: string) => trim(world.lines.find(w => w.id === id)?.clientName);
  const projectClient = (id?: string) => {
    if (!id) return '';
    for (const l of world.jobLines) if (!l.deletedAt && l.projectId === id) { const c = lineClient(l.workspaceId); if (c) return c; }
    return '';
  };
  const client = lineClient(workspaceId) || projectClient(projectId) || trim(query?.get('client') ?? '') || trim(active);
  return {
    ...(workspaceId ? { workspaceId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(study ? { studyId: study.id } : {}),
    ...(client ? { client } : {}),
  };
}

export interface LibraryFilter {
  /** The customer shown ('' every one). */
  client: string;
  /** Whether the lists are narrowed to one customer (lib/activeClient filtering) — only then is a paper of no customer left out. */
  filtering: boolean;
  kind?: string;
  audience?: PaperAudience | '';
  /** Words in its name, its customer or its kind. */
  q?: string;
}

const low = (s: string | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/** The papers shown, newest first. A paper taken off is never among them. */
export function libraryRows<T extends Pick<KeptPaperRow, 'name' | 'at' | 'kind' | 'audience' | 'client' | 'deletedAt'>>(papers: readonly T[], f: LibraryFilter): T[] {
  const q = low(f.q);
  return papers
    .filter(p => !p.deletedAt)
    .filter(p => !f.filtering || low(p.client) === low(f.client))
    .filter(p => !f.kind || p.kind === f.kind)
    .filter(p => !f.audience || p.audience === f.audience)
    .filter(p => !q || [p.name, p.client, kindWord(p.kind)].some(x => low(x).includes(q)))
    .sort((a, b) => b.at - a.at);
}

/** The old copies kept on this device before the library (5–11 November), offered ONCE — never moved silently. */
export function oldCopiesOffer(count: number, declined: boolean): string | null {
  if (count <= 0 || declined) return null;
  return count === 1 ? 'Keep this copy in your library?' : `Keep these ${count} copies in your library?`;
}

/** "3 papers · 2 client-facing · 1 internal" — the library's one sentence. */
export function librarySaid(rows: readonly Pick<KeptPaperRow, 'audience'>[]): string {
  if (!rows.length) return 'No papers yet';
  const c = rows.filter(r => r.audience === 'client').length;
  return `${rows.length} ${rows.length === 1 ? 'paper' : 'papers'} · ${c} client-facing · ${rows.length - c} internal`;
}
