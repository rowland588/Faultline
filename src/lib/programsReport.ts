/* THE PROGRAMS, AS THE REPORTS SAY THEM — one reading for the programs report
 * of its own, the client report's Programs section and the status report's
 * line (lib/clientReport, lib/statusReport, lib/programsReportPdf).
 *
 * Rowland, 8 October: "On programs they are missing from the reports — need
 * its own report, and added to the main report."
 *
 * A program is kept in one of two places, and often both:
 *
 *   a PART of Set up's programs stage   the line Rowland writes and says the
 *                                       status of — baseline achieved, passed,
 *                                       failed — with what was seen
 *                                       (ui/StageParts, lib/noted)
 *   a PROGRAM on the Programs page      written, on the machine, proved by a
 *                                       test in Commission (lib/programs)
 *
 * Read machine by machine. Where a part and a program on the same machine
 * have the same name they are ONE program — its status from the part, and
 * "proved" from Commission when it has been. Nothing is stored here. */
import { live, type Asset, type Test, type TestItem } from './testing';
import { STATE_WORD, inOrder, productsOf, isProved, isProgramsStage, standingOf, stateOf, type Program } from './programs';
import { provingTestOf, testCell } from './commission';
import { programRunSays, runsOfProgram } from './programRun';
import { partStatus, partsOf, resultNow, resultWords } from './noted';
import { niceDay, todayISO } from './weeks';
import { answerOf, type AnswerHolder } from './install';
import type { ToolStudy } from './study';
import { TOOL_NAME, linkedTo, studyLine } from './studyLinks';
import { programJourney } from './programJourney';
import { CRITERION_WORD, criteriaOf, criteriaVerdict, passedItLine } from './programCriteria';
import { judgedByCriteria } from './programs';

/** The house colours: green done, red failed or late, indigo under way,
 *  amber waiting on a verdict, grey not started. */
export type ProgTone = 'g' | 'r' | 'w' | 'a' | 'n';
/** What a program counts as in the totals. */
export type ProgBucket = 'done' | 'baseline' | 'failed' | 'late' | 'open';

export interface ProgramLine {
  machine: string;
  /** Which records it is: the part on the programs stage (and that stage),
   *  the program on the Programs page — one or both. The Programs page acts
   *  on these; paper never prints them. */
  partId?: string; stageId?: string; programId?: string; assetId?: string;
  what: string;
  /** What it runs — the product or the film, off the Programs page. */
  runs?: string;
  who?: string;
  /** Its state in words — "baseline achieved 8 Oct", "proved 7 Oct", "on the
   *  machine · test booked 11 Oct", "to do". */
  word: string;
  tone: ProgTone;
  bucket: ProgBucket;
  /** What was seen, with the status it stands on. */
  note?: string;
  /** Not done, and said why: not tested, or no program (12 October) — late or not. */
  said?: 'notTested' | 'noProgram';
  /** The statuses said before, newest first — "failed 7 Oct — seal temp low". */
  earlier: string[];
  /** The other record's word, when a part and a program are one program —
   *  "on the floor: baseline achieved — done 6 Oct" under a proved one, or
   *  "On the line: on the machine · test booked 16 Oct" under the floor's
   *  status. On paper under the row. */
  proving?: string;
  /** THE PROGRAM RECORD'S OWN STATE, when the floor's status leads the row —
   *  what the line's Programs and the control room say of it (flow audit
   *  #3: one program, two records, two answers). The screen shows it beside
   *  the row, in its colour. */
  record?: { word: string; tone: ProgTone };
  /** HOW A PROVED ONE WAS PROVED (flow audit #21) — "Proved by its test —
   *  Prove program PR-04, passed 12 Oct", "Proved by the capability study
   *  “Weight 2 kg” — …", "Signed off by hand", or amber "Signed off by hand —
   *  nothing said shows it". Under its state, on screen and paper. */
  proof?: Proof;
  /** ITS RUN AT SPEED in Commission (lib/programRun) — "run passed 9 Oct —
   *  45 ppm net", "run short — net rate 1.5 ppm short", "run planned". */
  run?: string;
  runTone?: ProgTone;
  /** EVERY TEST OF IT, first to last — what was aimed at, what was done, how it went, and the studies
   *  lined up for or proving that test (Rowland, 26 October: "check that the programs report will show all
   *  test information clearly and correctly"). The same words as the program's row and the commissioning
   *  sheet (lib/programJourney). */
  /** Each test, first to last; `split` what it met and what it did not (lib/programJourney splitOf). */
  tests?: { badge: string; text: string; tone: ProgTone; studies: string[]; split?: string }[];
  /** ITS CRITERIA, when any are picked (lib/programCriteria; docs/PROGRAM-GOAL.md) — each its tool's own answer, and
   *  where they stand together: "2 of 3 criteria passed", "Ready to sign off …", "Signed off — passed 28 Oct by …". */
  criteria?: { says: string; tone: ProgTone; each: { title: string; word: string; tone: ProgTone; says: string }[] };
}

