/* SINCE YOU LAST LOOKED — what changed on a job between this device's last
 * visit and now, in one line (docs/LEAN40.md, the stage gate's evolution,
 * step 1).
 *
 * Rowland, 10 October: "What can be done right now to give it the evolution
 * that I could actually say this is Lean 4.0?" — the fourth answer: the job
 * tells you what changed; you do not go looking.
 *
 * NOTHING IS WRITTEN. The records already say when they last changed
 * (`updatedAt`, `createdAt`) and the day each thing was done (`ranOn` /
 * `ranTo`); the last visit is kept on the device (ui/SinceLine). This only
 * reads, against that time:
 *
 *   done       a stage, test or fix settled since — its record changed since
 *              the visit AND the day it was done is on or after that day, so
 *              a note added to an old stage is not news;
 *   went late  something whose day has gone now and had not at the visit —
 *              the same rule the job uses for late (lib/testing isOverdue),
 *              asked of two days, so it is worked out, not edited;
 *   problems   a problem raised since (a found item that is not the reason
 *              for a "not yet": that is a part owed, lib/noted);
 *   failed     a test that ran and did not pass, since.
 *
 * In the order it matters: late and failed and problems first, then done.
 * Empty when nothing changed — the line is not drawn. Pure: records in,
 * words out. */
import { isOverdue, isSettled, live, plannedEnd, ranEnd, titleOnMachine, type Asset, type Test, type TestItem } from './testing';
import { niceDay, todayISO } from './weeks';

export interface SincePart {
  kind: 'late' | 'failed' | 'problem' | 'done';
  /** "1 went late (Air and power — Domino coder)", "3 done". */
  text: string;
  /** What it names, to open: the record when there is one, else the first. */
  ids: string[];
  tone: 'r' | 'a' | 'g';
}

export interface Since {
  /** "Since Tue 16:40" — the visit it is counted from. */
  from: string;
  parts: SincePart[];
}

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
const named = (xs: string[]): string => (xs.length <= 2 ? xs.join('; ') : `${xs.slice(0, 2).join('; ')} and ${xs.length - 2} more`);

/** "Since 16:40" today, "Since Tue 16:40" this week, "Since 2 Oct" before. */
export function sinceWords(at: number, now = Date.now()): string {
  const d = new Date(at);
  const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = todayISO(d), today = todayISO(new Date(now));
  if (day === today) return `Since ${hm}`;
  if (now - at < 6 * 86_400_000) return `Since ${niceDay(day, { weekday: 'short' }).split(/[ ,]/)[0]} ${hm}`;
  return `Since ${niceDay(day)}`;
}

export function sinceOf(x: { tests: Test[]; items: TestItem[]; assets: Asset[]; seenAt?: number; now?: number }): Since | undefined {
  const { seenAt } = x;
  if (!seenAt) return undefined;
  const now = x.now ?? Date.now();
  if (now <= seenAt) return undefined;
  const seenDay = todayISO(new Date(seenAt)), today = todayISO(new Date(now));
  const tests = live(x.tests), items = live(x.items), assets = live(x.assets);
  const name = (t: Test) => titleOnMachine(t, tests, assets);

  /* LATE NOW, AND NOT AT THE VISIT — a stage, a test or a fix. */
  const late = tests.filter(t => isOverdue(t, today) && !isOverdue(t, seenDay) && (plannedEnd(t) ?? '') >= seenDay);
  /* RAN AND DID NOT PASS, since. */
  const failed = tests.filter(t => (t.kind ?? 'test') === 'test' && t.outcome === 'failed' && t.updatedAt > seenAt && (ranEnd(t) ?? '') >= seenDay);
  /* RAISED SINCE — not the reason for a "not yet", which is a part owed. */
  const owedParts = new Set(items.filter(i => i.kind === 'next').map(i => i.id));
  const problems = items.filter(i => i.kind === 'found' && i.createdAt > seenAt && !(i.becameItemId && owedParts.has(i.becameItemId)));
  /* DONE SINCE — the record changed since, and the day it was done is not before the visit's. */
  const done = tests.filter(t => isSettled(t) && t.outcome === 'passed' && t.updatedAt > seenAt && (ranEnd(t) ?? '') >= seenDay);

  const on = (i: TestItem) => { const t = tests.find(s => s.id === i.testId); return t ? ` on ${assets.find(a => a.id === t.assetId)?.name ?? t.title}` : ''; };
  const parts: SincePart[] = [];
  if (late.length) parts.push({ kind: 'late', tone: 'r', ids: late.map(t => t.id), text: `${n(late.length, 'went late', 'went late')} (${named(late.map(name))})` });
  if (failed.length) parts.push({ kind: 'failed', tone: 'r', ids: failed.map(t => t.id), text: `${n(failed.length, 'test')} didn’t pass (${named(failed.map(name))})` });
  if (problems.length) parts.push({ kind: 'problem', tone: 'a', ids: problems.map(i => i.id), text: problems.length === 1 ? `1 problem raised${on(problems[0])}` : `${problems.length} problems raised` });
  if (done.length) {
    const stages = done.filter(t => t.kind === 'install').length, fixes = done.filter(t => t.kind === 'fix').length, ts = done.length - stages - fixes;
    parts.push({ kind: 'done', tone: 'g', ids: done.map(t => t.id),
      text: [stages ? n(stages, 'stage') : '', ts ? n(ts, 'test') : '', fixes ? n(fixes, 'fix', 'fixes') : ''].filter(Boolean).join(', ') + ' done' });
  }
  return parts.length ? { from: sinceWords(seenAt, now), parts } : undefined;
}
