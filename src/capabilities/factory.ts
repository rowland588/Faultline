/* THE FACTORY KNOWLEDGE CAPABILITIES — reads, run at once (8 November, docs/FACTORY-KNOWLEDGE.md F2).
 *
 *   factory_map — the client's sites › areas › lines › machines, each machine with its kind, model and serial and how each is
 *     known (lib/factoryKnowledge factoryMap, over the lines and the machine records the pages read);
 *   resolve — words the person said ("the scales", "the mixer", "line two", "packaging") turned into what they name: one,
 *     several or none (lib/factoryKnowledge resolveWords), the conversation's line or project narrowing first.
 *
 * NEVER ANOTHER CLIENT'S. With a line or a project in hand, only the client of that line (of the project's lines) — a line
 * that names no client goes only with the others that name none; a client named that is not the line's is refused. With
 * nothing in hand, the clients of the lines this person can see (the device holds only those — RLS by line membership),
 * each its own group. */
import { allPaceLines, getProject, getWorkspace, listAllAssets, listWorkspaces } from '../db';
import type { Workspace } from '../types';
import type { Asset } from '../lib/testing';
import { factoryLinesOf, type JobLine } from '../lib/lineRecords';
import { clientKey, factoryMap, mapLines, resolveWords, type FactoryMap } from '../lib/factoryKnowledge';
import { checkObject, ID, type FieldSpec } from './check';
import { anyone } from './access';
import type { CapRef, CapResult, Capability } from './types';
import { lineRef, notFound, plural } from './util';

type Scope = { ok: true; clients?: string[]; near: string[]; what: string } | { ok: false; why: string };

/** Whose factory this call may see, and the lines the conversation is on. */
export async function scopeOf(input: { lineId?: string; projectId?: string; client?: string }, all: readonly Workspace[]): Promise<Scope> {
  const named = input.client?.trim().toLowerCase();
  const nameOf = (k: string) => all.find(w => clientKey(w) === k)?.clientName?.trim() || 'the lines that name no client';
  if (input.lineId) {
    const line = await getWorkspace(input.lineId);
    if (!line) return notFound('line');
    const k = clientKey(line);
    if (named !== undefined && named !== k) return { ok: false, why: `${line.name} is ${k ? `${line.clientName?.trim()}’s` : 'on no client'} — not ${input.client}’s. Only one client’s factory is read at a time.` };
    return { ok: true, clients: [k], near: [line.id], what: nameOf(k) };
  }
  if (input.projectId) {
    const p = await getProject(input.projectId);
    if (!p || p.deletedAt) return notFound('project');
    const ids = factoryLinesOf(p.id, await allPaceLines());
    const ks = [...new Set(all.filter(w => ids.includes(w.id)).map(clientKey))];
    if (ks.length) {
      if (named !== undefined && !ks.includes(named)) return { ok: false, why: `${p.name} is not on ${input.client}’s lines. Only one client’s factory is read at a time.` };
      return { ok: true, clients: named !== undefined ? [named] : ks, near: ids, what: ks.map(nameOf).join(' and ') };
    }
  }
  if (named !== undefined) {
    /* a client with no line yet (being onboarded) has an empty factory — said so, never another client's */
    return { ok: true, clients: [named], near: [], what: all.some(w => clientKey(w) === named) ? nameOf(named) : (input.client?.trim() ?? '') };
  }
  return { ok: true, near: [], what: 'every client whose lines you can see' };
}

/** The map of the clients in scope — one map, each client its own group. */
function mapFor(scope: Extract<Scope, { ok: true }>, all: readonly Workspace[], assets: readonly Asset[], jobLines: readonly JobLine[]): FactoryMap {
  if (!scope.clients) return factoryMap(all, assets, { jobLines });
  return { clients: scope.clients.flatMap(c => factoryMap(all, assets, { client: c, jobLines }).clients) };
}

const SCOPE_FIELDS: Record<string, FieldSpec> = {
  lineId: ID('the line in hand'),
  projectId: ID('the project in hand'),
  client: { kind: 'string', label: 'the client', max: 120 },
};