export interface ProgramsReading {
  lines: ProgramLine[];
  /** The machines in the job's order, each with its programs. */
  machines: { name: string; lines: ProgramLine[] }[];
  total: number; done: number; baseline: number; failed: number; late: number; open: number;
  /** Of those not done, said not tested, or said to have no program. */
  notTested: number; noProgram: number;
  /** Every program done — passed or at baseline. A FAILED one is not done
   *  (flow audit #3: "3 of 5 programs done — 1 passed, 1 at baseline, 1
   *  failed" counted it): it is counted, and said, as failed. */
  doneAll: number;
  /** "12 programs · 8 done — 5 passed, 3 at baseline · 1 failed · 3 to do". */
  says: string;
}

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/* ========================== HOW IT WAS PROVED =============================
 *
 * Flow audit #21 (13 October): a line's program was "Proved" by a dropdown —
 * no test, no evidence, nobody named. LEAN40 principle 6 is "proved, not
 * asserted". A program is proved by one of three things, and says which:
 *
 *   its test         a test in Commission that passed (Test.programId — the
 *                    link lib/programs programAfterTest keeps)
 *   a study          one use of a tool on its line that names it
 *                    (ToolStudy.programId) — a capability study, a loss count
 *   by hand          what showed it, in words: its commentary, asked for
 *                    when it is signed off (ui/ProveProgram)
 *
 * One signed off by hand with nothing said is still proved — the date is the
 * fact (lib/programs) — and says so, in amber: the abnormal, in words. */
export interface Proof {
  word: string;
  tone: ProgTone;
  testId?: string;
  studyId?: string;
}

/** The study that shows a program was proved — the newest of those naming it. */
export const studyProving = (p: Pick<Program, 'id'>, studies: readonly ToolStudy[]): ToolStudy | undefined =>
  studies.filter(s => !s.deletedAt && s.programId === p.id).sort((a, b) => b.updatedAt - a.updatedAt)[0];

/** "capability study “Weight 2 kg”" — what a study is, in a few words. */
export const studyWords = (s: Pick<ToolStudy, 'tool' | 'name'>): string =>
  `${(TOOL_NAME[s.tool] ?? 'Study').toLowerCase()} “${s.name || 'not named'}”`;

/** How a proved program was proved, or undefined while it is not.
 *  `tests` — the tests that could have proved it, when they are known; a
 *  paper that cannot see them says "Proved by its test in Commission" when the
 *  program names one. */
