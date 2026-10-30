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
import { balanceStudyFor } from '../tools/linework/balanceLink';
import type { Standard } from '../tools/linestandard/standard';
import { capacityVerdict } from '../tools/linebalance/capacity';
import { newLogStudy } from '../tools/checks/start';
import type { LogDef } from '../tools/checks/def';
import { studyLine, studySays, TOOL_NAME, type StudyContext } from './studyLinks';
import { testChain, testJourney } from './programJourney';
import { niceDay, todayISO } from './weeks';

/** The tools a criterion can be — each says passed or failed against what is set in it (the 30 October audit,
 *  docs/PROGRAM-GOAL.md: every app tool and mode that ends in a verdict against a stated target or limit, and no other). */
export const CRITERION_TOOLS = ['capability', 'chart', 'reliability', 'analysis', 'changeover', 'balance', 'sampling', 'losses', 'log'] as const;
export type CriterionTool = typeof CRITERION_TOOLS[number];
export const isCriterionTool = (t: string): t is CriterionTool => (CRITERION_TOOLS as readonly string[]).includes(t);

/** The ones the picker can make a study of for the program and set up in the tool. A line balance is timed on a product's
 *  line standard, so it is made from one (`criterionBalance`) or picked once timed; a check log is a line's, made from one of
 *  the log kinds on the program's line (`criterionLog`). */
export const CRITERION_MADE = ['capability', 'chart', 'reliability', 'analysis', 'changeover', 'sampling', 'losses'] as const;
export type CriterionMade = typeof CRITERION_MADE[number];

/** Everything the picker can pick: the tools above, a product's Line capacity (kept on its line standard, not a study) — and
 *  the run test, which the picker adds. In the order the chips are drawn. */
export const CRITERION_PICKS = ['capability', 'chart', 'reliability', 'analysis', 'changeover', 'balance', 'capacity', 'sampling', 'losses', 'log'] as const;
export type CriterionPick = typeof CRITERION_PICKS[number];

/** The picker's words for each tool: its name, and what it judges the program by — the tool's own verdict, said before
 *  anything is made. */
export const CRITERION_HELP: Record<CriterionPick, { name: string; judges: string; example: string }> = {
  capability: { name: 'Capability study', judges: 'readings against the limits agreed (Ppk), a pass-or-fail run, rejects or faults against the share allowed, a rate held for the time', example: 'e.g. Placement weight at 75 ppm' },
  chart: { name: 'Control chart', judges: 'readings in order against limits set from a steady period — in control, or a signal', example: 'e.g. Seal temperature' },
  reliability: { name: 'Reliability study', judges: 'the MTBF measured against the MTBF wanted, for each thing counted', example: 'e.g. Robot faults' },
  analysis: { name: 'Analysis', judges: 'did it move the right way, do two ways of measuring agree, is the gauge fit (Type 1, R&R), do inspectors agree — the other questions give figures only', example: 'e.g. Fill before and after' },
  changeover: { name: 'SMED', judges: 'the changeover timed against the minutes it must come in at — set on the SMED itself', example: 'e.g. Changeover to the 2 kg pack' },
  balance: { name: 'Line balance', judges: 'every person’s work timed within takt, on a product’s line standard', example: 'e.g. Packing, morning' },
  capacity: { name: 'Line capacity', judges: 'what the line can make, once stops count, against the target typed on the product’s Line capacity — meets it or falls short', example: 'e.g. Maris Piper 2 kg' },
  sampling: { name: 'Work sampling', judges: 'the share of the time people spend on the work itself against the % wanted, margins counted — set on the study', example: 'e.g. Packers, morning shift' },
  losses: { name: 'Loss count', judges: 'the minutes a counted shift lost against the most it may lose — set on the count', example: 'e.g. Shift 1 at the packer' },
  log: { name: 'Check log', judges: 'the latest results of every check on the log all passed — a count typed on the log, not the clock', example: 'e.g. Metal detection, commissioning week' },
};

