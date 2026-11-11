/* AI MODE — A CONVERSATION WITH THE COLLEAGUE (8 November; the shared contract §3).
 *
 * Rowland, 8 November: two modes over one application. AI Mode is a conversation in which Claude works Faultline only
 * through the approved capabilities (src/capabilities). A conversation is NOT a new record: it is a study of tool `talk`
 * (lib/study), marked `facts.colleague`, its turns Line Talk's own TalkTurn (typed · said · photo · reply), and two lists
 * of its own —
 *   threads   the subjects it has been about: one current, the rest parked (or closed), each with where it is (a line, a
 *             project, a problem, the story), its notes each saying HOW IT IS KNOWN, and the records it touched;
 *   actions   what was done through it — every write the person confirmed or declined, with what it said and its refs.
 * A colleague turn also keeps what it used (each capability called, in order, with its sentence and refs), the follow-ups
 * it offered, and any figure it was not sure of.
 *
 * Pure, but for the few lines at the foot that write a conversation through db (patchStudy, putStudy) — read the same on
 * the screen and in the tests. */
import type { CapRef, ColleagueAction, ColleagueDraft, ColleagueThread, HowKnown, ThreadNote, ThreadScope } from '../capabilities/types';
import { draftSaid } from '../capabilities/drafts';
import type { TalkTurn } from '../tools/talk/talk';
import type { StudyFacts, ToolStudy } from '../lib/study';

/* the thread, its notes and its place are the capabilities' own shapes (src/capabilities/types) — one shape, read and
   written the same by set_focus, park_focus, record_observation and this screen */
export type { ThreadNote, ThreadScope };
export type Thread = ColleagueThread;
export type ThreadStatus = Thread['status'];

/** A capability the colleague used in a turn — a read or a local step done at once, or a write waiting on the person. */
export type UsedStatus = 'done' | 'failed' | 'refused' | 'waiting' | 'declined' | 'dropped';
export interface Used {
  callId: string;
  name: string;
  title: string;
  kind: 'read' | 'write' | 'local';
  status: UsedStatus;
  /** What running it said — or why it did not run. */
  says: string;
  refs: CapRef[];
  /** A write: what will happen, in a sentence, said before it runs. */
  preview?: string;
  /** A write: the inputs the person is shown on its card. */
  input?: Record<string, unknown>;
  /** A write answered out loud: the words said back that answered it ("yes, do it"), shown on its card. */
  said?: string;
  /** Went in without a card (said yes to before, or inside an agreed investigation — W3): shown as a receipt. */
  auto?: boolean;
  at: number;
}

/** What was done through the conversation: every write, confirmed or not. */
export type DoneAction = ColleagueAction;

/** A turn of the conversation: Line Talk's own, and on the colleague's what it used and offered. */
export type ColleagueTurn = TalkTurn & { used?: Used[]; suggestions?: string[]; /** How many figures in the answer were looked for in Faultline's working (docs/LUNA-NEXT.md L1); `unsure` the ones found nowhere. */ checked?: number };

/** A conversation's facts — the study's, with what AI Mode keeps on them. */
export type ColleagueFacts = StudyFacts & { colleague?: boolean; /** The name the person gave it (Rename) — wins over the subject's. */ named?: string; turns?: ColleagueTurn[]; threads?: Thread[]; actions?: DoneAction[]; drafts?: ColleagueDraft[] };

import { placeSaid, type WalkStop } from '../lib/walk';

export const WHO = 'Faultline';

/** The facts of a study, read as a conversation's. */
export const factsOfConversation = (s: Pick<ToolStudy, 'facts'>): ColleagueFacts => s.facts as ColleagueFacts;

/** Whether a study is an AI Mode conversation (and not a Line Talk). */
export const isConversation = (s: Pick<ToolStudy, 'tool' | 'facts'>): boolean => s.tool === 'talk' && factsOfConversation(s).colleague === true;

/** Its turns, in the order they happened. */
export const turnsOfConversation = (f: ColleagueFacts): ColleagueTurn[] =>
  [...(f.turns ?? [])].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

/* ------------------------------------------------------------------ threads */

export const currentThread = (threads: readonly Thread[]): Thread | undefined => threads.find(t => t.status === 'current');
/** The parked threads, the most recently touched first. */
export const parkedThreads = (threads: readonly Thread[]): Thread[] => threads.filter(t => t.status === 'parked').sort((a, b) => b.at - a.at);