export function proofOf(p: Program, tests: readonly Test[] | undefined, studies: readonly ToolStudy[] = []): Proof | undefined {
  if (!isProved(p)) return undefined;
  /* SIGNED OFF — PASSED, by the names who accepted it, with what passed it (lib/programCriteria) */
  if (p.signedOff) return { word: passedItLine(p, criteriaOf(p, studies, tests ?? [])) ?? 'Signed off — passed', tone: 'g' };
  /* THE TEST THAT PROVED IT — not the latest attempt: a later test at a
     higher speed that did not pass leaves this proof standing
     (lib/programJourney). */
  const mine = tests ? tests.filter(x => !x.deletedAt && (x.programId === p.id || x.id === p.testId)) : [];
  const t = mine.find(x => x.id === p.testId && x.outcome === 'passed')
    ?? mine.find(x => x.outcome === 'passed' && x.ranOn === p.provedOn)
    ?? (tests ? provingTestOf(p, [...tests]) : undefined);
  if (t && t.outcome === 'passed') return { word: `Proved by its test — ${t.title}, passed${t.ranOn ? ` ${niceDay(t.ranOn)}` : ''}`, tone: 'g', testId: t.id };
  const s = studyProving(p, studies);
  if (s) {
    const said = studyLine(s);
    return { word: `Proved by the ${studyWords(s)} — ${said.text}`, tone: said.tone, studyId: s.id };
  }
  if (!tests && p.testId) return { word: 'Proved by its test in Commission', tone: 'g', testId: p.testId };
  return p.note?.trim()
    ? { word: 'Signed off by hand', tone: 'n' }
    : { word: 'Signed off by hand — nothing said shows it', tone: 'a' };
}

/** THE PARTS THAT ARE THIS PROGRAM ON THE FLOOR — the parts of the same name
 *  on its machine's programs stage: the join this reading makes, said once
 *  so db/programs (followPart, followTest) makes the same one. */
export function partsOfProgram(p: Pick<Program, 'what' | 'assetId'>, tests: Test[], items: TestItem[], holder?: AnswerHolder): TestItem[] {
  const k = key(p.what);
  if (!k) return [];
  return live(tests)
    .filter(t => (t.assetId ?? '') === (p.assetId ?? '') && isProgramsStage(t, answerOf(t, holder, items)))
    .flatMap(st => partsOf(st.id, items).filter(part => key(part.what) === k));
}

/** The newest failure the floor said of this program, if it ever did — its
 *  day and the moment it was said (lib/programs programAfterFloor: a
 *  failure newer than its proving un-proves it). */
export function floorFailure(p: Pick<Program, 'what' | 'assetId'>, tests: Test[], items: TestItem[], holder?: AnswerHolder): { on: string; at: number } | undefined {
  const said = partsOfProgram(p, tests, items, holder).flatMap(part => (part.results ?? []).filter(r => r.is === 'failed'))
    .sort((a, b) => a.on.localeCompare(b.on) || a.at - b.at);
  const last = said[said.length - 1];
  return last && { on: last.on, at: last.at };
}

/** The newest day the floor said this program FAILED, if it ever did. */
export const floorFailedOn = (p: Pick<Program, 'what' | 'assetId'>, tests: Test[], items: TestItem[], holder?: AnswerHolder): string | undefined =>
  floorFailure(p, tests, items, holder)?.on;

/** A Program record in words — the same reading the stage drawer gives it
 *  (ui/ProgramLink). `failedOn`: the newest day the floor failed it. */
