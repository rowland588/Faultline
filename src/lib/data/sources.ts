import type { MsOrigin } from '../microsoft/graph';
import type { LinkOrigin } from '../fileLink/link';
import type { LookSnap } from '../workbook/sinceLast';
import type { Reading } from '../workbook/reading';

/** Where a file came from when it was not uploaded: chosen from SharePoint or OneDrive (signed in to Microsoft), or fetched by its link. */
export type FileOrigin = MsOrigin | LinkOrigin;
/* THE SOURCES REGISTER (10 November, docs/CONVERSATIONAL-DATA.md — Rowland: "Every uploaded workbook or document must be identifiable and
 * referenceable … a unique file identity, a meaningful user-facing name, its original filename, upload date … a description of its
 * contents … its relationship to relevant customers, factories, departments, lines, machines, studies or projects … If several sources
 * could match, Luna must clarify which one the user means. It must not silently select an arbitrary file.").
 *
 * A file is a study record of tool 'source' (supabase/SOURCES.sql) — synced and guarded as every record is — holding what the file is:
 * its name as the person calls it (or as Luna suggested it, said so), its original filename, when it came in, its size, what it holds
 * (sheets and their fields, as the reader found them — never what it was hoped to hold), what could not be read, and what it is about
 * (the record's line and project; a client and a department in its facts). The cells of a workbook stay on the device that read them
 * (lib/workbook); the register says so when another device asks. Pure. */
import type { ToolStudy } from '../study';

export type SourceKind = 'workbook' | 'table' | 'document';
export interface SourceSheet { name: string; rows: number; columns: { name: string; type: string }[] }
export interface SourceFacts {
  name: string;
  /** How the name was given: by the person, suggested by Luna (and kept by the person's word), or the file's own. */
  named: 'person' | 'suggested' | 'file';
  fileName: string;
  kind: SourceKind;
  bytes: number;
  /** When it came in. */
  at: number;
  /** The reader's id for its contents on the device (a workbook's, an import's). */
  fileId: string;
  description?: string;
  describedBy?: 'person' | 'luna';
  sheets?: SourceSheet[];
  status: 'reading' | 'ready' | 'partial' | 'failed' | 'interrupted';
  /** What the reader could not read, in its words. */
  notRead?: string[];
  client?: string;
  departmentId?: string;
  machine?: string;
  /** The conversation it came in through. */
  conversationId?: string;
  /** Where it came from when it was not uploaded — a file chosen from SharePoint or OneDrive (docs/CONNECTED-LUNA.md X1): its drive,
   *  item, version (eTag), address and path, so its figures say where they came from and a newer version can be checked for. Or a file
   *  fetched by its link (X1b, 21 November): the link, the service and the fingerprint of the bytes read. */
  origin?: FileOrigin;
  /** What its first look left (capabilities/look workLook): the snapshot of its headline — compared with the same report next time
   *  (lib/workbook/sinceLast) and said to Luna with every question (lib/workbook/standing) — whose it was read for, and the reading
   *  the person gave it. */
  look?: {
    snap?: LookSnap; client?: string; reading?: Reading;
    /** What changed since the same report was read before, in the look's own words (lib/workbook/sinceLast) — kept since 21 November
     *  so Luna can say what is new in any conversation, and the reading it was compared with. */
    since?: string[]; comparedWith?: { name: string; at: number };
  };
}

export interface Source { id: string; facts: SourceFacts; lineId?: string; projectId?: string; at: number }

export function sourceOf(s: Pick<ToolStudy, 'id' | 'tool' | 'facts' | 'deletedAt' | 'workspaceId' | 'projectId' | 'createdAt'>): Source | undefined {
  if (s.tool !== 'source' || s.deletedAt) return undefined;
  const f = (s.facts as { source?: SourceFacts }).source;
  if (!f || typeof f.name !== 'string' || typeof f.fileId !== 'string') return undefined;
  return { id: s.id, facts: f, ...(s.workspaceId ? { lineId: s.workspaceId } : {}), ...(s.projectId ? { projectId: s.projectId } : {}), at: f.at ?? s.createdAt };
}

export const sourcesOf = (studies: readonly ToolStudy[]): Source[] =>
  studies.map(sourceOf).filter((x): x is Source => !!x).sort((a, b) => b.at - a.at);

/** One linked thing, whichever version of it was read: a link's address, a Microsoft file's place. */
export const originKey = (o: FileOrigin): string => (o.kind === 'link' ? `link:${o.url}` : `ms:${o.driveId}:${o.itemId}`);

/** ONE LINKED FILE OF ONE CUSTOMER — its link or Microsoft place, and whose it is. A file belongs to a customer (docs/CONNECTED-LUNA.md
 *  X1c): the same link connected under another customer is that customer's own file, never a version of the first one's. */
export const fileKey = (s: Pick<Source, 'facts'>): string | undefined =>
  (s.facts.origin ? `${originKey(s.facts.origin)}|${(s.facts.client ?? '').trim().toLowerCase()}` : undefined);

/** THE EARLIER READINGS OF A LINKED FILE (21 November, docs/LUNA-AGENT.md G2b): each time a link or a SharePoint file changes and is
 *  read again, the version read before stays in the register as a record of its own. Those — every record of a link or Microsoft file
 *  that has a NEWER record of the same one, for the same customer — are named here, so the newest speaks for the file: it is the one a
 *  name means, and the one whose headline is said. Two uploads are never versions of each other; nor are two customers' records of
 *  one link. */
export function earlierReadings(list: readonly Source[]): Set<string> {
  const newest = new Map<string, Source>();
  for (const s of list) {
    const k = fileKey(s);
    if (!k) continue;
    const had = newest.get(k);
    if (!had || s.at > had.at) newest.set(k, s);
  }
  const out = new Set<string>();
  for (const s of list) { const k = fileKey(s); if (k && newest.get(k)?.id !== s.id) out.add(s.id); }
  return out;
}

