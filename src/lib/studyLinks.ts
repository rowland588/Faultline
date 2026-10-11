/* WHAT A STUDY IS EVIDENCE FOR, inside its job — and the before → after it
 * buys (docs/TOOLKIT.md, Part 0: "The doors — both ends write the same link"
 * and "Before and after, worked out"; docs/BUILD.md, 2e–2f).
 *
 * Pure. A study names what it serves in `uses` — a test it proves, a fix it is
 * the evidence for or the proof of — and both ends read the same list: the
 * study's "Used for" and the record's "How we know · Proved by" can never
 * disagree, because there is only one link.
 *
 * Before → after is offered only when it is fair: the same tool, the same
 * scope (what it is of, and the same limits), the latest on each side, and
 * enough readings on both. It says "the number moved", never "the fix did
 * it" — that is the fix's to say, and a person presses the button. */
import type { ID } from '../types';
import type { BalanceStep, StudyUse, ToolStudy } from './study';
import type { PaceTodoRow } from '../db/rows';
import type { SixM } from './sixm';
import { sample, sampleSays, compareSamples, type SampleSays, type Tone } from './ie/sample';
import { balance, balanceLine, compareBalances, secs as secsOf } from './ie/balance';

const live = (ss: ToolStudy[]) => ss.filter(s => !s.deletedAt);

