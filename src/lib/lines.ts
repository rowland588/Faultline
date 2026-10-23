/* THE PRODUCTION LINES — the lines a person works on, each its own page
 * (screens/ProductionLineScreen), in the control room's list and on its rail.
 *
 * Rowland, 12 October: "I want to just be able to open a production line and
 * use these tools inside the production line ... I need a record of
 * production lines ... and I also should be able to make the production
 * lines inside the problem sheet." A line is the record every problem and
 * every tool already hangs off (a Workspace — snags.workspace_id, a
 * standard's or a study's workspaceId); this names the list of them once,
 * so the control room, the rail and the line's page never disagree on it.
 * The demo line is a showcase, not a line anybody works on. */
import type { Workspace } from '../types';
import { allPaceLines, projectWalkIds, putPaceLine } from '../db/pace';
import { createWorkspace, listWorkspaces, updateWorkspace } from '../db/workspaces';
import { listAllAssets, listAssets, putAsset } from '../db/testing';
import { machineKey, machinesOnLine } from './lineRecords';
import { listPrograms, putProgram } from '../db/programs';
import { perHourWords } from './lineLoss';

export const DEMO_NAME = 'Demo — Packing Hall';
/** A demo line — the packing hall and the demo factory's other lines
 *  (lib/demoFactory): shown on their own, never counted as the factory's work. */
export const isDemo = (name: string): boolean => name.startsWith('Demo — ');

/** FLOOR ORDER — where each line sits in the factory (Rowland, 13 October:
 *  "build your factory, edit your factory"), the order lines are listed in
 *  everywhere. A line never placed sorts after the placed ones, by name. */
export function byFloor(a: Workspace, b: Workspace): number {
  const fa = a.floorOrder ?? Number.MAX_SAFE_INTEGER, fb = b.floorOrder ?? Number.MAX_SAFE_INTEGER;
  return fa - fb || a.name.localeCompare(b.name, undefined, { numeric: true });
}

/** Every line worked on: the demo aside, the archived aside, in floor order. */
export function productionLines(ws: readonly Workspace[]): Workspace[] {
  return ws.filter(w => !isDemo(w.name) && !w.archived).sort(byFloor);
}

/** THE TYPES OF LINE offered — the factory's own first, as it has named them,
 *  then the usual ones it has not used. Free words: a type is what the
 *  factory calls it, never a list it has to fit. */
export const USUAL_LINE_TYPES = ['Packing', 'Processing', 'Filling', 'Palletising', 'Assembly'] as const;
export function lineTypesOffered(lines: readonly Workspace[]): string[] {
  const own = [...new Set(lines.map(w => w.lineType?.trim()).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b));
  const low = new Set(own.map(t => t.toLowerCase()));
  return [...own, ...USUAL_LINE_TYPES.filter(t => !low.has(t.toLowerCase()))];
}

/** The factory in a few words — "6 lines · 3 Packing · 2 Processing · 1 not
 *  typed yet". Counts are the work, so they stay neutral. */
export function factorySays(lines: readonly Workspace[]): string {
  if (!lines.length) return 'No lines yet';
  const by = new Map<string, number>();
  let untyped = 0;
  for (const w of lines) {
    const t = w.lineType?.trim();
    if (t) by.set(t, (by.get(t) ?? 0) + 1); else untyped++;
  }
  const parts = [...by.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, n]) => `${n} ${t}`);
  if (untyped && by.size) parts.push(`${untyped} not typed yet`);
  return [`${lines.length} line${lines.length === 1 ? '' : 's'}`, ...parts].join(' · ');
}

/** A line moved to a new place on the floor: every line numbered again in the
 *  order shown, so the order is the same on every device (each line carries
 *  its own number, synced like any other field). Returns only the lines whose
 *  number changed — the ones to write. */
export function placeOnFloor(lines: readonly Workspace[], id: string, to: number): Workspace[] {
  const order = [...lines].sort(byFloor);
  const from = order.findIndex(w => w.id === id);
  if (from < 0) return [];
  const [moved] = order.splice(from, 1);
  order.splice(Math.max(0, Math.min(order.length, to)), 0, moved);
  return numbered(order);
}

/** Every line given its number in the order shown — the ones whose number
 *  changed. Called before a line is added at the end, so lines never placed
 *  (made before the factory) keep the place they were shown in. */
export function numbered(order: readonly Workspace[]): Workspace[] {
  return order.map((w, i) => ({ w, i })).filter(({ w, i }) => w.floorOrder !== i).map(({ w, i }) => ({ ...w, floorOrder: i }));
}

/** The next line's name, guessed from the last: "Line 7" after "Line 6".
 *  Only a guess, shown in the box to be typed over. */
