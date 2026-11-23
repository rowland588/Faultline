/* THE CUSTOMER IN HAND, HELD BY THE CODE (22 November 2026 — the audit of 21 November, limit 8; docs/LUNA-AGENT.md §5a).
 *
 * "One customer's data never reaches another" is the rule Rowland states first (CLAUDE.md; docs/DIRECTION.md, rule 3). Until today
 * it was kept for Luna's READS by her instructions alone — "never bring in another client's lines, problems or records" — except
 * where a reader already held it itself (the files: capabilities/data sourcesInHand; resolve_source; factory_map; recall). A read
 * that named another customer's line by its id — line_state, tool_records, a question of its stops — was answered. A rule that
 * matters this much belongs in the code:
 *
 *   readOutOfHand   every READ a capability makes is looked at before it runs (capabilities/registry runCall): the line, project,
 *                   department, study, document, problem or source it names must be the customer in hand's — or everyone's, when
 *                   all clients are shown — and never an archived customer's. Refused in words that say whose it is and how to
 *                   reach it; never a figure, never a name of what was found.
 *   handScope       the same scope every page of the app filters by (lib/activeClient clientScope), read once — for the readers that
 *                   list with no place named (find, list_problems, overdue_actions), which keep to it themselves.
 *
 * What it leaves alone, on purpose: WRITES — each waits for the person's yes on a card that names where it will land, so the person
 * decides; and a record that is nobody's (a conversation, a template of the person's own, a draft) — it belongs to no customer and
 * is refused to none. */
import { getProject, getSnag, getStudy, getWorkspace } from '../db';
import { chosenClient, clientScope, type ClientScope, type Placed } from '../lib/activeClient';
import { archivedKeys, customerKey, customersOf } from '../lib/customers';

/** The scope the app's own pages filter by, read once. */
export async function handScope(): Promise<ClientScope> {
  const db = await import('../db');
  const [lines, jobLines, studies] = await Promise.all([db.listWorkspaces(), db.allPaceLines(), db.listAllStudies()]);
  return clientScope(lines, jobLines, chosenClient(), customersOf(lines, studies));
}

/** Can anything be out of hand at all? Not with one customer and none archived — the common case, answered without reading a record. */
export const anyOutOfHand = (s: ClientScope): boolean => s.filtering || s.archived.length > 0;

/** Why it is not read, in words — whose it is, and how to reach it. */
export function outOfHandSaid(what: string, whose: string, s: ClientScope): string {
  const gone = archivedKeys(s.archived);
  const archived = whose.split(', ').filter(c => gone.has(customerKey(c)));
  if (archived.length) return `“${what}” belongs to ${archived[0]}, which is archived — nothing is read from an archived customer. It is kept as it was: continue ${archived[0]} (Set up › Customers) to use it again.`;
  return `“${what}” is ${whose}’s, and the customer in hand is ${s.client} — nothing of one customer is read while another is in hand. Switch to ${whose.split(', ')[0]} (the top bar, or switch_client) to read it.`;
}

const idOf = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
/** A dataset's id names its line or its study: 'stops:<line>' · 'tests:<line>' · 'problems:<line|all>' · 'production:<line>' · 'readings:<study>'. */
const sourcePlace = (v: unknown): { line?: string; study?: string } => {
  const m = /^(stops|tests|problems|production|readings):(.+)$/.exec(idOf(v) ?? '');
  if (!m || m[2] === 'all') return {};
  return m[1] === 'readings' ? { study: m[2] } : { line: m[2] };
};

/** WHY A READ MAY NOT BE MADE — or nothing. `input` is the capability's validated input: every place and record it names is looked
 *  up, and the first that is another customer's (or an archived customer's) refuses the read. A name that is no record is left to
 *  the capability to say. */
export async function readOutOfHand(input: unknown): Promise<string | undefined> {
  if (!input || typeof input !== 'object') return undefined;
  const o = input as Record<string, unknown>;
  const src = sourcePlace(o.source);
  const lines = [idOf(o.lineId), idOf(o.departmentId), src.line].filter((x): x is string => !!x);
  const projects = [idOf(o.projectId)].filter((x): x is string => !!x);
  const studies = [idOf(o.studyId), idOf(o.documentId), idOf(o.standardId), src.study].filter((x): x is string => !!x);
  const problems = [idOf(o.problemId)].filter((x): x is string => !!x);
  const sourceIds = [idOf(o.sourceId)].filter((x): x is string => !!x);
  if (!lines.length && !projects.length && !studies.length && !problems.length && !sourceIds.length) return undefined;
  for (const id of sourceIds) {
    const st = await getStudy(id);
    const { sourceOf } = await import('../lib/data/sources');
    const src = st ? sourceOf(st) : undefined;
    if (!src) continue;
    const { standingNow, notInHandSaid } = await import('./data');
    const standing = await standingNow(src);
    if (!standing.in) return notInHandSaid(src, standing as Extract<typeof standing, { in: false }>);
  }
  if (!lines.length && !projects.length && !studies.length && !problems.length) return undefined;
  const s = await handScope();
  if (!anyOutOfHand(s)) return undefined;
  for (const id of lines) {
    const w = await getWorkspace(id);
    const whose = w ? s.lineClient(id) : '';
    if (w && whose && !s.line(id)) return outOfHandSaid(w.name, whose, s);
  }
  for (const id of projects) {
    const p = await getProject(id);
    const whose = p ? s.projectClients(id) : [];
    if (p && whose.length && !s.project(id)) return outOfHandSaid(p.name, whose.join(', '), s);
  }
  const placed = async (name: string, r: Placed): Promise<string | undefined> => { const whose = s.whose(r); return whose && !s.record(r) ? outOfHandSaid(name, whose, s) : undefined; };
  for (const id of studies) {
    const st = await getStudy(id);
    const no = st && !st.deletedAt ? await placed(st.name, { workspaceId: st.workspaceId, projectId: st.projectId }) : undefined;
    if (no) return no;
  }
  for (const id of problems) {
    const sn = await getSnag(id);
    const no = sn ? await placed(sn.problem || 'That problem', { workspaceId: sn.workspaceId, projectId: sn.projectId }) : undefined;
    if (no) return no;
  }
  return undefined;
}

/** A record is the customer in hand's — as the app's own lists decide it: shown under the active client, never an archived one's. */
export const inHand = (s: ClientScope, r: Placed): boolean => s.record(r);