function programWords(p: Program, tests: Test[], today: string, failedOn?: string, studies?: readonly ToolStudy[]): Pick<ProgramLine, 'word' | 'tone' | 'bucket'> {
  if (p.signedOff && isProved(p)) return { word: `signed off — passed ${niceDay(p.signedOff.on)}`, tone: 'g', bucket: 'done' };
  if (isProved(p)) return { word: `proved${p.provedOn ? ` ${niceDay(p.provedOn)}` : ''}`, tone: 'g', bucket: 'done' };
  /* JUDGED BY ITS CRITERIA: where they stand together is its word — a test is one criterion's answer */
  if (judgedByCriteria(p)) {
    const v = criteriaVerdict(p, criteriaOf(p, studies, tests, today));
    const word = v.ready ? v.words.replace(/^Ready/, 'ready') : `${STATE_WORD[stateOf(p)].toLowerCase()} · ${v.words}`;
    return { word, tone: (v.tone === 'w' ? 'w' : v.tone) as ProgTone, bucket: v.failed ? 'failed' : 'open' };
  }
  const t = provingTestOf(p, tests);
  const state = STATE_WORD[stateOf(p)].toLowerCase();
  /* FAILED ON THE FLOOR, with no test booked since (lib/programs
     programAfterFloor): back on the machine, to prove again — never a
     green "test passed" beside a failure. */
  if (failedOn && (!t || t.outcome === 'passed')) return { word: `${state} · failed ${niceDay(failedOn)} — to prove again`, tone: 'r', bucket: 'failed' };
  if (t) {
    const c = testCell(t, today);
    /* a test that did not pass, or did not run, is a FAILED program on paper — only a day gone by is late */
    return { word: `${state} · test ${c.word}`, tone: c.tone as ProgTone, bucket: t.outcome === 'failed' || t.outcome === 'notRun' ? 'failed' : c.tone === 'r' ? 'late' : 'open' };
  }
  /* No test in Commission — a line's program, planned with no job, or a
     job's not yet put to a test: its own test day says when, and a day gone
     by is late, as the Programs list has always said it (lib/programs
     standingOf). */
  if (p.testOn) {
    return standingOf(p, today) === 'overdue'
      ? { word: `${state} · test was due ${niceDay(p.testOn)}`, tone: 'r', bucket: 'late' }
      : { word: `${state} · test ${niceDay(p.testOn)}`, tone: 'w', bucket: 'open' };
  }
  return { word: `${state} · no test yet`, tone: 'n', bucket: 'open' };
}

/** A program's criteria for its line — nothing when none are picked. */
export function criteriaLine(p: Program, tests: Test[], studies: readonly ToolStudy[] | undefined, today: string): Pick<ProgramLine, 'criteria'> {
  if (!judgedByCriteria(p)) return {};
  const answers = criteriaOf(p, studies ?? [], tests, today);
  const v = criteriaVerdict(p, answers);
  return { criteria: { says: [v.words, v.since].filter(Boolean).join(' — '), tone: (v.tone === 'w' ? 'w' : v.tone) as ProgTone,
    each: answers.map(a => ({ title: a.title, word: CRITERION_WORD[a.word], tone: a.tone as ProgTone, says: a.says })) } };
}

/** A part of a programs stage in words — the one rule (lib/noted
 *  partStatus): a status is the program done on its day. */
function partWordsOf(i: TestItem, today: string): Pick<ProgramLine, 'word' | 'tone' | 'bucket' | 'note' | 'said'> {
  const st = partStatus(i, today, 0, 2);
  /* what was seen: the status's words; with no status, the commentary on the part */
  const note = st.said ? st.said.note : i.note?.trim();
  return { word: st.word, tone: st.tone, bucket: st.bucket, ...(note ? { note } : {}),
    ...(st.said && (st.said.is === 'notTested' || st.said.is === 'noProgram') && !st.done ? { said: st.said.is } : {}) };
}

/** THE ONE WORD A PROGRAM'S ROW LEADS WITH — big, in its state's colour, on screen and on paper (Rowland, 26 October:
 *  "can't really see passed or failed"). It is the bucket said in a word; the line's longer words (the day, what was
 *  seen) sit beside it. */
export function badgeOf(l: Pick<ProgramLine, 'bucket' | 'said' | 'word' | 'tone'>): string {
  if (l.bucket === 'done') return /pass|prov/i.test(l.word) ? 'PASSED' : 'DONE';
  if (l.bucket === 'baseline') return 'BASELINE';
  if (l.bucket === 'failed') return 'FAILED';
  if (l.bucket === 'late') return 'LATE';
  if (l.said === 'notTested') return 'NOT TESTED';
  if (l.said === 'noProgram') return 'NO PROGRAM';
  if (/ready to sign off/i.test(l.word)) return 'SIGN OFF';
  if (/passed\?/.test(l.word)) return 'VERDICT?';
  if (/booked|under way/.test(l.word)) return 'BOOKED';
  return 'TO DO';
}