/** A place by its most particular part: a problem, else a project, else a line, else the story. */
const placeKey = (s: ThreadScope): string =>
  s.problemId ? `problem:${s.problemId}` : s.projectId ? `project:${s.projectId}` : s.lineId ? `line:${s.lineId}` : s.storyId ? `story:${s.storyId}` : '';
const sameScope = (a: ThreadScope, b: ThreadScope): boolean => { const k = placeKey(a); return !!k && k === placeKey(b); };

/** The thread a subject belongs to: one already kept with the same place, else the same title. */
export function threadFor(threads: readonly Thread[], title: string, scope: ThreadScope = {}): Thread | undefined {
  const t = title.trim().toLowerCase();
  return threads.find(x => x.status !== 'closed' && sameScope(x.scope, scope)) ?? threads.find(x => x.status !== 'closed' && x.title.trim().toLowerCase() === t);
}

/** MAKE A SUBJECT CURRENT — an existing thread brought back, or a new one; the one that was current is parked. */
export function setCurrent(threads: readonly Thread[], title: string, scope: ThreadScope, at: number, newId: string): Thread[] {
  const had = threadFor(threads, title, scope);
  const out = threads.map(t => (t.status === 'current' && t.id !== had?.id ? { ...t, status: 'parked' as const, at } : t));
  if (had) return out.map(t => (t.id === had.id ? { ...t, status: 'current' as const, at, scope: { ...t.scope, ...scope } } : t));
  return [...out, { id: newId, title: title.trim() || 'A new subject', status: 'current', scope: { ...scope }, notes: [], refs: [], at }];
}

/** Park the current thread — nothing is current until a subject is made so. */
export const parkCurrent = (threads: readonly Thread[], at: number): Thread[] =>
  threads.map(t => (t.status === 'current' ? { ...t, status: 'parked' as const, at } : t));

/** A note on a thread (the current one when none is named), saying how it is known. Never 'verified' from here. */
export function addNote(threads: readonly Thread[], note: ThreadNote, threadId?: string): Thread[] {
  const target = threadId ? threads.find(t => t.id === threadId) : currentThread(threads);
  if (!target) return [...threads];
  const how: HowKnown = note.how === 'verified' ? 'unknown' : note.how;
  return threads.map(t => (t.id === target.id ? { ...t, notes: [...t.notes, { ...note, how }], at: note.at } : t));
}

/** Refs onto the current thread, each once. */
export function addRefs(threads: readonly Thread[], refs: readonly CapRef[]): Thread[] {
  const cur = currentThread(threads);
  if (!cur || !refs.length) return [...threads];
  return threads.map(t => (t.id === cur.id ? { ...t, refs: uniqueRefs([...t.refs, ...refs]) } : t));
}

export const refKey = (r: CapRef): string => `${r.kind}:${r.id}`;
export const uniqueRefs = (refs: readonly CapRef[]): CapRef[] => {
  const seen = new Set<string>();
  return refs.filter(r => { const k = refKey(r); if (seen.has(k)) return false; seen.add(k); return true; });
};

/** Every record the colleague read or changed in this conversation — its Sources. */
export function sourcesOf(turns: readonly ColleagueTurn[], actions: readonly DoneAction[] = []): CapRef[] {
  return uniqueRefs([...turns.flatMap(t => (t.used ?? []).filter(u => u.status === 'done').flatMap(u => u.refs)), ...actions.filter(a => a.status === 'done').flatMap(a => a.refs)]);
}

/** What kind of work a subject is, as the gateway is told it and the context panel says it. */
export const MODE_SAID: Record<NonNullable<Thread['mode']> | 'open', string> = {
  talk: 'just a conversation — nothing to keep as a record',
  standalone: 'standalone — kept on its line, in no project (the person said so; do not ask again)',
  project: 'in the project named',
  open: 'not settled — ask about a project only when a record is about to be made and the line has one',
};
/** The same, as the panel's chip says it. */
export const MODE_WORD: Record<NonNullable<Thread['mode']>, string> = { talk: 'Just talking — nothing kept', standalone: 'Standalone — in no project', project: 'In the project' };

/** How it is known, in words — on the note's pill. */
export const HOW_WORD: Record<HowKnown, string> = {
  observed: 'Observed', reported: 'Reported', measured: 'Measured', imported: 'Imported', calculated: 'Calculated', estimated: 'Estimated', hypothesised: 'Hypothesised', verified: 'Verified', unknown: 'Unknown',
};

