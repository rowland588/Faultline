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
import { STATE_WORD, inOrder, isProved, isProgramsStage, stateOf, type Program } from './programs';
import { provingTestOf, testCell } from './commission';
import { partStatus, partsOf, resultNow, resultWords } from './noted';
import { niceDay, todayISO } from './weeks';

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
  /** The statuses said before, newest first — "failed 7 Oct — seal temp low". */
  earlier: string[];
  /** Its proving in Commission, when the status above is the floor's and
   *  Commission has a word too — "proved 7 Oct in Commission". */
  proving?: string;
}

export interface ProgramsReading {
  lines: ProgramLine[];
  /** The machines in the job's order, each with its programs. */
  machines: { name: string; lines: ProgramLine[] }[];
  total: number; done: number; baseline: number; failed: number; late: number; open: number;
  /** Every program done — passed, at baseline or failed: each is the work
   *  done on its day; the status says how it came out. */
  doneAll: number;
  /** "12 programs · 9 done — 5 passed, 3 at baseline, 1 failed · 3 to do". */
  says: string;
}

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** A Program record in words — the same reading the stage drawer gives it
 *  (ui/ProgramLink). */
function programWords(p: Program, tests: Test[], today: string): Pick<ProgramLine, 'word' | 'tone' | 'bucket'> {
  if (isProved(p)) return { word: `proved${p.provedOn ? ` ${niceDay(p.provedOn)}` : ''}`, tone: 'g', bucket: 'done' };
  const t = provingTestOf(p, tests);
  const state = STATE_WORD[stateOf(p)].toLowerCase();
  if (t) {
    const c = testCell(t, today);
    return { word: `${state} · test ${c.word}`, tone: c.tone as ProgTone, bucket: c.tone === 'r' ? 'late' : 'open' };
  }
  return { word: `${state} · no test yet`, tone: 'n', bucket: 'open' };
}

/** A part of a programs stage in words — the one rule (lib/noted
 *  partStatus): a status is the program done on its day. */
function partWordsOf(i: TestItem, today: string): Pick<ProgramLine, 'word' | 'tone' | 'bucket' | 'note'> {
  const st = partStatus(i, today, 0, 2);
  return { word: st.word, tone: st.tone, bucket: st.bucket, ...(st.said?.note ? { note: st.said.note } : {}) };
}

export function programsReading(x: { tests: Test[]; items: TestItem[]; assets: Asset[]; programs: Program[]; today?: string }): ProgramsReading | undefined {
  const today = x.today ?? todayISO();
  const tests = live(x.tests);
  const assets = live(x.assets);
  const progs = inOrder(x.programs);
  const nameOf = (id?: string) => assets.find(a => a.id === id)?.name ?? 'The line';
  /* The machines in the job's order, the line itself last. */
  const order = [...assets.map(a => a.id), ''];
  const stages = tests.filter(isProgramsStage);
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
        group.push({
          machine, partId: part.id, stageId: st.id, ...(p ? { programId: p.id } : {}), ...(m ? { assetId: m } : {}),
          what: part.what.trim(), ...(p?.runs ? { runs: p.runs } : {}),
          ...(part.owner?.trim() ? { who: part.owner.trim() } : p?.from ? { who: p.from } : {}),
          /* Proved in Commission is the stronger word; the floor's status
             and what was seen stay beside it. */
          ...(proved ? { word: proved.word, tone: proved.tone, bucket: proved.bucket, ...(said.note ? { note: said.note } : {}) } : said),
          earlier,
          ...(proved && now ? { proving: `on the floor: ${said.word}` }
            : p && isProved(p) ? { proving: `proved${p.provedOn ? ` ${niceDay(p.provedOn)}` : ''} in Commission` } : {}),
        });
      }
    }
    for (const p of mine.filter(q => !used.has(q.id))) {
      group.push({
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
  const doneAll = done + baseline + failed;
  const how = [`${done} passed`, baseline ? `${baseline} at baseline` : '', failed ? `${failed} failed` : ''].filter(Boolean).join(', ');
  const says = [`${total} program${total === 1 ? '' : 's'}`, `${doneAll} done${doneAll ? ` — ${how}` : ''}`,
    late ? `${late} late` : '', open ? `${open} to do` : ''].filter(Boolean).join(' · ');
  return {
    lines, machines,
    total, done, baseline, failed, late, open, doneAll, says,
  };
}
