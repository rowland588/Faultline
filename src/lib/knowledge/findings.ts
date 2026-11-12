/* THE BRAIN'S FINDINGS AS CLAIMS (docs/LUNAR-KNOWLEDGE.md §2). Each finding has an identity — its claim, `<kind>:<subject>` — and a
 * signature: what it says that matters. A new version is written only when the signature changes (the top cause moves, a change turns
 * round or becomes sure, a pattern appears or lapses); figures that drift day to day stay in the line's current homework. The version
 * before is named, never changed. Pure: the findings and the ledger in, the entries to add out. */
import type { Finding } from '../brain/engine';
import { currentOf, isLapsed, nextVersion, subjectOf, type Entry } from './model';

/** The claim a finding makes, and what about it matters. */
export function claimOf(f: Finding): { claim: string; subject: string; signature: string } {
  switch (f.kind) {
    case 'where': {
      const subject = 'line';
      return { claim: `where:${subject}`, subject, signature: `${subjectOf({ machine: f.machine, reason: f.reason })}|${f.sure === 'thin' ? 'thin' : 'firm'}` };
    }
    case 'changed': {
      const a = f.figures.lastWeekPerDay ?? 0, b = f.figures.beforePerDay ?? 0;
      const dir = f.sure === 'significant' ? (a > b ? 'more' : a < b ? 'fewer' : 'same') : f.sure === 'thin' ? 'thin' : 'no-clear-change';
      return { claim: 'changed:line', subject: 'line', signature: dir };
    }
    case 'recurs': {
      const subject = subjectOf({ machine: f.machine, reason: f.reason });
      return { claim: `recurs:${subject}`, subject, signature: 'present' };
    }
    case 'recorded':
      return { claim: 'recorded:line', subject: 'line', signature: 'present' };
  }
}

const KNOWN: Record<Finding['sure'], 'counted' | 'measured'> = { measured: 'counted', significant: 'counted', suggestive: 'counted', thin: 'counted' };

/** The ledger entries a homework adds: a version for each finding whose claim says something new, and a "no longer the case" version
 *  for each claim the homework no longer makes. */
export function findingVersions(
  line: { id: string; client?: string },
  findings: readonly Finding[],
  ledger: readonly Entry[],
  now: number,
): Entry[] {
  const out: Entry[] = [];
  const all = [...ledger];
  const made = new Set<string>();
  for (const f of findings) {
    const c = claimOf(f);
    made.add(c.claim);
    const v = nextVersion(all, {
      workspaceId: line.id, ...(line.client ? { client: line.client } : {}),
      kind: 'finding', known: KNOWN[f.sure], subject: c.subject, claim: c.claim,
      says: f.says, source: f.engine, at: now,
      body: {
        signature: c.signature, findingKind: f.kind, method: f.method, n: f.n, sure: f.sure, ...(f.p !== undefined ? { p: f.p } : {}),
        figures: f.figures, period: f.period, limits: f.limits, ...(f.money ? { money: f.money } : {}),
        ...(f.machine ? { machine: f.machine } : {}), ...(f.reason ? { reason: f.reason } : {}),
      },
    });
    if (v) { out.push(v); all.push(v); }
  }
  /* claims this line made before and does not make now: they lapse — said, never deleted */
  const claims = new Set(ledger.filter(e => e.kind === 'finding' && e.workspaceId === line.id && e.claim).map(e => e.claim ?? ''));
  for (const claim of claims) {
    if (made.has(claim)) continue;
    const cur = currentOf(all, claim);
    if (!cur || isLapsed(cur)) continue;
    const v = nextVersion(all, {
      workspaceId: line.id, ...(line.client ? { client: line.client } : {}),
      kind: 'finding', known: 'counted', subject: cur.subject, claim, source: cur.source, at: now,
      says: `No longer the case: ${lapseWords(cur)}`,
      body: { signature: 'lapsed', lapsed: true, was: cur.says, findingKind: (cur.body as { findingKind?: string }).findingKind },
    });
    if (v) { out.push(v); all.push(v); }
  }
  return out;
}

function lapseWords(cur: Entry): string {
  const k = (cur.body as { findingKind?: string }).findingKind;
  if (k === 'recurs') return 'it has not come back three times in the last 14 days.';
  if (k === 'recorded') return 'less than a fifth of the stop time is booked to a description now.';
  if (k === 'where') return 'no stops were timed on the line in the last 28 days.';
  return 'the records no longer show it.';
}