/** A scope said in words — "line Line 3 · project Wrapper uptime". `names` turns an id into a name where one is known. */
export function scopeSaid(scope: ThreadScope, names: (kind: 'line' | 'project' | 'problem' | 'story', id: string) => string | undefined = () => undefined): string {
  const bits: string[] = [];
  if (scope.lineId) bits.push(`line ${names('line', scope.lineId) ?? scope.lineId} [${scope.lineId}]`);
  if (scope.projectId) bits.push(`project ${names('project', scope.projectId) ?? scope.projectId} [${scope.projectId}]`);
  if (scope.problemId) bits.push(`problem ${names('problem', scope.problemId) ?? scope.problemId} [${scope.problemId}]`);
  if (scope.storyId) bits.push(`story ${names('story', scope.storyId) ?? scope.storyId} [${scope.storyId}]`);
  if (scope.machine) bits.push(`machine ${scope.machine}`);
  if (scope.studyId) bits.push(`record [${scope.studyId}]`);
  return bits.join(' · ');
}

/** THE FOCUS AS THE GATEWAY READS IT — the current thread with its place and notes, then the parked ones by title, then
 *  the photos the person can have attached by key. */
export function focusText(threads: readonly Thread[], opts: { names?: Parameters<typeof scopeSaid>[1]; photos?: { label: string; key: string; said?: string }[]; outputs?: string; files?: readonly string[]; position?: WalkStop; trail?: readonly WalkStop[]; drafts?: readonly ColleagueDraft[]; imports?: readonly { id: string; name: string; rows: readonly unknown[] }[]; workbooks?: readonly { id: string; name: string; status: string; sheets?: readonly { name: string; rows: number }[] }[]; /** What the client's words mean (colleague/notebook notebookText). */ notebook?: string; /** Beside a page: what is on the screen beside the conversation (W2). */ screen?: string; /** The client the person is in, chosen in the top bar when the lines name more than one ('' = all clients) — lib/activeClient, C1. */ client?: string } = {}): string {
  const cur = currentThread(threads);
  const parked = parkedThreads(threads);
  const lines: string[] = [];
  if (cur) {
    const where = scopeSaid(cur.scope, opts.names);
    lines.push(`Current: ${cur.title}${where ? ` (${where})` : ''} [thread ${cur.id}]`);
    /* what it is for and what kind of work it is (9 November, docs/AI-CONTEXT.md) — settled once, never asked again */
    if (cur.objective) lines.push(`  Aim: ${cur.objective}`);
    lines.push(`  Kind of work: ${MODE_SAID[cur.mode ?? 'open']}`);
    for (const n of cur.notes.slice(-12)) lines.push(`  - ${n.text} (${HOW_WORD[n.how].toLowerCase()})`);
    for (const p of (cur.points ?? []).slice(-10)) lines.push(`  ${p.kind === 'question' ? (p.answered ? `Answered: ${p.text} — ${p.answered}` : `Still to answer: ${p.text}`) : `${p.kind === 'decision' ? 'Decided' : 'Assumed'}: ${p.text}`}`);
    /* the task being worked, and a step handed to the person (10 November, docs/AI-TASK.md, docs/AI-TOOL-INTELLIGENCE.md) */
    if (cur.task) lines.push(`  Task: ${cur.task.goal} — steps ${cur.task.steps.join(' → ')} (task_state reads where it stands)`);
    if (cur.awaiting) lines.push(`  Handed over to the person: ${cur.awaiting.does} (${cur.awaiting.tool}) — “${cur.awaiting.handover}” (handover_state reads whether it is done)`);
    const touched = cur.refs.filter(r => r.kind !== 'page').slice(-8);
    if (touched.length) lines.push(`  Records touched: ${touched.map(r => `${r.kind} ${r.label} [${r.id}]`).join('; ')}`);
  } else lines.push('Current: nothing yet — the person has not said what this is about.');
  /* WHAT IS ON THE SCREEN BESIDE HER (docs/LUNA-WORKSPACE.md W2): "this page", "here" and "this" can mean it */
  if (opts.screen) lines.push(`On the screen beside the conversation: ${opts.screen} — "this page", "here" and "this" can mean it; what the person is looking at, not necessarily what the conversation is about.`);
  /* THE CLIENT THE PERSON IS IN (11 November, docs/CONSULTANT-WORKSPACE.md C1): with no line in hand, the work is that client's */
  if (opts.client !== undefined) lines.push(opts.client
    ? `The client the person is working in: ${opts.client} (chosen in the app's top bar) — with no line in hand the work is ${opts.client}'s; never bring in another client's lines, problems or records.`
    : 'The client the person is working in: all clients (chosen in the app\'s top bar) — say whose business a record is when it matters, and never mix two clients in one answer without saying so.');
  /* WHAT THEIR WORDS MEAN (docs/LUNA-NEXT.md L3): the client's notebook and the person's own, confirmed by them */
  if (opts.notebook) lines.push(opts.notebook);
  if (parked.length) lines.push(`Parked: ${parked.map(t => `${t.title}${scopeSaid(t.scope, opts.names) ? ` (${scopeSaid(t.scope, opts.names)})` : ''}${t.mode ? ` — ${MODE_SAID[t.mode]}` : ''} [thread ${t.id}]`).join('; ')}`);
  if (opts.workbooks?.length) lines.push(`Workbooks attached (read on this device, asked with workbook_profile, query_workbook and workbook_rows): ${opts.workbooks.map(w => `“${w.name}” [${w.id}] ${w.status}${w.sheets?.length ? ` — ${w.sheets.map(x => `${x.name} ${x.rows} rows`).join(', ')}` : ''}`).join('; ')}`);
  if (opts.imports?.length) lines.push(`Files read in code (imported evidence): ${opts.imports.map(i => `“${i.name}” [${i.id}], ${i.rows.length} rows`).join('; ')} — pareto with importId`);
  /* THE WALK (10 November, docs/FACTORY-WALK.md): where the person is — not what they are talking about — and the stops so far */
  if (opts.position) lines.push(`Where the person is: ${placeSaid(opts.position) || 'a place not named'} (${opts.position.how === 'picked' ? 'picked on the screen' : 'said'} at ${new Date(opts.position.at).toTimeString().slice(0, 5)})${opts.position.lineId ? ` [line ${opts.position.lineId}]` : ''}${opts.position.departmentId ? ` [department ${opts.position.departmentId}]` : ''}`);
  else lines.push('Where the person is: not said — ask only if it matters, never guess it.');
  if (opts.trail && opts.trail.length > 1) lines.push(`The walk so far: ${opts.trail.slice(-8).map(x => `${placeSaid(x)} ${new Date(x.at).toTimeString().slice(0, 5)}`).join(' → ')}`);
  /* WHAT THERE IS AND WHAT WE HAVE MADE (docs/CONVERSATIONAL-DATA.md) — the files in the register and this conversation's results, charts
     and reports, newest first: what a name, "that" or "the other file" can point at */
  if (opts.files?.length) lines.push(`Files in the register (ask with query_data by their source id; resolve_source when the person names one):\n${opts.files.map(f => `  ${f}`).join('\n')}`);
  if (opts.outputs) lines.push(`Made in this conversation (newest first):\n${opts.outputs.split('\n').map(l => `  ${l}`).join('\n')}`);
  if (opts.photos?.length) lines.push(`Photos in this conversation: ${opts.photos.map(p => p.said ?? `${p.label} = photoKey ${p.key}`).join('; ')}`);
  /* what is being built from the conversation (docs/AI-MODE.md, Building tools in conversation): each draft with its id, what is
     captured and how known, and what is missing — the newest six, a long one cut */
  for (const d of [...(opts.drafts ?? [])].sort((a, b) => b.at - a.at).slice(0, 6)) {
    const w = draftSaid(d);
    /* a factory's tree is longer than a tool's fields — it is given more room */
    const max = d.kind === 'factory' ? 3000 : 900;
    lines.push(`Being built [draft ${d.id}]: ${w.length > max ? `${w.slice(0, max - 3)}…` : w}`);
  }
  return lines.join('\n');
}

