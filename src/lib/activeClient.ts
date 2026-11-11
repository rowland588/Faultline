/* ONE ACTIVE CLIENT EVERYWHERE (11 November, docs/CONSULTANT-WORKSPACE.md C1 — Rowland: "I need to be able to move between these
 * businesses without losing context or mixing their information … Client information must remain properly separated").
 *
 * A client is still the words on each line (`Workspace.clientName`, K1) — no record, no migration. This module is the one source of
 * truth for WHICH client the app is showing: the choice is kept on this device under the key the Lines tab has kept since 8 November
 * (`faultline.client`, so a choice made there carries over), every page that lists records filters by it, and the top bar names it.
 *
 *   · With 0 or 1 client named on the lines nothing is filtered: the active client is that one (or none) and every page is as it was.
 *   · With 2 or more, the active client is the one chosen, or '' — All clients, the consultant's own view, where each row says whose it is.
 *
 * Which client a record is of:
 *   · a LINE's is the client its words name; a line naming none is nobody's — under a named client it is not shown (separation first),
 *     under All clients it is;
 *   · a PROJECT's are the clients of the factory lines it is on (usually one). A project on no line — or only on lines that name no
 *     client — names no client: when the lines name more than one client it shows under All clients only, since nothing says it is the
 *     active client's (with one client or none, nothing is filtered, so it shows as before);
 *   · a STUDY's or a PROBLEM's is its line's when its line names one, else its project's, else none (as a project on no line).
 *
 * Pure but for the device's storage and its listeners (the hook reads the lines and the projects' lines from the db). */
import { useEffect, useMemo, useState } from 'react';
import type { Workspace } from '../types';
import { clientsOf, productionLines } from './lines';
import type { JobLine } from './lineRecords';

export const CLIENT_KEY = 'faultline.client';

const listeners = new Set<() => void>();

/** The client chosen on this device — '' when none (All clients). */
export function storedClient(): string {
  try { return localStorage.getItem(CLIENT_KEY) ?? ''; } catch { return ''; }
}

/** Choose the client every page shows — '' for All clients. Kept on this device; every open page follows at once. */
export function setActiveClient(client: string): void {
  try { localStorage.setItem(CLIENT_KEY, client); } catch { /* private mode: this visit only */ }
  memo = client;
  for (const f of [...listeners]) f();
}

/* the choice this visit, for a private window where storage throws */
let memo: string | undefined;
const chosen = () => { const s = storedClient(); return s || (memo ?? ''); };

/** Told whenever the active client is changed (on this page, or in another tab of this device). */
export function onActiveClient(fn: () => void): () => void {
  listeners.add(fn);
  const storage = (e: StorageEvent) => { if (e.key === CLIENT_KEY) fn(); };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(fn); window.removeEventListener('storage', storage); };
}

/** The client a line is of — its words, trimmed; '' when it names none. */
export const clientOfLine = (w: Pick<Workspace, 'clientName'> | undefined): string => w?.clientName?.trim() ?? '';

/** The active client among the clients named: none or the one when there are 0 or 1; the one chosen when it is still named; else ''. */
export function activeClientOf(clients: readonly string[], stored: string): string {
  if (clients.length <= 1) return clients[0] ?? '';
  return clients.includes(stored) ? stored : '';
}

/** A record as the filters read it — where it sits. */
export interface Placed { workspaceId?: string | null; projectId?: string | null }

/** THE ACTIVE CLIENT, AND WHAT IS ITS — built from the lines and the projects' lines; every list asks it. */
export interface ClientScope {
  /** The clients the lines name, in order. */
  clients: string[];
  /** The active client: the one shown ('' = All clients, or no client named). */
  client: string;
  /** More than one client is named — the top bar offers the choice and All clients names whose each row is. */
  several: boolean;
  /** One client is shown out of several — the lists are filtered. */
  filtering: boolean;
  /** Several clients and none chosen — every row says whose it is. */
  all: boolean;
  /** A line's client ('' when it names none). */
  lineClient: (id?: string | null) => string;
  /** A project's clients — those of its factory lines (none on no line). */
  projectClients: (id?: string | null) => string[];
  /** A record's client in words — its line's, else its project's ('' when neither says). */
  whose: (r: Placed) => string;
  /** Shown under the active client? */
  line: (id?: string | null) => boolean;
  project: (id?: string | null) => boolean;
  record: (r: Placed) => boolean;
  /** Of a named client, whichever is active — the Story is always one client's (lib/storyPick). */
  projectOf: (id: string | null | undefined, client: string) => boolean;
  recordOf: (r: Placed, client: string) => boolean;
}

