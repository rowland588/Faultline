/* Weekly digest — every figure from the app's own readers (G7, docs/LUNA-AGENT.md). No assist. */
import type { Snag } from '../../snag/types';
import type { Source } from '../data/sources';
import type { ClientScope } from '../activeClient';
import { briefing, lastSeen, type BriefItem } from '../today';
import { pictureOf, worstOf } from '../../colleague/picture';
import { newestFiles } from '../data/sources';
import { saysOf, changedOf } from '../../colleague/knows';
import type { StandingJobScope } from './types';

export interface DigestSection { title: string; lines: string[] }

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);
const DEF: StandingJobScope = { picture: true, files: true, problems: true, variance: true };

/** Open problems for the customer's lines — worst first, at most eight named. */
export function problemsSection(cs: ClientScope, open: readonly Snag[], now: number, lineName: (id?: string | null) => string): DigestSection | undefined {
  const mine = open.filter(s => cs.record(s));
  if (!mine.length) return { title: 'Problems open', lines: ['Nothing open on this customer’s lines.'] };
  const rank = (p?: string) => (p === 'critical' ? 0 : p === 'high' ? 1 : 2);
  const rows = [...mine].sort((a, b) => rank(a.priority) - rank(b.priority) || (a.dueAt && a.dueAt < now ? -1 : 0) - (b.dueAt && b.dueAt < now ? -1 : 0)).slice(0, 8);
  const more = mine.length - rows.length;
  return {
    title: 'Problems open',
    lines: [
      `${mine.length} open — ${mine.filter(s => s.priority === 'critical').length} critical.`,
      ...rows.map(s => {
        const ln = lineName(s.workspaceId);
        return `${s.problem}${ln ? ` · ${ln}` : ''}${s.owner ? ` · ${s.owner}` : ''}${s.dueAt && s.dueAt < now ? ' · past its day' : ''}`;
      }),
      ...(more > 0 ? [`and ${more} more`] : []),
    ],
  };
}

/** File headlines and what changed — newest six with a headline. */
export function filesSection(sources: readonly Source[], scope: StandingJobScope): DigestSection | undefined {
  if (!scope.files) return undefined;
  const list = newestFiles(sources).filter(s => saysOf(s));
  if (!list.length) return { title: 'Linked files', lines: ['No workbook headlines kept for this customer yet.'] };
  const lines = list.slice(0, 6).flatMap(s => {
    const head = saysOf(s);
    if (!head) return [];
    const ch = changedOf(s);
    return [ch ? `“${s.facts.name}” — ${clip(head, 220)}. Since ${new Date(ch.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${clip(ch.paragraphs.join(' '), 180)}` : `“${s.facts.name}” — ${clip(head, 280)}`];
  });
  return { title: 'Linked files', lines };
}

/** Recent variance results kept on colleague conversations — ids and titles only, no invented figures. */
export function varianceSection(studies: readonly { id: string; facts?: { results?: readonly { id: string; title?: string; query?: { variance?: unknown } }[] } }[]): DigestSection | undefined {
  const hits: string[] = [];
  for (const s of studies) {
    for (const r of s.facts?.results ?? []) {
      if (!r.query?.variance || !r.title?.trim()) continue;
      hits.push(r.title.trim());
      if (hits.length >= 4) break;
    }
    if (hits.length >= 4) break;
  }
  if (!hits.length) return { title: 'Variance looked at', lines: ['No kept variance results on this device — ask Luna when a plan and actual are in play.'] };
  return { title: 'Variance looked at', lines: [`Recent on this device: ${hits.join(' · ')}`] };
}

export interface DigestInput {
  client: string;
  cs: ClientScope;
  lines: readonly { id: string; name: string; open: number; critical: number; worst?: { what: string; owner?: string; late: boolean } }[];
  brief: readonly BriefItem[];
  open: readonly Snag[];
  sources: readonly Source[];
  studies: readonly { id: string; facts?: { results?: readonly { id: string; title?: string; query?: { variance?: unknown } }[] } }[];
  scope?: StandingJobScope;
  now?: number;
}

/** The digest as sections and one plain-text block for Luna or a run record. */
export function buildWeeklyDigest(input: DigestInput): { title: string; sections: DigestSection[]; text: string } {
  const scope = { ...DEF, ...input.scope };
  const now = input.now ?? Date.now();
  const sections: DigestSection[] = [];
  if (scope.picture) {
    const pic = pictureOf(input.cs, input.lines.map(l => ({ id: l.id, name: l.name })), input.open, input.brief, now);
    if (pic) sections.push({ title: 'What stands now', lines: pic.split('\n').map(x => x.trim()).filter(Boolean) });
  }
  const files = filesSection(input.sources.filter(s => input.cs.record(s)), scope);
  if (files) sections.push(files);
  const probs = scope.problems ? problemsSection(input.cs, input.open, now, input.cs.lineClient) : undefined;
  if (probs) sections.push(probs);
  if (scope.variance) {
    const v = varianceSection(input.studies);
    if (v) sections.push(v);
  }
  const title = `Weekly briefing — ${input.client}`;
  const text = [title, '', ...sections.flatMap(s => [`## ${s.title}`, ...s.lines, ''])].join('\n').trim();
  return { title, sections, text };
}

/** Read everything the digest needs for one customer — scope is that customer only. */
export async function digestDataFor(client: string, now = Date.now()): Promise<Omit<DigestInput, 'scope'>> {
  const [db, { clientScope }, { liveProductionLines }, { loadClientEveryAction }, { allSources, standingOf }] = await Promise.all([
    import('../../db'),
    import('../activeClient'),
    import('../lines'),
    import('../useProjectActions'),
    import('../../capabilities/data'),
  ]);
  const [ws, snags, studies, projects] = await Promise.all([db.listWorkspaces(), db.listAllSnags(), db.listAllStudies(), db.allProjects()]);
  const { customersOf } = await import('../customers');
  const cs = clientScope(ws, await db.allPaceLines(), client, customersOf(ws, studies));
  const lines = await liveProductionLines(ws);
  const live = projects.filter(p => !p.archivedAt && !(p as { deletedAt?: number }).deletedAt);
  const read = await loadClientEveryAction(cs, live);
  const open = snags.filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed');
  const lineClient = cs.lineClient;
  const { archivedKeys } = await import('../customers');
  const hand = { client: cs.client, clients: cs.clients, archived: archivedKeys(cs.archived) };
  const sources = (await allSources()).filter(s => standingOf(s, hand, lineClient).in);
  const pictureLines = lines.filter(l => cs.line(l.id)).map(l => {
    const on = open.filter(s => s.workspaceId === l.id);
    return {
      id: l.id, name: l.name, open: on.length, critical: on.filter(s => s.priority === 'critical').length,
      ...(on.length ? { worst: worstOf(on.map(s => ({ problem: s.problem, priority: s.priority, owner: s.owner, dueAt: s.dueAt, raisedAt: s.raisedAt })), now) } : {}),
    };
  });
  const talks = studies.filter(s => s.tool === 'talk' && !!(s.facts as { colleague?: boolean }).colleague);
  return { client, cs, lines: pictureLines, brief: briefing(read.rows, read.register, lastSeen(now)), open, sources, studies: talks };
}