/* --------------------------------------------------------------- the turns */

/** What the gateway is sent as the conversation: every turn not struck and answered, the person's and the colleague's. */
export interface GatewayTurn { role: 'person' | 'colleague'; text: string; at: string; photo?: string }

export function gatewayTurns(turns: readonly ColleagueTurn[], labels: ReadonlyMap<string, string>): GatewayTurn[] {
  return turns.filter(t => !t.struck && !(t.kind === 'reply' && t.answering)).flatMap((t): GatewayTurn[] => {
    const at = new Date(t.at).toISOString();
    if (t.kind === 'reply') {
      const did = (t.used ?? []).map(u => `[${u.title}: ${u.status === 'done' ? u.says : `${u.status} — ${u.says}`}]`).join(' ');
      const text = [t.text ?? '', did].filter(Boolean).join('\n');
      return text ? [{ role: 'colleague', text, at }] : [];
    }
    if (t.kind === 'photo') {
      const label = labels.get(t.id) ?? 'P0';
      return [{ role: 'person', text: `${t.text?.trim() ? `${t.text.trim()} ` : ''}(photo ${label}, photoKey ${t.media?.blobKey ?? 'not on this device'})`, at, photo: label }];
    }
    const w = (t.text ?? t.heard ?? '').trim();
    return w ? [{ role: 'person', text: w, at }] : [];
  });
}

