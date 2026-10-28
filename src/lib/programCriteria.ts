/* A PROGRAM IS PROVED BY THE CRITERIA YOU PICK, AND SIGNED OFF BY WHO ACCEPTS IT.
 *
 * Rowland, 28 October (docs/PROGRAM-GOAL.md): "the program has a set role of
 * criteria. So I choose the criteria. So it's likely I'm going to pick tools
 * ... If they pass, I then need to be able to sign off. So I will sign off, me
 * and my colleagues together, but just leave it as signed off, passed ... it's
 * running tools, and then seeing if setting your parameters and whether or
 * not it passes or fails. It's just as simple as that."
 *
 * The industry's way (FAT/SAT practice — knowledge/methods/commissioning/
 * acceptance-tests.md): acceptance is against criteria agreed beforehand, each
 * its own test with its own evidence, and the people who accept it sign.
 *
 *   A CRITERION    a study made for the program in its tool (capability,
 *                  control chart, reliability, analysis) or a run test (the
 *                  program's tests as they are: Test it, Go again). Its answer
 *                  is the tool's own verdict against the parameters set in the
 *                  tool — lib/studyLinks studySays, an overrule beside it; a
 *                  run test's is its journey (lib/programJourney): passed once
 *                  any attempt passed, as a later miss leaves a pass standing.
 *   READY          every criterion passed, not yet signed.
 *   SIGNED OFF     the names and the day; the program reads "Signed off —
 *                  passed", and the day is its provedOn as any proof's.
 *
 * Nothing here invents a verdict: a tool whose study says neither passed nor
 * failed (a value stream map, a line balance) is never offered as one, and a
 * study that has not said yet is "not yet". A program with no criteria is as
 * it always was — a passed test proves it (lib/programs programAfterTest). */
import type { ID } from '../types';
import type { Criterion, Program, SignOff } from './programs';
import type { Test } from './testing';
import type { ToolStudy } from './study';
import { studyLine, studySays, TOOL_NAME, type StudyContext } from './studyLinks';
import { testChain, testJourney } from './programJourney';
import { niceDay, todayISO } from './weeks';

/** The tools a criterion can be — each says passed or failed against what is set in it. */
export const CRITERION_TOOLS = ['capability', 'chart', 'reliability', 'analysis'] as const;
export type CriterionTool = typeof CRITERION_TOOLS[number];
export const isCriterionTool = (t: string): t is CriterionTool => (CRITERION_TOOLS as readonly string[]).includes(t);

export type CriterionWord = 'passed' | 'failed' | 'notYet' | 'gone';
export const CRITERION_WORD: Record<CriterionWord, string> = {
  passed: 'Passed', failed: 'Didn’t pass', notYet: 'Not yet', gone: 'Gone',
};
const TONE: Record<CriterionWord, 'g' | 'r' | 'n' | 'a'> = { passed: 'g', failed: 'r', notYet: 'n', gone: 'a' };

/** One criterion and its answer, as every place says it. */
export interface CriterionAnswer {
  c: Criterion;
  /** "Capability study — placement 75 ppm", "Run test". */
  title: string;
  word: CriterionWord;
  tone: 'g' | 'r' | 'n' | 'a';
  /** What its tool says — the study's sentence, the run's best pass or its last attempt. */
  says: string;
  /** The short figure for the sign-off line: "Capable: Ppk 1.82", "Passed at 75 ppm for 60 min". */
  short: string;
  /** The day it last said so (ISO), when known. */
  on?: string;
  study?: ToolStudy;
  test?: Test;
}

const dayOf = (ms: number | undefined): string | undefined => (ms ? new Date(ms).toISOString().slice(0, 10) : undefined);

/** A study criterion's answer: the tool's verdict, an overrule taking its place. `known` false: the studies were not
 *  read where this is asked, so a study not found is not yet known — never said gone, never a pass. */
function studyAnswer(c: Criterion, s: ToolStudy | undefined, ctx?: StudyContext, known = true): CriterionAnswer {
  if (!s && !known) return { c, title: 'A study', word: 'notYet', tone: 'n', says: 'Open the program to read its study.', short: 'study not read here' };
  if (!s || s.deletedAt) return { c, title: 'A study', word: 'gone', tone: 'a', says: 'The study picked for it has been deleted — take it off or pick another.', short: 'study deleted' };
  const said = studySays(s, ctx);
  const line = studyLine(s, ctx);
  const over = s.overrule?.verdict;
  const word: CriterionWord = over === 'Passed' ? 'passed' : over === 'Didn’t pass' ? 'failed'
    : said.tone === 'g' ? 'passed' : said.tone === 'r' ? 'failed' : 'notYet';
  const title = `${TOOL_NAME[s.tool] ?? 'Study'} — ${s.name}`;
  const short = `${s.name}: ${over ? `${over} (overruled)` : said.verdict}`;
  return { c, title, word, tone: TONE[word], says: line.text, short, ...(dayOf(s.updatedAt) ? { on: dayOf(s.updatedAt) } : {}), study: s };
}

