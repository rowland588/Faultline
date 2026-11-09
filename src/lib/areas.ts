/* AN AREA OF THE FACTORY — a group of its lines (9 November — Rowland: "we now have areas in set up. So on factory page we need
 * area.. then each area will have lines in them we need area reports show everything happening in the area").
 *
 * NO NEW RECORD. An area is the lines whose words say that site and that area (docs/CONSULTANT.md K1 — client, site and area are
 * words on each line, `workspaces.client_name · site_name · area_name`); it has no row, no id and no rail of its own. It is a page
 * of the FACTORY scope (`#/area?site=…&area=…`, `&client=` when the lines name more than one client), lit under the Factory's
 * Lines tab, and its report is the line report's parts laid one after another (src/line/report/areaBundle). Everything said of an
 * area is the sum of what its lines' own readers say — the same open problems the line's page counts (lib/lineWork lineProblems),
 * the same programs (lib/lineRecords lineKit), the same tool records (src/line/report/lineBundle itemsOn) — so a number on the area
 * is never a second number (docs/STEADY.md, one number everywhere). Pure. */
import type { Workspace } from '../types';
import type { LeanTile, LeanTone } from './lean';
import { placeOf } from './lines';

/** Which area — its words as the lines say them. `client` only narrows when it is given. */
export interface AreaId { client?: string; site?: string; area: string }

const low = (s: string | undefined): string => (s ?? '').trim().toLowerCase();

/** The area a line is in, or none when it has no area said. */
export function areaOf(w: Pick<Workspace, 'clientName' | 'siteName' | 'areaName'>): AreaId | undefined {
  const area = w.areaName?.trim();
  if (!area) return undefined;
  const client = w.clientName?.trim(), site = w.siteName?.trim();
  return { area, ...(client ? { client } : {}), ...(site ? { site } : {}) };
}

/** Is this line in that area — its site and area the same words (any case), and its client when the area names one. */
export function inArea(w: Pick<Workspace, 'clientName' | 'siteName' | 'areaName'>, a: AreaId): boolean {
  if (low(w.areaName) !== low(a.area) || low(w.siteName) !== low(a.site)) return false;
  return a.client === undefined || low(w.clientName) === low(a.client);
}

/** The area's name in words — "Hull › Packing hall", as the Lines tab heads it (lib/lines placeOf). */
export const areaTitle = (a: AreaId): string => placeOf({ siteName: a.site, areaName: a.area });

/** A key for an area, the same however its words are cased. */
export const areaKey = (a: AreaId): string => [a.client, a.site, a.area].map(low).join('|');

/** The lines in an area, in the order given (floor order where they come from lib/lines productionLines). */
export function linesInArea<T extends Pick<Workspace, 'clientName' | 'siteName' | 'areaName'>>(lines: readonly T[], a: AreaId): T[] {
  return lines.filter(w => inArea(w, a));
}

/** The areas the lines name, each with its lines, site then area in order; the lines with no area said, apart. `withClient`: one
 *  area a client (when the lines name more than one client, the same words for two clients are two areas). */
export function areasOf<T extends Pick<Workspace, 'clientName' | 'siteName' | 'areaName'>>(lines: readonly T[], withClient = false): { areas: { id: AreaId; title: string; lines: T[] }[]; noArea: T[] } {
  const by = new Map<string, { id: AreaId; title: string; lines: T[] }>();
  const noArea: T[] = [];
  for (const w of lines) {
    const a0 = areaOf(w);
    if (!a0) { noArea.push(w); continue; }
    const id: AreaId = withClient ? a0 : { area: a0.area, ...(a0.site ? { site: a0.site } : {}) };
    const k = areaKey(id);
    const g = by.get(k);
    if (g) g.lines.push(w); else by.set(k, { id, title: areaTitle(id), lines: [w] });
  }
  const areas = [...by.values()].sort((x, y) => x.title.localeCompare(y.title) || (x.id.client ?? '').localeCompare(y.id.client ?? ''));
  return { areas, noArea };
}

/** The area's address — `/area?site=…&area=…` (`&client=` when it names one), its report `/area/report?…`. */
export function areaHref(a: AreaId, report = false): string {
  const q = new URLSearchParams();
  if (a.client) q.set('client', a.client);
  if (a.site) q.set('site', a.site);
  q.set('area', a.area);
  return `/area${report ? '/report' : ''}?${q.toString()}`;
}