/** A name to call a file by, suggested from what it holds — never a claim about what it means. "Downtime — Mar 2026 (3 sheets)". */
export function suggestName(fileName: string, sheets: readonly SourceSheet[] = []): string {
  const base = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const nice = base.replace(/\b([a-z])/g, c => c.toUpperCase());
  return sheets.length > 1 ? `${nice} (${sheets.length} sheets)` : nice || 'A file';
}

const words = (s: string): string[] => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => (w.length > 1 || /\d/.test(w)) && !STOP.has(w));   /* "line 2" — a number tells two apart */
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'to', 'for', 'on', 'in', 'my', 'our', 'that', 'this', 'file', 'workbook', 'spreadsheet', 'sheet', 'excel', 'xlsx', 'csv', 'one', 'open', 'analyse', 'analyze', 'use', 'show', 'me']);
const DAY = 86_400_000;

export interface SourceMatch { source: Source; score: number; why: string[] }

/** Which files the words could mean, best first, each with why — "BrilloPak speed trials", "last week's downtime workbook".
 *  A date said ("last week", "yesterday", "today") narrows by when it came in. `lineName` lets "the Line 2 workbook" match its line. */
export function matchSources(list: readonly Source[], said: string, now: number, lineName: (id?: string) => string | undefined = () => undefined): SourceMatch[] {
  const w = words(said);
  const t = said.toLowerCase();
  const window: [number, number] | undefined = /\blast week\b/.test(t) ? [now - 14 * DAY, now - 7 * DAY + DAY] : /\bthis week\b/.test(t) ? [now - 7 * DAY, now + DAY] : /\byesterday\b/.test(t) ? [now - 2 * DAY, now - DAY + DAY / 2] : /\btoday\b/.test(t) ? [now - DAY, now + DAY] : undefined;
  const dated = (s: Source) => !window || (s.at >= window[0] && s.at <= window[1]);
  const out: SourceMatch[] = [];
  for (const s of list) {
    if (!dated(s)) continue;
    const hay: [string, string][] = [['name', s.facts.name], ['file name', s.facts.fileName], ['description', s.facts.description ?? ''], ['sheets', (s.facts.sheets ?? []).map(x => x.name).join(' ')], ['fields', (s.facts.sheets ?? []).flatMap(x => x.columns.map(c => c.name)).join(' ')], ['line', lineName(s.lineId) ?? ''], ['client', s.facts.client ?? ''], ['machine', s.facts.machine ?? '']];
    let score = 0;
    const why = new Set<string>();
    for (const q of w) for (const [k, v] of hay) if (words(v).includes(q)) { score += k === 'name' ? 3 : k === 'fields' ? 1 : 2; why.add(k); }
    if (t.includes(s.facts.name.toLowerCase())) { score += 10; why.add('name'); }
    if (window) { score += 1; why.add('when it came in'); }
    if (score > (window && !w.length ? 0 : 1)) out.push({ source: s, score, why: [...why] });
  }
  return out.sort((a, b) => b.score - a.score || b.source.at - a.source.at);
}

/** One file meant, or the ones to ask between — never the newest picked because it is newest. */
export function resolveSource(list: readonly Source[], said: string, now: number, lineName?: (id?: string) => string | undefined): { one: Source } | { ask: Source[] } | { none: true } {
  /* THE NEWEST READING SPEAKS FOR A LINKED FILE: its earlier readings carry the same name, and are never "another file" to ask
     between — unless the words date it ("last week's"), when only the readings of that time are in the running at all */
  const all = matchSources(list, said, now, lineName);
  const earlier = earlierReadings(all.map(x => x.source));
  const m = all.filter(x => !earlier.has(x.source.id));
  if (!m.length) return { none: true };
  /* every word said found in a file's own name or filename is a full match; two full matches are asked between, whatever else either
     carries — a sheet or a line on one file never makes it "the" one */
  const w = words(said);
  const full = w.length ? m.filter(x => { const own = new Set([...words(x.source.facts.name), ...words(x.source.facts.fileName)]); return w.every(q => own.has(q)); }) : [];
  if (full.length > 1) return { ask: full.map(x => x.source).slice(0, 6) };
  if (full.length === 1) return { one: full[0].source };
  if (m.length === 1 || m[0].score >= m[1].score + 3) return { one: m[0].source };
  return { ask: m.filter(x => x.score >= m[0].score - 2).map(x => x.source).slice(0, 6) };
}

/** The file in a line — name, original filename, when, what it holds — for the colleague and the screen. */
export function sourceSaid(s: Source, lineName?: (id?: string) => string | undefined, o: { /** A newer reading of the same linked file is in the list (earlierReadings). */ earlier?: boolean } = {}): string {
  const when = new Date(s.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (o.earlier) return `“${s.facts.name}” — an earlier reading of the same file, came in ${when}; kept as it was read [source ${s.id}]`;
  const holds = (s.facts.sheets ?? []).map(x => `${x.name} (${x.rows.toLocaleString('en-GB')} rows)`).join(', ');
  const about = [lineName?.(s.lineId), s.facts.client, s.facts.machine].filter(Boolean).join(', ');
  return `“${s.facts.name}”${s.facts.named === 'suggested' ? ' (name suggested by Luna)' : ''} — ${s.facts.fileName}, came in ${when}, ${s.facts.status}${holds ? `; holds ${holds}` : ''}${s.facts.description ? `; ${s.facts.description}` : ''}${about ? `; about ${about}` : ''} [source ${s.id}]`;
}
