/* CUSTOMERS — added by name before any line, archived and continued (11 November, docs/CONSULTANT-WORKSPACE.md C2a — Rowland: "I should
 * input a customer, everything under that customer is aligned to it. And I need to archive the customer .. but I need ability to
 * continue it when required. Then add another customer etc.").
 *
 * NO NEW NOUN, NO MIGRATION. A customer's anchor is its STORY — the engagement record that already exists one per client (tool 'story',
 * `agreed.story.client`, docs/STORY.md; lib/storyPick): it syncs across devices like every study and the studies table already takes
 * the kind. So:
 *   · ADDING a customer with no line yet starts its story (an empty brief — "No brief yet" on the Story) under its name, with its site
 *     when said (`agreed.story.site`). A client the lines already name is a customer already; adding it again changes nothing.
 *   · ARCHIVING one stamps `agreed.story.archivedAt` on every story of that client (making one, brief empty, when it has none — a client
 *     named only on its lines). Nothing else is touched: its lines are not archived one by one, so continuing it brings back exactly
 *     what was there, and a line archived on its own stays archived. lib/activeClient hides an archived customer everywhere.
 *   · CONTINUING clears the stamp; the customer comes back as it was and is made the active client.
 * A customer is archived when every story of it carries the stamp. The other choices weighed (a new study kind needs studies_tool_check
 * widened — a migration; the profile's preferences are one person's, not the factory's) are in the doc. */
import type { Workspace } from '../types';
import type { ToolStudy } from './study';
import { clientsOf, productionLines } from './lines';

const key = (s: string | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export interface Customer {
  /** Its name, as first written. */
  name: string;
  site?: string;
  archived: boolean;
  /** When it was archived — the latest stamp. */
  archivedAt?: number;
  /** Its stories — the anchors. */
  storyIds: string[];
  /** How many of the factory's lines name it. */
  lines: number;
}

/** The stories that anchor customers — a story naming a client, not deleted. */
const anchors = (studies: readonly ToolStudy[]) =>
  studies.filter(s => s.tool === 'story' && !s.deletedAt && (s.agreed?.story?.client ?? '').trim());

/** Every customer: the clients the lines name and the clients a story names, each once, in name order. */
export function customersOf(lines: readonly Workspace[], studies: readonly ToolStudy[]): Customer[] {
  const by = new Map<string, Customer>();
  const live = productionLines(lines);
  for (const c of clientsOf(live)) by.set(key(c), { name: c, archived: false, storyIds: [], lines: 0 });
  for (const s of anchors(studies)) {
    const st = s.agreed?.story;
    if (!st) continue;
    const k = key(st.client);
    const c = by.get(k) ?? { name: st.client.trim(), archived: false, storyIds: [], lines: 0 };
    c.storyIds.push(s.id);
    if (!c.site && st.site?.trim()) c.site = st.site.trim();
    by.set(k, c);
  }
  for (const w of live) { const c = by.get(key(w.clientName)); if (c) c.lines++; }
  const stories = new Map(anchors(studies).map(s => [s.id, s.agreed?.story]));
  for (const c of by.values()) {
    const stamps = c.storyIds.map(id => stories.get(id)?.archivedAt);
    c.archived = stamps.length > 0 && stamps.every(t => typeof t === 'number');
    if (c.archived) c.archivedAt = Math.max(...(stamps as number[]));
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The archived customers' names, as keys (trimmed, one space, lower case) — what lib/activeClient hides. */
export const archivedKeys = (cs: readonly Customer[]): Set<string> => new Set(cs.filter(c => c.archived).map(c => key(c.name)));
export const customerKey = key;

/** A customer's name as typed — refused when empty. */
export function customerName(raw: string): { ok: true; name: string } | { ok: false; why: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, why: 'A customer needs a name.' };
  if (name.length > 80) return { ok: false, why: 'At most 80 letters.' };
  return { ok: true, name };
}

/* ------------------------------------------------------------------------------------------------------------------------ */
/*  WRITES — through the db's own functions; each hands back how to undo it                                                   */
/* ------------------------------------------------------------------------------------------------------------------------ */

const db = () => import('../db');
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

async function read(): Promise<{ lines: Workspace[]; studies: ToolStudy[] }> {
  const d = await db();
  const [lines, studies] = await Promise.all([d.listWorkspaces(), d.listAllStudies()]);
  return { lines, studies };
}

/** A new story for a client — its anchor, the brief empty. */
async function anchorFor(name: string, site?: string, archivedAt?: number): Promise<string> {
  const t = Date.now(), id = uid();
  await (await db()).putStudy({ id, tool: 'story', name: `${name} — the story`,
    agreed: { story: { client: name, brief: '', startedAt: t, ...(site ? { site } : {}), ...(archivedAt ? { archivedAt } : {}) } },
    facts: { chapters: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t } as unknown as ToolStudy);
  return id;
}

/** ADD A CUSTOMER — by name, a site if said; made the active client. An archived one of the name is continued instead. */
export async function addCustomer(raw: string, siteRaw = ''): Promise<{ ok: true; name: string; continued?: boolean } | { ok: false; why: string }> {
  const n = customerName(raw);
  if (!n.ok) return n;
  const site = siteRaw.trim().replace(/\s+/g, ' ') || undefined;
  const { lines, studies } = await read();
  const had = customersOf(lines, studies).find(c => key(c.name) === key(n.name));
  const { setActiveClient } = await import('./activeClient');
  if (had?.archived) { await continueCustomer(had.name); return { ok: true, name: had.name, continued: true }; }
  if (!had) await anchorFor(n.name, site);
  setActiveClient(had?.name ?? n.name);
  return { ok: true, name: had?.name ?? n.name };
}

const stamp = async (ids: readonly string[], at: number | undefined) => {
  const d = await db();
  for (const id of ids) {
    await d.patchStudy(id, cur => {
      const st = cur.agreed?.story;
      if (!st) return {};
      const { archivedAt: _was, ...rest } = st;
      return { agreed: { ...cur.agreed, story: at ? { ...rest, archivedAt: at } : rest } } as Partial<ToolStudy>;
    });
  }
};

/** ARCHIVE A CUSTOMER — every story of it stamped (one made when it has none); nothing else changed. Undo puts it back exactly. */
export async function archiveCustomer(name: string): Promise<{ ok: true; undo: () => Promise<void> } | { ok: false; why: string }> {
  const { lines, studies } = await read();
  const c = customersOf(lines, studies).find(x => key(x.name) === key(name));
  if (!c) return { ok: false, why: `No customer called ${name}.` };
  if (c.archived) return { ok: false, why: `${c.name} is archived already.` };
  const at = Date.now();
  const made = c.storyIds.length ? undefined : await anchorFor(c.name, c.site, at);
  await stamp(c.storyIds, at);
  const ac = await import('./activeClient');
  if (key(ac.storedClient()) === key(c.name)) ac.setActiveClient('');
  return {
    ok: true,
    undo: async () => {
      if (made) await (await db()).deleteStudy(made);
      await stamp(c.storyIds, undefined);
      ac.setActiveClient(c.name);
    },
  };
}

/** CONTINUE A CUSTOMER — the stamp taken off every story of it; it comes back as it was, made the active client. */
export async function continueCustomer(name: string): Promise<{ ok: true } | { ok: false; why: string }> {
  const { lines, studies } = await read();
  const c = customersOf(lines, studies).find(x => key(x.name) === key(name));
  if (!c) return { ok: false, why: `No customer called ${name}.` };
  await stamp(c.storyIds, undefined);
  (await import('./activeClient')).setActiveClient(c.name);
  return { ok: true };
}
