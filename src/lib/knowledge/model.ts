/* Faultline'S KNOWLEDGE — the pure model (12 November, docs/LUNAR-KNOWLEDGE.md §2–3). Entries are append-only (supabase/KNOWLEDGE.sql);
 * this file says how an entry is named, how a claim's versions chain, and where a claim stands — evidence always outranking opinion.
 * No database and no clock here: everything is a function of the entries given, so two devices reading the same entries say the same. */
import type { KnowledgeRow, KnowledgeKnown, KnowledgeStance } from '../../db/rows';

export type Entry = KnowledgeRow;

/** Counted and measured are evidence (code over records, a study's measurement); observed and reported are what people say. */
export const EVIDENCE: ReadonlySet<string> = new Set<KnowledgeKnown>(['counted', 'measured']);
export const isEvidence = (e: Pick<Entry, 'known'>) => EVIDENCE.has(e.known);

export const KNOWN_WORD: Record<KnowledgeKnown, string> = { counted: 'counted', measured: 'measured', observed: 'seen by a person', reported: 'a person says' };
export const knownWord = (k: string) => KNOWN_WORD[k as KnowledgeKnown] ?? k;

/** FNV-1a over a string, as two 32-bit halves — enough to name an entry; not a security hash. */
function fnv(s: string, seed = 2166136261): string {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** An entry's id from what makes it the entry it is — so two devices that work out the same version name it the same. */
export const entryId = (...parts: (string | undefined)[]): string => { const s = parts.map(p => p ?? '').join('␟'); return `k-${fnv(s)}${fnv(s, 0x811c9dc5 ^ 0x5bd1e995)}`; };

const norm = (s?: string) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
/** What an entry is about, as a key: a machine and a reason, a machine, a fix, a problem, or the line. */
export function subjectOf(x: { machine?: string; reason?: string; fixId?: string; problemId?: string }): string {
  if (x.fixId) return `fix:${x.fixId}`;
  if (x.problemId) return `problem:${x.problemId}`;
  if (x.machine && x.reason) return `stops:${norm(x.machine)}|${norm(x.reason)}`;
  if (x.machine) return `machine:${norm(x.machine)}`;
  return 'line';
}
/** The machine a subject is about, if any (stops:<m>|<r>, machine:<m>). */
export const machineOfSubject = (s: string): string | undefined => {
  const m = /^(?:stops|machine):([^|]+)/.exec(s);
  return m ? m[1] : undefined;
};

/** A claim's versions, oldest first, by when each was written. */
export function versionsOf(entries: readonly Entry[], claim: string): Entry[] {
  return entries.filter(e => e.claim === claim && (e.kind === 'finding' || e.kind === 'outcome')).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}
/** The version that stands: the one no other version of the claim supersedes (the newest such, if devices raced). */
export function currentOf(entries: readonly Entry[], claim: string): Entry | undefined {
  const vs = versionsOf(entries, claim);
  const replaced = new Set(vs.map(v => v.supersedes).filter(Boolean));
  const heads = vs.filter(v => !replaced.has(v.id));
  return heads[heads.length - 1];
}
export const signatureOf = (e: Entry | undefined): string | undefined => (e?.body as { signature?: unknown } | undefined)?.signature as string | undefined;
export const isLapsed = (e: Entry | undefined) => !!e && (e.body as { lapsed?: unknown }).lapsed === true;

/** The next version of a claim, or nothing when what it says has not changed. Never edits the one before: it names it. */
export function nextVersion(entries: readonly Entry[], draft: Omit<Entry, 'id' | 'supersedes' | 'updatedAt'> & { body: { signature: string } }): Entry | undefined {
  const cur = currentOf(entries, draft.claim ?? '');
  if (cur && signatureOf(cur) === draft.body.signature) return undefined;
  const id = entryId(draft.workspaceId, draft.claim, draft.body.signature, cur?.id);
  if (entries.some(e => e.id === id)) return undefined;
  return { ...draft, id, ...(cur ? { supersedes: cur.id } : {}), updatedAt: draft.at };
}

/* ---------------------------------------------------------------- where a claim stands */

export type ClaimState = 'found' | 'supported' | 'contradicted' | 'both' | 'agreed' | 'disputed' | 'mixed' | 'superseded' | 'lapsed';
export const STATE_WORD: Record<ClaimState, string> = {
  found: 'Found — nobody has said more yet',
  supported: 'Supported by evidence',
  contradicted: 'Contradicted by evidence',
  both: 'Evidence both ways',
  agreed: 'A person agrees — not proven',
  disputed: 'A person disputes this — not proven',
  mixed: 'People differ — not proven either way',
  superseded: 'Superseded — kept as it was',
  lapsed: 'No longer the case',
};

export interface Standing {
  state: ClaimState;
  word: string;
  /** Answers on each side, by how they are known. */
  forEvidence: Entry[];
  againstEvidence: Entry[];
  forPeople: Entry[];
  againstPeople: Entry[];
  /** Every response, newest first — neutral ones too. */
  responses: Entry[];
}

/** Where one entry stands, from every entry that answers it or any version of its claim. Evidence outranks opinion; a superseded
 *  version says so first, and keeps its own answers. */
export function standingOf(target: Entry, entries: readonly Entry[]): Standing {
  const family = new Set<string>([target.id]);
  const responses = entries.filter(e => e.about && family.has(e.about) && e.id !== target.id).sort((a, b) => b.at - a.at);
  const side = (st: KnowledgeStance, ev: boolean) => responses.filter(r => r.stance === st && isEvidence(r) === ev);
  const fe = side('supports', true), ae = side('contradicts', true), fp = side('supports', false), ap = side('contradicts', false);
  const claim = target.claim;
  const replaced = claim ? versionsOf(entries, claim).some(v => v.supersedes === target.id) : false;
  let state: ClaimState;
  if (replaced) state = 'superseded';
  else if (isLapsed(target)) state = 'lapsed';
  else if (fe.length && ae.length) state = 'both';
  else if (fe.length) state = 'supported';
  else if (ae.length) state = 'contradicted';
  else if (fp.length && ap.length) state = 'mixed';
  else if (fp.length) state = 'agreed';
  else if (ap.length) state = 'disputed';
  else state = 'found';
  return { state, word: STATE_WORD[state], forEvidence: fe, againstEvidence: ae, forPeople: fp, againstPeople: ap, responses };
}

/** One response in words: who, how known, which side, what they said. */
export function responseSaid(r: Entry): string {
  const side = r.stance === 'supports' ? 'agrees' : r.stance === 'contradicts' ? 'disagrees' : 'adds';
  const who = r.by ? `${r.by}${r.role ? ` (${r.role})` : ''}` : r.source === 'person' ? 'a person' : 'Faultline';
  return `${who} ${side} — ${knownWord(r.known)}${r.says ? `: “${r.says}”` : ''}`;
}

/** A claim's story: each version in turn, what it said and when — so a finding that turned out wrong stays on the record. */
export function storyOf(entries: readonly Entry[], claim: string, day: (ms: number) => string): string[] {
  return versionsOf(entries, claim).map((v, i, all) => `${day(v.at)}: ${v.says}${i < all.length - 1 ? ' (later superseded)' : ''}`);
}