/** The studies linked to one record, newest first. */
export function linkedTo(studies: ToolStudy[], kind: StudyUse['kind'], ref: ID, role?: StudyUse['role']): ToolStudy[] {
  return live(studies).filter(s => s.uses.some(u => u.kind === kind && u.ref === ref && (!role || u.role === role)))
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** What a study says, in the tool's words: a work balance by its stacks
 *  against takt, a measured test by its readings. */
export function studySays(s: ToolStudy): SampleSays {
  if (s.tool === 'balance') return balanceLine(balance(s.facts.steps, s.agreed?.balance));
  const a = s.agreed?.readings;
  return sampleSays(sample(a, s.facts.readings ?? []), a);
}

/** Each tool's name, as a study of it is called on screen and on paper. */
export const TOOL_NAME: Partial<Record<ToolStudy['tool'], string>> = { capability: 'Capability study', balance: 'Work balance' };

/** "Capability study — Weight accuracy 400 g · Weigher 2". */
export const studyTitle = (s: Pick<ToolStudy, 'tool' | 'name' | 'machine'>): string =>
  `${TOOL_NAME[s.tool] ?? 'Study'} — ${s.name}${s.machine ? ` · ${s.machine}` : ''}`;

/** Where a study opens. A work balance lives on its product's line standard —
 *  the job's when it is attached, else the line's — at the People view, and
 *  names itself so an earlier timing opens as itself. */
export function studyHref(s: Pick<ToolStudy, 'id' | 'tool' | 'standardId' | 'projectId' | 'workspaceId'>): string {
  if (s.tool === 'balance' && s.standardId) {
    const at = `?at=balance&view=work&study=${encodeURIComponent(s.id)}`;
    if (s.projectId) return `/project/${s.projectId}/standard/${s.standardId}${at}`;
    if (s.workspaceId) return `/w/${s.workspaceId}/standards/${s.standardId}${at}`;
  }
  return `/${s.tool}/${s.id}`;
}

/** The work balance a line standard reads: the newest timing of it. */
export const currentBalance = (studies: ToolStudy[], standardId: ID): ToolStudy | undefined =>
  live(studies).filter(s => s.tool === 'balance' && s.standardId === standardId).sort((a, b) => b.startedAt - a.startedAt)[0];

/** The sentence a study adds to a record or to paper, with its verdict tone:
 *  its name, then what it says, with an overrule beside the app's verdict. */
export function studyLine(s: ToolStudy): { text: string; tone: Tone } {
  const said = studySays(s);
  const over = s.overrule ? ` Overruled: ${s.overrule.verdict}${s.overrule.by ? ` by ${s.overrule.by}` : ''} — ${s.overrule.why}.` : '';
  return { text: `${said.text}${said.capability ? ` ${said.capability.text}` : ''}${over}`, tone: s.overrule ? 'n' : said.tone };
}

/** How many readings a study still owes, or 0. */
export function owedOf(s: ToolStudy): number {
  const count = s.agreed?.readings?.count ?? 0;
  const n = (s.facts.readings ?? []).filter(r => !r.struck).length;
  return Math.max(0, count - n);
}

/** Same tool, same thing measured, judged against the same limits — for a
 *  work balance, the same line standard at the same takt. */
export const sameScope = (a: ToolStudy, b: ToolStudy): boolean =>
  a.tool === b.tool && (a.tool === 'balance'
    ? !!a.standardId && a.standardId === b.standardId && a.agreed?.balance?.taktSec === b.agreed?.balance?.taktSec
    : a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
      && JSON.stringify(a.agreed?.readings ?? null) === JSON.stringify(b.agreed?.readings ?? null));

/** What a study can be the evidence or proof of that something changed: a
 *  stage-gate job's fix, or a running line's countermeasure on the board. */
export type FixKind = 'fix' | 'action';

/** Before → after on a fix (or a board action): its evidence study against
 *  its proof study. */
export function beforeAfter(studies: ToolStudy[], fixId: ID, kind: FixKind = 'fix'): { text: string; tone: Tone; before: ToolStudy; after: ToolStudy } | undefined {
  const after = linkedTo(studies, kind, fixId, 'proof')[0];
  if (!after) return undefined;
  const before = linkedTo(studies, kind, fixId, 'evidence').find(b => sameScope(b, after));
  if (before && after.tool === 'balance') {
    const ab = after.agreed?.balance;
    return ab ? { ...compareBalances(balance(before.facts.steps, before.agreed?.balance), balance(after.facts.steps, ab)), before, after } : undefined;
  }
  const a = after.agreed?.readings;
  if (!before || !a) return undefined;
  const c = compareSamples(sample(a, before.facts.readings ?? []), sample(a, after.facts.readings ?? []), a);
  return { ...c, before, after };
}

/** The one line a fix (or a board action) carries on paper and in its
 *  drawer: before → after when it has both, else what proved it, else how we
 *  know it was needed. */
export function provedLine(studies: ToolStudy[], fixId: ID, kind: FixKind = 'fix'): string | undefined {
  const ba = beforeAfter(studies, fixId, kind);
  if (ba) return `Before → after: ${ba.text}`;
  const proof = linkedTo(studies, kind, fixId, 'proof')[0], ev = linkedTo(studies, kind, fixId, 'evidence')[0];
  if (proof) return `Proved by: ${studyLine(proof).text}`;
  if (ev) return `How we know: ${studyLine(ev).text}`;
  return undefined;
}

/** A test's or a fix's line, by what it is: a fix's before → after (or what
 *  proved it, or how we know it was needed); a test's proof. */
export function recordProvedLine(studies: ToolStudy[], t: { id: ID; kind?: string }): string | undefined {
  if ((t.kind ?? 'test') === 'fix') return provedLine(studies, t.id, 'fix');
  const proof = linkedTo(studies, 'test', t.id, 'proof')[0];
  return proof ? `Proved by: ${studyTitle(proof)} — ${studyLine(proof).text}` : undefined;
}

/** Where a record a study is used for opens, in its job. */
export function recordHref(projectId: ID, u: Pick<StudyUse, 'kind' | 'ref'>): string {
  const at = encodeURIComponent;
  switch (u.kind) {
    case 'fix': return `/project/${projectId}/fixes?open=${at(u.ref)}`;
    case 'action': return `/project/${projectId}/board?a=${at(u.ref)}`;
    case 'cause': {
      const [problem, cause] = u.ref.split(':');
      return `/project/${projectId}/fishbone?problem=${at(problem)}${cause ? `&cause=${at(cause)}` : ''}`;
    }
    case 'case': case 'problem': return `/project/${projectId}/fishbone?problem=${at(u.ref)}`;
    default: return `/project/${projectId}/testing?open=${at(u.ref)}`;
  }
}

/** The words for a link, by what it is to the record. */
export const ROLE_WORD: Record<string, string> = {
  'test:proof': 'Proves', 'fix:evidence': 'How we know it was needed', 'fix:proof': 'Proves it worked',
  'action:evidence': 'How we know it was needed', 'action:proof': 'Proves it worked', 'cause:evidence': 'How we know',
};

/** What a countermeasure raised from a study should change — said before it
 *  is done, so "Did it work" has something to be held against. */
export function betterExpect(s: ToolStudy): string | undefined {
  if (s.tool === 'balance') {
    const f = balance(s.facts.steps, s.agreed?.balance), c = f.constraint;
    return c && f.taktSec ? `${c.who} within the ${secsOf(f.taktSec)} takt, timed again` : undefined;
  }
  return s.agreed?.readings && s.agreed.readings.kind !== 'ticks' ? 'Every reading within the limits, Cpk 1.33 or more, on the same readings again' : undefined;
}

/** MAKE IT BETTER ON A RUNNING LINE: a countermeasure on the board, its words
 *  the study's figures, on the cause the study is evidence for when it is
 *  one — never a stage-gate fix a 6M job has no page for. */
export function countermeasureFrom(s: ToolStudy, x: { id: string; at: number; lineId?: string; causeRef?: string; bone?: SixM }): PaceTodoRow {
  const expect = betterExpect(s);
  return {
    id: x.id, ...(s.projectId ? { projectId: s.projectId } : {}), ...(x.lineId ? { lineId: x.lineId } : {}),
    what: betterWords(s), where: '', why: studyTitle(s), who: '', when: '', state: 'todo',
    pillar: x.bone ?? (s.tool === 'balance' ? 'method' : 'machine'),
    ...(x.causeRef ? { causeRef: x.causeRef } : {}), ...(expect ? { expect } : {}),
    createdAt: x.at, updatedAt: x.at,
  };
}

/** A new link from a study to a record. */
export const linkOf = (kind: StudyUse['kind'], ref: ID, role: StudyUse['role'], at: number, by: string | undefined, id: string): StudyUse =>
  ({ id, kind, ref, role, at, ...(by ? { by } : {}) });

/** "Prove it": the same tool on the same scope as the evidence — what it is
 *  of, the machine, the product, the limits and the count — so before and
 *  after measure the same thing the same way. Its readings start empty. */
export function proveItFrom(evidence: ToolStudy, fixId: ID, x: { at: number; by?: string; id: string; useId: string }, kind: FixKind = 'fix'): ToolStudy {
  return {
    id: x.id, tool: evidence.tool, name: evidence.name,
    ...(evidence.workspaceId ? { workspaceId: evidence.workspaceId } : {}),
    ...(evidence.projectId ? { projectId: evidence.projectId } : {}),
    ...(evidence.machine ? { machine: evidence.machine } : {}),
    ...(evidence.assetId ? { assetId: evidence.assetId } : {}),
    ...(evidence.product ? { product: evidence.product } : {}),
    ...(evidence.standardId ? { standardId: evidence.standardId } : {}),
    ...(evidence.agreed ? { agreed: JSON.parse(JSON.stringify(evidence.agreed)) as ToolStudy['agreed'] } : {}),
    facts: evidence.tool === 'balance' ? { steps: retime(evidence.facts.steps) } : {},
    uses: [linkOf(kind, fixId, 'proof', x.at, x.by, x.useId)],
    startedAt: x.at, createdAt: x.at, updatedAt: x.at,
  };
}

/** A work balance timed again: the same elements, whose they are as they
 *  stand, no laps and no pace yet — a typed time stays only where it was
 *  never timed, so before and after are each as known as they say. */
const retime = (steps: BalanceStep[] | undefined): BalanceStep[] =>
  (steps ?? []).map(({ laps, rating: _r, typedSec, ...st }) => { void _r; return { ...st, ...(!(laps ?? []).length && typedSec ? { typedSec } : {}) }; });

/** "Take the readings" on a test: a capability study named for the test, on
 *  its machine, attached to its job, proving it. */
export function readingsFor(test: { id: ID; projectId: ID; title: string; assetId?: ID }, machine: string | undefined,
  x: { at: number; by?: string; id: string; useId: string }): ToolStudy {
  return {
    id: x.id, tool: 'capability', name: test.title, projectId: test.projectId,
    ...(machine ? { machine } : {}), ...(test.assetId ? { assetId: test.assetId } : {}),
    facts: {}, uses: [linkOf('test', test.id, 'proof', x.at, x.by, x.useId)],
    startedAt: x.at, createdAt: x.at, updatedAt: x.at,
  };
}

/** "Make it better": the fix's words, with the figures already in them —
 *  "Weight accuracy 400 g: Not capable: Cpk 0.67 from 30 — about 2 in 100
 *  would be light." */
export function betterWords(s: ToolStudy): string {
  const said = studySays(s);
  if (s.tool === 'balance') {
    const f = balance(s.facts.steps, s.agreed?.balance), c = f.constraint;
    if (c && c.overBy > 0) return `${s.name}: ${c.who} carries ${secsOf(c.work)} against a ${secsOf(f.taktSec ?? 0)} takt — take ${secsOf(c.overBy)} of work off ${c.who}, or change how it is done.`;
  }
  const why = said.tone === 'r' ? said.text : said.capability?.text ?? said.text;
  return `${s.name}: ${why}`;
}

/** Is it worth making better? It failed, or it passes and would drift. */
export function worthBetter(s: ToolStudy): boolean {
  const said = studySays(s);
  if (s.tool === 'balance') return said.verdict === 'Over takt';
  return said.tone === 'r' || said.capability?.tone === 'a';
}
