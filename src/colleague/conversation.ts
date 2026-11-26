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
import type { CapRef, ColleagueAction, ColleagueDraft, ColleagueJob, ColleagueThread, HowKnown, ThreadNote, ThreadScope } from '../capabilities/types';
import { draftSaid } from '../capabilities/drafts';
import type { TalkTurn } from '../tools/talk/talk';
import type { StudyFacts, ToolStudy } from '../lib/study';
import { lendsNothing, type FigureSource } from './figureCheck';
import { jobSaid } from './job';
import { domainFocusHint } from '../tools/colleague/colleagueDomain';

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
  /** G5 — several writes gathered on the job's one card (23 November). */
  batch?: { callIds: string[]; items: { callId: string; title: string; preview: string; input?: Record<string, unknown> }[] };
  at: number;
}

/** What was done through the conversation: every write, confirmed or not. */
export type DoneAction = ColleagueAction;

/** A turn of the conversation: Line Talk's own, and on the colleague's what it used and offered. */
export type ColleagueTurn = TalkTurn & { artifactId?: string; trackingOffer?: boolean; trackLink?: string; workbookReceipt?: boolean; actionScope?: ThreadScope; used?: Used[]; suggestions?: string[]; /** The job as it stood when this answer ended — kept when the turn planned or moved it (21 November, docs/LUNA-AGENT.md). */ job?: ColleagueJob; /** Answered by the app's own code, no AI asked (colleague/fastPath). */ byCode?: boolean; /** How many figures in the answer were looked for in the app's working (docs/LUNA-NEXT.md L1); `unsure` the ones found nowhere. */ checked?: number; /** How long the answer took (colleagueAsk Timing): ms to the first words, ms to the complete answer, the rounds — kept, never shown. */ timing?: { firstTextMs?: number; completeMs: number; rounds: number } };

/** A conversation's facts — the study's, with what AI Mode keeps on them. */
/** What the room is looking at — set when Present opens, cleared when it closes (docs/LUNA-ABILITIES.md M1). */
export type SessionFocus = { reportId: string; version: number };

export type ColleagueFacts = StudyFacts & { colleague?: boolean; /** Who is in the room with the person, as the colleague last said it ("Jason — COO of Branston"); this conversation only. */ room?: string[]; /** The name the person gave it (Rename) — wins over the subject's. */ named?: string; /** A Luna work folder this chat is in (colleague/lunaFolder) — never a Faultline 6M/PDCA project. */ folderId?: string; /** The customer this chat or folder is for — the customer in hand when it was started. */ client?: string; /** A Luna work folder (not a conversation). */ lunaFolder?: boolean; /** Report on screen in Present mode (M1). */ sessionFocus?: SessionFocus; turns?: ColleagueTurn[]; threads?: Thread[]; actions?: DoneAction[]; drafts?: ColleagueDraft[] };

import { placeSaid, type WalkStop } from '../lib/walk';

export const WHO = 'The app';

/** The facts of a study, read as a conversation's. */
export const factsOfConversation = (s: Pick<ToolStudy, 'facts'>): ColleagueFacts => s.facts as ColleagueFacts;

/** Whether a study is an AI Mode conversation (and not a Line Talk, and not a Luna work folder). */
export const isConversation = (s: Pick<ToolStudy, 'tool' | 'facts'>): boolean =>
  s.tool === 'talk' && factsOfConversation(s).colleague === true && factsOfConversation(s).lunaFolder !== true;

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
  observed: 'Observed', reported: 'Reported', measured: 'Measured', imported: 'Imported', system: 'From the system', calculated: 'Calculated', estimated: 'Estimated', hypothesised: 'Hypothesised', verified: 'Verified', unknown: 'Unknown',
};

/** A scope said in words — "line Line 3 · project Wrapper uptime". `names` turns an id into a name where one is known. */
export function scopeSaid(scope: ThreadScope, names: (kind: 'line' | 'project' | 'problem' | 'story', id: string) => string | undefined = () => undefined,placeKind?:(id:string)=>'area'|'line'): string {
  const bits: string[] = [];
  if (scope.lineId) bits.push(`${placeKind?.(scope.lineId)??'line'} ${names('line', scope.lineId) ?? scope.lineId} [${scope.lineId}]`);
  if (scope.projectId) bits.push(`project ${names('project', scope.projectId) ?? scope.projectId} [${scope.projectId}]`);
  if (scope.problemId) bits.push(`problem ${names('problem', scope.problemId) ?? scope.problemId} [${scope.problemId}]`);
  if (scope.storyId) bits.push(`story ${names('story', scope.storyId) ?? scope.storyId} [${scope.storyId}]`);
  if (scope.machine) bits.push(`machine ${scope.machine}`);
  if (scope.studyId) bits.push(`record [${scope.studyId}]`);
  return bits.join(' · ');
}

