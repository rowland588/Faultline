/* THE MEMORY CAPABILITIES (8 November, docs/AI-MODE.md, Memory) — beside the locals.
 *   remember_preference — a line added to How I work (lib/preferences): the person's own words about how they work, kept on
 *     their profile. It changes what every later conversation is told, so it is a WRITE: shown as a card saying exactly what
 *     will be added and where, and kept only when the person says yes.
 *   recall — the earlier conversations searched IN CODE (no model, no index): AI Mode's own (a `talk` study with
 *     facts.colleague — its threads' titles, their notes with how each was known, the person's own turns) and Line Talk's
 *     (its turns, the person's and Line Talk's answers), scored by the search box's own matchScore (lib/jumpTo), the best first
 *     and the newest first among equals. Never across clients: when the conversation in hand is on a line, only conversations
 *     about that client's lines come back — and one about no line, which is the person's own. Nothing is recorded by it and
 *     nothing is learnt from it: recording is not training. */
import { allPaceLines, getStudy, listAllStudies, listWorkspaces } from '../db';
import type { ToolStudy } from '../lib/study';
import type { TalkTurn } from '../tools/talk/talk';
import { matchScore } from '../lib/jumpTo';
import { factoryLinesOf } from '../lib/lineRecords';
import { studyHref } from '../lib/studyLinks';
import { niceDay } from '../lib/weeks';
import { preferenceLabel, readPreferences, savePreferences, withLine, type PreferenceKey } from '../lib/preferences';
import { checkObject } from './check';
import { anyone } from './access';
import type { CapRef, CapResult, Capability, ColleagueThread, HowKnown, ThreadScope } from './types';
import { plural } from './util';
import { activeClientNow } from '../lib/activeClient';
import { customerKey } from '../lib/customers';

/* ── remember_preference ── */
const ABOUT: readonly PreferenceKey[] = ['words', 'methods', 'reports', 'always'];
interface RememberIn { text: string; about?: PreferenceKey }

export const rememberPreference: Capability = {
  name: 'remember_preference', title: 'Remember how you work', kind: 'write',
  validate: raw => checkObject(raw, {
    text: { kind: 'string', label: 'what to remember, in the person’s own words', required: true, max: 300 },
    about: { kind: 'enum', label: 'which part of How I work', values: ABOUT },
  }),
  /* the person's own profile: anybody signed in may change their own */
  allowed: anyone,
  async preview(_ctx, input: RememberIn): Promise<string> {
    const about = input.about ?? 'always';
    const fit = withLine(readPreferences(), about, input.text);
    return fit.ok
      ? `Add to How I work, under “${preferenceLabel(about)}”: “${input.text}”. AI Mode reads it with every question from now; change it any time under How I work.`
      : `${fit.why} Nothing will be added.`;
  },
  async run(_ctx, input: RememberIn): Promise<CapResult> {
    const about = input.about ?? 'always';
    const fit = withLine(readPreferences(), about, input.text);
    if (!fit.ok) return fit;
    const r = await savePreferences(fit.prefs);
    /* the device keeps it even when the cloud refuses (no column yet, no signal) — said, never hidden */
    if (!r.ok && !r.why.startsWith('Kept on this device')) return r;
    return {
      ok: true,
      says: `Kept in How I work, under “${preferenceLabel(about)}”: “${input.text}”.${r.ok ? '' : ` ${r.why}`}`,
      refs: [],
    };
  },
};

/* ── recall ── */
const STOP = new Set(['the', 'and', 'for', 'with', 'about', 'what', 'did', 'say', 'said', 'last', 'week', 'was', 'were', 'that', 'this', 'you', 'our', 'how', 'when', 'where', 'which', 'who', 'have', 'has', 'had', 'are', 'from', 'tell', 'remind', 'again', 'earlier', 'before', 'yesterday', 'talk', 'talked', 'we']);
const plain = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** How well a piece of a conversation answers the words: the search box's score of the words as a whole (a real match — a word
 *  start or the words inside it, never letters scattered through a long sentence), else the share of the words that matter
 *  (three letters and more, not "what did we say about") that start a word of it, when at least half of them do. */