/** The tests of a program in words, each with the studies lined up for it — "Capability study “60 ppm” — …". */
function testsOfProgram(p: Program | undefined, tests: Test[], studies: readonly ToolStudy[] | undefined, today: string): ProgramLine['tests'] {
  if (!p) return undefined;
  const out = programJourney(p, tests, today).attempts.map(a => ({
    badge: /^booked/.test(a.result.word) ? 'BOOKED' : /passed\?/.test(a.result.word) ? 'VERDICT?' : a.result.word.toUpperCase(),
    text: a.text,
    ...(a.split ? { split: a.split } : {}),
    tone: (a.result.tone === 'a' ? 'a' : a.result.tone) as ProgTone,
    studies: linkedTo([...(studies ?? [])], 'test', a.test.id, 'proof').map(st => `${studyWords(st)} — ${studyLine(st).text}`),
  }));
  return out.length ? out : undefined;
}

export function programsReading(x: { tests: Test[]; items: TestItem[]; assets: Asset[]; programs: Program[]; today?: string;
  /** The job, so a stage the owner made the programs stage is one (lib/install answerOf). */
  holder?: AnswerHolder;
  /** The studies that could show a program proved (ToolStudy.programId) — how
   *  each proved one was proved (proofOf). */
  studies?: readonly ToolStudy[];
  /** What a program's criteria are judged on, where the reading itself is made without the tests (a line's reading,
   *  lib/lineRecords) — every test and study naming the program. Defaults to the reading's own. */
  judged?: { tests: readonly Test[]; studies?: readonly ToolStudy[] } }): ProgramsReading | undefined {
  const today = x.today ?? todayISO();
  const tests = live(x.tests);
  /* the judged data only for a program judged by its criteria — any other's word is read from the reading's own tests,
     as it always was (a line's reading takes none: a job's test does not prove the line's record) */
  const jtAll = x.judged ? live([...x.judged.tests]) : tests, jsAll = x.judged ? x.judged.studies : x.studies;
  const tOf = (p: Program) => (judgedByCriteria(p) ? jtAll : tests), sOf = (p: Program) => (judgedByCriteria(p) ? jsAll : x.studies);
  const assets = live(x.assets);
  const progs = inOrder(x.programs);
  const nameOf = (id?: string) => assets.find(a => a.id === id)?.name ?? 'The line';
  /* The machines in the job's order, the line itself last. */
  const order = [...assets.map(a => a.id), ''];
  /* The programs stages by their answer — the owner's choice, the programs
     already said on one, then the name (docs/PANELS.md) — so "Programs
     loaded" renamed "PLC software downloaded" keeps its programs. */
  const stages = tests.filter(t => isProgramsStage(t, answerOf(t, x.holder, x.items)));
  const machines: { name: string; lines: ProgramLine[] }[] = [];
  for (const m of order) {
    const group: ProgramLine[] = [];
    const used = new Set<string>();
    const mine = progs.filter(p => (p.assetId ?? '') === m);
    const machine = nameOf(m || undefined);
    for (const st of stages.filter(s => (s.assetId ?? '') === m)) {
      for (const part of partsOf(st.id, x.items)) {
        const p = mine.find(q => !used.has(q.id) && key(q.what) === key(part.what));
        if (p) used.add(p.id);
        const said = partWordsOf(part, today);
        const now = resultNow(part);
        /* Proved in Commission leads — unless the floor said something about
           it since, which is the newer fact (a pass that later failed). */
        const provedFirst = !!p && isProved(p) && !(now && p.provedOn && now.on > p.provedOn);
        const proved = p && provedFirst ? programWords(p, tOf(p), today, undefined, sOf(p)) : undefined;
        /* THE FLOOR SAID NOTHING, THE PROGRAM WAS TESTED (Rowland, 26 October: "program 5 says to do — I just did
           it"): the line's headline was the part's "to do" while its own test sat under it as a small note. When the
           floor has said no status and the program has tests, the TEST is the headline — passed, didn't pass,
           booked, ran and awaiting a verdict. A status the floor said still leads, as the flow audit decided. */
        /* JUDGED BY ITS CRITERIA (docs/PROGRAM-GOAL.md): where they stand leads, whatever the floor said — a status the
           run test wrote with it is one criterion's word at most, and is said beside it */
        const judged = !!p && !provedFirst && judgedByCriteria(p);
        const own = p && !provedFirst && (judged || (!now && !part.doneAt && programJourney(p, tests, today).attempts.length))
          ? programWords(p, tOf(p), today, floorFailedOn(p, tests, x.items, x.holder), sOf(p)) : undefined;
        const earlier = (part.results ?? []).filter(r => r !== now).reverse()
          .map(r => `${resultWords(r)}${r.note ? ` — ${r.note}` : ''}`);
        const run = programRunSays(runsOfProgram(part, m || undefined, tests, [...productsOf(p?.runs), p?.what ?? '']));
        group.push({
          ...(run ? { run: run.word, runTone: run.tone } : {}),
          machine, partId: part.id, stageId: st.id, ...(p ? { programId: p.id } : {}), ...(m ? { assetId: m } : {}),
          what: part.what.trim(), ...(p?.runs ? { runs: p.runs } : {}),
          ...(part.owner?.trim() ? { who: part.owner.trim() } : p?.from ? { who: p.from } : {}),
          /* Proved in Commission is the stronger word; the floor's status
             and what was seen stay beside it. */
          ...(proved ? { word: proved.word, tone: proved.tone, bucket: proved.bucket, ...(said.note ? { note: said.note } : {}) }
            : own ? { word: own.word, tone: own.tone, bucket: own.bucket, ...(said.note ? { note: said.note } : {}) } : said),
          ...(p && proved ? (pf => (pf ? { proof: pf } : {}))(proofOf(p, tests, x.studies)) : {}),
          earlier,
          ...(tt => (tt ? { tests: tt } : {}))(testsOfProgram(p, tests, x.studies, today)),
          ...((proved || judged) && now ? { proving: `on the floor: ${said.word}` } : {}),
          /* THE FLOOR'S STATUS LEADS: the program record's own state beside
             it, so the line's answer is on the job's row too (flow audit #3). */
          ...(p && !proved && !own ? (r => ({ record: { word: r.word, tone: r.tone }, proving: `On the line: ${r.word}` }))(programWords(p, tOf(p), today, floorFailedOn(p, tests, x.items, x.holder), sOf(p))) : {}),
          ...(p ? criteriaLine(p, tOf(p), sOf(p), today) : {}),
        });
      }
    }
    for (const p of mine.filter(q => !used.has(q.id))) {
      const run = programRunSays(runsOfProgram({ id: '', what: p.what }, m || undefined, tests, productsOf(p.runs)));
      group.push({
        ...(run ? { run: run.word, runTone: run.tone } : {}),
        machine, programId: p.id, ...(m ? { assetId: m } : {}), what: p.what.trim(), ...(p.runs ? { runs: p.runs } : {}), ...(p.from ? { who: p.from } : {}),
        ...programWords(p, tOf(p), today, undefined, sOf(p)), ...(p.note?.trim() ? { note: p.note.trim() } : {}), earlier: [],
        ...criteriaLine(p, tOf(p), sOf(p), today),
        ...(tt => (tt ? { tests: tt } : {}))(testsOfProgram(p, tests, x.studies, today)),
        ...(pf => (pf ? { proof: pf } : {}))(proofOf(p, tests, x.studies)),
      });
    }
    if (group.length) machines.push({ name: machine, lines: group });
  }
  return readingOf(machines);
}

