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
import { STATE_WORD, inOrder, isProved, isProgramsStage, standingOf, stateOf, type Program } from './programs';
import { provingTestOf, testCell } from './commission';
import { programRunSays, runsOfProgram } from './programRun';
import { partStatus, partsOf, resultNow, resultWords } from './noted';
import { niceDay, todayISO } from './weeks';
import { answerOf, type AnswerHolder } from './install';

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
  /** ITS RUN AT SPEED in Commission (lib/programRun) — "run passed 9 Oct —
   *  45 ppm net", "run short — net rate 1.5 ppm short", "run planned". */
  run?: string;
  runTone?: ProgTone;
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
function programWords(p: Program, tests: Test[], today: string, failedOn?: string): Pick<ProgramLine, 'word' | 'tone' | 'bucket'> {
  if (isProved(p)) return { word: `proved${p.provedOn ? ` ${niceDay(p.provedOn)}` : ''}`, tone: 'g', bucket: 'done' };
  const t = provingTestOf(p, tests);
  const state = STATE_WORD[stateOf(p)].toLowerCase();
  /* FAILED ON THE FLOOR, with no test booked since (lib/programs
     programAfterFloor): back on the machine, to prove again — never a
     green "test passed" beside a failure. */
  if (failedOn && (!t || t.outcome === 'passed')) return { word: `${state} · failed ${niceDay(failedOn)} — to prove again`, tone: 'r', bucket: 'failed' };
  if (t) {
    const c = testCell(t, today);
    return { word: `${state} · test ${c.word}`, tone: c.tone as ProgTone, bucket: c.tone === 'r' ? 'late' : 'open' };
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

/** A part of a programs stage in words — the one rule (lib/noted
 *  partStatus): a status is the program done on its day. */
function partWordsOf(i: TestItem, today: string): Pick<ProgramLine, 'word' | 'tone' | 'bucket' | 'note' | 'said'> {
  const st = partStatus(i, today, 0, 2);
  /* what was seen: the status's words; with no status, the commentary on the part */
  const note = st.said ? st.said.note : i.note?.trim();
  return { word: st.word, tone: st.tone, bucket: st.bucket, ...(note ? { note } : {}),
    ...(st.said && (st.said.is === 'notTested' || st.said.is === 'noProgram') && !st.done ? { said: st.said.is } : {}) };
}

export function programsReading(x: { tests: Test[]; items: TestItem[]; assets: Asset[]; programs: Program[]; today?: string;
  /** The job, so a stage the owner made the programs stage is one (lib/install answerOf). */
  holder?: AnswerHolder }): ProgramsReading | undefined {
  const today = x.today ?? todayISO();
  const tests = live(x.tests);
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
        const proved = p && provedFirst ? programWords(p, tests, today) : undefined;
        const earlier = (part.results ?? []).filter(r => r !== now).reverse()
          .map(r => `${resultWords(r)}${r.note ? ` — ${r.note}` : ''}`);
        const run = programRunSays(runsOfProgram(part, m || undefined, tests, [p?.runs ?? '', p?.what ?? '']));
        group.push({
          ...(run ? { run: run.word, runTone: run.tone } : {}),
          machine, partId: part.id, stageId: st.id, ...(p ? { programId: p.id } : {}), ...(m ? { assetId: m } : {}),
          what: part.what.trim(), ...(p?.runs ? { runs: p.runs } : {}),
          ...(part.owner?.trim() ? { who: part.owner.trim() } : p?.from ? { who: p.from } : {}),
          /* Proved in Commission is the stronger word; the floor's status
             and what was seen stay beside it. */
          ...(proved ? { word: proved.word, tone: proved.tone, bucket: proved.bucket, ...(said.note ? { note: said.note } : {}) } : said),
          earlier,
          ...(proved && now ? { proving: `on the floor: ${said.word}` } : {}),
          /* THE FLOOR'S STATUS LEADS: the program record's own state beside
             it, so the line's answer is on the job's row too (flow audit #3). */
          ...(p && !proved ? (r => ({ record: { word: r.word, tone: r.tone }, proving: `On the line: ${r.word}` }))(programWords(p, tests, today, floorFailedOn(p, tests, x.items, x.holder))) : {}),
        });
      }
    }
    for (const p of mine.filter(q => !used.has(q.id))) {
      const run = programRunSays(runsOfProgram({ id: '', what: p.what }, m || undefined, tests, [p.runs ?? '']));
      group.push({
        ...(run ? { run: run.word, runTone: run.tone } : {}),
        machine, programId: p.id, ...(m ? { assetId: m } : {}), what: p.what.trim(), ...(p.runs ? { runs: p.runs } : {}), ...(p.from ? { who: p.from } : {}),
        ...programWords(p, tests, today), ...(p.note?.trim() ? { note: p.note.trim() } : {}), earlier: [],
      });
    }
    if (group.length) machines.push({ name: machine, lines: group });
  }
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