export function nextLineName(lines: readonly Workspace[]): string {
  const sorted = [...lines].sort(byFloor);
  const last = sorted[sorted.length - 1]?.name ?? '';
  const m = /^(.*?)(\d+)([A-Za-z]?)$/.exec(last.trim());
  if (!m) return 'Line 1';
  if (m[3] && !/[zZ]/.test(m[3])) return `${m[1]}${m[2]}${String.fromCharCode(m[3].charCodeAt(0) + 1)}`;
  return `${m[1]}${Number(m[2]) + 1}`;
}

/** The lines of the factory: every line, less a project's own walk (the
 *  project's, never a line — db/pace projectWalkIds). A LINE NEVER LEAVES THE
 *  FACTORY BECAUSE A PROJECT DID (Rowland, 13 October: "archive is causing
 *  issues ... this all needs sorting once and for all"): Line 2B is a line
 *  of the factory whether the job that first named it is live, archived or
 *  gone — only the line's own Archive takes it off the floor. The job, once
 *  archived, is simply nobody's context (db/pace chainForWorkspace). */
export async function liveProductionLines(ws: readonly Workspace[]): Promise<Workspace[]> {
  const walks = await projectWalkIds();
  return productionLines(ws).filter(w => !walks.has(w.id));
}

/** A LINE ADDED TO THE FACTORY — at the end of the floor, with its type; the
 *  lines before it numbered first, so one made before the factory keeps the
 *  place it was shown in. The one way a line is put on the floor: Your
 *  factory's Add lines, a project's new line, a project's line first used. */
export async function addLineToFactory(name: string, lineType?: string, taxonomyId?: string): Promise<Workspace> {
  const order = await liveProductionLines(await listWorkspaces());
  for (const x of numbered(order)) await updateWorkspace(x);
  const w = await createWorkspace(name, taxonomyId);
  const placed = { ...w, lineType: lineType?.trim() || undefined, floorOrder: order.length };
  await updateWorkspace(placed);
  /* A PROJECT'S LINE OF THE SAME NAME, MADE BEFORE IT, JOINS IT (Rowland, 23 October: "i had programs in there
     today on line 2a now nothing" — his project's "Line 2A" was made before the factory's "Line 2a" and the two
     were never joined, so its programs and machines read on no line; supabase/LINK_PROJECT_LINES.sql joined it) */
  const same = (x: string) => x.trim().replace(/\s+/g, ' ').toLowerCase();
  for (const l of await allPaceLines()) if (!l.workspaceId && l.name && same(l.name) === same(name)) await putPaceLine({ ...l, workspaceId: placed.id });
  return placed;
}

/** A project's short name for a factory line — "2A" for "Line 2A" — the key
 *  its numbers are kept under; typed over in Lines & people when wanted. */
/** A PROJECT'S MACHINES AND PROGRAMS PINNED TO THEIR LINE (23 October — the
 *  combined line report reads everything carrying the line's name). A
 *  project's machine or program made with no line of its own stands on the
 *  project's only factory line (lib/lineRecords lineOfMachine, lineOfProgram)
 *  — until the project gets a second line, or loses that one, when it would
 *  stand on none and drop out of its line's pages and papers. So before a
 *  project's lines change, each one is given the line it stood on. Nothing
 *  else moves; a project with several lines already, or none, is left. */
export async function pinToProjectLine(projectId: string, lines: readonly { workspaceId?: string; deletedAt?: number }[]): Promise<number> {
  const on = [...new Set(lines.filter(l => !l.deletedAt && l.workspaceId).map(l => l.workspaceId as string))];
  if (on.length !== 1 || !projectId) return 0;
  let n = 0;
  for (const a of await listAssets(projectId)) if (!a.workspaceId) { await putAsset({ ...a, workspaceId: on[0] }); n++; }
  for (const p of await listPrograms(projectId)) if (!p.workspaceId && !p.lineId) { await putProgram({ ...p, workspaceId: on[0] }); n++; }
  return n;
}

/** A DUAL LINE AND ITS LINES (supabase/DUAL_LINES.sql — Rowland, 23 October:
 *  "2a 2b are 2 lines but they happen to be a dual line"). For one line: the
 *  live lines it is made of, and the live dual lines it is part of — each in
 *  floor order. Archived or gone lines are left out; a line never names itself. */
