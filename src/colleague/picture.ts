/* WHAT STANDS NOW — THE CUSTOMER'S STANDING PICTURE, TOLD WITH EVERY QUESTION (22 November 2026, docs/LUNA-AGENT.md G3b).
 *
 * Rowland, 21 November: "Luna linked to data … no more analysis, Luna knows everything. Ask her a question … like Iron Man's Jarvis."
 *
 * G3a told her what each FILE says. This tells her how the customer in hand STANDS: each of its lines in the Today page's own word
 * (critical problems, problems open, nothing open) with the worst thing open on it, and Today's own briefing — what is past its day,
 * what is new since the person was last in, what is due. So "what needs me today?", "anything late?", "how is Line 3?" and a plain
 * "morning" are answered at once, with no step.
 *
 * ONE NUMBER, EVERYWHERE (docs/STEADY.md). Nothing is worked out here that a page does not already say:
 *   the briefing   lib/today briefing() over the very rows the Actions page reads for the active client
 *                  (lib/useProjectActions loadClientEveryAction) and the register's problems that are its — the Today page's sentences;
 *   a line's word  lib/today lineState() over its open problems — the Today page's and the Factory board's word.
 * So what Luna says from it is what the person sees when they look — and every figure in it is the app's own, checked in her answer
 * as such (the turn's context is among what the figure check reads).
 *
 * WHOSE: the customer in hand's, by the scope every page filters by (capabilities/hand handScope) — never another customer's, never an
 * archived customer's. No AI. Read at most once a change of the records (it is asked for on every round of every question). */
import type { Workspace } from '../types';
import type { Snag } from '../snag/types';
import { briefing, lastSeen, lineState, type BriefItem } from '../lib/today';
import type { ClientScope } from '../lib/activeClient';

export const PICTURE = { /** How many lines are said by name. */ lines: 8, /** How long it may be. */ chars: 1100 } as const;
export const STANDS_NOW = 'What stands now';

export interface PictureLine { name: string; open: number; critical: number; /** The worst thing open on it. */ worst?: { what: string; owner?: string; late: boolean } }
export interface PictureIn { /** The customer in hand — '' when all are shown, or none is named. */ client: string; lines: readonly PictureLine[]; brief: readonly BriefItem[] }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const quote = (s: string) => `“${s.length > 60 ? `${s.slice(0, 57)}…` : s}”`;
const ORDER = 'ragwn';

/** The worst problem open on a line: critical before high before low, then one past its day, then the oldest. */
export function worstOf(open: readonly { problem: string; priority?: string; owner?: string; dueAt?: number; raisedAt?: number }[], now: number): PictureLine['worst'] {
  const rank = (p?: string) => (p === 'critical' ? 0 : p === 'high' ? 1 : 2);
  const late = (s: { dueAt?: number }) => !!s.dueAt && s.dueAt < now;
  const w = [...open].sort((a, b) => rank(a.priority) - rank(b.priority) || Number(late(b)) - Number(late(a)) || (a.raisedAt ?? 0) - (b.raisedAt ?? 0))[0];
  return w ? { what: w.problem, ...(w.owner?.trim() ? { owner: w.owner.trim() } : {}), late: late(w) } : undefined;
}

/** THE PICTURE IN WORDS — nothing when there is nothing to say (no line and no briefing). Pure. */
export function pictureSaid(p: PictureIn): string | undefined {
  if (!p.lines.length && !p.brief.length) return undefined;
  const out: string[] = [`${STANDS_NOW}${p.client ? ` for ${p.client}` : ''} — the app’s own reading of the records, in the words its pages use (a question this answers is answered from it at once, with no step; anything finer through the line’s own reads):`];
  if (p.brief.length) out.push(`  Today: ${p.brief.map(b => b.says).join(' ')}`);
  if (p.lines.length) {
    const said = p.lines.map(l => ({ l, ...lineState(l.open, l.critical) })).sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || b.l.open - a.l.open);
    const busy = said.filter(x => x.l.open > 0), quiet = said.filter(x => x.l.open === 0);
    const one = (x: typeof said[number]) => `${x.l.name} — ${x.word}${x.l.critical && x.l.open > x.l.critical ? ` (${x.l.open} open in all)` : ''}${x.l.worst ? `; the worst ${quote(x.l.worst.what)}, ${x.l.worst.owner ?? 'nobody yet'}${x.l.worst.late ? ', past its day' : ''}` : ''}`;
    const named = busy.slice(0, PICTURE.lines);
    const rest = busy.length - named.length;
    const parts = [...named.map(one), ...(rest > 0 ? [`and ${plural(rest, 'more line')} with problems open`] : [])];
    /* the lines with nothing open are named while there is room, else counted — a quiet line is still a line she knows of */
    if (quiet.length) parts.push(quiet.length <= 6 ? `nothing open on ${quiet.map(x => x.l.name).join(', ')}` : `nothing open on ${plural(quiet.length, 'other line')}`);
    out.push(`  Lines: ${parts.join(' · ')}.`);
  }
  const text = out.join('\n');
  return text.length <= PICTURE.chars ? text : `${text.slice(0, PICTURE.chars - 1).replace(/\s+\S*$/, '')}…`;
}

