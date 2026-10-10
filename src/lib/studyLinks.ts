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
import type { StudyUse, ToolStudy } from './study';
import { sample, sampleSays, compareSamples, type SampleSays, type Tone } from './ie/sample';

const live = (ss: ToolStudy[]) => ss.filter(s => !s.deletedAt);

/** The studies linked to one record, newest first. */
export function linkedTo(studies: ToolStudy[], kind: StudyUse['kind'], ref: ID, role?: StudyUse['role']): ToolStudy[] {
  return live(studies).filter(s => s.uses.some(u => u.kind === kind && u.ref === ref && (!role || u.role === role)))
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** What a study says, in the tool's words. */
export function studySays(s: ToolStudy): SampleSays {
  const a = s.agreed?.readings;
  return sampleSays(sample(a, s.facts.readings ?? []), a);
}

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

/** Same tool, same thing measured, judged against the same limits. */
export const sameScope = (a: ToolStudy, b: ToolStudy): boolean =>
  a.tool === b.tool && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
  && JSON.stringify(a.agreed?.readings ?? null) === JSON.stringify(b.agreed?.readings ?? null);

/** Before → after on a fix: its evidence study against its proof study. */
export function beforeAfter(studies: ToolStudy[], fixId: ID): { text: string; tone: Tone; before: ToolStudy; after: ToolStudy } | undefined {
  const after = linkedTo(studies, 'fix', fixId, 'proof')[0];
  if (!after) return undefined;
  const before = linkedTo(studies, 'fix', fixId, 'evidence').find(b => sameScope(b, after));
  const a = after.agreed?.readings;
  if (!before || !a) return undefined;
  const c = compareSamples(sample(a, before.facts.readings ?? []), sample(a, after.facts.readings ?? []), a);
  return { ...c, before, after };
}

/** A new link from a study to a record. */
export const linkOf = (kind: StudyUse['kind'], ref: ID, role: StudyUse['role'], at: number, by: string | undefined, id: string): StudyUse =>
  ({ id, kind, ref, role, at, ...(by ? { by } : {}) });

/** "Prove it": the same tool on the same scope as the evidence — what it is
 *  of, the machine, the product, the limits and the count — so before and
 *  after measure the same thing the same way. Its readings start empty. */
export function proveItFrom(evidence: ToolStudy, fixId: ID, x: { at: number; by?: string; id: string; useId: string }): ToolStudy {
  return {
    id: x.id, tool: evidence.tool, name: evidence.name,
    ...(evidence.workspaceId ? { workspaceId: evidence.workspaceId } : {}),
    ...(evidence.projectId ? { projectId: evidence.projectId } : {}),
    ...(evidence.machine ? { machine: evidence.machine } : {}),
    ...(evidence.assetId ? { assetId: evidence.assetId } : {}),
    ...(evidence.product ? { product: evidence.product } : {}),
    ...(evidence.agreed ? { agreed: JSON.parse(JSON.stringify(evidence.agreed)) as ToolStudy['agreed'] } : {}),
    facts: {}, uses: [linkOf('fix', fixId, 'proof', x.at, x.by, x.useId)],
    startedAt: x.at, createdAt: x.at, updatedAt: x.at,
  };
}

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
  const why = said.tone === 'r' ? said.text : said.capability?.text ?? said.text;
  return `${s.name}: ${why}`;
}

/** Is it worth making better? It failed, or it passes and would drift. */
export function worthBetter(s: ToolStudy): boolean {
  const said = studySays(s);
  return said.tone === 'r' || said.capability?.tone === 'a';
}
