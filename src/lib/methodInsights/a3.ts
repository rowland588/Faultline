/* THE A3'S OWN READING OF ITS PROJECT (docs/METHODS.md §17; knowledge/methods/rca/a3.md — Sobek & Smalley 2008, Shook 2008).
 * What only an A3 knows is wrong: a countermeasure that names no cause is a to-do, not a countermeasure; a follow-up with no day
 * is a page that will never be finished; a follow-up whose day has passed with nothing written is the A3 that was never finished;
 * a cause with no word on how it is known is an opinion. ONE reading (`a3Reading`) serves the dashboard (`a3Insight`) and the
 * project report's A3 sections (project/method/report/a3), so the two cannot say different things. Pure. A day the team typed
 * is read only where it can be read (an ISO date, "7 Nov", "7 November 2026", "7/11") — otherwise it is named as not understood,
 * never guessed. A countermeasure carries no "done" tick on the sheet, so a day that has passed is asked about ("is it done?"),
 * never called late. */
import { cmWritten, parseCm, type Countermeasure } from '../../project/method/shapes/a3Model';
import { daysBetween, niceDay } from '../weeks';
import type { MethodInsight, MethodInsightFn } from '../methodInsight';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const valid = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };

/** The first day found in the words, as an ISO date; '' when there is none. A day with no year is read in today's year. */
export function dayIn(text: string, today: string): string {
  const t = (text ?? '').toLowerCase();
  const year = Number(today.slice(0, 4));
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m && valid(+m[1]!, +m[2]!, +m[3]!)) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?(?:,?\s+(\d{4}))?/.exec(t);
  if (m) { const mo = MONTHS.indexOf(m[2]!.slice(0, 3)) + 1, y = m[3] ? +m[3] : year; if (mo && valid(y, mo, +m[1]!)) return `${y}-${pad(mo)}-${pad(+m[1]!)}`; }
  m = /\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/.exec(t);
  if (m) { const mo = MONTHS.indexOf(m[1]!.slice(0, 3)) + 1, y = m[3] ? +m[3] : year; if (mo && valid(y, mo, +m[2]!)) return `${y}-${pad(mo)}-${pad(+m[2]!)}`; }
  m = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(t);
  if (m) { const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : year; if (valid(y, +m[2]!, +m[1]!)) return `${y}-${pad(+m[2]!)}-${pad(+m[1]!)}`; }
  return '';
}