/** The person's turns since the colleague last answered — what Send asks about. */
export function unansweredTurns(turns: readonly ColleagueTurn[]): ColleagueTurn[] {
  let from = 0;
  turns.forEach((t, i) => { if (t.kind === 'reply' && !t.answering) from = i + 1; });
  return turns.slice(from).filter(t => t.kind !== 'reply' && !t.struck);
}

/** A conversation's title — the current thread's, else its first words, else the day. */
export function conversationTitle(f: ColleagueFacts, fallback: string): string {
  if (typeof f.named === 'string' && f.named.trim()) return f.named.trim();
  const cur = currentThread(f.threads ?? []);
  if (cur) return cur.title;
  const first = turnsOfConversation(f).find(t => t.kind === 'typed' || t.kind === 'said');
  const w = (first?.text ?? first?.heard ?? '').trim();
  return w ? (w.length > 60 ? `${w.slice(0, 57).trimEnd()}…` : w) : fallback;
}

/** A new conversation's record — a study of tool `talk`, marked as the colleague's, with a thread already current when
 *  it was opened from a line or a project. */
export function newConversation(o: { id: string; at: number; name: string; ownerId?: string; thread?: { id: string; title: string; scope: ThreadScope } }): ToolStudy {
  const threads: Thread[] = o.thread ? [{ id: o.thread.id, title: o.thread.title, status: 'current', scope: o.thread.scope, notes: [], refs: [], at: o.at }] : [];
  const facts: ColleagueFacts = { colleague: true, turns: [], threads, actions: [] };
  return { id: o.id, tool: 'talk', name: o.name, ...(o.ownerId ? { ownerId: o.ownerId } : {}), facts, uses: [], startedAt: o.at, createdAt: o.at, updatedAt: o.at } as ToolStudy;
}

/* -------------------------------------------- writing it (db patchStudy) */

type Patch = (id: string, patch: (cur: ToolStudy) => Partial<ToolStudy>) => Promise<void>;

const withFacts = (cur: ToolStudy, next: (f: ColleagueFacts) => Partial<ColleagueFacts>) => {
  const f = factsOfConversation(cur);
  return { facts: { ...f, ...next(f) } as StudyFacts };
};

export const appendTurn = (patch: Patch, id: string, t: ColleagueTurn) => patch(id, cur => withFacts(cur, f => ({ turns: [...(f.turns ?? []), t] })));

export const changeTurn = (patch: Patch, id: string, turnId: string, change: (t: ColleagueTurn) => ColleagueTurn) =>
  patch(id, cur => withFacts(cur, f => ({ turns: (f.turns ?? []).map(t => (t.id === turnId ? change(t) : t)) })));

export const changeThreads = (patch: Patch, id: string, change: (ts: Thread[]) => Thread[]) =>
  patch(id, cur => withFacts(cur, f => ({ threads: change(f.threads ?? []) })));

export const appendAction = (patch: Patch, id: string, a: DoneAction) =>
  patch(id, cur => withFacts(cur, f => ({ actions: [...(f.actions ?? []).filter(x => x.callId !== a.callId), a] })));

/** A turn's used capability changed in place (a write card answered). */
export const changeUsed = (patch: Patch, id: string, turnId: string, callId: string, change: Partial<Used>) =>
  changeTurn(patch, id, turnId, t => ({ ...t, used: (t.used ?? []).map(u => (u.callId === callId ? { ...u, ...change } : u)) }));