/** The analysis questions that end in a verdict against something stated — a direction (better lower or higher), a difference
 *  that does not matter, a tolerance, the %GRR bands, inspectors agreeing. The rest (how sure, how many readings, groups,
 *  tables, relations, learning, shape) give figures: they can be green on the page, but that is not a pass. */
export const ANALYSIS_JUDGES: readonly string[] = ['change', 'paired', 'gauge', 'grr', 'attr'];
/** Why a study cannot say passed or failed at all, or undefined when it can: a question that gives figures only, or a tool
 *  whose target is not typed yet (a work share wanted, the most a shift may lose, the results in a row). The page may wear a
 *  colour — a log that is "up to date" — but that is a standing or a size, not a pass against something stated. */
export function cannotJudge(s: Pick<ToolStudy, 'tool' | 'agreed'>): string | undefined {
  if (s.tool === 'analysis' && s.agreed?.analysis && !ANALYSIS_JUDGES.includes(s.agreed.analysis.kind))
    return 'It gives figures, not a pass or fail — take it off and pick a question that judges (did it change, do two ways agree, is the gauge fit).';
  if (s.tool === 'sampling' && !s.agreed?.sampling?.workAtLeast) return 'No share is wanted yet — set the work share it must reach on the study, and it can judge.';
  if (s.tool === 'losses' && s.agreed?.losses?.maxLostMin === undefined) return 'No most is set yet — set the minutes a shift may lose on the count, and it can judge.';
  if (s.tool === 'log' && !s.agreed?.log?.inARow) return 'No count is set yet — set how many results in a row of every check must pass on the log, and it can judge.';
  return undefined;
}
export const canJudge = (s: Pick<ToolStudy, 'tool' | 'agreed'>): boolean => cannotJudge(s) === undefined;

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
  /** A Line capacity criterion: the line standard its capacity is kept on. */
  standard?: Standard;
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
  /* a question that gives figures and no verdict is never a pass or a fail, whatever colour its page wears */
  const judges = canJudge(s);
  const word: CriterionWord = over === 'Passed' ? 'passed' : over === 'Didn’t pass' ? 'failed'
    : !judges ? 'notYet' : said.tone === 'g' ? 'passed' : said.tone === 'r' ? 'failed' : 'notYet';
  const title = `${TOOL_NAME[s.tool] ?? 'Study'} — ${s.name}`;
  const short = `${s.name}: ${over ? `${over} (overruled)` : said.verdict}`;
  const figures = !judges && !over ? ` ${cannotJudge(s)}` : '';
  return { c, title, word, tone: TONE[word], says: `${line.text}${figures}`, short, ...(dayOf(s.updatedAt) ? { on: dayOf(s.updatedAt) } : {}), study: s };
}

/** What a study would answer if it were picked — for a chip that offers it ("Finest Red 2kg · Passed"). */
export const answerOfStudy = (s: ToolStudy, ctx?: StudyContext): CriterionAnswer => studyAnswer({ kind: 'study', id: s.id }, s, ctx);

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

/** A Line capacity criterion's answer: the capacity kept on a product's line standard, met or missed against the target typed on
 *  it — by `capacityVerdict`, the sheet's own gap. `known` false: the standards were not read where this is asked. */
function capacityAnswer(c: Criterion, st: Standard | undefined, known = true): CriterionAnswer {
  if (!st && !known) return { c, title: 'A Line capacity', word: 'notYet', tone: 'n', says: 'Open the program to read its Line capacity.', short: 'capacity not read here' };
  if (!st || st.deletedAt) return { c, title: 'A Line capacity', word: 'gone', tone: 'a', says: 'The product’s line standard picked for it has been deleted — take it off or pick another.', short: 'capacity deleted' };
  const v = capacityVerdict(st.capacity);
  const word: CriterionWord = v.word === 'meets' ? 'passed' : v.word === 'short' ? 'failed' : 'notYet';
  return { c, title: `Line capacity — ${st.product || 'a product'}`, word, tone: TONE[word], says: v.text, short: `${st.product || 'Line capacity'}: ${v.verdict}`,
    ...(dayOf(st.updatedAt) ? { on: dayOf(st.updatedAt) } : {}), standard: st };
}