/** THE COUNTS AND THE SENTENCE of programs already grouped by machine — the job's reading, and a line's
 *  with its projects' programs added (lib/lineRecords lineProgramsReading). */
export function readingOf(machines: { name: string; lines: ProgramLine[] }[]): ProgramsReading | undefined {
  const lines = machines.flatMap(g => g.lines);
  if (!lines.length) return undefined;
  const n = (b: ProgBucket) => lines.filter(l => l.bucket === b).length;
  const total = lines.length, done = n('done'), baseline = n('baseline'), failed = n('failed'), late = n('late'), open = n('open');
  /* A failed program is not done: said apart, in red where it is drawn. */
  const doneAll = done + baseline;
  const how = [`${done} passed`, baseline ? `${baseline} at baseline` : ''].filter(Boolean).join(', ');
  const notTested = lines.filter(l => l.said === 'notTested').length, noProgram = lines.filter(l => l.said === 'noProgram').length;
  /* why the ones not done are not done, when it was said — late or not */
  const why = [notTested ? `${notTested} not tested` : '', noProgram ? `${noProgram} with no program` : ''].filter(Boolean).join(', ');
  const says = [`${total} program${total === 1 ? '' : 's'}`, `${doneAll} done${doneAll ? ` — ${how}` : ''}`,
    failed ? `${failed} failed` : '', late ? `${late} late` : '', open ? `${open} to do` : '', why].filter(Boolean).join(' · ');
  return {
    lines, machines,
    total, done, baseline, failed, late, open, notTested, noProgram, doneAll, says,
  };
}