/** The words that lead what a file SAYS, under its line in the turn's context (colleague/knows). */
export const IT_SAYS = 'It says';
/** …and the words that lead what CHANGED in it since the reading before (G2b). */
export const CHANGED = 'Changed since it was read before';
/** THE FOCUS AS THE GATEWAY READS IT — the current thread with its place and notes, then the parked ones by title, then
 *  the photos the person can have attached by key. */
export function focusText(threads: readonly Thread[], opts: { names?: Parameters<typeof scopeSaid>[1];placeKind?:Parameters<typeof scopeSaid>[2]; photos?: { label: string; key: string; said?: string }[]; /** What stands now for the customer in hand (colleague/picture). */ picture?: string; outputs?: string; files?: readonly string[]; position?: WalkStop; trail?: readonly WalkStop[]; drafts?: readonly ColleagueDraft[]; imports?: readonly { id: string; name: string; rows: readonly unknown[] }[]; workbooks?: readonly { id: string; name: string; status: string; sheets?: readonly { name: string; rows: number }[] }[]; /** What the client's words mean (colleague/notebook notebookText). */ notebook?: string; /** Beside a page: what is on the screen beside the conversation (W2). */ screen?: string; /** Present mode: the conversational report on screen (M1, docs/LUNA-ROOM.md). */ present?: { reportId: string; version: number; title: string; form: 'report' | 'presentation'; sections?: string }; /** The client the person is in, chosen in the top bar when the lines name more than one ('' = all clients) — lib/activeClient, C1. */ client?: string; /** The visit in hand (lib/visits, C6) — null when none. */ visit?: { client: string; site?: string; day: string; since: string; brief?: string } | null; /** Who she is talking to and in what capacity — colleague/person personSaid (docs/ARCHITECTURE.md §9). Never a permission. */ person?: string; /** Who is with the person — a meeting room, a walk — as the colleague kept it (PEOPLE IN THE ROOM). */ room?: readonly string[] } = {}): string {
  const cur = currentThread(threads);
  const parked = parkedThreads(threads);
  const lines: string[] = [];
  if (cur) {
    const where = scopeSaid(cur.scope, opts.names,opts.placeKind);
    lines.push(`Current: ${cur.title}${where ? ` (${where})` : ''} [thread ${cur.id}]`);
    /* what it is for and what kind of work it is (9 November, docs/AI-CONTEXT.md) — settled once, never asked again */
    if (cur.objective) lines.push(`  Aim: ${cur.objective}`);
    lines.push(`  Kind of work: ${MODE_SAID[cur.mode ?? 'open']}`);
    for (const n of cur.notes.slice(-12)) lines.push(`  - ${n.text} (${HOW_WORD[n.how].toLowerCase()})`);
    for (const p of (cur.points ?? []).slice(-10)) lines.push(`  ${p.kind === 'question' ? (p.answered ? `Answered: ${p.text} — ${p.answered}` : `Still to answer: ${p.text}`) : `${p.kind === 'decision' ? 'Decided' : 'Assumed'}: ${p.text}`}`);
    /* the task being worked, and a step handed to the person (10 November, docs/AI-TASK.md, docs/AI-TOOL-INTELLIGENCE.md) */
    if (cur.task) lines.push(`  Task: ${cur.task.goal} — steps ${cur.task.steps.join(' → ')} (task_state reads where it stands)`);
    /* the job she has taken (21 November, docs/LUNA-AGENT.md): its goal, every step with where it stands, and the step in hand */
    if (cur.job) lines.push(...jobSaid(cur.job));
    const domainHint = domainFocusHint(cur);
    if (domainHint) lines.push(domainHint);
    if (cur.awaiting) lines.push(`  Handed over to the person: ${cur.awaiting.does} (${cur.awaiting.tool}) — “${cur.awaiting.handover}” (handover_state reads whether it is done)`);
    const touched = cur.refs.filter(r => r.kind !== 'page').slice(-8);
    if (touched.length) lines.push(`  Records touched: ${touched.map(r => `${r.kind} ${r.label} [${r.id}]`).join('; ')}`);
  } else lines.push('Current: nothing yet — the person has not said what this is about.');
  /* WHAT IS ON THE SCREEN BESIDE HER (docs/LUNA-WORKSPACE.md W2): "this page", "here" and "this" can mean it */
  if (opts.screen) lines.push(`On the screen beside the conversation: ${opts.screen} — "this page", "here" and "this" can mean it; what the person is looking at, not necessarily what the conversation is about.`);
  /* PRESENT MODE (M1, docs/LUNA-ROOM.md): the conversational report fullscreen — "the chart", section headings and "on screen" mean it */
  if (opts.present) {
    const sect = opts.present.sections?.trim();
    lines.push(`On screen (Present mode): ${opts.present.form === 'presentation' ? 'Presentation' : 'Report'} ${opts.present.reportId} v${opts.present.version} — “${opts.present.title}”. The room is looking at this report; “this report”, “the chart”, section headings and “on screen” mean it unless the person names another.${sect ? ` Sections in order: ${sect}.` : ''} In the room, resolve_report_section then patch_report to change one section — re-ask the data in code; read_workbook_as stays on a card when how a file is read changes.`);
  }
  /* THE CLIENT THE PERSON IS IN (11 November, docs/CONSULTANT-WORKSPACE.md C1): with no line in hand, the work is that client's */
  if (opts.person) lines.push(opts.person);
  if (opts.room?.length) lines.push(`In the room with them now: ${opts.room.join(' | ')} — greet and address them by name; a guest's question is answered to them, at the depth of their role; nothing of another business is said.`);
  if (opts.client !== undefined) lines.push(opts.client
    ? `The client the person is working in: ${opts.client} (chosen in the app's top bar) — use ${opts.client} for routine work. For an expressly named file or business, use the lookup and respect the account access it returns.`
    : 'The client the person is working in: all clients (chosen in the app\'s top bar) — say whose business a record is when it matters, and never mix two clients in one answer without saying so.');
  /* THE VISIT IN HAND (11 November, docs/CONSULTANT-WORKSPACE.md C6): the customer, its site, the day and what was asked at the door */
  if (opts.visit !== undefined) lines.push(opts.visit
    ? `The visit in hand: ${opts.visit.client}${opts.visit.site ? `, ${opts.visit.site}` : ''}, ${opts.visit.day}, since ${opts.visit.since}${opts.visit.brief ? ` — asked: “${opts.visit.brief}”` : ''}. What the person captures now is this visit's, at ${opts.visit.client}; visit_state reads what has been captured.`
    : 'No visit in hand — start_visit when the person says they are at a customer.');
  /* WHAT STANDS NOW (22 November, colleague/picture — G3b): the customer in hand's lines in the Today page's own words, and Today's
     own briefing — so what needs the person, what is late and how a line is are answered at once, with no step */
  if (opts.picture) lines.push(opts.picture);
  /* WHAT THEIR WORDS MEAN (docs/LUNA-NEXT.md L3): the client's notebook and the person's own, confirmed by them */
  if (opts.notebook) lines.push(opts.notebook);
  if (parked.length) lines.push(`Parked: ${parked.map(t => `${t.title}${scopeSaid(t.scope, opts.names,opts.placeKind) ? ` (${scopeSaid(t.scope, opts.names,opts.placeKind)})` : ''}${t.mode ? ` — ${MODE_SAID[t.mode]}` : ''} [thread ${t.id}]`).join('; ')}`);
  if (opts.workbooks?.length) lines.push(`Workbooks attached (read on the device, the file kept for the person's other devices up to 50 MB; asked with workbook_profile, query_workbook and workbook_rows): ${opts.workbooks.map(w => `“${w.name}” [${w.id}] ${w.status}${w.sheets?.length ? ` — ${w.sheets.map(x => `${x.name} ${x.rows} rows`).join(', ')}` : ''}`).join('; ')}`);
  if (opts.imports?.length) lines.push(`Files read in code (imported evidence): ${opts.imports.map(i => `“${i.name}” [${i.id}], ${i.rows.length} rows`).join('; ')} — pareto with importId`);
  /* THE WALK (10 November, docs/FACTORY-WALK.md): where the person is — not what they are talking about — and the stops so far */
  if (opts.position) lines.push(`Where the person is: ${placeSaid(opts.position) || 'a place not named'} (${opts.position.how === 'picked' ? 'picked on the screen' : 'said'} at ${new Date(opts.position.at).toTimeString().slice(0, 5)})${opts.position.lineId ? ` [line ${opts.position.lineId}]` : ''}${opts.position.departmentId ? ` [department ${opts.position.departmentId}]` : ''}`);
  else lines.push('Where the person is: not said — ask only if it matters, never guess it.');
  if (opts.trail && opts.trail.length > 1) lines.push(`The walk so far: ${opts.trail.slice(-8).map(x => `${placeSaid(x)} ${new Date(x.at).toTimeString().slice(0, 5)}`).join(' → ')}`);
  /* WHAT WE HAVE MADE (docs/CONVERSATIONAL-DATA.md) — this conversation's results, charts and reports, newest first: what "that" or
     "the chart" can point at */
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
  /* WHAT THERE IS — THE FILES, LAST, AND WITHIN WHAT IS LEFT (22 November, the review). The gateway takes FOCUS_MAX characters of this
     and cuts the rest without a word; the files, each with what it says and what changed, are the one part that grows with the
     customer — so they come after everything this conversation is working on (its results, photos and drafts are never what falls
     off the end), and they are fitted on the device: newest first, a file whole, else without what changed, else its line alone,
     and the rest counted. */
  let head = lines.join('\n');
  if (head.length > FOCUS_MAX - 120) head = `${head.slice(0, FOCUS_MAX - 120).replace(/\n[^\n]*$/, '')}\n(The rest of this context was too long to send — ask the app for what is not here.)`;
  const files = opts.files?.length ? filesBlock(opts.files, FOCUS_MAX - head.length - 1) : '';
  return files ? `${head}\n${files}` : head;
}

