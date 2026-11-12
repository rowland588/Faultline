/* A VISIT — a day at a customer (11 November, docs/CONSULTANT-WORKSPACE.md C3 — Rowland: "I receive a phone call: 'Can you come to our
 * factory tomorrow …' … I need to be able to start working immediately … Client information must remain properly separated").
 *
 * NO NEW NOUN, NO MIGRATION. A visit is a customer + a day (+ a site) + who + the brief said at the door + when it ended — kept on the
 * customer's STORY record (`facts.visits`, a list of id-keyed entries: the sync merges it by id one level down, as it merges the chapters,
 * so a visit started on the phone and one ended on the laptop both stand). The engagement is the Story (one open per customer; a closed one
 * kept): a visit goes on the open one, else the newest, else a story is started for the customer with its brief empty.
 *
 * WHAT WAS CAPTURED ON A VISIT IS READ, NEVER COPIED (visitRecords): every problem, study, timed stop, photo and Line Talk whose line is the
 * customer's and whose time falls in the visit's hours — from its start to its end, or to the end of its day while it is in hand. A walk
 * photo is the visit's when it was taken in those hours and either was taken with the visit in hand (its turn says so) or its stamped place
 * is one of the customer's lines or departments. Another customer's records are never read: the lines decide.
 *
 * CAPTURE WITH NO LINE: a problem must sit on a line (Snag.workspaceId), and a department is a study, not a line — so a customer with no
 * line yet gets a HOLDING PLACE on the first capture: a line named "<customer> — not yet placed" of the type "Not yet placed", made the
 * way every line is made (lib/lines addLineToFactory, the customer's words on it). What is captured there is placed on the right line later
 * with a tap (the problem's line changed through patchSnag — the problem editor's own path).
 *
 * The visit in hand is kept on this device (`faultline.visit`) as well as on the record — the top bar and the ＋ Problem sheet read it. */