/** A run test's answer: its chain of attempts — passed once any passed. */
function runAnswer(c: Criterion, tests: Test[], today: string): CriterionAnswer {
  const root = tests.find(t => t.id === c.id && !t.deletedAt);
  if (!root) return { c, title: 'Run test', word: 'gone', tone: 'a', says: 'The run test picked for it has been deleted — take it off or pick another.', short: 'run test deleted' };
  const j = testJourney(root, tests, today);
  const last = j.attempts[j.attempts.length - 1];
  const passed = j.attempts.some(a => a.test.outcome === 'passed');
  const word: CriterionWord = passed ? 'passed' : last?.test.outcome === 'failed' ? 'failed' : 'notYet';
  const aim = j.attempts[0]?.aim;
  const title = `Run test${aim ? ` — ${aim}` : ''}`;
  const says = passed ? `${j.best}.` : last ? `Test ${last.n}: ${last.result.word}${last.split ? ` — ${last.split}` : ''}.` : 'Not run yet.';
  const chain = testChain(root, tests);
  const on = passed ? chain.filter(t => t.outcome === 'passed').map(t => t.ranOn).filter(Boolean).sort().pop() : last?.test.ranOn;
  return { c, title, word, tone: TONE[word], says, short: passed ? (j.best ?? 'passed') : `run test ${CRITERION_WORD[word].toLowerCase()}`, ...(on ? { on } : {}), test: root };
}

/** Every criterion picked for a program, in the order picked, with its answer. */
export function criteriaOf(p: Pick<Program, 'criteria'>, studies: readonly ToolStudy[] | undefined, tests: readonly Test[], today = todayISO(), ctx?: StudyContext): CriterionAnswer[] {
  return (p.criteria ?? []).map(c => c.kind === 'study'
    ? studyAnswer(c, studies?.find(s => s.id === c.id), ctx, !!studies)
    : runAnswer(c, [...tests], today));
}

export { judgedByCriteria } from './programs';

/** Where a program judged by criteria stands, in one line and its colour. */
export interface CriteriaVerdict {
  passed: number;
  of: number;
  failed: number;
  /** Every criterion passed and nobody has signed yet. */
  ready: boolean;
  signed: boolean;
  /** "2 of 3 criteria passed · 1 didn’t pass", "Ready to sign off — all 2 criteria passed",
   *  "Signed off — passed 28 Oct by R. Glew, J. Smith". */
  words: string;
  tone: 'g' | 'r' | 'a' | 'w' | 'n';
  /** Since it was signed, a criterion that no longer reads passed — said, never undone by itself. */
  since?: string;
}

const names = (by: readonly string[]): string => by.length <= 1 ? (by[0] ?? '') : `${by.slice(0, -1).join(', ')} and ${by[by.length - 1]}`;

export const signedWords = (s: SignOff): string => `Signed off — passed ${niceDay(s.on)} by ${names(s.by)}`;

export function criteriaVerdict(p: Pick<Program, 'criteria' | 'signedOff'>, answers: readonly CriterionAnswer[]): CriteriaVerdict {
  const of = answers.length;
  const passed = answers.filter(a => a.word === 'passed').length;
  const failed = answers.filter(a => a.word === 'failed').length;
  const gone = answers.filter(a => a.word === 'gone').length;
  if (p.signedOff) {
    const off = answers.filter(a => a.word !== 'passed');
    return { passed, of, failed, ready: false, signed: true, words: signedWords(p.signedOff), tone: 'g',
      ...(off.length ? { since: `Since it was signed off, ${off.map(a => `${a.title} reads ${CRITERION_WORD[a.word].toLowerCase()}`).join('; ')}.` } : {}) };
  }
  if (!of) return { passed, of, failed, ready: false, signed: false, words: 'No criteria picked yet', tone: 'n' };
  const ready = passed === of;
  if (ready) return { passed, of, failed, ready, signed: false, words: `Ready to sign off — ${of === 1 ? 'its criterion' : `all ${of} criteria`} passed`, tone: 'a' };
  const words = [`${passed} of ${of} criteria passed`, failed && `${failed} didn’t pass`, gone && `${gone} gone`].filter(Boolean).join(' · ');
  return { passed, of, failed, ready, signed: false, words, tone: failed ? 'r' : passed ? 'w' : 'n' };
}

/** WHAT PASSED IT, in one line — the same words on every row and paper:
 *  "Signed off — passed 28 Oct by R. Glew and J. Smith · placement 75 ppm: Capable (27 Oct) · robot faults: Met (27 Oct)". */
export function passedItLine(p: Pick<Program, 'criteria' | 'signedOff'>, answers: readonly CriterionAnswer[]): string | undefined {
  if (!p.signedOff) return undefined;
  const each = answers.map(a => `${a.short}${a.on ? ` (${niceDay(a.on)})` : ''}`);
  return [signedWords(p.signedOff), ...each].join(' · ');
}