/** What a product's Line capacity would answer if it were picked — for a chip that offers it. */
export const answerOfStandard = (st: Standard): CriterionAnswer => capacityAnswer({ kind: 'capacity', id: st.id }, st);

/** Every criterion picked for a program, in the order picked, with its answer. `ctx.standards` are the line standards a Line
 *  capacity criterion is read from; left out, such a criterion is not yet known — never gone, never a pass. */
export function criteriaOf(p: Pick<Program, 'criteria'>, studies: readonly ToolStudy[] | undefined, tests: readonly Test[], today = todayISO(), ctx?: StudyContext): CriterionAnswer[] {
  return (p.criteria ?? []).map(c => c.kind === 'study'
    ? studyAnswer(c, studies?.find(s => s.id === c.id), ctx, !!studies)
    : c.kind === 'capacity'
      ? capacityAnswer(c, ctx?.standards?.find(s => s.id === c.id), !!ctx?.standards)
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

const pickRank = (w: CriterionWord): number => (w === 'passed' ? 0 : w === 'notYet' ? 1 : w === 'failed' ? 2 : 3);

/** Every study that could be picked, with its tool's answer — proof-linked on its tests first, then passed before not yet. */
export function unpickedStudyChoices(p: Pick<Program, 'id' | 'criteria'>, studies: readonly ToolStudy[], testIds: readonly ID[], ctx?: StudyContext): CriterionAnswer[] {
  const proofIds = new Set(proofStudiesToPick(p, studies, testIds).map(s => s.id));
  const pool = studiesToPick(p, studies, testIds);
  const sorted = [...pool].sort((a, b) => {
    const byProof = (proofIds.has(a.id) ? 0 : 1) - (proofIds.has(b.id) ? 0 : 1);
    if (byProof) return byProof;
    const aw = studyAnswer({ kind: 'study', id: a.id }, a, ctx).word;
    const bw = studyAnswer({ kind: 'study', id: b.id }, b, ctx).word;
    return pickRank(aw) - pickRank(bw);
  });
  return sorted.map(s => studyAnswer({ kind: 'study', id: s.id }, s, ctx));
}

/** A new study for a program in the picked tool — on its line, its project and machine; set up in the tool. */
export function criterionStudy(p: Pick<Program, 'id' | 'projectId' | 'workspaceId' | 'assetId'>, tool: CriterionMade, name: string, x: { id: string; at: number; machine?: string }): ToolStudy {
  return {
    id: x.id, tool, name: name.trim(), programId: p.id,
    ...(p.projectId ? { projectId: p.projectId } : {}), ...(p.workspaceId ? { workspaceId: p.workspaceId } : {}),
    ...(x.machine ? { machine: x.machine } : {}), ...(p.assetId && p.projectId ? { assetId: p.assetId } : {}),
    facts: {}, uses: [], startedAt: x.at, createdAt: x.at, updatedAt: x.at,
  };
}

/** A new line balance for a program: timed on a product's line standard (the map's people its elements, the takt Line
 *  capacity's target), made for the program on its machine. It opens on that standard's People view. */
export function criterionBalance(p: Pick<Program, 'id' | 'projectId' | 'workspaceId' | 'assetId'>, standard: Standard, x: { id: string; at: number; machine?: string; name?: string }): ToolStudy {
  const s = balanceStudyFor(standard, { id: x.id, at: x.at }, {
    programId: p.id,
    ...(p.projectId ? { projectId: p.projectId } : {}), ...(p.workspaceId && !standard.workspaceId ? { workspaceId: p.workspaceId } : {}),
    ...(x.machine ? { machine: x.machine } : {}), ...(p.assetId && p.projectId ? { assetId: p.assetId } : {}),
  });
  return x.name?.trim() ? { ...s, name: x.name.trim() } : s;
}

/** The line balances timed in the program's own place — its project, else its line — not picked yet: what the Line balance
 *  chip offers to pick, whether or not one names the program (a balance is timed on a standard, not made for a program). */
export function balancesToPick(p: Pick<Program, 'criteria' | 'projectId' | 'workspaceId'>, studies: readonly ToolStudy[]): ToolStudy[] {
  const picked = new Set((p.criteria ?? []).filter(c => c.kind === 'study').map(c => c.id));
  return studies.filter(s => !s.deletedAt && s.tool === 'balance' && !picked.has(s.id)
    && (p.projectId ? s.projectId === p.projectId : !!p.workspaceId && s.workspaceId === p.workspaceId));
}

/** The line standards a balance could be timed on for this program: its project's, else its line's. */
export function standardsToTime(p: Pick<Program, 'projectId' | 'workspaceId'>, standards: readonly Standard[]): Standard[] {
  return standards.filter(s => !s.deletedAt && (p.projectId ? s.projectId === p.projectId : !!p.workspaceId && s.workspaceId === p.workspaceId));
}

/** A new check log for a program: one of the log kinds, started on the program's line from its starter list, made for the
 *  program on its machine. Needs a line (a log is a line's); undefined when the program has none. */
export function criterionLog(p: Pick<Program, 'id' | 'projectId' | 'workspaceId' | 'assetId'>, def: LogDef, x: { id: string; at: number; name: string; machine?: string }): ToolStudy | undefined {
  if (!p.workspaceId) return undefined;
  const s = newLogStudy(def, { name: x.name, workspaceId: p.workspaceId, since: x.at, now: x.at, id: () => x.id, ...(p.projectId ? { projectId: p.projectId } : {}), ...(x.machine ? { machine: x.machine } : {}) });
  return { ...s, programId: p.id, ...(p.assetId && p.projectId ? { assetId: p.assetId } : {}) };
}

/** The check logs in the program's own place — its project, else its line — not picked yet. */
export function logsToPick(p: Pick<Program, 'criteria' | 'projectId' | 'workspaceId'>, studies: readonly ToolStudy[]): ToolStudy[] {
  const picked = new Set((p.criteria ?? []).filter(c => c.kind === 'study').map(c => c.id));
  return studies.filter(s => !s.deletedAt && s.tool === 'log' && !!s.agreed?.log && !picked.has(s.id)
    && (p.projectId ? s.projectId === p.projectId : !!p.workspaceId && s.workspaceId === p.workspaceId));
}

/** The product Line capacities in the program's own place — its project's line standards, else its line's, and those of its
 *  project's line — with stations on them, not picked yet. */
export function capacitiesToPick(p: Pick<Program, 'criteria' | 'projectId' | 'workspaceId'>, standards: readonly Standard[]): Standard[] {
  const picked = new Set((p.criteria ?? []).filter(c => c.kind === 'capacity').map(c => c.id));
  return standardsToTime(p, standards).filter(s => !picked.has(s.id) && !!s.capacity?.stations.length);
}

/** The product standards a Line capacity could be started on — in the program's place, with no stations written yet. */
export function capacitiesToStart(p: Pick<Program, 'criteria' | 'projectId' | 'workspaceId'>, standards: readonly Standard[]): Standard[] {
  const picked = new Set((p.criteria ?? []).filter(c => c.kind === 'capacity').map(c => c.id));
  return standardsToTime(p, standards).filter(s => !picked.has(s.id) && !s.capacity?.stations.length);
}

/** Where a product's Line capacity opens: the standard's own page, on Line capacity. */
export const capacityHref = (st: Pick<Standard, 'id' | 'projectId' | 'workspaceId'>): string =>
  st.projectId ? `/project/${st.projectId}/standard/${st.id}?at=balance` : `/w/${st.workspaceId ?? ''}/standards/${st.id}?at=balance`;