/** The area an address asks for, or none when it names no area. */
export function areaFromQuery(q: URLSearchParams): AreaId | undefined {
  const area = q.get('area')?.trim();
  if (!area) return undefined;
  const client = q.get('client')?.trim(), site = q.get('site')?.trim();
  return { area, ...(client ? { client } : {}), ...(site ? { site } : {}) };
}

/** What one line of the area holds, as its own readers count it. */
export interface AreaLineFacts {
  name: string;
  /** lib/lineWork lineProblems — open, late, critical; the worst its first row. */
  open: number; late: number; critical: number;
  worst?: { what: string; red: boolean };
  /** lib/lineRecords lineKit — its programs, proved, past their test day. */
  programs: number; proved: number; programsLate: number;
  /** The live projects on it, by name. */
  projects: readonly string[];
  /** Its tool records touched in the last four weeks (src/line/report/lineBundle itemsOn). */
  toolsLately: number;
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** THE AREA IN A SENTENCE — "3 lines · 4 problems open, 1 late — the worst: Film breaks on Line 7 · 2 programs to prove · 1 project
 *  running · 5 tool records in the last four weeks". Every count the sum of its lines'; the worst the first red line's worst, else the
 *  first line's. The tone: red when anything is late or critical, amber when anything is open, green when nothing is. */
export function areaSays(rows: readonly AreaLineFacts[]): { text: string; tone: LeanTone } {
  if (!rows.length) return { text: 'No line in this area', tone: 'n' };
  const sum = (f: (r: AreaLineFacts) => number) => rows.reduce((n, r) => n + f(r), 0);
  const open = sum(r => r.open), late = sum(r => r.late), critical = sum(r => r.critical);
  const toProve = sum(r => r.programs - r.proved), progLate = sum(r => r.programsLate);
  const projects = new Set(rows.flatMap(r => r.projects)).size;
  const tools = sum(r => r.toolsLately);
  const worstLine = rows.find(r => r.worst?.red) ?? rows.find(r => r.worst);
  const red = [late ? `${late} late` : '', critical ? `${critical} critical` : ''].filter(Boolean).join(', ');
  const parts = [
    plural(rows.length, 'line'),
    open ? `${plural(open, 'problem')} open${red ? `, ${red}` : ''}${worstLine?.worst ? ` — the worst: ${worstLine.worst.what} on ${worstLine.name}` : ''}` : 'no problem open',
    toProve ? `${plural(toProve, 'program')} to prove${progLate ? `, ${progLate} past ${progLate === 1 ? 'its' : 'their'} test day` : ''}` : '',
    projects ? `${plural(projects, 'project')} running` : 'no project on its lines',
    tools ? `${plural(tools, 'tool record')} in the last four weeks` : 'no tool used in the last four weeks',
  ].filter(Boolean);
  const tone: LeanTone = late || critical || progLate ? 'r' : open || toProve ? 'a' : 'g';
  return { text: parts.join(' · '), tone };
}

/** THE AREA'S TILES — lines, problems open, programs proved, projects, tools lately; each the sum of its lines'. */
export function areaTiles(rows: readonly AreaLineFacts[]): LeanTile[] {
  const sum = (f: (r: AreaLineFacts) => number) => rows.reduce((n, r) => n + f(r), 0);
  const open = sum(r => r.open), late = sum(r => r.late), critical = sum(r => r.critical);
  const programs = sum(r => r.programs), proved = sum(r => r.proved), progLate = sum(r => r.programsLate);
  const projects = new Set(rows.flatMap(r => r.projects)).size, tools = sum(r => r.toolsLately);
  const red = [late ? `${late} late` : '', critical ? `${critical} critical` : ''].filter(Boolean).join(' · ');
  return [
    { k: 'Lines', v: String(rows.length), of: rows.map(r => r.name).join(' · ') || 'no line in this area' },
    { k: 'Problems open', v: String(open), of: open ? (red || 'none late') : 'nothing open in the area', ...(red ? { tone: 'r' as LeanTone } : {}) },
    programs
      ? { k: 'Programs proved', v: String(proved), of: `of ${programs}${progLate ? ` · ${progLate} past ${progLate === 1 ? 'its' : 'their'} test day` : ''}`, ...(progLate ? { tone: 'r' as LeanTone } : {}) }
      : { k: 'Programs proved', v: '—', of: 'no program planned in the area' },
    { k: 'Projects', v: String(projects), of: projects ? 'running on its lines' : 'no project on its lines' },
    { k: 'Tools used', v: String(tools), of: tools ? 'records in the last four weeks' : 'none in the last four weeks' },
  ];
}