/* ===================== WHAT IS STILL OPEN ON A MACHINE =====================
 *
 * The programs not done on one machine, as the hand-over and "handed over
 * with" say them (docs/HANDOVER.md; flow audit #3: a failed program is never
 * done). lib/install stillOpenOn names a program not written yet ("Program:
 * Tesco 1.25 kg") from the record alone; this names the rest from the reading
 * the programs report prints — one that failed, is late, was not tested, has
 * no program, or is on the machine and not proved — so the papers say what
 * the Programs page says. Never the one stillOpenOn already named. */

/** The word for a program not done, as the hand-over lists it. */
export function openWord(l: Pick<ProgramLine, 'bucket' | 'said'>): string {
  if (l.said === 'notTested') return 'not tested';
  if (l.said === 'noProgram') return 'no program';
  if (l.bucket === 'failed') return 'didn’t pass';
  if (l.bucket === 'late') return 'late';
  return 'not done yet';
}

export function programsOpenOn(r: ProgramsReading | undefined, assetId: string, programs: readonly Program[],
  /** Name the ones not written yet too — for the line itself, which
   *  stillOpenOn (a machine's) never reads. */
  o: { unwritten?: boolean } = {}): { counts: string[]; names: string[] } {
  if (!r) return { counts: [], names: [] };
  const written = (id?: string) => { const p = id ? programs.find(q => q.id === id) : undefined; return !!o.unwritten || !p || stateOf(p) !== 'needed'; };
  /* one not written yet and only "to do" is stillOpenOn's line already; one
     the floor said more of (failed, not tested…) is said here, with that */
  const open = r.lines.filter(l => (l.assetId ?? '') === assetId && l.bucket !== 'done' && l.bucket !== 'baseline'
    && (written(l.programId) || (!!l.partId && (l.bucket !== 'open' || !!l.said))));
  const failed = open.filter(l => l.bucket === 'failed').length, rest = open.length - failed;
  const many = (n: number, w: string) => `${n} program${n === 1 ? '' : 's'} ${w}`;
  return {
    counts: [failed ? many(failed, 'didn’t pass') : '', rest ? many(rest, 'not done') : ''].filter(Boolean),
    names: open.map(l => `Program, ${openWord(l)}: ${l.what}${l.who ? ` · ${l.who}` : ''}${l.note ? ` — ${l.note}` : ''}`),
  };
}