export interface CmReading {
  n: number; cm: Countermeasure;
  /** The day read from "by when", '' when there is none or it cannot be read. */
  due: string;
  noCause: boolean; noWho: boolean; noDay: boolean; unreadDay: boolean;
  /** The day has passed and the page's follow-up has not been written, so nothing says it was done. */
  passed: boolean;
  /** Its state in words. */
  state: string;
  tone: 'a' | 'n' | undefined;
}
export interface FollowReading {
  /** The follow-up day as typed, and as read. */
  said: string; due: string;
  /** What it showed — written or not. */
  held: boolean;
  status: 'checked' | 'overdue' | 'coming' | 'noday' | 'unread' | 'notyet';
  /** How many days past (overdue) or to go (coming). */
  days: number;
  /** In words. */
  says: string;
  tone: 'r' | 'a' | 'n' | 'g';
}
export interface A3Reading {
  cms: CmReading[];
  follow: FollowReading;
  /** A root cause is written but nothing says how each cause is known. */
  evidenceMissing: boolean;
  /** Things that need a look, worst first. */
  attention: { text: string; tone: 'r' | 'a' | 'n' }[];
  next?: string;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const quote = (s: string) => (s.length > 48 ? `${s.slice(0, 47).trimEnd()}…` : s);

export function a3Reading(answers: Readonly<Record<string, string>>, today: string): A3Reading {
  const v = (id: string) => (answers[id] ?? '').trim();
  const held = v('held') !== '';
  const cms: CmReading[] = cmWritten(answers).map(({ n, cm }) => {
    const c = parseCm(`${cm.what} | ${cm.who} | ${cm.when} | ${cm.cause}`);
    const due = dayIn(c.when, today);
    const noCause = !c.cause.trim(), noWho = !c.who.trim(), noDay = !c.when.trim(), unreadDay = !!c.when.trim() && !due;
    const passed = !!due && due < today && !held;
    const issues = [noCause && 'Cause not named', noWho && 'No owner', noDay && 'No day', unreadDay && 'Day not understood', passed && 'Day passed — is it done?'].filter(Boolean) as string[];
    return { n, cm: c, due, noCause, noWho, noDay, unreadDay, passed, state: issues.length ? issues.join(' · ') : 'Open', tone: noCause || noWho || passed ? 'a' as const : issues.length ? 'n' as const : undefined };
  });

  const fdue = dayIn(v('followdate'), today);
  let follow: FollowReading;
  if (held) follow = { said: v('followdate'), due: fdue, held, status: 'checked', days: 0, says: 'What the follow-up showed is written.', tone: 'g' };
  else if (!v('followdate')) follow = { said: '', due: '', held, status: cms.length ? 'noday' : 'notyet', days: 0, says: cms.length ? 'No follow-up day is set — without one the page is never finished.' : 'The follow-up comes after the countermeasures.', tone: cms.length ? 'a' : 'n' };
  else if (!fdue) follow = { said: v('followdate'), due: '', held, status: 'unread', days: 0, says: `The follow-up day “${quote(v('followdate'))}” is not a date this page can read — write it as 28 Nov or 2026-11-28.`, tone: 'n' };
  else if (fdue < today) { const d = daysBetween(fdue, today); follow = { said: v('followdate'), due: fdue, held, status: 'overdue', days: d, says: `The follow-up was due on ${niceDay(fdue, { year: true })} — ${plural(d, 'day')} ago — and what it showed is not written. The page lives until it is.`, tone: 'r' }; }
  else { const d = daysBetween(today, fdue); follow = { said: v('followdate'), due: fdue, held, status: 'coming', days: d, says: d === 0 ? `The follow-up is due today (${niceDay(fdue, { year: true })}).` : `The follow-up is due on ${niceDay(fdue, { year: true })} — in ${plural(d, 'day')}.`, tone: 'n' }; }

  const evidenceMissing = v('root') !== '' && v('evidence') === '';
  const attention: A3Reading['attention'] = [];
  if (follow.status === 'overdue') attention.push({ tone: 'r', text: follow.says });
  const noCause = cms.filter(c => c.noCause);
  if (noCause.length) attention.push({ tone: 'a', text: `${plural(noCause.length, 'countermeasure')} name${noCause.length === 1 ? 's' : ''} no cause (${noCause.slice(0, 2).map(c => `${c.n}. ${quote(c.cm.what || 'no words yet')}`).join('; ')}${noCause.length > 2 ? ` and ${noCause.length - 2} more` : ''}) — a to-do, not a countermeasure. Say which cause each answers, or take it off the page.` });
  if (follow.status === 'noday') attention.push({ tone: 'a', text: follow.says });
  if (evidenceMissing) attention.push({ tone: 'a', text: 'A root cause is written but not how it is known — say whether each cause was measured, counted, seen or only told. A cause only told is still to prove.' });
  const passed = cms.filter(c => c.passed);
  if (passed.length) attention.push({ tone: 'a', text: `${plural(passed.length, 'countermeasure')} ${passed.length === 1 ? 'was' : 'were'} due before today (${passed.slice(0, 2).map(c => `${c.n}. ${quote(c.cm.what)} — ${niceDay(c.due)}`).join('; ')}${passed.length > 2 ? ` and ${passed.length - 2} more` : ''}) and the sheet does not say they are done — ask the owner.` });
  const noWho = cms.filter(c => c.noWho);
  if (noWho.length) attention.push({ tone: 'a', text: `${plural(noWho.length, 'countermeasure')} ${noWho.length === 1 ? 'has' : 'have'} no owner — a countermeasure nobody owns does not happen.` });
  const noDay = cms.filter(c => c.noDay || c.unreadDay);
  if (noDay.length) attention.push({ tone: 'n', text: `${plural(noDay.length, 'countermeasure')} ${noDay.length === 1 ? 'has' : 'have'} no day the page can read.` });
  attention.sort((a, b) => ({ r: 0, a: 1, n: 2 }[a.tone] - { r: 0, a: 1, n: 2 }[b.tone]));

  const first = noCause[0];
  const next = follow.status === 'overdue' ? 'Check the number now and write what it showed under Follow-up — the page lives until it is.'
    : first ? `Say which cause countermeasure ${first.n} (“${quote(first.cm.what || 'no words yet')}”) answers — or take it off the page.`
      : follow.status === 'noday' ? 'Set the follow-up day — when the number will be checked.' : undefined;
  return { cms, follow, evidenceMissing, attention, ...(next ? { next } : {}) };
}

export const a3Insight: MethodInsightFn = (x): MethodInsight => {
  const r = a3Reading(x.answers, x.today);
  return { ...(r.attention.length ? { attention: r.attention.map(a => ({ kind: 'finding' as const, tone: a.tone, text: a.text })) } : {}), ...(r.next ? { next: r.next } : {}) };
};