/** The scope, from every line (archived and a project's walk among them — a record keeps its line's client) and the projects' lines. */
export function clientScope(lines: readonly Workspace[], jobLines: readonly JobLine[], stored: string): ClientScope {
  const clients = clientsOf(productionLines(lines));
  const client = activeClientOf(clients, stored);
  const several = clients.length > 1;
  const filtering = several && !!client;
  const byLine = new Map(lines.map(w => [w.id, clientOfLine(w)]));
  const byProject = new Map<string, string[]>();
  for (const l of jobLines) {
    if (l.deletedAt || !l.projectId || !l.workspaceId) continue;
    const c = byLine.get(l.workspaceId);
    if (!c) continue;
    const got = byProject.get(l.projectId) ?? [];
    if (!got.includes(c)) byProject.set(l.projectId, [...got, c]);
  }
  const lineClient = (id?: string | null) => (id ? byLine.get(id) ?? '' : '');
  const projectClients = (id?: string | null) => (id ? byProject.get(id) ?? [] : []);
  const whoseAll = (r: Placed): string[] => { const l = lineClient(r.workspaceId); return l ? [l] : projectClients(r.projectId); };
  return {
    clients, client, several, filtering, all: several && !client,
    lineClient, projectClients,
    whose: r => whoseAll(r).join(', '),
    line: id => !filtering || lineClient(id) === client,
    project: id => !filtering || projectClients(id).includes(client),
    record: r => !filtering || whoseAll(r).includes(client),
    projectOf: (id, c) => !several || projectClients(id).includes(c),
    recordOf: (r, c) => !several || whoseAll(r).includes(c),
  };
}

/** The pure helpers by the names the slice asked for — each a thin reading of a scope. */
export const inClient = (s: ClientScope, lineId?: string | null): boolean => s.line(lineId);
export const projectInClient = (s: ClientScope, project: { id: string }): boolean => s.project(project.id);
export const studyInClient = (s: ClientScope, study: Placed): boolean => s.record(study);
export const snagInClient = (s: ClientScope, snag: Placed): boolean => s.record(snag);

/** A place in the app by its address (lib/recentPlaces) — a line's or a project's pages the active client's only. */
export function placeInClient(s: ClientScope, to: string): boolean {
  const m = /^\/(lines|project)\/([^/?]+)/.exec(to);
  if (!m) return true;
  let id = m[2];
  try { id = decodeURIComponent(id); } catch { /* as written */ }
  return m[1] === 'lines' ? s.line(id) : s.project(id);
}

/** The active client's name for a paper's band: the client, "All clients" when several and none chosen, '' when only one is named. */
export const clientBand = (s: ClientScope): string => (s.filtering ? s.client : s.all ? 'All clients' : '');

/** The active client read once, no hook — what Luna is told (colleague/turnRules): '' and several false when one or none is named. */
export async function activeClientNow(): Promise<{ client: string; several: boolean }> {
  const db = await import('../db');
  const clients = clientsOf(productionLines(await db.listWorkspaces()));
  return { client: activeClientOf(clients, chosen()), several: clients.length > 1 };
}

/* ---------------------------------------------------------------------------------------------------------------------------- */
/*  THE HOOK — read once per page, again on any write and on any change of the choice                                            */
/* ---------------------------------------------------------------------------------------------------------------------------- */

/** The client chosen on this device, followed live. */
export function useStoredClient(): string {
  const [c, setC] = useState(chosen);
  useEffect(() => onActiveClient(() => setC(chosen())), []);
  return c;
}

/** The scope as the lists read it; `ready` once the lines are read (a list waits for it rather than flash another client's rows). */
export function useClientScope(): ClientScope & { ready: boolean } {
  const stored = useStoredClient();
  const [got, setGot] = useState<{ lines: Workspace[]; jobLines: JobLine[] } | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void (async () => {
      const db = await import('../db');
      const [lines, jobLines] = await Promise.all([db.listWorkspaces(), db.allPaceLines()]);
      if (live) setGot({ lines, jobLines });
    })();
    load();
    let off = () => {};
    void import('../db').then(db => { if (live) off = db.onDataChange(load); });
    return () => { live = false; off(); };
  }, []);
  return useMemo(() => ({ ...clientScope(got?.lines ?? [], got?.jobLines ?? [], stored), ready: !!got }), [got, stored]);
}
