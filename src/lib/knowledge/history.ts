/* WHAT HAS BEEN TRIED, AND WHAT CAME OF IT (12 November, docs/LUNAR-KNOWLEDGE.md §5). For a line, a machine, or a machine and a reason:
 * every version of what LUNAR found about it, every problem and countermeasure on it (raised, its journey, closed and what was said),
 * the outcome of every fix, what people have said (accounts and reviews, attributed, each with how it is known), and the studies of the
 * machine — in time order, with one summary. Pure: the records in (read where they live by the caller), the story out. Nothing copied. */
import type { Snag } from '../../snag/types';
import type { ToolStudy } from '../study';
import { knownWord, machineOfSubject, standingOf, versionsOf, type Entry } from './model';
import { VERDICT_WORD, type Outcome } from './outcomes';

export interface HistoryAsk { machine?: string; reason?: string }
export type EventKind = 'found' | 'raised' | 'step' | 'closed' | 'outcome' | 'said' | 'study';
export interface HistoryEvent { at: number; kind: EventKind; says: string; known: string; ref?: { kind: 'problem' | 'study' | 'entry'; id: string } }
export interface History { title: string; summary: string; events: HistoryEvent[]; fixes: Outcome[]; open: Snag[]; people: Entry[] }

const norm = (s?: string) => (s ?? '').trim().toLowerCase();
const dayWords = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** The machine and reason a finding is about — from its own words, else from its subject (a lapse carries only its subject). */
const machineOf = (e: Entry) => (e.body as { machine?: string }).machine ?? machineOfSubject(e.subject);
const reasonOf = (e: Entry) => (e.body as { reason?: string }).reason ?? (/^stops:[^|]+\|(.+)$/.exec(e.subject)?.[1]);

/** Does a machine-and-reason (either may be absent) fall under what was asked? */
function under(ask: HistoryAsk, machine?: string, reason?: string): boolean {
  if (ask.machine && norm(ask.machine) !== norm(machine)) return false;
  if (ask.reason && reason && norm(ask.reason) !== norm(reason)) return false;
  return true;
}

export function historyOf(
  lineName: string,
  ask: HistoryAsk,
  r: { ledger: readonly Entry[]; snags: readonly Snag[]; outcomes: readonly Outcome[]; studies: readonly ToolStudy[] },
): History {
  const events: HistoryEvent[] = [];
  const title = ask.machine ? `${ask.reason ? `${ask.reason} on the ` : 'The '}${ask.machine} — ${lineName}` : lineName;

  /* what LUNAR found, every version */
  const findings = r.ledger.filter(e => e.kind === 'finding' && under(ask, machineOf(e), reasonOf(e)));
  for (const e of findings) events.push({ at: e.at, kind: 'found', says: `LUNAR found: ${e.says}`, known: knownWord(e.known), ref: { kind: 'entry', id: e.id } });

  /* the problems and countermeasures on it */
  const mine = r.snags.filter(s => s.deletedAt == null && under(ask, s.targetAsset, s.targetCategory));
  for (const s of mine) {
    events.push({ at: s.raisedAt, kind: 'raised', says: `Raised: ${s.problem}${s.owner ? ` (with ${s.owner})` : ''}${s.fromFinding ? ' — from what LUNAR found' : ''}`, known: 'reported', ref: { kind: 'problem', id: s.id } });
    for (const j of s.journey ?? []) events.push({ at: j.at, kind: 'step', says: `Tried: ${j.did}${j.result ? ` — ${j.result}` : ''}`, known: 'reported', ref: { kind: 'problem', id: s.id } });
    if (s.status === 'closed' && s.closedAt) events.push({ at: s.closedAt, kind: 'closed', says: `Closed: ${s.problem}${s.closeNote ? ` — “${s.closeNote}”` : ''}`, known: 'reported', ref: { kind: 'problem', id: s.id } });
  }

  /* the outcome of every fix on it — the current verdict, with the ones before it */
  const fixes = r.outcomes.filter(o => under(ask, o.fix.machine, o.fix.reason));
  for (const o of fixes) {
    const versions = versionsOf(r.ledger, `outcome:${o.subject}`);
    const earlier = versions.slice(0, -1).map(v => VERDICT_WORD[(v.body as { verdict: keyof typeof VERDICT_WORD }).verdict] ?? '').filter(Boolean);
    events.push({ at: o.fix.at, kind: 'outcome', says: `Did it work? ${VERDICT_WORD[o.verdict]}${earlier.length ? ` (said before: ${earlier.join(' → ')})` : ''}. ${o.says}`, known: knownWord(o.known), ref: { kind: o.fix.kind === 'problem' ? 'problem' : 'entry', id: o.fix.id } });
  }

  /* what people have said — accounts and reviews, attributed */
  const ids = new Set(findings.map(e => e.id));
  const people = r.ledger.filter(e => (e.kind === 'account' || e.kind === 'review')
    && ((e.about && ids.has(e.about)) || (ask.machine && e.subject.includes(`:${norm(ask.machine)}`) && (!ask.reason || e.subject.includes(`|${norm(ask.reason)}`))) || (!ask.machine && e.subject === 'line')));
  for (const e of people) events.push({ at: e.at, kind: 'said', says: `${e.by ?? 'A person'}${e.role ? ` (${e.role})` : ''} ${e.kind === 'review' ? (e.stance === 'contradicts' ? 'disagrees' : e.stance === 'supports' ? 'agrees' : 'adds') : 'says'}: “${e.says}”`, known: knownWord(e.known), ref: { kind: 'entry', id: e.id } });

  /* the studies of the machine */
  if (ask.machine) for (const s of r.studies) if (s.deletedAt == null && norm(s.machine) === norm(ask.machine)) events.push({ at: s.startedAt, kind: 'study', says: `Studied: ${s.name}`, known: 'measured', ref: { kind: 'study', id: s.id } });

  events.sort((a, b) => a.at - b.at);
  const open = mine.filter(s => s.status !== 'closed');
  return { title, summary: summaryOf(ask, lineName, findings, fixes, open, people), events, fixes, open, people };
}

function summaryOf(ask: HistoryAsk, lineName: string, findings: readonly Entry[], fixes: readonly Outcome[], open: readonly Snag[], people: readonly Entry[]): string {
  const what = ask.machine ? `${ask.reason ? `${ask.reason} on the ${ask.machine}` : `The ${ask.machine}`} (${lineName})` : lineName;
  const parts: string[] = [];
  if (fixes.length) {
    const since = Math.min(...fixes.map(f => f.fix.at));
    const tally = new Map<string, number>();
    for (const f of fixes) tally.set(VERDICT_WORD[f.verdict].toLowerCase(), (tally.get(VERDICT_WORD[f.verdict].toLowerCase()) ?? 0) + 1);
    parts.push(`${fixes.length} fix${fixes.length === 1 ? '' : 'es'} since ${dayWords(since)}: ${[...tally.entries()].map(([w, n]) => `${n} ${w}`).join(', ')}`);
  } else parts.push('nothing tried and closed yet');
  if (open.length) parts.push(`${open.length} open now`);
  const live = findings.filter(e => !standingOf(e, findings).state.match(/superseded|lapsed/));
  if (live.length) parts.push(`LUNAR's finding now: ${live[live.length - 1].says.replace(/\.$/, '')}`);
  const said = people.slice(-1)[0];
  if (said) parts.push(`${said.by ?? 'a person'}${said.kind === 'review' ? (said.stance === 'contradicts' ? ' disagrees' : ' agrees') : ' says'}: “${said.says}” (${knownWord(said.known)}) — not proven`);
  return `${what}: ${parts.join('; ')}.`;
}