/** The picture from what was read: the lines in hand with their open problems, and Today's briefing of the client's rows. Pure. */
export function pictureOf(cs: Pick<ClientScope, 'client' | 'line'>, lines: readonly Pick<Workspace, 'id' | 'name'>[], open: readonly Snag[], brief: readonly BriefItem[], now: number): string | undefined {
  const mine = lines.filter(l => cs.line(l.id));
  return pictureSaid({
    client: cs.client,
    lines: mine.map(l => { const on = open.filter(s => s.workspaceId === l.id); return { name: l.name, open: on.length, critical: on.filter(s => s.priority === 'critical').length, ...(on.length ? { worst: worstOf(on, now) } : {}) }; }),
    brief,
  });
}

/* ------------------------------------------------------------------ read, and kept while the records it rests on stand
 * It is asked for on every round of every question, and a conversation writes to the database with every step (its own record) —
 * so "has anything changed" cannot be the app's one change notice. What it rests on is fingerprinted cheaply (the problems, the
 * tasks and the projects: how many, and the newest change among them); the full read — every project's owed rows, as the Actions
 * page reads them — is made again only when that moves, or once a minute while anything at all is being written. */
const kept = new Map<'now', { key: string; version: number; fp: string; at: number; text: string | undefined }>();
export const PICTURE_STALE_MS = 60_000;

/** What stands now for the customer in hand — as the Today page would say it this moment. */
export async function pictureNow(now: number = Date.now()): Promise<string | undefined> {
  const [db, { handScope }, { liveProductionLines }, { loadClientEveryAction }, { chosenClient }] = await Promise.all([import('../db'), import('../capabilities/hand'), import('../lib/lines'), import('../lib/useProjectActions'), import('../lib/activeClient')]);
  /* the database's own count of its changes — moved the moment a write lands (db/core dataVersion), never a tick later */
  const asked = db.dataVersion();
  const key = `${chosenClient()}|${new Date(now).toISOString().slice(0, 10)}`;
  const memo = kept.get('now');
  if (memo?.key === key && memo.version === asked) return memo.text;
  /* WHOSE is read afresh every time anything has changed: a customer archived this moment is out of the picture this moment */
  const cs = await handScope();
  const [ws, snags, projects, todos] = await Promise.all([db.listWorkspaces(), db.listAllSnags(), db.allProjects(), db.listAllPaceTodos()]);
  const newest = (xs: readonly { updatedAt?: number; deletedAt?: number; archivedAt?: number }[]) => xs.reduce((m, x) => Math.max(m, x.updatedAt ?? 0, x.deletedAt ?? 0, x.archivedAt ?? 0), 0);
  const fp = [cs.client, cs.clients.join('|'), cs.archived.map(c => c.name).join('|'), ws.length, newest(ws), ws.map(w => `${w.id}:${w.clientName ?? ''}:${w.name}`).join(','), snags.length, newest(snags), projects.length, newest(projects as { updatedAt?: number }[]), todos.length, newest(todos as { updatedAt?: number }[])].join('~');
  if (memo?.key === key && memo.fp === fp && Date.now() - memo.at < PICTURE_STALE_MS) { kept.set('now', { ...memo, version: asked }); return memo.text; }
  const lines = await liveProductionLines(ws);
  const live = projects.filter(p => !p.archivedAt && !(p as { deletedAt?: number }).deletedAt);
  const read = await loadClientEveryAction(cs, live);
  const open = snags.filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed');
  const text = pictureOf(cs, lines, open, briefing(read.rows, read.register, lastSeen(now)), now);
  kept.set('now', { key, version: asked, fp, at: Date.now(), text });
  return text;
}