/** Why it cannot be signed off yet, or undefined when it can. */
export function cannotSignOff(p: Pick<Program, 'criteria' | 'signedOff' | 'deletedAt'>, answers: readonly CriterionAnswer[], by: readonly string[], on: string): string | undefined {
  if (p.deletedAt) return 'The program has been deleted.';
  if (p.signedOff) return 'It is signed off already.';
  if (!answers.length) return 'Pick its criteria first — what it must pass.';
  const not = answers.filter(a => a.word !== 'passed');
  if (not.length) return `Not every criterion has passed: ${not.map(a => `${a.title} — ${CRITERION_WORD[a.word].toLowerCase()}`).join('; ')}.`;
  if (!by.some(b => b.trim())) return 'Say who is signing it off.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return 'Say the day it is signed off.';
  return undefined;
}

/** The names typed — "R. Glew, J. Smith" or one a line — each once, in order. */
export function signersOf(text: string): string[] {
  const out: string[] = [];
  for (const x of text.split(/\s*(?:[,;\n]|\band\b|&)\s*/i)) {
    const t = x.trim().replace(/\s+/g, ' ');
    if (t && !out.some(o => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out;
}

/** The program signed off: passed, on that day, by those names. */
export function signedOff(p: Program, by: readonly string[], on: string, at: number): Program {
  return { ...p, state: 'proved', provedOn: on, testOn: undefined, signedOff: { by: [...by], on, at } };
}

/** The sign-off taken back: on the machine again, the criteria kept. */
export function unsigned(p: Program): Program {
  const { signedOff: _gone, ...rest } = p;
  return { ...rest, state: 'onMachine', provedOn: undefined };
}

/** A criterion added once — the same study or run test twice is one. */
export function withCriterion(p: Program, c: Criterion): Program {
  if ((p.criteria ?? []).some(x => x.kind === c.kind && x.id === c.id)) return p;
  return { ...p, criteria: [...(p.criteria ?? []), c] };
}

/** Studies on this program's tests as *Proved by* (proof role) — what "Use proving studies as criteria" adds. */
export function proofStudiesToPick(p: Pick<Program, 'id' | 'criteria'>, studies: readonly ToolStudy[], testIds: readonly ID[]): ToolStudy[] {
  const tids = new Set(testIds);
  const picked = new Set((p.criteria ?? []).filter(c => c.kind === 'study').map(c => c.id));
  return studies.filter(s => !s.deletedAt && isCriterionTool(s.tool) && !picked.has(s.id)
    && s.uses.some(u => u.kind === 'test' && u.role === 'proof' && tids.has(u.ref)));
}

/** Every proof-linked study on its tests — added in one go (Rowland, 26–28 October, program 5). Does not add run tests
 *  or studies made for the program but not lined up on a test. */
export function withAllProofStudies(p: Program, studies: readonly ToolStudy[], testIds: readonly ID[]): Program {
  return proofStudiesToPick(p, studies, testIds).reduce((cur, s) => withCriterion(cur, { kind: 'study', id: s.id }), p);
}

/** A criterion taken off; the study or test itself is kept. */
export function withoutCriterion(p: Program, c: Pick<Criterion, 'kind' | 'id'>): Program {
  const left = (p.criteria ?? []).filter(x => !(x.kind === c.kind && x.id === c.id));
  const { criteria: _old, ...rest } = p;
  return left.length ? { ...rest, criteria: left } : rest;
}

/** The program's own studies a criterion could be — made for it (programId), or lined up on one of its tests — not picked yet. */
export function studiesToPick(p: Pick<Program, 'id' | 'criteria'>, studies: readonly ToolStudy[], testIds: readonly ID[]): ToolStudy[] {
  const picked = new Set((p.criteria ?? []).filter(c => c.kind === 'study').map(c => c.id));
  const tids = new Set(testIds);
  return studies.filter(s => !s.deletedAt && isCriterionTool(s.tool) && !picked.has(s.id)
    && (s.programId === p.id || s.uses.some(u => u.kind === 'test' && tids.has(u.ref))));
}

/** A new study for a program in the picked tool — on its line, its project and machine; set up in the tool. */
export function criterionStudy(p: Pick<Program, 'id' | 'projectId' | 'workspaceId' | 'assetId'>, tool: CriterionTool, name: string, x: { id: string; at: number; machine?: string }): ToolStudy {
  return {
    id: x.id, tool, name: name.trim(), programId: p.id,
    ...(p.projectId ? { projectId: p.projectId } : {}), ...(p.workspaceId ? { workspaceId: p.workspaceId } : {}),
    ...(x.machine ? { machine: x.machine } : {}), ...(p.assetId && p.projectId ? { assetId: p.assetId } : {}),
    facts: {}, uses: [], startedAt: x.at, createdAt: x.at, updatedAt: x.at,
  };
}