/** How much of the turn's context is sent: the gateway takes 12,000 characters (tools/colleague/colleagueAssist COLLEAGUE_LIMITS
 *  focusChars) and the loop may add the Stop note after it (colleagueAsk STOP_NOTE) — a test holds the three together. */
export const FOCUS_MAX = 11_700;

/** The files block, fitted into `room` characters: its heading, then each file newest first — whole (its line, what it says, what
 *  changed), else without what changed, else its line alone; the first that will not fit even so ends the list, the rest counted. */
export function filesBlock(files: readonly string[], room: number): string {
  const n = files.length;
  const none = `Files in the register: ${n} — not listed here (this context is full); list_sources lists them.`;
  const more = (k: number) => `  … and ${k} more ${k === 1 ? 'file' : 'files'} not listed here (this context is full) — list_sources lists them`;
  const heading = (body: string) => `Files in the register (ask with query_data by their source id; resolve_source when the person names one${body.includes(`${IT_SAYS}:`) ? `; “${IT_SAYS}” under a file is its headline, worked by the app when it was read — a question it answers is answered from it, with no step${body.includes(`\n    ${CHANGED}`) ? `; “${CHANGED}” is what moved between its last two readings, with the day the newer one came in` : ''}` : ''}):`;
  /* the longest the heading can be, and the line that counts the rest, are kept room for */
  let left = room - 430 - 110;
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const whole = `  ${files[i]}`, parts = whole.split('\n');
    const fit = [whole, parts.filter(x => !x.trimStart().startsWith(CHANGED)).join('\n'), parts[0]].find(x => x.length + 1 <= left);
    if (fit === undefined) { out.push(more(n - i)); break; }
    out.push(fit);
    left -= fit.length + 1;
  }
  if (out.length === 1 && n > 0 && out[0] === more(n)) return room >= none.length ? none : '';
  const body = out.join('\n');
  return `${heading(body)}\n${body}`;
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