import type { Observation, Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { StoryVisit, ToolStudy } from './study';
import type { Department } from './departments';
import type { WalkTurn } from './walk';
import { customerKey } from './customers';

export type { StoryVisit };
const DAY = 86_400_000;

/** A visit as read: its entry, the story it is kept on and the customer's name. */
export interface Visit extends StoryVisit { storyId: string; client: string }

/** The day of an instant on this device's calendar — YYYY-MM-DD. */
export function dayOf(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** "11 Nov" — how a visit is named on the bar and its rows. */
export const visitDay = (v: Pick<StoryVisit, 'startedAt'>): string => new Date(v.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const visitDayLong = (v: Pick<StoryVisit, 'startedAt'>): string => new Date(v.startedAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
/** "Business B · Visit 11 Nov" */
export const visitName = (v: Visit): string => `${v.client} · Visit ${visitDay(v)}`;

/** Every visit on the stories, newest first; `client` narrows it to one customer's (any case). */
export function visitsOf(studies: readonly ToolStudy[], client?: string): Visit[] {
  const out: Visit[] = [];
  for (const s of studies) {
    if (s.tool !== 'story' || s.deletedAt) continue;
    const c = s.agreed?.story?.client?.trim() ?? '';
    if (!c || (client !== undefined && customerKey(c) !== customerKey(client))) continue;
    for (const v of s.facts?.visits ?? []) if (v && typeof v.id === 'string' && typeof v.startedAt === 'number') out.push({ ...v, storyId: s.id, client: c });
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}

/** The visit's hours: from its start to its end — or, while it is in hand, to the end of the day it started. */
export function visitWindow(v: Pick<StoryVisit, 'startedAt' | 'endedAt'>): { from: number; to: number } {
  if (v.endedAt != null) return { from: v.startedAt, to: Math.max(v.startedAt, v.endedAt) };
  const d = new Date(v.startedAt); d.setHours(0, 0, 0, 0);
  return { from: v.startedAt, to: d.getTime() + DAY - 1 };
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/*  THE HOLDING PLACE — capture with no line                                                                                  */
/* ------------------------------------------------------------------------------------------------------------------------ */

/** The type a holding place carries — said on its card, and how it is told from a line of the floor. */
export const HOLDING_TYPE = 'Not yet placed';
export const holdingName = (client: string): string => `${client.trim()} — not yet placed`;
/** Is this line a customer's holding place (capture before its lines are known)? */
export const isHolding = (w: Pick<Workspace, 'lineType'> | undefined): boolean => (w?.lineType ?? '').trim().toLowerCase() === HOLDING_TYPE.toLowerCase();
/** The customer's holding place among the lines, if it has one (not archived). */
export function holdingOf(lines: readonly Workspace[], client: string): Workspace | undefined {
  return lines.find(w => !w.archived && isHolding(w) && customerKey(w.clientName) === customerKey(client));
}
/** The customer's lines of the floor — not the holding place, not archived. */
export function placesFor(lines: readonly Workspace[], client: string): Workspace[] {
  return lines.filter(w => !w.archived && !isHolding(w) && customerKey(w.clientName) === customerKey(client));
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/*  WHAT WAS CAPTURED ON A VISIT — read, never copied                                                                         */
/* ------------------------------------------------------------------------------------------------------------------------ */

export interface VisitPhoto {
  /** The blob key — the photograph itself, never a copy. */
  key: string;
  at: number;
  caption: string;
  /** Where it was taken from: a problem's pictures, a walk with Luna, a Line Talk. */
  from: 'problem' | 'walk' | 'talk';
  /** The record it sits on: the problem's or the conversation's id. */
  refId: string;
}
export interface VisitFound {
  /** The customer's lines (the holding place among them, if made). */
  lines: Workspace[];
  problems: Snag[];
  photos: VisitPhoto[];
  /** Tool records started in the hours — studies, logs, calculators, documents (not a talk, the story or a department). */
  studies: ToolStudy[];
  /** Line Talks started in the hours. */
  talks: ToolStudy[];
  /** Stops timed in the hours, on the customer's lines. */
  stops: Observation[];
}
export interface VisitInputs {
  lines: readonly Workspace[];
  snags: readonly Snag[];
  studies: readonly ToolStudy[];
  /** The timed stops of the customer's lines (db listObservations a line); others' are ignored by their line. */
  stops?: readonly Observation[];
  departments?: readonly Department[];
}

const isColleague = (s: ToolStudy) => s.tool === 'talk' && !!(s.facts as { colleague?: boolean }).colleague;
const NOT_A_TOOL = new Set(['story', 'department', 'talk']);

/** EVERYTHING CAPTURED ON THE VISIT — one customer's lines, its hours. Pure. */
export function visitRecords(v: Pick<Visit, 'id' | 'client' | 'startedAt' | 'endedAt'>, i: VisitInputs): VisitFound {
  const { from, to } = visitWindow(v);
  const inHours = (t: number | undefined) => typeof t === 'number' && t >= from && t <= to;
  const ck = customerKey(v.client);
  const lines = i.lines.filter(w => ck && customerKey(w.clientName) === ck);
  const ids = new Set(lines.map(w => w.id));
  const depts = new Set((i.departments ?? []).filter(d => customerKey(d.facts.client) === ck).map(d => d.id));
  const problems = i.snags.filter(s => !s.deletedAt && ids.has(s.workspaceId) && inHours(s.raisedAt)).sort((a, b) => a.raisedAt - b.raisedAt);
  const live = i.studies.filter(s => !s.deletedAt && !!s.workspaceId && ids.has(s.workspaceId) && inHours(s.createdAt ?? s.startedAt));
  const studies = live.filter(s => !NOT_A_TOOL.has(s.tool)).sort((a, b) => a.createdAt - b.createdAt);
  const talks = live.filter(s => s.tool === 'talk' && !isColleague(s)).sort((a, b) => a.createdAt - b.createdAt);
  const stops = (i.stops ?? []).filter(o => !o.deletedAt && ids.has(o.workspaceId) && inHours(o.startedAt)).sort((a, b) => a.startedAt - b.startedAt);

  const photos: VisitPhoto[] = [];
  const seen = new Set<string>();
  const add = (p: VisitPhoto) => { if (!seen.has(p.key)) { seen.add(p.key); photos.push(p); } };
  for (const s of problems) for (const m of s.media ?? []) if (m.kind === 'photo' && m.blobKey) add({ key: m.blobKey, at: m.capturedAt ?? s.raisedAt, caption: s.problem, from: 'problem', refId: s.id });
  /* a walk with Luna: taken in the hours, with the visit in hand or at one of the customer's places — never by the time alone */
  for (const c of i.studies) {
    if (c.deletedAt || c.tool !== 'talk') continue;
    const colleague = isColleague(c);
    if (!colleague && !(c.workspaceId && ids.has(c.workspaceId))) continue;
    for (const t of (c.facts?.turns ?? []) as WalkTurn[]) {
      if (t.kind !== 'photo' || !t.media?.blobKey || t.struck || !inHours(t.at)) continue;
      const here = t.visitId === v.id || (!!t.where?.lineId && ids.has(t.where.lineId)) || (!!t.where?.departmentId && depts.has(t.where.departmentId));
      if (colleague && !here) continue;
      add({ key: t.media.blobKey, at: t.at, caption: t.text?.trim() || (t.where ? `Taken at ${[t.where.site, t.where.area, t.where.line, t.where.machine].filter(Boolean).join(' › ')}` : 'A photo on the walk'), from: colleague ? 'walk' : 'talk', refId: c.id });
    }
  }
  photos.sort((a, b) => a.at - b.at);
  return { lines, problems, photos, studies, talks, stops };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** What the visit found, in a line — "3 problems · 2 photos · 1 study · 4 stops timed". */
export function visitSays(f: VisitFound): string {
  const bits = [
    f.problems.length ? plural(f.problems.length, 'problem') : '',
    f.photos.length ? plural(f.photos.length, 'photo') : '',
    f.studies.length ? plural(f.studies.length, 'study', 'studies') : '',
    f.stops.length ? `${plural(f.stops.length, 'stop')} timed` : '',
    f.talks.length ? plural(f.talks.length, 'Line Talk') : '',
  ].filter(Boolean);
  return bits.length ? bits.join(' · ') : 'Nothing captured yet';
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/*  THE CONSULTANT'S HOME — a row a customer                                                                                  */
/* ------------------------------------------------------------------------------------------------------------------------ */

export interface CustomerRow {
  name: string;
  site?: string;
  /** The engagement (its Story): under way, closed, or not started. */
  engagement: 'under way' | 'closed' | 'not started';
  lastVisit?: Visit;
  open: number;
  late: number;
  lines: number;
  /** Its state in words — "engagement under way · last visit 11 Nov · 4 open, 1 late". */
  says: string;
}

/** A row a customer in use (lib/customers), in name order — from its stories, its visits and the open problems on its lines. Pure. */
export function customerRows(customers: readonly { name: string; site?: string }[], i: { lines: readonly Workspace[]; studies: readonly ToolStudy[]; snags: readonly Snag[]; now?: number }): CustomerRow[] {
  const now = i.now ?? Date.now();
  const visits = visitsOf(i.studies);
  return customers.map(c => {
    const k = customerKey(c.name);
    const stories = i.studies.filter(s => s.tool === 'story' && !s.deletedAt && customerKey(s.agreed?.story?.client) === k);
    const engagement: CustomerRow['engagement'] = stories.some(s => !s.agreed?.story?.closedAt && (s.agreed?.story?.brief || (s.facts?.chapters?.length ?? 0) > 0 || (s.facts?.visits?.length ?? 0) > 0)) ? 'under way'
      : stories.some(s => s.agreed?.story?.closedAt) ? 'closed' : 'not started';
    const lineIds = new Set(i.lines.filter(w => customerKey(w.clientName) === k).map(w => w.id));
    const open = i.snags.filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed' && lineIds.has(s.workspaceId));
    const late = open.filter(s => s.dueAt != null && s.dueAt < now).length;
    const lastVisit = visits.find(v => customerKey(v.client) === k);
    const lines = placesFor(i.lines, c.name).length;
    const says = [
      engagement === 'not started' ? 'no engagement yet' : `engagement ${engagement}`,
      lastVisit ? (lastVisit.endedAt == null ? `visit in hand since ${new Date(lastVisit.startedAt).toTimeString().slice(0, 5)}` : `last visit ${visitDay(lastVisit)}`) : 'no visit yet',
      open.length ? `${open.length} open${late ? `, ${late} late` : ''}` : 'nothing open',
    ].join(' · ');
    return { name: c.name, ...(c.site ? { site: c.site } : {}), engagement, ...(lastVisit ? { lastVisit } : {}), open: open.length, late, lines, says };
  });
}

export interface OwedRow { id: string; what: string; client: string; who?: string; due?: number; late: boolean; line: string }
/** WHAT IS OWED ACROSS THE CUSTOMERS — the open problems with a person or a day on them, late first, then by day; the client named on each. */
export function owedAcross(customers: readonly { name: string }[], i: { lines: readonly Workspace[]; snags: readonly Snag[]; now?: number }): OwedRow[] {
  const now = i.now ?? Date.now();
  const names = new Map(customers.map(c => [customerKey(c.name), c.name]));
  const byLine = new Map(i.lines.map(w => [w.id, w]));
  const out: OwedRow[] = [];
  for (const s of i.snags) {
    if (s.deletedAt || s.archivedAt || s.status === 'closed' || (!s.owner && s.dueAt == null)) continue;
    const w = byLine.get(s.workspaceId);
    const client = names.get(customerKey(w?.clientName));
    if (!w || !client) continue;
    out.push({ id: s.id, what: s.problem, client, ...(s.owner ? { who: s.owner } : {}), ...(s.dueAt != null ? { due: s.dueAt } : {}), late: s.dueAt != null && s.dueAt < now, line: w.name });
  }
  return out.sort((a, b) => Number(b.late) - Number(a.late) || (a.due ?? Infinity) - (b.due ?? Infinity) || a.what.localeCompare(b.what));
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/*  THE VISIT IN HAND — on this device                                                                                        */
/* ------------------------------------------------------------------------------------------------------------------------ */

export const VISIT_KEY = 'faultline.visit';
export interface VisitHand { storyId: string; id: string }
const listeners = new Set<() => void>();
let memo: VisitHand | null | undefined;

export function storedVisit(): VisitHand | null {
  try {
    const raw = localStorage.getItem(VISIT_KEY);
    if (!raw) return memo ?? null;
    const v = JSON.parse(raw) as VisitHand;
    return v && typeof v.id === 'string' && typeof v.storyId === 'string' ? v : null;
  } catch { return memo ?? null; }
}
export function setVisitInHand(v: VisitHand | null): void {
  try { if (v) localStorage.setItem(VISIT_KEY, JSON.stringify(v)); else localStorage.removeItem(VISIT_KEY); } catch { /* private mode: this visit only */ }
  memo = v;
  for (const f of [...listeners]) f();
}
export function onVisitInHand(fn: () => void): () => void {
  listeners.add(fn);
  const storage = (e: StorageEvent) => { if (e.key === VISIT_KEY) fn(); };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(fn); window.removeEventListener('storage', storage); };
}
/** The visit in hand among the visits — the one this device holds, still not ended. */
export function visitInHand(visits: readonly Visit[], hand: VisitHand | null): Visit | undefined {
  if (!hand) return undefined;
  const v = visits.find(x => x.id === hand.id && x.storyId === hand.storyId);
  return v && v.endedAt == null ? v : undefined;
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/*  WRITES — through the db's own functions                                                                                   */
/* ------------------------------------------------------------------------------------------------------------------------ */

const db = () => import('../db');
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
const clean = (s: string | undefined, max: number) => (s ?? '').trim().replace(/\s+/g, ' ').slice(0, max) || undefined;

export interface StartVisit { client: string; site?: string; brief?: string; by?: string }
export type Started = { ok: true; visit: Visit; created: boolean; continued: boolean; ended?: Visit } | { ok: false; why: string };

/** START A VISIT — the customer by name (added when new, continued when archived), made the active client; the visit kept on its Story
 *  and in hand on this device. A visit already in hand on this device is ended first (said in `ended`). */
export async function startVisit(input: StartVisit): Promise<Started> {
  const { customerName, customersOf, addCustomer, continueCustomer, anchorFor } = await import('./customers');
  const n = customerName(input.client);
  if (!n.ok) return n;
  const d = await db();
  const [lines, studies0] = await Promise.all([d.listWorkspaces(), d.listAllStudies()]);
  const had = customersOf(lines, studies0).find(c => customerKey(c.name) === customerKey(n.name));
  const site = clean(input.site, 80) ?? had?.site;
  let created = false, continued = false;
  if (!had) { const r = await addCustomer(n.name, site ?? ''); if (!r.ok) return r; created = true; }
  else if (had.archived) { await continueCustomer(had.name); continued = true; }
  const client = had?.name ?? n.name;
  /* the engagement: the open story, else the newest, else one started */
  const { storyOfClient } = await import('./storyPick');
  let story = storyOfClient((await d.listAllStudies()).filter(s => !s.deletedAt), client);
  if (!story) { const id = await anchorFor(client, site); story = await d.getStudy(id); }
  if (!story) return { ok: false, why: `Could not keep the visit on ${client}’s story.` };
  /* the visit already in hand ends first */
  const before = visitInHand(visitsOf(await d.listAllStudies()), storedVisit());
  if (before) await endVisit(before);
  const t = Date.now();
  const entry: StoryVisit = { id: uid(), day: dayOf(t), startedAt: t, ...(site ? { site } : {}), ...(clean(input.by, 80) ? { by: clean(input.by, 80) } : {}), ...(clean(input.brief, 600) ? { brief: clean(input.brief, 600) } : {}) };
  await d.patchStudy(story.id, cur => ({ facts: { ...cur.facts, visits: [...(cur.facts?.visits ?? []), entry] } }));
  (await import('./activeClient')).setActiveClient(client);
  setVisitInHand({ storyId: story.id, id: entry.id });
  return { ok: true, visit: { ...entry, storyId: story.id, client }, created, continued, ...(before ? { ended: before } : {}) };
}

/** A visit's entry changed where it is kept — ended, its recommendation typed. */
async function patchVisit(v: Pick<Visit, 'id' | 'storyId'>, change: (cur: StoryVisit) => StoryVisit): Promise<void> {
  await (await db()).patchStudy(v.storyId, cur => ({ facts: { ...cur.facts, visits: (cur.facts?.visits ?? []).map(x => (x.id === v.id ? change(x) : x)) } }));
}

/** END THE VISIT — its end stamped; it leaves this device's hand. */
export async function endVisit(v: Pick<Visit, 'id' | 'storyId'>): Promise<void> {
  const t = Date.now();
  await patchVisit(v, cur => (cur.endedAt != null ? cur : { ...cur, endedAt: t }));
  const h = storedVisit();
  if (h && h.id === v.id) setVisitInHand(null);
}

/** What we recommend next — typed on the visit's page. */
export async function setRecommend(v: Pick<Visit, 'id' | 'storyId'>, text: string): Promise<void> {
  const r = text.trim().slice(0, 2000);
  await patchVisit(v, cur => { const { recommend: _was, ...rest } = cur; return r ? { ...rest, recommend: r } : rest; });
}

/** The what-if's inputs — typed on the visit's page; a box cleared is the input taken off. */
export async function setWhatIf(v: Pick<Visit, 'id' | 'storyId'>, change: { watchedMin?: number | null; hoursPerWeek?: number | null; weeks?: number | null }): Promise<void> {
  await patchVisit(v, cur => {
    const next: Record<string, number> = { ...(cur.whatIf ?? {}) };
    for (const [k, x] of Object.entries(change)) { if (x == null || !Number.isFinite(x) || x <= 0) delete next[k]; else next[k] = x; }
    const { whatIf: _was, ...rest } = cur; void _was;
    return Object.keys(next).length ? { ...rest, whatIf: next } : rest;
  });
}

/** The customer's holding place — found, or made the way every line is made, its customer's words on it. */
export async function ensureHoldingLine(client: string, site?: string): Promise<Workspace> {
  const d = await db();
  const had = holdingOf(await d.listWorkspaces(), client);
  if (had) return had;
  const { addLineToFactory } = await import('./lines');
  const w = await addLineToFactory(holdingName(client), HOLDING_TYPE);
  const placed = { ...w, clientName: client.trim(), ...(site?.trim() ? { siteName: site.trim() } : {}) };
  await d.updateWorkspace(placed);
  return placed;
}

/** PLACE ON A LINE — a problem captured at the holding place moved onto the line it belongs to (the editor's own path, patchSnag). */
export async function placeProblem(snagId: string, lineId: string): Promise<void> {
  await (await db()).patchSnag(snagId, { workspaceId: lineId });
}
