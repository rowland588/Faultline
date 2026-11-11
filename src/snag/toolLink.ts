/* A PROBLEM RAISED FROM A TOOL, AND HELD INSIDE IT (docs/TOOL-PROBLEMS.md — Rowland, 11 November, on a live test at a customer: "I'm using a
 * tool, I see something, and I go, I've got to capture that. So I raise a problem and link it to the tool … it could be a specific station or a
 * specific place, specific asset, where it's then held within the tool. Yes, you'll see it on a problem page … but it also will be held inside the
 * tool itself").
 *
 * NO NEW RECORD AND NO COLUMN. A problem (snag/types Snag) names the tool records it is about in `tools`: the study's id and, when it is about one
 * part of it (a workstation of the stops chart, a station, a step), that part's id — the same target ids the pictures use (lib/attachments). The
 * first one it was RAISED from carries `raised`; one linked afterwards (from the tool's record, or from the problem) does not. The tool reads the
 * same list the other way, so the two ends can never disagree.
 *
 * In the cloud the links ride in the row's existing `linked_obs_ids` list beside the waste tag and the after: links (cloud/mappers):
 *
 *     raised:<studyId>            raised from the whole record
 *     raised:<studyId>:<part>     raised from one part of it
 *     study:<studyId>             linked to the whole record
 *     study:<studyId>:<part>      linked to one part of it
 *
 * The mapper adds them going up and takes them out coming down, so `linkedObsIds` (the Pareto's observations) never sees one. Pure. */
import { SNAG_STATUS_META, type Snag } from './types';

export interface ToolLink {
  /** The tool record (a ToolStudy's id). */
  studyId: string;
  /** The part of it — a workstation ('w03'), a station, a step; absent is the whole record. */
  part?: string;
  /** Raised from here, rather than linked to it afterwards. */
  raised?: true;
}

export const RAISED_TAG = 'raised:';
export const STUDY_TAG = 'study:';
export const isToolTag = (x: unknown): boolean => typeof x === 'string' && (x.startsWith(RAISED_TAG) || x.startsWith(STUDY_TAG));

const keyOf = (l: Pick<ToolLink, 'studyId' | 'part'>): string => `${l.studyId}${l.part ? `:${l.part}` : ''}`;

/** The links as the cloud row carries them. */
export const toolLinksToTags = (links: readonly ToolLink[] | undefined): string[] =>
  (links ?? []).map(l => (l.raised ? RAISED_TAG : STUDY_TAG) + keyOf(l));

/** The links read back from a cloud row's list; nothing when there are none. A study id holds no colon (lib/ids uid), so the part is what follows the first. */
export function toolLinksOfTags(ids: unknown): { tools?: ToolLink[] } {
  if (!Array.isArray(ids)) return {};
  const out: ToolLink[] = [];
  for (const x of ids as unknown[]) {
    if (typeof x !== 'string' || !isToolTag(x)) continue;
    const raised = x.startsWith(RAISED_TAG);
    const rest = x.slice(raised ? RAISED_TAG.length : STUDY_TAG.length);
    const at = rest.indexOf(':');
    const studyId = at < 0 ? rest : rest.slice(0, at);
    const part = at < 0 ? '' : rest.slice(at + 1);
    if (!studyId) continue;
    const l: ToolLink = { studyId, ...(part ? { part } : {}), ...(raised ? { raised: true as const } : {}) };
    if (!out.some(o => keyOf(o) === keyOf(l))) out.push(l);
  }
  return out.length ? { tools: out } : {};
}

/** Every tool record a problem is linked to, the one it was raised from first. */
export const toolLinksOf = (s: Pick<Snag, 'tools'>): ToolLink[] =>
  [...(s.tools ?? [])].sort((a, b) => Number(!!b.raised) - Number(!!a.raised));

/** Where it was raised from — the tool record and the part — or nothing when it was raised anywhere else. */
export const raisedFromTool = (s: Pick<Snag, 'tools'>): ToolLink | undefined => (s.tools ?? []).find(l => l.raised);

/** The list with one more link; a link already there is kept as it was (raised stays raised). */
export function withToolLink(cur: readonly ToolLink[] | undefined, l: ToolLink): ToolLink[] {
  const list = [...(cur ?? [])];
  return list.some(o => keyOf(o) === keyOf(l)) ? list : [...list, { studyId: l.studyId, ...(l.part ? { part: l.part } : {}), ...(l.raised ? { raised: true as const } : {}) }];
}

/** The list without the link to that record (and part); undefined when none is left. */
export function withoutToolLink(cur: readonly ToolLink[] | undefined, studyId: string, part?: string): ToolLink[] | undefined {
  const next = (cur ?? []).filter(o => keyOf(o) !== keyOf({ studyId, part }));
  return next.length ? next : undefined;
}

/** Is this problem linked to that record — to the part when one is asked ('' asks for the whole record only), else to any of it? */
export function linkedTo(s: Pick<Snag, 'tools'>, studyId: string, part?: string): boolean {
  return (s.tools ?? []).some(l => l.studyId === studyId && (part === undefined || (l.part ?? '') === part));
}

/** The live problems held by a record (or by one of its parts), open first, then the newest. */
export function problemsOn<T extends Pick<Snag, 'tools' | 'status' | 'raisedAt' | 'deletedAt'>>(snags: readonly T[], studyId: string, part?: string): T[] {
  return snags.filter(s => !s.deletedAt && linkedTo(s, studyId, part))
    .sort((a, b) => Number(a.status === 'closed') - Number(b.status === 'closed') || b.raisedAt - a.raisedAt);
}

/** The part of the record a problem is held under ('' the whole record). */
export const partOn = (s: Pick<Snag, 'tools'>, studyId: string): string => (s.tools ?? []).find(l => l.studyId === studyId)?.part ?? '';

/* ------------------------------------------------- how a held problem is said, on the record and on its paper */

const startOfToday = (now = Date.now()): number => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const PRIO_WORD = { critical: 'Critical', high: 'High', low: 'Low' } as const;

/** Where a problem stands, in words, and whether it is the abnormal one (late, or critical and open) — the only red. */
export function problemStands(s: Pick<Snag, 'status' | 'dueAt' | 'priority' | 'owner'>, now = Date.now()): { word: string; late: number; red: boolean } {
  const t0 = startOfToday(now);
  const late = s.status !== 'closed' && s.dueAt != null && s.dueAt < t0 ? Math.round((t0 - s.dueAt) / 86_400_000) : 0;
  const word = late ? `${late} day${late === 1 ? '' : 's'} late` : SNAG_STATUS_META[s.status].label;
  return { word, late, red: !!late || (s.status !== 'closed' && s.priority === 'critical') };
}

/** "High · with Dave · due 14 Nov · Open" — a held problem's line, every part said in words. */
export function problemLine(s: Pick<Snag, 'status' | 'dueAt' | 'priority' | 'owner'>, now = Date.now()): string {
  const st = problemStands(s, now);
  return [PRIO_WORD[s.priority ?? 'low'], s.owner ? `with ${s.owner}` : 'nobody on it yet', s.dueAt != null ? `due ${day(s.dueAt)}` : 'no day agreed', st.word].join(' · ');
}