/* ── factory_map ── */
export const factoryMapCap: Capability = {
  name: 'factory_map', title: 'Read the factory', kind: 'read',
  validate: raw => checkObject(raw, SCOPE_FIELDS),
  allowed: anyone,
  async run(_ctx, input: { lineId?: string; projectId?: string; client?: string }): Promise<CapResult> {
    const [all, assets, jobLines] = await Promise.all([listWorkspaces(), listAllAssets(), allPaceLines()]);
    const scope = await scopeOf(input, all);
    if (!scope.ok) return scope;
    const map = mapFor(scope, all, assets, jobLines);
    const lines = mapLines(map);
    const machines = lines.flatMap(l => l.machines);
    if (!lines.length) return { ok: true, says: `Nothing of ${scope.what}’s factory is in Faultline yet — no lines.`, data: map, refs: [] };
    const sites = new Set(lines.map(l => `${l.client}›${l.site}`).filter(s => !s.endsWith('›')));
    const areas = new Set(lines.map(l => `${l.client}›${l.site}›${l.area}`).filter(s => !s.endsWith('›')));
    const kinds = machines.filter(m => m.kind && m.kind.how !== 'inferred').length;
    const guessed = machines.filter(m => m.kind?.how === 'inferred').length;
    const says = `${map.clients.map(c => c.name || 'No client named').join(', ')}: ${[sites.size ? plural(sites.size, 'site') : '', areas.size ? plural(areas.size, 'area') : '', plural(lines.length, 'line'), plural(machines.length, 'machine')].filter(Boolean).join(', ')}`
      + ` — ${kinds ? `${kinds} with what it is said` : 'none with what it is said'}${guessed ? `, ${guessed} only guessed from the name` : ''}, ${machines.length - kinds - guessed} not known.`;
    return { ok: true, says, data: map, refs: lines.slice(0, 30).map(l => lineRef(l)) };
  },
};

/* ── resolve ── */
export const resolveCap: Capability = {
  name: 'resolve', title: 'Work out what is meant', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'the words said', required: true, max: 200 }, ...SCOPE_FIELDS }),
  allowed: anyone,
  async run(_ctx, input: { words: string; lineId?: string; projectId?: string; client?: string }): Promise<CapResult> {
    const [all, assets, jobLines] = await Promise.all([listWorkspaces(), listAllAssets(), allPaceLines()]);
    const scope = await scopeOf(input, all);
    if (!scope.ok) return scope;
    const map = mapFor(scope, all, assets, jobLines);
    const r = resolveWords(map, input.words, { lineIds: scope.near });
    /* more than one client in sight (nothing in hand): each candidate says whose */
    const lines = mapLines(map);
    const whose = (lineId?: string) => { const c = lines.find(l => l.id === lineId)?.client; return map.clients.length > 1 && c ? ` (${c})` : ''; };
    const candidates = r.candidates.map(c => ({ ...c, label: `${c.label}${whose(c.lineId ?? (c.kind === 'line' ? c.id : undefined))}` }));
    const says = r.match === 'none' && !lines.length ? `Nothing of ${scope.what}’s factory is in Faultline yet, so “${input.words}” is not known.` : r.says;
    const refs = candidates.flatMap((c): CapRef[] => {
      if (c.kind === 'line' && c.id) return [{ kind: 'line' as const, id: c.id, label: c.label, href: `/lines/${c.id}` }];
      if (c.kind === 'machine' && c.lineId) {
        const name = lines.find(l => l.id === c.lineId)?.machines.find(m => (c.id ? m.id === c.id : c.label.startsWith(m.name)))?.name;
        return name ? [{ kind: 'machine' as const, id: c.id ?? `${c.lineId}:${name}`, label: c.label, href: `/lines/${c.lineId}/machine/${encodeURIComponent(name)}` }] : [];
      }
      return [];
    });
    return { ok: true, says, data: { match: r.match, candidates }, refs };
  },
};