export function recallScore(words: string, text: string): number {
  if (!plain(words) || !plain(text)) return 0;
  const whole = matchScore(words, text);
  if (whole >= 40) return whole;
  const keys = [...new Set(plain(words).split(' ').filter(w => w.length >= 3 && !STOP.has(w)))];
  if (!keys.length) return 0;
  const hit = keys.filter(k => matchScore(k, text) >= 60).length;
  return hit && hit >= Math.ceil(keys.length / 2) ? Math.round((35 * hit) / keys.length) : 0;
}

/** One thing found. */
export interface Recalled {
  score: number;
  at: number;
  conversationId: string;
  conversation: string;
  /** 'AI Mode' or 'Line Talk'. */
  where: 'AI Mode' | 'Line Talk';
  /** A thread's title, a note on it, the person's words, or Line Talk's answer. */
  what: 'subject' | 'note' | 'you said' | 'Line Talk said';
  text: string;
  how?: HowKnown;
  href: string;
}

const turnWords = (t: TalkTurn): string => (t.text ?? t.heard ?? '').trim();
const isColleague = (s: ToolStudy) => (s.facts as { colleague?: boolean }).colleague === true;
const threadsOf = (s: ToolStudy): ColleagueThread[] => { const t = (s.facts as { threads?: unknown }).threads; return Array.isArray(t) ? t as ColleagueThread[] : []; };
const turnsOf = (s: ToolStudy): TalkTurn[] => { const t = (s.facts as { turns?: unknown }).turns; return Array.isArray(t) ? t as TalkTurn[] : []; };

/** The lines a scope is about: its line, and a project's lines. */
const linesOfScope = (scope: ThreadScope, projectLines: (id: string) => string[]): string[] =>
  [...(scope.lineId ? [scope.lineId] : []), ...(scope.projectId ? projectLines(scope.projectId) : [])];

/** A conversation's title as its list shows it — the current thread's, else its name. */
const titleOf = (s: ToolStudy): string => (isColleague(s) ? threadsOf(s).find(t => t.status === 'current')?.title : undefined) ?? s.name ?? 'A conversation';

/** What recall searches, as plain items — each conversation's lines said beside it, so the client rule can be applied. */
export interface RecallInputs {
  studies: readonly ToolStudy[];
  /** The client of a line ('' when none is named), or undefined for a line not in the factory. */
  clientOf: (lineId: string) => string | undefined;
  projectLines: (projectId: string) => string[];
  /** The conversation in hand — never searched; its current subject's line decides the client. */
  here?: ToolStudy;
}

/** RECALL, PURE — every match, best first and newest first among equals. */
export function recallFrom(words: string, inp: RecallInputs): Recalled[] {
  const norm = (c: string | undefined) => (c ?? '').trim().toLowerCase();
  /* the client of the conversation in hand: its current subject's lines, else the line it was started on */
  const hereThread = inp.here ? threadsOf(inp.here).find(t => t.status === 'current') : undefined;
  const hereLines = [...(hereThread ? linesOfScope(hereThread.scope, inp.projectLines) : []), ...(inp.here?.workspaceId ? [inp.here.workspaceId] : [])];
  const known = hereLines.map(inp.clientOf).filter((c): c is string => c !== undefined);
  const client = known.length ? norm(known[0]) : undefined;
  /* a set of lines may be read here when every one of them is this client's (no line: the person's own) */
  const mayRead = (lineIds: readonly string[]): boolean => client === undefined || lineIds.every(id => norm(inp.clientOf(id)) === client);

  const out: Recalled[] = [];
  const put = (r: Omit<Recalled, 'score'>) => { const score = recallScore(words, r.text); if (score > 0) out.push({ ...r, score }); };
  for (const s of inp.studies) {
    if (s.tool !== 'talk' || s.deletedAt || s.id === inp.here?.id) continue;
    if (isColleague(s)) {
      const threads = threadsOf(s);
      const every = [...new Set([...(s.workspaceId ? [s.workspaceId] : []), ...threads.flatMap(t => linesOfScope(t.scope, inp.projectLines))])];
      const base = { conversationId: s.id, conversation: titleOf(s), where: 'AI Mode' as const, href: `/ai?c=${encodeURIComponent(s.id)}` };
      /* a thread is read when its own lines are this client's; the person's turns only when the whole conversation is */
      for (const t of threads) {
        if (!mayRead(linesOfScope(t.scope, inp.projectLines))) continue;
        put({ ...base, at: t.at, what: 'subject', text: t.title });
        for (const n of t.notes ?? []) put({ ...base, at: n.at, what: 'note', text: n.text, how: n.how });
      }
      if (mayRead(every)) for (const t of turnsOf(s)) if (!t.struck && (t.kind === 'typed' || t.kind === 'said' || t.kind === 'photo')) put({ ...base, at: t.at, what: 'you said', text: turnWords(t) });
    } else {
      if (!mayRead(s.workspaceId ? [s.workspaceId] : [])) continue;
      const base = { conversationId: s.id, conversation: s.name || 'A Line Talk', where: 'Line Talk' as const, href: studyHref(s) };
      for (const t of turnsOf(s)) {
        if (t.struck || t.answering) continue;
        put({ ...base, at: t.at, what: t.kind === 'reply' ? 'Line Talk said' : 'you said', text: turnWords(t) });
      }
    }
  }
  return out.filter(r => r.text).sort((a, b) => b.score - a.score || b.at - a.at);
}

const dayOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const clip = (s: string, n = 280) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export const recall: Capability = {
  name: 'recall', title: 'Look back through earlier conversations', kind: 'read',
  validate: raw => checkObject(raw, {
    words: { kind: 'string', label: 'what to look for', required: true, max: 120 },
    limit: { kind: 'int', label: 'how many to bring back', min: 1, max: 20 },
  }),
  allowed: anyone,
  async run(ctx, input: { words: string; limit?: number }): Promise<CapResult> {
    const [studies, ws, jobLines, here] = await Promise.all([listAllStudies(), listWorkspaces(), allPaceLines(), ctx.conversationId ? getStudy(ctx.conversationId) : Promise.resolve(undefined)]);
    const client = new Map(ws.map(w => [w.id, w.clientName ?? '']));
    /* an ARCHIVED customer's conversations are not brought back until it is continued (lib/customers, C2a) */
    const { archived } = await activeClientNow();
    const gone = (id?: string | null) => !!id && archived.has(customerKey(client.get(id)));
    const projGone = (id?: string | null) => { const ls = id ? factoryLinesOf(id, jobLines) : []; return ls.length > 0 && ls.every(l => gone(l)); };
    const hits = recallFrom(input.words, {
      studies: archived.size ? studies.filter(s => !gone(s.workspaceId) && !projGone(s.projectId)) : studies, clientOf: id => client.get(id), projectLines: id => factoryLinesOf(id, jobLines), ...(here ? { here } : {}),
    });
    const kept = hits.slice(0, input.limit ?? 8);
    if (!kept.length) return { ok: true, says: `Nothing in the earlier conversations about “${input.words}”.`, data: [], refs: [] };
    const refs: CapRef[] = [];
    for (const r of kept) if (!refs.some(x => x.id === r.conversationId)) refs.push({ kind: 'study', id: r.conversationId, label: `${r.conversation} (${r.where})`, href: r.href });
    return {
      ok: true,
      says: `${plural(kept.length, 'thing')} found about “${input.words}” in ${plural(refs.length, 'earlier conversation')}${hits.length > kept.length ? ` (${hits.length} in all)` : ''}: ${kept.slice(0, 3).map(r => `${niceDay(dayOf(r.at))}, ${r.where} “${r.conversation}” — ${r.what}: “${clip(r.text, 120)}”${r.how ? ` (${r.how})` : ''}`).join('; ')}${kept.length > 3 ? ' …' : ''}.`,
      data: kept.map(r => ({ day: niceDay(dayOf(r.at)), where: r.where, conversation: r.conversation, what: r.what, text: clip(r.text), ...(r.how ? { how: r.how } : {}), open: r.href })),
      refs,
    };
  },
};