/** What the app's own code said in the conversation — a workbook's first look, an answer worked in code (byCode). Its figures are the
 *  app's working, so the figure check counts them as backed (20 November — the first look's 13,029 was marked "to check" when Luna
 *  quoted it). Never sent to the gateway beyond the turn itself. */
export const workedInCode = (turns: readonly ColleagueTurn[]): string[] => turns.filter(t => t.kind === 'reply' && t.byCode && !t.struck && t.text).map(t => t.text as string);

/** What each step that RAN in the conversation's answers said — the app's working, for a later answer's figure check (turnRules
 *  earlierResults). Read from the turns themselves (21 November): the steps used to reach a later answer only as the first bracketed
 *  line of the turn's text, so one step whose sentence ran over a line dropped every step after it — and "7.93%", "87%" and "1,636",
 *  each worked out by the app two answers earlier, were marked Check this (docs/LUNA-EVAL.md §6). Never Luna's own words; never a step
 *  that failed, was refused or declined; never a sum that rested on a figure nobody gave (figureCheck lendsNothing); never a struck turn. */
export function earlierSteps(turns: readonly ColleagueTurn[]): FigureSource[] {
  return turns.filter(t => t.kind === 'reply' && !t.struck)
    .flatMap(t => (t.used ?? []).filter(u => u.status === 'done' && !!u.says && !lendsNothing(u)).map(u => ({ says: u.says })));
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
 *  it was opened from a line or a project. `folderId` puts it in a Luna work folder (colleague/lunaFolder). */
export function newConversation(o: { id: string; at: number; name: string; ownerId?: string; thread?: { id: string; title: string; scope: ThreadScope }; folderId?: string; client?: string }): ToolStudy {
  const threads: Thread[] = o.thread ? [{ id: o.thread.id, title: o.thread.title, status: 'current', scope: o.thread.scope, notes: [], refs: [], at: o.at }] : [];
  const facts: ColleagueFacts = { colleague: true, turns: [], threads, actions: [], ...(o.folderId ? { folderId: o.folderId } : {}), ...(o.client?.trim() ? { client: o.client.trim() } : {}) };
  return { id: o.id, tool: 'talk', name: o.name, ...(o.ownerId ? { ownerId: o.ownerId } : {}), facts, uses: [], startedAt: o.at, createdAt: o.at, updatedAt: o.at } as ToolStudy;
}

/* -------------------------------------------- writing it (db patchStudy) */

type Patch = (id: string, patch: (cur: ToolStudy) => Partial<ToolStudy>) => Promise<void>;

const withFacts = (cur: ToolStudy, next: (f: ColleagueFacts) => Partial<ColleagueFacts>) => {
  const f = factsOfConversation(cur);
  return { facts: { ...f, ...next(f) } as StudyFacts };
};

export const appendTurn = (patch: Patch, id: string, t: ColleagueTurn) => patch(id, cur => withFacts(cur, f => ({ turns: [...(f.turns ?? []), t.kind === 'reply' && !t.actionScope ? {...t,actionScope:{...(currentThread(f.threads ?? [])?.scope ?? {})}} : t] })));

export const changeTurn = (patch: Patch, id: string, turnId: string, change: (t: ColleagueTurn) => ColleagueTurn) =>
  patch(id, cur => withFacts(cur, f => ({ turns: (f.turns ?? []).map(t => (t.id === turnId ? change(t) : t)) })));

export const changeThreads = (patch: Patch, id: string, change: (ts: Thread[]) => Thread[]) =>
  patch(id, cur => withFacts(cur, f => ({ threads: change(f.threads ?? []) })));

export const appendAction = (patch: Patch, id: string, a: DoneAction) =>
  patch(id, cur => withFacts(cur, f => ({ actions: [...(f.actions ?? []).filter(x => x.callId !== a.callId), a] })));

/** Set what the room is looking at (Present opens; M1). */
export const setSessionFocus = (patch: Patch, id: string, focus: SessionFocus) =>
  patch(id, cur => withFacts(cur, () => ({ sessionFocus: focus })));

/** Clear present focus when the person leaves Present. */
export const clearSessionFocus = (patch: Patch, id: string) =>
  patch(id, cur => withFacts(cur, () => ({ sessionFocus: undefined })));

/** A turn's used capability changed in place (a write card answered). */
export const changeUsed = (patch: Patch, id: string, turnId: string, callId: string, change: Partial<Used>) =>
  changeTurn(patch, id, turnId, t => ({ ...t, used: (t.used ?? []).map(u => (u.callId === callId ? { ...u, ...change } : u)) }));