export function dualOf(line: Pick<Workspace, 'id' | 'madeOf'>, lines: readonly Workspace[]): { madeOf: Workspace[]; partOf: Workspace[] } {
  const live = lines.filter(w => !w.archived && w.id !== line.id).slice().sort(byFloor);
  return {
    madeOf: live.filter(w => (line.madeOf ?? []).includes(w.id)),
    partOf: live.filter(w => (w.madeOf ?? []).includes(line.id)),
  };
}
/** "Line 2a + line 2b" — a dual line's lines in words. */
export const linesSaid = (lines: readonly Pick<Workspace, 'name'>[]): string => lines.map(w => w.name).join(' + ');
/** What a line says of its dual lines, in one phrase, or nothing: "made of
 *  Line 2a + line 2b", "part of 2a 2b". */
export function dualSaid(d: { madeOf: readonly Pick<Workspace, 'name'>[]; partOf: readonly Pick<Workspace, 'name'>[] }): string {
  return [d.madeOf.length ? `made of ${linesSaid(d.madeOf)}` : '', d.partOf.length ? `part of ${d.partOf.map(w => w.name).join(' and ')}` : ''].filter(Boolean).join(' · ');
}

/** EVERY MACHINE IS ON A LINE (Rowland, 23 October: "Can't have a machine
 *  without a line ... Everything needs to be under a line"). A machine named on
 *  a tool, a problem or a walk, not yet on its line's list, joins the list — so
 *  every tool's Machine box offers it from then on, under one name. Nothing
 *  happens for a name already there (however it is cased), or no line. */
export async function machineOntoLine(wsId: string | undefined, name: string | undefined): Promise<boolean> {
  const n = (name ?? '').trim();
  if (!wsId || !n) return false;
  const [ws, assets, jobLines] = await Promise.all([listWorkspaces(), listAllAssets(), allPaceLines()]);
  const w = ws.find(x => x.id === wsId);
  /* already on the line — its own list, or a machine a project brought onto it (lib/lineRecords machinesOnLine) */
  if (!w || machinesOnLine(w, assets, jobLines).some(m => machineKey(m.name) === machineKey(n))) return false;
  await updateWorkspace({ ...w, assets: [...(w.assets ?? []), n] });
  return true;
}

export function lineKey(name: string): string {
  const k = name.trim().replace(/^line\s+/i, '').trim();
  return (k || name.trim()).slice(0, 12);
}

/** THE FACTORY'S LINE FOR A PROJECT'S LINE (13 October: "assign everything
 *  to a production line") — the line of that name already in the factory,
 *  never a second of the same name; added to the factory when it is not
 *  there yet. A project's line made before the factory finds its line this
 *  way the first time it is used. */
export async function factoryLineFor(name: string, taxonomyId?: string): Promise<Workspace> {
  const want = name.trim().toLowerCase();
  const found = (await liveProductionLines(await listWorkspaces())).find(w => w.name.trim().toLowerCase() === want);
  return found ?? addLineToFactory(name, undefined, taxonomyId);
}

/** What the address asks for — `?line=<id>` (a list opened from a line's own
 *  page, on that line), `?open=<id>` (one record opened in it) or `?add=1`
 *  (Your factory opened on its Add lines; a tool's list opened on its New —
 *  from a method's step done with that tool). Read once,
 *  when the screen opens; the router keys the screen on the line. */
export function asked(key: 'line' | 'open' | 'add' | 'project'): string | undefined {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '').get(key) ?? undefined;
}

/** A LINE'S FACTS, IN WORDS (BLUEPRINT Stage 1 — "the factory holds the line's
 *  facts"): its shifts with their breaks, its crew, what it costs while it is
 *  down, its machines in flow order. Each is absent when nobody has said it,
 *  and the page says so rather than inventing one. */
export function lineFacts(w: Workspace): { shifts?: string; crew?: string; cost?: string; machines?: string; short?: string } {
  const shifts = (w.shifts ?? []).filter(s => s.name?.trim());
  const shiftWords = shifts.map(s => `${s.name} ${s.start}–${s.end}${s.relief ? ' (relief covers the breaks)' : s.breakMin ? ` (${s.breakMin} min breaks)` : ''}`).join(' · ');
  const crew = w.crew ? `${w.crew} ${w.crew === 1 ? 'person' : 'people'}` : undefined;
  /* what its lost time costs, in its two parts — never one £ (lib/lineLoss) */
  const cost = perHourWords(w) || undefined;
  const machines = (w.assets ?? []).filter(a => a.trim() && a.trim().toLowerCase() !== 'whole line');
  const short = [shifts.length ? `${shifts.length} shift${shifts.length === 1 ? '' : 's'}` : '', crew ?? ''].filter(Boolean).join(' · ');
  return {
    ...(shiftWords ? { shifts: shiftWords } : {}),
    ...(crew ? { crew } : {}),
    ...(cost ? { cost } : {}),
    ...(machines.length ? { machines: machines.join(' → ') } : {}),
    ...(short ? { short } : {}),
  };
}
